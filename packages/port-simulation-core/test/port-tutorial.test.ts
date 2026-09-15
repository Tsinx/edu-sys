import assert from "node:assert/strict";
import test from "node:test";
import { createPortTutorial, portTutorialView, applyPortTutorialCommand, observePortTutorial, defaultPortPlan, createPortCourse, serializePortCourse, type PortTutorialRun, type PortCourseUnit } from "../src/index.js";

function drive(t: PortTutorialRun) {
  const view = portTutorialView(t), step = view.current, s = t.course.simulation;
  if (!step) return;
  const act = (command: Parameters<typeof applyPortTutorialCommand>[1]) => applyPortTutorialCommand(t, command);
  if (step.id === "dossier") return observePortTutorial(t, "ship-open");
  if (step.id === "resources" || step.id === "plan-resources") return observePortTutorial(t, "resources-open");
  if (["cargo-check", "ledger", "issue-open"].includes(step.id)) {
    const box = step.id === "issue-open" ? s.boxes[step.focus]! : Object.values(s.boxes).find(b => b.history.length)!;
    return observePortTutorial(t, `box:${box.id}`);
  }
  if (step.id === "review") return observePortTutorial(t, "review-open");
  if (step.id === "plan") return act({ kind: "course-plan", plan: defaultPortPlan() });
  if (step.id === "start") return act({ kind: "start" });
  if (step.id === "dispatch") return act({ kind: "dispatch", dispatch: defaultPortPlan().equipment.dispatch });
  if (["waiting", "running"].includes(step.phase)) return act(s.status === "paused" ? { kind: "resume" } : { kind: "advance", seconds: 100000 });
  if (step.id.startsWith("doc:")) { const document = step.id.slice(4) as "entry" | "health" | "border" | "departure"; return act({ kind: "document", callId: "S01", document, value: s.calls.S01!.docs[document].reference }); }
  if (step.id.startsWith("yard:")) {
    const b = s.batches[step.id.slice(5)]!;
    // Deliberately choose a different compatible target than a fixed first-choice solution.
    return act({ kind: "assign-yard", batchId: b.id, yardId: b.flow === "import" ? (b.id.endsWith("1") ? "Y2" : "Y1") : (b.id.endsWith("1") ? "Y4" : "Y3") });
  }
  if (step.id.startsWith("batch-doc:")) { const b = s.batches[step.id.slice(10)]!; return act({ kind: "batch-document", batchId: b.id, value: b.reference }); }
  if (step.id === "berth") return act({ kind: "move", callId: "S01", target: "berth", slot: 1 });
  if (step.id === "work") return act({ kind: "work", callId: "S01", running: true });
  if (step.id === "inspect") return act({ kind: "inspect", boxId: step.focus, yardId: "Y6" });
  if (step.id === "depart") return act({ kind: "depart", callId: "S01" });
  throw new Error(`No valid progress: ${step.id} ${step.phase}`);
}

for (const unit of ["arrival", "cargo", "yard", "planning", "departure"] as PortCourseUnit[]) test(`interactive ${unit} tutorial finishes only through real commands and review`, () => {
  const t = createPortTutorial(unit), original = createPortCourse(unit), raw = serializePortCourse(original);
  for (let i = 0; i < 500 && !portTutorialView(t).complete; i++) {
    const result = drive(t);
    assert.notEqual(result?.outcome, "incorrect", `${unit}: ${result?.message}`);
    assert.notEqual(result?.outcome, "invalid", `${unit}: ${result?.message}`);
    assert.equal(result?.deduction ?? 0, 0);
  }
  assert.equal(portTutorialView(t).complete, true, `${unit}: ${JSON.stringify(portTutorialView(t).current)}`);
  assert.equal(t.course.complete, true);
  assert.equal(serializePortCourse(original), raw);
  assert.equal(new Set(t.stops).size, t.stops.length);
  assert.ok(t.course.simulation.attempts.length > t.course.baselineAttempts);
});

test("viewing gestures and unsupported observations never execute work or finish business steps", () => {
  const t = createPortTutorial("arrival"), before = JSON.stringify(t.course.simulation);
  for (let i = 0; i < 30; i++) { portTutorialView(t); observePortTutorial(t, "next"); observePortTutorial(t, "complete"); }
  assert.equal(JSON.stringify(t.course.simulation), before);
  observePortTutorial(t, "ship-open");
  applyPortTutorialCommand(t, { kind: "start" });
  observePortTutorial(t, "review-open");
  assert.equal(portTutorialView(t).current?.id, "doc:entry");
  assert.equal(portTutorialView(t).complete, false);
});

test("feedback stops at the actual event and manual resume does not stop repeatedly", () => {
  const t = createPortTutorial("arrival");
  observePortTutorial(t, "ship-open"); applyPortTutorialCommand(t, { kind: "start" });
  applyPortTutorialCommand(t, { kind: "document", callId: "S01", document: "entry", value: t.course.simulation.calls.S01!.docs.entry.reference });
  const due = t.course.simulation.events.find(e => e.kind === "doc")!.at;
  assert.equal(portTutorialView(t).current?.phase, "waiting");
  assert.ok(portTutorialView(t).current?.targets.includes("clock:resume"));
  applyPortTutorialCommand(t, { kind: "resume" });
  assert.equal(portTutorialView(t).current?.phase, "running");
  assert.ok(portTutorialView(t).current?.targets.every(t=>!t.startsWith("clock:")));
  applyPortTutorialCommand(t, {kind:"pause"});
  assert.ok(portTutorialView(t).current?.targets.includes("clock:resume"));
  applyPortTutorialCommand(t, {kind:"resume"});
  applyPortTutorialCommand(t, { kind: "advance", seconds: 100000 });
  assert.equal(t.course.simulation.second, due);
  assert.equal(t.course.simulation.status, "paused");
  assert.equal(portTutorialView(t).current?.id, "doc:health");
  applyPortTutorialCommand(t, { kind: "resume" }); applyPortTutorialCommand(t, { kind: "advance", seconds: 1 });
  assert.equal(t.course.simulation.second, due + 1);
  assert.equal(t.course.simulation.status, "running");
});

test("anchorage is a valid intermediate route and correction can continue", () => {
  const t = createPortTutorial("arrival");
  for(let i=0;i<80&&portTutorialView(t).current?.id!=="berth";i++) drive(t);
  assert.equal(portTutorialView(t).current?.id,"berth");
  const wrong = applyPortTutorialCommand(t, { kind: "move", callId: "S01", target: "anchor", slot: 9 });
  assert.equal(wrong.deduction, 0);
  assert.equal(applyPortTutorialCommand(t, { kind: "move", callId: "S01", target: "anchor", slot: 0 }).outcome, "applied");
  applyPortTutorialCommand(t, { kind: "resume" }); applyPortTutorialCommand(t, { kind: "advance", seconds: t.course.simulation.calls.S01!.move!.end - t.course.simulation.second });
  assert.equal(t.course.simulation.calls.S01!.stage, "anchored");
  assert.equal(portTutorialView(t).current?.id, "berth");
  assert.equal(portTutorialView(t).current?.phase, "action");
  for (let i = 0; i < 30 && !portTutorialView(t).complete; i++) drive(t);
  assert.equal(portTutorialView(t).complete, true);
});

test("wrong documents, insufficient resources and early valid configuration preserve a path forward", () => {
  const t = createPortTutorial("cargo");
  applyPortTutorialCommand(t, { kind: "start" });
  const b = t.course.simulation.batches["S01-I1"]!;
  applyPortTutorialCommand(t, { kind: "batch-document", batchId: b.id, value: "wrong" });
  applyPortTutorialCommand(t, { kind: "resume" }); applyPortTutorialCommand(t, { kind: "advance", seconds: 2000 });
  applyPortTutorialCommand(t, { kind: "resume" }); applyPortTutorialCommand(t, { kind: "advance", seconds: 2000 });
  assert.equal(b.document.status, "correction");
  applyPortTutorialCommand(t, { kind: "assign-yard", batchId: b.id, yardId: "Y2" });
  assert.equal(portTutorialView(t).steps.find(x => x.id === `yard:${b.id}`)?.done, true);
  for (let i = 0; i < 500 && !portTutorialView(t).complete; i++) drive(t);
  assert.equal(portTutorialView(t).complete, true);
  const yard = createPortTutorial("yard"); applyPortTutorialCommand(yard, { kind: "start" });
  assert.equal(portTutorialView(yard).current?.id, "dispatch");
  applyPortTutorialCommand(yard, { kind: "resume" }); applyPortTutorialCommand(yard, { kind: "advance", seconds: 600 });
  assert.equal(portTutorialView(yard).current?.id, "dispatch");
  assert.ok(portTutorialView(yard).current?.targets.includes("dispatch-apply"));
});
