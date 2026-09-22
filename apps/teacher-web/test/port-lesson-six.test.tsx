import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PORT_LESSON_SIX_SLIDES as pages, PORT_LESSON_SIX_TIMING as timing, PORT_LESSON_SIX_SOURCES as sources, averageYardStock, closingYardStock, gateSchedule, LESSON_SIX_ROUTES as routes, routeGeneralizedCost, lessonSixStateValid, lessonSixVisiblePoints, getPortManagementLesson, getPortManagementSlide, PORT_MANAGEMENT_SLIDE_TOTAL } from '@edu/course-content';
import { PortLessonSixComposition } from '../src/features/port-lesson-six/PortLessonSixComposition';

test('lesson six: 48 authored pages, 45+45 minutes, public copy and explicit source boundaries',()=>{
  assert.equal(pages.length,48);assert.equal(new Set(pages.map(p=>p.slideKey)).size,48);
  assert.equal(timing.slice(0,4).reduce((s,t)=>s+t.minutes,0),45);assert.equal(timing.slice(4).reduce((s,t)=>s+t.minutes,0),45);
  assert.equal(PORT_MANAGEMENT_SLIDE_TOTAL,485);assert.equal(getPortManagementLesson(6).status,'ready');
  for(const page of pages){
    assert.equal(getPortManagementSlide(245+page.localPage).slideKey,page.slideKey);assert.ok(sources[page.source]);
    assert.ok(page.teachingCue.length>=65,page.slideKey);
    for(const progress of [0,.5,1])for(let option=0;option<(page.options?.length??1);option++){
      const html=renderToStaticMarkup(<PortLessonSixComposition page={page} state={{progress,option,revealed:false}}/>);
      assert.doesNotMatch(html,/让学生|告诉学生|teachingCue|assistantCue|storyBeat|voyageStage|data-teaching|data-assistant/);
      assert.ok(!html.includes(page.teachingCue));assert.ok(!html.includes(page.assistantCue));
      if(page.reveal)assert.ok(!html.includes(page.reveal),page.slideKey+' hidden answer');
    }
    if(page.reveal&&page.localPage!==38){const shown=renderToStaticMarkup(<PortLessonSixComposition page={page} state={{progress:1,option:0,revealed:true}}/>);assert.ok(shown.includes(page.reveal),page.slideKey+' reveal');}
  }
});
test('inventory conservation, stable averages and complete queue accounting use consistent units',()=>{
  assert.equal(averageYardStock(1000,3),3000);assert.equal(averageYardStock(1000,5),5000);
  let stock=3000;const series=[];for(let day=0;day<3;day++){stock=closingYardStock(stock,1000,800);series.push(stock);}assert.deepEqual(series,[3200,3400,3600]);
  const even=gateSchedule([0,2,4,6,8,10]),burst=gateSchedule([0,0,0,0,0,0]);
  assert.deepEqual(burst.map(r=>r.wait),[0,2,4,6,8,10]);assert.equal(even.reduce((s,r)=>s+r.wait,0),0);assert.equal(burst.reduce((s,r)=>s+r.wait,0)/6,5);
  for(const rows of [even,burst])assert.equal(rows.reduce((s,r)=>s+r.end-r.start,0),12);
});
test('route preference reverses at 200 yuan per box-day with all other inputs fixed',()=>{
  assert.deepEqual(routes.map(r=>routeGeneralizedCost(r,100)),[4400,4700]);
  assert.deepEqual(routes.map(r=>routeGeneralizedCost(r,300)),[6000,5700]);
  assert.deepEqual(routes.map(r=>routeGeneralizedCost(r,200)),[5200,5200]);
});
test('presentation validates per-page options and disclosure',()=>{
  const question=pages[3]!,plain=pages[0]!,options=pages[14]!;
  assert.equal(lessonSixStateValid(plain,{progress:1,option:1,revealed:false}),false);
  assert.equal(lessonSixStateValid(plain,{progress:1,option:0,revealed:true}),false);
  assert.equal(lessonSixStateValid(options,{progress:1,option:1,revealed:true}),true);
  assert.equal(lessonSixStateValid(question,{progress:NaN,option:0,revealed:false}),false);
  assert.equal(lessonSixVisiblePoints(question,0).length,0);assert.deepEqual(lessonSixVisiblePoints(question,1),question.points);
  assert.equal(lessonSixStateValid(pages[25]!,{progress:1,option:0,revealed:false,camera:{latitude:30,longitude:110,distance:2}}),true);
  for(const camera of [{latitude:NaN,longitude:110,distance:2},{latitude:30,longitude:181,distance:2},{latitude:30,longitude:110,distance:4.1}])assert.equal(lessonSixStateValid(pages[25]!,{progress:1,option:0,revealed:false,camera}),false);
  assert.equal(lessonSixStateValid(plain,{progress:1,option:0,revealed:false,camera:{latitude:30,longitude:110,distance:2}}),false);
});
