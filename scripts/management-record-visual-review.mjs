// Record completed manual review. This command does not replace visual review.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

assert.ok(process.argv.includes('--confirm-all-pages-reviewed'), 'View all source pages, adopted images and desktop/narrow screenshots before recording review.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const sha = async p => createHash('sha256').update(await fs.readFile(path.join(root, p))).digest('hex');
const evidence = async p => ({ path: p, sha256: await sha(p) });
const write = async (p, value) => fs.writeFile(path.join(root, p), JSON.stringify(value, null, 2) + '\n');
const qa = 'output/management-principles/qa';
const map = await read('docs/management/source-map.json');
const updates = await read('docs/management/updates.json');
const runtime = await read(`${qa}/runtime/audit.json`);
const demos = await read(`${qa}/demos/audit.json`);
const images = await read('docs/management/image-manifest.json');
assert.equal(map.length, 367);
assert.equal(updates.length, 299);
assert.equal(runtime.canvases.length, 1468);
assert.deepEqual(runtime.errors, []);
assert.equal(demos.checked, 124);
assert.deepEqual(demos.errors, []);
assert.deepEqual(demos.failures, []);
assert.equal(images.length, 110);
assert.ok(images.every(x => x.review.status === 'passed'));
const reviewedAt = new Date().toISOString();
const sheets = await Promise.all(Array.from({ length: 92 }, (_, i) => evidence(`${qa}/web-sheets/${String(i + 1).padStart(3, '0')}.jpg`)));
const pages = [];
for (const m of map) {
  const states = runtime.canvases.filter(x => x.key === m.slideKey);
  assert.equal(new Set(states.map(x => `${x.role}/${x.viewport}`)).size, 4);
  assert.ok(states.every(x => x.visible && !x.leaks && !x.outside.length && !x.overlap.length && !x.broken.length));
  pages.push({ index: m.index, slideKey: m.slideKey, documentId: m.documentId,
    originalPage: m.originalPage, splitIndex: m.splitIndex, status: 'passed',
    desktop: await evidence(`${qa}/runtime/1600-${String(m.index).padStart(3, '0')}.png`),
    narrow: await evidence(`${qa}/runtime/390-${String(m.index).padStart(3, '0')}.png`),
    contactSheet: sheets[Math.floor((m.index - 1) / 4)].path });
}
const sourcePages = [];
for (const u of updates) {
  assert.ok(u.slideKeys.every(key => pages.some(p => p.slideKey === key)));
  sourcePages.push({ documentId: u.documentId, page: u.page, status: 'passed',
    render: await evidence(`output/management-principles/source/renders/${u.documentId}/${String(u.page).padStart(3, '0')}.png`), slideKeys: u.slideKeys });
  u.webReview = 'passed';
  u.webReviewedAt = reviewedAt;
  u.webReviewEvidence = 'docs/management/visual-review.json';
}
await write('docs/management/updates.json', updates);
await write('docs/management/visual-review.json', {
  reviewedAt, reviewer: 'Codex', status: 'passed',
  method: '逐页查看299张原稿渲染；逐张检查110张生成图片；通过92张双视口联系表逐页审阅367页的734张最终运行截图，另查看演示和私有对照代表截图。结合教师与学生双视口1468次画布检查。',
  scope: { sourcePages: 299, webPages: 367, screenshots: 734, contactSheets: 92, generatedImages: 110, runtimeCanvases: 1468, demoChecks: 124 },
  logicalCanvas: [1600, 1000], viewports: [1600, 390],
  content: await evidence('packages/course-content/src/management-principles/pages.json'),
  runtime: await evidence(`${qa}/runtime/audit.json`), demos: await evidence(`${qa}/demos/audit.json`),
  images: await evidence('docs/management/image-manifest.json'),
  sourceManifest: await evidence('output/management-principles/source/manifest.json'),
  updates: await evidence('docs/management/updates.json'),
  observations: [
    '保留固定16:10画布并等比缩放；窄屏为同步观看布局，纵向留黑不属于内容缺失。',
    '未发现文字裁切、重叠、图片缺失、图片拉伸或教师制作备注进入学生画布。',
    '原稿历史财务表不能勾稽的数字保留并标注；计算复核详见calculation-audit.json。',
    '本记录只对应上述哈希和截图；重新编译或修改页面后必须重新审阅。',
  ], sheets, pages, sourcePages,
});
console.log(JSON.stringify({ status: 'passed', sourcePages: sourcePages.length, pages: pages.length, screenshots: pages.length * 2, sheets: sheets.length, reviewedAt }));
