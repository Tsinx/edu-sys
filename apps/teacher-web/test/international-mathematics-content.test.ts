import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import {
 INTERNATIONAL_MATHEMATICS_COURSE_ID, INTERNATIONAL_MATHEMATICS_DEFINITIONS,
 INTERNATIONAL_MATHEMATICS_SLIDES, INTERNATIONAL_MATHEMATICS_LESSONS,
 INTERNATIONAL_MATHEMATICS_FILMS, INTERNATIONAL_MATHEMATICS_TOTAL_HOURS,
 getInternationalMathematicsGlobalIndex, getInternationalMathematicsLessonPosition,
 getInternationalMathematicsSlideByKey, getInternationalMathematicsInteractionDefaults,
 validateInternationalMathematicsInteractionPatch, evaluateCurve, derivativeCurve,
 primitiveCurve, definiteIntegral, secantSlope, leftRiemannSum, business,
 demandQuantity, priceElasticity, INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP, resolveInternationalMathematicsSavedPosition, type Curve, type SlideElement
} from '@edu/course-content/international-mathematics';

const close=(actual:number,expected:number,tolerance=1e-8)=>assert.ok(
 Math.abs(actual-expected)<=tolerance, `${actual} differs from ${expected}`
);
const publicElementCopy=(e:SlideElement):string[]=>{
 if(e.kind==='text')return [e.text];
 if(e.kind==='math')return [e.tex];
 if(e.kind==='image')return [e.alt];
 if(e.kind==='diagram')return [...e.labels,...(e.values??[])];
 if(e.kind==='table')return [...e.columns,...e.rows.flat()];
 if(e.kind==='plot')return [e.plot.xLabel,e.plot.yLabel,...e.plot.curves.flatMap(c=>c.label?[c.label]:[]),...(e.plot.annotations?.map(a=>a.text)??[])];
 return [];
};

test('international mathematics contains sixteen bounded single-variable lectures and two optional pages per lecture',()=>{
 assert.equal(INTERNATIONAL_MATHEMATICS_COURSE_ID,'course-international-mathematics');
 assert.equal(INTERNATIONAL_MATHEMATICS_TOTAL_HOURS,32);
 assert.equal(INTERNATIONAL_MATHEMATICS_DEFINITIONS.length,16);
 assert.equal(INTERNATIONAL_MATHEMATICS_SLIDES.length,1312);
 assert.equal(new Set(INTERNATIONAL_MATHEMATICS_SLIDES.map(s=>s.slideKey)).size,1312);
 assert.equal(new Set(INTERNATIONAL_MATHEMATICS_SLIDES.map(s=>s.compositionId)).size,1312);
 for(const [i,lesson]of INTERNATIONAL_MATHEMATICS_DEFINITIONS.entries()){
  assert.equal(lesson.number,i+1);
  const target=[72,76,80,74,88,78,86,78,78,82,84,78,78,90,82,76][i]!;
  assert.equal(lesson.slides.length,target+2,lesson.title);
  assert.equal(lesson.slides.filter(s=>!s.optionalChallenge).length,target,lesson.title);
  assert.deepEqual(lesson.slides.slice(target).map(s=>s.optionalChallenge),[true,true],lesson.title);
  assert.equal(lesson.slides[0]?.openingFilm,true,lesson.title);
  assert.equal(lesson.slides.filter(s=>s.openingFilm).length,1,lesson.title);
  assert.equal(lesson.outcomes.length,3,lesson.title);
  assert.ok(lesson.vocabulary.length>=5&&lesson.vocabulary.length<=8,lesson.title);
  assert.equal(lesson.exercises.length,7,lesson.title);
  assert.equal(lesson.exercises.filter(e=>e.optional).length,1,lesson.title);
  for(const exercise of lesson.exercises)assert.ok(exercise.question&&exercise.answer&&exercise.solution,exercise.id);
  const coreCopy=lesson.slides.filter(s=>!s.optionalChallenge).flatMap(s=>[s.title,...s.elements.flatMap(publicElementCopy)]).join('\n');
  assert.doesNotMatch(coreCopy,/partial derivative|Lagrange multiplier|matrix inverse|multivariable optimization/i,lesson.title);
 }
});

test('lesson-local positions, references and PDF offset remain consistent across every page',()=>{
 for(const lesson of INTERNATIONAL_MATHEMATICS_LESSONS){
  assert.equal(lesson.status,'ready');
  assert.equal(lesson.slideEnd-lesson.slideStart+1,lesson.slideTotal);
  for(let local=1;local<=lesson.slideTotal;local++){
   const global=getInternationalMathematicsGlobalIndex(lesson.number,local);
   assert.equal(global,lesson.slideStart+local-1);
   const position=getInternationalMathematicsLessonPosition(global!);
   assert.equal(position?.lessonNumber,lesson.number);
   assert.equal(position?.localIndex,local);
   assert.equal(position?.localTotal,lesson.slideTotal);
  }
  assert.equal(getInternationalMathematicsGlobalIndex(lesson.number,lesson.slideTotal+1),null);
 }
 assert.equal(getInternationalMathematicsGlobalIndex(0,1),null);
 assert.equal(getInternationalMathematicsGlobalIndex(1,1.5),null);
 assert.equal(getInternationalMathematicsLessonPosition(INTERNATIONAL_MATHEMATICS_SLIDES.length+1),null);
 for(const slide of INTERNATIONAL_MATHEMATICS_SLIDES){
  assert.equal(getInternationalMathematicsSlideByKey(slide.slideKey),slide);
  const {printedPages,pdfPages,section}=slide.source;
  assert.match(section,/^[1246]\./,slide.slideKey);
  assert.ok(Number.isInteger(printedPages[0])&&printedPages[1]>=printedPages[0],slide.slideKey);
  assert.deepEqual(pdfPages,[printedPages[0]+17,printedPages[1]+17],slide.slideKey);
  assert.ok(slide.teachingCue&&slide.assistantCue,slide.slideKey);
 }
 assert.ok(INTERNATIONAL_MATHEMATICS_DEFINITIONS[4]?.sources.some(s=>s.supplement?.includes('limits')));
 assert.ok(INTERNATIONAL_MATHEMATICS_DEFINITIONS[13]?.sources.some(s=>s.supplement?.includes('Fundamental')));
});

test('every public expression parses with KaTeX and all public material remains English and student-facing',()=>{
 let formulas=0;
 for(const slide of INTERNATIONAL_MATHEMATICS_SLIDES){
  const copy=[slide.title,slide.kicker,slide.question,slide.answer,...slide.elements.flatMap(publicElementCopy)].filter(Boolean).join('\n');
  assert.doesNotMatch(copy,/[\u3400-\u9fff]/u,slide.slideKey);
  assert.doesNotMatch(copy,/let students|tell students|ask students to|teacher cue|authoring policy|prompt policy|generation policy/i,slide.slideKey);
  for(const e of slide.elements){
   assert.ok(e.x>=60&&e.y>=220&&e.x+e.w<=1540&&e.y+e.h<=855,`${slide.slideKey}: authored bounds`);
   if(e.kind==='math'){
    formulas++;
    assert.doesNotThrow(()=>katex.renderToString(e.tex,{displayMode:true,throwOnError:true,strict:'ignore',trust:false}),slide.slideKey);
   }
   if(e.kind==='table')for(const row of e.rows)assert.equal(row.length,e.columns.length,slide.slideKey);
   if(e.kind==='plot'){
    assert.ok(e.plot.xRange[0]<e.plot.xRange[1]&&e.plot.yRange[0]<e.plot.yRange[1],slide.slideKey);
    if(e.plot.curves.some(c=>c.kind==='logarithm'))assert.ok(e.plot.xRange[0]>0,slide.slideKey);
   }
  }
 }
 assert.ok(formulas>350,'the full course contains substantial mathematical content');
});

test('each opening has six contiguous English shots spanning exactly ninety seconds',()=>{
 assert.equal(INTERNATIONAL_MATHEMATICS_FILMS.length,16);
 const sceneIds=new Set<string>();
 for(const film of INTERNATIONAL_MATHEMATICS_FILMS){
  assert.equal(film.durationMs,90000);
  assert.equal(film.shots.length,6,film.title);
  assert.ok(film.src.endsWith('.mp4')&&film.captions.endsWith('.vtt')&&film.poster.endsWith('.png'));
  film.shots.forEach((shot,i)=>{
   assert.equal(shot.from,i*15,film.title);
   assert.equal(shot.to,(i+1)*15,film.title);
   assert.ok(shot.caption&&shot.title&&shot.narration&&shot.scene,film.title);
   assert.doesNotMatch(shot.narration,/[\u3400-\u9fff]/u,film.title);
   assert.equal(sceneIds.has(shot.scene),false,shot.scene);
   sceneIds.add(shot.scene);
  });
 }
});

test('answer and film defaults are hidden and stationary, and controls reject unsafe scalar states',()=>{
 for(const slide of INTERNATIONAL_MATHEMATICS_SLIDES){
  const defaults=getInternationalMathematicsInteractionDefaults(slide.slideKey)!;
  if(slide.question||slide.answer)assert.equal(defaults.revealed,false,slide.slideKey);
  if(slide.openingFilm){
   assert.equal(defaults.playing,false);
   assert.equal(defaults.positionMs,0);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{positionMs:90000}),true);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{positionMs:90001}),false);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{playing:'true'}),false);
  }
  if(slide.interaction){
   const p=slide.interaction;
   assert.equal(defaults[p.key],p.initial);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{[p.key]:p.initial}),true);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{[p.key]:p.min-1}),false);
   assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{[p.key]:NaN}),false);
  }
  assert.equal(validateInternationalMathematicsInteractionPatch(slide.slideKey,{teachingCue:'show'}),false);
 }
 const shrinkingStep=INTERNATIONAL_MATHEMATICS_SLIDES.find(s=>s.lesson===5&&s.interaction?.key==='h')!;
 assert.ok(shrinkingStep.interaction!.min>0);
 assert.equal(validateInternationalMathematicsInteractionPatch(shrinkingStep.slideKey,{h:0}),false);
});

test('shared analytic derivatives agree with independent central differences on valid domains',()=>{
 const cases:readonly [Curve,number][]=[
  [{kind:'polynomial',coefficients:[6,-5,2,3]},1.25],
  [{kind:'exponential',scale:100,rate:.1},2],
  [{kind:'exponential',scale:100,rate:-.2},2],
  [{kind:'logarithm',scale:3,shift:7},2],
  [{kind:'power',scale:2,power:.5},4],
  [{kind:'power',scale:2,power:-1},2]
 ];
 for(const [curve,x]of cases){
  const h=1e-5,finite=(evaluateCurve(curve,x+h)-evaluateCurve(curve,x-h))/(2*h);
  close(derivativeCurve(curve,x),finite,1e-5);
 }
 close(derivativeCurve({kind:'polynomial',coefficients:[7]},0),0);
 close(derivativeCurve({kind:'power',scale:9,power:0},0),0);
 assert.ok(Number.isNaN(evaluateCurve({kind:'logarithm'},0)));
 assert.ok(Number.isNaN(derivativeCurve({kind:'logarithm'},-1)));
});

test('difference quotients converge from both directions without equating finite changes to derivatives',()=>{
 const motion:Curve={kind:'polynomial',coefficients:[0,0,1]};
 close(secantSlope(motion,2,.5),4.5);
 close(secantSlope(motion,2,-.5),3.5);
 close(secantSlope(motion,2,.001),4.001,1e-9);
 close(secantSlope(motion,2,0),4);
 const exact=evaluateCurve(motion,2.1)-evaluateCurve(motion,2);
 close(exact,.41);
 close(derivativeCurve(motion,2)*.1,.4);
 assert.notEqual(exact,derivativeCurve(motion,2)*.1);
 const cubic:Curve={kind:'polynomial',coefficients:[0,0,0,1]};
 close(derivativeCurve(cubic,0),0);
 assert.ok(evaluateCurve(cubic,-.1)<0&&evaluateCurve(cubic,.1)>0,'a zero derivative need not be a local maximum or minimum');
});

test('antiderivatives and definite integrals obey the Fundamental Theorem on their stated intervals',()=>{
 const linear:Curve={kind:'polynomial',coefficients:[2,2]};
 close(definiteIntegral(linear,0,4),24);
 close(definiteIntegral(linear,4,0),-24);
 close(definiteIntegral(linear,2,2),0);
 close(definiteIntegral({kind:'power',power:-1},1,Math.E),1);
 close(definiteIntegral({kind:'logarithm'},1,Math.E),1);
 close(definiteIntegral({kind:'exponential',scale:3,rate:0,shift:4},2,5),21);
 const h=1e-5;
 for(const curve of [linear,{kind:'exponential',scale:10,rate:.2} as Curve,{kind:'logarithm',scale:2} as Curve]){
  const numerical=(primitiveCurve(curve,2+h)-primitiveCurve(curve,2-h))/(2*h);
  close(numerical,evaluateCurve(curve,2),1e-5);
 }
 const fixedA=100+definiteIntegral({kind:'polynomial',coefficients:[20,1]},0,10);
 const fixedB=250+definiteIntegral({kind:'polynomial',coefficients:[20,1]},0,10);
 close(fixedB-fixedA,150);
});

test('rectangle sums converge from below for increasing rates and reject invalid counts',()=>{
 const flow:Curve={kind:'polynomial',coefficients:[2,2]};
 const exact=definiteIntegral(flow,0,4),small=leftRiemannSum(flow,0,4,4),large=leftRiemannSum(flow,0,4,40);
 close(small,20);
 close(large,23.6);
 assert.ok(small<large&&large<exact);
 assert.throws(()=>leftRiemannSum(flow,0,4,0));
 assert.throws(()=>leftRiemannSum(flow,0,4,2.5));
});

test('marginal revenue and cost match calculus but differ from one whole unit of change',()=>{
 const q=30;
 close(business.marginalRevenue(q),40);
 close(business.marginalCost(q),50);
 close(business.revenue(q+1)-business.revenue(q),39);
 close(business.cost(q+1)-business.cost(q),50.5);
 close(business.profit(q),business.revenue(q)-business.cost(q));
 for(const h of [.1,.01]){
  close(business.cost(q+h)-business.cost(q),business.marginalCost(q)*h+.5*h*h);
  close(business.revenue(q+h)-business.revenue(q),business.marginalRevenue(q)*h-h*h);
 }
});

test('signed elasticity varies along the linear demand and revenue changes direction at unit elasticity',()=>{
 close(demandQuantity(10),80);
 close(priceElasticity(10),-.25);
 close(priceElasticity(25),-1);
 close(priceElasticity(40),-4);
 close(priceElasticity(0),0);
 assert.ok(Number.isNaN(priceElasticity(50)));
 assert.ok(Number.isNaN(priceElasticity(60)));
 const priceRevenue:Curve={kind:'polynomial',coefficients:[0,100,-2]};
 for(const p of [10,25,40])close(derivativeCurve(priceRevenue,p),demandQuantity(p)*(1+priceElasticity(p)));
 assert.ok(derivativeCurve(priceRevenue,10)>0);
 close(derivativeCurve(priceRevenue,25),0);
 assert.ok(derivativeCurve(priceRevenue,40)<0);
});

test('profit candidates respect endpoints, capacity limits and integer outputs',()=>{
 const optimum=80/3;
 close(business.marginalRevenue(optimum),business.marginalCost(optimum));
 close(business.profit(optimum),2900/3);
 close(business.profit(0),-100);
 close(business.profit(40),700);
 assert.ok(business.profit(optimum)>business.profit(0)&&business.profit(optimum)>business.profit(40));
 for(const q of [0,10,20,30,40])close(business.profit(q),2900/3-1.5*(q-optimum)**2);
 const cap=20;
 assert.ok(optimum>cap,'the unconstrained stationary point is infeasible');
 assert.ok(business.marginalRevenue(cap)-business.marginalCost(cap)>0);
 assert.ok(business.profit(cap)>business.profit(0),'the best endpoint can have a nonzero derivative');
 close(business.profit(26),966);
 close(business.profit(27),966.5);
 close(business.profit(28),964);
 assert.ok(business.profit(27)>business.profit(26)&&business.profit(27)>business.profit(28));
});

test('surplus calculations separate willingness to pay, variable cost and fixed cost',()=>{
 const demand:Curve={kind:'polynomial',coefficients:[60,-1]},supply:Curve={kind:'polynomial',coefficients:[20,1]};
 const q=20,p=40;
 close(evaluateCurve(demand,q),p);
 close(evaluateCurve(supply,q),p);
 const buyerValue=definiteIntegral(demand,0,q),variableCost=definiteIntegral(supply,0,q);
 const consumerSurplus=buyerValue-p*q,producerSurplus=p*q-variableCost;
 close(consumerSurplus,200);
 close(producerSurplus,200);
 close(consumerSurplus+producerSurplus,400);
 const fixedCost=75,profit=p*q-variableCost-fixedCost;
 close(profit,125);
 assert.notEqual(producerSurplus,profit);
});


test('v2 restores all legacy destinations by keys before indices and schedules two independent hours',()=>{
 assert.equal(INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP.length,416);
 for(const mapping of INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP){
  const restored=resolveInternationalMathematicsSavedPosition('release-international-mathematics-jacques-v1',mapping.v1Index);
  assert.equal(restored?.slideKey,mapping.slideKey);
  assert.equal(restored?.index,mapping.v2Index);
  assert.equal(resolveInternationalMathematicsSavedPosition('release-international-mathematics-jacques-v1',1,mapping.slideKey)?.index,mapping.v2Index);
 }
 assert.equal(resolveInternationalMathematicsSavedPosition('release-international-mathematics-jacques-v1',417),undefined);
 for(const lesson of INTERNATIONAL_MATHEMATICS_DEFINITIONS){
  assert.equal(lesson.hours?.length,2);
  for(const hour of lesson.hours!){
   const block=lesson.slides.filter(s=>s.pedagogy?.hour===hour.number);
   assert.equal(block.length,hour.coreSlides);
   assert.equal(block.reduce((n,s)=>n+s.pedagogy!.seconds!,0),2700);
   assert.ok(block.every(s=>!s.optionalChallenge));
  }
 }
});
