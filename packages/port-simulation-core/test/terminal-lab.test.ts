import assert from "node:assert/strict";
import test from "node:test";
import {
  TERMINAL_FLOW, TERMINAL_SCENARIOS, applyTerminalCommand, createTerminalSetup, createTerminalState,
  restoreTerminal, serializeTerminal, terminalComplete, terminalMetrics, terminalTotalCargo, validateTerminalSetup,
  type TerminalScenario, type TerminalSetup, type TerminalState
} from "../src/terminal-lab.js";

const run = (setup = createTerminalSetup(), minutes = 180) => applyTerminalCommand(createTerminalState(setup, "legacy"), { kind: "advance", minutes });
const verifyMass = (state: TerminalState) => {
  const unloaded = state.unloaded[0] + state.unloaded[1];
  assert.ok(Math.abs(unloaded - state.queues.reduce((a, b) => a + b, 0) - state.delivered) < 1e-6, "container mass is conserved");
  assert.ok(unloaded <= terminalTotalCargo(state.setup) + 1e-7);
  assert.ok(state.queues.every(n => n >= -1e-7));
  assert.ok(state.queues[0] <= 60 + 1e-7 && state.queues[1] <= 40 + 1e-7);
  assert.ok(state.queues[2] <= terminalMetrics(state.setup).storage + 1e-7);
};

test("3D teaching engine conserves containers across four scenarios and split time steps", () => {
  for (const scenario of Object.keys(TERMINAL_SCENARIOS) as TerminalScenario[]) {
    const setup = createTerminalSetup(scenario); let state = createTerminalState(setup, "legacy");
    for (let i = 0; i < 48; i++) { state = applyTerminalCommand(state, { kind: "advance", minutes: 10 }); verifyMass(state); }
    const continuous = run(setup, 480);
    for (const key of ["minute", "delivered", "cost", "energy", "repairWork", "waitingBoxMinutes"] as const) assert.equal(state[key], continuous[key]);
    assert.deepEqual(state.queues, continuous.queues);
  }
});
test("uncrewed vehicles cause real backpressure and reassignment restarts cargo flow", () => {
  const setup = createTerminalSetup(); setup.dispatch.drivers = 0;
  let state = run(setup, 100);
  assert.equal(state.delivered, 0); assert.ok(state.queues[0] > 59.9);
  state = applyTerminalCommand(state, { kind: "dispatch", value: { ...setup.dispatch, drivers: 8 } });
  state = applyTerminalCommand(state, { kind: "advance", minutes: 60 });
  assert.ok(state.delivered > 25); verifyMass(state);
});
test("standard crane cannot service the 24-row vessel regardless of crew count", () => {
  const setup = createTerminalSetup(); setup.crane = "standard";
  const state = run(setup, 300);
  assert.ok(state.unloaded[0] > 0); assert.equal(state.unloaded[1], 0);
  assert.ok(terminalMetrics(setup).warnings.some(w => w.includes("伸距")));
});
test("electric fleet depends on charging infrastructure; AGV changes staffing capacity", () => {
  const electric = createTerminalSetup(); electric.vehicle = "electric";
  electric.facilities = electric.facilities.filter(f => f.kind !== "charger");
  assert.equal(run(electric, 150).delivered, 0);
  const agv = createTerminalSetup(); agv.vehicle = "agv"; agv.dispatch.drivers = 2;
  assert.equal(terminalMetrics(agv).activeVehicles, 8);
  agv.dispatch.drivers = 1; assert.equal(terminalMetrics(agv).activeVehicles, 4);
});
test("gate removal stops completed output even when upstream unloading continues", () => {
  const setup = createTerminalSetup(); setup.facilities = setup.facilities.filter(f => f.kind !== "gate");
  const state = run(setup, 300); assert.equal(state.delivered, 0); assert.ok(state.unloaded[0] > 0); verifyMass(state);
});
test("layout position changes transport time and measured throughput", () => {
  const near = createTerminalSetup(); near.facilities = near.facilities.map(f => f.kind === "reefer" ? { ...f, col: 2, row: 0 } : f);
  const far = createTerminalSetup(); far.facilities = far.facilities.map(f => f.id === "yard-1" ? { ...f, col: 5, row: 2 } : f);
  assert.deepEqual(validateTerminalSetup(near), []); assert.deepEqual(validateTerminalSetup(far), []);
  assert.ok(terminalMetrics(near).distance < terminalMetrics(far).distance);
  assert.ok(run(near, 240).delivered > run(far, 240).delivered + 5);
});
test("balanced equipment and crew plan can finish the complete two-vessel task", () => {
  const setup = createTerminalSetup(); setup.vehicle = "electric"; setup.vehicles = 12; setup.gateSystem = "smart";
  setup.dispatch.drivers = 12; setup.dispatch.gateClerks = 1;
  setup.facilities.push({ id: "charger-2", kind: "charger", col: 1, row: 1, rotation: 0 });
  const state = run(setup, 480);
  assert.ok(terminalComplete(state)); assert.ok(state.minute < 480); verifyMass(state);
  assert.equal(applyTerminalCommand(state, { kind: "advance", minutes: 30 }).minute, state.minute);
});
test("maintenance uses accumulated staffed work, not elapsed time without technicians", () => {
  const setup = createTerminalSetup("outage"); setup.dispatch.technicians = 0;
  let state = run(setup, 160); assert.equal(state.repairWork, 0);
  assert.equal(terminalMetrics(state.setup, state.minute, state.repairWork).activeCranes, 3);
  state = applyTerminalCommand(state, { kind: "dispatch", value: { ...setup.dispatch, technicians: 2 } });
  state = applyTerminalCommand(state, { kind: "advance", minutes: 44 }); assert.equal(state.repairWork, 88);
  state = applyTerminalCommand(state, { kind: "advance", minutes: 1 }); assert.equal(state.repairWork, 90);
  assert.equal(terminalMetrics(state.setup, state.minute, state.repairWork).activeCranes, 4);
});
test("wind event reduces effective crane capacity only during its stated window", () => {
  const setup = createTerminalSetup("wind");
  assert.equal(terminalMetrics(setup, 60).rates[0], terminalMetrics(setup, 59).rates[0] * 0.55);
  assert.equal(terminalMetrics(setup, 150).rates[0], terminalMetrics(setup, 59).rates[0]);
});
test("invalid plans and over-allocation reject atomically without changing the trial", () => {
  const state = createTerminalState(); const before = serializeTerminal(state);
  assert.throws(() => applyTerminalCommand(state, { kind: "dispatch", value: { ...state.setup.dispatch, drivers: 26 } }), /26 人/);
  assert.throws(() => applyTerminalCommand(state, { kind: "dispatch", value: { ...state.setup.dispatch, berthCranes: [4, 4] } }), /岸桥/);
  const duplicate = createTerminalSetup(); duplicate.facilities.push({ ...duplicate.facilities[0]!, id: "overlap" });
  assert.match(validateTerminalSetup(duplicate).join(), /重叠/);
  const gate = createTerminalSetup(); gate.facilities = gate.facilities.map(f => f.kind === "gate" ? { ...f, col: 0, row: 0 } : f);
  assert.match(validateTerminalSetup(gate).join(), /第 3 排/);
  const expensive = createTerminalSetup(); expensive.cranes = 6; expensive.vehicles = 16; expensive.vehicle = "agv"; expensive.yardMachines = 6; expensive.yardMachine = "rmg"; expensive.gates = 6; expensive.gateSystem = "smart";
  assert.match(validateTerminalSetup(expensive).join(), /预算/);
  assert.equal(serializeTerminal(state), before);
});
test("operation export replays to the identical state without identity fields", () => {
  let state = run(createTerminalSetup("wind"), 80);
  state = applyTerminalCommand(state, { kind: "dispatch", value: { ...state.setup.dispatch, berthCranes: [1, 3] } });
  state = applyTerminalCommand(state, { kind: "advance", minutes: 120 });
  for (let i = 0; i < TERMINAL_FLOW.length; i++) state = applyTerminalCommand(state, { kind: "answer", step: i, option: [1, 0, 2, 1, 0, 2][i]! });
  const raw = serializeTerminal(state); assert.deepEqual(restoreTerminal(raw), state);
  assert.doesNotMatch(raw, /actorId|studentNumber|token|displayName/);
  state = applyTerminalCommand(state, { kind: "answer", step: 0, option: 1 }); assert.equal(state.answers.length, 6);
});
test("import rejects malformed and unbounded records", () => {
  assert.throws(() => restoreTerminal(JSON.stringify({ schema: "terminal-lab/2.0", commands: [] })), /有效/);
  for (const raw of ["null", "{}", "[]", "{", JSON.stringify({ schema: "terminal-lab/2.0", setup: createTerminalSetup(), commands: [{ kind: "advance", minutes: 999999 }] }), JSON.stringify({ schema: "terminal-lab/2.0", setup: createTerminalSetup(), commands: [null] })]) assert.throws(() => restoreTerminal(raw));
  assert.ok(validateTerminalSetup({ ...createTerminalSetup(), crane: "__proto__" }).length);
  assert.ok(validateTerminalSetup({ ...createTerminalSetup(), facilities: [null] }).length);
});
