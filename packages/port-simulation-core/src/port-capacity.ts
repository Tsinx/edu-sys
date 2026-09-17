import { createPortCourse } from './port-course.js';
import { applyPortCommand, portCargoDone, portActiveResources } from './port-operations-engine.js';
import type { PortCommand, PortSession } from './port-operations-model.js';

export const PORT_CAPACITY_VERSION = 'port-capacity/1.0';
export const PORT_CAPACITY_PLANS = {
  A: { cranes: 2, drivers: 2 }, B: { cranes: 3, drivers: 2 },
  C: { cranes: 2, drivers: 4 }, D: { cranes: 2, drivers: 8 }, E: { cranes: 2, drivers: 12 }
} as const;
export type PortCapacityPlan = keyof typeof PORT_CAPACITY_PLANS;
export interface CapacitySample {
  elapsed: number; unloaded: number; loaded: number; delivered: number;
  quay: number; waitingTransport: number; yardHandoff: number; yard: number;
  active: { quay: number; truck: number; yard: number; gate: number };
  available: ReturnType<typeof portActiveResources>;
}
export interface CapacityRun {
  version: typeof PORT_CAPACITY_VERSION; plan: PortCapacityPlan; session: PortSession;
  startSecond: number; started: boolean; complete: boolean; samples: CapacitySample[];
  commands: Array<{ kind: 'advance'; seconds: number }>;
}
function act(s: PortSession, command: PortCommand) {
  const result = applyPortCommand(s, command, false);
  if (result.outcome !== 'applied' && result.outcome !== 'stale') throw new Error(result.message);
}
export function isCapacityPlan(value: unknown): value is PortCapacityPlan {
  return typeof value === 'string' && Object.hasOwn(PORT_CAPACITY_PLANS, value);
}
export function createCapacityRun(plan: PortCapacityPlan): CapacityRun {
  if (!isCapacityPlan(plan)) throw new Error('未知对照方案。');
  const s = createPortCourse('cargo').simulation;
  act(s, { kind: 'start' });
  act(s, { kind: 'dispatch', dispatch: { ...s.plan.equipment.dispatch, berthCranes: [0, 0], drivers: 0, yardOperators: 0, gateClerks: 0 } });
  for (const b of Object.values(s.batches)) {
    act(s, { kind: 'assign-yard', batchId: b.id, yardId: b.flow === 'import' ? b.id.endsWith('1') ? 'Y1' : 'Y2' : b.id.endsWith('1') ? 'Y3' : 'Y4' });
    act(s, { kind: 'batch-document', batchId: b.id, value: b.reference });
  }
  for (let i = 0; i < 100 && Object.values(s.batches).some(b => b.document.status !== 'approved'); i++) act(s, { kind: 'advance', seconds: 30 });
  if (s.config.seed !== 20260932 || s.jobs.length || Object.values(s.batches).some(b => b.document.status !== 'approved') || Object.values(s.boxes).some(b => b.issueExpected)) throw new Error('第5讲冻结起点发生变化，请重新核验实验。');
  act(s, { kind: 'pause' });
  const r: CapacityRun = { version: PORT_CAPACITY_VERSION, plan, session: s, startSecond: s.second, started: false, complete: false, samples: [], commands: [] };
  r.samples.push(observeCapacityRun(r));
  return r;
}
export function observeCapacityRun(r: CapacityRun): CapacitySample {
  const s = r.session, boxes = Object.values(s.boxes);
  const inTransport = new Set(s.jobs.filter(j => j.kind === 'truck').map(j => j.boxId));
  return {
    elapsed: s.second - r.startSecond,
    unloaded: boxes.filter(b => b.unloadedAt !== null).length,
    loaded: boxes.filter(b => b.loadedAt !== null).length,
    delivered: boxes.filter(b => b.deliveredAt !== null).length,
    quay: boxes.filter(b => b.location.startsWith('quay:')).length,
    waitingTransport: boxes.filter(b => b.location.startsWith('quay:') && !inTransport.has(b.id)).length,
    yardHandoff: boxes.filter(b => b.location.startsWith('handoff:')).length,
    yard: boxes.filter(b => b.location.startsWith('yard:') || b.location.startsWith('pickup:')).length,
    active: Object.fromEntries(['quay', 'truck', 'yard', 'gate'].map(kind => [kind, s.jobs.filter(j => j.kind === kind && j.rate > 0).length])) as CapacitySample['active'],
    available: portActiveResources(s)
  };
}
export function capacityElapsed(r: CapacityRun): number | null {
  if (!r.complete) return null;
  return Math.max(...Object.values(r.session.boxes).map(b => r.session.batches[b.batchId]!.flow === 'import' ? b.unloadedAt! : b.loadedAt!)) - r.startSecond;
}
export function advanceCapacityRun(r: CapacityRun, seconds: number) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400) throw new Error('推进秒数应为1—86400之间的整数。');
  if (r.complete) return;
  const s = r.session;
  if (!r.started) {
    const p = PORT_CAPACITY_PLANS[r.plan];
    act(s, { kind: 'dispatch', dispatch: { ...s.plan.equipment.dispatch, berthCranes: [p.cranes, 0], drivers: p.drivers, yardOperators: 4, gateClerks: 2 } });
    act(s, { kind: 'resume' });
    act(s, { kind: 'work', callId: 'S01', running: true });
    r.started = true;
  }
  const target = Math.min(r.startSecond + 86400, s.second + seconds);
  while (s.second < target && !portCargoDone(s, 'S01')) {
    const nextSample = r.startSecond + (Math.floor((s.second - r.startSecond) / 30) + 1) * 30;
    const nextEvent = Math.min(...s.jobs.map(j => j.end ?? Infinity), ...s.events.map(e => e.at).filter(at => at > s.second));
    const step = Math.min(target - s.second, nextSample - s.second, Math.max(1, nextEvent - s.second));
    const before = s.second;
    act(s, { kind: 'advance', seconds: step });
    if (s.second <= before) throw new Error('时钟未推进；本次运行未完成。');
    if ((s.second - r.startSecond) % 30 === 0 || portCargoDone(s, 'S01') || s.second === target) {
      const sample = observeCapacityRun(r);
      if (r.samples.at(-1)?.elapsed !== sample.elapsed) r.samples.push(sample);
    }
  }
  r.complete = portCargoDone(s, 'S01');
  r.commands.push({ kind: 'advance', seconds });
}
export function nextCapacityStop(r: CapacityRun): number {
  const elapsed = r.session.second - r.startSecond;
  return [3600, 7200, 14400, 28800, 43200, 57600, 86400].find(t => t > elapsed) ?? 86400;
}
export function serializeCapacityRun(r: CapacityRun) {
  return JSON.stringify({ version: r.version, engine: r.session.schema, plan: r.plan, commands: r.commands });
}
export function restoreCapacityRun(raw: string): CapacityRun {
  if (raw.length > 300000) throw new Error('实验记录过大。');
  const data = JSON.parse(raw);
  if (data.version !== PORT_CAPACITY_VERSION || data.engine !== 'port-operations/3.1' || !isCapacityPlan(data.plan) || !Array.isArray(data.commands) || data.commands.length > 2000) throw new Error('实验记录版本或方案不匹配。');
  const r = createCapacityRun(data.plan);
  for (const c of data.commands) {
    if (!c || c.kind !== 'advance' || !Number.isInteger(c.seconds)) throw new Error('实验记录包含未知命令。');
    advanceCapacityRun(r, c.seconds);
  }
  return r;
}
export function capacityView(r: CapacityRun) {
  return { version: r.version, plan: r.plan, configuration: PORT_CAPACITY_PLANS[r.plan], started: r.started, complete: r.complete, elapsed: capacityElapsed(r), observation: observeCapacityRun(r), samples: r.samples };
}
export type CapacityView = ReturnType<typeof capacityView>;
