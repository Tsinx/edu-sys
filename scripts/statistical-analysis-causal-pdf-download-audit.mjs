import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'.runtime/browser-qa/node_modules/playwright/index.mjs')).href);
const base=process.env.STATS_CAUSAL_QA_ORIGIN||'http://127.0.0.1:4318';
const record=JSON.parse(await fs.readFile('.runtime/course-pdf-cache/records/statistical-analysis.json','utf8'));
assert.equal(record.slideTotal,546);assert.equal(record.chapters.length,11);
const out='output/statistical-analysis-causal/downloads';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const results=[],errors=[];let teacher,sessionId;
try{
 teacher=await browser.newContext({acceptDownloads:true,viewport:{width:1600,height:1000}});
 let r=await teacher.request.post(`${base}/api/identity/development/session`,{data:{role:'teacher',displayName:'统计PDF验收教师'}});assert.equal(r.status(),201);
 r=await teacher.request.post(`${base}/api/courses/statistical-analysis/class-sessions`,{data:{mode:'new',lesson:10,requestId:randomUUID(),room:'统计10—11讲PDF隔离验收'}});assert.equal(r.status(),201);sessionId=(await r.json()).id;
 for(const role of ['teacher','student']){
  const context=role==='teacher'?teacher:await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
  if(role==='student'){const login=await context.request.post(`${base}/api/identity/development/session`,{data:{role,displayName:'统计PDF验收学生'}});assert.equal(login.status(),201);}
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/${role==='teacher'?'classroom':'join'}/${sessionId}`);await page.locator('[data-slide-key="stats-l10-01"]').waitFor();
  await page.getByRole('button',{name:'导出PDF',exact:true}).click();const panel=page.locator('.course-pdf-export');
  await panel.getByLabel('导出章节',{exact:true}).waitFor();assert.equal(await panel.locator('option').count(),11);
  for(const chapter of [10,11]){
   await panel.getByLabel('导出章节',{exact:true}).selectOption(String(chapter));
   const expected=record.chapters.find(c=>c.number===chapter);assert.equal(expected.pages,48);
   assert.equal(await panel.locator('a[download]').getAttribute('href'),expected.file.url);
   const event=page.waitForEvent('download');await panel.getByRole('link',{name:'下载',exact:true}).click();const download=await event;
   const path=`${out}/${role}-${chapter}.pdf`;await download.saveAs(path);assert.equal(await download.failure(),null);
   const bytes=await fs.readFile(path),sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,expected.file.sha256);assert.equal(bytes.length,expected.file.bytes);
   results.push({role,chapter,pages:48,bytes:bytes.length,sha256});
  }
  await page.screenshot({path:`${out}/${role}-before-scopes.png`});await panel.getByText('全课程 · 一个PDF',{exact:true}).click();assert.match(await panel.innerText(),/546 页/);assert.equal(await panel.locator('a[download]').getAttribute('href'),record.complete.url);
  await panel.getByText('全课程 · 每章一个PDF（ZIP）',{exact:true}).click();assert.match(await panel.innerText(),/11 个PDF/);assert.equal(await panel.locator('a[download]').getAttribute('href'),record.archive.url);
  const snapshot=await(await teacher.request.get(`${base}/api/class-sessions/${sessionId}/snapshot`)).json();assert.equal(snapshot.slide.index,451);
  await page.screenshot({path:`${out}/${role}-pdf-panel.png`});if(role==='student')await context.close();
 }
}finally{
 if(sessionId)await teacher.request.post(`${base}/api/class-sessions/${sessionId}/end`).catch(()=>{});
 await browser.close();
 await fs.writeFile(`${out}/download-audit.json`,JSON.stringify({base,results,errors,mergedPages:546,archiveChapters:11},null,2));
}
assert.equal(results.length,4);assert.equal(errors.length,0);console.log(JSON.stringify({downloads:results.length,mergedPages:546,archiveChapters:11,errors}));
