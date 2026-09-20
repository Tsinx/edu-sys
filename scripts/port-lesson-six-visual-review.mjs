import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const out='output/port-lesson-six-qa',base=process.env.PORT_L6_URL??'http://127.0.0.1:5173',api=process.env.PORT_L6_API??'http://127.0.0.1:4316';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1600,height:1100}});const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 // Final text and geographic-layer revisions: every changed map and glossary page.
 for(const width of [1600,390])for(const n of [3,6,7,8,23,25,26,27,29,31,32,33,34,35,36,37,38,44]){
  await page.setViewportSize({width,height:width===1600?1100:844});await page.goto(`${base}/port-lesson-six-preview.html?page=${n}&student=1&channel=final-${n}-${width}`);await page.getByRole('button',{name:'全景',exact:true}).click();
  if(await page.locator('.l6-globe-window').count())await page.locator('.earth-globe--ready,.earth-globe--error').waitFor({state:'attached',timeout:60000});
  const bounds=await page.locator('.port-l6-slide').evaluate(c=>{const b=c.getBoundingClientRect();return [...c.querySelectorAll('svg text,[data-l6-bounds]')].every(el=>{const r=el.getBoundingClientRect();return r.left>=b.left-2&&r.right<=b.right+2&&r.top>=b.top-2&&r.bottom<=b.bottom+2;});});assert.ok(bounds,`${width}/${n}`);checks.push(`${width}/${n}`);
  if(width===1600)await page.locator('.port-l6-slide').screenshot({path:`${out}/slide-${String(n).padStart(2,'0')}.png`});
 }
 const globe=JSON.parse(await readFile(`${out}/globe-audit.json`,'utf8'));assert.equal(globe.fourLayers,true);assert.equal(globe.stableCanvas,true);
 const session=JSON.parse(await readFile(`${out}/classroom.json`,'utf8')).sessionId;
 for(const role of ['teacher','student']){
  const ctx=await browser.newContext();await ctx.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});await ctx.request.post(api+'/api/identity/development/session',{data:{role,displayName:'第6讲最终画面核查'}});
  if(role==='teacher'){await ctx.request.post(`${api}/api/class-sessions/${session}/events`,{data:{type:'set_slide',index:276}});await ctx.request.post(`${api}/api/class-sessions/${session}/events`,{data:{type:'set_lesson_six_presentation',slideKey:'l6-shanghai',progress:1,revealed:false,option:0}});}
  const p=await ctx.newPage();await p.goto(`${base}/${role==='teacher'?'classroom':'join'}/${session}`);await p.locator('.port-l6-slide').waitFor();
  for(const width of [1600,390]){await p.setViewportSize({width,height:width===1600?1100:844});await p.screenshot({path:`${out}/final-${role}-${width}.png`});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);if(role==='teacher')assert.ok(await p.locator('.l6-playback').evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&[...el.querySelectorAll('button,input')].every(c=>{const r=c.getBoundingClientRect();return c.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});}),'playback must fit and remain clickable');checks.push(`${role}-controls/${width}`);}
  if(role==='teacher'){
   await p.setViewportSize({width:1600,height:1100});await p.getByRole('button',{name:'全屏',exact:true}).click();await p.locator('.classroom-workspace:fullscreen').waitFor();await p.locator('.classroom-fullscreen-controls .l6-playback').waitFor();await p.getByRole('button',{name:'下一幕',exact:true}).click();await p.screenshot({path:`${out}/final-teacher-fullscreen.png`});checks.push('teacher/fullscreen');
  }
  await ctx.close();
 }
 for(let sheet=1;sheet<=4;sheet++){await page.setViewportSize({width:1600,height:1500});await page.goto(`file:///${process.cwd().replaceAll('\\','/')}/${out}/contact-${sheet}.html`);await page.screenshot({path:`${out}/contact-${sheet}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);await writeFile(`${out}/visual-review.json`,JSON.stringify({checks,mapFourLayers:true,errors},null,2));console.log(`PASS ${checks.length} final visual states and four geographic layers`);
}finally{await browser.close();}
