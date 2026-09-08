import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { changeRecord, getRecords, localGet, localSet } from "../src/campus/storage";
import { cachedRequest } from "../src/campus/offline-api";
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
