import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.PORT_LBL_BASE_URL||'http://127.0.0.1:5173';
const external=[];const failed=[];
if(process.argv.includes('--offline'))await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base&&!url.pathname.startsWith('/api/'))return route.continue();external.push(url.href);return route.abort();});
page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
const output='output/port-lbl-qa';await fs.mkdir(output,{recursive:true});
const pages=process.argv.includes('--all')?Array.from({length:106},(_,i)=>i):process.argv.slice(2).filter(v=>!v.startsWith('--')).map(Number);if(!pages.length)pages.push(0,2,5,7,10,11);
const narrow=process.argv.includes('--narrow');if(narrow)await page.setViewportSize({width:390,height:844});
const checks=[];
await page.goto(`${base}/port-lbl-preview.html?page=0`,{waitUntil:'networkidle'});
for(const index of pages){
  await page.getByLabel('选择课件页').selectOption(String(index));
  if(await page.locator('.lbl-globe').count()){
    await page.waitForFunction(()=>[...document.querySelectorAll('.lbl-globe .earth-globe')].every(e=>e.classList.contains('earth-globe--ready')||e.classList.contains('earth-globe--error')));
    await page.waitForTimeout(350);
  }else await page.waitForTimeout(150);
  const slide=page.locator('.lbl-slide');
  const box=await slide.boundingBox();
  await page.screenshot({path:`${output}/${narrow?'narrow-':''}page-${String(index+1).padStart(3,'0')}.png`,clip:box});
  checks.push(await page.evaluate(()=>({title:document.querySelector('.lbl-slide')?.getAttribute('aria-label'),images:[...document.querySelectorAll('.lbl-slide img')].map(i=>({src:i.getAttribute('src'),valid:i.complete&&i.naturalWidth>0})),overflow:[...document.querySelectorAll('.lbl-type,.lbl-title')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent),clipped:[...document.querySelectorAll('.lbl-type,.lbl-title')].filter(e=>e.offsetTop+e.offsetHeight>928||e.offsetLeft+e.offsetWidth>1575).map(e=>e.textContent),viewportOverflow:document.documentElement.scrollWidth>innerWidth,canvas:!!document.querySelector('.lbl-globe canvas')})));
  if(index%20===0)console.log(`checked ${index+1}/106`);
}
await fs.writeFile(`${output}/${pages.length<106?'recheck-':''}${process.argv.includes('--offline')?'offline-':''}${narrow?'narrow-':''}browser-check.json`,JSON.stringify({base,checks,errors,external,failed},null,2));
const issues=checks.filter(c=>c.overflow.length||c.clipped.length||c.viewportOverflow||c.images.some(i=>!i.valid));
console.log(JSON.stringify({checked:pages.length,errors,external,failed,issues},null,2));await browser.close();
if(errors.length||external.length||failed.length||issues.length)process.exitCode=1;
