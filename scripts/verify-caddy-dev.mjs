import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(process.env.EDU_PLAYWRIGHT_ENTRY || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const { chromium } = require('playwright');
const origin = 'https://localhost';
const output = resolve('output/caddy-dev-qa');
const probeName = `.caddy-hmr-probe-${Date.now()}.js`;
const probePath = resolve('apps/teacher-web/src', probeName);
const probeSource = value => `window.__caddyHmrProbe = ${JSON.stringify(value)}; if (import.meta.hot) import.meta.hot.accept();\n`;
const checks = [], errors = [], failed = [], sockets = [];
let browser, probeCreated = false;
await mkdir(output, { recursive: true });
try {
  // Deliberately use the browser's trust store, with no certificate bypass.
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push(`${request.url()} ${request.failure()?.errorText}`);
  });
  page.on('websocket', socket => {
    const url = new URL(socket.url());
    const record = { url: url.origin + url.pathname, connected: false, updated: false };
    sockets.push(record);
    socket.on('framereceived', ({ payload }) => {
      try {
        const data = JSON.parse(payload.toString());
        if (data.type === 'connected') record.connected = true;
        if (data.type === 'update') record.updated = true;
      } catch { /* Ignore non-JSON ping frames. */ }
    });
  });
  const redirect = await context.request.get('http://localhost/?caddy-check=1', { maxRedirects: 0 });
  assert.equal(redirect.status(), 308);
  assert.equal(redirect.headers().location, 'https://localhost/?caddy-check=1');
  checks.push('HTTP redirects to HTTPS and preserves the query');
  const response = await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
  assert.equal(response.status(), 200);
  assert.ok(await response.securityDetails());
  const security = await page.evaluate(() => ({
    origin: location.origin, secure: isSecureContext, microphone: Boolean(navigator.mediaDevices?.getUserMedia)
  }));
  assert.equal(security.secure, true);
  assert.equal(security.microphone, true);
  checks.push('Browser trusts HTTPS; secure context and microphone API are available');
  await page.waitForFunction(() => document.querySelector('nav') && !document.body.textContent.includes('正在打开教学平台'), undefined, { timeout: 90000 });
  const config = await page.evaluate(async () => {
    const health = await fetch('/api/health').then(r => r.json());
    const runtime = await fetch('/api/runtime/config').then(r => r.json());
    return { health, runtime };
  });
  assert.equal(config.health.service, 'edu-platform-api');
  assert.equal(config.runtime.profile, 'development');
  checks.push('Real API responds through Caddy in development mode');
  const stream = await page.evaluate(async () => {
    const sessions = await fetch('/api/class-sessions').then(r => r.json());
    if (!sessions.length) return { skipped: 'No existing classroom session is available.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const started = performance.now();
    try {
      const result = await fetch(`/api/class-sessions/${sessions[0].id}/snapshot/stream`, { signal: controller.signal });
      const reader = result.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (!text.includes('\n\n')) {
        const chunk = await reader.read();
        if (chunk.done) break;
        text += decoder.decode(chunk.value, { stream: true });
      }
      await reader.cancel();
      return { status: result.status, contentType: result.headers.get('content-type'), snapshot: text.includes('event: snapshot'), elapsedMs: Math.round(performance.now() - started) };
    } finally { clearTimeout(timer); controller.abort(); }
  });
  if (!stream.skipped) {
    assert.equal(stream.status, 200);
    assert.match(stream.contentType, /text\/event-stream/);
    assert.equal(stream.snapshot, true);
    assert.ok(stream.elapsedMs < 10000);
    checks.push('A real classroom SSE snapshot arrives before the stream closes');
  }
  // Exercise Vite's actual file watcher and module replacement through Caddy.
  await writeFile(probePath, probeSource('before'), { flag: 'wx' });
  probeCreated = true;
  await page.evaluate(async name => { await import(`/src/${name}`); }, probeName);
  await page.waitForFunction(() => window.__caddyHmrProbe === 'before');
  await writeFile(probePath, probeSource('after'));
  await page.waitForFunction(() => window.__caddyHmrProbe === 'after');
  assert.ok(sockets.some(socket => socket.url.startsWith('wss://localhost/') && socket.connected && socket.updated));
  assert.ok(!sockets.some(socket => socket.url.includes(':5173')));
  checks.push('Editing a module triggers HMR over wss://localhost without a direct-port fallback');
  await page.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  const report = { checkedAt: new Date().toISOString(), origin, checks, security, stream, sockets, errors, failed };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  if (probeCreated) await unlink(probePath).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
