import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_UNALLOCATED_HOURS as reserve,INTEGRAL_ACTIVITIES as activities,lesson16Narration,integralModel as M,integralReadout,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,economicVisibleCopy,getEconomicMathematicsHistoricalCounts as history,getEconomicMathematicsCurrentLesson as mapLesson} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const pages=slides.filter(p=>p.lesson===16),speech=lesson16Narration;
const close=(a:number,b:number,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('one merged lecture preserves two exact hours and shifts later lectures without changing their mathematics',()=>{
 assert.equal(lessons.length,30);assert.equal(slides.length,1167);assert.equal(pages.length,35);assert.equal(reserve,5);assert.equal(lessons.reduce((s,l)=>s+l.hours,0)+reserve,64);
 for(const hour of[1,2]){const span=pages.filter(p=>p.classHour===hour);assert.equal(span.length,hour===1?17:18);assert.equal(span.reduce((s,p)=>s+p.teachingSeconds!,0),2700);}
 const intro=pages.filter(p=>p.localIndex<=7);assert.equal(intro.filter(p=>p.exerciseActivityId).length,1);assert.ok(intro.reduce((s,p)=>s+p.teachingSeconds!,0)<=900);
 const old=JSON.parse(readFileSync(new URL('../../../archive/courseware/economic-mathematics/integral-before-merge-2026-11-01/previous-pages.json',import.meta.url),'utf8'));
 for(const p of slides.filter(p=>p.lesson<16)){const prior=old.find((s:{slideKey:string})=>s.slideKey===p.slideKey);assert.deepEqual(JSON.parse(JSON.stringify(p)),prior);}
 const labels=(s:unknown):unknown=>typeof s==='string'?s.replace(/第(\d+)([—–-])(\d+)讲/g,(_m,a:string,d:string,b:string)=>'第'+(Number(a)>=17?Number(a)-1:a)+d+(Number(b)>=17?Number(b)-1:b)+'讲').replace(/第(\d+)讲/g,(_m,n:string)=>'第'+(Number(n)>=17?Number(n)-1:n)+'讲'):Array.isArray(s)?s.map(labels):s&&typeof s==='object'?Object.fromEntries(Object.entries(s).map(([k,v])=>[k,labels(v)])):s;
 for(const p of slides.filter(p=>p.lesson>=19)){const prior=old.find((s:{slideKey:string})=>s.slideKey===p.slideKey);assert.ok(prior);assert.equal(p.lesson,prior.lesson-1);assert.equal(p.sourceLesson,prior.sourceLesson);for(const field of ['title','formula','body','table','steps'] as const)assert.deepEqual(JSON.parse(JSON.stringify(p[field]??null)),labels(prior[field]??null),p.slideKey+':'+field);}
 const counts=history('release-economic-mathematics-integral-foundations-2026-11-01')!;assert.equal(counts.reduce((s,n)=>s+n,0),1138);assert.deepEqual(counts.slice(15,17),[34,40]);
 for(const [oldLesson,current] of[[16,16],[17,16],[18,17],[19,18],[31,30]])assert.equal(mapLesson('release-economic-mathematics-integral-foundations-2026-11-01',oldLesson!),current);
 assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',13),12);assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',18),16);assert.equal(mapLesson('release-economic-mathematics-operators-2026-10-29',32),30);
});
test('every public state parses and narration covers it without private cues or unrevealed answer material',()=>{
 for(const p of pages){assert.equal(speech[p.slideKey]!.length,1+(p.steps?.length??0),p.title);
  const initial=economicVisibleCopy(p,{presentationStep:0});
  for(let step=0;step<=(p.steps?.length??0);step++){
   const d=definition(p),values={...d?.defaults,presentationStep:step};if(d)assert.ok(valid(d,values));
   const markup=renderToStaticMarkup(<Slide spec={p} readOnly interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null}/>);
   assert.doesNotMatch(markup,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|exerciseActivityId|<input|<button/,p.title);
   const copy=economicVisibleCopy(p,values);assert.doesNotMatch(copy,/让学生|告诉学生|先拆掉|今天不先|不背口号|价格|销量|利润|成本|库存|陪域|连通/,p.title);
   for(const hidden of p.steps?.slice(step)??[])for(const material of[hidden.text,hidden.formula])if(material&&!initial.includes(material)&&!p.steps?.slice(0,step).some(s=>s.text===material||s.formula===material))assert.ok(!copy.includes(material),p.title+':'+hidden.title);
  }
  assert.ok(speech[p.slideKey]!.every(text=>!/价格|销量|利润|成本|库存/.test(text)),p.title);
 }
});
test('few concept diagnostics accompany substantial independent computation with complete rubrics',()=>{
 assert.equal(activities.length,7);assert.equal(activities.reduce((n,a)=>n+a.questions.length,0),10);assert.ok(activities.every(a=>a.lesson===16));assert.equal(activities.reduce((s,a)=>s+a.minutes,0),24);
 for(const a of activities){const p=pages.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.exerciseMinutes,a.minutes);
  for(const q of a.questions){assert.ok(q.explanation.length>20);assert.ok(q.spoken.length>30);if(q.options){assert.equal(q.options.length,4);assert.match(q.answer,/^[ABCD]$/);assert.ok(p.steps!.some(s=>s.title.endsWith(q.answer)&&s.text===q.explanation));}else{assert.ok(q.scoring?.length);assert.equal(q.points,10);}}
 }
 const def=pages.findIndex(p=>p.title==='反正切函数的定义'),derivative=pages.findIndex(p=>p.title==='由反函数性质求导'),formula=pages.findIndex(p=>p.title==='反正切型基本积分公式');assert.ok(def<derivative&&derivative<formula);
 for(const p of pages.filter(p=>p.kind==='exercise'))assert.doesNotMatch(economicVisibleCopy(p,{presentationStep:p.steps?.length??0}),/换元|分部积分|微分因子|待定系数|完整乘积|内层/);
 for(const a of activities)for(const q of a.questions)assert.doesNotMatch(JSON.stringify(q),/换元|分部积分|微分因子|待定系数|完整乘积|内层/);
});
test('the basic inverse-trig functions agree with independent derivatives and have correct endpoint ranges',()=>{
 const derivative=(f:(x:number)=>number,x:number,h=1e-5)=>(f(x+h)-f(x-h))/(2*h);
 for(const x of[-4,-1,-.1,0,.2,1,4])close(derivative(M.arctan,x),1/(1+x*x));
 for(const x of[-.9,-.2,0,.5,.9])close(derivative(t=>M.arcsin(t)!,x),1/Math.sqrt(1-x*x));
 assert.equal(M.arcsin(2),null);assert.equal(M.arcsinDerivative(1),null);assert.equal(M.arcsin(1),Math.PI/2);
 for(const x of[-4,-1,0,1,4]){assert.ok(M.arctan(x)>-Math.PI/2&&M.arctan(x)<Math.PI/2);close(Math.tan(M.arctan(x)),x);close(M.arctan(-x),-M.arctan(x));}
});
test('family and angle controls remain page scoped, mathematically meaningful and student read-only',()=>{
 for(const p of pages.filter(p=>p.integralLab)){
  const d=definition(p)!;assert.ok(valid(d,d.defaults));assert.ok(!valid(d,{...d.defaults,presentationStep:1}));
  const patch=p.integralLab==='arctan'?{arctanX:2}:{primitiveC:1.5,primitiveX:-.5};assert.ok(valid(d,{...d.defaults,...patch}));
  assert.ok(!valid(d,{...d.defaults,...(p.integralLab==='arctan'?{primitiveC:1}:{arctanX:1})}));
  assert.ok(!valid(d,{...d.defaults,...(p.integralLab==='arctan'?{arctanX:5}:{primitiveC:4})}));
  const readout=Object.fromEntries(integralReadout({...d.defaults,...patch},p.integralLab));
  if(p.integralLab==='arctan'){assert.equal(readout['主值角 y₀（弧度）'],'约1.1071');assert.equal(readout['导数 1/(1+x₀²)'],'0.2');}
  else{assert.equal(readout['函数值 F(x₀)'],'1.75');assert.equal(readout['导数 F′(x₀)=2x₀'],'-1');}
 }
});

test('direct-integral, parameter and symmetry answers have independent mathematical checks',()=>{
 const derivative=(f:(x:number)=>number,x:number,h=1e-5)=>(f(x+h)-f(x-h))/(2*h);
 const rational=(x:number)=>x*x-3*x-1/x+3;
 close(rational(1),0);close(rational(2),.5);
 for(const x of[.2,.7,1,2,5])close(derivative(rational,x),(2*x**3-3*x*x+1)/(x*x));
 for(const x of[.2,.7,1,2,5])close(derivative(t=>2*t**4.5/9+4*t**2.5/5+2*Math.sqrt(t),x),(x*x+1)**2/Math.sqrt(x),2e-4);
 for(const u of[-2,0,1,3,5]){const a=2-u,F=(x:number)=>x**3-a*x*x+x;close(F(0),0);close(F(1),u);close(F(-1),u-4);}
 const F=(x:number)=>2*Math.atan(x)-Math.log(x)-Math.PI/2;close(F(1),0);for(const x of[.2,.5,1,2,4])close(derivative(F,x),2/(1+x*x)-1/x);
 for(const x of[-4,-1,0,1,4])close((Math.atan(x)+2)+(Math.atan(-x)+2),4);
});
