import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const { chromium } = createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base = process.env.TERMINAL_LAB_URL || 'http://127.0.0.1:4173';
const output = 'output/terminal-3d-qa';
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); page.setDefaultTimeout(45000);
const errors = []; const checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const button = name => page.getByRole('button', { name, exact: true });
const clock = () => page.locator('.terminal-clock strong').innerText();
const seconds = async () => (await clock()).split(':').reduce((n, p) => n * 60 + Number(p), 0);
const quantity = target => page.locator(`[data-operation="${target}"] .terminal-chain-state strong`).innerText().then(s => Number(s.split('/')[0]));
const delivered = () => page.locator('.terminal-kpi strong').first().innerText();
const record = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('edu-terminal-lab:v2:preview:') && !k.endsWith(':comparisons')))));
async function check(name, fn) { const detail = await fn(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
async function runMinutes(minutes) {
  const target = await seconds() + minutes * 60;
  await button('继续运行').click();
  await page.waitForFunction(target => document.querySelector('.terminal-clock strong').textContent.split(':').reduce((n,p)=>n*60+Number(p),0) >= target, target);
  await button('暂停时钟').click();
}
try {
  await page.goto(`${base}/port-simulation-preview.html?lab=legacy`); await page.locator('[data-renderer="ready"]').waitFor();
  await check('production preview serves realtime controls without questions', async () => {
    assert.match(await page.locator('h1').innerText(), /接管港口/); assert.equal(await page.locator('.terminal-question').count(), 0);
    assert.equal(await page.getByLabel('实时作业控制台').count(), 1); assert.equal(await page.locator('.terminal-modes button').count(), 4);
    assert.equal((await record()).schema, 'terminal-lab/2.1');
  });
  await check('true 1x clock and pause use elapsed time', async () => {
    await page.getByLabel('仿真速度').selectOption('1'); const wall = Date.now();
    await button('启动时钟').click(); await page.waitForTimeout(2200); await button('暂停时钟').click();
    const sim = await seconds(); assert.ok(sim >= 2 && sim <= Math.ceil((Date.now()-wall)/1000)+1);
    const paused = await clock(); await page.waitForTimeout(1100); assert.equal(await clock(), paused); assert.match(await delivered(), /^0 \/ 300/);
    return { simulatedSeconds: sim, wallMilliseconds: Date.now()-wall-1100 };
  });
  await check('live admission, mooring and five work orders deliver real cargo', async () => {
    await button('放行船 A').click(); assert.equal(await button('放行船 B').isEnabled(), false);
    for (const name of ['启动水平运输', '启动堆场接箱', '启动闸口交付']) await button(name).click();
    await page.getByLabel('仿真速度').selectOption('600'); await button('继续运行').click();
    await button('确认 A 船系泊').click(); await button('启动 A 泊位岸桥').click(); await button('放行船 B').click();
    await button('确认 B 船系泊').click(); await button('启动 B 泊位岸桥').click();
    await page.waitForFunction(() => Number(document.querySelector('.terminal-kpi strong').textContent.split('/')[0]) >= 2);
    await button('暂停时钟').click(); assert.match(await page.locator('.terminal-flow-navigation').innerText(), /6 \/ 6/);
    return { clock: await clock(), delivered: await delivered() };
  });
  await check('closing a gate freezes deliveries and builds a real yard queue', async () => {
    await button('暂停闸口交付').click(); const before = await delivered(); const yardBefore = await quantity('gate');
    await runMinutes(20); assert.equal(await delivered(), before); assert.ok(await quantity('gate') > yardBefore + 1);
    const yardAfter = await quantity('gate'); await button('启动闸口交付').click(); await runMinutes(10);
    assert.notEqual(await delivered(), before); return { yardBefore, yardAfter };
  });
  await check('all-stop holds cargo while the simulation clock continues', async () => {
    await button('全港停工').click(); const before = [await quantity('transport'), await quantity('yard'), await quantity('gate'), await delivered()];
    const time = await seconds(); await runMinutes(10);
    assert.deepEqual([await quantity('transport'), await quantity('yard'), await quantity('gate'), await delivered()], before);
    assert.ok(await seconds() >= time + 600);
  });
  await check('refresh preserves order history and restores paused', async () => {
    const saved = await record(); const before = await clock(); assert.ok(saved.commands.length < 50);
    await page.reload(); await page.locator('[data-renderer="ready"]').waitFor(); assert.equal(await clock(), before);
    assert.equal(await button('继续运行').count(), 1); assert.deepEqual(await record(), saved);
  });
  await check('four modes remain usable at desktop and narrow widths', async () => {
    const layouts = [];
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const task of ['熟悉流程', '设备与人员调度', '设备选型', '港区规划']) {
        await page.locator('.terminal-modes').getByRole('button', { name: new RegExp(task) }).click();
        const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, bad: [...document.querySelectorAll('.terminal-studio button,.terminal-studio input,.terminal-studio select')].filter(el => !el.closest('.terminal-comparison') && el.getBoundingClientRect().width && el.getBoundingClientRect().right > innerWidth + 1).map(el => el.textContent) }));
        assert.ok(size.scroll <= width); assert.deepEqual(size.bad, []); layouts.push({ width, task });
      }
    }
    return layouts;
  });
  await check('production WebGL frame contains visible 3D geometry', async () => {
    await page.setViewportSize({ width: 1600, height: 1000 }); await page.locator('.terminal-viewport').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const colors = await page.evaluate(() => {
      const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); gl.finish(); const sample = new Uint8Array(4); const found = new Set();
      for (let x = 1; x < 5; x++) for (let y = 1; y < 4; y++) { gl.readPixels(Math.floor(c.width*x/5),Math.floor(c.height*y/4),1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample); found.add([...sample].join(',')); }
      return found.size;
    }); assert.ok(colors > 3); return { distinctSampleColors: colors };
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/realtime-production-report.json`, JSON.stringify({ verified: true, base, checks, errors }, null, 2));
  console.log(JSON.stringify({ verified: true, checks: checks.length, errors }));
} catch (error) {
  await page.screenshot({ path: `${output}/realtime-production-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
