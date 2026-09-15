import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L4_URL??'http://127.0.0.1:5173',out='output/port-lesson-four-v10-qa';
await fs.mkdir(out,{recursive:true});
const smoke=process.argv.includes('--smoke');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],checks=[];
try{
 const ctx=await browser.newContext();const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 for(const width of smoke?[1600]:[1600,390]) for(const mode of smoke?['teacher']:['teacher','projection']){
  await p.setViewportSize({width,height:width===1600?1100:844});
  for(const n of smoke?[1,3,4,7,10,11,15,18,21,22,27,28,34,41]:Array.from({length:44},(_,i)=>i+1)){
   await p.goto(`${base}/port-lesson-four-preview.html?page=${n}${mode==='projection'?'&projection=1':''}`);await p.locator('.port-l4-slide').waitFor();
   if(mode==='teacher'&&await p.getByRole('button',{name:'全景',exact:true}).count())await p.getByRole('button',{name:'全景',exact:true}).click();
   await p.waitForFunction(()=>[...document.querySelectorAll('.port-l4-slide img')].every(i=>i.complete&&i.naturalWidth>0));
   const result=await p.evaluate(()=>{
    const c=document.querySelector('.port-l4-slide'),r=c.getBoundingClientRect(),scale=r.width/1600;
    const texts=[...c.querySelectorAll('h1,.l4-heading p,.l4-text,.l4-question,.l4-observations,footer,svg text')];
    const bad=texts.filter(el=>{const b=el.getBoundingClientRect();return b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2||(el.clientWidth>0&&el.scrollWidth>el.clientWidth+3);}).map(el=>el.textContent?.slice(0,90));
    const attrs=[...c.querySelectorAll('*')].flatMap(el=>[...el.attributes].map(a=>a.name)).filter(a=>/teaching|assistant|story-beat|voyage-stage|open-question|composition/.test(a));
    return {title:c.getAttribute('aria-label'),bad,attrs,ratio:r.width/r.height,overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...c.querySelectorAll('img')].length,scale};
   });
   checks.push({width,mode,page:n,...result});await p.locator('.port-l4-slide').screenshot({path:`${out}/${mode}-${width}-${String(n).padStart(2,'0')}.png`});
  }
  console.log(`${mode} ${width}px completed`);
 }
 await fs.writeFile(`${out}/${smoke?'smoke':'browser'}.json`,JSON.stringify({base,checks,errors},null,2));
 console.log(JSON.stringify({states:checks.length,issues:checks.filter(c=>c.bad.length||c.attrs.length||c.overflow||Math.abs(c.ratio-1.6)>.01),errors},null,2));
 assert.deepEqual(errors,[]);assert.ok(checks.every(c=>!c.bad.length&&!c.attrs.length&&!c.overflow));
}finally{await browser.close();}
