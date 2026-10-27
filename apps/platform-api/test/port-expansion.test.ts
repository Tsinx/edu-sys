import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PORT_EXPANSION_SLIDES as pages,expansionTotal,expansionOptionSummary,PORT_EXPANSION_FILMS} from '@edu/course-content';
import {buildApp} from '../src/app.js';
test('lessons 7-18: every classroom context follows disclosed material and validates page-scoped events',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-expansion-')),app=await buildApp({dataFile:join(dir,'state.json'),portSimulationTickMs:0});
 try{
  const session=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json(),root=`/api/class-sessions/${session.id}`;
  const event=async(payload:object,status=201)=>{const r=await app.inject({method:'POST',url:root+'/events',payload});assert.equal(r.statusCode,status,r.body);return r;};
  for(const p of pages){
   await event({type:'set_slide',index:p.index});await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:0,option:0,revealed:false});
   let prompt=(await app.inject(root+'/assistant-prompts')).json();assert.equal(prompt.coverage.coveredSlides,767);assert.match(prompt.compiled,/cargo-planning-teaching/);assert.match(prompt.compiled,new RegExp(`第${p.lesson}讲第${p.localPage}/${expansionTotal(p.lesson)}页`));assert.ok(!prompt.compiled.includes(p.teachingCue));if(p.reveal){assert.ok(!prompt.compiled.includes(p.reveal));assert.match(prompt.compiled,/答案尚未揭示/);}
   for(let option=0;option<(p.options?.length??1);option++){
    const state={progress:1,option,revealed:!!p.reveal};await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,...state});
    prompt=(await app.inject(root+'/assistant-prompts')).json();for(const point of p.points)assert.ok(prompt.compiled.includes(point),p.slideKey);if(p.reveal)assert.ok(prompt.compiled.includes(p.reveal),p.slideKey);if(p.options)assert.ok(prompt.compiled.includes(expansionOptionSummary(p,state)));
    assert.deepEqual((await app.inject(root+'/snapshot')).json().portExpansionPresentation,{slideKey:p.slideKey,...state});
   }
   await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:1,option:p.options?.length??1,revealed:false},400);
   if(!p.reveal)await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:1,option:0,revealed:true},400);
  }
  const opening=pages.find(p=>p.slideKey==='l11-singapore-question')!;
  await event({type:'set_slide',index:opening.index});
  const film={progress:.5,option:0,revealed:false,cinematic:{clipId:'l11-opening-v2',status:'playing',elapsedMs:90000,startedAt:Date.now()}};
  await event({type:'set_port_expansion_presentation',slideKey:opening.slideKey,...film});
  assert.deepEqual((await app.inject(root+'/snapshot')).json().portExpansionPresentation,{slideKey:opening.slideKey,...film});
  assert.match((await app.inject(root+'/assistant-prompts')).json().compiled,/90秒/);
  await event({type:'set_port_expansion_presentation',slideKey:opening.slideKey,...film,cinematic:{...film.cinematic,elapsedMs:180001}},400);
  await event({type:'set_port_expansion_presentation',slideKey:opening.slideKey,...film,cinematic:{...film.cinematic,startedAt:Date.now()+60000}},400);
  await event({type:'set_port_expansion_presentation',slideKey:opening.slideKey,...film,cinematic:{...film.cinematic,status:'paused'}},400);
  const next=pages.find(p=>p.lesson===11&&p.localPage===2)!;await event({type:'set_slide',index:next.index});
  await event({type:'set_port_expansion_presentation',slideKey:next.slideKey,...film},400);
  const safetyOpening=pages.find(p=>p.slideKey==='l12-investigation-question')!;
  await event({type:'set_slide',index:safetyOpening.index});
  const safetyFilm={...film,cinematic:{...film.cinematic,clipId:'l12-opening-v2',elapsedMs:90000,startedAt:Date.now()}};
  await event({type:'set_port_expansion_presentation',slideKey:safetyOpening.slideKey,...safetyFilm});
  assert.deepEqual((await app.inject(root+'/snapshot')).json().portExpansionPresentation,{slideKey:safetyOpening.slideKey,...safetyFilm});
  assert.match((await app.inject(root+'/assistant-prompts')).json().compiled,/放行之前/);
  await event({type:'set_port_expansion_presentation',slideKey:safetyOpening.slideKey,...film},400);
  await event({type:'set_slide',index:opening.index});
  await event({type:'set_port_expansion_presentation',slideKey:opening.slideKey,...safetyFilm},400);
  await event({type:'set_slide',index:safetyOpening.index+1});
  await event({type:'set_port_expansion_presentation',slideKey:'l12-tianjin-findings',...safetyFilm},400);
  for(const p of pages.filter(p=>p.mediaId)){
   const f=PORT_EXPANSION_FILMS[p.mediaId!];await event({type:'set_slide',index:p.index});
   const movie={progress:.5,option:0,revealed:false,cinematic:{clipId:f.id,status:'playing',elapsedMs:f.durationMs/2,startedAt:Date.now()}};
   await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,...movie});
   await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,...movie,cinematic:{...movie.cinematic,elapsedMs:f.durationMs+1}},400);
   await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,...movie,cinematic:{...movie.cinematic,clipId:'l11-opening-v2'}},400);
   const context=(await app.inject(root+'/assistant-prompts')).json();assert.ok(!context.compiled.includes('/port-class-lab.html?lesson='+p.lesson));
   assert.match(context.compiled,p.lesson===18?/第18讲历史画面教学短片/:p.lesson===17?(f.source==='pq-animation'?/第17讲原创教学动画/:/第17讲历史画面教学短片/):/新闻教学节选/);
   if(p.lesson===17)assert.ok(context.compiled.includes(`${f.durationMs/1000}秒`));
  }
  const question=pages.find(p=>p.reveal)!;await event({type:'set_slide',index:question.index});await event({type:'set_port_expansion_presentation',slideKey:question.slideKey,progress:0,option:0,revealed:false});
  const prompt=(await app.inject(root+'/assistant-prompts')).json();const override=await app.inject({method:'PATCH',url:`/api/courses/course-port-management-intro/assistant-prompts?index=${question.index}`,payload:{scope:'page',key:`course-port-management-intro:${question.slideKey}`,text:'PRIVATE_UNREVEALED_EXPANSION_ANSWER',expectedRevision:prompt.revision}});assert.equal(override.statusCode,200,override.body);assert.doesNotMatch((await app.inject(root+'/assistant-prompts')).json().compiled,/PRIVATE_UNREVEALED_EXPANSION_ANSWER/);
  await event({type:'set_slide',index:1});await event({type:'set_port_expansion_presentation',slideKey:question.slideKey,progress:1,option:0,revealed:true},409);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
