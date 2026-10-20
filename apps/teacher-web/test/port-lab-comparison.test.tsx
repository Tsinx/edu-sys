import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortClassLab, applyPortClassLabCommand } from '@edu/port-simulation-core';
import { freshNotebook, saveNotebook, submitLabRun } from '../src/features/port-simulation/port-class-notebook';
import { PortClassLabPage } from '../src/features/port-simulation/PortClassLabPage';

test('a partial trial is never reported as a delivery or cost improvement against a completed baseline', () => {
  const original = Object.fromEntries(['window', 'location', 'localStorage'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const values = new Map<string, string>();
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: {} }, location: { configurable: true, value: { search: '' } },
    localStorage: { configurable: true, value: { get length() { return values.size; }, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), key: (i: number) => [...values.keys()][i] ?? null } },
  });
  try {
    let book = freshNotebook(11);
    book.run = applyPortClassLabCommand(createPortClassLab(11), { kind: 'advance', minutes: 360 });
    book.learning!.current.finding = '先观察基准的车辆等待，再用同终点试验比较。';
    book = submitLabRun(book, true);
    book.run = applyPortClassLabCommand(createPortClassLab(11, 'trial'), { kind: 'advance', minutes: 30 });
    saveNotebook(book, 11, 'partial-comparison');
    (globalThis as any).location.search = '?lesson=11&session=partial-comparison';
    const partial = renderToStaticMarkup(<PortClassLabPage lesson={11}/>);
    assert.equal((partial.match(/待同终点/g) ?? []).length, 2);
    assert.match(partial, /进行中/);
    book.run = applyPortClassLabCommand(book.run, { kind: 'advance', minutes: 360 });
    saveNotebook(book, 11, 'finished-comparison');
    (globalThis as any).location.search = '?lesson=11&session=finished-comparison';
    const finished = renderToStaticMarkup(<PortClassLabPage lesson={11}/>);
    assert.doesNotMatch(finished, /待同终点/);
  } finally {
    for (const k of ['window', 'location', 'localStorage']) { if (original[k]) Object.defineProperty(globalThis, k, original[k]!); else Reflect.deleteProperty(globalThis, k); }
  }
});
