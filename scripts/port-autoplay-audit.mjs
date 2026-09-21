import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_AUTOPLAY_URL??'http://127.0.0.1:5188',out='output/port-autoplay-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:1600,height:1100}});p.on('pageerror',e=>errors.push(e.message));
 const start=new Date('2026-09-21T00:00:00Z');await p.clock.install({time:start});await p.clock.pauseAt(start);
 await p.goto(base+'/port-expansion-preview.html?lesson=7');await p.getByLabel('动画进度').waitFor();
 const fixtures=await p.evaluate(async()=>{const m=await import('/@fs/D:/codes/edu-sys/packages/course-content/src/index.ts');return [
  {name:'2–3',path:'port-lbl-preview.html',select:'选择课件页',pages:m.PORT_LBL_SLIDES.map((_,i)=>i)},
  {name:'4',path:'port-lesson-four-preview.html',select:'第4讲课件页',pages:m.PORT_LESSON_FOUR_SLIDES.filter(p=>p.animationSeconds).map(p=>p.localPage),staticPage:1},
  {name:'5',path:'port-lesson-five-preview.html',select:'第5讲课件页',pages:m.PORT_LESSON_FIVE_SLIDES.filter(p=>p.animationSeconds).map(p=>p.localPage),staticPage:1},
  {name:'6',path:'port-lesson-six-preview.html',select:'第6讲课件页',pages:m.PORT_LESSON_SIX_SLIDES.map(p=>p.localPage)},
  ...[7,8].map(n=>({name:String(n),path:`port-expansion-preview.html?lesson=${n}`,select:'课件页',pages:Array.from({length:48},(_,i)=>i+1)}))
 ];});
 for(const f of fixtures.filter(f=>(!process.argv.includes('--from-four')||f.name!=='2–3')&&(!process.argv.includes('--lbl-only')||f.name==='2–3'))){
  const url=(n,suffix='')=>`${base}/${f.path}${f.path.includes('?')?'&':'?'}page=${n}&channel=auto-${f.name}${suffix}`;
  await p.goto(url(f.pages[0]));await p.getByLabel('动画进度',{exact:true}).waitFor();
  for(const n of f.pages){
   await p.getByLabel(f.select,{exact:true}).selectOption(String(n));const progress=p.getByLabel('动画进度',{exact:true});await progress.waitFor();
   assert.equal(await progress.inputValue(),'0',`${f.name}/${n} entry`);
   await p.clock.fastForward(1999);assert.equal(await progress.inputValue(),'0',`${f.name}/${n} too early`);
   await p.clock.runFor(1);await p.getByRole('button',{name:'暂停',exact:true}).waitFor();
   await p.clock.runFor(100);assert.ok(Number(await progress.inputValue())>0,`${f.name}/${n} did not advance`);
   await p.getByRole('button',{name:'暂停',exact:true}).click();const paused=await progress.inputValue();await p.clock.fastForward(2200);assert.equal(await progress.inputValue(),paused,`${f.name}/${n} pause`);
   assert.equal(await p.getByLabel(f.select,{exact:true}).inputValue(),String(n),'no auto advance');
   checks.push({lesson:f.name,page:n,delayMs:2000,pause:true});if(checks.length%20===0)console.log(`Checked ${checks.length} pages`);
  }
  // Page departure clears its timer; manual seeking supersedes the next timer.
  await p.goto(url(f.pages[0],'-cleanup'));await p.getByLabel('动画进度',{exact:true}).waitFor();await p.clock.fastForward(1500);
  await p.getByLabel(f.select,{exact:true}).selectOption(String(f.pages[1]));await p.clock.runFor(600);assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'0');
  await p.getByLabel('动画进度',{exact:true}).fill('375');await p.clock.fastForward(5000);assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'375');
  // Reload preserves the saved position, then resumes automatically after two seconds.
  if(f.name!=='2–3'){await p.reload();await p.getByLabel('动画进度',{exact:true}).waitFor();assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'375');await p.clock.fastForward(1999);assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'375');await p.clock.runFor(1);await p.getByRole('button',{name:'暂停',exact:true}).waitFor();await p.clock.runFor(100);assert.ok(Number(await p.getByLabel('动画进度',{exact:true}).inputValue())>375);}
  if(f.staticPage){await p.getByLabel(f.select,{exact:true}).selectOption(String(f.staticPage));await p.clock.fastForward(5000);assert.equal(await p.getByLabel('动画进度',{exact:true}).count(),0);}
  console.log(`PASS lesson ${f.name}: ${f.pages.length} animated pages`);
 }
 // Read-only projection cannot start its own playback or disclose an answer.
 for(const lesson of [7,8]){
  await p.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=34&projection=1&channel=readonly-${lesson}`);await p.locator('.port-expansion-slide').waitFor();const html=await p.locator('.port-expansion-slide').innerHTML();await p.clock.fastForward(6000);assert.equal(await p.locator('.port-expansion-slide').innerHTML(),html);assert.equal(await p.locator('.pe-playback,.pe-answer').count(),0);
 }
 // Narrow viewport playback and reduced-motion final frames.
 await p.setViewportSize({width:390,height:844});
 for(const lesson of [7,8]){
  await p.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=13&channel=narrow-${lesson}`);await p.getByLabel('动画进度',{exact:true}).waitFor();await p.clock.fastForward(2000);await p.getByRole('button',{name:'暂停',exact:true}).waitFor();await p.clock.runFor(100);await p.screenshot({path:`${out}/lesson-${lesson}-390.png`});assert.ok(Number(await p.getByLabel('动画进度',{exact:true}).inputValue())>0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }
 await p.emulateMedia({reducedMotion:'reduce'});
 for(const f of fixtures){await p.goto(`${base}/${f.path}${f.path.includes('?')?'&':'?'}page=${f.pages[0]}&channel=reduced`);await p.getByLabel('动画进度',{exact:true}).waitFor();await p.clock.runFor(2600);assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'1000');assert.equal(await p.getByRole('button',{name:'暂停',exact:true}).count(),0);}
 await p.goto(`${base}/port-lesson-six-preview.html?page=26&channel=reduced-film`);await p.getByLabel('动画进度',{exact:true}).waitFor();await p.clock.runFor(2600);assert.equal(await p.getByLabel('动画进度',{exact:true}).inputValue(),'1000');assert.equal(await p.getByRole('button',{name:'暂停',exact:true}).count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/browser${process.argv.includes('--lbl-only')?'-lbl':''}.json`,JSON.stringify({checks,errors,timerCleanup:true,manualOverride:true,restoreThenResume:true,readOnly:true,narrow:true,reducedMotion:true},null,2));console.log(`PASS ${checks.length} animated pages`);
}finally{await browser.close();}
