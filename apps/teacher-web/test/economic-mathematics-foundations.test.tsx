import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,lesson05Narration,lesson06Narration,foundationModels as M,foundationBisection,foundationReadout,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid,economicVisibleCopy,getEconomicMathematicsHistoricalCounts} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';

const pages=slides.filter(s=>s.lesson===5||s.lesson===6);
test('two authored routes retain 45-minute budgets, optional depth and narration for every reveal',()=>{
  assert.deepEqual([5,6].map(n=>lessons[n-1]!.slideTotal),[66,64]);
  for(const n of [5,6]){const p=pages.filter(p=>p.lesson===n),lesson=lessons[n-1]!;
    assert.equal(p.filter(s=>s.title.startsWith('个人练习')).length,12);
    assert.equal(p.filter(s=>s.routeRole==='optional').length,n===5?6:4);
    for(const h of lesson.classHours!){const span=p.slice(h.slideStart-1,h.slideEnd);assert.equal(span.reduce((s,p)=>s+(p.teachingSeconds??0),0),2700);assert.ok(span.every(s=>s.classHour===h.hour&&s.routeRole==='core'));}
    for(const s of p){const narration=(n===5?lesson05Narration:lesson06Narration)[s.slideKey]!;assert.equal(narration.length,1+(s.steps?.length??0),s.title);for(const t of narration)assert.doesNotMatch(t,/\\frac|\\sin|\$|teachingCue|让学生/);}
  }
  assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-limits-reinforcement-2026-10-13')!.reduce((a,b)=>a+b,0),560);
});
test('every rewritten page renders mathematics and keeps private cues and controls out of student DOM',()=>{
  for(const s of pages){const d=definition(s);for(const step of [0,s.steps?.length??0]){
    const html=renderToStaticMarkup(<Slide spec={s} interaction={d?{deckId,slideId:s.slideKey,revision:1,values:{...d.defaults,presentationStep:step}}:null} readOnly/>);
    assert.doesNotMatch(html,/katex-error|NaN|Infinity|teachingCue|assistantCue|teachingSeconds|moduleId|speech|<input|<button/,s.title);
    assert.doesNotMatch(economicVisibleCopy(s,{...d?.defaults,presentationStep:step}),/让学生|告诉学生|今天不先|先拆掉/);
  }}
  const s=pages.find(s=>s.exerciseActivityId==='l5-personal-math-11')!,d=definition(s)!;
  const copy=(step:number)=>economicVisibleCopy(s,{...d.defaults,presentationStep:step});
  assert.ok(!copy(0).includes(s.steps![0]!.text!));assert.ok(copy(1).includes(s.steps![0]!.text!));assert.ok(!copy(1).includes(s.steps![1]!.text!));assert.ok(copy(2).includes(s.steps![1]!.text!));
});
test('native geometry, compounding and economic domains share independently checkable calculations',()=>{
  for(const x of [.05,.2,.65,.8]){const a=M.angle(x);assert.ok(a.innerArea<a.sectorArea&&a.sectorArea<a.outerArea);assert.ok(Math.cos(x)<a.sine/x&&a.sine/x<1);}
  assert.equal(M.sinc(0),null);assert.ok(Math.abs(M.sinc(-.01)!-M.sinc(.01)!)<1e-15);
  assert.equal(M.compound(1,1),2);assert.ok(Math.abs(M.compound(1,12)-2.613035290224676)<1e-12);
  assert.ok(M.compound(.12,365)<M.compoundLimit(.12));
  assert.equal(M.contractA(99.9),1198.8000000000002);assert.equal(M.contractA(100),1000);assert.equal(M.contractB(100),1200);assert.equal(M.contractB(101),1210);
  for(const q of [120,121,-1])assert.equal(M.queue(q),null);
  assert.equal(M.queue(108),5);assert.equal(M.queue(119),60);
  for(let k=0;k<=12;k++){const b=foundationBisection(k);assert.ok(b.left<0&&b.right>0);assert.equal(b.b-b.a,2**(-k));assert.equal(b.error,2**(-k-1));assert.ok(Math.abs(.6823278038280193-b.mid)<=b.error);}
});
test('all experiments validate defaults and ranges, and public readouts never expose invalid values',()=>{
  const labs=pages.filter(s=>s.foundationLab);assert.equal(labs.length,4);
  for(const s of labs){const d=definition(s)!;assert.ok(valid(d,d.defaults),s.title);assert.ok(foundationReadout(s.foundationLab!,d.defaults).length);assert.doesNotMatch(JSON.stringify(foundationReadout(s.foundationLab!,d.defaults)),/NaN|Infinity/);assert.equal(valid(d,{...d.defaults,presentationStep:99}),false);}
  const angle=definition(labs.find(s=>s.foundationLab==='angle')!)!;assert.equal(valid(angle,{...angle.defaults,angle:1.2}),false);assert.equal(valid(angle,{...angle.defaults,angle:0}),false);
  const b=definition(labs.find(s=>s.foundationLab==='bisection')!)!;assert.equal(valid(b,{...b.defaults,bisectionSteps:1.5}),false);
});
