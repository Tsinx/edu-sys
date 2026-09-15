import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(process.env.EDU_PLAYWRIGHT_ENTRY || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const { chromium } = require('playwright');
const output = resolve(process.env.EDU_VOICE_BENCHMARK_OUTPUT || 'output/realtime-direct-qa');
const historical = resolve('output/realtime-voice-qa');
await mkdir(output, { recursive: true });
const questions = [
  '请用一句话说明港口的主要作用。', '请用一句话解释什么是集装箱。',
  '请用一句话解释什么是腹地。', '请用一句话解释什么是比较优势。',
  '请用一句话解释什么是转运港。', '请用一句话解释什么是多式联运。',
  '请用一句话解释为什么需要统一集装箱尺寸。', '请用一句话解释为什么港口需要连接铁路。',
  '请用一句话解释什么是航运网络。', '请用一句话解释港口与城市的联系。'
];
const controls = ['下一页。', '翻到下一页，并用一句话解释这页主要内容。'];
const probe = process.argv.includes('--probe');
const realtimeOnly = process.argv.includes('--realtime-only');
const inputTexts = probe ? [questions[0], ...controls] : questions;
const fixtures = [];
async function json(path, body) {
  const response = await fetch(`http://127.0.0.1:4300${path}`, body === undefined ? {} : { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}
function wav(pcm) {
  const buffer = Buffer.alloc(44 + pcm.length); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8,4);buffer.write('WAVEfmt ',8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(16000,24);buffer.writeUInt32LE(32000,28);
  buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(pcm.length,40);pcm.copy(buffer,44);return buffer;
}
for (let i=0;i<inputTexts.length;i++) {
  const text=inputTexts[i], name=questions.includes(text)?`question-${questions.indexOf(text)+1}`:`control-${controls.indexOf(text)+1}`;
  let pcm;
  try { pcm = await readFile(resolve(output, `${name}.pcm`)).catch(() => readFile(resolve(historical, `${name}.pcm`))); }
  catch {
    const response = await fetch('http://127.0.0.1:4300/api/teacher/tts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text, lipSync:false}) });
    assert.equal(response.status,200);
    const events=(await response.text()).split('\n').filter(l=>l.startsWith('data:')).map(l=>JSON.parse(l.slice(5)));
    assert.ok(!events.some(e=>e.error),JSON.stringify(events.filter(e=>e.error)));
    const chunks=events.filter(e=>e.audioBase64);assert.ok(chunks.length);assert.equal(chunks[0].sampleRate,24000);
    const source=Buffer.concat(chunks.map(e=>Buffer.from(e.audioBase64,'base64')));
    const length=Math.floor(source.length/2*2/3);pcm=Buffer.alloc(length*2);
    for(let j=0;j<length;j++){const position=j*1.5,index=Math.floor(position),fraction=position-index;const a=source.readInt16LE(index*2),b=source.readInt16LE(Math.min(index+1,source.length/2-1)*2);pcm.writeInt16LE(Math.round(a+(b-a)*fraction),j*2);}
    await writeFile(resolve(output,`${name}.pcm`),pcm);await writeFile(resolve(output,`${name}.wav`),wav(pcm));
    console.log(`fixture ${name} ready`);
  }
  fixtures.push({name,text,pcm:pcm.toString('base64'),wav:wav(pcm).toString('base64'),durationMs:pcm.length/32});
}
await writeFile(resolve(output,probe?'probe-fixtures.json':'fixtures.json'),JSON.stringify(fixtures.map(({pcm,wav,...rest})=>rest),null,2));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const errors=[],results=[],sessions=[];
if(realtimeOnly){const baseline=JSON.parse(await readFile(resolve(historical,'benchmark-initial.json'),'utf8'));results.push(...baseline.results.filter(r=>r.path==='existing').map(r=>({...r,sourceRun:'../realtime-voice-qa/benchmark-initial.json'})));assert.equal(results.length,30);}
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://localhost/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>isSecureContext),true);
  await page.evaluate(async()=>{
    const {RealtimeVoiceClient}=await import('/src/features/classroom/realtime-voice.ts');
    const {StreamingPcmPlayer}=await import('/src/features/avatar/StreamingPcmPlayer.ts');
    const {SpeechMeter}=await import('/src/features/avatar/SpeechMeter.ts');
    const {api}=await import('/src/api.ts');
    window.voiceBench={RealtimeVoiceClient,StreamingPcmPlayer,SpeechMeter,api};
  });
  for(const path of (probe||realtimeOnly?['realtime']:['existing','realtime'])) {
    const session=await json('/api/courses/course-port-management-intro/class-sessions',{});sessions.push(session.id);
    await page.evaluate(({path,sessionId})=>{
      const b=window.voiceBench;b.path=path;b.sessionId=sessionId;
      b.client=new b.RealtimeVoiceClient(sessionId,e=>{
        b.events.push(e.type);
        if(e.type==='input.transcript')b.transcript=e.text;
        if(e.type==='dialogue.delta')b.dialogue+=e.delta;
        if(e.type==='audio.delta')b.player.push(e.audioBase64,e.sampleRate);
        if(e.type==='turn.completed')b.timing=e.timing;
        if(e.type==='control.result')b.control=e.result;
        if(e.type==='error')b.error=e.message;
      });
      b.audio=new AudioContext({sampleRate:24000});b.meter=new b.SpeechMeter();
    },{path,sessionId:session.id});
    const repetitions=probe?1:3;
    for(let round=0;round<repetitions;round++)for(let i=0;i<fixtures.length;i++) {
      const fixture=fixtures[i];
      const result=await page.evaluate(async({fixture,round,cold})=>{
        const b=window.voiceBench;b.events=[];b.dialogue='';b.transcript='';b.error='';b.timing=undefined;b.control=undefined;
        const marks=[];const listener=e=>marks.push(e.detail);window.addEventListener('edu:voice-timing',listener);
        const preparation=performance.now();let firstAudio,commitAt;
        try {
          await b.audio.resume();
          if(b.path==='realtime') {
            await b.client.prepare();b.client.begin();
            b.player=new b.StreamingPcmPlayer(b.audio,b.meter,b.client.turnId);
            const bytes=Uint8Array.from(atob(fixture.pcm),c=>c.charCodeAt(0));const view=new DataView(bytes.buffer);const samples=new Float32Array(bytes.length/2);
            for(let j=0;j<samples.length;j++)samples[j]=view.getInt16(j*2,true)/32768;
            // Match microphone pacing, allowing upstream processing during capture.
            for(let j=0;j<samples.length;j+=1600){b.client.append(samples.subarray(j,j+1600));await new Promise(r=>setTimeout(r,100));}
            commitAt=performance.now();await b.client.commit();
          } else {
            b.player=new b.StreamingPcmPlayer(b.audio,b.meter,`existing-${round}-${fixture.name}`);
            commitAt=performance.now();
            const asr=await fetch('/api/teacher/asr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:fixture.wav,mimeType:'audio/wav',durationMs:Math.round(fixture.durationMs)})});
            if(!asr.ok)throw new Error(`ASR ${asr.status}`);b.transcript=(await asr.json()).text;
            await b.api.streamAssistantTurn(b.sessionId,{text:b.transcript,source:'voice_asr'},e=>{
              if(e.type==='dialogue.delta')b.dialogue=e.accumulated;
              if(e.type==='turn.failed')throw new Error(e.message);
            },AbortSignal.timeout(120000));
            const response=await fetch('/api/teacher/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:b.dialogue.slice(0,3000),lipSync:true}),signal:AbortSignal.timeout(120000)});
            if(!response.ok||!response.body)throw new Error(`TTS ${response.status}`);
            const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
            while(true){const chunk=await reader.read();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});if(chunk.done)buffer+='\n';const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){if(!line.startsWith('data:'))continue;const e=JSON.parse(line.slice(5));if(e.error)throw new Error(e.error);if(e.audioBase64)b.player.push(e.audioBase64,e.sampleRate);}if(chunk.done)break;}
          }
          firstAudio=marks.find(m=>m.event==='first-audio')?.at;
          await b.player.finish();
          return {path:b.path,round,fixture:fixture.name,text:fixture.text,transcript:b.transcript,dialogue:b.dialogue,
            connection:b.path==='existing'?'http-per-turn':cold?'cold':'warm',prepareMs:commitAt-preparation-(b.path==='realtime'?fixture.durationMs:0),
            firstAudioMs:firstAudio===undefined?null:firstAudio-commitAt,totalMs:performance.now()-commitAt,timing:b.timing,control:b.control?{status:b.control.status,results:b.control.results}:undefined,events:b.events,error:b.error||undefined};
        } catch(error){b.client.cancel();b.player?.stop();return {path:b.path,round,fixture:fixture.name,error:error.message,events:b.events};}
        finally {window.removeEventListener('edu:voice-timing',listener);}
      },{fixture,round,cold:i===0});
      result.sessionId=session.id;result.recordedAt=new Date().toISOString();results.push(result);console.log(JSON.stringify({path:result.path,round,fixture:fixture.name,firstAudioMs:result.firstAudioMs,error:result.error,control:result.control?.status}));
      await writeFile(resolve(output,probe?'probe.json':'benchmark.json'),JSON.stringify({measuredAt:new Date().toISOString(),metric:'browser scheduled first non-silent PCM sample after submit; excludes microphone duration; not acoustic speaker measurement',results,errors},null,2));
      if(result.error&&probe)throw new Error(result.error);
      if(i===fixtures.length-1)await page.evaluate(()=>window.voiceBench.client.close());
    }
    await page.evaluate(()=>{window.voiceBench.client.close();return window.voiceBench.audio.close();});
  }
} finally {
  await browser.close();
  for(const id of sessions)await json(`/api/class-sessions/${id}/end`,{}).catch(()=>{});
}
