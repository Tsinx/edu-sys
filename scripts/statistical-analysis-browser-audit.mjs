import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const quick=process.argv.includes('--calibrate');
const pages=quick?[1,3,19,37,51,93]:Array.from({length:100},(_,i)=>i+1);
const out='output/statistical-analysis-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[],results=[];
for(const width of quick?[1600]:[1600,390]){
 const page=await browser.newPage({viewport:{width,height:width===1600?1000:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push({width,message:e.message}));
 for(const index of pages){
  await page.goto(`http://127.0.0.1:5178/statistical-analysis-preview.html?page=${index}&projection`);
  await page.locator('.sa-slide').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete));
  const r=await page.evaluate(()=>{const a=document.querySelector('.sa-slide'),b=a.getBoundingClientRect();const broken=[...a.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src);const leaks=/teachingCue|assistantCue|storyBeat|voyageStage|openQuestion|讲解重点：|停顿位置：|前后衔接：|assistant_boundary/.test(a.outerHTML);const authoringCopy=(a.innerText.match(/让学生|告诉学生|先拆掉|今天不先|不背口号|教师应当|本页讲解重点|备课说明/g)||[]);const outside=[];for(const el of a.querySelectorAll('h1,p,td,th,svg text,.sa-footer span')){if(el.closest('.katex-mathml'))continue;const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1))outside.push(el.textContent.slice(0,70));}return {key:a.dataset.slideKey,broken,leaks,authoringCopy,outside,ratio:b.width/b.height,canvas:[a.offsetWidth,a.offsetHeight],text:a.innerText.length,publicText:a.innerText,images:[...a.querySelectorAll('img')].map(i=>new URL(i.src).pathname),formulas:[...a.querySelectorAll('.katex annotation')].map(e=>e.textContent),formulaErrors:a.querySelectorAll('.katex-error').length};});
  results.push({index,width,...r});await page.screenshot({path:`${out}/${width}-${String(index).padStart(3,'0')}.png`});
  if(index%10===0)console.log(`${width}: ${index}/100`);
 }
 await page.close();
}
await browser.close();await fs.writeFile(`${out}/${quick?'calibration':'full-audit'}.json`,JSON.stringify({results,errors},null,2));
const failures=results.filter(r=>r.broken.length||r.leaks||r.authoringCopy.length||r.formulaErrors||r.outside.length||Math.abs(r.ratio-1.6)>.001||r.canvas[0]!==1600||r.canvas[1]!==1000);
console.log(JSON.stringify({checked:results.length,errors,failures},null,2));assert.equal(errors.length,0);assert.equal(failures.length,0);
