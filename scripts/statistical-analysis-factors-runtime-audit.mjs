// Run against an isolated development-identity API serving the production build.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'.runtime/browser-qa/node_modules/playwright/index.mjs')).href);
const base=process.env.STATS_FACTOR_QA_ORIGIN||'http://127.0.0.1:4318';
const out='output/statistical-analysis-factors-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const checks=[],errors=[],canvases=[];let sessionId,teacher,student;
async function setup(role){const context=await browser.newContext({viewport:{width:1600,height:1000}});const login=await context.request.post(`${base}/api/identity/development/session`,{data:{role,displayName:`统计第8—9讲验收${role}`}});assert.equal(login.status(),201);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return {context,page};}
async function check(name,fn){await fn();checks.push(name);console.log(name);}
try{
 teacher=await setup('teacher');student=await setup('student');const t=teacher.page,s=student.page;
 await check('course workspace exposes nine ready lectures and seven planned lectures',async()=>{await t.goto(`${base}/courses/statistical-analysis`);await t.locator('.workspace-lesson-list').waitFor();assert.equal(await t.locator('.workspace-lesson-row a[href^="/preview/"]').count(),9);assert.equal(await t.getByText('尚未发布',{exact:true}).count(),7);});
 const start=await teacher.context.request.post(`${base}/api/courses/statistical-analysis/class-sessions`,{data:{mode:'new',lesson:8,requestId:crypto.randomUUID(),room:'统计8—9讲隔离验收'}});assert.equal(start.status(),201);sessionId=(await start.json()).id;
 const event=async index=>{const r=await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index}});assert.equal(r.status(),201);};
 await t.goto(`${base}/classroom/${sessionId}`);await s.goto(`${base}/join/${sessionId}`);
 await check('lecture 8 opens and joins at its authored start',async()=>{for(const page of [t,s])await page.locator('[data-slide-key="stats-l8-01"]').waitFor({timeout:45000});assert.equal(await s.locator('.stats-teacher-notes').count(),0);});
 await check('teacher next page crosses from lecture 8 into lecture 9',async()=>{await event(398);await t.locator('[data-slide-key="stats-l8-48"]').waitFor();await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('[data-slide-key="stats-l9-01"]').waitFor();});
 await check('following students cannot change server slide state',async()=>{const response=await student.context.request.post(`${base}/api/class-sessions/${sessionId}/events`,{data:{type:'set_slide',index:351}});assert.equal(response.status(),403);const snap=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/snapshot`)).json();assert.equal(snap.slide.index,399);});
 await check('new lectures synchronize every page at desktop and narrow widths',async()=>{
  for(const width of [1600,390]){const height=width===1600?1000:844;for(const page of [t,s])await page.setViewportSize({width,height});
   for(let index=351;index<=450;index++){await event(index);const lesson=index<399?8:9,local=index-(lesson===8?350:398),key=`stats-l${lesson}-${String(local).padStart(2,'0')}`;
    for(const [role,page] of [['teacher',t],['student',s]]){await page.locator(`[data-slide-key="${key}"]`).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete&&i.naturalWidth));
     const result=await page.locator('.sa-slide').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,visible:Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.sa-slide')),leaks:/teachingCue|assistantCue|storyBeat|openQuestion|讲解重点：|停顿位置：/.test(e.outerHTML)};});
     assert.ok(result.width>=240&&result.x>=-1&&result.y>=0&&result.x+result.width<=width+1&&result.y+result.height<=height+1&&result.visible&&!result.leaks,`${role}/${width}/${index}: ${JSON.stringify(result)}`);assert.ok(Math.abs(result.width/result.height-1.6)<.01);canvases.push({role,viewportWidth:width,index,...result});
    }
   }
  }
 });
 await check('one toolbar and local PDF access remain available to both roles',async()=>{for(const page of [t,s]){assert.equal(await page.locator('.presentation-toolbar').count(),1);assert.equal(await page.getByRole('button',{name:'导出PDF',exact:true}).count(),1);}assert.equal(await s.locator('.stats-teacher-notes').count(),0);});
 await check('current-page assistant context reaches lecture 9 without planned fallback',async()=>{const prompt=await(await teacher.context.request.get(`${base}/api/class-sessions/${sessionId}/assistant-prompts`)).json();assert.equal(prompt.coverage.slides,450);assert.equal(prompt.modules[3].key,'statistical-analysis:stats-l9-52');assert.match(prompt.compiled,/第10—16讲仍待建设/);assert.doesNotMatch(prompt.compiled,/第8讲仍待建设|第9讲仍待建设/);});
 await check('page fullscreen preserves the new page and synchronized navigation',async()=>{await t.setViewportSize({width:1600,height:1000});await t.getByRole('button',{name:'网页全屏',exact:true}).click();await t.locator('[data-slide-key="stats-l9-52"]').waitFor();await t.getByRole('button',{name:'上一页',exact:true}).click();await s.locator('[data-slide-key="stats-l9-51"]').waitFor();await t.getByRole('button',{name:'退出网页全屏',exact:true}).click();});
 await t.screenshot({path:`${out}/teacher-runtime.png`});await s.screenshot({path:`${out}/student-narrow.png`});
}finally{
 if(sessionId)await teacher.context.request.post(`${base}/api/class-sessions/${sessionId}/end`).catch(()=>{});
 await fs.writeFile(`${out}/runtime-audit.json`,JSON.stringify({origin:base,checks,errors,canvases},null,2));await browser.close();
}
assert.equal(checks.length,8);assert.equal(canvases.length,400);assert.equal(errors.length,0);console.log(JSON.stringify({checks:checks.length,canvases:canvases.length,errors}));
