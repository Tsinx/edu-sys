import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,executeEnterprise,assertEnterprise,assertYards,storeYard,retrieveYard,enterpriseRecord,enterpriseHash,restoreEnterprise,projectUnavailable,preferredRoute,type EnterpriseState,type EnterpriseCommand} from '../src/enterprise.js';
const act=(s:EnterpriseState,c:EnterpriseCommand)=>{const next=executeEnterprise(s,c,undefined,true);assert.ok(next.journal.at(-1)?.ok,next.journal.at(-1)?.message??'missing command outcome');return next;};
test('three-tier admission preserves the fourth physical layer for paid rehandling and releases a buried lot',()=>{
  const s=createEnterprise(),plan=s.management.yardPlans.T1!;plan.allocation='dynamic';plan.maxTiers=3;
  const lower=s.lots.find(l=>l.id==='call-0-T1-I')!,upper=s.lots.find(l=>l.id==='call-0-T1-E')!;
  lower.ship-=13;lower.yard=13;upper.land-=13;upper.yard=13;
  const filler={...upper,id:'test-filled-yard',quantity:148*13,land:0,yard:148*13},incoming={...upper,id:'test-inbound',quantity:1,land:1,yard:0};s.lots.push(filler,incoming);
  for(const b of s.management.blocks.filter(b=>b.terminalId==='T1'))for(const c of b.columns)c.layers=Array.from({length:3},()=>({lotId:filler.id,quantity:13,group:'C',expectedHour:80}));
  s.management.blocks[0]!.columns[0]!.layers=[{lotId:lower.id,quantity:13,group:'A',expectedHour:10},{lotId:upper.id,quantity:13,group:'C',expectedHour:80},{lotId:filler.id,quantity:13,group:'C',expectedHour:80}];
  assertYards(s);assert.equal(storeYard(s,incoming,1,100).quantity,0,'new arrivals cannot fill the reserved fourth layer');
  const cash=s.cash,pulled=retrieveYard(s,lower,13,100,100,100);lower.yard-=pulled.quantity;lower.completed+=pulled.quantity;
  assert.equal(pulled.quantity,13);assert.equal(pulled.rehandles,26);assert.equal(s.cash,cash-26*55);
  assert.ok(s.management.blocks.some(b=>b.terminalId==='T1'&&b.columns.some(c=>c.layers.length===4)));assertYards(s);
});
function run(s:EnterpriseState,hours:number){const end=s.hour+hours;while(s.hour<end){for(const i of s.incidents.filter(i=>i.status!=='resolved'&&(!i.authorization||i.authorizationPaused)))s=act(s,{kind:'incident-plan',incidentId:i.id,plan:'repair',budget:300000});s=act(s,{kind:'advance',hours:Math.min(168,end-s.hour),stopOnIncident:true});}assertEnterprise(s);return s;}

test('operating goals preserve independently chosen charging, staffing and logistics policies',()=>{
  let s=act(createEnterprise(),{kind:'management-plan',patch:{charging:'offpeak',fuelDays:3}});
  s=act(s,{kind:'logistics-plan',terminalId:'T1',patch:{road:'basic',routing:'barge-first'}});
  s=act(s,{kind:'management-plan',patch:{goal:'service'}});
  assert.equal(s.management.plan.charging,'offpeak');assert.equal(s.management.plan.fuelDays,3);assert.equal(s.management.logisticsPlans.T1!.routing,'barge-first');
  const cash=s.cash;s=executeEnterprise(s,{kind:'governance',value:'landlord'});assert.equal(s.journal.at(-1)!.ok,false);assert.equal(s.cash,cash);
});
test('projects reject inapplicable or exhausted capabilities without charging cash',()=>{
  let s=createEnterprise();assert.ok(projectUnavailable(s,'dust','T7'));
  s=act(s,{kind:'project',type:'security',terminalId:'T1'});s=run(s,40*24+1);
  const cash=s.cash;s=executeEnterprise(s,{kind:'project',type:'security',terminalId:'T1'});assert.equal(s.journal.at(-1)!.ok,false);assert.equal(s.cash,cash);
  assert.ok(projectUnavailable(s,'automation','T3'));assert.ok(projectUnavailable(s,'channel-depth','T7'));
});
test('booked warehouse service charges actual stock and automatically releases at pickup while preserving replay',()=>{
  let s=act(createEnterprise(),{kind:'project',type:'bonded-warehouse',terminalId:'T1'});s=run(s,100*24+1);
  s=act(s,{kind:'logistics-plan',terminalId:'T1',patch:{warehousing:'bonded'}});s=run(s,14*24);
  assert.ok(s.management.metrics.warehouseRevenue>0);assert.ok(s.lots.some(l=>l.storageFees>0&&l.completed>0));
  assert.ok(s.lots.every(l=>!l.bonded||l.pickupHour>s.hour-1));
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),enterpriseHash(s));
});
test('reserve workers cover real gaps within eight daily equivalent hours per person',()=>{
  let s=createEnterprise();for(const c of [...s.crews].filter(c=>c.role==='driver'))s=act(s,{kind:'staff',crewId:c.id,shift:'reserve'});
  const available=s.crews.filter(c=>c.role==='driver').reduce((n,c)=>n+c.count*c.skill/100,0);
  for(let d=0;d<5;d++){s=run(s,24);assert.ok((s.management.reserveUsed.driver??0)<=available*8+.00001);}
  assert.ok(s.management.metrics.reserveCoverHours>0);assert.ok(s.stats.delivered>0);
});
test('ordinary interruptions follow standing authority and serious events retain a personal decision',()=>{
  let s=createEnterprise();s.incidents.push({id:'minor',type:'power',title:'普通中断',terminalId:null,started:0,status:'active',response:'none',resolves:null,evidence:false,loss:0,blockedHours:0,severity:1});
  s=act(s,{kind:'advance',hours:15});assert.equal(s.incidents[0]!.status,'resolved');
  s.incidents.push({id:'major',type:'power',title:'严重中断',terminalId:null,started:s.hour,status:'active',response:'none',resolves:null,evidence:false,loss:0,blockedHours:0,severity:2});
  s=act(s,{kind:'advance',hours:1});assert.equal(s.incidents[1]!.authorization,undefined);
});
test('reactive maintenance still delegates repair and contract responsibility counts only incremental business',()=>{
  let s=act(createEnterprise(),{kind:'policy',patch:{maintenance:'reactive',tariff:1.3}});s.assets[0]!.status='failed';
  s=act(s,{kind:'accept-contract',contractId:s.contracts[0]!.id});s=run(s,7*24);
  assert.notEqual(s.assets[0]!.status,'failed');const contract=s.contracts[0]!;
  const calls=s.calls.filter(c=>c.contractId===contract.id);assert.ok(calls.length>0);assert.ok(calls.every(c=>c.contractShare>0&&c.contractShare<1));
  const total=s.lots.filter(l=>calls.some(c=>c.id===l.callId)).reduce((n,l)=>n+l.quantity,0);
  assert.ok(contract.promised<total);assert.ok(contract.shipped<=contract.promised+.00001);
});
test('supply orders pay once, remain assets in transit, and deliver finite physical fuel after their lead time',()=>{
  let s=act(createEnterprise(),{kind:'policy',patch:{autoSupplies:false}});const cash=s.cash,initial=s.fuelStock;
  s=act(s,{kind:'supplies',item:'fuel',quantity:1000});assert.equal(s.cash,cash-7200);assert.equal(s.fuelStock,initial);assert.equal(s.supplyOrders[0]!.status,'transit');
  s=run(s,23);assert.equal(s.supplyOrders[0]!.status,'transit');
  s=run(s,5*24);assert.equal(s.supplyOrders[0]!.status,'received');
  assert.ok(Math.abs(s.fuelStock-(initial+1000-s.stats.fuel))<.00001);assertEnterprise(s);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),enterpriseHash(s));
});
test('batch training removes only selected workers and rejects excessive enrollment without spending',()=>{
  let s=createEnterprise();const id=s.crews.find(c=>c.role==='driver'&&c.shift===0)!.id,total=s.crews.reduce((n,c)=>n+c.count,0),count=s.crews.find(c=>c.id===id)!.count;
  s=act(s,{kind:'train',crewId:id,count:3});assert.equal(s.crews.reduce((n,c)=>n+c.count,0),total);assert.equal(s.crews.find(c=>c.id===id)!.count,count-3);
  assert.equal(s.crews.filter(c=>c.trainingUntil>s.hour).reduce((n,c)=>n+c.count,0),3);
  const hash=enterpriseHash(s);s=executeEnterprise(s,{kind:'train',crewId:id,count:50});assert.equal(s.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(s),hash);
});
test('balanced routing reserves a real shared daily window and sends excess batches to the road',()=>{
  const s=createEnterprise(),t=s.terminals.find(t=>t.id==='T2')!;
  assert.equal(preferredRoute(s,t,9,601),'road');assert.equal(preferredRoute(s,t,9,10),'rail');
  const used=s.lots.filter(l=>l.terminalId==='T2'&&l.route==='rail').reduce((n,l)=>n+l.quantity,0);
  assert.ok(used<=600);assert.equal(preferredRoute(s,t,9,601-used),'road');
  s.management.logisticsPlans.T2!.routing='rail-first';assert.equal(preferredRoute(s,t,9,601),'rail');
});
test('an incompatible idle crane cannot reserve the power needed by a compatible crane',()=>{
  let s=createEnterprise();s.gridKw=700;s.policy.maintenance='reactive';
  for(const a of s.assets){a.health=100;a.serviceHours=0;if(a.terminalId!=='T1'||!['sts-standard','sts-wide'].includes(a.model))a.status='retired';}
  const c=s.calls.find(c=>c.terminalId==='T1')!;c.rows=22;c.stage='berthed';c.arrivedHour=0;c.berthedHour=0;c.workHour=0;s.terminals[0]!.berthCall=c.id;
  s=act(s,{kind:'advance',hours:1});assert.ok(s.stats.unloaded>0,'the wide crane must work with 520 kW available');
  assert.equal(s.assets.find(a=>a.model==='sts-standard')!.lastWork,0);assert.match(s.assets.find(a=>a.model==='sts-standard')!.note,/待命/);
  assert.ok(s.assets.find(a=>a.model==='sts-wide')!.lastWork>0);assertEnterprise(s);
});
test('equipment without current production can receive planned maintenance without reserving production resources',()=>{
  let s=createEnterprise();for(const a of s.assets){a.health=100;a.serviceHours=0;}const id=s.assets[0]!.id;s.assets[0]!.health=60;
  s=act(s,{kind:'advance',hours:1});assert.equal(s.assets.find(a=>a.id===id)!.status,'maintenance');assert.equal(s.assets.find(a=>a.id===id)!.lastWork,0);
  assert.ok(s.assets.some(a=>a.status==='active'&&a.note.includes('待命')));assertEnterprise(s);
});
