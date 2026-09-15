import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--disable-webgl','--disable-webgl2']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:8198'?route.continue():route.abort());
await page.goto('http://127.0.0.1:8198/port-lbl-preview.html?page=88',{waitUntil:'networkidle'});
const checks=[];
for(const index of [88,90,70,76,78,52]){
  await page.getByLabel('选择课件页').selectOption(String(index));
  await page.waitForFunction(()=>document.querySelectorAll('.lbl-flat-map').length===document.querySelectorAll('.lbl-globe').length);
  await page.waitForTimeout(500);
  const check=await page.evaluate(()=>({maps:document.querySelectorAll('.lbl-flat-map').length,routes:document.querySelectorAll('.lbl-flat-map path').length,labels:[...document.querySelectorAll('.lbl-flat-map text')].map(e=>e.textContent)}));
  assert.ok(check.maps>0);assert.ok(check.routes>0);checks.push({page:index+1,...check});
  await page.screenshot({path:`output/port-lbl-qa/fallback-${index+1}.png`,clip:await page.locator('.lbl-slide').boundingBox()});
}
assert.deepEqual(errors,[]);await fs.writeFile('output/port-lbl-qa/fallback-check.json',JSON.stringify({webglDisabled:true,checks,errors},null,2));
console.log(JSON.stringify({passed:checks.length,errors}));await browser.close();
