import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PORT_EXPANSION_SLIDES as pages,expansionOptionSummary} from '@edu/course-content';
import {buildApp} from '../src/app.js';
test('lessons 7-10: every classroom context follows disclosed material and validates page-scoped events',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-expansion-')),app=await buildApp({dataFile:join(dir,'state.json'),portSimulationTickMs:0});
 try{
  const session=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json(),root=`/api/class-sessions/${session.id}`;
  const event=async(payload:object,status=201)=>{const r=await app.inject({method:'POST',url:root+'/events',payload});assert.equal(r.statusCode,status,r.body);return r;};
  for(const p of pages){
   await event({type:'set_slide',index:p.index});await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:0,option:0,revealed:false});
   let prompt=(await app.inject(root+'/assistant-prompts')).json();assert.equal(prompt.coverage.coveredSlides,485);assert.match(prompt.compiled,/cargo-planning-teaching/);assert.match(prompt.compiled,new RegExp(`第${p.lesson}讲第${p.localPage}/48页`));assert.ok(!prompt.compiled.includes(p.teachingCue));if(p.reveal){assert.ok(!prompt.compiled.includes(p.reveal));assert.match(prompt.compiled,/答案尚未揭示/);}
   for(let option=0;option<(p.options?.length??1);option++){
    const state={progress:1,option,revealed:!!p.reveal};await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,...state});
    prompt=(await app.inject(root+'/assistant-prompts')).json();for(const point of p.points)assert.ok(prompt.compiled.includes(point),p.slideKey);if(p.reveal)assert.ok(prompt.compiled.includes(p.reveal),p.slideKey);if(p.options)assert.ok(prompt.compiled.includes(expansionOptionSummary(p,state)));
    assert.deepEqual((await app.inject(root+'/snapshot')).json().portExpansionPresentation,{slideKey:p.slideKey,...state});
   }
   await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:1,option:p.options?.length??1,revealed:false},400);
   if(!p.reveal)await event({type:'set_port_expansion_presentation',slideKey:p.slideKey,progress:1,option:0,revealed:true},400);
  }
  const question=pages.find(p=>p.reveal)!;await event({type:'set_slide',index:question.index});await event({type:'set_port_expansion_presentation',slideKey:question.slideKey,progress:0,option:0,revealed:false});
  const prompt=(await app.inject(root+'/assistant-prompts')).json();const override=await app.inject({method:'PATCH',url:`/api/courses/course-port-management-intro/assistant-prompts?index=${question.index}`,payload:{scope:'page',key:`course-port-management-intro:${question.slideKey}`,text:'PRIVATE_UNREVEALED_EXPANSION_ANSWER',expectedRevision:prompt.revision}});assert.equal(override.statusCode,200,override.body);assert.doesNotMatch((await app.inject(root+'/assistant-prompts')).json().compiled,/PRIVATE_UNREVEALED_EXPANSION_ANSWER/);
  await event({type:'set_slide',index:1});await event({type:'set_port_expansion_presentation',slideKey:question.slideKey,progress:1,option:0,revealed:true},409);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
