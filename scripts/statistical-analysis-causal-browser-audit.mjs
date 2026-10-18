import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'.runtime/browser-qa/node_modules/playwright/index.mjs')).href);
const base=process.env.STATS_QA_ORIGIN||'http://127.0.0.1:5176';
const out='output/statistical-analysis-causal/browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const errors=[],results=[];const full=process.argv.includes('--full');
const indices=full?Array.from({length:546},(_,i)=>i+1):[450,...Array.from({length:96},(_,i)=>451+i)];
try{
 for(const width of [1600,390]){
  const page=await browser.newPage({viewport:{width,height:width===1600?1000:844}});page.on('pageerror',e=>errors.push(e.message));
  for(const index of indices){
   await page.goto(`${base}/statistical-analysis-preview.html?page=${index}`,{waitUntil:'domcontentloaded'});
   await page.locator('.sa-slide').waitFor();await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete));
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const r=await page.locator('.sa-slide').evaluate(a=>{
    const b=a.getBoundingClientRect();const leaks=/teachingCue|assistantCue|spokenSeconds|pauseSeconds|paragraphs|教师逐页讲稿|备课估计/.test(a.outerHTML);
    const broken=[...a.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src);
    const words=[],walker=document.createTreeWalker(a,NodeFilter.SHOW_TEXT);let n;
    while(n=walker.nextNode()){if(!n.textContent.trim()||n.parentElement.closest('annotation,.katex-mathml,svg'))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1))words.push(n.textContent.slice(0,70));}
    return {key:a.dataset.slideKey,width:a.offsetWidth,height:a.offsetHeight,ratio:b.width/b.height,leaks,broken,overflow:words,formulaErrors:a.querySelectorAll('.katex-error').length,text:a.innerText};
   });
   results.push({index,width,...r});
   if(!full||[1,48,100,250,350,398,450,451,463,480,498,499,517,528,540,546].includes(index))await page.screenshot({path:`${out}/${width}-${index}.png`});
   if(index%24===0)console.log(`${width}: ${index}`);
  }
  await page.close();
 }
}finally{await browser.close();}
const failures=results.filter(r=>r.leaks||r.broken.length||r.overflow.length||r.formulaErrors||r.width!==1600||r.height!==1000||Math.abs(r.ratio-1.6)>.001);
await fs.writeFile(`${out}/${full?'full':'new-pages'}-audit.json`,JSON.stringify({base,results,errors,failures},null,2));
console.log(JSON.stringify({checked:results.length,errors,failures},null,2));assert.equal(errors.length,0);assert.equal(failures.length,0);
