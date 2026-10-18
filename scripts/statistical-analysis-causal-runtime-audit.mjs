// Run against an isolated development-identity API serving the production build.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'.runtime/browser-qa/node_modules/playwright/index.mjs')).href);
const base=process.env.STATS_CAUSAL_QA_ORIGIN||'http://127.0.0.1:4318';
const out='output/statistical-analysis-causal/runtime';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const checks=[],errors=[],canvases=[];let sessionId,teacher,student;
async function setup(role){const context=await browser.newContext({viewport:{width:1600,height:1000}});const login=await context.request.post(`${base}/api/identity/development/session`,{data:{role,displayName:`统计第10—11讲验收${role}`}});assert.equal(login.status(),201);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return {context,page};}
async function check(name,fn){await fn();checks.push(name);console.log(name);}
try{
 teacher=await setup('teacher');student=await setup('student');const t=teacher.page,s=student.page;
 await check('course workspace exposes eleven ready lectures and five planned lectures',async()=>{await t.goto(`${base}/courses/statistical-analysis`);await t.locator('.workspace-lesson-list').waitFor();assert.equal(await t.locator('.workspace-lesson-row a[href^="/preview/"]').count(),11);assert.equal(await t.getByText('尚未发布',{exact:true}).count(),5);});
 const start=await teacher.context.request.post(`${base}/api/courses/statistical-analysis/class-sessions`,{data:{mode:'new',lesson:10,requestId:crypto.randomUUID(),room:'统计10—11讲隔离验收'}});assert.equal(start.status(),201);sessionId=(await start.json()).id;
 const event=async index=>{const r=await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index}});assert.equal(r.status(),201);};
 await t.goto(`${base}/classroom/${sessionId}`);await s.goto(`${base}/join/${sessionId}`);
 await check('lecture 10 opens and joins at its authored start',async()=>{for(const page of [t,s])await page.locator('[data-slide-key="stats-l10-01"]').waitFor({timeout:45000});assert.equal(await s.locator('.stats-teacher-notes').count(),0);});
 await check('teacher next page crosses from lecture 10 into lecture 11',async()=>{await event(498);await t.locator('[data-slide-key="stats-l10-48"]').waitFor();await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('[data-slide-key="stats-l11-01"]').waitFor();});
 await check('following students cannot change server slide state',async()=>{const response=await student.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index:351}});assert.equal(response.status(),403);const snap=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/snapshot`)).json();assert.equal(snap.slide.index,499);});
 await check('new lectures synchronize every page at desktop and narrow widths',async()=>{
  for(const width of [1600,390]){const height=width===1600?1000:844;for(const page of [t,s])await page.setViewportSize({width,height});
   for(let index=451;index<=546;index++){await event(index);const lesson=index<499?10:11,local=index-(lesson===10?450:498),key=`stats-l${lesson}-${String(local).padStart(2,'0')}`;
    for(const [role,page] of [['teacher',t],['student',s]]){await page.locator(`[data-slide-key="${key}"]`).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete&&i.naturalWidth));
     const result=await page.locator('.sa-slide').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,visible:Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.sa-slide')),leaks:/teachingCue|assistantCue|storyBeat|openQuestion|讲解重点：|停顿位置：/.test(e.outerHTML)};});
     assert.ok(result.width>=240&&result.x>=-1&&result.y>=0&&result.x+result.width<=width+1&&result.y+result.height<=height+1&&result.visible&&!result.leaks,`${role}/${width}/${index}: ${JSON.stringify(result)}`);assert.ok(Math.abs(result.width/result.height-1.6)<.01);canvases.push({role,viewportWidth:width,index,...result});
    }
   }
  }
 });
 await check('one toolbar and local PDF access remain available to both roles',async()=>{for(const page of [t,s]){assert.equal(await page.locator('.presentation-toolbar').count(),1);assert.equal(await page.getByRole('button',{name:'导出PDF',exact:true}).count(),1);}assert.equal(await s.locator('.stats-teacher-notes').count(),0);});
 await check('current-page assistant context reaches lecture 11 without planned fallback',async()=>{const prompt=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/assistant-prompts`)).json();assert.equal(prompt.coverage.slides,546);assert.equal(prompt.modules[3].key,'statistical-analysis:stats-l11-48');assert.match(prompt.compiled,/第12—16讲仍待建设/);assert.doesNotMatch(prompt.compiled,/第10讲仍待建设|第11讲仍待建设/);});
 await check('page fullscreen preserves the new page and synchronized navigation',async()=>{await t.setViewportSize({width:1600,height:1000});await t.getByRole('button',{name:'网页全屏',exact:true}).click();await t.locator('[data-slide-key="stats-l11-48"]').waitFor();await t.getByRole('button',{name:'上一页',exact:true}).click();await s.locator('[data-slide-key="stats-l11-47"]').waitFor();await t.getByRole('button',{name:'退出网页全屏',exact:true}).click();});
 await check('screen fullscreen keeps synchronized page navigation',async()=>{
 await t.getByRole('button',{name:'屏幕全屏',exact:true}).click();await t.waitForFunction(()=>Boolean(document.fullscreenElement));await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('[data-slide-key="stats-l11-48"]').waitFor();await t.getByRole('button',{name:'退出屏幕全屏',exact:true}).click();await t.waitForFunction(()=>!document.fullscreenElement);
 });
 await check('teacher gets only the current complete script outside the canvas',async()=>{
 await event(546);await t.locator('[data-slide-key="stats-l11-48"]').waitFor();await t.locator('.stats-teacher-notes summary').click();const note=t.locator('.stats-teacher-notes');await note.getByRole('heading',{name:'逐字稿 · 当前页'}).waitFor();assert.match(await note.innerText(),/第11讲最后把对象/);
 await t.getByRole('button',{name:'上一页',exact:true}).click();await t.locator('[data-slide-key="stats-l11-47"]').waitFor();assert.match(await note.innerText(),/现在再次看两组月度轨迹/);assert.doesNotMatch(await t.locator('.sa-slide').innerHTML(),/第11讲最后把对象|现在再次看两组月度轨迹/);assert.equal(await s.locator('.sac-script').count(),0);
 });
 await check('student cannot change slides through the server',async()=>{const r=await student.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index:451}});assert.equal(r.status(),403);});
 await t.screenshot({path:`${out}/teacher-runtime.png`});await s.screenshot({path:`${out}/student-narrow.png`});
}finally{
 if(sessionId)await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/end`).catch(()=>{});
 await fs.writeFile(`${out}/runtime-audit.json`,JSON.stringify({origin:base,checks,errors,canvases},null,2));await browser.close();
}
assert.equal(checks.length,11);assert.equal(canvases.length,384);assert.equal(errors.length,0);console.log(JSON.stringify({checks:checks.length,canvases:canvases.length,errors}));
