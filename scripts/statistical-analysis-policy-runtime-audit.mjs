import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.env.PLAYWRIGHT_MODULE)throw new Error('Set PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const base=process.env.STATS_POLICY_API_ORIGIN||'http://127.0.0.1:4320',out='output/statistical-analysis-policy/runtime';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const checks=[],errors=[],canvases=[];let teacher,student,sessionId;
const check=async(name,fn)=>{await fn();checks.push(name);console.log(name);};
async function setup(role){const context=await browser.newContext({viewport:{width:1600,height:1080}});const response=await context.request.post(`${base}/api/identity/development/session`,{data:{role,displayName:`统计12—13验收${role}`}});assert.equal(response.status(),201);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return {context,page};}
try{
 teacher=await setup('teacher');student=await setup('student');
 const created=await teacher.context.request.post(`${base}/api/courses/statistical-analysis/class-sessions`,{data:{mode:'new',lesson:12,requestId:crypto.randomUUID(),room:'统计12—13讲项目验收'}});assert.equal(created.status(),201);sessionId=(await created.json()).id;
 const t=teacher.page,s=student.page;
 const event=async index=>{assert.equal((await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index}})).status(),201);};
 await t.goto(`${base}/classroom/${sessionId}`);await s.goto(`${base}/join/${sessionId}`);
 await check('teacher and following student open lecture 12 at its real start',async()=>{for(const page of [t,s])await page.locator('[data-slide-key="stats-l12-01"]').waitFor({timeout:45000});assert.equal(await s.locator('.stats-teacher-notes').count(),0);});
 await check('the lecture 11 to 12 and 12 to 13 bridges preserve synchronized navigation',async()=>{
  for(const [from,key] of [[546,'stats-l12-01'],[594,'stats-l13-01']]){await event(from);await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator(`[data-slide-key="${key}"]`).waitFor();}
 });
 await check('every project page is visible and private metadata stays outside both canvases',async()=>{
  for(const width of [1600,390]){
   for(const page of [t,s])await page.setViewportSize({width,height:width===1600?1080:844});
   for(let index=547;index<=642;index++){
    await event(index);const lesson=index<=594?12:13,key=`stats-l${lesson}-${String(index-(lesson===12?546:594)).padStart(2,'0')}`;
    for(const [role,page] of [['teacher',t],['student',s]]){
     const canvas=page.locator(`[data-slide-key="${key}"]`);await canvas.waitFor();
     const r=await canvas.evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,
      visible:Boolean(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('.sa-slide')),
      leaks:/teachingCue|assistantCue|spokenSeconds|pauseSeconds|paragraphs|transitionToNext|教师逐页讲稿|sap-resources/.test(e.outerHTML)};});
     assert.ok(r.w>=240&&r.x>=-1&&r.y>=0&&r.x+r.w<=width+1&&r.y+r.h<=(width===1600?1080:844)+1&&r.visible&&!r.leaks,`${role}/${index}: ${JSON.stringify(r)}`);
     canvases.push({index,role,width,...r});
    }
   }
  }
 });
 await check('project downloads are local for both roles and do not mutate classroom state',async()=>{
  await event(553);await s.locator('[data-slide-key="stats-l12-07"]').waitFor();
  for(const [role,page] of [['teacher',t],['student',s]]){
   assert.equal(await page.locator('.presentation-toolbar').count(),1);
   await page.getByRole('button',{name:'更多工具',exact:true}).click();
   await page.getByRole('button',{name:'项目材料',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'项目材料'});await panel.waitFor();
   const download=page.waitForEvent('download');await panel.getByRole('link').first().click();const file=await download;await file.saveAs(`${out}/${role}-project.zip`);
   const box=await panel.getByRole('link').first().boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=391);
   await page.getByRole('button',{name:'关闭工具面板',exact:true}).click();
  }
  const snap=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/snapshot`)).json();assert.equal(snap.slide.index,553);
 });
 await check('teacher sees the current complete script and correct practice timing only outside the canvas',async()=>{
  await event(553);await t.locator('[data-slide-key="stats-l12-07"]').waitFor();
  await t.locator('.stats-teacher-notes summary').click();const notes=t.locator('.stats-teacher-notes');
  assert.match(await notes.innerText(),/现在留四分钟做P1/);assert.match(await notes.innerText(),/跟做预算 240秒/);
  assert.doesNotMatch(await t.locator('.sa-slide').innerHTML(),/现在留四分钟做P1/);assert.equal(await s.locator('.sac-script').count(),0);
  await event(595);await t.locator('[data-slide-key="stats-l13-01"]').waitFor();assert.match(await notes.innerText(),/政策暴露差异Z/);
 });
 await check('current-page assistant supports individual code work and withholds future results',async()=>{
  await event(548);const p=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/assistant-prompts`)).json();
  assert.equal(p.coverage.slides,642);assert.match(p.compiled,/个人Python/);assert.match(p.compiled,/第14—16讲仍待建设/);
  assert.doesNotMatch(p.compiled,/0\.136|spokenSeconds|paragraphs|现在留四分钟做P1/);
 });
 await check('page and real screen fullscreen retain synchronized navigation and one toolbar',async()=>{
  await t.setViewportSize({width:1600,height:1080});await t.getByRole('button',{name:'网页全屏',exact:true}).click();
  await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('[data-slide-key="stats-l12-03"]').waitFor();
  await t.getByRole('button',{name:'退出网页全屏',exact:true}).click();
  await t.getByRole('button',{name:'屏幕全屏',exact:true}).click();await t.waitForFunction(()=>Boolean(document.fullscreenElement));
  await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('[data-slide-key="stats-l12-04"]').waitFor();
  await t.getByRole('button',{name:'退出屏幕全屏',exact:true}).click();await t.waitForFunction(()=>!document.fullscreenElement);
  assert.equal(await t.locator('.presentation-toolbar').count(),1);
 });
 await check('students cannot use a resource panel to gain teacher navigation rights',async()=>{
  const response=await student.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index:595}});assert.equal(response.status(),403);
 });
 await t.screenshot({path:`${out}/teacher-final.png`});await s.screenshot({path:`${out}/student-final.png`});
}finally{
 if(sessionId)await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/end`).catch(()=>{});
 await fs.writeFile(`${out}/runtime-audit.json`,JSON.stringify({base,checks,errors,canvases},null,2));await browser.close();
}
assert.equal(checks.length,8);assert.equal(canvases.length,384);assert.equal(errors.length,0);
console.log(JSON.stringify({checks:checks.length,canvases:canvases.length,errors}));
