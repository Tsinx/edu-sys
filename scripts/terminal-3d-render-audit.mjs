import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const output = 'output/terminal-3d-qa';
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1150 } });
const errors = []; const views = [];
page.on('pageerror', e => errors.push(e.message));
await page.route(u => u.pathname.endsWith('/TerminalScene3D.tsx'), async route => {
  const response = await route.fetch(); let body = await response.text();
  assert.ok(body.includes('const p = latest.current;'));
  body = body.replace('const p = latest.current;', 'if(window.__holdTerminalCapture)return;const p = latest.current;');
  body = body.replace('renderer.render(scene, camera);', `renderer.render(scene, camera);window.__terminalView={moving:!!r.goal,minute:state.minute,camera:camera.position.toArray(),bounds:[[-108,-14],[108,-14],[108,86],[-108,86]].map(([x,z])=>{const p=controls.target.clone().set(x,0,z).project(camera);return [(p.x+1)/2,(1-p.y)/2]})};`);
  await route.fulfill({ response, body });
});
async function ready() { await page.locator('[data-renderer="ready"]').waitFor({ timeout: 60000 }); await page.locator('.terminal-viewport').scrollIntoViewIfNeeded(); await page.waitForFunction(() => window.__terminalView && !window.__terminalView.moving); }
async function capture(name) {
  await ready();
  // The screenshot compositor can sample a software WebGL canvas between clear and draw.
  // Freeze only this audit's render loop, then finish queued GPU work before capture.
  const sample = await page.evaluate(() => {
    window.__holdTerminalCapture = true;
    const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); gl.finish();
    const pixel = new Uint8Array(4); const colors = [];
    for (let x = 1; x < 5; x++) for (let y = 1; y < 4; y++) { gl.readPixels(Math.floor(c.width*x/5),Math.floor(c.height*y/4),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel); colors.push([...pixel].join(',')); }
    return { ...window.__terminalView, colors: new Set(colors).size, width: innerWidth };
  });
  assert.ok(sample.colors > 3, `${name} contains real rendered geometry`); assert.ok(sample.camera.every(Number.isFinite));
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  await page.locator('.terminal-viewport').screenshot({ path: `${output}/${name}-scene.png` });
  await page.evaluate(() => { window.__holdTerminalCapture = false; });
  views.push({ name, ...sample }); console.log(`PASS rendered ${name}`);
}
try {
  await page.goto('http://127.0.0.1:5173/port-simulation-preview.html?lab=legacy'); await ready();
  await page.getByRole('button', { name: '放行船 A', exact: true }).click();
  for (const name of ['启动水平运输', '启动堆场接箱', '启动闸口交付']) await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('仿真速度').selectOption('600'); await page.getByRole('button', { name: '启动时钟', exact: true }).click();
  await page.getByRole('button', { name: '确认 A 船系泊', exact: true }).click(); await page.getByRole('button', { name: '启动 A 泊位岸桥', exact: true }).click();
  await page.getByRole('button', { name: '放行船 B', exact: true }).click(); await page.getByRole('button', { name: '确认 B 船系泊', exact: true }).click(); await page.getByRole('button', { name: '启动 B 泊位岸桥', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.terminal-clock strong').textContent.split(':').reduce((n,p)=>n*60+Number(p),0) >= 3600);
  await page.getByRole('button', { name: '暂停时钟', exact: true }).click();
  for (const [label, id] of [['熟悉流程','flow'],['设备与人员调度','dispatch'],['设备选型','equipment'],['港区规划','planning']]) {
    await page.locator('.terminal-modes').getByRole('button', { name: new RegExp(label) }).click();
    if (id === 'planning') { await page.getByRole('button', { name: '新试验', exact: true }).click(); await page.getByRole('button', { name: '地块 B1 集装箱堆场', exact: true }).click(); }
    await capture(`desktop-${id}`);
  }
  await page.getByRole('button', { name: '全景', exact: true }).click(); await ready();
  await page.getByRole('button', { name: '规划俯视', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 950 }); await ready();
  const bounds = await page.evaluate(() => window.__terminalView.bounds);
  assert.ok(bounds.every(([x,y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1), `All buildable plots stay in frame after resizing during a camera transition: ${JSON.stringify(bounds)}`);
  for (const [label, id] of [['港区规划','planning'],['设备选型','equipment'],['设备与人员调度','dispatch'],['熟悉流程','flow']]) {
    await page.locator('.terminal-modes').getByRole('button', { name: new RegExp(label) }).click(); await capture(`mobile-${id}`);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/render-report.json`, JSON.stringify({ verified: true, cameraResize: 'all buildable plots remain inside the viewport', views, errors }, null, 2));
  console.log(JSON.stringify({ verified: true, views: views.length, errors }));
} finally { await browser.close(); }
