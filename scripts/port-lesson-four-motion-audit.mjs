import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_L4_URL??'http://127.0.0.1:5173',out='output/port-lesson-four-v10-qa';
const browser=await chromium.launch({headless:true});const errors=[],checks=[];
try {
 const p=await browser.newPage({viewport:{width:1600,height:1100}});p.on('pageerror',e=>errors.push(e.message));
 for(const n of [3,4,7,8,9,12,14,16,17,18,22,24,27,29,34,43]){
  await p.goto(`${base}/port-lesson-four-preview.html?page=${n}&channel=motion-${n}`);await p.locator('.l4-playback input').waitFor();
  await p.getByRole('button',{name:'全景',exact:true}).click();const hashes=[];
  for(const progress of [0,250,500,750,1000]){
   await p.locator('.l4-playback input').fill(String(progress));await p.waitForTimeout(50);
   assert.equal(await p.locator('.l4-playback input').inputValue(),String(progress));
   const png=await p.locator('.port-l4-slide').screenshot({path:`${out}/motion-${n}-${progress}.png`});hashes.push(createHash('sha256').update(png).digest('hex'));
  }
  assert.ok(new Set(hashes).size>=3,`page ${n} must have meaningful visible progression`);
  await p.waitForTimeout(1100);assert.equal(await p.locator('.l4-playback input').inputValue(),'1000');assert.equal(await p.getByLabel('第4讲课件页').inputValue(),String(n));
  checks.push({page:n,keyProgress:[0,.25,.5,.75,1],distinctFrames:new Set(hashes).size,stoppedAtEnd:true,noAdvance:true});
 }
 // Fresh entry waits one second, then plays once; manual pause remains effective.
 await p.clock.install({time:new Date('2026-09-15T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-15T00:01:00Z'));await p.goto(`${base}/port-lesson-four-preview.html?page=3&channel=fresh-${Date.now()}`);await p.locator('.l4-playback input').waitFor();
 await p.clock.runFor(999);assert.equal(await p.locator('.l4-playback input').inputValue(),'0');await p.clock.runFor(2);await p.getByRole('button',{name:'暂停',exact:true}).waitFor();await p.clock.runFor(1800);assert.ok(Number(await p.locator('.l4-playback input').inputValue())>0);
 await p.getByRole('button',{name:'暂停',exact:true}).click();const paused=await p.locator('.l4-playback input').inputValue();await p.clock.runFor(2000);assert.equal(await p.locator('.l4-playback input').inputValue(),paused);
 await p.getByRole('button',{name:'重播',exact:true}).click();await p.clock.runFor(17500);assert.equal(await p.locator('.l4-playback input').inputValue(),'1000');
 await p.clock.runFor(2000);assert.equal(await p.getByLabel('第4讲课件页').inputValue(),'3');
 await fs.writeFile(`${out}/motion.json`,JSON.stringify({checks,autoplayDelayMs:1000,manualPause:true,oneCycle:true,errors},null,2));assert.deepEqual(errors,[]);console.log(`PASS: ${checks.length} animations × 5 key states; one-cycle autoplay and manual takeover`);
}finally{await browser.close();}
