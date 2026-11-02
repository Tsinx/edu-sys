import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_UNALLOCATED_HOURS as reserve,INTEGRAL_METHOD_ACTIVITIES as activities,lesson17Narration,lesson18Narration,economicVisibleCopy,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,getEconomicMathematicsHistoricalCounts as history,getEconomicMathematicsCurrentLesson as mapLesson,integralMethodModel as M} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const pages=slides.filter(p=>p.lesson===17||p.lesson===18),speech={...lesson17Narration,...lesson18Narration};
test('the two method lectures have exact periods, meaningful individual work and preserve all other mathematics',()=>{
 assert.equal(slides.length,1167);assert.equal(lessons.length,30);assert.equal(lessons.reduce((s,l)=>s+l.hours,0)+reserve,64);
 for(const number of[17,18]){const part=pages.filter(p=>p.lesson===number);assert.equal(part.length,44);for(const hour of[1,2]){const span=part.filter(p=>p.classHour===hour);assert.equal(span.length,22);assert.equal(span.reduce((s,p)=>s+p.teachingSeconds!,0),2700);assert.equal(span.filter(p=>p.kind==='exercise').length,2);}assert.equal(part.reduce((s,p)=>s+(p.exerciseMinutes??0),0),36);}
 const old=JSON.parse(readFileSync(new URL('../../../archive/courseware/economic-mathematics/integral-methods-before-2026-11-01/previous-pages.json',import.meta.url),'utf8'));
 for(const p of slides.filter(p=>![17,18].includes(p.lesson))){const prior=old.find((s:{slideKey:string})=>s.slideKey===p.slideKey);assert.ok(prior,p.slideKey);assert.deepEqual(JSON.parse(JSON.stringify(p)),{...prior,index:p.index});}
 assert.equal(history('release-economic-mathematics-integral-merged-2026-11-01')!.reduce((s,n)=>s+n,0),1099);assert.deepEqual(history('release-economic-mathematics-integral-merged-2026-11-01')!.slice(15,18),[35,10,10]);for(const n of[16,17,18,19,30])assert.equal(mapLesson('release-economic-mathematics-integral-merged-2026-11-01',n),n);
});
test('all eight four-question activities are written responses with complete conditions, solutions and scoring',()=>{
 assert.equal(activities.length,8);assert.equal(activities.reduce((s,a)=>s+a.questions.length,0),32);
 for(const a of activities){assert.equal(a.questions.length,4);const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.exerciseMinutes,a.minutes);assert.ok(!p.conceptCheck);assert.equal(p.steps,undefined);
  const copy=economicVisibleCopy(p,{presentationStep:0});
  for(const q of a.questions){assert.equal(q.type,'written');assert.ok(!('options'in q));assert.equal(q.points,10);assert.ok(q.scoring.length>=3);assert.ok(q.explanation.length>30);assert.ok(q.spoken.length>25);assert.ok(copy.includes(q.stem));for(const condition of q.conditions)assert.ok(copy.includes(condition));
   assert.ok(q.steps.length>=2);const feedback=pages.find(p=>p.formula===q.formula&&p.title===`练习${a.number}反馈 · 第${a.questions.indexOf(q)+1}题`&&p.lesson===a.lesson)!;assert.ok(feedback);assert.equal(feedback.steps!.length,q.steps.length);for(const qstep of q.steps)assert.ok(feedback.steps!.some(s=>s.formula===qstep.formula&&s.text===qstep.text));
  }
 }
});
test('every public step parses and hides teacher cues, future answers and controls',()=>{
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0),p.title);const initial=economicVisibleCopy(p,{presentationStep:0});
  for(let step=0;step<=(p.steps?.length??0);step++){
   const d=definition(p),values={...d?.defaults,presentationStep:step};if(d)assert.ok(valid(d,values));
   const html=renderToStaticMarkup(<Slide spec={p} readOnly interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null}/>);
   assert.doesNotMatch(html,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|exerciseActivityId|moduleId|<input|<button/,p.title);
   const copy=economicVisibleCopy(p,values);assert.doesNotMatch(copy,/让学生|告诉学生|先拆掉|今天不先|不背口号|库存|销量|利润|陪域|大写D/,p.title);
   for(const hidden of p.steps?.slice(step)??[])for(const material of[hidden.text,hidden.formula])if(material&&!initial.includes(material)&&!p.steps?.slice(0,step).some(s=>s.text===material||s.formula===material))assert.ok(!copy.includes(material),p.title+':'+hidden.title);
  }
  for(const text of speech[p.slideKey]!)assert.doesNotMatch(text,/\\frac|\\int|\$|让学生|告诉学生|库存|销量|利润/);
 }
});
test('the method dependencies and non-invertible square example make their conditions explicit',()=>{
 const part=pages.filter(p=>p.lesson===17);const index=(title:string)=>part.findIndex(p=>p.title===title);
 assert.ok(index('换元的依据：链式法则')<index('第一类换元需要哪些条件？'));assert.ok(index('第二类换元的区间条件')<index('三角换元为何要选主值区间？'));
 assert.equal(M.square(-1),M.square(1));assert.equal(M.squareSlope(0),0);assert.equal(M.positiveSquareInverse(0),null);assert.equal(M.positiveSquareInverse(-1),null);
 for(const x of[.01,.25,1,4]){assert.ok(M.positiveSquareInverse(x)!>0);assert.ok(Math.abs(M.square(M.positiveSquareInverse(x)!)-x)<1e-12);}
 for(const p of part.filter(p=>p.integralFigure)){const html=renderToStaticMarkup(<Slide spec={p} readOnly interaction={null}/>);assert.match(html,/em-integral-figure/);assert.match(html,p.integralFigure!.kind==='substitution-fold'?/两个输入/:/正支/);}
 assert.ok(pages.some(p=>p.lesson===18&&p.title==='重新出现原积分，是否就有新信息？'));assert.ok(pages.some(p=>p.lesson===18&&p.title==='参数为零时，公式还能照用吗？'));
});
