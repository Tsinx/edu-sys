import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_LESSON_FIFTEEN_SLIDES as fifteen,PORT_LESSON_SIXTEEN_SLIDES as sixteen,PORT_TRANSITION_FILMS,PORT_TRANSITION_SOURCES,PORT_EXPANSION_FILMS,digitalHandoff,shoreComparison,greenIntensity,transitionPortfolio,expansionStateValid,expansionDiagramSummary,expansionTiming} from '@edu/course-content';
import {PortExpansionComposition} from '../src/features/port-expansion/PortExpansionComposition';

test('information improvements stop at the next physical constraint, rather than subtracting every delay',()=>{
 const base=digitalHandoff(0),share=digitalHandoff(1),dispatch=digitalHandoff(2);
 assert.equal(base.factory,840);assert.equal(share.factory,810);assert.equal(dispatch.factory,765);
 assert.equal(base.informationWait,30);assert.equal(share.informationWait,0);
 assert.equal(base.latency-share.latency,85);assert.equal(base.factory-share.factory,30);
 assert.equal(share.factory-dispatch.factory,45);
 for(const option of [-1,3,.5,NaN])assert.throws(()=>digitalHandoff(option));
});
test('shore scenarios keep the delivered energy equal and can reverse the simplified CO2 result',()=>{
 const a=shoreComparison(0),b=shoreComparison(1),short=shoreComparison(2);
 assert.equal(a.kwh,600);assert.equal(a.litres,162);assert.ok(Math.abs(a.savedKg-172.2)<1e-8);
 assert.equal(a.kwh,b.kwh);assert.ok(Math.abs(b.savedKg+7.8)<1e-8);
 assert.ok(Math.abs(short.savedKg-68.88)<1e-8);assert.equal(a.savedCost,465);assert.ok(Math.abs(short.savedCost-186)<1e-8);
 assert.equal(greenIntensity(0).kgPerBox,10);assert.equal(greenIntensity(1).kgPerBox,8);
 assert.ok(greenIntensity(1).tonnes>greenIntensity(0).tonnes);
 for(const fn of [shoreComparison,greenIntensity,transitionPortfolio])for(const option of [-1,9,.5,NaN])assert.throws(()=>fn(option));
});
test('portfolio screening checks the budget, while low shore usage retains fixed annual cost',()=>{
 const ds=transitionPortfolio(0),de=transitionPortfolio(1),se=transitionPortfolio(2),low=transitionPortfolio(0,true);
 assert.equal(ds.capital,340);assert.equal(ds.netAnnual,50);assert.equal(ds.reduction,240);assert.equal(ds.simplePayback,6.8);
 assert.equal(de.capital,420);assert.equal(de.netAnnual,75);assert.equal(de.reduction,300);assert.equal(de.simplePayback,5.6);
 assert.equal(se.withinBudget,false);assert.equal(low.netAnnual,35);assert.equal(low.reduction,150);
 assert.equal(low.capital,ds.capital);assert.ok(low.reduction<200);
});
test('64 authored pages expose only current evidence and preserve two 45-minute halves',()=>{
 assert.equal(fifteen.length,32);assert.equal(sixteen.length,32);
 for(const lesson of [15,16] as const){const times=expansionTiming(lesson);assert.equal(times.slice(0,4).reduce((s,x)=>s+x.minutes,0),45);assert.equal(times.slice(4).reduce((s,x)=>s+x.minutes,0),45);}
 for(const p of [...fifteen,...sixteen]){
  assert.ok(PORT_TRANSITION_SOURCES[p.source as keyof typeof PORT_TRANSITION_SOURCES]);assert.ok(p.teachingCue.length>=65,p.slideKey);
  const copy=[p.title,p.lead,...p.points,...(p.labels??[]),...(p.rows??[]).flat()].join(' ');
  assert.doesNotMatch(copy,/让学生|告诉学生|教师应该|教学设计|teachingCue|assistantCue/);
  const hidden=expansionDiagramSummary(p,{progress:0,option:0,revealed:false});assert.match(hidden,/尚未展开/);
  for(const progress of [0,.5,1])for(let option=0;option<(p.options?.length??1);option++){
   const state={progress,option,revealed:false},html=renderToStaticMarkup(<PortExpansionComposition page={p} state={state}/>);
   assert.ok(!html.includes(p.teachingCue));assert.ok(!html.includes(p.assistantCue));if(p.reveal)assert.ok(!html.includes(p.reveal));
   assert.doesNotMatch(html,/data-teaching|data-assistant|voyageStage|storyBeat/);
  }
 }
});
test('both opening cuts include local media, provenance, hashes and bounded playback states',()=>{
 const base=new URL('../public/course-assets/port-management/transition-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('edl.json',base),'utf8'));
 assert.equal(edl.length,2);
 for(const p of [fifteen[0],sixteen[0]]){
  const film=PORT_EXPANSION_FILMS[p.mediaId!],e=edl.find((e:{lesson:number})=>e.lesson===p.lesson);
  assert.equal(e.duration*1000,film.durationMs);assert.match(e.sourcePage,/^https:\/\/tv.cctv.com\//);
  for(const path of [film.src,film.poster,film.captions])assert.ok(statSync(new URL('../public'+path,import.meta.url)).size>100);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+film.src,import.meta.url))).digest('hex'),e.outputSha256);
  const state={progress:1,option:0,revealed:false,cinematic:{clipId:film.id,status:'paused' as const,elapsedMs:film.durationMs,startedAt:null}};
  assert.equal(expansionStateValid(p,state),true);assert.equal(expansionStateValid(p,{...state,cinematic:{...state.cinematic,elapsedMs:film.durationMs+1}}),false);
  assert.equal(expansionStateValid(p,{...state,cinematic:{...state.cinematic,clipId:p.lesson===15?'l16-green':'l15-smart'}}),false);
 }
 assert.equal(Object.keys(PORT_TRANSITION_FILMS).length,2);
});

test('green-port cases explain processes in three stages without exposing later scene conclusions',()=>{
 const scene=(number:number,progress:number,option=0)=>{
  const page=sixteen[number-1]!;
  const html=renderToStaticMarkup(<PortExpansionComposition page={page} state={{progress,option,revealed:false}}/>);
  return {page,html,svg:html.match(/<svg[\s\S]*?<\/svg>/)?.[0]??''};
 };
 const cases=sixteen.filter(p=>p.visual==='transition-green-case');
 assert.equal(cases.length,12);
 for(const page of cases){
  assert.equal(page.rows?.length,4);
  for(const progress of [0,1/3,2/3,1]){
   const {html}=scene(page.localPage,progress);
   const disclosed=Math.floor(progress*3+1e-6);
   for(let i=0;i<3;i++)assert.equal(html.includes(page.rows![i+1]![1]!),i<disclosed,page.slideKey);
   assert.doesNotMatch(html,/teachingCue|assistantCue|storyBeat|voyageStage|data-teaching|data-assistant/);
  }
 }
 assert.doesNotMatch(scene(13,1/3).svg,/230米电缆沟|1\.5公里专线/);
 assert.match(scene(13,2/3).svg,/230米电缆沟/);assert.doesNotMatch(scene(13,2/3).svg,/1\.5公里专线/);
 assert.match(scene(13,1).svg,/1\.5公里专线/);
 assert.equal((scene(15,2/3).svg.match(/>补能<\/text>/g)??[]).length,3);
 assert.equal((scene(15,1).svg.match(/>补能<\/text>/g)??[]).length,2);
 assert.match(scene(18,1,0).svg,/高水位关系/);assert.match(scene(18,1,1).svg,/低水位关系/);
 assert.doesNotMatch(scene(31,1/3).svg,/08:00|13:00/);
 assert.match(scene(31,2/3).svg,/08:00/);assert.doesNotMatch(scene(31,2/3).svg,/13:00/);
 assert.ok(Math.abs(1-108/119-.09243697478991597)<1e-12);
 assert.deepEqual(sixteen[2]!.values,[10,27,82]);assert.deepEqual(sixteen[22]!.values,[119,108]);
 assert.doesNotMatch(sixteen[31]!.title,/结课|证据清单/);
});
