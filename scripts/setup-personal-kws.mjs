import { createHash } from 'node:crypto';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifests = { 'personal-20260909': './personal-kws-assets.json', 'xiaomai-20260909-epoch10': './xiaomai-kws-assets.json' };
const modelIndex = process.argv.indexOf('--model');
const model = modelIndex < 0 ? 'personal-20260909' : process.argv[modelIndex + 1];
if (!Object.hasOwn(manifests, model)) throw new Error(`Unknown personal KWS model: ${model}`);
const manifest = JSON.parse(await readFile(new URL(manifests[model], import.meta.url), 'utf8'));
const destination = join(root, 'apps/teacher-web/public/vendor/local-kws', manifest.id);
const sourceIndex = process.argv.indexOf('--source');
if (sourceIndex >= 0 && (!process.argv[sourceIndex + 1] || process.argv[sourceIndex + 1].startsWith('--'))) throw new Error('--source requires a model directory');
const source = resolve(root, sourceIndex < 0 ? manifest.sourceDirectory : process.argv[sourceIndex + 1]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function verify(directory) {
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (hash(await readFile(join(directory, name))) !== expected) throw new Error(`Personal KWS checksum mismatch: ${name}`);
  }
}

if (process.argv.includes('--check')) {
  try { await verify(destination); }
  catch (cause) { throw new Error(`个人唤醒模型 ${model} 缺失或校验失败，请运行 pnpm kws:${model === 'personal-20260909' ? 'personal' : 'xiaomai'}:setup；也可用 --source 指定已导出的 FP32 模型目录。`, { cause }); }
} else {
  // Validate every source file before replacing any installed assets.
  await verify(source);
  await mkdir(destination, { recursive: true });
  for (const name of Object.keys(manifest.files)) await copyFile(join(source, name), join(destination, name));
  await verify(destination);
}
console.log(`Personal KWS assets verified: ${manifest.id}`);
