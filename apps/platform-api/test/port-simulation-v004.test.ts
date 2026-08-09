import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { validateExternalRosterGroups } from "../src/identity.js";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const header = response.headers["set-cookie"];
  if (typeof header !== "string") {
    throw new Error("identity response did not set a session cookie");
  }
  return header.split(";", 1)[0]!;
}

test("external fixed groups are reported without silent regrouping", () => {
  const issues = validateExternalRosterGroups({
    source: "teaching_information_system",
    externalCourseRef: "course-ref",
    externalSectionRef: "section-ref",
    version: "roster-v1",
    fetchedAt: "2026-08-03T00:00:00.000Z",
    members: [
      ...Array.from({ length: 3 }, (_, index) => ({
        externalSubjectRef: `small-${index}`,
        displayName: `小组甲成员 ${index + 1}`,
        role: "student" as const,
        fixedGroupRef: "小组甲"
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        externalSubjectRef: `large-${index}`,
        displayName: `小组乙成员 ${index + 1}`,
        role: "student" as const,
        fixedGroupRef: "小组乙"
      }))
    ]
  });
  assert.deepEqual(
    issues.map((issue) => [issue.fixedGroupRef, issue.code]),
    [
      ["小组甲", "GROUP_TOO_SMALL"],
      ["小组乙", "GROUP_TOO_LARGE"]
    ]
  );
});

test("V0.04 derives identity server-side and keeps team names private", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v004-identity-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 0
  });
  try {
    const teacherIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher", displayName: "测试教师" }
    });
    const teacherCookie = cookieFrom(teacherIdentity);
    const live = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = live.json().id as string;
    const capacities = [
      ...Array.from({ length: 10 }, () => 5),
      ...Array.from({ length: 5 }, () => 4)
    ];
    const setup = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      headers: { cookie: teacherCookie },
      payload: {
        expectedStudentCount: 70,
        teamCapacities: capacities,
        teamNames: capacities.map((_, index) => `运行组 ${index + 1}`)
      }
    });
    assert.equal(setup.statusCode, 201);
    assert.equal(setup.json().simulation.teams.length, 15);
    assert.equal(setup.json().simulation.teams[0].syncMode, "event_stream_v1");

    const aliceIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "student", displayName: "爱丽丝" }
    });
    const alice = aliceIdentity.json().actor as { actorId: string };
    const aliceCookie = cookieFrom(aliceIdentity);
    const joinAlice = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/join`,
      headers: { cookie: aliceCookie },
      payload: { participantId: "forged-student-id" }
    });
    assert.equal(joinAlice.statusCode, 201);
    const claimAlice = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/berth_operations/claim`,
      headers: { cookie: aliceCookie },
      payload: { participantId: "forged-student-id" }
    });
    assert.equal(claimAlice.statusCode, 201);
    assert.equal(claimAlice.json().participantId, alice.actorId);
    assert.notEqual(claimAlice.json().participantId, "forged-student-id");
    assert.equal(
      claimAlice.json().snapshot.roleSeats.find(
        (seat: { role: string }) => seat.role === "berth_operations"
      ).participantDisplayName,
      "爱丽丝"
    );

    const bobIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "student", displayName: "鲍勃" }
    });
    const bobCookie = cookieFrom(bobIdentity);
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-2/join`,
      headers: { cookie: bobCookie },
      payload: {}
    });
    const forbiddenTeam = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/checkpoint`,
      headers: { cookie: bobCookie }
    });
    assert.equal(forbiddenTeam.statusCode, 403);

    const ownCheckpoint = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/checkpoint`,
      headers: { cookie: aliceCookie }
    });
    assert.equal(ownCheckpoint.statusCode, 200);
    const ownSnapshot = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: aliceCookie }
    });
    assert.equal(
      ownSnapshot.json().roleSeats.find(
        (seat: { role: string }) => seat.role === "berth_operations"
      ).participantDisplayName,
      "爱丽丝"
    );
    assert.doesNotMatch(ownSnapshot.body, /forged-student-id/u);
    assert.doesNotMatch(ownSnapshot.body, /externalSubjectRef/u);

    const teacherView = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: teacherCookie }
    });
    assert.equal(teacherView.statusCode, 200);
    assert.match(teacherView.body, /爱丽丝/u);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("V0.04 emits ordered events, idempotent receipts and transient renewals", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v004-events-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 0
  });
  try {
    const teacherIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher" }
    });
    const teacherCookie = cookieFrom(teacherIdentity);
    const studentIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "student", displayName: "岸桥主操" }
    });
    const studentCookie = cookieFrom(studentIdentity);
    const live = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = live.json().id as string;
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      headers: { cookie: teacherCookie },
      payload: { expectedStudentCount: 4 }
    });
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/join`,
      headers: { cookie: studentCookie },
      payload: {}
    });
    const claim = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/berth_operations/claim`,
      headers: { cookie: studentCookie },
      payload: {}
    });
    const roleSeatToken = claim.json().roleSeatToken as string;
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "start", allowIncompleteTeams: true }
    });
    const before = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: studentCookie }
    });
    const beforeState = before.json();
    assert.equal(beforeState.latestSequence, 1);

    const renewal = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/berth_operations/renew`,
      headers: { cookie: studentCookie },
      payload: { roleSeatToken }
    });
    assert.equal(renewal.statusCode, 200);
    const afterRenewal = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: studentCookie }
    });
    assert.equal(afterRenewal.json().revision, beforeState.revision);
    assert.equal(afterRenewal.json().latestSequence, beforeState.latestSequence);

    const command = {
      requestId: "v004-command-1",
      runId: beforeState.runId,
      roleSeatToken,
      expectedRevision: beforeState.revision,
      lastAppliedSequence: beforeState.latestSequence,
      baseStateHash: beforeState.stateHash,
      command: {
        type: "berth.assign",
        vesselId: "vessel-a",
        berthId: "berth-03"
      }
    };
    const applied = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/commands`,
      headers: { cookie: studentCookie },
      payload: command
    });
    assert.equal(applied.statusCode, 200);
    assert.equal(applied.json().status, "applied");
    assert.equal(applied.json().acceptedSequence, 2);
    assert.equal("snapshot" in applied.json(), false);

    const duplicate = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/commands`,
      headers: { cookie: studentCookie },
      payload: command
    });
    assert.equal(duplicate.json().status, "duplicate");
    assert.equal(duplicate.json().latestSequence, 2);

    const events = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/events?afterSequence=0`,
      headers: { cookie: studentCookie }
    });
    assert.equal(events.statusCode, 200);
    assert.deepEqual(
      events.json().events.map((event: { sequence: number }) => event.sequence),
      [1, 2]
    );
    assert.equal(events.json().events[1].payload.type, "command");
    assert.equal(events.json().events[1].stateHash, applied.json().status === "applied"
      ? (await app.inject({
          method: "GET",
          url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
          headers: { cookie: studentCookie }
        })).json().stateHash
      : "");
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("V0.04 accepts a recently issued hash across a time-sync race", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v004-hash-race-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 5
  });
  try {
    const teacherIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher" }
    });
    const teacherCookie = cookieFrom(teacherIdentity);
    const studentIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "student", displayName: "岸桥主操" }
    });
    const studentCookie = cookieFrom(studentIdentity);
    const live = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = live.json().id as string;
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      headers: { cookie: teacherCookie },
      payload: { expectedStudentCount: 4 }
    });
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/join`,
      headers: { cookie: studentCookie },
      payload: {}
    });
    const claim = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/berth_operations/claim`,
      headers: { cookie: studentCookie },
      payload: {}
    });
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "start", allowIncompleteTeams: true }
    });
    const issued = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: studentCookie }
    });
    const base = issued.json();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const advanced = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: studentCookie }
    });
    assert.notEqual(advanced.json().stateHash, base.stateHash);

    const command = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/commands`,
      headers: { cookie: studentCookie },
      payload: {
        requestId: "v004-time-sync-race",
        runId: base.runId,
        roleSeatToken: claim.json().roleSeatToken,
        expectedRevision: base.revision,
        lastAppliedSequence: base.latestSequence,
        baseStateHash: base.stateHash,
        command: {
          type: "quay.move_crane",
          craneId: "quay-crane-3",
          targetSlotId: "berth-03-slot-1"
        }
      }
    });
    assert.equal(command.statusCode, 200);
    assert.equal(command.json().status, "applied");
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("production-style options reject development identity and body spoofing", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v004-production-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 0,
    allowDevelopmentIdentity: false,
    allowLegacyDevelopmentIdentity: false
  });
  try {
    const development = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher" }
    });
    assert.equal(development.statusCode, 403);
    const spoofedSetup = await app.inject({
      method: "POST",
      url: "/api/class-sessions/session-port-20260803/simulation/setup",
      payload: { expectedStudentCount: 4, participantId: "teacher" }
    });
    assert.equal(spoofedSetup.statusCode, 401);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
