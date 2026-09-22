import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PORT_LESSON_SIX_SLIDES as pages, getLessonSixFilm, lessonSixFilmDuration } from '@edu/course-content';
import { buildApp } from '../src/app.js';

test('lesson six: registered contexts, reveal protection, page options and stale-event rejection',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'edu-l6-'));const app=await buildApp({dataFile:join(dir,'state.json'),portSimulationTickMs:0});
  try{
    const session=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json();const root=`/api/class-sessions/${session.id}`;
    const event=async(payload:object,status=201)=>{const r=await app.inject({method:'POST',url:root+'/events',payload});assert.equal(r.statusCode,status,r.body);return r;};
    for(const page of pages){
      await event({type:'set_slide',index:page.index});
      await event({type:'set_lesson_six_presentation',slideKey:page.slideKey,progress:0,revealed:false,option:0});
      let prompt=(await app.inject(root+'/assistant-prompts')).json();
      assert.equal(prompt.coverage.coveredSlides,485);assert.equal(prompt.modules.length,5);
      assert.match(prompt.compiled,new RegExp(`第6讲第${page.localPage}/48页`));assert.match(prompt.compiled,/hinterland-delivery-teaching/);assert.doesNotMatch(prompt.compiled,/oocl-spain-ll3-2023|s01-capacity-teaching/);
      assert.ok(!prompt.compiled.includes(page.teachingCue));
      for(const point of page.points)assert.ok(!prompt.compiled.includes(point),page.slideKey+' unpublished observation');
      if(page.reveal){
        assert.ok(!prompt.compiled.includes(page.reveal));assert.match(prompt.compiled,/答案尚未揭示/);
        await event({type:'set_lesson_six_presentation',slideKey:page.slideKey,progress:1,revealed:true,option:0});
        prompt=(await app.inject(root+'/assistant-prompts')).json();assert.ok(prompt.compiled.includes(page.reveal));
      }
      if(!page.options)await event({type:'set_lesson_six_presentation',slideKey:page.slideKey,progress:1,revealed:false,option:1},400);
    }
    await event({type:'set_slide',index:271});
    const camera={latitude:31,longitude:118,distance:2.2};
    await event({type:'set_lesson_six_presentation',slideKey:'l6-port-groups',progress:1,revealed:false,option:0,camera});
    assert.deepEqual((await app.inject(root+'/snapshot')).json().lessonSixPresentation.camera,camera);
    await event({type:'set_lesson_six_presentation',slideKey:'l6-port-groups',progress:1,revealed:false,option:0,camera:{...camera,longitude:181}},400);
    const film=getLessonSixFilm(26)!,cinematic={clipId:film.id,status:'playing',elapsedMs:3000,startedAt:Date.now(),runId:'film-api-run'};
    await event({type:'set_lesson_six_presentation',slideKey:'l6-port-groups',progress:3000/lessonSixFilmDuration(film),revealed:false,option:0,cinematic});
    assert.deepEqual((await app.inject(root+'/snapshot')).json().lessonSixPresentation.cinematic,cinematic);
    let filmPrompt=(await app.inject(root+'/assistant-prompts')).json().compiled;assert.ok(filmPrompt.includes(film.shots[0]!.caption));assert.ok(!filmPrompt.includes(film.shots[6]!.caption));
    for(const patch of [{clipId:'l6-film-38-answer'},{elapsedMs:120000},{status:'paused',startedAt:Date.now()},{startedAt:Date.now()+120000}])await event({type:'set_lesson_six_presentation',slideKey:'l6-port-groups',progress:0,revealed:false,option:0,cinematic:{...cinematic,...patch}},400);
    await event({type:'set_slide',index:283});
    await event({type:'set_lesson_six_presentation',slideKey:'l6-map-check',progress:0,revealed:false,option:0,cinematic:{...cinematic,clipId:'l6-film-38-answer',status:'paused',elapsedMs:0,startedAt:null}},400);
    await event({type:'set_lesson_six_presentation',slideKey:'l6-port-groups',progress:0,revealed:false,option:0,cinematic},409);
    await event({type:'set_slide',index:286});
    await event({type:'set_lesson_six_presentation',slideKey:'l6-cost-low',progress:1,revealed:false,option:0,camera},400);
    let prompt=(await app.inject(root+'/assistant-prompts')).json();
    const key=prompt.modules[3].key;
    const override=await app.inject({method:'PATCH',url:'/api/courses/course-port-management-intro/assistant-prompts?index=286',payload:{scope:'page',key,text:'L6_PRIVATE_OVERRIDE_4400',expectedRevision:prompt.revision}});assert.equal(override.statusCode,200,override.body);
    assert.doesNotMatch((await app.inject(root+'/assistant-prompts')).json().compiled,/L6_PRIVATE_OVERRIDE_4400/);
    await event({type:'set_lesson_six_presentation',slideKey:'l6-cost-low',progress:1,revealed:true,option:0});
    assert.match((await app.inject(root+'/assistant-prompts')).json().compiled,/L6_PRIVATE_OVERRIDE_4400/);
    await event({type:'set_slide',index:287});
    await event({type:'set_lesson_six_presentation',slideKey:'l6-cost-low',progress:.5,revealed:true,option:0},409);
    await event({type:'set_slide',index:1});
    await event({type:'set_lesson_six_presentation',slideKey:'l6-cover',progress:1,revealed:false,option:0},409);
    await event({type:'set_slide',index:246});
    await event({type:'set_lesson_six_presentation',slideKey:'l6-cover',progress:1,revealed:true,option:0},400);
    const actor=await app.inject({method:'POST',url:'/api/identity/development/session',payload:{role:'student',displayName:'第6讲权限核查'}});
    assert.equal(actor.statusCode,201,actor.body);
    const cookie=actor.cookies.map(c=>`${c.name}=${c.value}`).join('; ');
    const denied=await app.inject({method:'POST',url:root+'/events',headers:{cookie},payload:{type:'set_lesson_six_presentation',slideKey:'l6-cover',progress:1,revealed:false,option:0}});assert.equal(denied.statusCode,403);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
