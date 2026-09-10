// No real microphone, model, GPU computation, or writes to the user's dataset.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'output/kws-collector-review');
await mkdir(output, { recursive: true });
await mkdir(resolve(root, '.runtime/kws-collector-qa'), { recursive: true });
const data = await mkdtemp(resolve(root, '.runtime/kws-collector-qa/run-'));
const python = process.env.KWS_TEST_PYTHON ?? resolve(root, 'components/openavatarchat/.venv/Scripts/python.exe');
const server = spawn(python, [resolve(root, 'tools/kws-training/serve_collector.py'), '--port', '0', '--data-dir', data], { windowsHide: true });
let logs = '', origin;
server.stdout.on('data', chunk => { logs += chunk; origin = logs.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]; });
server.stderr.on('data', chunk => { logs += chunk; });
const delay = ms => new Promise(done => setTimeout(done, ms));
let browser;
const checks = [], errors = [], externalRequests = [];
try {
  for (let i = 0; i < 100 && !origin; i++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${logs}`);
    await delay(100);
  }
  assert.ok(origin, logs);
  browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1120 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('blob:')) externalRequests.push(request.url()); });
  await page.addInitScript(() => {
    window.micQA = { deny: false, tracks: [], calls: 0 };
    navigator.mediaDevices.getUserMedia = async () => {
      window.micQA.calls++;
      if (window.micQA.deny) throw new DOMException('Test denied', 'NotAllowedError');
      const context = new AudioContext({ sampleRate: 16000 });
      await context.resume();
      const oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination();
      oscillator.frequency.value = 320; gain.gain.value = .08;
      oscillator.connect(gain).connect(destination); oscillator.start();
      for (const track of destination.stream.getTracks()) {
        const original = track.stop.bind(track);
        track.stop = () => { original(); oscillator.stop(); void context.close(); };
        window.micQA.tracks.push(track);
      }
      return destination.stream;
    };
  });
  const saved = async () => (await fetch(`${origin}/api/state`)).json();
  await page.goto(origin);
  await page.locator('#record:not([disabled])').waitFor();
  assert.equal(await page.evaluate(() => window.micQA.calls), 0);
  await page.screenshot({ path: resolve(output, 'desktop-empty.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(output, 'mobile-empty.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1120 });
  checks.push('No microphone on load; desktop and 390px layout');

  await page.evaluate(() => { window.micQA.deny = true; });
  await page.locator('#record').click();
  await page.getByText('麦克风权限未开启。', { exact: false }).waitFor();
  assert.ok(await page.locator('#record').isEnabled());
  await page.evaluate(() => { window.micQA.deny = false; });
  checks.push('Permission rejection recovers without refresh');

  async function take() {
    await page.locator('#record').click();
    await page.locator('#record.recording').waitFor();
    await delay(1600);
    await page.locator('#record').click();
    await page.locator('#draft:not([hidden])').waitFor();
    assert.ok(await page.evaluate(() => window.micQA.tracks.every(track => track.readyState === 'ended')));
    assert.ok(await page.locator('#wake-tab').isDisabled());
  }
  await take();
  await page.screenshot({ path: resolve(output, 'desktop-draft.png'), fullPage: true });
  await page.locator('#discard').click();
  await page.locator('#record.recording').waitFor();
  await delay(1500);
  await page.locator('#record').click();
  await page.locator('#draft:not([hidden])').waitFor();
  assert.equal((await saved()).clips.length, 0);
  checks.push('AudioWorklet PCM take, microphone release, discard/re-record');

  // Commit on server, then lose the response. Retry must not double-count the take.
  let lostResponse = true;
  await page.route('**/api/clips?**', async route => {
    if (lostResponse) { lostResponse = false; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.locator('#save').click();
  await page.getByText('保存未完成：', { exact: false }).waitFor();
  assert.equal((await saved()).clips.length, 1);
  assert.ok(await page.locator('#draft').isVisible());
  await page.locator('#save').click();
  await page.locator('#draft').waitFor({ state: 'hidden' });
  assert.equal((await saved()).clips.length, 1);
  await page.unroute('**/api/clips?**');
  await page.reload();
  await page.locator('.clip').waitFor();
  assert.equal(await page.locator('#wake-count').textContent(), '1 / 20');
  assert.ok(await page.locator('#wake-input').isDisabled());
  checks.push('Lost-response upload retry is idempotent; reload retains files and labels');

  await page.locator('#end-tab').click();
  await take();
  await page.locator('#save').click();
  await page.locator('#draft').waitFor({ state: 'hidden' });
  const two = await saved();
  assert.deepEqual(two.clips.map(c => [c.category, c.text]), [['wake', '你好助手'], ['end', '非常感谢']]);
  await page.getByRole('button', { name: '试听你好助手第 1 条', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.clip audio')?.currentTime > 0);
  const remove = page.getByRole('button', { name: '移除你好助手第 1 条', exact: true });
  await remove.click(); assert.equal((await saved()).clips.length, 2);
  await remove.click();
  await page.waitForFunction(() => document.querySelector('#wake-count').textContent === '0 / 20');
  checks.push('Original categories label correctly; playback works; removal requires two clicks');

  for (const [group, phrase] of [['wake_xiaomai', '小麦老师'], ['end_thanks', '谢谢']]) {
    await page.locator(`#${group}-tab`).click();
    assert.equal(await page.locator('#prompt').textContent(), phrase);
    await take();
    await page.locator('#save').click();
    await page.locator('#draft').waitFor({ state: 'hidden' });
    const state = await saved(), clip = state.clips.find(c => c.category === group);
    assert.equal(clip.text, phrase);
    assert.match(clip.file, new RegExp(`^audio/${group}/[a-f0-9]{32}\\.wav$`));
    assert.equal(await page.locator(`#${group}-count`).textContent(), '1 / 20');
    assert.ok(await page.locator(`#${group}-input`).isDisabled());
    await page.getByRole('button', { name: `试听${phrase}第 1 条`, exact: true }).click();
    await page.waitForFunction(id => document.querySelector(`[data-clip-id="${id}"] audio`)?.currentTime > 0, clip.id);
  }
  await page.reload();
  await page.locator('.clip').first().waitFor();
  assert.equal(await page.locator('#wake_xiaomai-count').textContent(), '1 / 20');
  assert.equal(await page.locator('#end_thanks-count').textContent(), '1 / 20');
  checks.push('Xiaomai and short thanks: real AudioWorklet takes, independent labels, locked settings, playback and reload');

  // Fill a test-only dataset to exercise completion and export.
  const fixture = Buffer.from(await (await fetch(`${origin}/api/audio/${two.clips[1].id}`)).arrayBuffer());
  assert.equal(fixture.readUInt32LE(24), 16000);
  assert.equal(fixture.readUInt16LE(22), 1);
  assert.equal(fixture.readUInt16LE(34), 16);
  async function fill(group, target = 20) {
    const current = await saved();
    for (let n = current.clips.filter(c => c.category === group).length; n < target; n++) {
      const response = await fetch(`${origin}/api/clips?${new URLSearchParams({ category: group, phrase: current.phrases[group] })}`, {
        method: 'POST', headers: { 'X-Collector-Token': current.token, 'X-Clip-Id': crypto.randomUUID().replaceAll('-', ''), 'Content-Type': 'audio/wav' }, body: fixture,
      });
      assert.equal(response.status, 201);
    }
  }
  await fill('wake');
  await fill('end');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#prompt').textContent === '小麦老师');
  assert.equal(await page.locator('#total-count').textContent(), '42 / 80');
  await page.locator('#end-tab').click();
  assert.equal(await page.locator('#next-group').textContent(), '录制“小麦老师” →');
  await page.locator('#next-group').click();
  assert.equal(await page.locator('#prompt').textContent(), '小麦老师');
  await page.screenshot({ path: resolve(output, 'desktop-new-groups.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(output, 'mobile-new-groups.png'), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 1120 });
  await fill('wake_xiaomai');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#prompt').textContent === '谢谢');
  await page.locator('#end-tab').click();
  assert.equal(await page.locator('#next-group').textContent(), '录制“谢谢” →');
  await page.locator('#next-group').click();
  await fill('end_thanks', 19);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#end_thanks-count').textContent === '19 / 20');
  await take();
  await page.locator('#save').click();
  await page.getByText('80 条已全部保存！', { exact: false }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.clip').length === 80);
  assert.equal(await page.locator('#overall-progress').evaluate(el => el.style.width), '100%');
  assert.equal(await page.locator('#total-count').textContent(), '80 / 80');
  checks.push('Completed old groups remain available; continuation skips completed groups and reaches 80 / 80');
  assert.ok(await page.locator('#group-done').isVisible());
  assert.ok(await page.locator('#record').isHidden());
  assert.ok(await page.locator('#next-group').isHidden());
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadEvent;
  await download.saveAs(resolve(output, 'test-recordings.zip'));
  const zip = await readFile(resolve(output, 'test-recordings.zip'));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.ok(zip.length > 10000);
  await page.screenshot({ path: resolve(output, 'desktop-complete.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  checks.push('Four groups of 20: completion state, valid WAV headers, ZIP download, populated mobile layout');
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  checks.push('No page errors or external requests');
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ checks, errors, externalRequests, testDataPath: data, formalDatasetTouched: false }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, output }, null, 2));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
    await writeFile(resolve(output, 'failure.json'), JSON.stringify({ error: error.message, checks, errors, text: await page.locator('body').innerText() }, null, 2));
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
  await writeFile(resolve(output, 'test-server.log'), logs);
}
