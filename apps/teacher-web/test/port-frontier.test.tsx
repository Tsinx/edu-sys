import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PORT_LESSON_NINETEEN_SLIDES as pages,PORT_FRONTIER_FILMS,FRONTIER_HASH_CHAIN,FRONTIER_CHANGED_HASH,frontierCorrelation,frontierClassification,frontierDispatch,frontierQUpdate,frontierAIInvestment,frontierSlideSteps,expansionTiming,expansionDiagramSummary,expansionStateValid,getPortManagementSlideByKey,getPortManagementGlobalSlideIndex,relocatedPortReviewIndex,relocatedPortReviewClip} from '@edu/course-content';
import {PortFrontierComposition} from '../src/features/port-expansion/PortFrontierComposition';
const near=(a:number,b:number,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);
test('AI lesson has 40 authored lecture pages before the relocated reviews',()=>{
 assert.equal(pages.length,40);assert.equal(new Set(pages.map(p=>p.slideKey)).size,40);assert.deepEqual(pages.map(p=>p.index),Array.from({length:40},(_,i)=>768+i));
 const timing=expansionTiming(19);for(const half of [timing.slice(0,4),timing.slice(4)])assert.equal(half.reduce((s,t)=>s+t.minutes,0),45);
 for(const p of pages){assert.equal(p.options,undefined);assert.equal(p.reveal,undefined);assert.ok(p.frontier||p.rows||p.equations);assert.equal(getPortManagementGlobalSlideIndex(19,p.localPage),p.index);assert.ok(p.teachingCue.length>=65);}
});
test('CNN calculations independently reconcile cross-correlation, confusion counts and review costs',()=>{
 assert.deepEqual(frontierCorrelation(),[[3,3,0],[3,3,0],[3,3,0]]);
 const [a,b]=frontierClassification();assert.ok(a&&b);assert.equal(a.total,100);near(a.accuracy,.88);near(a.precision,2/3);near(a.recall,.8);assert.equal(a.cost,10400);assert.equal(a.reviews,24);near(b.accuracy,.75);near(b.recall,.95);assert.equal(b.cost,6300);assert.equal(b.reviews,43);assert.equal(a.cost-b.cost,4100);assert.equal(b.reviews-a.reviews,19);assert.ok(b.reviews>35);
 const threshold=pages.find(p=>p.localPage===12)!,html=renderToStaticMarkup(<PortFrontierComposition page={threshold} state={{progress:1,option:0,revealed:false}}/>);assert.ok(html.includes(String.raw`24\times100+4\times2000=10400\text{元}`));assert.ok(html.includes(String.raw`43\times100+1\times2000=6300\text{元}`));assert.doesNotMatch(html,/24\t(?:imes)|10400\t(?:ext)/);
});
test('sequential decisions, scalar Q update and investment cash flows retain explicit assumptions',()=>{
 const r=frontierDispatch();near(r[0]!.total,-12.8);near(r[1]!.total,-5.9);assert.ok(r[0]!.now>r[1]!.now);assert.ok(r[0]!.total<r[1]!.total);for(const g of [-1,1.01,NaN,Infinity])assert.throws(()=>frontierDispatch(g));
 const q=frontierQUpdate();near(q.target,-5.9);near(q.error,2.1);near(q.after,-7.58);
 const f=(1-1.1**-5)/.1;near(frontierAIInvestment().npv,60*f-200);near(frontierAIInvestment(20).npv,20*f-200);assert.ok(frontierAIInvestment(20).npv<0);
});
test('hash chain is genuine SHA-256 and changing a timestamp breaks the next link',()=>{
 const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
 FRONTIER_HASH_CHAIN.forEach((r,i)=>{assert.equal(hash(r.previous+'|'+r.text),r.hash);if(i)assert.equal(r.previous,FRONTIER_HASH_CHAIN[i-1]!.hash);});
 const r=FRONTIER_HASH_CHAIN[1];assert.equal(hash(r.previous+'|'+r.text.replace('10:00','10:01')),FRONTIER_CHANGED_HASH);assert.notEqual(FRONTIER_HASH_CHAIN[2].previous,FRONTIER_CHANGED_HASH);
});
test('each disclosed AI layer is student-facing, bounded and free of learner tasks or private notes',()=>{
 for(const p of pages)for(let step=0;step<=frontierSlideSteps(p);step++){
  const state={progress:step/frontierSlideSteps(p),option:0,revealed:false};assert.ok(expansionStateValid(p,state));const html=renderToStaticMarkup(<PortFrontierComposition page={p} state={state}/>);
  assert.match(html,/pi-slide pf-slide/);assert.doesNotMatch(html,/katex-error|teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生|data-slide/);assert.ok(!html.includes(p.teachingCue));assert.ok(!html.includes(p.assistantCue));assert.doesNotMatch(html,/<(?:input|select|button|textarea)\b|请(?:点击|填写|提交|操作)|提交答案|进入模拟|个人任务|先投票/);
  if(step===0&&!p.mediaId)assert.match(expansionDiagramSummary(p,state),/尚未展开/);
 }
});
test('renumbered review bookmarks cannot silently open a different review page',()=>{
 const p=getPortManagementSlideByKey('l19-review-opening')!,q=getPortManagementSlideByKey('l20-review-opening')!;assert.equal(p.lesson,20);assert.equal(q.lesson,21);assert.equal(p.index,808);assert.equal(q.index,840);assert.equal(p.mediaId,'l20-review-v2');assert.equal(q.mediaId,'l21-review-v2');
 for(const [before,after] of [[1,1],[767,767],[768,808],[799,839],[800,840],[831,871]])assert.equal(relocatedPortReviewIndex('release-port-management-facilities-v21',before!),after);
 assert.equal(relocatedPortReviewIndex('release-port-management-facilities-v22',768),768);assert.equal(relocatedPortReviewClip('l19-review'),'l20-review-v2');assert.equal(relocatedPortReviewClip('l20-review'),'l21-review-v2');
 for(const p of pages)assert.equal(getPortManagementSlideByKey(p.slideKey)!.slideKey,p.slideKey);
});
test('frontier opening and news images are local, dated and independently hashed',()=>{
 const folder=new URL('../public/course-assets/port-management/frontier-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('edl.json',folder),'utf8')),film=PORT_FRONTIER_FILMS['l19-frontier'];
 near(edl.verifiedDuration,36,.1);assert.equal(edl.shots.reduce((s:number,r:{duration:number})=>s+r.duration,0),36);assert.equal(createHash('sha256').update(readFileSync(new URL('frontier-opening.mp4',folder))).digest('hex'),edl.outputSha256);assert.equal(film.durationMs,36000);
 for(const p of pages.filter(p=>p.frontier?.photo))assert.ok(existsSync(new URL('../public'+p.frontier!.photo,import.meta.url)),p.slideKey);
});
