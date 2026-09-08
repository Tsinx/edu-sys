import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import { CampusStateRepository } from "../src/campus/state-repository.js";
import { EdgeRecordRepository } from "../src/campus/edge-records.js";
import { AiAdmission } from "../src/campus/ai-admission.js";
import { JsonStateStore } from "../src/store.js";
import { createSeedState, createInitialClassroomRuntime } from "../src/seed.js";
import type { ClassroomActor } from "@edu/contracts";
const temporary=()=>mkdtemp(join(tmpdir(),"edu-campus-"));
const cookie=(response:{headers:Record<string,unknown>})=>String(response.headers["set-cookie"]).split(";")[0]!;

test("campus accounts, fail-closed routes, CSRF, durable sessions and logout",async()=>{
  const dir=await temporary();const path=join(dir,"accounts.sqlite");
  let identity=new CampusIdentityProvider(path);
  await identity.createAccount("teacher","测试教师","teacher","test-teacher-password");
  await identity.createAccount("student","测试学生","student","test-student-password");
  let app=await buildApp({dataFile:join(dir,"state.json"),campusMode:true,identityProvider:identity,secureIdentityCookie:false,publicOrigin:"https://class.test"});
  try {
    for(const url of ["/api/courses/course-port-management-intro/class-sessions","/api/class-sessions/unknown/avatar/control","/api/class-sessions/unknown/events","/api/class-sessions/unknown/end","/api/teacher/tts"]) {
      assert.equal((await app.inject({method:"POST",url,payload:{}})).statusCode,401,url);
    }
    assert.equal((await app.inject({method:"POST",url:"/api/identity/development/session",payload:{role:"teacher"}})).statusCode,403);
    const teacher=await app.inject({method:"POST",url:"/api/identity/login",payload:{username:"teacher",password:"test-teacher-password"}});
    assert.equal(teacher.statusCode,200);assert.equal(teacher.json().actor.identitySource,"campus_local");
    const teacherCookie=cookie(teacher);
    const student=await app.inject({method:"POST",url:"/api/identity/login",payload:{username:"student",password:"test-student-password"}});
    const studentCookie=cookie(student);
    for(const [method,url] of [["POST","/api/courses/course-port-management-intro/class-sessions"],["GET","/api/me"],["GET","/api/admin/ai"],["POST","/api/teacher/tts"]] as const) {
      assert.equal((await app.inject({method,url,headers:{cookie:studentCookie},...(method==="POST"?{payload:{}}:{})})).statusCode,403,url);
    }
    assert.equal((await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions",headers:{cookie:teacherCookie,origin:"https://evil.test"},payload:{}})).statusCode,403);
    const live=await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions",headers:{cookie:teacherCookie},payload:{}});
    assert.equal(live.statusCode,201);
    const read=await app.inject({url:`/api/class-sessions/${live.json().id}/snapshot`,headers:{cookie:studentCookie}});
    assert.equal(read.statusCode,200);assert.equal(read.headers["cache-control"],"no-store");
    assert.equal((await app.inject({url:"/api/me",headers:{cookie:teacherCookie}})).json().name,"测试教师");
    await app.close();identity=new CampusIdentityProvider(path);
    app=await buildApp({dataFile:join(dir,"state.json"),campusMode:true,identityProvider:identity,secureIdentityCookie:false});
    assert.equal((await app.inject({url:"/api/identity/session",headers:{cookie:teacherCookie}})).statusCode,200);
    await app.inject({method:"POST",url:"/api/identity/logout",headers:{cookie:teacherCookie}});
    assert.equal((await app.inject({url:"/api/identity/session",headers:{cookie:teacherCookie}})).statusCode,401);
    assert.equal((await app.inject({url:"/api/identity/session",headers:{cookie:studentCookie}})).statusCode,200);
  } finally {await app.close();await rm(dir,{recursive:true,force:true});}
});

test("SQLite migration preserves JSON authority, array order and completed classroom versions",async()=>{
  const dir=await temporary();const data=join(dir,"state.json");const db=join(dir,"platform.sqlite");
  const seed=createSeedState();seed.classSessions[0]!.status="completed";
  seed.classroomRuntimes[seed.classSessions[0]!.id]={...createInitialClassroomRuntime(),deckVersion:"historical-v6"};
  const raw=JSON.stringify(seed);await writeFile(data,raw);
  let store=new JsonStateStore(data,45000,join(dir,"events.sqlite"),db);
  try {
    await store.initialize();const before=store.listCourses().length;
    await store.createCourse({title:"校园迁移测试",code:"TEST",category:"测试",discipline:"教学",totalHours:10});
    assert.equal(store.listCourses().length,before+1);assert.equal(await readFile(data,"utf8"),raw);
    store.close();store=new JsonStateStore(data,45000,join(dir,"events.sqlite"),db);await store.initialize();
    assert.equal(store.listCourses().length,before+1);
    const repository=new CampusStateRepository(db);
    const loaded=repository.load()!;assert.equal(loaded.classroomRuntimes[seed.classSessions[0]!.id]!.deckVersion,"historical-v6");
    assert.deepEqual(loaded.teachers.map(t=>t.id),seed.teachers.map(t=>t.id));
    assert.ok(Array.isArray(loaded.studySessions));repository.close();
  } finally {store.close();await rm(dir,{recursive:true,force:true});}
});

test("failed persistence cannot leak a mutation into memory or a later successful write",async()=>{
  const dir=await temporary();const data=join(dir,"state.json");const store=new JsonStateStore(data);
  try {
    await store.initialize();const before=store.listCourses().length;
    const internals=store as unknown as {persist:(...args:unknown[])=>Promise<void>};const persist=internals.persist;
    internals.persist=async()=>{throw new Error("injected write failure");};
    await assert.rejects(store.createCourse({title:"不能保存",code:"BAD",category:"测试",discipline:"教学",totalHours:10}));
    assert.equal(store.listCourses().length,before);internals.persist=persist;
    await store.createCourse({title:"正常保存",code:"GOOD",category:"测试",discipline:"教学",totalHours:10});
    assert.equal((await readFile(data,"utf8")).includes("不能保存"),false);
  } finally {store.close();await rm(dir,{recursive:true,force:true});}
});

test("checkpoint retries survive lost acknowledgements and restart without cross-account overwrite",async()=>{
  const dir=await temporary();const path=join(dir,"edge.sqlite");let repo=new EdgeRecordRepository(path);
  try {
    const input={requestId:randomUUID(),key:"experiment:run",deviceId:randomUUID(),expectedRevision:0,value:"first",releaseId:"r1"};
    const receipt=repo.put("student-a",input);repo.close();repo=new EdgeRecordRepository(path);
    assert.deepEqual(repo.put("student-a",input),receipt);
    assert.throws(()=>repo.put("student-a",{...input,value:"tampered"}),/提交编号/);
    assert.throws(()=>repo.put("student-a",{...input,requestId:randomUUID(),deviceId:randomUUID(),value:"other device"}),/另一台设备/);
    assert.equal(repo.list("student-b").length,0);
    assert.equal(repo.put("student-b",input).revision,1);
    assert.equal(repo.list("student-a")[0]!.value,"first");
  } finally {repo.close();await rm(dir,{recursive:true,force:true});}
});

test("AI admission reserves teacher capacity, cancels queued work and persists daily quotas",async()=>{
  const dir=await temporary();const path=join(dir,"ai.sqlite");
  const limits={concurrency:2,queue:1,dailyRequests:1,timeoutMs:500};let queue=new AiAdmission(path,limits);
  const student=(id:string):ClassroomActor=>({actorId:id,displayName:id,roles:["student"],identitySource:"campus_local"});
  const teacher:ClassroomActor={...student("t"),roles:["teacher"]};
  try {
    const finish=await queue.enter(student("a"),"llm",new AbortController().signal);
    const cancellation=new AbortController();const pending=queue.enter(student("b"),"llm",cancellation.signal);
    const rejected=assert.rejects(pending,/取消|超时/);
    const teacherFinish=await queue.enter(teacher,"llm",new AbortController().signal);
    assert.equal(queue.status().active,2);assert.equal(queue.status().queued,1);
    cancellation.abort();await rejected;teacherFinish("completed");finish("completed");finish("completed");
    assert.equal(queue.status().active,0);queue.close();queue=new AiAdmission(path,limits);
    await assert.rejects(queue.enter(student("a"),"llm",new AbortController().signal),/额度/);
  } finally {queue.close();await rm(dir,{recursive:true,force:true});}
});

test("an AI answer arriving after class end cannot change slides or reactivate the avatar",async()=>{
  const dir=await temporary();let unblock!:()=>void;let started!:()=>void;
  const gate=new Promise<void>(resolve=>{unblock=resolve;});const began=new Promise<void>(resolve=>{started=resolve;});
  const app=await buildApp({dataFile:join(dir,"state.json"),assistantProvider:{name:"delayed-test",async *streamJson(){started();await gate;yield JSON.stringify({schema:"edu.classroom.assistant.response",version:"1.0",dialogue:"下一页",actions:[{type:"slides.next"}]});}}});
  try {
    const live=await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions"});const id=live.json().id;
    const before=(await app.inject({url:`/api/class-sessions/${id}/snapshot`})).json();
    const pending=app.inject({method:"POST",url:`/api/class-sessions/${id}/assistant/turns`,payload:{text:"下一页",source:"text"}});
    await began;await app.inject({method:"POST",url:`/api/class-sessions/${id}/end`});unblock();await pending;
    const after=(await app.inject({url:`/api/class-sessions/${id}/snapshot`})).json();
    assert.equal(after.slide.index,before.slide.index);assert.equal(after.session.status,"completed");assert.equal(after.avatar.status,"off");
  } finally {unblock();await app.close();await rm(dir,{recursive:true,force:true});}
});
