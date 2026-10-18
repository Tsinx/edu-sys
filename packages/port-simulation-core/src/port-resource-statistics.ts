import type { PortJob, PortSession } from './port-operations-model.js';
import { physicalResourceCapacities } from './port-facilities.js';

export const PORT_RESOURCE_STATISTICS_VERSION = 'port-resource-statistics/1' as const;
export const PORT_RESOURCE_STATES = {
  service: { label: '吊装／核验', color: '#247f80' },
  loaded: { label: '重载运输', color: '#3375ac' },
  empty: { label: '空驶', color: '#82b8c5' },
  reposition: { label: '移机／转场', color: '#9a83ae' },
  'wait-road': { label: '道路／作业区等待', color: '#da9854' },
  'wait-vehicle': { label: '等待接箱车辆', color: '#bf733e' },
  'wait-handoff': { label: '等待吊装／下道交接', color: '#d3b86a' },
  idle: { label: '待派工', color: '#c5d4c9' },
  unstaffed: { label: '岗位／可投入能力不足', color: '#9ba6ae' },
  disabled: { label: '业务暂停／额度用尽', color: '#657785' },
  fault: { label: '设备故障', color: '#bd5e60' },
} as const;
export type PortResourceState = keyof typeof PORT_RESOURCE_STATES;
export type PortResourceKind = 'quay' | 'vehicle' | 'yard' | 'gate' | 'storage';
export interface PortResource {
  id: string;
  label: string;
  kind: PortResourceKind;
  index: number;
  sceneId: string;
  capacity?: number;
}
export interface PortResourceInterval {
  from: number;
  to: number;
  state: PortResourceState;
  occupied: boolean;
  reason: string;
  job?: number;
  box?: string;
  content?: number;
}
export interface PortResourceCompletion {
  at: number;
  start: number;
  resource: string;
  job: number;
  box: string;
  from: string;
  to: string;
}
export interface PortResourceStatistics {
  version: typeof PORT_RESOURCE_STATISTICS_VERSION;
  from: number;
  through: number;
  resources: { resource: PortResource; intervals: PortResourceInterval[] }[];
  completions: PortResourceCompletion[];
}

/** Stable IDs match scene selections, and survive baseline/trial forks. */
export function portStatisticsResources(s: PortSession): PortResource[] {
  const f = s.facilities;
  if (!f) return [];
  return [
    ...f.quayCranes.map(v => ({ id: `crane-${v.id}`, sceneId: `crane-${v.id}`, label: `岸桥 ${v.id + 1}`, kind: 'quay' as const, index: v.id })),
    ...f.vehicles.map(v => ({ id: `vehicle-${v.id}`, sceneId: `vehicle-${v.id}`, label: v.external ? `外集卡 ${v.id - s.plan.equipment.vehicles + 1}` : `场内车 ${v.id + 1}`, kind: 'vehicle' as const, index: v.id })),
    ...f.yardMachines.map(v => ({ id: `yard-crane-${v.id}`, sceneId: `yard-crane-${v.id}`, label: `场桥 ${v.id + 1}`, kind: 'yard' as const, index: v.id })),
    ...Array.from({ length: s.plan.equipment.gates }, (_, index) => ({ id: `gate-lane-${index}`, sceneId: 'gate-1', label: `闸口通道 ${index + 1}`, kind: 'gate' as const, index })),
    ...s.plan.yards.map((y, index) => ({ id: `storage-${y.id}`, sceneId: y.id, label: y.name, kind: 'storage' as const, index, capacity: y.capacity })),
  ];
}

/** Collection begins at the teaching checkpoint, independently of any charts. */
export function startPortResourceStatistics(s: PortSession) {
  s.resourceStatistics = {
    version: PORT_RESOURCE_STATISTICS_VERSION, from: s.second, through: s.second,
    resources: portStatisticsResources(s).map(resource => ({ resource, intervals: [] })), completions: [],
  };
}

type Observation = Omit<PortResourceInterval, 'from' | 'to'>;
function observe(s: PortSession, r: PortResource, capacities: ReturnType<typeof physicalResourceCapacities>, content: Map<string, number>): Observation {
  const f = s.facilities!;
  const vehicle = r.kind === 'vehicle' ? f.vehicles[r.index] : undefined;
  const j = s.jobs.find(j => r.kind === 'vehicle' ? j.physical?.carrier === r.index :
    r.kind !== 'storage' && j.kind === (r.kind === 'quay' ? 'quay' : r.kind) && j.resource === r.index);
  const p = j?.physical;
  const base = { occupied: !!j || !!vehicle?.loadedBox, ...(j ? { job: j.id, ...(!j.physical?.parking&&j.boxId?{box:j.boxId}:{}) } : vehicle?.loadedBox ? { box: vehicle.loadedBox } : {}) };
  const state = (state: PortResourceState, reason: string): Observation => ({ ...base, state, reason });
  if (r.kind === 'storage') return { state: 'idle', occupied: false, reason: '逐箱记录中的实际堆存；交接位和车载箱另计。', content: content.get(s.plan.yards[r.index]!.id) ?? 0 };
  if(r.kind==='yard'&&f.yardIncident?.failed===r.index&&f.yardIncident.retreat)return {...state('reposition','安全退出至独立隔离检修位；未进行箱交接。'),occupied:true};
  // An active vehicle segment finishes at its safe destination even after new dispatch is disabled.
  if (j && p) {
    if (r.kind === 'vehicle') {
      if (p.stage === 'road-wait' || p.stage === 'traffic-wait') return state('wait-road', p.stage === 'road-wait' ? '等待道路预约时隙。' : '道路被其他作业封闭，等待放行。');
      if (j.rate > 0 && (p.stage === 'empty' || p.stage === 'haul')) return state(p.stage === 'empty' ? 'empty' : 'loaded', p.parking ? '驶入待命／待接区，清空当前交接位。' : p.stage === 'empty' ? '空车驶向接箱交接位。' : '载箱驶向下一交接位。');
      if (j.rate > 0) return state('wait-handoff', p.stage === 'service' ? '车辆被当前吊装或闸口核验占用。' : '等待配套设备移机、转场或清空作业区。');
    } else {
      if (p.stage === 'empty' || p.stage === 'haul' || (p.stage === 'road-wait' || p.stage === 'traffic-wait') && p.nextStage !== 'machine') return state('wait-vehicle', '已派任务，等待其接箱车辆完成行驶。');
      if (p.stage === 'work-wait' || p.stage === 'road-wait' || p.stage === 'traffic-wait') return state('wait-road', '等待作业区道路清空或转场通道放行。');
      if (j.rate > 0 && (p.stage === 'crane' || p.stage === 'machine')) return state('reposition', p.parking ? j.kind==='yard'?'场桥空载返回指定作业区；未进行箱交接。':'吊装后沿轨返回待命位置。' : '沿轨移机或场桥转场至本次作业位置。');
      if (j.rate > 0 && p.stage === 'service') return state('service', r.kind === 'gate' ? '执行实际闸口核验。' : '执行实际吊装与交接。');
    }
  }
  if (r.kind === 'quay' && f.quayShift) return { ...state('reposition', '岸桥沿同一轨道协同移机。'), occupied: true };
  if (r.kind === 'quay' && s.failedCrane === r.index) return state('fault', '模拟记录已登记岸桥故障。');
  if (r.kind === 'yard' && f.yardIncident?.failed === r.index && (f.yardIncident.mode === 'fault' || f.yardIncident.trialRemaining <= 0)) return state('fault', f.yardIncident.trialCompleted >= 3 ? '实际试吊额度完成，等待复工审查。' : '保护停机；当前安全交接结束后不再接新任务，等待维修和复工验证。');
  const kind = r.kind === 'vehicle' ? 'truck' : r.kind;
  const berth = r.index < s.plan.equipment.dispatch.berthCranes[0] ? 0 : 1;
  const enabled = kind === 'quay' ? f.enabled.quay[berth] : f.enabled[kind as 'truck' | 'yard' | 'gate'];
  if (!enabled || r.kind === 'gate' && f.gateLimit === 0) return state('disabled', '对应业务未启用或受控交付额度已经用尽。');
  const handover = f.staffHandover?.[kind as 'quay' | 'truck' | 'yard' | 'gate'].includes(r.index);
  if (!vehicle?.external && !handover && r.index >= capacities[kind as keyof typeof capacities]) return state('unstaffed', '该设备未获得岗位或可投入能力；包括司机、操作员及配套设施限制。');
  if (vehicle?.loadedBox) return state('wait-handoff', handover ? '开局减员后的原有载箱任务仍在岗交接；交接结束返回待命位后撤岗。' : '车辆实际载箱，尚未获得下一道运输或交接任务。');
  if (j) return state('disabled', '当前任务的执行条件未满足；需结合岗位与业务状态核查。');
  return state('idle', '当前未获派任务；需结合箱流、交接位与配套设备判断原因。');
}

/** Called by the engine for each exact event-to-event span BEFORE its clock moves. */
export function accruePortResourceStatistics(s: PortSession, delta: number) {
  const stats = s.resourceStatistics;
  if (!stats || !s.facilities || delta <= 0) return;
  const content = new Map<string, number>();
  for (const box of Object.values(s.boxes)) if (box.location.startsWith('yard:')) {
    const id = box.location.slice(5); content.set(id, (content.get(id) ?? 0) + 1);
  }
  const capacities = physicalResourceCapacities(s);
  for (const entry of stats.resources) {
    const observation = observe(s, entry.resource, capacities, content), last = entry.intervals.at(-1);
    if (last && last.to === s.second && last.state === observation.state && last.occupied === observation.occupied &&
      last.job === observation.job && last.box === observation.box && last.reason === observation.reason && last.content === observation.content) last.to += delta;
    else entry.intervals.push({ from: s.second, to: s.second + delta, ...observation });
  }
  stats.through = s.second + delta;
}

/** Cargo completion, never an empty parking move or a partially completed phase. */
export function completePortResourceStatistics(s: PortSession, j: PortJob) {
  if (!s.resourceStatistics) return;
  s.resourceStatistics.completions.push({ at: s.second, start: j.start, resource: j.kind === 'quay' ? `crane-${j.resource}` : j.kind === 'truck' ? `vehicle-${j.resource}` : j.kind === 'yard' ? `yard-crane-${j.resource}` : `gate-lane-${j.resource}`, job: j.id, box: j.boxId, from: j.from, to: j.to });
}

export interface PortResourceWindow { from: number; to: number }
export interface PortResourceSummary {
  resource: PortResource;
  seconds: number;
  occupiedSeconds: number;
  states: Record<PortResourceState, number>;
  completed: number;
  cycles: number[];
  inventorySeconds: number;
}
export const emptyPortResourceStates = () => Object.fromEntries(Object.keys(PORT_RESOURCE_STATES).map(k => [k, 0])) as Record<PortResourceState, number>;
export function portResourceWindow(stats: PortResourceStatistics, from = stats.from, to = stats.through): PortResourceWindow {
  const start = Math.max(stats.from, Math.min(stats.through, from));
  return { from: start, to: Math.max(start, Math.min(stats.through, to)) };
}
/** Half-open state intervals; cargo completions use (from,to], so bin boundaries count once. */
export function summarizePortResources(stats: PortResourceStatistics, ids: readonly string[], range: PortResourceWindow = { from: stats.from, to: stats.through }): PortResourceSummary[] {
  const window = portResourceWindow(stats, range.from, range.to);
  return stats.resources.filter(r => ids.includes(r.resource.id)).map(({ resource, intervals }) => {
    const out: PortResourceSummary = { resource, seconds: window.to - window.from, occupiedSeconds: 0, states: emptyPortResourceStates(), completed: 0, cycles: [], inventorySeconds: 0 };
    for (const item of intervals) {
      const overlap = Math.max(0, Math.min(window.to, item.to) - Math.max(window.from, item.from));
      out.states[item.state] += overlap;
      if (item.occupied) out.occupiedSeconds += overlap;
      out.inventorySeconds += (item.content ?? 0) * overlap;
    }
    for (const event of stats.completions) if (event.resource === resource.id && event.at > window.from && event.at <= window.to) { out.completed++; out.cycles.push(event.at - event.start); }
    return out;
  });
}
export interface PortResourceBin extends PortResourceWindow { rows: PortResourceSummary[] }
export function binPortResources(stats: PortResourceStatistics, ids: readonly string[], range: PortResourceWindow, binSeconds: number): PortResourceBin[] {
  if (!Number.isFinite(binSeconds) || binSeconds < 60) throw Error('统计分段至少为1模拟分钟。');
  const window = portResourceWindow(stats, range.from, range.to), bins: PortResourceBin[] = [];
  for (let from = window.from; from < window.to; from += binSeconds) {
    const to = Math.min(window.to, from + binSeconds);
    bins.push({ from, to, rows: summarizePortResources(stats, ids, { from, to }) });
  }
  return bins;
}
