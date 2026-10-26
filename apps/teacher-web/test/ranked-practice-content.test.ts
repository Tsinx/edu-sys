import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {rankedPracticePacks,publicPack} from '../../platform-api/src/practice-content/index.js';
import {INTERNATIONAL_MATHEMATICS_LESSONS as lessons,INTERNATIONAL_MATHEMATICS_SLIDES as slides} from '@edu/course-content/international-mathematics';
test('sixteen textbook choice packs have 160 distinct ranked questions and complete private feedback',()=>{
 assert.equal(rankedPracticePacks.length,17);
 assert.equal(new Set(rankedPracticePacks.flatMap(p=>p.questions.map(q=>q.id))).size,184);
 assert.equal(slides.length,1372);
 for(const [i,p]of rankedPracticePacks.filter(p=>p.lesson<=16).entries()){
  assert.equal(p.lesson,i+1);assert.equal(p.questions.length,10);
  assert.deepEqual(p.questions.map(q=>q.rank),[1,1,1,2,2,2,3,3,3,4]);
  assert.equal(lessons.find(l=>l.number===p.lesson)!.practiceQuestionTotal,10);assert.equal(lessons.find(l=>l.number===p.lesson)!.practiceDurationMinutes,20);
  assert.equal(lessons.find(l=>l.number===p.lesson)!.teachingSchedule!.reduce((n,b)=>n+b.durationMinutes,0),90);
  for(const q of p.questions){
   assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);assert.equal(new Set(q.options.map(o=>o.text)).size,4);
   assert.ok(q.options.some(o=>o.id===q.correctOptionId));assert.equal(q.optional,q.rank===4);
   assert.equal(q.source.pdfPage,q.source.printedPage+17);assert.ok(q.source.selection&&q.source.subpart&&q.source.wordingAdaptation&&q.source.optionAdaptation);
   for(const section of q.source.section.split('–'))assert.match(section,/^(?:[1246]\.\d+(?:\.\d+)?|3\.1)$/);
   for(const copy of [q.stem,...q.options.map(o=>o.text)])assert.doesNotMatch(copy,/let students|tell students|ask students to|teacher cue|authoring policy|prompt policy|generation policy/i,q.id);
   if(q.graph){assert.ok(q.graph.xMax>q.graph.xMin&&q.graph.yMax>q.graph.yMin);assert.ok(q.graph.coefficients.every(Number.isFinite));}
   for(const value of [q.stem,...q.options.map(o=>o.text),q.solution,...Object.values(q.optionExplanations)]){
    assert.ok(value.trim().length>0);assert.ok(!/[\u4e00-\u9fff]/.test(value));
    for(const m of value.matchAll(/\$([^$]+)\$/g))katex.renderToString(m[1]!.replaceAll('′',"'"),{throwOnError:true,strict:'error',trust:false});
   }
  }
  const publicJson=JSON.stringify(publicPack(p));
  for(const key of ['correctOptionId','optionExplanations','verification','solution','teachingCue','assistantCue'])assert.ok(!publicJson.includes(`"${key}"`),key);
 }
});

test('revised lessons 4 and 5 align their question scope, version and seventy-minute teaching route',()=>{
 for(const lesson of [4,5]){
  const p=rankedPracticePacks.find(p=>p.lesson===lesson)!;
  assert.equal(p.version,'2.0.0');assert.ok(p.questions.every(q=>q.version==='2.0.0'));
  assert.equal(p.questions.filter(q=>q.source.selection.startsWith('Original supplementary')).length,2);
  const l=lessons.find(l=>l.number===lesson)!;
  assert.deepEqual(l.teachingSchedule?.map(b=>b.durationMinutes),[45,25,20]);
  const core=slides.filter(s=>s.lesson===lesson&&!s.optionalChallenge);
  assert.equal(core.reduce((n,s)=>n+(s.pedagogy?.seconds??0),0),70*60);
 }
 const five=rankedPracticePacks.find(p=>p.lesson===5)!;
 assert.doesNotMatch(five.questions.map(q=>q.stem).join('\n'),/Differentiate|x\^7|x\^8|x\^5|gradient \$405\$/i);
 assert.match(five.questions[6]!.stem,/position.*average speed.*instantaneous speed/);
 assert.match(five.questions[7]!.stem,/h\\ne0/);
 assert.equal(five.questions[9]!.optional,true);
});
