import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_EXPANSION_SLIDES as pages,PORT_EXPANSION_SOURCES as sources,expansionTiming,expansionStateValid,expansionVisiblePoints,effectiveChainCapacity,planningBalance,getPortManagementGlobalSlideIndex,getPortManagementLesson,PORT_MANAGEMENT_SLIDE_TOTAL} from '@edu/course-content';
import {PortExpansionComposition} from '../src/features/port-expansion/PortExpansionComposition';
test('lessons 7 and 8: complete source-backed authored pages, two 45-minute halves and stable indices',()=>{
 assert.equal(pages.length,96);assert.equal(PORT_MANAGEMENT_SLIDE_TOTAL,389);assert.equal(new Set(pages.map(p=>p.slideKey)).size,96);
 for(const lesson of [7,8] as const){const timing=expansionTiming(lesson);assert.equal(getPortManagementLesson(lesson).status,'ready');assert.equal(timing.slice(0,4).reduce((s,t)=>s+t.minutes,0),45);assert.equal(timing.slice(4).reduce((s,t)=>s+t.minutes,0),45);}
 for(const p of pages){assert.equal(getPortManagementGlobalSlideIndex(p.lesson,p.localPage),p.index);assert.ok(sources[p.source]);assert.ok(p.teachingCue.length>=65,p.slideKey);assert.equal(expansionVisiblePoints(p,0).length,0);assert.deepEqual(expansionVisiblePoints(p,1),p.points);
  for(const progress of [0,.5,1])for(let option=0;option<(p.options?.length??1);option++){
   const html=renderToStaticMarkup(<PortExpansionComposition page={p} state={{progress,option,revealed:false}}/>);
   assert.ok(html.includes(`aria-label="第${p.lesson}讲第${p.localPage}页"`));assert.doesNotMatch(html,/让学生|告诉学生|teachingCue|assistantCue|storyBeat|voyageStage|data-teaching|data-assistant/);
   assert.ok(!html.includes(p.teachingCue));assert.ok(!html.includes(p.assistantCue));if(p.reveal)assert.ok(!html.includes(p.reveal),p.slideKey);
  }
  if(p.reveal)assert.ok(renderToStaticMarkup(<PortExpansionComposition page={p} state={{progress:1,option:0,revealed:true}}/>).includes(p.reveal));
 }
});
test('fixed serial capacity and planning balances respect bottlenecks, conservation and units',()=>{
 assert.equal(effectiveChainCapacity([900,600,750]),600);assert.equal(effectiveChainCapacity([1200,600,750]),600);assert.equal(effectiveChainCapacity([900,1000,750]),750);
 for(let demand=0;demand<=200;demand+=5)for(const capacity of [90,150]){const r=planningBalance(demand,capacity);assert.equal(r.served+r.shortfall,demand);assert.equal(r.served+r.spare,capacity);assert.ok(r.shortfall===0||r.spare===0);}
 assert.deepEqual([80,100,120].map(d=>planningBalance(d,90).shortfall),[0,10,30]);assert.deepEqual([80,100,120].map(d=>planningBalance(d,90).spare),[10,0,0]);
 assert.throws(()=>effectiveChainCapacity([]));assert.throws(()=>planningBalance(100,0));assert.throws(()=>planningBalance(NaN,90));
});
test('per-page state rejects unavailable options and unauthorized disclosure shapes',()=>{
 for(const p of pages){assert.equal(expansionStateValid(p,{progress:0,option:0,revealed:false}),true);assert.equal(expansionStateValid(p,{progress:NaN,option:0,revealed:false}),false);assert.equal(expansionStateValid(p,{progress:1,option:p.options?.length??1,revealed:false}),false);assert.equal(expansionStateValid(p,{progress:1,option:0,revealed:true}),!!p.reveal);}
});
