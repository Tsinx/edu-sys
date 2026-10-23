import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STATISTICAL_ANALYSIS_SLIDES as slides,STATISTICAL_ANALYSIS_LESSONS as lessons,policyLessons,policyTiming,policyEvidenceText,POLICY_DATA as data} from '@edu/course-content/statistical-analysis';
import {statisticalAnalysisTeacherScripts as scripts} from '@edu/course-content/statistical-analysis/teacher-scripts';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

test('the real project extends the course to lectures 12–13 without creating blank later lessons',()=>{
 assert.equal(slides.length,642);assert.equal(lessons.filter(l=>l.status==='ready').length,13);
 assert.deepEqual(lessons.slice(11,13).map(l=>[l.slideStart,l.slideEnd,l.slideTotal]),[[547,594,48],[595,642,48]]);
 assert.ok(lessons.slice(13).every(l=>l.status==='planned'&&l.slideStart===null));
 for(const lesson of [12,13]){
  const pages=policyLessons[lesson-12]!;assert.equal(pages.length,48);assert.equal(pages.filter(p=>p.checkpoint).length,6);
  const times=pages.map((_,i)=>policyTiming(lesson,i+1));
  assert.ok(Math.abs(times.reduce((n,t)=>n+t.spokenSeconds,0)-3300)<1e-8);
  assert.ok(Math.abs(times.filter(t=>t.practice).reduce((n,t)=>n+t.pauseSeconds,0)-1500)<1e-8);
  assert.ok(Math.abs(times.filter(t=>!t.practice).reduce((n,t)=>n+t.pauseSeconds,0)-600)<1e-8);
 }
});
test('project projection copy has resolved evidence and honest cohort and IV boundaries',()=>{
 for(const lesson of policyLessons)for(const p of lesson){
  assert.ok(p.title&&p.lead&&p.caption&&p.question);
  assert.doesNotMatch([p.title,p.lead,p.caption,...p.text].join(' '),/让学生|告诉学生|先拆掉|不背口号|备课预算|实际课堂试讲|教师逐字稿/);
  if(p.visual)assert.ok(policyEvidenceText(p.visual).length>10,p.visual);
  if(p.formula)assert.doesNotMatch(p.formula,/[\u0000-\u001f]/);
 }
 assert.equal(data.audit.eligibleRows,78470);assert.equal(data.audit.wageRows,31061);assert.equal(data.ar.kind,'all-real');
 assert.ok(data.first.clusterT2<1);assert.ok(data.iv.ci[0]!<0&&data.iv.ci[1]!>0);
 assert.ok(Math.abs(data.reduced.beta/data.first.beta-data.iv.beta)<1e-8);
 assert.match(policyEvidenceText('eventcompare'),/不能：缺实施前后逐期结果/);
});
test('all 96 project scripts remain complete, separately exported and timed for actual follow-along',()=>{
 for(const lesson of [12,13]){
  const items=scripts.filter(s=>s.lesson===lesson);assert.equal(items.length,48);
  const chars=items.reduce((n,s)=>n+(s.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
  assert.ok(chars>=9000,`${lesson}: ${chars}`);
  const doc=readFileSync(new URL(`../../../docs/course/statistical-analysis/lecture-${lesson}-script.md`,import.meta.url),'utf8').replaceAll('\r\n','\n');
  for(const s of items){assert.equal(s.paragraphs.length,3);assert.equal(s.transitionToNext,s.paragraphs.at(-1));assert.ok(doc.includes(s.paragraphs.join('\n\n')));}
 }
});
test('the assistant permits project work while protecting scripts, future evidence and future feedback',()=>{
 for(const slide of slides.filter(s=>s.lesson>=12)){
  const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,slide.index);
  assert.equal(w.coverage.slides,642);assert.match(w.compiled,/个人Python/);assert.match(w.compiled,/第14—16讲仍待建设/);
  assert.doesNotMatch(w.compiled,/不要求投票提交或课上代码运行|因子分析、因果推断和时间序列仍按目录待建设|spokenSeconds|paragraphs|transitionToNext/);
  for(const script of scripts.filter(s=>s.lesson>=12))assert.ok(!w.compiled.includes(script.paragraphs[0]!));
 }
 const cue=(l:number,p:number)=>slides.find(s=>s.lesson===l&&s.localIndex===p)!.assistantCue;
 assert.doesNotMatch(cue(12,2),/0\.036|0\.136|all-real/);
 assert.doesNotMatch(cue(13,14),/0\.136|0\.555|95%集合为全体实数/);
 assert.doesNotMatch(cue(12,40),/未显著不能证明平行变化/);assert.match(cue(12,41),/未显著不能证明平行变化/);
 assert.doesNotMatch(cue(13,41),/OLS与IV可能针对不同变化/);assert.match(cue(13,42),/OLS与IV可能针对不同变化/);
});
test('student project downloads are explicit, self-contained code and never contain teacher transcripts',()=>{
 const root=new URL('../../../apps/teacher-web/public/course-assets/statistical-analysis/project-12-13/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8')) as Record<string,string>;
 assert.ok(manifest['01_did.ipynb']&&manifest['02_iv.ipynb']&&manifest['DATA.md']);
 assert.ok(Object.keys(manifest).every(n=>!n.endsWith('.dta')&&!n.includes('teacher')&&!n.includes('lecture-')));
 for(const name of ['01_did.ipynb','02_iv.ipynb']){
  const notebook=JSON.parse(readFileSync(new URL(name,root),'utf8'));
  assert.ok(notebook.cells.filter((c:{cell_type:string})=>c.cell_type==='code').length>=7);
  assert.equal(notebook.nbformat,4);
  assert.doesNotMatch(JSON.stringify(notebook),/教师备课稿|spokenSeconds|transitionToNext/);
 }
});
