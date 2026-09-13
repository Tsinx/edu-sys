import assert from "node:assert/strict";
import test from "node:test";
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, portCourseGoals, portCourseView, serializePortCourse, restorePortCourse, createPortSession, portCargoDone, defaultPortPlan, type PortCourseUnit } from "../src/index.js";

const units: PortCourseUnit[] = ["arrival", "cargo", "yard", "planning", "departure"];
test("course fixtures retain real prerequisites and box ledgers without changing the 48-hour scenario", () => {
  const arrival = createPortCourse("arrival"), cargo = createPortCourse("cargo"), yard = createPortCourse("yard"), departure = createPortCourse("departure");
  assert.equal(arrival.simulation.calls.S01!.stage, "approach");
  assert.equal(cargo.simulation.calls.S01!.stage, "berthed");
  assert.equal(cargo.simulation.calls.S01!.docs.entry.status, "approved");
  assert.equal(Object.keys(cargo.simulation.boxes).length, 194);
  assert.equal(portCargoDone(cargo.simulation, "S01"), false);
  assert.ok(Object.values(yard.simulation.boxes).some(b => b.issue === "open" && b.history.length));
  assert.equal(portCourseView(yard).view.batches.length, 2);
  assert.equal(portCargoDone(departure.simulation, "S01"), true);
  assert.equal(departure.simulation.calls.S01!.docs.departure.status, "draft");
  assert.ok(Object.values(departure.simulation.boxes).every(b => b.history.length));
  assert.deepEqual(Object.keys(departure.simulation.calls), ["S01"]);
  assert.ok(createPortSession().schedules.length > 1);
});
for (const demo of [false, true]) test(`${demo ? "demonstration" : "independent exercise"} completes every module through actual commands and replays exactly`, () => {
  for (const unit of units) {
    const r = createPortCourse(unit);
    for (let i = 0; i < 250 && !r.complete; i++) {
      const step = nextPortCourseStep(r);
      assert.ok(step);
      const result = applyPortCourseCommand(r, step.command, demo);
      assert.equal(result.deduction, 0);
      assert.notEqual(result.outcome, "incorrect", `${unit}: ${result.message}`);
    }
    assert.equal(r.complete, true, `${unit} must finish`);
    assert.ok(portCourseGoals(r).every(g => g.done));
    const restored = restorePortCourse(serializePortCourse(r, demo));
    assert.deepEqual(portCourseView(restored), portCourseView(r));
    assert.deepEqual(restored.simulation.boxes, r.simulation.boxes);
    assert.deepEqual(restored.simulation.jobs, r.simulation.jobs);
    const second = r.simulation.second;
    applyPortCourseCommand(r, { kind: "advance", seconds: 10000 }, demo);
    assert.equal(r.simulation.second, second);
  }
});
test("lesson goals pause at verified milestones once and cannot be completed by a premature click", () => {
  const r = createPortCourse("arrival");
  applyPortCourseCommand(r, { kind: "start" });
  const wrong = applyPortCourseCommand(r, { kind: "move", callId: "S01", target: "berth", slot: 0 });
  assert.equal(wrong.outcome, "incorrect");
  assert.equal(wrong.deduction, 0);
  assert.ok(portCourseGoals(r).every(g => !g.done));
  for (const document of ["entry", "health", "border"] as const) applyPortCourseCommand(r, { kind: "document", callId: "S01", document, value: r.simulation.calls.S01!.docs[document].reference });
  applyPortCourseCommand(r, { kind: "advance", seconds: 20000 });
  assert.equal(r.simulation.second, 600);
  assert.equal(r.simulation.status, "paused");
  applyPortCourseCommand(r, { kind: "resume" });
  applyPortCourseCommand(r, { kind: "advance", seconds: 60 });
  assert.equal(r.simulation.second, 660);
  assert.equal(r.simulation.status, "running");
  const raw = JSON.parse(serializePortCourse(r)); raw.complete = true; raw.score = 100;
  const restored = restorePortCourse(JSON.stringify(raw));
  assert.equal(restored.complete, false);
  assert.equal(restored.simulation.status, "paused");
});
test("planning requires real trial output, preserves chosen equipment and refuses invalid construction", () => {
  const r = createPortCourse("planning"), plan = defaultPortPlan();
  assert.equal(applyPortCourseCommand(r, { kind: "start" }).outcome, "waiting");
  assert.equal(String(r.simulation.status), "ready");
  plan.equipment.vehicle = "agv"; plan.equipment.dispatch.drivers = 3;
  plan.yards[0]!.use = "export"; plan.yards[2]!.use = "import";
  applyPortCourseCommand(r, { kind: "course-plan", plan });
  assert.equal(r.complete, false);
  applyPortCourseCommand(r, { kind: "start" });
  for (let i = 0; i < 100 && !r.complete; i++) { if (r.simulation.status === "paused") applyPortCourseCommand(r, { kind: "resume" }); applyPortCourseCommand(r, { kind: "advance", seconds: 600 }); }
  assert.equal(r.complete, true);
  assert.equal(r.simulation.plan.equipment.vehicle, "agv");
  assert.equal(r.simulation.plan.yards[0]!.use, "export");
  assert.equal(r.simulation.plan.yards.find(y => y.id === r.simulation.batches["S01-I1"]!.targetYard)!.use, "import");
  assert.ok(Object.values(r.simulation.boxes).filter(b => b.deliveredAt !== null).length >= 12);
  assert.ok(Object.values(r.simulation.boxes).filter(b => b.loadedAt !== null).length >= 12);
  const invalid = defaultPortPlan(); invalid.yards.forEach(y => y.use = "mixed");
  assert.throws(() => applyPortCourseCommand(createPortCourse("planning"), { kind: "course-plan", plan: invalid }), /核查/);
});
