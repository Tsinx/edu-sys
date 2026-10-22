import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ECONOMIC_MATHEMATICS_COURSE_ID as courseId,ECONOMIC_MATHEMATICS_SLIDES as slides,ECONOMIC_MATHEMATICS_DECK_ID as deckId,ECONOMIC_MATHEMATICS_VERSION_ID as versionId,getEconomicMathematicsInteractionDefinition as definition} from '@edu/course-content/economic-mathematics';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {buildApp} from '../src/app.js';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

test('new experiments retain teacher authority, range checking, restoration and restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'foundations-')),dataFile=join(dir,'state.json');let app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});
  try{
    const login=async(role:string)=>{const r=await app.inject({method:'POST',url:'/api/identity/development/session',payload:{role,participantId:'foundation-'+role,displayName:'测试'}});return {cookie:String(r.headers['set-cookie']).split(';')[0]!};};
    const teacher=await login('teacher'),student=await login('student');
    const opened=await app.inject({method:'POST',url:`/api/courses/${courseId}/class-sessions`,headers:teacher});const url='/api/class-sessions/'+opened.json().id;
    const event=(payload:Record<string,unknown>,headers=teacher)=>app.inject({method:'POST',url:url+'/events',headers,payload});
    const cases=[['angle',{angle:.05}],['compounding',{nominalRate:.2,compoundCount:'365'}],['continuity-repair',{pointValue:2}],['derivative-secant',{increment:0}],['differential-error',{increment:-20}],['bisection',{bisectionSteps:12}]] as const;
    for(const [lab,patch]of cases){const s=slides.find(s=>s.foundationLab===lab)!;await event({type:'set_slide',index:s.index});const p={type:'set_slide_interaction',slideId:s.slideKey,expectedRevision:1,patch};assert.equal((await event(p,student)).statusCode,403);assert.equal((await event(p)).statusCode,201);assert.equal((await event(p)).statusCode,409);await event({type:'next_slide'});const back=await event({type:'previous_slide'});for(const [k,v]of Object.entries(patch))assert.equal(back.json().slideInteraction.values[k],v);}
    const last=slides.find(s=>s.foundationLab==='bisection')!;assert.equal((await event({type:'set_slide_interaction',slideId:last.slideKey,expectedRevision:2,patch:{bisectionSteps:1.5}})).statusCode,400);
    await app.close();app=await buildApp({dataFile,portSimulationTickMs:0,allowLegacyDevelopmentIdentity:false});const loginAgain=await login('teacher');const r=await app.inject({method:'GET',url:url+'/snapshot',headers:loginAgain});assert.equal(r.json().slideInteraction.values.bisectionSteps,12);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

test('all new classroom choices are public while only revealed feedback enters assistant context',()=>{
  const deck=getCourseDeckByCourseId(courseId)!;
  for(const s of slides.filter(s=>[5,6,7,8,9,10].includes(s.lesson)&&s.conceptCheck)){const d=definition(s)!;
    for(const step of [0,1,2]){const frame=deck.getSlide(s.index);const ctx={courseId,courseTitle:'经济数学',activeActivity:'slides' as const,slide:{...frame,slideId:s.slideKey,deckId,versionId,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const},slideInteraction:{deckId,slideId:s.slideKey,revision:1,values:{...d.defaults,presentationStep:step}},simulation:null,globePlayback:{cueId:null,runId:null,stepIndex:0,status:'idle' as const,stepStartedAt:null,stepElapsedMs:0}};
      const prompt=buildPromptWorkspace(courseId,'经济数学',undefined,s.index,'slides',ctx).compiled;
      for(const row of s.table!.rows)assert.ok(prompt.includes(row[0]!),s.title);
      assert.ok(!prompt.includes('teachingCue'));assert.ok(!prompt.includes('assistantCue'));assert.ok(!prompt.includes('teachingSeconds'));
      for(let i=0;i<2;i++){const text=s.steps![i]!.text!;assert.equal(prompt.includes(text),i<step,`${s.title}:${step}:${i}`);}
    }
  }
});
