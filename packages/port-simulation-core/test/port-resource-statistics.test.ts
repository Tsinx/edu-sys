import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPortClassLabCommand as act, createPortClassLab as create, restorePortClassLab, serializePortClassLab, summarizePortResources, binPortResources, type PortResourceStatistics } from '../src/index.js';

test('every installed asset has a complete, exclusive event timeline; missing drivers and physical handoffs are distinct', () => {
  const run = act(create(11), { kind: 'advance', minutes: 30 }), stats = run.simulation!.resourceStatistics!;
  assert.equal(stats.resources.length, 27); assert.equal(stats.from, 7200); assert.equal(stats.through, 9000);
  for (const r of stats.resources) {
    assert.equal(r.intervals[0]!.from, stats.from); assert.equal(r.intervals.at(-1)!.to, stats.through);
    r.intervals.forEach((span, i) => { assert.ok(span.to > span.from); if (i) assert.equal(span.from, r.intervals[i - 1]!.to); });
  }
  const rows = summarizePortResources(stats, stats.resources.map(r => r.resource.id));
  rows.forEach(r => assert.equal(Object.values(r.states).reduce((a, b) => a + b, 0), 1800));
  assert.equal(rows.find(r => r.resource.id === 'vehicle-2')!.states.unstaffed, 1800);
  assert.ok(rows.find(r => r.resource.id === 'vehicle-0')!.states['wait-handoff'] > 0);
  assert.equal(rows.find(r => r.resource.id === 'vehicle-0')!.states.service, 0, 'a truck waiting under a crane is not itself performing the lift');
  assert.ok(rows.find(r => r.resource.id === 'crane-0')!.states['wait-vehicle'] > 0);
  assert.ok(rows.find(r => r.resource.id === 'crane-0')!.states.service > 0);
  const histories = Object.values(run.simulation!.boxes).flatMap(b => b.history.filter(h => h.at > stats.from && ['船岸交接', '运输交接', '堆场交接', '闸口交接', '移箱交接'].includes(h.action)));
  assert.equal(stats.completions.length, histories.length, 'only actual cargo completions enter output statistics');
  assert.ok(stats.completions.every(e => histories.some(h => h.at === e.at && h.from === e.from && h.to === e.to)));
});

test('small continuous ticks, one fast advance and command replay produce identical state spans and completions', () => {
  const initial = create(11), fast = act(initial, { kind: 'advance', minutes: 15 });
  let continuous = initial;
  for (let elapsed = 0; elapsed < 900; elapsed += 17) continuous = act(continuous, { kind: 'tick', seconds: Math.min(17, 900 - elapsed) });
  assert.deepEqual(continuous.simulation!.resourceStatistics, fast.simulation!.resourceStatistics);
  assert.deepEqual(restorePortClassLab({ ...serializePortClassLab(continuous), resourceStatistics: { forged: true } }, 11).simulation!.resourceStatistics, fast.simulation!.resourceStatistics);
  assert.equal(initial.simulation!.resourceStatistics!.through, initial.checkpoint * 60, 'the source checkpoint stays immutable');
});

test('time clipping, partial bins and boundary completions use exact elapsed seconds; storage uses time weighting', () => {
  const stats: PortResourceStatistics = {
    version: 'port-resource-statistics/1', from: 7200, through: 7350,
    resources: [{ resource: { id: 'vehicle-0', sceneId: 'vehicle-0', kind: 'vehicle', index: 0, label: '场内车1' }, intervals: [
      { from: 7200, to: 7240, state: 'empty', occupied: true, reason: '' }, { from: 7240, to: 7350, state: 'idle', occupied: false, reason: '' },
    ] }, { resource: { id: 'storage-Y1', sceneId: 'Y1', kind: 'storage', index: 0, label: '堆场A', capacity: 100 }, intervals: [
      { from: 7200, to: 7230, state: 'idle', occupied: false, reason: '', content: 20 }, { from: 7230, to: 7350, state: 'idle', occupied: false, reason: '', content: 40 },
    ] }], completions: [{ at: 7260, start: 7200, resource: 'vehicle-0', job: 1, box: 'B1', from: 'A', to: 'B' }, { at: 7320, start: 7260, resource: 'vehicle-0', job: 2, box: 'B2', from: 'A', to: 'B' }],
  };
  const bins = binPortResources(stats, ['vehicle-0'], { from: 7200, to: 9999 }, 60);
  assert.deepEqual(bins.map(b => [b.to - b.from, b.rows[0]!.occupiedSeconds, b.rows[0]!.completed]), [[60, 40, 1], [60, 0, 1], [30, 0, 0]]);
  assert.equal(summarizePortResources(stats, ['storage-Y1'])[0]!.inventorySeconds / 150, 36, 'weighted inventory differs from a simple endpoint average');
  assert.equal(summarizePortResources(stats, ['vehicle-0'], { from: 7210, to: 7220 })[0]!.occupiedSeconds, 10);
  assert.throws(() => binPortResources(stats, ['vehicle-0'], { from: 7200, to: 7350 }, 0), /至少/);
});

test('lesson12 records actual gate suspension and loaded safe movements without inventing a stopped whole port', () => {
  const run = act(act(create(12), { kind: 'isolate', scope: 'gate' }), { kind: 'advance', minutes: 15 });
  const stats = run.simulation!.resourceStatistics!, rows = summarizePortResources(stats, stats.resources.map(r => r.resource.id));
  assert.equal(rows.find(r => r.resource.id === 'gate-lane-0')!.states.disabled, 900);
  assert.ok(rows.filter(r => r.resource.kind === 'quay').some(r => r.states.service > 0));
  assert.ok(stats.resources.filter(r => r.resource.kind === 'vehicle').some(r => r.intervals.some(i => i.state === 'loaded')));
});
