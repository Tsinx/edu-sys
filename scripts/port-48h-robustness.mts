import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPortSession, calibratedPortPlan, defaultPortConfig, applyPortCommand, advancePortSession, servicePortReference, portScore, portHandoverItems, portYardUsage, PORT_HORIZON } from '../packages/port-simulation-core/src/index.js';
const output=fileURLToPath(new URL('../output/port-48h-calibration-20260922/',import.meta.url)),rows=[];
for(const [name,config] of [
  ['wind',{...defaultPortConfig(),disruption:'wind' as const}],
  ['outage',{...defaultPortConfig(),disruption:'outage' as const}],
  ['another-seed',{...defaultPortConfig(),seed:20260933}],
] as const){
  const s=createPortSession('battle',config,calibratedPortPlan());applyPortCommand(s,{kind:'start'});
  while(s.second<PORT_HORIZON){servicePortReference(s,2);advancePortSession(s,120);for(const y of s.plan.yards)assert.ok(portYardUsage(s,y.id).available>=0);}
  applyPortCommand(s,{kind:'handover',entries:portHandoverItems(s).map(({object,team,next})=>({object,team,next}))});
  const complete=portScore(s).completed, score=portScore(s,{unitCost:s.cost/complete});
  assert.equal(score.deductions,0);assert.equal(score.handover,10);assert.equal(s.status,'completed');
  if(name==='outage'){assert.equal(s.failedCrane,null);assert.ok(s.notices.some(n=>n.kind==='repair'));}
  if(name==='wind'){assert.equal(s.wind,1);assert.equal(s.notices.filter(n=>n.kind==='weather').length,2);}
  rows.push({name,config,score,unresolved:Object.values(s.boxes).filter(b=>['open','reported'].includes(b.issue)).length});
  await writeFile(output+'robustness.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.at(-1)));
}
