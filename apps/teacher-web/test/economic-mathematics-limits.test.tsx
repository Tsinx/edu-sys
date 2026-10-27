import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ECONOMIC_MATHEMATICS_SLIDES as all, ECONOMIC_MATHEMATICS_DECK_ID as deckId, ECONOMIC_MATHEMATICS_VERSION_ID as version, getEconomicMathematicsHistoricalCounts, getEconomicMathematicsInteractionDefinition as definition, validateEconomicMathematicsInteractionState as validate, economicVisibleCopy, lesson03Narration, lesson04Narration, profitAt, profitQuotient, capacityAt, capacityGap, earliestCapacityWeek, supplierCost, idealAverage, exactOscillationSample, limitLabReadout, reciprocalSequenceError, sequenceZoomState, limitPrecisionLabel, derivativeBridgeValue, derivativeBridgeQuotient, LIMIT_EXERCISE_ACTIVITIES as exercises } from '@edu/course-content/economic-mathematics';
import { EconomicMathematicsTeachingSlides as Slide } from '../src/features/economic-mathematics/EconomicMathematicsTeachingSlides';
const pages=all.filter(p=>p.lesson===3||p.lesson===4);
const narration={...lesson03Narration,...lesson04Narration};

test('reinforcement routes keep two 45-minute hours, short group checks and optional depth',()=>{
  assert.equal(pages.length,145);
  for(const [lesson,count,core] of [[3,85,67],[4,60,56]]) {
    const selected=pages.filter(p=>p.lesson===lesson);
    assert.equal(selected.length,count);
    for(const hour of [1,2]) assert.equal(selected.filter(p=>p.classHour===hour).reduce((s,p)=>s+p.teachingSeconds!,0),2700);
    assert.equal(selected.filter(p=>p.routeRole==='core').length,core);
    assert.ok(selected.slice(core).every(p=>p.routeRole==='optional'&&p.teachingSeconds===0));
  }
  const films=pages.filter(p=>p.historyFilm);
  assert.equal(films.length,1);assert.equal(films[0]!.lesson,3);assert.equal(films[0]!.localIndex,14);assert.equal(films[0]!.teachingSeconds,180);
  assert.ok(pages.filter(p=>p.style==='constructivist').length/pages.length<=.15);
  for(const page of pages) {assert.equal(narration[page.slideKey]!.length,1+(page.steps?.length??0));assert.ok(!('speech' in page));assert.ok(!('bridge' in page));}
  assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-lesson02-mapping-2026-10-09')!.reduce((s,n)=>s+n,0),421);
  assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-limits-refined-2026-10-10')!.reduce((s,n)=>s+n,0),513);
  assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-limits-sequence-2026-10-11')!.reduce((s,n)=>s+n,0),529);
  assert.ok(pages.every(p=>p.slideKey.includes(p.lesson===3?'-limits-reinforcement-20261013-':'-math-first-20261016-')));
  assert.equal(version,'release-economic-mathematics-differential-rules-2026-10-26'); assert.equal(getEconomicMathematicsHistoricalCounts('release-economic-mathematics-limits-reinforcement-2026-10-13')!.reduce((a,b)=>a+b,0),560);
  assert.ok(all.filter(p=>p.routeRole!=='optional').length/all.length>=.9);
});

test('pricing evidence shares the merchant model and never turns a zero quotient into a number',()=>{
  assert.equal(profitAt(80),18800);assert.equal(profitAt(79.5),18620);assert.equal(profitAt(80.5),18717.75);
  assert.ok(Number.isNaN(profitQuotient(80,0)));assert.ok(Number.isNaN(profitQuotient(90,0)));
  for(const h of [-.5,-.01,-1e-8,.5,.01,1e-8]) {
    assert.equal(profitQuotient(80,h),h<0?360:-160-9*h);
    assert.equal(profitQuotient(90,h),-340-9*h);
    if(Math.abs(h)>.001) {
      assert.ok(Math.abs((profitAt(80+h)-profitAt(80))/h-profitQuotient(80,h))<1e-6);
      assert.ok(Math.abs((profitAt(90+h)-profitAt(90))/h-profitQuotient(90,h))<1e-6);
    }
  }
  assert.equal(profitAt(90.5)-profitAt(90),-172.25);
});

test('capacity promises test exact gaps and integer thresholds, not a plotted asymptote',()=>{
  assert.equal(capacityAt(0),400);assert.equal(capacityAt(1),420);
  for(let n=0;n<30;n++) {
    assert.ok(Math.abs(capacityAt(n+1)-(capacityAt(n)+.2*(500-capacityAt(n))))<1e-10);
    assert.ok(capacityAt(n+1)>capacityAt(n));assert.ok(capacityGap(n)>0);
  }
  assert.ok(capacityAt(8)<490);assert.ok(capacityAt(10)<490);assert.ok(capacityAt(11)>490);
  assert.equal(earliestCapacityWeek(10),11);assert.equal(earliestCapacityWeek(1),21);
  assert.ok(Number.isNaN(capacityAt(1.5)));
});

test('contract boundaries, all-units discount and ideal extensions keep separate domains',()=>{
  assert.equal(supplierCost('A',499),14980);assert.equal(supplierCost('A',500),14000);
  assert.ok(Math.abs(supplierCost('A',499.999999)-15000)<.001);
  assert.equal(supplierCost('A',1500),32000);assert.equal(supplierCost('B',1500),32500);
  assert.equal(supplierCost('A',2000),supplierCost('B',2000));
  assert.equal(supplierCost('A',10000)/10000,18.5);assert.equal(supplierCost('B',10000)/10000,17.7);
  assert.ok(Number.isNaN(supplierCost('A',50001)));assert.ok(Number.isFinite(idealAverage('A',50001)));
  assert.ok(Number.isNaN(supplierCost('B',499)));
});

test('sampling counterexamples use analytic values, while epsilon ranges cover every tested point',()=>{
  for(let n=1;n<=100;n++)for(const family of [0,1] as const){
    const s=exactOscillationSample(family,n);
    assert.equal(s.value,family);assert.ok(Math.abs(Math.sin(Math.PI/s.h)-s.value)<1e-10);
  }
  for(const eps of [.05,.2,1]) {
    for(const delta of [eps/2,eps])for(const fraction of [.01,.5,.999])assert.ok(2*Math.abs(delta/2*fraction)<eps);
    const bad=.75*eps;assert.ok(bad<eps&&2*bad>eps);
    const figureReadout=limitLabReadout('error-band',{epsilon:eps,delta:eps});
    assert.ok(figureReadout[2]![1].startsWith('成立'));
  }
});

test('every reveal parses, preserves privacy and validates integer steps and film restore values',()=>{
  for(const p of pages) {
    const d=definition(p);
    for(let step=0;step<=(p.steps?.length??0);step++) {
      const values={...d?.defaults,presentationStep:step};
      const html=renderToStaticMarkup(<Slide spec={p} interaction={d?{deckId,slideId:p.slideKey,revision:1,values}:null} readOnly/>);
      assert.doesNotMatch(html,/katex-error|\bNaN\b|[="\s]Infinity[<"\s]|teachingCue|assistantCue|storyBeat|voyageStage|openQuestion|exerciseActivityId|<button|<input|data-module/i,p.slideKey);
      const copy=economicVisibleCopy(p,values);
      assert.doesNotMatch(copy,/让学生|告诉学生|不背口号|先拆掉|AI生成|教学编排/);
      for(const hidden of (p.steps??[]).slice(step)) {
        assert.ok(!copy.includes(hidden.title),p.slideKey+hidden.title);assert.ok(!html.includes(hidden.title),p.slideKey+hidden.title);
      }
      if(d) assert.ok(validate(d,values),p.slideKey);
    }
    if(d) {assert.equal(validate(d,{...d.defaults,presentationStep:.5}),false);assert.equal(validate(d,{...d.defaults,presentationStep:(p.steps?.length??0)+1}),false);}
  }
  const film=pages.find(p=>p.historyFilm)!,d=definition(film)!;
  assert.ok(validate(d,{...d.defaults,filmTime:97,filmPlaying:true,filmVolume:80}));
  for(const time of [-1,.5,181,NaN])assert.equal(validate(d,{...d.defaults,filmTime:time}),false);
});

test('mathematical terms are explained at their first formal use',()=>{
  const checks:Record<number,readonly (readonly [string,string])[]>={
    3:[['数列 sequence','数列：'],['潜无穷 potential','潜无穷与实无穷：'],['实无穷 actual','潜无穷与实无穷：'],['收敛 convergence','离2的距离'],['向上取整 ceiling','先定误差'],['单调不减 non-decreasing','增加且有上界'],['自然对数 natural','用同一ε–N规则证明']],
    4:[['左极限 left-hand','左右极限：'],['未定式 indeterminate','0/0型：'],['共轭式 conjugate','根式差无法'],['无穷小 infinitesimal','无穷小：'],['夹逼定理 squeeze','夹逼定理：']]
  };
  for(const lesson of [3,4]){const selected=pages.filter(p=>p.lesson===lesson);for(const [term,title]of checks[lesson]!){
    const first=selected.findIndex(p=>economicVisibleCopy(p,{presentationStep:p.steps?.length??0}).includes(term));
    assert.ok(first>=0,term);assert.equal(first,selected.findIndex(p=>p.title.includes(title)),term);
  }}
  for(const p of pages)assert.doesNotMatch(economicVisibleCopy(p,{presentationStep:p.steps?.length??0}),/去心邻域|聚点|柯西列|驻点|延拓|泰勒展开/);
});

test('analytic zoom retains nonzero errors and distinguishes false candidates at arbitrary late indices',()=>{
  for(const precision of [0,2,6,12,15]) {
    const values={precision,tailPower:precision,candidate:'2',epsilonFactor:'1'};
    const state=sequenceZoomState(values);
    assert.ok(state.guaranteed);
    const n=state.after+1;
    assert.ok(reciprocalSequenceError(n)>0);
    assert.ok(reciprocalSequenceError(n)<state.epsilon);
    assert.notEqual(limitPrecisionLabel(reciprocalSequenceError(n)),'0');
    assert.ok(limitLabReadout('sequence-zoom',values)[3]![1].includes('全尾通过'));
  }
  for(const tailPower of [0,3,6,15]) {
    const s=sequenceZoomState({precision:4,epsilonFactor:'5',candidate:'2.001',tailPower});
    assert.equal(s.guaranteed,false);
    assert.ok(s.witness>s.after);
    assert.ok(Math.abs(reciprocalSequenceError(s.witness,2.001))>=s.epsilon);
  }
  const lab=pages.find(p=>p.limitLab==='sequence-zoom')!,d=definition(lab)!;
  for(const patch of [{precision:16},{precision:2.5},{tailPower:-1},{tailPower:16},{candidate:'3'},{epsilonFactor:'0'}])assert.equal(validate(d,{...d.defaults,...patch}),false);
  assert.ok(validate(d,{...d.defaults,precision:15,tailPower:15,candidate:'2.001'}));
  const fine=limitLabReadout('error-band',{epsilon:.2,delta:.2,zoom:15});
  assert.notEqual(fine[0]![1],'0');assert.notEqual(fine[1]![1],'0');
});

test('active concept pairs and existing depth exercises stay linked and keep feedback hidden',()=>{
  assert.equal(exercises.length,31);assert.equal(exercises.flatMap(a=>a.questions).length,61);
  assert.equal(pages.filter(p=>p.kind==='exercise').length,31);
  for(const a of exercises){
    const linked=pages.filter(p=>p.exerciseActivityId===a.id);
    assert.equal(linked.length,1,a.id);assert.equal(linked[0]!.kind,'exercise');assert.equal(linked[0]!.lesson,a.lesson);
    assert.equal(linked[0]!.exerciseMinutes,a.minutes);
    for(const q of a.questions){assert.ok(q.answer&&q.explanation);if(q.type==='single'){assert.equal(q.options?.length,4);assert.ok(q.correctIndex!>=0&&q.correctIndex!<4);}}
  }
  const l3=pages.filter(p=>p.lesson===3),index=(text:string)=>l3.findIndex(p=>p.title.includes(text));
  assert.ok(index('数列：')<index('ε–N定义'));
  assert.ok(index('ε–N定义')<index('基础判断：先'));
  assert.ok(index('一次固定挑战')<index('深入追问'));
  assert.ok(index('正无穷、负无穷')<index('基础分类'));
  assert.ok(index('函数极限的ε–δ')<index('巩固：哪些δ'));
  for(const p of pages)for(const n of narration[p.slideKey]!)assert.doesNotMatch(n,/陪域|去心邻域|聚点|柯西列/);
  const checks=pages.filter(p=>p.conceptCheck);
  assert.equal(checks.length,25);
  assert.equal(checks.filter(p=>p.lesson===3).length,13);assert.equal(checks.filter(p=>p.lesson===4).length,12);
  for(const p of checks){
    assert.equal(p.table?.columns.length,2);assert.equal(p.table?.rows.length,4);assert.equal(p.steps?.length,2);
    const before=economicVisibleCopy(p,{presentationStep:0});
    for(const r of p.steps!){assert.ok(!before.includes(r.title));assert.ok(!before.includes(r.text!));}
    const first=economicVisibleCopy(p,{presentationStep:1});assert.ok(first.includes(p.steps![0]!.text!));assert.ok(!first.includes(p.steps![1]!.text!));
  }
});

test('derivative bridge separates value comparisons from finite difference quotient limits',()=>{
  for(const model of [0,1,2] as const)for(const h of [-1,-.01,-1e-12,1e-12,.01,1]){
    const exact=(derivativeBridgeValue(model,h)-derivativeBridgeValue(model,0))/h;
    assert.ok(Math.abs(exact-derivativeBridgeQuotient(model,h))<1e-14);
    if(model!==0)assert.ok(derivativeBridgeValue(model,h)<derivativeBridgeValue(model,0));
  }
  for(const model of [0,1,2] as const)assert.ok(Number.isNaN(derivativeBridgeQuotient(model,0)));
  assert.equal(derivativeBridgeQuotient(2,-.1),1);assert.equal(derivativeBridgeQuotient(2,.1),-1);
  const fourth=pages.filter(p=>p.lesson===4&&p.routeRole==='core');
  assert.ok(fourth.every(p=>!p.title.includes('局部最大')&&!p.title.includes('导数为零')));
  const seventh=all.filter(p=>p.lesson===7);
  assert.ok(seventh.some(p=>p.title.includes('局部极值：只与附近')));
  assert.ok(seventh.some(p=>p.title.includes('费马定理')));
});
