import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getCourseDeckByCourseId, getCoursePresentation } from '@edu/course-content/deck-registry';
import { economicModels, ECONOMIC_MATHEMATICS_SLIDES, economicVisibleCopy } from '@edu/course-content/economic-mathematics';

const root = fileURLToPath(new URL('../public/course-assets/economic-mathematics/prelude/', import.meta.url));
type Page = { id: string; title: string; reveals?: string[]; conclusion?: string; special?: boolean };
type PublicData = { version: string; pages: Page[]; units: { hours: number }[]; publicContext: (i: number, step: number) => string; restore: (s: string) => null | { index: number; steps: number[]; filmTime: number } };
const module = { exports: {} as PublicData };
vm.runInNewContext(fs.readFileSync(path.join(root, 'course-data.js'), 'utf8'), { module });
const data = module.exports;
test('the registered first lesson matches authored public pages and protects hidden conclusions', () => {
  const pages = ECONOMIC_MATHEMATICS_SLIDES.filter(p => p.lesson === 1);
  assert.equal(pages.length, data.pages.length);
  for (const [i, page] of pages.entries()) {
    const source = data.pages[i]!;
    assert.equal(page.preludeId, source.id);
    for (let step = 0; step <= (source.reveals?.length ?? 0); step++) {
      const text = economicVisibleCopy(page, {presentationStep: step});
      for (const answer of (source.reveals ?? []).slice(step)) assert.ok(!text.includes(answer), source.id);
      if (step < (source.reveals?.length ?? 0) && source.conclusion) assert.ok(!text.includes(source.conclusion));
    }
  }
  const combined = ECONOMIC_MATHEMATICS_SLIDES.filter(p => p.lesson === 2);
  assert.equal(combined.length,59); assert.ok(combined.every(p=>p.slideKey.startsWith('em-l02-refined-mapping-') && !p.sourceLesson));
});
const scope = {} as { EconomicPreludeFilm: { DURATION: number; FPS: number; words: { from: number; to: number; text: string }[]; shots: { from: number; to: number }[]; response: (x: number, y: number) => number; rate: (t: number) => number; cumulative: (t: number) => number; isoCoordinate: (level: number, x: number) => number | null } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'film.js'), 'utf8'), scope);
const film = scope.EconomicPreludeFilm;
const require = createRequire(import.meta.url);
const notes = require('../../../docs/course/economic-mathematics-prelude-notes.cjs') as [number, string, string, string][];

test('prelude is lesson one, former lessons one and two combine without changing later numbering', () => {
  const deck = getCourseDeckByCourseId('course-economic-mathematics')!;
  assert.equal(deck.slideTotal, 421); assert.equal(deck.lessons.length, 32); assert.equal(deck.totalHours, 64);
  assert.equal(deck.versionId, 'release-economic-mathematics-lesson02-mapping-2026-10-09');
  assert.equal(deck.lessons[0]!.slideTotal, 40); assert.equal(deck.lessons[1]!.slideTotal, 59);
  assert.equal(deck.lessons[2]!.number, 3); assert.equal(deck.lessons[2]!.slideStart, 100);
  const resource = getCoursePresentation(deck.courseId)!.resources.find(r => r.role === '第1讲');
  assert.equal(resource?.url, '/course-assets/economic-mathematics/prelude/index.html');
  assert.equal(data.pages.length, 40); assert.equal(new Set(data.pages.map(p => p.id)).size, 40);
  assert.equal(data.units.reduce((s, u) => s + u.hours, 0), 64);
  assert.equal(notes.reduce((s, n) => s + n[0], 0), 45 * 60);
  assert.ok(data.pages.filter(p => p.special).length / data.pages.length <= .15);
});

test('all public copy and every reveal context exclude private delivery notes', () => {
  for (const [i, p] of data.pages.entries()) {
    for (let step = 0; step <= (p.reveals?.length ?? 0); step++) {
      const text = data.publicContext(i, step);
      assert.doesNotMatch(text, /teachingCue|assistantCue|storyBeat|让学生|告诉学生|先拆掉|不背口号|今天不先/);
      for (let hidden = step; hidden < (p.reveals?.length ?? 0); hidden++) assert.ok(!text.includes(p.reveals![hidden]!), `${p.id}: hidden step ${hidden}`);
      if (step < (p.reveals?.length ?? 0) && p.conclusion) assert.ok(!text.includes(p.conclusion));
    }
    assert.ok(!data.publicContext(i, 0).includes(notes[i]![2]));
    for (const bad of [NaN, Infinity, -1, .5]) for (const answer of p.reveals ?? []) assert.ok(!data.publicContext(i, bad).includes(answer));
  }
  for (const file of ['index.html', 'course-player.js', 'slides.js']) assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /prelude-notes|speakingNotes|teachingCue/);
});

test('progress rejects version conflicts and sanitizes invalid pages, steps and video offsets', () => {
  assert.equal(data.restore('{bad'), null); assert.equal(data.restore(JSON.stringify({ version: 'other' })), null);
  const restored = data.restore(JSON.stringify({ version: data.version, index: 100, steps: data.pages.map(() => 500), filmTime: 900 }))!;
  assert.equal(restored.index, 39); assert.equal(restored.filmTime, 90);
  for (const [i, step] of restored.steps.entries()) assert.equal(step, data.pages[i]!.reveals?.length ?? 0);
  const partial = data.restore(JSON.stringify({ version: data.version, index: 36, steps: data.pages.map((_, i) => i === 36 ? 2 : 0), filmTime: 12.3 }))!;
  assert.equal(partial.steps[36], 2); assert.equal(partial.filmTime, 12.3);
});

test('the movie keeps its 90-second route and uses brief mathematical impact titles', () => {
  assert.equal(film.FPS, 60); assert.equal(film.DURATION, 90); assert.equal(film.shots[0]!.from, 0);
  for (let i = 1; i < film.shots.length; i++) assert.equal(film.shots[i]!.from, film.shots[i - 1]!.to);
  assert.equal(film.shots.at(-1)!.to, 90);
  assert.ok(film.words.reduce((s, w) => s + w.to - w.from, 0) < 30);
  assert.deepEqual(Array.from(film.words, w => w.text), ['变量', '函数', '极限', '导数', '变化率', '积分', '累积', '多元函数', '偏导数', '等高线', '约束', '选择', '最优解', '经济数学']);
  for (let i = 0; i < film.words.length - 1; i++) {
    assert.ok(film.words[i]!.to - film.words[i]!.from >= 1.2 - 1e-9);
    assert.ok(film.words[i]!.to <= film.words[i + 1]!.from);
  }
});

test('film geometry agrees with independently defined curriculum models', () => {
  for (const t of [0, .2, 2, 4, 6, 8]) { assert.equal(film.rate(t), economicModels.rate(t)); assert.equal(film.cumulative(t), economicModels.accumulated(t)); assert.ok(film.rate(t) > 0); }
  for (const x of [0, 10, 36, 64, 90, 100]) assert.equal(film.response(x, 100 - x), economicModels.budgetResponse(x, 100));
  assert.equal(film.response(64, 36), 500); assert.ok(film.response(64, 36) > film.response(0, 100));
  assert.equal(film.cumulative(8), 1216);
  for (let level = 120; level <= 660; level += 30) for (let x = 0; x <= 100; x += 2) {
    const y = film.isoCoordinate(level, x);
    if (y !== null) { assert.ok(y >= 0 && y <= 100); assert.ok(Math.abs(film.response(x, y) - level) < 1e-9, 'Horizontal slices must be iso-response contours.'); }
  }
  assert.equal(film.isoCoordinate(100, 100), null);
});

test('opening exercise distinguishes revenue, profit and integer quantities', () => {
  assert.equal(9 * 110, 990); assert.ok(9 * 111 < 1000); assert.ok(9 * 112 >= 1000);
  assert.equal(Math.ceil(1000 / 9), 112); assert.equal(Math.ceil(400 / 3), 134);
  assert.ok(Math.abs((1 / .9 - 1) - 1 / 9) < 1e-14);
  assert.match(data.publicContext(35, 3), /112件/); assert.match(data.publicContext(37, 3), /134件/);
});
