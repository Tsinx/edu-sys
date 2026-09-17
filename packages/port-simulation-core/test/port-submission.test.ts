import assert from "node:assert/strict";
import test from "node:test";
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, serializePortCourse, portCourseGoals, type PortCourseUnit } from "../src/port-course.js";
import { createPortSession, applyPortCommand } from "../src/port-operations-engine.js";
import { makePortSubmission, verifyPortSubmission, PortSubmissionReplay, portStateHash } from "../src/port-submission.js";
import { serializePortSession } from "../src/port-operations-review.js";

for (const unit of ["arrival", "cargo", "yard", "planning", "departure"] as PortCourseUnit[]) {
  test(`${unit}: partial and completed submission replay actual goals with system operations separated`, async () => {
    const run = createPortCourse(unit);
    const zero = await makePortSubmission(serializePortCourse(run), run.simulation);
    assert.equal(zero.expected.score, 0);
    assert.equal(zero.expected.score, Math.round(portCourseGoals(run).filter(g => g.done).length / portCourseGoals(run).length * 10000) / 100);
    let partial = false;
    for (let i = 0; i < 1000 && !run.complete; i++) {
      const step = nextPortCourseStep(run); assert.ok(step);
      applyPortCourseCommand(run, step.command);
      const done = portCourseGoals(run).filter(g => g.done).length;
      if (!partial && done > 0 && !run.complete) {
        const pkg = await makePortSubmission(serializePortCourse(run), run.simulation);
        const checked = await verifyPortSubmission(pkg);
        assert.ok(checked.result.score > 0 && checked.result.score < 100);
        partial = true;
      }
    }
    assert.ok(run.complete); assert.ok(partial);
    const pkg = await makePortSubmission(serializePortCourse(run), run.simulation), checked = await verifyPortSubmission(pkg);
    assert.equal(checked.result.score, 100);
    assert.equal(checked.nodes[0]?.source, "system_preset");
    if (unit === "planning") {
      const trials = checked.nodes.filter(n => n.source === "system_trial"); assert.ok(trials.length > 0);
      const player = new PortSubmissionReplay(pkg.record);
      for (const trial of [trials[0]!, trials.at(-1)!]) {
        const offset = trials.filter(n => n.commandIndex === trial.commandIndex).findIndex(n => n.index === trial.index);
        const view = player.trialView(trial.commandIndex, offset);
        assert.equal(view.second, trial.at, "system node scene is reconstructed at the operation time");
        assert.equal(view.attempts.at(-1)?.rule, trial.result.rule);
      }
      player.seek(player.inputs.length);
      assert.equal(await portStateHash(player.session), pkg.expected.stateHash);
    }
    const replay = new PortSubmissionReplay(pkg.record);
    replay.seek(Math.floor(replay.inputs.length / 2)); replay.seek(0); replay.seek(replay.inputs.length);
    assert.equal(await portStateHash(replay.session), pkg.expected.stateHash);
  });
}
test("rejected operations remain in captured input; tampering and unknown versions fail", async () => {
  const run = createPortCourse("arrival");
  applyPortCourseCommand(run, { kind: "depart", callId: "S01" });
  const pkg = await makePortSubmission(serializePortCourse(run), run.simulation);
  const checked = await verifyPortSubmission(pkg);
  assert.ok(checked.nodes.some(n => n.result.outcome === "stale"));
  await assert.rejects(verifyPortSubmission({ ...pkg, expected: { ...pkg.expected, score: 100 } }), /不一致/);
  const broken = JSON.parse(pkg.record); broken.inputLog.push({ kind: "unknown" });
  await assert.rejects(verifyPortSubmission({ ...pkg, record: JSON.stringify(broken) }), /未知/);
  broken.schema = "future";
  assert.throws(() => new PortSubmissionReplay(JSON.stringify(broken)), /版本/);
  const demo = JSON.parse(pkg.record); demo.demo = true;
  await assert.rejects(makePortSubmission(JSON.stringify(demo)), /演示/);
});
test("old records are replayable without claiming complete rejected-operation coverage", async () => {
  const run = createPortCourse("arrival"); applyPortCourseCommand(run, { kind: "start" }); applyPortCourseCommand(run, { kind: "pause" });
  const raw = JSON.parse(serializePortCourse(run)); delete raw.inputLog; delete raw.traceCoverage;
  const verified = await verifyPortSubmission(await makePortSubmission(JSON.stringify(raw)));
  assert.equal(verified.result.traceCoverage, "legacy");
});
test("comprehensive submission requires completed battle and preserves scores and container evidence", { timeout: 180000 }, async () => {
  const practice = createPortSession("practice");
  await assert.rejects(makePortSubmission(serializePortSession(practice)), /48小时/);
  const interrupted = createPortSession("battle"); applyPortCommand(interrupted, { kind: "start" }); applyPortCommand(interrupted, { kind: "interrupt" });
  await assert.rejects(makePortSubmission(serializePortSession(interrupted)), /48小时/);
  const full = createPortSession("battle"); applyPortCommand(full, { kind: "start" }); applyPortCommand(full, { kind: "advance", seconds: 172800 });
  const pkg = await makePortSubmission(serializePortSession(full), full), verified = await verifyPortSubmission(pkg);
  assert.equal(verified.result.stateHash, await portStateHash(full));
  assert.equal(verified.result.breakdown!.total, pkg.expected.score);
  assert.ok(verified.report.containerLedger.length > 0);
  const raw = JSON.parse(pkg.record); raw.schedule[0].ata++;
  await assert.rejects(verifyPortSubmission({ ...pkg, record: JSON.stringify(raw) }), /船期/);
});
