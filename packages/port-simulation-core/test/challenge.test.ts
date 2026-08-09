import assert from "node:assert/strict";
import test from "node:test";
import {
  PORT_SIMULATION_CHALLENGES,
  applyPortSimulationCommand,
  calculatePortSimulationScore,
  createInitialPortSimulationState,
  getPortSimulationScenarioForChallenge,
  startPortSimulation
} from "../src/index.js";

test("V0.05 ships three versioned challenges with distinct event pressure", () => {
  assert.deepEqual(
    PORT_SIMULATION_CHALLENGES.map((challenge) => [
      challenge.id,
      challenge.version,
      challenge.missions.length
    ]),
    [
      ["joint-watch", "1.0.0", 2],
      ["scarce-deep-reach", "1.0.0", 2],
      ["compound-disruption", "1.0.0", 2]
    ]
  );
  assert.equal(getPortSimulationScenarioForChallenge("joint-watch").incidents.length, 0);
  assert.equal(
    getPortSimulationScenarioForChallenge("scarce-deep-reach").vessels.find(
      (vessel) => vessel.id === "vessel-b"
    )?.etaSimMinute,
    30
  );
  assert.equal(
    getPortSimulationScenarioForChallenge("compound-disruption").incidents.length,
    2
  );
});

test("the explainable score always totals six frozen dimensions and 1000 points", () => {
  const scenario = getPortSimulationScenarioForChallenge("joint-watch");
  const state = createInitialPortSimulationState(scenario);
  const scorecard = calculatePortSimulationScore({ state });
  assert.equal(scorecard.maxScore, 1000);
  assert.equal(scorecard.breakdown.length, 6);
  assert.equal(
    scorecard.breakdown.reduce((total, item) => total + item.maxPoints, 0),
    1000
  );
  assert.deepEqual(
    scorecard.breakdown.map((item) => item.dimension),
    [
      "safety",
      "completion",
      "vessel_flow",
      "resource_coordination",
      "incident_recovery",
      "teamwork"
    ]
  );
});

test("rejected safety decisions reduce the score and keep event evidence", () => {
  const scenario = getPortSimulationScenarioForChallenge("joint-watch");
  const running = startPortSimulation(
    createInitialPortSimulationState(scenario),
    "2026-08-03T00:00:00.000Z"
  );
  const rejected = applyPortSimulationCommand(
    running,
    scenario,
    "marine_control",
    {
      type: "marine.authorize_transit",
      vesselId: "vessel-a",
      direction: "inbound"
    },
    { requestId: "unsafe-without-services", actor: "student" }
  ).state;
  const scorecard = calculatePortSimulationScore({ state: rejected });
  const safety = scorecard.breakdown.find(
    (item) => item.dimension === "safety"
  );
  assert.equal(safety?.points, 230);
  assert.equal(safety?.evidenceEventIds.length, 1);

  rejected.metrics.teacherTakeovers = 1;
  const practice = calculatePortSimulationScore({ state: rejected });
  assert.equal(practice.rankEligible, false);
  assert.equal(practice.rankingStatus, "practice");
});

test("lobby scores do not rank and repeated commands do not inflate teamwork", () => {
  const scenario = getPortSimulationScenarioForChallenge("joint-watch");
  const lobby = createInitialPortSimulationState(scenario);
  const lobbyScore = calculatePortSimulationScore({ state: lobby });
  assert.equal(lobbyScore.rankEligible, false);

  const running = startPortSimulation(lobby, "2026-08-03T00:00:00.000Z");
  const marineMetric = running.metrics.roleResponseMinutes.find(
    (metric) => metric.role === "marine_control"
  )!;
  marineMetric.decisions = 1;
  const oneDecision = calculatePortSimulationScore({ state: running });
  marineMetric.decisions = 20;
  marineMetric.totalMinutes = 0;
  const repeatedDecisions = calculatePortSimulationScore({ state: running });
  const teamwork = (scorecard: typeof oneDecision) =>
    scorecard.breakdown.find((item) => item.dimension === "teamwork")?.points;
  assert.equal(teamwork(oneDecision), 13);
  assert.equal(teamwork(repeatedDecisions), teamwork(oneDecision));
});
