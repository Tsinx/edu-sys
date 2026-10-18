import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyPortClassLabCommand as act, createPortClassLab, summarizePortResources } from '@edu/port-simulation-core';
import { freshNotebook, packedNotebook, decodeNotebook } from '../src/features/port-simulation/port-class-notebook';
import { decodePortAnalysis, defaultPortAnalysis, newPortAnalysisChart } from '../src/features/port-simulation/port-analysis-config';
import { groupAnalysisRows, portAnalysisCsv, portAnalysisData, portAnalysisRange } from '../src/features/port-simulation/port-analysis-data';
import { PortLabAnalysis } from '../src/features/port-simulation/PortLabAnalysis';

test('chart definitions, object selections, ordering and time windows round-trip with the experiment; historical files receive templates', () => {
  const book = freshNotebook(11), chart = { ...newPortAnalysisChart(book.run, 'custom-comparison', ['vehicle-0', 'vehicle-2']), title: '我的车辆比较', metric: 'occupancy' as const, chart: 'bar' as const, window: 'custom' as const, fromMinute: 125, toMinute: 135, binMinutes: 5 as const, width: 'full' as const };
  book.analysis.charts = [chart, ...book.analysis.charts]; book.run = act(book.run, { kind: 'advance', minutes: 15 });
  const packed = packedNotebook(book, 11), restored = decodeNotebook(JSON.parse(JSON.stringify(packed)), 11);
  assert.deepEqual(restored.analysis, book.analysis); assert.deepEqual(restored.run.simulation!.resourceStatistics, book.run.simulation!.resourceStatistics);
  assert.ok(!JSON.stringify(packed).includes('resourceStatistics'), 'save stores commands, never accepts fabricated traces');
  const old = { ...packed }; delete (old as Partial<typeof old>).analysis;
  assert.equal(decodeNotebook(old, 11).analysis.charts.length, 4);
  assert.throws(() => decodePortAnalysis({ version: 1, charts: [{ ...chart, resources: ['missing-device'] }] }, book.run, 11), /图表对象/);
  assert.throws(() => decodePortAnalysis({ version: 1, charts: [{ ...chart, fromMinute: 139 }] }, book.run, 11), /图表对象/);
});

test('group utilization is weighted by device seconds; custom ranges and raw CSV use the same actual spans', () => {
  const run = act(createPortClassLab(11), { kind: 'advance', minutes: 15 }), stats = run.simulation!.resourceStatistics!;
  const config = { ...newPortAnalysisChart(run, 'compare', ['vehicle-0', 'vehicle-2']), metric: 'occupancy' as const, chart: 'line' as const, group: 'type' as const, window: 'custom' as const, fromMinute: 125, toMinute: 135, binMinutes: 5 as const };
  const range = portAnalysisRange(run, config), data = portAnalysisData(stats, config, range), group = data.series[0]!;
  assert.deepEqual(range, { from: 7500, to: 8100 }); assert.equal(group.seconds, 1200);
  assert.equal(group.occupiedSeconds, data.rows.reduce((n, r) => n + r.occupiedSeconds, 0)); assert.ok(group.occupiedSeconds / group.seconds <= .5);
  assert.equal(data.bins.length, 2);
  const all = groupAnalysisRows(summarizePortResources(stats, ['vehicle-0', 'vehicle-2']), 'type')[0]!; assert.equal(all.seconds, 1800);
  const csv = portAnalysisCsv(run, config); assert.match(csv, /实际库存箱/); assert.match(csv, /场内车 1/); assert.doesNotMatch(csv, /岸桥/);
});

test('both experiments expose device chart entry, durable configuration and real statistical charts without teacher metadata', () => {
  for (const lesson of [11, 12] as const) {
    const book = freshNotebook(lesson); book.analysis = defaultPortAnalysis(book.run, lesson); book.run = act(book.run, { kind: 'advance', minutes: 15 });
    const html = renderToStaticMarkup(<PortLabAnalysis run={book.run} baseline={null} dashboard={book.analysis} selected="vehicle-0" onSelect={() => {}} onChange={() => {}} onFocus={() => {}}/>);
    assert.match(html, /为所选设备添加图表/); assert.match(html, /配置随实验自动保存/); assert.match(html, /role="img"/); assert.match(html, /data-range-from="/); assert.doesNotMatch(html, /NaN|Infinity|teachingCue|assistantCue/);
    if (lesson === 11) assert.match(html, /任务占用率＝/); else assert.match(html, /交付中断与闸口恢复/);
  }
});
