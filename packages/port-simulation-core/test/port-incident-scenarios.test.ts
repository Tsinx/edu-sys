import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortClassLab, applyPortClassLabCommand, serializePortClassLab, restorePortClassLab, portClassLabMetrics, comparablePortIncident, summarizePortResources, type PortClassLab, type PortLabCommand } from '../src/index.js';

const act=applyPortClassLabCommand;
function until(r:PortClassLab,predicate:(r:PortClassLab)=>boolean) {
  for(let n=0;n<80&&!predicate(r);n++) {
    if(r.terminal.minute>=r.endpoint)throw Error(`unfinished at endpoint: ${r.feedback}`);
    r=act(r,{kind:'advance',minutes:360});
  }
  assert.ok(predicate(r),r.feedback);return r;
}
function task(r:PortClassLab,c:PortLabCommand){r=act(r,c);return until(r,r=>!r.pendingTask);}
function start(scenario:'system'|'equipment'){
  let r=act(createPortClassLab(12,'incident',scenario),{kind:'record'});
  r=task(r,{kind:'inspect',target:'scope'});
  r=task(r,{kind:'inspect',target:scenario==='system'?'logs':'mechanical'});
  return r;
}
function system(manual:boolean,people:1|2=2) {
  let r=act(start('system'),{kind:'isolate',scope:'gate'});
  r=act(r,{kind:'repair-team',people});r=act(r,{kind:'repair'});
  r=task(r,{kind:'inspect',target:'backup'});
  r=task(r,{kind:'start-audit',quarantine:['R3','R4']});
  if(manual)r=act(r,{kind:'manual'});
  r=until(r,r=>r.incident!.repairWork>=60);
  r=task(r,{kind:'start-reconcile'});r=act(r,{kind:'test'});
  r=until(r,r=>r.incident!.testPassed);r=act(r,{kind:'restore'});
  return until(r,r=>r.terminal.minute===240);
}
function equipment(relief:boolean,people:1|2=2) {
  let r=task(start('equipment'),{kind:'isolate',scope:'gate'});
  r=act(r,{kind:'repair-team',people});r=act(r,{kind:'repair'});
  if(relief)r=act(r,{kind:'relief',enabled:true});
  r=until(r,r=>r.incident!.repairWork>=90);
  r=task(r,{kind:'start-reconcile'});
  if(relief){r=act(r,{kind:'relief',enabled:false});r=until(r,r=>r.emergency!.reliefReturned);}
  r=act(r,{kind:'test'});r=until(r,r=>r.incident!.testPassed);
  assert.equal(r.incident!.testDelivered,3);
  r=act(r,{kind:'restore'});return until(r,r=>r.terminal.minute===240);
}
const rounded=(value:unknown)=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='number'?Math.round(v*1e7)/1e7:v));

test('new scenarios reveal evidence only after actual timed checks; large steps pause at reports',()=>{
  let r=createPortClassLab(12,'incident','system');
  assert.equal(r.emergency!.clues.length,1);assert.equal(portClassLabMetrics(r).dataExposureMinutes,null);
  assert.equal(r.emergency!.evidence.backup,false);
  assert.throws(()=>act(r,{kind:'start-audit',quarantine:['R3','R4']}),/调取/);
  r=act(r,{kind:'inspect',target:'scope'});r=act(r,{kind:'tick',seconds:120});
  assert.equal(r.emergency!.evidence.scope,false);assert.equal(r.simulation!.second,5520);
  r=act(r,{kind:'tick',seconds:600});assert.equal(r.simulation!.second,5580);assert.ok(r.emergency!.evidence.scope);
  r=act(r,{kind:'inspect',target:'logs'});r=act(r,{kind:'advance',minutes:360});
  assert.equal(r.terminal.minute,95);assert.ok(r.pendingTask);assert.equal(r.emergency!.evidence.logs,false);
  r=act(r,{kind:'advance',minutes:360});assert.equal(r.terminal.minute,97);assert.equal(portClassLabMetrics(r).dataExposureMinutes,15);
  assert.deepEqual(restorePortClassLab(serializePortClassLab(r),12),r);
});
test('system plans yield different actual delivery, waiting and staffing cost; forged statistics are ignored',()=>{
  const a=system(false,2),b=system(true,2),c=system(false,1);
  const ma=portClassLabMetrics(a),mb=portClassLabMetrics(b),mc=portClassLabMetrics(c);
  assert.equal(ma.minute,mb.minute);assert.ok(comparablePortIncident(a,b));
  assert.notEqual(ma.cost,mb.cost);assert.notEqual(ma.waitingBoxMinutes,mb.waitingBoxMinutes);
  assert.ok(mc.recoveryMinutes!>ma.recoveryMinutes!);
  assert.equal(a.incident!.testDelivered,3);
  const raw={...serializePortClassLab(b),emergency:{clues:[{text:'fake'}]},simulation:{resourceStatistics:{completions:[{at:0}]}}};
  const replay=restorePortClassLab(raw,12);assert.deepEqual(rounded(replay),rounded(b));
});
test('equipment failure and relief use real jobs, transfers and resource intervals, with safe return before trials',()=>{
  const a=equipment(false),b=equipment(true);
  assert.ok(comparablePortIncident(a,b));assert.ok(!comparablePortIncident(a,system(false)));
  for(const r of [a,b]) {
    const s=r.simulation!,stats=s.resourceStatistics!;
    assert.equal(Object.keys(s.boxes).length,300);assert.ok(Object.values(s.boxes).every(box=>box.location));
    assert.ok(stats.resources.find(x=>x.resource.id==='yard-crane-0')!.intervals.some(i=>i.state==='fault'));
    const trial=stats.completions.filter(c=>c.resource==='yard-crane-0'&&c.at>r.emergency!.trialAt!*60&&c.at<=r.incident!.restoredAt!*60);
    assert.equal(trial.length,3);assert.ok(trial.every(c=>c.box&&c.from!==c.to));
    assert.deepEqual(rounded(restorePortClassLab(serializePortClassLab(r),12)),rounded(r));
    const sum=summarizePortResources(stats,['yard-crane-0'])[0]!;
    assert.ok(Math.abs(Object.values(sum.states).reduce((a,b)=>a+b,0)-sum.seconds)<1e-7);
  }
  const relief=b.simulation!.resourceStatistics!.resources.find(x=>x.resource.id==='yard-crane-2')!;
  assert.ok(relief.intervals.some(i=>i.state==='reposition'));
  assert.ok(b.emergency!.reliefReturned);
  assert.notEqual(portClassLabMetrics(a).waitingBoxMinutes,portClassLabMetrics(b).waitingBoxMinutes);
  assert.notEqual(portClassLabMetrics(a).cost,portClassLabMetrics(b).cost);
});
test('pause is inert, continuous and quick calculations reach the same reports and timed evidence',()=>{
  for(const scenario of ['system','equipment'] as const) {
    const initial=createPortClassLab(12,'incident',scenario),fast=act(initial,{kind:'advance',minutes:15});
    let slow=initial;while(slow.simulation!.second<fast.simulation!.second)slow=act(slow,{kind:'tick',seconds:1});
    assert.equal(fast.terminal.minute,95);assert.deepEqual(slow.emergency!.clues,fast.emergency!.clues);
    assert.deepEqual(slow.simulation!.resourceStatistics,fast.simulation!.resourceStatistics);
    assert.deepEqual(rounded(portClassLabMetrics(slow)),rounded(portClassLabMetrics(fast)));
  }
});

test('full equipment recovery and actual relief have identical records under small continuous clock slices',()=>{
  const fast=equipment(true);let slow=createPortClassLab(12,'incident','equipment'),reference=slow;
  for(const command of fast.commands){
    reference=act(reference,command);
    if(command.kind==='advance'||command.kind==='tick'){
      const target=reference.simulation!.second;
      while(slow.simulation!.second<target)slow=act(slow,{kind:'tick',seconds:Math.min(6,target-slow.simulation!.second)});
    }else slow=act(slow,command);
  }
  assert.deepEqual(rounded(portClassLabMetrics(slow)),rounded(portClassLabMetrics(fast)));
  assert.deepEqual(slow.simulation!.resourceStatistics,fast.simulation!.resourceStatistics);
  assert.deepEqual(slow.emergency,fast.emergency);assert.equal(slow.incident!.testDelivered,3);
});
test('business-wide suspension drains committed physical transfers safely, without releasing untrusted gate records',()=>{
  const initial=createPortClassLab(12,'incident','system');
  const service=initial.simulation!.jobs.find(j=>j.kind==='quay'&&j.physical?.stage==='service')!;
  assert.ok(service);
  let all=act(act(initial,{kind:'record'}),{kind:'isolate',scope:'all'});
  assert.ok(all.simulation!.jobs.find(j=>j.id===service.id)!.rate>0);
  all=act(all,{kind:'advance',minutes:30});
  assert.equal(all.terminal.minute,95);assert.equal(portClassLabMetrics(all).delivered,0);
  assert.ok(all.simulation!.resourceStatistics!.completions.some(c=>c.job===service.id));
  assert.ok(!all.simulation!.facilities!.enabled.quay.some(Boolean));
});
