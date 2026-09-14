import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const base=process.env.MANAGEMENT_QA_ORIGIN||'http://127.0.0.1:4314';
const pages=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/pages.json','utf8'));
const out='output/management-principles/qa/runtime';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const teacher=await browser.newContext({viewport:{width:1600,height:1100}}),student=await browser.newContext({viewport:{width:1600,height:1100}});
const t=await teacher.newPage(),s=await student.newPage(),checks=[],canvases=[],errors=[],netImages=new Set();let session;
for(const p of[t,s])p.on('pageerror',e=>errors.push(e.message));
t.on('request',r=>{if(r.url().includes('/course-assets/management-principles/'))netImages.add(new URL(r.url()).pathname);});
const check=async(name,fn)=>{await fn();checks.push(name);console.log(name);};
const goto=async(index)=>{const r=await teacher.request.post(`${base}/api/class-sessions/${session}/events`,{data:{type:'set_slide',index}});assert.equal(r.status(),201);const p=pages[index-1];for(const v of[t,s])await v.locator(`[data-management-page="${p.slideKey}"]`).waitFor();return r.json();};
const decode=async(p)=>p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.mg-slide img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
try{
 for(const[c,role]of[[teacher,'teacher'],[student,'student']])assert.equal((await c.request.post(`${base}/api/identity/development/session`,{data:{role}})).status(),201);
 await check('four lecture course workspace, missing formal fields and correct attribution',async()=>{
  await t.goto(`${base}/courses/management-principles`);await t.locator('.mg-course-overview').waitFor();assert.equal(await t.locator('.mg-course-overview button').count(),4);assert.match(await t.locator('.mg-course-overview').innerText(),/韦笑|待完善/);await t.screenshot({path:`${out}/course.png`,fullPage:true});
 });
 await check('teacher starts course and independent student joins read-only',async()=>{
  await t.locator('.mg-course-overview button').first().click();await t.waitForURL('**/classroom/**');session=t.url().split('/').at(-1);await t.locator('.mg-slide').waitFor();await s.goto(`${base}/join/${session}`);await s.locator('.mg-slide').waitFor();assert.equal(await s.locator('.mg-source-locator').count(),0);assert.equal(await s.locator('.student-participation').count(),0);assert.ok(netImages.size<10,`eager all-course images: ${netImages.size}`);
 });
 await check('paging, cross-lecture navigation and source-page locator distinguish fourth-lecture files',async()=>{
  await t.getByRole('button',{name:'下一页',exact:true}).click();await s.locator(`[data-management-page="${pages[1].slideKey}"]`).waitFor();
  await t.getByRole('combobox',{name:'选择课次'}).selectOption('4');await s.locator('[data-management-page="mg-l4a-s001-01"]').waitFor();assert.equal(await t.locator('select[aria-label="选择课次"] option').count(),4);
  await t.getByRole('button',{name:'原PPT页码定位',exact:true}).click();const panel=t.locator('.mg-source-panel');await panel.locator('select').waitFor();await panel.locator('select').selectOption('l4b');await panel.locator('input').fill('23');await panel.getByRole('button',{name:'定位',exact:true}).click();await s.locator('[data-management-page="mg-l4b-s023-01"]').waitFor();await t.getByRole('button',{name:'收起原页对照',exact:true}).click();
  assert.equal((await student.request.get(`${base}/api/courses/management-principles/source-map`)).status(),403);await t.screenshot({path:`${out}/teacher.png`,fullPage:true});
 });
 await check('all eight demos advance, reset, change parameters and synchronize across both browsers',async()=>{
  for(const p of pages.filter(p=>p.demo)){
   await goto(p.index);const next=t.getByRole('button',{name:'下一步',exact:true});let step=0;
   while(!await next.isDisabled()){await next.click();step++;await s.waitForFunction(expected=>document.querySelector('.mg-demo-heading>span')?.textContent?.startsWith(`${expected+1} /`),step);}
   const range=t.locator('.mg-demo input[type=range]').first();if(await range.count()){await range.focus();await range.press('End');const expected=await t.locator('.mg-demo output').first().innerText();await s.waitForFunction(value=>document.querySelector('.mg-demo output')?.textContent===value,expected);}
   await decode(s);await s.screenshot({path:`${out}/demo-${p.demo}.png`,fullPage:true});assert.equal(await s.locator('.mg-step-buttons').count(),0);
   await t.getByRole('button',{name:'重置',exact:true}).click();await s.waitForFunction(()=>document.querySelector('.mg-demo-heading>span')?.textContent?.startsWith('1 /'));
  }
 });
 await check('refresh and return to page preserve revealed state; served assistant only receives visible material',async()=>{
  const tree=pages.find(p=>p.demo==='decision-tree');await goto(tree.index);await t.getByRole('button',{name:'下一步',exact:true}).click();await s.waitForFunction(()=>document.querySelector('.mg-demo-heading>span')?.textContent?.startsWith('2 /'));
  await t.reload();await t.locator('.mg-demo').waitFor();await s.reload();await s.locator('.mg-demo').waitFor();assert.match(await s.locator('.mg-demo-heading>span').innerText(),/^2 \/ 4/);
  let r=await teacher.request.get(`${base}/api/class-sessions/${session}/assistant-prompts`),prompt=await r.json();assert.equal(prompt.modules[3].key,`management-principles:${tree.slideKey}`);assert.doesNotMatch(prompt.compiled,/净收益34|净收益17|OOCL|港口管理|经济数学/);
  await t.getByRole('button',{name:'下一步',exact:true}).click();await t.waitForTimeout(100);await t.getByRole('button',{name:'下一步',exact:true}).click();await s.waitForFunction(()=>document.querySelector('.mg-demo-heading>span')?.textContent?.startsWith('4 /'));
  prompt=await(await teacher.request.get(`${base}/api/class-sessions/${session}/assistant-prompts`)).json();assert.match(prompt.compiled,/净收益34/);await t.getByRole('button',{name:'重置',exact:true}).click();
 });
 await check('all 367 pages in teacher and student classrooms at desktop and narrow widths',async()=>{
  for(const width of[390,1600]){
   const height=width===1600?1100:844;await t.setViewportSize({width,height});await s.setViewportSize({width,height});
   for(const p of pages){await goto(p.index);
    for(const[role,v]of[['teacher',t],['student',s]]){
     await decode(v);
     const r=await v.locator('.mg-slide').evaluate(a=>{const b=a.getBoundingClientRect(),scale=b.width/1600,f=a.querySelector('footer').getBoundingClientRect(),outside=[],overlap=[];for(const el of a.querySelectorAll('h1,h2,p,td,th,li,figcaption,.mg-demo-controls label')){const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1)outside.push(el.textContent.slice(0,60));if(el.closest('.mg-content')&&r.bottom>f.top-5*scale)overlap.push(el.textContent.slice(0,60));}return{x:b.x,y:b.y,width:b.width,height:b.height,logical:[a.offsetWidth,a.offsetHeight],visible:Boolean(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('.mg-slide')),outside,overlap,leaks:/teachingCue|assistantCue|originalNotes|originalAnimation|storyBeat|voyageStage/.test(a.outerHTML),broken:[...a.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src),text:a.innerText};});
     canvases.push({role,viewport:width,index:p.index,key:p.slideKey,...r});assert.ok(r.width>=240&&r.height>=150&&r.x>=-1&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1&&r.visible&&!r.leaks&&!r.broken.length&&!r.outside.length&&!r.overlap.length,JSON.stringify(canvases.at(-1)));assert.ok(Math.abs(r.width/r.height-1.6)<.01);
     if(role==='student')await v.screenshot({path:`${out}/${width}-${String(p.index).padStart(3,'0')}.png`,fullPage:true});
    }
    if(p.index%25===0)console.log(`${width}: ${p.index}/${pages.length} teacher+student`);
   }
  }
 });
 await check('fullscreen stays teacher-controlled; other courses retain their own renderer',async()=>{
  await t.setViewportSize({width:1600,height:1100});await t.getByRole('button',{name:'全屏',exact:true}).click();await t.getByRole('button',{name:'退出全屏',exact:true}).waitFor();assert.equal(await t.locator('.mg-source-locator').count(),0);await t.getByRole('button',{name:'上一页',exact:true}).click();await s.locator(`[data-management-page="${pages.at(-2).slideKey}"]`).waitFor();await t.getByRole('button',{name:'退出全屏',exact:true}).click();
  for(const id of['course-port-management-intro','course-economic-mathematics','statistical-analysis']){const r=await teacher.request.post(`${base}/api/courses/${id}/class-sessions`);assert.equal(r.status(),201);const old=await r.json();await t.goto(`${base}/classroom/${old.id}`);await t.locator('.slide-logical-canvas').waitFor();assert.equal(await t.locator('.mg-slide').count(),0);assert.ok((await t.locator('.slide-logical-canvas').innerText()).length>20);await teacher.request.post(`${base}/api/class-sessions/${old.id}/end`);}
 });
}catch(error){await t.screenshot({path:`${out}/failure-teacher.png`,fullPage:true}).catch(()=>{});await s.screenshot({path:`${out}/failure-student.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await fs.writeFile(`${out}/audit.json`,JSON.stringify({origin:base,session,checkedAt:new Date().toISOString(),checks,errors,canvases},null,2));await browser.close();}
assert.equal(checks.length,7);assert.equal(canvases.length,pages.length*4);assert.equal(errors.length,0);console.log(JSON.stringify({checks:checks.length,canvases:canvases.length,errors}));
