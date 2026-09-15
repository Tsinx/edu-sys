import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_TUTORIAL_TEST_URL??'http://127.0.0.1:5173';
const out=fileURLToPath(new URL('../output/port-tutorial-qa/',import.meta.url));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];let active;
const pass=s=>{checks.push(s);console.log('PASS',s);};
async function page(unit,viewport={width:1600,height:1000}){
 const p=await browser.newPage({viewport});active=p;p.setDefaultTimeout(18000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const now=Date.now();window.__tutorialOffset=0;window.__tutorialMessages=0;Date.now=()=>now+window.__tutorialOffset;const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',e=>{if(e.data.view){window.__tutorialMessages++;if(e.data.tutorial){window.__tutorial=e.data.tutorial;window.__tView=e.data.view;}else window.__practice=e.data.view;}});}};});
 await p.goto(`${base}/port-simulation-preview.html?course=${unit}`);await p.getByRole('dialog').waitFor();return p;
}
async function change(p,fn){const n=await p.evaluate(()=>window.__tutorialMessages);await fn();await p.waitForFunction(n=>window.__tutorialMessages>n,n);await p.waitForTimeout(180);}
async function target(p,key){const rack=p.locator(`[data-tutorial-rack] [data-tutorial-target="${key}"]`);if(await rack.count()&&await rack.first().isVisible())return rack.first();return p.locator(`[data-tutorial-target="${key}"]`).first();}
async function click(p,key){await (await target(p,key)).click();}
async function jump(p,ms=100000){await change(p,()=>p.evaluate(ms=>window.__tutorialOffset+=ms,ms));}
async function drag(p,source,targetKey){const a=await target(p,source),b=await target(p,targetKey);await a.scrollIntoViewIfNeeded();await b.scrollIntoViewIfNeeded();await p.waitForTimeout(120);const from=await a.boundingBox(),to=await b.boundingBox();assert.ok(from&&to);await p.mouse.move(from.x+from.width/2,from.y+from.height/2);await p.mouse.down();await p.mouse.move(from.x+from.width/2-12,from.y+from.height/2,{steps:5});await p.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:24});await p.mouse.up();}
async function drive(p,{narrow=false,dragOnce=false}={}){
 let didDrag=false, checkedInvalid=false;
 for(let i=0;i<160;i++){
  const t=await p.evaluate(()=>window.__tutorial),v=await p.evaluate(()=>window.__tView),s=t.current;
  if(!s)return;
  console.log('STEP',t.unit,s.id,s.phase,v.status);
  if(s.id==='dossier'){await change(p,()=>p.locator('[data-tutorial-target="forecast:S01"]').click({button:'right'}));continue;}
  if(s.id==='resources'||s.id==='plan-resources'){await change(p,()=>click(p,'tab:resources'));continue;}
  if(s.id==='review'){await change(p,()=>click(p,'tab:review'));continue;}
  if(s.id==='start'){await change(p,()=>click(p,s.id==='start'?'clock:start':'clock:resume'));continue;}
  if(['ledger','cargo-check','issue-open'].includes(s.id)){
    if(s.id==='issue-open')await change(p,()=>click(p,`box:${s.focus}`));
    else await change(p,()=>p.locator('[data-tutorial-target="box-list"] button').first().click());continue;
  }
  if(s.id==='plan'){await change(p,()=>click(p,'plan-apply'));continue;}
  if(s.id==='dispatch'){
    for(const [name,n]of [['岸桥操作人数',4],['运输班组人数',8],['堆场班组人数',4],['闸口核验人数',3],['维修班组人数',2]])await p.getByLabel(name,{exact:true}).fill(String(n));
    await change(p,()=>click(p,'dispatch-apply'));continue;
  }
  if(['waiting','running'].includes(s.phase)){if(v.status==='paused')await change(p,()=>click(p,s.id==='start'?'clock:start':'clock:resume'));else await jump(p);continue;}
  if(s.id.startsWith('doc:')||s.id.startsWith('batch-doc:')){
    const ship=s.id.startsWith('doc:'),id=s.id.slice(ship?4:10),doc=ship?v.vessels[0].call.docs[id]:v.batches.find(b=>b.id===id).document;
    const form=await target(p,ship?`document:${id}`:`batch-document:${id}`);
    await form.locator('input').fill(doc.reference);await change(p,()=>form.getByRole('button').click());continue;
  }
  if(s.id.startsWith('yard:')){
    const destination=s.targets.filter(t=>t.startsWith('yard-target:')).at(-1);
    if(t.unit==='cargo'&&!checkedInvalid){checkedInvalid=true;await change(p,()=>p.getByLabel('货批目标堆场',{exact:true}).selectOption('Y6'));assert.equal(await p.evaluate(()=>window.__tutorial.current.id),s.id);assert.equal(await p.evaluate(()=>window.__tView.attempts.at(-1).deduction),0);assert.equal(await p.evaluate(()=>window.__tView.attempts.at(-1).outcome),'waiting');}
    if(narrow){const dest=await target(p,destination);await dest.focus();await change(p,()=>p.keyboard.press('Enter'));continue;}
    if(dragOnce&&!didDrag&&!narrow){await change(p,()=>drag(p,`batch:${s.focus}`,destination));didDrag=true;await p.screenshot({path:`${out}cargo-after-drag.png`});}
    else await change(p,()=>click(p,destination));continue;
  }
  if(s.id==='berth'){
    const destination=s.targets.find(t=>t==='destination:berth:1')??s.targets.find(t=>t.startsWith('destination:'));
    if(dragOnce&&!didDrag&&!narrow){await change(p,()=>drag(p,'ship-drag',destination));didDrag=true;}else await change(p,()=>click(p,destination));continue;
  }
  if(s.id==='work'){await change(p,()=>click(p,'ship-work'));continue;}
  if(s.id==='inspect'){await change(p,()=>click(p,'inspect-submit'));continue;}
  if(s.id==='depart'){await change(p,()=>click(p,'ship-depart'));continue;}
  throw new Error(`Unhandled ${s.id}: ${JSON.stringify(s)}`);
 }
 throw new Error('Tutorial failed to finish within 160 interactions');
}
try{
 const p=await page('arrival');await p.screenshot({path:`${out}offer-desktop.png`});await p.getByRole('button',{name:'跳过，直接练习',exact:true}).click();
 await change(p,()=>p.getByRole('button',{name:'开始本段',exact:true}).click());
 await p.getByRole('button',{name:'操作教学',exact:true}).click();await p.getByRole('button',{name:'开始操作教学',exact:true}).click();await p.waitForFunction(()=>window.__tutorial?.unit==='arrival');await p.locator('[data-renderer="ready"]').waitFor();
 const original=await p.evaluate(()=>({view:window.__practice,records:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':course:1:arrival')))}));
 assert.equal(original.view.status,'paused');
 const before=await p.evaluate(()=>JSON.stringify(window.__tView));await p.getByRole('button',{name:'再演示一次',exact:true}).click();await p.waitForTimeout(3600);assert.equal(await p.evaluate(()=>JSON.stringify(window.__tView)),before);
 await p.screenshot({path:`${out}arrival-spotlight.png`});pass('entry offers learning or skip; replaying a virtual gesture issues no business command');
 await p.getByRole('button',{name:'舞台全屏',exact:true}).click();await p.locator('[data-stage-fullscreen="true"]').waitFor();await p.evaluate(()=>window.__tutorialCanvas=document.querySelector('.port-ops-scene canvas'));
 await drive(p,{dragOnce:true});assert.equal(await p.evaluate(()=>window.__tutorial.complete),true);assert.equal(await p.evaluate(()=>document.querySelector('.port-ops-scene canvas')===window.__tutorialCanvas),true);await p.screenshot({path:`${out}arrival-complete-fullscreen.png`});
 await p.getByRole('button',{name:'返回自主练习',exact:true}).click();await p.locator('[data-experience="practice"]').waitFor();assert.equal(await p.getByRole('dialog').count(),0);
 assert.deepEqual(await p.evaluate(()=>window.__practice),original.view);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':course:1:arrival')))),original.records);pass('arrival completes through real ship dragging in fullscreen; tutorial preserves original practice and canvas');
 await p.keyboard.press('Escape');await p.getByRole('button',{name:'重练本段',exact:true}).click();await p.getByRole('dialog').waitFor();await p.reload();await p.getByRole('dialog').waitFor();pass('retry and reload offer teaching again; tutorial return and fullscreen do not repeat the offer');await p.close();
 for(const unit of ['cargo','yard','planning','departure']){
  const narrow=unit==='yard',p=await page(unit,narrow?{width:390,height:844}:{width:1600,height:1000});
  await p.getByRole('button',{name:'开始操作教学',exact:true}).click();await p.waitForFunction(unit=>window.__tutorial?.unit===unit,unit);await p.locator('[data-renderer="ready"]').waitFor();
  if(narrow){await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'舞台全屏',exact:true}).click();}
  await p.waitForTimeout(250);await p.screenshot({path:`${out}${unit}-teaching.png`});await drive(p,{narrow,dragOnce:unit==='cargo'});
  assert.equal(await p.evaluate(()=>window.__tutorial.complete),true);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:`${out}${unit}-complete.png`});pass(`${unit} teaching completes with real forms, allocation, job feedback and ledger review${narrow?' at 390px fullscreen with reduced motion':''}`);await p.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}browser-${base.includes('4173')?'production':'development'}.json`,JSON.stringify({base,checks,errors},null,2));
}catch(e){if(active&&!active.isClosed()){await active.screenshot({path:`${out}failure.png`,fullPage:true}).catch(()=>{});await fs.writeFile(`${out}failure.txt`,await active.locator('body').innerText()).catch(()=>{});}throw e;}
finally{await browser.close();}
