import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PORT_LESSON_FOUR_SLIDES,PORT_LESSON_FOUR_LABS,PORT_LESSON_FOUR_LEGACY_POSITIONS} from '@edu/course-content';
import {buildApp} from '../src/app.js';
import {createSeedState,createInitialClassroomRuntime} from '../src/seed.js';
import {promptStorageKey} from '../src/assistant/prompts.js';
import {JsonStateStore} from '../src/store.js';
import type {AssistantJsonStreamProvider,AssistantJsonStreamRequest} from '../src/assistant/provider.js';
class Provider implements AssistantJsonStreamProvider {
  name='l4-verification'; requests:AssistantJsonStreamRequest[]=[];
  actions:unknown[]=[];
  async *streamJson(request:AssistantJsonStreamRequest){this.requests.push(request);yield JSON.stringify({schema:'edu.classroom.assistant.response',version:'1.0',replyKind:this.actions.length?'control':'answer',dialogue:this.actions.length?'':'现场核对',actions:this.actions});}
}
test('44 served page prompts and four real control contexts reach the assistant; hidden answers and stale runs stay excluded',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-l4-'));const provider=new Provider();const app=await buildApp({dataFile:join(dir,'state.json'),assistantProvider:provider,portSimulationTickMs:0});
 try {
  const session=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json();const root=`/api/class-sessions/${session.id}`;
  const event=async(payload:unknown)=>{const r=await app.inject({method:'POST',url:root+'/events',payload:payload as object});assert.ok(r.statusCode===200||r.statusCode===201,r.body);return r.json();};
  const control=async(actions:unknown[],requestId=crypto.randomUUID())=>{const r=await app.inject({method:'POST',url:root+'/avatar/control',payload:{protocol:'edu.classroom.control',version:'1.0',requestId,actions}});assert.ok(r.statusCode===200||r.statusCode===201,r.body);return r.json();};
  const turn=async()=>{const r=await app.inject({method:'POST',url:root+'/assistant/turns',payload:{text:'请解释当前现场',source:'text'}});assert.match(r.body,/turn.completed/);return provider.requests.at(-1)!;};
  for(const page of PORT_LESSON_FOUR_SLIDES){
   await event({type:'set_slide',index:page.index});
   const preview=(await app.inject(root+'/assistant-prompts')).json();const actual=await turn();
   assert.equal(actual.messages[0]!.content,preview.compiled);assert.equal(preview.modules.length,5);assert.match(preview.compiled,/s01-terminal-teaching/);assert.doesNotMatch(preview.compiled,/oocl-spain-ll3-2023|第4到16讲尚未建设/);
   assert.match(preview.compiled,new RegExp(`第4讲第${page.localPage}/44页`));
   if(page.answerHidden) assert.match(preview.compiled,/当前页答案尚未揭示/);
  }
  await event({type:'set_slide',index:194});
  const hidden=(await app.inject(root+'/assistant-prompts')).json();
  const saved=await app.inject({method:'PATCH',url:'/api/courses/course-port-management-intro/assistant-prompts?index=194',payload:{scope:'page',key:hidden.modules[3].key,text:'SECRET_L4_ANSWER 三项推断都不能由前一个条件直接推出',expectedRevision:hidden.revision}});assert.equal(saved.statusCode,200,saved.body);
  const question=(await turn()).messages[0]!.content;assert.doesNotMatch(question,/SECRET_L4_ANSWER|三项推断都不能由前一个条件直接推出/);
  await event({type:'set_slide',index:195});assert.match((await turn()).messages[0]!.content,/三项推断都不能/);
  await event({type:'set_slide',index:156});const anim=(await app.inject(root+'/snapshot')).json();await event({type:'set_lesson_four_progress',slideKey:anim.slide.slideId,progress:.25});assert.match((await turn()).messages[0]!.content,/动画进度】25%/);
  for(const cue of PORT_LESSON_FOUR_LABS){
   const start=await event({type:'set_slide',index:153+cue.demoPage});const student=start.simulation;
   provider.actions=[{type:'simulation.open_demo',cueId:cue.cueId}];await turn();provider.actions=[];
   let snap=(await app.inject(root+'/snapshot')).json();assert.equal(snap.teacherDemo.cueId,cue.cueId);assert.equal(snap.teacherDemo.active,true);assert.equal(snap.activeActivity,'slides');assert.deepEqual(snap.simulation,student);assert.equal(snap.teacherDemo.visibleSummary,null);
   const {runId}=snap.teacherDemo;const duplicate=await control([{type:'simulation.open_demo',cueId:cue.cueId}]);assert.equal(duplicate.snapshot.teacherDemo.runId,runId);
   const invalid=await control([{type:'simulation.open_demo',cueId:'bad-cue'}]);assert.equal(invalid.snapshot.teacherDemo.runId,runId);
   const summary=JSON.stringify({unit:cue.unit,second:123,delivered:7,checkpoint:'CURRENT_RUN_MARKER'});
   snap=await event({type:'set_teacher_demo_summary',runId,revision:2,summary});assert.equal(snap.teacherDemo.visibleSummary,summary);
   for(const stale of [{runId:'old-run',revision:99},{runId,revision:1}]) assert.equal((await event({type:'set_teacher_demo_summary',...stale,summary:'OLD_SECRET'})).teacherDemo.visibleSummary,summary);
   const preview=(await app.inject(root+'/assistant-prompts')).json();const actual=await turn();assert.equal(actual.messages[0]!.content,preview.compiled);assert.match(preview.modules[3].key,new RegExp(`teacher-demo:${cue.cueId}`));assert.match(preview.compiled,/CURRENT_RUN_MARKER/);assert.doesNotMatch(preview.compiled,/OLD_SECRET/);assert.ok(preview.compiled.includes(runId));
   provider.actions=[{type:'simulation.return_to_slides'}];await turn();provider.actions=[];snap=(await app.inject(root+'/snapshot')).json();assert.equal(snap.teacherDemo.active,false);assert.equal(snap.slide.index,153+cue.demoPage);assert.deepEqual(snap.simulation,student);
   assert.doesNotMatch((await turn()).messages[0]!.content,/CURRENT_RUN_MARKER/);
   const id=crypto.randomUUID();const first=await control([{type:'simulation.open_demo',cueId:cue.cueId}],id);const same=await control([{type:'simulation.open_demo',cueId:cue.cueId}],id);assert.equal(same.duplicate,true);assert.equal(first.snapshot.teacherDemo.runId,same.snapshot.teacherDemo.runId);assert.equal(first.snapshot.teacherDemo.visibleSummary,null);
   await control([{type:'simulation.return_to_slides'}]);
  }
  await event({type:'set_slide',index:1});assert.equal((await control([{type:'simulation.open_demo',cueId:'l4-arrival'}])).results[0].status,'noop');
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
test('all v9 numeric bookmarks migrate by topic and stable page prompt overrides survive',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-l4-migrate-')),path=join(dir,'state.json'),state=createSeedState(),base=state.classSessions[0]!;
 state.classSessions=PORT_LESSON_FOUR_LEGACY_POSITIONS.map((_,i)=>({...base,id:`old-${i+1}`}));state.classroomRuntimes={};
 for(let i=1;i<=28;i++){const r={...createInitialClassroomRuntime(),slideIndex:153+i,deckVersion:'release-port-management-lab-v9'};delete (r as Partial<typeof r>).slideKey;state.classroomRuntimes[`old-${i}`]=r;}
 state.assistantPrompts={revision:1,overrides:Object.fromEntries(Array.from({length:28},(_,i)=>[promptStorageKey('page',`course-port-management-intro:l4-port-${String(i+1).padStart(2,'0')}`),`TEACHER_OVERRIDE_${i+1}`]))};
 await writeFile(path,JSON.stringify(state));const store=new JsonStateStore(path);await store.initialize();
 try{assert.deepEqual(store.getAssistantPromptSettings().overrides,state.assistantPrompts.overrides);for(let i=1;i<=28;i++){const s=store.getClassroomSnapshot(`old-${i}`)!;assert.equal(s.slide.index,153+PORT_LESSON_FOUR_LEGACY_POSITIONS[i-1]!);assert.equal(s.slide.slideId,`l4-port-${String(i).padStart(2,'0')}`);}}finally{await store.close();await rm(dir,{recursive:true,force:true});}
});
