import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {causalLessons,causalTiming,causalEvidenceText,CAUSAL_DATA as D,STATISTICAL_ANALYSIS_SLIDES as slides} from '@edu/course-content/statistical-analysis';
import {statisticalAnalysisTeacherScripts as scripts} from '@edu/course-content/statistical-analysis/teacher-scripts';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
test('96 authored causal pages each resolve evidence and remain projection copy',()=>{
 assert.deepEqual(causalLessons.map(l=>l.length),[48,48]);
 for(const lesson of causalLessons)for(const p of lesson){
  assert.ok(p.question.endsWith('？'));assert.ok(p.title&&p.lead&&p.caption&&p.note&&p.design);
  assert.doesNotMatch([p.title,p.lead,p.caption,...p.text].join(' '),/让学生|告诉学生|先拆掉|不背口号|本页讲解重点|备课说明/);
  if(p.visual)assert.ok(causalEvidenceText(p.visual).length>10);
  if(p.formula)assert.doesNotMatch(p.formula,/[\u0000-\u001f]/);
 }
});
test('complete scripts use stable keys, one source, 70 + 20 minutes and substantive spoken copy',()=>{
 assert.equal(scripts.length,192);assert.equal(new Set(scripts.map(p=>p.slideKey)).size,192);
 for(const lesson of [10,11]){
  const items=scripts.filter(p=>p.lesson===lesson);assert.equal(items.length,48);
  const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8);
  near(items.reduce((n,p)=>n+p.spokenSeconds,0),4200);near(items.reduce((n,p)=>n+p.pauseSeconds,0),1200);
  const chars=items.reduce((n,p)=>n+(p.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
  assert.ok(chars>=14000&&chars<=16000,`${lesson}: ${chars}`);
  const doc=readFileSync(new URL(`../../../docs/course/statistical-analysis/lecture-${lesson}-script.md`,import.meta.url),'utf8');
  for(const s of items){assert.ok(s.paragraphs.length>=3&&s.transitionToNext===s.paragraphs.at(-1));assert.ok(doc.includes(s.paragraphs.join('\n\n')));near((s.spokenSeconds+s.pauseSeconds)/60,causalTiming(lesson,s.localIndex).minutes);}
 }
});
test('current-page context includes only visible causal evidence, no scripts, oracle or future feedback',()=>{
 for(const p of slides.filter(p=>p.lesson>=10&&p.lesson<=11)){
  const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,p.index);
  assert.equal(w.coverage.slides,642);assert.match(w.compiled,/第14—16讲仍待建设/);
  assert.doesNotMatch(w.compiled,/trueAssignmentProbability|constantAdditiveEffect|spokenSeconds|pauseSeconds|paragraphs/);
  const script=scripts.find(s=>s.slideKey===p.slideKey)!;assert.ok(!w.compiled.includes(script.paragraphs[0]!));
 }
 const cue=(l:number,p:number)=>slides.find(s=>s.lesson===l&&s.localIndex===p)!.assistantCue;
 assert.doesNotMatch(cue(10,22),/先保留A与C|A\/C是本例/);assert.match(cue(10,23),/A\/C是本例/);
 assert.doesNotMatch(cue(10,45),/加权差异仍依赖/);assert.match(cue(10,46),/加权差异仍依赖/);
 assert.doesNotMatch(cue(11,42),/双向FE保留模型条件/);assert.match(cue(11,43),/双向FE保留模型条件/);
 assert.doesNotMatch(cue(10,20),/3\.54|4\.71|8\.040|3\.283/);
 assert.doesNotMatch(cue(11,20),/8\.040|3\.283/);
});
test('matching target, unchanged covariate scale and inference metadata stay honest',()=>{
 assert.equal(D.treatedN,59);assert.equal(D.controlN,61);assert.equal(D.matching.retained,50);assert.equal(D.matching.unmatched.length,9);
 assert.equal(D.weighting.repetitions,499);assert.equal(D.models[2]!.clusters,120);
 assert.ok(D.balance.every(b=>Math.abs(b.weightedSmd)>.1));
 assert.ok(causalEvidenceText('comparison').includes('50家保留'));
 assert.ok(causalEvidenceText('weight-interval').includes('重估倾向得分'));
});
