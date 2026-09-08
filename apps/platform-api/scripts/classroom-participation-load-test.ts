import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import type { ClassroomParticipationView } from "@edu/contracts";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";

const dir = await mkdtemp(join(tmpdir(), "edu-classroom-load-"));
const campusMode=process.env.EDU_LOAD_PROFILE==="campus";
const campusIdentity=campusMode?new CampusIdentityProvider(join(dir,"accounts.sqlite")):undefined;
const testPassword=randomUUID();
const app = await buildApp({ dataFile: join(dir, "state.json"), portSimulationTickMs: 0, openAvatarBaseUrl: "http://127.0.0.1:1",campusMode,identityProvider:campusIdentity,secureIdentityCookie:false });
const controllers: AbortController[] = [];
const readers: Promise<void>[] = [];
const responseMs: number[] = [];
const students = 100;
const streamViews = new Map<number, ClassroomParticipationView>();
const slideIndices = new Map<number, number>();
let privateLeak = false;
const waitFor = async (condition: () => boolean, label: string) => {
  const start = performance.now();
  while (!condition()) { if (performance.now() - start > 10_000) throw new Error(`Timed out: ${label}`); await wait(20); }
  return Math.round(performance.now() - start);
};
try {
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  const call = async (path: string, cookie = "", body?: unknown) => {
    const start = performance.now();
    const response = await fetch(address + path, { headers: { cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
    const result = await response.json();
    assert.ok(response.status === 200 || response.status === 201, JSON.stringify(result));
    responseMs.push(performance.now() - start); return result as ClassroomParticipationView;
  };
  const login = async (role: "student" | "teacher", displayName: string) => {
    const username=`qa-${randomUUID()}`;
    if(campusIdentity)await campusIdentity.createAccount(username,displayName,role,testPassword);
    const response = await fetch(`${address}/api/identity/${campusMode?"login":"development/session"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(campusMode?{username,password:testPassword}:{ role, displayName }) });
    assert.equal(response.status, campusMode?200:201); await response.json();
    return response.headers.get("set-cookie")!.split(";")[0]!;
  };
  const teacher = await login("teacher", "并发验收教师");
  const roomResponse = await fetch(`${address}/api/courses/course-port-management-intro/class-sessions`, { method: "POST", headers: { cookie: teacher } });
  assert.equal(roomResponse.status, 201); const room = await roomResponse.json() as { id: string };
  const base = `/api/class-sessions/${room.id}/participation`;
  const cookies = await Promise.all(Array.from({ length: students }, (_, i) => login("student", `同学${i + 1}`)));
  assert.equal(new Set(cookies).size, students);
  await Promise.all(cookies.map((cookie, i) => call(`${base}/join`, cookie, { displayName: `同学${i + 1}` })));
  const subscribe = async (cookie: string, index: number, snapshot = false) => {
    const controller = new AbortController(); controllers.push(controller);
    const response = await fetch(snapshot ? `${address}/api/class-sessions/${room.id}/snapshot/stream` : `${address}${base}/stream`, { headers: { cookie }, signal: controller.signal });
    assert.equal(response.status, 200);
    const reader = response.body!.getReader(); const decoder = new TextDecoder();
    readers.push((async () => {
      let buffer = "";
      try { while (true) {
        const next = await reader.read(); if (next.done) break;
        buffer += decoder.decode(next.value, { stream: true });
        let separator: number;
        while ((separator = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, separator); buffer = buffer.slice(separator + 2);
          const data = frame.split("\n").find(line => line.startsWith("data: "))?.slice(6);
          if (!data) continue;
          if (snapshot) { slideIndices.set(index, (JSON.parse(data) as { slide: { index: number } }).slide.index); continue; }
          const view = JSON.parse(data) as ClassroomParticipationView;
          if (index < students && (view.roster !== null || view.history !== null || (view.active?.status !== "revealed" && (view.active?.correctOptionIds != null || view.active?.counts != null || view.active?.explanation != null)))) privateLeak = true;
          streamViews.set(index, view);
        }
      } } catch (error) { if (!controller.signal.aborted) throw error; }
      finally { reader.releaseLock(); }
    })());
  };
  await Promise.all([...cookies, teacher].map((cookie, i) => subscribe(cookie, i)));
  await Promise.all(cookies.map((cookie, i) => subscribe(cookie, i, true)));
  await waitFor(() => streamViews.size === students + 1 && slideIndices.size === students, "all activity and slide SSE clients connected");
  const create = { kind: "question", requestId: randomUUID(), question: "港口连接哪些运输方式？", mode: "multiple", options: [{ id: "A", text: "海运" }, { id: "B", text: "铁路" }, { id: "C", text: "公路" }], correctOptionIds: ["A", "B", "C"], explanation: "三者构成海陆联运。" };
  const started = await call(`${base}/activities`, teacher, create); const id = started.active!.id;
  const broadcastMs = await waitFor(() => [...streamViews.values()].every(v => v.active?.id === id), "question reaches 100 students");
  const submitStarted = performance.now();
  const [submissions] = await Promise.all([
    Promise.all(cookies.map((cookie, i) => call(`${base}/activities/${id}/answer`, cookie, { optionIds: i % 2 ? ["A", "B", "C"] : ["A"] }))),
    Promise.all(cookies.map(cookie => call(`/api/class-sessions/${room.id}/presence/heartbeat`, cookie, {}))),
    call(`/api/class-sessions/${room.id}/events`, teacher, { type: "next_slide" })
  ]);
  const submitWallMs = Math.round(performance.now() - submitStarted);
  assert.ok(submissions.every(v => v.active?.ownAnswer && v.active.correctOptionIds === null && v.roster === null));
  await waitFor(() => streamViews.get(students)?.active?.responseCount === students && cookies.every((_, i) => streamViews.get(i)?.active?.ownAnswer), "answers reach teacher and owners");
  await waitFor(() => [...slideIndices.values()].every(index => index === 2), "all slides advance during answer and heartbeat traffic");
  await Promise.all(cookies.map((cookie, i) => call(`${base}/activities/${id}/answer`, cookie, { optionIds: i % 2 ? ["C", "B", "A"] : ["A"] })));
  assert.equal((await call(base, teacher)).active?.responseCount, students);
  await call(`${base}/activities/${id}/action`, teacher, { action: "close" });
  const closed = await call(base, cookies[0]); assert.equal(closed.active?.correctOptionIds, null);
  await call(`${base}/activities/${id}/action`, teacher, { action: "reveal" });
  await waitFor(() => [...streamViews.values()].every(v => v.active?.status === "revealed"), "results broadcast");
  for (const view of streamViews.values()) assert.deepEqual(view.active?.counts, { A: 100, B: 50, C: 50 });
  controllers[0]!.abort(); streamViews.delete(0);
  await subscribe(cookies[0]!, 0);
  await waitFor(() => Boolean(streamViews.get(0)?.active?.ownAnswer), "reconnect restores answer");
  assert.deepEqual(streamViews.get(0)?.active?.ownAnswer?.optionIds, ["A"]);
  assert.equal(privateLeak, false);
  if(campusMode) {
    const inputs=cookies.map((_,i)=>({requestId:randomUUID(),deviceId:randomUUID(),key:"load:run",expectedRevision:0,value:JSON.stringify({student:i,checkpoint:"x".repeat(24000)}),releaseId:"load-test"}));
    await Promise.all(cookies.map((cookie,i)=>call("/api/edge/records",cookie,inputs[i])));
    await Promise.all(cookies.map((cookie,i)=>call("/api/edge/records",cookie,inputs[i])));
    for(const [i,cookie] of cookies.entries()) {
      const response=await fetch(`${address}/api/edge/records`,{headers:{cookie}});
      const data=await response.json() as {records:Array<{value:string;revision:number}>};
      assert.equal(data.records.length,1);assert.equal(data.records[0]!.revision,1);assert.equal(JSON.parse(data.records[0]!.value).student,i);
    }
  }
  const roll = await call(`${base}/activities`, teacher, { kind: "roll_call", requestId: randomUUID(), avoidRepeats: true });
  await waitFor(() => cookies.every((_, i) => streamViews.get(i)?.active?.id === roll.active!.id), "roll call broadcast");
  const selected = cookies.findIndex((_, i) => streamViews.get(i)?.active?.calledStudent?.isYou);
  assert.ok(selected >= 0);
  assert.equal([...streamViews.entries()].filter(([i, v]) => i < students && v.active?.calledStudent?.isYou).length, 1);
  await call(`${base}/activities/${roll.active!.id}/answer`, cookies[selected], { optionIds: [] });
  await waitFor(() => streamViews.get(students)?.active?.responseCount === 1, "roll call acknowledged");
  responseMs.sort((a, b) => a - b);
  const result = { checkedAt: new Date().toISOString(),profile:campusMode?"campus":"development",campusCheckpointRetriesPassed:campusMode, students, simultaneousSseConnections: students * 2 + 1, participationStreams: students + 1, slideStreams: students, concurrentHeartbeats: students, slideSyncDuringSubmissionsPassed: true, requestsMeasured: responseMs.length,
    requestP95Ms: Math.round(responseMs[Math.ceil(responseMs.length * .95) - 1]!), questionBroadcastMs: broadcastMs, hundredSubmissionsWallMs: submitWallMs,
    acceptedUniqueAnswers: 100, duplicateRetryCount: 100, tallies: { A: 100, B: 50, C: 50 }, studentPrivacyPassed: !privateLeak, sseReconnectPassed: true, rollCallPassed: true,
    scope: "One local Node API process and SQLite WAL; 100 independent HTTP identities, 201 real SSE streams, and concurrent answer, heartbeat and slide traffic. Does not measure campus Wi-Fi, avatar/media GPU traffic, or multiple API replicas." };
  const output = resolve(process.argv[2] ?? (campusMode?"../../output/campus-deployment-review/load.json":"../../output/classroom-participation-review/load.json"));
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally {
  for (const controller of controllers) controller.abort();
  await Promise.allSettled(readers); await app.close(); await rm(dir, { recursive: true, force: true });
}
