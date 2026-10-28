import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {JSDOM} from 'jsdom';
import {IDBFactory,IDBDatabase as FakeDatabase} from 'fake-indexeddb';
import {Worker as NodeWorker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {createEnterprise,executeEnterprise,enterpriseRecord,restoreEnterprise} from '@edu/port-simulation-core';
import {useEnterprise} from '../src/features/port-simulation/enterprise/useEnterprise';
import {listEnterpriseSaves,saveEnterprise,type EnterpriseSave} from '../src/features/port-simulation/enterprise/enterprise-storage';
import type {EnterpriseRequest,EnterpriseResponse} from '../src/features/port-simulation/enterprise/enterprise-channel';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://enterprise-runtime.test/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,React});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
const originalTransaction=FakeDatabase.prototype.transaction;
let failWrites=false,failReads=false;
FakeDatabase.prototype.transaction=function(...args:Parameters<typeof originalTransaction>){
  const mode=args[1]??'readonly';
  if(failWrites&&mode==='readwrite')throw new DOMException('injected quota failure','QuotaExceededError');
  if(failReads&&mode==='readonly')throw Error('injected read failure');
  return originalTransaction.apply(this,args);
};
class BrowserWorkerBridge{
  onmessage:((event:MessageEvent<EnterpriseResponse>)=>void)|null=null;
  onerror:((event:ErrorEvent)=>void)|null=null;
  private ready=false;private stopped=false;private waiting:unknown[]=[];private worker:NodeWorker;private stopping?:Promise<number>;
  constructor(url:URL){
    const code=`import {parentPort,workerData} from 'node:worker_threads';const {register}=await import(${JSON.stringify(import.meta.resolve('tsx/esm/api'))});register();globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);await import(workerData);parentPort.on('message',data=>globalThis.onmessage({data}));parentPort.postMessage({ready:true});`;
    this.worker=new NodeWorker(new URL('data:text/javascript,'+encodeURIComponent(code)),{workerData:url.href,execArgv:[]});
    this.worker.on('message',m=>{if(this.stopped)return;if(m.ready){this.ready=true;for(const request of this.waiting)this.worker.postMessage(request);this.waiting=[];return;}this.onmessage?.({data:m} as MessageEvent<EnterpriseResponse>);});
    this.worker.on('error',e=>{if(!this.stopped)this.onerror?.({message:e.message} as ErrorEvent);});
    workers.push(this);
  }
  postMessage(message:EnterpriseRequest&{id:number}){if(this.ready)this.worker.postMessage(message);else this.waiting.push(message);}
  terminate(){if(this.stopped)return;this.stopped=true;this.stopping=this.worker.terminate();}
  async stop(){this.terminate();await this.stopping;}
  crash(){this.onerror?.({message:'injected worker failure'} as ErrorEvent);}
}
const workers:BrowserWorkerBridge[]=[];
Object.assign(globalThis,{Worker:BrowserWorkerBridge});
let renderHook:typeof import('@testing-library/react').renderHook,act:typeof import('@testing-library/react').act,waitFor:typeof import('@testing-library/react').waitFor,cleanup:typeof import('@testing-library/react').cleanup;
before(async()=>{({renderHook,act,waitFor,cleanup}=await import('@testing-library/react'));});
afterEach(async()=>{cleanup();await Promise.all(workers.splice(0).map(w=>w.stop()));failWrites=false;failReads=false;dom.window.sessionStorage.clear();});
after(()=>{FakeDatabase.prototype.transaction=originalTransaction;dom.window.close();});
const config={seed:20261025,years:1,scenario:'balanced',mode:'practice'} as const;
async function mounted(scope:string){
  const hook=renderHook(()=>useEnterprise(scope));
  await waitFor(()=>assert.ok(hook.result.current.view),{timeout:10000});
  await act(async()=>{await hook.result.current.waitForSave();});return hook;
}
test('an injected quota failure rejects required persistence, retains exportable progress, and retry saves without repeating the business command',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='quota:'+randomUUID(),{result}=await mounted(scope),id=result.current.currentSave!.id;
  failWrites=true;
  await act(async()=>{await result.current.command({kind:'loan',amount:500000});await assert.rejects(result.current.waitForSave(),/injected quota/);});
  assert.equal(result.current.view!.cash,85500000);assert.match(result.current.storageError,/尚未写入/);
  const exported=await result.current.send({type:'record'});assert.equal(restoreEnterprise(exported.record).cash,85500000);
  await assert.rejects(result.current.create({...config,seed:1}),/尚未保存/);assert.equal(result.current.currentSave!.id,id);
  assert.equal(restoreEnterprise((await listEnterpriseSaves(scope))[0]!.record).cash,85000000);
  failWrites=false;await act(async()=>{await result.current.saveNow();await result.current.waitForSave();});
  const stored=(await listEnterpriseSaves(scope))[0]!;assert.equal(stored.id,id);assert.equal(stored.record.commands.filter(c=>c.kind==='loan').length,1);assert.equal(restoreEnterprise(stored.record).cash,85500000);assert.equal(result.current.storageError,'');
});
test('a worker crash retains the last confirmed record and recovery restores it without a new save or duplicate command',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='worker:'+randomUUID(),{result}=await mounted(scope);
  await act(async()=>{await result.current.command({kind:'loan',amount:500000});await result.current.waitForSave();});
  const before=result.current.currentSave!;
  await act(async()=>{workers.at(-1)!.crash();});assert.equal(result.current.workerFailed,true);
  assert.deepEqual((await result.current.send({type:'record'})).record,before.record);
  await act(async()=>{await result.current.recover();});
  await waitFor(()=>{assert.equal(result.current.workerFailed,false);assert.equal(result.current.busy,false);assert.equal(result.current.error,'');},{timeout:10000});
  assert.equal(result.current.currentSave!.id,before.id);assert.deepEqual(result.current.currentSave!.record,before.record);
  assert.equal((await listEnterpriseSaves(scope))[0]!.revision,before.revision);
});
test('overlapping activations cannot mix a new record identity with another port',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='activate:'+randomUUID(),{result}=await mounted(scope);
  let outcomes:PromiseSettledResult<string>[]=[];
  await act(async()=>{outcomes=await Promise.allSettled([result.current.create({...config,seed:11}),result.current.create({...config,seed:22})]);await result.current.waitForSave();});
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
  assert.equal(result.current.view!.config.seed,11);assert.equal(result.current.currentSave!.id,(outcomes[0] as PromiseFulfilledResult<string>).value);
  assert.equal((await listEnterpriseSaves(scope)).length,2);
});
test('an initial read failure does not silently create a replacement port or change the remembered run',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='read:'+randomUUID(),id=randomUUID();
  const record=enterpriseRecord(executeEnterprise(createEnterprise(config),{kind:'loan',amount:500000}));
  const existing:EnterpriseSave={id,scope,title:'已有场次',savedAt:new Date().toISOString(),schema:'port-enterprise/2.0',record,checkpoints:[]};await saveEnterprise(existing);
  dom.window.sessionStorage.setItem('edu-enterprise-active-run:'+scope,id);failReads=true;
  const {result}=renderHook(()=>useEnterprise(scope));
  await waitFor(()=>assert.ok(result.current.view||result.current.listError),{timeout:10000});
  assert.equal(result.current.view,undefined,'a failed read must not look like lost progress or a new game');
  failReads=false;await act(async()=>{await result.current.retryStorage();await result.current.waitForSave();});
  assert.equal(result.current.currentSave!.id,id);assert.equal(result.current.view!.cash,85500000);assert.equal((await listEnterpriseSaves(scope)).length,1);
});
test('a committed save is still successful when refreshing the list fails, and list retry keeps the active port',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='list:'+randomUUID(),{result}=await mounted(scope),id=result.current.currentSave!.id;
  failReads=true;
  await act(async()=>{await result.current.command({kind:'loan',amount:500000});await result.current.waitForSave();});
  assert.equal(result.current.storageError,'');assert.match(result.current.listError,/列表/);
  failReads=false;await act(async()=>{await result.current.retryStorage();});
  assert.equal(result.current.currentSave!.id,id);assert.equal(result.current.view!.cash,85500000);assert.equal(result.current.listError,'');
  assert.equal(restoreEnterprise((await listEnterpriseSaves(scope))[0]!.record).cash,85500000);
});
test('a failed pending-package write retains the retry id and persists that exact package after recovery',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='pending:'+randomUUID(),{result}=await mounted(scope),oldId=result.current.currentSave!.id;
  assert.throws(()=>result.current.bindAttempt('wrong-practice-attempt','task-a',oldId),/个人练习/);
  let id='';await act(async()=>{id=await result.current.create({...config,mode:'exam'});result.current.bindAttempt('attempt-a','task-a',id);await result.current.waitForSave();});
  assert.throws(()=>result.current.bindAttempt('wrong-attempt','task-a',oldId),/场次已改变/);
  await act(async()=>{await result.current.command({kind:'advance',hours:24});await result.current.command({kind:'seal'});await result.current.waitForSave();});
  let pkg:NonNullable<EnterpriseResponse['package']>;await act(async()=>{pkg=(await result.current.send({type:'package'})).package!;});
  failWrites=true;const requestId=randomUUID();
  await act(async()=>{await assert.rejects(result.current.savePending(requestId,pkg!,id),/quota/);});
  assert.equal(result.current.currentSave!.pending!.requestId,requestId);assert.equal((await listEnterpriseSaves(scope)).find(s=>s.id===id)!.pending,undefined);
  failWrites=false;await act(async()=>{await result.current.saveNow();await result.current.waitForSave();});
  const saved=(await listEnterpriseSaves(scope)).find(s=>s.id===id)!;assert.equal(saved.pending!.requestId,requestId);assert.deepEqual(saved.pending!.package,pkg!);assert.equal(saved.attemptId,'attempt-a');
});
test('a missed cross-window notification still cannot overwrite a newer port, and recovery keeps the unsaved branch',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='missed-notice:'+randomUUID(),{result}=await mounted(scope),original=result.current.currentSave!;
  const changed=executeEnterprise(createEnterprise(original.record.config),{kind:'management-plan',patch:{goal:'green'}});
  const newer=await saveEnterprise({...original,title:'另一窗口',record:enterpriseRecord(changed)});
  await act(async()=>{await result.current.command({kind:'loan',amount:500000});await assert.rejects(result.current.waitForSave(),/其他窗口/);});
  assert.equal(result.current.conflict,true);assert.deepEqual((await listEnterpriseSaves(scope))[0]!.record,newer.record);
  await assert.rejects(result.current.saveNow(),/其他窗口/);
  await act(async()=>{await result.current.keepConflictCopy();await result.current.waitForSave();});
  assert.equal(result.current.conflict,false);assert.notEqual(result.current.currentSave!.id,original.id);assert.equal(result.current.view!.cash,85500000);
  const entries=await listEnterpriseSaves(scope);assert.equal(entries.length,2);assert.deepEqual(entries.find(s=>s.id===original.id)!.record,newer.record);
});
test('React strict effect replay does not create two initial ports or leave a stale worker active',{timeout:30000},async()=>{
  globalThis.indexedDB=new IDBFactory();const scope='strict:'+randomUUID();
  const {result}=renderHook(()=>useEnterprise(scope),{wrapper:({children})=>React.createElement(React.StrictMode,null,children)});
  await waitFor(()=>assert.ok(result.current.view),{timeout:10000});await act(async()=>{await result.current.waitForSave();});
  assert.equal((await listEnterpriseSaves(scope)).length,1);assert.equal(result.current.currentSave!.record.commands.length,0);assert.equal(result.current.busy,false);
});
