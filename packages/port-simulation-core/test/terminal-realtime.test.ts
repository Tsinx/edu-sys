import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTerminalCommand as act, createTerminalSetup, createTerminalState, restoreTerminal, serializeTerminal,
  terminalChannelVessel, terminalCommandIssue, terminalComplete, terminalFlowProgress, terminalMetrics, terminalVesselProgress,
  type TerminalOperation, type TerminalScenario, type TerminalSetup, type TerminalState
} from "../src/terminal-lab.js";
const tick = (state: TerminalState, seconds: number) => act(state, { kind: "tick", seconds });
const operate = (state: TerminalState, target: TerminalOperation, running = true) => act(state, { kind: "operate", target, running });
function ready(setup: TerminalSetup = createTerminalSetup()) {
  let state = act(createTerminalState(setup), { kind: "harbor", vessel: 0, action: "admit" });
  state = tick(state, 720); state = act(state, { kind: "harbor", vessel: 0, action: "secure" });
  state = act(state, { kind: "harbor", vessel: 1, action: "admit" }); state = tick(state, 840);
  state = act(state, { kind: "harbor", vessel: 1, action: "secure" });
  for (const target of ["crane-a", "crane-b", "transport", "yard", "gate"] as const) state = operate(state, target);
  return state;
}
function mass(state: TerminalState) {
  assert.ok(Math.abs(state.unloaded[0] + state.unloaded[1] - state.delivered - state.queues.reduce((a, b) => a + b, 0)) < 1e-6);
  assert.ok(state.queues.every((q, i) => q >= -1e-7 && q <= [60, 40, terminalMetrics(state.setup).storage][i]! + 1e-6));
}
test("real clock alone cannot admit ships, unload cargo, or complete operational tasks", () => {
  const state = tick(createTerminalState(), 3600);
  assert.equal(state.minute, 60); assert.deepEqual(state.unloaded, [0, 0]);
  assert.equal(state.delivered, 0); assert.ok(terminalFlowProgress(state).every(p => !p.done));
  assert.throws(() => act(state, { kind: "answer", step: 0, option: 1 }), /不支持/);
});
test("shared channel and mooring interlocks follow exact simulated seconds", () => {
  let state = act(createTerminalState(), { kind: "harbor", vessel: 1, action: "admit" });
  assert.equal(terminalChannelVessel(state), 1);
  assert.throws(() => act(state, { kind: "harbor", vessel: 0, action: "admit" }), /航道/);
  state = tick(state, 839); assert.ok(terminalVesselProgress(state, 1) < 1);
  assert.throws(() => act(state, { kind: "harbor", vessel: 1, action: "secure" }), /尚未抵达/);
  assert.throws(() => operate(state, "crane-b"), /系泊/);
  state = tick(state, 1); assert.equal(terminalChannelVessel(state), undefined);
  state = act(state, { kind: "harbor", vessel: 1, action: "secure" });
  state = operate(state, "crane-b"); state = tick(state, 1);
  assert.ok(state.unloaded[1] > 0); assert.equal(state.queues[1], 0); mass(state);
});
test("each downstream order is required and actual cargo validates all six stages", () => {
  let state = ready(); state = act(state, { kind: "stop" });
  state = operate(state, "crane-a"); state = tick(state, 3600);
  assert.ok(state.queues[0] > 59.9); assert.equal(state.delivered, 0);
  state = operate(state, "transport"); state = tick(state, 7200);
  assert.ok(state.queues[1] > 39.9); assert.equal(state.queues[2], 0);
  state = operate(state, "yard"); state = tick(state, 600);
  assert.ok(state.queues[2] > 0); assert.equal(state.delivered, 0);
  state = operate(state, "gate"); state = tick(state, 120);
  assert.ok(state.delivered > 1); assert.ok(terminalFlowProgress(state).every(p => p.done)); mass(state);
});
test("individual stop and crew reallocation change real queues and per-vehicle work", () => {
  let state = tick(ready(), 600); const before = structuredClone(state.equipmentWork.vehicles);
  state = operate(state, "transport", false); const quay = state.queues[0];
  state = tick(state, 300); assert.deepEqual(state.equipmentWork.vehicles, before); assert.ok(state.queues[0] > quay);
  state = operate(state, "transport"); state = act(state, { kind: "dispatch", value: { ...state.setup.dispatch, drivers: 2 } });
  state = tick(state, 300); assert.ok(state.equipmentWork.vehicles[0]! > before[0]!);
  assert.deepEqual(state.equipmentWork.vehicles.slice(2), before.slice(2)); mass(state);
  const frozen = structuredClone({ unloaded: state.unloaded, queues: state.queues, delivered: state.delivered });
  state = act(state, { kind: "stop" }); state = tick(state, 120);
  assert.deepEqual({ unloaded: state.unloaded, queues: state.queues, delivered: state.delivered }, frozen);
});
test("equipment and crew interlocks reject orders atomically", () => {
  const setup = createTerminalSetup(); setup.dispatch.drivers = 0;
  const state = createTerminalState(setup); const before = serializeTerminal(state);
  assert.match(terminalCommandIssue(state, { kind: "operate", target: "transport", running: true }), /车辆/);
  assert.throws(() => operate(state, "transport"), /车辆/); assert.equal(serializeTerminal(state), before);
});
test("second-based integration is invariant to clock chunking across all event scenarios", () => {
  for (const scenario of ["regular", "peak", "wind", "outage"] as TerminalScenario[]) {
    const initial = ready(createTerminalSetup(scenario));
    const continuous = tick(initial, 18000); let sliced = initial;
    for (let i = 0; i < 300; i++) sliced = tick(sliced, 60);
    assert.deepEqual(sliced, continuous); mass(sliced);
    if (scenario === "outage") assert.equal(sliced.repairWork, 90);
  }
});
test("realtime export replays every order and coalesces clock ticks without losing their timing", () => {
  let state = ready(); for (let i = 0; i < 100; i++) state = tick(state, 3);
  state = operate(state, "gate", false); state = tick(state, 451); state = operate(state, "gate"); state = tick(state, 50);
  assert.ok(state.commands.length < 20);
  const raw = serializeTerminal(state); assert.equal(JSON.parse(raw).schema, "terminal-lab/2.1");
  assert.deepEqual(restoreTerminal(raw), state);
});
test("optimized realtime plan finishes within the shift and a finished clock remains stopped", () => {
  const setup = createTerminalSetup(); setup.vehicle = "electric"; setup.vehicles = 12; setup.gateSystem = "smart";
  setup.dispatch.drivers = 12; setup.dispatch.gateClerks = 1;
  setup.facilities.push({ id: "charger-2", kind: "charger", col: 1, row: 1, rotation: 0 });
  const state = tick(ready(setup), 28800); mass(state); assert.ok(terminalComplete(state));
  assert.ok(state.minute < 480); assert.equal(tick(state, 300), state);
});
test("legacy 2.0 replays remain isolated from realtime commands", () => {
  const raw = JSON.stringify({ schema: "terminal-lab/2.0", setup: createTerminalSetup(), commands: [{ kind: "advance", minutes: 60 }, { kind: "answer", step: 0, option: 1 }] });
  const state = restoreTerminal(raw); assert.equal(state.engine, "legacy"); assert.ok(state.delivered > 1);
  assert.equal(serializeTerminal(state), raw); assert.throws(() => operate(state, "gate", false), /不支持/);
  const invalid = (commands: unknown[]) => JSON.stringify({ schema: "terminal-lab/2.1", setup: createTerminalSetup(), commands });
  for (const command of [{ kind: "tick", seconds: -1 }, { kind: "tick", seconds: 0.2 }, { kind: "tick", seconds: "2" }, { kind: "harbor", vessel: 2, action: "admit" }, { kind: "operate", target: "__proto__", running: true }]) assert.throws(() => restoreTerminal(invalid([command])));
});
