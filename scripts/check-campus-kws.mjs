import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
execFileSync(process.execPath, ['scripts/setup-local-kws.mjs', '--check'], { cwd: root, stdio: 'inherit' });
for (const name of ['personal-kws-assets.json', 'xiaomai-kws-assets.json']) {
  const manifest = JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
  if (existsSync(resolve(root, 'apps/teacher-web/public/vendor/local-kws', manifest.id))) {
    execFileSync(process.execPath, ['scripts/setup-personal-kws.mjs', '--model', manifest.id, '--check'], { cwd: root, stdio: 'inherit' });
  } else {
    console.log(`Optional KWS model not installed: ${manifest.id}; excluded from this build's selector.`);
  }
}
