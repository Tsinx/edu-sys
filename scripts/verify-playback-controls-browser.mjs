import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const { chromium } = require('playwright');
const origin = process.env.PORT_LBL_BASE_URL || 'http://127.0.0.1:5173';
const output = resolve('output/playback-controls-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
await page.route(`${origin}/playback-controls-qa`, route => route.fulfill({ contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@vite/client"></script></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${resolve('apps/teacher-web/test/browser/playback-controls-harness.tsx').replaceAll('\\', '/')}"></script></body></html>` }));
const button = name => page.getByRole('button', { name, exact: true });
const enter = async () => { await button('全屏').click(); await page.waitForFunction(() => !!document.fullscreenElement); await page.locator('.classroom-fullscreen-controls .lbl-controls').waitFor(); };
const exit = async () => { await button('退出全屏').click(); await page.waitForFunction(() => !document.fullscreenElement); await page.locator('.teaching-controlbar .lbl-controls').waitFor(); };
async function layout(name) {
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const toolbar = document.querySelector(document.fullscreenElement ? '.classroom-fullscreen-controls' : '.teaching-controlbar');
    const canvas = rect(document.querySelector('.slide-logical-canvas'));
    return {
      controlCount: document.querySelectorAll('.lbl-controls').length,
      insideStage: !!document.querySelector('.lbl-stage .lbl-controls'),
      toolbar: rect(toolbar), canvas,
      overflow: document.documentElement.scrollWidth > innerWidth,
      outside: [...toolbar.querySelectorAll('button,input')].filter(element => {
        const r = rect(element), t = rect(toolbar);
        return r.width && (r.x < t.x - 1 || r.right > t.right + 1 || r.bottom > innerHeight + 1);
      }).map(element => element.getAttribute('aria-label') || element.textContent),
      reservedRow: getComputedStyle(document.querySelector('.lbl-stage')).gridTemplateRows.split(' ').length > 1
    };
  });
  console.log(name, JSON.stringify(result));
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  assert.equal(result.controlCount, 1, name);
  assert.equal(result.insideStage, false, name);
  assert.equal(result.reservedRow, false, name);
  assert.equal(result.overflow, false, name);
  assert.deepEqual(result.outside, [], name);
  assert.ok(Math.abs(result.canvas.width / result.canvas.height - 1.6) < .001, name);
  assert.ok(result.canvas.bottom <= result.toolbar.y + 1, name);
  checks.push({ name, ...result });
}
try {
  await page.goto(`${origin}/playback-controls-qa`);
  await page.locator('.teaching-controlbar .lbl-controls').waitFor();
  await page.getByLabel('选择课件页').selectOption('14');
  await page.locator('.lbl-process-scene[data-render-state="ready"]').waitFor();
  await layout('normal-desktop');
  await page.getByLabel('动画进度').focus(); await page.keyboard.press('Home');
  await button('下一幕').click();
  assert.equal(await page.getByLabel('动画进度').inputValue(), '250');
  await page.evaluate(() => { window.originalSlide = document.querySelector('.lbl-slide'); });
  await enter();
  assert.equal(await page.getByLabel('动画进度').inputValue(), '250');
  assert.equal(await page.evaluate(() => window.originalSlide === document.querySelector('.lbl-slide')), true);
  await layout('fullscreen-desktop');
  await button('播放').click(); await page.waitForTimeout(300); await button('暂停').click();
  assert.ok(Number(await page.getByLabel('动画进度').inputValue()) > 250);
  await button('全景').click(); assert.equal(await page.getByLabel('动画进度').inputValue(), '1000');
  await button('重播').click(); await page.waitForTimeout(200); await button('暂停').click();
  await button('下一页').click(); await button('上一页').click();
  assert.equal(await page.getByLabel('动画进度').inputValue(), '0');
  await exit();
  assert.equal(await page.getByLabel('动画进度').inputValue(), '0');
  for (const width of [1280, 900, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await layout(`normal-${width}`); await enter(); await layout(`fullscreen-${width}`); await exit();
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByLabel('选择课件页').selectOption('54');
  await enter(); await layout('lesson-three-fullscreen'); await exit();
  await page.goto(`${origin}/port-lbl-preview.html?page=0`);
  await page.locator('.lbl-stage > .lbl-controls').waitFor();
  assert.equal(await page.locator('.lbl-controls').count(), 1);
  await button('投影').click(); assert.equal(await page.locator('.lbl-controls').count(), 0);
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'browser-report.json'), JSON.stringify({ checks, errors, playback: 'play/pause/replay/step/seek/fullscreen persistence/page entry reset passed', standalone: 'controls present; projection hides controls' }, null, 2));
  console.log(JSON.stringify({ layouts: checks.length, errors, playback: 'passed', standalone: 'passed' }));
} finally { await browser.close(); }
