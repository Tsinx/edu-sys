import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ECONOMIC_MATHEMATICS_COURSE_ID as courseId, ECONOMIC_MATHEMATICS_DECK_ID as deckId,
  ECONOMIC_MATHEMATICS_VERSION_ID as versionId } from '@edu/course-content/economic-mathematics';
import { getCourseDeckByCourseId } from '@edu/course-content/deck-registry';
import { buildApp } from '../src/app.js';

test('start/resume bypasses archived economics classrooms without migrating their records, and reuses a compatible class', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'econ-classroom-recovery-')), dataFile = join(dir, 'state.json');
  let app = await buildApp({ dataFile, portSimulationTickMs: 0, allowLegacyDevelopmentIdentity: false });
  try {
    const login = async () => {
      const response = await app.inject({ method: 'POST', url: '/api/identity/development/session', payload: {
        role: 'teacher', participantId: 'economic-classroom-recovery', displayName: '课堂恢复测试'
      } });
      assert.equal(response.statusCode, 201);
      return { cookie: String(response.headers['set-cookie']).split(';')[0]! };
    };
    let headers = await login();
    const startUrl = `/api/courses/${courseId}/class-sessions`;
    const started = await app.inject({ method: 'POST', url: startUrl, headers, payload: { mode: 'new', lesson: 4 } });
    assert.equal(started.statusCode, 201);
    const oldId = started.json().id;
    await app.close();
    const saved = JSON.parse(await readFile(dataFile, 'utf8'));
    Object.assign(saved.classroomRuntimes[oldId], {
      deckId: 'deck-economic-mathematics-2026-limits-reinforcement',
      deckVersion: 'release-economic-mathematics-limits-reinforcement-2026-10-13',
      slideIndex: 200, slideKey: 'em-l04-limits-reinforcement-20261013-p016'
    });
    saved.classroomRuntimes[oldId].slideInteractions['em-l04-limits-reinforcement-20261013-p016'] = {
      revision: 7, values: { presentationStep: 2 }
    };
    const retained = structuredClone(saved.classroomRuntimes[oldId]);
    const retainedSession = structuredClone(saved.classSessions.find((s: { id: string }) => s.id === oldId));
    await writeFile(dataFile, JSON.stringify(saved));
    app = await buildApp({ dataFile, portSimulationTickMs: 0, allowLegacyDevelopmentIdentity: false });
    headers = await login();
    const options = { mode: 'resume', lesson: 4, requestId: randomUUID() };
    const fresh = await app.inject({ method: 'POST', url: startUrl, headers, payload: options });
    assert.equal(fresh.statusCode, 201, fresh.body);
    assert.notEqual(fresh.json().id, oldId);
    const freshId = fresh.json().id;
    const snapshot = (await app.inject({ method: 'GET', url: `/api/class-sessions/${freshId}/snapshot`, headers })).json();
    assert.equal(snapshot.slide.deckId, deckId);
    assert.equal(snapshot.slide.versionId, versionId);
    assert.equal(snapshot.slide.index, getCourseDeckByCourseId(courseId)!.lessons.find(l => l.number === 4)!.slideStart);
    const repeated = await app.inject({ method: 'POST', url: startUrl, headers, payload: options });
    assert.equal(repeated.json().id, freshId);
    const resumed = await app.inject({ method: 'POST', url: startUrl, headers, payload: { mode: 'resume', requestId: randomUUID() } });
    assert.equal(resumed.json().id, freshId);
    const oldSnapshot = (await app.inject({ method: 'GET', url: `/api/class-sessions/${oldId}/snapshot`, headers })).json();
    assert.equal(oldSnapshot.slide.index, 200);
    assert.equal(oldSnapshot.slide.total, 560);
    assert.equal(oldSnapshot.slideInteraction.revision, 7);
    const rejected = await app.inject({ method: 'POST', url: `/api/class-sessions/${oldId}/events`, headers, payload: { type: 'next_slide' } });
    assert.equal(rejected.statusCode, 409);
    assert.equal(rejected.json().error, 'COURSE_DECK_ARCHIVED');
    await app.close();
    const after = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.deepEqual(after.classroomRuntimes[oldId], retained);
    assert.deepEqual(after.classSessions.find((s: { id: string }) => s.id === oldId), retainedSession);
    app = await buildApp({ dataFile, portSimulationTickMs: 0, allowLegacyDevelopmentIdentity: false });
    headers = await login();
    const restarted = await app.inject({ method: 'GET', url: `/api/class-sessions/${freshId}/snapshot`, headers });
    assert.equal(restarted.statusCode, 200);
    const restartSnapshot = restarted.json();
    assert.equal(restartSnapshot.slide.versionId, versionId);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
