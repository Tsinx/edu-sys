import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const origin=process.env.EDU_WEB_ORIGIN||'http://127.0.0.1:5173';
const output=resolve(process.env.EDU_QA_OUTPUT||'output/live2d-qa/p0-v1');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1200,height:1000}});
const errors=[],failed=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{localStorage.setItem('edu-avatar-framing-v1','bust');});
if(process.env.EDU_P0_PRODUCTION==='1'){
  // The complete production portal requires login. Exercise its exact built avatar
  // components in an isolated test page, without altering authentication or data.
  const assets=await readdir(resolve('apps/teacher-web/dist/assets'));
  const asset=pattern=>{const file=assets.find(name=>pattern.test(name));assert.ok(file,String(pattern));return `/assets/${file}`;};
  const styles=assets.filter(name=>/\.css$/.test(name)&&/live2d|Live2D|Xiaomai/.test(name));
  const html=`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(name=>`<link rel="stylesheet" href="/assets/${name}">`).join('')}</head><body style="margin:0"><div id="root"></div><script type="module">import {t as React} from '${asset(/^react-.*\.js$/)}';import {t as Client} from '${asset(/^client-.*\.js$/)}';import {XiaomaiAnimationPreview} from '${asset(/^XiaomaiAnimationPreview-.*\.js$/)}';Client().createRoot(document.getElementById('root')).render(React().createElement(XiaomaiAnimationPreview));</script></body></html>`;
  await page.route(`${origin}/avatar/xiaomai/preview`,route=>route.fulfill({contentType:'text/html',body:html}));
}
try{
  if(process.env.EDU_VERIFY_LOADING==='1')await page.route('**/head-layers/manifest.json',async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
  await page.goto(`${origin}/avatar/xiaomai/preview`);
  if(process.env.EDU_VERIFY_LOADING==='1'){
    await page.locator('.live2d-avatar[data-status="loading"]').waitFor();
    assert.equal(await page.locator('.live2d-avatar__canvas').evaluate(e=>getComputedStyle(e).visibility),'hidden','partial eyes cannot appear before the complete model is ready');
  }
  await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});
  await page.waitForTimeout(750);
  const avatar=page.locator('.live2d-avatar');
  const actions=['回正','半睁眼','轻闭眼','看左侧','看右侧','看上方','看下方','抬眉','皱眉','内眉抬起','单侧挑眉','微笑','收起笑容','抬头','低头','点头确认','左歪头','右歪头','呼吸','头发跟随'];
  for(let i=0;i<actions.length;i++){
    await page.getByRole('button',{name:actions[i],exact:true}).click();await page.waitForTimeout(850);
    const geometry=await page.locator('[data-xiaomai-eyes]').evaluate(root=>({pixels:[...root.querySelectorAll('canvas')].map(c=>c.toDataURL()),transforms:[...root.children].map(g=>g.style.transform)}));
    assert.ok(geometry.transforms.every(t=>!t.includes('NaN')));
    await avatar.screenshot({path:resolve(output,`${String(i).padStart(2,'0')}.png`)});
    checks.push({action:actions[i],...geometry});
  }
  assert.notDeepEqual(checks[0].pixels,checks[1].pixels,'half blink changes aperture geometry');
  assert.notDeepEqual(checks[3].pixels,checks[4].pixels,'irises move laterally');
  assert.notDeepEqual(checks[13].transforms,checks[14].transforms,'facial overlays follow head pitch');
  for(const name of ['向左转头','向右转头','连续左右转头','转头并眨眼'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  await page.getByRole('button',{name:'右歪头',exact:true}).click();
  const mouthPaths=[];
  for(const shape of ['A','B','C','D','E','F','G','H','X']){
    await page.getByLabel('口型示范').selectOption(shape);await page.waitForTimeout(180);
    mouthPaths.push(await page.locator('[data-xiaomai-mouth] path').nth(2).getAttribute('d'));
    await avatar.screenshot({path:resolve(output,`mouth-${shape}.png`)});
  }
  assert.equal(new Set(mouthPaths.slice(0,8)).size,8);
  await page.getByLabel('口型示范').selectOption('off');
  await page.waitForFunction(()=>document.querySelector('[data-xiaomai-mouth]')?.style.display==='none',{}, {timeout:150});
  assert.equal(await page.locator('[data-xiaomai-mouth]').evaluate(s=>s.style.display),'none');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  const still=await avatar.screenshot();await page.waitForTimeout(350);assert.deepEqual(await avatar.screenshot(),still,'reduced motion is still');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  await page.screenshot({path:resolve(output,'narrow.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'头像',exact:true}).click();await page.waitForTimeout(300);
  await avatar.screenshot({path:resolve(output,'portrait.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(resolve(output,'report.json'),JSON.stringify({checks,mouthPaths,errors,failed},null,2));
  console.log(JSON.stringify({actions:checks.length,mouthShapes:mouthPaths.length,reducedMotion:true,narrow:true,errors,failed}));
}catch(error){
  await page.screenshot({path:resolve(output,'failure.png')});console.error(JSON.stringify({errors,failed,text:(await page.locator('body').innerText()).slice(0,1600)}));throw error;
}finally{await browser.close();}
