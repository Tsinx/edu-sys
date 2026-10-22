import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,
 CONTINUITY_DERIVATIVE_EXERCISES as exercises,ECONOMIC_MATHEMATICS_NEXT_LESSON_PLAN as plan,lesson06Narration,lesson07Narration,
 calculusValue,calculusEvidence,calculusCost,calculusCostIncrement,foundationReadout,economicVisibleCopy,getEconomicMathematicsHistoricalCounts as historical,
 getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';

const pages=slides.filter(p=>p.lesson===6||p.lesson===7);
test('continuity and derivative routes have 90 minutes, sufficient individual work, and a coherent dependency order',()=>{
 assert.equal(pages.length,128);assert.equal(new Set(pages.map(p=>p.slideKey)).size,128);
 for(const number of [6,7]){
  const lesson=lessons[number-1]!,part=pages.filter(p=>p.lesson===number);
  assert.equal(part.filter(p=>p.routeRole==='core').length,60);assert.equal(part.filter(p=>p.routeRole==='optional').length,4);
  for(const hour of lesson.classHours!){const span=part.slice(hour.slideStart-1,hour.slideEnd);assert.equal(span.reduce((n,p)=>n+p.teachingSeconds!,0),2700);assert.equal(span.filter(p=>p.conceptCheck).length,6);}
  assert.equal(part.filter(p=>p.conceptCheck).reduce((n,p)=>n+p.exerciseMinutes!,0),24);
  for(const p of part)assert.doesNotMatch(economicVisibleCopy(p,{presentationStep:p.steps?.length??0}),/小组|让学生|告诉学生|先拆掉|不背口号|采购|配送费/);
 }
 const sixth=pages.filter(p=>p.lesson===6),seventh=pages.filter(p=>p.lesson===7);
 for(const [a,b]of[['在一点连续','端点只看'],['区间连续：','介值定理：'],['存在性没有','上界限制']])assert.ok(sixth.findIndex(p=>p.title.includes(a))<sixth.findIndex(p=>p.title.includes(b)));
 for(const [a,b]of[['输入增量与','平均变化率：'],['导数：差商','右导数：'],['切线由','边际成本：'],['局部极值：','费马定理：']]){const ai=seventh.findIndex(p=>p.title.includes(a)),bi=seventh.findIndex(p=>p.title.includes(b));assert.ok(ai>=0&&bi>ai,a+':'+b);}
 assert.ok(seventh.findIndex(p=>p.foundationLab==='derivative-secant')<seventh.findIndex(p=>p.exerciseActivityId==='l7-personal-calculus-01'),'差商须先定义再练习');
 assert.equal(historical('release-economic-mathematics-math-first-2026-10-16')!.reduce((s,n)=>s+n,0),648);
 assert.deepEqual(plan.map(p=>p.number),[10,11,12,13]);assert.equal(plan[0]!.status,'implemented');assert.ok(plan.slice(1).every(p=>p.status==='planned'&&p.minutes===90));
 assert.match(plan[2]!.title,/洛必达/);assert.match(plan[3]!.title,/泰勒/);
});
test('each authored choice and its feedback agree across slide, speech and exercise bank, without premature answers',()=>{
 assert.equal(exercises.length,24);assert.equal(exercises.flatMap(a=>a.questions).length,48);
 for(const a of exercises){const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.table!.columns.length,2);assert.equal(p.steps!.length,2);
  a.questions.forEach((q,i)=>{assert.equal(p.table!.columns[i],`${i+1}. ${q.stem}`);q.options.forEach((o,k)=>assert.equal(p.table!.rows[k]![i],`${'ABCD'[k]}. ${o}`));assert.equal(p.steps![i]!.text,q.explanation);assert.ok(p.steps![i]!.title.endsWith(q.answer));
   for(let step=0;step<=2;step++)assert.equal(economicVisibleCopy(p,{presentationStep:step}).includes(q.explanation),step>i);
  });
 }
 const speech={...lesson06Narration,...lesson07Narration};
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0));for(const t of speech[p.slideKey]!)assert.doesNotMatch(t,/\\frac|\\lim|\$|让学生|小组/);}
});
test('every public reveal parses mathematics and hides private metadata, future feedback and teacher controls',()=>{
 for(const p of pages){const d=definition(p);for(let step=0;step<= (p.steps?.length??0);step++){
  const values={...d?.defaults,presentationStep:step};const html=renderToStaticMarkup(<Slide spec={p} interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null} readOnly/>);
  assert.match(html,/em-limits/);assert.doesNotMatch(html,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
  for(const hidden of p.steps?.slice(step)??[])assert.ok(!html.includes('>'+hidden.title+'</h2>'),p.title+hidden.title);
 }}
});
test('difference quotients, tangent evidence and cost increments have independent algebraic and numerical checks',()=>{
 for(const model of ['square','cube','absolute','cube-root'] as const)for(const a of [-1,0,1])for(const h of [-.5,-.1,.1,.5]){
  const m=calculusEvidence(model,a,h),value=(calculusValue(model,a+h)-calculusValue(model,a))/h;
  assert.ok(Math.abs(m.quotient!-value)<1e-12);assert.ok(Math.abs(m.change-(m.next-m.y))<1e-12);
 }
 assert.equal(calculusEvidence('square',1,0).quotient,null);assert.equal(calculusEvidence('absolute',0,.1).quotient,1);assert.equal(calculusEvidence('absolute',0,-.1).quotient,-1);
 assert.equal(calculusEvidence('absolute',0,.1).derivative,null);assert.equal(calculusEvidence('cube-root',0,.1).derivative,null);
 assert.equal(calculusEvidence('cube',0,1e-6).quotient,1e-12);assert.equal(calculusEvidence('square',1,1e-18).quotient,2);
 for(const q of [0,50,100,199,200])for(const h of [-1,-.1,0,.1,1]){const v=calculusCostIncrement(q,h);if(q+h<0||q+h>200)assert.equal(v,null);else assert.ok(Math.abs(v!-(calculusCost(q+h)!-calculusCost(q)!))<1e-10);}
 assert.equal(calculusCost(100),4200);assert.equal(calculusCostIncrement(100,1),24.02);assert.equal(calculusCostIncrement(100,10),242);assert.equal(calculusCostIncrement(100,-10),-238);assert.equal(calculusCost(201),null);
 for(const x of [-1,-.01,.01,1])assert.ok((x*x+x+1)>0);
 for(const eps of [.0001,.1,2])for(const a of [-3,0,8])for(const fraction of [-.99,-.1,.1,.99]){const h=eps/3*fraction;assert.ok(Math.abs((3*(a+h)+1)-(3*a+1))<eps);}
});
test('the secant experiment has a valid zero state, bounded teacher parameters, and no invalid student readout',()=>{
 const p=pages.find(p=>p.foundationLab==='derivative-secant')!,d=definition(p)!;
 for(const h of [-1,-.05,0,.05,1]){const values={...d.defaults,increment:h};assert.equal(valid(d,values),true);const readout=foundationReadout('derivative-secant',values);assert.doesNotMatch(JSON.stringify(readout),/NaN|Infinity/);assert.equal(readout[2]![1].includes('未定义'),h===0);}
 assert.equal(valid(d,{...d.defaults,increment:1.1}),false);assert.equal(valid(d,{...d.defaults,presentationStep:1}),false);
});
