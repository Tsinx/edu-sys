import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_UNALLOCATED_HOURS as reserve,ECONOMIC_MATHEMATICS_HOMEWORK_02 as hw,APPLICATION_ACTIVITIES as activities,lesson12Narration,lesson13Narration,chordEvidence,familyExtrema,shapeModels as M,economicVisibleCopy,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,getEconomicMathematicsCurrentLesson as mapLesson,getEconomicMathematicsHistoricalCounts as history,ECONOMIC_MATHEMATICS_RESERVE_PLAN as planned} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const pages=slides.filter(p=>p.lesson===12||p.lesson===13),speech={...lesson12Narration,...lesson13Narration};
test('merged and renumbered lessons retain honest hours and independently keyed 30/44-page routes',()=>{
 assert.equal(lessons.length,30);assert.equal(reserve,5);assert.equal(lessons.reduce((n,l)=>n+l.hours,0)+reserve,64);
 for(const [n,count] of [[12,30],[13,44]]){const part=pages.filter(p=>p.lesson===n);assert.equal(part.length,count);for(const h of [1,2])assert.equal(part.filter(p=>p.classHour===h).reduce((n,p)=>n+p.teachingSeconds!,0),2700);}
 assert.equal(slides.find(p=>p.lesson===16&&p.localIndex===1)!.unit,5);
 assert.equal(planned.status,'planned');assert.match(planned.title,/泰勒/);
 assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',13),12);
 assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',14),13);
 assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',32),30);
 assert.equal(mapLesson('release-economic-mathematics-applications-2026-10-30',14),14);
 assert.equal(history('release-economic-mathematics-operators-2026-10-29')!.length,32);
 const old=JSON.parse(readFileSync(new URL('../../../archive/courseware/economic-mathematics/applications-before-merge-2026-10-30/previous-pages.json',import.meta.url),'utf8'));
 assert.equal(old.filter((p:{lesson:number})=>p.lesson===12).length,56);
 for(const p of slides.filter(p=>p.lesson>=19)){assert.equal(p.sourceLesson,p.lesson+2);assert.equal(p.sourceLocalIndex,p.localIndex);}
});
test('every public state parses and narration covers it without publishing hidden feedback or authoring metadata',()=>{
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0),p.title);
  for(let step=0;step<=(p.steps?.length??0);step++){
   const d=definition(p),values={...d?.defaults,presentationStep:step};if(d)assert.ok(valid(d,values));
   const markup=renderToStaticMarkup(<Slide spec={p} readOnly interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null}/>);
   assert.doesNotMatch(markup,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
   assert.doesNotMatch(economicVisibleCopy(p,values),/让学生|告诉学生|先拆掉|今天不先|不背口号|陪域|非退化|C\[a,b\]/,p.title);
   for(const hidden of p.steps?.slice(step)??[])assert.ok(!markup.includes('>'+hidden.title+'</h2>'));
  }
 }
 const chord=pages.find(p=>p.shapeFigure?.chordAt===1)!;
 const d=definition(chord)!;
 const initial=renderToStaticMarkup(<Slide spec={chord} readOnly interaction={{deckId,slideId:chord.slideKey,revision:1,values:d.defaults}}/>);
 assert.ok(!initial.includes('弦线 2'));assert.ok(!initial.includes('λ='));
 const fullChord=renderToStaticMarkup(<Slide spec={chord} readOnly interaction={{deckId,slideId:chord.slideKey,revision:1,values:{...d.defaults,presentationStep:1}}}/>);assert.ok(!fullChord.includes('λ='),'weight notation follows its definition on the next page');assert.ok(!economicVisibleCopy(chord,{}).includes('弦线上中点为'));
});
test('eight platform activities and a sixty-minute homework use the same checked answers and full scoring',()=>{
 assert.equal(activities.length,8);assert.equal(activities.reduce((n,a)=>n+a.questions.length,0),21);
 assert.equal(activities[0]!.minutes,10);assert.equal(activities[0]!.questions.reduce((n,q)=>n+q.minutes,0),10);
 assert.equal(activities[0]!.questions.filter(q=>q.type==='single').map(q=>q.answer).join(''),'BACDB C DA'.replaceAll(' ',''));
 for(const a of activities){assert.ok(pages.some(p=>p.exerciseActivityId===a.id));for(const q of a.questions){if(q.options){assert.equal(q.options.length,4);assert.match(q.answer,/^[ABCD]$/);}else assert.ok(q.scoring?.length);assert.ok(q.explanation.length>15);}}
 assert.equal(hw.questions.length,12);assert.equal(hw.questions.reduce((n,q)=>n+q.points,0),100);assert.equal(hw.questions.reduce((n,q)=>n+q.minutes,0),60);assert.equal(hw.deadlineDays,7);
 assert.ok(hw.questions.every(q=>!q.stem.includes('证明柯西')));assert.match(hw.instructions,/不使用泰勒/);
});
test('geometric and parameter evidence agrees with independent identities and boundary comparisons',()=>{
 for(const sign of [-1,1] as const)for(const lambda of [0,.1,.5,.9,1]){
  const e=chordEvidence(sign,-1,2,lambda);assert.ok(Math.abs(e.gap-sign*lambda*(1-lambda)*9)<1e-12);
 }
 for(const a of [-1,0,.5,2,3,4,6,12,20]){
  const e=familyExtrema(a);for(const x of e.stationary)assert.ok(Math.abs(M.familyDerivative(x,a))<1e-10);
  for(let i=0;i<=1000;i++){const v=M.family(-2+4*i/1000,a);assert.ok(v>=e.min-1e-9&&v<=e.max+1e-9);}
  assert.ok(e.inflections.every(x=>Math.abs(x)<2));
 }
 for(const h of [.16,.1,.01]){const residual=Math.sqrt(4+h)-2-h/4,exact=-h*h/(4*(Math.sqrt(4+h)+2)**2);assert.ok(Math.abs(residual-exact)<1e-14);assert.ok(Math.abs(residual)<=h*h/64);}
 const x=1/(2*Math.PI*100),y=1/(201*Math.PI);
 const oscDerivative=(z:number)=>4*z**3*(2+Math.sin(1/z))-z*z*Math.cos(1/z);
 assert.ok(oscDerivative(x)<0&&oscDerivative(y)>0);
 for(const z of [-.01,.01]){const v=(1/z-1/Math.expm1(z));assert.ok(Math.abs(v-.5)<.001);}
});
