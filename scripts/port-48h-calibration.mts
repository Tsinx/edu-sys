import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createPortSession, defaultPortPlan, defaultPortConfig, applyPortCommand, advancePortSession, servicePortReference, portScore, portHandoverItems, serializePortSession, portReferenceCost, portYardUsage, terminalBudget, PORT_HORIZON, type PortPlan } from '../packages/port-simulation-core/src/index.js';

const output=fileURLToPath(new URL('../output/port-48h-calibration-20260922/',import.meta.url));
await mkdir(output,{recursive:true});
const config=defaultPortConfig();
const phase=process.argv[2]??'equipment';
assert.ok(['equipment','refine','policy2','balanced'].includes(phase));
const reference=portReferenceCost(config);
const candidates: {name:string; plan:PortPlan}[]=[{name:'original',plan:defaultPortPlan()}];
for (const [cranes,vehicles,yardMachines,gates] of [[5,12,4,2],[4,12,4,2],[4,8,4,2],[4,12,3,2],[5,12,3,2],[4,12,4,3],[4,16,4,2],[5,8,4,2],[4,12,5,2]]) {
  const plan=defaultPortPlan(), e=plan.equipment;
  Object.assign(e,{cranes,vehicles,yardMachines,gates,vehicle:'agv',yardMachine:'rmg',gateSystem:'smart'});
  Object.assign(e.dispatch,{berthCranes:[2,cranes!-2],craneOperators:cranes,drivers:Math.ceil(vehicles!/4),yardOperators:yardMachines,gateClerks:Math.ceil(gates!/2),technicians:1});
  if(terminalBudget(e)<=1200)candidates.push({name:`agv-${cranes}-${vehicles}-${yardMachines}-${gates}`,plan});
}
if(phase!=='equipment'){
  candidates.length=0;
  const variants=phase==='refine'?[[6,8,3,3,0],[6,8,4,3,0],[6,12,3,3,0],[5,8,3,3,0],[6,8,3,3,1]]:
    phase==='policy2'?[[6,8,4,3,0],[5,8,4,2,0],[5,8,3,2,0],[6,8,4,3,1]]:[[6,8,4,3,0],[5,8,4,2,0],[6,8,3,3,0]];
  for(const [cranes,vehicles,yards,berthA,layout] of variants){
    const plan=defaultPortPlan(),e=plan.equipment;
    Object.assign(e,{cranes,vehicles,yardMachines:yards,gates:2,vehicle:'agv',yardMachine:'rmg',gateSystem:'smart'});
    Object.assign(e.dispatch,{berthCranes:[berthA,cranes!-berthA!],craneOperators:cranes,drivers:Math.ceil(vehicles!/4),yardOperators:yards,gateClerks:1,technicians:1});
    if(layout){const coords=[[1,0],[3,0],[3,1],[2,1],[2,0],[1,1]];plan.yards.forEach((y,i)=>{[y.col,y.row]=coords[i]! as [number,number];});}
    candidates.push({name:`${phase}-${cranes}-${vehicles}-${yards}-A${berthA}-L${layout}`,plan});
  }
}
const results=[];
for(const candidate of candidates){
  const begin=performance.now(), s=createPortSession('battle',config,candidate.plan), snapshots=[];
  s.referenceVersion=1; // Hold the scoring yardstick fixed across all comparisons.
  applyPortCommand(s,{kind:'start'});
  while(s.second<PORT_HORIZON){
    if(phase==='balanced'){
      const e=s.plan.equipment,occupied=s.berths.map(Boolean);
      const berthCranes:[number,number]=occupied[0]&&!occupied[1]?[e.cranes,0]:occupied[1]&&!occupied[0]?[0,e.cranes]:[...s.initialPlan.equipment.dispatch.berthCranes];
      if(berthCranes.some((n,i)=>n!==e.dispatch.berthCranes[i]))applyPortCommand(s,{kind:'dispatch',dispatch:{...e.dispatch,berthCranes}});
    }
    servicePortReference(s,phase==='policy2'||phase==='balanced'?2:1);
    advancePortSession(s,120);
    for(const y of s.plan.yards){const usage=portYardUsage(s,y.id);assert.ok(usage.occupied+usage.reserved<=y.capacity,`${candidate.name}: overflow ${y.id}`);}
    assert.ok(Number.isFinite(s.cost)&&s.cost>=0);
    if(s.second%28800===0)snapshots.push({hour:s.second/3600,score:portScore(s,reference),ships:Object.values(s.calls).filter(c=>c.announced).map(c=>({id:c.id,stage:c.stage})),jobs:s.jobs.length});
  }
  applyPortCommand(s,{kind:'handover',entries:portHandoverItems(s).map(({object,team,next})=>({object,team,next}))});
  const score=portScore(s,reference);
  assert.equal(s.status,'completed');assert.equal(score.deductions,0);assert.equal(score.handover,10);
  const raw=serializePortSession(s);
  const row={name:candidate.name,config,plan:candidate.plan,budget:terminalBudget(candidate.plan.equipment),score,cost:s.cost,energy:s.energy,distance:s.distance,rehandles:s.rehandles,elapsedMs:Math.round(performance.now()-begin),snapshots,attempts:s.attempts.reduce((a,r)=>(a[r.rule]=(a[r.rule]??0)+1,a),{} as Record<string,number>)};
  results.push(row);
  await writeFile(output+candidate.name+'.json',raw);
  const summaryName=phase==='equipment'?'comparison':phase==='refine'?'refinement':phase;
  await writeFile(output+summaryName+'.json',JSON.stringify({reference,results},null,2));
  console.log(JSON.stringify({name:row.name,budget:row.budget,score:score.total,onTime:`${score.onTime}/${score.dueBoxes}`,ship:`${score.onTimeDepartures}/${score.dueShips}`,unitCost:score.unitCost,elapsedMs:row.elapsedMs}));
}
const best=[...results].sort((a,b)=>b.score.total-a.score.total||a.score.unitCost-b.score.unitCost)[0]!;
console.log('BEST '+JSON.stringify({name:best.name,score:best.score}));
