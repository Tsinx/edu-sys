import assert from 'node:assert/strict';
import test from 'node:test';
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, portCourseScore, portCourseView, serializePortCourse, restorePortCourse, makePortSubmission, verifyPortSubmission, type PortCourseUnit } from '../src/index.js';

for (const unit of ['arrival', 'cargo', 'yard', 'planning', 'departure'] as PortCourseUnit[]) {
  test(`${unit}: actual penalties reach local grades and server grades`, async () => {
    const run = createPortCourse(unit, undefined, 'battle');
    if (unit === 'planning') applyPortCourseCommand(run, { kind: 'course-plan', plan: run.simulation.plan });
    applyPortCourseCommand(run, { kind: 'start' });
    const wrong = { kind: 'depart' as const, callId: 'S01' };
    const first = applyPortCourseCommand(run, wrong);
    assert.equal(first.deduction, 5);
    assert.equal(applyPortCourseCommand(run, wrong).deduction, 0, 'same violation is not penalized twice');
    assert.ok(portCourseScore(run).total >= 0, 'grade cannot become negative');
    if (unit !== 'planning') assert.equal(portCourseScore(run).total, 0);
    for (let n = 0; n < 1500 && !run.complete; n++) {
      const step = nextPortCourseStep(run); assert.ok(step); applyPortCourseCommand(run, step.command);
    }
    assert.ok(run.complete);
    assert.deepEqual(portCourseScore(run), { completion: 100, deductions: 5, total: 95 });
    assert.equal(portCourseView(run).lesson.score.total, 95);
    const raw = serializePortCourse(run), pkg = await makePortSubmission(raw, run.simulation);
    assert.equal(portCourseScore(restorePortCourse(raw)).total, 95);
    const verified = await verifyPortSubmission(pkg);
    assert.equal(verified.result.score, 95);
    assert.equal(verified.result.courseScore?.deductions, 5);
    assert.equal(verified.nodes.filter(n => n.source === 'student').reduce((sum, n) => sum + n.result.deduction, 0), 5);
    await assert.rejects(verifyPortSubmission({ ...pkg, expected: { ...pkg.expected, score: 100 } }), /不一致/);
    const legacy = await verifyPortSubmission({ ...pkg, schema: 'port-experiment-submission/1', expected: { ...pkg.expected, score: 100 } });
    assert.equal(legacy.result.score, 95, 'old sealed completion-only package is corrected by server');
  });
}

test('practice explains the same mistake without a grade deduction', () => {
  const run = createPortCourse('arrival');
  applyPortCourseCommand(run, { kind: 'start' });
  assert.equal(applyPortCourseCommand(run, { kind: 'depart', callId: 'S01' }).deduction, 0);
  assert.equal(portCourseScore(run).deductions, 0);
});
