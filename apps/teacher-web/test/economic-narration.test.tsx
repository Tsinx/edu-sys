import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { refinedNarration, ECONOMIC_MATHEMATICS_SLIDES } from '@edu/course-content/economic-mathematics';
import { preludeNarration, lessonNarration, visibleNarration } from '../src/features/economic-mathematics/narration-scripts';
import { NarrationSpeech } from '../src/features/economic-mathematics/NarrationSpeech';

const require = createRequire(import.meta.url);
const prelude = require('../public/course-assets/economic-mathematics/prelude/course-data.js');
test('all 99 pages have reviewed narration aligned to every public reveal', () => {
  const pages = ECONOMIC_MATHEMATICS_SLIDES.filter(p => p.lesson === 2);
  assert.equal(pages.length + prelude.pages.length, 99);
  for (const p of prelude.pages) assert.equal(preludeNarration[p.id]?.length, 1 + (p.reveals?.length ?? 0), p.id);
  for (const p of pages) assert.equal(refinedNarration[p.slideKey]?.length, 1 + (p.steps?.length ?? 0), p.title);
  for (const paragraphs of [...Object.values(preludeNarration), ...Object.values(refinedNarration), ...Object.values(lessonNarration).flat()]) for (const text of paragraphs) {
    assert.ok(text.length >= 12 && text.length < 3000);
    assert.doesNotMatch(text, /teachingCue|assistantCue|让学生|告诉学生|\\frac|\\sqrt|\$/);
  }
});
test('unpublished answers never enter speech, including invalid steps', () => {
  const paragraphs = preludeNarration.derive!;
  for (const step of [0, -1, NaN, 1.5]) assert.deepEqual(visibleNarration(paragraphs, step), [paragraphs[0]]);
  assert.equal(visibleNarration(paragraphs, 1).length, 2);
  assert.ok(!visibleNarration(paragraphs, 1).join('').includes('一百一十二'));
  assert.equal(visibleNarration(paragraphs, Infinity).length, 1);
  assert.equal(visibleNarration(paragraphs, 99).length, paragraphs.length);
});
test('worked answers preserve exact, integer and economic boundaries', () => {
  assert.match(preludeNarration.derive![2]!, /精确门槛不能向下截断/);
  assert.match(preludeNarration.derive![3]!, /一百一十二/);
  assert.match(preludeNarration.transfer![3]!, /一百三十四/);
  assert.match(lessonNarration[1]![6]![3]!, /不能把两个条件取并集/);
  assert.match(lessonNarration[2]![7]![1]!, /根号二十三/);
});

// Deterministic audio fakes test cancellation of late network responses and paused queues.
test('stopped or replaced speech cannot revive, and transport failure is actionable', async () => {
  const original = { window: globalThis.window, AudioContext: globalThis.AudioContext, fetch: globalThis.fetch };
  const events = new EventTarget();
  Object.assign(globalThis, { window: events, AudioContext: class { currentTime = 0; state = 'running'; async resume() {} async suspend() {} async close() {} } });
  try {
    const states: string[] = [];
    let resolveFetch!: (r: Response) => void;
    globalThis.fetch = () => new Promise(resolve => { resolveFetch = resolve; });
    const player = new NarrationSpeech((state, message) => states.push(`${state}:${message ?? ''}`));
    const pending = player.play(['第一段'], 'course', 1, () => {});
    await new Promise(resolve => setTimeout(resolve, 0));
    player.stop();
    resolveFetch(new Response('data: {"error":"旧请求错误"}\n\n', { status: 200 }));
    await pending;
    assert.equal(states.at(-1), 'idle:');
    globalThis.fetch = async () => new Response('', { status: 503 });
    await player.play(['第二段'], 'course', 1, () => {});
    assert.match(states.at(-1)!, /error:课程语音暂不可用/);
    player.dispose();
  } finally { Object.assign(globalThis, original); }
});

test('stop releases a paused speech sequence without sending later paragraphs', async () => {
  const original = { window: globalThis.window, AudioContext: globalThis.AudioContext, fetch: globalThis.fetch };
  const events = new EventTarget();
  Object.assign(globalThis, { window: events, AudioContext: class { currentTime = 0; state = 'running'; async resume() {} async suspend() {} async close() {} } });
  try {
    const player = new NarrationSpeech(() => {});
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('', { status: 503 }); };
    // Pause immediately while audio activation is resolving, then stop.
    const pending = player.play(['题目', '未公开答案'], 'course', 1, () => {});
    await player.pause(); player.stop(); await pending;
    assert.equal(calls, 0);
    player.dispose();
  } finally { Object.assign(globalThis, original); }
});
