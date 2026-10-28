import test from 'node:test';
import assert from 'node:assert/strict';
import {EnterpriseChannel,type EnterpriseResponse,type EnterpriseRequest} from '../src/features/port-simulation/enterprise/enterprise-channel';
function harness(timeout=1000,maximum=900000){
  const posted:(EnterpriseRequest&{id:number})[]=[],states:{message:EnterpriseResponse;save?:string}[]=[],progress:number[]=[],busy:boolean[]=[],failures:string[]=[];
  let terminated=0,postError=false,now=0;
  const channel=new EnterpriseChannel<string>({postMessage:m=>{if(postError)throw Error('clone failed');posted.push(m);},terminate:()=>{terminated++;}},
    {state:(message,save)=>states.push({message,save}),busy:b=>busy.push(b),progress:m=>progress.push(m.hour!),failure:e=>failures.push(e.message)},timeout,()=>now,maximum);
  return {channel,posted,states,progress,busy,failures,terminated:()=>terminated,throwOnPost:(v:boolean)=>{postError=v;},time:(value:number)=>{now=value;}};
}
test('rapid repeated operations are rejected synchronously and cannot duplicate purchases or advance time twice',async()=>{
  const h=harness(),first=h.channel.request({type:'command',command:{kind:'loan',amount:500000}},'run-a');
  await assert.rejects(h.channel.request({type:'create'},'run-b'),/上一项操作/);
  assert.equal(h.posted.length,1);assert.equal(h.channel.busy,true);
  h.channel.receive({id:1,type:'state'});await first;
  assert.deepEqual(h.states.map(s=>s.save),['run-a']);assert.deepEqual(h.busy,[true,false]);h.channel.close();
});
test('a normal mouse double click cannot buy twice even if the worker completes before the second click',async()=>{
  const h=harness(),command={kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'} as const;
  const first=h.channel.request({type:'command',command});h.channel.receive({id:1,type:'state'});await first;
  h.time(200);await assert.rejects(h.channel.request({type:'command',command}),/重复点击/);assert.equal(h.posted.length,1);
  h.time(700);const deliberate=h.channel.request({type:'command',command});h.channel.receive({id:2,type:'state'});await deliberate;assert.equal(h.posted.length,2);h.channel.close();
});
test('stale or out-of-order messages cannot clear the current operation or bind its result to another save',async()=>{
  const h=harness(),first=h.channel.request({type:'create'},'run-a');
  h.channel.receive({id:999,type:'progress',hour:500});h.channel.receive({id:999,type:'state'});
  assert.equal(h.channel.busy,true);assert.equal(h.states.length,0);assert.equal(h.progress.length,0);
  h.channel.receive({id:1,type:'state'});await first;
  const second=h.channel.request({type:'restore'},'run-b');h.channel.receive({id:1,type:'state'});h.channel.receive({id:2,type:'progress',hour:168});
  assert.equal(h.channel.busy,true);h.channel.receive({id:2,type:'state'});await second;
  assert.deepEqual(h.states.map(s=>s.save),['run-a','run-b']);assert.deepEqual(h.progress,[168]);h.channel.close();
});
test('a rejected operation and a synchronous post failure both release admission without changing confirmed state',async()=>{
  const h=harness(),first=h.channel.request({type:'restore'},'bad-record');
  h.channel.receive({id:1,type:'error',error:'版本不一致'});await assert.rejects(first,/版本/);assert.equal(h.states.length,0);
  h.throwOnPost(true);await assert.rejects(h.channel.request({type:'command'}),/clone failed/);assert.equal(h.channel.busy,false);
  h.throwOnPost(false);const valid=h.channel.request({type:'record'});h.channel.receive({id:3,type:'record'});await valid;h.channel.close();
});
test('worker failure rejects the outstanding operation, ignores late output, and never accepts work into a dead worker',async()=>{
  const h=harness(),first=h.channel.request({type:'command'},'confirmed-port');
  h.channel.fail(Error('worker crashed'));await assert.rejects(first,/crashed/);
  h.channel.receive({id:1,type:'state'});assert.equal(h.states.length,0);assert.equal(h.channel.busy,false);
  await assert.rejects(h.channel.request({type:'record'}),/恢复本机计算/);
  assert.equal(h.terminated(),1);assert.deepEqual(h.failures,['worker crashed']);h.channel.close();
});
test('an unresponsive worker times out and disposal cannot leave a promise pending',async()=>{
  const h=harness(15),first=h.channel.request({type:'restore'});
  await assert.rejects(first,/超时/);assert.equal(h.channel.busy,false);assert.equal(h.terminated(),1);
  const other=harness(),pending=other.channel.request({type:'command'});other.channel.close();await assert.rejects(pending,/关闭/);
});
test('real progress extends the idle limit while an absolute limit still bounds the calculation',async()=>{
  const h=harness(120,1500),pending=h.channel.request({type:'restore'});
  for(const hour of [24,48,72]){await new Promise(resolve=>setTimeout(resolve,70));h.channel.receive({id:1,type:'progress',hour});}
  h.channel.receive({id:1,type:'state'});await pending;assert.equal(h.terminated(),0);h.channel.close();
  const capped=harness(150,350),long=capped.channel.request({type:'restore'});
  const timer=setInterval(()=>capped.channel.receive({id:1,type:'progress',hour:24}),50);
  try{await assert.rejects(long,/最长时限/);assert.equal(capped.terminated(),1);}finally{clearInterval(timer);capped.channel.close();}
});
