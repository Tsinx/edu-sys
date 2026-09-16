import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'output/tablet-qa'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const checks = [], errors = [];
const p = await browser.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
p.on('pageerror', e => errors.push(e.message)); p.setDefaultTimeout(30000);
try {
  await p.addInitScript(() => {
    const now = Date.now(); window.__offset = 0; Date.now = () => now + window.__offset;
    const Worker = window.Worker;
    window.Worker = class extends Worker { constructor(...args) { super(...args); this.addEventListener('message', e => { if(e.data.view) window.__view=e.data.view; }); } };
  });
  await p.goto((process.env.TABLET_QA_URL ?? 'http://127.0.0.1:5173') + '/port-simulation-preview.html');
  await p.getByRole('button', { name:'跳过，直接练习', exact:true }).tap(); await p.locator('[data-renderer=ready]').waitFor();
  await p.getByRole('button', { name:'开始本段', exact:true }).tap();
  await p.getByLabel('运行速度', { exact:true }).selectOption('600');
  if (await p.getByRole('button', { name:'继续运行', exact:true }).isVisible()) await p.getByRole('button', { name:'继续运行', exact:true }).tap();
  await p.evaluate(() => window.__offset += 10000);
  await p.waitForFunction(() => window.__view.vessels[0].call.stage === 'outer');
  await p.getByRole('button', { name:'舞台全屏', exact:true }).tap();
  await p.getByRole('navigation', { name:'全屏舞台工具' }).getByRole('button', { name:'操作面板' }).tap();
  await p.getByRole('button', { name:'定位选中对象', exact:true }).tap();
  const canvas = p.locator('.port-ops-scene canvas'); const rect = await canvas.boundingBox();
  const x = Math.round(rect.x+rect.width/2), y = Math.round(rect.y+rect.height/2);
  const client = await p.context().newCDPSession(p);
  const point = (id, x, y) => ({ id,x,y,radiusX:4,radiusY:4,force:1 });
  const touch = (type, touchPoints) => client.send('Input.dispatchTouchEvent', { type,touchPoints });
  await p.evaluate(() => { window.__touchEvents=[]; for(const name of ['pointerdown','pointermove','pointerup','pointercancel']) document.querySelector('.port-ops-scene canvas').addEventListener(name,e=>window.__touchEvents.push({type:e.type,pointerType:e.pointerType,id:e.pointerId})); });
  const before = await p.evaluate(() => JSON.stringify(window.__view));
  await touch('touchStart',[point(1,x,y)]);
  for(let i=1;i<=8;i++) await touch('touchMove',[point(1,x+i*10,y+i*3)]);
  await touch('touchMove',[point(1,x,y)]); await touch('touchEnd',[]);
  await touch('touchStart',[point(1,x-40,y),point(2,x+40,y)]);
  for(let i=1;i<=8;i++) await touch('touchMove',[point(1,x-40-i*8,y+i*2),point(2,x+40+i*8,y+i*2)]);
  await touch('touchEnd',[]);
  await touch('touchStart',[point(1,x,y)]); await touch('touchCancel',[]);
  assert.equal(await p.evaluate(() => JSON.stringify(window.__view)),before);
  const events = await p.evaluate(() => window.__touchEvents);
  assert.ok(events.filter(e=>e.type==='pointerdown' && e.pointerType==='touch').length>=4);
  assert.ok(events.some(e=>e.type==='pointercancel'));
  checks.push('real touch rotation, pinch/pan and cancellation leave business state unchanged');
  await p.getByRole('button', { name:'办理选中对象', exact:true }).tap();
  await p.getByLabel('目的位置', { exact:true }).selectOption('anchor:0');
  assert.equal(await p.getByLabel('目的位置', { exact:true }).inputValue(),'anchor:0');
  await p.getByRole('button', { name:'退出舞台全屏', exact:true }).tap();
  for(const quality of ['high','balanced']) {
    await p.getByLabel('画面质量').selectOption(quality); await p.locator('[data-renderer=ready]').waitFor();
    assert.equal(await p.evaluate(() => JSON.stringify(window.__view)),before);
    const ratio=await canvas.evaluate(e=>e.width/e.getBoundingClientRect().width); assert.ok(ratio <= (quality==='high'?1.51:1.01));
  }
  await p.getByRole('button', { name:'放大港区', exact:true }).tap(); await p.getByRole('button', { name:'缩小港区', exact:true }).tap();
  checks.push('native fullscreen, no-keyboard form selection, quality changes and zoom buttons retain session');
  const contextLost = await canvas.evaluate(e=>{const gl=e.getContext('webgl2'); const extension=gl?.getExtension('WEBGL_lose_context'); if(!extension)return false; extension.loseContext(); return true;});
  assert.ok(contextLost); await p.getByRole('button',{name:'恢复 3D',exact:true}).waitFor();
  await p.getByRole('button',{name:'恢复 3D',exact:true}).tap(); await p.locator('[data-renderer=ready]').waitFor();
  assert.equal(await p.evaluate(() => JSON.stringify(window.__view)),before); checks.push('WebGL context loss and retry retain all business state');
  assert.deepEqual(errors,[]); await fs.writeFile(`${out}/gestures-report.json`,JSON.stringify({passed:true,checks,errors,events},null,2)); console.log(checks);
} catch(error) { await p.screenshot({path:`${out}/gestures-failure.png`,scale:'css'}).catch(()=>{}); await fs.writeFile(`${out}/gestures-report.json`,JSON.stringify({passed:false,checks,errors,error:String(error)},null,2)); throw error; }
finally { await browser.close(); }
