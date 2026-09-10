// Real KWS, Silero VAD and AudioWorklet; ASR and classroom actions are mocked.
// Generate the speech WAVs with scripts/make-xiaomai-voice-fixtures.mjs first.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const origin = process.env.EDU_VOICE_QA_ORIGIN ?? 'http://127.0.0.1:5173';
const fixtures = resolve(process.env.EDU_VOICE_FIXTURES ?? '.runtime/kws');
const output = resolve(process.env.EDU_VOICE_QA_OUTPUT ?? 'output/xiaomai-vad-review/ui');
const models = (process.env.EDU_KWS_MODELS ?? 'original,personal-20260909,xiaomai-20260909-epoch10').split(',');
await mkdir(output, { recursive: true });
const audio = Object.fromEntries(await Promise.all(['wakeXiaomai','shortThanks','continueSpeaking','xiaomaiRepeat','thanksNegative'].map(async name => [name, [...await readFile(resolve(fixtures, name+'.wav'))]])));
const browser = await chromium.launch({ headless:true, channel:'msedge', args:['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport:{width:1280,height:1000} });
page.setDefaultTimeout(20000);
const errors=[], commands=[], requests=[], checks=[];
let asrCount=0;
page.on('pageerror', e=>errors.push(e.message));
page.on('request', r=>requests.push(r.url()));
await page.route(`${origin}/voice-qa`, route=>route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@vite/client"></script></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${resolve('apps/teacher-web/test/browser/voice-wake-harness.tsx').replaceAll('\\','/')}"></script></body></html>`}));
await page.route('**/api/teacher/asr',async route=>{
  asrCount++;
  const input=route.request().postDataJSON();
  assert.ok(input.durationMs>100&&input.durationMs<=60000);
  assert.equal(Buffer.from(input.audioBase64,'base64').readUInt32LE(24),16000);
  await writeFile(resolve(output,`submitted-${asrCount}.wav`),Buffer.from(input.audioBase64,'base64'));
  await route.fulfill({json:{text:'小麦老师，请翻到下一页，谢谢，我再补充一点，请小麦老师解释港口，谢谢。'}}).catch(()=>{});
});
await page.route('**/api/class-sessions/test/assistant/turns',async route=>{
  commands.push(route.request().postDataJSON());
  await route.fulfill({json:{ok:true}});
});
await page.addInitScript(()=>{
  const NativeWorker=window.Worker;window.kwsHits=[];window.kwsTransitions=[];window.kwsWorkerCount=0;window.kwsWorkersAlive=0;window.kwsFramesSent=0;
  window.Worker=class extends NativeWorker { constructor(...args){super(...args);window.kwsWorkerCount++;window.kwsWorkersAlive++;this.qaAlive=true;this.qaPending=false;this.addEventListener('message',e=>{if(e.data.keywords?.length)window.kwsHits.push(...e.data.keywords);if(e.data.type==='frame' && this.qaPending!==!!e.data.endingPending){this.qaPending=!!e.data.endingPending;window.kwsTransitions.push({worker:String(args[0]),at:performance.now(),pending:this.qaPending});} if(e.data.endingPending && window.resumeOnPending){const resume=window.resumeOnPending;window.resumeOnPending=null;setTimeout(resume,100);}});}
    postMessage(...args){if(args[0]?.samples)window.kwsFramesSent++;return super.postMessage(...args);}
    terminate(){if(this.qaAlive){this.qaAlive=false;window.kwsWorkersAlive--;}super.terminate();}
  };
  const audio = new AudioContext({sampleRate:16000});
  const records=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
    const destination=audio.createMediaStreamDestination();records.push(destination);
    return destination.stream;
  }});
  window.microphoneQA={
    count:()=>records.length,
    allStopped:()=>records.every(r=>r.stream.getTracks().every(t=>t.readyState==='ended')),
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
const captureCounts=()=>page.evaluate(()=>({workers:window.kwsWorkerCount,microphones:window.microphoneQA.count()}));

try {
 await page.goto(origin+'/voice-qa');
 await page.getByRole('button',{name:'检测输入',exact:true}).click();
 for(const model of models) {
  console.log('Checking UI: '+model);
  await page.getByRole('combobox',{name:'唤醒模型'}).selectOption(model); await open();
  const before=asrCount, commandBefore=commands.length, resident=await captureCounts();
  const modelRequests=()=>requests.filter(url=>url.includes('/vendor/local-kws/')).length;
  const requestsBefore=modelRequests();
  const wakeBefore=await page.evaluate(()=>window.kwsHits.filter(hit=>hit.kind==='wake').length);
  await play('wakeXiaomai'); await page.getByText('正在接收指令',{exact:true}).waitFor();
  await play('xiaomaiRepeat');
  assert.equal(await page.evaluate(()=>window.kwsHits.filter(hit=>hit.kind==='wake').length),wakeBefore+1);
  // Schedule speech inside the browser; automation transport latency must not
  // consume the one-second user response window.
  await page.evaluate(async ({thanks,continuation})=>{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('No pending ending to resume')),15000);
      window.resumeOnPending=()=>window.microphoneQA.play(continuation).then(()=>{clearTimeout(timer);resolve();},reject);
      void window.microphoneQA.play(thanks).catch(reject);
    });
  },{thanks:audio.shortThanks,continuation:audio.continueSpeaking});
  // An immediate resumption may be batched before React paints. The following
  // non-interrupted ending separately checks the visible pending status.
  await page.getByText('正在接收指令',{exact:true}).waitFor();
  await page.waitForTimeout(1300);assert.equal(asrCount,before);
  assert.deepEqual(await captureCounts(),resident);assert.equal(modelRequests(),requestsBefore);
  checks.push(model+': repeated wake names stay in one recording; speech cancels pending ending without upload or model reload');
  await page.evaluate(bytes=>{void window.microphoneQA.play(bytes);},audio.shortThanks);
  await page.getByText('正在确认是否说完',{exact:true}).waitFor();
  await page.screenshot({path:resolve(output,model+'-pending.png')});
  await eventually(()=>commands.length===commandBefore+1); await wait();
  assert.equal(asrCount,before+1);
  assert.equal(commands.at(-1).text,'请翻到下一页，谢谢，我再补充一点，请小麦老师解释港口');
  assert.equal((await captureCounts()).workers,resident.workers);assert.equal(modelRequests(),requestsBefore);
  checks.push(model+': short thanks plus VAD silence submits once, preserves continued text and reuses resident models');
  await play('wakeXiaomai');await page.getByText('正在接收指令',{exact:true}).waitFor();
  await page.evaluate(bytes=>{void window.microphoneQA.play(bytes);},audio.shortThanks);
  await page.getByText('正在确认是否说完',{exact:true}).waitFor();
  await close();await page.waitForTimeout(1500);assert.equal(asrCount,before+1);
  checks.push(model+': closing during pending ending discards recording and stops microphone');
  await open(); await play('wakeXiaomai'); await page.getByText('正在接收指令',{exact:true}).waitFor();
  await play('thanksNegative');await page.waitForTimeout(2500);
  assert.equal(asrCount,before+1);await page.getByText('正在接收指令',{exact:true}).waitFor();await close();
  checks.push(model+': thanks everyone at the end of classroom speech does not submit');
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:resolve(output,'narrow.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'report.json'),JSON.stringify({checks,commands,asrCount,errors,transitions:await page.evaluate(()=>window.kwsTransitions)},null,2));
 console.log(JSON.stringify({checks,asrCount,errors},null,2));
} catch(error) {
 await writeFile(resolve(output,'failure.json'),JSON.stringify({checks,commands,asrCount,errors,body:await page.locator('body').innerText(),hits:await page.evaluate(()=>window.kwsHits),transitions:await page.evaluate(()=>window.kwsTransitions)},null,2));
 throw error;
} finally {await browser.close();}
