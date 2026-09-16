import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.TABLET_QA_URL ?? 'http://127.0.0.1:5173';
const out = 'output/tablet-qa';
await fs.mkdir(out, { recursive: true });
const engine = process.env.TABLET_BROWSER ?? 'chromium';
const part = process.env.TABLET_QA_PART ?? 'all';
const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true, ...(engine === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
const checks = [], errors = []; let active;
const pass = name => { checks.push(name); console.log('PASS', name); };
async function page(viewport, fallback = false) {
  const p = await browser.newPage({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  active = p; p.setDefaultTimeout(60000); p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(fallback => {
    const now = Date.now(); window.__offset = 0; window.__messages = 0; Date.now = () => now + window.__offset;
    if (fallback) Element.prototype.requestFullscreen = undefined;
    const Worker = window.Worker;
    window.Worker = class extends Worker { constructor(...args) { super(...args); this.addEventListener('message', e => {
      if (e.data.view) { window.__messages++; window.__view = e.data.view; window.__lesson = e.data.lesson; window.__tutorial = e.data.tutorial; }
    }); } };
  }, fallback);
  return p;
}
async function change(p, fn) { const n = await p.evaluate(() => window.__messages); await fn(); await p.waitForFunction(n => window.__messages > n, n); }
async function tap(locator) { await locator.tap(); }
async function layout(p, label) {
  const state = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    broken: [...document.images].filter(i => i.getBoundingClientRect().width && i.complete && !i.naturalWidth).map(i => i.src),
    small: [...document.querySelectorAll('.port-ops button,.port-ops input,.port-ops select')].filter(e => {
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5;
    }).map(e => ({ text: e.textContent?.slice(0, 40) || e.getAttribute('aria-label'), height: e.getBoundingClientRect().height })) }));
  assert.ok(state.scroll <= state.width + 1, `${label}: ${JSON.stringify(state)}`);
  assert.deepEqual(state.broken, [], label); assert.deepEqual(state.small, [], label);
}
async function screenshot(p, name) {
  await p.screenshot({ path: `${out}/${engine}-${name}.png`, scale: 'css' });
  // Windows WebKit's page screenshot omits the WebGL compositor surface. Read a
  // rendered frame directly, without changing the production context options.
  if (engine === 'webkit' && await p.locator('.port-ops-scene[data-renderer=ready] canvas').count()) {
    const frame = await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
      const canvas = document.querySelector('.port-ops-scene canvas');
      const gl = canvas.getContext('webgl2');
      resolve({ image: canvas.toDataURL('image/png'), lost: gl.isContextLost(), error: gl.getError() });
    })));
    assert.equal(frame.lost, false); assert.equal(frame.error, 0);
    await fs.writeFile(`${out}/${engine}-${name}-canvas.png`, Buffer.from(frame.image.split(',')[1], 'base64'));
  }
}
async function target(p, key) {
  const rack = p.locator(`[data-tutorial-rack] [data-tutorial-target="${key}"]`);
  if (await rack.count() && await rack.first().isVisible()) return rack.first();
  return p.locator(`[data-tutorial-target="${key}"]`).first();
}
async function tutorial(p, unit) {
  await p.goto(`${base}/port-simulation-preview.html?course=${unit}`);
  await tap(p.getByRole('button', { name: '开始操作教学', exact: true }));
  await p.waitForFunction(() => window.__tutorial?.current);
  await p.locator('[data-renderer=ready]').waitFor();
  for (let i = 0; i < 160; i++) {
    const { t, v } = await p.evaluate(() => ({ t: window.__tutorial, v: window.__view }));
    const s = t.current; if (!s) { assert.equal(t.complete, true); pass(`${unit} tutorial completed using touch buttons`); return; }
    const click = async key => change(p, async () => tap(await target(p, key)));
    console.log('STEP', unit, s.id, s.phase);
    if (s.id === 'dossier') { await click('ship-open'); continue; }
    if (s.id === 'resources' || s.id === 'plan-resources') { await click('tab:resources'); continue; }
    if (s.id === 'review') { await click('tab:review'); continue; }
    if (s.id === 'start') { await click('clock:start'); continue; }
    if (['waiting', 'running'].includes(s.phase)) {
      if (v.status === 'paused') await click('clock:resume');
      else await change(p, () => p.evaluate(() => window.__offset += 100000));
      continue;
    }
    if (s.id.startsWith('doc:') || s.id.startsWith('batch-doc:')) {
      const ship = s.id.startsWith('doc:'), id = s.id.slice(ship ? 4 : 10);
      const doc = ship ? v.vessels[0].call.docs[id] : v.batches.find(b => b.id === id).document;
      const form = await target(p, ship ? `document:${id}` : `batch-document:${id}`);
      await form.locator('input').fill(doc.reference);
      await change(p, () => tap(form.getByRole('button'))); continue;
    }
    if (s.id.startsWith('yard:') || s.id === 'berth') {
      assert.match(await p.locator('.port-tutorial-coach').innerText(), /选择对象 → 点选目标/);
      assert.equal(await p.locator('[data-gesture-hand]').count(), 0);
      const dest = s.id === 'berth' ? s.targets.find(t => t === 'destination:berth:1') ?? s.targets.find(t => t.startsWith('destination:')) : s.targets.filter(t => t.startsWith('yard-target:')).at(-1);
      await click(dest); continue;
    }
    if (s.id === 'work') { await click('ship-work'); continue; }
    if (s.id === 'depart') { await click('ship-depart'); continue; }
    if (s.id === 'inspect') { await click('inspect-submit'); continue; }
    if (['ledger', 'cargo-check', 'issue-open'].includes(s.id)) {
      if (s.id === 'issue-open') await click(`box:${s.focus}`);
      else await change(p, () => tap(p.locator('[data-tutorial-target="box-list"] button').first()));
      continue;
    }
    if (s.id === 'plan') { await click('plan-apply'); continue; }
    if (s.id === 'dispatch') {
      for (const [name, n] of [['岸桥操作人数',4],['运输班组人数',8],['堆场班组人数',4],['闸口核验人数',3],['维修班组人数',2]]) await p.getByLabel(name, { exact: true }).fill(String(n));
      await click('dispatch-apply'); continue;
    }
    throw Error(`Unhandled tutorial step ${s.id}`);
  }
  throw Error(`${unit} tutorial exceeded interaction limit`);
}
try {
  const viewports = part === 'tutorial' ? [] : engine === 'webkit' ? [[768,1024],[1024,768]] : [[768,1024],[1024,768],[820,1180],[1180,820],[600,960],[390,844]];
  for (const [width, height] of viewports) {
    const p = await page({ width, height }, true);
    await p.goto(`${base}/port-simulation-preview.html`);
    await tap(p.getByRole('button', { name: '跳过，直接练习', exact: true }));
    await p.locator('[data-renderer=ready]').waitFor();
    assert.equal(await p.getByLabel('画面质量').inputValue(), 'balanced');
    for (const unit of part === 'fullscreen' ? [] : ['arrival','cargo','yard','planning','departure','full']) {
      await tap(p.locator('.port-course-steps button').nth(['arrival','cargo','yard','planning','departure','full'].indexOf(unit)));
      await p.locator(`.port-ops[data-course=${unit}]`).waitFor();
      const skip = p.getByRole('button', { name: '跳过，直接练习', exact: true });
      if (unit !== 'arrival') await skip.waitFor();
      if (await skip.isVisible()) await tap(skip);
      await skip.waitFor({ state: 'hidden' });
      await p.locator('[data-renderer=ready]').waitFor();
      for (const button of await p.locator('.port-tabs button').all()) { await tap(button); await layout(p, `${width}/${unit}`); }
    }
    await tap(p.getByRole('button', { name: '舞台全屏', exact: true }));
    await p.locator('[data-stage-fullscreen=true]').waitFor();
    await p.evaluate(() => window.__canvas = document.querySelector('.port-ops-scene canvas'));
    const panel = p.getByRole('navigation', { name: '全屏舞台工具' }).getByRole('button', { name: '操作面板' });
    if (await panel.getAttribute('aria-pressed') !== 'true') await tap(panel);
    await p.locator('.port-workbench').waitFor({ state: 'visible' });
    await layout(p, `${width}/fullscreen`); await screenshot(p, `${width}-fullscreen`);
    await p.setViewportSize({ width: height, height: width });
    await layout(p, `${width}/rotated`);
    assert.equal(await p.evaluate(() => document.querySelector('.port-ops-scene canvas') === window.__canvas), true);
    await tap(p.getByRole('button', { name: '退出舞台全屏', exact: true }));
    await p.locator('[data-stage-fullscreen=false]').waitFor();
    assert.equal(await p.evaluate(() => document.body.style.overflow), '');
    pass(`${width}×${height}: ${part === 'fullscreen' ? 'open workbench' : 'six modules and all tabs'}, 44px targets, fullscreen fallback and rotation`);
    await p.close();
  }
  for (const unit of part === 'fullscreen' ? [] : engine === 'webkit' ? ['arrival'] : ['arrival','cargo','yard','planning','departure']) {
    const p = await page({ width: 1024, height: 768 });
    await tutorial(p, unit); await screenshot(p, `${unit}-complete`); await p.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${out}/${engine}-${part}-report.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  await screenshot(active, 'failure').catch(() => {});
  await fs.writeFile(`${out}/${engine}-${part}-report.json`, JSON.stringify({ passed: false, checks, errors, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
