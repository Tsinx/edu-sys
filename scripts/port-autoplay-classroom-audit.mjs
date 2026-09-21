import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base='http://127.0.0.1:5188',api='http://127.0.0.1:4318',out='output/port-autoplay-qa',browser=await chromium.launch({headless:true}),checks=[],errors=[];
await fs.mkdir(out,{recursive:true});
try{
 async function role(name){const ctx=await browser.newContext({viewport:{width:1600,height:1100}});await ctx.route('**/api/**',r=>{const u=new URL(r.request().url());return r.continue({url:api+u.pathname+u.search});});assert.equal((await ctx.request.post(api+'/api/identity/development/session',{data:{role:name,displayName:'自动播放验收'}})).status(),201);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));return p;}
 const p=await role('teacher'),s=await role('student');const session=(await(await p.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json()),root=api+`/api/class-sessions/${session.id}`;
 const event=async index=>assert.equal((await p.request.post(root+'/events',{data:{type:'set_slide',index}})).status(),201);
 await p.goto(base+`/classroom/${session.id}`);await s.goto(base+`/join/${session.id}`);
 for(const [lesson,index]of[[7,294],[8,342]]){
  await event(index);await p.locator(`[aria-label="第${lesson}讲第1页"]`).waitFor();await s.locator(`[aria-label="第${lesson}讲第1页"]`).waitFor();
  const slider=p.getByLabel('动画进度',{exact:true});await p.getByRole('button',{name:'暂停',exact:true}).waitFor({timeout:15000});await p.waitForFunction(()=>Number(document.querySelector('.pe-playback input').value)>100);
  await p.getByRole('button',{name:'暂停',exact:true}).click();const value=await slider.inputValue();await p.waitForTimeout(500);
  const snap=(await(await p.request.get(root+'/snapshot')).json()).portExpansionPresentation;assert.ok(Math.abs(snap.progress-Number(value)/1000)<.002);
  const teacher=await p.locator('.port-expansion-slide').innerHTML();await s.waitForFunction(html=>document.querySelector('.port-expansion-slide')?.innerHTML===html,teacher);await p.waitForTimeout(2200);assert.equal(await slider.inputValue(),value);assert.equal(await s.locator('.pe-playback,.pe-guide').count(),0);
  checks.push({lesson,autoStarted:true,studentSynced:true,pausePersisted:true});
 }
 await event(1);await p.waitForFunction(()=>!document.querySelector('.pe-playback'));await p.waitForTimeout(2500);assert.equal(await p.getByLabel('动画进度',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/classroom.json`,JSON.stringify({sessionId:session.id,checks,firstLessonStatic:true,errors},null,2));console.log('PASS classroom autoplay, student follow and first lesson static');
}finally{await browser.close();}
