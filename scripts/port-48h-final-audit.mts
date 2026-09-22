import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPortSession, calibratedPortPlan, defaultPortConfig, applyPortCommand, advancePortSession, servicePortReference, portScore, portHandoverItems, serializePortSession, restorePortSession, rememberPortReference, portYardUsage, portStateHash, makePortSubmission, portDeadline, terminalBudget, PORT_HORIZON } from '../packages/port-simulation-core/src/index.js';
import { submissionWorker } from '../apps/platform-api/src/port-submissions.js';

const output=fileURLToPath(new URL('../output/port-48h-calibration-20260922/',import.meta.url));
await mkdir(output,{recursive:true});
const s=createPortSession('battle',defaultPortConfig(),calibratedPortPlan()), snapshots=[];
applyPortCommand(s,{kind:'start'});
while(s.second<PORT_HORIZON){
  servicePortReference(s,2);advancePortSession(s,120);
  assert.equal(new Set(s.jobs.map(j=>j.boxId)).size,s.jobs.length,'one active job per box');
  const active=s.jobs.filter(j=>j.resource>=0&&j.rate>0).map(j=>`${j.kind}:${j.resource}`);
  assert.equal(new Set(active).size,active.length,'equipment cannot perform two jobs at once');
  for(const y of s.plan.yards){const u=portYardUsage(s,y.id);assert.ok(u.available>=0&&u.occupied+u.reserved<=100);}
  if(s.second%28800===0){const item={hour:s.second/3600,completed:portScore(s).completed,cost:s.cost,arrived:Object.values(s.calls).filter(c=>c.arrivedAt!==null).length,departed:Object.values(s.calls).filter(c=>c.stage==='departed').length,issues:Object.values(s.boxes).filter(b=>['open','reported'].includes(b.issue)).length,jobs:s.jobs.length};snapshots.push(item);console.log('SHIFT '+JSON.stringify(item));}
}
assert.equal(s.status,'completed');
for(const box of Object.values(s.boxes))for(let i=1;i<box.history.length;i++){assert.equal(box.history[i]!.from,box.history[i-1]!.to);assert.ok(box.history[i]!.at>=box.history[i-1]!.at);}
assert.equal(Object.keys(s.boxes).length,s.schedules.reduce((n,v)=>n+v.load+v.unload,0));
assert.ok(Object.values(s.boxes).filter(b=>b.issueExpected&&b.unloadedAt!==null).every(b=>b.issue==='resolved'));
const required=portHandoverItems(s);
const invalid=applyPortCommand(s,{kind:'handover',entries:[]});assert.equal(invalid.outcome,'invalid');
const valid=applyPortCommand(s,{kind:'handover',entries:required.map(({object,team,next})=>({object,team,next}))});assert.equal(valid.outcome,'applied');
const completed=portScore(s).completed, reference={cost:s.cost,completed,unitCost:s.cost/completed};
rememberPortReference(s.config,reference,s.schema,2);
const score=portScore(s,reference);assert.equal(score.deductions,0);assert.equal(score.onTime,score.dueBoxes);assert.equal(score.handover,10);assert.ok(score.total>=99);
const raw=serializePortSession(s), hash=await portStateHash(s);
await writeFile(output+'teacher-reference.json',raw);
await writeFile(output+'teacher-reference-report.json',serializePortSession(s,{review:true}));
await writeFile(output+'teacher-start-plan.json',serializePortSession(createPortSession('battle',s.config,calibratedPortPlan())));
const restored=restorePortSession(raw);assert.equal(await portStateHash(restored),hash);assert.deepEqual(portScore(restored,reference),score);
const tampered=JSON.parse(raw);tampered.review={score:{total:100}};
assert.equal(await portStateHash(restorePortSession(JSON.stringify(tampered))),hash);
console.log('REPLAY OK '+JSON.stringify(score));
const pkg=await makePortSubmission(raw,s);await writeFile(output+'teacher-reference-submission.json',JSON.stringify(pkg));
const started=Date.now(), verified=await submissionWorker(pkg).promise;
assert.equal(verified.result.stateHash,hash);assert.equal(verified.result.score,score.total);assert.equal(verified.result.complete,true);
const summary={config:s.config,plan:s.initialPlan,budget:terminalBudget(s.initialPlan.equipment),reference,score,snapshots,ships:Object.values(s.calls).filter(c=>c.announced).map(c=>({id:c.id,stage:c.stage,arrivedAt:c.arrivedAt,deadline:portDeadline(s,c.id,'ship'),milestones:c.milestones,wait:c.wait})),totalBoxes:Object.keys(s.boxes).length,ledgerEvents:Object.values(s.boxes).reduce((n,b)=>n+b.history.length,0),exceptions:Object.values(s.boxes).filter(b=>b.issue==='resolved').length,remainingJobs:s.jobs.length,commands:s.inputLog!.length,hash,serverVerificationMs:Date.now()-started,serverScore:verified.result.score,checks:['48h and six shifts','box conservation and continuous ledger','yard capacity','unique active resources','exception resolution','handover rejects omissions','same-state export and import','fabricated score ignored','production server worker recomputation']};
await writeFile(output+'final-summary.json',JSON.stringify(summary,null,2));
console.log('VERIFIED '+JSON.stringify({score:score.total,unitCost:reference.unitCost,hash,serverMs:summary.serverVerificationMs}));
