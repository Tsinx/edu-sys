// Real original/personal/epoch-10 KWS assets and AudioWorklet; ASR and classroom actions are mocked.
// Requires the personal-training browser WAV fixtures and a running teacher-web Vite server.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const origin = process.env.EDU_VOICE_QA_ORIGIN ?? 'http://127.0.0.1:5173';
const output = resolve('output/kws-model-selection-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless:true, channel:'msedge', args:['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport:{width:1280,height:1000} });
page.setDefaultTimeout(20000);
const errors=[], commands=[], requests=[], checks=[];
const epoch10='xiaomai-20260909-epoch10';
const servedHashes={};
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
  await route.fulfill({json:{text:'助教你好，请进入第二讲。'}});
});
await page.route('**/api/class-sessions/test/assistant/turns',async route=>{
  commands.push(route.request().postDataJSON());
  await route.fulfill({json:{ok:true}});
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
async function eventually(check){for(let i=0;i<200;i++){if(check())return;await page.waitForTimeout(100);}assert.ok(check());}
try {
  await page.goto(`${origin}/voice-qa`);
  await page.getByRole('button',{name:'检测输入',exact:true}).click();
  const select=page.getByRole('combobox',{name:'唤醒模型'});
  assert.deepEqual(await select.locator('option').evaluateAll(options=>options.map(option=>option.value)),['original','personal-20260909',epoch10]);
  assert.equal(await select.inputValue(),'original');
  await open(); assert.equal(await select.isDisabled(),true); await close();
  assert.ok(requests.some(url=>url.endsWith('/vendor/local-kws/encoder.onnx')));
  checks.push('original model remains default and loads its own assets');

  for(const model of ['personal-20260909',epoch10]) {
  const personalRoot=`/vendor/local-kws/${model}/`;
  const requestStart=requests.length;
  const commandStart=commands.length, asrStart=asrCount;
  await select.selectOption(model);
  await open();
  for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt']) {
    assert.ok(requests.slice(requestStart).some(url=>url.endsWith(personalRoot+file)),`missing ${model} request ${file}`);
  }
  if(model===epoch10) {
    assert.equal(requests.slice(requestStart).some(url=>/\/vendor\/local-kws\/(encoder.onnx|decoder.onnx|joiner.onnx|tokens.txt)$/.test(url)),false,'epoch 10 must not silently use original weights for thanks/cancel');
    const manifest=JSON.parse(await readFile(resolve('scripts/xiaomai-kws-assets.json'),'utf8'));
    for(const [file,expected] of Object.entries(manifest.files)) {
      const response=await page.request.get(origin+personalRoot+file);assert.ok(response.ok());
      servedHashes[file]=createHash('sha256').update(await response.body()).digest('hex');
      assert.equal(servedHashes[file],expected,`served epoch-10 checksum: ${file}`);
    }
  }
  const residentWorkers=await page.evaluate(()=>window.kwsWorkerCount);
  const residentRequests=requests.filter(url=>url.includes('/vendor/local-kws/')).length;
  const wake=[...await readFile(resolve('output/kws-personal-training-20260909/browser-fixtures/wake_06_clean.wav'))];
  const finish=[...await readFile(resolve('output/kws-personal-training-20260909/browser-fixtures/end_16_clean.wav'))];
  await page.evaluate(bytes=>window.microphoneQA.play(bytes),wake);
  await page.getByText('正在接收指令',{exact:true}).waitFor();
  assert.equal(await select.isDisabled(),true);
  await page.screenshot({path:resolve(output,model+'-desktop.png')});
  await page.evaluate(bytes=>window.microphoneQA.play(bytes),finish);
  await eventually(()=>commands.length===commandStart+1); await wait();
  assert.equal(asrCount,asrStart+1);
  assert.equal(await page.evaluate(()=>window.kwsWorkerCount),residentWorkers);
  assert.equal(requests.filter(url=>url.includes('/vendor/local-kws/')).length,residentRequests);
  assert.equal(await select.inputValue(),model);
  assert.equal(commands.at(-1).source,'voice_asr');
  await close();
  checks.push(model+': loads its assets, recognizes recorded wake/end audio, submits once and resumes with the same resident worker and no repeated model requests');

  await page.getByRole('button',{name:'按键输入',exact:true}).click();
  assert.equal(await select.count(),0);
  await page.getByRole('button',{name:'检测输入',exact:true}).click();
  assert.equal(await select.inputValue(),model);
  await page.reload();await page.getByRole('button',{name:'检测输入',exact:true}).click();
  assert.equal(await select.inputValue(),model);
  assert.equal(await page.evaluate(()=>window.microphoneQA.count()),0);
  checks.push(model+': preference survives input-mode changes and reload without automatically opening microphone');
  }

  await page.getByRole('button',{name:'进入全屏',exact:true}).click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  assert.equal(await select.inputValue(),epoch10);
  await page.getByRole('button',{name:'退出全屏',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(output,epoch10+'-narrow.png')});
  checks.push('selection remains available in fullscreen and at 390px with no horizontal overflow');

  const missingPattern=`**/vendor/local-kws/${epoch10}/encoder.onnx`;
  await page.context().route(missingPattern,route=>route.fulfill({status:404,body:'missing'}));
  await page.getByRole('button',{name:'开启语音唤醒',exact:true}).click();
  await page.getByText('本地唤醒模型初始化失败，请检查本地模型文件。',{exact:true}).waitFor();
  await stopped();assert.equal(await page.evaluate(()=>window.microphoneQA.count()),0);
  assert.equal(await select.isDisabled(),false);
  await page.context().unroute(missingPattern);
  await select.selectOption('original'); await open(); await close();
  checks.push('missing epoch-10 model reports failure before microphone access and permits returning to original');

  await page.evaluate(()=>localStorage.setItem('edu.classroom.keyword-model','invalid-model'));
  await page.reload();await page.getByRole('button',{name:'检测输入',exact:true}).click();
  assert.equal(await select.inputValue(),'original');
  checks.push('unknown saved model safely resolves to original');
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({checks,asrCount,commands,errors,servedEpoch10Hashes:servedHashes,modelRequests:requests.filter(url=>url.includes('/vendor/local-kws/'))},null,2));
  console.log(JSON.stringify({checks,asrCount,errors},null,2));
} catch(error) {
  console.error(await page.locator('body').innerText());throw error;
} finally { await browser.close(); }
