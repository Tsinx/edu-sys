import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.STUDENT_QA_URL??'http://127.0.0.1:4176',api=process.env.STUDENT_QA_API??'http://127.0.0.1:4316',out='output/student-learning-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const part=process.env.STUDENT_QA_PART??'all'; const reportPath=out+'/browser-report-'+part+'.json'; const checks=[],errors=[],pages=[];
const pass=name=>{checks.push(name);console.log('PASS',name);};
async function context(role){
 const ctx=await browser.newContext({viewport:{width:1600,height:1100},deviceScaleFactor:0.5,serviceWorkers:'block'});
 await ctx.route('**/api/**',route=>{const url=new URL(route.request().url());return route.continue({url:api+url.pathname+url.search});});
 const res=await ctx.request.post(api+'/api/identity/development/session',{data:{role}});assert.equal(res.status(),201);
 await ctx.addInitScript(()=>localStorage.setItem('edu-avatar-renderer-v1','video')); const page=await ctx.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push({role,message:e.message}));pages.push(page);return {ctx,page,identity:await res.json()};
}
const overflow=async p=>p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&i.complete&&i.naturalWidth===0).map(i=>i.src)}));
try{
 const t=await context('teacher'),s=await context('student'),p=s.page;
 const created=await t.ctx.request.post(api+'/api/courses/course-port-management-intro/class-sessions');assert.ok(created.ok());const session=await created.json();
 const root=api+`/api/class-sessions/${session.id}`;
 const event=async data=>{const r=await t.ctx.request.post(root+'/events',{data});assert.ok(r.ok(),await r.text());return r.json();};
 const snap=async()=>await(await t.ctx.request.get(root+'/snapshot')).json();
 await p.goto(base+'/');await p.locator('.student-home').waitFor();await p.screenshot({scale:'css',path:out+'/home-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.screenshot({scale:'css',path:out+'/home-mobile.png',fullPage:true});assert.ok((await overflow(p)).scroll<=391);await p.setViewportSize({width:1600,height:1100});
 pass('student home shows real live classroom and responsive course cards');
 await event({type:'set_slide',index:154});await p.goto(base+`/join/${session.id}`);await p.locator('.student-learning[data-following=true]').waitFor();await p.getByLabel('当前讲页码',{exact:true}).waitFor();
 await p.getByRole('button',{name:'下一页',exact:true}).click();await p.locator('.student-learning[data-following=false]').waitFor();assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'2');
 await event({type:'set_slide',index:163});await p.waitForFunction(()=>document.querySelector('.student-teacher-position strong')?.textContent.includes('第10页'));assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'2');
 await p.reload();await p.locator('.student-learning[data-following=false]').waitFor();assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'2');
 await p.getByRole('button',{name:'一键跟上教师',exact:true}).click();await p.locator('.student-learning[data-following=true]').waitFor();assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'10');
 await p.screenshot({scale:'css',path:out+'/classroom-desktop.png',fullPage:true});pass('follow, free browsing, teacher advance, refresh and one-click return');
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'目录',exact:true}).click();await p.locator('.student-directory').waitFor();await p.screenshot({scale:'css',path:out+'/directory-mobile.png'});await p.getByRole('button',{name:'关闭目录',exact:true}).click();assert.ok((await overflow(p)).scroll<=391);await p.screenshot({scale:'css',path:out+'/classroom-mobile.png',fullPage:true});await p.setViewportSize({width:1600,height:1100});pass('mobile drawer, slide aspect and navigation fit 390px');
 if(part!=='pages'){ await t.page.goto(base+`/classroom/${session.id}`);await t.page.getByRole('button',{name:'仿真系统',exact:true}).click();await t.page.waitForURL('**/simulations?**');
 await t.page.locator('.port-ops[data-course=arrival]').waitFor({timeout:60000});await p.locator('.port-ops[data-course=arrival]').waitFor({timeout:60000});await p.locator('[data-renderer=ready]').waitFor({timeout:60000});assert.equal((await snap()).simulationNavigation.unit,'arrival'); for(const page of [t.page,p]){const skip=page.getByRole('button',{name:'跳过，直接练习',exact:true});if(await skip.isVisible())await skip.click();}
 await p.evaluate(()=>window.qaCanvas=document.querySelector('.port-ops canvas'));
 await event({type:'set_simulation_navigation',navigation:(await snap()).simulationNavigation});assert.equal(await p.evaluate(()=>window.qaCanvas===document.querySelector('.port-ops canvas')),true);
 await p.getByRole('button',{name:'开始本段',exact:true}).click();await p.locator('.student-learning[data-following=false]').waitFor();
 const originalUnit=await p.locator('.port-ops').getAttribute('data-course');
 if(await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).isVisible())await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).click();await t.page.getByRole('navigation',{name:'课程分段'}).getByRole('button',{name:/装卸/}).click();await t.page.locator('.port-ops[data-course=cargo]').waitFor();await p.waitForFunction(()=>document.querySelector('.student-teacher-position strong')?.textContent.includes('装卸'));assert.equal(await p.locator('.port-ops').getAttribute('data-course'),originalUnit);
 await p.getByRole('button',{name:'一键跟上教师',exact:true}).click();console.log('student following cargo');await p.locator('.port-ops[data-course=cargo]').waitFor();pass('real teacher simulator entry and module selection reach independently running student');
 for(const [unit,label] of [['yard','堆场'],['departure','离港'],['planning','规划']]){if(await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).isVisible())await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).click();await t.page.getByRole('navigation',{name:'课程分段'}).getByRole('button',{name:new RegExp(label)}).click();await t.page.locator(`.port-ops[data-course=${unit}]`).waitFor();await p.locator(`.port-ops[data-course=${unit}]`).waitFor();}
 await p.setViewportSize({width:390,height:844});await p.screenshot({scale:'css',path:out+'/simulation-mobile.png',fullPage:true});assert.ok((await overflow(p)).scroll<=391,JSON.stringify(await overflow(p)));await p.setViewportSize({width:1600,height:1100});await p.screenshot({scale:'css',path:out+'/simulation-desktop.png',fullPage:true});
 if(await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).isVisible())await t.page.getByRole('button',{name:'跳过，直接练习',exact:true}).click();await t.page.getByRole('link',{name:'← 返回课件',exact:true}).click();await t.page.waitForURL('**/classroom/**');await p.locator('.student-reader__stage .slide-logical-canvas').waitFor();assert.equal((await snap()).simulationNavigation,null);pass('module changes, mobile simulator and return to source slide'); }
 await p.getByRole('button',{name:'自主浏览',exact:true}).click();await s.ctx.setOffline(true);await p.getByRole('button',{name:'上一页',exact:true}).click();await event({type:'set_slide',index:172});await s.ctx.setOffline(false);await p.waitForFunction(()=>document.querySelector('.student-teacher-position strong')?.textContent.includes('第19页'));assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'9');await p.getByRole('button',{name:'一键跟上教师',exact:true}).click();pass('offline reading and reconnection preserve free-browsing position');
 await s.ctx.route('**/snapshot/stream',route=>route.abort());await p.reload();await p.locator('.student-learning').waitFor();await p.getByRole('button',{name:'自主浏览',exact:true}).click();
 await event({type:'set_slide',index:173});await p.waitForFunction(()=>document.querySelector('.student-teacher-position strong')?.textContent.includes('第20页'));await p.getByRole('button',{name:'一键跟上教师',exact:true}).click();assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),'20');await s.ctx.unroute('**/snapshot/stream');await p.reload();pass('polling-only connection still supports one-click follow');
 if(part!=='simulation'){ // All published port pages, at desktop and phone widths, through student navigation.
 await p.getByRole('button',{name:'自主浏览',exact:true}).click();
 const audit=[];
 for(const width of [1600,390]){
  await p.setViewportSize({width,height:width===390?844:1100});
  for(const [lesson,total] of [[1,47],[2,52],[3,54],[4,44]]){
   await p.getByLabel('选择课次',{exact:true}).selectOption(String(lesson));
   for(let local=1;local<=total;local++){
    if(local>1)await p.getByRole('button',{name:'下一页',exact:true}).click();
    await p.locator('.slide-logical-canvas').waitFor();
    assert.equal(await p.getByLabel('当前讲页码',{exact:true}).inputValue(),String(local));
    const view=await overflow(p);assert.ok(view.scroll<=width+1,JSON.stringify({lesson,local,...view}));assert.deepEqual(view.broken,[]);
    const leak=await p.locator('.slide-logical-canvas').evaluate(el=>/data-(teaching-cue|assistant-cue|story-beat|voyage-stage|open-question)/.test(el.outerHTML));assert.equal(leak,false);
    audit.push({width,lesson,page:local});
   }
  }
  console.log('PORT PAGES',width,audit.length);
 }
 await fs.writeFile(out+'/page-audit.json',JSON.stringify(audit,null,2));pass(`${audit.length} student page/viewport checks`);
 await p.goto(base+'/study/course-port-management-intro');await p.locator('.study-page').waitFor();await p.locator('.study-deck__toolbar select').selectOption('4');await p.getByRole('link',{name:'仿真系统',exact:true}).waitFor();await p.screenshot({scale:'css',path:out+'/study-mobile.png',fullPage:true});assert.ok((await overflow(p)).scroll<=391);
 await p.getByRole('link',{name:'仿真系统',exact:true}).click();await p.locator('.port-ops[data-course=arrival]').waitFor({timeout:60000});if(await p.getByRole('button',{name:'跳过，直接练习',exact:true}).isVisible())await p.getByRole('button',{name:'跳过，直接练习',exact:true}).click();await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.study-page').waitFor();assert.equal(await p.locator('.study-deck__toolbar select').inputValue(),'4');pass('after-class study and fourth-lesson experiment preserve reading position');
 for(const course of ['course-economic-mathematics','statistical-analysis','management-principles']){
  const r=await t.ctx.request.post(api+`/api/courses/${course}/class-sessions`);assert.ok(r.ok());const other=await r.json();await p.goto(base+`/join/${other.id}`);await p.locator('.student-learning').waitFor();await p.getByRole('button',{name:'下一页',exact:true}).click();await p.locator('.student-learning[data-following=false]').waitFor();assert.ok((await overflow(p)).scroll<=391);pass(`${course} independent navigation`);
 }
 await p.goto(base+`/join/${session.id}`);await t.ctx.request.post(root+'/end');await p.getByText('课堂已结束',{exact:true}).waitFor();await p.getByRole('button',{name:'上一页',exact:true}).click();assert.equal(await p.getByRole('button',{name:'一键跟上教师',exact:true}).isDisabled(),true);pass('ended classroom stays available for independent review');
 } assert.deepEqual(errors,[]);
 await fs.writeFile(reportPath,JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){for(let i=0;i<pages.length;i++)await pages[i].screenshot({scale:'css',path:out+`/failure-${i}.png`,fullPage:true,timeout:5000}).catch(()=>{});await fs.writeFile(reportPath,JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}finally{await browser.close();}
