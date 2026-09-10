import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve('apps/teacher-web/public/avatar/live2d');
const manifest = JSON.parse(await readFile(resolve(root, 'assets.json'), 'utf8'));
for (const file of manifest.files) {
  const path = resolve(root, file.path);
  assert.ok(path.startsWith(root + (process.platform === 'win32' ? '\\' : '/')));
  const data = await readFile(path);
  assert.equal(data.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, file.path);
}
const model = JSON.parse(await readFile(resolve(root, 'haru/Haru.model3.json'), 'utf8'));
const refs = model.FileReferences;
const names = [refs.Moc, ...refs.Textures, refs.Physics, refs.Pose, refs.DisplayInfo, refs.UserData,
  ...refs.Expressions.map(e => e.File), ...Object.values(refs.Motions).flatMap(group => group.flatMap(m => [m.File, m.Sound].filter(Boolean)))];
for (const name of names) assert.ok((await readFile(resolve(root, 'haru', name))).length, name);
assert.ok(model.Groups.find(group => group.Name === 'LipSync').Ids.includes('ParamMouthOpenY'));
console.log(`Live2D: ${manifest.files.length} checksums and ${names.length} model references verified.`);
