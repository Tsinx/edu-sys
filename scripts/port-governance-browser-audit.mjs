import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_EXPANSION_URL??'http://127.0.0.1:5188',out='output/port-governance-qa',smoke=process.argv.includes('--smoke');
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true}),context=await browser.newContext(),p=await context.newPage(),errors=[],results=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function inspect(label){
 await p.waitForFunction(()=>[...document.querySelectorAll('.port-expansion-slide img')].every(i=>i.complete&&i.naturalWidth>0));
 const r=await p.evaluate(()=>{const c=document.querySelector('.port-expansion-slide'),b=c.getBoundingClientRect();const bounds=[...c.querySelectorAll('svg text,h1,.pe-heading>p,.pe-observations p,footer,.pe-answer,.pe-option-label')];return {ratio:b.width/b.height,overflow:bounds.filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2||el instanceof HTMLElement&&el.clientWidth>0&&el.scrollWidth>el.clientWidth+2);}).map(e=>e.textContent),docOverflow:document.documentElement.scrollWidth>innerWidth+2,leaks:/teachingCue|assistantCue|storyBeat|voyageStage|data-slide-composition|让学生|告诉学生/.test(c.outerHTML),broken:[...c.querySelectorAll('img')].filter(i=>!i.naturalWidth).length};});
 assert.ok(Math.abs(r.ratio-1.6)<.01,label);assert.deepEqual(r.overflow,[],label);assert.ok(!r.docOverflow,label);assert.ok(!r.leaks,label);assert.equal(r.broken,0,label);results.push({label,...r});
}
try{
 for(const lesson of [9,10])for(const width of [1600,390])for(const mode of ['teacher','projection','student']){
  await p.setViewportSize({width,height:width===1600?1100:844});const channel=`audit-${lesson}-${width}-${mode}`;
  await p.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&channel=${channel}${mode==='teacher'?'':`&${mode}=1`}`);
  for(const n of smoke?[1,8,13,19,27,31,34,39,48]:Array.from({length:48},(_,i)=>i+1)){
   if(mode==='projection')await p.evaluate(({n,lesson,channel})=>{const c=new BroadcastChannel('port-expansion:'+channel);c.postMessage({type:'state',lesson,n,state:{progress:1,option:0,revealed:false}});c.close();},{n,lesson,channel});
   else await p.getByLabel('课件页',{exact:true}).selectOption(String(n));
   await p.locator(`.port-expansion-slide[aria-label="第${lesson}讲第${n}页"]`).waitFor();if(mode==='teacher')await p.getByRole('button',{name:'全景',exact:true}).click();
   await inspect(`${lesson}/${mode}/${width}/${n}`);
   if(mode==='projection'&&width===1600)await p.locator('.port-expansion-slide').screenshot({path:`${out}/slide-${lesson}-${String(n).padStart(2,'0')}.png`});
   if(mode!=='teacher')assert.equal(await p.locator('.pe-playback,.pe-guide').count(),0);
   if(width===390&&[1,19,39].includes(n))await p.screenshot({path:`${out}/${lesson}-${mode}-390-${n}.png`});
  }
  console.log(`Checked lesson ${lesson} ${mode} ${width}px`);
 }
 await p.setViewportSize({width:1600,height:1100});
 for(const lesson of [9,10])for(const n of smoke?[6,13,19,29,31,34,39]:Array.from({length:48},(_,i)=>i+1)){
  await p.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=${n}&channel=motion-${lesson}-${n}`);const slider=p.getByRole('slider',{name:'动画进度'});await slider.waitFor();const options=p.getByRole('combobox',{name:'演示选项'}),count=await options.count()?await options.locator('option').count():1;
  for(let option=0;option<count;option++){if(count>1)await options.selectOption(String(option));for(const value of ['0','500','1000']){await slider.fill(value);await inspect(`motion/${lesson}/${n}/${option}/${value}`);}
   if(await p.getByRole('button',{name:'揭示解析',exact:true}).count()){await p.getByRole('button',{name:'揭示解析',exact:true}).click();await inspect(`reveal/${lesson}/${n}/${option}`);await p.locator('.port-expansion-slide').screenshot({path:`${out}/reveal-${lesson}-${n}-${option}.png`});await p.getByRole('button',{name:'收起解析',exact:true}).click();}
  }
 }
 await p.goto(`${base}/port-expansion-preview.html?lesson=10&page=16&channel=sync`);await p.getByRole('button',{name:'全景',exact:true}).click();const follower=await context.newPage();await follower.goto(`${base}/port-expansion-preview.html?projection=1&channel=sync`);await follower.locator('[aria-label="第10讲第16页"]').waitFor();await p.getByRole('combobox',{name:'演示选项'}).selectOption('2');await follower.getByText('时间折算400元/箱日',{exact:true}).waitFor();await p.getByLabel('课件页',{exact:true}).selectOption('17');await p.getByRole('button',{name:'揭示解析',exact:true}).click();await follower.locator('.pe-answer').waitFor();assert.equal(await follower.locator('.pe-playback,.pe-guide').count(),0);
 await p.reload();await p.getByRole('button',{name:'收起解析',exact:true}).waitFor();await p.getByRole('button',{name:'收起解析',exact:true}).click();await follower.locator('.pe-answer').waitFor({state:'detached'});await p.getByRole('slider',{name:'动画进度'}).fill('375');await p.reload();assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),'375');
 await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(()=>Number(document.querySelector('.pe-playback input').value)>390);await p.getByRole('button',{name:'暂停',exact:true}).click();const value=await p.getByRole('slider',{name:'动画进度'}).inputValue();await p.waitForTimeout(150);assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),value);await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'播放',exact:true}).click();assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),'1000');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/browser${smoke?'-smoke':''}.json`,JSON.stringify({results,errors,projectionSync:true,refreshRestore:true,pauseResume:true,reducedMotion:true},null,2));console.log(`PASS ${results.length} page states + interaction checks`);
}catch(e){await p.screenshot({path:`${out}/browser-failure.png`}).catch(()=>{});await fs.writeFile(`${out}/browser-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
