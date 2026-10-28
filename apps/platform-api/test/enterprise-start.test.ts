import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {ClassroomActor} from '@edu/contracts';
import Fastify from 'fastify';
import {EnterpriseRepository,registerEnterprise,enterpriseVerificationWorker} from '../src/enterprise-routes.js';
import {createEnterprise,executeEnterprise,makeEnterprisePackage} from '@edu/port-simulation-core';

const actor={actorId:'start-student',displayName:'场次测试学生',roles:['student'],identitySource:'development'} as ClassroomActor;
test('separate late start requests share one intended attempt and receipts survive reopening',{timeout:30000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),'edu-enterprise-start-')),path=join(dir,'tasks.sqlite');let repo=new EnterpriseRepository(path);
  try{
    const task=repo.publish({title:'独立场次意图测试',config:{seed:20261025,years:1,scenario:'balanced',mode:'exam'},maxAttempts:2,completeRequired:true});
    const request0=randomUUID(),alias0=randomUUID(),first=repo.start(actor,task.id,request0,0);
    assert.equal(repo.start(actor,task.id,alias0,0).id,first.id);
    assert.equal(repo.start(actor,task.id,randomUUID()).id,first.id,'older clients also resume an ongoing attempt');
    assert.equal(repo.attempts(actor.actorId,task.id).length,1);
    assert.throws(()=>repo.start(actor,task.id,randomUUID(),1),e=>(e as {code:string}).code==='ATTEMPT_IN_PROGRESS');
    assert.throws(()=>repo.start(actor,task.id,request0,1),e=>(e as {code:string}).code==='REQUEST_CONFLICT');
    // This is a protocol fixture, not a claimed replay/grade verification.
    repo.db.prepare("UPDATE enterprise_attempts SET status='rejected' WHERE id=?").run(first.id);
    const second=repo.start(actor,task.id,randomUUID(),1);assert.notEqual(second.id,first.id);
    assert.equal(repo.start(actor,task.id,randomUUID(),0).id,first.id,'a delayed first-slot request must not consume the second slot');
    await repo.close();repo=new EnterpriseRepository(path);
    assert.equal(repo.start(actor,task.id,request0,0).id,first.id);
    assert.equal(repo.start(actor,task.id,alias0,0).id,first.id,'aliases are durable, including after submission status changes');
    assert.equal(repo.start(actor,task.id,randomUUID(),1).id,second.id);
    repo.db.prepare("UPDATE enterprise_attempts SET status='rejected' WHERE id=?").run(second.id);
    assert.throws(()=>repo.start(actor,task.id,randomUUID(),2),e=>(e as {code:string}).code==='ATTEMPT_LIMIT');
    const other=repo.publish({title:'其他任务',config:task.config,maxAttempts:2,completeRequired:true});
    assert.throws(()=>repo.start(actor,other.id,request0,0),e=>(e as {code:string}).code==='REQUEST_CONFLICT');
    assert.equal(repo.attempts(actor.actorId,task.id).length,2);
    assert.equal(repo.attempts(actor.actorId,other.id).length,0);
  }finally{await repo.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});}
});

test('the HTTP start protocol rejects invalid and future slots before allocating an attempt',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'edu-enterprise-start-http-')),repo=new EnterpriseRepository(join(dir,'tasks.sqlite')),app=Fastify();
  registerEnterprise(app,repo,{resolve:async()=>actor,allowed:()=>null,roster:()=>[]});
  try{
    const task=repo.publish({title:'场次边界检查',config:{seed:20261025,years:1,scenario:'balanced',mode:'exam'},maxAttempts:2,completeRequired:true});
    const start=(attemptIndex:unknown)=>app.inject({method:'POST',url:'/api/port-enterprise/tasks/'+task.id+'/attempts',payload:{requestId:randomUUID(),attemptIndex}});
    for(const index of [-1,0.5,5,'0',null])assert.notEqual((await start(index)).statusCode,200);
    const future=await start(1);assert.equal(future.statusCode,409);assert.equal(future.json().code,'ATTEMPT_SEQUENCE');
    assert.equal(repo.attempts(actor.actorId,task.id).length,0);
    const first=await start(0);assert.equal(first.statusCode,200,first.body);
    assert.equal((await start(0)).json().id,first.json().id);
    assert.equal(repo.attempts(actor.actorId,task.id).length,1);
  }finally{await app.close();await repo.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});}
});
test('verification progress is not a final result and a stalled worker still has a deadline',{timeout:30000},async()=>{
  let state=createEnterprise({seed:20261025,years:1,scenario:'balanced',mode:'practice'});
  state=executeEnterprise(state,{kind:'advance',hours:48});state=executeEnterprise(state,{kind:'seal'});const pkg=makeEnterprisePackage(state);
  const worker=enterpriseVerificationWorker(pkg,{idleTimeoutMs:10000,maxDurationMs:20000});
  try{const value=await worker.promise;assert.equal(value.hour,48);assert.equal(value.stateHash,pkg.expected.hash);}finally{await worker.cancel();}
  const stalled=enterpriseVerificationWorker(pkg,{idleTimeoutMs:1,maxDurationMs:10});
  await assert.rejects(stalled.promise,/没有进展|最长时限/);await stalled.cancel();
});
