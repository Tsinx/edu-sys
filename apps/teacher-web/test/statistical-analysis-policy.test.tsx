import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export {};',shortCircuit:true}:next(url,context);}});
Object.assign(globalThis,{React});
const {StatisticalAnalysisSlide}=await import('../src/features/statistical-analysis/StatisticalAnalysisSlideStage');
const {StatisticalAnalysisTeachingNotes}=await import('../src/features/statistical-analysis/StatisticalAnalysisCourseOverview');
test('all project canvases render editable evidence and code without authoring metadata or download controls',()=>{
 for(let index=547;index<=642;index++){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={index}/>);
  assert.match(html,/data-slide-key="stats-l1[23]-/);
  assert.doesNotMatch(html,/teachingCue|assistantCue|spokenSeconds|pauseSeconds|paragraphs|教师逐页讲稿|katex-error|undefined|sap-resources/);
 }
});
test('teacher notes show only the current project script and keep the cross-lecture bridge',()=>{
 const first=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={547}/>);
 assert.match(first,/上一讲结束时/);assert.match(first,/逐字稿 · 当前页/);
 assert.doesNotMatch(first,/公式外部的1表示截距/);
 const last=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={546}/>);
 assert.match(last,/真实的小学建设资料/);
 const iv=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={595}/>);
 assert.match(iv,/政策暴露差异Z/);assert.doesNotMatch(iv,/P11留五分钟/);
});
