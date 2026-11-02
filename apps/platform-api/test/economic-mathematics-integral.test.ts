import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {classroomSnapshotSchema} from '@edu/contracts';
import {ECONOMIC_MATHEMATICS_COURSE_ID as courseId,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_VERSION_ID as version,ECONOMIC_MATHEMATICS_SLIDES as slides,getEconomicMathematicsHistoricalCounts as history,getEconomicMathematicsInteractionDefinition as definition,economicVisibleCopy} from '@edu/course-content/economic-mathematics';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {buildApp} from '../src/app.js';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

test('both integral experiments and reveals retain ownership, page scoping, conflicts, reconnect and restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'econ-integral-')),dataFile=join(dir,'state.json');let app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});
 try{
  const login=async(role:string)=>{const r=await app.inject({method:'POST',url:'/api/identity/development/session',payload:{role,participantId:'integral-'+role,displayName:'测试'}});assert.equal(r.statusCode,201);return{cookie:String(r.headers['set-cookie']).split(';')[0]!};};
  let teacher=await login('teacher');const student=await login('student');
  const start=await app.inject({method:'POST',url:'/api/courses/'+courseId+'/class-sessions',headers:teacher,payload:{mode:'new',lesson:16}});assert.equal(start.statusCode,201);
  const url='/api/class-sessions/'+start.json().id,control=(payload:Record<string,unknown>,headers=teacher)=>app.inject({method:'POST',url:url+'/events',headers,payload});
  for(const kind of ['primitive-family','arctan'] as const){
   const p=slides.find(p=>p.integralLab===kind)!;assert.equal((await control({type:'set_slide',index:p.index})).statusCode,201);
   const patch=kind==='arctan'?{arctanX:2}:{primitiveC:1.5,primitiveX:-.5};const event={type:'set_slide_interaction',slideId:p.slideKey,expectedRevision:1,patch};
   assert.equal((await control(event,student)).statusCode,403);
   for(const invalid of [{presentationStep:1},{businessPrice:100},...(kind==='arctan'?[{primitiveC:1},{arctanX:5}]:[{arctanX:1},{primitiveC:4}])])assert.equal((await control({...event,patch:invalid})).statusCode,400);
   assert.equal((await control(event)).statusCode,201);assert.equal((await control(event)).statusCode,409);
   await control({type:'next_slide'});const back=await control({type:'previous_slide'});for(const[key,value]of Object.entries(patch))assert.equal(back.json().slideInteraction.values[key],value);
   const shared=classroomSnapshotSchema.parse((await app.inject({method:'GET',url:url+'/snapshot',headers:student})).json());assert.deepEqual(shared.slideInteraction?.values,back.json().slideInteraction.values);
  }
  const check=slides.find(p=>p.lesson===16&&p.conceptCheck)!;await control({type:'set_slide',index:check.index});assert.equal((await control({type:'set_slide_interaction',slideId:check.slideKey,expectedRevision:1,patch:{presentationStep:1}})).statusCode,201);
  await app.close();app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});teacher=await login('teacher');
  const restored=classroomSnapshotSchema.parse((await app.inject({method:'GET',url:url+'/snapshot',headers:teacher})).json());assert.equal(restored.slideInteraction?.values.presentationStep,1);
  for(const kind of ['primitive-family','arctan'] as const){const p=slides.find(p=>p.integralLab===kind)!;const back=await control({type:'set_slide',index:p.index});assert.equal(back.json().slideInteraction.values[kind==='arctan'?'arctanX':'primitiveC'],kind==='arctan'?2:1.5);}
  for(const old of [{version:'release-economic-mathematics-market-2026-10-31',deck:'deck-economic-mathematics-2026-market',lesson:16,page:1,key:'em-v2-l17-p001',total:1084},{version:'release-economic-mathematics-antiderivatives-2026-10-31',deck:'deck-economic-mathematics-2026-antiderivatives',lesson:16,page:56,key:'em-l16-integral-20261031-p056',total:1130},{version:'release-economic-mathematics-integral-foundations-2026-11-01',deck:'deck-economic-mathematics-2026-integral-foundations',lesson:17,page:33,key:'em-l17-integral-20261101-p033',total:1138},{version:'release-economic-mathematics-integral-merged-2026-11-01',deck:'deck-economic-mathematics-2026-integral-merged',lesson:17,page:10,key:'em-v2-l19-p010',total:1099}]){
   await app.close();const saved=JSON.parse(await readFile(dataFile,'utf8')),id=start.json().id,counts=history(old.version)!;
   Object.assign(saved.classroomRuntimes[id],{deckId:old.deck,deckVersion:old.version,slideIndex:counts.slice(0,old.lesson-1).reduce((sum,n)=>sum+n,0)+old.page,slideKey:old.key});saved.classroomRuntimes[id].slideInteractions[old.key]={revision:9,values:{presentationStep:0}};await writeFile(dataFile,JSON.stringify(saved));
   app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});teacher=await login('teacher');
   const snapshot=classroomSnapshotSchema.parse((await app.inject({method:'GET',url:url+'/snapshot',headers:teacher})).json());assert.equal(snapshot.slide.versionId,old.version);assert.equal(snapshot.slide.slideId,old.key);assert.equal(snapshot.slide.total,old.total);assert.equal(snapshot.slide.lessonNumber,old.lesson);assert.equal(snapshot.slideInteraction?.revision,9);assert.equal((await control({type:'next_slide'})).statusCode,409);
  }
 }finally{await app.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep)&&basename(dir).startsWith('econ-integral-'));await rm(dir,{recursive:true,force:true});}
});
test('the assistant receives exactly the already public primitive proof steps and mathematical readouts',()=>{
 const deck=getCourseDeckByCourseId(courseId)!;
 for(const p of slides.filter(p=>p.lesson===16&&p.steps?.length)){
  const frame=deck.getSlide(p.index),d=definition(p)!;
  for(let step=0;step<=p.steps!.length;step++){
   const context={courseId,courseTitle:'经济数学',activeActivity:'slides' as const,slide:{...frame,slideId:p.slideKey,deckId,versionId:version,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const},slideInteraction:{deckId,slideId:p.slideKey,revision:1,values:{...d.defaults,presentationStep:step}},simulation:null,globePlayback:{cueId:null,runId:null,stepIndex:0,status:'idle' as const,stepStartedAt:null,stepElapsedMs:0}};
   const prompt=buildPromptWorkspace(courseId,'经济数学',undefined,p.index,'slides',context).compiled;
   const exposed=economicVisibleCopy(p,context.slideInteraction.values);
   for(const hidden of p.steps!.slice(step))for(const material of[hidden.text,hidden.formula])if(material&&!exposed.includes(material))assert.ok(!prompt.includes(material),p.title+':'+hidden.title);
   assert.ok(!prompt.includes(p.teachingCue));assert.ok(!prompt.includes('exerciseActivityId'));
  }
 }
 const p=slides.find(p=>p.integralLab)!,d=definition(p)!,frame=deck.getSlide(p.index);
 const context={courseId,courseTitle:'经济数学',activeActivity:'slides' as const,slide:{...frame,slideId:p.slideKey,deckId,versionId:version,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const},slideInteraction:{deckId,slideId:p.slideKey,revision:2,values:{...d.defaults,primitiveC:1.5,primitiveX:-.5}},simulation:null,globePlayback:{cueId:null,runId:null,stepIndex:0,status:'idle' as const,stepStartedAt:null,stepElapsedMs:0}};
 const prompt=buildPromptWorkspace(courseId,'经济数学',undefined,p.index,'slides',context).compiled;assert.ok(prompt.includes('函数值 F(x₀)：1.75'));assert.ok(prompt.includes('导数 F′(x₀)=2x₀：-1'));
 const angle=slides.find(p=>p.integralLab==='arctan')!,angleDef=definition(angle)!,angleFrame=deck.getSlide(angle.index);
 const angleContext={...context,slide:{...angleFrame,slideId:angle.slideKey,deckId,versionId:version,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const},slideInteraction:{deckId,slideId:angle.slideKey,revision:2,values:{...angleDef.defaults,arctanX:2}}};
 const anglePrompt=buildPromptWorkspace(courseId,'经济数学',undefined,angle.index,'slides',angleContext).compiled;assert.ok(anglePrompt.includes('主值角 y₀（弧度）：约1.1071'));assert.ok(anglePrompt.includes('导数 1/(1+x₀²)：0.2'));

});
