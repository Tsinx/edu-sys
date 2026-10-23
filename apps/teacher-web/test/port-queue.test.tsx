import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PORT_LESSON_SEVENTEEN_SLIDES as pages,QUEUE_HAND_ARRIVALS,QUEUE_RANDOM_DEFAULT,queueJobs,runQueue,summarizeQueue,queueArea,mm1,queueCapacityForMean,queueCostPlans,randomQueue,appointmentQueue,expansionTiming,expansionStateValid,expansionDiagramSummary,getPortManagementGlobalSlideIndex} from '@edu/course-content';
import {PortQueueComposition} from '../src/features/port-expansion/PortQueueComposition';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,String(a)+' vs '+b);

test('FCFS hand ledger, whole-window area and two-server appointment ledgers reconcile',()=>{
 const short=runQueue(queueJobs([0,1,1,4]));
 assert.deepEqual(short.map(r=>r.start),[0,2,4,6]);
 assert.deepEqual(short.map(r=>r.departure),[2,4,6,8]);
 assert.deepEqual(short.map(r=>r.wait),[0,1,3,2]);
 const a=runQueue(queueJobs(QUEUE_HAND_ARRIVALS.regular)),b=runQueue(queueJobs(QUEUE_HAND_ARRIVALS.paired));
 close(summarizeQueue(a).meanWait,0);close(summarizeQueue(b).meanWait,1);
 close(queueArea(b,0,24),24);close(queueArea(b,1,3),3);
 close(queueArea(b,0,24)/24,(8/24)*summarizeQueue(b).meanSojourn);
 const burst=appointmentQueue('burst'),appointment=appointmentQueue('appointment'),two=appointmentQueue('two-servers');
 assert.deepEqual([burst.summary.meanOutside,burst.summary.meanWait,burst.summary.meanTotal],[0,3,5]);
 assert.deepEqual([appointment.summary.meanOutside,appointment.summary.meanWait,appointment.summary.meanTotal],[3,0,5]);
 assert.deepEqual([two.summary.meanOutside,two.summary.meanWait,two.summary.meanTotal],[0,1,3]);
 assert.deepEqual(appointment.records.map(r=>r.departure),burst.records.map(r=>r.departure));
 for(const r of [...short,...a,...b,...two.records]){close(r.total,r.outside+r.wait+r.service);assert.ok(r.start>=r.arrival&&r.departure>=r.start);}
 assert.throws(()=>runQueue([{id:'x',ready:3,arrival:2,service:2}]));
 assert.throws(()=>runQueue(queueJobs([0,1]),0));
});
test('M/M/1 units, inversion, service constraints and minimum listed cost agree',()=>{
 const base=mm1(90,100);assert.equal(base.stable,true);if(!base.stable)return;
 close(base.W,6);close(base.Wq,5.4);close(base.L,9);close(base.Lq,8.1);close(base.L-base.Lq,base.rho);
 assert.equal(mm1(100,100).stable,false);assert.equal(mm1(110,100).stable,false);
 close(queueCapacityForMean(99,10),105);close(queueCapacityForMean(99,5),111);
 for(const lambda of [48,80,90,95,99])for(const mu of [100,105,110]){const r=mm1(lambda,mu);if(r.stable){close(r.L,lambda*r.W/60);close(r.Lq,lambda*r.Wq/60);}}
 const best=(lambda:number)=>queueCostPlans(lambda).filter(p=>p.meets).sort((a,b)=>a.totalCost!-b.totalCost!)[0]?.id;
 assert.equal(best(90),'B');assert.equal(best(95),'C');assert.equal(best(99),undefined);
 close(queueCostPlans(90)[0]!.totalCost!,972);
 close(queueCostPlans(90)[1]!.totalCost!,867.1428571428571);
 for(const invalid of [0,-1,NaN,Infinity])assert.throws(()=>mm1(invalid,100));
});
test('finite random runs reproduce independent streams, retain all measured jobs and do not invent steady-state values',()=>{
 const input={...QUEUE_RANDOM_DEFAULT,count:500,warmup:100},a=randomQueue(input),b=randomQueue(input),constant=randomQueue({...input,constantService:true});
 assert.deepEqual(a,b);assert.equal(a.records.length,500);assert.equal(a.records[0]!.id,'R101');
 assert.deepEqual(a.records.map(r=>r.arrival),constant.records.map(r=>r.arrival));
 assert.equal(constant.theory,null);assert.ok(constant.records.every(r=>r.service===.6));
 const unstable=randomQueue({...input,lambda:110});
 assert.equal(unstable.theory?.stable,false);assert.ok(unstable.records.every(r=>Number.isFinite(r.departure)));
 assert.throws(()=>randomQueue({...input,count:0}));assert.throws(()=>randomQueue({...input,seed:-1}));
});
test('42 authored pages maintain the earlier course and expose only current public steps',()=>{
 assert.equal(pages.length,42);assert.equal(new Set(pages.map(p=>p.slideKey)).size,42);
 assert.equal(getPortManagementGlobalSlideIndex(17,1),686);assert.equal(getPortManagementGlobalSlideIndex(17,42),727);
 const timing=expansionTiming(17);assert.equal(timing.slice(0,4).reduce((n,t)=>n+t.minutes,0),45);assert.equal(timing.slice(4).reduce((n,t)=>n+t.minutes,0),45);
 for(const p of pages)for(const progress of [0,.5,1])for(let option=0;option<(p.options?.length??1);option++){
  const state={progress,option,revealed:false},html=renderToStaticMarkup(<PortQueueComposition page={p} state={state}/>);
  assert.equal(expansionStateValid(p,state),true);assert.doesNotMatch(html,/teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/);
  assert.ok(!html.includes(p.teachingCue));if(p.reveal)assert.ok(!html.includes(p.reveal));
  if(progress===0){const summary=expansionDiagramSummary(p,state);for(const e of p.equations??[])assert.ok(!summary.includes(e.explanation));}
 }
});
test('lecture 17 student copy, source assets and state-gated calculations are complete',()=>{
 const base=new URL('../public/course-assets/port-management/queue-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('edl.json',base),'utf8'));
 assert.equal(edl.lesson,17);assert.equal(edl.duration,46);assert.ok(edl.shots.every((s:{text:string})=>s.text.length>0));
 const movie=readFileSync(new URL('queue-opening.mp4',base));
 assert.equal(createHash('sha256').update(movie).digest('hex'),edl.outputSha256);
 assert.ok(statSync(new URL('queue-opening.jpg',base)).size>5000);
 for(const p of pages){
  const publicCopy=[p.title,p.lead,...p.points,...(p.rows??[]).flat(),...(p.equations??[]).flatMap(e=>[e.tex,e.explanation]),p.reveal??''].join('\n');
  assert.doesNotMatch(publicCopy,/让学生|告诉学生|教师稿|备课|编排|提示词|生成政策|teachingCue|assistantCue/);
 }
 const rate=pages.find(p=>p.visual==='queue-rate')!;
 assert.equal(renderToStaticMarkup(<PortQueueComposition page={rate} state={{progress:0,option:0,revealed:false}}/>).includes('class="katex"'),false);
 assert.ok(renderToStaticMarkup(<PortQueueComposition page={rate} state={{progress:.25,option:0,revealed:false}}/>).includes('class="katex"'));
 const appointment=pages.find(p=>p.visual==='queue-appointment')!;
 assert.ok(!expansionDiagramSummary(appointment,{progress:.5,option:1,revealed:false}).includes('平均港外3'));
 assert.ok(expansionDiagramSummary(appointment,{progress:1,option:1,revealed:false}).includes('平均港外3'));
});
test('the publishable student handout preserves worksheets and the simulation links to HTML',()=>{
 const handout=readFileSync(new URL('../public/handouts/port-queue-lesson17.html',import.meta.url),'utf8');
 assert.equal((handout.match(/<h2>/g)??[]).length,8);
 assert.equal((handout.match(/<table>/g)??[]).length,5);
 assert.match(handout,/平均队列人数Lq=λWq\/60/);
 assert.match(handout,/@media print/);
 assert.match(handout,/href="\/port-queue-lab.html"/);
 assert.doesNotMatch(handout,/teachingCue|assistantCue|受控解析|<script/);
 const app=readFileSync(new URL('../src/port-queue-lab.tsx',import.meta.url),'utf8');
 assert.match(app,/href="\/handouts\/port-queue-lesson17.html"/);
 assert.doesNotMatch(app,/href="\/handouts\/port-queue-lesson17.md"/);
});
