import { binPortResources, emptyPortResourceStates, portResourceWindow, summarizePortResources, type PortClassLab, type PortResourceState, type PortResourceStatistics, type PortResourceSummary } from '@edu/port-simulation-core';
import { ANALYSIS_KINDS, type PortAnalysisChart } from './port-analysis-config';

export interface AnalysisSeries {
  key: string;
  label: string;
  rows: PortResourceSummary[];
  seconds: number;
  occupiedSeconds: number;
  completed: number;
  cycles: number[];
  states: Record<PortResourceState, number>;
  inventorySeconds: number;
  capacity: number;
}
export function groupAnalysisRows(rows: PortResourceSummary[], group: PortAnalysisChart['group']): AnalysisSeries[] {
  const groups = new Map<string, AnalysisSeries>();
  for (const row of rows) {
    const key = group === 'individual' ? row.resource.id : row.resource.kind;
    let entry = groups.get(key);
    if (!entry) { entry = { key, label: group === 'individual' ? row.resource.label : `${ANALYSIS_KINDS[row.resource.kind]}合计`, rows: [], seconds: 0, occupiedSeconds: 0, completed: 0, cycles: [], states: emptyPortResourceStates(), inventorySeconds: 0, capacity: 0 }; groups.set(key, entry); }
    entry.rows.push(row); entry.seconds += row.seconds; entry.occupiedSeconds += row.occupiedSeconds; entry.completed += row.completed; entry.cycles.push(...row.cycles); entry.inventorySeconds += row.inventorySeconds; entry.capacity += row.resource.capacity ?? 0;
    for (const state of Object.keys(row.states) as PortResourceState[]) entry.states[state] += row.states[state];
  }
  return [...groups.values()];
}
export function portAnalysisRange(run: PortClassLab, config: PortAnalysisChart) {
  const stats = run.simulation!.resourceStatistics!;
  return portResourceWindow(stats, config.window === 'custom' ? config.fromMinute * 60 : config.window === 'recent30' ? Math.max(stats.from, stats.through - 1800) : stats.from, config.window === 'custom' ? config.toMinute * 60 : stats.through);
}
export function portAnalysisData(stats: PortResourceStatistics, config: PortAnalysisChart, range: { from: number; to: number }) {
  const rows = summarizePortResources(stats, config.resources, range);
  return {
    range,
    rows,
    series: groupAnalysisRows(rows, config.group),
    bins: binPortResources(stats, config.resources, range, config.binMinutes * 60).map(bin => ({ from: bin.from, to: bin.to, series: groupAnalysisRows(bin.rows, config.group) })),
  };
}
export type PortAnalysisData = ReturnType<typeof portAnalysisData>;
export function portAnalysisValue(series: AnalysisSeries, config: PortAnalysisChart, seconds: number) {
  return config.metric === 'occupancy' ? series.seconds ? series.occupiedSeconds / series.seconds * 100 : 0 :
    config.metric === 'inventory' ? seconds && series.capacity ? series.inventorySeconds / seconds / series.capacity * 100 : 0 : series.completed;
}
export function portAnalysisCsv(run: PortClassLab, config: PortAnalysisChart) {
  const stats = run.simulation!.resourceStatistics!, range = portAnalysisRange(run, config);
  const rows: (string | number | boolean)[][] = [['记录类型', '设备ID', '设备', '开始模拟秒', '结束模拟秒', '状态', '任务占用', '任务ID', '箱号', '原因', '实际库存箱', '完成任务周期秒']];
  for (const entry of stats.resources.filter(r => config.resources.includes(r.resource.id))) {
    for (const i of entry.intervals) if (i.to > range.from && i.from < range.to) rows.push(['状态区间', entry.resource.id, entry.resource.label, Math.max(i.from, range.from), Math.min(i.to, range.to), i.state, i.occupied, i.job ?? '', i.box ?? '', i.reason, i.content ?? '', '']);
    for (const c of stats.completions) if (c.resource === entry.resource.id && c.at > range.from && c.at <= range.to) rows.push(['任务完成', entry.resource.id, entry.resource.label, c.start, c.at, '', '', c.job, c.box, `${c.from} → ${c.to}`, '', c.at - c.start]);
  }
  return '\ufeff' + rows.map((row,index) => [...row,...(index===0?['场景','场景规则','模拟版本']:[run.scenario??'original',run.emergency?.version??'',run.version])].map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
