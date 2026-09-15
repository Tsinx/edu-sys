import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {getCourseDeckByCourseId} from '@edu/course-content/deck-registry';
import {MANAGEMENT_BUILD as build, MANAGEMENT_SLIDES as pages, MANAGEMENT_LESSONS as lessons, getManagementVisibleDemo, getManagementInteractionDefinition, validateManagementInteraction, evaluateManagementPayoffs, evaluateManagementTree,calculateManagementHierarchy} from '@edu/course-content/management-principles';
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

test('management coverage: all registered source pages, continuous splits, lecture boundaries and images',()=>{
 const deck=getCourseDeckByCourseId(id)!;assert.equal(deck.slideTotal,pages.length);assert.equal(lessons.length,build.lessons.length);
 assert.equal(deck.code,null);assert.equal(deck.totalHours,null);assert.equal(deck.presentation.supportsStudy,false);assert.deepEqual(deck.allowedActivities,['slides']);
 assert.equal(new Set(pages.map(p=>p.slideKey)).size,pages.length);assert.equal(mappings.length,pages.length);
 assert.equal(new Set(mappings.map(m=>`${m.documentId}/${m.originalPage}`)).size,build.sourcePageCount);
 for(const [doc,count] of Object.entries({l1:56,l2:67,l3:65,l4a:78,l4b:33,l5:60,l6:64,l7:55,l8:39})){
  const rows=mappings.filter(m=>m.documentId===doc);assert.deepEqual([...new Set(rows.map(m=>m.originalPage))],Array.from({length:count},(_,i)=>i+1));
  for(let n=1;n<=count;n++){const splits=rows.filter(m=>m.originalPage===n);assert.deepEqual(splits.map(m=>m.splitIndex),splits.map((_,i)=>i+1));assert.ok(splits.every(m=>m.splitTotal===splits.length));}
 }
 assert.equal(new Set(pages.filter(p=>p.image?.src.match(/mg-\d+\.webp$/)).map(p=>p.image!.src)).size,build.imageCount);
 for(const p of pages){assert.equal(deck.getGlobalIndex(p.lessonNumber,p.localIndex),p.index);assert.equal(deck.getLessonPosition(p.index)!.localIndex,p.localIndex);assert.doesNotMatch(JSON.stringify(p),/teachingCue|assistantCue|originalNotes|originalAnimation|让学生|告诉学生|先拆掉|今天不先|不背口号/);}
 assert.equal(deck.getGlobalIndex(lessons.length+1),null);assert.equal(deck.getGlobalIndex(1,NaN),null);
});

test('all management page contexts are independent and limited to management plus visible demo states',()=>{
 const contexts=new Set<string>();
 for(const p of pages){const w=buildPromptWorkspace(id,'管理学',undefined,p.index);assert.equal(w.modules.length,5);assert.ok(w.compiled.includes(p.title));assert.match(w.compiled,new RegExp(`<lesson_context number="${p.lessonNumber}"`));assert.doesNotMatch(w.compiled,/OOCL|山城新饮|港口管理|经济数学|NEIGHBOR_ANSWER/);assert.equal(w.coverage.slides,pages.length);contexts.add(w.modules[3]!.defaultText);}
 assert.equal(contexts.size,pages.length);
 const tree=getManagementVisibleDemo('decision-tree',{step:0});assert.doesNotMatch(JSON.stringify(tree),/净收益34|净收益17|期望收益：/);
 const revealed=getManagementVisibleDemo('decision-tree',{step:3});assert.match(JSON.stringify(revealed),/净收益34/);
 const payoff=getManagementVisibleDemo('payoff-matrix',{step:0,criterion:'regret'});assert.doesNotMatch(JSON.stringify(payoff),/准则值|选择：/);assert.deepEqual(payoff.table!.rows[0],['甲',40,20,-10]);
});

test('all registered demos: valid states, rejected invalid patches, reference payoffs and sensitivity boundaries',()=>{
 const demos=pages.filter(p=>p.demo);assert.equal(demos.length,lessons.length*2);
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

test('phase two hierarchy and reveal boundaries preserve original numerical meaning',()=>{
 for(const [span,levels,managers] of [[2,[64,32,16,8,4,2,1],63],[3,[64,22,8,3,1],34],[4,[64,16,4,1],21],[5,[64,13,3,1],17],[6,[64,11,2,1],14],[7,[64,10,2,1],13],[8,[64,8,1],9]] as const){
  const r=calculateManagementHierarchy(64,span);assert.deepEqual(r.levels,levels);assert.equal(r.managers,managers);assert.equal(r.totalLevels,levels.length);
  assert.ok(validateManagementInteraction('span-hierarchy',{span}));
 }
 for(const span of [1,9,2.5])assert.equal(validateManagementInteraction('span-hierarchy',{span}),false);
 assert.equal(calculateManagementHierarchy(4096,4).managers,1365);assert.equal(calculateManagementHierarchy(4096,8).managers,585);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('span-hierarchy',{step:0})),/岗位合计|管理层数3|总层数4/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('candidate-evidence',{step:0})),/麦肯锡|离职|选择了李/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('candidate-evidence',{step:1})),/离职|选择了李/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('candidate-evidence',{step:2})),/离职/);
 assert.match(JSON.stringify(getManagementVisibleDemo('candidate-evidence',{step:3})),/第二个月/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('saic-integration',{step:0})),/金融危机|51.33|回生申请/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('pdca-shop',{step:2})),/受到欢迎|形成标准/);
 assert.match(JSON.stringify(getManagementVisibleDemo('recruitment-flow',{step:5})),/130多份 → 31份 → 3人/);
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
  for(const [number,demo] of [[5,'pdca-shop'],[6,'span-hierarchy'],[7,'candidate-evidence'],[8,'saic-integration']] as const){
   const p=pages.find(p=>p.demo===demo)!;await send({type:'set_slide',index:p.index});
   const prompt=(await app.inject({url:`${url}/assistant-prompts`,headers:{cookie:teacher}})).json();
   const answer=await app.inject({method:'POST',url:`${url}/assistant/turns`,headers:{cookie:teacher},payload:{text:'只解释当前可见材料',source:'text'}});assert.match(answer.body,/turn.completed/);
   assert.equal(provider.requests.at(-1)!.messages[0]!.content,prompt.compiled);assert.match(prompt.compiled,new RegExp(`<lesson_context number="${number}"`));
   assert.doesNotMatch(prompt.compiled,/选择了李先生|积极性下降|净收益34|港口管理|经济数学/);
  }
  const tree=pages.find(p=>p.demo==='decision-tree')!;await send({type:'set_slide',index:tree.index});
  const preview=(await app.inject({url:`${url}/assistant-prompts`,headers:{cookie:teacher}})).json();
  const answer=await app.inject({method:'POST',url:`${url}/assistant/turns`,headers:{cookie:teacher},payload:{text:'解释当前页面已经显示的内容',source:'text'}});assert.match(answer.body,/turn.completed/);
  assert.equal(provider.requests.at(-1)!.messages[0]!.content,preview.compiled);assert.doesNotMatch(preview.compiled,/净收益34|净收益17|OOCL|港口管理|经济数学/);
  const initial=(await app.inject(`${url}/snapshot`)).json();await send({type:'set_slide_interaction',slideId:tree.slideKey,expectedRevision:initial.slideInteraction.revision,patch:{step:3}});
  const finalPrompt=(await app.inject({url:`${url}/assistant-prompts`,headers:{cookie:teacher}})).json();assert.match(finalPrompt.compiled,/净收益34/);
  assert.doesNotMatch((await app.inject({url:`${url}/snapshot`,headers:{cookie:student}})).body,/teachingCue|assistantCue|originalNotes|originalAnimation|prompt_module/);
  const jump=await app.inject({method:'POST',url:`${url}/avatar/control`,headers:{cookie:teacher},payload:{protocol:'edu.classroom.control',version:'1.0',requestId:'management-jump-invalid',actions:[{type:'lesson.go_to',lesson:lessons.length+1}]}});assert.equal(jump.statusCode,200);assert.equal(jump.json().status,'noop');
  assert.equal((await send({type:'set_activity',activity:'globe'})).statusCode,409);
  await app.close();app=await buildApp(opts);const restored=(await app.inject(`${url}/snapshot`)).json();assert.equal(restored.slide.index,tree.index);assert.equal(restored.slideInteraction.values.step,3);
  const state=JSON.parse(await readFile(file,'utf8'));assert.equal(state.courses.filter((c:{id:string})=>c.id===id).length,1);assert.equal(state.courses.find((c:{id:string})=>c.id==='course-port-management-intro').progress,67);
  const oldVersion='release-management-principles-v1';
  const ended=(await app.inject({method:'POST',url:`/api/courses/${id}/class-sessions`,headers:{cookie:teacher}})).json().id;
  await app.inject({method:'POST',url:`/api/class-sessions/${ended}/end`,headers:{cookie:teacher}});
  await app.close();
  const historical=JSON.parse(await readFile(file,'utf8'));
  historical.classroomRuntimes[session].deckVersion=oldVersion;historical.classroomRuntimes[session].slideIndex=1;
  historical.classroomRuntimes[ended].deckVersion=oldVersion;
  const endedRuntime=structuredClone(historical.classroomRuntimes[ended]);
  const custom=historical.courses.find((c:{id:string})=>c.id===id);custom.title='管理学·教师自定义';custom.progress=37;custom.currentLesson.summary='教师自定义课程说明';
  historical.assistantPrompts={revision:9,overrides:{'course:management-principles':'保留教师自定义提示'}};
  await writeFile(file,JSON.stringify(historical));app=await buildApp(opts);
  const active=(await app.inject(`${url}/snapshot`)).json();assert.equal(active.slide.index,tree.index);assert.equal(active.slideInteraction.values.step,3);
  const migrated=JSON.parse(await readFile(file,'utf8'));
  assert.equal(migrated.classroomRuntimes[session].deckVersion,getCourseDeckByCourseId(id)!.versionId);
  assert.deepEqual(migrated.classroomRuntimes[ended],endedRuntime);
  assert.deepEqual(migrated.assistantPrompts,historical.assistantPrompts);assert.equal(migrated.courses.find((c:{id:string})=>c.id===id).currentLesson.summary,'教师自定义课程说明');
  assert.equal(migrated.courses.find((c:{id:string})=>c.id===id).title,'管理学·教师自定义');assert.equal(migrated.courses.find((c:{id:string})=>c.id===id).progress,37);

 }finally{await app.close();assert.ok(resolve(dir).startsWith(join(resolve(tmpdir()), 'edu-management-')));await rm(dir,{recursive:true,force:true});}
});
