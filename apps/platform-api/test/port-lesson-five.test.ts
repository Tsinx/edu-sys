import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PORT_LESSON_FIVE_SLIDES as pages } from '@edu/course-content';
import { buildApp } from '../src/app.js';

test('48 page prompt scopes, reveal gates and versioned experiment summaries follow the current lesson',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-l5-'));const app=await buildApp({dataFile:join(dir,'state.json'),portSimulationTickMs:0});
 try{
  const session=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json();const root=`/api/class-sessions/${session.id}`;
  const event=async(payload:object)=>{const r=await app.inject({method:'POST',url:root+'/events',payload});assert.ok(r.statusCode===200||r.statusCode===201,r.body);return r.json();};
  for(const page of pages){
   await event({type:'set_slide',index:page.index});const prompt=(await app.inject(root+'/assistant-prompts')).json();
   assert.equal(prompt.modules.length,5);assert.equal(prompt.coverage.coveredSlides,245);
   assert.match(prompt.compiled,new RegExp(`第5讲第${page.localPage}/48页`));assert.match(prompt.compiled,/s01-capacity-teaching/);assert.doesNotMatch(prompt.compiled,/oocl-spain-ll3-2023/);
   if(page.answerHidden){assert.match(prompt.compiled,/当前页答案尚未揭示/);assert.ok(!prompt.compiled.includes(page.teachingCue));if(page.reveal)assert.ok(!prompt.compiled.includes(page.reveal));}
  }
  await event({type:'set_slide',index:242});
  let prompt=(await app.inject(root+'/assistant-prompts')).json();
  const saved=await app.inject({method:'PATCH',url:'/api/courses/course-port-management-intro/assistant-prompts?index=242',payload:{scope:'page',key:prompt.modules[3].key,text:'L5_HIDDEN_OVERRIDE_SECRET',expectedRevision:prompt.revision}});assert.equal(saved.statusCode,200);
  assert.doesNotMatch((await app.inject(root+'/assistant-prompts')).json().compiled,/L5_HIDDEN_OVERRIDE_SECRET/);
  await event({type:'set_lesson_five_presentation',slideKey:pages[44]!.slideKey,progress:1,revealed:true});
  prompt=(await app.inject(root+'/assistant-prompts')).json();assert.match(prompt.compiled,/已公开解析/);assert.ok(prompt.compiled.includes(pages[44]!.reveal));
  const stale=await app.inject({method:'POST',url:root+'/events',payload:{type:'set_lesson_five_presentation',slideKey:pages[0]!.slideKey,progress:.4,revealed:false}});assert.equal(stale.statusCode,409);
  await event({type:'set_slide',index:216});
  const runId=crypto.randomUUID(),nav={unit:'cargo',experiment:'l5-capacity',plan:'A',runId,originSlideKey:pages[18]!.slideKey};
  await event({type:'set_simulation_navigation',navigation:nav});
  await event({type:'set_lesson_five_summary',runId,plan:'A',summary:'CURRENT_L5_OBSERVATION'});
  await event({type:'set_lesson_five_summary',runId:crypto.randomUUID(),plan:'A',summary:'STALE_SECRET'});
  prompt=(await app.inject(root+'/assistant-prompts')).json();assert.match(prompt.compiled,/CURRENT_L5_OBSERVATION/);assert.doesNotMatch(prompt.compiled,/STALE_SECRET/);
  await event({type:'set_simulation_navigation',navigation:null});assert.doesNotMatch((await app.inject(root+'/assistant-prompts')).json().compiled,/CURRENT_L5_OBSERVATION/);
  await event({type:'set_slide',index:1});const wrong=await app.inject({method:'POST',url:root+'/events',payload:{type:'set_simulation_navigation',navigation:{...nav,originSlideKey:'l1-course-cover'}}});assert.equal(wrong.statusCode,409);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
