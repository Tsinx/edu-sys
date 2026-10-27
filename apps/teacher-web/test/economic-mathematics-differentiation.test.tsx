import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,DIFFERENTIATION_EXERCISES as bank,lesson08Narration,lesson09Narration,lesson10Narration,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,economicVisibleCopy,foundationReadout,differentialCostEvidence,differentiationModels as M,getEconomicMathematicsHistoricalCounts as historical} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
import {DIFFERENTIATION_WRITTEN_EXERCISES as written} from '@edu/course-content/economic-mathematics';
const pages=slides.filter(p=>p.lesson>=8&&p.lesson<=10),speech={...lesson08Narration,...lesson09Narration,...lesson10Narration};

test('every main-route individual task has a platform source and written feedback remains on the following page',()=>{
 assert.equal(written.length,7);
 for(const n of [8,9,10])assert.equal(pages.filter(p=>p.lesson===n&&p.exerciseActivityId).length,n===8?13:n===9?14:20);
 const ids=new Set([...bank,...written].map(a=>a.id));
 for(const p of pages.filter(p=>p.routeRole==='core'&&p.kind==='exercise'))assert.ok(p.exerciseActivityId&&ids.has(p.exerciseActivityId),p.title);
 for(const a of written){const i=pages.findIndex(p=>p.exerciseActivityId===a.id),p=pages[i]!;
  assert.ok(i>=0);assert.equal(p.lesson,a.lesson);assert.equal(p.exerciseMinutes,a.minutes);assert.equal(p.teachingSeconds,a.minutes*60);
  assert.match(pages[i+1]!.title,/反馈/);assert.ok(a.scoring.length>=2);
  assert.ok(!economicVisibleCopy(p,{}).includes(a.answer));
 }
});
test('three coherent 90-minute routes preserve practice time and stable historical positions',()=>{
 assert.equal(pages.length,203);assert.equal(new Set(pages.map(p=>p.slideKey)).size,203);
 for(const n of [8,9,10]){const part=pages.filter(p=>p.lesson===n);assert.equal(part.filter(p=>p.routeRole==='core').length,n===10?61:60);assert.equal(part.filter(p=>p.routeRole==='optional').length,n===10?14:4);
 for(const h of lessons[n-1]!.classHours!){const span=part.slice(h.slideStart-1,h.slideEnd);assert.equal(span.reduce((s,p)=>s+p.teachingSeconds!,0),2700);assert.equal(span.filter(p=>p.conceptCheck).length,6);}
 assert.equal(part.filter(p=>p.conceptCheck&&p.routeRole==='core').reduce((s,p)=>s+p.exerciseMinutes!,0),24);}
 assert.equal(historical('release-economic-mathematics-analysis-2026-10-22')![9],64);
 assert.deepEqual(historical('release-economic-mathematics-continuity-derivative-2026-10-17')!.slice(5,10),[64,64,10,10,10]);
 for(const [n,a,b] of [[8,'乘积的增量','乘积法则中的'],[9,'给中间变量','链式法则：'],[9,'反函数先要','反函数导数的标准'],[10,'二阶导数：','一次可导，'],[10,'可导的等价','微分：固定']] as const){const part=pages.filter(p=>p.lesson===n);assert.ok(part.findIndex(p=>p.title.includes(a))<part.findIndex(p=>p.title.includes(b)));}
});
test('every formula, page script and revealed exercise is aligned; hidden answers stay out of public material',()=>{
 assert.equal(bank.length,40);assert.equal(bank.flatMap(a=>a.questions).length,80);
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0));
 for(let step=0;step<=(p.steps?.length??0);step++){const d=definition(p),values={...d?.defaults,presentationStep:step},copy=economicVisibleCopy(p,values);
 const markup=renderToStaticMarkup(<Slide spec={p} interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null} readOnly/>);
 assert.doesNotMatch(markup,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
 assert.doesNotMatch(copy,/让学生|告诉学生|今天不先|先拆掉|小组/);
 for(const hidden of p.steps?.slice(step)??[])assert.ok(!markup.includes('>'+hidden.title+'</h2>'),p.title);
 }}
 for(const a of bank){const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);a.questions.forEach((q,i)=>{assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.match(q.answer,/^[ABCD]$/);assert.equal(p.table!.columns[i],`${i+1}. ${q.stem}`);q.options.forEach((o,k)=>assert.equal(p.table!.rows[k]![i],`${'ABCD'[k]}. ${o}`));for(let step=0;step<=2;step++)assert.equal(economicVisibleCopy(p,{presentationStep:step}).includes(q.explanation),step>i);});}
});
test('differential operations follow their conditions and keep new page identity separate from the archived lesson',()=>{
 const p=pages.filter(p=>p.lesson===10),at=(s:string)=>p.findIndex(p=>p.title.includes(s));
 assert.ok(at('微分：固定')<at('常数、常倍'));
 assert.ok(at('乘积的真实')<at('交叉项为什么'));
 assert.ok(at('交叉项为什么')<at('乘积微分：'));
 assert.ok(at('商的微分')<at('复合微分：'));
 assert.ok(at('复合微分：')<at('根式估算：'));
 assert.match(p[at('商的微分')]!.formula!,/v\(a\).*ne0/);
 assert.ok(p.every(p=>p.slideKey.includes('-calculus-rules-20261026-')));
 assert.ok(pages.filter(p=>p.lesson===8||p.lesson===9).every(p=>p.slideKey.includes('-calculus-20261020-')));
 for(const id of ['l10-written-product-cross','l10-written-mixed-domain'])assert.equal(p.find(p=>p.exerciseActivityId===id)!.routeRole,'optional');
});
test('exact residuals, derivative chains and corresponding inverse points agree independently',()=>{
 for(const a of [1,50,100,198])for(const h of [-10,-1,-.01,0,.01,1,2,10]){const m=differentialCostEvidence(a,h);if(a+h<0||a+h>200){assert.equal(m,null);continue;}assert.ok(m);const C=(q:number)=>2000+20*q+.02*q*q;
 assert.ok(Math.abs(m.actual-(C(a+h)-C(a)))<1e-10);assert.ok(Math.abs((m.actual-m.differential)-.02*h*h)<1e-10);assert.equal(m.relativeError===null,h===0);}
 assert.equal(differentialCostEvidence(100,NaN),null);assert.equal(differentialCostEvidence(201,0),null);
 for(const h of [-1,-.04,.04,1])assert.ok(Math.abs(M.sqrtResidual(h)!-(Math.sqrt(4+h)-2-h/4))<1e-14);
 assert.equal(M.chainInput(1),4);assert.equal(M.chainOutput(4),16);assert.equal(M.circle(3,1),4);assert.equal(M.circleSlope(3,4),-.75);assert.equal(M.circleSlope(5,0),null);
 assert.equal(M.salesRate(4),168);assert.equal(M.salesRate(6),156);assert.equal(M.salesSecond(6),-12);
 assert.ok(.02*(400/33)**2/(24*(400/33)+.02*(400/33)**2)-.01<1e-12);
 assert.equal((1/(2*Math.sqrt(4)))*(2*2),1);
});
test('the linear approximation experiment has a meaningful zero, validated teacher ranges, and safe student readouts',()=>{
 const p=pages.find(p=>p.foundationLab==='differential-error')!,d=definition(p)!;
 for(const h of [-20,-10,-.5,0,.5,10,20]){const values={...d.defaults,increment:h};assert.ok(valid(d,values));const r=foundationReadout('differential-error',values);assert.doesNotMatch(JSON.stringify(r),/NaN|Infinity/);assert.equal(r[4]![1].includes('未定义'),h===0);}
 assert.equal(valid(d,{...d.defaults,increment:21}),false);assert.equal(valid(d,{...d.defaults,presentationStep:1}),false);
});
