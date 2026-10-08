import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";

test("assigned co-teachers retain shared course access, independent classrooms and practice across restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-co-teaching-"));
  const dataFile = join(dir, "state.json");
  const courseId = "course-international-mathematics";
  const password = "co-teaching-fixture";
  let identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
  const admin = await identity.createAccount("admin", "李行之", "teacher", password);
  const assigned = await identity.createAccount("assigned", "Assigned teacher", "teacher", password);
  identity.setCourseAccess(assigned.id, [courseId]);
  let app = await buildApp({ dataFile, campusMode: true, identityProvider: identity, secureIdentityCookie: false });
  const login = async (username: string) => {
    const response = await app.inject({ method: "POST", url: "/api/identity/login", payload: { username, password } });
    assert.equal(response.statusCode, 200);
    return { cookie: String(response.headers["set-cookie"]).split(";")[0]! };
  };
  const adminHeaders = await login("admin"), assignedHeaders = await login("assigned");
  try {
    const workspace = (await app.inject({ url: "/api/workspace", headers: assignedHeaders })).json();
    assert.deepEqual(workspace.courses.map((c: { id: string }) => c.id), [courseId]);
    assert.deepEqual(workspace.ownCourseIds, [courseId]);
    assert.equal(workspace.courses[0].teacherId, admin.id);
    assert.ok((await app.inject({ url: "/api/workspace", headers: adminHeaders })).json().ownCourseIds.includes(courseId));
    assert.equal((await app.inject({ url: "/api/dashboard", headers: assignedHeaders })).json().featuredCourse.id, courseId);
    assert.equal((await app.inject({ url: "/api/dashboard", headers: assignedHeaders })).json().metrics.activeCourses, 1);
    assert.deepEqual((await app.inject({ url: "/api/courses", headers: assignedHeaders })).json().map((c: { id: string }) => c.id), [courseId]);
    const forbidden = "course-port-management-intro";
    for (const suffix of ["", "/reading", "/preparation/1", "/practice-packs/1/teacher"]) {
      assert.equal((await app.inject({ url: `/api/courses/${forbidden}${suffix}`, headers: assignedHeaders })).statusCode, 403);
    }
    assert.equal((await app.inject({ method: "POST", url: `/api/courses/${forbidden}/class-sessions`, headers: assignedHeaders })).statusCode, 403);
    const otherClass = await app.inject({ method: "POST", url: `/api/courses/${forbidden}/class-sessions`, headers: adminHeaders });
    assert.equal(otherClass.statusCode, 201);
    assert.equal((await app.inject({ url: `/api/class-sessions/${otherClass.json().id}/snapshot`, headers: assignedHeaders })).statusCode, 403);
    const rooms: string[] = [];
    for (const [headers, actorId] of [[adminHeaders, admin.id], [assignedHeaders, assigned.id]] as const) {
      const guidance = await app.inject({ url: `/api/courses/${courseId}/practice-packs/1/teacher`, headers });
      assert.equal(guidance.statusCode, 200);
      assert.equal(guidance.json().answers.length, 10);
      const created = await app.inject({ method: "POST", url: `/api/courses/${courseId}/class-sessions`, headers, payload: { lesson: 1 } });
      assert.equal(created.statusCode, 201);
      assert.equal(created.json().teacherId, actorId);
      rooms.push(created.json().id);
      const practice = await app.inject({ method: "POST", url: `/api/class-sessions/${created.json().id}/practice/runs`, headers, payload: { requestId: randomUUID(), lesson: 1, durationSeconds: 120 } });
      assert.equal(practice.statusCode, 200, practice.body);
      assert.equal(practice.json().status, "open");
    }
    assert.notEqual(rooms[0], rooms[1]);
    assert.equal((await app.inject({ url: `/api/class-sessions/${rooms[0]}/practice`, headers: assignedHeaders })).statusCode, 403);
    assert.equal((await app.inject({ url: `/api/class-sessions/${rooms[1]}/practice`, headers: adminHeaders })).statusCode, 403);
    assert.deepEqual((await app.inject({ url: "/api/workspace", headers: assignedHeaders })).json().sessions.map((s: { id: string }) => s.id), [rooms[1]]);
    assert.ok((await app.inject({ url: "/api/activity", headers: assignedHeaders })).json().rows.every((a: { courseId: string }) => a.courseId === courseId));
    await app.close();
    identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
    app = await buildApp({ dataFile, campusMode: true, identityProvider: identity, secureIdentityCookie: false });
    const restored = (await app.inject({ url: "/api/workspace", headers: assignedHeaders })).json();
    assert.deepEqual(restored.ownCourseIds, [courseId]);
    assert.equal(restored.courses[0].teacherId, admin.id);
    assert.equal((await app.inject({ url: `/api/class-sessions/${rooms[1]}/practice`, headers: assignedHeaders })).statusCode, 200);
    assert.ok((await app.inject({ url: "/api/workspace", headers: adminHeaders })).json().ownCourseIds.includes(courseId));
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
