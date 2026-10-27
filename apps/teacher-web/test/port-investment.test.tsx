import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {INVESTMENT_DEFAULT,INVESTMENT_VERSION,PORT_LESSON_EIGHTEEN_SLIDES as pages,PORT_LESSON_SEVENTEEN_SLIDES,PORT_INVESTMENT_FILMS,investmentOutcome,investmentPV,investmentFullThreshold,investmentExpansionThreshold,investmentExpansionDelta,investmentPolicies,investmentDemand,investmentComparisons,investmentCommit,investmentReview,investmentAdvance,investmentPublicRows,investmentRunValid,newInvestmentRun,expansionTiming,expansionStateValid,expansionDiagramSummary,investmentSlideSteps,type InvestmentDemand,type InvestmentInitial,type InvestmentDecision} from '@edu/course-content';
import {portExpansionPresentationSchema} from '@edu/contracts';
import {PortInvestmentComposition} from '../src/features/port-expansion/PortInvestmentComposition';
import {InvestmentProcess,investmentModuleStatus} from '../src/features/port-expansion/InvestmentProcess';
const near=(a:number,b:number,tolerance=.015)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);

test('six-year incremental ledgers reconcile construction, operating cash, residual and balances',()=>{
 const expected=[[-3875.24,-844.36,-3777.63,0,-3926.71],[-429.07,1567.96,-579.39,0,-1830.93],[3706.33,1567.96,2564.28,0,684.01]];
 for(const [i,q] of ([8,18,30] as const).entries())for(const [j,o] of investmentComparisons(q).entries()){
  near(o.npv,expected[i]![j]!);assert.equal(o.rows.length,7);let cash=7000;
  for(const r of o.rows){near(r.cashflow,r.investment+r.construction+r.operating+r.residual,1e-8);cash+=r.cashflow;near(r.cash,cash,1e-8);near(r.pv,investmentPV(r.cashflow,r.year),1e-8);assert.ok(r.served<=r.capacity&&r.served<=r.demand);near(r.served+r.unserved,r.demand,1e-8);}
  near(o.npv,o.rows.reduce((s,r)=>s+r.pv,0),1e-8);assert.equal(o.rows[0]!.residual,0);assert.equal(o.rows[1]!.capacity,0);assert.equal(o.rows[1]!.operating,0);
 }
 const expanded=investmentOutcome('phase','expand',30),delayed=investmentOutcome('wait','build',30);
 assert.equal(expanded.rows[1]!.investment,-3100);assert.equal(expanded.rows[2]!.capacity,15);assert.equal(expanded.rows[2]!.construction,-120);assert.equal(expanded.rows[3]!.capacity,30);
 assert.equal(delayed.rows[2]!.capacity,0);assert.equal(delayed.rows[3]!.demand,24);assert.equal(delayed.rows[3]!.served,24);assert.equal(delayed.rows[6]!.residual,1800);
});
test('NPV thresholds and conditional information value use the correct decision date',()=>{
 near(investmentFullThreshold(),19.24506396,1e-7);near(investmentExpansionThreshold(),26.19688214,1e-7);
 near(investmentExpansionDelta(30),1095.94290);near(investmentExpansionDelta(18),-2362.09213);
 const v=investmentPolicies();near(v.full,-256.76169);near(v.phaseKeep,964.88379);near(v.phaseExpand,-593.03490);near(v.phaseAdaptive,1213.96173);near(v.flexibility,249.07793);
 near(v.phaseAdaptive-Math.max(v.phaseKeep,v.phaseExpand),v.flexibility,1e-8);
 near(investmentOutcome('wait','build',30,{...INVESTMENT_DEFAULT,retention:1}).npv,2255.84);
 assert.ok(investmentFullThreshold(.05)<investmentFullThreshold(.15));
 for(const q of [8,18,30] as const)near(investmentOutcome('full','keep',q,{...INVESTMENT_DEFAULT,rate:0}).npv,investmentOutcome('full','keep',q,{...INVESTMENT_DEFAULT,rate:0}).rows.reduce((s,r)=>s+r.cashflow,0),1e-8);
});
test('investment decisions are ordered, replayable and cannot spend the safety reserve',()=>{
 const seed=Array.from({length:100},(_,i)=>i).find(s=>investmentDemand(s)===30)!;
 assert.throws(()=>investmentAdvance(newInvestmentRun()),/当前决策/);
 assert.throws(()=>investmentCommit(newInvestmentRun({...INVESTMENT_DEFAULT,cash:6500}),'full','投完整项目'),/储备/);
 for(const initial of ['full','phase','wait'] as const)for(const decision of (initial==='full'?['keep']:initial==='phase'?['keep','expand']:['none','build']) as InvestmentDecision[]){
  const base=newInvestmentRun({...INVESTMENT_DEFAULT,seed});let run=investmentCommit(base,initial,'初始理由');assert.equal(investmentRunValid(run),true);assert.equal(base.stage,'plan');
  assert.deepEqual(investmentPublicRows(run).map(r=>r.demand),[0]);assert.throws(()=>investmentReview(run,decision,'尚未确认'),/选择/);
  run=investmentAdvance(run);assert.equal(run.stage,'review');assert.equal(run.year,1);run=investmentReview(run,decision,'根据确认货源判断');
  while(run.stage!=='complete'){run=investmentAdvance(run);assert.ok(investmentRunValid(JSON.parse(JSON.stringify(run))));}
  near(investmentPublicRows(run).reduce((s,r)=>s+r.pv,0),investmentOutcome(initial,decision,30).npv,1e-8);assert.throws(()=>investmentAdvance(run),/当前决策/);
 }
 let tight=investmentCommit(newInvestmentRun({...INVESTMENT_DEFAULT,cash:6800,seed}),'phase','保留后续选择');tight=investmentAdvance(tight);assert.throws(()=>investmentReview(tight,'expand','高需求仍需现金检查'),/储备/);assert.equal(investmentReview(tight,'keep','保留现金').decision,'keep');
 const wait=investmentAdvance(investmentCommit(newInvestmentRun({...INVESTMENT_DEFAULT,cash:6500,seed}),'wait','先观察'));
 assert.throws(()=>investmentReview(wait,'build','已知施工支出也需预留'),/储备/);
 assert.equal(investmentReview(wait,'none','本轮保持资金').decision,'none');
 assert.equal(investmentRunValid({...wait,stage:'operate',decision:'build',reviewReason:'缓存也必须满足施工储备'}),false);
 assert.equal(investmentRunValid({...wait,initialReason:''}),false);
 assert.equal(investmentRunValid({...newInvestmentRun(),version:'port-investment/0.9'}),false);
});
test('the stress path cannot alter already public years and schematic capacity waits for commissioning',()=>{
 for(const q of [8,18,30] as const){const a=investmentOutcome('phase','expand',q),b=investmentOutcome('phase','expand',q,{...INVESTMENT_DEFAULT,mode:'shock'});assert.deepEqual(a.rows.slice(0,4),b.rows.slice(0,4));assert.ok(b.rows[4]!.demand<a.rows[4]!.demand);}
 assert.equal(investmentModuleStatus('full','keep',1,0).kind,'building');assert.equal(investmentModuleStatus('full','keep',2,0).kind,'ready');
 assert.equal(investmentModuleStatus('phase','expand',2,0).kind,'ready');assert.equal(investmentModuleStatus('phase','expand',2,1).kind,'building');assert.equal(investmentModuleStatus('phase','expand',3,1).kind,'ready');
 const before=renderToStaticMarkup(<InvestmentProcess initial="phase" decision="expand" year={2} q={30}/>);assert.equal((before.match(/data-status="ready"/g)??[]).length,1);assert.match(before,/新增可用能力15万TEU/);
 const hidden=renderToStaticMarkup(<InvestmentProcess initial="phase" decision="keep" year={1}/>);assert.match(hidden,/货源尚未公布/);assert.doesNotMatch(hidden,/需求30|需求18|需求8/);
});
test('40 authored pages keep 16:10, stable prior indices and current-step-only public explanations',()=>{
 assert.equal(pages.length,40);assert.deepEqual(pages.map(p=>p.index),Array.from({length:40},(_,i)=>728+i));assert.equal(PORT_LESSON_SEVENTEEN_SLIDES.at(-1)!.index,727);
 const timing=expansionTiming(18);assert.equal(timing.reduce((s,t)=>s+t.minutes,0),90);assert.equal(timing.slice(0,4).reduce((s,t)=>s+t.minutes,0),45);assert.equal(timing[3]!.slideEnd,747);
 for(const p of pages){
  for(let option=0;option<(p.options?.length??1);option++)for(const progress of [0,1/investmentSlideSteps(p),1]){
   const state={option,progress,revealed:false};assert.ok(expansionStateValid(p,state));const html=renderToStaticMarkup(<PortInvestmentComposition page={p} state={state}/>);
   assert.match(html,/class="port-expansion-slide pi-slide/);assert.doesNotMatch(html,/data-slide-(?:key|composition)|teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生|教师授课台/);assert.doesNotMatch(html,/katex-error/);
   if(progress===0&&!p.mediaId){assert.match(expansionDiagramSummary(p,state),/尚未展开/);assert.doesNotMatch(html,/class="katex"/);}
   if(p.reveal)assert.ok(!html.includes(p.reveal));
  }
  assert.equal(expansionStateValid(p,{progress:1,option:p.options?.length??1,revealed:false}),false);
 }
 for(const p of pages.filter(p=>p.reveal)){const html=renderToStaticMarkup(<PortInvestmentComposition page={p} state={{option:0,progress:1,revealed:true}}/>);assert.ok(html.includes(p.reveal!));}
});
test('lecture 18 opening has inspected source records, local media and bounded shared playback',()=>{
 const folder=new URL('../public/course-assets/port-management/investment-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('edl.json',folder),'utf8')),film=PORT_INVESTMENT_FILMS['l18-investment'];
 assert.equal(edl.lesson,18);assert.equal(edl.duration,44);assert.equal(edl.shots.length,4);assert.equal(edl.shots.filter((s:{sourceStart?:number})=>s.sourceStart!==undefined).reduce((s:number,r:{duration:number})=>s+r.duration,0),24);
 assert.ok(Math.abs(edl.verifiedDuration-44)<.1);assert.equal(createHash('sha256').update(readFileSync(new URL('investment-opening.mp4',folder))).digest('hex'),edl.outputSha256);assert.ok(statSync(new URL('investment-opening.jpg',folder)).size>5000);
 const state={progress:.5,option:0,revealed:false,cinematic:{clipId:film.id,status:'paused' as const,elapsedMs:22000,startedAt:null}};
 assert.ok(portExpansionPresentationSchema.safeParse({slideKey:pages[0]!.slideKey,...state}).success);assert.ok(expansionStateValid(pages[0]!,state));assert.equal(expansionStateValid(pages[0]!,{...state,cinematic:{...state.cinematic,elapsedMs:44001}}),false);
 assert.match(expansionDiagramSummary(pages[0]!,state),/第18讲历史画面教学短片/);
});
