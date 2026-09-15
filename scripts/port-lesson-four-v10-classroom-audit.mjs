import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L4_URL??'http://127.0.0.1:5173',api='http://127.0.0.1:4314',out='output/port-lesson-four-v10-qa';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[],httpErrors=[];
try {
 const p=await browser.newPage({viewport:{width:1600,height:1100}});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)httpErrors.push([r.url(),r.status()]);});
 await p.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});
 assert.equal((await p.request.post(api+'/api/identity/development/session',{data:{role:'teacher'}})).status(),201);
 const session=await (await p.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json(),root=api+`/api/class-sessions/${session.id}`;
 const snapshot=async()=>await(await p.request.get(root+'/snapshot')).json();
 const event=async data=>{const r=await p.request.post(root+'/events',{data});assert.ok(r.ok(),await r.text());return r.json();};
 const control=async actions=>{const r=await p.request.post(root+'/avatar/control',{data:{protocol:'edu.classroom.control',version:'1.0',requestId:crypto.randomUUID(),actions}});assert.ok(r.ok(),await r.text());return r.json();};
 const second=async()=>Number(await p.locator('.port-ops[data-demo=true]').getAttribute('data-second'));
 const ready=async()=>{await p.locator('.port-ops[data-demo=true]').waitFor({timeout:60000});await p.locator('[data-renderer=ready]').waitFor({timeout:60000});};
 const waitSummary=async(previous=0)=>{for(let i=0;i<80;i++){const s=await snapshot();if(s.teacherDemo?.revision>previous&&s.teacherDemo.visibleSummary)return s;await p.waitForTimeout(100);}throw new Error('No current summary');};
 for(const [cueId,page] of [['l4-arrival',10],['l4-cargo',19],['l4-yard',30],['l4-departure',35]]){
  const start=await event({type:'set_slide',index:153+page}),student=start.simulation;
  await p.goto(base+`/classroom/${session.id}`);await p.locator('.l4-scene-entry').waitFor({timeout:60000});
  await p.locator('.l4-scene-entry').click();await ready();let s=await waitSummary();const initial=await second();
  assert.equal(s.teacherDemo.cueId,cueId);assert.equal(s.activeActivity,'slides');assert.equal(s.slide.total,197);assert.deepEqual(s.simulation,student);assert.equal(JSON.parse(s.teacherDemo.visibleSummary).playing,false);
  await p.waitForTimeout(700);assert.equal(await second(),initial,'entry is paused');
  assert.equal(await p.getByRole('button',{name:'返回自主练习',exact:true}).count(),0);
  await p.getByRole('button',{name:'下一步演示',exact:true}).click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:'播放演示',exact:true}).click();await p.waitForTimeout(1600);await p.getByRole('button',{name:'暂停演示',exact:true}).click();await p.waitForTimeout(400);
  const paused=await second();s=await snapshot();await p.waitForTimeout(600);assert.equal(await second(),paused,'pause freezes clock');
  const field=await p.locator('.port-ops-scene').boundingBox();assert.ok(field&&field.height>300&&field.y+field.height<1100,'3D scene is visible in main stage');await p.screenshot({path:`${out}/${cueId}-main-stage.png`});
  await p.getByRole('button',{name:'← 返回原课件页',exact:true}).click();await p.locator('.port-l4-slide').waitFor();assert.equal(await p.locator('.l4-footer strong').innerText(),`${String(page).padStart(2,'0')} / 44`);
  await p.waitForTimeout(400);const inactive=await snapshot();assert.equal(inactive.teacherDemo.active,false);
  await p.locator('.l4-scene-entry').click();await ready();assert.equal(await second(),paused,'reentry restores paused scene');s=await waitSummary();
  const revision=s.teacherDemo.revision;await p.reload();await ready();assert.equal(await second(),paused,'refresh restores scene');s=await waitSummary(revision);assert.equal(JSON.parse(s.teacherDemo.visibleSummary).playing,false);
  const currentRun=s.teacherDemo.runId;const duplicate=await control([{type:'simulation.open_demo',cueId}]);assert.equal(duplicate.snapshot.teacherDemo.runId,currentRun);
  await p.getByRole('button',{name:'重播本段',exact:true}).first().click();await p.waitForTimeout(500);assert.equal(await second(),initial,'explicit replay resets');
  let steps=0;while(await p.getByRole('button',{name:'下一步演示',exact:true}).isEnabled()){
   assert.ok(steps++<300,`${cueId} failed to finish`);try{await p.getByRole('button',{name:'下一步演示',exact:true}).click({timeout:30000,noWaitAfter:true});}catch(e){if(await p.locator('.port-course-goals button[data-done=false]').count()===0)break;throw e;}await p.waitForTimeout(250);
  }
  await p.waitForTimeout(700);s=await snapshot();const summary=JSON.parse(s.teacherDemo.visibleSummary);assert.ok(summary.goals.every(g=>g.done),JSON.stringify(summary.goals));assert.deepEqual(s.simulation,student);
  const prompt=await(await p.request.get(root+'/assistant-prompts')).json();assert.ok(prompt.compiled.includes(currentRun));assert.ok(prompt.compiled.includes(s.teacherDemo.visibleSummary));
  await p.getByRole('button',{name:'课程目标',exact:true}).click();await p.screenshot({path:`${out}/${cueId}-completed.png`});await p.locator('.port-ops[data-demo=true]').screenshot({path:`${out}/evidence-${cueId.slice(3)}-v10.png`});await p.getByRole('button',{name:'课程目标',exact:true}).click();
  results.push({cueId,initial,paused,steps,revision:s.teacherDemo.revision,summary,studentUnchanged:true,refresh:true,renderer:'ready'});
  await control([{type:'simulation.return_to_slides'}]);await p.locator('.port-l4-slide').waitFor();assert.equal((await snapshot()).slide.index,153+page);
  console.log(`${cueId}: complete, replay/reentry/refresh/summary passed (${steps} steps)`);
 }
 // Animation and fullscreen survive a demo opened by the same AI control path from a non-entry page.
 await event({type:'set_slide',index:156});await p.reload();await p.locator('.l4-playback input').waitFor();await p.locator('.l4-playback input').fill('375');await p.getByRole('button',{name:'全屏',exact:true}).first().click();
 await control([{type:'simulation.open_demo',cueId:'l4-arrival'}]);await ready();await control([{type:'simulation.return_to_slides'}]);await p.locator('.port-l4-slide').waitFor();
 assert.equal(await p.locator('.l4-playback input').inputValue(),'375');assert.ok(await p.evaluate(()=>!!document.fullscreenElement));
 await fs.writeFile(`${out}/classroom.json`,JSON.stringify({base,sessionId:session.id,results,animationRestored:true,fullscreenPreserved:true,errors,httpErrors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS: 4 real main-stage demos and independent student state; animation/fullscreen restored');
}catch(e){await fs.writeFile(`${out}/classroom-failure.json`,JSON.stringify({results,errors,httpErrors,error:String(e)},null,2));throw e;}finally{await browser.close();}
