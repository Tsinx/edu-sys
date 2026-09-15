// Actual WASM and unchanged classroom worker, with private ephemeral HTTP server.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const output = resolve('output/kws-personal-training-20260909');
const runtime = resolve('apps/teacher-web/public/vendor/local-kws');
const allowed = new Set(['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt','sherpa-onnx-kws.js','sherpa-onnx-wasm-web.js','sherpa-onnx-wasm-web.wasm']);
let modelRoot = runtime;
const server = createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url,'http://127.0.0.1').pathname;
    if(pathname==='/') {res.setHeader('Content-Type','text/html');res.end('<title>KWS candidate verification</title>');return;}
    let path;
    if(pathname==='/audio/classroom-keywords.js') path=resolve('apps/teacher-web/public/audio/classroom-keywords.js');
    else if(pathname.startsWith('/vendor/local-kws/') && allowed.has(pathname.split('/').at(-1))) {
      const name=pathname.split('/').at(-1);
      path=resolve(name.endsWith('.onnx') || name==='tokens.txt' ? modelRoot : runtime,name);
    } else {res.writeHead(404);res.end();return;}
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.wasm')?'application/wasm':'application/octet-stream');
    if(pathname==='/audio/classroom-keywords.js') {
      const source=(await readFile(path,'utf8'))
        .replace('let spotter,','let rawProbe = [];\nlet spotter,')
        .replace('const samples = event.data.samples;', 'rawProbe = []; const samples = event.data.samples;')
        .replace('const coherent = kind', 'rawProbe.push({kind, duration, maxGap, result}); const coherent = kind')
        .replace("type: 'frame', samples, keywords", "type: 'frame', probe: rawProbe, samples, keywords")
        .replace("type: 'frame', samples, keywords", "type: 'frame', probe: rawProbe, samples, keywords");
      res.end(source);
    } else res.end(await readFile(path));
  } catch(e) {res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const cases=JSON.parse(await readFile(resolve(output,'browser-fixtures/cases.json'),'utf8'));
const inputs=await Promise.all(cases.map(async item=>({...item,bytes:[...await readFile(resolve(output,'browser-fixtures',item.file))]})));
const reports={};
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for(const name of ['website_current','candidate_fp32','candidate_int8']) {
    modelRoot=name==='website_current'?runtime:resolve(output,name==='candidate_fp32'?'model':'model-int8');
    reports[name]=await page.evaluate(async (inputs)=>{
      const decoder=new OfflineAudioContext(1,16000,16000), rows=[];
      for(const input of inputs) {
        const wave=(await decoder.decodeAudioData(Uint8Array.from(input.bytes).buffer)).getChannelData(0);
        const worker=new Worker('/audio/classroom-keywords.js');
        try {
          await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('init timeout')),30000);worker.onerror=reject;worker.onmessage=e=>{clearTimeout(t);e.data.type==='ready'?resolve():reject(new Error(JSON.stringify(e.data)));};});
          worker.postMessage({mode:input.category==='wake'?'waiting':'collecting'});
          // Two seconds after speech cover the worker's one-second finish delay
          // in addition to the transducer's lookahead. One second is insufficient.
          const samples=new Float32Array(wave.length+48000);samples.set(wave,16000);
          const hits=[],probe=[];
          for(let i=0;i<samples.length;i+=2048) {
            const slice=samples.slice(i,i+2048);
            const message=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('frame timeout')),10000);worker.onmessage=e=>{clearTimeout(t);e.data.type==='error'?reject(new Error(JSON.stringify(e.data))):resolve(e.data);};worker.postMessage({samples:slice},[slice.buffer]);});
            hits.push(...message.keywords);
            probe.push(...(message.probe??[]));
          }
          rows.push({id:input.id,category:input.category,variant:input.variant,hits,probe,correct:hits.some(h=>h.kind===(input.category==='wake'?'wake':'finish'))});
        }finally{worker.terminate();}
      }
      return rows;
    },inputs);
    console.log(name,JSON.stringify(reports[name].map(r=>({id:r.id,variant:r.variant,correct:r.correct}))));
  }
  reports.errors=errors;
  await writeFile(resolve(output,'browser-audit.json'),JSON.stringify(reports,null,2));
  if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
