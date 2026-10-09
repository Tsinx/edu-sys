/** Independent Chinese prelude. All export traffic stays on loopback. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const assets = path.resolve('apps/teacher-web/public/course-assets/economic-mathematics/prelude');
const output = path.resolve('output/economic-mathematics/prelude-v1');
const cache = path.join(output, 'render'); fs.mkdirSync(cache, { recursive: true });
const mode = process.argv[2], sample = process.argv.includes('--sample');
const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8e6 }); if (r.status !== 0) throw Error(r.stderr || String(r.error)); return r.stdout; };
const duration = sample ? 15 : 90, prefix = sample ? 'sample-' : '', filmName = sample ? 'motion-study-15s.mp4' : 'economic-mathematics-prelude.mp4';
function score() {
  const scope = {}; vm.runInNewContext(fs.readFileSync(path.join(assets, 'film.js'), 'utf8'), scope);
  const film = scope.EconomicPreludeFilm;
  const sr = 48000, seconds = 90, mix = new Float64Array(sr * seconds * 2); let seed = 10082026;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
  function add(start, length, synth, gain, pan = 0) {
    const offset = Math.round(start * sr), count = Math.min(Math.round(length * sr), sr * seconds - offset);
    const left = Math.sqrt((1 - pan) / 2), right = Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < count; i++) { const s = synth(i / sr, i / count) * gain; mix[(i + offset) * 2] += s * left; mix[(i + offset) * 2 + 1] += s * right; }
  }
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  const pluck = f => (t, p) => (Math.sin(2 * Math.PI * f * t) + .23 * Math.sin(4 * Math.PI * f * t) + .08 * Math.sin(6 * Math.PI * f * t)) * Math.min(1, t / .008) * Math.exp(-p * 5);
  const harmony = [[48, 55, 62, 63], [44, 51, 58, 60], [51, 58, 65, 67], [46, 53, 60, 62]];
  for (let bar = 0; bar < 45; bar++) {
    const at = bar * 2, chord = harmony[Math.floor(bar / 4) % 4];
    chord.forEach((midi, i) => add(at, Math.min(4, 90 - at), (t, p) => Math.sin(Math.PI * p) ** 1.8 * (Math.sin(2 * Math.PI * hz(midi) * t) + .3 * Math.sin(2 * Math.PI * hz(midi) * 1.003 * t)), .027, (i - 1.5) / 2));
    const lift = at >= 10 && at < 24 || at >= 38 && at < 52 || at >= 68 && at < 82;
    const breath = at >= 30 && at < 34 || at >= 62 && at < 66 || at >= 82;
    for (let beat = 0; beat < 4; beat++) {
      const time = at + beat * .5;
      if (!breath && (lift || beat % 2 === 0)) add(time, .32, (t, p) => Math.sin(2 * Math.PI * (44 * t + 5.2 * (1 - Math.exp(-t * 35)))) * Math.exp(-p * 7), .32);
      if (lift && beat % 2 === 1) add(time, .15, (t, p) => (.7 * random() + .3 * Math.sin(t * 1180)) * Math.exp(-p * 12) * Math.min(1, t / .003), .13, .1);
      if (!breath) add(time + .25, .06, (t, p) => random() * Math.exp(-p * 12) * Math.min(1, t / .002), lift ? .034 : .015, beat % 2 ? -.45 : .45);
      if (time < 82 && beat % 2 === 0) add(time, .47, pluck(hz(chord[0] - 12)), .16);
      const melody = [0, 2, 1, 3, 2, 0, 3, 1];
      if (time >= 4) {
        const n = chord[melody[(bar * 4 + beat) % 8]] + 12;
        add(time, .76, pluck(hz(n)), breath ? .075 : .044, Math.sin(time * .6) * .6);
        add(time + .375, .7, pluck(hz(n)), .013, -Math.sin(time * .6) * .6);
      }
    }
  }
  for (const mark of [10, 24, 38, 52, 68, 82, 85]) {
    add(mark - .4, .75, (t, p) => random() * Math.sin(Math.PI * p) ** 4 + .3 * Math.sin(2 * Math.PI * (180 * t + 140 * t * t)) * Math.exp(-p * 5), .06, -.1);
    add(mark, 1.3, pluck(hz(mark === 85 ? 72 : 60)), .065, .15);
  }
  for (const mark of film.impactTimes) {
    add(mark - .1, .1, (t, p) => random() * p * p * .5, .1, -.4);
    add(mark, .28, (t, p) => Math.sin(2 * Math.PI * (48 * t + 6 * (1 - Math.exp(-t * 45)))) * Math.exp(-p * 9) + .35 * random() * Math.exp(-p * 34), .42);
    add(mark + .04, .14, (t, p) => Math.sin(2 * Math.PI * 820 * t) * Math.exp(-p * 18), .04, .4);
  }
  let peak = 0, rms = 0;
  for (let i = 0; i < mix.length; i++) { const t = i / 2 / sr; mix[i] = Math.tanh(mix[i] * 1.4) * Math.min(1, t / .03, (90 - t) / 2.5); peak = Math.max(peak, Math.abs(mix[i])); }
  const normalization = .82 / peak, file = Buffer.alloc(44 + mix.length * 2);
  file.write('RIFF'); file.writeUInt32LE(file.length - 8, 4); file.write('WAVEfmt ', 8); file.writeUInt32LE(16, 16); file.writeUInt16LE(1, 20); file.writeUInt16LE(2, 22); file.writeUInt32LE(sr, 24); file.writeUInt32LE(sr * 4, 28); file.writeUInt16LE(4, 32); file.writeUInt16LE(16, 34); file.write('data', 36); file.writeUInt32LE(mix.length * 2, 40);
  for (let i = 0; i < mix.length; i++) { const s = mix[i] * normalization; rms += s * s; file.writeInt16LE(Math.round(s * 32767), 44 + i * 2); }
  fs.writeFileSync(path.join(assets, 'score.wav'), file);
  const sampleFile = Buffer.alloc(44 + 15 * sr * 4); file.copy(sampleFile, 0, 0, 44); sampleFile.writeUInt32LE(sampleFile.length - 8, 4); sampleFile.writeUInt32LE(sampleFile.length - 44, 40);
  for (let frame = 0; frame < 15 * sr; frame++) {
    const sourceFrame = Math.floor(film.prototypeTime(frame / sr) * sr), local = (frame / sr) % 3.75, fade = Math.min(1, local / .005, (3.75 - local) / .005);
    for (let channel = 0; channel < 2; channel++) sampleFile.writeInt16LE(Math.round(file.readInt16LE(44 + sourceFrame * 4 + channel * 2) * fade), 44 + frame * 4 + channel * 2);
  }
  fs.writeFileSync(path.join(assets, 'sample-score.wav'), sampleFile);
  fs.writeFileSync(path.join(output, 'score.json'), JSON.stringify({ durationSeconds: 90, tempoBpm: 120, sampleRate: sr, channels: 2, peakDb: 20 * Math.log10(.82), rmsDb: 20 * Math.log10(Math.sqrt(rms / mix.length)), actionAccentsSeconds: film.impactTimes, sampleAudio: 'Four matching timeline excerpts, with 5ms edge fades.', source: 'Original deterministic additive synthesis and seeded percussion. No samples, voice or external music.', sha256: hash(path.join(assets, 'score.wav')) }, null, 2));
  console.log('Generated original 90-second score.');
}
async function buildAssets() {
  fs.mkdirSync(path.join(assets, 'fonts'), { recursive: true });
  for (const f of ['sans.woff', 'serif.woff', 'OFL.txt']) if (!fs.existsSync(path.join(assets, 'fonts', f))) fs.copyFileSync(path.resolve('apps/teacher-web/public/course-assets/statistical-analysis/fonts', f), path.join(assets, 'fonts', f));
  fs.copyFileSync('apps/teacher-web/node_modules/three/LICENSE', path.join(assets, 'THREE-LICENSE.txt'));
  await build({ entryPoints: [path.join(assets, 'film-source.js')], bundle: true, format: 'iife', globalName: 'EconomicPreludeFilm', outfile: path.join(assets, 'film.js'), minify: true, nodePaths: [path.resolve('apps/teacher-web/node_modules')], legalComments: 'eof' });
  console.log('Built native geometry renderer and local fonts.');
}
function validateFrames() {
  const f = fs.readFileSync(path.join(cache, prefix + 'frames.ivf')); let at = 32, count = 0;
  if (f.toString('ascii', 0, 4) !== 'DKIF' || f.toString('ascii', 8, 12) !== 'VP90' || f.readUInt16LE(12) !== 1920 || f.readUInt16LE(14) !== 1200 || f.readUInt32LE(16) !== 60) throw Error('Unexpected render format.');
  while (at < f.length) { if (at + 12 > f.length || f.readBigUInt64LE(at + 4) !== BigInt(count)) throw Error('Truncated or out-of-order frame.'); at += 12 + f.readUInt32LE(at); count++; }
  if (at !== f.length || count !== duration * 60 || f.readUInt32LE(24) !== count) throw Error('Incorrect frame count.');
  const records = JSON.parse(fs.readFileSync(path.join(cache, prefix + 'audit.json')));
  if (records.length !== count) throw Error('Missing render audit.');
  for (const r of records) for (const b of r.bounds) if (![b.x, b.y, b.width, b.height].every(Number.isFinite) || b.x < 0 || b.y < 0 || b.x + b.width > 1600 || b.y + b.height > 1000) throw Error('Text bounds exceed canvas.');
  let maxCarrierMovement = 0;
  if (!sample) for (let i = 0; i < records.length; i++) {
    const c = records[i].carrier;
    if (!c || c.length !== 3 || !c.every(Number.isFinite) || c[0] < c[2] || c[0] > 1600 - c[2] || c[1] < c[2] || c[1] > 1000 - c[2]) throw Error(`Carrier outside frame ${i}.`);
    if (i) maxCarrierMovement = Math.max(maxCarrierMovement, Math.hypot(c[0] - records[i - 1].carrier[0], c[1] - records[i - 1].carrier[1]));
  }
  if (maxCarrierMovement > 35) throw Error(`Carrier jumps ${maxCarrierMovement} pixels between frames.`);
  return { frames: count, textOverflow: 0, maxCarrierMovementPixelsPerFrame: sample ? null : maxCarrierMovement, shots: [...new Set(records.map(r => r.shot))] };
}
function mux() {
  validateFrames();
  // Bound the delivery bitrate so the 90-second film fits a regular repository asset.
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(cache, prefix + 'frames.ivf'), '-i', path.join(assets, sample ? 'sample-score.wav' : 'score.wav'), '-c:v', 'libx264', '-threads', '4', '-preset', 'slow', '-crf', '19', '-maxrate', '8000k', '-bufsize', '16000k', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart', path.join(assets, filmName)]);
  if (!sample) run('ffmpeg', ['-v', 'error', '-y', '-ss', '87', '-i', path.join(assets, filmName), '-frames:v', '1', path.join(assets, 'poster.png')]);
  console.log(`Muxed ${filmName}`);
}
function verify() {
  const file = path.join(assets, filmName), p = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]));
  const v = p.streams.find(s => s.codec_type === 'video'), a = p.streams.find(s => s.codec_type === 'audio');
  if (v.width !== 1920 || v.height !== 1200 || v.avg_frame_rate !== '60/1' || +v.nb_read_frames !== duration * 60 || +p.format.duration !== duration || v.codec_name !== 'h264' || a.codec_name !== 'aac' || a.channels !== 2) throw Error('Media specification mismatch.');
  run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']);
  const audit = { film: filmName, duration, width: v.width, height: v.height, fps: 60, frames: +v.nb_read_frames, audio: 'AAC stereo 48kHz', fullDecode: 'pass', sha256: hash(file), render: validateFrames(), actualProjectorAndClassroomAcceptance: 'Pending trial teaching.' };
  fs.writeFileSync(path.join(output, prefix + 'media-qa.json'), JSON.stringify(audit, null, 2)); console.log(JSON.stringify(audit));
}
function contact() {
  const times = sample ? [1, 3, 5, 7, 8, 10, 12, 14] : [2, 7, 11, 17, 22, 27, 32, 37, 40, 46, 51, 55, 60, 65, 70, 75, 80, 83, 86, 89];
  run('ffmpeg', ['-v', 'error', '-y', '-i', path.join(assets, filmName), '-vf', `select=${times.map(t => `eq(n\\,${t * 60})`).join('+')},scale=480:300,tile=4x${Math.ceil(times.length / 4)}`, '-frames:v', '1', path.join(output, prefix + 'contact-sheet.png')]);
}
async function serve() {
  const origin = 'http://127.0.0.1:5196';
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.woff': 'font/woff', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.png': 'image/png', '.json': 'application/json', '.pdf': 'application/pdf' };
  http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      // Reuse the platform's own TTS route and avatar files; no keys enter this server.
      if ((url.pathname === '/api/teacher/tts' && req.method === 'POST') || (url.pathname.startsWith('/avatar/') && ['GET', 'HEAD'].includes(req.method))) {
        const upstream = http.request('http://127.0.0.1:5173' + req.url, { method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('请先启动教学平台，或选择本机中文语音。'); });
        req.pipe(upstream); res.on('close', () => upstream.destroy()); return;
      }
      if (url.pathname === '/economic-narration.html') { res.writeHead(302, { Location: 'http://127.0.0.1:5173/economic-narration.html' + url.search }); res.end(); return; }
      if (req.method === 'GET' && url.pathname === '/teacher-print.html') { const file = path.join(output, 'teacher-print.html'); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(file).pipe(res); return; }
      if (req.method === 'POST' && /^\/render\/(sample-)?(frames|audit)$/.test(url.pathname)) {
        if (req.headers.origin !== origin) { res.writeHead(403); res.end(); return; }
        const chunks = []; let bytes = 0; for await (const c of req) { bytes += c.length; if (bytes > 300 * 1024 * 1024) throw Error('Render exceeds 300 MiB'); chunks.push(c); }
        const name = url.pathname.split('/').at(-1); fs.writeFileSync(path.join(cache, name + (name.endsWith('frames') ? '.ivf' : '.json')), Buffer.concat(chunks)); res.writeHead(200); res.end('Saved'); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const file = path.resolve(assets, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(assets + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
      const size = fs.statSync(file).size; let start = 0, end = size - 1, status = 200;
      if (req.headers.range) { const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range); if (!match) { res.writeHead(416); res.end(); return; } start = +match[1]; end = match[2] ? Math.min(+match[2], size - 1) : size - 1; if (start > end) { res.writeHead(416); res.end(); return; } status = 206; }
      res.writeHead(status, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file, { start, end }).pipe(res);
    } catch (e) { if (!res.headersSent) res.writeHead(500); res.end(String(e)); }
  }).listen(5196, '127.0.0.1', () => console.log(origin + '/motion.html?sample=1&export=1'));
}
if (mode === 'build') await buildAssets();
else if (mode === 'score') score();
else if (mode === 'serve') await serve();
else if (mode === 'mux') mux();
else if (mode === 'verify') verify();
else if (mode === 'contact') contact();
else console.log('build | score | serve | mux | verify | contact. --sample selects the 15-second study.');
