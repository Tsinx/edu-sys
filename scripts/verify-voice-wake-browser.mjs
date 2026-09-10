// Uses real local KWS and AudioWorklet. Assistant actions are always intercepted.
// WAV fixtures: EDU_VOICE_FIXTURES (default .runtime/kws); --live-asr enables one real ASR request.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const origin = process.env.EDU_VOICE_QA_ORIGIN ?? 'http://127.0.0.1:5173';
const fixtures = resolve(process.env.EDU_VOICE_FIXTURES ?? '.runtime/kws');
const output = resolve('output/voice-wake-review');
await mkdir(output, { recursive: true });
const audio = Object.fromEntries(await Promise.all(['wake','finish','cancel','negative','named','empty','thanks','thanksCommand','thanksNegative','wakeCommonNegative','wakeAssistantCommand','wakeLittleAssistantCommand'].map(async name => [name, [...await readFile(resolve(fixtures, name+'.wav'))]])));
audio.command = [...await readFile(resolve(fixtures, '../services/voice-network-test.wav'))];
const browser = await chromium.launch({ headless:true, channel:'msedge', args:['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport:{width:1280,height:1000} });
page.setDefaultTimeout(20000);
const errors=[], commands=[], requests=[], checks=[];
let asrMode=process.argv.includes('--live-asr')?'live':'mock', asrCount=0, releaseAsr;
let replyMode='ok', releaseReply;
page.on('pageerror', e=>errors.push(e.message));
page.on('request', r=>requests.push(r.url()));
await page.route(`${origin}/voice-qa`, route=>route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@vite/client"></script></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${resolve('apps/teacher-web/test/browser/voice-wake-harness.tsx').replaceAll('\\','/')}"></script></body></html>`}));
await page.route('**/api/teacher/asr',async route=>{
  asrCount++;
  const input=route.request().postDataJSON();
  assert.ok(input.durationMs>100&&input.durationMs<=60000);
  assert.equal(Buffer.from(input.audioBase64,'base64').readUInt32LE(24),16000);
  await writeFile(resolve(output,`submitted-${asrCount}.wav`),Buffer.from(input.audioBase64,'base64'));
  if(asrMode==='live'){await route.continue();return;}
  if(asrMode==='hold')await new Promise(done=>{releaseAsr=done;});
  await route.fulfill({json:{text:asrMode==='empty'?'':'助教你好，请进入第二讲。'}}).catch(()=>{});
});
await page.route('**/api/class-sessions/test/assistant/turns',async route=>{
  commands.push(route.request().postDataJSON());
  if(replyMode==='hold')await new Promise(done=>{releaseReply=done;});
  await route.fulfill({status:replyMode==='fail'?502:200,json:{ok:replyMode!=='fail'}});
});
await page.addInitScript(()=>{
  const NativeWorker=window.Worker;window.kwsHits=[];window.kwsWorkerCount=0;window.kwsWorkersAlive=0;window.kwsFramesSent=0;
  window.Worker=class extends NativeWorker { constructor(...args){super(...args);window.kwsWorkerCount++;window.kwsWorkersAlive++;this.qaAlive=true;this.addEventListener('message',e=>{if(e.data.keywords?.length)window.kwsHits.push(...e.data.keywords);});}
    postMessage(...args){if(args[0]?.samples)window.kwsFramesSent++;return super.postMessage(...args);}
    terminate(){if(this.qaAlive){this.qaAlive=false;window.kwsWorkersAlive--;}super.terminate();}
  };
  const audio = new AudioContext({sampleRate:16000});
  const records=[];let permission='allow',release;
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
    if(permission==='deny')throw new DOMException('denied','NotAllowedError');
    const destination=audio.createMediaStreamDestination();records.push(destination);
    if(permission==='hold')await new Promise(done=>{release=done;});
    return destination.stream;
  }});
  window.microphoneQA={
    count:()=>records.length,
    permission:value=>{permission=value;},release:()=>release?.(),
    allStopped:()=>records.every(r=>r.stream.getTracks().every(t=>t.readyState==='ended')),
    end:()=>{const track=records.at(-1).stream.getAudioTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));},
    async play(bytes){
      await audio.resume();
      const dest=[...records].reverse().find(r=>r.stream.getTracks().some(t=>t.readyState==='live'));
      if(!dest)throw new Error('No live capture');
      const source=audio.createBufferSource();source.buffer=await audio.decodeAudioData(Uint8Array.from(bytes).buffer);
      source.connect(dest);await new Promise(done=>{source.onended=done;source.start();});
    }
  };
});
const wait=()=>page.getByText('等待唤醒',{exact:true}).waitFor();
const stopped=()=>page.waitForFunction(()=>window.microphoneQA.allStopped());
const open=async()=>{await page.getByRole('button',{name:'开启语音唤醒',exact:true}).click();await wait();};
const close=async()=>{await page.getByRole('button',{name:'关闭语音唤醒',exact:true}).click();await stopped();};
const play=async name=>{await page.evaluate(bytes=>window.microphoneQA.play(bytes),audio[name]);await page.waitForTimeout(650);};
async function eventually(check){for(let i=0;i<200;i++){if(check())return;await page.waitForTimeout(100);}assert.ok(check());}
const setHidden=hidden=>page.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},hidden);
const captureCounts=()=>page.evaluate(()=>({workers:window.kwsWorkerCount,microphones:window.microphoneQA.count()}));
try{
  await page.goto(`${origin}/voice-qa`);await page.getByRole('button',{name:'检测输入',exact:true}).click();await open();
  const initialCapture=await captureCounts();
  const modelRequests=()=>requests.filter(url=>url.includes('/vendor/local-kws/')||url.includes('/audio/classroom-keywords.js')).length;
  const initialModelRequests=modelRequests();
  for(let index=0;index<3;index++){
    await setHidden(true);await wait();await page.waitForTimeout(index===0?5500:200);
    assert.equal(await page.evaluate(()=>window.microphoneQA.allStopped()),false);
    await setHidden(false);await wait();
    assert.deepEqual(await captureCounts(),initialCapture);assert.equal(modelRequests(),initialModelRequests);
  }
  await play('wake');await page.getByText('正在接收指令',{exact:true}).waitFor();
  await setHidden(true);await page.getByText('正在接收指令',{exact:true}).waitFor();
  await play('cancel');await wait();await setHidden(false);await wait();
  assert.deepEqual(await captureCounts(),initialCapture);assert.equal(modelRequests(),initialModelRequests);assert.equal(asrCount,0);
  checks.push('window visibility changes reuse the same model and microphone; local wake/cancel still works in background without uploads');
  if(!process.argv.includes('--wake-phrases-only')){
  await play('negative');await play('finish');assert.equal(asrCount,0);assert.equal(commands.length,0);await wait();
  assert.ok(requests.filter(url=>!url.startsWith(origin)).length===0);checks.push('real local model: ordinary speech and unarmed end word produce zero uploads');
  await play('wake');await page.getByText('正在接收指令',{exact:true}).waitFor();
  assert.equal(asrCount,0);await page.screenshot({path:resolve(output,'desktop.png')});
  await play('cancel');await wait();assert.equal(asrCount,0);checks.push('real local wake and cancellation, no ASR');
  await play('command');await eventually(()=>commands.length===1);assert.match(commands[0].text,/第二讲/);assert.equal(asrCount,1);
  checks.push(`${asrMode} ASR: real local KWS + AudioWorklet -> one complete recording -> one command`);
  asrMode='mock';await wait();
  assert.equal((await captureCounts()).workers,initialCapture.workers);assert.equal(modelRequests(),initialModelRequests);
  checks.push('first completed recording reuses the existing worker and model files');
  await play('named');await eventually(()=>commands.length===2);await wait();checks.push('named keyword aliases detected by actual acoustic model');
  asrMode='empty';await play('command');await wait();assert.equal(commands.length,2);checks.push('empty ASR cancels this command and resumes local wake detection');
  asrMode='hold';await play('command');await eventually(()=>!!releaseAsr);await close();releaseAsr();await page.waitForTimeout(300);assert.equal(commands.length,2);checks.push('closing during ASR suppresses late command');
  asrMode='mock';await open();await page.evaluate(()=>window.voiceHarness.setBusy(true));await stopped();
  await page.getByText('助手回答中，收音暂停',{exact:true}).waitFor();await page.evaluate(()=>window.voiceHarness.setBusy(false));await wait();checks.push('assistant speech pauses microphone and resumes after echo delay');
  await page.evaluate(()=>window.voiceHarness.setDisabled(true));await stopped();await page.getByText('监听已关闭',{exact:true}).waitFor();await page.evaluate(()=>window.voiceHarness.setDisabled(false));checks.push('class end stops listening');
  await page.evaluate(()=>window.microphoneQA.permission('deny'));await page.getByRole('button',{name:'开启语音唤醒',exact:true}).click();await page.getByText(/未获得麦克风权限/).waitFor();await stopped();checks.push('permission denial stays closed');
  await page.evaluate(()=>window.microphoneQA.permission('allow'));await open();await page.evaluate(()=>window.microphoneQA.end());await page.getByText(/麦克风已断开/).waitFor();await stopped();checks.push('device removal stops listening');
  await open();await page.evaluate(()=>window.voiceHarness.setSession('two'));await stopped();await page.getByRole('button',{name:'检测输入',exact:true}).click();await page.getByText('监听已关闭',{exact:true}).waitFor();checks.push('session switch releases capture');
  await open();await page.evaluate(()=>window.voiceHarness.setMounted(false));await stopped();checks.push('unmount terminates microphone and worker');await page.evaluate(()=>window.voiceHarness.setMounted(true));await page.getByRole('button',{name:'检测输入',exact:true}).click();
  await open();const previousAsr=asrCount;
  await play('thanks');await wait();assert.equal(asrCount,previousAsr);checks.push('very-thankful end phrase cannot submit before wake');
  await play('wake');await page.getByText('正在接收指令',{exact:true}).waitFor();
  await play('thanksNegative');assert.equal(asrCount,previousAsr);await page.getByText('正在接收指令',{exact:true}).waitFor();
  await play('cancel');await wait();checks.push('near-miss phrases cannot stitch across a pause into an end word');
  asrMode=process.argv.includes('--live-asr')?'live':'mock';
  await play('thanksCommand');await eventually(()=>commands.length===3);assert.equal(asrCount,previousAsr+1);
  if(asrMode==='live'){assert.match(commands[2].text,/港口/);assert.doesNotMatch(commands[2].text,/非常感谢/);}
  checks.push('new very-thankful end phrase submits once and is removed from the command');await wait();await close();asrMode='mock';
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,'narrow.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('390px layout has no horizontal overflow');
  await page.getByRole('button',{name:'按键输入',exact:true}).click();
  const beforeManual=asrCount, beforeCommands=commands.length;
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('button',{name:'结束并发送',exact:true}).waitFor();
  await play('negative');assert.equal(asrCount,beforeManual);
  await page.screenshot({path:resolve(output,'manual-narrow.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'结束并发送',exact:true}).click();
  await eventually(()=>commands.length===beforeCommands+1);await stopped();
  assert.equal(asrCount,beforeManual+1);assert.equal(commands.at(-1).source,'voice_asr');
  assert.equal(commands.at(-1).text,'助教你好，请进入第二讲。');
  checks.push('two clicks record then submit once through shared ASR; manual text preserves quoted wake words');
  await page.getByRole('button',{name:'文字输入',exact:true}).click();
  await page.getByRole('textbox',{name:'文字指令'}).fill('请进入第二讲。');
  await page.getByRole('button',{name:'发送文字指令',exact:true}).click();
  await eventually(()=>commands.length===beforeCommands+2);
  assert.equal(commands.at(-1).source,'text');assert.equal(asrCount,beforeManual+1);
  checks.push('typed input reaches the same command handler without ASR');
  await page.getByRole('button',{name:'按键输入',exact:true}).click();
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('button',{name:'结束并发送',exact:true}).waitFor();
  await page.getByRole('button',{name:'取消本轮',exact:true}).click();await stopped();
  assert.equal(asrCount,beforeManual+1);checks.push('manual cancellation releases microphone without upload');
  await page.evaluate(()=>window.microphoneQA.permission('hold'));
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.waitForFunction(()=>!window.microphoneQA.allStopped());
  await page.getByRole('button',{name:'文字输入',exact:true}).click();
  await page.evaluate(()=>{window.microphoneQA.release();window.microphoneQA.permission('allow');});await stopped();
  checks.push('mode switch during pending microphone permission releases late stream');
  await page.getByRole('button',{name:'按键输入',exact:true}).click();
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('button',{name:'结束并发送',exact:true}).waitFor();
  await page.evaluate(()=>window.voiceHarness.setDisabled(true));await stopped();
  await page.evaluate(()=>window.voiceHarness.setDisabled(false));
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.microphoneQA.allStopped()),true);
  checks.push('class end cancels manual recording; reopening does not restart it');
  asrMode='hold';releaseAsr=undefined;
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('button',{name:'结束并发送',exact:true}).waitFor();
  await play('negative');await page.getByRole('button',{name:'结束并发送',exact:true}).click();
  await eventually(()=>!!releaseAsr);
  await page.getByRole('button',{name:'文字输入',exact:true}).click();releaseAsr();
  await page.waitForTimeout(300);assert.equal(commands.length,beforeCommands+2);await stopped();
  checks.push('switching modes during manual ASR suppresses late submission');
  asrMode='mock';
  await page.getByRole('button',{name:'检测输入',exact:true}).click();await open();
  const residentWorkers=(await captureCounts()).workers,residentRequests=modelRequests();
  for(let round=0;round<2;round++){
    replyMode='hold';releaseReply=undefined;const before=commands.length;
    await play('command');await eventually(()=>!!releaseReply);
    await page.evaluate(()=>window.voiceHarness.setBusy(true));await stopped();
    assert.equal(await page.getByRole('button',{name:'关闭语音唤醒',exact:true}).getAttribute('aria-pressed'),'true');
    if(round===0){
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.getByText('助手回答中，收音暂停',{exact:true}).waitFor();
    }
    const pausedFrames=await page.evaluate(()=>window.kwsFramesSent);
    await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.kwsFramesSent),pausedFrames);
    assert.equal(await page.evaluate(()=>window.kwsWorkersAlive),1);
    releaseReply();await page.waitForTimeout(200);await stopped();
    await page.evaluate(()=>window.voiceHarness.setBusy(false));
    if(round===0){
      await wait();const backgroundCapture=await captureCounts();
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
      await wait();assert.deepEqual(await captureCounts(),backgroundCapture);
    }
    await wait();assert.equal(commands.length,before+1);
    assert.equal((await captureCounts()).workers,residentWorkers);assert.equal(modelRequests(),residentRequests);
  }
  checks.push('two replies retain exactly one worker, load no model files again, send zero audio frames while paused, and resume in background');
  replyMode='fail';const beforeFailedReply=commands.length;
  await play('command');await eventually(()=>commands.length===beforeFailedReply+1);
  await page.getByText('测试：回答流中断',{exact:true}).waitFor();await wait();
  assert.equal(await page.getByRole('button',{name:'关闭语音唤醒',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal((await captureCounts()).workers,residentWorkers);assert.equal(modelRequests(),residentRequests);
  checks.push('reply failure shows the error and resumes listening without retrying the submitted command');
  replyMode='hold';releaseReply=undefined;
  await play('command');await eventually(()=>!!releaseReply);await close();releaseReply();
  await page.waitForTimeout(1600);await stopped();await page.getByText('监听已关闭',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.kwsWorkersAlive),0);
  checks.push('explicit close during a reply is not undone by late completion');
  await open();
  }
  asrMode=process.argv.includes('--live-asr')?'live':'mock';replyMode='ok';
  const beforeWakeVariants=asrCount;
  await play('wakeCommonNegative');await wait();assert.equal(asrCount,beforeWakeVariants);
  checks.push('nearby greetings and isolated assistant mentions do not wake the local model');
  for(const sample of ['wakeAssistantCommand','wakeLittleAssistantCommand']){
    const previous=commands.length;
    await play(sample);await eventually(()=>commands.length===previous+1);await wait();
    if(asrMode==='live'){
      assert.match(commands.at(-1).text,/港口/);
      assert.doesNotMatch(commands.at(-1).text,/你好|助手|非常感谢/);
    }
  }
  assert.equal(asrCount,beforeWakeVariants+2);await close();
  checks.push(`${asrMode} ASR: both new wake phrases submit once, strip control phrases and resume listening`);
  assert.deepEqual(errors,[]);await writeFile(resolve(output,'browser-report.json'),JSON.stringify({checks,commands,asrCount,errors},null,2));console.log(JSON.stringify({checks,commands,asrCount,errors},null,2));
}catch(error){console.error(JSON.stringify({checks,commands,asrCount,errors,state:await page.locator('body').innerText(),hits:await page.evaluate(()=>window.kwsHits)},null,2));throw error;
}finally{releaseAsr?.();releaseReply?.();await browser.close();}
