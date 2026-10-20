import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PORT_LESSON_ELEVEN_SLIDES, PORT_LESSON_TWELVE_SLIDES, expansionTiming, expansionTotal } from '@edu/course-content';
import { restorePortClassLab, portClassLabMetrics } from '@edu/port-simulation-core';
import evidence from '../../../packages/course-content/src/port-class-lab-evidence.json';
import { PortAdvancedComposition } from '../src/features/port-expansion/PortAdvancedComposition';
import { PortClassLabPage } from '../src/features/port-simulation/PortClassLabPage';

test('both lectures have 32 authored pages, two 45-minute halves and exactly 30 minutes of practical work',()=>{
  for(const [lesson,pages] of [[11,PORT_LESSON_ELEVEN_SLIDES],[12,PORT_LESSON_TWELVE_SLIDES]] as const){
    assert.equal(pages.length,32);assert.equal(expansionTotal(lesson),32);
    const timing=expansionTiming(lesson);
    assert.equal(timing.slice(0,4).reduce((s,t)=>s+t.minutes,0),45);
    assert.equal(timing.slice(4).reduce((s,t)=>s+t.minutes,0),45);
    assert.equal(timing[3]!.minutes+timing[4]!.minutes,30);
    assert.equal(timing[3]!.slideStart,pages[12]!.index);
    assert.equal(timing[4]!.slideEnd,pages[19]!.index);
    assert.ok(pages.some(p=>p.visual==='lab'));
  }
});
test('every rebuilt composition keeps author notes and hidden reference answers out of student HTML',()=>{
  const pages=[...PORT_LESSON_ELEVEN_SLIDES,...PORT_LESSON_TWELVE_SLIDES];
  for(const page of pages){
    for(const progress of [0,.5,1]){
      const html=renderToStaticMarkup(<PortAdvancedComposition page={page} state={{progress,option:0,revealed:false}}/>);
      assert.ok(html.includes(`aria-label="第${page.lesson}讲第${page.localPage}页"`));
      assert.ok(!html.includes(page.teachingCue));assert.ok(!html.includes(page.assistantCue));
      assert.doesNotMatch(html,/让学生|告诉学生|teachingCue|assistantCue|storyBeat|voyageStage/);
      if(page.reveal)assert.ok(!html.includes(page.reveal),page.slideKey);
    }
  }
});
test('frozen classroom figures reproduce the actual versioned lab commands',()=>{
  for(const entry of Object.values(evidence.runs)){
    const run=restorePortClassLab(entry.record,entry.record.lesson as 11|12);
    assert.deepEqual(portClassLabMetrics(run),entry.metrics);
  }
});
test('independent entries expose the right task, controls and source boundary without requiring login',()=>{
  for(const lesson of [11,12] as const){
    const html=renderToStaticMarkup(<PortClassLabPage lesson={lesson}/>);
    assert.match(html,/未上传教学平台/);assert.doesNotMatch(html,/teachingCue|assistantCue/);
    if(lesson===11){assert.match(html,/从基准开始新练习/);assert.match(html,/先看原配置/);assert.doesNotMatch(html,/应用岗位配置/);}
    else{assert.match(html,/30分钟任务书/);assert.match(html,/下载完整实验记录 JSON/);assert.ok(html.includes('审查证据并恢复电子交付'));assert.ok(html.includes('data-lesson="12"'));}
  }
});
