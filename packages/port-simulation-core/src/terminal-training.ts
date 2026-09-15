import {
  applyTerminalCommand, createTerminalSetup, createTerminalState, terminalChannelVessel,
  terminalCommandIssue, terminalComplete, terminalMetrics, terminalVesselProgress,
  TERMINAL_SCENARIOS, type TerminalCommand, type TerminalOperation, type TerminalScenario,
  type TerminalSetup, type TerminalState, validateTerminalSetup
} from "./terminal-lab.js";

export const TERMINAL_TRAINING_SCRIPT = "normal-flow/1.0";
export type TerminalTrainingMode = "practice" | "battle";
export type TrainingStatus = "ready" | "running" | "paused" | "completed" | "interrupted";
export type ProcessStatus = "pending" | "waiting" | "executing" | "resolved";
export type TrainingOrder = Exclude<TerminalCommand, { kind: "tick" | "advance" | "answer" }>;
export type TrainingCommand = { kind: "start" | "resume" | "pause" | "interrupt" }
  | { kind: "tick"; seconds: number }
  | { kind: "order"; order: TrainingOrder; eventId?: string };
export interface ProcessEvent {
  id: string; title: string; entity: string; step: number; occurredAt: number;
  status: ProcessStatus; reason: string; noticed: boolean; completedAt?: number;
  order: TrainingOrder;
}
export interface TrainingObservation {
  second: number; admittedAt: [number | null, number | null]; secured: [boolean, boolean];
  unloaded: [number, number]; queues: [number, number, number]; delivered: number;
  operations: TerminalState["operations"]; dispatch: TerminalSetup["dispatch"];
}
export interface TrainingAttempt {
  second: number; eventId: string; order: TrainingOrder;
  outcome: "applied" | "waiting" | "incorrect" | "stale" | "invalid";
  rule: string; message: string; deduction: number; before: TrainingObservation;
}
export interface TerminalTraining {
  script: typeof TERMINAL_TRAINING_SCRIPT; mode: TerminalTrainingMode; status: TrainingStatus;
  simulation: TerminalState; events: ProcessEvent[]; attempts: TrainingAttempt[];
  notifications: Array<{ id: string; second: number; text: string }>;
  timeline: Array<{ second: number; eventId: string; status: ProcessStatus; reason: string }>;
  commands: TrainingCommand[]; pauseReason: string;
}
const clone = <T>(value: T): T => structuredClone(value);
const second = (s: TerminalState) => Math.round(s.minute * 60);
const eps = 1e-7;
export function createNormalTrainingSetup(scenario: TerminalScenario = "regular") {
  const setup = createTerminalSetup(scenario); setup.vehicles = 12; setup.dispatch.drivers = 12; return setup;
}
/** Copy only model fields so exported plans cannot carry identity metadata. */
function cleanSetup(s: TerminalSetup): TerminalSetup {
  const { scenario, crane, vehicle, yardMachine, gateSystem, cranes, vehicles, yardMachines, gates } = s;
  const { berthCranes, craneOperators, drivers, yardOperators, gateClerks, technicians, priority } = s.dispatch;
  return { scenario, crane, vehicle, yardMachine, gateSystem, cranes, vehicles, yardMachines, gates,
    dispatch: { berthCranes: [...berthCranes], craneOperators, drivers, yardOperators, gateClerks, technicians, priority },
    facilities: s.facilities.map(({ id, kind, col, row, rotation }) => ({ id, kind, col, row, rotation })) };
}
export function createTerminalTraining(mode: TerminalTrainingMode = "practice", setup = createNormalTrainingSetup()): TerminalTraining {
  if (mode !== "practice" && mode !== "battle") throw new Error("未知场次规则");
  const errors = validateTerminalSetup(setup); if (errors.length) throw new Error(errors.join("；"));
  const session: TerminalTraining = { script: TERMINAL_TRAINING_SCRIPT, mode, status: "ready",
    simulation: createTerminalState(cleanSetup(setup)), events: [], attempts: [], notifications: [], timeline: [], commands: [], pauseReason: "" };
  refreshEvents(session); return session;
}
export function trainingObservation(s: TerminalState): TrainingObservation {
  return clone({ second: second(s), admittedAt: s.operations.admittedAt, secured: s.operations.secured,
    unloaded: s.unloaded, queues: s.queues, delivered: s.delivered, operations: s.operations, dispatch: s.setup.dispatch });
}
export function trainingOrderEvent(order: TrainingOrder): string {
  if (order.kind === "harbor") return `${order.vessel === 0 ? "a" : "b"}-${order.action}`;
  if (order.kind === "operate") return order.target === "crane-a" ? "a-quay" : order.target === "crane-b" ? "b-quay" : order.target;
  return order.kind;
}
export function trainingOrderLabel(order: TrainingOrder) {
  if (order.kind === "harbor") return `${order.action === "admit" ? "放行" : "确认系泊"}船 ${order.vessel ? "B" : "A"}`;
  if (order.kind === "operate") return `${order.running ? "启动" : "停止"}${({ "crane-a": "A 泊位岸桥", "crane-b": "B 泊位岸桥", transport: "水平运输", yard: "堆场接箱", gate: "闸口交付" })[order.target]}`;
  return order.kind === "stop" ? "全港停工" : "调整设备与人员调度";
}
/** A resource block is a wait, never a procedural mistake. */
export function trainingOrderBlock(s: TerminalState, order: TrainingOrder): string {
  if (order.kind === "harbor") {
    if (order.action === "admit" && s.operations.admittedAt[order.vessel] === null) {
      const occupied = terminalChannelVessel(s);
      return occupied === undefined ? "" : `航道由船 ${occupied ? "B" : "A"} 占用；继续运行，等待其抵达泊位。`;
    }
    return "";
  }
  if (order.kind !== "operate" || !order.running) return "";
  const m = terminalMetrics(s.setup, s.minute, s.repairWork);
  const target = order.target;
  if (target === "crane-a" || target === "crane-b") {
    const i = target === "crane-a" ? 0 : 1;
    if (!m.craneRates[i]) return "岸桥能力为零：检查分配台数、操作员、故障与船宽适配；进入资源调度调整。";
    if (s.queues[0] >= 60 - eps) return "岸侧缓存已满：启动水平运输并继续运行，等待接箱。";
  } else if (target === "transport") {
    if (!m.rates[1]) return "没有可出勤车辆：检查车辆、司机或监管员与供能设施；进入资源调度调整。";
    if (s.queues[1] >= 40 - eps) return "运输交接区已满：启用堆场接箱并继续运行。";
  } else if (target === "yard") {
    if (!m.rates[2]) return "没有可用场桥班组：检查场桥、操作员与堆场作业位；进入资源调度调整。";
    if (s.queues[2] >= m.storage - eps) return "堆场缓存已满：启用闸口交付并继续运行。";
  } else if (target === "gate" && !m.rates[3]) return "没有可用闸口：检查车道、核验人员与陆侧设施；进入资源调度调整。";
  return "";
}
function refreshEvents(session: TerminalTraining) {
  const s = session.simulation; const o = s.operations; const unloaded = s.unloaded[0] + s.unloaded[1];
  const hauled = unloaded - s.queues[0]; const stacked = s.queues[2] + s.delivered;
  for (const i of [0, 1] as const) {
    const id = `unloaded-${i}`;
    if (s.unloaded[i] >= TERMINAL_SCENARIOS[s.setup.scenario].cargo[i] - eps && !session.notifications.some(n => n.id === id))
      session.notifications.push({ id, second: second(s), text: `船 ${i ? "B" : "A"} 卸船完成，可按剩余任务重新分配岸桥。` });
  }
  if (terminalComplete(s) && !session.notifications.some(n => n.id === "delivered")) session.notifications.push({ id: "delivered", second: second(s), text: "全部货物已通过闸口交付，全量交付奖励 +10 分。" });
  const definitions: Array<{ id: string; title: string; entity: string; step: number; trigger: boolean; done: boolean; order: TrainingOrder }> = [];
  for (const i of [0, 1] as const) {
    const letter = i ? "b" : "a"; const name = i ? "B" : "A";
    definitions.push(
      { id: `${letter}-admit`, title: `船 ${name} 到港 · 安排进港`, entity: `vessel-${letter}`, step: 0, trigger: true, done: o.admittedAt[i] !== null, order: { kind: "harbor", vessel: i, action: "admit" } },
      { id: `${letter}-secure`, title: `船 ${name} 抵达 · 完成靠泊准备`, entity: `berth-${letter}`, step: 1, trigger: terminalVesselProgress(s, i) === 1, done: o.secured[i], order: { kind: "harbor", vessel: i, action: "secure" } },
      { id: `${letter}-quay`, title: `泊位 ${name} · 组织装卸作业`, entity: `crane-${letter}`, step: 2, trigger: o.secured[i], done: s.unloaded[i] > eps, order: { kind: "operate", target: i ? "crane-b" : "crane-a", running: true } });
  }
  definitions.push(
    { id: "transport", title: "岸侧待运箱 · 安排水平运输", entity: "transport", step: 3, trigger: unloaded > eps, done: hauled > eps, order: { kind: "operate", target: "transport", running: true } },
    { id: "yard", title: "交接区待入场箱 · 安排堆场接箱", entity: s.setup.facilities.find(f => f.kind === "yard" || f.kind === "reefer")?.id ?? "yard-1", step: 4, trigger: hauled > eps, done: stacked > eps, order: { kind: "operate", target: "yard", running: true } },
    { id: "gate", title: "堆场待交付箱 · 组织闸口交付", entity: s.setup.facilities.find(f => f.kind === "gate")?.id ?? "gate-1", step: 5, trigger: stacked > eps, done: s.delivered > eps, order: { kind: "operate", target: "gate", running: true } });
  const attention: string[] = [];
  for (const d of definitions) {
    if (!d.trigger) continue;
    let event = session.events.find(e => e.id === d.id);
    if (!event) { event = { id: d.id, title: d.title, entity: d.entity, step: d.step, order: d.order, occurredAt: second(s), status: "pending", reason: "", noticed: false }; session.events.push(event); }
    if (event.status === "resolved") continue;
    const block = trainingOrderBlock(s, d.order);
    const executing = d.order.kind === "operate" && o[d.order.target];
    const status: ProcessStatus = d.done ? "resolved" : block ? "waiting" : executing ? "executing" : "pending";
    const reason = d.done ? d.order.kind === "operate" ? "已验证实际箱流，节点完成 +10 分。" : "已验证现场状态，节点完成 +10 分。"
      : block || (executing ? "指令已生效，继续运行以验证实际作业。" : "条件具备，请下达作业指令。");
    if (event.status !== status || event.reason !== reason) session.timeline.push({ second: second(s), eventId: event.id, status, reason });
    event.status = status; event.reason = reason;
    if (d.done) event.completedAt = second(s);
    // Pre-armed crews need no extra click or pause. Conditions are checked after each physical second.
    if (status === "pending" && !event.noticed && session.status !== "ready") { event.noticed = true; attention.push(event.title); }
  }
  if (terminalComplete(s) || s.minute >= 480) { session.status = "completed"; session.pauseReason = terminalComplete(s) ? "全部货物交付完成" : "480 分钟班次结束"; }
  else if (session.mode === "practice" && attention.length && session.status === "running") { session.status = "paused"; session.pauseReason = attention.join("；"); }
}
export function trainingScore(session: TerminalTraining) {
  const nodes = session.events.filter(e => e.status === "resolved").length;
  const deliveryBonus = terminalComplete(session.simulation) ? 10 : 0;
  const deductions = session.attempts.reduce((n, a) => n + a.deduction, 0);
  return { nodes, earned: nodes * 10 + deliveryBonus, deliveryBonus, deductions, total: Math.max(0, nodes * 10 + deliveryBonus - deductions) };
}
function cleanOrder(raw: TrainingOrder): TrainingOrder {
  if (!raw || typeof raw !== "object") throw new Error("处置指令无效");
  if (raw.kind === "harbor" && (raw.vessel === 0 || raw.vessel === 1) && (raw.action === "admit" || raw.action === "secure")) return { kind: raw.kind, vessel: raw.vessel, action: raw.action };
  if (raw.kind === "operate" && ["crane-a", "crane-b", "transport", "yard", "gate"].includes(raw.target) && typeof raw.running === "boolean") return { kind: raw.kind, target: raw.target, running: raw.running };
  if (raw.kind === "stop") return { kind: "stop" };
  if (raw.kind === "dispatch" && raw.value && Array.isArray(raw.value.berthCranes)) {
    const { berthCranes, craneOperators, drivers, yardOperators, gateClerks, technicians, priority } = raw.value;
    return { kind: "dispatch", value: { berthCranes: [...berthCranes], craneOperators, drivers, yardOperators, gateClerks, technicians, priority } };
  }
  throw new Error("处置指令格式无效，不计流程错误");
}
function judge(session: TerminalTraining, order: TrainingOrder, context?: string): TrainingAttempt {
  const s = session.simulation; const eventId = trainingOrderEvent(order);
  const result: TrainingAttempt = { second: second(s), eventId, order, outcome: "applied", rule: "accepted", message: "指令已执行；节点得分以现场状态和实际箱流为准。", deduction: 0, before: trainingObservation(s) };
  const reject = (outcome: TrainingAttempt["outcome"], rule: string, message: string) => Object.assign(result, { outcome, rule, message });
  if (["ready", "completed", "interrupted"].includes(session.status)) return reject("stale", "inactive-session", "场次尚未开始或已经结束，请开始新场次。");
  if (context && !session.events.some(e => e.id === context && e.status !== "resolved")) return reject("stale", "expired-event", "这张待办已完成或已过期，请查看当前队列。");
  if (order.kind === "harbor") {
    const i = order.vessel;
    if (order.action === "admit" && s.operations.admittedAt[i] !== null || order.action === "secure" && s.operations.secured[i]) return reject("stale", "duplicate", "该指令已经完成，无需重复下达。");
    if (order.action === "secure" && terminalVesselProgress(s, i) < 1) return reject("incorrect", "moor-before-arrival", "船舶尚未抵达泊位，不能确认系泊。先放行，并等待引航完成。");
  }
  if (order.kind === "operate") {
    if (s.operations[order.target] === order.running) return reject("stale", "duplicate", "该班组已处于所选状态。继续运行或调整资源即可。");
    if (order.running && (order.target === "crane-a" || order.target === "crane-b")) {
      const i = order.target === "crane-a" ? 0 : 1;
      if (!s.operations.secured[i]) return reject("incorrect", "crane-before-mooring", "船舶尚未完成系泊，不能启动岸桥。等待抵达并确认系泊后再开工。");
      if (s.unloaded[i] >= TERMINAL_SCENARIOS[s.setup.scenario].cargo[i] - eps) return reject("stale", "already-unloaded", "该船已卸毕，可将岸桥调往另一泊位。");
    }
  }
  if (order.kind === "dispatch") {
    const errors = validateTerminalSetup({ ...s.setup, dispatch: order.value });
    if (errors.length) return reject("invalid", "invalid-resource-form", errors.join("；"));
  } else {
    const block = trainingOrderBlock(s, order);
    if (block) return reject("waiting", "resource-block", block);
    const issue = terminalCommandIssue(s, order);
    if (issue) return reject("waiting", "resource-block", issue);
  }
  return result;
}
export function applyTrainingCommand(current: TerminalTraining, command: TrainingCommand): TerminalTraining {
  if (!command || typeof command !== "object") throw new Error("场次指令无效");
  if (current.commands.length >= 4096 && command.kind !== "tick") throw new Error("本次记录已满，请导出复盘并开始新场次。");
  if (command.kind === "tick") {
    if (!Number.isInteger(command.seconds) || command.seconds < 1 || command.seconds > 28800) throw new Error("推进时间须为 1–28,800 秒");
    if (current.status !== "running") return current;
    const next = clone(current);
    next.simulation = applyTerminalCommand(next.simulation, command, s => { next.simulation = s; refreshEvents(next); return next.status !== "running"; });
    const consumed = second(next.simulation) - second(current.simulation);
    const previous = next.commands.at(-1);
    if (previous?.kind === "tick" && previous.seconds + consumed <= 28800) previous.seconds += consumed;
    else if (consumed) next.commands.push({ kind: "tick", seconds: consumed });
    return next;
  }
  const next = clone(current);
  if (command.kind === "order") {
    const order = cleanOrder(command.order);
    if (command.eventId !== undefined && (typeof command.eventId !== "string" || !/^(?:[ab]-(?:admit|secure|quay)|transport|yard|gate)$/.test(command.eventId))) throw new Error("待办编号无效");
    const result = judge(next, order, command.eventId);
    if (result.outcome === "incorrect" && next.mode === "battle" && !next.attempts.some(a => a.eventId === result.eventId && a.rule === result.rule && a.deduction > 0)) result.deduction = 5;
    if (result.outcome === "applied") next.simulation = applyTerminalCommand(next.simulation, order);
    next.attempts.push(result); next.commands.push({ kind: "order", order, ...(command.eventId ? { eventId: command.eventId } : {}) });
    refreshEvents(next); return next;
  }
  if (!["start", "resume", "pause", "interrupt"].includes(command.kind)) throw new Error("场次指令无效");
  if (command.kind === "interrupt") {
    if (next.status === "ready" || next.status === "completed" || next.status === "interrupted") return current;
    next.status = "interrupted"; next.pauseReason = "场次已中断，保留本次记录；可从原方案重新挑战。";
  } else if (command.kind === "pause") {
    if (next.mode === "battle" || next.status !== "running") return current;
    next.status = "paused"; next.pauseReason = "手动暂停";
  } else {
    if (command.kind === "start" && next.status !== "ready" || command.kind === "resume" && next.status !== "paused") return current;
    next.status = "running"; next.pauseReason = ""; refreshEvents(next);
  }
  next.commands.push({ kind: command.kind }); return next;
}
export function serializeTraining(session: TerminalTraining) {
  return JSON.stringify({ schema: "terminal-training/1.0", script: session.script, mode: session.mode,
    setup: cleanSetup(session.simulation.initialSetup), commands: session.commands,
    review: { status: session.status, score: trainingScore(session), events: session.events, attempts: session.attempts, timeline: session.timeline, notifications: session.notifications } });
}
/** Recompute all evidence and scores. Exported review fields are informative, never trusted inputs. */
export function restoreTraining(raw: string): TerminalTraining {
  if (raw.length > 2_000_000) throw new Error("复盘文件过大");
  const data = JSON.parse(raw);
  if (data?.schema !== "terminal-training/1.0" || data.script !== TERMINAL_TRAINING_SCRIPT || !["practice", "battle"].includes(data.mode) || !data.setup || !Array.isArray(data.commands) || data.commands.length > 4096) throw new Error("训练复盘版本或指令记录无效");
  let session = createTerminalTraining(data.mode, data.setup); let total = 0;
  for (const command of data.commands) {
    if (command?.kind === "tick") { total += command.seconds; if (!Number.isFinite(total) || total > 28800) throw new Error("场次推进时间超出范围"); }
    session = applyTrainingCommand(session, command);
  }
  return session;
}
/** Opening a saved battle is a review. It cannot resume as a live competitive attempt. */
export function suspendRestoredTraining(session: TerminalTraining) {
  return applyTrainingCommand(session, { kind: session.mode === "battle" ? "interrupt" : "pause" });
}
export function trainingStorageKey(scope: string, scenario: TerminalScenario, mode: TerminalTrainingMode) {
  return `edu-terminal-training:${scope}:${scenario}:${mode}:${TERMINAL_TRAINING_SCRIPT}`;
}
