import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import type {EnterpriseRequest,EnterpriseResponse} from '../src/features/port-simulation/enterprise/enterprise-channel';
test('the real worker preserves its live port after invalid seeks, failed imports, replay commands and unknown messages',{timeout:30000},async()=>{
  const bootstrap=`import {parentPort,workerData} from 'node:worker_threads';const {register}=await import(${JSON.stringify(import.meta.resolve('tsx/esm/api'))});register();globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);await import(workerData);parentPort.on('message',data=>globalThis.onmessage({data}));parentPort.postMessage({ready:true});`;
  const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(bootstrap)),{workerData:new URL('../src/features/port-simulation/enterprise/enterprise.worker.ts',import.meta.url).href,execArgv:[]});
  let id=0;
  const request=(message:EnterpriseRequest)=>new Promise<EnterpriseResponse>((resolve,reject)=>{
    const seq=++id,timer=setTimeout(()=>{worker.off('message',receive);reject(Error('worker did not respond'));},5000);
    const receive=(m:EnterpriseResponse)=>{if(m.id!==seq||m.type==='progress')return;clearTimeout(timer);worker.off('message',receive);resolve(m);};
    worker.on('message',receive);worker.postMessage({...message,id:seq});
  });
  try{
    await new Promise<void>((resolve,reject)=>{worker.on('message',m=>{if(m.ready)resolve();});worker.once('error',reject);});
    const created=await request({type:'create',config:{seed:20261025,years:1,scenario:'balanced',mode:'practice'}});assert.equal(created.type,'state');
    const loan=await request({type:'command',command:{kind:'loan',amount:500000}});assert.equal(loan.view!.cash,85500000);
    const badSeek=await request({type:'seek',position:NaN});assert.equal(badSeek.type,'error');assert.match(badSeek.error!,/位置/);
    const continued=await request({type:'command',command:{kind:'advance',hours:1}});assert.equal(continued.type,'state');assert.equal(continued.view!.hour,1);assert.equal(continued.replaying,false);
    const badImport=await request({type:'restore',record:{schema:'bad'} as never});assert.equal(badImport.type,'error');
    const before=await request({type:'record'});assert.equal(before.record!.commands.length,2);assert.equal(before.record!.config.seed,20261025);
    for(const position of [-1,Infinity,.5,1000])assert.equal((await request({type:'seek',position})).type,'error');
    const preview=await request({type:'seek',position:0});assert.equal(preview.replaying,true);assert.equal(preview.view!.cash,85000000);
    assert.match((await request({type:'command',command:{kind:'loan',amount:1000000}})).error!,/只读/);
    assert.equal((await request({type:'unknown'})).type,'error');
    const live=await request({type:'live'});assert.equal(live.view!.hour,1);assert.equal(live.view!.cash,continued.view!.cash);
    assert.deepEqual((await request({type:'record'})).record,before.record);
    const progressed=await request({type:'command',command:{kind:'advance',hours:168}}),progress:number[]=[];
    const observe=(m:EnterpriseResponse)=>{if(m.type==='progress')progress.push(m.hour!);};worker.on('message',observe);
    const end=await request({type:'seek',position:progressed.record!.commands.length});
    assert.equal(end.replaying,true);assert.equal(end.view!.hour,169);assert.deepEqual(progress,[168],'long read-only reconstruction keeps the channel alive with actual progress');
    assert.deepEqual((await request({type:'record'})).record,progressed.record,'a progress message cannot replace the confirmed port');
    progress.length=0;const restored=await request({type:'restore',record:progressed.record});assert.deepEqual(progress,[168]);assert.equal(restored.replaying,false);worker.off('message',observe);
  }finally{await worker.terminate();}
});
