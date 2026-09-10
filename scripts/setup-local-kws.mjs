import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./local-kws-assets.json', import.meta.url), 'utf8'));
const output = join(root, 'apps/teacher-web/public/vendor/local-kws');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function verify() {
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (hash(await readFile(join(output, name))) !== expected) throw new Error(`KWS checksum mismatch: ${name}`);
  }
}
if (process.argv.includes('--check')) {
  try { await verify(); console.log('Local KWS assets verified.'); }
  catch { throw new Error('本地唤醒模型缺失或校验失败，请先在项目根目录运行 pnpm kws:setup。'); }
} else {
  try { await verify(); console.log('Local KWS assets already installed and verified.'); process.exit(0); } catch {}
  await mkdir(join(root, '.runtime/kws'), { recursive: true });
  const staging = await mkdtemp(join(root, '.runtime/kws/setup-'));
  for (const [name, archive] of Object.entries(manifest.archives)) {
    const response = await fetch(archive.url, { signal: AbortSignal.timeout(600_000) });
    if (!response.ok) throw new Error(`Download failed: ${name} HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== archive.sha256) throw new Error(`Archive checksum mismatch: ${name}`);
    const path = join(staging, name + (name === 'runtime' ? '.tar.gz' : '.tar.bz2'));
    await writeFile(path, bytes);
    execFileSync('tar', ['-xf', path, '-C', staging]);
  }
  await mkdir(output, { recursive: true });
  const sources = {
    'sherpa-onnx-wasm-web.js': 'assets/sherpa-onnx-wasm-web.js',
    'sherpa-onnx-wasm-web.wasm': 'assets/sherpa-onnx-wasm-web.wasm',
    'sherpa-onnx-kws.js': 'assets/sherpa-onnx-kws.js', LICENSE: 'LICENSE',
    'sherpa-onnx-vad.js': 'assets/sherpa-onnx-vad.js',
    'encoder.onnx': `${manifest.model}/encoder-epoch-12-avg-2-chunk-16-left-64.onnx`,
    'decoder.onnx': `${manifest.model}/decoder-epoch-12-avg-2-chunk-16-left-64.onnx`,
    'joiner.onnx': `${manifest.model}/joiner-epoch-12-avg-2-chunk-16-left-64.onnx`,
    'tokens.txt': `${manifest.model}/tokens.txt`
  };
  for (const [name, source] of Object.entries(sources)) {
    let bytes = await readFile(resolve(staging, source));
    // Both upstream wrappers define freeConfig globally. Scope VAD's helpers so
    // loading it cannot replace KWS's allocator cleanup (or vice versa).
    if (name === 'sherpa-onnx-vad.js') bytes = Buffer.from(`(function () {\n${bytes}\nself.createVad = createVad;\n})();\n`);
    if (hash(bytes) !== manifest.files[name]) throw new Error(`Asset checksum mismatch: ${name}`);
    await writeFile(join(output, name), bytes);
  }
  for (const [name, asset] of Object.entries(manifest.downloads ?? {})) {
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Download failed: ${name} HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== manifest.files[name]) throw new Error(`Asset checksum mismatch: ${name}`);
    await writeFile(join(output, name), bytes);
  }
  await verify();
  console.log('Local KWS installed. Models run in a browser worker; no cloud connection is needed for keyword detection.');
}
