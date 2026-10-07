import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {classroomSnapshotSchema} from "@edu/contracts";
import {ECONOMIC_MATHEMATICS_COURSE_ID as courseId,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_VERSION_ID as version,ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_LESSONS as lessons,ECONOMIC_MATHEMATICS_INTERACTIONS as labs,economicModels as M,economicCurve,getEconomicMathematicsInteractionDefinition as definition,validateEconomicMathematicsInteractionState as valid} from "@edu/course-content/economic-mathematics";
import {buildApp} from "../src/app.js";
import {buildPromptWorkspace} from "../src/assistant/prompts.js";
import {getCourseDeckByCourseId} from "@edu/course-content/deck-registry";
test("V2 curriculum, models, geometric evidence and interaction domains",()=>{
 assert.equal(lessons.length,32);assert.equal(lessons.reduce((s,l)=>s+l.hours,0),64);
 assert.equal(slides.length,lessons.reduce((s,l)=>s+l.slideTotal,0));assert.ok(slides.length<600);
 assert.equal(new Set(slides.map(s=>s.slideKey)).size,slides.length);assert.equal(Object.keys(labs).length,13);
 assert.ok(slides.filter(s=>s.style==="constructivist").length/slides.length<=.15);
 for(const lesson of lessons){assert.equal(lesson.route?.reduce((s,r)=>s+r.minutes,0),90);assert.ok(lesson.prerequisites?.length);assert.ok(lesson.outcomes?.length);}
 for(const s of slides){const d=definition(s);if(d){assert.ok(valid(d,d.defaults),s.slideKey);assert.equal(valid(d,{...d.defaults,presentationStep:.5}),false);assert.equal(valid(d,{...d.defaults,presentationStep:(s.steps?.length??0)+1}),false);}}
 assert.equal(M.demand(50),700);assert.equal(M.profit(70),23000);assert.equal(M.accumulated(8),1216);assert.equal(M.rate(4),168);
 assert.equal(M.response(60,25),840);assert.equal(M.response(55,36),904);
 assert.equal(economicCurve("surface",60,{advertising:25}),840);assert.ok(economicCurve("surface",61,{advertising:25})<840);
 assert.ok(Math.abs(M.sinc(.01)-1)<.00002);assert.equal(M.sinc(.2),M.sinc(-.2));assert.ok(M.sinc(.2)<1);
 for(const x of [.01,.2,.65,1.2]){assert.ok(.5*Math.sin(x)*Math.cos(x)<.5*x);assert.ok(.5*x<.5*Math.tan(x));}
 assert.equal(M.twoInputProfit(20,15),525);assert.deepEqual(M.budgetOptimum(100),{x:64,y:36,value:500});
 assert.equal(M.consumerSurplus(60),18000);
 const seq=definition(slides.find(s=>s.interactionId==="sequence-limit-lab")!)!;assert.equal(valid(seq,{...seq.defaults,n:0}),false);
 const budget=definition(slides.find(s=>s.interactionId==="budget-constraint-lab")!)!;assert.equal(valid(budget,{...budget.defaults,budget:"25",channelX:26}),false);
});
test("SSE sends public steps to both viewers and restores the authoritative step after disconnect",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"econ-v2-sse-"));
 const app=await buildApp({dataFile:join(dir,"state.json"),portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});
 const controllers:AbortController[]=[];
 try{
  const base=await app.listen({port:0,host:"127.0.0.1"});
  const login=async(role:string)=>{
   const response=await app.inject({method:"POST",url:"/api/identity/development/session",payload:{role,participantId:"econ-test-"+role,displayName:"测试"}});
   assert.equal(response.statusCode,201);return {cookie:String(response.headers["set-cookie"]).split(";")[0]!};
  };
  const teacherHeaders=await login("teacher"),studentHeaders=await login("student");
  const started=await app.inject({method:"POST",url:"/api/courses/"+courseId+"/class-sessions",headers:teacherHeaders});
  const url="/api/class-sessions/"+started.json().id;
  const s=slides.find(s=>s.lesson===1&&s.title==="价格模型的定义域")!;
  await app.inject({method:"POST",url:url+"/events",headers:teacherHeaders,payload:{type:"set_slide",index:s.index}});
  assert.equal((await app.inject({method:"POST",url:url+"/events",headers:studentHeaders,payload:{type:"set_slide_interaction",slideId:s.slideKey,expectedRevision:1,patch:{presentationStep:2}}})).statusCode,403);
  const open=async(headers:{cookie:string})=>{
   const controller=new AbortController();controllers.push(controller);
   const response=await fetch(base+url+"/snapshot/stream",{signal:controller.signal,headers});
   assert.equal(response.status,200);assert.match(response.headers.get("content-type")!,/text\/event-stream/);
   const reader=response.body!.getReader();let buffer="";
   const next=async()=>{
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{while(!buffer.includes("\n\n")){const chunk=await reader.read();assert.equal(chunk.done,false);buffer+=new TextDecoder().decode(chunk.value);}
     const end=buffer.indexOf("\n\n"),event=buffer.slice(0,end);buffer=buffer.slice(end+2);
     const data=event.split("\n").find(line=>line.startsWith("data: "));assert.ok(data);
     return classroomSnapshotSchema.parse(JSON.parse(data.slice(6)));
    }finally{clearTimeout(timeout);}
   };
   return {next,close:()=>controller.abort()};
  };
  const teacher=await open(teacherHeaders),student=await open(studentHeaders);
  assert.equal((await teacher.next()).slideInteraction?.values.presentationStep,0);
  assert.equal((await student.next()).slideInteraction?.values.presentationStep,0);
  const patch=await app.inject({method:"POST",url:url+"/events",headers:teacherHeaders,payload:{type:"set_slide_interaction",slideId:s.slideKey,expectedRevision:1,patch:{presentationStep:2}}});assert.equal(patch.statusCode,201);
  const [t,u]=await Promise.all([teacher.next(),student.next()]);
  assert.equal(t.slideInteraction?.values.presentationStep,2);assert.deepEqual(u.slideInteraction,t.slideInteraction);
  teacher.close();student.close();
  const reconnected=await open(studentHeaders);assert.equal((await reconnected.next()).slideInteraction?.values.presentationStep,2);reconnected.close();
 }finally{controllers.forEach(c=>c.abort());await app.close();await rm(dir,{recursive:true,force:true});}
});
test("assistant receives only the cumulative public steps, including override protection",()=>{
 const s=slides.find(s=>s.lesson===32&&s.title==="驻点、端点与证据")!;
 const deck=getCourseDeckByCourseId(courseId)!,frame=deck.getSlide(s.index),d=definition(s)!;
 const context=(step:number)=>({courseId,courseTitle:"经济数学",activeActivity:"slides" as const,slide:{deckId,versionId:version,slideId:s.slideKey,index:s.index,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:"16:10" as const,title:s.title,lessonNumber:32,lessonTitle:s.lessonTitle,section:s.section,summary:frame.summary},slideInteraction:{deckId,slideId:s.slideKey,revision:1,values:{...d.defaults,presentationStep:step}},simulation:null,globePlayback:{cueId:null,runId:null,stepIndex:0,status:"idle" as const,stepStartedAt:null,stepElapsedMs:0}});
 const settings={revision:1,overrides:{[JSON.stringify(["page",courseId+":"+s.slideKey])]:"PRIVATE_OVERRIDE_SECRET"}};
 const hidden=buildPromptWorkspace(courseId,"经济数学",settings,s.index,"slides",context(0)).compiled;
 assert.ok(!hidden.includes("PRIVATE_OVERRIDE_SECRET"));assert.ok(!hidden.includes("U(4,4)=56"));assert.ok(!hidden.includes("56-5"));
 const partial=buildPromptWorkspace(courseId,"经济数学",undefined,s.index,"slides",context(1)).compiled;
 assert.ok(partial.includes("U(0,12)=-24"));assert.ok(!partial.includes("U(4,4)=56"));
 const full=buildPromptWorkspace(courseId,"经济数学",undefined,s.index,"slides",context(3)).compiled;
 assert.ok(full.includes("U(4,4)=56"));assert.ok(full.includes("56-5"));
 const lab=slides.find(s=>s.interactionId==="unconstrained-optimum-lab")!;
 const unrevealedLab=buildPromptWorkspace(courseId,"经济数学",undefined,lab.index).compiled;
 assert.ok(!unrevealedLab.includes("525"),"prior-page optimum must not leak into a hidden laboratory answer");
 assert.ok(!unrevealedLab.includes("PRIVATE_OVERRIDE_SECRET"));
});
test("classroom steps synchronize, reject conflicts, restore on return and restart; archived identities never migrate",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"econ-v2-")),dataFile=join(dir,"state.json");
 let app=await buildApp({dataFile,portSimulationTickMs:0});
 try{
 const start=await app.inject({method:"POST",url:"/api/courses/"+courseId+"/class-sessions"});assert.equal(start.statusCode,201);const id=start.json().id as string,url="/api/class-sessions/"+id;
 const initial=classroomSnapshotSchema.parse((await app.inject({method:"GET",url:url+"/snapshot"})).json());assert.equal(initial.slide.deckId,deckId);assert.equal(initial.slide.total,slides.length);
 const s=slides.find(s=>s.lesson===1&&s.title==="价格模型的定义域")!;
 const control=(payload:Record<string,unknown>)=>app.inject({method:"POST",url:url+"/events",payload});
 assert.equal((await control({type:"set_slide",index:s.index})).statusCode,201);
 assert.equal((await control({type:"set_slide_interaction",slideId:s.slideKey,expectedRevision:1,patch:{presentationStep:.5}})).statusCode,400);
 const updated=await control({type:"set_slide_interaction",slideId:s.slideKey,expectedRevision:1,patch:{presentationStep:2}});assert.equal(updated.statusCode,201);assert.equal(updated.json().slideInteraction.revision,2);
 assert.equal((await control({type:"set_slide_interaction",slideId:s.slideKey,expectedRevision:1,patch:{presentationStep:3}})).statusCode,409);
 await control({type:"next_slide"});const restored=await control({type:"previous_slide"});assert.equal(restored.json().slideInteraction.values.presentationStep,2);
 await app.close();app=await buildApp({dataFile,portSimulationTickMs:0});
 const reconnect=classroomSnapshotSchema.parse((await app.inject({method:"GET",url:url+"/snapshot"})).json());assert.equal(reconnect.slideInteraction?.values.presentationStep,2);assert.equal(reconnect.slideInteraction?.revision,2);
 await app.close();const saved=JSON.parse(await readFile(dataFile,"utf8"));saved.classroomRuntimes[id].deckId="deck-economic-mathematics-2026";saved.classroomRuntimes[id].deckVersion="release-economic-mathematics-v1";saved.classroomRuntimes[id].slideIndex=1390;saved.classroomRuntimes[id].slideKey="em-l31-24-lab-optimum";saved.classroomRuntimes[id].slideInteractions["em-l31-24-lab-optimum"]={revision:7,values:{budget:"100",channelX:64}};await writeFile(dataFile,JSON.stringify(saved));
 app=await buildApp({dataFile,portSimulationTickMs:0});const old=classroomSnapshotSchema.parse((await app.inject({method:"GET",url:url+"/snapshot"})).json());
 assert.equal(old.slide.versionId,"release-economic-mathematics-v1");assert.equal(old.slide.index,1390);assert.match(old.slide.title,/已归档/);assert.equal(old.slideInteraction?.revision,7);
 const rejected=await control({type:"next_slide"});assert.equal(rejected.statusCode,409);assert.equal(rejected.json().error,"COURSE_DECK_ARCHIVED");
 const fresh=await app.inject({method:"POST",url:"/api/courses/"+courseId+"/class-sessions",payload:{mode:"new"}});assert.equal(fresh.statusCode,201);
 const freshFrame=(await app.inject({method:"GET",url:"/api/class-sessions/"+fresh.json().id+"/snapshot"})).json().slide;assert.equal(freshFrame.versionId,version);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
