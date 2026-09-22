import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";

test("local login restores the persisted teacher and workspace after logout and API restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-local-login-"));
  const options = { dataFile: join(dir, "state.json"), portSimulationDatabaseFile: join(dir, "simulation.sqlite") };
  let app = await buildApp(options);
  try {
    assert.equal((await app.inject("/api/workspace")).statusCode, 401);
    const login = async (payload: object = { role: "teacher" }) => {
      const response = await app.inject({ method: "POST", url: "/api/identity/development/session", payload });
      assert.equal(response.statusCode, 201);
      return { actor: response.json().actor, cookie: String(response.headers["set-cookie"]).split(";")[0]! };
    };
    const first = await login();
    const teacher = (await app.inject("/api/me")).json();
    assert.equal(first.actor.actorId, teacher.id);
    const workspace = await app.inject({ url: "/api/workspace", headers: { cookie: first.cookie } });
    assert.equal(workspace.statusCode, 200);
    assert.ok(workspace.json().ownCourseIds.includes("course-port-management-intro"));
    const preferences = await app.inject({ method: "PATCH", url: "/api/preferences", headers: { cookie: first.cookie }, payload: { classReminders: false } });
    assert.equal(preferences.statusCode, 200);
    await app.inject({ method: "POST", url: "/api/identity/logout", headers: { cookie: first.cookie } });
    assert.equal((await app.inject({ url: "/api/identity/session", headers: { cookie: first.cookie } })).statusCode, 401);
    const second = await login();
    assert.equal(second.actor.actorId, first.actor.actorId);
    assert.notEqual(second.cookie, first.cookie);
    const studentA = await login({ role: "student" });
    const studentB = await login({ role: "student" });
    assert.notEqual(studentA.actor.actorId, studentB.actor.actorId);
    assert.notEqual((await login({ role: "teacher", displayName: "独立验收教师" })).actor.actorId, first.actor.actorId);
    await app.close();
    app = await buildApp(options);
    assert.equal((await app.inject({ url: "/api/identity/session", headers: { cookie: second.cookie } })).statusCode, 401);
    const restored = await login();
    assert.equal(restored.actor.actorId, first.actor.actorId);
    const restoredWorkspace = (await app.inject({ url: "/api/workspace", headers: { cookie: restored.cookie } })).json();
    assert.ok(restoredWorkspace.ownCourseIds.includes("course-port-management-intro"));
    assert.equal(restoredWorkspace.preferences.classReminders, false);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
