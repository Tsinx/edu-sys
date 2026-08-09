import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePortSimulationScore,
  completePortSimulation,
  createInitialPortSimulationState,
  getPortSimulationChallenge,
  getPortSimulationScenarioForChallenge,
  startPortSimulation
} from "@edu/port-simulation-core";
import {
  createLocalPortSimulationAttemptSummary,
  createLocalPortSimulationSnapshot,
  loadLocalPortSimulationRun,
  localPortSimulationRunStorageKey,
  saveLocalPortSimulationRun,
  type LocalPortSimulationRunSave
} from "../src/features/port-simulation/local-port-simulation.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("V1.0 local save validates app, challenge and scenario versions", () => {
  const storage = new MemoryStorage();
  const challenge = getPortSimulationChallenge("joint-watch");
  const scenario = getPortSimulationScenarioForChallenge("joint-watch");
  const state = startPortSimulation(
    createInitialPortSimulationState(scenario),
    "2026-08-09T00:00:00.000Z",
    "student"
  );
  const save: LocalPortSimulationRunSave = {
    schemaVersion: "1.0",
    appVersion: "1.0.0",
    runId: "local-test-run",
    challengeId: challenge.id,
    challengeVersion: challenge.version,
    attemptNumber: 1,
    selectedRole: "marine_control",
    savedAt: "2026-08-09T00:00:01.000Z",
    state
  };

  saveLocalPortSimulationRun(storage, "actor-course", save);
  const restored = loadLocalPortSimulationRun(
    storage,
    "actor-course",
    challenge.id,
    challenge.version,
    scenario.id,
    scenario.version
  );
  assert.equal(restored?.runId, save.runId);
  assert.equal(restored?.state.status, "running");

  storage.setItem(
    localPortSimulationRunStorageKey("actor-course", challenge.id),
    JSON.stringify({ ...save, appVersion: "0.9.0" })
  );
  assert.equal(
    loadLocalPortSimulationRun(
      storage,
      "actor-course",
      challenge.id,
      challenge.version,
      scenario.id,
      scenario.version
    ),
    null
  );
});

test("local snapshot gives one learner all four roles without leaking identity in export summary", () => {
  const challenge = getPortSimulationChallenge("joint-watch");
  const scenario = getPortSimulationScenarioForChallenge("joint-watch");
  const completed = completePortSimulation(
    createInitialPortSimulationState(scenario),
    "student"
  );
  const scorecard = calculatePortSimulationScore({ state: completed });
  const snapshot = createLocalPortSimulationSnapshot({
    state: completed,
    actorId: "internal-actor",
    actorDisplayName: "测试学生",
    storageScope: "course-scope",
    runId: "local-run",
    challengeId: challenge.id,
    challengeVersion: challenge.version,
    attemptNumber: 2,
    previousBestScore: 700
  });
  const summary = createLocalPortSimulationAttemptSummary(
    {
      runId: "local-run",
      challengeId: challenge.id,
      challengeVersion: challenge.version,
      attemptNumber: 2
    },
    completed,
    scorecard,
    "2026-08-09T00:15:00.000Z"
  );

  assert.equal(snapshot.memberCount, 1);
  assert.equal(snapshot.roleSeats.length, 4);
  assert.ok(snapshot.roleSeats.every((seat) => seat.participantId === "internal-actor"));
  assert.equal(summary.totalScore, scorecard.totalScore);
  assert.doesNotMatch(JSON.stringify(summary), /internal-actor|测试学生/u);
});
