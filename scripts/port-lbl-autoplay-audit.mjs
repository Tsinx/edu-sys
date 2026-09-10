import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const output='output/port-lbl-qa/autoplay';
await fs.mkdir(output,{recursive:true});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const progress=()=>page.getByLabel('动画进度').inputValue();
const select=index=>page.getByLabel('选择课件页').selectOption(String(index));
const button=name=>page.getByRole('button',{name,exact:true});
try {
  const start=new Date('2026-09-10T00:00:00Z');
  await page.clock.install({time:start});
  await page.clock.pauseAt(start);
  await page.goto(`${process.env.PORT_LBL_BASE_URL||'http://127.0.0.1:5173'}/port-lbl-preview.html?page=14`);
  await page.getByLabel('动画进度').waitFor();
  for(const index of [14,58]){
    await select(index);
    assert.equal(await progress(),'0');
    await page.clock.runFor(4999);
    assert.equal(await progress(),'0');
    assert.equal(await button('播放').count(),1);
    await page.screenshot({path:`${output}/page-${index+1}-initial.png`});
    await page.clock.runFor(1);
    await button('暂停').waitFor();
    await page.clock.runFor(600);
    assert.ok(Number(await progress())>0);
    assert.equal(await button('暂停').count(),1);
    await page.screenshot({path:`${output}/page-${index+1}-playing.png`});
    await button('暂停').click();
    const paused=await progress();
    await page.clock.runFor(1000);
    assert.equal(await progress(),paused);
  }
  // Leaving a page cancels its timer; the next page gets a full five seconds.
  await select(14);await page.clock.runFor(3000);await select(15);
  await page.clock.runFor(2001);assert.equal(await progress(),'0');
  await page.clock.runFor(2999);await button('暂停').waitFor();
  await page.clock.runFor(500);assert.ok(Number(await progress())>0);
  await select(14);assert.equal(await progress(),'0');
  await button('下一幕').click();await page.clock.runFor(6000);
  assert.equal(await progress(),'250');assert.equal(await button('播放').count(),1);
  await select(58);await button('播放').click();await page.clock.runFor(500);
  await button('暂停').click();const paused=await progress();
  await page.clock.runFor(6000);assert.equal(await progress(),paused);
  await select(14);await button('投影').click();
  await page.locator('body').click({position:{x:1,y:1}});
  await page.keyboard.press('f');await page.clock.runFor(6000);
  await page.keyboard.press('Escape');assert.equal(await progress(),'1000');
  await select(58);await page.clock.runFor(5000);await button('暂停').waitFor();
  await page.clock.runFor(32);
  await page.clock.fastForward(18000);
  await button('播放').waitFor();
  assert.equal(await progress(),'1000');assert.equal(await button('播放').count(),1);
  assert.equal(await page.getByLabel('选择课件页').inputValue(),'58');
  assert.deepEqual(errors,[]);
  const report={initialFrame:true,delayMs:5000,bothLessons:true,pageEntryReset:true,timerCleanup:true,manualOverride:true,projectionKeyboardOverride:true,stopsAtEnd:true,noAutoAdvance:true,errors};
  await fs.writeFile(`${output}/browser-check.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {await browser.close();}
