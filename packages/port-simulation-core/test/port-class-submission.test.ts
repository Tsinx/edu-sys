import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortClassLab,applyPortClassLabCommand as act,portLabFinished,serializePortClassLab,makePortClassSubmission,verifyPortClassSubmission,verifyPortExperimentSubmission,type PortClassLab,type PortLabCommand,type PortClassSubmissionRecord} from '../src/index.js';
function until(r:PortClassLab,done:(r:PortClassLab)=>boolean=portLabFinished){for(let n=0;n<90&&!done(r)&&!portLabFinished(r);n++)r=act(r,{kind:'advance',minutes:360});assert.ok(done(r));return r;}
function task(r:PortClassLab,c:PortLabCommand){return until(act(r,c),v=>!v.pendingTask);}
function incident(scenario:'system'|'equipment'){
 let r=act(createPortClassLab(12,'incident',scenario),{kind:'record'});r=task(r,{kind:'inspect',target:'scope'});r=task(r,{kind:'inspect',target:scenario==='system'?'logs':'mechanical'});r=task(r,{kind:'isolate',scope:'gate'});r=act(r,{kind:'repair-team',people:2});r=act(r,{kind:'repair'});
 if(scenario==='system'){r=task(r,{kind:'inspect',target:'backup'});r=task(r,{kind:'start-audit',quarantine:['R2','R3','R4']});}
 r=until(r,v=>v.incident!.repairWork>=v.emergency!.repairTarget);r=task(r,{kind:'start-reconcile'});r=act(r,{kind:'test'});r=until(r,v=>v.incident!.testPassed);r=act(r,{kind:'restore'});return until(r);
}
const text='依据本次实际记录比较完成时点、实际交付与成本，记录下一步需要核查的事项。';
function record(r:PortClassLab,mode:'teaching'|'practical'='teaching'):PortClassSubmissionRecord{return {version:'port-class-report/1',lesson:r.lesson,mode,run:serializePortClassLab(r),baseline:null,trials:[],notes:Object.fromEntries((r.lesson===11?['hypothesis','changes','conclusion','limits']:['scope','barriers','conclusion','handover']).map(k=>[k,text])),findings:{baseline:'',trials:[]},sealedAt:'2026-10-20T12:00:00Z'};}
test('performance submission replays the baseline and each trial, findings and report',async()=>{
 const baseline=until(createPortClassLab(11)),trial=until(createPortClassLab(11,'trial')),v={...record(trial),baseline:serializePortClassLab(baseline),trials:[serializePortClassLab(trial)],findings:{baseline:'原配置闸口等待明显。',trials:['此次配置尚未改善实际交付。']}};
 const pkg=makePortClassSubmission(v),verified=await verifyPortExperimentSubmission(pkg);
 assert.equal(pkg.unit,'performance');assert.equal(verified.result.score,100);assert.equal(verified.result.complete,true);assert.ok('kind' in verified.report&&verified.report.kind==='class-lab');
 assert.equal(verifyPortClassSubmission(pkg).report.runs.length,2);
 assert.throws(()=>makePortClassSubmission({...v,baseline:null}),/基准/);
 assert.throws(()=>makePortClassSubmission({...v,sealedAt:''}),/保存复盘/);
 assert.throws(()=>verifyPortClassSubmission({...pkg,expected:{...pkg.expected,score:80}}),/重放不一致/);
 const forged=JSON.parse(pkg.record);forged.trials[0].commands=[];assert.throws(()=>verifyPortClassSubmission({...pkg,record:JSON.stringify(forged)}),/试验/);
});
test('two emergency tasks retain teaching mode and actual incomplete recovery, and require full practical evidence',()=>{
 for(const scenario of ['system','equipment'] as const){
  const unfinished=record(until(createPortClassLab(12,'incident',scenario))),pkg=makePortClassSubmission(unfinished),verified=verifyPortClassSubmission(pkg);
  assert.equal(pkg.unit,`emergency-${scenario}`);assert.equal(verified.result.mode,'practice');assert.equal(verified.result.complete,false);assert.ok(verified.result.score<100);
  assert.throws(()=>makePortClassSubmission({...unfinished,mode:'practical'}),/实战尚未完成/);
  const completed=makePortClassSubmission(record(incident(scenario),'practical')),done=verifyPortClassSubmission(completed);assert.equal(done.result.mode,'battle');assert.equal(done.result.complete,true);assert.equal(done.result.score,100);
  assert.throws(()=>verifyPortClassSubmission({...completed,unit:'performance'}),/重放不一致/);
 }
});
