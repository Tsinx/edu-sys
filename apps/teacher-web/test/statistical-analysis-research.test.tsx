import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export {};',shortCircuit:true}:next(url,context);}});
Object.assign(globalThis,{React});
const {StatisticalAnalysisSlide}=await import('../src/features/statistical-analysis/StatisticalAnalysisSlideStage');
const {StatisticalAnalysisTeachingNotes}=await import('../src/features/statistical-analysis/StatisticalAnalysisCourseOverview');
const {researchLessonFifteen}=await import('@edu/course-content/statistical-analysis');
test('every authored classroom explanation is actually rendered, including TF and IDF definitions',()=>{
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
 for(const [i,p] of researchLessonFifteen.entries()){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={691+i}/>);
  for(const paragraph of p.text)assert.ok(html.includes(escape(paragraph)),'Missing projected copy on page '+(i+1)+': '+paragraph);
 }
 const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={712}/>);
 assert.match(html,/TF：这个词在当前段里出现的次数/);
 assert.match(html,/IDF：依据整批文档计算的词权重/);
});
test('all 102 research and text canvases render native evidence without author metadata',()=>{
 for(let index=643;index<=744;index++){
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
 const b=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={744}/>);
 assert.match(b,/讲述预算/);assert.match(b,/原始CSV/);assert.doesNotMatch(b,/个人跟做/);
});
