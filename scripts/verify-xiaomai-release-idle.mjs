import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const origin=process.env.EDU_WEB_ORIGIN||'http://127.0.0.1:5173';
const output=resolve(process.env.EDU_QA_OUTPUT||'output/live2d-qa/xiaomai-release-idle');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${origin}/avatar/xiaomai/preview`);
  await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});
  assert.equal(await page.getByRole('button',{name:'自然待机',exact:true}).getAttribute('aria-pressed'),'true');
  const avatar=page.locator('.live2d-avatar');
  let previous=0;
  for(const seconds of [0,1.5,4.3,8,12,16,26]){
    await page.waitForTimeout((seconds-previous)*1000);previous=seconds;
    await avatar.screenshot({path:resolve(output,`idle-${seconds}.png`)});
  }
  for(const state of ['listening','thinking','speaking','affirming','idle']){
    await page.getByLabel('课堂状态').selectOption(state);await page.waitForTimeout(1500);
    await avatar.screenshot({path:resolve(output,`state-${state}.png`)});
  }
  await page.screenshot({path:resolve(output,'preview.png')});
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'report.json'),JSON.stringify({idleSeconds:[0,1.5,4.3,8,12,16,26],states:['listening','thinking','speaking','affirming','idle'],errors},null,2));
  console.log(JSON.stringify({screenshots:13,errors}));
}finally{await browser.close();}
