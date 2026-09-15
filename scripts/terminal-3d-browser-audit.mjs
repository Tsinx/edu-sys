import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const localRequire = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = localRequire('playwright')); }
catch { ({ chromium } = createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright')); }
const base = process.env.TERMINAL_LAB_URL || 'http://127.0.0.1:5173';
const output = 'output/terminal-3d-qa'; await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1150 }, deviceScaleFactor: 1 });
const page = await context.newPage(); page.setDefaultTimeout(30000); const errors = []; const checks = []; const shots = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' || /too many active webgl|shader error/i.test(message.text())) errors.push(message.text()); });
if (base.includes(':5173')) await page.route(url => url.pathname.endsWith('/TerminalScene3D.tsx'), async route => {
  const response = await route.fetch(); let body = await response.text();
  const anchor = 'renderer.render(scene, camera);'; assert.ok(body.includes(anchor), 'render instrumentation anchor');
  body = body.replace(anchor, `${anchor} window.__terminalFrame = { minute: state.minute, playing: p.playing, movingCamera: Boolean(r.goal), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, camera: camera.position.toArray(), vehicles: world.vehicles.map(v => v.position.toArray()), visiblePeople: world.people.filter(v=>v.visible).length, cargoCounts: world.ships.map(s=>s.getObjectByName('vessel-cargo').children.reduce((n,m)=>n+m.count,0)), projected: [...world.facilityPositions.entries()].map(([id,pos])=>{const p=pos.clone().setY(8).project(camera);return {id,x:(p.x+1)/2,y:(1-p.y)/2}}) };
    if(window.__terminalInspectRequested){const gl=renderer.getContext();const pixel=new Uint8Array(4);const colors=[];for(let x=1;x<=4;x++)for(let y=1;y<=3;y++){gl.readPixels(Math.floor(gl.drawingBufferWidth*x/5),Math.floor(gl.drawingBufferHeight*y/4),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);colors.push([...pixel].join(','));}window.__terminalPixels=colors;window.__terminalInspectRequested=false;}`);
  await route.fulfill({ response, body });
});
async function check(name, action) { const details = await action(); checks.push({ name, passed: true, details }); console.log(`PASS ${name}`); }
const ready = async () => { await page.locator('[data-renderer="ready"]').waitFor({ timeout: 60000 }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
const snapshot = () => page.evaluate(() => { const key = Object.keys(localStorage).find(key => key.startsWith('edu-terminal-lab:v2:preview:') && !key.endsWith(':comparisons')); return JSON.parse(localStorage.getItem(key)); });
const clock = () => page.locator('.terminal-clock strong').innerText();
const mode = name => page.getByRole('navigation', { name: '选择实验任务' }).getByRole('button', { name: new RegExp(name) }).click();
const secondsNow = async () => (await clock()).split(':').reduce((n, part) => n * 60 + Number(part), 0);
const play = async () => { await page.getByRole('button', { name: /^(启动时钟|继续运行)$/ }).click(); };
const pause = async () => { await page.getByRole('button', { name: '暂停时钟', exact: true }).click(); };
const stepTime = async () => { const target = await secondsNow() + 1800; await page.getByLabel('仿真速度').selectOption('600'); await play(); await page.waitForFunction(target => document.querySelector('.terminal-clock strong').textContent.split(':').reduce((n,p)=>n*60+Number(p),0) >= target, target); await pause(); };
async function shot(name) { const path = `${output}/${name}.png`; await page.locator('.terminal-viewport').scrollIntoViewIfNeeded(); await ready(); if (base.includes(':5173')) await page.waitForFunction(() => window.__terminalFrame && !window.__terminalFrame.movingCamera); await page.screenshot({ path, fullPage: true }); shots.push(path); }
async function noOverflow() { return page.evaluate(() => { const root = document.documentElement; return { viewport: innerWidth, document: root.scrollWidth, bad: [...document.querySelectorAll('.terminal-studio button,.terminal-studio input,.terminal-studio select')].filter(el=>!el.closest('.terminal-comparison') && el.getBoundingClientRect().width && el.getBoundingClientRect().right > innerWidth + 1).map(el=>el.textContent?.slice(0,50)) }; }); }
try {
  await page.goto(`${base}/port-simulation-preview.html?lab=legacy`); await ready();
  await check('real 3D renderer and all four tasks', async () => {
    assert.equal(await page.locator('canvas').count(), 1); assert.equal(await page.locator('.terminal-modes button').count(), 4);
    if (base.includes(':5173')) { await page.waitForFunction(() => window.__terminalFrame?.triangles > 10000); const frame = await page.evaluate(() => window.__terminalFrame); assert.ok(frame.calls < 700, `draw calls: ${frame.calls}`); return { triangles: frame.triangles, drawCalls: frame.calls }; }
  });
  if (base.includes(':5173')) await check('all camera presets draw nonblank finite 3D views', async () => {
    const views = [];
    for (const name of ['全景', '岸线', '堆场', '闸口', '规划俯视']) {
      console.log(`CAMERA ${name}`);
      await page.getByRole('button', { name, exact: true }).click();
      await page.waitForFunction(() => window.__terminalFrame && !window.__terminalFrame.movingCamera);
      await page.evaluate(() => { window.__terminalInspectRequested = true; }); await page.waitForFunction(() => !window.__terminalInspectRequested);
      const data = await page.evaluate(() => ({ frame: window.__terminalFrame, colors: new Set(window.__terminalPixels).size }));
      assert.ok(data.frame.camera.every(Number.isFinite)); assert.ok(data.colors > 3, `${name}: blank pixels`); views.push({ name, colors: data.colors });
    }
    await page.getByRole('button', { name: '全景', exact: true }).click(); return views;
  });
  await check('real time is continuous and no multiple-choice questions remain', async () => {
    assert.equal(await page.locator('.terminal-question').count(), 0);
    await page.getByLabel('仿真速度').selectOption('1'); const before = await secondsNow(); const wall = Date.now();
    await play(); await page.waitForTimeout(2300); await pause(); const seconds = await secondsNow() - before;
    assert.ok(seconds >= 2 && seconds <= Math.ceil((Date.now()-wall)/1000)+1, `1x clock advanced ${seconds}s`);
    assert.match(await page.locator('.terminal-kpi strong').first().innerText(), /^0 \/ 300/);
    return { simulatedSeconds: seconds, wallMilliseconds: Date.now() - wall };
  });
  await check('live orders enforce the channel and drive all six stages', async () => {
    await page.getByRole('button', { name: '放行船 A', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '放行船 B', exact: true }).isEnabled(), false);
    for (const name of ['启动水平运输', '启动堆场接箱', '启动闸口交付']) await page.getByRole('button', { name, exact: true }).click();
    await stepTime();
    await page.getByRole('button', { name: '确认 A 船系泊', exact: true }).click();
    await page.getByRole('button', { name: '启动 A 泊位岸桥', exact: true }).click();
    await page.getByRole('button', { name: '放行船 B', exact: true }).click(); await stepTime();
    await page.getByRole('button', { name: '确认 B 船系泊', exact: true }).click();
    await page.getByRole('button', { name: '启动 B 泊位岸桥', exact: true }).click(); await stepTime();
    assert.match(await page.locator('.terminal-flow-navigation').innerText(), /6 \/ 6/);
    assert.ok(Number((await page.locator('.terminal-kpi strong').first().innerText()).split('/')[0].trim()) > 10);
  });
  await page.getByRole('button', { name: '全景', exact: true }).click();
  await shot('desktop-flow');
  await check('clock and projection pause together', async () => {
    const before = await clock(); const frame = await page.evaluate(() => window.__terminalFrame?.vehicles);
    await page.waitForTimeout(350); assert.equal(await clock(), before);
    if (frame) assert.deepEqual(await page.evaluate(() => window.__terminalFrame.vehicles), frame);
  });
  await check('personnel and berth over-allocation are rejected', async () => {
    await mode('设备与人员调度'); await page.getByLabel('运输司机', { exact: true }).fill('26');
    assert.equal(await page.getByRole('button', { name: '下达调度方案' }).isEnabled(), false);
    await page.getByLabel('运输司机', { exact: true }).fill('0'); await page.getByRole('button', { name: '下达调度方案' }).click();
    assert.equal((await snapshot()).commands.at(-1).value.drivers, 0);
  });
  await check('running timer preserves an unsubmitted dispatch draft', async () => {
    await page.getByRole('button', { name: '继续运行', exact: true }).click(); await page.getByLabel('运输司机', { exact: true }).fill('7');
    await page.waitForTimeout(1250); assert.equal(await page.getByLabel('运输司机', { exact: true }).inputValue(), '7');
    await page.getByRole('button', { name: '暂停时钟', exact: true }).click();
    await page.getByLabel('运输司机', { exact: true }).fill('8'); await page.getByRole('button', { name: '下达调度方案' }).click();
  });
  await shot('desktop-dispatch');
  await check('reload restores deterministic progress paused', async () => {
    const before = await clock(); const saved = await snapshot(); await page.reload(); await ready(); assert.equal(await clock(), before);
    assert.equal(await page.getByRole('button', { name: '继续运行', exact: true }).count(), 1); assert.deepEqual(await snapshot(), saved);
  });
  await check('exports can be imported; malformed files do not replace the run', async () => {
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出复盘', exact: true }).click(); const download = await downloadPromise;
    const file = `${output}/browser-review.json`; await download.saveAs(file); const value = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(value.schema, 'terminal-lab/2.1'); assert.ok(!/actorId|displayName|studentNumber|token/.test(JSON.stringify(value)));
    await page.getByRole('button', { name: '新试验', exact: true }).click(); assert.equal(await clock(), '00:00:00');
    await page.locator('input[type=file]').setInputFiles(file); await page.waitForFunction(() => document.querySelector('.terminal-clock strong').textContent !== '00:00:00');
    const before = await clock(); await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
    await page.getByRole('alert').waitFor(); assert.equal(await clock(), before);
  });
  await check('equipment selection changes budget and infrastructure constraints', async () => {
    await page.getByRole('button', { name: '新试验', exact: true }).click(); await mode('设备选型');
    const old = await page.locator('.terminal-budget strong').innerText(); await page.getByLabel('水平运输型号').selectOption('agv');
    assert.notEqual(await page.locator('.terminal-budget strong').innerText(), old);
    await page.getByLabel('岸桥系统型号').selectOption('standard'); assert.match(await page.locator('.terminal-warnings').innerText(), /伸距不足/);
    await page.getByLabel('岸桥系统型号').selectOption('wide'); await ready();
  });
  await shot('desktop-equipment');
  await check('planning supports build, relocate, rotate, undo and protected gate placement', async () => {
    await mode('港区规划'); await page.getByRole('button', { name: '地块 A1 空地', exact: true }).click();
    await page.getByLabel('建设设施类型').selectOption('gate'); await page.getByRole('button', { name: '在此建设', exact: true }).click();
    assert.match(await page.getByRole('alert').innerText(), /第 3 排/);
    await page.getByLabel('建设设施类型').selectOption('yard'); await page.getByRole('button', { name: '在此建设', exact: true }).click(); await ready();
    await page.getByRole('button', { name: '地块 A1 集装箱堆场', exact: true }).click();
    await page.getByRole('button', { name: '旋转 90°', exact: true }).click();
    assert.equal((await snapshot()).setup.facilities.find(f=>f.col===0&&f.row===0).rotation, 1);
    await page.getByRole('button', { name: '迁移设施', exact: true }).click(); await page.getByRole('button', { name: '地块 C1 空地', exact: true }).click();
    assert.ok((await snapshot()).setup.facilities.some(f=>f.col===2&&f.row===0));
    await page.getByRole('button', { name: '撤销规划修改', exact: true }).click();
    assert.ok((await snapshot()).setup.facilities.some(f=>f.col===0&&f.row===0));
    await page.getByRole('button', { name: '规划俯视', exact: true }).click(); await ready();
  });
  await shot('desktop-planning');
  if (base.includes(':5173')) await check('3D raycasting selects the real warehouse', async () => {
    await page.getByRole('button', { name: '规划俯视', exact: true }).click(); await page.locator('.terminal-viewport').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !window.__terminalFrame.movingCamera);
    const projected = await page.evaluate(() => window.__terminalFrame.projected.find(p => p.id === 'warehouse-1'));
    const rect = await page.locator('canvas').boundingBox(); await page.mouse.click(rect.x + projected.x * rect.width, rect.y + projected.y * rect.height);
    assert.match(await page.locator('.terminal-facility-editor h3').innerText(), /拆装箱仓库/);
  });
  await check('benchmark records survive a reload', async () => {
    await stepTime(); await stepTime(); await page.locator('.terminal-review summary').click();
    await page.getByRole('button', { name: '保存当前结果为对照', exact: true }).click();
    assert.equal(await page.locator('.terminal-comparison tbody tr').count(), 1);
    await page.reload(); await ready(); await page.locator('.terminal-review summary').click(); assert.equal(await page.locator('.terminal-comparison tbody tr').count(), 1);
  });
  await check('desktop and narrow task panels have no horizontal clipping', async () => {
    const sizes = [];
    for (const width of [1600, 768, 390]) { await page.setViewportSize({ width, height: 1000 }); for (const task of ['熟悉流程', '设备与人员调度', '设备选型', '港区规划']) { await mode(task); await ready(); const overflow = await noOverflow(); assert.ok(overflow.document <= width, JSON.stringify(overflow)); assert.deepEqual(overflow.bad, []); sizes.push({ width, task }); if (width === 390) await shot(`mobile-${task}`); } }
    return sizes;
  });
  await check('main authenticated course entry loads the same 3D laboratory', async () => {
    const identity = await page.request.post(`${base}/api/identity/development/session`, { data: { role: 'student', displayName: '3D 实验验收' } }); assert.ok(identity.ok(), `identity response: ${identity.status()}`);
    await page.setViewportSize({ width: 1600, height: 1150 }); await page.goto(`${base}/simulations`); await page.getByRole('heading', { name: '接管港口，让每一道指令真正运行' }).waitFor({ timeout: 45000 }); await ready();
    assert.equal(await page.locator('.terminal-modes button').count(), 4); await shot('course-entry');
  });
  await check('WebGL loss can recover without losing the trial', async () => {
    await stepTime(); const before = await clock();
    await page.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.getByRole('button', { name: '重新载入 3D 场景', exact: true }).waitFor(); assert.equal(await clock(), before);
    await page.getByRole('button', { name: '重新载入 3D 场景', exact: true }).click(); await ready(); assert.equal(await clock(), before); assert.equal(await page.locator('canvas').count(), 1);
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/browser-report.json`, JSON.stringify({ verified: true, base, checks, screenshots: shots, errors }, null, 2));
  console.log(JSON.stringify({ verified: true, checks: checks.length, screenshots: shots.length, errors }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(()=>{});
  await fs.writeFile(`${output}/browser-report.json`, JSON.stringify({ verified: false, checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
