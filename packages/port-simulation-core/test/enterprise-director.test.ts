import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateBerthCranes,enterpriseDirector,enterpriseTelemetryView,createEnterprise,executeEnterprise,enterpriseHash,enterpriseRecord,restoreEnterprise,assertEnterprise,enterpriseRandom,type CraneDemand} from '../src/enterprise.js';
import {post,queuePayable} from '../src/enterprise-accounting.js';
const demand=(id:string,work:number,count:number,deadline=100,waiting=0):CraneDemand=>({terminalId:id,workHours:work,workUnits:work*30,deadline,waiting,cranes:Array.from({length:count},(_,i)=>({id:id+'-'+i,staff:1,kw:100,fuel:0}))});
const allocate=(d:CraneDemand[],operators:number,power=10000)=>allocateBerthCranes(d,{operators,power,fuel:10000});

test('working berths receive one crane before a large job receives its second operator',()=>{
 const p=allocate([demand('A',100,5,1),demand('B',1,2,100)],2);assert.deepEqual(p.allocations.map(a=>a.assigned),[1,1]);assert.equal(new Set(p.sequence).size,2);
});
test('remaining crane positions follow remaining work and retain physical integer caps',()=>{
 const p=allocate([demand('A',6,4),demand('B',3,3),demand('C',1,2)],6);assert.deepEqual(p.allocations.map(a=>a.assigned),[3,2,1]);assert.equal(p.left.operators,0);
 const capped=allocate([demand('A',6,2),demand('B',3,5),demand('C',1,2)],6);assert.deepEqual(capped.allocations.map(a=>a.assigned),[2,3,1]);
});
test('operator shortages use urgency and accumulated waiting without inventing staff',()=>{
 const urgent=allocate([demand('A',1,2,2),demand('B',6,4,8),demand('C',2,2,10)],2);assert.deepEqual(urgent.allocations.map(a=>a.assigned),[1,1,0]);
 const waiting=allocate([demand('A',1,2,2),demand('B',6,4,8),demand('C',2,2,10,16)],2);assert.equal(waiting.allocations.find(a=>a.terminalId==='C')!.baseline,1);
});
test('power, fuel, unsupported jobs and complete hourly coverage limit crane assignments',()=>{
 const a=demand('A',2,3);a.maxCranes=1;a.cranes[0]!.kw=600;a.cranes[1]!.kw=100;
 const p=allocate([a,demand('B',2,2),demand('unused',0,5)],5,200);assert.deepEqual(p.sequence,['A-1','B-0']);assert.equal(p.left.power,0);assert.equal(p.allocations.length,2);
 const fuel=demand('fuel',5,2);fuel.cranes.forEach(c=>c.fuel=20);assert.equal(allocateBerthCranes([fuel],{operators:2,power:1000,fuel:10}).sequence.length,0);
});
test('monthly observation boundaries work across months and the leap-year February',()=>{
 const s=createEnterprise();assert.equal(enterpriseDirector(s).mode,'briefing');assert.equal(enterpriseDirector(s).boundary,168);
 s.hour=168;assert.equal(enterpriseDirector(s).mode,'observation');assert.equal(enterpriseDirector(s).boundary,192);assert.equal(enterpriseDirector(s).secondsPerHour,6);
 s.hour=192;assert.equal(enterpriseDirector(s).mode,'briefing');assert.equal(enterpriseDirector(s).nextVisit,(31+7)*24);
 s.hour=(Date.UTC(2028,1,8)-Date.UTC(2027,0,1))/3600000;assert.equal(enterpriseDirector(s).remaining,24);s.hour+=24;assert.equal(enterpriseDirector(s).nextVisit,(Date.UTC(2028,2,8)-Date.UTC(2027,0,1))/3600000);
});
test('interactive advance stops exactly at observation start and end while business replay agrees',()=>{
 let s=createEnterprise();s=executeEnterprise(s,{kind:'advance',hours:240,stopAtVisit:true});assert.equal(s.hour,168);
 s=executeEnterprise(s,{kind:'advance',hours:240,stopAtVisit:true});assert.equal(s.hour,192);
 s=executeEnterprise(s,{kind:'advance',hours:48,stopAtVisit:true});assert.equal(s.hour,240);assertEnterprise(s);
 assert.equal(enterpriseHash(s),enterpriseHash(executeEnterprise(createEnterprise(),{kind:'advance',hours:240})));
 assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),enterpriseHash(s));
});
test('real device samples are bounded to 24 hours and daily financial, energy and cargo observations replay',()=>{
 let s=createEnterprise();s=executeEnterprise(s,{kind:'advance',hours:72});const v=enterpriseTelemetryView(s);
 assert.equal(v.days.length,3);assert.ok(Object.values(s.telemetry.assets).every(a=>a.length===24&&a[0]!.hour===48));
 assert.equal(v.days.at(-1)!.cash,s.cash);assert.ok(v.days.reduce((n,d)=>n+d.energy,0)-s.stats.energy<1e-6);
 assert.ok(Object.values(v.assets).some(a=>a.work>0));assert.ok(Object.values(v.assets).every(a=>a.load===null||a.load>=0&&a.load<=1));
 const restored=restoreEnterprise(enterpriseRecord(s));assert.deepEqual(restored.telemetry,s.telemetry);
});
test('major incidents require a site view until authorization, then repair can continue under daily reporting',()=>{
 const s=createEnterprise();s.incidents.push({id:'test-major',type:'power',title:'测试供电中断',terminalId:null,started:0,status:'active',response:'none',resolves:null,evidence:false,loss:0,blockedHours:0,severity:2});
 assert.equal(enterpriseDirector(s).mode,'emergency');s.incidents[0]!.authorization='repair';assert.equal(enterpriseDirector(s).mode,'briefing');s.incidents[0]!.authorizationPaused=true;assert.equal(enterpriseDirector(s).mode,'emergency');
});
test('ten-year configurations retain real leap days and the half-year tutorial finance lock',()=>{
 const s=createEnterprise({seed:20261025,years:10,scenario:'balanced',mode:'practice',tutorial:true});assert.equal(s.horizon,3653*24);assert.equal(s.finance.plan.creditLimit,5000000);
 assert.equal(executeEnterprise(s,{kind:'loan',amount:1000000}).journal.at(-1)!.ok,false);
});
test('suspended unpaid insurance cannot create a free claim when a later incident occurs',()=>{
 let seed=1;while(enterpriseRandom(seed,'incident',4)>.05)seed++;
 let s=createEnterprise({seed,years:1,scenario:'resilience',mode:'practice'});s.hour=106;post(s,'incident',s.cash,-s.cash,'测试现金耗尽');queuePayable(s,'insurance',100,'测试拖欠保费',{due:0});
 s=executeEnterprise(s,{kind:'advance',hours:1});assert.ok(s.incidents.length>0);assert.equal(s.stats.insuranceClaims,0);
});
