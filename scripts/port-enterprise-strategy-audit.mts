import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createEnterprise,executeEnterprise,enterpriseScore,enterpriseGoods,assertEnterprise,enterpriseRecord,enterpriseHash,restoreEnterprise,incidentBudget,type EnterpriseCommand,type EnterpriseState,type Scenario} from '../packages/port-simulation-core/src/enterprise.js';

const output=resolve(process.argv[2]??'output/port-enterprise-strategy-20261031');await mkdir(output,{recursive:true});
const results:unknown[]=[];
function act(s:EnterpriseState,c:EnterpriseCommand){const next=executeEnterprise(s,c,undefined,true);assert.ok(next.journal.at(-1)?.ok,next.journal.at(-1)?.message??'missing command outcome');return next;}
function advance(s:EnterpriseState,hour:number,renew=false){
  while(s.hour<hour){
    for(const i of s.incidents.filter(i=>i.status!=='resolved'&&(!i.authorization||i.authorizationPaused)))s=act(s,{kind:'incident-plan',incidentId:i.id,plan:'repair',budget:Math.max(120000,incidentBudget(s,i,'repair'))});
    if(renew)for(const c of s.contracts.filter(c=>c.goods==='container'&&!c.accepted&&c.expires>=s.hour))if(!s.contracts.some(x=>x.accepted&&x.customerId===c.customerId&&x.endHour>s.hour))s=act(s,{kind:'accept-contract',contractId:c.id});
    s=act(s,{kind:'advance',hours:Math.min(168,hour-s.hour),stopOnIncident:true});assertEnterprise(s);
  }
  return s;
}
async function run(name:string,scenario:Scenario,commands:EnterpriseCommand[]=[],days=90,seed=20261025,renew=false,years:1|3|5=1,phases:{day:number;commands:EnterpriseCommand[]}[]=[]){
  const selected=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');if(selected&&!selected.includes(name))return;
  let s=createEnterprise({seed,years,scenario,mode:'practice'});for(const c of commands)s=act(s,c);
  const started=performance.now();for(const phase of phases){s=advance(s,phase.day*24,renew);for(const c of phase.commands)s=act(s,c);}s=advance(s,Math.min(s.horizon,days*24),renew);
  const score=enterpriseScore(s),goods=enterpriseGoods(s),hash=enterpriseHash(s),record=enterpriseRecord(s);
  const replay=restoreEnterprise(record);assert.equal(enterpriseHash(replay),hash);
  const result={name,scenario,seed,days:s.hour/24,years,cash:s.cash,profit:score.profit,equity:score.equity,fulfillment:score.deliveryRate,waiting:score.waitingHours,emissionsIntensity:score.emissionsPerUnit,
    goods:goods.map(g=>({kind:g.kind,delivered:g.delivered,fulfillment:g.fulfillment,outstanding:g.outstanding})),metrics:s.management.metrics,
    insurance:s.stats.insurancePremium,claims:s.stats.insuranceClaims,missedDemand:s.management.missedDemand,delayedSupplies:s.supplyOrders.filter(o=>o.delayed).length,incidents:s.incidents.length,hash,ms:Math.round(performance.now()-started)};
  results.push(result);console.log(JSON.stringify({name,scenario,seed,profit:result.profit,fulfillment:result.fulfillment,emissions:result.emissionsIntensity}));
  await writeFile(resolve(output,'strategy-comparisons.json'),JSON.stringify({scope:'local deterministic teaching scenarios; not student grades',rules:s.rules,results},null,2));
  if(days>=365)await writeFile(resolve(output,name+'-'+scenario+'-'+seed+'-record.json'),JSON.stringify(record));
  return result;
}
if(!process.argv.includes('--extended')){
for(const scenario of ['balanced','growth','green'] as const)for(const tariff of [.7,.85,1,1.15,1.3,1.5])await run('price-'+tariff,scenario,[{kind:'policy',patch:{tariff}}]);
for(const scenario of ['balanced','resilience'] as const)for(const template of ['balanced','day-heavy','reserve'] as const)await run('staff-'+template,scenario,[{kind:'staff-plan',template}]);
for(const scenario of ['balanced','green'] as const)for(const charging of ['threshold','staggered','offpeak'] as const)await run('charge-'+charging,scenario,[{kind:'management-plan',patch:{goal:'green'}},...Array.from({length:4},():EnterpriseCommand=>({kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'})),{kind:'management-plan',patch:{charging}}]);
for(const road of ['basic','reserved','surge'] as const){
  const investment:EnterpriseCommand[]=[{kind:'policy',patch:{tariff:.85}},{kind:'logistics-plan',terminalId:'T1',patch:{road}},
    ...Array.from({length:2},():EnterpriseCommand=>({kind:'order-asset',model:'sts-wide',terminalId:'T1',ownership:'leased'})),
    {kind:'order-asset',model:'rtg',terminalId:'T1',ownership:'leased'},...Array.from({length:2},():EnterpriseCommand=>({kind:'order-asset',model:'manual-gate',terminalId:'T1',ownership:'owned'})),
    ...Array.from({length:4},():EnterpriseCommand=>({kind:'order-asset',model:'diesel-tractor',terminalId:'T1',ownership:'owned'})),
    ...([0,1,2] as const).map((shift):EnterpriseCommand=>({kind:'hire',role:'driver',count:5,shift})),
    ...([0,1,2] as const).map((shift):EnterpriseCommand=>({kind:'hire',role:'crane',count:3,shift}))];
  await run('road-'+road,'balanced',investment,240,20261025,true);
}
for(const scenario of ['balanced','resilience'] as const)for(const seed of [20261025,20261031,82027])for(const insurance of [false,true])await run('insurance-'+insurance,scenario,[{kind:'policy',patch:{insurance}}],365,seed);
for(const allocation of ['fixed','shared','dynamic'] as const)for(const classification of ['arrival','turnover','voyage'] as const)await run('yard-'+allocation+'-'+classification,'balanced',[{kind:'yard-plan',terminalId:'T1',patch:{allocation,classification}}]);
for(const routing of ['road','balanced','rail-first','barge-first'] as const)await run('route-'+routing,'balanced',[{kind:'logistics-plan',terminalId:'T2',patch:{routing}}]);
await run('route-barge-matched-window','balanced',[{kind:'logistics-plan',terminalId:'T2',patch:{routing:'barge-first'}},{kind:'policy',patch:{bargeHour:6}}]);
for(const scenario of ['balanced','resilience'] as const)for(const fuelDays of [3,7,14] as const)await run('supplies-'+fuelDays,scenario,[{kind:'management-plan',patch:{fuelDays,partsTarget:fuelDays===3?6:fuelDays===7?12:24}}],365,82027);
const capacity:EnterpriseCommand[]=[{kind:'loan',amount:30000000},{kind:'project',type:'berth-extension',terminalId:'T1'},{kind:'project',type:'channel-depth',terminalId:'T1'},...Array.from({length:2},():EnterpriseCommand=>({kind:'order-asset',model:'sts-wide',terminalId:'T1',ownership:'leased'})),{kind:'order-asset',model:'rtg',terminalId:'T1',ownership:'leased'},...Array.from({length:2},():EnterpriseCommand=>({kind:'order-asset',model:'manual-gate',terminalId:'T1',ownership:'owned'})),...Array.from({length:4},():EnterpriseCommand=>({kind:'order-asset',model:'diesel-tractor',terminalId:'T1',ownership:'owned'})),...([0,1,2] as const).map((shift):EnterpriseCommand=>({kind:'hire',role:'driver',count:5,shift})),...([0,1,2] as const).map((shift):EnterpriseCommand=>({kind:'hire',role:'crane',count:3,shift})),{kind:'logistics-plan',terminalId:'T1',patch:{road:'surge'}}];
await run('growth-capacity-investment','growth',capacity,1096,20261031,false,3);
const lean:EnterpriseCommand[]=[{kind:'loan',amount:20000000},{kind:'project',type:'berth-extension',terminalId:'T1'},{kind:'project',type:'channel-depth',terminalId:'T1'},{kind:'project',type:'road-upgrade',terminalId:'T1'},{kind:'order-asset',model:'sts-wide',terminalId:'T1',ownership:'leased'},...(['T1','T2'] as const).map((terminalId):EnterpriseCommand=>({kind:'yard-plan',terminalId,patch:{allocation:'dynamic',classification:'turnover',sharedShare:20}}))];
await run('growth-phased-rules','growth',lean,1096,20261031,false,3);
for(const scenario of ['balanced','growth','green','resilience'] as const)await run('long-3y',scenario,[],1096,20261031,false,3);
await run('long-5y','balanced',[],1826,20261031,false,5);
}else{
for(const goal of ['balanced','service','flow','green'] as const)await run('goal-'+goal,'growth',[{kind:'policy',patch:{tariff:.85}},{kind:'management-plan',patch:{goal}}],180,20261031,true);
for(const maintenance of ['standard','offpeak','risk'] as const)await run('maintenance-'+maintenance,'resilience',[{kind:'management-plan',patch:{maintenance}}],365,82027);
for(const routineResponse of ['repair','continuity'] as const)await run('ordinary-'+routineResponse,'resilience',[{kind:'management-plan',patch:{routineResponse,routineBudget:300000}}],365,82027);
await run('warehouse-no-project','balanced',[],365,20261031);
await run('warehouse-idle-facility','balanced',[{kind:'project',type:'bonded-warehouse',terminalId:'T1'}],365,20261031);
await run('warehouse-booked-service','balanced',[{kind:'project',type:'bonded-warehouse',terminalId:'T1'}],365,20261031,false,1,[{day:101,commands:[{kind:'logistics-plan',terminalId:'T1',patch:{warehousing:'bonded'}}]}]);
await run('growth-bulk-berth','growth',[{kind:'project',type:'berth-extension',terminalId:'T3'}],1096,20261031,false,3);
await run('growth-priced-phased','growth',[{kind:'policy',patch:{tariff:1.15}},{kind:'loan',amount:50000000},{kind:'project',type:'berth-extension',terminalId:'T1'},{kind:'project',type:'channel-depth',terminalId:'T1'},{kind:'order-asset',model:'sts-wide',terminalId:'T1',ownership:'owned'},{kind:'yard-plan',terminalId:'T1',patch:{allocation:'dynamic',classification:'turnover',sharedShare:20}}],1096,20261031,false,3);
const buffered:EnterpriseCommand[]=[{kind:'policy',patch:{tariff:1.15}},...(['T1','T2'] as const).map((terminalId):EnterpriseCommand=>({kind:'yard-plan',terminalId,patch:{allocation:'dynamic',classification:'turnover',sharedShare:20,maxTiers:3}})),{kind:'logistics-plan',terminalId:'T2',patch:{routing:'road'}}];
await run('growth-buffered-only','growth',buffered,1096,20261031,false,3);
await run('growth-buffered-investment','growth',[...buffered,{kind:'loan',amount:20000000},{kind:'project',type:'berth-extension',terminalId:'T1'},{kind:'project',type:'channel-depth',terminalId:'T1'},{kind:'project',type:'road-upgrade',terminalId:'T1'},{kind:'order-asset',model:'sts-wide',terminalId:'T1',ownership:'leased'}],1096,20261031,false,3);
for(const road of ['basic','reserved','surge'] as const)await run('low-road-'+road,'balanced',[{kind:'logistics-plan',terminalId:'T6',patch:{road}}],180,20261031);
await run('growth-price-only','growth',[{kind:'policy',patch:{tariff:1.15}}],1096,20261031,false,3);
await run('growth-long-5y','growth',[],1826,20261031,false,5);
await run('growth-bulk-long-5y','growth',[{kind:'project',type:'berth-extension',terminalId:'T3'}],1826,20261031,false,5);
}
console.log(JSON.stringify({completed:results.length,output}));
