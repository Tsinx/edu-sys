import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const output=resolve('output/port-enterprise-qa');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
const context=await browser.newContext({viewport:{width:1500,height:1050},reducedMotion:'reduce'}),page=await context.newPage();
const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:5189/port-enterprise.html?offline=1',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('.enterprise-app[data-enterprise-hour]').waitFor({timeout:90000});
  await page.locator('.enterprise-scene[data-renderer="ready"],.enterprise-scene[data-renderer="fallback"]').waitFor({timeout:60000});
  await page.screenshot({path:resolve(output,'desktop-overview.png'),fullPage:true});
  const renderer=await page.locator('.enterprise-scene').getAttribute('data-renderer');
  const nav=page.getByRole('navigation',{name:'经营工作台'});
  for(const label of ['设备资产','规划建设','人员与排班','联合调度','船期与回执','货物与堆存','集疏运','市场与协议','财务与资金','能源与环境','数字协同','风险与恢复','绩效与对照','决策说明','经营手册']){
    await nav.getByRole('button',{name:label,exact:true}).click();
    assert.ok(await page.locator('.enterprise-content h2').count()>0,label);
  }
  await nav.getByRole('button',{name:'联合调度',exact:true}).click();
  const policy=page.getByRole('form',{name:'更新生产与保障策略'});
  await policy.getByLabel('授权独立资料复核与异常核查').check();
  await policy.getByRole('button',{name:'应用运行策略'}).click();
  await page.getByRole('status').filter({hasText:'运行策略已更新'}).waitFor();
  await page.getByLabel('每次推进时长').selectOption('24');
  await page.getByRole('button',{name:'推进一次',exact:true}).click();
  await page.locator('.enterprise-app[data-enterprise-hour="24"]').waitFor({timeout:30000});
  await nav.getByRole('button',{name:'全港总览',exact:true}).click();
  await page.screenshot({path:resolve(output,'desktop-day-one.png'),fullPage:true});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.enterprise-app[data-enterprise-hour="24"]').waitFor({timeout:30000});
  const before=await page.locator('.enterprise-app').getAttribute('data-enterprise-hour');
  await page.getByRole('button',{name:'网页全屏',exact:true}).click();assert.equal(await page.locator('.enterprise-app').getAttribute('data-enterprise-hour'),before);
  await page.getByRole('button',{name:'退出网页全屏',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  for(const label of ['全港总览','设备资产','规划建设','人员与排班','财务与资金','决策说明']){
    await nav.getByRole('button',{name:label,exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'narrow overflow: '+label);
  }
  await nav.getByRole('button',{name:'全港总览',exact:true}).click();await page.screenshot({path:resolve(output,'narrow-overview.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const fallbackBrowser=await chromium.launch({headless:true,args:['--disable-webgl']});
  try{
    const fallback=await fallbackBrowser.newPage();
    await fallback.goto('http://127.0.0.1:5189/port-enterprise.html?offline=1',{waitUntil:'domcontentloaded'});
    await fallback.locator('.enterprise-scene[data-renderer="fallback"]').waitFor({timeout:60000});
    await fallback.getByRole('button',{name:'T4 液体散货'}).click();
    await fallback.locator('.enterprise-terminal-detail').getByText('液体散货',{exact:true}).waitFor();
  }finally{await fallbackBrowser.close();}
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({renderer,checks:['all-business-panels','authorized-policy','one-day-local-production','indexeddb-reload','page-fullscreen-continuity','390px-layout','webgl-unavailable-fallback'],errors},null,2));
  console.log(JSON.stringify({renderer,checks:7,errors}));
}finally{await browser.close();}
