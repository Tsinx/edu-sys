import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_DECK_ID as deckId,
  LIMIT_MASTERY_EXERCISES as exercises,lesson04Narration,lesson05Narration,derivativeAppendixNarration,
  economicVisibleCopy,getEconomicMathematicsInteractionDefinition as definition,getEconomicMathematicsHistoricalCounts} from '@edu/course-content/economic-mathematics';
import {EconomicMathematicsTeachingSlides as Slide} from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';

test('math-first routes preserve two hours, personal practice time, mathematical progression and the archived release',()=>{
  assert.deepEqual([4,5].map(n=>lessons[n-1]!.slideTotal),[60,66]);
  for(const n of [4,5]){
    const lesson=lessons[n-1]!,pages=slides.filter(p=>p.lesson===n);
    for(const hour of lesson.classHours!){const part=pages.slice(hour.slideStart-1,hour.slideEnd);assert.equal(part.reduce((s,p)=>s+p.teachingSeconds!,0),2700);assert.equal(part.filter(p=>p.conceptCheck).length,6);}
    assert.equal(pages.filter(p=>p.conceptCheck).reduce((s,p)=>s+(p.exerciseMinutes??0),0),24);
    for(const p of pages.filter(p=>p.routeRole==='core'))assert.doesNotMatch(economicVisibleCopy(p,{presentationStep:p.steps?.length??0}),/采购|供应商|局部最大|局部最小|最优点|小组/);
  }
  const fourth=slides.filter(p=>p.lesson===4&&p.routeRole==='core');
  for(const [a,b]of[['左右极限：','双侧极限的判据'],['商法则多出','0/0型：'],['无穷远处','输出无限增大'],['夹逼定理：','综合例题：']])assert.ok(fourth.findIndex(p=>p.title.includes(a))<fourth.findIndex(p=>p.title.includes(b)));
  assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-foundations-depth-2026-10-16')!.reduce((s,n)=>s+n,0),656);
  const seventh=slides.filter(p=>p.lesson===7&&p.routeRole==='core');
  const definition=seventh.findIndex(p=>p.title==='导数：差商的有限极限');
  const condition=seventh.findIndex(p=>p.title.includes('费马定理'));
  assert.ok(definition>=0&&condition>definition);assert.ok(seventh[condition]!.formula?.includes('内点'));
});

test('all personal questions are uniquely linked and each answer waits for its own reveal',()=>{
  assert.equal(exercises.length,24);assert.equal(exercises.flatMap(a=>a.questions).length,48);
  assert.equal(new Set(exercises.map(a=>a.id)).size,24);
  for(const a of exercises){
    const p=slides.find(p=>p.exerciseActivityId===a.id)!;assert.ok(p);assert.equal(p.lesson,a.lesson);assert.equal(p.exerciseMinutes,2);
    assert.equal(p.steps?.length,2);assert.equal(p.table?.columns.length,2);assert.equal(p.table?.rows.length,4);
    for(const [i,q]of a.questions.entries()){
      assert.equal(q.options.length,4);assert.match(q.answer,/^[ABCD]$/);assert.ok(q.explanation.length>15);
      assert.equal(p.table!.columns[i],`${i+1}. ${q.stem}`);
      for(let k=0;k<4;k++)assert.equal(p.table!.rows[k]![i],`${'ABCD'[k]}. ${q.options[k]}`);
      for(const step of [0,1,2])assert.equal(economicVisibleCopy(p,{presentationStep:step}).includes(q.explanation),step>i);
    }
  }
});

test('every new page and public step parses, fits the expected layout contract and has matching speech',()=>{
  const speech={...lesson04Narration,...lesson05Narration};
  for(const p of slides.filter(p=>p.lesson===4||p.lesson===5)){
    assert.equal(speech[p.slideKey]?.length,1+(p.steps?.length??0),p.title);
    for(const paragraph of speech[p.slideKey]!)assert.doesNotMatch(paragraph,/\\frac|\\lim|\$|teachingCue|让学生|小组内/);
    const d=definition(p);
    for(let step=0;step<= (p.steps?.length??0);step++){
      const values={...d?.defaults,presentationStep:step};
      const html=renderToStaticMarkup(<Slide spec={p} interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null} readOnly/>);
      assert.match(html,/em-limits/);
      assert.doesNotMatch(html,/katex-error|\bNaN\b|teachingCue|assistantCue|exerciseActivityId|teachingSeconds|<input|<button/,p.title);
      assert.doesNotMatch(economicVisibleCopy(p,values),/让学生|告诉学生|不背口号|先拆掉/);
    }
  }
});

test('the new definitions and counterexamples have independently checked error estimates and outcomes',()=>{
  for(const b of [-10,0,.2,7])for(const epsilon of [.001,.1,2]){
    const delta=Math.min(1,epsilon/(1+Math.abs(b)));
    for(const fraction of [-.99,-.2,.2,.99]){const x=delta*fraction,y=x<0?2+x:2+b*x;assert.ok(Math.abs(y-2)<epsilon);}
  }
  for(const a of [-12,0,.5,10])for(const x of [-1e-5,1e-5]){
    const stable=a/(Math.sqrt(1+a*x)+1);assert.ok(Math.abs(stable-a/2)<.001);
  }
  for(const x of [-100,-2,2,100])assert.equal(Math.sqrt(x*x)/x,x<0?-1:1);
  for(const x of [.001,.1,.7]){assert.ok(1-Math.cos(x)<=x*x);assert.ok(Math.cos(x)<Math.sin(x)/x&&Math.sin(x)/x<1);}
  for(const x of [-1e-4,1e-4]){
    const result=(1-Math.cos(2*x))/(x*Math.log1p(3*x));assert.ok(Math.abs(result-2/3)<.001);
    const square=((x+x*x)-x)/(x*x);assert.ok(Math.abs(square-1)<1e-8);
  }
});
