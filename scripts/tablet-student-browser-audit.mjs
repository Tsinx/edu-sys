import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.TABLET_QA_URL ?? 'http://127.0.0.1:5173', api = process.env.TABLET_QA_API ?? 'http://127.0.0.1:4317';
const out = 'output/tablet-qa'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const checks = [], errors = []; let session, teacher, p;
try {
  teacher = await browser.newContext();
  assert.equal((await teacher.request.post(api + '/api/identity/development/session', { data: { role: 'teacher' } })).status(), 201);
  const result = await teacher.request.post(api + '/api/courses/course-port-management-intro/class-sessions'); assert.ok(result.ok()); session = await result.json();
  await teacher.request.post(api + `/api/class-sessions/${session.id}/events`, { data: { type: 'set_slide', index: 154 } });
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await context.route('**/api/**', route => { const url = new URL(route.request().url()); return route.continue({ url: api + url.pathname + url.search }); });
  assert.equal((await context.request.post(api + '/api/identity/development/session', { data: { role: 'student' } })).status(), 201);
  await context.addInitScript(() => localStorage.setItem('edu-avatar-renderer-v1', 'video'));
  p = await context.newPage(); p.setDefaultTimeout(60000); p.on('pageerror', e => errors.push(e.message));
  const check = async name => {
    const s = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      broken: [...document.images].filter(i => i.getBoundingClientRect().width && i.complete && !i.naturalWidth).map(i => i.src) }));
    assert.ok(s.scroll <= s.width + 1, JSON.stringify(s)); assert.deepEqual(s.broken, []);
    await p.screenshot({ path: `${out}/student-${name}.png`, scale: 'css' }); checks.push(name); console.log('PASS', name);
  };
  for (const [width, height] of [[820,1180],[1180,820],[768,1024]]) {
    await p.setViewportSize({ width, height }); await p.goto(base); await p.locator('.student-home').waitFor(); await check(`home-${width}`);
    await p.goto(`${base}/join/${session.id}`); await p.locator('.student-learning').waitFor();
    await p.getByRole('button', { name: '下一页', exact: true }).tap(); await p.locator('[data-following=false]').waitFor();
    await p.getByRole('button', { name: '一键跟上教师', exact: true }).tap(); await p.locator('[data-following=true]').waitFor();
    await p.getByRole('button', { name: '目录', exact: true }).tap(); await p.locator('.student-directory').waitFor(); await check(`directory-${width}`);
    await p.getByRole('button', { name: '关闭目录', exact: true }).tap(); await check(`classroom-${width}`);
    assert.equal(await p.locator('.slide-logical-canvas').evaluate(e => /data-(teaching-cue|assistant-cue|story-beat|voyage-stage|open-question)/.test(e.outerHTML)), false);
    await p.goto(base + '/study/course-port-management-intro'); await p.locator('.study-page').waitFor();
    await p.locator('.study-deck__toolbar select').selectOption('4'); await check(`study-${width}`);
    await p.getByRole('link', { name: '仿真系统', exact: true }).tap(); await p.locator('.port-ops').waitFor();
    const skip = p.getByRole('button', { name: '跳过，直接练习', exact: true }); await skip.waitFor(); await skip.tap(); await skip.waitFor({ state: 'hidden' });
    await p.locator('[data-renderer=ready]').waitFor();
    await p.getByRole('button', { name: '办理选中对象', exact: true }).tap(); await check(`simulation-${width}`);
    await p.getByRole('link', { name: '← 返回课件', exact: true }).tap(); await p.locator('.study-page').waitFor();
    assert.equal(await p.locator('.study-deck__toolbar select').inputValue(), '4');
  }
  assert.deepEqual(errors, []); await fs.writeFile(`${out}/student-report.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  await p?.screenshot({ path: `${out}/student-failure.png`, scale: 'css' }).catch(() => {});
  await fs.writeFile(`${out}/student-report.json`, JSON.stringify({ passed: false, checks, errors, error: String(error) }, null, 2)); throw error;
} finally {
  if (session) await teacher.request.post(api + `/api/class-sessions/${session.id}/end`).catch(() => {});
  await browser.close();
}
