import assert from "node:assert/strict";
import test from "node:test";
import type { PortSimulationCanonicalEvent } from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  applyPortSimulationCommand,
  canonicalPortSimulationStateJson,
  createInitialPortSimulationState,
  hashPortSimulationState,
  replayPortSimulationCanonicalEvent,
  startPortSimulation
} from "../src/index.js";

test("canonical state hashes ignore wall clock strings and input array order", async () => {
  const first = createInitialPortSimulationState(
    PORT_MANUAL_DUAL_VESSEL_SCENARIO
  );
  const second = structuredClone(first);
  first.clock.wallClockAnchor = "2026-08-03T00:00:00.000Z";
  second.clock.wallClockAnchor = "2099-01-01T00:00:00.000Z";
  second.resources.reverse();

  assert.equal(
    canonicalPortSimulationStateJson(first),
    canonicalPortSimulationStateJson(second)
  );
  assert.equal(
    await hashPortSimulationState(first),
    await hashPortSimulationState(second)
  );
});
test("a confirmed command produces the same hash when replayed", async () => {
  const running = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-03T00:00:00.000Z"
  );
  const command = {
    type: "berth.assign" as const,
    vesselId: "vessel-a",
    berthId: "berth-03"
  };
  const authoritative = applyPortSimulationCommand(
    running,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    "berth_operations",
    command,
    { requestId: "command-1", actor: "student" }
  ).state;
  const stateHash = await hashPortSimulationState(authoritative);
  const event: PortSimulationCanonicalEvent = {
    schemaVersion: "1.0",
    runId: "run-1",
    sessionId: "session-1",
    teamId: "team-1",
    sequence: 1,
    businessRevision: authoritative.revision,
    collaborationRevision: 1,
    simMinute: 0,
    kind: "business",
    payload: {
      type: "command",
      requestId: "command-1",
      role: "berth_operations",
      actor: "student",
      command
    },
    stateHash,
    createdAt: "2026-08-03T00:00:00.000Z"
  };
  const replayed = replayPortSimulationCanonicalEvent(
    {
      engine: running,
      collaborationRevision: 1,
      collaborationItems: [],
      lastAppliedSequence: 0
    },
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    event
  );
  assert.equal(await hashPortSimulationState(replayed.engine), stateHash);
  assert.equal(replayed.engine.revision, authoritative.revision);
});

test("teacher controls replay missing-seat audit events deterministically", () => {
  const event: PortSimulationCanonicalEvent = {
    schemaVersion: "1.0",
    runId: "run-control",
    sessionId: "session-1",
    teamId: "team-1",
    sequence: 1,
    businessRevision: 2,
    collaborationRevision: 1,
    simMinute: 0,
    kind: "teacher_control",
    payload: {
      type: "teacher_control",
      control: { type: "start", allowIncompleteTeams: true },
      serverTime: "2026-08-03T00:00:00.000Z",
      missingRoles: ["yard_gate"],
      missingSupportRoles: ["operations_coordinator"],
      resetReady: false
    },
    stateHash: "checked-by-worker",
    createdAt: "2026-08-03T00:00:00.000Z"
  };
  const replayed = replayPortSimulationCanonicalEvent(
    {
      engine: createInitialPortSimulationState(
        PORT_MANUAL_DUAL_VESSEL_SCENARIO
      ),
      collaborationRevision: 1,
      collaborationItems: [],
      lastAppliedSequence: 0
    },
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    event
  );
  assert.equal(replayed.engine.status, "running");
  assert.deepEqual(
    replayed.engine.recentEvents.map((item) => item.type),
    [
      "simulation.started",
      "simulation.started_with_missing_roles",
      "simulation.started_with_missing_support_roles"
    ]
  );
});
