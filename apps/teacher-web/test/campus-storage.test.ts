import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { changeRecord, getRecords, localGet, localSet } from "../src/campus/storage";
import { cachedRequest, flushStudyProgress } from "../src/campus/offline-api";
import { stripAuthoringMetadata } from "../campus-build";

Object.defineProperty(globalThis,"window",{value:new EventTarget(),configurable:true});

test("a newer online progress update clears the stale offline retry",async()=>{
  await localSet("identity",{actor:{actorId:"progress-student"},expiresAt:new Date(Date.now()+60000).toISOString()});
  const path="/api/study-sessions/study-1/progress";
  await localSet("progress:progress-student:study-1",{path,body:JSON.stringify({globalIndex:2})});
  await cachedRequest(path,{method:"PATCH",body:JSON.stringify({globalIndex:8})},async()=>Response.json({id:"study-1",globalIndex:8}));
  assert.equal(await localGet("progress:progress-student:study-1"),undefined);
  assert.equal((await localGet<{globalIndex:number}>("api:progress-student:/api/study-sessions/study-1"))?.globalIndex,8);
});

test("public builds remove authored private metadata even with expressions and nested objects",()=>{
  const result=stripAuthoringMetadata(`export const page={title:'学生材料',teachingCue: ['秘密甲','秘密乙'].join(','), nested:{assistantCue:'机密提示'},storyBeat:'教师安排',evidence:'公开证据'};`,"lesson.ts");
  assert.ok(result.includes("学生材料"));assert.ok(result.includes("公开证据"));
  for(const text of ["秘密甲","秘密乙","机密提示","教师安排"])assert.equal(result.includes(text),false);
});
test("IndexedDB keeps account isolation and a changed local save while acknowledgement is in flight",async()=>{
  const first={key:"run",value:"v1",revision:0,deviceId:"device",dirty:true,updatedAt:"now"};
  await changeRecord("student-a","run",()=>first);
  await changeRecord("student-a","run",old=>({...old!,pending:{requestId:"r1",value:"v1",expectedRevision:0,releaseId:"release"}}));
  await changeRecord("student-a","run",old=>({...old!,value:"v2",dirty:true}));
  await changeRecord("student-a","run",old=>({...old!,revision:1,pending:undefined,dirty:old!.value!=="v1"}));
  const stored=(await getRecords("student-a"))[0]!;assert.equal(stored.value,"v2");assert.equal(stored.dirty,true);assert.equal(stored.revision,1);
  assert.equal((await getRecords("student-b")).length,0);
});

test("independent reading stays account scoped offline and refuses conflicting server revisions",async()=>{
  const actorId='reading-student',path='/api/courses/management-principles/reading',key=`reading:${actorId}:${path}`;
  await localSet('identity',{actor:{actorId},expiresAt:new Date(Date.now()+60000).toISOString()});
  const body=JSON.stringify({slideKey:'mg-002',deckVersion:'v1',revision:2});
  const offline=await cachedRequest(path,{method:'PUT',body},async()=>{throw new Error('offline');});
  assert.equal((await offline.json()).pendingSync,true);
  assert.equal((await cachedRequest(path,{},async()=>Response.json(null))).status,200);
  const fetch=globalThis.fetch;let writes=0;
  try{
    globalThis.fetch=async(url,init)=>String(url).endsWith('/identity/session')?Response.json({actor:{actorId:'other-account'}}):(writes++,Response.json({}, {status:409}));
    await flushStudyProgress(actorId);assert.equal(writes,0,'never upload previous account progress into new session');
    globalThis.fetch=async(url,init)=>String(url).endsWith('/identity/session')?Response.json({actor:{actorId}}):(writes++,Response.json({}, {status:409}));
    await flushStudyProgress(actorId);assert.equal(writes,1);assert.ok(await localGet(key),'conflicting local progress is retained');
    globalThis.fetch=async(url,init)=>String(url).endsWith('/identity/session')?Response.json({actor:{actorId}}):Response.json({slideKey:'mg-002',deckVersion:'v1',revision:3});
    await flushStudyProgress(actorId);assert.equal(await localGet(key),undefined);assert.equal((await localGet<{revision:number}>(`api:${actorId}:${path}`))?.revision,3);
  }finally{globalThis.fetch=fetch;}
});
