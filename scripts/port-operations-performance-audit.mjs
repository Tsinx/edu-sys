import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const output=fileURLToPath(new URL('../output/port-operations-qa/',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__portDraws=0;window.__portRenderedFrames=0;for(const name of ['drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){window.__portDraws++;return original.apply(this,args);};}let last=0;const sample=()=>{if(last!==window.__portDraws)window.__portRenderedFrames++;last=window.__portDraws;requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await page.goto('http://127.0.0.1:4173/port-simulation-preview.html?course=full');await page.locator('[data-renderer="ready"]').waitFor({timeout:90000});await page.locator('input[type="file"]').setInputFiles(`${output}final-export.json`);await page.locator('[data-status="completed"]').waitFor({timeout:180000});await page.locator('[data-renderer="ready"]').waitFor();await page.locator('.port-scene-wrap').scrollIntoViewIfNeeded();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const before=await cdp.send('Performance.getMetrics');const start=await page.evaluate(()=>({at:performance.now(),frames:window.__portRenderedFrames}));await page.waitForTimeout(10000);const end=await page.evaluate(()=>({at:performance.now(),frames:window.__portRenderedFrames}));const after=await cdp.send('Performance.getMetrics');
 const clickAt=Date.now();await page.getByRole('navigation',{name:'业务工作台'}).getByRole('button',{name:'调度',exact:true}).click();await page.getByRole('heading',{name:'设备与岗位调度',exact:true}).waitFor();const interactionMs=Date.now()-clickAt;
 const metric=(list,name)=>list.metrics.find(m=>m.name===name)?.value??0;const result={renderer:'Chromium headless / SwiftShader',viewport:'1600×1000',state:'completed 48-hour run with full container records',sampleSeconds:(end.at-start.at)/1000,renderedFrames:end.frames-start.frames,renderedFps:(end.frames-start.frames)/((end.at-start.at)/1000),mainThreadScriptSeconds:metric(after,'ScriptDuration')-metric(before,'ScriptDuration'),heapMiB:metric(after,'JSHeapUsedSize')/1048576,interactionMs,errors};
 assert.ok(result.renderedFrames>10,'scene keeps rendering the late-session state');assert.ok(interactionMs<5000,'operation panels stay responsive');assert.deepEqual(errors,[]);await page.screenshot({path:`${output}final-live-render.png`,fullPage:false});await fs.writeFile(`${output}performance.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
