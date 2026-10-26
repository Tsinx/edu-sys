import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(root, 'apps/platform-api/output/port-enterprise-production-' + Date.now());
await mkdir(destination, { recursive: false });
const dependencies = JSON.parse(await readFile(join(root, 'apps/platform-api/package.json'), 'utf8')).dependencies;
await build({
  absWorkingDir: root, entryPoints: { 'enterprise-production.test': 'apps/platform-api/test/enterprise.test.ts', 'enterprise-submission-worker': 'apps/platform-api/src/enterprise-submission-worker.ts' },
  outdir: destination, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', target: 'node24',
  external: Object.keys(dependencies).filter(name => !name.startsWith('@edu/')), logLevel: 'warning',
});
const code = await new Promise((done, fail) => {
  const child = spawn(process.execPath, ['--test', join(destination, 'enterprise-production.test.mjs')], { cwd: root, stdio: 'inherit', windowsHide: true });
  child.on('error', fail); child.on('exit', done);
});
if (code !== 0) process.exit(Number(code) || 1);
console.log('Bundled production API and independent worker passed without tsx.');
