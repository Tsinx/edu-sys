import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forecastLessonSixteen as pages,forecastTiming as timing,FORECAST_DATA as D,STATISTICAL_ANALYSIS_SLIDES as slides,STATISTICAL_ANALYSIS_LESSONS as lessons} from '@edu/course-content/statistical-analysis';
import {statisticalAnalysisTeacherScripts as scripts} from '@edu/course-content/statistical-analysis/teacher-scripts';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

test('lecture 16 completes the course with a continuous 90-page forecast project',()=>{
 assert.equal(pages.length,90);assert.deepEqual([lessons[15]!.slideStart,lessons[15]!.slideEnd,lessons[15]!.slideTotal],[745,834,90]);
 const times=pages.map((_,i)=>timing(i+1));
 assert.equal(times.reduce((n,t)=>n+t.spokenSeconds,0),3600);
 assert.equal(times.filter(t=>t.practice).reduce((n,t)=>n+t.pauseSeconds,0),1200);
 assert.equal(times.filter(t=>!t.practice).reduce((n,t)=>n+t.pauseSeconds,0),600);
 const titles=pages.map(p=>p.title);
 const before=(a:RegExp,b:RegExp)=>assert.ok(titles.findIndex(t=>a.test(t))<titles.findIndex(t=>b.test(t)));
 before(/^时间序列/,/^起点t/);before(/^指示变量/,/^日历回归/);before(/^滞后1天/,/^自回归/);before(/^上周同一天，也/,/^把日历和过去/);before(/^MAE：/,/^先读验证结果/);
 const doc=readFileSync(new URL('../../../docs/course/statistical-analysis/lecture-16-script.md',import.meta.url),'utf8');
 for(const [i,p] of pages.entries()){
  const text=[p.title,p.lead,...p.text,p.caption].join(' ');
  assert.doesNotMatch(text,/证据|边界|让学生|告诉学生|备课|尚未建设|请教师/);
  assert.ok(p.question.endsWith('？'));assert.ok(p.title&&p.lead&&p.caption);
  const script=scripts.find(s=>s.slideKey===`stats-l16-${String(i+1).padStart(2,'0')}`)!;
  assert.ok(script);assert.ok(script.paragraphs.length>=3||i===0);assert.ok(doc.includes(script.paragraphs.join('\n\n')));
  assert.doesNotMatch(script.paragraphs.join(''),/证据|边界/);
  if(p.kind==='question')assert.equal(pages[i+1]!.kind,'feedback');
 }
});
test('the projected calculations share the reproducible data and preserve genuine model selection',()=>{
 assert.equal(D.n,731);assert.equal(D.train_n,688);assert.equal(D.parameters.calendar.n,688);assert.equal(D.parameters.ar1.n,687);assert.equal(D.parameters.arx.n,681);
 assert.equal(D.future_calendar[3].holiday,1);assert.equal(D.future_calendar.reduce((s,r)=>s+r.holiday,0),1);
 assert.equal(D.selected,'mean7');
 assert.equal([...D.validation_metrics].sort((a,b)=>a.mae-b.mae)[0]!.model,D.selected);
 assert.ok(D.test_metrics.find(r=>r.model==='arx')!.mae<D.test_metrics.find(r=>r.model===D.selected)!.mae);
 for(const r of D.trace)assert.ok(Math.abs(r.calendar_part+r.lag1_part+r.lag7_part-r.prediction)<1e-7);
 for(let i=1;i<7;i++)assert.equal(D.main.ar1[i]!.lag1,D.main.ar1[i-1]!.prediction);
 assert.ok(Math.abs(D.main.mean7[0].prediction-37299/7)<1e-10);
});
test('current-page assistance uses public data and keeps questions and manuscripts isolated',()=>{
 for(const p of slides.filter(p=>p.lesson===16)){
  const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,p.index);
  assert.equal(w.coverage.slides,834);assert.ok(w.compiled.includes(p.title));
  const script=scripts.find(s=>s.slideKey===p.slideKey)!;assert.ok(!w.compiled.includes(script.paragraphs[0]!));
  assert.doesNotMatch(p.assistantCue,/第16讲.*待建设|spokenSeconds|paragraphs/);
 }
 for(const local of [14,27,45,57,76,89]){
  const p=slides[744+local-1]!;const next=scripts.find(s=>s.slideKey===slides[p.index]!.slideKey)!;
  assert.ok(!p.assistantCue.includes(next.paragraphs[0]!));
 }
});
