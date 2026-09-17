import assert from 'node:assert/strict';
import test from 'node:test';
import { createCapacityRun, advanceCapacityRun, observeCapacityRun, capacityElapsed, capacityView, serializeCapacityRun, restoreCapacityRun } from '../src/port-capacity.js';

test('capacity trials share an approved, motionless starting state and preserve the original course',()=>{
  const a=createCapacityRun('A'),c=createCapacityRun('C');
  assert.deepEqual(a.session,c.session);
  assert.equal(a.startSecond,9209);
  assert.equal(a.session.jobs.length,0);
  assert.ok(Object.values(a.session.batches).every(b=>b.document.status==='approved'));
  assert.equal(Object.values(a.session.boxes).length,194);
  assert.equal(capacityElapsed(a),null);
});
test('event completion time is precise, sampled transport waiting excludes active jobs, and replay is deterministic',()=>{
  const a=createCapacityRun('A');advanceCapacityRun(a,3600);
  const sample=observeCapacityRun(a);
  assert.equal(sample.unloaded,48);assert.equal(sample.quay,36);
  assert.ok(sample.waitingTransport<=sample.quay);
  const replay=restoreCapacityRun(serializeCapacityRun(a));assert.deepEqual(capacityView(replay),capacityView(a));
  advanceCapacityRun(a,86400);assert.equal(capacityElapsed(a),46130);assert.equal(observeCapacityRun(a).elapsed,46130);
  const c=createCapacityRun('C');advanceCapacityRun(c,86400);assert.equal(capacityElapsed(c),23628);
  const before=serializeCapacityRun(c);advanceCapacityRun(c,3600);assert.equal(serializeCapacityRun(c),before);
});
test('saved claims cannot bypass replay or smuggle unknown commands',()=>{
  const raw=JSON.parse(serializeCapacityRun(createCapacityRun('C')));raw.complete=true;raw.elapsed=1;
  assert.equal(restoreCapacityRun(JSON.stringify(raw)).complete,false);
  raw.commands=[{kind:'set-complete',seconds:1}];assert.throws(()=>restoreCapacityRun(JSON.stringify(raw)));
  assert.throws(()=>advanceCapacityRun(createCapacityRun('A'),NaN));
});
