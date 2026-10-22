import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {studyAssistantActionSchema,type ClassroomActor,type PracticeRunView} from '@edu/contracts';
import {buildApp} from '../src/app.js';
import {ClassroomParticipation} from '../src/classroom-participation.js';
import {RankedPractice} from '../src/ranked-practice.js';
import {factorisationPractice as pack} from '../src/practice-content/factorisation-supplement.js';
import {JsonStateStore} from '../src/store.js';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
const actor=(id:string,teacher=false):ClassroomActor=>({actorId:id,displayName:id,roles:[teacher?'teacher':'student'],identitySource:'development'});

test('the supplement supports 24-question snapshots, revisions, deadline submission and private reveal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'factorisation-run-'));let now=Date.parse('2026-10-19T12:00:00Z');
 const members=new ClassroomParticipation(join(dir,'participation.sqlite'),()=>true);
 const practice=new RankedPractice(members,()=>true,()=>now),student=actor('foundation-student');
 try{
  members.join('class',student,student.displayName);
  const id=practice.open('class',randomUUID(),structuredClone(pack),60);
  const original=practice.view('class',id,student);
  assert.equal(original.pack.questions.length,24);assert.equal(original.results,null);
  assert.doesNotMatch(JSON.stringify(original),/"correctOptionId"|"solution"|"verification"/);
  const last=pack.questions[23]!;
  practice.answer('class',id,student,last.id,'A',0);
  practice.answer('class',id,student,last.id,last.correctOptionId,1);
  assert.equal(practice.view('class',id,student).responses[0]!.revision,2);
  now+=61000;practice.expireDue();
  const closed=practice.view('class',id,student);
  assert.equal(closed.status,'closed');assert.equal(closed.answered,1);
  assert.equal(closed.submission?.mode,'automatic');assert.equal(closed.results,null);
  assert.throws(()=>practice.answer('class',id,student,last.id,'B',2),/closed/);
  practice.action('class',id,'reveal');const revealed=practice.view('class',id,student);
  assert.equal(revealed.results?.length,24);assert.equal(revealed.correct,1);
  assert.equal(revealed.results?.filter(r=>r.status==='not-attempted').length,23);
 }finally{practice.close();members.close();await rm(dir,{recursive:true,force:true});}
});

test('authenticated supplement APIs serve the entire pack and retain teacher-only guidance',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'factorisation-api-')),teacher=actor('teacher-li-xingzhi',true),student=actor('foundation-student');
 const app=await buildApp({dataFile:join(dir,'state.json'),allowLegacyDevelopmentIdentity:false,portSimulationTickMs:0,
  identityProvider:{source:'development',resolveActor:async(c:{authorization?:string|null})=>c.authorization==='teacher'?teacher:c.authorization==='student'?student:null}});
 try{
  const url='/api/courses/course-international-mathematics/practice-packs/17';
  const response=await app.inject({url,headers:{authorization:'student'}});
  assert.equal(response.statusCode,200);assert.equal(response.json().questions.length,24);
  assert.doesNotMatch(response.body,/"correctOptionId"|"solution"|"verification"/);
  assert.equal((await app.inject({url:`${url}/teacher`,headers:{authorization:'student'}})).statusCode,403);
  const guidance=await app.inject({url:`${url}/teacher`,headers:{authorization:'teacher'}});
  assert.equal(guidance.statusCode,200);assert.deepEqual(guidance.json().guidance.teachingMinutes,[40]);
  const created=await app.inject({method:'POST',url:'/api/courses/course-international-mathematics/class-sessions',headers:{authorization:'teacher'}});
  assert.equal(created.statusCode,201);
  const open=await app.inject({method:'POST',url:`/api/class-sessions/${created.json().id}/practice/runs`,headers:{authorization:'teacher'},payload:{requestId:randomUUID(),lesson:17,durationSeconds:1200}});
  assert.equal(open.statusCode,200,open.body);assert.equal(open.json<PracticeRunView>().pack.questions.length,24);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

test('classroom next and previous events follow Lecture 3, supplement, Lecture 4 in both directions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'factorisation-navigation-'));
 const store=new JsonStateStore(join(dir,'state.json'));await store.initialize();
 try{
  const deck=getCourseDeckByCourseId('course-international-mathematics')!;
  const session=await store.startClass(deck.courseId);assert.ok(session);
  // Use the same public classroom events as the teacher, never mutate saved records.
  const third=deck.lessons.find(l=>l.number===3)!,supplement=deck.lessons.find(l=>l.number===17)!,fourth=deck.lessons.find(l=>l.number===4)!;
  const target=deck.getSlide(third.slideEnd!);
  await store.applyClassroomEvent(session.id,{type:'set_slide',index:third.slideEnd!});
  assert.equal(store.getClassroomSnapshot(session.id)?.slide.slideId,target.slideKey);
  await store.applyClassroomEvent(session.id,{type:'next_slide'});
  assert.equal(store.getClassroomSnapshot(session.id)?.slide.index,supplement.slideStart);
  await store.applyClassroomEvent(session.id,{type:'previous_slide'});
  assert.equal(store.getClassroomSnapshot(session.id)?.slide.index,third.slideEnd);
  await store.applyClassroomEvent(session.id,{type:'set_slide',index:supplement.slideEnd!});
  await store.applyClassroomEvent(session.id,{type:'next_slide'});
  assert.equal(store.getClassroomSnapshot(session.id)?.slide.index,fourth.slideStart);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});

test('independent-study assistant navigation follows the teaching order and accepts the supplement slot',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'factorisation-study-'));
 const store=new JsonStateStore(join(dir,'state.json'));await store.initialize();
 try{
  const student=actor('foundation-student'),session=await store.createOrResumeStudySession('course-international-mathematics',student);
  assert.ok(session);
  const deck=getCourseDeckByCourseId('course-international-mathematics')!,third=deck.lessons.find(l=>l.number===3)!,supplement=deck.lessons.find(l=>l.number===17)!,fourth=deck.lessons.find(l=>l.number===4)!;
  await store.applyStudyAssistantAction(session.id,student,{type:'study.slides.go_to',lesson:3,slide:third.slideTotal});
  const next=await store.applyStudyAssistantAction(session.id,student,{type:'study.slides.next'});
  assert.equal(next?.session.globalIndex,supplement.slideStart);assert.match(next!.message,/Lecture 3 supplement/);
  await store.applyStudyAssistantAction(session.id,student,studyAssistantActionSchema.parse({type:'study.slides.go_to',lesson:17,slide:40}));
  assert.equal((await store.applyStudyAssistantAction(session.id,student,{type:'study.slides.next'}))?.session.globalIndex,fourth.slideStart);
  assert.equal((await store.applyStudyAssistantAction(session.id,student,{type:'study.slides.previous'}))?.session.globalIndex,supplement.slideEnd);
  const invalid=await store.applyStudyAssistantAction(session.id,student,{type:'study.lesson.go_to',lesson:999});
  assert.equal(invalid?.status,'noop');assert.equal(invalid?.session.globalIndex,supplement.slideEnd);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
