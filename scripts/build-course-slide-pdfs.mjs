import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile, stat, open, rename, unlink, copyFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { resolve, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freemem, setPriority, constants } from 'node:os';
import { PDF_BUILD_LIMITS as limits, pdfBatches, waitForPdfResources } from './course-pdf/build-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cache = resolve(root, '.runtime/course-pdf-cache');
const artifacts = resolve(cache, 'artifacts');
const wait = ms => new Promise(done => setTimeout(done, ms));
const args = process.argv.slice(2);
const argument = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
const webRoot = resolve(root, argument('--web-root', 'apps/teacher-web/dist'));
const selectedIds = argument('--courses', '').split(',').filter(Boolean);
const pythonCandidates = [process.env.EDU_PDF_PYTHON, 'python', 'python3'].filter(Boolean);
const python = pythonCandidates.find(command => spawnSync(command, ['-c', 'import fitz'], { windowsHide: true, stdio: 'ignore' }).status === 0);
if (!python) throw new Error('PDF build requires Python with PyMuPDF. Install with python -m pip install pymupdf or set EDU_PDF_PYTHON.');
if (args.includes('--help')) {
  console.log('Build static public slide PDFs: node scripts/build-course-slide-pdfs.mjs [--web-root apps/teacher-web/dist] [--courses statistical-analysis,...]\nOne capped worker; cache and restart support are automatic. No renderer runs in the API or user browser.');
  process.exit(0);
}
async function fileDigest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function filesUnder(path) {
  if (!existsSync(path)) return [];
  const files = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    if (item.isDirectory()) files.push(...await filesUnder(resolve(path, item.name)));
    else if (item.isFile()) files.push(resolve(path, item.name));
  }
  return files.sort();
}
async function fingerprint(paths) {
  const hash = createHash('sha256');
  for (const path of [...new Set(paths)].sort()) {
    hash.update(relative(root, path).replaceAll('\\', '/')); hash.update(await fileDigest(path));
  }
  return hash.digest('hex');
}
async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const pending = `${path}.${process.pid}.pending`;
  await writeFile(pending, JSON.stringify(value, null, 2) + '\n'); await rename(pending, path);
}
async function json(path) { return readFile(path, 'utf8').then(JSON.parse).catch(() => null); }
async function describe(path, course, fingerprint) {
  return { url: `/course-exports/${course.courseId}/${fingerprint}/${relative(resolve(artifacts, course.courseId, fingerprint), path).replaceAll('\\', '/')}`,
    bytes: (await stat(path)).size, sha256: await fileDigest(path) };
}
async function validArtifact(item) {
  if (!item || !/^\/course-exports\/[a-z0-9-]+\/[a-f0-9]{64}\/[a-z0-9-]+\.(pdf|zip)$/.test(item.url)) return false;
  const path = resolve(artifacts, item.url.slice('/course-exports/'.length));
  const status = await stat(path).catch(() => null);
  return status?.size === item.bytes && await fileDigest(path) === item.sha256;
}
async function runPython(spec, path) {
  await atomicJson(path, spec);
  await new Promise((done, fail) => {
    const child = spawn(python, [resolve(root, 'scripts/course-pdf/assemble.py'), path], { cwd: root, stdio: 'inherit', windowsHide: true });
    child.once('error', fail); child.once('exit', code => code === 0 ? done() : fail(new Error(`PDF_ASSEMBLY_EXIT:${code}`)));
  });
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(done => { const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); killer.once('error', done); killer.once('exit', done); });
  } else {
    await new Promise(done => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.once('exit', () => { clearTimeout(timer); done(); });
      child.kill('SIGTERM');
    });
  }
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.counter = 0; this.pending = new Map(); this.errors = [];
    this.opened = new Promise((done, fail) => { this.socket.addEventListener('open', done, { once: true }); this.socket.addEventListener('error', fail, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const handler = this.pending.get(message.id); if (!handler) return;
        this.pending.delete(message.id); clearTimeout(handler.timer);
        if (message.error) handler.fail(new Error(`${message.error.code}:${message.error.message}`)); else handler.done(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.text);
    });
    this.socket.addEventListener('close', () => { for (const handler of this.pending.values()) { clearTimeout(handler.timer); handler.fail(new Error('PDF_BROWSER_CLOSED')); } this.pending.clear(); });
  }
  async send(method, params = {}) {
    await this.opened; const id = ++this.counter;
    const promise = new Promise((done, fail) => {
      const timer = setTimeout(() => { this.pending.delete(id); fail(new Error(`PDF_CDP_TIMEOUT:${method}`)); }, limits.renderTimeoutMs);
      this.pending.set(id, { done, fail, timer });
    });
    this.socket.send(JSON.stringify({ id, method, params })); return promise;
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(`PDF_EVALUATE:${result.exceptionDetails.text}`);
    return result.result?.value;
  }
  close() { this.socket.close(); }
}

async function httpReady(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`PDF_BROWSER_EXIT:${child.exitCode}`);
    try { const response = await fetch(url); if (response.ok) return response; } catch { /* Starting. */ }
    await wait(250);
  }
  throw new Error(`PDF_HTTP_TIMEOUT:${url}`);
}
async function poll(cdp, expression) {
  const deadline = Date.now() + limits.renderTimeoutMs;
  while (Date.now() < deadline) {
    const value = await cdp.evaluate(expression); if (value) return value;
    if (cdp.errors.length) throw new Error(`PDF_RENDER_EXCEPTION:${cdp.errors.join(';')}`);
    await wait(150);
  }
  throw new Error('PDF_RENDER_TIMEOUT');
}

function staticServer() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
  return createServer(async (request, response) => {
    try {
      const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const path = resolve(webRoot, '.' + name), rel = relative(webRoot, path);
      if (rel.startsWith('..') || name.includes('\\') || name.includes('\0')) throw new Error('PDF_PATH');
      const status = await stat(path); if (!status.isFile()) throw new Error('PDF_FILE');
      response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Content-Length': status.size });
      const stream = createReadStream(path); stream.on('error', () => response.destroy()); stream.pipe(response);
    } catch { response.writeHead(404); response.end(); }
  });
}
async function browser(baseUrl, runId) {
  const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
  let executable = candidates.filter(Boolean).find(existsSync);
  if (!executable && process.platform !== 'win32') {
    executable = ['chromium', 'chromium-browser', 'google-chrome'].map(name => spawnSync('which', [name], { encoding: 'utf8' }).stdout?.trim()).find(Boolean);
  }
  if (!executable) throw new Error('PDF_BROWSER_MISSING: set CHROME_PATH to Chrome or Edge');
  const profile = resolve(cache, 'work', `browser-${runId}-${Date.now()}`);
  await mkdir(profile, { recursive: true });
  const child = spawn(executable, ['--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run',
    '--no-startup-window', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--no-default-browser-check', '--hide-scrollbars', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=256',
    '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`],
    { cwd: root, stdio: 'ignore', windowsHide: true });
  try {
    const deadline = Date.now() + 30_000; let port;
    while (Date.now() < deadline) {
      const data = await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
      port = Number(data.split('\n')[0]); if (port) break;
      if (child.exitCode !== null) throw new Error(`PDF_BROWSER_EXIT:${child.exitCode}`);
      await wait(150);
    }
    if (!port) throw new Error('PDF_BROWSER_START_TIMEOUT');
    await httpReady(`http://127.0.0.1:${port}/json/version`, child);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    // Windows already caps the entire process tree, including native paint and
    // PDF encoding. Extra JavaScript slowdown adds no protection there.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: process.platform === 'win32' ? 1 : 4 });
    await cdp.send('Page.navigate', { url: `${baseUrl}/course-pdf.html?metadata=1` });
    const metadata = await poll(cdp, 'window.__COURSE_PDF_METADATA__ ?? null');
    return { child, cdp, metadata };
  } catch (error) { await stop(child); throw error; }
}
async function render(worker, baseUrl, course, batch, destination) {
  await waitForPdfResources({ freeMemoryMiB: () => freemem() / 1024 / 1024, wait });
  worker.cdp.errors = [];
  const ready = await worker.cdp.evaluate(`window.__COURSE_PDF_RENDER__(${JSON.stringify({ courseId: course.courseId, start: batch.offset, count: batch.count })})`);
  if (ready.count !== batch.count || ready.errors.length || worker.cdp.errors.length) throw new Error(`PDF_RENDER_FAILED:${course.courseId}:${batch.offset}:${JSON.stringify(ready.errors)}`);
  await freezeCanvasLayers(worker.cdp);
  const printed = await worker.cdp.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: false, generateTaggedPDF: false, transferMode: 'ReturnAsStream', marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  if (!printed.stream) throw new Error('PDF_STREAM_MISSING');
  const pending = destination + '.pending'; const handle = await open(pending, 'w');
  try {
    while (true) {
      const chunk = await worker.cdp.send('IO.read', { handle: printed.stream, size: 262_144 });
      if (chunk.data) await handle.write(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
      if (chunk.eof) break;
    }
  } finally { await handle.close(); await worker.cdp.send('IO.close', { handle: printed.stream }); }
  await rename(pending, destination);
  await worker.cdp.evaluate('window.__COURSE_PDF_CLEAR__(); true');
  await poll(worker.cdp, "document.querySelectorAll('.course-pdf-sheet').length === 0");
  await worker.cdp.send('HeapProfiler.collectGarbage');
  await wait(limits.cooldownMs);
}

/** Chromium cannot reliably print a cleared/offscreen WebGL drawing buffer.
 * Capture only those layers; authored type, equations and diagrams remain vector. */
async function freezeCanvasLayers(cdp) {
  const count = await cdp.evaluate(`(() => {
    const layers = [...new Set([...document.querySelectorAll('canvas')].filter(canvas => {
      const bounds = canvas.getBoundingClientRect(); return bounds.width > 20 && bounds.height > 20 && getComputedStyle(canvas).visibility !== 'hidden';
    }).map(canvas => canvas.closest('.lbl-globe,.lbl-process-scene,.earth-globe') ?? canvas.parentElement))];
    layers.forEach((layer,index) => layer.dataset.pdfRasterLayer = String(index)); return layers.length;
  })()`);
  for (let index = 0; index < count; index++) {
    const info = await cdp.evaluate(`(async () => {
      const layer = document.querySelector('[data-pdf-raster-layer="${index}"]'), sheet = layer.closest('.course-pdf-sheet');
      sheet.scrollIntoView({block:'start'}); await new Promise(resolve => setTimeout(resolve,350));
      const hidden = []; let current = layer;
      while(current !== sheet) {
        for(const sibling of current.parentElement.children) if(sibling !== current && sibling instanceof HTMLElement) {
          hidden.push([sibling,sibling.style.getPropertyValue('opacity'),sibling.style.getPropertyPriority('opacity')]); sibling.style.setProperty('opacity','0','important');
        }
        current = current.parentElement;
      }
      window.__PDF_HIDDEN_LAYERS__ = hidden;
      const box = layer.getBoundingClientRect(), bounds = sheet.getBoundingClientRect();
      const left = Math.max(box.left,bounds.left), top = Math.max(box.top,bounds.top);
      const right = Math.min(box.right,bounds.right), bottom = Math.min(box.bottom,bounds.bottom);
      return {clip:{x:left+scrollX,y:top+scrollY,width:right-left,height:bottom-top,scale:1},left:left-box.left,top:top-box.top};
    })()`);
    if (info.clip.width <= 0 || info.clip.height <= 0) throw new Error('PDF_CANVAS_CLIP');
    let capture;
    try {
      capture = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, clip: info.clip, captureBeyondViewport: true, fromSurface: true });
    } finally {
      await cdp.evaluate(`(() => { for(const [element,value,priority] of window.__PDF_HIDDEN_LAYERS__ ?? []) {
        if(value)element.style.setProperty('opacity',value,priority);else element.style.removeProperty('opacity');
      } delete window.__PDF_HIDDEN_LAYERS__; return true; })()`);
    }
    await cdp.evaluate(`(async () => {
      const layer=document.querySelector('[data-pdf-raster-layer="${index}"]');
      if(getComputedStyle(layer).position==='static')layer.style.position='relative';
      const image=document.createElement('img'); image.src='data:image/jpeg;base64,${capture.data}'; image.alt='';
      Object.assign(image.style,{position:'absolute',left:'${info.left}px',top:'${info.top}px',width:'${info.clip.width}px',height:'${info.clip.height}px',maxWidth:'none',pointerEvents:'none'});
      layer.append(image); await image.decode(); for(const canvas of layer.querySelectorAll('canvas'))canvas.style.visibility='hidden';
      return true;
    })()`);
  }
  if (count) await cdp.evaluate('window.scrollTo(0,0); true');
}

async function main() {
  if (!existsSync(resolve(webRoot, 'course-pdf.html'))) throw new Error('Build the web app first; course-pdf.html is missing.');
  await mkdir(cache, { recursive: true });
  const lockPath = resolve(cache, 'builder.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const old = await json(lockPath); let alive = false;
    if (Number.isInteger(old?.pid)) { try { process.kill(old.pid, 0); alive = true; } catch { /* Dead prior run. */ } }
    if (alive) throw new Error('PDF_BUILD_ALREADY_RUNNING: one builder is allowed.');
    await unlink(lockPath); lock = await open(lockPath, 'wx');
  }
  await lock.writeFile(JSON.stringify({ pid: process.pid }));
  try { setPriority(process.pid, constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* Windows job already applies priority. */ }
  const server = staticServer(); let worker;
  const runId = `${Date.now()}-${process.pid}`;
  try {
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    worker = await browser(baseUrl, runId);
    const courses = [...worker.metadata].sort((a, b) => Number(b.courseId === 'statistical-analysis') - Number(a.courseId === 'statistical-analysis'))
      .filter(course => !selectedIds.length || selectedIds.includes(course.courseId));
    if (!courses.length || selectedIds.some(id => !courses.some(course => course.courseId === id))) throw new Error('PDF_UNKNOWN_COURSE');
    const releaseId = (await json(resolve(webRoot, 'offline-manifest.json')))?.releaseId;
    if (!releaseId) throw new Error('PDF_RELEASE_ID_MISSING');
    const sourceRoots = ['packages/course-content/src', 'apps/teacher-web/src/features/economic-mathematics',
      'apps/teacher-web/src/features/statistical-analysis', 'apps/teacher-web/src/features/management-principles',
      'apps/teacher-web/src/features/international-mathematics', 'apps/teacher-web/src/features/port-lbl',
      'apps/teacher-web/src/features/port-lesson-four', 'apps/teacher-web/src/features/port-lesson-five',
      'apps/teacher-web/src/features/port-lesson-six', 'apps/teacher-web/src/features/port-expansion', 'apps/teacher-web/src/features/globe', 'scripts/course-pdf'];
    const sourceFiles = (await Promise.all(sourceRoots.map(name => filesUnder(resolve(root, name))))).flat().filter(path => /\.(tsx?|css|json|mjs|py)$/.test(path));
    sourceFiles.push(...['apps/teacher-web/src/course-pdf.tsx', 'apps/teacher-web/src/features/course-export/pdf-model.ts',
      'apps/teacher-web/src/features/course-export/pdf-print.css', 'apps/teacher-web/src/features/classroom/TeachingSlides.tsx',
      'apps/teacher-web/src/features/classroom/AuthoredTeachingSlides.tsx', 'apps/teacher-web/src/features/classroom/SlideViewport.tsx',
      'apps/teacher-web/src/features/classroom/classroom.css', 'apps/teacher-web/campus-build.ts', 'scripts/build-course-slide-pdfs.mjs', 'pnpm-lock.yaml'].map(name => resolve(root, name)));
    const sourceHash = await fingerprint(sourceFiles);
    let rendered = 0; const published = [];
    const report = { concurrency: 1, batchPages: limits.batchPages, cooldownMs: limits.cooldownMs, cachedCourses: [], renderedCourses: [] };
    for (const course of courses) {
      const folder = { 'course-port-management-intro': 'port-management', 'course-economic-mathematics': 'economic-mathematics',
        'statistical-analysis': 'statistical-analysis', 'management-principles': 'management-principles', 'course-international-mathematics': 'international-mathematics' }[course.courseId];
      const media = await filesUnder(resolve(webRoot, 'course-assets', folder));
      const mediaHash = await fingerprint(media);
      const digest = createHash('sha256').update(sourceHash).update(mediaHash).update(JSON.stringify(course)).digest('hex');
      const recordPath = resolve(cache, 'records', `${course.courseId}.json`), cached = await json(recordPath);
      let entry;
      if (cached?.fingerprint === digest && cached.versionId === course.versionId) {
        const files = [...cached.chapters.map(chapter => chapter.file), cached.complete, cached.archive];
        let valid = true; for (const item of files) if (!await validArtifact(item)) { valid = false; break; }
        if (valid) { entry = cached; report.cachedCourses.push(course.courseId); console.log(`PDF cache verified: ${course.title} (${entry.slideTotal} pages)`); }
      }
      if (!entry) {
        const destination = resolve(artifacts, course.courseId, digest), partsRoot = resolve(cache, 'work', course.courseId, digest);
        await mkdir(destination, { recursive: true }); await mkdir(partsRoot, { recursive: true });
        const chapterFiles = [], batches = pdfBatches(course.chapters, course.courseId === 'course-port-management-intro' ? 4 : limits.batchPages);
        console.log(`PDF rendering: ${course.title}; ${batches.length} serial batches`);
        for (const chapter of course.chapters) {
          const parts = [];
          for (const batch of batches.filter(item => item.chapter === chapter.number)) {
            const part = resolve(partsRoot, `part-${batch.offset}.pdf`), checkpoint = await json(part + '.json');
            const reusable = checkpoint?.count === batch.count && existsSync(part) && checkpoint.sha256 === await fileDigest(part);
            if (!reusable) {
              if (!worker || rendered && rendered % limits.browserRestartBatches === 0) {
                worker?.cdp.close(); await stop(worker?.child); worker = await browser(baseUrl, runId);
              }
              await render(worker, baseUrl, course, batch, part); rendered++;
              await atomicJson(part + '.json', { count: batch.count, sha256: await fileDigest(part) });
            }
            parts.push(part);
            console.log(`PDF ${course.courseId}: ${batch.offset + batch.count}/${batches.reduce((total, item) => total + item.count, 0)} pages${reusable ? ' (resumed)' : ''}`);
          }
          const filename = `chapter-${String(chapter.number).padStart(2, '0')}.pdf`, path = resolve(destination, filename);
          // Release renderer memory before image compression or PDF assembly.
          worker?.cdp.close(); await stop(worker?.child); worker = undefined;
          await runPython({ operation: 'chapter', parts, output: path, pages: chapter.indices.length, title: `${course.title} - ${chapter.label} - ${chapter.title}` }, resolve(partsRoot, 'assemble.json'));
          chapterFiles.push({ number: chapter.number, label: chapter.label, title: chapter.title, pages: chapter.indices.length, path, filename });
        }
        const completePath = resolve(destination, 'course.pdf'), archivePath = resolve(destination, 'chapters.zip');
        const pages = chapterFiles.reduce((sum, chapter) => sum + chapter.pages, 0);
        await runPython({ operation: 'course', chapters: chapterFiles, output: completePath, archive: archivePath, title: course.title, pages }, resolve(partsRoot, 'assemble.json'));
        if (sourceHash !== await fingerprint(sourceFiles)) throw new Error('PDF_SOURCE_CHANGED: rerun the web build before publishing.');
        entry = { courseId: course.courseId, versionId: course.versionId, title: course.title, fingerprint: digest, slideTotal: pages,
          chapters: [], complete: await describe(completePath, course, digest), archive: await describe(archivePath, course, digest) };
        for (const chapter of chapterFiles) entry.chapters.push({ number: chapter.number, title: chapter.title, label: chapter.label, pages: chapter.pages, file: await describe(chapter.path, course, digest) });
        await atomicJson(recordPath, entry); report.renderedCourses.push(course.courseId);
      }
      published.push(entry);
      // The manifest is an atomic switch to verified files, never to pending render output.
      await atomicJson(resolve(artifacts, 'manifest.json'), { format: 1, releaseId, createdAt: new Date().toISOString(), courses: published });
    }
    const destination = resolve(webRoot, 'course-exports');
    for (const entry of published) for (const item of [...entry.chapters.map(chapter => chapter.file), entry.complete, entry.archive]) {
      const path = item.url.slice('/course-exports/'.length), target = resolve(destination, path);
      await mkdir(dirname(target), { recursive: true }); await copyFile(resolve(artifacts, path), target);
    }
    await atomicJson(resolve(destination, 'manifest.json'), { format: 1, releaseId, createdAt: new Date().toISOString(), courses: published });
    await atomicJson(resolve(cache, 'build-report.json'), report);
    console.log(`PDF exports published: ${published.length} courses, ${published.reduce((total, entry) => total + entry.slideTotal, 0)} slides; downloads perform no rendering.`);
  } finally {
    worker?.cdp.close(); await stop(worker?.child);
    server.closeAllConnections(); await new Promise(done => server.close(done));
    await lock.close(); await unlink(lockPath);
  }
}

// Start only after class initialization; the child uses the same module.
if (process.env.EDU_PDF_BUILD_LIMITED !== '1') {
  const worker = spawn(python, [resolve(root, 'scripts/course-pdf/run_limited.py'), process.execPath,
    '--max-old-space-size=256', fileURLToPath(import.meta.url), ...args], { cwd: root, stdio: 'inherit', windowsHide: true });
  worker.once('error', error => { console.error(error); process.exitCode = 1; });
  worker.once('exit', code => { process.exitCode = code ?? 1; });
} else {
  await main().catch(error => { console.error(error); process.exitCode = 1; });
}
