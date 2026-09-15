import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import { buildApp } from "../src/app.js";

test("campus enrollment persists, six-digit credentials are opt-in and student AI is blocked before admission", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-enrollment-"));
  const path = join(dir, "accounts.sqlite");
  let identity = new CampusIdentityProvider(path);
  await assert.rejects(identity.createAccount("short", "测试", "student", "654321"));
  identity.close();
  identity = new CampusIdentityProvider(path, undefined, 6);
  const student = await identity.createAccount("202600000001", "测试学生", "student", "000001");
  await identity.createAccount("manager", "测试教师", "teacher", "654321");
  const course = "course-port-management-intro";
  identity.setCourseAccess(student.id, [course]);
  identity.close();
  identity = new CampusIdentityProvider(path, undefined, 6);
  assert.deepEqual(identity.allowedCourseIds(student.id), [course]);
  let speechCalls = 0;
  const app = await buildApp({
    dataFile: join(dir, "state.json"), campusMode: true, identityProvider: identity,
    secureIdentityCookie: false, studentAiEnabled: false,
    studySpeechProvider: {
      name: "test", asrConfigured: true, ttsConfigured: true,
      async transcribe() { speechCalls++; throw new Error("unexpected ASR"); },
      async *synthesize() { speechCalls++; }
    }
  });
  try {
    const login = async (username: string, password: string) => {
      const response = await app.inject({ method: "POST", url: "/api/identity/login", payload: {username, password} });
      assert.equal(response.statusCode, 200);
      return {cookie: String(response.headers["set-cookie"]).split(";")[0]!};
    };
    const learner = await login(student.username, "000001");
    const teacher = await login("manager", "654321");
    const allCourses = (await app.inject({url: "/api/courses", headers: teacher})).json();
    const other = allCourses.find((item: {id: string}) => item.id !== course).id;
    assert.deepEqual((await app.inject({url: "/api/courses", headers: learner})).json().map((item: {id: string}) => item.id), [course]);
    for (const id of [other, other.replace(/./, (char: string) => `%${char.charCodeAt(0).toString(16)}`)]) {
      assert.equal((await app.inject({url: `/api/courses/${id}`, headers: learner})).statusCode, 403);
    }
    const otherClass = await app.inject({method: "POST", url: `/api/courses/${other}/class-sessions`, headers: teacher, payload: {}});
    assert.equal(otherClass.statusCode, 201);
    for (const suffix of ["", "/snapshot", "/snapshot/stream"]) {
      assert.equal((await app.inject({url: `/api/class-sessions/${otherClass.json().id}${suffix}`, headers: learner})).statusCode, 403);
    }
    assert.ok((await app.inject({url: "/api/class-sessions", headers: learner})).json().every((item: {courseId: string}) => item.courseId === course));
    assert.equal((await app.inject({method: "POST", url: "/api/study-sessions", headers: learner, payload: {courseId: other}})).statusCode, 403);
    const study = await app.inject({method: "POST", url: "/api/study-sessions", headers: learner, payload: {courseId: course}});
    assert.equal(study.statusCode, 201);
    assert.equal((await app.inject({url: `/api/study-sessions/${study.json().id}`, headers: learner})).statusCode, 200);
    for (const suffix of ["asr", "assistant/turns", "tts"]) {
      const blocked = await app.inject({method: "POST", url: `/api/study-sessions/${study.json().id}/${suffix}`, headers: learner, payload: {}});
      assert.equal(blocked.statusCode, 403);
      assert.equal(blocked.json().error, "STUDENT_AI_DISABLED");
    }
    assert.equal(speechCalls, 0);
    assert.equal((await app.inject({method: "POST", url: "/api/teacher/tts", headers: teacher, payload: {text: "测试"}})).statusCode, 200);
    assert.equal(speechCalls, 1);
    identity.setCourseAccess(student.id, []);
    assert.equal((await app.inject({url: `/api/study-sessions/${study.json().id}`, headers: learner})).statusCode, 403);
    await identity.resetPassword(student.username, "654321");
    assert.equal((await app.inject({url: "/api/identity/session", headers: learner})).statusCode, 401);
    await login(student.username, "654321");
  } finally { await app.close(); await rm(dir, {recursive: true, force: true}); }
});
