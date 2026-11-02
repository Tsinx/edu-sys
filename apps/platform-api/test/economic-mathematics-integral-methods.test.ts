import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_COURSE_ID as courseId,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_VERSION_ID as version,INTEGRAL_METHOD_ACTIVITIES as activities,economicVisibleCopy,getEconomicMathematicsInteractionDefinition as definition} from '@edu/course-content/economic-mathematics';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
import {buildApp} from '../src/app.js';
test('all four written stems enter public context while solution stages and teacher metadata stay hidden',()=>{
 const deck=getCourseDeckByCourseId(courseId)!;
 for(const a of activities){const p=slides.find(p=>p.exerciseActivityId===a.id)!;const prompt=buildPromptWorkspace(courseId,'经济数学',undefined,p.index).compiled;for(const q of a.questions){assert.ok(prompt.includes(q.stem));for(const c of q.conditions)assert.ok(prompt.includes(c));}assert.ok(!prompt.includes(a.id));}
 for(const p of slides.filter(p=>[17,18].includes(p.lesson)&&p.steps?.length))for(let step=0;step<=p.steps!.length;step++){
  const frame=deck.getSlide(p.index),d=definition(p)!,context={courseId,courseTitle:'经济数学',activeActivity:'slides' as const,slide:{...frame,slideId:p.slideKey,deckId,versionId:version,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const},slideInteraction:{deckId,slideId:p.slideKey,revision:1,values:{...d.defaults,presentationStep:step}},simulation:null,globePlayback:{cueId:null,runId:null,stepIndex:0,status:'idle' as const,stepStartedAt:null,stepElapsedMs:0}};
  const prompt=buildPromptWorkspace(courseId,'经济数学',undefined,p.index,'slides',context).compiled,exposed=economicVisibleCopy(p,context.slideInteraction.values);
  for(const hidden of p.steps!.slice(step))for(const material of[hidden.text,hidden.formula])if(material&&!exposed.includes(material))assert.ok(!prompt.includes(material),p.title+':'+hidden.title);
  assert.ok(!prompt.includes(p.teachingCue));assert.ok(!prompt.includes('exerciseActivityId'));
 }
});
test('method feedback preserves teacher ownership, step bounds, conflicts, return and service restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'econ-methods-')),dataFile=join(dir,'state.json');let app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});
 try{
  const login=async(role:string)=>{const r=await app.inject({method:'POST',url:'/api/identity/development/session',payload:{role,participantId:'methods-'+role,displayName:'测试'}});assert.equal(r.statusCode,201);return{cookie:String(r.headers['set-cookie']).split(';')[0]!};};
  let teacher=await login('teacher');const student=await login('student'),start=await app.inject({method:'POST',url:'/api/courses/'+courseId+'/class-sessions',headers:teacher,payload:{mode:'new',lesson:17}});assert.equal(start.statusCode,201);
  const url='/api/class-sessions/'+start.json().id,control=(payload:Record<string,unknown>,headers=teacher)=>app.inject({method:'POST',url:url+'/events',headers,payload});
  for(const lesson of[17,18]){
   const p=slides.find(p=>p.lesson===lesson&&p.kind==='solution')!;await control({type:'set_slide',index:p.index});
   const event={type:'set_slide_interaction',slideId:p.slideKey,expectedRevision:1,patch:{presentationStep:1}};
   assert.equal((await control(event,student)).statusCode,403);assert.equal((await control({...event,patch:{presentationStep:p.steps!.length+1}})).statusCode,400);
   assert.equal((await control(event)).statusCode,201);assert.equal((await control(event)).statusCode,409);
   await control({type:'next_slide'});assert.equal((await control({type:'previous_slide'})).json().slideInteraction.values.presentationStep,1);
  }
  await app.close();app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});teacher=await login('teacher');
  for(const lesson of[17,18]){const p=slides.find(p=>p.lesson===lesson&&p.kind==='solution')!;const restored=await control({type:'set_slide',index:p.index},teacher);assert.equal(restored.json().slideInteraction.values.presentationStep,1);}
 }finally{await app.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep)&&basename(dir).startsWith('econ-methods-'));await rm(dir,{recursive:true,force:true});}
});
