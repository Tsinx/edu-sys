import test from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMIC_MATHEMATICS_SLIDES, merchantOutcome as outcome, merchantGridOptimum as optimum, MERCHANT_TRANSFER, economicVisibleCopy, refinedNarration, getEconomicMathematicsHistoricalCounts, MERCHANT_MAPPING_EXAMPLES, classifyFiniteMapping } from '@edu/course-content/economic-mathematics';
const pages = ECONOMIC_MATHEMATICS_SLIDES.filter(p=>p.lesson===2);
test('59 independently keyed pages fit two 45-minute hours and reserve 20 minutes for exercises',()=>{
  assert.equal(pages.length,59);
  for (const hour of [1,2]) assert.equal(pages.filter(p=>p.classHour===hour).reduce((s,p)=>s+p.teachingSeconds!,0),2700);
  assert.equal(pages.reduce((s,p)=>s+(p.exerciseMinutes??0),0),20);
  assert.equal(pages.filter(p=>p.style==='constructivist').length,5);
  for(const page of pages) { assert.equal(refinedNarration[page.slideKey]!.length,1+(page.steps?.length??0)); assert.ok(!('speech' in page)); assert.ok(!('bridge' in page)); }
  const counts=getEconomicMathematicsHistoricalCounts('release-economic-mathematics-editorial-v2-reordered-2026-10-09')!;
  assert.equal(counts.reduce((s,n)=>s+n,0),388); assert.equal(counts[1],26);
  const old50=getEconomicMathematicsHistoricalCounts('release-economic-mathematics-lesson02-refined-2026-10-09')!;
  assert.equal(old50.reduce((s,n)=>s+n,0),412);assert.equal(old50[1],50);
  assert.ok(pages.every(p=>p.slideKey.startsWith('em-l02-refined-mapping-')));
  const old60=getEconomicMathematicsHistoricalCounts('release-economic-mathematics-lesson02-flow-2026-10-09')!;
  assert.equal(old60.reduce((s,n)=>s+n,0),422);assert.equal(old60[1],60);
});
test('finite diagrams distinguish reverse uniqueness from coverage of the declared codomain',()=>{
  const types=MERCHANT_MAPPING_EXAMPLES.map(e=>classifyFiniteMapping(e.domain,e.codomain,e.images));
  assert.deepEqual(types,[
    {mapping:true,injective:true,surjective:false,bijective:false},
    {mapping:true,injective:false,surjective:true,bijective:false},
    {mapping:true,injective:true,surjective:true,bijective:true}
  ]);
  assert.deepEqual(MERCHANT_MAPPING_EXAMPLES[0].images,MERCHANT_MAPPING_EXAMPLES[2].images);
  assert.equal(classifyFiniteMapping([1,2],[3,4],[3]).mapping,false);
  assert.equal(classifyFiniteMapping([1,2],[3,4],[3,5]).mapping,false);
});
test('demand inverse covers its image while capped sales has multiple preimages',()=>{
  const inverse=(q:number)=>120-q/10;
  for(const p of [30,50,80,90,100]) assert.equal(inverse(outcome(p).demand),p);
  for(const q of [200,300,400,700,900]) {const p=inverse(q);assert.ok(p>=30&&p<=100);assert.equal(outcome(p).demand,q);}
  assert.ok(inverse(1000)<30);
  assert.equal(outcome(50).sales,outcome(80).sales);
  assert.equal(outcome(90).sales,300);
});
test('capacity, commission and avoidable costs change the same plotted and spoken model',()=>{
  assert.deepEqual(outcome(50), {price:50,demand:700,sales:400,revenue:20000,fee:2000,cost:10000,profit:8000});
  assert.equal(outcome(80).profit,18800);assert.equal(outcome(90).profit,16300);
  assert.equal(optimum().price,80);assert.equal(optimum({fixedCost:6000}).profit,14800);
  assert.equal(optimum({fixedCost:22000}).profit,-1200);
  assert.equal(optimum({commission:.2}).price,80);assert.equal(optimum({commission:.2}).profit,15600);
  assert.equal(optimum({commission:.6}).price,85);assert.equal(optimum({commission:.6}).profit,2900);
  assert.equal(optimum({capacity:500}).price,71);assert.ok(Math.abs(optimum({capacity:500}).profit-19511)<1e-8);
  assert.ok(optimum({capacity:500,fixedCost:3000}).profit<optimum().profit);
  for(const [p,profit] of [[75,9300],[85,12020],[95,10680]]) assert.equal(outcome(p!,MERCHANT_TRANSFER).profit,profit);
  assert.equal(optimum(MERCHANT_TRANSFER,40,100).price,85);
});
test('reveals and narrator remain aligned and do not disclose later steps',()=>{
  for(const p of pages) for(let step=0;step<(p.steps?.length??0);step++) {
    const copy=economicVisibleCopy(p,{presentationStep:step});
    for(const hidden of p.steps!.slice(step)) assert.ok(!copy.includes(hidden.title),p.slideKey);
  }
  const p=pages.find(p=>p.merchantLab)!;
  const copy=economicVisibleCopy(p,{price:85,commission:.6,capacity:400,fixedCost:2000});
  assert.ok(copy.includes('2,900元/日'));assert.ok(copy.includes('350件/日'));
});
test('the same quadratic vertex changes validity with capacity, and project cost changes the investment decision',()=>{
  const v=640/9;
  assert.ok(v<80&&v>70);
  assert.equal(outcome(v).sales,400);
  assert.ok(outcome(v,{capacity:500}).sales<500);
  assert.ok(Math.abs(outcome(v,{capacity:500}).profit-175600/9)<1e-8);
  assert.ok(outcome(v,{capacity:500}).profit>outcome(70,{capacity:500}).profit);
  const benefit=optimum({capacity:500}).profit-optimum().profit;
  assert.equal(benefit,711);
  assert.equal(optimum({capacity:500,fixedCost:2000+benefit}).profit,optimum().profit);
  assert.equal(optimum({capacity:500,fixedCost:3000}).profit-optimum().profit,-289);
});
