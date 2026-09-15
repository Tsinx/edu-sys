import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L4_URL??'http://127.0.0.1:4173',api=process.env.PORT_L4_API??'http://127.0.0.1:4314',out='output/port-lesson-four-navigation-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];
try {
 const ctx=await browser.newContext({viewport:{width:1600,height:1100}}),p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});
 assert.equal((await ctx.request.post(api+'/api/identity/development/session',{data:{role:'teacher'}})).status(),201);
 const ready=async(unit)=>{await p.waitForURL('**/simulations?**');await p.locator(`.port-ops[data-course=${unit}][data-demo=true]`).waitFor({timeout:60000});await p.locator('[data-renderer=ready]').waitFor({timeout:60000});assert.equal(await p.locator('.port-ops').getAttribute('data-embedded-stage'),'false');assert.equal(await p.locator('.port-l4-slide,.l4-demo-host').count(),0);await p.getByRole('button',{name:'播放演示',exact:true}).waitFor();};
 const second=()=>p.locator('.port-ops').getAttribute('data-second');
 for(const [unit,n] of [['arrival',10],['cargo',19],['yard',30],['departure',35]]) {
  await p.goto(`${base}/port-lesson-four-preview.html?page=${n}&channel=external-audit`);
  await p.locator('.l4-scene-entry').click();await ready(unit);
  const initial=await second();await p.waitForTimeout(500);assert.equal(await second(),initial);
  for(let i=0;i<5;i++){
   const title=await p.locator('.port-demo-banner strong').innerText();
   await p.getByRole('button',{name:'下一步演示',exact:true}).click();
   await p.waitForFunction(old=>document.querySelector('.port-demo-banner strong')?.textContent!==old,title);
  }
  const saved=await second();await p.screenshot({path:`${out}/${unit}-full-system.png`});
  await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.port-l4-slide').waitFor();assert.equal(new URL(p.url()).searchParams.get('page'),String(n));
  await p.locator('.l4-scene-entry').click();await ready(unit);assert.equal(await second(),saved);
  await p.reload();await ready(unit);assert.equal(await second(),saved);
  await p.goBack();await p.locator('.port-l4-slide').waitFor();assert.equal(new URL(p.url()).searchParams.get('page'),String(n));
  checks.push({source:'preview',unit,page:n,initial,saved,paused:true,refresh:true,back:true});console.log(`preview ${unit}: external, return, reentry and refresh passed`);
 }
 const session=await(await ctx.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json();
 const root=api+`/api/class-sessions/${session.id}`;
 const snapshot=async()=>await(await ctx.request.get(root+'/snapshot')).json();
 const event=async(index)=>{const r=await ctx.request.post(root+'/events',{data:{type:'set_slide',index}});assert.ok(r.ok());return r.json();};
 const control=async(cueId)=>{const r=await ctx.request.post(root+'/avatar/control',{data:{protocol:'edu.classroom.control',version:'1.0',requestId:crypto.randomUUID(),actions:[{type:'simulation.open_demo',cueId}]}});assert.ok(r.ok());return r.json();};
 for(const [unit,n] of [['arrival',10],['cargo',19],['yard',30],['departure',35]]) {
  const before=await event(153+n);
  await p.goto(`${base}/classroom/${session.id}`);await p.locator('.l4-scene-entry').waitFor({timeout:60000});
  await p.locator('.l4-scene-entry').click();await ready(unit);
  const state=await snapshot();assert.equal(state.teacherDemo.active,false);assert.deepEqual(state.simulation,before.simulation);
  await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.port-l4-slide').waitFor();assert.equal((await snapshot()).slide.index,153+n);
  checks.push({source:'classroom',unit,page:n,studentUnchanged:true,returned:true});console.log(`classroom ${unit}: external and return passed`);
 }
 await event(156);await p.reload();await p.locator('.l4-playback input').waitFor();await p.locator('.l4-playback input').fill('375');await p.waitForTimeout(1200);
 await control('l4-arrival');await ready('arrival');await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.l4-playback input').waitFor();assert.equal(await p.locator('.l4-playback input').inputValue(),'375');
 checks.push({source:'assistant-action',unit:'arrival',originPage:3,animationRestored:true});
 // The whole simulator remains usable at narrow widths, including its return link.
 await p.setViewportSize({width:390,height:844});await control('l4-yard');await ready('yard');const link=await p.getByRole('link',{name:'← 返回课件',exact:true}).boundingBox();assert.ok(link.height>=44);await p.screenshot({path:`${out}/full-system-390.png`});
 await p.getByRole('link',{name:'← 返回课件',exact:true}).click();await p.locator('.port-l4-slide').waitFor();assert.equal((await snapshot()).slide.index,156);
 await fs.writeFile(`${out}/navigation.json`,JSON.stringify({checks,errors,narrowReturnHeight:link.height},null,2));assert.deepEqual(errors,[]);
 console.log('PASS: four preview and four classroom redirects, assistant action, return/back/refresh and original animation');
} catch(e) {await fs.writeFile(`${out}/navigation-failure.json`,JSON.stringify({checks,errors,error:String(e)},null,2));throw e;} finally {await browser.close();}
