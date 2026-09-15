import { readFile, writeFile } from 'node:fs/promises';

// qingzhi.svg is authoritative. Keep the review page self-contained for file:// use.
const svg = await readFile(new URL('./qingzhi.svg', import.meta.url), 'utf8');
const pageUrl = new URL('./index.html', import.meta.url);
const page = await readFile(pageUrl, 'utf8');
const start = '<!-- CHARACTER_SVG_START -->';
const end = '<!-- CHARACTER_SVG_END -->';
if (!page.includes(start) || !page.includes(end)) throw new Error('SVG insertion markers are missing.');
let next = page.slice(0, page.indexOf(start) + start.length) + '\n' + svg + '\n            ' + page.slice(page.indexOf(end));
for (const [marker, file] of [['MOTION', 'motion.js'], ['AUDIO_LIPS', 'audio-lips.js'], ['AUDIO_FIXTURE', 'audio-fixture.js'], ['PREVIEW', 'preview.js'], ['AUDIO_PREVIEW', 'audio-preview.js']]) {
  const first = `<!-- ${marker}_SCRIPT_START -->`;
  const last = `<!-- ${marker}_SCRIPT_END -->`;
  if (!next.includes(first) || !next.includes(last)) throw new Error(`${marker} script markers are missing.`);
  const script = await readFile(new URL('./' + file, import.meta.url), 'utf8');
  if (/<\/script/i.test(script)) throw new Error('Inline script contains a closing script tag.');
  next = next.slice(0, next.indexOf(first) + first.length) + '\n  <script>\n' + script + '\n  </script>\n  ' + next.slice(next.indexOf(last));
}
await writeFile(pageUrl, next, 'utf8');
console.log('Self-contained review page synchronized with SVG, controllers and audio fixture.');
