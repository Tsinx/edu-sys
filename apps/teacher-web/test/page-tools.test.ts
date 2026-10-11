import test from 'node:test';
import assert from 'node:assert/strict';
import { pageToolsAllowed } from '../src/features/classroom/page-tools-policy';

test('page controls cannot survive a page or version key change', () => {
  const original = { pageKey: 'em-v3-p021' };
  assert.equal(pageToolsAllowed(original, 'em-v3-p021', 'teacher'), true);
  assert.equal(pageToolsAllowed(original, 'em-v3-p022', 'teacher'), false);
  assert.equal(pageToolsAllowed(original, 'em-v2-p021', 'teacher'), false);
});
test('following students see only explicitly local controls and projection sees none', () => {
  const teacher = { pageKey: 'globe-26' }, local = { ...teacher, audience: 'local' as const };
  assert.equal(pageToolsAllowed(teacher, 'globe-26', 'student'), false);
  assert.equal(pageToolsAllowed(local, 'globe-26', 'student'), true);
  assert.equal(pageToolsAllowed(local, 'globe-27', 'student'), false);
  for (const definition of [teacher, local]) {
    assert.equal(pageToolsAllowed(definition, 'globe-26', 'projection'), false);
    assert.equal(pageToolsAllowed(definition, 'globe-26', 'teacher'), true);
    assert.equal(pageToolsAllowed(definition, 'globe-26', 'reader'), true);
  }
});
