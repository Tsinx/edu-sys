import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L5_URL??'http://127.0.0.1:5173',api=process.env.PORT_L5_API??'http://127.0.0.1:4315',out='output/port-lesson-five-qa';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[];let p,s;
async function setup(role){const context=await browser.newContext({viewport:{width:1600,height:1100}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});assert.equal((await context.request.post(api+'/api/identity/development/session',{data:{role,displayName:`第5讲验收${role}`}})).status(),201);return page;}
const ready=async page=>{await page.locator('.l5-lab-status').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('.l5-lab-status')?.textContent.includes('正在计算'));assert.equal(await page.getByRole('alert').count(),0);};
const record=async page=>page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('edu:l5:')&&!k.includes(':archive:')).map(([key,value])=>({key,...JSON.parse(value)})));
async function screen(page,label){const r=await page.evaluate(()=>{const c=document.querySelector('.port-l5-slide'),b=c.getBoundingClientRect();const overflow=[...c.querySelectorAll('[data-l5-bounds],svg text')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(el=>el.textContent);return {ratio:b.width/b.height,overflow,width:b.width,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,leaks:/teachingCue|assistantCue|storyBeat|voyageStage|data-slide-composition/.test(c.outerHTML)};});assert.ok(Math.abs(r.ratio-1.6)<.01,label);assert.deepEqual(r.overflow,[],label);assert.ok(!r.leaks,label);assert.ok(!r.pageOverflow,label);results.push({label,...r});}
try{
 p=await setup('teacher');s=await setup('student');
 const session=await(await p.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json(),root=api+`/api/class-sessions/${session.id}`;
 const event=async data=>{const r=await p.request.post(root+'/events',{data});assert.ok(r.ok(),await r.text());return r.json();};
 const snapshot=async()=>await(await p.request.get(root+'/snapshot')).json();
 await event({type:'set_slide',index:198});await p.goto(base+`/classroom/${session.id}`);await s.goto(base+`/join/${session.id}`);
 await p.locator('.port-l5-slide').waitFor({timeout:60000});await s.locator('.port-l5-slide').waitFor({timeout:60000});
 const denied=await s.request.post(root+'/events',{data:{type:'set_lesson_five_presentation',slideKey:'l5-cover',progress:1,revealed:false}});assert.equal(denied.status(),403);
 for(const width of [1600,390]){
  await p.setViewportSize({width,height:width===1600?1100:844});await s.setViewportSize({width,height:width===1600?1100:844});
  for(const n of process.argv.includes('--interactions')?[3,8,20,41,45]:Array.from({length:48},(_,i)=>i+1)){
   await event({type:'set_slide',index:197+n});
   for(const [page,role] of [[p,'teacher'],[s,'student']]){
    await page.locator(`.port-l5-slide[aria-label="第5讲第${n}页"]`).waitFor();
    if(role==='teacher'&&await page.getByRole('button',{name:'全景',exact:true}).count())await page.getByRole('button',{name:'全景',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.port-l5-slide img')].every(i=>i.complete&&i.naturalWidth>0));
    await screen(page,`${role}/${width}/${n}`);
    for(const button of await page.locator('.l5-playback button').all()){assert.equal(await button.evaluate(e=>getComputedStyle(e).color),'rgb(33, 61, 72)','playback button contrast');}
    if(width===1600)await page.locator('.port-l5-slide').screenshot({path:`${out}/class-${role}-${String(n).padStart(2,'0')}.png`});
    else if([1,20,41,45].includes(n))await page.screenshot({path:`${out}/class-${role}-390-${n}.png`});
   }
  }
  assert.equal(await p.locator('.classroom-toast--error').count(),0,'stale presentation packets do not show an error');console.log(`Classroom: teacher/student pages at ${width}px`);
 }
 await p.setViewportSize({width:1600,height:1100});await s.setViewportSize({width:1600,height:1100});
 await event({type:'set_slide',index:242});await p.getByRole('button',{name:'揭示解析',exact:true}).click();await s.waitForFunction(()=>document.querySelector('.port-l5-slide')?.textContent.includes('这些观察支持运输接续值得关注'));
 assert.equal(await s.locator('.l5-playback').count(),0);await p.reload();await p.getByRole('button',{name:'收起解析',exact:true}).waitFor();await p.getByRole('button',{name:'收起解析',exact:true}).click();
 await event({type:'set_slide',index:238});await p.getByRole('slider',{name:'动画进度'}).fill('375');await p.waitForFunction(()=>document.querySelector('.l5-playback output')?.textContent==='38%');
 await p.waitForTimeout(700);assert.equal((await snapshot()).lessonFivePresentation.progress,.375);await p.reload();await p.getByRole('slider',{name:'动画进度'}).waitFor();assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),'375');
 await event({type:'set_slide',index:216});await p.getByRole('button',{name:'打开教师演示'}).click();await ready(p);const demoUrl=p.url();
 assert.match(await p.locator('.l5-lab-status').innerText(),/尚未开工/);await p.getByRole('button',{name:'运行至下一观察点',exact:true}).click();await ready(p);assert.match(await p.locator('.l5-lab-status').innerText(),/1:00:00/);
 const oneHour=(await record(p))[0];await p.reload();await ready(p);assert.equal((await record(p))[0].raw,oneHour.raw);
 await p.getByRole('button',{name:'运行至完成',exact:true}).click();await ready(p);assert.match(await p.locator('.l5-lab-status').innerText(),/已完成[\s\S]*12:48:50/);
 assert.equal((await record(s)).length,0,'teacher demo does not write student records');
 for(const [plan,time] of [['B','13:01:40'],['D','4:02:30'],['E','4:02:30']]){await p.getByRole('combobox',{name:'演示方案'}).selectOption(plan);await ready(p);assert.match(await p.locator('.l5-lab-status').innerText(),/尚未开工/);await p.getByRole('button',{name:'运行至完成',exact:true}).click();await ready(p);assert.ok((await p.locator('.l5-lab-status').innerText()).includes(time));}
 await p.getByRole('combobox',{name:'演示方案'}).selectOption('A');await ready(p);assert.match(await p.locator('.l5-lab-status').innerText(),/12:48:50/);
 await p.screenshot({path:`${out}/lab-teacher-complete.png`});
 await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.port-l5-slide[aria-label="第5讲第19页"]').waitFor();assert.equal((await snapshot()).simulationNavigation,null);
 await p.getByRole('button',{name:'打开教师演示'}).click();await ready(p);assert.match(await p.locator('.l5-lab-status').innerText(),/12:48:50/);
 await s.getByRole('link',{name:'进入个人C实验',exact:true}).click();await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/尚未开工/);assert.ok(!await s.getByRole('button',{name:'运行至完成',exact:true}).isEnabled());assert.ok(!await s.getByLabel('结果解释',{exact:true}).isEnabled());
 await s.getByLabel('瓶颈假设',{exact:true}).fill('如果运输接续受限，增加岗位会使本船装卸更早结束。');await s.getByLabel('可能推翻判断的观察',{exact:true}).fill('若同一起点下完成时间不缩短，则需要修订原判断。');
 await s.getByRole('button',{name:'运行至下一观察点',exact:true}).click();await ready(s);await s.reload();await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/1:00:00/);assert.equal(await s.locator('.l5-lab-comparison').count(),0);
 await s.getByRole('button',{name:'运行至完成',exact:true}).click();await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/已完成[\s\S]*6:33:48/);await s.getByLabel('结果解释',{exact:true}).fill('我只增加两个运输岗位；在相同终点下，C耗时23628秒，短于A的46130秒。还需要比较岸侧等待与其他共享资源。');
 const completed=(await record(s))[0];assert.equal(completed.mode,'execution');assert.equal(JSON.parse(completed.raw).plan,'C');
 const download=s.waitForEvent('download');await s.getByRole('button',{name:'导出记录',exact:true}).click();const file=await download;await file.saveAs(`${out}/personal-C.json`);assert.equal(JSON.parse(await fs.readFile(`${out}/personal-C.json`,'utf8')).interpretation,completed.interpretation);
 await s.screenshot({path:`${out}/lab-student-complete.png`});await s.setViewportSize({width:390,height:844});assert.ok(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await s.screenshot({path:`${out}/lab-student-390.png`,fullPage:true});
 await s.getByRole('button',{name:'归档并重置',exact:true}).click();await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/尚未开工/);assert.ok((await s.locator('summary').allTextContents()).some(t=>t.includes('已归档记录')));
 await s.locator('input[type=file]').setInputFiles(`${out}/personal-C.json`);await s.waitForFunction(()=>document.querySelector('.l5-lab-status')?.textContent.includes('6:33:48'));await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/6:33:48/);assert.equal((await record(s))[0].raw,completed.raw);
 await s.getByText('软件不可用时：记录分析',{exact:true}).click();await s.getByRole('button',{name:'使用A/C参考记录分析',exact:true}).click();await s.reload();await ready(s);assert.equal((await record(s))[0].mode,'analysis');assert.equal(await s.getByText('A/C过程证据 · 教师参考',{exact:true}).count(),1);
 // A compute failure preserves the last saved command and allows explicit record analysis.
 await s.evaluate(()=>{addEventListener('pagehide',()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('edu:l5:')&&!k.includes(':archive:'));const v=JSON.parse(localStorage.getItem(key));v.raw=JSON.stringify({version:'broken',plan:'C',commands:[]});localStorage.setItem(key,JSON.stringify(v));},{once:true});});await s.reload();await s.getByRole('alert').waitFor();assert.match(await s.getByRole('alert').innerText(),/计算失败，未标记完成/);await s.getByLabel('结果解释',{exact:true}).fill('记录分析：比较教师参考A/C的完成时间与1、2、4小时过程快照。');assert.ok(!await s.getByRole('button',{name:'运行至完成',exact:true}).isEnabled());
 await s.locator('input[type=file]').setInputFiles(`${out}/personal-C.json`);await s.waitForFunction(()=>document.querySelector('.l5-lab-status')?.textContent.includes('6:33:48'));await ready(s);await s.getByRole('link',{name:'← 返回课件',exact:true}).click();await s.locator('.port-l5-slide[aria-label="第5讲第19页"]').waitFor();
 // Study reading preserves its own page when returning from a personal experiment.
 await s.goto(base+'/study/course-port-management-intro');await s.locator('.study-deck select').selectOption('5');await s.locator('.port-l5-slide').waitFor();await s.getByLabel('当前讲页码',{exact:true}).fill('45');await s.getByLabel('当前讲页码',{exact:true}).press('Enter');await s.locator('.port-l5-slide[aria-label="第5讲第45页"]').waitFor();assert.equal(await s.getByRole('button',{name:'揭示解析',exact:true}).count(),0);await s.getByRole('link',{name:'第5讲个人C实验',exact:true}).click();await ready(s);assert.match(await s.locator('.l5-lab-status').innerText(),/尚未开工/);await s.getByRole('link',{name:'← 返回课件',exact:true}).click();await s.locator('.port-l5-slide[aria-label="第5讲第45页"]').waitFor();
 // Original lecture paths remain renderable after expanding the deck.
 await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.port-l5-slide').waitFor();
 for(const index of [1,61,107,154,163,197]){await event({type:'set_slide',index});await p.waitForTimeout(200);assert.ok(await p.locator('.slide-letterbox').count());assert.equal((await snapshot()).slide.index,index);}
 await p.goto(base+'/simulations?course=arrival');await p.locator('.port-ops').waitFor({timeout:60000});await p.screenshot({path:`${out}/original-simulation.png`});
 await fs.writeFile(`${out}/${process.argv.includes('--interactions')?'classroom-interactions':'classroom'}.json`,JSON.stringify({sessionId:session.id,results,errors,workerPlans:['A','B','C','D','E'],teacherStudentIsolation:true,refreshReplay:true,resetArchive:true,exportImport:true,analysisFallback:true,failedCompute:true,returnToSource:true,studyReturn:true,originalSimulation:true,revealSync:true,animationRestore:true,studentPermission403:true,regressionPages:[1,61,107,154,163,197]},null,2));assert.deepEqual(errors,[]);console.log('PASS classroom, Worker, records, sync, permissions and previous-lesson regression');
}catch(e){await p?.screenshot({path:`${out}/classroom-failure-teacher.png`}).catch(()=>{});await s?.screenshot({path:`${out}/classroom-failure-student.png`}).catch(()=>{});await fs.writeFile(`${out}/classroom-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
