import test from 'node:test';
import React from 'react';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { toggleScreenFullscreen } from '../src/features/classroom/presentation-fullscreen-api';
import { FullscreenButtons } from '../src/features/classroom/FullscreenButtons';

test('native fullscreen requests target directly and exits only its own fullscreen', async () => {
  let requests = 0, exits = 0;
  const target = { requestFullscreen: async () => { requests++; } };
  const other = { requestFullscreen: async () => {} };
  const doc = { fullscreenElement: other as typeof target | null, exitFullscreen: async () => { exits++; } };
  await toggleScreenFullscreen(doc, target);
  assert.equal(requests, 1);
  assert.equal(exits, 0);
  doc.fullscreenElement = target;
  await toggleScreenFullscreen(doc, target);
  assert.equal(requests, 1);
  assert.equal(exits, 1);
});

test('unavailable or denied native fullscreen is a failure with no fallback', async () => {
  await assert.rejects(toggleScreenFullscreen({ fullscreenElement: null }, {}), /unavailable/);
  const denied = new Error('Permission denied');
  await assert.rejects(toggleScreenFullscreen({ fullscreenElement: null }, { requestFullscreen: () => Promise.reject(denied) }), error => error === denied);
});

test('page and screen buttons have distinct names, pressed states and exit actions', () => {
  const controls = { isPageFullscreen: false, isScreenFullscreen: false, togglePageFullscreen: () => {}, toggleScreenFullscreen: async () => {} };
  const ordinary = renderToStaticMarkup(<FullscreenButtons controls={controls}/>);
  assert.equal((ordinary.match(/<button/g) ?? []).length, 2);
  assert.match(ordinary, /aria-label="网页全屏" aria-pressed="false"/);
  assert.match(ordinary, /aria-label="屏幕全屏" aria-pressed="false"/);
  const screen = renderToStaticMarkup(<FullscreenButtons controls={{ ...controls, isPageFullscreen: true, isScreenFullscreen: true }}/>);
  assert.match(screen, /aria-label="退出网页全屏" aria-pressed="true" disabled/);
  assert.match(screen, /aria-label="退出屏幕全屏" aria-pressed="true"/);
  const en = renderToStaticMarkup(<FullscreenButtons controls={controls} locale="en"/>);
  assert.match(en, /aria-label="Page fullscreen"/);
  assert.match(en, /aria-label="Screen fullscreen"/);
});
