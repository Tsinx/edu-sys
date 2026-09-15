import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {MANAGEMENT_SLIDES as pages, MANAGEMENT_LESSONS as lessons, getManagementVisibleDemo, getManagementInteractionDefinition, validateManagementInteraction, evaluateManagementPayoffs, evaluateManagementTree} from '@edu/course-content/management-principles';
import {MANAGEMENT_SOURCE_MAP as mappings} from '@edu/course-content/management-principles/source-map';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
import {buildApp} from '../src/app.js';
import {createSeedState} from '../src/seed.js';
import type {AssistantJsonStreamProvider,AssistantJsonStreamRequest} from '../src/assistant/provider.js';
import type {ClassroomEventInput,SlideInteractionValues} from '@edu/contracts';
const id='management-principles';
class CaptureProvider implements AssistantJsonStreamProvider {
 name='management-test-capture'; requests:AssistantJsonStreamRequest[]=[];
 async *streamJson(request:AssistantJsonStreamRequest){this.requests.push(request);yield JSON.stringify({replyKind:'answer',dialogue:'验证当前可见材料',actions:[],schema:'edu.classroom.assistant.response',version:'1.0'});}
}

test('management coverage: 299 ordered source pages, continuous splits, four lecture boundaries, 110 images',()=>{
 const deck=getCourseDeckByCourseId(id)!;assert.equal(deck.slideTotal,pages.length);assert.equal(lessons.length,4);
 assert.equal(deck.code,null);assert.equal(deck.totalHours,null);assert.equal(deck.presentation.supportsStudy,false);assert.deepEqual(deck.allowedActivities,['slides']);
 assert.equal(new Set(pages.map(p=>p.slideKey)).size,pages.length);assert.equal(mappings.length,pages.length);
 assert.equal(new Set(mappings.map(m=>`${m.documentId}/${m.originalPage}`)).size,299);
 for(const [doc,count] of Object.entries({l1:56,l2:67,l3:65,l4a:78,l4b:33})){
  const rows=mappings.filter(m=>m.documentId===doc);assert.deepEqual([...new Set(rows.map(m=>m.originalPage))],Array.from({length:count},(_,i)=>i+1));
  for(let n=1;n<=count;n++){const splits=rows.filter(m=>m.originalPage===n);assert.deepEqual(splits.map(m=>m.splitIndex),splits.map((_,i)=>i+1));assert.ok(splits.every(m=>m.splitTotal===splits.length));}
 }
 assert.equal(new Set(pages.filter(p=>p.image?.src.match(/mg-\d+\.webp$/)).map(p=>p.image!.src)).size,110);
 for(const p of pages){assert.equal(deck.getGlobalIndex(p.lessonNumber,p.localIndex),p.index);assert.equal(deck.getLessonPosition(p.index)!.localIndex,p.localIndex);assert.doesNotMatch(JSON.stringify(p),/teachingCue|assistantCue|originalNotes|originalAnimation|让学生|告诉学生|先拆掉|今天不先|不背口号/);}
 assert.equal(deck.getGlobalIndex(5),null);assert.equal(deck.getGlobalIndex(1,NaN),null);
});

test('all management page contexts are independent and limited to management plus visible demo states',()=>{
 const contexts=new Set<string>();
 for(const p of pages){const w=buildPromptWorkspace(id,'管理学',undefined,p.index);assert.equal(w.modules.length,5);assert.ok(w.compiled.includes(p.title));assert.match(w.compiled,new RegExp(`<lesson_context number="${p.lessonNumber}"`));assert.doesNotMatch(w.compiled,/OOCL|山城新饮|港口管理|经济数学|NEIGHBOR_ANSWER/);assert.equal(w.coverage.slides,pages.length);contexts.add(w.modules[3]!.defaultText);}
 assert.equal(contexts.size,pages.length);
 const tree=getManagementVisibleDemo('decision-tree',{step:0});assert.doesNotMatch(JSON.stringify(tree),/净收益34|净收益17|期望收益：/);
 const revealed=getManagementVisibleDemo('decision-tree',{step:3});assert.match(JSON.stringify(revealed),/净收益34/);
 const payoff=getManagementVisibleDemo('payoff-matrix',{step:0,criterion:'regret'});assert.doesNotMatch(JSON.stringify(payoff),/准则值|选择：/);assert.deepEqual(payoff.table!.rows[0],['甲',40,20,-10]);
});

test('eight demos: valid states, rejected invalid patches, reference payoffs and sensitivity boundaries',()=>{
 const demos=pages.filter(p=>p.demo);assert.equal(demos.length,8);
 for(const p of demos){const def=getManagementInteractionDefinition(p.demo!);for(let step=0;step<=def.maxStep;step++){assert.ok(validateManagementInteraction(p.demo!,{step}));assert.equal(getManagementVisibleDemo(p.demo!,{step}).step,step);}
  for(const patch of [{step:-1},{step:def.maxStep+1},{step:1.5},{unexpected:true}] as SlideInteractionValues[])assert.equal(validateManagementInteraction(p.demo!,patch),false);
 }
 assert.deepEqual(evaluateManagementPayoffs('optimistic').winners,['乙']);assert.deepEqual(evaluateManagementPayoffs('pessimistic').winners,['丙']);
 assert.deepEqual(evaluateManagementPayoffs('regret').scores,[50,46,60]);assert.deepEqual(evaluateManagementPayoffs('regret').winners,['乙']);
 const tree=evaluateManagementTree(.7);assert.ok(Math.abs(tree.netLarge-34)<1e-9);assert.ok(Math.abs(tree.netSmall-17)<1e-9);
 assert.equal(evaluateManagementTree(0).choice,'小厂');assert.equal(evaluateManagementTree(1).choice,'大厂');assert.equal(evaluateManagementTree(6/11).choice,'两方案期望净收益相同');
 assert.equal(validateManagementInteraction('decision-tree',{probability:1.1}),false);assert.equal(validateManagementInteraction('efficiency',{resources:0}),false);
 const recruitment=[[3,2,1,2,2],[3,1,2,3,2],[2,3,1,2,3]].map(r=>r.reduce((sum,x,i)=>sum+x*[1,2,2,1,3][i]!,0));
 assert.deepEqual(recruitment,[17,18,21]);assert.equal(5000000/(2000-1000),5000);
 assert.equal(.7*(40*3+(95*7-200))+.3*30*10-140,359.5);
});

test('management additive migration, teacher source isolation, all demos synchronization, persistence and actual provider request',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-management-'));const file=join(dir,'state.json');const seed=createSeedState();
 seed.courses=seed.courses.filter(c=>c.id!==id);seed.courses[0]!.progress=67;await writeFile(file,JSON.stringify(seed));
 const provider=new CaptureProvider();const opts={dataFile:file,logger:false,assistantProvider:provider,portSimulationTickMs:0,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true};
 let app=await buildApp(opts);
 try{
  const cookieFor=async(role:'teacher'|'student')=>String((await app.inject({method:'POST',url:'/api/identity/development/session',payload:{role}})).headers['set-cookie']).split(';')[0]!;
  const teacher=await cookieFor('teacher'),student=await cookieFor('student');const privateUrl=`/api/courses/${id}/source-map`;
  assert.equal((await app.inject(privateUrl)).statusCode,401);assert.equal((await app.inject({url:privateUrl,headers:{cookie:student}})).statusCode,403);
  const source=await app.inject({url:privateUrl,headers:{cookie:teacher}});assert.equal(source.statusCode,200);assert.equal(source.json().mappings.length,pages.length);assert.match(String(source.headers['cache-control']),/no-store/);
  const courses=(await app.inject('/api/courses')).json();assert.equal(courses.filter((c:{id:string})=>c.id===id).length,1);
  const start=await app.inject({method:'POST',url:`/api/courses/${id}/class-sessions`,headers:{cookie:teacher}});assert.equal(start.statusCode,201);const session=start.json().id;
  const url=`/api/class-sessions/${session}`;
  const send=(payload:ClassroomEventInput,cookie=teacher)=>app.inject({method:'POST',url:`${url}/events`,headers:{cookie},payload});
  for(const p of pages.filter(p=>p.demo)){
   let snap=(await send({type:'set_slide',index:p.index})).json();assert.equal(snap.slide.deckId,'deck-management-principles');
   const patch={step:1};const rev=snap.slideInteraction.revision;
   assert.equal((await send({type:'set_slide_interaction',slideId:p.slideKey,expectedRevision:rev,patch},student)).statusCode,403);
   const updated=await send({type:'set_slide_interaction',slideId:p.slideKey,expectedRevision:rev,patch});assert.equal(updated.statusCode,201);snap=updated.json();
   assert.equal((await app.inject({url:`${url}/snapshot`,headers:{cookie:student}})).json().slideInteraction.values.step,1);
   assert.equal((await send({type:'set_slide_interaction',slideId:p.slideKey,expectedRevision:rev,patch})).statusCode,409);
   await send({type:'next_slide'});const restored=(await send({type:'set_slide',index:p.index})).json();assert.equal(restored.slideInteraction.values.step,1);
   const reset=await send({type:'reset_slide_interaction',slideId:p.slideKey,expectedRevision:restored.slideInteraction.revision});assert.equal(reset.statusCode,201);assert.deepEqual(reset.json().slideInteraction.values,getManagementInteractionDefinition(p.demo!).defaults);
  }
  const tree=pages.find(p=>p.demo==='decision-tree')!;await send({type:'set_slide',index:tree.index});
  const preview=(await app.inject({url:`${url}/assistant-prompts`,headers:{cookie:teacher}})).json();
  const answer=await app.inject({method:'POST',url:`${url}/assistant/turns`,headers:{cookie:teacher},payload:{text:'解释当前页面已经显示的内容',source:'text'}});assert.match(answer.body,/turn.completed/);
  assert.equal(provider.requests.at(-1)!.messages[0]!.content,preview.compiled);assert.doesNotMatch(preview.compiled,/净收益34|净收益17|OOCL|港口管理|经济数学/);
  const initial=(await app.inject(`${url}/snapshot`)).json();await send({type:'set_slide_interaction',slideId:tree.slideKey,expectedRevision:initial.slideInteraction.revision,patch:{step:3}});
  const finalPrompt=(await app.inject({url:`${url}/assistant-prompts`,headers:{cookie:teacher}})).json();assert.match(finalPrompt.compiled,/净收益34/);
  assert.doesNotMatch((await app.inject({url:`${url}/snapshot`,headers:{cookie:student}})).body,/teachingCue|assistantCue|originalNotes|originalAnimation|prompt_module/);
  const jump=await app.inject({method:'POST',url:`${url}/avatar/control`,headers:{cookie:teacher},payload:{protocol:'edu.classroom.control',version:'1.0',requestId:'management-jump-5',actions:[{type:'lesson.go_to',lesson:5}]}});assert.equal(jump.statusCode,200);assert.equal(jump.json().status,'noop');
  assert.equal((await send({type:'set_activity',activity:'globe'})).statusCode,409);
  await app.close();app=await buildApp(opts);const restored=(await app.inject(`${url}/snapshot`)).json();assert.equal(restored.slide.index,tree.index);assert.equal(restored.slideInteraction.values.step,3);
  const state=JSON.parse(await readFile(file,'utf8'));assert.equal(state.courses.filter((c:{id:string})=>c.id===id).length,1);assert.equal(state.courses.find((c:{id:string})=>c.id==='course-port-management-intro').progress,67);
 }finally{await app.close();assert.ok(resolve(dir).startsWith(join(resolve(tmpdir()), 'edu-management-')));await rm(dir,{recursive:true,force:true});}
});
