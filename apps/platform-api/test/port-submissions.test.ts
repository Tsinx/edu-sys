import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { makePortSubmission, createPortCourse, serializePortCourse } from "@edu/port-simulation-core";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import { submissionWorker } from "../src/port-submissions.js";
const cookie = (r: { headers: Record<string, unknown> }) => String(r.headers["set-cookie"]).split(";")[0]!;
const course = "course-port-management-intro", prefix = "/api/port-operations";
test("campus submissions are durable, idempotent, isolated and replace only a verified latest revision", { timeout: 180000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-port-submissions-")), dataFile = join(dir, "state.json"), accounts = join(dir, "accounts.sqlite");
  let identity = new CampusIdentityProvider(accounts);
  await identity.createAccount("teacher", "成绩教师", "teacher", "teacher-password-123");
  await identity.createAccount("student", "实验学生", "student", "student-password-123");
  await identity.createAccount("other", "其他学生", "student", "student-password-123");
  let app = await buildApp({ dataFile, identityProvider: identity, campusMode: true, secureIdentityCookie: false });
  try {
    const login = async (username: string) => app.inject({ method: "POST", url: "/api/identity/login", payload: { username, password: username === "teacher" ? "teacher-password-123" : "student-password-123" } });
    const studentIdentity = await login("student"), student = cookie(studentIdentity), teacher = cookie(await login("teacher")), other = cookie(await login("other"));
    const pkg = await makePortSubmission(serializePortCourse(createPortCourse("arrival")));
    const input = { requestId: randomUUID(), courseId: course, classSessionId: "session-port-20260803", expectedRevision: 0, package: pkg };
    const post = (payload: object, session = student) => app.inject({ method: "POST", url: `${prefix}/submissions`, headers: { cookie: session, "content-type": "application/json" }, payload: JSON.stringify(payload) });
    assert.equal((await app.inject({ method: "POST", url: `${prefix}/submissions`, payload: input })).statusCode, 401);
    assert.equal((await post(input, teacher)).statusCode, 403);
    assert.equal((await post({ ...input, classSessionId: "another-course-class" })).statusCode, 400);
    assert.equal((await post({ ...input, courseId: "course-other" })).statusCode, 400);
    assert.equal((await post({ ...input, package: { ...pkg, record: "x".repeat(20_000_000) } })).statusCode, 413);
    const sent = await post(input); assert.equal(sent.statusCode, 202, sent.body); const id = sent.json().id;
    assert.equal((await post(input)).json().id, id, "lost acknowledgement retry is identical");
    assert.equal((await post({ ...input, expectedRevision: 99 })).statusCode, 409);
    assert.equal((await app.inject({ url: `${prefix}/submissions/${id}`, headers: { cookie: other } })).statusCode, 404);
    const wait = async (submissionId: string) => {
      for (let i = 0; i < 300; i++) {
        const result = await app.inject({ url: `${prefix}/submissions/${submissionId}`, headers: { cookie: student } });
        if (["verified", "rejected"].includes(result.json().status)) return result.json();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("submission did not settle");
    };
    const done = await wait(id); assert.equal(done.status, "verified", JSON.stringify(done)); assert.equal(done.revision, 1);
    assert.equal(done.classSessionId, input.classSessionId, "classroom association survives verification");
    assert.equal((await app.inject({ url: `${prefix}/submissions/${id}/replay`, headers: { cookie: other } })).statusCode, 404);
    const replay = await app.inject({ url: `${prefix}/submissions/${id}/replay`, headers: { cookie: teacher } }); assert.equal(replay.statusCode, 200); assert.equal(replay.json().package.record, pkg.record);
    const bad = await post({ ...input, requestId: randomUUID(), expectedRevision: 1, package: { ...pkg, expected: { ...pkg.expected, score: 87 } } });
    assert.equal((await wait(bad.json().id)).status, "rejected");
    const list = async (session: string) => (await app.inject({ url: `${prefix}/courses/${course}/results`, headers: { cookie: session } })).json();
    assert.equal((await list(student)).rows[0].results[0].id, id);
    assert.equal((await list(other)).rows[0].results.length, 0);
    assert.equal((await list(teacher)).rows.length, 2, "enrolled students with no submission remain visible");
    for (const mutate of [
      (raw: any) => { delete raw.inputLog; },
      (raw: any) => { raw.inputLog = Array.from({ length: 50001 }, () => ({ kind: "pause" })); },
      (raw: any) => { raw.navigationVersion = "future"; },
      (raw: any) => { raw.inputLog.push({ kind: "unknown" }); },
    ]) {
      const raw = JSON.parse(pkg.record); mutate(raw);
      const rejected = await post({ ...input, requestId: randomUUID(), expectedRevision: 1, package: { ...pkg, record: JSON.stringify(raw) } });
      assert.equal((await wait(rejected.json().id)).status, "rejected");
      assert.equal((await list(student)).rows[0].results[0].id, id, "invalid evidence never replaces latest");
    }
    const replacement = { ...input, requestId: randomUUID(), expectedRevision: 1 };
    const replacing = await post(replacement);
    // Simulate shutdown while accepted/working, then recover the persisted queue.
    await app.close(); identity = new CampusIdentityProvider(accounts);
    app = await buildApp({ dataFile, identityProvider: identity, campusMode: true, secureIdentityCookie: false });
    const updated = await wait(replacing.json().id); assert.equal(updated.status, "verified", JSON.stringify(updated)); assert.equal(updated.revision, 2);
    assert.equal((await post(replacement)).json().id, updated.id);
    assert.equal((await post({ ...input, requestId: randomUUID(), expectedRevision: 1 })).statusCode, 409);
    const second = await post({ ...input, requestId: randomUUID(), package: await makePortSubmission(serializePortCourse(createPortCourse("yard"))) });
    assert.equal((await wait(second.json().id)).status, "verified");
    assert.equal((await list(student)).rows[0].results.length, 2, "separate experiments do not replace each other");
    const competing = await Promise.all([1, 2].map(() => post({ ...input, requestId: randomUUID(), expectedRevision: 2 })));
    assert.ok(competing.every(r => r.statusCode === 202));
    const settled = await Promise.all(competing.map(r => wait(r.json().id)));
    assert.deepEqual(settled.map(r => r.status).sort(), ["rejected", "verified"], "concurrent devices cannot both replace the same revision");
    assert.equal((await list(student)).rows[0].results.find((r: any) => r.unit === "arrival").revision, 3);
    identity.setCourseAccess(studentIdentity.json().actor.actorId, []);
    assert.equal((await post({ ...input, requestId: randomUUID() })).statusCode, 403);
    assert.equal((await app.inject({ url: `${prefix}/submissions/${id}/replay`, headers: { cookie: student } })).statusCode, 403);
    const db = new DatabaseSync(`${dataFile}.port-results.sqlite`, { readOnly: true }); assert.equal(db.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok"); db.close();
  } finally { await app.close(); assert.ok(dir.startsWith(join(tmpdir(), "edu-port-submissions-"))); await rm(dir, { recursive: true, force: true }); }
});
test("verification worker has an enforced deadline", async () => {
  const pkg = await makePortSubmission(serializePortCourse(createPortCourse("arrival")));
  const worker = submissionWorker(pkg, 1);
  await assert.rejects(worker.promise, /超过180秒/);
  await worker.cancel();
});
