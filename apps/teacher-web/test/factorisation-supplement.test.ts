import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {practicePackSchema} from '@edu/contracts';
import {FACTORISATION_SLIDES,FACTORISATION_WORKED_EXAMPLES,FACTORISATION_SUPPLEMENT,
 INTERNATIONAL_MATHEMATICS_CORE_SLIDES,INTERNATIONAL_MATHEMATICS_SLIDES,INTERNATIONAL_MATHEMATICS_LESSONS,
 getInternationalMathematicsAdjacentIndex as adjacent,getInternationalMathematicsGlobalIndex as index,
 getInternationalMathematicsLessonPosition,getInternationalMathematicsInteractionDefaults} from '@edu/course-content/international-mathematics';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {factorisationPractice} from '../../platform-api/src/practice-content/factorisation-supplement.js';
import {publicPack} from '../../platform-api/src/practice-content/index.js';

test('40 authored English pages develop exactly eight correct monic worked examples',()=>{
 assert.equal(FACTORISATION_SLIDES.length,40);assert.equal(FACTORISATION_WORKED_EXAMPLES.length,8);
 assert.equal(INTERNATIONAL_MATHEMATICS_CORE_SLIDES.length,1312);
 assert.equal(INTERNATIONAL_MATHEMATICS_SLIDES.length,1352);
 for(const example of FACTORISATION_WORKED_EXAMPLES){
  const [m,n]=example.factors;assert.deepEqual([m*n,m+n,1],example.coefficients,example.id);
  assert.ok(example.pages.length>=2);
  for(const p of example.pages)assert.equal(FACTORISATION_SLIDES[p-1]!.pedagogy?.sequence,example.id);
 }
 const sequences=new Set(FACTORISATION_SLIDES.flatMap(s=>s.pedagogy?.sequence?[s.pedagogy.sequence]:[]));
 assert.equal(sequences.size,8);
 assert.ok(FACTORISATION_SLIDES.filter(s=>s.pedagogy?.role==='checkpoint').length>=4);
 assert.ok(FACTORISATION_SLIDES.filter(s=>s.pedagogy?.role==='misconception').length>=2);
 assert.equal(FACTORISATION_SLIDES.reduce((n,s)=>n+s.pedagogy!.seconds!,0),2400);
 assert.doesNotMatch(FACTORISATION_SUPPLEMENT.teacherGuide,/[\u3400-\u9fff]/);
 for(const s of FACTORISATION_SLIDES){
  assert.equal(s.source.pdfPages[0],144);assert.equal(s.source.printedPages[0],127);assert.ok(s.source.supplement);
  const values=s.elements.flatMap(e=>e.kind==='text'?[e.text]:e.kind==='math'?[e.tex]:e.kind==='table'?[...e.columns,...e.rows.flat()]:[]);
  assert.doesNotMatch([s.title,s.kicker,s.question,s.answer,...values].join('\n'),/[\u3400-\u9fff]|let students|tell students|teacher cue|authoring policy/i,s.slideKey);
  for(const e of s.elements){
   assert.ok(e.x>=60&&e.y>=220&&e.x+e.w<=1540&&e.y+e.h<=855,s.slideKey);
   if(e.kind==='math')assert.doesNotThrow(()=>katex.renderToString(e.tex,{throwOnError:true,strict:'ignore',trust:false}),s.slideKey);
  }
  if(s.answer)assert.equal(getInternationalMathematicsInteractionDefaults(s.slideKey)?.revealed,false);
 }
});

test('teaching order inserts the supplement after Lecture 3 while all old indices stay stable',()=>{
 assert.deepEqual(INTERNATIONAL_MATHEMATICS_LESSONS.map(l=>l.number),[1,2,3,17,4,5,6,7,8,9,10,11,12,13,14,15,16]);
 assert.equal(index(4),235);assert.equal(index(17),1313);
 assert.equal(adjacent(234,1),1313);assert.equal(adjacent(1313,-1),234);
 assert.equal(adjacent(1352,1),235);assert.equal(adjacent(235,-1),1352);
 assert.equal(adjacent(1,-1),null);assert.equal(adjacent(1312,1),null);
 const visited:number[]=[];let n:number|null=1;
 while(n!==null){visited.push(n);assert.ok(visited.length<=1352);n=adjacent(n,1);}
 assert.equal(new Set(visited).size,1352);
 assert.equal(visited.at(-1),1312);
 for(const [i,s] of INTERNATIONAL_MATHEMATICS_CORE_SLIDES.entries()){
  assert.equal(s.index,i+1);assert.equal(INTERNATIONAL_MATHEMATICS_SLIDES[i]!.slideKey,s.slideKey);
 }
 assert.equal(getInternationalMathematicsLessonPosition(1313)?.lessonNumber,17);
 assert.equal(getInternationalMathematicsLessonPosition(235)?.lessonNumber,4);
 const deck=getCourseDeckByCourseId('course-international-mathematics')!;
 assert.equal(deck.totalHours,32);assert.equal(deck.lessons[3]!.kind,'supplement');
 assert.equal(deck.lessons[3]!.supplementDurationMinutes,40);assert.equal(deck.getAdjacentIndex!(234,1),1313);
});

test('the 24-question bank has ranks 8/8/6/2 and releases no private feedback',()=>{
 const p=factorisationPractice;
 assert.equal(p.questions.length,24);assert.deepEqual([1,2,3,4].map(r=>p.questions.filter(q=>q.rank===r).length),[8,8,6,2]);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,24);
 for(const q of p.questions){
  assert.equal(new Set(q.options.map(o=>o.text)).size,4);assert.ok(q.options.some(o=>o.id===q.correctOptionId));
  assert.ok(q.source.wordingAdaptation.includes('not a reproduced'));assert.equal(q.optional,q.rank===4);
  for(const copy of [q.stem,q.solution,...q.options.map(o=>o.text),...Object.values(q.optionExplanations)]){
   assert.doesNotMatch(copy,/[\u3400-\u9fff]/);
   for(const match of copy.matchAll(/\$([^$]+)\$/g))assert.doesNotThrow(()=>katex.renderToString(match[1]!,{throwOnError:true,strict:'error',trust:false}));
  }
 }
 const visible=publicPack(p),serialized=JSON.stringify(visible);
 for(const field of ['correctOptionId','solution','optionExplanations','verification'])assert.ok(!serialized.includes(`"${field}"`),field);
 assert.equal(practicePackSchema.safeParse({...visible,questions:visible.questions.slice(0,10)}).success,false);
 assert.equal(practicePackSchema.safeParse({...visible,lesson:3}).success,false);
});
