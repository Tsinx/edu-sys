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
  participation.close();participation=new ClassroomParticipation(file,()=>live);practice=new RankedPractice(participation,()=>live);
  own=practice.view('a',id,actor('s1'));assert.equal(own.responses[0]!.selectedOptionId,'A');
  practice.action('a',id,'reveal');own=practice.view('a',id,actor('s1'));assert.equal(own.correct,1);assert.equal(own.results![0]!.correctOptionId,'A');assert.equal(own.results![1]!.status,'not-attempted');
  assert.equal(practice.view('a',id,actor('s2')).correct,0);assert.equal(practice.view('a',id,actor('s2')).responses.length,0);
  const next=practice.open('a',randomUUID(),p);assert.equal(practice.view('a',next,actor('teacher',true)).pack.questions[0]!.stem,'Changed future wording');
  live=false;assert.equal(practice.view('a',next,actor('s1')).status,'closed');assert.equal(practice.view('a',next,actor('s1')).results,null);
 }finally{participation.close();await rm(dir,{recursive:true,force:true});}
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
