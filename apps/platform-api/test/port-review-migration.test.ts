import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getPortManagementSlideByKey,PORT_MANAGEMENT_DECK_VERSION} from '@edu/course-content';
import {createSeedState,createInitialClassroomRuntime} from '../src/seed.js';
import {JsonStateStore} from '../src/store.js';

test('inserting AI lesson relocates live review keys, numeric bookmarks, films and reading progress while preserving history',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-port-review-move-')),file=join(dir,'state.json'),state=createSeedState(),base=state.classSessions[0]!,version='release-port-management-facilities-v21';
 const entries=[
  {id:'old-review-one',index:768,key:'l19-review-opening',expected:808},
  {id:'old-review-two',index:800,key:'l20-review-opening',expected:840},
  {id:'numeric-one-last',index:799,key:'',expected:839},
  {id:'numeric-two-last',index:831,key:'',expected:871},
  {id:'unchanged-eighteen',index:767,key:'',expected:767}
 ];
 state.classSessions=entries.map(e=>({...base,id:e.id,status:'live' as const}));state.classSessions.push({...base,id:'completed-review',status:'completed'});
 for(const e of entries)state.classroomRuntimes[e.id]={...createInitialClassroomRuntime(),slideIndex:e.index,slideKey:e.key,deckVersion:version};
 state.classroomRuntimes['old-review-one']!.portExpansionPresentation={slideKey:'l19-review-opening',progress:.5,option:0,revealed:false,cinematic:{clipId:'l19-review',status:'playing',elapsedMs:16000,startedAt:Date.now()}};
 state.classroomRuntimes['old-review-two']!.portExpansionPresentation={slideKey:'l20-review-opening',progress:.25,option:0,revealed:false,cinematic:{clipId:'l20-review',status:'paused',elapsedMs:8000,startedAt:null}};
 const completed=structuredClone(state.classroomRuntimes['old-review-one']!);state.classroomRuntimes['completed-review']=completed;
 const identity=JSON.stringify(['teacher-1','course-port-management-intro']);state.portal??={preparations:{},readings:{},preferences:{},startRequests:{},deletedClassrooms:{}};state.portal.readings[identity]={slideKey:'l20-review-opening',deckVersion:version,revision:7,updatedAt:'2026-10-27T12:00:00.000Z'};
 await writeFile(file,JSON.stringify(state));const store=new JsonStateStore(file);
 try{await store.initialize();for(const e of entries){const p=store.getClassroomSnapshot(e.id)!.slide;assert.equal(p.index,e.expected,e.id);assert.equal(p.versionId,PORT_MANAGEMENT_DECK_VERSION);}
  const saved=JSON.parse(await readFile(file,'utf8'));assert.deepEqual(saved.classroomRuntimes['completed-review'],completed);
  for(const [id,key,clip,time] of [['old-review-one','l19-review-opening','l20-review-v2',16000],['old-review-two','l20-review-opening','l21-review-v2',8000]] as const){const p=saved.classroomRuntimes[id].portExpansionPresentation;assert.equal(p.slideKey,getPortManagementSlideByKey(key)!.slideKey);assert.deepEqual(p.cinematic,{clipId:clip,status:'paused',elapsedMs:time,startedAt:null});}
  assert.deepEqual(saved.portal.readings[identity],{slideKey:'l21-review2-review-opening',deckVersion:PORT_MANAGEMENT_DECK_VERSION,revision:7,updatedAt:'2026-10-27T12:00:00.000Z'});
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});

test('self-study restores old review keys and numeric-only v21 positions without changing revision timestamps',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-port-review-study-')),file=join(dir,'state.json'),first=new JsonStateStore(file);
 let session;
 try{await first.initialize();session=await first.createOrResumeStudySession('course-port-management-intro',{actorId:'student-review',displayName:'Review reader',roles:['student'],identitySource:'development'});}finally{first.close();}
 assert.ok(session);const data=JSON.parse(await readFile(file,'utf8')),version='release-port-management-facilities-v21',updatedAt=session.updatedAt;
 data.studySessions=[{...session,id:'old-review-key',slideKey:'l19-review-opening',globalIndex:768,deckVersion:version,slideTotal:831},{...session,id:'old-review-numeric',slideKey:'',globalIndex:810,deckVersion:version,slideTotal:831}];
 await writeFile(file,JSON.stringify(data));const restored=new JsonStateStore(file);
 try{await restored.initialize();const saved=JSON.parse(await readFile(file,'utf8'));assert.deepEqual(saved.studySessions.map((s:{globalIndex:number;slideTotal:number;updatedAt:string})=>[s.globalIndex,s.slideTotal,s.updatedAt]),[[808,871,updatedAt],[850,871,updatedAt]]);assert.equal(saved.studySessions[0].slideKey,'l20-review1-review-opening');assert.equal(saved.studySessions[1].deckVersion,PORT_MANAGEMENT_DECK_VERSION);}finally{restored.close();await rm(dir,{recursive:true,force:true});}
});
