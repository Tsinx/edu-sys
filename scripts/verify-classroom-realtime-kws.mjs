import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const output=resolve('output/realtime-voice-qa');
const fixtures=Object.fromEntries(await Promise.all(['negative','wakeXiaomaiStrong','wakeXiaomai','cancel'].map(async name=>[name,[...await readFile(resolve('.runtime/kws',name+'.wav'))]])));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report={checks:[],errors:[],sent:[],received:[]};let session;
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  session=await(await context.request.post('http://127.0.0.1:4300/api/courses/course-port-management-intro/class-sessions',{data:{}})).json();
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
    const audio=new AudioContext({sampleRate:16000}),records=[];
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const destination=audio.createMediaStreamDestination();records.push(destination);return destination.stream;}});
    window.micQA={allStopped:()=>records.every(r=>r.stream.getTracks().every(t=>t.readyState==='ended')),async play(bytes){
      await audio.resume();const dest=[...records].reverse().find(r=>r.stream.getTracks().some(t=>t.readyState==='live'));if(!dest)throw new Error('No live microphone');
      const source=audio.createBufferSource();source.buffer=await audio.decodeAudioData(Uint8Array.from(bytes).buffer);source.connect(dest);await new Promise(done=>{source.onended=done;source.start();});
    }};
  });
  page.on('websocket',ws=>{if(!ws.url().includes('/assistant/realtime'))return;for(const [name,target]of[['framesent',report.sent],['framereceived',report.received]])ws.on(name,({payload})=>{try{const e=JSON.parse(payload.toString());target.push({type:e.type,turnId:e.turnId,message:e.message,text:e.text});}catch{}});});
  await page.goto(`https://localhost/classroom/${session.id}`,{waitUntil:'domcontentloaded'});
  for(let i=0;i<900&&!report.received.some(e=>e.type==='session.ready');i++)await page.waitForTimeout(100);
  assert.ok(report.received.some(e=>e.type==='session.ready'),'Realtime connection must become ready');
  await page.getByRole('button',{name:'检测输入',exact:true}).click();
  await page.getByRole('button',{name:'开启语音唤醒',exact:true}).click();
  const waiting=()=>page.getByText('等待唤醒',{exact:true}).waitFor({timeout:90000});await waiting();
  await page.evaluate(bytes=>window.micQA.play(bytes),fixtures.negative);
  assert.equal(report.sent.filter(e=>e.type==='audio.append').length,0);report.checks.push('Real local KWS: ordinary speech before wake sends zero cloud audio');
  await page.evaluate(bytes=>window.micQA.play(bytes),fixtures.wakeXiaomaiStrong);
  for(let i=0;i<1200&&!report.received.some(e=>e.type==='turn.completed');i++)await page.waitForTimeout(100);
  assert.equal(report.sent.filter(e=>e.type==='turn.begin').length,1);
  assert.equal(report.sent.filter(e=>e.type==='turn.commit').length,1);
  assert.ok(report.received.some(e=>e.type==='audio.delta'),JSON.stringify(report.received));
  await waiting();report.checks.push('Wake and explicit finish use real KWS, commit exactly once, and produce real streamed speech');
  const completed=report.received.filter(e=>e.type==='turn.completed').length;
  await page.evaluate(bytes=>window.micQA.play(bytes),fixtures.wakeXiaomai);
  await page.getByText('正在接收指令',{exact:true}).waitFor();
  await page.evaluate(bytes=>window.micQA.play(bytes),fixtures.cancel);
  await waiting();
  assert.equal(report.sent.filter(e=>e.type==='turn.commit').length,1);
  assert.equal(report.received.filter(e=>e.type==='turn.completed').length,completed);
  assert.ok(report.sent.some(e=>e.type==='turn.cancel'));report.checks.push('Local cancellation clears the uncommitted cloud turn without speech or controls');
  await page.getByRole('button',{name:'关闭语音唤醒',exact:true}).click();
  await page.waitForFunction(()=>window.micQA.allStopped());report.checks.push('Closing listening releases every microphone track');
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.message;throw error;}
finally{await writeFile(resolve(output,'kws-report.json'),JSON.stringify(report,null,2));if(session)await fetch(`http://127.0.0.1:4300/api/class-sessions/${session.id}/end`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>{if(!r.ok)throw new Error('Test classroom cleanup failed: '+r.status);});await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,failure:report.failure}));}
