import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L6_URL??'http://127.0.0.1:5173',api=process.env.PORT_L6_API??'http://127.0.0.1:4316',out='output/port-lesson-six-qa';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true}),results=[],errors=[];let p,s;
async function setup(role){const ctx=await browser.newContext({viewport:{width:1600,height:1100}});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await ctx.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});assert.equal((await ctx.request.post(api+'/api/identity/development/session',{data:{role,displayName:`第6讲验收${role}`}})).status(),201);return page;}
async function screen(page,label){
 await page.waitForFunction(()=>[...document.querySelectorAll('.port-l6-slide img')].every(i=>i.complete&&i.naturalWidth>0));
 const r=await page.evaluate(()=>{const c=document.querySelector('.port-l6-slide'),b=c.getBoundingClientRect();return {ratio:b.width/b.height,overflow:[...c.querySelectorAll('[data-l6-bounds],svg text,.l6-points p,.l6-answer')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(el=>el.textContent),leaks:/teachingCue|assistantCue|storyBeat|voyageStage/.test(c.outerHTML),docOverflow:document.documentElement.scrollWidth>innerWidth+2};});assert.ok(Math.abs(r.ratio-1.6)<.01,label);assert.deepEqual(r.overflow,[],label);assert.ok(!r.leaks,label);assert.ok(!r.docOverflow,label);results.push({label,...r});
}
try{
 p=await setup('teacher');s=await setup('student');
 const response=await p.request.post(api+'/api/courses/course-port-management-intro/class-sessions');assert.ok(response.ok(),await response.text());const session=await response.json(),root=api+`/api/class-sessions/${session.id}`;
 const event=async data=>{const r=await p.request.post(root+'/events',{data});assert.ok(r.ok(),await r.text());return r.json();};
 const snapshot=async()=>await(await p.request.get(root+'/snapshot')).json();
 await event({type:'set_slide',index:246});await p.goto(base+`/classroom/${session.id}`);await s.goto(base+`/join/${session.id}`);
 await p.locator('.port-l6-slide').waitFor({timeout:60000});await s.locator('.port-l6-slide').waitFor({timeout:60000});
 for(const width of process.argv.includes('--interactions')?[]:[1600,390]){
  await p.setViewportSize({width,height:width===1600?1100:844});await s.setViewportSize({width,height:width===1600?1100:844});
  for(let n=1;n<=48;n++){
   await event({type:'set_slide',index:245+n});await p.locator(`.port-l6-slide[aria-label="第6讲第${n}页"]`).waitFor();await p.getByRole('button',{name:'全景',exact:true}).click();
   await s.locator(`.port-l6-slide[aria-label="第6讲第${n}页"]`).waitFor();
   await s.waitForFunction(()=>document.querySelector('.port-l6-slide .l6-body')?.textContent.length>0);
   for(const [page,role]of[[p,'teacher'],[s,'student']]){await screen(page,`${role}/${width}/${n}`);if(width===1600&&[1,8,15,20,26,31,34,38,41,45,48].includes(n))await page.locator('.port-l6-slide').screenshot({path:`${out}/class-${role}-${n}.png`});}
   assert.equal(await s.locator('.l6-playback').count(),0,'following view has no teacher controls');
  }
  console.log(`Classroom checked teacher/student ${width}px`);
 }
 await p.setViewportSize({width:1600,height:1100});await s.setViewportSize({width:1600,height:1100});
 await event({type:'set_slide',index:286});await p.locator('.port-l6-slide[aria-label="第6讲第41页"]').waitFor();await p.getByRole('button',{name:'揭示解析',exact:true}).click();await s.getByText(/A为4,400元/).waitFor();
 await p.reload();await p.getByRole('button',{name:'收起解析',exact:true}).waitFor();await p.getByRole('button',{name:'收起解析',exact:true}).click();await s.waitForFunction(()=>!document.querySelector('.port-l6-slide').textContent.includes('A为4,400元'));
 const progressSaved=p.waitForResponse(async r=>r.url().endsWith('/events')&&r.ok()&&(await r.json()).lessonSixPresentation?.progress===.375,{timeout:10000});
 await p.getByRole('slider',{name:'动画进度'}).fill('375');await progressSaved;
 assert.equal((await snapshot()).lessonSixPresentation.progress,.375);
 await p.reload();assert.equal(await p.getByRole('slider',{name:'动画进度'}).inputValue(),'375');await s.reload();await s.locator('.port-l6-slide[aria-label="第6讲第41页"]').waitFor();
 // Student is free to browse, replay and reveal locally, and can rejoin the live teacher position.
 const before=(await snapshot()).lessonSixPresentation;
 await s.getByRole('button',{name:'自主浏览',exact:true}).click();await s.getByRole('button',{name:'揭示解析',exact:true}).click();await s.getByText(/A为4,400元/).waitFor();assert.deepEqual((await snapshot()).lessonSixPresentation,before);
 await event({type:'set_slide',index:279});await p.locator('.port-l6-slide[aria-label="第6讲第34页"]').waitFor();await p.getByRole('button',{name:'全景',exact:true}).click();
 assert.equal(await s.locator('.port-l6-slide').getAttribute('aria-label'),'第6讲第41页');await s.reload();await s.getByRole('button',{name:'收起解析',exact:true}).waitFor();assert.equal(await s.locator('.port-l6-slide').getAttribute('aria-label'),'第6讲第41页');
 await s.getByRole('button',{name:'一键跟上教师',exact:true}).click();await s.locator('.port-l6-slide[aria-label="第6讲第34页"]').waitFor();assert.equal(await s.locator('.l6-playback').count(),0);
 // Next-page and lesson-directory navigation remain available while following.
 await s.getByRole('button',{name:'下一页',exact:true}).click();await s.locator('.port-l6-slide[aria-label="第6讲第35页"]').waitFor();assert.equal(await s.locator('.student-learning').getAttribute('data-following'),'false');
 await s.getByRole('button',{name:'目录',exact:true}).click();await s.getByLabel('目录课次',{exact:true}).selectOption('2');await s.locator('.lbl-slide').waitFor();assert.equal((await snapshot()).slide.index,279);
 await s.getByRole('button',{name:'一键跟上教师',exact:true}).click();await s.locator('.port-l6-slide[aria-label="第6讲第34页"]').waitFor();
 const denied=await s.request.post(root+'/events',{data:{type:'set_lesson_six_presentation',slideKey:'l6-guoyuan',progress:1,revealed:false,option:0}});assert.equal(denied.status(),403);
 const stale=await p.request.post(root+'/events',{data:{type:'set_lesson_six_presentation',slideKey:'l6-cost-low',progress:1,revealed:true,option:0}});assert.equal(stale.status(),409);
 // Live options stay synchronized; private browsing does not modify the classroom.
 await event({type:'set_slide',index:278});await p.locator('.port-l6-slide[aria-label="第6讲第33页"]').waitFor();await p.getByRole('button',{name:'全景',exact:true}).click();await p.getByRole('combobox',{name:'演示选项'}).selectOption('1');await s.locator('.port-l6-slide').getByText('平舆',{exact:true}).waitFor();
 await s.screenshot({path:`${out}/student-following.png`});
 await s.goto(base+'/study/course-port-management-intro');await s.locator('.study-deck select').selectOption('6');await s.locator('.port-l6-slide').waitFor();await s.getByLabel('当前讲页码',{exact:true}).fill('41');await s.getByLabel('当前讲页码',{exact:true}).press('Enter');await s.getByRole('button',{name:'揭示解析',exact:true}).click();await s.getByText(/A为4,400元/).waitFor();assert.equal((await snapshot()).slide.index,278);assert.equal((await snapshot()).lessonSixPresentation.option,1);
 await s.screenshot({path:`${out}/student-study.png`});
 for(const index of [1,47,48,99,100,153,154,197,198,245]){await event({type:'set_slide',index});await p.waitForFunction(i=>document.querySelector('.slide-letterbox')&&document.body.textContent.includes('港口管理'),index);assert.equal((await snapshot()).slide.index,index);}
 assert.equal(await p.locator('.classroom-toast--error').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/classroom${process.argv.includes('--interactions')?'-interactions':''}.json`,JSON.stringify({sessionId:session.id,results,errors,freeBrowsing:true,oneClickFollow:true,localRevealIsolation:true,crossLessonNavigation:true,refreshRestore:true,studyReplay:true,teacherSync:true,permission403:true,stale409:true},null,2));console.log(`PASS ${results.length} classroom page states + navigation, disclosure and permissions`);
}catch(e){await p?.screenshot({path:`${out}/classroom-failure-teacher.png`}).catch(()=>{});await s?.screenshot({path:`${out}/classroom-failure-student.png`}).catch(()=>{});await fs.writeFile(`${out}/classroom-failure.json`,JSON.stringify({results,errors,error:String(e)},null,2));throw e;}finally{await browser.close();}
