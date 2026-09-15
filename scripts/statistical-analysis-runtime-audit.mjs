import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const base=process.env.STATS_QA_ORIGIN||'http://127.0.0.1:5178';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const teacher=await browser.newContext({viewport:{width:1600,height:1080}}),student=await browser.newContext({viewport:{width:1280,height:900}});
const t=await teacher.newPage(),s=await student.newPage();const checks=[],errors=[],canvasChecks=[];
for(const p of [t,s])p.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();checks.push(name);console.log(name);};
let sessionId;
try{
 await check('course workspace exposes two ready and fourteen planned lessons',async()=>{
  await t.goto(`${base}/courses/statistical-analysis`);await t.getByRole('heading',{name:'统计分析方法',exact:true}).waitFor();
  await t.locator('.stats-course-catalog').waitFor();assert.equal(await t.locator('.stats-course-catalog button').count(),2);assert.equal(await t.locator('.stats-course-catalog small').count(),14);
  await t.screenshot({path:'output/statistical-analysis-qa/course-workspace.png',fullPage:true});
 });
 await check('lecture 1 opens as teacher-controlled native slides',async()=>{
  await t.getByRole('button',{name:'进入本讲 · 48页',exact:true}).click();await t.waitForURL('**/classroom/**');sessionId=t.url().split('/').at(-1);
  await t.locator('[data-slide-key="stats-l1-01"]').waitFor();assert.equal(await t.locator('.classroom-activity-tabs button').count(),1);
 });
 await check('independent student joins and receives the same page',async()=>{
  await s.goto(`${base}/join/${sessionId}`);await s.locator('[data-slide-key="stats-l1-01"]').waitFor({timeout:30000});assert.equal(await s.locator('.stats-teacher-notes').count(),0);assert.equal(await s.locator('.student-participation').count(),0);
 });
 await check('next and previous controls synchronize',async()=>{
  await t.getByRole('button',{name:'下一页',exact:true}).click();await t.locator('[data-slide-key="stats-l1-02"]').waitFor();await s.locator('[data-slide-key="stats-l1-02"]').waitFor();
  await t.getByRole('button',{name:'上一页',exact:true}).click();await s.locator('[data-slide-key="stats-l1-01"]').waitFor();
 });
 await check('local page input, cross-lecture navigation and planned guards',async()=>{
  const input=t.getByLabel('当前讲页码，1到48');await input.fill('48');await input.press('Enter');await s.locator('[data-slide-key="stats-l1-48"]').waitFor();
  await t.getByRole('combobox',{name:'选择课次'}).selectOption('2');await s.locator('[data-slide-key="stats-l2-01"]').waitFor();
  assert.equal(await t.locator('select[aria-label="选择课次"] option[disabled]').count(),14);
  const second=t.getByLabel('当前讲页码，1到52');await second.fill('30');await second.press('Enter');await s.locator('[data-slide-key="stats-l2-30"]').waitFor();
 });
 await check('refresh preserves both teacher and student progress',async()=>{
  await t.reload();await t.locator('[data-slide-key="stats-l2-30"]').waitFor();await s.reload();await s.locator('[data-slide-key="stats-l2-30"]').waitFor();
  await t.locator('.stats-teacher-notes summary').click();assert.match(await t.locator('.stats-teacher-notes').innerText(),/讲解重点/);
  assert.doesNotMatch(await s.locator('.sa-slide').evaluate(e=>e.outerHTML),/teachingCue|assistantCue|讲解重点|停顿位置|前后衔接/);
  await t.screenshot({path:'output/statistical-analysis-qa/teacher-runtime.png',fullPage:true});await s.screenshot({path:'output/statistical-analysis-qa/student-runtime.png',fullPage:true});
 });
 await check('served assistant prompt matches the current lecture and page',async()=>{
  const r=await teacher.request.get(`${base}/api/class-sessions/${sessionId}/assistant-prompts`);assert.equal(r.status(),200);const prompt=await r.json();
  assert.equal(prompt.coverage.slides,100);assert.equal(prompt.modules[3].key,'statistical-analysis:stats-l2-30');assert.match(prompt.modules[3].defaultText,/【本页定位】/);assert.doesNotMatch(prompt.compiled,/OOCL|山城新饮|港口管理/);
 });
 await check('narrow classroom maintains a complete 16:10 canvas',async()=>{
  await t.setViewportSize({width:390,height:844});await s.setViewportSize({width:390,height:844});
  for(const p of [t,s]){await p.waitForTimeout(300);const b=await p.locator('.sa-slide').boundingBox();assert.ok(b&&Math.abs(b.width/b.height-1.6)<.01);assert.ok(b.width>=240&&b.height>=150&&b.x>=-1&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=844,JSON.stringify(b));assert.ok(await p.locator('.sa-slide').evaluate(e=>{const r=e.getBoundingClientRect();return Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.sa-slide'));}),'slide center must actually be visible, not merely present in DOM');assert.equal(await p.locator('.sa-slide img').evaluateAll(a=>a.filter(i=>!i.naturalWidth).length),0);}
  await t.screenshot({path:'output/statistical-analysis-qa/teacher-narrow.png',fullPage:true});await s.screenshot({path:'output/statistical-analysis-qa/student-narrow.png',fullPage:true});
 });
 await check('all 100 pages remain visible in both classroom roles at two widths',async()=>{
  for(const width of [1600,390]){
   const height=width===1600?1000:844;await t.setViewportSize({width,height});await s.setViewportSize({width,height});
   for(let index=1;index<=100;index++){
    const r=await teacher.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index}});assert.equal(r.status(),201);
    const key=`stats-l${index<=48?1:2}-${String(index<=48?index:index-48).padStart(2,'0')}`;
    for(const [role,p] of [['teacher',t],['student',s]]){
     await p.locator(`[data-slide-key="${key}"]`).waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete&&i.naturalWidth));
     const result=await p.locator('.sa-slide').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,visible:Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.sa-slide')),leaks:/teachingCue|assistantCue|讲解重点：|停顿位置：/.test(e.outerHTML)};});
     assert.ok(result.width>=240&&result.height>=150&&result.x>=-1&&result.y>=0&&result.x+result.width<=width+1&&result.y+result.height<=height+1&&result.visible&&!result.leaks,`${role}/${width}/${index}: ${JSON.stringify(result)}`);
     assert.ok(Math.abs(result.width/result.height-1.6)<.01);canvasChecks.push({role,viewportWidth:width,index,...result});
    }
    if(index%25===0)console.log(`native ${width}: ${index}/100 teacher + student`);
   }
  }
 });
 await check('fullscreen keeps manual paging and hides unavailable activities',async()=>{
  await t.setViewportSize({width:1600,height:1000});await t.getByRole('button',{name:'全屏',exact:true}).click();await t.getByRole('button',{name:'退出全屏',exact:true}).waitFor();
  assert.equal(await t.getByRole('button',{name:'打开课堂活动',exact:true}).count(),0);assert.equal(await t.locator('.stats-teacher-notes').count(),0);
  await t.getByRole('button',{name:'上一页',exact:true}).click();await s.locator('[data-slide-key="stats-l2-51"]').waitFor();await t.getByRole('button',{name:'退出全屏',exact:true}).click();await t.locator('.stats-teacher-notes').waitFor();
 });
 await check('existing port and economics classrooms still render',async()=>{
  await t.setViewportSize({width:1600,height:1080});
  for(const id of ['course-port-management-intro','course-economic-mathematics']){
   const r=await teacher.request.post(`${base}/api/courses/${id}/class-sessions`);assert.equal(r.status(),201);const old=await r.json();
   await t.goto(`${base}/classroom/${old.id}`);await t.locator('.slide-logical-canvas').waitFor();await t.waitForTimeout(700);assert.equal(await t.locator('.sa-slide').count(),0);assert.ok((await t.locator('.slide-logical-canvas').innerText()).length>30);
   await teacher.request.post(`${base}/api/class-sessions/${old.id}/end`);
  }
 });
}finally{
 if(sessionId)await teacher.request.post(`${base}/api/class-sessions/${sessionId}/end`).catch(()=>{});
 await fs.writeFile('output/statistical-analysis-qa/runtime-audit.json',JSON.stringify({checks,errors,sessionId,origin:base,canvasChecks},null,2));await browser.close();
}
assert.equal(checks.length,11);assert.equal(canvasChecks.length,400);assert.equal(errors.length,0);console.log(JSON.stringify({passed:checks.length,canvases:canvasChecks.length,errors}));
