import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base='http://127.0.0.1:5191',out='output/port-performance-safety-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function tools(){if(!await page.getByRole('slider',{name:'动画进度'}).count()){if(!await page.getByRole('button',{name:'演示工具',exact:true}).count())await page.getByRole('button',{name:'更多工具',exact:true}).click();await page.getByRole('button',{name:'演示工具',exact:true}).click();}}
async function close(){if(await page.getByRole('button',{name:'关闭工具面板'}).count())await page.getByRole('button',{name:'关闭工具面板'}).click();}
async function inspect(label){await page.waitForFunction(()=>[...document.querySelectorAll('.port-expansion-slide img')].every(i=>i.complete&&i.naturalWidth));const r=await page.evaluate(()=>{const c=document.querySelector('.port-expansion-slide'),b=c.getBoundingClientRect();return {ratio:b.width/b.height,overflow:[...c.querySelectorAll('svg text,h1,.pe-heading>p,.pe-observations p,footer,.pe-answer,.pe-option-label')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2||el instanceof HTMLElement&&el.scrollWidth>el.clientWidth+2);}).map(el=>el.textContent),docOverflow:document.documentElement.scrollWidth>innerWidth+2,leaks:/teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/.test(c.outerHTML)};});assert.ok(Math.abs(r.ratio-1.6)<.01,label);assert.deepEqual(r.overflow,[],label);assert.ok(!r.docOverflow,label);assert.ok(!r.leaks,label);results.push({label,...r});}
try{
 for(const lesson of [11,12])for(const width of [1600,390])for(const mode of ['teacher','projection','student']){
  await page.setViewportSize({width,height:width===1600?1100:844});const channel=`ps-${lesson}-${width}-${mode}`;await page.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&channel=${channel}${mode==='teacher'?'':`&${mode}=1`}`);
  for(let n=1;n<=48;n++){
   if(mode==='projection')await page.evaluate(({lesson,n,channel})=>{const c=new BroadcastChannel('port-expansion:'+channel);c.postMessage({type:'state',lesson,n,state:{progress:1,option:0,revealed:false}});c.close();},{lesson,n,channel});
   else await page.getByLabel('当前页码',{exact:true}).fill(String(n));
   await page.locator(`[aria-label="第${lesson}讲第${n}页"]`).waitFor();
   if(mode==='teacher'){await tools();await page.getByRole('button',{name:'全景',exact:true}).click();await close();assert.equal(await page.locator('.presentation-toolbar').count(),1);}
   else assert.equal(await page.locator('.pe-playback,.pe-guide').count(),0);
   await inspect(`${lesson}/${mode}/${width}/${n}`);
   if(mode==='projection'&&width===1600)await page.locator('.port-expansion-slide').screenshot({path:`${out}/slide-${lesson}-${String(n).padStart(2,'0')}.png`});
  }console.log(`PASS ${lesson}/${mode}/${width}: 48 pages`);
 }
 await page.setViewportSize({width:1600,height:1100});
 for(const lesson of [11,12]){await page.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&channel=ps-motion-${lesson}`);
  for(let n=1;n<=48;n++){await page.getByLabel('当前页码',{exact:true}).fill(String(n));await tools();const select=page.getByLabel('演示选项',{exact:true}),count=await select.count()?await select.locator('option').count():1;
   for(let option=0;option<count;option++){if(count>1)await select.selectOption(String(option));for(const progress of ['0','500','1000']){await page.getByLabel('动画进度',{exact:true}).fill(progress);await inspect(`motion/${lesson}/${n}/${option}/${progress}`);}
    if(await page.getByRole('button',{name:'揭示解析',exact:true}).count()){await page.getByRole('button',{name:'揭示解析',exact:true}).click();await inspect(`reveal/${lesson}/${n}/${option}`);await page.locator('.port-expansion-slide').screenshot({path:`${out}/reveal-${lesson}-${n}.png`});await page.getByRole('button',{name:'收起解析',exact:true}).click();}
   }
  }
 }
 await page.goto(`${base}/port-expansion-preview.html?lesson=11&page=37&channel=ps-sync`);await tools();await page.getByRole('button',{name:'全景',exact:true}).click();await page.getByLabel('演示选项').selectOption('2');await page.getByLabel('动画进度').fill('375');await close();
 await page.getByRole('button',{name:'网页全屏',exact:true}).click();await tools();assert.equal(await page.getByLabel('动画进度').inputValue(),'375');assert.equal(await page.getByLabel('演示选项').inputValue(),'2');assert.equal(await page.locator('.presentation-toolbar').count(),1);await close();await page.keyboard.press('Escape');
 const follower=await context.newPage();await follower.goto(`${base}/port-expansion-preview.html?projection=1&channel=ps-sync`);await follower.locator('[aria-label="第11讲第37页"]').waitFor();await follower.getByText('速度权重25%',{exact:true}).waitFor();assert.equal(await follower.locator('.presentation-toolbar,.pe-playback,.pe-guide').count(),0);
 await page.reload();await tools();assert.equal(await page.getByLabel('动画进度').inputValue(),'375');assert.equal(await page.getByLabel('演示选项').inputValue(),'2');
 await page.getByLabel('当前页码').fill('38');await tools();await page.getByRole('button',{name:'揭示解析',exact:true}).click();await follower.locator('.pe-answer').waitFor();await page.getByRole('button',{name:'收起解析',exact:true}).click();await follower.locator('.pe-answer').waitFor({state:'detached'});
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/browser.json`,JSON.stringify({results,errors,oneToolbar:true,pageFullscreenContinuity:true,projectionSync:true,refreshRestore:true},null,2));console.log(`PASS ${results.length} states and shell continuity`);
}catch(e){await page.screenshot({path:`${out}/browser-failure.png`}).catch(()=>{});await fs.writeFile(`${out}/browser-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
