import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortClassLab, type PortResourceState } from '@edu/port-simulation-core';
import { PortLabAnalysis } from '../src/features/port-simulation/PortLabAnalysis';
import { newPortAnalysisChart, type PortAnalysisChart } from '../src/features/port-simulation/port-analysis-config';

function fixture(id: string, state: PortResourceState, content?: number) {
  const run = createPortClassLab(11, 'trial'), stats = run.simulation!.resourceStatistics!;
  const resource = stats.resources.find(r => r.resource.id === id)!.resource;
  if (content !== undefined) resource.capacity = 10_000;
  stats.through = stats.from + 600;
  stats.resources = [{ resource, intervals: [{ from: stats.from, to: stats.through, state, occupied: state === 'service', reason: '可独立验算的显示测试数据', ...(content === undefined ? {} : { content }) }] }];
  run.simulation!.second = stats.through; run.terminal.minute = stats.through / 60;
  return run;
}
function render(run: ReturnType<typeof fixture>, config: PortAnalysisChart, baseline: ReturnType<typeof fixture> | null = null) {
  return renderToStaticMarkup(<PortLabAnalysis run={run} baseline={baseline} dashboard={{ version: 1, charts: [config] }} selected={config.resources[0]!} onChange={() => {}} onSelect={() => {}} onFocus={() => {}}/>);
}

test('a state appearing only in the baseline still has a visible state legend', () => {
  const run = fixture('yard-crane-0', 'idle'), baseline = fixture('yard-crane-0', 'fault');
  const config = { ...newPortAnalysisChart(run, 'state', ['yard-crane-0']), chart: 'stack' as const, baseline: true };
  const html = render(run, config, baseline);
  const legend = html.match(/<div class="pla-state-legend">(.*?)<\/div>/)![1]!;
  assert.match(legend, /设备故障/);
  assert.match(legend, /待派工/);
});

test('zero output never creates a positive-height cargo column', () => {
  const run = fixture('crane-0', 'idle');
  const config = { ...newPortAnalysisChart(run, 'output', ['crane-0']), metric: 'output' as const, chart: 'bar' as const };
  const html = render(run, config), columns = html.match(/<rect\b[^>]*aria-label="[^"]*：0次交接"[^>]*>/g) ?? [];
  assert.equal(columns.length, 1);
  assert.ok(columns.every(column => /\bheight="0"/.test(column)));
});

test('low stock remains visible on a zero-based percent axis shared with the baseline', () => {
  const run = fixture('storage-Y1', 'idle', 10), baseline = fixture('storage-Y1', 'idle', 50);
  const config = { ...newPortAnalysisChart(run, 'stock', ['storage-Y1']), baseline: true };
  const html = render(run, config, baseline), scale = Number(html.match(/data-y-max="([\d.]+)"/)?.[1]);
  assert.ok(scale >= 0.5 && scale <= 1, `expected a readable common axis around 0.5%, got ${scale}`);
  assert.match(html, /data-value="0.1"/);
  assert.match(html, /data-value="0.5"/);
  assert.match(html, /纵轴随数据缩放/);
  assert.match(html, />0%<\/text>/);
});

test('device occupancy retains the 0 to 100 percent axis', () => {
  const run = fixture('vehicle-0', 'service');
  const config = { ...newPortAnalysisChart(run, 'occupancy', ['vehicle-0']), metric: 'occupancy' as const, chart: 'line' as const };
  const html = render(run, config);
  assert.match(html, /data-y-max="100"/);
  assert.match(html, />100%<\/text>/);
});

test('a timeline preserves the exact state boundaries and a cycle histogram counts complete tasks once', () => {
  const run = fixture('crane-0', 'idle'), stats = run.simulation!.resourceStatistics!;
  stats.resources[0]!.intervals = [
    { from: 7200, to: 7320, state: 'service', occupied: true, reason: '交接' },
    { from: 7320, to: 7800, state: 'idle', occupied: false, reason: '待派工' },
  ];
  stats.completions = [
    { at: 7320, start: 7260, resource: 'crane-0', job: 1, box: 'B1', from: 'ship:A', to: 'quay:A' },
    { at: 7800, start: 7320, resource: 'crane-0', job: 2, box: 'B2', from: 'ship:A', to: 'quay:A' },
  ];
  const config = newPortAnalysisChart(run, 'timeline', ['crane-0']);
  assert.match(render(run, config), /第120—122分钟/);
  assert.match(render(run, config), /第122—130分钟/);
  const histogram = render(run, { ...config, metric: 'cycle', chart: 'histogram', binMinutes: 5 });
  const columns = histogram.match(/<rect\b[^>]*data-value="1"[^>]*>/g) ?? [];
  assert.equal(columns.length, 2);
  assert.match(histogram, /任务周期0—5分钟：1次任务/);
  assert.match(histogram, /任务周期5—10分钟：1次任务/);
});
