import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.STUDENT_QA_URL??'http://127.0.0.1:4176',api=process.env.STUDENT_QA_API??'http://127.0.0.1:4316',out='output/student-learning-qa';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];
const pass=name=>{checks.push(name);console.log('PASS',name);};
const records=page=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('edu-campus-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};}));
try{
 const t=await browser.newContext({viewport:{width:1000,height:800},deviceScaleFactor:.5,serviceWorkers:'block'}),s=await browser.newContext({viewport:{width:1000,height:800},deviceScaleFactor:.5,serviceWorkers:'block'});
 for(const ctx of [t,s]){await ctx.route('**/api/**',r=>{const u=new URL(r.request().url());return r.continue({url:api+u.pathname+u.search});});await ctx.addInitScript(()=>localStorage.setItem('edu-avatar-renderer-v1','video'));}
 const teacher=await(await t.request.post(api+'/api/identity/development/session',{data:{role:'teacher'}})).json();
 const first=await(await s.request.post(api+'/api/identity/development/session',{data:{role:'student'}})).json();
 const session=await(await t.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json(),root=api+'/api/class-sessions/'+session.id;
 const event=async data=>{const r=await t.request.post(root+'/events',{data});assert.ok(r.ok(),await r.text());return r.json();};
 await event({type:'set_slide',index:163});
 const setup=await t.request.post(root+'/simulation/setup',{data:{deliveryMode:'local_solo',trainingMode:'battle',learningStage:'full',challengeId:'joint-watch',expectedStudentCount:30}});assert.ok(setup.ok(),await setup.text());
 await event({type:'set_activity',activity:'simulation'});
 const p=await s.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/join/'+session.id);
 await p.locator('.port-ops[data-course=full][data-mode=battle]').waitFor();await p.getByRole('button',{name:'开始值班',exact:true}).click();await p.locator('.student-learning[data-following=false]').waitFor();await p.locator('.port-ops[data-status=running]').waitFor();
 await event({type:'set_slide',index:164});await p.waitForFunction(()=>document.querySelector('.student-teacher-position strong')?.textContent.includes('第11页'));assert.equal(await p.locator('.port-ops').getAttribute('data-course'),'full');
 await p.getByRole('button',{name:'一键跟上教师',exact:true}).click();await p.locator('.slide-logical-canvas').waitFor();
 const firstRecords=(await records(p)).filter(r=>r.actorId===first.actor.actorId);assert.ok(firstRecords.some(r=>r.key.includes(`course-port-management-intro:${first.actor.actorId}`)));assert.ok(firstRecords.every(r=>r.actorId!==teacher.actor.actorId));pass('published challenge retains battle mode and original personal storage scope');
 const second=await(await s.request.post(api+'/api/identity/development/session',{data:{role:'student'}})).json();assert.notEqual(first.actor.actorId,second.actor.actorId);
 await p.reload();await p.locator('.student-learning[data-following=true]').waitFor();await p.getByRole('button',{name:'仿真系统',exact:true}).click();await p.locator('.port-ops[data-course=arrival][data-status=ready]').waitFor();
 const after=await records(p);assert.deepEqual(after.filter(r=>r.actorId===first.actor.actorId),firstRecords);assert.ok(after.some(r=>r.actorId===second.actor.actorId));
 const forbidden=await s.request.post(root+'/events',{data:{type:'set_simulation_navigation',navigation:null}});assert.equal(forbidden.status(),403);pass('second account starts independently and cannot modify first account saves or teacher location');
 await p.getByRole('button',{name:'舞台全屏',exact:true}).click();await p.locator('.student-fullscreen-position').waitFor();await p.locator('.student-fullscreen-position button').click();await p.locator('.slide-logical-canvas').waitFor();pass('one-click teacher return remains available inside simulation fullscreen');
 await event({type:'set_slide',index:163});const tp=await t.newPage();tp.setDefaultTimeout(60000);tp.on('pageerror',e=>errors.push(e.message));await tp.goto(base+'/classroom/'+session.id);await tp.locator('.l4-scene-entry').click();await tp.waitForURL('**/simulations?**');assert.equal(new URL(tp.url()).searchParams.get('session'),session.id);
 await p.locator('.port-ops[data-course=arrival]').waitFor();const snapshot=await(await t.request.get(root+'/snapshot')).json();assert.equal(snapshot.simulationNavigation.unit,'arrival');pass('original fourth-lesson scene entry publishes a cross-page teacher location');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/isolation-report.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await fs.writeFile(out+'/isolation-report.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}finally{await browser.close();}
