import assert from "node:assert/strict";
import test from "node:test";
import { createPortTutorial, applyPortTutorialCommand, portTutorialView, observePortTutorial, createPortCourse, applyPortCourseCommand, nextPortCourseStep, portCourseGoals, portCoursePerformance, createPortSession, applyPortCommand, portScore, portDeadline, serializePortSession, restorePortSession, defaultPortPlan } from "../src/index.js";

test("cargo guidance starts available work before waiting for independent receipts", () => {
  const t = createPortTutorial("cargo"), s = t.course.simulation;
  applyPortTutorialCommand(t, { kind: "start" });
  for (let i = 0; i < 20; i++) {
    const step = portTutorialView(t).current!;
    if (step.id === "work") break;
    if (step.id === "resources") { observePortTutorial(t, "resources-open"); continue; }
    assert.equal(step.phase, "action", "no receipt wait before all available preparation");
    const b = s.batches[step.id.slice(step.id.startsWith("yard:") ? 5 : 10)]!;
    applyPortTutorialCommand(t, step.id.startsWith("yard:") ? { kind: "assign-yard", batchId: b.id, yardId: b.flow === "import" ? "Y1" : "Y3" } : { kind: "batch-document", batchId: b.id, value: b.reference });
  }
  assert.equal(portTutorialView(t).current?.id, "work");
  assert.ok(Object.values(s.batches).every(b => b.document.status === "submitted"));
  assert.equal(applyPortTutorialCommand(t, { kind: "work", callId: "S01", running: true }).outcome, "applied");
});

test("yard guidance reports an existing exception before unrelated paperwork and continues other work", () => {
  const t = createPortTutorial("yard"), s = t.course.simulation;
  applyPortTutorialCommand(t, { kind: "start" });
  applyPortTutorialCommand(t, { kind: "dispatch", dispatch: defaultPortPlan().equipment.dispatch });
  assert.equal(portTutorialView(t).current?.id, "issue-open");
  const box = Object.values(s.boxes).find(b => b.issue === "open")!;
  observePortTutorial(t, `box:${box.id}`);
  applyPortTutorialCommand(t, { kind: "inspect", boxId: box.id, yardId: "Y6" });
  assert.ok(portTutorialView(t).current?.id.startsWith("yard:"));
  assert.equal(box.issue, "reported");
});

test("departure distinguishes berth release from channel release and preserves old goal definitions", () => {
  const r = createPortCourse("departure");
  let separate = false;
  for (let i = 0; i < 150 && !r.complete; i++) {
    applyPortCourseCommand(r, nextPortCourseStep(r)!.command);
    const g = portCourseGoals(r);
    if (g[1]!.done && !g[2]!.done) separate = true;
  }
  assert.ok(separate); assert.ok(r.complete);
  assert.equal(portCourseGoals(createPortCourse("departure", "port-course/1.1"))[2]!.id, "released");
});

test("parallel cargo preparation retains lower elapsed time as separate quality evidence", () => {
  const run = (serial: boolean) => {
    const r = createPortCourse("cargo"), s = r.simulation;
    const act = (c: Parameters<typeof applyPortCourseCommand>[1]) => applyPortCourseCommand(r, c);
    act({ kind: "start" });
    for (const b of Object.values(s.batches)) {
      act({ kind: "batch-document", batchId: b.id, value: b.reference });
      if (serial) act({ kind: "advance", seconds: 900 });
    }
    if (!serial) act({ kind: "advance", seconds: 900 });
    return portCoursePerformance(r);
  };
  const parallel = run(false), serial = run(true);
  assert.equal(serial.elapsed - parallel.elapsed, 2700);
  assert.equal(serial.submissionSpan, 2700); assert.equal(parallel.submissionSpan, 0);
  assert.ok(serial.cost > parallel.cost);
});

test("new process score distinguishes late departure and legacy records retain the original formula", () => {
  const s = createPortSession("battle");
  s.second = 100000; s.calls.S01!.arrivedAt = 0;
  s.calls.S01!.milestones = { admit: 10, secure: 20, work: 30, depart: 40 };
  assert.equal(portScore(s).process, 20);
  s.calls.S01!.milestones.depart = portDeadline(s, "S01", "ship") + 1;
  assert.equal(portScore(s).process, 15);
  s.scoringVersion = 1; assert.equal(portScore(s).process, 20);
  const fresh = createPortSession("battle"); applyPortCommand(fresh, { kind: "start" });
  const modern = restorePortSession(serializePortSession(fresh)); assert.equal(modern.scoringVersion, 2);
  const raw = JSON.parse(serializePortSession(fresh)); delete raw.scoringVersion;
  assert.equal(portScore(restorePortSession(JSON.stringify(raw))).scoringVersion, 1);
});
