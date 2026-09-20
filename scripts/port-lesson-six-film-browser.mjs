import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L6_URL??'http://127.0.0.1:5173',out='output/port-lesson-six-film',smoke=process.argv.includes('--smoke'),filmsOnly=process.argv.includes('--films-only');
const pageNumbers=filmsOnly?[25,26,27,29,31,32,33,34,35,36,37,38]:smoke?[1,8,15,20,26,31,33,34,38,41,48]:Array.from({length:48},(_,i)=>i+1);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']}),results=[],errors=[];
const context=await browser.newContext(),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
async function inspect(label){
  if(await p.locator('.l6-film').count()){await p.bringToFront();await p.locator('.earth-globe--ready').waitFor({timeout:60000});await p.waitForTimeout(100);}
  await p.waitForFunction(()=>[...document.querySelectorAll('.port-l6-slide img')].every(i=>i.complete&&i.naturalWidth>0));
  const r=await p.evaluate(()=>{
    const c=document.querySelector('.port-l6-slide'),b=c.getBoundingClientRect();
    const overflow=[...c.querySelectorAll('[data-l6-bounds],svg text,.l6-points p,.l6-answer')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2||el instanceof HTMLElement&&el.clientWidth>0&&el.scrollWidth>el.clientWidth+3);}).map(el=>el.textContent);
    const leaks=[...c.querySelectorAll('*')].flatMap(el=>[...el.attributes].filter(a=>/teaching|assistant|story-beat|voyage-stage|open-question/.test(a.name)).map(a=>a.name));
    return {ratio:b.width/b.height,overflow,leaks,docOverflow:document.documentElement.scrollWidth>innerWidth+2,text:c.textContent};
  });
  assert.ok(Math.abs(r.ratio-1.6)<.01,label);assert.deepEqual(r.overflow,[],label);assert.deepEqual(r.leaks,[],label);assert.ok(!r.docOverflow,label);assert.doesNotMatch(r.text,/让学生|告诉学生|本页助手边界/);results.push({label,ratio:r.ratio});
}
try{
 for(const width of [1600,390])for(const mode of ['teacher','projection','student']){
  await p.setViewportSize({width,height:width===1600?1100:844});
  for(const n of pageNumbers){
   if(n===pageNumbers[0])await p.goto(`${base}/port-lesson-six-preview.html?page=${n}&channel=audit-${mode}-${width}${mode==='teacher'?'':`&${mode}=1`}`);
   else if(mode==='projection')await p.evaluate(({n,channel})=>{const c=new BroadcastChannel('port-l6:teacher:'+channel);c.postMessage({type:'state',n,state:{progress:1,option:n===33?2:n===29?1:0,revealed:false}});c.close();},{n,channel:`audit-${mode}-${width}`});
   else await p.getByLabel('第6讲课件页',{exact:true}).selectOption(String(n));
   await p.locator(`.port-l6-slide[aria-label="第6讲第${n}页"]`).waitFor();
   await p.locator('.port-l6-slide').waitFor();if(mode!=='projection')await p.getByRole('button',{name:'全景',exact:true}).click();
   await inspect(`${mode}/${width}/${n}`);
   if(mode==='projection'&&width===1600)await p.locator('.port-l6-slide').screenshot({path:`${out}/slide-${String(n).padStart(2,'0')}.png`});
   if(width===390&&[1,26,41].includes(n))await p.screenshot({path:`${out}/${mode}-390-${n}.png`});
  }
  console.log(`Checked ${mode} / ${width}px`);
 }
 await p.setViewportSize({width:1600,height:1100});
 for(const n of pageNumbers){
  await p.goto(`${base}/port-lesson-six-preview.html?page=${n}&channel=motion-${n}`);const slider=p.getByRole('slider',{name:'动画进度'});await slider.waitFor();
  const select=p.getByRole('combobox',{name:'演示选项'}),options=await select.count()?await select.locator('option').count():1;
  for(let option=0;option<options;option++){
   if(options>1)await select.selectOption(String(option));
   for(const value of ['0','500','1000']){await slider.fill(value);await inspect(`motion/${n}/${option}/${value}`);if([8,15,20,26,33,38,41].includes(n))await p.locator('.port-l6-slide').screenshot({path:`${out}/motion-${n}-${option}-${value}.png`});}
   if(await p.getByRole('button',{name:'揭示解析',exact:true}).count()){await p.getByRole('button',{name:'揭示解析',exact:true}).click();await inspect(`reveal/${n}/${option}`);await p.locator('.port-l6-slide').screenshot({path:`${out}/reveal-${n}-${option}.png`});await p.getByRole('button',{name:'收起解析',exact:true}).click();}
  }
 }
 await p.goto(`${base}/port-lesson-six-preview.html?page=41&channel=linked`);await p.getByRole('button',{name:'全景',exact:true}).click();
 const follower=await context.newPage();await follower.goto(`${base}/port-lesson-six-preview.html?page=1&projection=1&channel=linked`);
 await follower.locator('.port-l6-slide[aria-label="第6讲第41页"]').waitFor();await p.getByRole('button',{name:'揭示解析',exact:true}).click();await follower.getByText(/A为4,400元/).waitFor();assert.equal(await follower.locator('.l6-playback,.l6-guide').count(),0);
 await p.reload();await p.getByRole('button',{name:'收起解析',exact:true}).waitFor();await p.getByRole('button',{name:'收起解析',exact:true}).click();await follower.waitForFunction(()=>!document.querySelector('.port-l6-slide').textContent.includes('A为4,400元'));
 await p.goto(`${base}/port-lesson-six-preview.html?page=8&channel=play-test`);const slider=p.getByRole('slider',{name:'动画进度'});await slider.waitFor();await slider.fill('0');await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(()=>Number(document.querySelector('.l6-playback input').value)>20);await p.getByRole('button',{name:'暂停',exact:true}).click();const paused=await slider.inputValue();await p.waitForTimeout(180);assert.equal(await slider.inputValue(),paused);
 await p.getByRole('button',{name:'下一幕',exact:true}).click();assert.ok(Number(await slider.inputValue())>Number(paused));await slider.fill('375');await p.reload();assert.equal(await slider.inputValue(),'375');
 await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'播放',exact:true}).click();assert.equal(await slider.inputValue(),'1000');await p.emulateMedia({reducedMotion:'no-preference'});
 await fs.writeFile(`${out}/browser${filmsOnly?'-films':smoke?'-smoke':''}.json`,JSON.stringify({results,errors,projectionSync:true,refreshRestore:true,pauseResume:true,reducedMotion:true},null,2));assert.deepEqual(errors,[]);console.log(`PASS ${results.length} checked states`);
}catch(e){await p.screenshot({path:`${out}/browser-failure.png`}).catch(()=>{});await fs.writeFile(`${out}/browser-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
