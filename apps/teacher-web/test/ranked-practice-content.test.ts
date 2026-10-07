import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {rankedPracticePacks,publicPack} from '../../platform-api/src/practice-content/index.js';
import {INTERNATIONAL_MATHEMATICS_LESSONS as lessons,INTERNATIONAL_MATHEMATICS_SLIDES as slides} from '@edu/course-content/international-mathematics';
test('sixteen textbook choice packs have 160 distinct ranked questions and complete private feedback',()=>{
 assert.equal(rankedPracticePacks.length,16);
 assert.equal(new Set(rankedPracticePacks.flatMap(p=>p.questions.map(q=>q.id))).size,160);
 assert.equal(slides.length,1312);
 for(const [i,p]of rankedPracticePacks.entries()){
  assert.equal(p.lesson,i+1);assert.equal(p.questions.length,10);
  assert.deepEqual(p.questions.map(q=>q.rank),[1,1,1,2,2,2,3,3,3,4]);
  assert.equal(lessons[i]!.practiceQuestionTotal,10);assert.equal(lessons[i]!.practiceDurationMinutes,20);
  assert.equal(lessons[i]!.teachingSchedule!.reduce((n,b)=>n+b.durationMinutes,0),90);
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
