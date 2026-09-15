import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const output=resolve('output/live2d-qa/p0-eyes');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/avatar/xiaomai/preview');await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'眨眼',exact:true}).click();
  const frames=await page.evaluate(async()=>{
    const frames=[],start=performance.now();
    for(let i=0;i<24;i++){
      frames.push({ms:performance.now()-start,eyes:[...document.querySelectorAll('[data-xiaomai-eyes] canvas')].sort((a,b)=>a.dataset.eye.localeCompare(b.dataset.eye)).map(c=>({image:c.toDataURL(),eye:c.dataset.eye}))});
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    return frames;
  });
  assert.ok(new Set(frames.map(f=>f.eyes[0].image)).size>10);
  await page.getByRole('button',{name:'自然待机',exact:true}).click();await page.getByLabel('口型示范').selectOption('D');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const before=await cdp.send('Performance.getMetrics');
  const timing=await page.evaluate(async()=>{
    const timestamps=[];await new Promise(resolve=>{function sample(t){timestamps.push(t);if(timestamps.length<241)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
    const intervals=timestamps.slice(1).map((t,i)=>t-timestamps[i]).sort((a,b)=>a-b);
    const c=document.querySelector('.live2d-avatar__canvas>canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {fps:240000/(timestamps.at(-1)-timestamps[0]),p95FrameMs:intervals[Math.floor(intervals.length*.95)],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  });
  const after=await cdp.send('Performance.getMetrics');const metric=(r,n)=>r.metrics.find(m=>m.name===n).value;
  timing.scriptMsPerFrame=(metric(after,'ScriptDuration')-metric(before,'ScriptDuration'))*1000/240;
  await page.close();
  const review=await browser.newPage({viewport:{width:1450,height:1060}});
  await review.setContent('<html><body style="margin:0;background:#ffdfc5;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,360px)"></body></html>');
  await review.evaluate(async frames=>{
    for(const frame of frames){
      const f=document.createElement('figure');f.style.cssText='margin:0;padding:5px';const cap=document.createElement('figcaption');cap.textContent=`${Math.round(frame.ms)} ms`;f.append(cap);
      const c=document.createElement('canvas');c.width=348;c.height=116;const ctx=c.getContext('2d');
      for(let i=0;i<frame.eyes.length;i++){const image=new Image();image.src=frame.eyes[i].image;await image.decode();ctx.drawImage(image,i*174,0,174,116);}
      f.append(c);document.body.append(f);
    }
  },frames);
  await review.screenshot({path:resolve(output,'blink-frames.png')});
  await writeFile(resolve(output,'frame-report.json'),JSON.stringify({frames:frames.length,distinctFrames:new Set(frames.map(f=>f.eyes[0].image)).size,timing,errors},null,2));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({frames:frames.length,timing,errors}));
}finally{await browser.close();}
