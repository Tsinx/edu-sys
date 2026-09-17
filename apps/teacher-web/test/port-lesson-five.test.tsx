import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PORT_LESSON_FIVE_SLIDES as pages, PORT_LESSON_FIVE_TIMING as timing, getPortManagementLesson, getPortManagementSlide, PORT_MANAGEMENT_SLIDE_TOTAL } from '@edu/course-content';
import { PortLessonFiveComposition } from '../src/features/port-lesson-five/PortLessonFiveComposition';
import { lessonFiveReturnPath, lessonFiveExperimentUrl } from '../src/features/port-lesson-five/navigation';

test('48 authored pages have direct projection copy, distinct compositions and no hidden teacher metadata',()=>{
 assert.equal(pages.length,48);assert.equal(new Set(pages.map(p=>p.slideKey)).size,48);
 assert.equal(timing.reduce((sum,t)=>sum+t.minutes,0),90);
 assert.equal(getPortManagementLesson(5).status,'ready');assert.equal(PORT_MANAGEMENT_SLIDE_TOTAL,245);
 assert.equal(getPortManagementSlide(198).slideKey,pages[0]!.slideKey);
 for(const page of pages){
  const html=renderToStaticMarkup(<PortLessonFiveComposition page={page}/>);
  assert.match(html,new RegExp(`第5讲第${page.localPage}页`));
  assert.doesNotMatch(html,/让学生|告诉学生|teachingCue|assistantCue|storyBeat|voyageStage|data-teaching|data-assistant/);
  assert.ok(!html.includes(page.teachingCue),page.slideKey);
  assert.ok(page.teachingCue.length>50,page.slideKey+' needs substantive notes');
  if(page.reveal)assert.ok(!html.includes(page.reveal));
 }
 const q=pages[44]!;
 assert.ok(renderToStaticMarkup(<PortLessonFiveComposition page={q} revealed/>).includes(q.reveal!));
});
test('capacity return navigation stays on approved local teaching routes',()=>{
 assert.equal(lessonFiveReturnPath('https://example.com'),null);assert.equal(lessonFiveReturnPath('//example.com'),null);
 assert.equal(lessonFiveReturnPath('/settings'),null);assert.equal(lessonFiveReturnPath('/port-lesson-five-preview.html?page=19'),'/port-lesson-five-preview.html?page=19');
 const url=new URL(lessonFiveExperimentUrl('B','/classroom/abc','abc',true),'http://localhost');
 assert.equal(url.searchParams.get('plan'),'C');assert.equal(url.searchParams.get('purpose'),'personal');assert.equal(url.searchParams.get('session'),'abc');
});
