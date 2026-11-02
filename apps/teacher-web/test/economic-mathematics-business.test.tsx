import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,businessModel as M,businessOptimum,capacityValue,capacityMarginalValue,finiteBusinessChange,businessReadout,BUSINESS_ACTIVITIES as activities,lesson14Narration,lesson15Narration,economicVisibleCopy,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,getEconomicMathematicsHistoricalCounts as history,getEconomicMathematicsCurrentLesson as mapLesson} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const pages=slides.filter(p=>p.lesson===14||p.lesson===15),speech={...lesson14Narration,...lesson15Narration};
const close=(a:number,b:number,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('business lessons have individually timed market routes and preserve the preceding 31-lesson release',()=>{
 assert.equal(pages.length,110);assert.equal(lessons.length,30);assert.equal(slides.length,1167);
 for(const n of[14,15])for(const h of[1,2]){const p=pages.filter(p=>p.lesson===n&&p.classHour===h);assert.equal(p.length,n===14?28:27);assert.equal(p.reduce((s,p)=>s+p.teachingSeconds!,0),2700);}
 const old=JSON.parse(readFileSync(new URL('../../../archive/courseware/economic-mathematics/business-before-market-2026-10-31/previous-pages.json',import.meta.url),'utf8'));
 for(const p of slides.filter(p=>p.lesson<14)){const prior=old.find((s:{slideKey:string})=>s.slideKey===p.slideKey);assert.deepEqual(JSON.parse(JSON.stringify(p)),{...prior,index:p.index});}
 assert.equal(history('release-economic-mathematics-applications-2026-10-30')!.length,31);assert.deepEqual(history('release-economic-mathematics-applications-2026-10-30')!.slice(13,15),[10,10]);
 assert.equal(mapLesson('release-economic-mathematics-applications-2026-10-30',14),14);assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',15),14);
});
test('marginal, discrete and capacity calculations agree independently across boundaries',()=>{
 for(const q of[0,20,300,399,400,410,800]){
  close(M.revenue(q)-M.cost(q),M.profit(q));
  close(M.marginalRevenue(q)-M.marginalCost(q),M.marginalProfit(q));
  for(const h of[1,5,50]){const d=finiteBusinessChange(q,h);close(M.revenue(q+h)-M.revenue(q),d.revenue);close(M.cost(q+h)-M.cost(q),d.cost);close(M.profit(q+h)-M.profit(q),d.profit);}
 }
 for(const K of[0,100,300,350,400,800,1200])for(const tax of[0,12,24,96,120]){
  const o=businessOptimum(K,2000,tax);assert.ok(o.quantity>=0&&o.quantity<=K);
  for(let i=0;i<=1000;i++)assert.ok(M.profit(K*i/1000,2000,tax)<=o.profit+1e-7);
 }
 close(capacityValue(350)-capacityValue(300),900);close(capacityMarginalValue(300),24);close(capacityMarginalValue(400),0);
 close(M.revenue(401)-M.revenue(400),39.9);close(M.cost(401)-M.cost(400),40.02);close(M.averageCost(400)!,37);
 for(const q of[50,200,400]){const h=.001,numeric=(M.averageCost(q+h)!-M.averageCost(q-h)!)/(2*h);close(numeric,(M.marginalCost(q)-M.averageCost(q)!)/q);}
 close(businessOptimum(1200,25000).quantity,400);close(businessOptimum(1200,2000,24).price,90);
});
test('elasticities, finite income effects and counterexamples retain the required conditions',()=>{
 close(M.elasticity(40)!, .5);close(M.elasticity(60)!,1);close(M.elasticity(80)!,2);assert.equal(M.elasticity(120),null);assert.equal(M.elasticity(0),null);
 for(const p of[20,40,60,80,100]){const q=M.quantity(p),E=M.elasticity(p)!;close(q*(1-E),1200-20*p);close(p*(1-1/E),M.marginalRevenue(q));for(const a of[.01,100])for(const b of[.1,10])close(-(a/b)*(-10)*(b*p)/(a*q),E);}
 close((M.revenuePrice(84)-M.revenuePrice(80))/M.revenuePrice(80),-.055);close(.05-.1+.05*(-.1),-.055);
 close(-M.revenueMinimumDerivative(1)/M.revenueMinimumQuantity(1),1);
 for(const p of[.8,.9,1,1.1,1.2]){assert.ok(M.revenueMinimumQuantity(p)>0);assert.ok(M.revenueMinimumDerivative(p)<0);assert.ok(p*M.revenueMinimumQuantity(p)>=100-1e-8);}
 close(M.powerProfit(60),2000);close(M.powerQuantity(75),64);close(M.powerProfit(75),1880);close((75-30)/75,.6);
 for(let i=0;i<=1000;i++){const p=30+.09*i;assert.ok(M.powerProfit(p)<=2000+1e-8);if(p>=75)assert.ok(M.powerProfit(p)<=1880+1e-8);}
 close(M.quantity(80),2560000/80**2);close(-2*2560000/80**3,-10);assert.notEqual(M.quantity(100),2560000/100**2);
});
test('all public reveal states parse while teacher metadata and undisclosed feedback stay private',()=>{
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0),p.title);
  for(let step=0;step<=(p.steps?.length??0);step++){
   const d=definition(p),values={...d?.defaults,presentationStep:step};if(d)assert.ok(valid(d,values));
   const markup=renderToStaticMarkup(<Slide spec={p} readOnly interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null}/>);
   assert.doesNotMatch(markup,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
   const publicCopy=economicVisibleCopy(p,values);assert.doesNotMatch(publicCopy,/让学生|告诉学生|先拆掉|今天不先|不背口号|陪域|非退化|尚未制作|模板/,p.title);
   for(const hidden of p.steps?.slice(step)??[])assert.ok(!publicCopy.includes(hidden.title));
  }
 }
});
test('sixteen independent activities carry the same questions, staged feedback and written scoring',()=>{
 assert.equal(activities.length,16);assert.equal(activities.reduce((n,a)=>n+a.questions.length,0),28);
 for(const lesson of[14,15]){const bank=activities.filter(a=>a.lesson===lesson);assert.equal(bank.length,8);assert.equal(bank.reduce((n,a)=>n+a.minutes,0),24);}
 for(const a of activities){const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.exerciseMinutes,a.minutes);
  for(const q of a.questions){assert.ok(q.answer&&q.explanation.length>20);if(q.options){assert.equal(q.options.length,4);assert.match(q.answer,/^[ABCD]$/);assert.ok(p.steps!.some(s=>s.title.endsWith(q.answer)&&s.text===q.explanation));}else{assert.ok(q.scoring?.length);assert.equal(q.points,10);}}
 }
});
test('page-scoped market labs validate and publish their own model readouts',()=>{
 for(const p of pages.filter(p=>p.businessLab)){
  const d=definition(p)!;assert.ok(valid(d,d.defaults));assert.ok(!valid(d,{...d.defaults,presentationStep:.5}));assert.ok(!valid(d,{...d.defaults,presentationStep:1}));
  if(p.businessLab==='market-elasticity'){assert.ok(!valid(d,{...d.defaults,marketPrice:300}));assert.ok(!valid(d,{...d.defaults,menuSlowPrice:99}));assert.ok(economicVisibleCopy(p,d.defaults).includes('点弹性 E：0.5'));}
  else {assert.ok(!valid(d,{...d.defaults,menuFastPrice:331}));assert.ok(!valid(d,{...d.defaults,marketPrice:100}));assert.ok(economicVisibleCopy(p,d.defaults).includes('两类合计利润：262'));}
 }
});
