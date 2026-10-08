import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ACTOR_DISPLAY_NAME_MAX_LENGTH } from "@edu/contracts";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import { buildApp } from "../src/app.js";

test("international students retain full names through login and classroom participation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-international-names-"));
  const dataFile = join(dir, "state.json");
  const identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`, undefined, 6);
  const fullName = "INTERNATIONAL STUDENT ".padEnd(ACTOR_DISPLAY_NAME_MAX_LENGTH, "A");
  const username = "000001234567", password = "654321", course = "course-international-mathematics";
  const student = await identity.createAccount(username, fullName, "student", password);
  await assert.rejects(identity.createAccount("overlong", fullName + "A", "student", password));
  await assert.rejects(identity.createAccount("empty-name", " ", "student", password));
  identity.setCourseAccess(student.id, [course]);
  await identity.createAccount("teacher", "李行之", "teacher", password);
  const app = await buildApp({ dataFile, campusMode: true, identityProvider: identity, secureIdentityCookie: false });
  try {
    const login = async (user: string) => {
      const response = await app.inject({ method: "POST", url: "/api/identity/login", payload: { username: user, password } });
      assert.equal(response.statusCode, 200);
      return { cookie: String(response.headers["set-cookie"]).split(";")[0]! };
    };
    const teacher = await login("teacher"), learner = await login(username);
    const workspace = (await app.inject({ url: "/api/workspace", headers: learner })).json();
    assert.equal(workspace.actor.displayName, fullName);
    assert.equal(workspace.actor.actorId, student.id);
    assert.deepEqual(workspace.courses.map((c: { id: string }) => c.id), [course]);
    const room = await app.inject({ method: "POST", url: `/api/courses/${course}/class-sessions`, headers: teacher });
    assert.equal(room.statusCode, 201);
    const base = `/api/class-sessions/${room.json().id}/participation`;
    const joined = await app.inject({ method: "POST", url: `${base}/join`, headers: learner, payload: { displayName: fullName } });
    assert.equal(joined.statusCode, 200, joined.body);
    assert.ok((await app.inject({ url: base, headers: teacher })).json().roster.some((m: { displayName: string }) => m.displayName === fullName));
    assert.equal((await app.inject({ method: "POST", url: `${base}/join`, headers: learner, payload: { displayName: fullName + "A" } })).statusCode, 400);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
