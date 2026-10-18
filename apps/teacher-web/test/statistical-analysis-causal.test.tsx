import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export {};',shortCircuit:true}:next(url,context);}});
Object.assign(globalThis,{React});
const {StatisticalAnalysisSlide}=await import('../src/features/statistical-analysis/StatisticalAnalysisSlideStage');
const {StatisticalAnalysisTeachingNotes}=await import('../src/features/statistical-analysis/StatisticalAnalysisCourseOverview');
test('all causal canvases render native evidence and TeX without teacher metadata',()=>{
 for(let index=451;index<=546;index++){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={index}/>);
  assert.match(html,/data-slide-key="stats-l1[01]-/);
  assert.doesNotMatch(html,/teachingCue|assistantCue|spokenSeconds|pauseSeconds|教师逐页讲稿|观察与思考预算|undefined|katex-error/);
 }
});
test('teacher notes resolve only the current script and leave earlier notes intact',()=>{
 const html=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={451}/>);
 assert.match(html,/逐字稿 · 当前页/);assert.match(html,/上一讲结束时/);assert.doesNotMatch(html,/表里M001在多个不同月份出现/);
 const old=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={399}/>);
 assert.doesNotMatch(old,/逐字稿 · 当前页/);assert.match(old,/教师讲解备注/);
});
