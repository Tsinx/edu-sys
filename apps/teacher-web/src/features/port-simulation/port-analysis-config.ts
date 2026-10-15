import { portStatisticsResources, type PortClassLab, type PortClassLesson, type PortResourceKind } from '@edu/port-simulation-core';

export type PortAnalysisMetric = 'state' | 'occupancy' | 'output' | 'cycle' | 'inventory';
export type PortAnalysisChartType = 'timeline' | 'stack' | 'line' | 'bar' | 'histogram';
export interface PortAnalysisChart {
  id: string;
  title: string;
  resources: string[];
  metric: PortAnalysisMetric;
  chart: PortAnalysisChartType;
  window: 'all' | 'recent30' | 'custom';
  fromMinute: number;
  toMinute: number;
  binMinutes: 1 | 5 | 10 | 15;
  group: 'individual' | 'type';
  width: 'half' | 'full';
  baseline: boolean;
}
export interface PortAnalysisDashboard { version: 1; charts: PortAnalysisChart[] }
export const ANALYSIS_METRICS = { state: '设备状态与时长', occupancy: '分时段任务占用率', output: '分时段完成交接量', cycle: '已完成任务周期', inventory: '堆场库存与容量占用' } as const;
export const ANALYSIS_CHARTS = { timeline: '状态时间轴', stack: '时间构成条形图', line: '折线图', bar: '柱状图', histogram: '周期分布直方图' } as const;
export const ANALYSIS_KINDS: Record<PortResourceKind, string> = { quay: '岸桥', vehicle: '集卡', yard: '场桥', gate: '闸口', storage: '堆场区域' };
export const allowedAnalysisCharts = (metric: PortAnalysisMetric): PortAnalysisChartType[] => metric === 'state' ? ['timeline', 'stack'] : metric === 'cycle' ? ['histogram'] : ['line', 'bar'];
export function newPortAnalysisChart(run: PortClassLab, id: string, resources: string[] = ['crane-0']): PortAnalysisChart {
  const storage = resources.every(id => id.startsWith('storage-'));
  return { id, title: storage ? '堆场库存观察' : '设备状态观察', resources, metric: storage ? 'inventory' : 'state', chart: storage ? 'line' : 'timeline', window: 'all', fromMinute: run.checkpoint, toMinute: run.endpoint, binMinutes: 10, group: 'individual', width: 'half', baseline: false };
}
export function defaultPortAnalysis(run: PortClassLab, lesson: PortClassLesson): PortAnalysisDashboard {
  const all = portStatisticsResources(run.simulation!), group = (kind: PortResourceKind) => all.filter(r => r.kind === kind).map(r => r.id);
  if (lesson === 12) return { version: 1, charts: [
    { ...newPortAnalysisChart(run, 'recovery-state', run.scenario==='equipment'?group('yard'):group('gate')), title: run.scenario==='equipment'?'故障、替代与场桥复工':'交付中断与闸口恢复', chart:'stack', baseline:true, width: 'full' },
    { ...newPortAnalysisChart(run, 'recovery-vehicles', group('vehicle').filter(id=>Number(id.split('-')[1])<8)), title:'车辆等待与任务占用', metric:'occupancy', chart:'line', baseline:true },
    { ...newPortAnalysisChart(run, 'recovery-output', [...group('yard'),...group('gate')]), title:'恢复过程的实际交接量', metric:'output', chart:'bar', group:'type', baseline:true },
    { ...newPortAnalysisChart(run, 'recovery-stock', group('storage')), title: '恢复期间的堆场库存', metric: 'inventory', chart: 'line', group: 'type', baseline:true },
  ] };
  return { version: 1, charts: [
    { ...newPortAnalysisChart(run, 'equipment-load', [...group('quay'), ...group('yard')]), title: '设备负荷 · 时间花在哪里', chart: 'stack', baseline: true },
    { ...newPortAnalysisChart(run, 'vehicle-wait', group('vehicle').filter(id => Number(id.split('-')[1]) < run.terminal.setup.vehicles)), title: '运输等待 · 场内车分时段占用', metric: 'occupancy', chart: 'line', baseline: true },
    { ...newPortAnalysisChart(run, 'flow-output', [...group('quay'), ...group('yard'), ...group('gate')]), title: '箱流接续 · 各环节完成量', metric: 'output', chart: 'bar', group: 'type', baseline: true },
    { ...newPortAnalysisChart(run, 'yard-stock', group('storage')), title: '堆场积压 · 库存与容量', metric: 'inventory', chart: 'line', group: 'type', baseline: true },
  ] };
}
/** Saved UI definitions are allowlisted data; simulation statistics are rebuilt by command replay. */
export function decodePortAnalysis(value: unknown, run: PortClassLab, lesson: PortClassLesson): PortAnalysisDashboard {
  if (value === undefined) return defaultPortAnalysis(run, lesson);
  const v = value as PortAnalysisDashboard, ids = new Set(portStatisticsResources(run.simulation!).map(r => r.id));
  if (!v || v.version !== 1 || !Array.isArray(v.charts) || v.charts.length > 12) throw Error('分析台配置无效，最多保留12张图。');
  const unique = new Set<string>();
  return { version: 1, charts: v.charts.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.id) || unique.has(c.id) || typeof c.title !== 'string' || c.title.length > 80 ||
      !Array.isArray(c.resources) || !c.resources.length || c.resources.length > 32 || new Set(c.resources).size !== c.resources.length || c.resources.some(id => !ids.has(id)) ||
      !Object.hasOwn(ANALYSIS_METRICS, c.metric) || !allowedAnalysisCharts(c.metric).includes(c.chart) || !['all', 'recent30', 'custom'].includes(c.window) ||
      !Number.isFinite(c.fromMinute) || !Number.isFinite(c.toMinute) || c.fromMinute < run.checkpoint || c.toMinute > run.endpoint || c.toMinute <= c.fromMinute ||
      ![1, 5, 10, 15].includes(c.binMinutes) || !['individual', 'type'].includes(c.group) || !['half', 'full'].includes(c.width) || typeof c.baseline !== 'boolean' ||
      c.resources.some(id => id.startsWith('storage-') !== (c.metric === 'inventory'))) throw Error('图表对象、指标或观察区间无效。');
    unique.add(c.id);
    return { id: c.id, title: c.title, resources: [...c.resources], metric: c.metric, chart: c.chart, window: c.window, fromMinute: c.fromMinute, toMinute: c.toMinute, binMinutes: c.binMinutes, group: c.group, width: c.width, baseline: c.baseline };
  }) };
}
