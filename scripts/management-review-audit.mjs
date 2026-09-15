import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const build=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/manifest.json','utf8'));
const file=path.resolve('output/management-principles/review-phase2/index.html');
const out=path.resolve('output/management-principles/qa-phase2');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(pathToFileURL(file).href);
  assert.equal(await page.locator('article').count(),build.sourcePageCount);
  const links=await page.locator('article img').evaluateAll(images=>images.map(i=>i.src));
  assert.equal(links.length,build.sourcePageCount+build.webPageCount);
  for(const url of links) await fs.access(fileURLToPath(url));
  for(const width of [1600,390]) {
    await page.setViewportSize({width,height:1100});
    for(const id of ['l1-1','l2-13','l3-23','l4a-72','l4b-24','l5-25','l6-50','l7-37','l8-7','l8-30']) {
      const row=page.locator(`#${id}`);await row.scrollIntoViewIfNeeded();
      await row.locator('img').evaluateAll(async images=>{await Promise.all(images.map(i=>{i.loading='eager';return i.decode();}));});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
      assert.equal(await row.locator('img').evaluateAll(images=>images.every(i=>i.naturalWidth>0)),true);
      await row.locator('summary').click();assert.ok((await row.locator('details').innerText()).includes('新表述'));
      await row.screenshot({path:path.join(out,`review-${width}-${id}.png`)});
      await row.locator('summary').click();checks.push({width,id});
    }
  }
  assert.deepEqual(errors,[]);
  const result={checkedAt:new Date().toISOString(),originalRows:build.sourcePageCount,sourceAndWebImages:build.sourcePageCount+build.webPageCount,allImagePathsExist:true,representativeChecks:checks,errors};
  await fs.writeFile(path.join(out,'review-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally { await browser.close(); }
