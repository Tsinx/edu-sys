// Unmodified classroom worker, real WASM KWS + VAD, isolated loopback model routing.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
const output = resolve(process.argv[2] ?? 'output/kws-xiaomai-training-20260909');
const auditStartedAt = new Date().toISOString();
const selectedModels = (process.env.EDU_KWS_MODELS ?? 'original,previous_personal,candidate').split(',');
if (!selectedModels.length || selectedModels.some(n => !['original', 'previous_personal', 'candidate'].includes(n))) throw new Error('Unknown model selection');
const selectedSplit = process.env.EDU_KWS_SPLIT ?? 'all';
if (!['all', 'validation', 'test'].includes(selectedSplit)) throw new Error('Unknown split');
const reportPath = resolve(output, process.env.EDU_KWS_REPORT ?? 'browser-audit.json');
const candidateRoot = resolve(process.env.EDU_KWS_CANDIDATE_ROOT ?? resolve(output, 'model'));
const publicRoot = resolve('apps/teacher-web/public');
const runtime = resolve(publicRoot, 'vendor/local-kws');
const runtimeFiles = new Set(['sherpa-onnx-kws.js', 'sherpa-onnx-vad.js', 'sherpa-onnx-wasm-web.js', 'sherpa-onnx-wasm-web.wasm', 'silero_vad.onnx']);
const modelFiles = new Set(['encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt']);
const fixtureFiles = new Map();
const servedModelHashes = {};
// Freeze the actual runtime code for the whole comparison; model files vary.
const runtimeSnapshots = new Map(await Promise.all([
  ...[...runtimeFiles].map(n => ['/vendor/local-kws/' + n, resolve(runtime, n)]),
  ...['classroom-keywords.js', 'classroom-ending.js'].map(n => ['/audio/' + n, resolve(publicRoot, 'audio', n)])
].map(async ([url, path]) => [url, await readFile(path)])));
let currentModel = 'original';
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<title>小麦候选模型检验</title>'); return; }
    if (runtimeSnapshots.has(pathname)) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
      res.end(runtimeSnapshots.get(pathname)); return;
    }
    let path;
    if (fixtureFiles.has(pathname)) path = fixtureFiles.get(pathname);
    else if (['/audio/classroom-keywords.js', '/audio/classroom-ending.js'].includes(pathname)) path = resolve(publicRoot, pathname.slice(1));
    else if (pathname.startsWith('/vendor/local-kws/')) {
      const name = pathname.split('/').at(-1);
      if (runtimeFiles.has(name)) path = resolve(runtime, name);
      else if (modelFiles.has(name)) {
        path = currentModel === 'candidate' ? resolve(candidateRoot, name)
          : resolve(runtime, pathname.includes('/personal-20260909/') ? 'personal-20260909' : '.', name);
      }
    }
    if (!path) { res.writeHead(404); res.end(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
    const contents = await readFile(path);
    if (pathname.startsWith('/vendor/local-kws/') && modelFiles.has(pathname.split('/').at(-1))) {
      servedModelHashes[currentModel] ??= {};
      servedModelHashes[currentModel][pathname] = createHash('sha256').update(contents).digest('hex');
    }
    res.end(contents);
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
const fixtureRoot = resolve(process.env.EDU_KWS_FIXTURES ?? resolve(output, 'browser-fixtures'));
const fixtureManifest = await readFile(resolve(fixtureRoot, 'cases.json'));
const sourceCases = JSON.parse(fixtureManifest.toString('utf8')).filter(c => selectedSplit === 'all' || c.split === selectedSplit || c.split === 'regression');
for (const c of sourceCases) {
  if (createHash('sha256').update(await readFile(resolve(fixtureRoot, c.file))).digest('hex') !== c.sha256) throw new Error('Fixture changed: ' + c.file);
}
const inputs = sourceCases.map((c, i) => { const url = '/fixture/' + i + '.wav'; fixtureFiles.set(url, resolve(fixtureRoot, c.file)); return { ...c, url }; });
const ttsNames = ['wakeXiaomai', 'wakeXiaomaiStrong', 'wakeXiaomaiShort', 'shortThanks', 'thanksContinue', 'thanksEveryone', 'thanksNegative', 'xiaomaiRepeat', 'continueSpeaking', 'cancel', 'negative', 'wake', 'finish', 'wakeLittleAssistant'];
const tts = Object.fromEntries(ttsNames.map(n => { const url = '/tts/' + n + '.wav'; fixtureFiles.set(url, resolve('.runtime/kws', n + '.wav')); return [n, url]; }));
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const errors = [], report = {};
page.on('pageerror', e => errors.push(String(e)));
await page.exposeFunction('kwsProgress', row => console.log(JSON.stringify(row)));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const name of selectedModels) {
    currentModel = name;
    const rows = await page.evaluate(async ({ inputs, tts, name }) => {
      const decoder = new OfflineAudioContext(1, 16000, 16000);
      const decode = async url => { const response = await fetch(url); if (!response.ok) throw new Error('Fixture fetch: ' + url); return (await decoder.decodeAudioData(await response.arrayBuffer())).getChannelData(0); };
      const speech = Object.fromEntries(await Promise.all(Object.entries(tts).map(async ([n, url]) => [n, await decode(url)])));
      const silence = seconds => new Float32Array(Math.round(seconds * 16000));
      function join(...arrays) { const result = new Float32Array(arrays.reduce((n, a) => n + a.length, 0)); let offset = 0; for (const a of arrays) { result.set(a, offset); offset += a.length; } return result; }
      const cases = [];
      for (const c of inputs) {
        const audio = await decode(c.url), { url, ...meta } = c;
        if (c.expectedKind) cases.push({ ...meta, audio, collecting: c.expectedKind === 'finish', expected: { wake: c.expectedKind === 'wake' ? 1 : 0, finish: c.expectedKind === 'finish' ? 1 : 0, cancel: 0 } });
        else for (const collecting of [false, true]) cases.push({ ...meta, audio, collecting, expected: { wake: 0, finish: 0, cancel: 0 }, provisional: c.kind === 'public_speech_probe' });
      }
      const behavior = [
        { id: 'name wakes', audio: speech.wakeXiaomai, wake: 1, finish: 0 },
        { id: 'name with explicit ending', audio: speech.wakeXiaomaiStrong, wake: 1, finish: 1, phrase: 'finish-thanks' },
        { id: 'name with short thanks', audio: speech.wakeXiaomaiShort, wake: 1, finish: 1, phrase: 'finish-short-thanks' },
        { id: 'thanks before wake ignored', audio: speech.shortThanks, wake: 0, finish: 0 },
        { id: 'thanks then continued speech', collecting: true, audio: speech.thanksContinue, wake: 0, finish: 0 },
        { id: 'thanks everyone then continued speech', collecting: true, audio: speech.thanksEveryone, wake: 0, finish: 0 },
        { id: 'thanks everyone at end of classroom speech', audio: join(speech.wakeXiaomai, silence(.65), speech.thanksNegative), wake: 1, finish: 0 },
        { id: 'ordinary speech keeps recording', collecting: true, audio: speech.negative, wake: 0, finish: 0 },
        { id: 'repeated name remains same recording', audio: join(speech.wakeXiaomai, silence(.3), speech.xiaomaiRepeat, silence(.3), speech.shortThanks), wake: 1, finish: 1, phrase: 'finish-short-thanks' },
        { id: 'resumption cancels pending', collecting: true, audio: speech.shortThanks, inject: 'continueSpeaking', wake: 0, finish: 0, pending: true },
        { id: 'cancel discards pending', collecting: true, audio: speech.shortThanks, inject: 'cancel', wake: 0, finish: 0, cancel: 1, pending: true },
        { id: 'old alias wakes', audio: speech.wake, wake: 1, finish: 0 },
        { id: 'old finish alias', collecting: true, audio: speech.finish, wake: 0, finish: 1 },
        { id: 'old small assistant alias', audio: speech.wakeLittleAssistant, wake: 1, finish: 0 },
      ];
      cases.push(...behavior.map(c => ({ ...c, kind: 'synthetic_behavior_regression', split: 'regression', variant: 'clean',
        expected: { wake: c.wake, finish: c.finish, cancel: c.cancel ?? 0, phrase: c.phrase, pending: c.pending ?? false } })));
      const worker = new Worker('/audio/classroom-keywords.js?model=' + (name === 'previous_personal' ? 'personal-20260909' : 'original'));
      function message() { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Worker timeout')), 60000); worker.onerror = e => { clearTimeout(timer); reject(new Error(e.message)); }; worker.onmessage = e => { clearTimeout(timer); e.data.type === 'error' ? reject(new Error(e.data.message)) : resolve(e.data); }; }); }
      const rows = [];
      try {
        const ready = await message(); if (ready.type !== 'ready') throw new Error(JSON.stringify(ready));
        let generation = 0;
        for (const c of cases) {
          worker.postMessage({ type: 'reset', generation: ++generation });
          if (c.collecting) worker.postMessage({ mode: 'collecting', generation });
          let audio = join(silence(1), c.audio, silence(3)), pending = false, injected = false;
          const hits = [], transitions = [], start = performance.now();
          for (let offset = 0; offset < audio.length; offset += 2048) {
            const samples = audio.slice(offset, offset + 2048), reply = message();
            worker.postMessage({ samples, generation }, [samples.buffer]);
            const frame = await reply; hits.push(...frame.keywords);
            if (pending !== frame.endingPending) { pending = frame.endingPending; transitions.push({ at: (offset + 2048) / 16000, pending }); }
            if (c.inject && pending && !injected) { injected = true; audio = join(audio.slice(0, offset + 2048), silence(.15), speech[c.inject], silence(3)); }
          }
          const correct = ['wake', 'finish', 'cancel'].every(kind => hits.filter(h => h.kind === kind).length === c.expected[kind])
            && (!c.expected.phrase || hits.find(h => h.kind === 'finish')?.phrase === c.expected.phrase) && (!c.expected.pending || injected);
          const { audio: unused, ...meta } = c;
          const row = { ...meta, hits, transitions, injected, correct, inferenceMs: Math.round(performance.now() - start) };
          rows.push(row);
          if (!correct || rows.length % 20 === 0) await window.kwsProgress({ model: name, completed: rows.length, id: c.id, correct, hits });
        }
      } finally { worker.terminate(); }
      return rows;
    }, { inputs, tts, name });
    const summary = {};
    for (const split of ['validation', 'test']) {
      summary[split] = {};
      for (const variant of ['clean', 'original', 'mild_stress']) {
        const selected = rows.filter(r => r.kind === 'personal' && r.split === split && r.variant === variant);
        summary[split][variant] = { correct: selected.filter(r => r.correct).length, total: selected.length,
          byCategory: Object.fromEntries(['wake', 'end', 'wake_xiaomai', 'end_thanks'].map(c => [c, selected.filter(r => r.expectedCategory === c && r.correct).length])) };
      }
    }
    for (const kind of ['synthetic_behavior_regression', 'synthetic_noise', 'public_speech_probe']) {
      const selected = rows.filter(r => r.kind === kind);
      summary[kind] = { correct: selected.filter(r => r.correct).length, total: selected.length, mismatches: selected.filter(r => !r.correct).map(r => r.id) };
    }
    report[name] = { summary, rows };
    console.log('BROWSER_SUMMARY', name, JSON.stringify(summary));
    await writeFile(reportPath, JSON.stringify(report, null, 2));
  }
  report.provenance = { errors, startedAt: auditStartedAt, completedAt: new Date().toISOString(),
    workerUnmodified: true, runtimeSnapshotted: true, selectedSplit, selectedModels, servedModelHashes,
    fixtureManifestSha256: createHash('sha256').update(fixtureManifest).digest('hex'),
    candidateRouting: 'all keyword graphs use candidate weights; VAD unchanged',
    previousRouting: 'deployed hybrid: long commands personal; short thanks/cancel general',
    workerSha256: createHash('sha256').update(runtimeSnapshots.get('/audio/classroom-keywords.js')).digest('hex'),
    endingSha256: createHash('sha256').update(runtimeSnapshots.get('/audio/classroom-ending.js')).digest('hex'),
    runtimeSha256: Object.fromEntries([...runtimeSnapshots].map(([url, bytes]) => [url, createHash('sha256').update(bytes).digest('hex')])),
    ttsSha256: Object.fromEntries(await Promise.all(ttsNames.map(async n => [n, createHash('sha256').update(await readFile(resolve('.runtime/kws', n + '.wav'))).digest('hex')]))),
    caveats: ['Synthetic regression fixtures are not newly recorded classroom speech.', 'Public speech expectations are provisional without transcript review.', 'Personal variants share source recordings.'] };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); await new Promise(done => server.close(done)); }
