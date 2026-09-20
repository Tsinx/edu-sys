import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'.runtime/browser-qa/node_modules/playwright/index.mjs')).href);
const base=process.env.STATS_QA_ORIGIN||'http://127.0.0.1:5173';
const quick=process.argv.includes('--calibrate');
const pages=quick?[24,91,101,108,125,136,149,172,182,198,199,205,215,227,241,248,250]:Array.from({length:250},(_,i)=>i+1);
const out='output/statistical-analysis-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[],results=[];
for(const width of quick?[1600]:[1600,390]){
 const page=await browser.newPage({viewport:{width,height:width===1600?1000:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push({width,message:e.message}));
 for(const index of pages){
  await page.goto(`${base}/statistical-analysis-preview.html?page=${index}&projection`);
  await page.locator('.sa-slide').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete));
  const r=await page.evaluate(()=>{const a=document.querySelector('.sa-slide'),b=a.getBoundingClientRect();const broken=[...a.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src);const leaks=/teachingCue|assistantCue|storyBeat|voyageStage|openQuestion|讲解重点：|停顿位置：|前后衔接：|assistant_boundary/.test(a.outerHTML);const authoringCopy=(a.innerText.match(/让学生|告诉学生|先拆掉|今天不先|不背口号|教师应当|本页讲解重点|备课说明/g)||[]);const outside=[];for(const el of a.querySelectorAll('h1,p,td,th,svg text,.sa-footer span')){if(el.closest('.katex-mathml'))continue;const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1))outside.push(el.textContent.slice(0,70));}const layoutIssues=[];const body=a.querySelector('.sar-page'),head=a.querySelector('.sa-header'),cap=a.querySelector('.sa-caption');if(body&&head&&cap){const br=body.getBoundingClientRect(),cr=cap.getBoundingClientRect();if(head.getBoundingClientRect().bottom>br.top-2)layoutIssues.push('header-body');for(const el of body.querySelectorAll('.sar-statements p,.sar-aside p,.sar-table,.sar-chart,.sar-formula')){const r=el.getBoundingClientRect();if(r.bottom>cr.top-2)layoutIssues.push('caption:'+el.textContent.slice(0,40));if(el.scrollWidth>el.clientWidth+2&&!(el instanceof SVGElement))layoutIssues.push('internal:'+el.textContent.slice(0,40));}const texts=[...body.querySelectorAll('.sar-chart text')];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const x=texts[i].getBoundingClientRect(),y=texts[j].getBoundingClientRect();if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)layoutIssues.push('chart:'+texts[i].textContent+'/'+texts[j].textContent);}}return {layoutIssues,key:a.dataset.slideKey,broken,leaks,authoringCopy,outside,ratio:b.width/b.height,canvas:[a.offsetWidth,a.offsetHeight],text:a.innerText.length,publicText:a.innerText,images:[...a.querySelectorAll('img')].map(i=>new URL(i.src).pathname),formulas:[...a.querySelectorAll('.katex annotation')].map(e=>e.textContent),formulaErrors:a.querySelectorAll('.katex-error').length};});
  results.push({index,width,...r});await page.screenshot({path:`${out}/${width}-${String(index).padStart(3,'0')}.png`});
  if(index%10===0)console.log(`${width}: ${index}/250`);
 }
 await page.close();
}
await browser.close();await fs.writeFile(`${out}/${quick?'calibration':'full-audit'}.json`,JSON.stringify({results,errors},null,2));
const failures=results.filter(r=>r.layoutIssues.length||r.broken.length||r.leaks||r.authoringCopy.length||r.formulaErrors||r.outside.length||Math.abs(r.ratio-1.6)>.001||r.canvas[0]!==1600||r.canvas[1]!==1000);
console.log(JSON.stringify({checked:results.length,errors,failures},null,2));assert.equal(errors.length,0);assert.equal(failures.length,0);
