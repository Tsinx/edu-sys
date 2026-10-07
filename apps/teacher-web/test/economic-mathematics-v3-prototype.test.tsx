import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {lesson01} from "../../../packages/course-content/src/economic-mathematics/v3/lesson-01.js";
import {lesson05} from "../../../packages/course-content/src/economic-mathematics/v3/lesson-05.js";
import {lesson26} from "../../../packages/course-content/src/economic-mathematics/v3/lesson-26.js";
import {lesson31} from "../../../packages/course-content/src/economic-mathematics/v3/lesson-31.js";
import {getEconomicMathematicsInteractionDefinition as definition} from "@edu/course-content/economic-mathematics";
import {EconomicMathematicsTeachingSlides as Slide} from "../src/features/economic-mathematics/EconomicMathematicsTeachingSlides";

test("four V3 baselines have two paced hours and parse every public and fully revealed page",()=>{
 for(const lesson of [lesson01,lesson05,lesson26,lesson31]){
  for(const hour of [1,2]){const pages=lesson.slides.filter(p=>p.classHour===hour);assert.ok(pages.length>=30&&pages.length<=50);assert.equal(pages.reduce((n,p)=>n+p.teachingSeconds!,0),2700);}
  for(const [i,page] of lesson.slides.entries()){
   const spec={...page,index:i+1,lesson:lesson.number,lessonTitle:lesson.title,unit:lesson.unit as 1,unitTitle:lesson.unitTitle,localIndex:i+1,localTotal:lesson.slides.length};
   const d=definition(spec);
   for(const step of [0,page.steps?.length??0]){
    const html=renderToStaticMarkup(<Slide spec={spec} readOnly interaction={d?{deckId:"deck-economic-mathematics-2026-v3",slideId:spec.slideKey,revision:1,values:{...d.defaults,presentationStep:step}}:null}/>);
    assert.ok(!html.includes("katex-error"),page.title);
    for(const privateField of ["teachingCue","assistantCue","teachingSeconds","moduleId","routeRole","presentationStep","<input","<button"]){assert.ok(!html.includes(privateField),page.title+":"+privateField);}
   }
  }
 }
});
test("graphic stages and table emphasis follow the same published integer",()=>{
 const l=lesson05,p=l.slides.find(p=>p.title==="三个区域放在一起")!;
 const spec={...p,index:1,lesson:5,lessonTitle:l.title,unit:2 as const,unitTitle:l.unitTitle,localIndex:1,localTotal:l.slides.length},d=definition(spec)!;
 const render=(step:number)=>renderToStaticMarkup(<Slide spec={spec} readOnly interaction={{deckId:"deck-economic-mathematics-2026-v3",slideId:p.slideKey,revision:1,values:{...d.defaults,presentationStep:step}}}/>);
 assert.ok(!render(0).includes("内接三角形："));assert.ok(render(1).includes("内接三角形："));assert.ok(!render(1).includes("扇形："));assert.ok(render(3).includes("外接三角形："));
});
