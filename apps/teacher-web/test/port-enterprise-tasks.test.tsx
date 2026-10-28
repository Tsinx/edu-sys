import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {JSDOM} from 'jsdom';
import {ENTERPRISE_RULES,type EnterpriseTask,type EnterpriseAttemptSummary} from '@edu/port-simulation-core';
import {EnterpriseTasks,enterpriseRequest} from '../src/features/port-simulation/enterprise/EnterpriseTasks';
import type {useEnterprise} from '../src/features/port-simulation/enterprise/useEnterprise';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://enterprise-tasks.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,React});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
let render:typeof import('@testing-library/react').render,fireEvent:typeof import('@testing-library/react').fireEvent,waitFor:typeof import('@testing-library/react').waitFor,act:typeof import('@testing-library/react').act,cleanup:typeof import('@testing-library/react').cleanup;
before(async()=>{({render,fireEvent,waitFor,act,cleanup}=await import('@testing-library/react'));});
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;dom.window.localStorage.clear();});
after(()=>dom.window.close());
const actor={actorId:'test-student',displayName:'测试学生',roles:['student'],identitySource:'development'} as const;
const task:EnterpriseTask={id:'task-test',title:'正式任务',courseId:'course-port-management-intro',config:{seed:1,years:1,scenario:'balanced',mode:'exam'},rules:{...ENTERPRISE_RULES},createdAt:new Date().toISOString(),deadline:null,maxAttempts:2,completeRequired:true,closed:false};
const response=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
function runtimeFixture(){
  const calls:string[]=[];
  const runtime={busy:false,saves:[],currentSave:null,view:null,replaying:false,create:async()=>{calls.push('create');return 'new-save';},load:async()=>{calls.push('load');return 'save';},bindAttempt:()=>calls.push('bind'),waitForSave:async()=>{calls.push('saved');}} as unknown as ReturnType<typeof useEnterprise>;
  return {runtime,calls};
}
test('rapid starts issue one request; a late response after closing cannot switch or bind the port',async()=>{
  let release!:(value:Response)=>void,posts=0;const bodies:unknown[]=[];
  globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/attempts')){posts++;bodies.push(JSON.parse(options!.body as string));return new Promise<Response>(resolve=>{release=resolve;});}return response({tasks:[task],attempts:[]});};
  const {runtime,calls}=runtimeFixture(),navigate=(tab:string)=>calls.push('navigate:'+tab);
  const screen=render(<EnterpriseTasks actor={{...actor,roles:['student']}} confirmed runtime={runtime} navigate={navigate}/>);
  const button=await screen.findByRole('button',{name:'建立正式个人场次'});
  fireEvent.click(button);fireEvent.click(button);fireEvent.click(button);
  assert.equal(posts,1);assert.equal((bodies[0] as {attemptIndex:number}).attemptIndex,0);
  screen.unmount();
  const attempt:EnterpriseAttemptSummary={id:'attempt-test',taskId:task.id,actorId:actor.actorId,displayName:actor.displayName,config:task.config,status:'started',createdAt:new Date().toISOString(),submittedAt:null,error:null,result:null};
  await act(async()=>{release(response(attempt));await new Promise(resolve=>setTimeout(resolve,0));});
  assert.deepEqual(calls,[],'late network resolution must leave the current local port untouched');
});
test('archived task rules and unknown historical scenario names remain readable and cannot allocate a new attempt',async()=>{
  const archived={...task,config:{...task.config,scenario:'historical-scenario'},rules:{...task.rules,engine:'port-enterprise/1.0'}};
  globalThis.fetch=async()=>response({tasks:[archived],attempts:[]});const {runtime,calls}=runtimeFixture();
  const screen=render(<EnterpriseTasks actor={{...actor,roles:['student']}} confirmed runtime={runtime} navigate={()=>calls.push('navigate')}/>);
  const button=await screen.findByRole('button',{name:'请教师发布当前版本任务'});
  assert.equal((button as HTMLButtonElement).disabled,true);assert.match(screen.container.textContent!,/历史情境/);assert.match(screen.container.textContent!,/规则已归档/);
  fireEvent.click(button);await waitFor(()=>assert.deepEqual(calls,[]));
});
test('network and timeout failures explain the retained local package in Chinese',async()=>{
  for(const reason of [new TypeError('Failed to fetch'),new DOMException('timed out','TimeoutError')]){
    globalThis.fetch=async()=>{throw reason;};await assert.rejects(enterpriseRequest('tasks'),/教学平台.*本机记录和封存包继续保留/);
  }
});
test('a verified receipt ends the submission flow instead of offering another retry',async()=>{
  const {runtime}=runtimeFixture();Object.assign(runtime,{currentSave:{attemptId:'verified-attempt'},view:{sealed:true}});
  globalThis.fetch=async()=>response({tasks:[task],attempts:[{id:'verified-attempt',taskId:task.id,actorId:actor.actorId,displayName:actor.displayName,config:task.config,status:'verified',result:{complete:true,total:90}}]});
  const screen=render(<EnterpriseTasks actor={{...actor,roles:['student']}} confirmed runtime={runtime} navigate={()=>undefined}/>);
  const completed=await screen.findByRole('button',{name:'已核验，提交完成'});assert.equal((completed as HTMLButtonElement).disabled,true);assert.match(screen.container.textContent!,/本场已通过服务器独立核验，提交完成/);
});
