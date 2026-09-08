import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import type { ClassroomActor, ClassroomParticipationView } from "@edu/contracts";
import { buildApp } from "../src/app.js";
import { ClassroomParticipation } from "../src/classroom-participation.js";

const question = () => ({ kind: "question" as const, requestId: randomUUID(), question: "港口连接哪些运输方式？", mode: "multiple" as const,
  options: [{ id: "A", text: "海运" }, { id: "B", text: "铁路" }, { id: "C", text: "公路" }], correctOptionIds: ["A", "B", "C"], explanation: "答案讲解只在公布后对学生开放。" });
const actor = (id: string, teacher = false): ClassroomActor => ({ actorId: id, displayName: id, roles: [teacher ? "teacher" : "student"], identitySource: "development" });

test("participation persists answers, enforces immutable submissions, isolates rooms and expires presence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-participation-"));
  let live = true;
  let service = new ClassroomParticipation(join(dir, "activities.sqlite"), () => live, 40);
  try {
    service.join("room", actor("s1"), "同学甲");
    service.join("room", actor("s2"), "同学乙");
    const input = question();
    const id = service.start("room", input);
    assert.equal(service.start("room", input), id);
    assert.throws(() => service.start("room", question()), /先结束/);
    assert.throws(() => service.answer("other", id, actor("s1"), ["A"]), /先填写/);
    service.join("other", actor("s1"), "同学甲");
    assert.throws(() => service.answer("other", id, actor("s1"), ["A"]), /未找到/);
    assert.throws(() => service.answer("room", id, actor("s1"), ["A", "A"]), /有效选项/);
    service.answer("room", id, actor("s1"), ["C", "A"]);
    service.answer("room", id, actor("s1"), ["A", "C"]);
    assert.throws(() => service.answer("room", id, actor("s1"), ["B"]), /已提交/);
    const hidden = service.view("room", actor("s2"));
    assert.equal(hidden.active?.correctOptionIds, null); assert.equal(hidden.active?.counts, null);
    assert.equal(hidden.active?.ownAnswer, null); assert.equal(hidden.roster, null); assert.equal(hidden.history, null);
    service.action("room", id, "close");
    service.answer("room", id, actor("s1"), ["A", "C"]);
    assert.throws(() => service.answer("room", id, actor("s2"), ["B"]), /已结束/);
    assert.equal(service.view("room", actor("s1")).active?.explanation, null);
    service.close(); service = new ClassroomParticipation(join(dir, "activities.sqlite"), () => live, 40);
    assert.deepEqual(service.view("room", actor("s1")).active?.ownAnswer?.optionIds, ["A", "C"]);
    assert.equal(service.view("room", actor("teacher", true)).active?.responseCount, 1);
    service.action("room", id, "reveal");
    assert.deepEqual(service.view("room", actor("s2")).active?.counts, { A: 1, B: 0, C: 1 });
    service.touch("room", "s1");
    const roll = service.start("room", { kind: "roll_call", requestId: randomUUID(), avoidRepeats: true });
    assert.equal(service.view("room", actor("s1")).active?.calledStudent?.isYou, true);
    assert.throws(() => service.answer("room", roll, actor("s2"), []), /只有被点名/);
    service.answer("room", roll, actor("s1"), []);
    service.action("room", roll, "close");
    assert.throws(() => service.start("room", { kind: "roll_call", requestId: randomUUID(), avoidRepeats: true }), /没有符合/);
    await wait(90);
    assert.equal(service.view("room", actor("teacher", true)).roster?.filter(m => m.online).length, 0);
    live = false; service.end("room");
    service.end("empty-room");
    assert.ok(service.view("empty-room", actor("s1")).revision > 0);
    assert.throws(() => service.start("room", question()), /课堂已结束/);
    assert.throws(() => service.answer("room", roll, actor("s1"), []), /课堂已结束/);
  } finally { service.close(); await rm(dir, { recursive: true, force: true }); }
});

test("participation routes require authenticated roles and validate activity state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-participation-api-"));
  const app = await buildApp({ dataFile: join(dir, "state.json"), portSimulationTickMs: 0, openAvatarBaseUrl: "http://127.0.0.1:1" });
  try {
    const roomResponse = await app.inject({ method: "POST", url: "/api/courses/course-port-management-intro/class-sessions" });
    assert.equal(roomResponse.statusCode, 201);
    const room = roomResponse.json();
    const base = `/api/class-sessions/${room.id}/participation`;
    const login = async (role: "teacher" | "student") => {
      const response = await app.inject({ method: "POST", url: "/api/identity/development/session", payload: { role } });
      return { cookie: String(response.headers["set-cookie"]).split(";")[0]! };
    };
    const teacher = await login("teacher"); const student = await login("student");
    const create = (headers?: { cookie: string }, payload = question()) => app.inject({ method: "POST", url: `${base}/activities`, headers, payload });
    assert.equal((await create()).statusCode, 401);
    assert.equal((await create(student)).statusCode, 403);
    assert.equal((await app.inject({ url: base })).statusCode, 401);
    assert.equal((await app.inject({ url: `${base}/stream` })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: `${base}/join`, headers: teacher, payload: { displayName: "预览" } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: `${base}/join`, headers: student, payload: { displayName: " " } })).statusCode, 400);
    assert.equal((await app.inject({ method: "POST", url: `${base}/join`, headers: student, payload: { displayName: "测试学生" } })).statusCode, 200);
    assert.equal((await create(teacher, { ...question(), correctOptionIds: ["F"] })).statusCode, 400);
    const started = await create(teacher); assert.equal(started.statusCode, 200);
    const id = started.json<ClassroomParticipationView>().active!.id;
    assert.equal((await app.inject({ method: "POST", url: `${base}/activities/${id}/answer`, headers: teacher, payload: { optionIds: ["A"] } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: `${base}/activities/${id}/action`, headers: student, payload: { action: "reveal" } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: `/api/class-sessions/${room.id}/end`, headers: student })).statusCode, 403);
    await app.inject({ method: "POST", url: `/api/class-sessions/${room.id}/end`, headers: teacher });
    const ended = (await app.inject({ url: base, headers: student })).json<ClassroomParticipationView>();
    assert.equal(ended.isLive, false); assert.equal(ended.active?.status, "closed");
    assert.equal((await app.inject({ method: "POST", url: `${base}/activities/${id}/answer`, headers: student, payload: { optionIds: ["A"] } })).statusCode, 409);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
