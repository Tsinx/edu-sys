import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {ClassroomEventInput} from '@edu/contracts';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {STATISTICAL_ANALYSIS_SLIDES as pages,STATISTICAL_ANALYSIS_LESSONS as lessons,STATISTICAL_ANALYSIS_DATA as data} from '@edu/course-content/statistical-analysis';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
import {buildApp} from '../src/app.js';
import {createSeedState} from '../src/seed.js';

test('statistics course: 16 honest lesson states, 100 pages, two 90 minute lectures',()=>{
 const deck=getCourseDeckByCourseId('statistical-analysis')!;
 assert.equal(deck.totalHours,32);assert.equal(deck.slideTotal,100);assert.equal(lessons.length,16);
 assert.deepEqual(lessons.slice(0,2).map(l=>[l.slideStart,l.slideEnd,l.slideTotal]),[[1,48,48],[49,100,52]]);
 for(const l of lessons.slice(2)){assert.equal(l.status,'planned');assert.equal(l.slideStart,null);assert.equal(l.slideEnd,null);assert.equal(deck.getGlobalIndex(l.number),null);}
 for(let i=1;i<=100;i++){const p=deck.getLessonPosition(i)!;assert.equal(deck.getGlobalIndex(p.lessonNumber,p.localIndex),i);}
 for(const l of [1,2])assert.ok(Math.abs(pages.filter(p=>p.lesson===l).reduce((s,p)=>s+p.minutes,0)-90)<1e-9);
 for(const bad of [0,49,1.5,NaN])assert.equal(deck.getGlobalIndex(1,bad),null);
 assert.deepEqual(deck.allowedActivities,['slides']);assert.equal(deck.presentation.supportsStudy,false);
});
test('statistics numeric evidence: raw data reproduce aggregate and within-city reversal',()=>{
 const mean=(a:number[])=>a.reduce((s,v)=>s+v,0)/a.length;
 const raw=data.people;
 assert.equal(raw.length,480);assert.equal(new Set(raw.map(p=>p.id)).size,480);
 const a=mean(raw.filter(p=>p.member).map(p=>p.spend)),b=mean(raw.filter(p=>!p.member).map(p=>p.spend));
 assert.ok(Math.abs(a-650)<1e-9&&Math.abs(b-500)<1e-9);assert.ok(Math.abs((a-b)/b-.3)<1e-12);
 for(const city of ['甲','乙']){const x=mean(raw.filter(p=>p.member&&p.city===city).map(p=>p.spend)),y=mean(raw.filter(p=>!p.member&&p.city===city).map(p=>p.spend));assert.ok(Math.abs(x-y+50)<1e-9);}
 assert.ok(Math.abs(data.welch.se-Math.hypot(data.groups[0]!.se,data.groups[1]!.se))<1e-12);
 assert.ok(data.welch.p>0&&data.welch.p<.000005);assert.ok(Math.abs(data.welch.ci[0]!-86.3496835)<1e-6);
 assert.equal(data.sampling.intervals.filter(c=>c.lo<=500&&c.hi>=500).length,97);
 for(const r of data.monthly)assert.ok(Math.abs(r.total-r.customers*r.perPerson)<.01);
 for(const a of data.anscombe){assert.equal(a.x.length,11);assert.equal(a.y.length,11);assert.ok(Math.abs(mean(a.x)-9)<1e-9);}
});
test('all 100 statistics pages have their own teacher and assistant context with no port fallback',()=>{
 for(const p of pages){assert.ok(p.teachingCue.includes('停顿位置：'));const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,p.index);assert.equal(w.coverage.slides,100);assert.match(w.compiled,/LBL/);assert.ok(w.compiled.includes(p.title));assert.ok(w.compiled.includes(`<lesson_context number="${p.lesson}"`));assert.doesNotMatch(w.compiled,/OOCL|航线片段|山城新饮|港口管理/);assert.match(w.modules[4]!.runtimeContext,/已建设讲次：1、2/);assert.doesNotMatch(w.modules[4]!.runtimeContext,/第3讲“/);}
 assert.doesNotMatch(buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,3).compiled,/甲城：−50|方向反转/);
});
test('persistent-state migration is additive and idempotent; controls preserve course and reject planned lessons',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-statistics-'));const file=join(dir,'state.json');
 const seed=createSeedState();seed.courses=seed.courses.filter(c=>c.id!=='statistical-analysis');seed.courses[0]!.progress=67;
 await writeFile(file,JSON.stringify(seed));
 let app=await buildApp({dataFile:file,logger:false,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true});
 try{
  const courses=(await app.inject({method:'GET',url:'/api/courses'})).json();assert.equal(courses.filter((c:{id:string})=>c.id==='statistical-analysis').length,1);
  const start=await app.inject({method:'POST',url:'/api/courses/statistical-analysis/class-sessions'});assert.equal(start.statusCode,201);const id=start.json().id;
  const send=async(body:ClassroomEventInput)=>app.inject({method:'POST',url:`/api/class-sessions/${id}/events`,payload:body});
  const moved=await send({type:'set_slide',index:49});assert.equal(moved.statusCode,201);
  const snap=(await app.inject({method:'GET',url:`/api/class-sessions/${id}/snapshot`})).json();assert.equal(snap.slide.index,49);assert.equal(snap.slide.lessonNumber,2);assert.equal(snap.slide.deckId,'deck-statistical-analysis');assert.doesNotMatch(JSON.stringify(snap.slide),/teachingCue|assistantCue|讲解重点/);
  assert.equal((await send({type:'set_slide',index:101})).statusCode,201);
  assert.equal((await app.inject({method:'GET',url:`/api/class-sessions/${id}/snapshot`})).json().slide.index,100);
  await send({type:'set_slide',index:49});
  const planned=await app.inject({method:'POST',url:`/api/class-sessions/${id}/avatar/control`,payload:{protocol:'edu.classroom.control',version:'1.0',requestId:'statistics-planned-lesson-3',actions:[{type:'lesson.go_to',lesson:3}]}});
  assert.equal(planned.statusCode,200);assert.equal(planned.json().status,'noop');assert.match(planned.json().results[0].message,/第3讲内容待建设/);assert.equal(planned.json().snapshot.slide.index,49);
  assert.equal((await send({type:'set_activity',activity:'globe'})).statusCode,409);
  await app.close();app=await buildApp({dataFile:file,logger:false,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true});
  const restored=(await app.inject({method:'GET',url:`/api/class-sessions/${id}/snapshot`})).json();assert.equal(restored.slide.index,49);
  const persisted=JSON.parse(await readFile(file,'utf8'));assert.equal(persisted.courses.filter((c:{id:string})=>c.id==='statistical-analysis').length,1);assert.equal(persisted.courses.find((c:{id:string})=>c.id==='course-port-management-intro').progress,67);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
