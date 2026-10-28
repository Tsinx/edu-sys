import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {ClassroomActor} from '@edu/contracts';
import Fastify from 'fastify';
import {EnterpriseRepository,registerEnterprise} from '../src/enterprise-routes.js';
test('archived rules block new attempts without consuming an attempt or changing the historical task',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'edu-enterprise-compat-')),repo=new EnterpriseRepository(join(dir,'tasks.sqlite')),app=Fastify();
  const actor={actorId:'compat-student',displayName:'兼容性测试学生',roles:['student'],identitySource:'development'} as ClassroomActor;
  registerEnterprise(app,repo,{resolve:async()=>({...actor,roles:['teacher']}),allowed:()=>null,roster:()=>[]});
  try{
    const task=repo.publish({title:'历史任务兼容检查',config:{seed:20261025,years:1,scenario:'balanced',mode:'exam'},maxAttempts:2,completeRequired:true});
    const reordered={...task,rules:Object.fromEntries(Object.entries(task.rules).reverse())};
    repo.db.prepare('UPDATE enterprise_tasks SET payload=? WHERE id=?').run(JSON.stringify(reordered),task.id);
    const requestId=randomUUID(),first=repo.start(actor,task.id,requestId);assert.equal(first.status,'started');
    const archived={...reordered,rules:{...task.rules,engine:'port-enterprise/1.0'}};
    repo.db.prepare('UPDATE enterprise_tasks SET payload=? WHERE id=?').run(JSON.stringify(archived),task.id);
    assert.throws(()=>repo.start(actor,task.id,randomUUID()),e=>(e as {code:string}).code==='TASK_RULES_ARCHIVED');
    assert.equal(repo.attempts(actor.actorId,task.id).length,1);
    assert.equal(repo.start(actor,task.id,requestId).id,first.id,'re-reading an existing receipt does not allocate a new attempt');
    assert.deepEqual(repo.task(task.id),archived,'do not silently migrate the task or remove its history');
    assert.equal((await app.inject({method:'PATCH',url:'/api/port-enterprise/tasks/'+task.id,payload:{closed:true}})).statusCode,200);
    const reopen=await app.inject({method:'PATCH',url:'/api/port-enterprise/tasks/'+task.id,payload:{closed:false}});assert.equal(reopen.statusCode,409);assert.equal(reopen.json().code,'TASK_RULES_ARCHIVED');
  }finally{await app.close();await repo.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});}
});
