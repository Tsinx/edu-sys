import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const out=fileURLToPath(new URL('../output/port-tutorial-qa/',import.meta.url));
const b=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));
async function aligned(){await p.waitForFunction(()=>{
 const doc=document.querySelector('[data-tutorial-target="batch-document:S01-I1"]'),r=[...document.querySelectorAll('.port-tutorial-spotlights>g>rect')][1];if(!doc||!r)return false;
 const a=doc.getBoundingClientRect(),c=doc.closest('.port-panel').getBoundingClientRect(),z=r.getBoundingClientRect();return Math.abs(z.y-(Math.max(5,a.y,c.y)-4))<2&&Math.abs(z.x-(a.x-4))<2;
});}
try{
 await p.goto('http://127.0.0.1:4173/port-simulation-preview.html?course=cargo');await p.getByRole('button',{name:'开始操作教学',exact:true}).click();await p.locator('[data-experience=tutorial]').waitFor();await p.getByRole('button',{name:'开始本段',exact:true}).click();await p.locator('[data-tutorial-step="yard:S01-I1"]').waitFor();
 await p.getByRole('button',{name:'再演示一次',exact:true}).click();await p.waitForTimeout(600);
 await p.screenshot({path:`${out}drag-gesture-desktop.png`});
 await p.locator('[data-tutorial-rack] [data-tutorial-target="yard-target:Y1"]').click();await p.locator('[data-tutorial-step="batch-doc:S01-I1"]').waitFor();await aligned();
 await p.evaluate(()=>window.scrollBy(0,70));await aligned();await p.locator('.port-panel').evaluate(el=>el.scrollTop+=32);await aligned();checks.push('spotlight remains aligned after step change, page scroll and nested panel scroll');
 await p.getByRole('button',{name:'再演示一次',exact:true}).click();await aligned();await p.waitForTimeout(450);
 const geometry=await p.evaluate(()=>{const input=document.querySelector('#doc-S01-I1').getBoundingClientRect(),matrix=document.querySelector('.port-tutorial-ghost')?.getCTM();return {input:{x:input.x+input.width/2,y:input.y+input.height/2},ghost:matrix?{x:matrix.e,y:matrix.f}:null};});assert.ok(geometry.ghost);assert.ok(Math.abs(geometry.input.y-geometry.ghost.y)<2);assert.ok(Math.abs(geometry.input.x-geometry.ghost.x)<2);await p.screenshot({path:`${out}document-gesture-desktop.png`});checks.push('replayed pointer lands on the actual input and retains spotlights');
 await p.evaluate(()=>window.__sameCanvas=document.querySelector('.port-ops-scene canvas'));await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'舞台全屏',exact:true}).click();await p.getByRole('button',{name:'再演示一次',exact:true}).click();await aligned();await p.waitForTimeout(450);
 assert.equal(await p.locator('.port-tutorial-ghost animate,.port-tutorial-ghost animateTransform').count(),0);assert.equal(await p.evaluate(()=>document.querySelector('.port-ops-scene canvas')===window.__sameCanvas),true);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const visible=await p.evaluate(()=>{const a=document.querySelector('#doc-S01-I1').getBoundingClientRect(),c=document.querySelector('.port-tutorial-coach').getBoundingClientRect();return {inputVisible:a.y>=0&&a.bottom<=innerHeight,covered:!(c.bottom<=a.y||c.y>=a.bottom||c.right<=a.x||c.x>=a.right),coachFits:c.bottom<=innerHeight};});assert.equal(visible.inputVisible,true);assert.equal(visible.covered,false);assert.equal(visible.coachFits,true);await p.screenshot({path:`${out}document-gesture-narrow-fullscreen.png`});checks.push('390px fullscreen preserves canvas, keeps the input clear and uses static cues for reduced motion');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}visual-browser.json`,JSON.stringify({checks,errors,geometry,visible},null,2));console.log(JSON.stringify({checks,errors}));
}catch(e){await p.screenshot({path:`${out}visual-failure.png`}).catch(()=>{});throw e;}finally{await b.close();}
