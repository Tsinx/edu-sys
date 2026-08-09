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

test("V0.05 exposes a versioned challenge and explainable live rankings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-port-v005-ranking-"));
  const app = await buildApp({
    dataFile: join(directory, "state.json"),
    portSimulationTickMs: 0
  });
  try {
    const identity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher", displayName: "排行榜测试教师" }
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
        expectedStudentCount: 8,
        challengeId: "joint-watch",
        teamNames: ["海风队", "灯塔队"]
      }
    });
    assert.equal(setup.statusCode, 201);
    assert.equal(setup.json().simulation.challengeId, "joint-watch");
    assert.equal(setup.json().simulation.challengeVersion, "1.0.0");
    assert.equal(setup.json().simulation.teams[0].scorecard.maxScore, 1000);
    assert.equal(setup.json().simulation.teams[0].scorecard.breakdown.length, 6);

    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "start", allowIncompleteTeams: true }
    });
    const teamBefore = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`,
      headers: { cookie: teacherCookie }
    });
    const team = teamBefore.json();
    const takeover = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/teacher-commands`,
      headers: { cookie: teacherCookie },
      payload: {
        requestId: "v005-teacher-takeover",
        runId: team.runId,
        expectedRevision: team.revision,
        lastAppliedSequence: team.latestSequence,
        baseStateHash: team.stateHash,
        role: "berth_operations",
        command: {
          type: "berth.assign",
          vesselId: "vessel-a",
          berthId: "berth-03"
        }
      }
    });
    assert.equal(takeover.statusCode, 200);
    assert.equal(takeover.json().status, "applied");

    const afterTakeover = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`,
      headers: { cookie: teacherCookie }
    });
    const teams = afterTakeover.json().simulation.teams as Array<{
      teamId: string;
      overallRank: number | null;
      scorecard: { rankingStatus: string; rankEligible: boolean };
    }>;
    assert.deepEqual(
      teams.map((item) => [
        item.teamId,
        item.scorecard.rankingStatus,
        item.scorecard.rankEligible,
        item.overallRank
      ]),
      [
        ["team-1", "practice", false, null],
        ["team-2", "provisional", true, 1]
      ]
    );

    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "complete" }
    });
    const reset = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "reset" }
    });
    const resetTeams = reset.json().simulation.teams as Array<{
      teamId: string;
      attemptNumber: number;
      previousBestScore: number | null;
      improvementRank: number | null;
    }>;
    assert.equal(resetTeams[0]?.attemptNumber, 2);
    assert.equal(resetTeams[0]?.previousBestScore, null);
    assert.equal(resetTeams[1]?.attemptNumber, 2);
    assert.equal(typeof resetTeams[1]?.previousBestScore, "number");
    assert.equal(resetTeams[1]?.improvementRank, null);

    const secondStart = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      headers: { cookie: teacherCookie },
      payload: { type: "start", allowIncompleteTeams: true }
    });
    assert.equal(secondStart.json().simulation.teams[1].improvementRank, 1);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
