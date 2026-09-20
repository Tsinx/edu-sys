import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {getCourseDeckByCourseId,getCourseAdjacentIndex,getCourseLessonLabel} from '@edu/course-content/deck-registry';
import {MANAGEMENT_BUILD,MANAGEMENT_SLIDES as pages,MANAGEMENT_LESSONS as lessons,MANAGEMENT_PLAYBACK_ORDER as playback,getManagementVisibleDemo,getManagementInteractionDefinition,validateManagementInteraction,classifyTaskReadiness,classifyFiedlerSituation,traceCommunicationNetwork,calculateManagementRatio,calculateDpmo} from '@edu/course-content/management-principles';
import {MANAGEMENT_SOURCE_DISPOSITIONS as dispositions} from '@edu/course-content/management-principles/source-map';
import {courseSchema,slideFrameSchema,createCourseInputSchema} from '@edu/contracts';
import {createSeedState} from '../src/seed.js';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';
const deck=getCourseDeckByCourseId('management-principles')!;
test('phase three append-only baseline, complete dispositions and intro-first navigation',async()=>{
 const old=JSON.parse(await readFile('../../output/management-principles/phase2-baseline/packages/course-content/src/management-principles/pages.json','utf8'));
 assert.deepEqual(pages.slice(0,663),old);assert.equal(pages[663]!.lessonNumber,9);
 assert.deepEqual(lessons.map(l=>l.number),Array.from({length:17},(_,i)=>i));
 assert.equal(MANAGEMENT_BUILD.lectureCount,16);assert.equal(MANAGEMENT_BUILD.introductionCount,1);assert.equal(MANAGEMENT_BUILD.demoCount,34);
 assert.equal(dispositions.length,1245);assert.equal(dispositions.filter(d=>d.disposition==='omitted').length,2);
 for(const row of dispositions){assert.ok(row.reason);if(row.disposition==='omitted'){assert.equal(row.documentId,'intro');assert.ok([30,31].includes(row.originalPage));assert.deepEqual(row.targets,[]);}else for(const t of row.targets)assert.equal(pages[t.index-1]!.slideKey,t.slideKey);}
 assert.equal(new Set(playback).size,pages.length);
 for(const [n,index]of playback.entries()){assert.equal(getCourseAdjacentIndex(deck,index,-1),playback[n-1]??null);assert.equal(getCourseAdjacentIndex(deck,index,1),playback[n+1]??null);}
 assert.equal(getCourseAdjacentIndex(deck,lessons[0]!.slideEnd,1),1);assert.equal(getCourseAdjacentIndex(deck,663,1),664);
 assert.equal(getCourseAdjacentIndex(deck,lessons.at(-1)!.slideEnd,1),null);assert.equal(getCourseAdjacentIndex(deck,lessons[0]!.slideStart,-1),null);
 assert.equal(getCourseLessonLabel(lessons[0]!),'绪论');
});
test('zero chapter is restricted to management reading contracts and never relaxes manual creation',()=>{
 const c=createSeedState().courses.find(c=>c.id===deck.courseId)!;assert.ok(courseSchema.safeParse(c).success);assert.equal(c.currentLesson.chapter,0);
 assert.equal(courseSchema.safeParse({...c,id:'unregistered',currentLesson:{...c.currentLesson,chapter:0}}).success,false);
 const p=pages[lessons[0]!.slideStart-1]!;const frame={deckId:deck.deckId,versionId:deck.versionId,slideId:p.slideKey,index:p.index,total:pages.length,logicalWidth:1600,logicalHeight:1000,aspectRatio:'16:10',title:p.title,lessonNumber:0,lessonTitle:p.lessonTitle,section:p.section,summary:p.summary};
 assert.ok(slideFrameSchema.safeParse(frame).success);assert.equal(slideFrameSchema.safeParse({...frame,deckId:'unknown'}).success,false);
 assert.equal(createCourseInputSchema.safeParse({title:'自建',code:null,totalHours:null}).success,false);
 const w=buildPromptWorkspace(deck.courseId,'管理学',undefined,p.index);assert.equal(w.coverage.lessons,16);assert.equal(w.coverage.introductions,1);assert.doesNotMatch(w.compiled,/第0讲|第 0 讲/);assert.match(w.compiled,/绪论/);
});
test('phase three theoretical classifications, graph propagation and numerical boundaries',()=>{
 assert.deepEqual(['low','high'].flatMap(a=>['low','high'].map(w=>classifyTaskReadiness(a,w))),[1,2,3,4]);
 assert.deepEqual(['good','poor'].flatMap(r=>['high','low'].flatMap(s=>['strong','weak'].map(p=>classifyFiedlerSituation(r,s,p)))),[1,2,3,4,5,6,7,8]);
 assert.deepEqual(traceCommunicationNetwork('chain','A',1).reached,['A','B']);assert.deepEqual(traceCommunicationNetwork('chain','A',4).reached,['A','B','C','D','E']);
 assert.deepEqual(traceCommunicationNetwork('wheel','C',1).reached,['A','B','C','D','E']);assert.deepEqual(traceCommunicationNetwork('ring','A',1).reached,['A','B','E']);assert.equal(traceCommunicationNetwork('all','D',1).reached.length,5);
 assert.equal(calculateManagementRatio(200,100),2);assert.equal(calculateManagementRatio(200,0),null);assert.equal(calculateDpmo(1000,2,10),5000);assert.equal(calculateDpmo(10,2,21),null);
 assert.equal(validateManagementInteraction('risk-response',{likelihood:2.5}),false);assert.equal(validateManagementInteraction('quality-dmaic',{defects:2.5}),false);
 assert.match(JSON.stringify(getManagementVisibleDemo('course-allocation',{step:1})),/350人/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('course-allocation',{step:0})),/41.67|350人/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('financial-ratios',{step:0})),/2.00|＝/);
 assert.doesNotMatch(JSON.stringify(getManagementVisibleDemo('crisis-evidence',{step:0})),/六小时|快照恢复/);
 assert.match(JSON.stringify(getManagementVisibleDemo('quality-dmaic',{step:1})),/5000.00/);
 assert.match(JSON.stringify(getManagementVisibleDemo('financial-ratios',{step:2,denominator:0})),/未定义|分母为0/);
});
test('all new demo controls reject unknown and out-of-range values and reveal only current steps',()=>{
 const demos=pages.filter(p=>p.demo&&(p.lessonNumber===0||p.lessonNumber>=9));assert.equal(demos.length,18);
 for(const p of demos){const d=p.demo!,definition=getManagementInteractionDefinition(d);for(const c of definition.controls){
  const values=c.options?.map(o=>o.value)??[c.min!,c.max!];for(const value of values){assert.ok(validateManagementInteraction(d,{[c.key]:value}));for(let step=0;step<=definition.maxStep;step++){const visible=getManagementVisibleDemo(d,{step,[c.key]:value});assert.equal(visible.step,step);assert.ok(visible.body.length);assert.doesNotMatch(JSON.stringify(visible),/undefined|NaN|Infinity/);}}
  assert.equal(validateManagementInteraction(d,{[c.key]:c.options?'unknown-value':c.max!+1}),false);
 }
 const initial=buildPromptWorkspace(deck.courseId,'管理学',undefined,p.index);assert.match(initial.compiled,/当前页答案尚未揭示|尚未揭示/);assert.doesNotMatch(initial.compiled,/原稿备注：|originalNotes|港口管理|经济数学/);
 }
});

test('unrevealed management prompts ignore the whole-slide static summary',()=>{
 const p=pages.find(p=>p.demo==='organization-learning')!;const original=p.summary;
 try{p.summary='UNREVEALED_STATIC_SUMMARY_ANSWER';const w=buildPromptWorkspace(deck.courseId,'管理学',undefined,p.index);assert.doesNotMatch(w.compiled,/UNREVEALED_STATIC_SUMMARY_ANSWER/);assert.match(w.compiled,/尚未展示任何学习类型的解释/);assert.match(w.compiled,/服务窗口反复出现等待/);}finally{p.summary=original;}
});
