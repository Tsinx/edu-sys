import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const output='output/port-process-qa';await fs.mkdir(output,{recursive:true});
const indices=[13,14,17,21,22,24,28,29,58,59,60,61,63,64,65];
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const checks=[];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function seek(value){
  await page.getByLabel('动画进度').evaluate((input,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  await page.waitForFunction(value=>Number(document.querySelector('.lbl-process-scene canvas').dataset.progress)===value/1000,value);
}
try{
  await page.goto(`${process.env.PORT_LBL_BASE_URL||'http://127.0.0.1:5173'}/port-lbl-preview.html?page=13`);
  for(const index of indices){
    await page.getByLabel('选择课件页').selectOption(String(index));
    await page.locator('.lbl-process-scene[data-render-state="ready"]').waitFor();
    const frames=[];
    for(const progress of [0,250,500,750,1000]){
      await seek(progress);
      const bitmap=await page.locator('.lbl-slide').screenshot({path:`${output}/page-${index+1}-${progress}.png`});
      frames.push(hash(bitmap));
    }
    assert.ok(new Set(frames).size>=4,`Page ${index+1} must visibly advance`);
    await seek(375);const original=hash(await page.locator('.lbl-process-scene').screenshot());
    await page.waitForTimeout(180);assert.equal(hash(await page.locator('.lbl-process-scene').screenshot()),original,`Page ${index+1} moves while paused`);
    await seek(875);await seek(375);assert.equal(hash(await page.locator('.lbl-process-scene').screenshot()),original,`Page ${index+1} does not reproduce the selected frame`);
    checks.push({page:index+1,frames:5,pauseStable:true,seekReproducible:true});console.log(`3D checked ${checks.length}/${indices.length}`);
  }
  await page.getByLabel('选择课件页').selectOption('14');
  await page.locator('.lbl-process-scene[data-render-state="ready"]').waitFor();await seek(500);
  await page.locator('.lbl-process-scene canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('.lbl-process-scene[data-render-state="fallback"]').waitFor();
  assert.equal(await page.locator('.lbl-process-fallback').count(),1);
  await page.screenshot({path:`output/port-process-qa/context-loss-fallback.png`});
  const fallback=await browser.newPage({viewport:{width:1600,height:1100}});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  await fallback.goto(`${process.env.PORT_LBL_BASE_URL||'http://127.0.0.1:5173'}/port-lbl-preview.html?page=17`);
  for(const index of [17,24,59,61,64]){
    await fallback.getByLabel('选择课件页').selectOption(String(index));
    await fallback.locator('.lbl-process-scene[data-render-state="fallback"]').waitFor();
    await fallback.getByRole('button',{name:'全景',exact:true}).click();
    assert.equal(await fallback.locator('.lbl-process-fallback').count(),1);
    await fallback.locator('.lbl-slide').screenshot({path:`${output}/fallback-${index+1}.png`});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${output}/browser-check.json`,JSON.stringify({checks,errors,contextLossFallback:true,unavailableWebglFallback:true},null,2));
  console.log(JSON.stringify({pages:checks.length,errors,fallback:true}));
}finally{await browser.close();}
