import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPortClassLabCommand as act, createPortClassLab as create, portClassLabMetrics as metrics,
  restorePortClassLab, serializePortClassLab, type PortClassLab } from '../src/port-class-lab.js';

function conserve(r: PortClassLab) {
  const s = r.terminal;
  assert.ok(Math.abs(s.unloaded[0] + s.unloaded[1] - s.delivered - s.queues.reduce((a,b) => a+b,0)) < 1e-6);
  assert.ok(s.queues.every(n => n >= -1e-8));
  assert.ok(s.delivered <= 300 + 1e-6);
}
// Work integrals and phase fractions can differ at machine precision when
// replay coalesces small ticks. Discrete inventory and task evidence stay exact.
const replayComparable=(value:unknown)=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'?Math.round(v*1e8)/1e8:v));
test('prepared scenes are independent, immutable and conserve the same cargo cohort', () => {
  const a=create(11), b=create(11,'trial'), incident=create(12);
  assert.equal(a.terminal.minute,120); assert.equal(incident.terminal.minute,90);
  assert.deepEqual(a.terminal,b.terminal); assert.ok(a.terminal.operations.secured.every(Boolean));
  const after=act(a,{kind:'advance',minutes:30}); assert.equal(a.terminal.minute,120);
  for (const r of [a,b,incident,after]) conserve(r);
  assert.throws(()=>act(a,{kind:'dispatch',value:a.terminal.setup.dispatch}),/基准/);
});
test('same-checkpoint staffing changes cause actual delivery and cost differences at one endpoint', () => {
  const baseline=act(create(11),{kind:'advance',minutes:360});
  const initial=create(11,'trial');
  const trial=act(act(initial,{kind:'dispatch',value:{...initial.terminal.setup.dispatch,drivers:8,gateClerks:2}}),{kind:'advance',minutes:360});
  assert.equal(baseline.terminal.minute,360); assert.equal(trial.terminal.minute,360);
  assert.ok(metrics(trial).delivered>metrics(baseline).delivered);
  assert.notEqual(metrics(trial).cost,metrics(baseline).cost);
  assert.ok(metrics(trial).deadlineShare!==null); conserve(trial); conserve(baseline);
  assert.throws(()=>act(trial,{kind:'advance',minutes:5}),/观察已结束/);
  assert.deepEqual(restorePortClassLab(serializePortClassLab(trial),11),trial);
});
test('isolating all physical flows has a measurable cost compared with isolating the interface', () => {
  const start=create(12);
  const gate=act(act(start,{kind:'isolate',scope:'gate'}),{kind:'advance',minutes:15});
  const all=act(act(start,{kind:'isolate',scope:'all'}),{kind:'advance',minutes:15});
  assert.ok(metrics(gate).unloaded>metrics(all).unloaded);
  assert.equal(metrics(gate).delivered,0); assert.equal(metrics(all).delivered,0);
  for(const r of [gate,all]) conserve(r);
});
test('backup validation blocks duplicate and stale records, and manual flow has a real finite quota', () => {
  let r=act(create(12),{kind:'isolate',scope:'gate'});
  assert.throws(()=>act(r,{kind:'manual'}),/可信记录/);
  assert.throws(()=>act(r,{kind:'audit',quarantine:['R2','R3']}),/核对未通过/);
  r=act(r,{kind:'audit',quarantine:['R3','R4']});
  r=act(r,{kind:'manual'}); r.endpoint=600; while(r.incident!.manual&&r.terminal.minute<r.endpoint)r=act(r,{kind:'advance',minutes:30});
  assert.ok(Math.abs(r.incident!.manualDelivered-24)<1e-7);
  assert.equal(r.incident!.manual,false); assert.equal(r.terminal.operations.gate,false);
  assert.ok(Math.abs(metrics(r).delivered-24)<1e-6); conserve(r);
  assert.throws(()=>act(r,{kind:'restore'}),/恢复未获通过/);
});
test('technical repair alone cannot restore delivery; actual controlled shipments must pass', () => {
  let r=act(create(12),{kind:'record'});
  r=act(r,{kind:'isolate',scope:'gate'});
  r=act(r,{kind:'repair'}); r=act(r,{kind:'advance',minutes:30});
  assert.equal(r.incident!.repairWork,60); assert.equal(metrics(r).delivered,0);
  assert.throws(()=>act(r,{kind:'restore'}),/恢复未获通过/);
  r=act(r,{kind:'audit',quarantine:['R4','R3']}); r=act(r,{kind:'reconcile'});
  r=act(r,{kind:'test'}); assert.equal(r.incident!.testPassed,false);
  assert.throws(()=>act(r,{kind:'restore'}),/恢复未获通过/);
  while(!r.incident!.testPassed&&r.terminal.minute<r.endpoint)r=act(r,{kind:'advance',minutes:15}); assert.equal(r.incident!.testPassed,true);
  assert.ok(Math.abs(r.incident!.testDelivered-3)<1e-7); conserve(r);
  r=act(r,{kind:'restore'}); const restored=r.terminal.minute;
  r=act(r,{kind:'advance',minutes:30}); assert.ok(metrics(r).delivered>3);
  assert.equal(metrics(r).recoveryMinutes,restored-90);
  assert.ok(metrics(r).remaining>0); assert.equal(metrics(r).dataExposureMinutes,15);
  assert.deepEqual(restorePortClassLab(serializePortClassLab(r),12),r); conserve(r);
});
test('version and lesson boundaries prevent one package from replacing the other', () => {
  assert.throws(()=>restorePortClassLab(serializePortClassLab(create(11)),12),/不匹配/);
  assert.throws(()=>restorePortClassLab({version:'old',lesson:11,commands:[]},11),/不匹配/);
  for (const minutes of [NaN,-1,0,.5,Infinity,361]) assert.throws(()=>act(create(11),{kind:'advance',minutes}));
  assert.throws(()=>act(create(11,'trial'),{kind:'dispatch',value:{...create(11).terminal.setup.dispatch,drivers:26}}));
});

test('timed audit and reconciliation progress with the same physical scene and stop exactly on completion', () => {
  let r=act(act(create(12),{kind:'record'}),{kind:'isolate',scope:'gate'});
  const start=r.simulation!.second;
  r=act(r,{kind:'start-audit',quarantine:['R2','R4']});
  assert.equal(r.simulation!.second,start);assert.equal(r.incident!.backupVerified,false);
  r=act(r,{kind:'tick',seconds:300});
  assert.equal(r.simulation!.second,start+300);assert.equal(r.incident!.backupVerified,false);assert.ok(r.pendingTask);
  assert.throws(()=>act(r,{kind:'manual'}),/尚未完成/);
  assert.deepEqual(restorePortClassLab(serializePortClassLab(r),12),r);
  // Even a large request must stop at the task boundary, without consuming the rest.
  r=act(r,{kind:'tick',seconds:1200});
  assert.equal(r.simulation!.second,start+600);assert.equal(r.incident!.backupVerified,true);assert.equal(r.pendingTask,null);
  assert.match(r.feedback,/已暂停推进/);
  r=act(r,{kind:'repair'});r=act(r,{kind:'advance',minutes:30});
  const reconcileAt=r.simulation!.second;
  r=act(r,{kind:'start-reconcile'});r=act(r,{kind:'tick',seconds:599});
  assert.equal(r.incident!.dataChecked,false);assert.ok(r.pendingTask);
  r=act(r,{kind:'tick',seconds:120});
  assert.equal(r.simulation!.second,reconcileAt+600);assert.equal(r.incident!.dataChecked,true);assert.equal(r.pendingTask,null);
  assert.equal(r.simulation!.facilities!.enabled.gate,false);
  assert.deepEqual(replayComparable(restorePortClassLab(serializePortClassLab(r),12)),replayComparable(r));conserve(r);
});

test('small continuous steps preserve inventory, actual asset motion and the fast calculation result', () => {
  for(const lesson of [11,12] as const){
    const initial=create(lesson),fast=act(initial,{kind:'advance',minutes:5});let continuous=initial;
    for(let elapsed=0;elapsed<300;){const seconds=Math.min([1,3,6,2][elapsed%4]!,300-elapsed);continuous=act(continuous,{kind:'tick',seconds});elapsed+=seconds;}
    for(const field of ['delivered','unloaded','remaining','cost','waitingBoxMinutes'] as const){
      const a=metrics(continuous)[field],b=metrics(fast)[field];assert.ok(Math.abs(a-b)<1e-6,`${lesson}:${field} ${a} ${b}`);
    }
    assert.equal(continuous.simulation!.second,fast.simulation!.second);conserve(continuous);
    assert.deepEqual(Object.values(continuous.simulation!.boxes).map(b=>[b.id,b.location,b.carrier,b.deliveredAt]),Object.values(fast.simulation!.boxes).map(b=>[b.id,b.location,b.carrier,b.deliveredAt]));
    const replay=restorePortClassLab(serializePortClassLab(continuous),lesson);
    assert.equal(metrics(replay).delivered,metrics(continuous).delivered);
    assert.ok(Math.abs(metrics(replay).cost-metrics(continuous).cost)<1e-6);
  }
});
