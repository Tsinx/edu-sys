// Actual local WASM KWS + Silero VAD. Fixtures are speech WAVs in EDU_VOICE_FIXTURES.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {chromium} = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const origin = process.env.EDU_VOICE_QA_ORIGIN ?? 'http://127.0.0.1:5173';
const fixtureRoot = process.env.EDU_VOICE_FIXTURES ?? '.runtime/kws';
const names = ['wakeXiaomai','wakeXiaomaiStrong','wakeXiaomaiShort','shortThanks','thanksContinue','thanksEveryone','thanksNegative','xiaomaiRepeat','continueSpeaking','cancel','negative'];
const wavs = Object.fromEntries(await Promise.all(names.map(async name => [name, [...await readFile(resolve(fixtureRoot, name+'.wav'))]])));
const browser = await chromium.launch({channel:'msedge', headless:true});
const page = await browser.newPage();
await page.route(origin+'/vad-probe', route => route.fulfill({contentType:'text/html',body:'<title>Classroom VAD QA</title>'}));
await page.exposeFunction('vadProgress', row => console.log(JSON.stringify(row)));
const output = resolve('output/xiaomai-vad-review');
await mkdir(output, {recursive:true});
try {
  await page.goto(origin+'/vad-probe');
  const report = await page.evaluate(async wavs => {
    const ctx = new OfflineAudioContext(1, 16000, 16000);
    const speech = Object.fromEntries(await Promise.all(Object.entries(wavs).map(async ([name, bytes]) =>
      [name, (await ctx.decodeAudioData(Uint8Array.from(bytes).buffer)).getChannelData(0)])));
    const silence = seconds => new Float32Array(Math.round(seconds * 16000));
    function join(...arrays) {
      const result = new Float32Array(arrays.reduce((n, a) => n+a.length, 0));
      let offset=0; for(const a of arrays){result.set(a,offset);offset+=a.length;}return result;
    }
    const cases = [
      {name:'name wakes', input:speech.wakeXiaomai, wake:1, finish:0},
      {name:'name with explicit ending', input:speech.wakeXiaomaiStrong, wake:1, finish:1, phrase:'finish-thanks'},
      {name:'name with short thanks', input:speech.wakeXiaomaiShort, wake:1, finish:1, phrase:'finish-short-thanks'},
      {name:'thanks before wake is ignored', input:speech.shortThanks, wake:0, finish:0},
      {name:'thanks followed by continued speech', collecting:true, input:speech.thanksContinue, wake:0, finish:0},
      {name:'thanks everyone followed by continued speech', collecting:true, input:speech.thanksEveryone, wake:0, finish:0},
      {name:'thanks everyone at end of classroom speech', input:join(speech.wakeXiaomai,silence(.65),speech.thanksNegative), wake:1, finish:0},
      {name:'ordinary speech and silence keep recording', collecting:true, input:speech.negative, wake:0, finish:0},
      {name:'repeated name stays in same recording', input:join(speech.wakeXiaomai,silence(.3),speech.xiaomaiRepeat,silence(.3),speech.shortThanks), wake:1, finish:1, phrase:'finish-short-thanks'},
      {name:'resumption cancels tentative ending', collecting:true, input:speech.shortThanks, inject:'continueSpeaking', wake:0, finish:0, pending:true},
      {name:'cancel discards tentative ending', collecting:true, input:speech.shortThanks, inject:'cancel', wake:0, finish:0, cancel:1, pending:true},
    ];
    const rows=[];
    for(const model of ['original','personal-20260909','xiaomai-20260909-epoch10']) {
      const worker = new Worker('/audio/classroom-keywords.js?model='+model);
      const message = () => new Promise((resolve,reject) => {
        const timer=setTimeout(()=>reject(new Error('Worker timeout')),45000);
        worker.onerror=error=>{clearTimeout(timer);reject(new Error(error.message));};
        worker.onmessage=event=>{clearTimeout(timer);event.data.type==='error'?reject(new Error(event.data.message)):resolve(event.data);};
      });
      try {
        await message();
        let generation=0;
        for(const test of cases) {
          worker.postMessage({type:'reset',generation:++generation});
          if(test.collecting) worker.postMessage({mode:'collecting',generation});
          let input=join(silence(1),test.input,silence(3));
          const hits=[], transitions=[];
          let pending=false, injected=false;
          const started=performance.now();
          for(let offset=0;offset<input.length;offset+=2048){
            const samples=input.slice(offset,offset+2048);
            const reply=message();worker.postMessage({samples,generation},[samples.buffer]);
            const frame=await reply;
            hits.push(...frame.keywords);
            if(pending!==frame.endingPending){pending=frame.endingPending;transitions.push({at:(offset+2048)/16000,pending});}
            if(test.inject && pending && !injected){
              injected=true;
              // Resume after KWS has actually emitted pending, before the VAD deadline.
              input=join(input.slice(0,offset+2048),silence(.15),speech[test.inject],silence(3));
            }
          }
          const row={model,name:test.name,hits,transitions,injected,inferenceMs:Math.round(performance.now()-started),
            expected:{wake:test.wake,finish:test.finish,cancel:test.cancel??0,phrase:test.phrase,pending:test.pending??false}};
          rows.push(row);await window.vadProgress(row);
        }
      } finally {worker.terminate();}
    }
    return rows;
  }, wavs);
  await writeFile(resolve(output,'acoustics.json'),JSON.stringify(report,null,2));
  for(const row of report) {
    for(const kind of ['wake','finish','cancel']) assert.equal(row.hits.filter(hit=>hit.kind===kind).length,row.expected[kind],`${row.model}: ${row.name}: ${kind}`);
    if(row.expected.phrase) assert.equal(row.hits.find(hit=>hit.kind==='finish').phrase,row.expected.phrase,`${row.model}: ${row.name}`);
    if(row.expected.pending) assert.equal(row.injected,true,`${row.model}: ${row.name}: missing tentative state`);
  }
  console.log(`Passed ${report.length} real KWS/VAD cases.`);
} finally {await browser.close();}
