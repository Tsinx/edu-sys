import assert from "node:assert/strict";
import test from "node:test";
import { applyTrainingCommand as act, createTerminalTraining, createNormalTrainingSetup, restoreTraining, serializeTraining, trainingScore, suspendRestoredTraining, trainingStorageKey, type TerminalTraining, type TrainingOrder } from "../src/terminal-training.js";
import { terminalComplete, terminalMetrics, restoreTerminal, serializeTerminal, createTerminalState } from "../src/terminal-lab.js";
const order = (s: TerminalTraining, o: TrainingOrder, eventId?: string) => act(s, { kind: "order", order: o, eventId });
const resume = (s: TerminalTraining) => act(s, { kind: s.status === "ready" ? "start" : "resume" });
const tick = (s: TerminalTraining, seconds: number) => act(s, { kind: "tick", seconds });
function finish(s: TerminalTraining) {
  s = resume(s);
  for (let n = 0; n < 40 && s.status !== "completed"; n++) {
    for (let pass = 0; pass < 4; pass++) for (const e of s.events.filter(e => e.status === "pending")) s = order(s, e.order, e.id);
    s = resume(s); s = tick(s, 28800);
  }
  return s;
}
test("normal baseline has sufficient resources and completes both arenas with 100 points", () => {
  const m = terminalMetrics(createNormalTrainingSetup()); assert.equal(m.budget, 736); assert.equal(m.personnel, 23);
  const practice = finish(createTerminalTraining());
  assert.ok(terminalComplete(practice.simulation)); assert.equal(trainingScore(practice).total, 100);
  assert.equal(practice.events.length, 9); assert.ok(practice.simulation.minute < 480);
  assert.equal(practice.notifications.length, 3, "each unloading notification and full-delivery notice occurs once");
  // Reuse the identical successful timeline with battle rules. Explicit resumes are harmless.
  let battle = createTerminalTraining("battle");
  for (const c of practice.commands) battle = act(battle, c);
  assert.equal(trainingScore(battle).total, 100); assert.deepEqual(battle.simulation, practice.simulation);
  assert.deepEqual(restoreTraining(serializeTraining(practice)), practice);
  assert.deepEqual(restoreTraining(serializeTraining(battle)), battle);
});
test("large ticks pause exactly at first actionable boundary; manual waiting cannot repause same event", () => {
  let s = resume(createTerminalTraining()); assert.equal(s.status, "paused");
  s = order(s, { kind: "harbor", vessel: 0, action: "admit" });
  s = order(s, { kind: "harbor", vessel: 1, action: "admit" });
  assert.equal(s.attempts.at(-1)!.outcome, "waiting"); assert.equal(trainingScore(s).deductions, 0);
  s = tick(resume(s), 28800); assert.equal(s.simulation.minute, 12); assert.equal(s.status, "paused");
  s = tick(resume(s), 60); assert.equal(s.simulation.minute, 13); assert.equal(s.status, "running");
  assert.deepEqual(restoreTraining(serializeTraining(s)), s);
});
test("mistakes are blocked, recorded, deduplicated by node and rule, and remain correctable", () => {
  for (const mode of ["practice", "battle"] as const) {
    let s = resume(createTerminalTraining(mode));
    for (let i = 0; i < 3; i++) s = order(s, { kind: "harbor", vessel: 0, action: "secure" }, "a-admit");
    s = order(s, { kind: "operate", target: "crane-a", running: true }, "a-admit");
    assert.equal(s.attempts.filter(a => a.outcome === "incorrect").length, 4);
    assert.equal(trainingScore(s).deductions, mode === "battle" ? 10 : 0);
    assert.equal(trainingScore(s).total, 0); assert.equal(s.simulation.operations.secured[0], false);
    const correct = finish(createTerminalTraining());
    // Replay successful orders and elapsed seconds with no practice pauses in battle.
    for (const c of correct.commands.slice(1)) s = act(s, c);
    assert.ok(terminalComplete(s.simulation)); assert.equal(trainingScore(s).total, mode === "battle" ? 90 : 100);
    assert.deepEqual(restoreTraining(serializeTraining(s)), s);
  }
});
test("pre-armed downstream crews earn credit from actual work; stale cards and invalid forms cost nothing", () => {
  let s = resume(createTerminalTraining());
  for (const target of ["transport", "yard", "gate"] as const) s = order(s, { kind: "operate", target, running: true });
  assert.equal(trainingScore(s).total, 0);
  s = order(s, { kind: "harbor", vessel: 0, action: "admit" }, "a-admit");
  s = order(s, { kind: "harbor", vessel: 0, action: "secure" }, "a-admit");
  assert.equal(s.attempts.at(-1)!.outcome, "stale");
  s = order(s, { kind: "dispatch", value: { ...s.simulation.setup.dispatch, drivers: 99 } });
  assert.equal(s.attempts.at(-1)!.outcome, "invalid");
  s = finish(s); assert.equal(trainingScore(s).total, 100);
  for (const id of ["transport", "yard", "gate"]) assert.equal(s.events.find(e => e.id === id)!.noticed, false);
});
test("zero personnel and full buffers provide non-penalized waiting and permit resource recovery", () => {
  const setup = createNormalTrainingSetup(); setup.dispatch.drivers = 0;
  let s = resume(createTerminalTraining("battle", setup));
  s = order(s, { kind: "operate", target: "transport", running: true }); assert.equal(s.attempts.at(-1)!.outcome, "waiting");
  s = order(s, { kind: "harbor", vessel: 0, action: "admit" }); s = tick(s, 720);
  s = order(s, { kind: "harbor", vessel: 0, action: "secure" }); s = order(s, { kind: "operate", target: "crane-a", running: true }); s = tick(s, 3600);
  assert.equal(s.simulation.queues[0], 60); assert.match(s.events.find(e => e.id === "transport")!.reason, /车辆/);
  s = order(s, { kind: "dispatch", value: { ...setup.dispatch, drivers: 12 } });
  for (const target of ["transport", "yard", "gate"] as const) s = order(s, { kind: "operate", target, running: true });
  s = tick(s, 600); assert.ok(s.simulation.delivered > 0); assert.equal(trainingScore(s).deductions, 0);
});
test("battle cannot pause, delays do not incur timeout penalties, restore is interrupted and isolated", () => {
  let s = resume(createTerminalTraining("battle")); s = act(s, { kind: "pause" }); assert.equal(s.status, "running");
  s = tick(s, 3600); assert.equal(s.simulation.minute, 60); assert.equal(trainingScore(s).deductions, 0);
  const restored = suspendRestoredTraining(restoreTraining(serializeTraining(s))); assert.equal(restored.status, "interrupted");
  assert.equal(resume(restored).status, "interrupted"); assert.equal(tick(restored, 100).simulation.minute, 60);
  assert.notEqual(trainingStorageKey("actor:course", "regular", "practice"), trainingStorageKey("actor:course", "regular", "battle"));
  assert.notEqual(trainingStorageKey("actor:course", "regular", "practice"), trainingStorageKey("actor2:course", "regular", "practice"));
});
test("new exports recompute scores, reject oversized time and leave legacy 2.0 / 2.1 ungraded", () => {
  const raw = JSON.parse(serializeTraining(createTerminalTraining())); raw.review.score.total = 100;
  assert.equal(trainingScore(restoreTraining(JSON.stringify(raw))).total, 0);
  raw.commands = [{ kind: "tick", seconds: 28801 }]; assert.throws(() => restoreTraining(JSON.stringify(raw)));
  for (const engine of ["legacy", "realtime"] as const) {
    const state = createTerminalState(undefined, engine); assert.deepEqual(restoreTerminal(serializeTerminal(state)), state);
    assert.throws(() => restoreTraining(serializeTerminal(state)));
  }
  const setup = Object.assign(createNormalTrainingSetup(), { studentName: "secret", token: "secret" });
  assert.ok(!serializeTraining(createTerminalTraining("practice", setup)).includes("secret"));
});
