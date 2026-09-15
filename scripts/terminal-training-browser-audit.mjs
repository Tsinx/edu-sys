import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createTerminalState, applyTerminalCommand, serializeTerminal } from '../packages/port-simulation-core/src/terminal-lab.ts';
import { restoreTraining, trainingScore } from '../packages/port-simulation-core/src/terminal-training.ts';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.TERMINAL_TEST_URL ?? 'http://127.0.0.1:5173';
const output=fileURLToPath(new URL('../output/terminal-3d-qa/',import.meta.url));await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];let captureIndex=0;
const check=(name)=>{checks.push(name);console.log(`PASS ${name}`);};
async function open(width=1600){
 const page=await browser.newPage({viewport:{width,height:1100}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const original=Date.now.bind(Date);window.__trainingWallOffset=0;Date.now=()=>original()+window.__trainingWallOffset;});
 await page.route(u=>u.pathname.endsWith('/TerminalScene3D.tsx') || /\/assets\/TerminalScene3D-[^/]+\.js$/.test(u.pathname),async route=>{
  const response=await route.fetch();let body=await response.text();
  if(base.includes(':5173')){
   body=body.replace('const p = latest.current;','if(window.__holdTerminalCapture)return;const p = latest.current;');
   body=body.replace('renderer.render(scene, camera);','renderer.render(scene, camera);window.__terminalView={at:performance.now(),minute:state.minute,moving:!!r.goal,camera:camera.position.toArray(),selected:latest.current.selected};');
  }else{
   // Instrument only the test response. Keep the deployed bundle and physics unchanged.
   const loop=body.match(/\.setAnimationLoop\(([\w$]+)=>\{if\(/);assert.ok(loop);
   const tail=body.slice(loop.index);const state=tail.match(/let ([\w$]+)=[\w$]+\.current,([\w$]+)=\1\.state/);const draw=tail.match(/([\w$]+)\.render\(([\w$]+),([\w$]+)\)/);const goal=tail.match(/([\w$]+)\.goal/);assert.ok(state&&draw&&goal);
   body=body.replace(loop[0],`.setAnimationLoop(${loop[1]}=>{if(window.__holdTerminalCapture)return;if(`);
   body=body.replace(draw[0],`${draw[0]},window.__terminalView={at:performance.now(),minute:${state[2]}.minute,moving:!!${goal[1]}.goal,camera:${draw[3]}.position.toArray(),selected:${state[1]}.selected}`);
  }
  await route.fulfill({response,body});
 });
 await page.goto(`${base}/port-simulation-preview.html?lab=legacy`);await page.locator('[data-renderer="ready"]').waitFor({timeout:60000});
 await page.waitForFunction(()=>window.__terminalView);await page.evaluate(()=>{window.__holdTerminalCapture=true;});return page;
}
const clock=async p=>(await p.locator('.terminal-clock strong').textContent()).split(':').reduce((n,v)=>n*60+Number(v),0);
async function jump(p,milliseconds){const before=await clock(p);await p.evaluate(ms=>{window.__trainingWallOffset+=ms;},milliseconds);await p.waitForFunction(value=>{const sec=document.querySelector('.terminal-clock strong').textContent.split(':').reduce((n,v)=>n*60+Number(v),0);return sec>value || [...document.querySelectorAll(".terminal-play-actions button")].some(b=>b.textContent==="继续运行");},before);}
async function capture(p,name){
 await p.locator('.terminal-viewport').scrollIntoViewIfNeeded();await p.evaluate(()=>{window.__holdTerminalCapture=false;});
 const stamp=await p.evaluate(()=>window.__terminalView?.at??0);await p.waitForFunction(t=>window.__terminalView&&window.__terminalView.at>t&&!window.__terminalView.moving,stamp);
 const colors=await p.evaluate(()=>{window.__holdTerminalCapture=true;const c=document.querySelector('canvas');const g=c.getContext('webgl2');g.finish();const a=new Uint8Array(4),colors=[];for(let x=1;x<5;x++)for(let y=1;y<4;y++){g.readPixels(Math.floor(c.width*x/5),Math.floor(c.height*y/4),1,1,g.RGBA,g.UNSIGNED_BYTE,a);colors.push([...a].join(','));}return new Set(colors).size;});
 assert.ok(colors>3,'WebGL contains rendered geometry');
 await p.screenshot({path:`${output}training-${name}-${base.includes(':4173')?'prod':'dev'}.png`,fullPage:true});
 await p.evaluate(()=>{window.__holdTerminalCapture=true;});captureIndex++;
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} no horizontal overflow`);
}
async function choose(p,id){await p.locator(`[data-event-id="${id}"]`).click();await p.locator(`.terminal-event-card[data-event="${id}"]`).waitFor();}
async function perform(p,id){
 await choose(p,id);
 if(id==='b-secure'){
  const disclosure=p.locator('details').filter({has:p.locator('summary').filter({hasText:'现场控制台 · 同步处置流程事件'})}).first();
  if(!await disclosure.evaluate(el=>el.open))await disclosure.locator('summary').first().click();
  await p.getByLabel('实时作业控制台').getByRole('button',{name:'确认 B 船系泊',exact:true}).click();
 }else await p.locator('.terminal-event-card .terminal-primary').click();
}
async function finish(p){
 for(let i=0;i<30;i++){
  if((await p.getByLabel('流程得分',{exact:true}).textContent()).replace(/\s/g,'')==='100/100')return;
  if(await clock(p)>=28800)throw new Error('shift ended: '+await p.locator('.terminal-training-panel').innerText());
  const pending=await p.locator('[data-event-id][data-status="pending"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.eventId));
  if(pending.length){for(const id of pending)await perform(p,id);continue;}
  const resume=p.getByRole('button',{name:'继续运行',exact:true});if(await resume.isEnabled())await resume.click();
  await jump(p,60000);
 }
 throw new Error('normal flow did not finish');
}
async function exportRun(p,name){const downloaded=p.waitForEvent('download');await p.getByRole('button',{name:'导出复盘',exact:true}).click();const d=await downloaded;const path=`${output}${name}.json`;await d.saveAs(path);return {path,raw:await fs.readFile(path,'utf8')};}
try{
 const p=await open();assert.equal(await p.getByLabel('选择训练场').inputValue(),'practice');
 await p.getByRole('button',{name:'开始场次',exact:true}).click();assert.ok(await p.getByRole('button',{name:'继续运行',exact:true}).isEnabled());
 await p.locator('.terminal-other-orders summary').click();
 await p.locator('.terminal-other-orders').getByRole('button',{name:'确认系泊船 A',exact:true}).click();
 assert.match(await p.locator('.terminal-order-result').innerText(),/不扣分/);check('practice explains premature mooring without deductions');
 await perform(p,'a-admit');await choose(p,'b-admit');assert.match(await p.locator('.terminal-event-card').innerText(),/航道由船 A 占用/);
 await p.evaluate(()=>{window.__holdTerminalCapture=false;});await p.getByRole('button',{name:'定位并高亮现场',exact:true}).click();
 await p.waitForFunction(()=>window.__terminalView?.selected==='vessel-b'&&!window.__terminalView.moving);
 await capture(p,'waiting-channel');check('waiting card gives continuation and 3D focus without taking over the scene');
 await p.getByLabel('仿真速度').selectOption('600');await p.getByRole('button',{name:'继续运行',exact:true}).click();await jump(p,20000);
 assert.equal(await clock(p),720);check('practice large clock step stops exactly at the 12-minute arrival');
 await p.getByRole('button',{name:'继续运行',exact:true}).click();await jump(p,1000);assert.ok(await clock(p)>720);await p.getByRole('button',{name:'暂停时钟',exact:true}).click();check('manual continuation does not repause the same event');
 await finish(p);assert.equal(await p.getByLabel('流程得分',{exact:true}).textContent(),'100 / 100');
 const completed=await exportRun(p,'training-complete');const replay=restoreTraining(completed.raw);
 assert.equal(trainingScore(replay).total,100);assert.equal(replay.events.length,9);assert.equal(replay.notifications.length,3);assert.ok(replay.simulation.delivered>299.99999);check('cards and control dock both complete real nodes; 300 deliveries produce 100 and replay exactly');
 await capture(p,'completed');await p.locator('input[type=file]').setInputFiles(completed.path);assert.equal(await p.getByLabel('流程得分',{exact:true}).textContent(),'100 / 100');check('import does not duplicate milestones or score');
 await p.close();
 const narrow=await open(390);await narrow.getByRole('button',{name:'开始场次',exact:true}).click();await perform(narrow,'a-admit');await narrow.getByLabel('仿真速度').selectOption('600');await capture(narrow,'narrow-waiting');await finish(narrow);await capture(narrow,'narrow-completed');check('390px viewport completes full operation chain without horizontal overflow');await narrow.close();
 const battle=await open();await battle.getByLabel('选择训练场').selectOption('battle');assert.equal(await battle.getByLabel('仿真速度').inputValue(),'60');assert.ok(await battle.getByLabel('仿真速度').isDisabled());
 await battle.getByRole('button',{name:'开始场次',exact:true}).click();assert.ok(await battle.getByRole('button',{name:'实战运行中',exact:true}).isDisabled());assert.ok(await battle.getByLabel('选择训练场').isDisabled());
 await battle.locator('.terminal-other-orders summary').click();for(let i=0;i<2;i++)await battle.locator('.terminal-other-orders').getByRole('button',{name:'确认系泊船 A',exact:true}).click();for(let i=0;i<2;i++)await battle.locator('.terminal-other-orders').getByRole('button',{name:'启动A 泊位岸桥',exact:true}).click();
 assert.match(await battle.locator('.terminal-score-detail').innerText(),/扣分 10/);check('battle locks speed and rules; repeated mistakes deduct only once per rule');
 await battle.locator('.terminal-modes').getByRole('button',{name:/港区规划/}).click();const before=await clock(battle);await jump(battle,20000);assert.ok(await clock(battle)>=before+1200);assert.ok(await battle.getByRole('button',{name:'实战运行中',exact:true}).isDisabled());check('switching to planning and delayed events cannot pause battle or add timeout penalties');
 const cdp=await battle.context().newCDPSession(battle);
 await battle.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const beforeBackground=await clock(battle);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await new Promise(resolve=>setTimeout(resolve,1800));await cdp.send('Page.setWebLifecycleState',{state:'active'});
 await battle.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await battle.waitForFunction(value=>document.querySelector('.terminal-clock strong').textContent.split(':').reduce((n,v)=>n*60+Number(v),0)>=value+90,beforeBackground);check('battle catches up elapsed time after a frozen background lifecycle');
 await battle.reload();await battle.locator('[data-renderer="ready"]').waitFor({timeout:60000});await battle.getByText('实战场 · 已中断',{exact:false}).waitFor();assert.ok(await battle.getByRole('button',{name:'继续运行',exact:true}).isDisabled());assert.match(await battle.locator('.terminal-score-detail').innerText(),/扣分 10/);check('refresh preserves deductions and marks unfinished battle interrupted');
 await battle.getByRole('button',{name:'新试验',exact:true}).click();assert.equal(await battle.getByLabel('流程得分',{exact:true}).textContent(),'0 / 100');
 assert.ok(await battle.evaluate(()=>Object.keys(localStorage).some(k=>k.includes(':battle:normal-flow/1.0:attempt:'))));check('new challenge archives interrupted attempt under its own arena and script key');
 for(const engine of ['legacy','realtime']){
  const state=applyTerminalCommand(createTerminalState(undefined,engine),engine==='legacy'?{kind:'advance',minutes:30}:{kind:'tick',seconds:60});
  const raw=serializeTerminal(state);await battle.locator('input[type=file]').setInputFiles({name:`legacy-${engine}.json`,mimeType:'application/json',buffer:Buffer.from(raw)});
  await battle.getByText('旧版存档 · 原规则复盘',{exact:true}).waitFor();assert.equal(await battle.getByLabel('流程得分',{exact:true}).count(),0);
  const exported=await exportRun(battle,`training-compat-${engine}`);assert.equal(exported.raw,raw);
 }
 check('legacy 2.0 and 2.1 load and export unchanged without new grading');await battle.close();
 assert.deepEqual(errors,[]);
 const report={verified:true,base,checks,captures:captureIndex,errors,model:'fixed one-second authoritative simulation; wall time offset used to shorten real waiting'};
 await fs.writeFile(`${output}training-${base.includes(':4173')?'production':'browser'}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){for(const context of browser.contexts())for(const page of context.pages()){try{await fs.writeFile(`${output}training-failure.json`,JSON.stringify(await page.evaluate(()=>({clock:document.querySelector('.terminal-clock')?.innerText,panel:document.querySelector('.terminal-training-panel')?.innerText,store:Object.entries(localStorage)})),null,2));}catch{}}throw error;}finally{await browser.close();}
