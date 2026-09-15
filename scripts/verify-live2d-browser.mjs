import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(process.env.EDU_PLAYWRIGHT_ENTRY || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const { chromium } = require('playwright');
const origin = process.env.EDU_WEB_ORIGIN || 'http://127.0.0.1:5173';
const output = resolve('output/live2d-qa');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport:{width:1200,height:900}});
const errors=[], failed=[], checks=[];
page.on('pageerror', error=>errors.push(error.message));
page.on('response', response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
await page.route(`${origin}/live2d-qa`, route=>route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@vite/client"></script></head><body><div id="root"></div><script type="module" src="/@fs/${resolve('apps/teacher-web/test/browser/live2d-harness.tsx').replaceAll('\\','/')}"></script></body></html>`}));
// Capture actual mouth parameters immediately before Core updates, without a production debug API.
await page.route('**/avatar/live2d/core/live2dcubismcore.min.js', async route=>{
  const response=await route.fetch();
  const script=await response.text();
  await route.fulfill({response,body:script+`;(()=>{const original=Live2DCubismCore.Model.prototype.update;Live2DCubismCore.Model.prototype.update=function(){const read=id=>this.parameters.values[this.parameters.ids.indexOf(id)];window.__mouth=read('ParamMouthOpenY');window.__eye=read('ParamEyeLOpen');window.__poses??=[];window.__poses.push({time:performance.now(),x:read('ParamAngleX'),y:read('ParamAngleY'),z:read('ParamAngleZ'),eye:window.__eye});const result=original.apply(this,arguments);if(this.drawables.ids.includes('Mouth_Open')){const opacity=id=>this.drawables.opacities[this.drawables.ids.indexOf(id)];window.__xiaomai={mouth:opacity('Mouth_Open'),left:opacity('EyeL_Open'),right:opacity('EyeR_Open'),drawables:this.drawables.ids.length};}return result;};})();`});
});
const pcm = Buffer.alloc(24000*2*6);
for(let i=0;i<24000*6;i++)pcm.writeInt16LE(i<24000 || i>=48000&&i<120000?Math.round(Math.sin(i*2*Math.PI*180/24000)*6500):0,i*2);
await page.route('**/api/teacher/tts', route=>route.fulfill({contentType:'text/event-stream',body:`data: ${JSON.stringify({audioBase64:pcm.toString('base64'),sampleRate:24000})}\n\n`}));
const ready=()=>page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});
const sample=()=>page.evaluate(()=>({mouth:window.__mouth,eye:window.__eye}));
try {
  await page.goto(`${origin}/live2d-qa`);await ready();await page.waitForTimeout(200);
  await page.screenshot({path:resolve(output,'desktop.png')});
  assert.equal((await sample()).mouth,0);checks.push('real Core/model/texture loaded; idle mouth closed');
  assert.equal(await page.getByRole('button',{name:'胸像',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('.live2d-avatar').screenshot({path:resolve(output,'bust.png')});
  await page.getByRole('button',{name:'头像',exact:true}).click();await page.waitForTimeout(150);
  await page.locator('.live2d-avatar').screenshot({path:resolve(output,'portrait.png')});
  await page.reload();await ready();assert.equal(await page.getByRole('button',{name:'头像',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'胸像',exact:true}).click();
  await page.evaluate(()=>{window.__poses=[];});
  await page.getByRole('button',{name:'思考',exact:true}).click();await page.waitForTimeout(900);
  await page.getByRole('button',{name:'打断',exact:true}).click();await page.waitForTimeout(900);
  const poses=await page.evaluate(()=>window.__poses);
  assert.ok(Math.min(...poses.map(p=>p.x)) < -2);
  assert.ok(Math.max(...poses.slice(1).map((p,i)=>Math.abs(p.x-poses[i].x)))<0.5,'head must blend rather than jump between states');
  await page.waitForFunction(()=>window.__eye<0.15);await page.waitForFunction(()=>window.__eye>0.95);
  checks.push('bust/portrait framing, persistent choice, smooth thinking/idle transitions and complete blink');
  await page.getByRole('button',{name:'讲解',exact:true}).click();
  await page.waitForFunction(()=>window.__mouth>0.1);
  await page.waitForFunction(()=>window.__mouth<0.03);checks.push('speech drives mouth; scheduled silent segment closes mouth');
  await page.waitForFunction(()=>window.__mouth>0.1);
  await page.screenshot({path:resolve(output,'speaking.png')});
  await page.evaluate(()=>{window.__originalCanvas=document.querySelector('.live2d-avatar canvas');});
  await page.getByRole('button',{name:'头像',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__originalCanvas===document.querySelector('.live2d-avatar canvas')),true);
  assert.equal(await page.locator('output').textContent(),'speaking');
  await page.getByRole('button',{name:'胸像',exact:true}).click();checks.push('framing changes retain the live canvas and speech session');
  await page.getByRole('button',{name:'打断',exact:true}).click();await page.waitForTimeout(120);
  assert.equal((await sample()).mouth,0);assert.equal(await page.locator('output').textContent(),'ready');checks.push('interrupt stops audio and mouth');
  await page.getByRole('button',{name:'讲解',exact:true}).click();await page.waitForFunction(()=>window.__mouth>0.1);
  await page.getByLabel('数字人形象').selectOption('video');assert.equal(await page.locator('.live2d-avatar').count(),0);
  await page.getByLabel('数字人形象').selectOption('live2d');await ready();await page.waitForTimeout(120);assert.equal((await sample()).mouth,0);checks.push('switch renderer during speech; fresh Live2D has no stale speech');
  await page.getByRole('button',{name:'折叠',exact:true}).click();assert.equal(await page.locator('.campus-avatar').isVisible(),false);
  await page.getByRole('button',{name:'折叠',exact:true}).click();await ready();checks.push('collapse and restore');
  await page.getByRole('button',{name:'全屏',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.screenshot({path:resolve(output,'fullscreen.png')});await page.evaluate(()=>document.exitFullscreen());
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:resolve(output,'narrow.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('fullscreen and 390px layout');
  await page.reload();await ready();assert.equal(await page.getByLabel('数字人形象').inputValue(),'live2d');checks.push('selection persists after reload');
  for (const character of ['xiaomai', 'natori', 'hiyori']) {
    await page.getByLabel('数字人形象').selectOption(character);await ready();
    await page.reload();await ready();assert.equal(await page.getByLabel('数字人形象').inputValue(),character);
    if (character === 'xiaomai') {
      await page.waitForFunction(()=>window.__xiaomai?.drawables===27);
      assert.equal(await page.locator('[data-xiaomai-eyes] canvas').count(),2);
      const openEyes=await page.locator('[data-xiaomai-eyes] canvas').first().evaluate(c=>c.toDataURL());
      await page.waitForFunction(()=>window.__xiaomai.left<.15 && window.__xiaomai.right<.15);
      assert.notEqual(await page.locator('[data-xiaomai-eyes] canvas').first().evaluate(c=>c.toDataURL()),openEyes);
      await page.waitForFunction(()=>window.__xiaomai.left>.95 && window.__xiaomai.right>.95);
      assert.equal(await page.evaluate(()=>window.__xiaomai.mouth),0);
      await page.locator('.live2d-avatar__credits summary').click();
      assert.ok((await page.locator('.live2d-avatar__credits').innerText()).includes('本项目定制形象'));
      assert.ok(!(await page.locator('.live2d-avatar__credits').innerText()).includes('拥有版权的示例素材'));
      await page.locator('.live2d-avatar__credits summary').click();
      checks.push('xiaomai: native 27-drawable model, original-pixel continuous eyelids blink, idle mouth closed, project-specific credit');
    }
    for (const width of [1200,390]) {
      await page.setViewportSize({width,height:900});
      for (const framing of ['胸像','头像']) {
        await page.getByRole('button',{name:framing,exact:true}).click();await page.waitForTimeout(200);
        await page.locator('.live2d-avatar').screenshot({path:resolve(output,`${character}-${width}-${framing==='胸像'?'bust':'portrait'}.png`)});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
    }
    const request=page.waitForRequest(r=>r.url().endsWith('/api/teacher/tts'));
    await page.getByRole('button',{name:'讲解',exact:true}).click();
    assert.equal((await request).postDataJSON().voiceProfile,character === 'xiaomai' ? 'default' : character);
    await page.waitForFunction(()=>window.__mouth>0.1);
    if (character === 'xiaomai') {
      await page.waitForFunction(()=>window.__xiaomai.mouth>.1);
      await page.waitForFunction(()=>window.__xiaomai.mouth<.03);
      await page.waitForFunction(()=>window.__xiaomai.mouth>.1);
      await page.getByRole('button',{name:'打断',exact:true}).click();
      await page.waitForFunction(()=>window.__xiaomai.mouth===0);
      await page.getByRole('button',{name:'讲解',exact:true}).click();
      await page.waitForFunction(()=>window.__xiaomai.mouth>.1);
      assert.equal(await page.locator('.live2d-avatar__canvas>svg').count(),1);checks.push('xiaomai: TTS PCM drives articulation with vector mouth, silence and interruption close it');
    }
    await page.getByLabel('数字人形象').selectOption('live2d');await ready();await page.waitForTimeout(120);
    assert.equal((await sample()).mouth,0);assert.equal(await page.locator('output').textContent(),'ready');
    checks.push(`${character}: actual WebGL, persistent choice, both framings at desktop/narrow, matched voice request and interrupt`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'讲解',exact:true}).click();await page.waitForFunction(()=>window.__mouth>0.1);
  assert.equal((await sample()).eye,1);await page.getByRole('button',{name:'打断',exact:true}).click();checks.push('reduced decorative motion retains live lip-sync');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.unroute('**/api/teacher/tts');
  await page.route('**/api/teacher/tts',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"QA unavailable"}'}));
  await page.getByRole('button',{name:'讲解',exact:true}).click();await page.getByText('语音暂不可用，请阅读字幕。',{exact:true}).waitFor();assert.equal((await sample()).mouth,0);checks.push('TTS failure preserves fallback and closed mouth');
  // A missing model must show a useful fallback, and retry must recover.
  await page.route('**/avatar/live2d/haru/Haru.model3.json',route=>route.fulfill({status:404,body:'missing'}));await page.reload();
  await page.locator('.live2d-avatar[data-status="error"]').waitFor({timeout:30000});
  assert.equal(await page.getByRole('button',{name:'重试',exact:true}).evaluate(button=>{const b=button.getBoundingClientRect(),p=button.closest('.live2d-avatar').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom;}),true);
  await page.screenshot({path:resolve(output,'fallback.png')});await page.unroute('**/avatar/live2d/haru/Haru.model3.json');
  await page.getByRole('button',{name:'重试',exact:true}).click();await ready();checks.push('missing model fallback and retry');
  await page.locator('.live2d-avatar canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});
  await page.locator('.live2d-avatar[data-status="error"]').waitFor();
  await page.getByRole('button',{name:'重试',exact:true}).click();await ready();checks.push('WebGL context loss releases renderer and retry recovers');
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed.filter(item=>!item.includes('/api/teacher/tts')&&!item.includes('/Haru.model3.json')),[]);
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({checks,errors,expectedFailures:failed},null,2));console.log(JSON.stringify({checks,errors}));
} catch(error) { await page.screenshot({path:resolve(output,'failure.png')});console.error(JSON.stringify({errors,failed,state:await page.locator('body').innerText()}));throw error; }
finally{await browser.close();}
