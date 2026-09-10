// Offline acoustic regression: actual WASM/model with controlled speech/speed/gain/noise.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const origin=process.env.EDU_VOICE_QA_ORIGIN ?? 'http://127.0.0.1:5173';
const fixtures=resolve('.runtime/kws');
const baseline=process.argv.includes('--baseline');
const quick=process.argv.includes('--quick');
const names=process.env.EDU_KWS_CASES?.split(',') ?? (baseline?['wake','finish','negative']:['wake','finish','cancel','thanks','thanksNegative','negative']);
const wavs=Object.fromEntries(await Promise.all(names.map(async name=>[name,[...await readFile(resolve(fixtures,name+'.wav'))]])));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
page.on('console', message=>{if(message.type()==='error')console.error(message.text());});
await page.exposeFunction('acousticProgress', row=>console.log(JSON.stringify(row)));
await page.route(origin+'/kws-probe',r=>r.fulfill({contentType:'text/html',body:'<title>Local KWS acoustic regression</title>'}));
if(!baseline)await page.route(origin+'/audio/classroom-keywords.js',async route=>{
 const source=await readFile(resolve('apps/teacher-web/public/audio/classroom-keywords.js'),'utf8');
 await route.fulfill({contentType:'text/javascript',body:source.replace('const hit = { kind, start, phrase: result.keyword };','const hit = { kind, start, phrase: result.keyword, duration, maxGap, tokens: result.tokens };')});
});
if(baseline)await page.route(origin+'/audio/kws-baseline.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile(resolve(fixtures,'baseline-worker.js'),'utf8')}));
try{
 await page.goto(origin+'/kws-probe');
 const report=await page.evaluate(async ({wavs,baseline,quick})=>{
  const ctx=new OfflineAudioContext(1,16000,16000), rows=[];
  const variants=[{speed:1,gain:1,noise:0},{speed:1.25,gain:1,noise:0},{speed:.8,gain:1,noise:0},{speed:1,gain:.15,noise:0},{speed:1,gain:.15,noise:.008},{speed:1.25,gain:.15,noise:.008}];
  for(const [name,bytes] of Object.entries(wavs)){
   const input=(await ctx.decodeAudioData(Uint8Array.from(bytes).buffer)).getChannelData(0);
   for(const variant of quick?variants.slice(0,1):variants){
    const worker=new Worker(baseline?'/audio/kws-baseline.js':'/audio/classroom-keywords.js');
    try{
     await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('KWS init timed out')),15000);worker.onerror=reject;worker.onmessage=e=>{clearTimeout(timer);e.data.type==='ready'?resolve():reject(e.data);};});
     if(!baseline)worker.postMessage({mode:name.startsWith('wake')?'waiting':'collecting'});
     let random=42;const speech=new Float32Array(Math.floor(input.length/variant.speed)+48000);
     for(let i=0;i<speech.length;i++){
      const pos=(i-16000)*variant.speed,left=Math.floor(pos),fraction=pos-left;
      random=(Math.imul(random,1664525)+1013904223)>>>0;
      speech[i]=((input[left]??0)*(1-fraction)+(input[left+1]??0)*fraction)*variant.gain+(random/4294967296-.5)*2*variant.noise;
     }
     const hits=[];const started=performance.now();
     for(let offset=0;offset<speech.length;offset+=2048){
      const samples=speech.slice(offset,offset+2048);
      const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('KWS frame timed out')),5000);worker.onmessage=e=>{clearTimeout(timer);e.data.type==='error'?reject(e.data):resolve(e.data);};worker.postMessage({samples},[samples.buffer]);});
      hits.push(...result.keywords);
     }
     rows.push({name,...variant,hits,inferenceMs:Math.round(performance.now()-started)});
     await window.acousticProgress(rows.at(-1));
    }finally{worker.terminate();}
   }
  }
  return rows;
 },{wavs,baseline,quick});
 await mkdir('output/voice-wake-review',{recursive:true});
 await writeFile(`output/voice-wake-review/acoustics-${baseline?'baseline':'current'}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
