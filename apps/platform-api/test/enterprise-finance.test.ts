import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ClassroomActor} from '@edu/contracts';
import {createEnterprise,executeEnterprise,makeEnterprisePackage,type EnterpriseCommand} from '@edu/port-simulation-core';
import {EnterpriseRepository} from '../src/enterprise-routes.js';
test('verified bankruptcy is a terminal assessed outcome, and tutorial protection cannot be published as an exam', {timeout:30000},async()=>{
 const repo=new EnterpriseRepository(':memory:'),actor:ClassroomActor={actorId:'finance-test',displayName:'资金核验测试',roles:['student'],identitySource:'development'};
 try{
  assert.throws(()=>repo.publish({title:'不允许的带教考核',config:{seed:20261025,years:3,scenario:'balanced',mode:'practice',tutorial:true},maxAttempts:1,completeRequired:true}),/固定带教/);
  assert.equal(repo.tasks().length,0);
  const task=repo.publish({title:'经营失败结算检查',config:{seed:20261025,years:1,scenario:'balanced',mode:'exam'},maxAttempts:1,completeRequired:true}),attempt=repo.start(actor,task.id,randomUUID());
  let s=createEnterprise(task.config);const act=(c:EnterpriseCommand)=>{s=executeEnterprise(s,c);assert.ok(s.journal.at(-1)?.ok,s.journal.at(-1)?.message??'missing outcome');};
  act({kind:'project',type:'berth-extension',terminalId:'T1'});act({kind:'project',type:'channel-depth',terminalId:'T1'});act({kind:'advance',hours:30*24,stopOnIncident:false});assert.equal(s.finance.status,'bankrupt');
  for(const topic of ['经营决策','设备投资','生产调度','异常与边界'])act({kind:'note',topic,text:'本次资金缺口来自施工支出和回款时差，需要先检查还款计划、现金保障与实际履约后果。'});
  act({kind:'seal'});repo.submit(actor,attempt.id,randomUUID(),makeEnterprisePackage(s));
  const deadline=Date.now()+20000;while(['queued','verifying'].includes(repo.get(attempt.id)!.status)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25));
  const row=repo.get(attempt.id)!;assert.equal(row.status,'verified',row.error??'pending verification');const result=JSON.parse(row.result!);assert.equal(result.complete,true);assert.equal(result.outcome,'bankrupt');assert.ok(result.progress<1);
 }finally{await repo.close();}
});
