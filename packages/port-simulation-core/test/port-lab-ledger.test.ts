import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortClassLab,applyPortClassLabCommand as act,reviewPortLabLedger,portLabBackupCapacity,serializePortClassLab,restorePortClassLab,type PortClassLab,type PortLabCommand} from '../src/index.js';

function until(run:PortClassLab,done:(run:PortClassLab)=>boolean){
  for(let count=0;!done(run)&&count<90;count++)run=act(run,{kind:'advance',minutes:360});
  assert.ok(done(run));return run;
}
function task(run:PortClassLab,command:PortLabCommand){return until(act(run,command),r=>!r.pendingTask);}
function prepared(){
  let run=act(createPortClassLab(12,'incident','system'),{kind:'record'});
  run=task(run,{kind:'inspect',target:'scope'});run=task(run,{kind:'inspect',target:'logs'});
  run=act(run,{kind:'isolate',scope:'gate'});return task(run,{kind:'inspect',target:'backup'});
}

test('deduplicated and conservative quarantine authorize only the retained independent quantity',()=>{
  for(const ids of [['R2','R4'],['R3','R4']]){const review=reviewPortLabLedger(ids);assert.equal(review.valid,true);assert.equal(review.quantity,38);assert.equal(review.limit,24);}
  const partial=reviewPortLabLedger(['R2','R3','R4']);assert.equal(partial.valid,true);assert.equal(partial.quantity,20);assert.equal(partial.limit,20);assert.ok(partial.pendingTickets.includes('T02'));
  for(const ids of [[],['R2','R3'],['R1','R2','R3','R4','R5'],['R3','R3','R4'],['unknown']])assert.equal(reviewPortLabLedger(ids).valid,false);
});

test('twenty-box conservative allowance needs a timed receipt, survives replay, and physically stops at twenty',()=>{
  let run=act(prepared(),{kind:'start-audit',quarantine:['R2','R3','R4']});
  assert.equal(portLabBackupCapacity(run),0);assert.throws(()=>act(run,{kind:'manual'}),/检查尚未完成/);
  run=until(run,r=>!r.pendingTask);assert.equal(portLabBackupCapacity(run),20);
  assert.match(run.emergency!.clues.find(c=>c.id==='audit')!.text,/最多20箱/);
  const replay=restorePortClassLab({...serializePortClassLab(run),manualLimit:24,backupVerified:true},12);assert.equal(portLabBackupCapacity(replay),20);
  run=act(replay,{kind:'manual'});assert.equal(run.simulation!.facilities!.gateLimit,20);
  run.endpoint=600;run=until(run,r=>!r.incident!.manual);
  assert.equal(run.incident!.manualDelivered,20);assert.equal(run.simulation!.facilities!.enabled.gate,false);
  assert.throws(()=>act(run,{kind:'manual'}),/剩余额度/);
});

test('a partial backup can complete the real restoration chain without reopening backup after reconciliation',()=>{
  let run=act(prepared(),{kind:'repair-team',people:2});run=act(run,{kind:'repair'});
  run=task(run,{kind:'start-audit',quarantine:['R2','R3','R4']});run=act(run,{kind:'manual'});
  run=until(run,r=>r.incident!.repairWork===60);run=task(run,{kind:'start-reconcile'});
  assert.throws(()=>act(run,{kind:'manual'}),/恢复对账前/);
  run=act(run,{kind:'test'});run=until(run,r=>r.incident!.testPassed);run=act(run,{kind:'restore'});run=until(run,r=>r.terminal.minute===240);
  const replay=restorePortClassLab(serializePortClassLab(run),12);
  assert.equal(replay.incident!.testDelivered,3);assert.equal(replay.incident!.restoredAt,run.incident!.restoredAt);assert.equal(portLabBackupCapacity(replay),20);
});
