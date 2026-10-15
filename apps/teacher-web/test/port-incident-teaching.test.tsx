import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortClassLab, applyPortClassLabCommand as act } from '@edu/port-simulation-core';
import { incidentNotices, incidentTeachingStep } from '../src/features/port-simulation/port-incident-teaching';
import { PortIncidentBriefing } from '../src/features/port-simulation/PortIncidentBriefing';
import { freshNotebook, packedNotebook, decodeNotebook } from '../src/features/port-simulation/port-class-notebook';

test('fault and timed result bulletins show only earned evidence and suppress routine clock updates', () => {
  for (const scenario of ['system', 'equipment'] as const) {
    let r = createPortClassLab(12, 'incident', scenario);
    let notices = incidentNotices(r, []);
    assert.equal(notices.length, 1); assert.equal(notices[0]!.title, '故障通报');
    assert.equal(notices[0]!.tone, 'danger'); assert.ok(notices[0]!.interrupt);
    assert.doesNotMatch(notices[0]!.text, /第75分钟|驱动控制保护异常|版本18/);
    r = act(r, { kind: 'record' }); r = act(r, { kind: 'inspect', target: 'scope' });
    r = act(r, { kind: 'tick', seconds: 60 });
    const before = incidentNotices(r, []); assert.ok(!before.at(-1)!.interrupt);
    r = act(r, { kind: 'tick', seconds: 120 }); notices = incidentNotices(r, []);
    assert.equal(notices.filter(n => n.interrupt).length, 2);
    assert.ok(notices.at(-1)!.text.includes('独立现场检查'));
    assert.ok(notices.every(n => !n.text.startsWith('已到第')));
  }
});

test('rejected actions retain their place before a later accepted action at the same second', () => {
  let r = createPortClassLab(12, 'incident', 'system');
  const attempts = [{ minute: 90, command: 'isolate', message: '先固定当前告警证据。', afterEvent: r.events.length }];
  r = act(r, { kind: 'record' }); const notices = incidentNotices(r, attempts);
  assert.equal(notices[1]!.title, '处置未执行'); assert.equal(notices.at(-1)!.title, '处置指令已受理');
});

test('teaching mode does not grant evidence, skip actual validation or claim failed endpoints recovered', () => {
  let r = createPortClassLab(12, 'incident', 'equipment');
  assert.equal(incidentTeachingStep(r).index, 0);
  r = act(r, { kind: 'record' }); assert.equal(incidentTeachingStep(r).index, 1);
  while (r.terminal.minute < r.endpoint) r = act(r, { kind: 'advance', minutes: 360 });
  assert.equal(r.incident!.restoredAt, null);
  const last = incidentNotices(r, []).at(-1)!;
  assert.equal(last.title, '观察结束 · 尚未恢复'); assert.equal(last.tone, 'warning');
  assert.equal(incidentTeachingStep(r).index, 5);
});

test('teaching preference round trips with old record compatibility and does not alter replayed work', () => {
  const book = freshNotebook(12, 'system'); book.teachingMode = true;
  book.run = act(book.run, { kind: 'record' });
  const data = packedNotebook(book, 12), restored = decodeNotebook(data, 12);
  assert.equal(restored.teachingMode, true); assert.deepEqual(restored.run, book.run);
  const old: any = { ...data }; delete old.teachingMode;
  assert.equal(decodeNotebook(old, 12).teachingMode, false);
  assert.throws(() => decodeNotebook({ ...data, teachingMode: 'yes' }, 12), /教学模式/);
  assert.throws(() => decodeNotebook({ ...data, attempts: [{ minute: 90, command: 'x', message: 'x', afterEvent: -1 }] }, 12));
});

test('student-visible teaching guide uses current facts and an accessible notice dialog', () => {
  for (const scenario of ['system', 'equipment'] as const) {
    const run = createPortClassLab(12, 'incident', scenario);
    const html = renderToStaticMarkup(<PortIncidentBriefing run={run} attempts={[]} teaching onTeaching={() => {}} onPause={() => {}}/>);
    assert.match(html, /role="switch"/); assert.match(html, /教学阶段/); assert.match(html, /aria-current="step"/);
    assert.match(html, /<dialog[^>]+aria-labelledby="pib-dialog-title"/);
    assert.doesNotMatch(html, /teachingCue|assistantCue|第75分钟|隔离R3|驱动控制保护异常/);
  }
});
