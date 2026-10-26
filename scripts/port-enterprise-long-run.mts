import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createEnterprise, executeEnterprise, assertEnterprise, enterpriseHash, enterpriseRecord, restoreEnterprise, enterpriseView, nextQuarterHour, type EnterpriseState } from '../packages/port-simulation-core/src/enterprise.js';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve('output/port-enterprise-qa');await mkdir(output,{recursive:true});
const cases=[{seed:20261025,years:3,scenario:'balanced'},{seed:82027,years:5,scenario:'resilience'},{seed:73027,years:3,scenario:'growth'},{seed:62027,years:3,scenario:'green'}] as const;
const reports=[];
const act=(s:EnterpriseState,c:Parameters<typeof executeEnterprise>[1])=>{const next=executeEnterprise(s,c);assert.equal(next.journal.at(-1)?.ok,true,next.journal.at(-1)?.message??'missing command outcome');return next;};
for(const spec of cases){
 let s=createEnterprise({...spec,mode:'practice'});s=act(s,{kind:'policy',patch:{verifiedExceptions:true}});
 if(spec.scenario==='green'){s=act(s,{kind:'project',type:'solar-storage',terminalId:'T1'});s=act(s,{kind:'project',type:'grid-upgrade',terminalId:'T1'});}
 const start=performance.now();let quarter=0;
 while(s.hour<s.horizon){
  for(const incident of s.incidents.filter(i=>i.status!=='resolved')){
   if(!incident.evidence)s=act(s,{kind:'respond',incidentId:incident.id,action:'audit'});
   if(incident.status==='active')s=act(s,{kind:'respond',incidentId:incident.id,action:'isolate'});
   const current=s.incidents.find(i=>i.id===incident.id)!;
   if(current.response!=='repair')s=act(s,{kind:'respond',incidentId:incident.id,action:'repair'});
   else if(current.resolves===null)s=act(s,{kind:'respond',incidentId:incident.id,action:'recover'});
  }
  s=act(s,{kind:'advance',hours:Math.min(168,s.horizon-s.hour),stopOnIncident:true});
  assertEnterprise(s);
  const q=Math.floor(s.hour/(90*24));if(q>quarter){quarter=q;console.log(spec.scenario+' '+spec.years+'y: day '+Math.floor(s.hour/24));}
 }
 for(const topic of ['经营决策','设备投资','生产调度','异常与边界'])s=act(s,{kind:'note',topic,text:'根据本次到期履约、库存、设备可用性、应收与债务进行比较，保留未完成业务并说明经营判断的条件和局限。'});
 s=act(s,{kind:'seal'});const record=enterpriseRecord(s),hash=enterpriseHash(s),t=performance.now(),restored=restoreEnterprise(record);
 assert.equal(enterpriseHash(restored),hash);const view=enterpriseView(s);assert.ok(view.goods.every(g=>g.delivered>0));assert.equal(view.score.complete,true);
 const report={...spec,hours:s.hour,commands:record.commands.length,recordBytes:Buffer.byteLength(JSON.stringify(record)),simulationAndChecksMs:t-start,replayMs:performance.now()-t,stateHash:hash,complete:view.score.complete,score:view.score.total,cash:view.cash,goods:view.goods.map(g=>({kind:g.kind,delivered:g.delivered,outstanding:g.outstanding,fulfillment:g.fulfillment})),activeCalls:view.calls.length,events:s.eventSequence};
 reports.push(report);console.log(JSON.stringify(report));
 if(spec.scenario==='balanced')await writeFile(resolve(output,'three-year-record.json'),JSON.stringify(record));
}
await writeFile(resolve(output,'long-run-report.json'),JSON.stringify({cases:reports,checks:['full-calendar','six-cargo-delivery','cargo-conservation','storage-capacity','cash-ledger','independent-replay-hash','terminal-obligations']},null,2));
