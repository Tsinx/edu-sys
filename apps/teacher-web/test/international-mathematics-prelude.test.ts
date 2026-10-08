import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { definiteIntegral, derivativeCurve, evaluateCurve, secantSlope } from '@edu/course-content/international-mathematics';
import { getCourseDeckByCourseId, getCoursePresentation } from '@edu/course-content/deck-registry';

const assetRoot = fileURLToPath(new URL('../public/course-assets/international-mathematics/prelude/', import.meta.url));
const animationModule = { exports: {} as {
  DURATION: number; FPS: number; WIDTH: number; HEIGHT: number;
  shots: { id: string; from: number; to: number; text: string }[];
  model: { profit: (q: number) => number; marginalProfit: (q: number) => number;
    secant: (h: number) => number; cashFlow: (t: number) => number; accumulation: (t: number) => number };
} };
vm.runInNewContext(fs.readFileSync(path.join(assetRoot, 'animation.js'), 'utf8'), { module: animationModule });
const film = animationModule.exports;

test('prelude rates agree with independently defined course curve calculations', () => {
  const curve = { kind: 'polynomial' as const, coefficients: [0, 40, -1] };
  for (const q of [0, 5, 10, 20, 35, 40]) {
    assert.equal(film.model.profit(q), evaluateCurve(curve, q));
    assert.equal(film.model.marginalProfit(q), derivativeCurve(curve, q));
  }
  for (const h of [12, 6, 2, 0.5]) {
    assert.equal(film.model.secant(h), secantSlope(curve, 10, h));
    assert.notEqual(film.model.secant(h), film.model.marginalProfit(10));
  }
  assert.equal(film.model.secant(0), 20);
  assert.equal(film.model.profit(20), 400);
  assert.equal(film.model.marginalProfit(20), 0);
});

test('cash-flow accumulation has the correct integral and units in the storyboard', () => {
  const curve = { kind: 'polynomial' as const, coefficients: [10, 2] };
  for (const t of [0, 1, 3, 6]) {
    assert.equal(film.model.cashFlow(t), evaluateCurve(curve, t));
    assert.equal(film.model.accumulation(t), definiteIntegral(curve, 0, t));
  }
  assert.equal(film.model.accumulation(6), 96);
  const storyboard = JSON.parse(fs.readFileSync(path.join(assetRoot, 'storyboard.json'), 'utf8'));
  assert.match(storyboard.models.profit, /USD.*items/);
  assert.match(storyboard.models.finiteRate, /h > 0.*USD\/item/);
  assert.match(storyboard.models.cashFlow, /USD\/hour.*hours/);
  assert.match(storyboard.models.accumulatedTotal, /measured in USD/);
});

test('the complete timeline has a readable final hold and does not reveal the opening answer', () => {
  assert.equal(film.DURATION * film.FPS, 1080);
  assert.equal(film.WIDTH / film.HEIGHT, 1.6);
  assert.equal(film.shots[0]!.from, 0);
  assert.equal(film.shots.at(-1)!.to, 36);
  assert.equal(new Set(film.shots.map(s => s.id)).size, film.shots.length);
  film.shots.forEach((s, i) => {
    assert.ok(s.to > s.from);
    if (i > 0) assert.equal(s.from, film.shots[i - 1]!.to);
  });
  const final = film.shots.at(-1)!;
  assert.ok(final.to - final.from >= 8);
  assert.match(final.text, /When does one more stop being worth it\?/);
  assert.doesNotMatch(final.text, /q =|20 items|maximum/);
  for (const s of film.shots) assert.doesNotMatch(s.text, /[\p{Script=Han}]/u);
});

test('the prelude is a course resource and preserves existing deck and progress destinations', () => {
  const courseId = 'course-international-mathematics';
  const resource = getCoursePresentation(courseId)!.resources.find(r => r.role === 'Course prelude')!;
  assert.equal(resource.url, '/course-assets/international-mathematics/prelude/index.html');
  assert.ok(fs.existsSync(path.join(assetRoot, 'index.html')));
  const deck = getCourseDeckByCourseId(courseId)!;
  assert.equal(deck.slideTotal, 1312);
  assert.equal(deck.lessons.length, 16);
  assert.equal(deck.totalHours, 32);
  assert.equal(deck.versionId, 'release-international-mathematics-jacques-v2');
  assert.equal(deck.getSlideByKey('im-l01-13')?.slideKey, 'im-l01-13');
});
