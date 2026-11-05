import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export {};',shortCircuit:true}:next(url,context);}});
Object.assign(globalThis,{React});
const {StatisticalAnalysisSlide}=await import('../src/features/statistical-analysis/StatisticalAnalysisSlideStage');
const {StatisticalAnalysisTeachingNotes}=await import('../src/features/statistical-analysis/StatisticalAnalysisCourseOverview');
const {forecastLessonSixteen}=await import('@edu/course-content/statistical-analysis');
test('every forecast page renders all authored explanations, formulas, tables and charts',()=>{
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
 for(const [i,p] of forecastLessonSixteen.entries()){
  const html=renderToStaticMarkup(<StatisticalAnalysisSlide index={745+i}/>);
  assert.match(html,/data-slide-key="stats-l16-/);
  for(const t of p.text)assert.ok(html.includes(escape(t)),`Page ${i+1} missing ${t}`);
  if(p.formula)assert.match(html,/katex-display/);
  if(p.table)for(const row of p.table.rows)for(const cell of row)assert.ok(html.includes(escape(cell)));
  assert.doesNotMatch(html,/证据|边界|teachingCue|assistantCue|paragraphs|spokenSeconds|transitionToNext|saf-resources|katex-error|undefined/);
 }
});
test('forecast manuscripts stay in teacher notes and current-page practice state resolves',()=>{
 const html=renderToStaticMarkup(<StatisticalAnalysisTeachingNotes index={808}/>);
 assert.match(html,/逐字稿/);assert.match(html,/个人跟做/);assert.match(html,/二十二列/);
 const student=renderToStaticMarkup(<StatisticalAnalysisSlide index={808}/>);
 assert.doesNotMatch(student,/这里留出跟做时间|二十二列|讲述预算/);
});
