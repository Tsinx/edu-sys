import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPortSession, advancePortSession, defaultPortPlan,
  type PortSession
} from '../src/index.js';

// Two due boxes under a future call's blocker in a yard with all ground slots
// occupied. The old dispatcher keeps moving that blocker between the due stacks.
function stackedExports(schema: PortSession['schema']) {
  const s = createPortSession('battle', undefined, defaultPortPlan(), schema);
  const due = s.batches['S01-E1']!;
  const future = s.batches['S02-E1']!;
  const ids = [...due.boxIds.slice(0, 2), ...future.boxIds.slice(0, 20)];
  s.boxes = Object.fromEntries(ids.map(id => [id, s.boxes[id]!]));
  s.batches = {[due.id]: due, [future.id]: future};
  due.boxIds = ids.slice(0, 2); future.boxIds = ids.slice(2);
  for (const b of Object.values(s.batches)) {
    b.customs = true; b.carrier = true; b.vgm = true; b.targetYard = 'Y3'; b.document.status = 'approved';
  }
  ids.forEach((id, slot) => Object.assign(s.boxes[id]!, {location: 'yard:Y3', available: true, slot, queuedAt: 0}));
  Object.assign(s.calls.S01!, {announced: true, stage: 'berthed', berth: 0, arrivedAt: 0, working: true});
  Object.assign(s.calls.S02!, {announced: true, stage: 'outer', arrivedAt: 0});
  for (const d of Object.values(s.calls.S01!.docs)) d.status = 'approved';
  s.berths = ['S01', null]; s.events = []; s.jobs = []; s.status = 'running';
  return {s, due: due.boxIds};
}

test('exposed exports are retrieved before moving a blocker onto another due stack', () => {
  const fixed = stackedExports('port-operations/3.3');
  advancePortSession(fixed.s, 3600, false, false);
  assert.ok(fixed.due.every(id => fixed.s.boxes[id]!.loadedAt !== null), 'both due boxes must reach the vessel');
  assert.ok(fixed.s.rehandles <= 1, 'one blocker must not bounce endlessly between two stacks');

  const historical = stackedExports('port-operations/3.2');
  advancePortSession(historical.s, 3600, false, false);
  assert.equal(historical.due.filter(id => historical.s.boxes[id]!.loadedAt !== null).length, 0);
  assert.ok(historical.s.rehandles > 5, 'historical replays retain their recorded dispatch behavior');
});

test('the repaired stack dispatch preserves the same transfers across clock partitions', () => {
  const fast = stackedExports('port-operations/3.3').s;
  const continuous = stackedExports('port-operations/3.3').s;
  advancePortSession(fast, 3600, false, false);
  for (let n = 0; n < 600; n++) advancePortSession(continuous, 6, false, false);
  const rounded = (s: PortSession) => JSON.parse(JSON.stringify(s, (_, v) => typeof v === 'number' ? Number(v.toFixed(7)) : v));
  assert.deepEqual(rounded(continuous), rounded(fast));
});
