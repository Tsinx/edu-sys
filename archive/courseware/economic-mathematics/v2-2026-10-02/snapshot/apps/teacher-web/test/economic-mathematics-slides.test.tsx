import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_DECK_ID as deckId,getEconomicMathematicsInteractionDefinition as definition,economicVisibleCopy} from "@edu/course-content/economic-mathematics";
import {EconomicMathematicsTeachingSlides as Slide,economicLabReadout,buildEconomicMathematicsControlPatch} from "../src/features/economic-mathematics/EconomicMathematicsTeachingSlides";
import {EconomicPlot} from "../src/features/economic-mathematics/EconomicMathematicsFigures";
test("all pages parse inline and display mathematics; full answers exclude teacher metadata and controls",()=>{
 for(const s of slides){
 const d=definition(s),values={...d?.defaults,presentationStep:s.steps?.length??0};
 const html=renderToStaticMarkup(<Slide spec={s} interaction={d?{deckId,slideId:s.slideKey,revision:1,values}:null} readOnly/>);
 assert.ok(html.includes("em-slide"),s.slideKey);
 for(const forbidden of ["teachingCue","assistantCue","storyBeat","voyageStage","openQuestion","<input","<button","lockedAxis","presentationStep"])assert.ok(!html.includes(forbidden),s.slideKey+":"+forbidden);
 assert.ok(!html.includes("katex-error"),s.slideKey);
 const copy=economicVisibleCopy(s,values);
 assert.ok(!/让学生|告诉学生|今天不先|不背口号|先拆掉/.test(copy),s.slideKey);
 }
});
test("unrevealed steps are absent from DOM, and input controls stay outside the projection",()=>{
 const s=slides.find(s=>s.title==="独立建模：打印费用")!,d=definition(s)!;
 const render=(step:number)=>renderToStaticMarkup(<Slide spec={s} interaction={{deckId,slideId:s.slideKey,revision:1,values:{...d.defaults,presentationStep:step}}} readOnly={false}/>);
 assert.ok(!render(0).includes("费用规则"));assert.ok(render(1).includes("费用规则"));assert.ok(!render(1).includes("输入范围"));assert.ok(render(3).includes("输入范围"));assert.ok(!render(3).includes("<button"));
});
test("laboratory outputs are finite, labelled, and controls adjust dependent constraints atomically",()=>{
 for(const s of slides.filter(s=>s.interactionId)){const d=definition(s)!;const readout=economicLabReadout(s.interactionId!,{...d.defaults});assert.ok(readout.length>0);assert.ok(!JSON.stringify(readout).match(/NaN|Infinity/));}
 assert.deepEqual(buildEconomicMathematicsControlPatch("budget","25",{channelX:50}),{budget:"25",channelX:25});
 assert.deepEqual(buildEconomicMathematicsControlPatch("approach","right",{orderAmount:98,approach:"left"}),{approach:"right",orderAmount:99.01});
 const midpoint=economicLabReadout("riemann-sum-lab",{partitions:"4",sample:"midpoint"});
 const left=economicLabReadout("riemann-sum-lab",{partitions:"4",sample:"left"});
 assert.deepEqual(midpoint[1],["矩形估算","1,224件"]);assert.deepEqual(left[1],["矩形估算","1,200件"]);
 const fine=economicLabReadout("riemann-sum-lab",{partitions:"64",sample:"midpoint"});
 assert.deepEqual(fine[3],["估算−精确","0.031件"]);
});
test("valid extreme changes keep the displayed economic points inside the chart",()=>{
 const cases=[
  {lab:"secant-tangent-lab",model:"secant" as const,values:{basePrice:25,h:-20}},
  {lab:"secant-tangent-lab",model:"secant" as const,values:{basePrice:95,h:20}},
  {lab:"linearization-error-lab",model:"linear-error" as const,values:{basePrice:30,deltaPrice:-15}},
  {lab:"linearization-error-lab",model:"linear-error" as const,values:{basePrice:80,deltaPrice:15}},
  {lab:"tangent-plane-lab",model:"plane" as const,values:{basePrice:100,baseAdvertising:100,deltaPrice:10,deltaAdvertising:25}},
  {lab:"tangent-plane-lab",model:"plane" as const,values:{basePrice:30,baseAdvertising:25,deltaPrice:-10,deltaAdvertising:-24}}
 ];
 for(const c of cases){
  const html=renderToStaticMarkup(<EconomicPlot config={{model:c.model,xLabel:"价格",yLabel:"结果"}} lab={c.lab} values={c.values}/>);
  const points=[...html.matchAll(/<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/g)];
  assert.ok(points.length>0,c.lab);
  for(const p of points){const x=Number(p[1]),y=Number(p[2]);assert.ok(x>=130&&x<=1140&&y>=110&&y<=470,c.lab+":"+x+","+y);}
 }
});
