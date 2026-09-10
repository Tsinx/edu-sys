#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants, createWriteStream } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "..");
const exportAppRoot = resolve(repositoryRoot, "scripts/economic-mathematics-pdf");
const temporaryRoot = resolve(repositoryRoot, "tmp/pdfs/economic-mathematics");
const outputRoot = resolve(repositoryRoot, "output/pdf");
const fullCourseSlideCount = 1460;
const lessonSlideCounts = [
  44, 47, 45, 45, 47, 46, 47, 44, 46, 43, 46,
  44, 45, 47, 45, 47, 43, 44, 46, 45, 47, 46,
  45, 46, 47, 47, 45, 47, 46, 47, 47, 44
];
const unitLessonGroups = [
  [1, 2],
  [3, 4, 5, 6],
  [7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16],
  [17, 18, 19, 20],
  [21, 22, 23, 24, 25],
  [26, 27, 28, 29],
  [30, 31, 32]
];

function parseArguments(argv) {
  const result = {
    lessons: Array.from({ length: 32 }, (_, index) => index + 1),
    output: resolve(outputRoot, "economic-mathematics-complete-slides-2026.pdf"),
    chrome: null,
    keepParts: false,
    pageRanges: null,
    batch: "unit",
    resumeDir: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--lessons") {
      result.lessons = parseLessonSelection(argv[++index]);
    } else if (argument === "--output") {
      const requested = argv[++index];
      if (!requested) throw new Error("--output requires a path");
      result.output = isAbsolute(requested)
        ? resolve(requested)
        : resolve(repositoryRoot, requested);
    } else if (argument === "--chrome") {
      result.chrome = argv[++index] ? resolve(argv[index]) : null;
    } else if (argument === "--keep-parts") {
      result.keepParts = true;
    } else if (argument === "--page-ranges") {
      result.pageRanges = parsePageRanges(argv[++index]);
    } else if (argument === "--batch") {
      const mode = argv[++index];
      if (mode !== "unit" && mode !== "lesson") {
        throw new Error("--batch must be unit or lesson");
      }
      result.batch = mode;
    } else if (argument === "--resume-dir") {
      const requested = argv[++index];
      if (!requested) throw new Error("--resume-dir requires a path");
      result.resumeDir = isAbsolute(requested)
        ? resolve(requested)
        : resolve(repositoryRoot, requested);
    } else if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  assertWithinRepositoryOutput(result.output);
  if (result.pageRanges && result.lessons.length !== 1) {
    throw new Error("--page-ranges can only be used with one selected lesson");
  }
  if (result.pageRanges && result.resumeDir) {
    throw new Error("--page-ranges cannot be combined with --resume-dir");
  }
  if (result.resumeDir) assertWithinTemporaryRoot(result.resumeDir, false);
  return result;
}

function printHelp() {
  console.log(`Usage: node scripts/export-economic-mathematics-pdf.mjs [options]\n\nOptions:\n  --lessons 1,2,5-8  Export selected lessons (default: 1-32)\n  --batch unit|lesson Group prints by teaching unit (default: unit)\n  --resume-dir PATH   Reuse verified batch PDFs from a prior failed run\n  --page-ranges 1-3  Print selected pages of one lesson (sample/QA only)\n  --output PATH       Final PDF path under output/pdf or tmp/pdfs\n  --chrome PATH       Chrome or Edge executable\n  --keep-parts        Retain per-batch PDFs in tmp/pdfs\n  -h, --help          Show this help`);
}

function parsePageRanges(raw) {
  if (!raw || !/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(raw)) {
    throw new Error("--page-ranges must look like 1-3 or 1,3,5-7");
  }
  const pages = new Set();
  for (const token of raw.split(",")) {
    const [startRaw, endRaw = startRaw] = token.split("-");
    const start = Number(startRaw);
    const end = Number(endRaw);
    if (start < 1 || end < start) throw new Error(`Invalid page range: ${token}`);
    for (let page = start; page <= end; page += 1) pages.add(page);
  }
  return { source: raw, count: pages.size, maximum: Math.max(...pages) };
}

function parseLessonSelection(raw) {
  if (!raw) throw new Error("--lessons requires a value");
  const selected = new Set();
  for (const token of raw.split(",")) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(token.trim());
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start > end) throw new Error(`Invalid lesson range: ${token}`);
      for (let lesson = start; lesson <= end; lesson += 1) selected.add(lesson);
      continue;
    }
    if (!/^\d+$/.test(token.trim())) throw new Error(`Invalid lesson: ${token}`);
    selected.add(Number(token));
  }
  const lessons = [...selected].sort((a, b) => a - b);
  if (lessons.length === 0 || lessons.some((lesson) => lesson < 1 || lesson > 32)) {
    throw new Error("Lessons must be in the range 1-32");
  }
  return lessons;
}

function buildLessonBatches(lessons, mode) {
  if (mode === "lesson") return lessons.map((lesson) => [lesson]);
  const selected = new Set(lessons);
  return unitLessonGroups
    .map((group) => group.filter((lesson) => selected.has(lesson)))
    .filter((group) => group.length > 0);
}

function getLessonSlideCount(lesson) {
  const count = lessonSlideCounts[lesson - 1];
  if (!count) throw new Error(`Missing page count for lesson ${lesson}`);
  return count;
}

function assertWithinRepositoryOutput(path) {
  const allowedRoots = [outputRoot, resolve(repositoryRoot, "tmp/pdfs")];
  if (!allowedRoots.some((root) => {
    const location = relative(root, path);
    return location !== "" && !location.startsWith("..") && !isAbsolute(location);
  })) {
    throw new Error(`Output must be below output/pdf or tmp/pdfs: ${path}`);
  }
}

function assertWithinTemporaryRoot(path, allowRoot = true) {
  const location = relative(temporaryRoot, path);
  if ((!allowRoot && location === "") || location.startsWith("..") || isAbsolute(location)) {
    throw new Error(`Unsafe temporary path: ${path}`);
  }
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findExecutable(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Continue to the next known installation path.
    }
  }
  return null;
}

async function getFreePort() {
  return await new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        rejectPort(new Error("Unable to allocate local port"));
        return;
      }
      const port = address.port;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function waitForHttp(url, timeoutMilliseconds, processHandle) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError = null;
  while (Date.now() < deadline) {
    if (processHandle?.exitCode !== null) {
      throw new Error(`Process exited before ${url} became available (${processHandle.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`);
}

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  let stderr = "";
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });
  child.collectedStderr = () => stderr;
  return child;
}

async function terminateProcess(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolveTermination) => {
      const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      killer.once("error", () => resolveTermination());
      killer.once("exit", () => resolveTermination());
    });
    return;
  }
  child.kill();
  const deadline = Date.now() + 5000;
  while (child.exitCode === null && Date.now() < deadline) await wait(100);
  if (child.exitCode === null) child.kill("SIGKILL");
}

class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.opened = new Promise((resolveOpened, rejectOpened) => {
      this.socket.addEventListener("open", resolveOpened, { once: true });
      this.socket.addEventListener("error", rejectOpened, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    }
  }

  async send(method, params = {}) {
    await this.opened;
    const id = this.nextId++;
    const result = new Promise((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return await result;
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
    return () => {
      const current = this.listeners.get(method) ?? [];
      this.listeners.set(method, current.filter((candidate) => candidate !== listener));
    };
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function waitForExportReady(client, lessons, expectedSlides) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const readiness = await evaluate(
      client,
      "window.__ECON_PDF_READY__ ?? null"
    );
    if (readiness?.ready) {
      const readyLessons = readiness.sections?.map((section) => section.lesson) ?? [];
      if (
        JSON.stringify(readyLessons) !== JSON.stringify(lessons) ||
        readiness.slideCount !== expectedSlides
      ) {
        throw new Error(`Batch ${lessons.join(",")} readiness mismatch: ${JSON.stringify(readiness)}`);
      }
      if (readiness.imageFailures?.length) {
        throw new Error(`Batch ${lessons.join(",")} image failures: ${readiness.imageFailures.join(", ")}`);
      }
      return readiness;
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for batch ${lessons.join(",")}`);
}

async function writeCdpPdfStream(client, streamHandle, destination) {
  const output = createWriteStream(destination, { flags: "wx" });
  try {
    let done = false;
    while (!done) {
      const chunk = await client.send("IO.read", {
        handle: streamHandle,
        size: 1024 * 1024
      });
      const buffer = chunk.base64Encoded
        ? Buffer.from(chunk.data, "base64")
        : Buffer.from(chunk.data, "utf8");
      if (buffer.length > 0 && !output.write(buffer)) await once(output, "drain");
      done = Boolean(chunk.eof);
    }
    output.end();
    await once(output, "finish");
  } catch (error) {
    output.destroy();
    throw error;
  } finally {
    await client.send("IO.close", { handle: streamHandle }).catch(() => undefined);
  }
}

async function printBatch(client, baseUrl, lessons, partPath, expectedSlides, pageRanges) {
  const runtimeErrors = [];
  const errorListener = (params) => runtimeErrors.push(params.exceptionDetails?.text ?? "Runtime exception");
  const removeErrorListener = client.on("Runtime.exceptionThrown", errorListener);

  try {
    await evaluate(client, "window.__ECON_PDF_READY__ = undefined");
    await client.send("Page.navigate", {
      url: `${baseUrl}/?lessons=${lessons.join(",")}`
    });
    const readiness = await waitForExportReady(client, lessons, expectedSlides);
    await client.send("Emulation.setEmulatedMedia", {
      media: "print",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    const layout = await evaluate(client, `(() => {
      const sheets = [...document.querySelectorAll('.econmath-pdf-sheet')];
      const slides = [...document.querySelectorAll('.econmath-pdf-sheet > article')];
      const overflowSheets = sheets.map((sheet) => ({
        index: sheet.dataset.exportIndex,
        scrollWidth: sheet.scrollWidth,
        scrollHeight: sheet.scrollHeight,
        clientWidth: sheet.clientWidth,
        clientHeight: sheet.clientHeight
      })).filter((sheet) => sheet.scrollWidth > 1600 || sheet.scrollHeight > 1000);
      const wideNodes = [...document.querySelectorAll('.econmath-pdf-sheet > article *')]
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            slide: node.closest('.econmath-pdf-sheet')?.dataset.exportIndex,
            tag: node.tagName,
            className: typeof node.className === 'string' ? node.className : node.getAttribute('class'),
            width: Math.round(rect.width * 100) / 100,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth
          };
        })
        .filter((node) => node.width > 1600 || node.scrollWidth > 1600)
        .sort((a, b) => Math.max(b.width, b.scrollWidth) - Math.max(a.width, a.scrollWidth))
        .slice(0, 20);
      return ({
      sheets: sheets.length,
      slides: slides.length,
      wrongWidth: slides.filter((node) => node.getBoundingClientRect().width !== 1600).length,
      wrongHeight: slides.filter((node) => node.getBoundingClientRect().height !== 1000).length,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      deckScrollWidth: document.querySelector('.econmath-pdf-deck')?.scrollWidth ?? 0,
      overflowSheets,
      wideNodes,
      firstSlide: slides[0] ? (() => {
        const node = slides[0];
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          rectWidth: rect.width,
          rectHeight: rect.height,
          offsetWidth: node.offsetWidth,
          offsetHeight: node.offsetHeight,
          computedWidth: style.width,
          computedHeight: style.height,
          zoom: style.zoom,
          transform: style.transform
        };
      })() : null,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        visualScale: window.visualViewport?.scale ?? null
      },
      katexErrors: document.querySelectorAll('.katex-error').length
      });
    })()`);
    if (
      layout.sheets !== expectedSlides ||
      layout.slides !== expectedSlides ||
      layout.wrongWidth !== 0 ||
      layout.wrongHeight !== 0 ||
      layout.documentScrollWidth !== 1600 ||
      layout.bodyScrollWidth !== 1600 ||
      layout.deckScrollWidth !== 1600 ||
      layout.overflowSheets.length !== 0 ||
      layout.katexErrors !== 0 ||
      runtimeErrors.length > 0
    ) {
      throw new Error(`Batch ${lessons.join(",")} render audit failed: ${JSON.stringify({ layout, runtimeErrors })}`);
    }
    if (process.env.ECON_PDF_LAYOUT_DEBUG === "1") {
      console.log(`Batch ${lessons.join(",")} layout: ${JSON.stringify(layout)}`);
    }

    const printed = await client.send("Page.printToPDF", {
      displayHeaderFooter: false,
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      generateDocumentOutline: false,
      generateTaggedPDF: false,
      transferMode: "ReturnAsStream",
      ...(pageRanges ? { pageRanges: pageRanges.source } : {})
    });
    if (!printed.stream) throw new Error("Chromium did not return a PDF stream handle");
    await writeCdpPdfStream(client, printed.stream, partPath);
    return readiness;
  } finally {
    removeErrorListener();
  }
}

async function loadBatchMetadata(client, baseUrl, lessons, expectedSlides) {
  await evaluate(client, "window.__ECON_PDF_READY__ = undefined");
  await client.send("Page.navigate", {
    url: `${baseUrl}/?lessons=${lessons.join(",")}&metadata=1`
  });
  return await waitForExportReady(client, lessons, expectedSlides);
}

async function runProcess(command, args) {
  return await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else rejectRun(new Error(`${basename(command)} exited ${code}: ${stderr || stdout}`));
    });
  });
}

async function findPythonRuntime() {
  const python = await findExecutable([
    process.env.CODEX_PYTHON_PATH,
    "C:\\Users\\Administrator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe",
    "python.exe"
  ]);
  if (!python) throw new Error("A Python runtime with pypdf is required to inspect and finalize PDFs");
  return python;
}

async function findPyMuPdfRuntime() {
  const candidates = [
    process.env.PYMUPDF_PYTHON_PATH,
    "C:\\Python313\\python.exe"
  ];
  for (const candidate of candidates) {
    const python = await findExecutable([candidate]);
    if (!python) continue;
    try {
      await runProcess(python, ["-c", "import fitz"]);
      return python;
    } catch {
      // Try the next explicitly configured Python runtime.
    }
  }
  throw new Error("A Python runtime with PyMuPDF is required to compress the final PDF");
}

async function getPdfPageCount(python, path) {
  const inspected = await runProcess(python, [
    "-c",
    "import sys; from pypdf import PdfReader; print(len(PdfReader(sys.argv[1]).pages))",
    path
  ]);
  const count = Number(inspected.stdout.trim());
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Unable to read PDF page count for ${path}: ${inspected.stdout}`);
  }
  return count;
}

async function finalizePdf(
  parts,
  bookmarks,
  metadata,
  destination,
  partDirectory,
  python,
  pymupdfPython
) {
  await mkdir(dirname(destination), { recursive: true });
  const manifestPath = resolve(partDirectory, "manifest.json");
  assertWithinTemporaryRoot(manifestPath);
  await writeFile(
    manifestPath,
    JSON.stringify({ parts, bookmarks, metadata }, null, 2),
    "utf8"
  );
  const finalizer = resolve(exportAppRoot, "finalize_pdf.py");
  const finalized = await runProcess(
    python,
    [finalizer, manifestPath, destination, pymupdfPython]
  );
  console.log(finalized.stdout.trim());
}

function formatLessonScope(lessons) {
  const first = lessons[0];
  const last = lessons.at(-1);
  const consecutive = lessons.every(
    (lesson, index) => lesson === first + index
  );
  if (lessons.length === 1) return `第${first}讲`;
  if (consecutive) return `第${first}—${last}讲`;
  return `第${lessons.join("、")}讲`;
}

function buildPdfMetadata(lessons, renderedSlides, pageRanges) {
  const isFullCourse = !pageRanges
    && lessons.length === 32
    && lessons.every((lesson, index) => lesson === index + 1);
  if (isFullCourse) {
    return {
      title: "经济数学：完整课程教学 Slides（2026）",
      subject: "重庆交通大学商科本科一年级基础课 · 64学时 · 32讲"
    };
  }
  const scope = `${formatLessonScope(lessons)}${pageRanges ? "选页" : ""}`;
  return {
    title: `经济数学：${scope}教学 Slides（2026）`,
    subject: `重庆交通大学商科本科一年级基础课 · ${scope} · ${renderedSlides}页`
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const runId = `${Date.now()}-${process.pid}`;
  const partDirectory = options.resumeDir ?? resolve(temporaryRoot, `parts-${runId}`);
  const chromeProfile = resolve(temporaryRoot, `chrome-${runId}`);
  assertWithinTemporaryRoot(partDirectory);
  assertWithinTemporaryRoot(chromeProfile);
  if (options.resumeDir) {
    const resumeStatus = await stat(partDirectory).catch(() => null);
    if (!resumeStatus?.isDirectory()) {
      throw new Error(`Resume directory does not exist: ${partDirectory}`);
    }
    console.log(`Resuming from verified PDF parts: ${partDirectory}`);
  } else {
    await mkdir(partDirectory, { recursive: true });
  }
  await mkdir(chromeProfile, { recursive: true });
  const python = await findPythonRuntime();
  const pymupdfPython = await findPyMuPdfRuntime();

  const chrome = await findExecutable([
    options.chrome,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ]);
  if (!chrome) throw new Error("Chrome or Edge executable was not found");

  const viteModule = await findExecutable([
    process.env.VITE_MODULE_PATH,
    resolve(repositoryRoot, "apps/teacher-web/node_modules/vite/bin/vite.js")
  ]);
  if (!viteModule) throw new Error("The teacher-web Vite runtime was not found");

  const serverPort = await getFreePort();
  const cdpPort = await getFreePort();
  const viteConfig = resolve(exportAppRoot, "vite.config.mjs");
  const vite = spawnLogged(process.execPath, [
    viteModule,
    "--config",
    viteConfig,
    "--host",
    "127.0.0.1",
    "--port",
    String(serverPort),
    "--strictPort"
  ]);

  let browser = null;
  let client = null;
  try {
    const baseUrl = `http://127.0.0.1:${serverPort}`;
    await waitForHttp(baseUrl, 30000, vite);
    browser = spawnLogged(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${chromeProfile}`,
      "about:blank"
    ]);
    const versionResponse = await waitForHttp(
      `http://127.0.0.1:${cdpPort}/json/version`,
      30000,
      browser
    );
    const version = await versionResponse.json();
    console.log(`PDF browser: ${version.Browser}`);

    const targetResponse = await fetch(
      `http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" }
    );
    if (!targetResponse.ok) throw new Error(`Unable to create CDP target: ${targetResponse.status}`);
    const target = await targetResponse.json();
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const parts = [];
    const bookmarks = [];
    let renderedSlides = 0;
    const batches = buildLessonBatches(options.lessons, options.batch);
    for (const [batchIndex, lessons] of batches.entries()) {
      const label = `${String(lessons[0]).padStart(2, "0")}-${String(lessons.at(-1)).padStart(2, "0")}`;
      const partPath = resolve(partDirectory, `batch-${String(batchIndex + 1).padStart(2, "0")}-lessons-${label}.pdf`);
      const expectedSlides = lessons.reduce(
        (total, lesson) => total + getLessonSlideCount(lesson),
        0
      );
      if (options.pageRanges && options.pageRanges.maximum > expectedSlides) {
        throw new Error(`Page range exceeds lesson ${lessons[0]} total (${expectedSlides})`);
      }
      let readiness;
      let reused = false;
      if (options.resumeDir && await pathExists(partPath)) {
        const actualPages = await getPdfPageCount(python, partPath);
        if (actualPages !== expectedSlides) {
          throw new Error(
            `Resume batch ${label} page count mismatch: expected ${expectedSlides}, found ${actualPages}`
          );
        }
        readiness = await loadBatchMetadata(
          client,
          baseUrl,
          lessons,
          expectedSlides
        );
        reused = true;
        console.log(`Reused batch ${label}: ${actualPages} verified PDF pages`);
      } else {
        readiness = await printBatch(
          client,
          baseUrl,
          lessons,
          partPath,
          expectedSlides,
          options.pageRanges
        );
      }
      const printedPages = options.pageRanges?.count ?? readiness.slideCount;
      parts.push({
        label,
        path: partPath,
        expectedPages: printedPages
      });
      let sectionOffset = 0;
      for (const section of readiness.sections) {
        bookmarks.push({
          lesson: section.lesson,
          title: section.lessonTitle,
          page: renderedSlides + sectionOffset
        });
        sectionOffset += options.pageRanges?.count ?? section.slideCount;
      }
      renderedSlides += printedPages;
      if (!reused) {
        console.log(`Rendered batch ${label}: ${printedPages} PDF pages (${readiness.firstSlide}-${readiness.lastSlide})`);
      }
    }

    await finalizePdf(
      parts,
      bookmarks,
      buildPdfMetadata(options.lessons, renderedSlides, options.pageRanges),
      options.output,
      partDirectory,
      python,
      pymupdfPython
    );
    if (options.lessons.length === 32 && renderedSlides !== fullCourseSlideCount) {
      throw new Error(`Full export page count mismatch before verification: ${renderedSlides}`);
    }
    console.log(`PDF written: ${options.output}`);
    console.log(`Expected pages: ${renderedSlides}`);
  } finally {
    client?.close();
    await terminateProcess(browser);
    await terminateProcess(vite);
    if (!options.keepParts && !options.resumeDir) {
      await rm(partDirectory, { recursive: true, force: true });
    } else {
      console.log(`Retained PDF parts: ${partDirectory}`);
    }
    await rm(chromeProfile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
