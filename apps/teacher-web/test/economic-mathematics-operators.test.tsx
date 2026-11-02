import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,OPERATOR_SUPPLEMENT_EXERCISES as bank,OPERATOR_SUPPLEMENT_ROUTE as route,lesson10Narration as speech,operatorEvidence as M,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,economicVisibleCopy,getEconomicMathematicsHistoricalCounts as history} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const lesson=slides.filter(p=>p.lesson===10),pages=lesson.filter(p=>p.moduleId?.startsWith('operators-'));
const old=JSON.parse(readFileSync(new URL('../../../archive/courseware/economic-mathematics/lesson-10-before-operators-2026-10-29/previous-pages.json',import.meta.url),'utf8'));
test('operator supplement appends without changing the 75-page mathematical content or original 90-minute route',()=>{
 assert.equal(lesson.length,107);assert.equal(pages.length,32);assert.equal(route.minutes,45);
 assert.equal(pages.slice(0,23).reduce((n,p)=>n+p.teachingSeconds!,0),1800);assert.equal(pages.slice(23).reduce((n,p)=>n+p.teachingSeconds!,0),900);
 assert.ok(pages.every(p=>p.routeRole==='optional'));
 for(const hour of lessons[9]!.classHours!)assert.equal(lesson.slice(hour.slideStart-1,hour.slideEnd).reduce((n,p)=>n+p.teachingSeconds!,0),2700);
 const strip=(p:Record<string,unknown>)=>{const {localTotal:_,...rest}=JSON.parse(JSON.stringify(p));return rest;};
 assert.deepEqual(lesson.slice(0,75).map(p=>strip(p as unknown as Record<string,unknown>)),old.map(strip));
 assert.equal(history('release-economic-mathematics-differential-rules-2026-10-26')![9],75);
 assert.equal(new Set(slides.map(p=>p.slideKey)).size,slides.length);
 assert.ok(pages.every(p=>p.slideKey.startsWith('em-l10-calculus-operators-20261029-')));
});
test('all new pages, formulas, diagrams and reveal scripts render without exposing teacher metadata or hidden feedback',()=>{
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0),p.title);
  for(let step=0;step<=(p.steps?.length??0);step++){const d=definition(p),values={...d?.defaults,presentationStep:step};
   if(d)assert.ok(valid(d,values));
   const markup=renderToStaticMarkup(<Slide spec={p} interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null} readOnly/>);
   assert.ok(markup.includes(`data-slide-composition="${p.compositionId}"`));
   assert.doesNotMatch(markup,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
   assert.doesNotMatch(economicVisibleCopy(p,values),/让学生|告诉学生|先拆掉|今天不先|陪域|泛函|切空间/);
   for(const hidden of p.steps?.slice(step)??[])assert.ok(!markup.includes('>'+hidden.title+'</h2>'));
  }
 }
 assert.equal(pages.filter(p=>p.operatorFigure).length,3);
});
test('six individual choice groups and two layered written tasks share one source with the platform',()=>{
 assert.equal(bank.length,8);assert.equal(pages.filter(p=>p.exerciseActivityId).length,8);
 assert.equal(bank.reduce((n,a)=>n+('questions'in a?a.questions.length:1),0),14);
 for(const a of bank){const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.exerciseMinutes,a.minutes);
  if('questions'in a){a.questions.forEach((q,i)=>{assert.equal(q.options.length,4);assert.match(q.answer,/^[ABCD]$/);assert.equal(new Set(q.options).size,4);assert.equal(p.table!.columns[i],`${i+1}. ${q.stem}`);q.options.forEach((o,k)=>assert.equal(p.table!.rows[k]![i],`${'ABCD'[k]}. ${o}`));
   assert.ok(!economicVisibleCopy(p,{}).includes(q.explanation));assert.ok(economicVisibleCopy(p,{presentationStep:i+1}).includes(q.explanation));});
  }else{assert.equal(p.teachingSeconds,a.minutes*60);assert.ok(!economicVisibleCopy(p,{}).includes(a.answer));assert.match(pages[pages.indexOf(p)+1]!.title,/反馈/);assert.equal(a.scoring.length,4);}
 }
});
test('native diagrams and layered counterexamples agree with independent arithmetic',()=>{
 for(const x of [-3,-1,0,1,2]){assert.equal(M.absolute(x),Math.abs(x));assert.equal(M.transformed(x),Math.abs(M.source(x)));}
 for(const h of [-.3,-.1,.1,.3]){assert.ok(Math.abs(M.incrementAtOne(h)-(M.square(1+h)-1))<1e-14);assert.equal(M.differentialAtOne(h),2*h);assert.ok(Math.abs(M.incrementAtOne(h)-M.differentialAtOne(h)-h*h)<1e-14);}
 assert.equal(M.secondChain(2,2,2,2),12);assert.equal(M.secondChain(1,0,2,2),2);
 assert.equal(M.secondChain(2,2,2,0),8);
 assert.equal(1*0,0); // The first-order chain holds even when the inner coefficient vanishes.
 const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)));
 const slope=(f:(x:number)=>number,a:number)=>{const h=1e-5;return(f(a+h)-f(a-h))/(2*h);};
 close(slope(x=>Math.exp(2*x),.4),2*Math.exp(.8));close(slope(y=>Math.sqrt(y),4),.25);
 const cubeRootRatio=(h:number)=>Math.cbrt(h)/h;assert.ok(cubeRootRatio(.000001)>cubeRootRatio(.001));
});
