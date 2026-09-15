import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const out=fileURLToPath(new URL('../output/port-navigation-qa/',import.meta.url));await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--window-size=1600,1000','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1600,height:1000},screen:{width:1600,height:1000},recordVideo:{dir:out,size:{width:1600,height:1000}}});
const videoStarted=Date.now(),marks={};
const p=await context.newPage(),checks=[],errors=[];p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{const base=Date.now();window.__offset=0;Date.now=()=>base+window.__offset;const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',e=>{if(e.data.tutorial){window.__tutorial=e.data.tutorial;window.__view=e.data.view;}});}};});
const click=async key=>{await p.locator(`[data-tutorial-target="${key}"]`).first().click();if(key==="clock:resume"||key==="clock:pause")await p.waitForFunction(status=>window.__view.status===status,key==="clock:resume"?"running":"paused");};
async function jump(seconds){const before=await p.evaluate(()=>window.__view.second);await p.evaluate(seconds=>window.__offset+=seconds/Number(document.querySelector('[aria-label="运行速度"]').value)*1000,seconds);await p.waitForFunction(n=>window.__view.second>n||window.__view.status!=='running',before);await p.waitForTimeout(180);}
async function submitCurrent(){const {id}=await p.evaluate(()=>window.__tutorial.current);const kind=id.slice(4);const reference=await p.evaluate(kind=>window.__view.vessels[0].call.docs[kind].reference,kind);await p.locator(`[data-tutorial-target="document:${kind}"] input`).fill(reference);await p.locator(`[data-tutorial-target="document:${kind}"] button`).click();await p.waitForFunction(()=>window.__tutorial.current.phase==='waiting');}
try {
 await p.goto('http://127.0.0.1:4173/port-simulation-preview.html?course=arrival');await p.getByRole('button',{name:'开始操作教学',exact:true}).click();await p.locator('[data-renderer="ready"]').waitFor();
 await click('ship-open');await p.locator('[data-tutorial-step="start"]').waitFor();await click('clock:start');await p.locator('[data-tutorial-step="doc:entry"]').waitFor();await submitCurrent();
 await p.locator('[data-highlight-target="clock:resume"]').waitFor();await click('clock:resume');await p.waitForFunction(()=>window.__view.status==='running');
 await p.waitForFunction(()=>!document.querySelector('[data-highlight-target^="clock:"]'));assert.equal(await p.locator('.port-tutorial-ghost').count(),0);
 assert.match(await p.locator('.port-tutorial-coach').innerText(),/正在运行/);
 await click('clock:pause');await p.locator('[data-highlight-target="clock:resume"]').waitFor();await click('clock:resume');await jump(100000);
 checks.push('resume removes the clock spotlight and ghost; manual pause restores resume guidance');
 for(let i=0;i<20;i++){const t=await p.evaluate(()=>window.__tutorial.current);if(t.id==='berth')break;if(t.id.startsWith('doc:')&&t.phase==='action')await submitCurrent();else {if(await p.evaluate(()=>window.__view.status==='paused'))await click('clock:resume');await jump(100000);}}
 await p.locator('[data-tutorial-step="berth"]').waitFor();await p.getByRole('button',{name:'舞台全屏',exact:true}).click();await p.getByRole('button',{name:'定位指引',exact:true}).click();
 await p.locator('[data-drag-trace="stage"]').waitFor();await p.locator('[data-gesture-hand="left-button"]').waitFor();
 marks.drag=(Date.now()-videoStarted)/1000;
 const before=await p.evaluate(()=>JSON.stringify(window.__view));await p.waitForTimeout(8500);assert.equal(await p.evaluate(()=>JSON.stringify(window.__view)),before);
 assert.equal(await p.locator('.port-tutorial-ghost animateTransform').getAttribute('repeatCount'),'indefinite');
 assert.equal(await p.locator('.port-tutorial-glow').first().evaluate(e=>getComputedStyle(e).animationDuration),'3s');
 await p.screenshot({path:`${out}stage-drag-desktop.png`});checks.push('stage hand and left-button trace repeat without issuing commands; targets breathe every three seconds');
 const src=p.locator('[data-highlight-target="scene:S01"] rect'),dst=p.locator('[data-highlight-target="scene:destination:berth:0"] rect');
 const a=await src.boundingBox(),b=await dst.boundingBox();assert.ok(a&&b);
 await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.waitForTimeout(150);assert.equal(await p.locator('.port-tutorial-ghost').count(),0);
 await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:30});await p.mouse.up();await p.waitForFunction(()=>!!window.__view.vessels[0].call.move?.navigation);
 assert.equal(await p.evaluate(()=>window.__view.vessels[0].call.move.to),'berth:0');assert.equal(await p.evaluate(()=>window.__view.score.deductions),0);
 checks.push('real canvas drag starts the shared navigation task and hides the teaching hand');
 await p.getByLabel('运行速度',{exact:true}).selectOption('10');await click('clock:resume');await p.waitForFunction(()=>window.__view.status==='running');await p.waitForFunction(()=>!document.querySelector('[data-highlight-target^="clock:"]'));
 const nav=await p.evaluate(()=>window.__view.vessels[0].call.move.navigation);
 const arc=nav.segments.find(s=>s.kind==='arc'),offset=nav.segments.slice(0,nav.segments.indexOf(arc)).reduce((n,s)=>n+s.length*2,0),arcTime=nav.samples.find(s=>s.distance>=offset+arc.length*.6)?.time??600;
 await jump(Math.floor(arcTime));await p.getByRole('button',{name:'定位船舶',exact:true}).click();
 marks.turn=(Date.now()-videoStarted)/1000;
 await p.screenshot({path:`${out}navigation-turn.png`});
 assert.match(await p.getByRole('region',{name:'船舶航行状态'}).innerText(),/转弯/);
 await p.waitForTimeout(1800);await jump(20);await p.waitForTimeout(1800);await jump(20);
 await click('clock:pause');const frozen=await p.evaluate(()=>window.__view.second);await p.waitForTimeout(1500);assert.equal(await p.evaluate(()=>window.__view.second),frozen);
 checks.push('10x navigation readout shows a true turn and shared-clock pause retains its position');
 await p.getByRole('button',{name:'退出舞台全屏',exact:true}).click();await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'舞台全屏',exact:true}).click();await p.waitForTimeout(400);
 assert.equal(await p.locator('.port-tutorial-glow').first().evaluate(e=>getComputedStyle(e).animationName),'none');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.screenshot({path:`${out}navigation-narrow-fullscreen.png`});
 await click('clock:resume');await jump(100000);await p.waitForFunction(()=>window.__view.vessels[0].call.stage==='berthed');await click('tab:review');await p.waitForFunction(()=>window.__tutorial.complete);
 checks.push('390px fullscreen and reduced motion preserve the same navigation and complete the arrival tutorial');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}browser.json`,JSON.stringify({checks,errors,duration:nav.duration,distance:nav.distance},null,2));console.log(JSON.stringify({checks,errors}));
}catch(e){await p.screenshot({path:`${out}failure.png`}).catch(()=>{});await fs.writeFile(`${out}failure.txt`,await p.locator('body').innerText()).catch(()=>{});throw e;}
finally{await fs.writeFile(`${out}video-marks.json`,JSON.stringify(marks));await context.close();const video=await p.video().path();await fs.copyFile(video,`${out}navigation-and-tutorial.webm`);await browser.close();}
