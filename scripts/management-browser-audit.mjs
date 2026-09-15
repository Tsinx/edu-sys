import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const slides=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/pages.json','utf8'));
const quick=process.argv.includes('--calibrate');
const requested=process.argv.find(s=>s.startsWith('--pages='))?.slice(8).split(',').map(Number);
const selected=requested??(quick?[...new Set([1,2,7,12,34,45,66,...slides.filter(s=>s.demo||s.layout==='cover'||s.slideKey.match(/l4a-s07[234]/)||s.slideKey.includes('l2-s013')).map(s=>s.index)])]:slides.map(s=>s.index));
const out='output/management-principles/qa/web';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[],errors=[];
for(const width of quick||requested?[1600]:[1600,390]){
 const page=await browser.newPage({viewport:{width,height:width===1600?1100:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push({width,error:e.message}));
 for(const index of selected){
  await page.goto(`http://127.0.0.1:5191/management-preview.html?page=${index}&student`);
  await page.locator('.mg-slide').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('.mg-slide img')].every(i=>i.complete));
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.mg-slide img')].map(i=>i.decode().catch(()=>undefined)));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const result=await page.evaluate(()=>{
   const root=document.querySelector('.mg-slide'),rect=root.getBoundingClientRect(),scale=rect.width/1600,foot=root.querySelector('.mg-footer').getBoundingClientRect();
   const html=root.outerHTML,text=root.innerText;
   const outside=[],overlap=[],internal=[];
   if(rect.left<0||rect.right>innerWidth+1||rect.top<0)outside.push('canvas-outside-viewport');
   for(const el of root.querySelectorAll('h1,h2,p,th,td,li,figcaption,.mg-metrics strong,.mg-demo-controls label,.mg-tree span,.mg-quadrants span,.mg-orbit span')){
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    const label=el.innerText?.slice(0,65)??el.textContent?.slice(0,65);
    if(r.left<rect.left-scale||r.right>rect.right+scale||r.top<rect.top-scale||r.bottom>rect.bottom+scale)outside.push(label);
    if(el.closest('.mg-content')&&r.bottom>foot.top-5*scale)overlap.push(label);
    if(el.scrollWidth>el.clientWidth+2 || el.scrollHeight>el.clientHeight+2)internal.push(label);
   }
   return {key:root.dataset.managementPage,canvas:[root.offsetWidth,root.offsetHeight],ratio:rect.width/rect.height,broken:[...root.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src),images:[...root.querySelectorAll('img')].map(i=>new URL(i.src).pathname),leaks:/teachingCue|assistantCue|storyBeat|voyageStage|openQuestion|originalNotes|originalAnimation|source-map.private/.test(html),authoringCopy:text.match(/让学生|告诉学生|先拆掉|今天不先|不背口号|本页讲解重点|备课说明/g)??[],outside,overlap,internal,publicText:text,documentOverflow:document.documentElement.scrollWidth>innerWidth+1};
  });results.push({index,width,...result});
  await page.screenshot({path:`${out}/${width}-${String(index).padStart(3,'0')}.png`,fullPage:true});
  if(results.length%25===0)console.log(`checked ${results.length}/${selected.length*(quick||requested?1:2)}`);
 }
 await page.close();
}
await browser.close();
const failures=results.filter(r=>r.broken.length||r.leaks||r.authoringCopy.length||r.outside.length||r.overlap.length||r.internal.length||r.documentOverflow||Math.abs(r.ratio-1.6)>.001||r.canvas[0]!==1600||r.canvas[1]!==1000);
const report={scope:quick?'calibration':requested?'targeted':'complete',checked:results.length,expected:slides.length*2,results,errors,failures};
await fs.writeFile(`${out}/${quick?'calibration':requested?'targeted':'full-audit'}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({checked:results.length,errors,failures:failures.map(({index,width,outside,overlap,internal,broken,documentOverflow})=>({index,width,outside,overlap,internal,broken,documentOverflow}))},null,2));
assert.equal(errors.length,0);assert.equal(failures.length,0);
