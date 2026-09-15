import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const directory = resolve(process.argv[2]);
const report = JSON.parse(await readFile(resolve(directory, 'quality-report.json'), 'utf8'));
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const errors = [], requests = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('file:')) requests.push(r.url()); });
  await page.goto(pathToFileURL(resolve(directory, 'index.html')).href);
  assert.equal(await page.locator('.clip').count(), report.clips.length);
  await page.screenshot({ path: resolve(directory, 'review-desktop.png'), fullPage: false });
  await page.locator('[data-filter=review]').click();
  assert.equal(await page.locator('.clip').count(), report.reviewNames.length);
  const checkedGroups = [];
  for (const [category, phrase] of Object.entries(report.phrases)) {
    await page.locator(`[data-filter="${category}"]`).click();
    const count = report.clips.filter(clip => clip.category === category).length;
    assert.equal(await page.locator('.clip').count(), count);
    assert.ok((await page.locator('.clip h2').allTextContents()).every(text => text === phrase));
    if (count) {
      await page.locator('audio').first().evaluate(audio => audio.play());
      await page.waitForFunction(() => document.querySelector('audio').currentTime > .05);
      await page.locator('audio').nth(1).evaluate(audio => audio.play());
      await page.waitForFunction(() => document.querySelectorAll('audio')[1].currentTime > .05);
      assert.ok(await page.locator('audio').first().evaluate(audio => audio.paused));
      await page.locator('audio').nth(1).evaluate(audio => audio.pause());
    }
    checkedGroups.push({ category, phrase, count, playbackChecked: count > 0 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(directory, 'review-mobile.png'), fullPage: false });
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  const result = { ok: true, checks: [`${report.clips.length} cards`, `${report.reviewNames.length} flagged filter matches`, 'all category filters and labels', 'local original/processed audio playback', 'only one player at a time', '390px no overflow', 'no external requests or JS errors'], checkedGroups, errors, requests };
  await writeFile(resolve(directory, 'browser-check.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
