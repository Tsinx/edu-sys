import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PORT_LESSON_TWENTY_SLIDES,PORT_LESSON_TWENTY_ONE_SLIDES,PORT_LESSON_EIGHTEEN_SLIDES,PORT_REVIEW_FILMS,reviewManifest,reviewQueue,reviewTax,reviewShore,reviewPortfolio,reviewInvestment,reviewSlideSteps,expansionTiming,expansionDiagramSummary,expansionStateValid,getPortManagementGlobalSlideIndex,PORT_MANAGEMENT_SLIDE_TOTAL} from '@edu/course-content';
import {portExpansionPresentationSchema} from '@edu/contracts';
import {PortReviewComposition} from '../src/features/port-expansion/PortReviewComposition';
const pages=[...PORT_LESSON_TWENTY_SLIDES,...PORT_LESSON_TWENTY_ONE_SLIDES],near=(a:number,b:number,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);

test('two taught reviews append 64 unique pages while lecture 18 keeps its established index',()=>{
 assert.equal(PORT_MANAGEMENT_SLIDE_TOTAL,871);assert.equal(pages.length,64);assert.equal(new Set(pages.map(p=>p.slideKey)).size,64);assert.deepEqual(pages.map(p=>p.index),Array.from({length:64},(_,i)=>808+i));assert.equal(PORT_LESSON_EIGHTEEN_SLIDES.at(-1)!.index,767);
 for(const lesson of [20,21] as const){const timing=expansionTiming(lesson);assert.equal(timing.slice(0,4).reduce((s,t)=>s+t.minutes,0),45);assert.equal(timing.slice(4).reduce((s,t)=>s+t.minutes,0),45);assert.equal(timing[3]!.slideEnd,getPortManagementGlobalSlideIndex(lesson,16));}
 for(const p of pages){assert.equal(p.options,undefined);assert.equal(p.reveal,undefined);assert.equal(getPortManagementGlobalSlideIndex(p.lesson,p.localPage),p.index);}
});

test('manifest, random queue and tax cases reconcile their own units and conditions',()=>{
 assert.deepEqual(reviewManifest().map(r=>[r.boxes,r.teu]),[[200,280],[200,320]]);
 const a=reviewQueue(9,12);near(a.rho,.75);near(a.waitMinutes,15);near(a.totalMinutes,20);near(a.queue,2.25);near(reviewQueue(11,12).waitMinutes,55);near(reviewQueue(11,15).waitMinutes,11);
 assert.equal(reviewQueue(0,12).waitMinutes,0);for(const [l,m] of [[12,12],[13,12],[-1,12],[NaN,12],[9,Infinity]])assert.throws(()=>reviewQueue(l!,m!));
 const tax=reviewTax();near(tax.duty,10);near(tax.vat,14.3);near(tax.total,24.3);near(tax.immediate,7.29);near(tax.deferred,17.01);near(tax.immediate+tax.deferred,tax.total);near(tax.benefit,.335539726027);near(tax.net*10000,-644.602739726,1e-5);
});

test('energy, constrained project combinations and investment review retain result ownership and dates',()=>{
 const e=reviewShore();assert.equal(e.kwh,4000);near(e.gridTonnes,2.2);near(e.generatorTonnes,2.8);near(e.savedTonnes,.6);near(e.energySavingYuan,2000);assert.equal(e.breakEvenCalls,600);
 const plans=reviewPortfolio();assert.equal(plans.length,7);assert.equal(new Set(plans.map(p=>p.name)).size,7);const best=plans.filter(p=>p.cost<=60).sort((a,b)=>b.carbon-a.carbon)[0]!;assert.deepEqual(best,{name:'A＋C',cost:60,carbon:16});assert.equal(plans.find(p=>p.name==='A＋B')!.cost,70);
 const i=reviewInvestment();near(i.fullHigh,3706.33,.01);near(i.fullMiddle,-429.07,.01);near(i.fullTrigger,19.24506396);near(i.expandTrigger,26.19688214);near(i.policies.flexibility,249.07793,.00001);near(i.shockKeep,1007.44089535);near(i.shockExpand,-798.86044003);assert.ok(i.shockExpand<i.shockKeep);
});

test('each public review step renders authored material with no learner task or private metadata',()=>{
 for(const p of pages){
  const steps=reviewSlideSteps(p);
  for(let step=0;step<=steps;step++){
   const state={option:0,progress:step/steps,revealed:false};assert.ok(expansionStateValid(p,state));const html=renderToStaticMarkup(<PortReviewComposition page={p} state={state}/>);
   assert.match(html,/class="port-expansion-slide pi-slide pr-slide"/);assert.doesNotMatch(html,/data-slide-(?:key|composition)|teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生|katex-error/);
   assert.doesNotMatch(html,/<(?:input|select|button|textarea)\b|请(?:点击|填写|提交|计算|操作)|提交答案|进入模拟|个人任务|先投票/);
   assert.ok(!html.includes(p.teachingCue));assert.ok(!html.includes(p.assistantCue));
   if(step===0&&!p.mediaId){assert.match(expansionDiagramSummary(p,state),/尚未展开/);assert.doesNotMatch(html,/class="katex"/);}
   if(p.review&&step<steps&&!p.mediaId)assert.ok(!html.includes(p.review.items[step]!.body),p.slideKey+' future layer');
  }
 }
});

test('both review openings have bounded shared states and independently hashed local media',()=>{
 const folder=new URL('../public/course-assets/port-management/review-media-v2/',import.meta.url),edls=JSON.parse(readFileSync(new URL('edl.json',folder),'utf8'));
 for(const p of pages.filter(p=>p.mediaId)){
  const film=PORT_REVIEW_FILMS[p.mediaId as keyof typeof PORT_REVIEW_FILMS],edl=edls.find((r:{lesson:number})=>r.lesson===p.lesson),stem='review'+p.lesson+'-opening';
  assert.equal(edl.duration,32);assert.ok(Math.abs(edl.verifiedDuration-32)<.1);assert.equal(edl.shots.reduce((s:number,r:{duration:number})=>s+r.duration,0),32);assert.equal(createHash('sha256').update(readFileSync(new URL(stem+'.mp4',folder))).digest('hex'),edl.outputSha256);assert.ok(statSync(new URL(stem+'.jpg',folder)).size>5000);assert.match(readFileSync(new URL(stem+'.vtt',folder),'utf8'),/00:00:23.000 --> 00:00:32.000/);
  const state={progress:.5,option:0,revealed:false,cinematic:{clipId:film.id,status:'paused' as const,elapsedMs:16000,startedAt:null}};assert.ok(portExpansionPresentationSchema.safeParse({slideKey:p.slideKey,...state}).success);assert.ok(expansionStateValid(p,state));assert.equal(expansionStateValid(p,{...state,cinematic:{...state.cinematic,elapsedMs:32001}}),false);assert.match(expansionDiagramSummary(p,state),/32秒复习片头/);
 }
});
