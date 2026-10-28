import test from 'node:test';
import assert from 'node:assert/strict';
import {assertEnterprise,assertYards,compareEnterpriseYards,createEnterprise,enterpriseHash,enterpriseRecord,executeEnterprise,restoreEnterprise,retrieveYard,storeYard,type EnterpriseCommand,type EnterpriseState} from '../src/enterprise.js';
const act=(s:EnterpriseState,c:EnterpriseCommand)=>{const next=executeEnterprise(s,c);assert.ok(next.journal.at(-1)?.ok,next.journal.at(-1)?.message??'missing result');return next;};

test('fixed, shared and dynamic admission use real block capacity, including multiple tiers of one lot',()=>{
  const quantities=[];
  for(const allocation of ['fixed','shared','dynamic'] as const){
    let s=createEnterprise();s.terminals[0]!.storageCapacity=200;
    s=act(s,{kind:'yard-plan',terminalId:'T1',patch:{allocation,importShare:50,sharedShare:20}});
    const l=s.lots.find(l=>l.id==='call-0-T1-I')!;
    const result=storeYard(s,l,Math.min(200,l.ship),10000);l.ship-=result.quantity;l.yard+=result.quantity;
    assertYards(s);quantities.push(result.quantity);
    assert.ok(result.movement>=result.quantity);
  }
  assert.deepEqual(quantities,[100,140,200]);
});

test('blocked lower layers require physical relocation space, crane work and actual rehandling expense',()=>{
  const s=createEnterprise();s.management.yardPlans.T1!.allocation='dynamic';
  const lower=s.lots[0]!,upper=s.lots[1]!,column=s.management.blocks[0]!.columns[0]!;
  lower.ship-=5;lower.yard=5;upper.land-=5;upper.yard=5;
  column.layers=[{lotId:lower.id,quantity:5,group:'A',expectedHour:10},{lotId:upper.id,quantity:5,group:'C',expectedHour:80}];
  const before=JSON.stringify(s.management.blocks),cash=s.cash;
  const blocked=retrieveYard(s,lower,5,5,50,50);assert.equal(blocked.quantity,0);assert.equal(JSON.stringify(s.management.blocks),before);
  const pulled=retrieveYard(s,lower,5,30,30,30,true);lower.yard-=pulled.quantity;lower.completed+=pulled.quantity;s.stats.delivered+=pulled.quantity;
  assert.equal(pulled.quantity,5);assert.equal(pulled.rehandles,5);assert.equal(s.cash,cash-275);
  assert.ok(pulled.movement+pulled.rehandles<=30);assert.ok(pulled.movement+pulled.relocationTransport<=30);
  assertEnterprise(s);
});

test('yard classification uses public commitments rather than hidden actual arrival times',()=>{
  const a=createEnterprise(),b=structuredClone(a);
  a.management.yardPlans.T1!.classification='turnover';b.management.yardPlans.T1!.classification='turnover';
  for(const call of b.calls)call.arrival+=4000;
  for(const s of [a,b]){const l=s.lots[0]!;const r=storeYard(s,l,30,50);l.ship-=r.quantity;l.yard+=r.quantity;assertYards(s);}
  assert.deepEqual(a.management.blocks,b.management.blocks);
});

test('invalid or unsupported management decisions leave business state intact and are recorded as failures',()=>{
  const s=createEnterprise(),hash=enterpriseHash(s);
  for(const c of [{kind:'yard-plan',terminalId:'T1',patch:{importShare:80,sharedShare:30}},{kind:'management-plan',patch:{chargeTarget:99}},{kind:'yard-plan',terminalId:'T3',patch:{allocation:'dynamic'}}] as EnterpriseCommand[]){const rejected=executeEnterprise(s,c);assert.equal(rejected.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(rejected),hash);}
});

test('batch staffing preserves headcount, skills, training and wages through repeated rearrangements',()=>{
  let s=act(createEnterprise(),{kind:'hire',role:'technician',count:3,shift:'reserve'});
  const signature=(s:EnterpriseState)=>{const groups=new Map<string,number>();for(const c of s.crews){const key=[c.role,c.skill,c.trainingUntil,c.trainingGain,c.hiredHour,c.wage].join('/');groups.set(key,(groups.get(key)??0)+c.count);}return [...groups].sort();};
  const before=signature(s);
  for(const template of ['day-heavy','reserve','balanced','reserve','day-heavy'] as const){s=act(s,{kind:'staff-plan',template});assert.deepEqual(signature(s),before);assert.equal(new Set(s.crews.map(c=>c.id)).size,s.crews.length);}
});

test('charging respects finite grid capacity and staggered plans retain an available fleet',()=>{
  const s=createEnterprise(),electric=s.assets.find(a=>a.model==='electric-tractor')!;
  s.assets=s.assets.filter(a=>a.id===electric.id);
  for(let n=1;n<3;n++)s.assets.push({...electric,id:'test-electric-'+n});
  for(const a of s.assets)a.battery=10;
  s.gridKw=270;
  const limited=act(s,{kind:'advance',hours:1});
  assert.ok(limited.management.metrics.chargingEnergy<=90.00001);assert.equal(limited.management.metrics.chargingWaitHours,2);
  const p=createEnterprise(),base=p.assets.find(a=>a.model==='electric-tractor')!;
  p.assets=[...Array.from({length:4},(_,n)=>({...base,id:'fleet-'+n,battery:150}))];p.management.plan.charging='staggered';
  const planned=act(p,{kind:'advance',hours:1});
  assert.equal(planned.management.metrics.chargingHours,2);assert.equal(planned.assets.filter(a=>a.note==='可用').length,2);
});

test('major incidents need authorization; repair consumes time and backup never exceeds its budget',()=>{
  let s=createEnterprise();s.incidents.push({id:'test-outage',type:'power',title:'测试供电中断',terminalId:null,started:0,status:'active',response:'none',resolves:null,evidence:false,loss:0,blockedHours:0});
  s=act(s,{kind:'advance',hours:1});assert.equal(s.stats.delivered,0);assert.equal(s.incidents[0]!.evidence,false);
  s=act(s,{kind:'incident-plan',incidentId:'test-outage',plan:'continuity',budget:75000});
  assert.ok(s.incidents[0]!.resolves!>s.hour);assert.equal(s.incidents[0]!.backupActive,false,'cannot start an unbudgeted hour');
  s=act(s,{kind:'advance',hours:14});assert.equal(s.incidents[0]!.status,'resolved');assert.equal(s.stats.recovered,1);
  assert.ok(s.incidents[0]!.authorizedSpent!<=75000);assertEnterprise(s);
});

test('weekly feedback uses separate cargo units and historical experiments preserve the live record',()=>{
  let s=act(createEnterprise(),{kind:'management-plan',patch:{goal:'balanced'}});
  assert.throws(()=>compareEnterpriseYards(s),/一周/);
  s=act(s,{kind:'advance',hours:168});assertEnterprise(s);
  const r=s.management.reviews[0]!;assert.equal(r.endHour,168);assert.equal(r.cashChange,s.cash-85000000);
  assert.equal(r.delivered.container,s.lots.filter(l=>l.goods==='container').reduce((n,l)=>n+l.completed,0));
  const hash=enterpriseHash(s),length=s.journal.length,comparison=compareEnterpriseYards(s);
  assert.equal(comparison.variants.length,2);assert.equal(enterpriseHash(s),hash);assert.equal(s.journal.length,length);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),hash);
  const exam=createEnterprise({...s.config,mode:'exam'});assert.throws(()=>compareEnterpriseYards(exam),/考核/);
});

test('rail cargo stages before departure and clears the gate after arrival without an artificial one-hour gate bottleneck',()=>{
  let s=createEnterprise(),laterGate=false,stagedBeforeDeparture=false;
  for(let hour=0;hour<96;hour++){
    const outgoing=s.lots.find(l=>l.id==='call-0-T2-E')!,land=outgoing.land;
    const before=s.lots.filter(l=>l.terminalId==='T2'&&l.flow==='import').reduce((n,l)=>n+l.completed,0);
    s=act(s,{kind:'advance',hours:1});assertEnterprise(s);
    const after=s.lots.filter(l=>l.terminalId==='T2'&&l.flow==='import').reduce((n,l)=>n+l.completed,0);
    if(hour%24!==s.policy.railHour){assert.equal(after,before,'imports only depart at the train window');if(s.lots.find(l=>l.id===outgoing.id)!.land<land)laterGate=true;}
    if(hour%24!==s.policy.railHour&&s.lots.some(l=>l.terminalId==='T2'&&l.flow==='import'&&l.land>0))stagedBeforeDeparture=true;
  }
  assert.ok(laterGate);assert.ok(stagedBeforeDeparture);
  assert.ok(s.lots.filter(l=>l.terminalId==='T2'&&l.flow==='import').reduce((n,l)=>n+l.completed,0)>200);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),enterpriseHash(s));
});
