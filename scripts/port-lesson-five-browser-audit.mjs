import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L5_URL??'http://127.0.0.1:5173',out='output/port-lesson-five-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[],errors=[];const smoke=process.argv.includes('--smoke');
try{
 const context=await browser.newContext();const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 for(const width of smoke?[1600]:[1600,390])for(const mode of ['teacher','projection','student']){
  await p.setViewportSize({width,height:width===1600?1100:844});
  for(const n of smoke?[1,6,12,19,20,23,27,29,34,41,45,48]:Array.from({length:48},(_,i)=>i+1)){
   await p.goto(`${base}/port-lesson-five-preview.html?page=${n}${mode==='teacher'?'':`&${mode}=1`}`);
   await p.locator('.port-l5-slide').waitFor();
   if(mode==='teacher'&&await p.getByRole('button',{name:'全景',exact:true}).count())await p.getByRole('button',{name:'全景',exact:true}).click();
   await p.waitForFunction(()=>[...document.querySelectorAll('.port-l5-slide img')].every(i=>i.complete&&i.naturalWidth>0));
   const r=await p.evaluate(()=>{
    const c=document.querySelector('.port-l5-slide'),r=c.getBoundingClientRect();
    const elements=[...c.querySelectorAll('[data-l5-bounds],svg text')];
    const overflow=elements.filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2||(e.clientWidth>0&&e.scrollWidth>e.clientWidth+3));}).map(e=>e.textContent?.slice(0,80));
    const leaks=[...c.querySelectorAll('*')].flatMap(e=>[...e.attributes].filter(a=>/teaching|assistant|story-beat|voyage-stage|open-question/.test(a.name)).map(a=>a.name));
    return {ratio:r.width/r.height,overflow,leaks,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,composition:c.getAttribute('aria-label'),text:c.textContent};
   });
   assert.ok(Math.abs(r.ratio-1.6)<.01,`${width}/${mode}/${n} ratio`);assert.deepEqual(r.overflow,[],`${width}/${mode}/${n} overflow`);assert.deepEqual(r.leaks,[]);assert.equal(r.pageOverflow,false,`${width}/${mode}/${n} page overflow`);
   assert.doesNotMatch(r.text,/让学生|告诉学生|教师讲授与操作|本页助手边界/);
   if(n===45)assert.ok(!r.text.includes('这些观察支持运输接续值得关注'));
   if(width===1600&&mode==='projection')await p.locator('.port-l5-slide').screenshot({path:`${out}/slide-${String(n).padStart(2,'0')}.png`});
   if(width===390&&[1,20,41,45].includes(n))await p.screenshot({path:`${out}/${mode}-390-${n}.png`});
   results.push({width,mode,n,composition:r.composition});
  }
  console.log(`Checked ${mode} at ${width}px`);
 }
 // Every animated page: teacher-controlled start, half-way and final state, plus reduced motion.
 const motion=[3,5,6,7,8,9,11,13,14,15,20,23,26,27,28,29,30,33,38,39,40,41,42,48];
 await p.setViewportSize({width:1600,height:1100});
 for(const n of smoke?[3,41]:motion){await p.goto(`${base}/port-lesson-five-preview.html?page=${n}&channel=motion-${n}`);const slider=p.getByRole('slider',{name:'动画进度'});await slider.waitFor();for(const value of ['0','500','1000']){await slider.fill(value);assert.equal(await slider.inputValue(),value);await p.locator('.port-l5-slide').screenshot({path:`${out}/motion-${n}-${value}.png`});}}
 for(const n of [6,28]){await p.goto(`${base}/port-lesson-five-preview.html?page=${n}&channel=manual-${Date.now()}`);const slider=p.getByRole('slider',{name:'动画进度'});await slider.waitFor();await p.waitForTimeout(1300);assert.equal(await slider.inputValue(),'0');await p.getByRole('button',{name:'下一幕',exact:true}).click();assert.equal(await slider.inputValue(),'250');}
 await p.goto(`${base}/port-lesson-five-preview.html?page=3&channel=autoplay-${Date.now()}`);const auto=p.getByRole('slider',{name:'动画进度'});await auto.waitFor();assert.equal(await auto.inputValue(),'0');await p.waitForFunction(()=>Number(document.querySelector('.l5-playback input')?.value)>0);await p.getByRole('button',{name:'暂停',exact:true}).click();const paused=await auto.inputValue();await p.waitForTimeout(300);assert.equal(await auto.inputValue(),paused);await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.l5-playback input')?.value==='1000',{},{timeout:20000});await p.waitForTimeout(400);assert.equal(await auto.inputValue(),'1000');
 await p.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await p.goto(`${base}/port-lesson-five-preview.html?page=3&channel=reduced`);await p.getByRole('slider',{name:'动画进度'}).waitFor();assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),'1000');
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.goto(`${base}/port-lesson-five-preview.html?page=45&channel=reveal`);await p.getByRole('button',{name:'揭示解析',exact:true}).click();assert.match(await p.locator('.port-l5-slide').innerText(),/这些观察支持运输接续值得关注/);await p.reload();await p.getByRole('button',{name:'收起解析',exact:true}).waitFor();await p.getByRole('button',{name:'收起解析',exact:true}).click();assert.doesNotMatch(await p.locator('.port-l5-slide').innerText(),/这些观察支持运输接续值得关注/);
 // Verify teacher and projection use the same state and teacher controls never enter the follower DOM.
 const follower=await p.context().newPage();await p.goto(`${base}/port-lesson-five-preview.html?page=45&channel=linked`);await follower.goto(`${base}/port-lesson-five-preview.html?page=1&projection=1&channel=linked`);await follower.waitForFunction(()=>document.querySelector('.port-l5-slide')?.getAttribute('aria-label')==='第5讲第45页');await p.getByRole('button',{name:'揭示解析',exact:true}).click();await follower.waitForFunction(()=>document.querySelector('.port-l5-slide')?.textContent.includes('这些观察支持运输接续值得关注'));assert.equal(await follower.locator('.l5-playback,.l5-guide').count(),0);await follower.close();
 await fs.writeFile(`${out}/browser.json`,JSON.stringify({results,motionPages:motion.length,errors,revealRestore:true,projectionSync:true,reducedMotion:true,manualWorkedAnswers:true,sceneAutoplayOnce:true,pauseResume:true},null,2));assert.deepEqual(errors,[]);console.log(`PASS ${results.length} page states`);
}catch(e){await fs.writeFile(`${out}/browser-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
