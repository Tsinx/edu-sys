import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const slides=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/pages.json','utf8')).filter(p=>p.demo);
const out='output/management-principles/qa/demos';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});const results=[],errors=[];
for(const width of [1600,390]){
 const page=await browser.newPage({viewport:{width,height:width===1600?1100:844}});page.on('pageerror',e=>errors.push(e.message));
 for(const slide of slides){
  await page.goto(`http://127.0.0.1:5191/management-preview.html?page=${slide.index}`);await page.locator('.mg-demo').waitFor();
  const select=page.locator('.mg-demo select'),options=await select.count()?await select.locator('option').evaluateAll(o=>o.map(x=>x.value)):['default'];
  for(const option of options){
   await page.getByRole('button',{name:'重置',exact:true}).click();if(option!=='default')await select.selectOption(option);
   let step=0;
   while(true){
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.mg-slide img')].map(i=>i.decode().catch(()=>undefined)));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const r=await page.evaluate(()=>{const a=document.querySelector('.mg-slide'),b=a.getBoundingClientRect(),f=a.querySelector('footer').getBoundingClientRect(),scale=b.width/1600,outside=[],overlap=[],internal=[];for(const el of a.querySelectorAll('h1,h2,p,td,th,li,span,strong,label,button')){if(el.closest('footer,.mg-kicker'))continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const text=el.textContent.slice(0,80);if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1)outside.push(text);if(el.closest('.mg-content')&&r.bottom>f.top-5*scale)overlap.push(text);if(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)internal.push(text);}return{outside,overlap,internal,text:a.innerText,broken:[...a.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src)};});
    results.push({width,slideKey:slide.slideKey,demo:slide.demo,option,step,...r});await page.screenshot({path:`${out}/${width}-${slide.demo}-${option}-${step}.png`,fullPage:true});
    const next=page.getByRole('button',{name:'下一步',exact:true});if(await next.isDisabled())break;await next.click();step++;
   }
  }
  console.log(`${width}: ${slide.demo} all stages/options`);
 }
 await page.close();
}
await browser.close();const failures=results.filter(r=>r.outside.length||r.overlap.length||r.internal.length||r.broken.length);await fs.writeFile(`${out}/audit.json`,JSON.stringify({checked:results.length,errors,failures,results},null,2));console.log(JSON.stringify({checked:results.length,errors,failures:failures.map(({text,...r})=>r)},null,2));assert.equal(errors.length,0);assert.equal(failures.length,0);
