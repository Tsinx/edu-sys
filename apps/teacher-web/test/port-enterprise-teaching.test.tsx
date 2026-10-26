import assert from 'node:assert/strict';
import React from 'react';
globalThis.React = React;
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { assertEnterprise, createEnterprise, executeEnterprise, enterpriseHash, enterpriseRecord, enterpriseView, restoreEnterprise, type EnterpriseCommand } from '@edu/port-simulation-core';
import { enterpriseIncidentLesson, enterpriseTeachingSteps, newEnterpriseTeaching } from '../src/features/port-simulation/enterprise/enterprise-teaching';
import { EnterpriseTeachingCoach } from '../src/features/port-simulation/enterprise/EnterpriseTeachingCoach';
import { FinancePanel } from '../src/features/port-simulation/enterprise/EnterprisePanels';
import type { useEnterprise } from '../src/features/port-simulation/enterprise/useEnterprise';

test('teaching rejects unsuccessful evidence, recommends an available contract, and tracks the purchased asset rather than an existing model', () => {
  let s = createEnterprise(); const p = newEnterpriseTeaching();
  const steps = () => enterpriseTeachingSteps(enterpriseView(s), enterpriseRecord(s), p);
  assert.equal(steps().length, 40);
  assert.ok(s.contracts.some(c => 'contract-' + c.id === steps().find(x => x.id === 'contract')!.target));
  assert.equal(steps().find(x => x.id === 'doc-entry')!.complete, false);
  s = executeEnterprise(s, { kind: 'document', callId: 'call-0-T1', document: 'entry', reference: 'wrong' });
  assert.equal(s.journal.at(-1)!.ok, false);
  assert.equal(steps().find(x => x.id === 'doc-entry')!.complete, false);
  s = executeEnterprise(s, { kind: 'route', lotId: 'call-0-T1-I', route: 'rail', bonded: false });
  assert.equal(steps().find(x => x.id === 'rail-lot')!.complete, false);
  s = executeEnterprise(s, { kind: 'order-asset', model: 'agv', terminalId: 'T1', ownership: 'owned' });
  assert.equal(steps().find(x => x.id === 'agv-purchase')!.complete, true);
  assert.equal(steps().find(x => x.id === 'agv-delivery')!.complete, false, 'the initial electric tractor is not the new order');
  assert.equal(steps().find(x => x.id === 'agv-delivery')!.planHour, 1441);
  p.receipts['agv-delivery'] = { hour: 1441, position: 999, evidence: ['not in this record'] };
  assert.equal(steps().find(x => x.id === 'agv-delivery')!.complete, false, 'receipts beyond the current record are ignored');
  p.receipts['agv-purchase'] = {hour:s.hour,position:s.journal.length,evidence:['verified order in the live record']};
  const preview = enterpriseTeachingSteps(enterpriseView(createEnterprise()), enterpriseRecord(s), p);
  assert.equal(preview.find(x=>x.id==='agv-purchase')!.complete,true,'a read-only earlier view retains the learning receipts of the live save');
});

test('a complete 150-day teaching trajectory uses the unchanged engine and survives deterministic restore', () => {
  let s = createEnterprise(); const p = newEnterpriseTeaching();
  const snapshot = () => {
    const steps = enterpriseTeachingSteps(enterpriseView(s), enterpriseRecord(s), p);
    for (const step of steps) if (step.complete && !p.receipts[step.id]) p.receipts[step.id] = { hour: s.hour, position: s.journal.length, evidence: step.evidence };
    return steps;
  };
  const act = (c: EnterpriseCommand, requireSuccess = true) => { s = executeEnterprise(s, c); if (requireSuccess) assert.ok(s.journal.at(-1)!.ok, s.journal.at(-1)!.message); snapshot(); };
  act({kind:'policy',patch:{documents:'manual',autoBerth:true,verifiedExceptions:false}});
  act({kind:'berth',callId:'call-0-T1',terminalId:'T1'});
  for (const document of ['entry','manifest'] as const) act({kind:'document',callId:'call-0-T1',document,reference:'call-0-T1-'+document});
  act({kind:'advance',hours:14,stopOnIncident:true});
  assert.equal(snapshot().find(x=>x.id==='receipts')!.complete,true);
  for (const document of ['customs','carrier','departure'] as const) act({kind:'document',callId:'call-0-T1',document,reference:'call-0-T1-'+document});
  act({kind:'policy',patch:{documents:'automatic',verifiedExceptions:true}});
  act({kind:'policy',patch:{transport:'balanced',roadQuota:240}});
  act({kind:'route',lotId:'call-0-T2-I',route:'rail',bonded:false});
  act({kind:'hire',role:'technician',count:2,shift:'reserve'});
  act({kind:'train',crewId:'crew-driver-2'});
  const candidate=s.assets.filter(a=>a.status==='active'&&a.lastWork===0).sort((a,b)=>a.health-b.health)[0]!;
  act({kind:'maintain',assetId:candidate.id,overhaul:false});
  act({kind:'order-asset',model:'agv',terminalId:'T1',ownership:'owned'});
  act({kind:'order-asset',model:'manual-gate',terminalId:'T2',ownership:'leased'});
  act({kind:'project',type:'automation',terminalId:'T1'});
  act({kind:'policy',patch:{shorePower:true,insurance:true}});
  act({kind:'policy',patch:{tariff:1.05}});
  const contract=snapshot().find(x=>x.id==='contract')!.target.replace('contract-','');
  act({kind:'accept-contract',contractId:contract});
  act({kind:'loan',amount:500000}); act({kind:'repay',amount:500000});
  act({kind:'supplies',item:'parts',quantity:3});
  const runTo=(hour:number)=>{
    let guard=0;
    while(s.hour<hour||s.incidents.some(i=>i.status!=='resolved')){
      assert.ok(++guard<300,'emergency or milestone did not converge');
      const lesson=enterpriseIncidentLesson(enterpriseView(s));
      if(lesson){
        if(lesson.action==='wait')act({kind:'advance',hours:Math.max(1,Math.min(hour-s.hour||24,lesson.planHour!-s.hour)),stopOnIncident:true});
        else if(['audit','isolate','repair','recover'].includes(lesson.action)){
          act({kind:'respond',incidentId:lesson.incident.id,action:lesson.action as 'audit'|'isolate'|'repair'|'recover'},false);
          if(!s.journal.at(-1)!.ok)act({kind:'advance',hours:1,stopOnIncident:true});
        }else assert.fail('unexpected end of horizon');
      }else act({kind:'advance',hours:Math.min(24*93,hour-s.hour),stopOnIncident:true});
    }
  };
  runTo(1455);
  assert.equal(snapshot().find(x=>x.id==='agv-delivery')!.complete,true);
  assert.ok(s.assets.some(a=>a.oldAgeYears===0&&a.model==='agv'&&a.status==='commissioning'));
  runTo(3615);
  assert.equal(snapshot().find(x=>x.id==='automation-commission')!.complete,true);
  assert.equal(s.terminals.find(t=>t.id==='T1')!.automation,1); assert.ok(s.stats.recovered>0);
  const crew=s.crews.find(c=>c.role==='technician'&&c.shift==='reserve')!;
  act({kind:'staff',crewId:crew.id,shift:2});
  assert.equal(snapshot().find(x=>x.id==='staff-shift')!.complete,true);
  assert.ok(snapshot().filter(x=>!x.quiz&&!x.id.startsWith('note')&&!x.id.startsWith('year')&&!['close'].includes(x.id)).every(x=>x.complete));
  assertEnterprise(s);
  const record=enterpriseRecord(s),hash=enterpriseHash(s);
  assert.deepEqual(Object.keys(record),['schema','rules','config','commands']);
  assert.equal(enterpriseHash(restoreEnterprise(record)),hash);
  assert.equal(p.schema,'port-enterprise-teaching/1');
  assert.equal(record.schema,'port-enterprise/1.0');
});

test('formal and unknown teaching versions do not expose answers; repayment accepts integer amounts in the actual form', () => {
  const s=createEnterprise(),view=enterpriseView(s),p=newEnterpriseTeaching();
  const runtime={view,currentSave:{attemptId:'formal-attempt',record:enterpriseRecord(s),teaching:p},busy:false,replaying:false} as unknown as ReturnType<typeof useEnterprise>;
  const html=renderToStaticMarkup(<EnterpriseTeachingCoach runtime={runtime} tab="learning" navigate={()=>{}} pause={()=>{}} advance={async()=>{}}/>);
  assert.ok(html.includes('当前是正式任务或考核场次'));
  assert.ok(!html.includes('参考操作与答案'));
  const old=renderToStaticMarkup(<EnterpriseTeachingCoach runtime={{...runtime,currentSave:{...runtime.currentSave!,attemptId:undefined,teaching:{...p,schema:'future-version' as typeof p.schema}}}} tab="learning" navigate={()=>{}} pause={()=>{}} advance={async()=>{}}/>);
  assert.ok(old.includes('原数据保留')); assert.ok(!old.includes('核对接管底账'));
  const finance=renderToStaticMarkup(<FinancePanel v={view} act={()=>{}} disabled={false} selected="T1" select={()=>{}} navigate={()=>{}}/>);
  assert.match(finance,/aria-label="偿付金额 元"[^>]*step="1"/);
});
