import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const { chromium } = require('playwright');
const base = process.env.PORT_LBL_BASE_URL || 'http://127.0.0.1:5173';
const baseline = process.argv.includes('--baseline');
const output = 'output/globe-repair-qa';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', ...(process.argv.includes('--software') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
// Camera/lifecycle sampling does not require full-resolution rasterization.
// The separate production deck audit captures desktop and narrow layouts at 1x.
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 0.5 });
const errors = [];
const contextLosses = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (/context.*lost|too many active webgl/i.test(message.text())) contextLosses.push(message.text()); });
// Observe the actual Three.js camera at render time. Instrumentation is restricted
// to this browser's Vite response; no diagnostic fields enter the classroom DOM.
await page.route(url => url.pathname === '/src/features/globe/InteractiveEarthGlobe.tsx', async route => {
  const response = await route.fetch();
  let body = await response.text();
  for (const [anchor, replacement] of [
    ['const renderFrame = (now) => {', 'const renderFrame = (now) => { window.__beforeGlobeFrame?.(focusCoordinate, now);'],
    ['if (isVisible) renderer.render(scene, camera);', 'if (isVisible) { renderer.render(scene, camera); window.__recordGlobeFrame?.(runtime, now); }']
  ]) {
    assert.ok(body.includes(anchor), `Missing Vite audit anchor: ${anchor}`);
    body = body.replace(anchor, replacement);
  }
  await route.fulfill({ response, body });
});
await page.addInitScript(() => {
  const canvasIds = new WeakMap();
  let nextId = 0;
  window.__globeSamples = [];
  window.__recordGlobeFrame = (runtime, now) => {
    const canvas = runtime.renderer.domElement;
    if (!canvasIds.has(canvas)) canvasIds.set(canvas, ++nextId);
    const position = runtime.camera.position.toArray();
    const radius = runtime.camera.position.length();
    const finite = [...position, ...runtime.camera.matrixWorld.elements, ...runtime.camera.matrixWorldInverse.elements].every(Number.isFinite);
    window.__globeSamples.push({
      now, canvasId: canvasIds.get(canvas), finite, radius,
      latitude: Math.asin(position[1] / radius) * 180 / Math.PI,
      longitude: Math.atan2(-position[2], position[0]) * 180 / Math.PI,
      vesselProgress: Number(canvas.dataset.vesselProgress),
      cameraTracking: canvas.dataset.cameraTracking === 'true',
      routes: [...new Set(runtime.featuredRouteObjects.filter(object => object.visible).map(object => object.userData.featuredRouteId))]
    });
  };
});
const start = new Date('2026-09-11T00:00:00Z');
await page.clock.install({ time: start });
await page.clock.pauseAt(start);
const report = { baseline, verified: false, sameFrameFocus: {}, dateline: [], routeChanges: [], playback: [], firstLesson: {}, errors, contextLosses };
const samples = () => page.evaluate(() => window.__globeSamples);
const resetSamples = () => page.evaluate(() => { window.__globeSamples = []; });
const summarize = frames => ({ frames: frames.length, invalid: frames.filter(frame => !frame.finite).length, canvases: [...new Set(frames.map(frame => frame.canvasId))], first: frames[0], last: frames.at(-1) });
async function select(index) {
  await page.getByLabel('选择课件页').selectOption(String(index));
  await page.waitForFunction(() => [...document.querySelectorAll('.lbl-globe .earth-globe')].every(globe => globe.classList.contains('earth-globe--ready')));
  await resetSamples();
}
async function seek(progress) {
  await page.getByLabel('动画进度').evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, progress);
  await page.clock.runFor(32);
}
try {
  await page.goto(`${base}/port-lbl-preview.html?page=2`);
  await page.locator('.earth-globe--ready').waitFor();
  // A focus request and its render may have equal timestamps. Exercise that
  // boundary through the real imperative API, before the same frame renders.
  await resetSamples();
  await page.evaluate(() => {
    window.__beforeGlobeFrame = focusCoordinate => {
      window.__beforeGlobeFrame = undefined;
      focusCoordinate({ latitude: 25, longitude: 75 }, 3, 0);
    };
  });
  await page.clock.runFor(32);
  report.sameFrameFocus = summarize(await samples());
  await page.screenshot({ path: `${output}/${baseline ? 'before' : 'after'}-same-frame-focus.png` });
  console.log(JSON.stringify({ sameFrameFocus: report.sameFrameFocus }));
  if (!baseline) {
    assert.equal(report.sameFrameFocus.invalid, 0);
    assert.ok(Math.abs(report.sameFrameFocus.first.longitude - 75) < 1e-8);
    assert.ok(Math.abs(report.sameFrameFocus.first.latitude - 25) < 1e-8);
  }

  await select(70); // Lecture 3, page 19: crosses the date line.
  for (const value of [290, 310, 350, 450, 490, 500, 550]) {
    await seek(value);
    const frame = (await samples()).at(-1);
    const t = Math.min(1, value / 500);
    const expectedLongitude = ((150 + 50 * t * t * (3 - 2 * t) + 540) % 360) - 180;
    const errorDegrees = Math.abs(((frame.longitude - expectedLongitude + 540) % 360) - 180);
    report.dateline.push({ value, actual: frame.longitude, expected: expectedLongitude, errorDegrees });
    if (!baseline) assert.ok(errorDegrees < 1e-8, `Date line camera stalled at ${value}`);
  }
  console.log(JSON.stringify({ dateline: report.dateline }));

  for (const [index, expectedSets] of [[68,3], [71,3], [77,2], [79,4]]) {
    await select(index);
    for (const value of [0, 240, 260, 330, 350, 370, 490, 510, 640, 660, 680, 700, 740, 760, 1000, 0]) await seek(value);
    const frames = await samples();
    const check = { index, ...summarize(frames), routeSets: [...new Set(frames.map(frame => frame.routes.join('|')))] };
    report.routeChanges.push(check);
    console.log(JSON.stringify({ routeChange: check }));
    if (!baseline) {
      assert.equal(check.canvases.length, 1, 'A route change replaced the WebGL canvas');
      assert.equal(check.invalid, 0);
      assert.equal(check.routeSets.length, expectedSets);
    }
  }

  if (!baseline) {
    // Real course components, complete playback including pause/resume/replay.
    for (const index of [2, 52, 70, 88]) {
      await select(index);
      await seek(0);
      await page.getByRole('button', { name: '播放', exact: true }).click();
      await page.clock.runFor(1100);
      await page.getByRole('button', { name: '暂停', exact: true }).click();
      const paused = await page.getByLabel('动画进度').inputValue();
      await page.clock.runFor(320);
      assert.equal(await page.getByLabel('动画进度').inputValue(), paused);
      await page.getByRole('button', { name: '播放', exact: true }).click();
      await page.clock.runFor(index === 2 ? 24500 : 16500);
      assert.equal(await page.getByLabel('动画进度').inputValue(), '1000');
      assert.equal(await page.getByLabel('选择课件页').inputValue(), String(index));
      const check = { index, ...summarize(await samples()), paused, completed: true };
      report.playback.push(check);
      assert.equal(check.invalid, 0);
      assert.equal(check.canvases.length, 1);
      await page.screenshot({ path: `${output}/after-page-${index + 1}.png` });
      await page.getByRole('button', { name: '重播', exact: true }).click();
      await page.clock.runFor(240);
      assert.ok(Number(await page.getByLabel('动画进度').inputValue()) < 20);
      console.log(JSON.stringify({ playback: { index, frames: check.frames, invalid: check.invalid, canvases: check.canvases } }));
    }

    // Mount the first lecture's actual cinematic component with its public cue.
    await select(0);
    await page.evaluate(async () => {
      const [react, client, { ClassroomGlobeStage }, content] = await Promise.all([
        import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
        import('/src/features/classroom/ClassroomGlobeStage.tsx'), import('/@fs/D:/codes/edu-sys/packages/course-content/src/index.ts')
      ]);
      const { createElement } = react.default ?? react;
      const { createRoot } = client.default ?? client;
      const cue = content.getPortManagementGlobeCue('l1-opening-trade-influence');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#06101c';
      document.body.append(host);
      createRoot(host).render(createElement(ClassroomGlobeStage, {
        snapshot: { globePlayback: { cueId: cue.id, runId: 'globe-regression', stepIndex: cue.steps.findIndex(step => step.visual === 'historical-route'), status: 'playing', stepStartedAt: new Date().toISOString(), stepElapsedMs: 0 } },
        role: 'student', lamConnected: false
      }));
    });
    await page.locator('.cinematic-globe .earth-globe--ready').waitFor();
    await resetSamples();
    await page.clock.runFor(4000);
    report.firstLesson = summarize(await samples());
    assert.equal(report.firstLesson.invalid, 0);
    assert.ok(report.firstLesson.last.cameraTracking);
    assert.ok(report.firstLesson.last.vesselProgress > report.firstLesson.first.vesselProgress);
    await page.screenshot({ path: `${output}/first-lesson-regression.png` });
    assert.deepEqual(errors, []);
    assert.deepEqual(contextLosses, []);
    report.verified = true;
  }
} finally {
  await fs.writeFile(`${output}/${baseline ? 'baseline-boundaries' : 'browser-check'}.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ verified: !baseline, frames: report.playback.reduce((sum, item) => sum + item.frames, 0) + (report.firstLesson.frames || 0), errors, contextLosses }));
