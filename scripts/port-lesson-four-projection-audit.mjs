import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L4_URL??'http://127.0.0.1:5173',out='output/port-lesson-four-v10-qa';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const context=await browser.newContext(),teacher=await context.newPage(),projector=await context.newPage();teacher.on('pageerror',e=>errors.push(e.message));projector.on('pageerror',e=>errors.push(e.message));
 await teacher.setViewportSize({width:1600,height:1100});await projector.setViewportSize({width:390,height:844});const channel='projection-qa-'+Date.now();
 await teacher.goto(`${base}/port-lesson-four-preview.html?page=10&channel=${channel}`);await teacher.locator('.l4-scene-entry').waitFor();
 await projector.goto(`${base}/port-lesson-four-preview.html?projection=1&channel=${channel}`);await projector.locator('.l4-page-10').waitFor();
 await teacher.locator('.l4-scene-entry').focus();await teacher.keyboard.press('Enter');await teacher.locator('[data-renderer=ready]').waitFor({timeout:60000});await projector.locator('[data-renderer=ready]').waitFor({timeout:60000});
 assert.equal(await projector.locator('.port-l4-teacher-guide,.port-demo-controls,.l4-demo-bar').count(),0);assert.equal(await projector.locator('.l4-readonly-demo').getAttribute('inert'),'');
 await projector.screenshot({path:`${out}/projection-390-live.png`});
 await teacher.getByRole('button',{name:'← 返回原课件页',exact:true}).click();await projector.locator('.l4-page-10').waitFor();
 await teacher.getByLabel('第4讲课件页').selectOption('3');await teacher.locator('.l4-playback input').waitFor();await teacher.locator('.l4-playback input').fill('500');
 await projector.locator('.l4-page-3').waitFor();await projector.waitForTimeout(100);assert.equal(await projector.locator('.l4-diagram').innerHTML(),await teacher.locator('.l4-diagram').innerHTML());
 await teacher.getByLabel('第4讲课件页').selectOption('41');await projector.locator('.l4-page-41').waitFor();assert.doesNotMatch(await projector.locator('body').innerText(),/教师讲解|助手约束|三项推断都不能/);
 await teacher.getByRole('button',{name:'本屏投影',exact:true}).click();assert.equal(await teacher.locator('.port-l4-teacher-guide').count(),0);await teacher.keyboard.press('Escape');await teacher.getByLabel('第4讲课件页').waitFor();
 await teacher.getByLabel('第4讲课件页').selectOption('19');await teacher.locator('.l4-scene-entry').click();await teacher.locator('[data-renderer=ready]').waitFor({timeout:60000});
 await teacher.getByRole('button',{name:'下一步演示',exact:true}).click();await teacher.waitForTimeout(400);const time=await teacher.locator('.port-ops').getAttribute('data-second');await teacher.reload();await teacher.locator('[data-renderer=ready]').waitFor({timeout:60000});assert.equal(await teacher.locator('.port-ops').getAttribute('data-second'),time);assert.equal(await teacher.getByRole('button',{name:'播放演示',exact:true}).count(),1);
 await teacher.getByRole('button',{name:'← 返回原课件页',exact:true}).click();await teacher.setViewportSize({width:390,height:844});await teacher.locator('.l4-scene-entry').waitFor();const hit=await teacher.locator('.l4-scene-entry').boundingBox();assert.ok(hit.height>=44);
 await teacher.locator('.l4-scene-entry').click();await teacher.locator('[data-renderer=ready]').waitFor({timeout:60000});assert.equal(await teacher.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await teacher.screenshot({path:`${out}/teacher-demo-390.png`});await context.close();
 const failure=await browser.newPage({viewport:{width:1600,height:1100}});await failure.route(/PortOperationsStudio.*\.(?:tsx|js)/,r=>r.abort('failed'));
 await failure.goto(`${base}/port-lesson-four-preview.html?page=10&channel=failure-${Date.now()}`);await failure.locator('.l4-scene-entry').click();await failure.getByRole('alert').waitFor({timeout:30000});const link=failure.getByRole('link',{name:'查看已验证的本段证据画面 ↗'});const href=await link.getAttribute('href');assert.ok((await failure.request.get(base+href)).ok());await failure.screenshot({path:`${out}/demo-fallback.png`});await failure.getByRole('button',{name:'返回原课件页',exact:true}).click();await failure.locator('.l4-page-10').waitFor();
 await fs.writeFile(`${out}/projection.json`,JSON.stringify({pageSync:true,animationSync:true,liveSceneSync:true,teacherIsolation:true,previewRefresh:true,keyboardEntry:true,touchHeight:hit.height,narrowDemo:true,verifiedEvidenceFallback:true,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS: projection, live scene, refresh, keyboard/touch, and failure fallback');
}finally{await browser.close();}
