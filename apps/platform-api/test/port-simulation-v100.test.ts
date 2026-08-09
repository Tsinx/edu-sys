import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildApp } from "../src/app.js";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const header = response.headers["set-cookie"];
  if (typeof header !== "string") throw new Error("missing identity cookie");
  return header.split(";", 1)[0]!;
}

test("V1.0 publishes one local challenge without server-side teams", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v100-local-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 0
  });
  try {
    const identity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher", displayName: "本地仿真教师" }
    });
    const teacherCookie = cookieFrom(identity);
    const live = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = live.json().id as string;
    const setup = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      headers: { cookie: teacherCookie },
      payload: {
        deliveryMode: "local_solo",
        expectedStudentCount: 70,
        challengeId: "scarce-deep-reach"
      }
    });

    assert.equal(setup.statusCode, 201);
    assert.equal(setup.json().simulation.deliveryMode, "local_solo");
    assert.equal(setup.json().simulation.challengeId, "scarce-deep-reach");
    assert.equal(setup.json().simulation.expectedStudentCount, 70);
    assert.deepEqual(setup.json().simulation.teams, []);

    const snapshot = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`,
      headers: { cookie: teacherCookie }
    });
    assert.equal(snapshot.json().simulation.deliveryMode, "local_solo");
    assert.deepEqual(snapshot.json().simulation.teams, []);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
