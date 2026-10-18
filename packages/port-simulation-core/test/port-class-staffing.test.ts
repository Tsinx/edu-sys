import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortClassLab as create, applyPortClassLabCommand as act, serializePortClassLab, restorePortClassLab } from '../src/port-class-lab.js';
import { applyPortCommand } from '../src/port-operations-engine.js';

test('opening staff can be raised and reduced repeatedly without advancing or dispatching the checkpoint', () => {
  const initial = create(11, 'trial');
  for (const [role, high, low] of [
    ['craneOperators', 4, 1], ['drivers', 8, 1], ['yardOperators', 3, 1], ['gateClerks', 2, 0], ['technicians', 2, 0],
  ] as const) {
    let run = act(initial, { kind: 'configure-dispatch', value: { ...initial.terminal.setup.dispatch, [role]: high } });
    run = act(run, { kind: 'configure-dispatch', value: { ...run.terminal.setup.dispatch, [role]: low } });
    assert.equal(run.terminal.setup.dispatch[role], low, role);
    assert.equal(run.simulation!.second, initial.simulation!.second);
    assert.equal(run.simulation!.cost, initial.simulation!.cost);
    assert.deepEqual(run.simulation!.boxes, initial.simulation!.boxes);
    assert.deepEqual(run.simulation!.jobs, initial.simulation!.jobs);
    assert.deepEqual(run.simulation!.facilities!.bays, initial.simulation!.facilities!.bays);
    assert.deepEqual(run.simulation!.facilities!.reservations, initial.simulation!.facilities!.reservations);
    assert.deepEqual(restorePortClassLab(serializePortClassLab(run), 11), run);
  }
});

test('an unstarted saved trial with old applied increases can be reconfigured from the same checkpoint', () => {
  const initial = create(11, 'trial');
  const old = act(initial, { kind: 'dispatch', value: { ...initial.terminal.setup.dispatch, drivers: 8, gateClerks: 2 } });
  const resumed = restorePortClassLab(serializePortClassLab(old), 11);
  assert.throws(() => act(resumed, { kind: 'dispatch', value: initial.terminal.setup.dispatch }), /仍在执行|待撤岗/);
  const run = act(resumed, { kind: 'configure-dispatch', value: initial.terminal.setup.dispatch });
  assert.deepEqual(run.simulation!.jobs, initial.simulation!.jobs);
  assert.deepEqual(run.simulation!.boxes, initial.simulation!.boxes);
  assert.deepEqual(run.terminal.setup.dispatch, initial.terminal.setup.dispatch);
  assert.deepEqual(restorePortClassLab(serializePortClassLab(run), 11), run);
  const fresh = act(create(11, 'trial'), { kind: 'configure-dispatch', value: initial.terminal.setup.dispatch });
  assert.deepEqual(fresh.simulation, run.simulation);
});

test('opening configuration validates counts and stays locked after the first simulated second', () => {
  const initial = create(11, 'trial'), value = initial.terminal.setup.dispatch;
  assert.throws(() => act(create(11), { kind: 'configure-dispatch', value }), /基准/);
  for (const drivers of [-1, 1.5, NaN, 9, 27]) {
    assert.throws(() => act(initial, { kind: 'configure-dispatch', value: { ...value, drivers } }));
  }
  const started = act(initial, { kind: 'tick', seconds: 1 });
  assert.throws(() => act(started, { kind: 'configure-dispatch', value }), /开始|检查点/);
  assert.deepEqual(initial.terminal.setup.dispatch, value);
});

test('reduced opening drivers finish inherited transport and return before leaving the shift', () => {
  let run = create(11, 'trial');
  run = act(run, { kind: 'configure-dispatch', value: { ...run.terminal.setup.dispatch, drivers: 1 } });
  const vehicle = run.simulation!.facilities!.vehicles[1]!;
  assert.ok(vehicle.reservedBy !== null || vehicle.loadedBox !== null);
  const initialEffort = run.simulation!.effort.personSeconds;
  const people = Object.entries(run.terminal.setup.dispatch).filter(([k]) => !['berthCranes', 'priority'].includes(k)).reduce((n, [, v]) => n + (v as number), 0);
  run = act(run, { kind: 'tick', seconds: 1 });
  assert.ok(run.simulation!.effort.personSeconds - initialEffort > people, 'handover staff time must be charged');
  for (let n = 0; n < 90; n++) {
    const v = run.simulation!.facilities!.vehicles[1]!;
    if (v.loadedBox === null && v.reservedBy === null) break;
    run = act(run, { kind: 'advance', minutes: 1 });
  }
  assert.equal(run.simulation!.facilities!.vehicles[1]!.loadedBox, null);
  assert.equal(run.simulation!.facilities!.vehicles[1]!.reservedBy, null);
  run = act(run, { kind: 'advance', minutes: 10 });
  assert.equal(run.simulation!.facilities!.vehicles[1]!.reservedBy, null);
  assert.equal(Object.keys(run.simulation!.boxes).length, 300);
  assert.ok(run.terminal.delivered > run.initialDelivered);
  const replay = restorePortClassLab(serializePortClassLab(run), 11);
  assert.deepEqual(replay, run);
});

test('retiring operators complete only inherited work, while live dispatch still protects busy vehicles', () => {
  let run = create(11, 'trial');
  run = act(run, { kind: 'configure-dispatch', value: { ...run.terminal.setup.dispatch, yardOperators: 0 } });
  const committed = run.simulation!.jobs.filter(j => j.kind === 'yard').map(j => j.id);
  assert.ok(committed.length > 0, 'the checkpoint must contain a real transfer to hand over');
  run = act(run, { kind: 'advance', minutes: 30 });
  assert.ok(run.simulation!.jobs.every(j => !committed.includes(j.id)));
  assert.ok(run.simulation!.jobs.every(j => j.kind !== 'yard'));
  assert.ok(!run.simulation!.facilities!.staffHandover?.yard.length);
  assert.equal(Object.keys(run.simulation!.boxes).length, 300);
  const live = create(11, 'trial').simulation!;
  const result = applyPortCommand(live, { kind: 'dispatch', dispatch: { ...live.plan.equipment.dispatch, drivers: 1 } }, false);
  assert.equal(result.outcome, 'waiting');
  assert.equal(live.plan.equipment.dispatch.drivers, 2);
});

test('both incident scenarios allow changing the repair team repeatedly before work starts', () => {
  for (const scenario of ['system', 'equipment'] as const) {
    let run = create(12, 'incident', scenario);
    const second = run.simulation!.second, cost = run.simulation!.cost;
    for (const people of [1, 2, 1, 2, 1] as const) {
      run = act(run, { kind: 'repair-team', people });
      assert.equal(run.terminal.setup.dispatch.technicians, people);
      assert.equal(run.simulation!.second, second);
      assert.equal(run.simulation!.cost, cost);
    }
    assert.deepEqual(restorePortClassLab(serializePortClassLab(run), 12), run);
    assert.equal(create(12, 'incident', scenario).terminal.setup.dispatch.technicians, 2);
  }
});
