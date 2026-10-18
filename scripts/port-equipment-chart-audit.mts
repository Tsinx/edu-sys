import { mkdir, writeFile } from 'node:fs/promises';
import { createPortClassLab as create, applyPortClassLabCommand as act, type PortClassLab, type PortLabCommand } from '../packages/port-simulation-core/src/port-class-lab.js';
import { summarizePortResources } from '../packages/port-simulation-core/src/port-resource-statistics.js';
import { defaultPortAnalysis, newPortAnalysisChart } from '../apps/teacher-web/src/features/port-simulation/port-analysis-config.ts';
import { portAnalysisData, portAnalysisRange, portAnalysisValue } from '../apps/teacher-web/src/features/port-simulation/port-analysis-data.ts';
import { freshNotebook, packedNotebook, submitLabRun } from '../apps/teacher-web/src/features/port-simulation/port-class-notebook.ts';

const destination = new URL('../output/port-equipment-audit/', import.meta.url);
await mkdir(destination, { recursive: true });
const reports: unknown[] = [];
for (const drivers of [1, 2, 8]) {
  let run = create(11, 'trial');
  run = act(run, { kind: 'configure-dispatch', value: { ...run.terminal.setup.dispatch, drivers } });
  run = act(run, { kind: 'advance', minutes: 30 });
  const stats = run.simulation!.resourceStatistics!, summaries = summarizePortResources(stats, stats.resources.map(r => r.resource.id));
  const charts = defaultPortAnalysis(run, 11).charts.map(config => {
    const data = portAnalysisData(stats, config, portAnalysisRange(run, config));
    return { title: config.title, metric: config.metric, series: data.series.map(s => ({ label: s.label, seconds: s.seconds, occupied: s.occupiedSeconds, completed: s.completed, peak: config.metric === 'state' ? undefined : Math.max(...data.bins.map(b => portAnalysisValue(b.series.find(row => row.key === s.key)!, config, b.to - b.from))) })) };
  });
  const histories = Object.values(run.simulation!.boxes).flatMap(b => b.history.filter(h => h.at > stats.from && ['船岸交接', '运输交接', '堆场交接', '闸口交接', '移箱交接'].includes(h.action)));
  reports.push({ lesson: 11, drivers, from: stats.from, through: stats.through, resources: summaries.length,
    newlyDelivered: run.terminal.delivered - run.initialDelivered, incrementalCost: run.terminal.cost - run.initialCost,
    yardFlows: run.simulation!.plan.yards.map(y => ({ yard: y.id, planned: Object.values(run.simulation!.boxes).filter(b => run.simulation!.batches[b.batchId]!.targetYard === y.id).length, unloaded: Object.values(run.simulation!.boxes).filter(b => run.simulation!.batches[b.batchId]!.targetYard === y.id && b.unloadedAt !== null).length })),
    totalSecondsValid: summaries.every(r => Object.values(r.states).reduce((n, x) => n + x, 0) === stats.through - stats.from),
    actualTransfers: histories.length, recordedTransfers: stats.completions.length,
    occupiedUnstaffed: stats.resources.flatMap(r => r.intervals.filter(i => i.occupied && i.state === 'unstaffed').map(i => ({ resource: r.resource.id, from: i.from, to: i.to, box: i.box, reason: i.reason }))), charts });
  if (drivers === 8) {
    let book = freshNotebook(11);
    book.run = act(create(11), { kind: 'advance', minutes: 360 }); book.learning!.current.finding = '图表核验用基准：保持默认岗位至同一终点。'; book = submitLabRun(book, true); book.run = run; book.step = 2;
    book.analysis = defaultPortAnalysis(run, 11); book.learning!.guide.hidden = true;
    await writeFile(new URL('lesson11-chart-notebook.json', destination), JSON.stringify(packedNotebook(book, 11), null, 2));
  }
}
for (const scenario of ['system', 'equipment'] as const) {
  const run = act(create(12, 'incident', scenario), { kind: 'advance', minutes: 15 });
  const stats = run.simulation!.resourceStatistics!;
  reports.push({ lesson: 12, scenario, from: stats.from, through: stats.through, rows: summarizePortResources(stats, stats.resources.map(r => r.resource.id)).map(r => ({ id: r.resource.id, states: r.states, occupied: r.occupiedSeconds, completed: r.completed })) });
}
function until(run: PortClassLab, predicate: (r: PortClassLab) => boolean): PortClassLab {
  for (let n = 0; n < 80 && !predicate(run); n++) {
    if (run.terminal.minute >= run.endpoint) throw Error(`观察结束前未完成：${run.feedback}`);
    run = act(run, { kind: 'advance', minutes: 360 });
  }
  if (!predicate(run)) throw Error('未到指定节点');
  return run;
}
const task = (run: PortClassLab, command: PortLabCommand) => until(act(run, command), r => !r.pendingTask);
function recovery(scenario: 'system' | 'equipment', alternative: boolean) {
  let run = act(create(12, 'incident', scenario), { kind: 'record' });
  run = task(run, { kind: 'inspect', target: 'scope' });
  run = task(run, { kind: 'inspect', target: scenario === 'system' ? 'logs' : 'mechanical' });
  run = task(run, { kind: 'isolate', scope: 'gate' });
  run = act(run, { kind: 'repair-team', people: scenario === 'system' && alternative ? 1 : 2 });
  run = act(run, { kind: 'repair' });
  if (scenario === 'system') { run = task(run, { kind: 'inspect', target: 'backup' }); run = task(run, { kind: 'start-audit', quarantine: ['R3', 'R4'] }); }
  else if (alternative) run = act(run, { kind: 'relief', enabled: true });
  run = until(run, r => r.incident!.repairWork >= r.emergency!.repairTarget);
  run = task(run, { kind: 'start-reconcile' });
  if (scenario === 'equipment' && alternative) { run = act(run, { kind: 'relief', enabled: false }); run = until(run, r => !!r.emergency!.reliefReturned); }
  run = act(run, { kind: 'test' }); run = until(run, r => r.incident!.testPassed);
  run = act(run, { kind: 'restore' });
  return until(run, r => r.terminal.minute === r.endpoint);
}
for (const scenario of ['system', 'equipment'] as const) {
  const baseline = recovery(scenario, false), current = recovery(scenario, true), book = freshNotebook(12, scenario);
  book.run = current; book.archive = [{ run: baseline, notes: {}, attempts: [], sealedAt: null }]; book.comparison = 'latest';
  book.analysis.charts.push(
    { ...newPortAnalysisChart(current, 'audit-timeline', ['crane-0', 'vehicle-0', 'yard-crane-0', 'gate-lane-0']), title: '核对 · 四环节真实状态时间轴', width: 'full' },
    { ...newPortAnalysisChart(current, 'audit-cycles', ['crane-0', 'vehicle-0', 'yard-crane-0', 'gate-lane-0']), title: '核对 · 已完成交接周期', metric: 'cycle', chart: 'histogram', baseline: true, width: 'full', binMinutes: 5 },
  );
  await writeFile(new URL(`${scenario}-chart-notebook.json`, destination), JSON.stringify(packedNotebook(book, 12), null, 2));
  reports.push({ lesson: 12, scenario, completedComparison: true, baselineRestoredAt: baseline.incident!.restoredAt, currentRestoredAt: current.incident!.restoredAt, currentDelivered: current.terminal.delivered, actualTrialTransfers: current.incident!.testDelivered });
}
await writeFile(new URL('statistics.json', destination), JSON.stringify(reports, null, 2));
for (const r of reports as any[]) console.log(JSON.stringify({ lesson: r.lesson, drivers: r.drivers, scenario: r.scenario, from: r.from, through: r.through, totalSecondsValid: r.totalSecondsValid, actualTransfers: r.actualTransfers, recordedTransfers: r.recordedTransfers, newlyDelivered: r.newlyDelivered, incrementalCost: r.incrementalCost, occupiedUnstaffed: r.occupiedUnstaffed, completedComparison: r.completedComparison, baselineRestoredAt: r.baselineRestoredAt, currentRestoredAt: r.currentRestoredAt, actualTrialTransfers: r.actualTrialTransfers, chartPeaks: r.charts?.filter((c: any) => c.metric !== 'state').map((c: any) => ({ title: c.title, peak: Math.max(...c.series.map((s: any) => s.peak)) })) }));
