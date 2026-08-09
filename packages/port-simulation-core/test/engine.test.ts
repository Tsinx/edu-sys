import assert from "node:assert/strict";
import test from "node:test";
import type {
  PortSimulationCommand,
  PortSimulationRole
} from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  advancePortSimulation,
  applyPortSimulationCommand,
  createInitialPortSimulationState,
  startPortSimulation,
  type PortSimulationEngineState
} from "../src/index.js";

function command(
  state: PortSimulationEngineState,
  role: PortSimulationRole,
  input: PortSimulationCommand,
  requestId = `${role}-${state.revision}`
) {
  return applyPortSimulationCommand(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    role,
    input,
    { requestId }
  );
}

test("manual scenario keeps the agreed teaching resource baseline", () => {
  const state = createInitialPortSimulationState(
    PORT_MANUAL_DUAL_VESSEL_SCENARIO
  );
  assert.equal(state.vessels.length, 2);
  assert.equal(state.tasks.length, 16);
  assert.equal(
    state.resources.filter((resource) => resource.kind === "berth").length,
    7
  );
  assert.equal(
    state.resources.filter((resource) => resource.kind === "quay_crane").length,
    6
  );
  assert.equal(
    state.resources.filter((resource) => resource.kind === "agv").length,
    4
  );
  assert.equal(
    state.resources.filter((resource) => resource.kind === "yard_block").length,
    24
  );
});

test("the clock advances without inventing dispatch decisions", () => {
  const initial = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-01T00:00:00.000Z"
  );
  const advanced = advancePortSimulation(
    initial,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    120
  );
  assert.equal(advanced.clock.simMinute, 120);
  assert.deepEqual(
    advanced.vessels.map((vessel) => vessel.stage),
    ["anchorage", "anchorage"]
  );
  assert.ok(advanced.vessels[0]!.waitMinutes.berth >= 120);
});

test("hard safety rules reject impossible transit while inefficient yard choices remain valid", () => {
  let state = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-01T00:00:00.000Z"
  );
  const unsafe = command(state, "marine_control", {
    type: "marine.authorize_transit",
    vesselId: "vessel-a",
    direction: "inbound"
  });
  assert.equal(unsafe.result.status, "rejected");
  assert.equal(unsafe.result.reasonCode, "TRANSIT_PREREQUISITES_MISSING");

  const inefficient = command(unsafe.state, "yard_gate", {
    type: "yard.assign_block",
    taskId: "vessel-a-discharge-1",
    blockId: "yard-block-24"
  });
  assert.equal(inefficient.result.status, "applied");
  assert.equal(
    inefficient.state.tasks.find(
      (task) => task.id === "vessel-a-discharge-1"
    )?.workUnits,
    102
  );
});

test("fixed incidents occur at identical simulated times", () => {
  const makeRun = () =>
    advancePortSimulation(
      startPortSimulation(
        createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
        "2026-08-01T00:00:00.000Z"
      ),
      PORT_MANUAL_DUAL_VESSEL_SCENARIO,
      360
    );
  const first = makeRun();
  const second = makeRun();
  assert.deepEqual(first, second);
  assert.equal(
    first.resources.find((resource) => resource.id === "agv-3")?.status,
    "available"
  );
  assert.equal(
    first.incidents.find((incident) => incident.id === "agv-03-fault")?.status,
    "resolved"
  );
  assert.equal(
    first.queues.find((queue) => queue.id === "gate-queue")?.length,
    18
  );
});

test("one vessel can complete the whole authoritative manual chain", () => {
  let state = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-01T00:00:00.000Z"
  );
  state = command(state, "berth_operations", {
    type: "berth.assign",
    vesselId: "vessel-a",
    berthId: "berth-02"
  }).state;
  state = command(state, "marine_control", {
    type: "marine.assign_services",
    vesselId: "vessel-a",
    pilotId: "pilot-1",
    tugIds: ["tug-1", "tug-2"]
  }).state;
  state = command(state, "marine_control", {
    type: "marine.authorize_transit",
    vesselId: "vessel-a",
    direction: "inbound"
  }).state;
  state = advancePortSimulation(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    45
  );
  assert.equal(state.vessels[0]?.stage, "berthed");

  const vesselTasks = state.tasks.filter((task) => task.vesselId === "vessel-a");
  vesselTasks.forEach((task, index) => {
    state = command(state, "yard_gate", {
      type: "yard.assign_block",
      taskId: task.id,
      blockId: `yard-block-${String(index + 1).padStart(2, "0")}`
    }).state;
  });
  state = command(state, "berth_operations", {
    type: "quay.move_crane",
    craneId: "quay-crane-1",
    targetSlotId: "berth-02-slot-1"
  }).state;
  state = command(state, "berth_operations", {
    type: "quay.move_crane",
    craneId: "quay-crane-3",
    targetSlotId: "berth-02-slot-3"
  }).state;
  state = advancePortSimulation(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    61
  );
  state = command(state, "berth_operations", {
    type: "quay.assign_cranes",
    vesselId: "vessel-a",
    craneIds: ["quay-crane-1", "quay-crane-2", "quay-crane-3"]
  }).state;
  state = command(state, "horizontal_transport", {
    type: "transport.assign_agvs",
    vesselId: "vessel-a",
    agvIds: ["agv-1", "agv-2"]
  }).state;
  state = command(state, "berth_operations", {
    type: "quay.start_cargo",
    vesselId: "vessel-a"
  }).state;
  state = advancePortSimulation(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    390
  );
  assert.equal(state.vessels[0]?.stage, "ready_departure");
  assert.equal(state.vessels[0]?.cargoStartedAtSimMinute, 61);
  assert.ok((state.vessels[0]?.cargoCompletedAtSimMinute ?? 0) > 61);

  const completedTask = state.tasks.find(
    (task) => task.id === "vessel-a-discharge-1"
  )!;
  const released = command(state, "yard_gate", {
    type: "yard.release_batch",
    taskId: completedTask.id
  });
  assert.equal(released.result.status, "applied");
  state = released.state;
  assert.equal(
    state.tasks.find((task) => task.id === completedTask.id)
      ?.releasedAtSimMinute,
    state.clock.simMinute
  );
  assert.equal(
    state.resources.find((resource) => resource.id === "yard-block-01")
      ?.status,
    "available"
  );

  state = command(state, "berth_operations", {
    type: "berth.release",
    vesselId: "vessel-a"
  }).state;
  state = command(state, "marine_control", {
    type: "marine.assign_services",
    vesselId: "vessel-a",
    pilotId: "pilot-1",
    tugIds: ["tug-1", "tug-2"]
  }).state;
  state = command(state, "marine_control", {
    type: "marine.authorize_transit",
    vesselId: "vessel-a",
    direction: "outbound"
  }).state;
  state = advancePortSimulation(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    435
  );
  assert.equal(state.vessels[0]?.stage, "departed");
});

test("quay crane movement is deterministic and enforces order and separation", () => {
  let state = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-01T00:00:00.000Z"
  );
  const move = command(state, "berth_operations", {
    type: "quay.move_crane",
    craneId: "quay-crane-1",
    targetSlotId: "berth-01-slot-1"
  });
  assert.equal(move.result.status, "applied");
  assert.match(move.result.message, /轨位 20/u);
  assert.doesNotMatch(move.result.message, /berth-/u);
  assert.equal(
    move.state.resources.find((resource) => resource.id === "quay-crane-1")
      ?.status,
    "moving"
  );
  assert.equal(
    move.state.resources.find((resource) => resource.id === "quay-crane-1")
      ?.quayCrane?.movementEndsAtSimMinute,
    4
  );
  state = advancePortSimulation(
    move.state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    4
  );
  assert.equal(
    state.resources.find((resource) => resource.id === "quay-crane-1")
      ?.quayCrane?.trackPosition,
    20
  );
  assert.equal(state.metrics.craneMoves.completed, 1);
  assert.match(state.recentEvents.at(-1)?.message ?? "", /轨位 20/u);

  const crossing = command(state, "berth_operations", {
    type: "quay.move_crane",
    craneId: "quay-crane-1",
    targetSlotId: "berth-02-slot-4"
  });
  assert.equal(crossing.result.status, "rejected");
  assert.equal(crossing.result.reasonCode, "CRANE_SAFE_DISTANCE");
  assert.match(crossing.result.message, /岸桥 QC-02/u);
});

test("standard outreach cranes cannot serve the deep-reach teaching vessel", () => {
  let state = startPortSimulation(
    createInitialPortSimulationState(PORT_MANUAL_DUAL_VESSEL_SCENARIO),
    "2026-08-01T00:00:00.000Z"
  );
  const vessel = state.vessels.find((item) => item.id === "vessel-b")!;
  vessel.stage = "berthed";
  vessel.berthId = "berth-06";
  state = command(state, "berth_operations", {
    type: "quay.move_crane",
    craneId: "quay-crane-4",
    targetSlotId: "berth-06-slot-1"
  }).state;
  state = advancePortSimulation(
    state,
    PORT_MANUAL_DUAL_VESSEL_SCENARIO,
    36
  );
  const assignment = command(state, "berth_operations", {
    type: "quay.assign_cranes",
    vesselId: "vessel-b",
    craneIds: ["quay-crane-4"]
  });
  assert.equal(assignment.result.status, "rejected");
  assert.equal(assignment.result.reasonCode, "CRANE_OUTREACH_INCOMPATIBLE");
});
