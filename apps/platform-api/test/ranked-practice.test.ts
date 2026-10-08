import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {ClassroomActor,PracticeRunView} from '@edu/contracts';
import {ClassroomParticipation} from '../src/classroom-participation.js';
import {RankedPractice} from '../src/ranked-practice.js';
import {rankedPracticePacks,publicPack} from '../src/practice-content/index.js';
import {buildApp} from '../src/app.js';
const actor=(id:string,teacher=false):ClassroomActor=>({actorId:id,displayName:id,roles:[teacher?'teacher':'student'],identitySource:'development'});
test('practice snapshots, partial responses, revisions, duplicate opening, isolation and persisted reveal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-practice-'));const file=join(dir,'classroom.sqlite');let live=true;
 let participation=new ClassroomParticipation(file,()=>live),practice=new RankedPractice(participation,()=>live);
 try{
  participation.join('a',actor('s1'),'Student 1');participation.join('a',actor('s2'),'Student 2');participation.join('b',actor('s1'),'Student 1');
  const p=structuredClone(rankedPracticePacks[0]!),request=randomUUID(),id=practice.open('a',request,p),duplicate=randomUUID();
  assert.equal(practice.open('a',duplicate,p),id);assert.equal(practice.open('a',request,p),id);
  const q=p.questions[0]!;p.questions[0]!.stem='Changed future wording';p.questions[0]!.correctOptionId='D';
  assert.notEqual(practice.view('a',id,actor('s1')).pack.questions[0]!.stem,p.questions[0]!.stem);
  assert.throws(()=>practice.open('a',randomUUID(),rankedPracticePacks[1]!),/Close the current/);
  assert.throws(()=>practice.answer('a',id,actor('outsider'),q.id,'A',0),/Join/);
  assert.throws(()=>practice.answer('b',id,actor('s1'),q.id,'A',0),/not found/);
  assert.throws(()=>practice.answer('a',id,actor('teacher',true),q.id,'A',0),/Only students/);
  practice.answer('a',id,actor('s1'),q.id,'B',0);practice.answer('a',id,actor('s1'),q.id,'A',1);
  assert.throws(()=>practice.answer('a',id,actor('s1'),q.id,'C',1),/another tab/);
  let own=practice.view('a',id,actor('s1'));assert.equal(own.answered,1);assert.equal(own.responses[0]!.revision,2);assert.equal(own.results,null);assert.equal(own.correct,null);assert.equal(own.summary,undefined);
  const publicJson=JSON.stringify(own);for(const field of ['correctOptionId','optionExplanations','verification','teachingCue'])assert.ok(!publicJson.includes(field));
  assert.equal(practice.view('a',id,actor('s2')).answered,0);assert.equal(practice.view('a',id,actor('teacher',true)).summary!.questions[0]!.attempted,1);
  practice.action('a',id,'close');assert.equal(practice.open('a',duplicate,p),id);
  assert.throws(()=>practice.answer('a',id,actor('s1'),q.id,'A',2),/locked/);
  assert.equal(practice.view('a',id,actor('s1')).results,null);
  practice.close();participation.close();participation=new ClassroomParticipation(file,()=>live);practice=new RankedPractice(participation,()=>live);
  own=practice.view('a',id,actor('s1'));assert.equal(own.responses[0]!.selectedOptionId,'A');
  practice.action('a',id,'reveal');own=practice.view('a',id,actor('s1'));assert.equal(own.correct,1);assert.equal(own.results![0]!.correctOptionId,'A');assert.equal(own.results![1]!.status,'not-attempted');
  assert.equal(practice.view('a',id,actor('s2')).correct,0);assert.equal(practice.view('a',id,actor('s2')).responses.length,0);
  const next=practice.open('a',randomUUID(),p);assert.equal(practice.view('a',next,actor('teacher',true)).pack.questions[0]!.stem,'Changed future wording');
  live=false;assert.equal(practice.view('a',next,actor('s1')).status,'closed');assert.equal(practice.view('a',next,actor('s1')).results,null);
 }finally{practice.close();participation.close();await rm(dir,{recursive:true,force:true});}
});
test('authenticated practice APIs enforce classroom membership and teacher ownership',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-api-'));
 const teachers=actor('teacher-li-xingzhi',true),student=actor('student-one'),other=actor('other-teacher',true);
 const identities={source:'development' as const,resolveActor:async(c:{authorization?:string|null})=>c.authorization==='teacher'?teachers:c.authorization==='student'?student:c.authorization==='other'?other:null};
 const app=await buildApp({dataFile:join(dir,'state.json'),identityProvider:identities,allowLegacyDevelopmentIdentity:false,portSimulationTickMs:0});
 const headers=(authorization:string)=>({authorization});
 try{
  const created=await app.inject({method:'POST',url:'/api/courses/course-international-mathematics/class-sessions',headers:headers('teacher')});assert.equal(created.statusCode,201,created.body);
  const session=created.json(),base=`/api/class-sessions/${session.id}/practice`,packUrl='/api/courses/course-international-mathematics/practice-packs/1';
  assert.equal((await app.inject({url:packUrl})).statusCode,401);
  const publicResponse=await app.inject({url:packUrl,headers:headers('student')});assert.equal(publicResponse.statusCode,200);assert.deepEqual(publicResponse.json(),publicPack(rankedPracticePacks[0]!));
  assert.equal((await app.inject({url:`${packUrl}/teacher`,headers:headers('student')})).statusCode,403);
  assert.equal((await app.inject({url:`${packUrl}/teacher`,headers:headers('other')})).statusCode,403);
  const open=()=>app.inject({method:'POST',url:`${base}/runs`,headers:headers('teacher'),payload:{requestId:randomUUID(),lesson:1}});
  assert.equal((await app.inject({method:'POST',url:`${base}/runs`,headers:headers('student'),payload:{requestId:randomUUID(),lesson:1}})).statusCode,403);
  const run=(await open()).json<PracticeRunView>();assert.equal(run.pack.questions.length,10);
  assert.equal((await app.inject({url:`${base}/runs/${run.id}`,headers:headers('student')})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:`${base}/join`,headers:headers('student')})).statusCode,200);
  const answer=`${base}/runs/${run.id}/questions/${run.pack.questions[0]!.id}/answer`;
  assert.equal((await app.inject({method:'PUT',url:answer,headers:headers('teacher'),payload:{selectedOptionId:'A',expectedRevision:0}})).statusCode,403);
  const saved=await app.inject({method:'PUT',url:answer,headers:headers('student'),payload:{selectedOptionId:'A',expectedRevision:0}});assert.equal(saved.statusCode,200);assert.equal(saved.json().answered,1);assert.equal(saved.json().results,null);
  assert.equal((await app.inject({method:'POST',url:`${base}/runs/${run.id}/action`,headers:headers('other'),payload:{action:'reveal'}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:`${base}/runs/${run.id}/action`,headers:headers('student'),payload:{action:'reveal'}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:`/api/class-sessions/${session.id}/end`,headers:headers('other')})).statusCode,403);
  await app.inject({method:'POST',url:`/api/class-sessions/${session.id}/end`,headers:headers('teacher')});
  const ended=await app.inject({url:base,headers:headers('student')});assert.equal(ended.json().run.status,'closed');assert.equal(ended.json().run.results,null);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

test('one fixed deadline, resubmission, automatic finalization, partial completion and privacy',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-timer-'));
 let now=Date.parse('2026-10-07T12:00:00Z');
 const participation=new ClassroomParticipation(join(dir,'classroom.sqlite'),()=>true),practice=new RankedPractice(participation,()=>true,()=>now);
 try{
  for(const id of ['manual','revised','partial','blank'])participation.join('a',actor(id),id);
  participation.join('b',actor('partial'),'partial');
  const request=randomUUID(),pack=rankedPracticePacks[0]!,id=practice.open('a',request,pack,10),other=practice.open('b',randomUUID(),pack,60),q=pack.questions[0]!;
  const deadline=practice.view('a',id,actor('partial')).deadlineAt;
  now+=1000;
  assert.equal(practice.open('a',request,pack,1200),id);assert.equal(practice.open('a',randomUUID(),pack,1200),id);
  assert.equal(practice.view('a',id,actor('partial')).deadlineAt,deadline);
  practice.answer('a',id,actor('manual'),q.id,'A',0);practice.submit('a',id,actor('manual'));
  practice.answer('a',id,actor('revised'),q.id,'A',0);practice.submit('a',id,actor('revised'));
  assert.equal(practice.view('a',id,actor('manual')).submission!.hasUnsubmittedChanges,false);
  now+=1000;
  practice.answer('a',id,actor('manual'),q.id,'B',1);
  assert.equal(practice.view('a',id,actor('manual')).submission!.hasUnsubmittedChanges,true);
  practice.submit('a',id,actor('manual'));
  practice.answer('a',id,actor('revised'),q.id,'C',1);
  practice.answer('a',id,actor('partial'),q.id,'D',0);
  now=Date.parse(deadline!)-1;
  practice.answer('a',id,actor('partial'),q.id,'B',1);
  assert.equal(practice.view('a',id,actor('partial')).status,'open');
  now++;
  // No view or connected browser is needed to finalize every joined student's saved choices.
  practice.expireDue();
  assert.throws(()=>practice.answer('a',id,actor('partial'),q.id,'A',2),/locked/);
  assert.throws(()=>practice.submit('a',id,actor('partial')),/locked/);
  const manual=practice.view('a',id,actor('manual')),revised=practice.view('a',id,actor('revised')),partial=practice.view('a',id,actor('partial')),blank=practice.view('a',id,actor('blank'));
  assert.equal(manual.submission!.mode,'manual');assert.equal(manual.submission!.finalizedAt,deadline);
  assert.equal(revised.submission!.mode,'automatic');assert.equal(revised.responses[0]!.selectedOptionId,'C');
  assert.equal(partial.status,'closed');assert.equal(partial.closeReason,'deadline');assert.equal(partial.closedAt,deadline);assert.equal(partial.answered,1);assert.equal(partial.submission!.mode,'automatic');assert.equal(partial.submission!.hasUnsubmittedChanges,false);
  assert.equal(blank.answered,0);assert.equal(blank.submission!.mode,'automatic');assert.equal(blank.correct,null);
  assert.equal(practice.view('b',other,actor('partial')).status,'open');
  const json=JSON.stringify(partial);for(const key of ['correctOptionId','optionExplanations','summary','manual','revised'])assert.ok(!json.includes(key),key);
  practice.action('a',id,'reveal');assert.equal(practice.view('a',id,actor('partial')).results![1]!.status,'not-attempted');
  assert.equal(practice.view('a',id,actor('teacher',true)).summary!.students.length,4);
 }finally{practice.close();participation.close();await rm(dir,{recursive:true,force:true});}
});

test('expiry is recovered after restart, old untimed records survive, and teacher closure finalizes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-recovery-')),file=join(dir,'classroom.sqlite');let now=Date.now();
 let participation=new ClassroomParticipation(file,()=>true),practice:RankedPractice|undefined;
 try{
  participation.join('legacy',actor('s'),'s');participation.join('timed',actor('s'),'s');
  participation.db.exec("CREATE TABLE ranked_practice_runs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,request_id TEXT NOT NULL,snapshot TEXT NOT NULL,status TEXT NOT NULL,opened_at TEXT NOT NULL,closed_at TEXT,revealed_at TEXT,UNIQUE(session_id,request_id))");
  participation.db.prepare("INSERT INTO ranked_practice_runs VALUES('old','legacy',?,?,'open',?,NULL,NULL)").run(randomUUID(),JSON.stringify(rankedPracticePacks[0]),new Date(now).toISOString());
  practice=new RankedPractice(participation,()=>true,()=>now);
  assert.equal(practice.view('legacy','old',actor('s')).deadlineAt,null);
  const id=practice.open('timed',randomUUID(),rankedPracticePacks[0]!,10),q=rankedPracticePacks[0]!.questions[0]!;
  practice.answer('timed',id,actor('s'),q.id,'A',0);practice.close();participation.close();now+=11000;
  participation=new ClassroomParticipation(file,()=>true);practice=new RankedPractice(participation,()=>true,()=>now);
  const restored=practice.view('timed',id,actor('s'));assert.equal(restored.status,'closed');assert.equal(restored.submission!.mode,'automatic');assert.equal(restored.responses[0]!.selectedOptionId,'A');assert.equal(restored.results,null);
  assert.equal(practice.view('legacy','old',actor('s')).status,'open');
  practice.action('legacy','old','close');assert.equal(practice.view('legacy','old',actor('s')).submission!.finalizationReason,'teacher');
  const next=practice.open('timed',randomUUID(),rankedPracticePacks[1]!,30);practice.end('timed');assert.equal(practice.view('timed',next,actor('s')).submission!.finalizationReason,'class-ended');
 }finally{practice?.close();participation.close();await rm(dir,{recursive:true,force:true});}
});

test('background scheduler finalizes without a read and notifications stay in their classroom',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-background-'));let now=Date.now();
 const participation=new ClassroomParticipation(join(dir,'db.sqlite'),()=>true),practice=new RankedPractice(participation,()=>true,()=>now);
 try{
  participation.join('a',actor('s'),'s');let notifications=0,otherNotifications=0;
  const off=practice.subscribe('a',()=>notifications++),offOther=practice.subscribe('b',()=>otherNotifications++);
  const id=practice.open('a',randomUUID(),rankedPracticePacks[0]!,10);now+=10000;
  await new Promise(resolve=>setTimeout(resolve,650));
  const row=participation.db.prepare('SELECT status,close_reason FROM ranked_practice_runs WHERE id=?').get(id) as {status:string;close_reason:string};
  assert.equal(row.status,'closed');assert.equal(row.close_reason,'deadline');assert.equal(notifications,2);assert.equal(otherNotifications,0);off();offOther();
 }finally{practice.close();participation.close();await rm(dir,{recursive:true,force:true});}
});

test('teacher timer validation, student submission and authenticated realtime release',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-ranked-stream-'));
 const identities={source:'development' as const,resolveActor:async(c:{authorization?:string|null})=>c.authorization==='teacher'?actor('teacher-li-xingzhi',true):c.authorization==='student'?actor('s'):c.authorization==='outsider'?actor('outsider'):null};
 const app=await buildApp({dataFile:join(dir,'state.json'),identityProvider:identities,allowLegacyDevelopmentIdentity:false,portSimulationTickMs:0});
 const headers=(authorization:string)=>({authorization});const abort=new AbortController();
 try{
  const created=await app.inject({method:'POST',url:'/api/courses/course-international-mathematics/class-sessions',headers:headers('teacher')});const session=created.json(),base=`/api/class-sessions/${session.id}/practice`;
  assert.equal((await app.inject({url:`${base}/stream`})).statusCode,401);
  assert.equal((await app.inject({url:`${base}/stream`,headers:headers('outsider')})).statusCode,403);
  await app.inject({method:'POST',url:`${base}/join`,headers:headers('student')});
  for(const durationSeconds of [0,9,7201,10.5])assert.equal((await app.inject({method:'POST',url:`${base}/runs`,headers:headers('teacher'),payload:{requestId:randomUUID(),lesson:1,durationSeconds}})).statusCode,400);
  const address=await app.listen({host:'127.0.0.1',port:0});
  const response=await fetch(`${address}${base}/stream`,{headers:headers('student'),signal:abort.signal});assert.equal(response.status,200);
  const reader=response.body!.getReader(),decoder=new TextDecoder();assert.match(decoder.decode((await reader.read()).value),/event: practice/);
  const opened=await app.inject({method:'POST',url:`${base}/runs`,headers:headers('teacher'),payload:{requestId:randomUUID(),lesson:1,durationSeconds:60}});assert.equal(opened.statusCode,200,opened.body);
  assert.match(decoder.decode((await reader.read()).value),/"changed":true/);
  const run=opened.json<PracticeRunView>();assert.equal(Date.parse(run.deadlineAt!)-Date.parse(run.openedAt),60000);
  const submit=`${base}/runs/${run.id}/submit`;
  assert.equal((await app.inject({method:'POST',url:submit,headers:headers('teacher'),payload:{}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:submit,headers:headers('outsider'),payload:{}})).statusCode,403);
  const submitted=await app.inject({method:'POST',url:submit,headers:headers('student'),payload:{}});assert.equal(submitted.statusCode,200);assert.equal(submitted.json().submission.mode,'manual');assert.equal(submitted.json().results,null);assert.equal(submitted.json().summary,undefined);
  const answer=`${base}/runs/${run.id}/questions/${run.pack.questions[0]!.id}/answer`;
  const revised=await app.inject({method:'PUT',url:answer,headers:headers('student'),payload:{selectedOptionId:'A',expectedRevision:0}});assert.equal(revised.statusCode,200);assert.equal(revised.json().submission.hasUnsubmittedChanges,true);
  abort.abort();await reader.cancel().catch(()=>{});
 }finally{abort.abort();await app.close();await rm(dir,{recursive:true,force:true});}
});
