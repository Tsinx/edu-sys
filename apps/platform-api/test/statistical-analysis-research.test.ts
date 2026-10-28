import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {researchLessons,researchPapers,researchTiming,researchEvidenceText,researchDescriptions,STATISTICAL_ANALYSIS_SLIDES as slides,STATISTICAL_ANALYSIS_LESSONS as lessons,POLICY_DATA as D} from '@edu/course-content/statistical-analysis';
import {statisticalAnalysisTeacherScripts as scripts} from '@edu/course-content/statistical-analysis/teacher-scripts';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
test('applications and review extend the authored course with unique public pages and honest timing',()=>{
 assert.deepEqual(lessons.slice(13,15).map(l=>[l.status,l.slideStart,l.slideEnd,l.slideTotal]),[['ready',643,690,48],['ready',691,738,48]]);
 assert.equal(lessons[15]!.status,'planned');assert.equal(slides.length,738);
 assert.equal(new Set(slides.map(s=>s.slideKey)).size,738);
 for(const [i,pages] of researchLessons.entries()){
  assert.equal(pages.length,48);assert.equal(pages.filter(p=>p.kind==='question').length,6);
  const times=pages.map((_,j)=>researchTiming(i+14,j+1));
  assert.equal(times.reduce((n,t)=>n+t.spokenSeconds,0),4200);
  assert.equal(times.reduce((n,t)=>n+t.pauseSeconds,0),1200);
  for(const p of pages){
   assert.ok(p.title&&p.lead&&p.caption&&p.question.endsWith('？'));
   assert.doesNotMatch([p.title,p.lead,...p.text,p.caption].join(' '),/让学生|告诉学生|备课预算|本页讲解重点|尚未建设|请教师/);
   if(p.visual)assert.ok(researchDescriptions[p.visual]&&researchEvidenceText(p).length>20);
  }
 }
});
test('paper reading follows each full title and abstract through models, results and management interpretation',()=>{
 assert.equal(researchPapers.length,5);assert.equal(new Set(researchPapers.map(p=>p.doi)).size,5);
 const pages=researchLessons[0]!;
 assert.deepEqual(pages.flatMap((p,i)=>p.abstract?[i+1]:[]),[4,13,21,31,41]);
 assert.deepEqual(pages.flatMap((p,i)=>p.model?[i+1]:[]),[8,15,17,24,30,33,34,37,43]);
 for(const paper of researchPapers){
  const entry=pages.find(p=>p.source===paper.id&&p.abstract)!;
  assert.equal(entry.abstract!.paragraphs.length,3);
  assert.match(entry.abstract!.locator,/摘要|Abstract/);
  const evidence=researchEvidenceText(entry);
  for(const value of [paper.title,paper.authors,paper.journal,paper.doi])assert.ok(evidence.includes(value));
  assert.ok(pages.some(p=>p.source===paper.id&&p.model));
  assert.ok(pages.some(p=>p.source===paper.id&&p.readingStep==='估计结果'));
  assert.ok(pages.some(p=>p.source===paper.id&&p.readingStep==='管理解释'));
  for(const other of researchPapers.filter(p=>p.id!==paper.id))assert.ok(!evidence.includes(other.title));
 }
 assert.deepEqual(pages.filter(p=>p.model?.sourceKind==='original').map(p=>p.model!.provenance),['作者公开稿第11页，原文式(1)','期刊正文第23页，原文式(1)']);
 for(const p of pages.filter(p=>p.model?.sourceKind==='restatement'))assert.match(p.model!.provenance,/课堂/);
 assert.doesNotMatch(pages.map(p=>[p.title,p.lead,...p.text,p.caption].join(' ')).join('\n'),/不能说明|研究的边界|防止误读|剩余风险/);
 assert.match(researchEvidenceText(pages[4]!),/670.*498.*367/);
 assert.match(researchEvidenceText(researchLessons[0]![13]!),/269.*90对.*180/);
 assert.match(researchEvidenceText(researchLessons[0]![35]!),/0.084.*0.061.*0.79.*1831/s);
 assert.match(researchEvidenceText(pages[36]!),/累积实施周数/);
 assert.match(pages[36]!.text.join(' '),/0.477.*86.00/);
 assert.match(pages[23]!.caption,/城市×历月季节项/);
 assert.match(pages[41]!.caption,/1612.*奇数日/);
 assert.match(researchEvidenceText(pages[17]!),/0.96%.*0.59%.*0.57%.*0.39%/);
 assert.match(researchEvidenceText(pages[45]!),/1000.*六个月.*24.*480000.*48万美元/);
 assert.ok(Math.abs(100*Math.expm1(-.039*Math.log(1.2))+.7085320631880438)<1e-12);
 assert.equal(D.cells.reduce((n,c)=>n+c.n,0),78470);
 assert.ok(Math.abs((D.cells[3]!.mean-D.cells[2]!.mean)-(D.cells[1]!.mean-D.cells[0]!.mean)-D.education.beta)<1e-8);
 assert.ok(Math.abs(D.reduced.beta/D.first.beta-D.iv.beta)<1e-8);
});
test('full manuscripts stay private and export from the identical source',()=>{
 for(const lesson of [14,15]){
  const rows=scripts.filter(s=>s.lesson===lesson);assert.equal(rows.length,48);
  const doc=readFileSync(new URL('../../../docs/course/statistical-analysis/lecture-'+lesson+'-script.md',import.meta.url),'utf8').replaceAll('\r\n','\n');
  for(const s of rows){
   assert.equal(s.paragraphs.length,3);assert.equal(s.transitionToNext,s.paragraphs.at(-1));
   assert.ok(doc.includes(s.paragraphs.join('\n\n')));
   const slide=slides.find(p=>p.slideKey===s.slideKey)!;
   const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,slide.index);
   assert.equal(w.coverage.slides,738);assert.match(w.compiled,/第16讲仍待建设/);
   assert.ok(!w.compiled.includes(s.paragraphs[0]!));
   assert.doesNotMatch(w.compiled,/spokenSeconds|paragraphs|transitionToNext/);
  }
 }
 for(const pages of researchLessons)for(let i=0;i<pages.length;i++){
  if(pages[i]!.kind!=='question')continue;
  const current=slides.find(p=>p.lesson===(pages===researchLessons[0]?14:15)&&p.localIndex===i+1)!;
  const feedback=pages[i+1]!;
  assert.equal(feedback.kind,'feedback');
  assert.ok(!current.assistantCue.includes(feedback.text[0]??feedback.caption));
 }
 for(const p of researchLessons[0]!.filter(p=>p.abstract||p.model)){
  const index=643+researchLessons[0]!.indexOf(p);
  const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,index);
  assert.ok(w.compiled.includes(p.abstract?.paragraphs[0]??p.model!.provenance));
 }
});
test('public reading pack hashes every included file and excludes transcripts and reference feedback',()=>{
 const root=new URL('../../../apps/teacher-web/public/course-assets/statistical-analysis/research-14-15/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8')) as Record<string,string>;
 for(const [name,hash] of Object.entries(manifest)){
  assert.ok(!/teacher|script|lecture-|\.pdf$/.test(name));
  assert.equal(createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex'),hash);
 }
 const worksheet=readFileSync(new URL('review-worksheet.txt',root),'utf8');
 const guide=readFileSync(new URL('paper-reading-guide.txt',root),'utf8');
 for(const pages of researchLessons)for(const p of pages.filter(p=>p.kind==='feedback'))assert.ok(!worksheet.includes(p.title));
 for(const p of researchLessons[0]!.filter(p=>p.kind==='feedback'))assert.ok(!guide.includes(p.title));
 assert.doesNotMatch(guide,/−0.71%|48万美元/);
 assert.equal((worksheet.match(/### 第/g)??[]).length,12);
});
