import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export {};',shortCircuit:true}:next(url,context);}});
Object.assign(globalThis,{React});
const {StatisticalAnalysisSlide}=await import('../src/features/statistical-analysis/StatisticalAnalysisSlideStage');
const {StatisticalAnalysisTeachingNotes}=await import('../src/features/statistical-analysis/StatisticalAnalysisCourseOverview');
test('all 96 research and review canvases render native evidence without author metadata',()=>{
 for(let index=643;index<=738;index++){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={index}/>);
  assert.match(html,/data-slide-key="stats-l1[45]-/);
  assert.doesNotMatch(html,/teachingCue|assistantCue|spokenSeconds|paragraphs|transitionToNext|sar-resources|katex-error|undefined/);
 }
});
test('paper entry pages render full bibliographic titles and model pages render equations with provenance',()=>{
 for(const index of [646,655,663,673,683]){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={index}/>);
  assert.match(html,/sar-paper-entry/);assert.match(html,/摘要（中文提要）/);assert.match(html,/DOI:/);
 }
 for(const index of [650,657,659,666,672,675,676,679,685]){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={index}/>);
  assert.match(html,/sar-model-provenance/);assert.match(html,/katex-display/);assert.match(html,/sar-model-symbols/);
 }
});
test('new notes stay on the requested page without indexing policy practice outside its range',()=>{
 const a=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={643}/>);
 assert.match(a,/每读一篇，都先把完整题目和摘要放在屏幕上/);assert.doesNotMatch(a,/1831/);
 const b=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={738}/>);
 assert.match(b,/讲述预算/);assert.match(b,/在相同条件下复核成果/);assert.doesNotMatch(b,/个人跟做/);
});
