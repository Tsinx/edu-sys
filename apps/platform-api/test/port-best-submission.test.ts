import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, serializePortCourse, makePortSubmission } from '@edu/port-simulation-core';
import { PortSubmissionRepository } from '../src/port-submissions.js';

test('highest score and its exact evidence survive lower, equal, concurrent submissions and legacy migration', { timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'edu-port-best-')), path = join(dir, 'results.sqlite');
  let repo = new PortSubmissionRepository(path);
  const actor = { actorId: 'student', displayName: '测试学生', roles: ['student'] as ['student'], identitySource: 'campus_local' as const };
  const courseId = 'course-port-management-intro';
  async function pkg(mistakes: number) {
    const run = createPortCourse('arrival', undefined, 'battle');
    applyPortCourseCommand(run, { kind: 'start' });
    if (mistakes > 0) applyPortCourseCommand(run, { kind: 'depart', callId: 'S01' });
    if (mistakes > 1) applyPortCourseCommand(run, { kind: 'work', callId: 'S01', running: true });
    while (!run.complete) { const step = nextPortCourseStep(run); assert.ok(step); applyPortCourseCommand(run, step.command); }
    return makePortSubmission(serializePortCourse(run), run.simulation);
  }
  const wait = async (id: string) => {
    for (let n = 0; n < 500; n++) {
      const row = repo.get(id)!;
      if (['verified', 'rejected'].includes(row.status)) { assert.equal(row.status, 'verified', row.error ?? ''); return row; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('verification timeout');
  };
  const best = () => repo.results(courseId, actor.actorId).results[0]!;
  try {
    const [p95, p90, p100] = await Promise.all([pkg(1), pkg(2), pkg(0)]);
    assert.deepEqual([p95.expected.score, p90.expected.score, p100.expected.score], [95, 90, 100]);
    const send = (p: typeof p95) => repo.submit(actor, { courseId, expectedRevision: 0, requestId: randomUUID(), package: p });
    const first = send(p95); await wait(first.id);
    const lower = send(p90); await wait(lower.id);
    assert.equal(best().id, first.id); assert.equal(best().result!.score, 95);
    assert.equal(JSON.parse(repo.get(best().id)!.package).record, p95.record);
    // Reproduce a pre-fix database: scores omitted penalties and latest pointed at the lower attempt.
    for (const id of [first.id, lower.id]) {
      const evidence = JSON.parse(repo.get(id)!.verified!);
      evidence.result.score = 100; delete evidence.result.courseScore; evidence.result.verifier = 'port-verifier/1';
      repo.db.prepare('UPDATE port_submissions SET verified=?,result=? WHERE id=?').run(JSON.stringify(evidence), JSON.stringify(evidence.result), id);
    }
    repo.db.prepare('UPDATE port_latest SET submission_id=?').run(lower.id);
    repo.db.exec('DELETE FROM port_result_rules');
    await repo.close(); repo = new PortSubmissionRepository(path);
    assert.equal(best().id, first.id); assert.equal(best().result!.score, 95);
    assert.equal(JSON.parse(repo.get(lower.id)!.verified!).result.score, 90);
    assert.equal(JSON.parse(repo.get(first.id)!.verified!).result.stateHash, p95.expected.stateHash);
    const concurrent = [send(p90), send(p100)]; await Promise.all(concurrent.map(s => wait(s.id)));
    assert.equal(best().id, concurrent[1]!.id); assert.equal(best().result!.score, 100);
    const winner = repo.get(best().id)!;
    const tied = send(p100); await wait(tied.id);
    assert.equal(best().id, winner.id, 'equal score keeps the earlier verified attempt');
    assert.equal(repo.get(best().id)!.verified, winner.verified, 'score and full trajectory stay bound together');
    await repo.close(); repo = new PortSubmissionRepository(path);
    assert.equal(best().id, winner.id); assert.equal(best().result!.score, 100);
    assert.equal(repo.db.prepare('SELECT COUNT(*) AS n FROM port_submissions').get()!.n, 5, 'audit history is preserved');
  } finally { await repo.close(); await rm(dir, { recursive: true, force: true }); }
});
