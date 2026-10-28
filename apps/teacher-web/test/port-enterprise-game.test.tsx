import assert from 'node:assert/strict';
import React from 'react';
globalThis.React=React;
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {createEnterprise,executeEnterprise,enterpriseView,enterpriseRecord} from '@edu/port-simulation-core';
import {berthCompatibility,enterpriseDecisionFeedback,nextEnterpriseObservation} from '../src/features/port-simulation/enterprise/enterprise-game';
import {enterpriseTeachingSteps,newEnterpriseTeaching,restartEnterpriseTeaching} from '../src/features/port-simulation/enterprise/enterprise-teaching';
import {enterpriseGuideActions} from '../src/features/port-simulation/enterprise/enterprise-guidance';
import {ShipsPanel} from '../src/features/port-simulation/enterprise/EnterprisePanels';
import {readEnterpriseDrafts,writeEnterpriseDrafts} from '../src/features/port-simulation/enterprise/enterprise-drafts';

test('manual takeover still distinguishes submitted documents, valid receipts, and real arrival',()=>{
  let state=createEnterprise();
  state=executeEnterprise(state,{kind:'policy',patch:{documents:'manual',verifiedExceptions:false,autoBerth:false}});
  for(const document of ['entry','manifest'] as const)state=executeEnterprise(state,{kind:'document',callId:'call-0-T1',document,reference:'call-0-T1-'+document});
  assert.equal(state.calls[0]!.documents.entry.status,'submitted');
  assert.equal(state.calls[0]!.stage,'announced');
  state=executeEnterprise(state,{kind:'advance',hours:4});
  assert.equal(state.calls[0]!.documents.entry.status,'approved');
  assert.equal(state.calls[0]!.stage,'announced');
  state=executeEnterprise(state,{kind:'advance',hours:10});
  assert.equal(state.calls[0]!.stage,'waiting','manual takeover requires a berth decision');
});

test('observation points use published plans without exposing the private arrival time',()=>{
  const state=createEnterprise(),view=enterpriseView(state),first=nextEnterpriseObservation(view);
  assert.equal(first.hour,6);
  const call=state.calls.find(c=>c.id==='call-0-T1')!;
  call.arrival=1234;
  assert.deepEqual(nextEnterpriseObservation(enterpriseView(state)),first);
  assert.ok(!('arrival' in view.calls[0]!));
  const terminal=structuredClone(view);terminal.hour=terminal.horizon;
  assert.equal(nextEnterpriseObservation(terminal).hours,0);
});

test('incompatible berths are explained and disabled; a compatible occupied berth remains a possible future plan',()=>{
  const view=enterpriseView(createEnterprise());
  assert.equal(berthCompatibility(view,'call-0-T1','T3'),'货种不匹配');
  view.terminals.find(t=>t.id==='T2')!.berthCall='another-ship';
  assert.equal(berthCompatibility(view,'call-0-T1','T2'),null);
  const html=renderToStaticMarkup(<ShipsPanel v={view} act={()=>{}} disabled={false} selected="T1" select={()=>{}} navigate={()=>{}}/>);
  assert.match(html,/<option value="T3" disabled="">北岸散货码头 · 货种不匹配/);
  assert.match(html,/<option value="T2">东湾集装箱二作业区/);
});

test('decision feedback reports real cash and debt changes and retains delayed asset consequences',()=>{
  const state=createEnterprise(),before=enterpriseView(state);
  const order={kind:'order-asset',model:'agv',terminalId:'T1',ownership:'owned'} as const;
  const purchased=executeEnterprise(state,order),feedback=enterpriseDecisionFeedback(before,enterpriseView(purchased),order)!;
  assert.ok(feedback.changes.some(s=>s.includes('减少190万元')));
  assert.ok(feedback.changes.some(s=>s.includes('尚未提供生产能力')));
  assert.ok(feedback.changes.some(s=>s.includes('自动化接口')));
  const loan={kind:'loan',amount:500000} as const,financed=executeEnterprise(state,loan);
  const funding=enterpriseDecisionFeedback(before,enterpriseView(financed),loan)!;
  assert.ok(funding.changes.some(s=>s.includes('借款本金')&&s.includes('2,050万元')));
  assert.ok(funding.changes.some(s=>s.includes('不计为经营收入')));
  const invalid={kind:'document',callId:'call-0-T1',document:'entry',reference:'wrong'} as const;
  assert.equal(enterpriseDecisionFeedback(before,enterpriseView(executeEnterprise(state,invalid)),invalid),null);
});

test('retry branches reset the selected question and field cursor without rewriting the original learning record',()=>{
  const original=newEnterpriseTeaching();original.answers={takeover:'cash',archive:'local'};original.actions={manual:3,takeover:0,loan:1};
  original.receipts={manual:{hour:0,position:1,evidence:['policy']},takeover:{hour:11,position:9,evidence:['cash']},loan:{hour:11,position:30,evidence:['funding']}};
  const retry=restartEnterpriseTeaching(original,'takeover',9);
  assert.equal(retry.answers.takeover,undefined);
  assert.equal(original.answers.takeover,'cash');
  assert.deepEqual(Object.keys(retry.receipts),['manual']);
  assert.deepEqual(retry.actions,{takeover:0});
  assert.equal(retry.selected,'takeover');
});

test('unsubmitted drafts survive a reload, remain isolated by personal save, and reject malformed or oversized values',()=>{
  const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const draft={'dispatch-policy.documents':'manual','decision-note.text':'尚未提交的个人分析'};
  writeEnterpriseDrafts(storage,'original',draft);
  assert.deepEqual(readEnterpriseDrafts(storage,'original'),draft);
  assert.deepEqual(readEnterpriseDrafts(storage,'retry'),{});
  writeEnterpriseDrafts(storage,'retry',{'dispatch-policy.documents':'automatic'});
  assert.deepEqual(readEnterpriseDrafts(storage,'original'),draft);
  assert.throws(()=>writeEnterpriseDrafts(storage,'original',{'decision-note.text':'x'.repeat(5001)}));
  assert.deepEqual(readEnterpriseDrafts(storage,'original'),draft,'invalid values cannot overwrite the existing draft');
  assert.throws(()=>writeEnterpriseDrafts({getItem:()=>null,setItem:()=>{throw Error('quota');}},'original',draft),/quota/);
  data.set('edu-port-enterprise-ui-drafts/2:bad','[]');
  assert.throws(()=>readEnterpriseDrafts(storage,'bad'),/格式/);
});
