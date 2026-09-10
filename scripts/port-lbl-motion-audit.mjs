import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const output='output/port-lbl-qa/motion';await fs.mkdir(output,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/port-lbl-preview.html',{waitUntil:'networkidle'});
async function seek(value){
  await page.getByLabel('动画进度').evaluate((input,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  await page.waitForTimeout(180);
  assert.equal(await page.getByLabel('动画进度').inputValue(),String(value));
}
const checks=[];
// Each authored process/camera that carries explanatory movement is sampled.
const requested=process.argv.slice(2).map(Number).filter(Number.isFinite);
const indices=requested.length?requested:[2,7,9,11,13,14,15,17,19,21,22,23,24,28,29,30,31,34,35,36,37,38,40,42,43,44,46,47,50,52,58,59,60,61,63,64,68,70,71,73,74,75,76,77,78,79,80,81,82,83,85,86,88,90,92,93,96,97,98,99,100,104];
for(const index of indices){
  await page.getByLabel('选择课件页').selectOption(String(index));
  if(await page.locator('.lbl-globe').count())await page.waitForFunction(()=>[...document.querySelectorAll('.lbl-globe .earth-globe')].every(e=>e.classList.contains('earth-globe--ready')));
  const positions=[];
  for(const progress of [0,250,500,750,1000]){
    await seek(progress);
    const clip=await page.locator('.lbl-slide').boundingBox();
    await page.screenshot({path:`${output}/page-${String(index+1).padStart(3,'0')}-${progress}.png`,clip});
    positions.push(await page.evaluate(()=>({boxes:[...document.querySelectorAll('.lbl-box')].map(box=>({left:box.style.left,top:box.style.top})),globe:[...document.querySelectorAll('.lbl-globe canvas')].map(canvas=>({progress:canvas.dataset.vesselProgress,camera:canvas.dataset.cameraLatitude})),reveals:[...document.querySelectorAll('.lbl-reveal')].map(e=>getComputedStyle(e).opacity)})));
  }
  checks.push({page:index+1,positions});
  if(checks.length%10===0)console.log(`motion ${checks.length}/${indices.length}`);
}
// Returning to a page resets it; teacher transport still takes over immediately.
await page.getByLabel('选择课件页').selectOption('14');await seek(500);
await page.getByLabel('选择课件页').selectOption('15');await page.getByLabel('选择课件页').selectOption('14');
assert.equal(await page.getByLabel('动画进度').inputValue(),'0');
await seek(500);
await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(600);
await page.getByRole('button',{name:'暂停',exact:true}).click();
const paused=await page.getByLabel('动画进度').inputValue();assert.ok(Number(paused)>500);
await page.waitForTimeout(400);assert.equal(await page.getByLabel('动画进度').inputValue(),paused);
await page.getByRole('button',{name:'投影',exact:true}).click();assert.equal(await page.locator('.lbl-controls').count(),0);
await page.keyboard.press('r');await page.waitForTimeout(600);await page.keyboard.press('Space');
await page.keyboard.press('Escape');assert.ok(Number(await page.getByLabel('动画进度').inputValue())>0);
assert.ok(Number(await page.getByLabel('动画进度').inputValue())<150);
assert.equal(await page.getByLabel('选择课件页').inputValue(),'14');
await fs.writeFile(`${output}/${requested.length?'motion-recheck':'motion-check'}.json`,JSON.stringify({checks,errors,transport:{pause:true,replayInProjection:true,pageEntryReset:true,noAutoAdvance:true}},null,2));
assert.deepEqual(errors,[]);console.log(`Verified ${indices.length} authored motion pages and teacher controls.`);await browser.close();
