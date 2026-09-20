import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base='http://127.0.0.1:5173',api='http://127.0.0.1:4316',out='output/port-lesson-six-film',firstOnly=process.argv.includes('--first-only');
const b=await chromium.launch({headless:true,args:['--use-angle=d3d11']}),errors=[],result={pages:[]};
const c=await b.newContext({viewport:{width:1600,height:1100}});
await c.addInitScript(()=>{window.__starts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(when,offset){window.__starts.push({when,offset,duration:this.buffer.duration,at:this.context.currentTime});return start.apply(this,arguments);};});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
try{
 for(const n of firstOnly?[]:[25,26,27,29,31,32,33,34,35,36,37,38]){
  await p.goto(`${base}/port-lesson-six-preview.html?page=${n}&channel=runtime-${n}`);await p.locator('.earth-globe--ready').waitFor({timeout:60000});assert.equal((await p.evaluate(()=>window.__starts)).length,0);
  await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(()=>window.__starts.length>0);await p.waitForTimeout(220);await p.getByRole('button',{name:'暂停',exact:true}).click();
  const slider=p.getByRole('slider',{name:'动画进度',exact:true});await slider.fill('500');const count=await p.evaluate(()=>window.__starts.length);await p.getByRole('button',{name:'播放',exact:true}).click();await p.waitForFunction(count=>window.__starts.length>count,count);await p.getByRole('button',{name:'暂停',exact:true}).click();
  const mid=await p.evaluate(count=>window.__starts.slice(count),count);assert.ok(mid.every(s=>s.offset>=0&&s.offset<s.duration));await slider.fill('1000');const localPage=await p.getByLabel('第6讲课件页',{exact:true}).inputValue();await p.waitForTimeout(200);assert.equal(localPage,String(n));
  result.pages.push({page:n,startAndMidAudio:true,endStopsOnPage:true});console.log('runtime '+n);
 }
 await c.close();
 for(const fallback of firstOnly?[]:['webgl','reduced']){
  const fc=await b.newContext({viewport:{width:1600,height:1100},...(fallback==='reduced'?{reducedMotion:'reduce'}:{})});
  if(fallback==='webgl')await fc.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  const f=await fc.newPage();f.on('pageerror',e=>errors.push(e.message));await f.goto(`${base}/port-lesson-six-preview.html?page=35&channel=fallback-${fallback}`);await f.getByRole('img',{name:'港口与腹地平面分镜',exact:true}).waitFor();await f.getByRole('button',{name:'播放',exact:true}).click();await f.getByRole('button',{name:'暂停',exact:true}).waitFor();await f.waitForTimeout(200);const slider=f.getByRole('slider',{name:'动画进度',exact:true});assert.ok(Number(await slider.inputValue())<1000);await f.getByRole('button',{name:'暂停',exact:true}).click();await slider.fill('1000');await f.getByRole('img',{name:'港口与腹地平面分镜',exact:true}).getByText('远洋网络',{exact:true}).waitFor();await f.locator('.port-l6-slide').screenshot({path:`${out}/fallback-${fallback}.png`});result[fallback+'Fallback']=true;await fc.close();
 }
 const tc=await b.newContext({viewport:{width:1600,height:1100},deviceScaleFactor:.5});await tc.route('**/api/**',route=>{const u=new URL(route.request().url());return route.continue({url:api+u.pathname+u.search});});await tc.request.post(api+'/api/identity/development/session',{data:{role:'teacher',displayName:'第一讲回归'}});
 const session=await(await tc.request.post(api+'/api/courses/course-port-management-intro/class-sessions')).json(),root=api+'/api/class-sessions/'+session.id;await tc.request.post(root+'/events',{data:{type:'set_slide',index:2}});
 const control=async actions=>{const r=await tc.request.post(root+'/avatar/control',{data:{protocol:'edu.classroom.control',version:'1.0',requestId:crypto.randomUUID(),actions}});assert.ok(r.ok(),await r.text());return r.json();};
 const started=await control([{type:'globe.play_cue',cueId:'l1-opening-trade-influence'}]);await control([{type:'globe.pause'}]);const t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));await t.goto(base+'/classroom/'+session.id);await t.locator('.cinematic-globe .earth-globe--ready').waitFor({timeout:60000});await control([{type:'globe.pause'}]);await t.locator('.cinematic-globe').getByText('已暂停',{exact:true}).waitFor();await control([{type:'globe.resume'}]);await tc.request.post(root+'/events',{data:{type:'globe_advance',runId:started.snapshot.globePlayback.runId,fromStepIndex:0}});await control([{type:'globe.pause'}]);await t.locator('.cinematic-globe__story').getByText('海峡两岸：四倍人口差',{exact:true}).waitFor();await t.waitForTimeout(3700);await t.locator('.cinematic-globe').screenshot({path:out+'/lesson-one-regression.png'});result.lessonOneCue=true;await tc.close();
 assert.deepEqual(errors,[]);await fs.writeFile(out+(firstOnly?'/lesson-one-regression.json':'/regression.json'),JSON.stringify({...result,errors},null,2));console.log('PASS regression');
}catch(e){await fs.writeFile(out+'/regression-failure.json',JSON.stringify({...result,errors,error:String(e)},null,2));throw e;}finally{await b.close();}
