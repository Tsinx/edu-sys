import { advancePortSession, applyPortCommand } from './port-operations-engine.js';
import { refreshPhysicalRates, returnPhysicalYardMachine } from './port-facilities.js';
import { PORT_LAB_LEDGER } from './port-class-lab-legacy.js';
import type { PortSession } from './port-operations-model.js';
import type { TerminalState } from './terminal-lab.js';
import type { PortClassLab, PortLabCommand, PortLabEvent, PortLabTimedTask } from './port-class-lab.js';

export type PortLabScenario = 'system' | 'equipment';
export const PORT_LAB_SCENARIOS = {
  system: { title: '系统中断与可信恢复', description: '从交付校验异常出发，查清依赖、核验备用记录，比较隔离与恢复方案。', minutes: 30, repairWork: 60 },
  equipment: { title: '关键场桥故障与替代作业', description: '从场桥保护告警出发，完成安全隔离、替代转场、维修与实际试吊。', minutes: 30, repairWork: 90 },
} as const;
export type PortIncidentCommand =
  | { kind: 'inspect'; target: 'scope' | 'logs' | 'backup' | 'mechanical' }
  | { kind: 'repair-team'; people: 1 | 2 }
  | { kind: 'relief'; enabled: boolean };
export interface PortIncidentClue { id: string; minute: number; source: string; text: string }
export interface PortIncidentScenario {
  version: 1;
  evidence: { scope: boolean; logs: boolean; backup: boolean; mechanical: boolean };
  clues: PortIncidentClue[];
  reports: number[];
  repairTarget: number;
  technicalAt: number | null;
  isolatedAt: number | null;
  checkedAt: number | null;
  trialAt: number | null;
  reliefUsed: boolean;
  reliefReturning: boolean;
  reliefReturned: boolean;
}
type Snapshot = (s: PortSession) => TerminalState;
const delivered = (s: PortSession) => Object.values(s.boxes).filter(b => b.deliveredAt !== null).length;
function sync(r: PortClassLab, snapshot: Snapshot) {
  const samples = r.terminal.samples;
  r.terminal = snapshot(r.simulation!); r.terminal.samples = samples;
}
function note(r: PortClassLab, text: string, kind: PortLabEvent['kind'] = 'operation') {
  if(r.events.at(-1)?.text.startsWith('已到第'))r.events.pop();
  r.feedback = text; r.events.push({ minute: r.simulation!.second / 60, text, kind });
}
function clue(r: PortClassLab, id: string, source: string, text: string) {
  if (r.emergency!.clues.some(c => c.id === id)) return;
  r.emergency!.clues.push({ id, minute: r.simulation!.second / 60, source, text });
  note(r, `${source}：${text} 已暂停推进，请检查新证据。`, 'checkpoint');
}
function setGate(r: PortClassLab, on: boolean, limit: number | null) {
  const s = r.simulation!; s.facilities!.enabled.gate = on; s.facilities!.gateLimit = limit;
  for (const j of s.jobs.filter(j => j.kind === 'gate' && j.to === 'delivered' && j.remaining <= 1e-8)) { j.remaining = 1; j.updatedAt = s.second; }
  refreshPhysicalRates(s);
}
export function preparePortIncidentScenario(r: PortClassLab, scenario: PortLabScenario) {
  r.scenario = scenario;
  r.emergency = { version: 1, evidence: { scope: false, logs: false, backup: false, mechanical: false }, clues: [], reports: [], repairTarget: PORT_LAB_SCENARIOS[scenario].repairWork, technicalAt: null, isolatedAt: null, checkedAt: null, trialAt: null, reliefUsed: false, reliefReturning: false, reliefReturned: false };
  const s = r.simulation!;
  s.facilities!.drainCommitted=true;
  if (scenario === 'equipment') {
    s.facilities!.enabled.gate = true;
    const machine = s.facilities!.yardMachines[0]!;
    s.facilities!.yardIncident = { failed: 0, yard: machine.yard, isolated: false, mode: 'fault', trialRemaining: 0, trialCompleted: 0, relief: null, reliefHome: s.facilities!.yardMachines[2]!.yard, reliefActive: false, returnRequested: false };
    refreshPhysicalRates(s);
  }
  r.events = [];
  clue(r, 'initial', scenario === 'system' ? '闸口值班报告' : '设备保护告警', scenario === 'system'
    ? '电子交付校验连续失败，电子放行已保护性暂停。原因、影响范围和可用恢复点待检查。'
    : '场桥1触发保护停机，不再接收新任务；已承诺的交接先安全收尾。故障原因和其他设备状态待检查。');
}
function startTask(r: PortClassLab, kind: PortLabTimedTask['kind'], minutes: number) {
  if (r.endpoint - r.simulation!.second / 60 < minutes) throw Error('观察终点前的剩余时间不足以完成此项检查。');
  r.pendingTask = { kind, startedAt: r.simulation!.second, completesAt: r.simulation!.second + minutes * 60 };
  note(r, `已开始${minutes}分钟${{ scope: '独立现场检查', logs: '接口日志追查', backup: '备用资料调取', mechanical: '设备诊断', secure: '安全隔离', audit: '独立记录核验', reconcile: r.scenario === 'equipment' ? '维修后安全检查' : '恢复记录对账' }[kind]}；现场与维修按模拟时间继续，完成节点自动暂停。`);
}
function finishTask(r: PortClassLab, kind: PortLabTimedTask['kind']) {
  const e = r.emergency!, i = r.incident!, s = r.simulation!, f = s.facilities!;
  if (kind === 'scope') {
    e.evidence.scope = true;
    clue(r, kind, '独立现场检查', r.scenario === 'system'
      ? '岸桥、场桥、场内车控制正常；异常集中于电子交付接口，内部作业不依赖该放行记录。'
      : '闸口及其余设备控制正常；场桥1不再接新任务。检查车辆等待和Y1交接位，判断影响是否向上游传播。');
  } else if (kind === 'logs') {
    e.evidence.logs = true;
    clue(r, kind, '接口日志与独立时钟', '第90分钟起电子交付记录失去可信性；最后可信快照为第75分钟。记录暴露窗口15分钟，超过RPO 10分钟目标，最终丢失量仍需重建证据。');
  } else if (kind === 'backup') {
    e.evidence.backup = true;
    clue(r, kind, '备用台账已调取', '可信版本为18。票号、版本和独立数量已经取得；须逐行判断，重复、旧版本及数量差异不能直接带入备用交付。');
  } else if (kind === 'mechanical') {
    e.evidence.mechanical = true;
    clue(r, kind, '场桥1诊断记录', '驱动控制保护异常。教学维修工作量90人分钟；故障设备保持停用。RTG场桥3可作为替代，但转场、道路预约及原作业区能力损失均需计入。');
  } else if (kind === 'secure') {
    i.isolated = true; e.isolatedAt = s.second / 60; f.yardIncident!.isolated = true;
    clue(r, kind, '隔离检查回执', '场桥1已安全清空当前交接并隔离检修区；可派维修人员。教学情境设定独立检修区，替代场桥仍须沿道路实际转场。');
  } else if (kind === 'audit') {
    i.backupVerified = true;
    clue(r, kind, '独立核验回执', '保留记录满足唯一票号、可信版本及独立数量一致。最多24箱备用交付可按双人复核流程执行。');
  } else {
    i.dataChecked = true; e.checkedAt = s.second / 60;
    clue(r, kind, r.scenario === 'equipment' ? '维修后检查回执' : '恢复对账回执', r.scenario === 'equipment'
      ? '维修后安全检查通过。替代场桥须完成当前任务并返回原区，再由场桥1实际完成3次箱交接，才能审查复工。'
      : '独立记录对账通过。技术工作与对账均已完成；仍需3箱实际闸口试放行后审查恢复。');
  }
}
function releaseReport(r: PortClassLab, at: number) {
  const s = r.simulation!, boxes = Object.values(s.boxes), loaded = s.facilities!.vehicles.filter(v => v.loadedBox).length;
  const yard = boxes.filter(b => b.location.startsWith('yard:') && b.deliveredAt === null).length;
  r.emergency!.reports.push(at);
  clue(r, `report-${at}`, at === 95 ? '车辆调度回报' : '堆场与交付回报', at === 95
    ? `当前${loaded}辆车实际载箱，${s.jobs.filter(j => j.kind === 'truck').length}项运输任务。结合车辆时间轴核查接续等待，勿把全部占用解释为运输产出。`
    : `当前实际堆存${yard}箱，检查点以来新增交付${delivered(s) - r.initialDelivered}箱。队列、库存与设备状态已更新，可检验隔离或替代方案的影响。`);
}
function progressReliefReturn(r:PortClassLab):boolean {
  const s=r.simulation!,outage=s.facilities!.yardIncident,e=r.emergency!;
  if(!outage?.returnRequested||outage.relief===null)return false;
  if(!returnPhysicalYardMachine(s,outage.relief,outage.reliefHome))return false;
  outage.returnRequested=false;outage.reliefActive=false;outage.relief=null;
  e.reliefReturning=false;e.reliefReturned=true;
  clue(r,'relief-returned','替代场桥调度回执','替代场桥已实际返回原作业区；故障区清空，可进行场桥1受控试吊。');
  return true;
}
function advanceScenario(r: PortClassLab, seconds: number, snapshot: Snapshot) {
  const s = r.simulation!, e = r.emergency!, i = r.incident!, end = Math.min(r.endpoint * 60, s.second + seconds);
  while (s.second < end) {
    const f = s.facilities!, outage = f.yardIncident;
    progressReliefReturn(r);
    const nextReport = [95, 110].filter(m => !e.reports.includes(m) && m * 60 > s.second).map(m => m * 60);
    const repairSeconds = i.repairStarted && i.repairWork < e.repairTarget ? Math.ceil((e.repairTarget - i.repairWork) / s.plan.equipment.dispatch.technicians * 60 - 1e-8) : Infinity;
    const nextJob = Math.min(...s.jobs.map(j => j.end ?? Infinity));
    const amount = Math.min(end - s.second, 600 - s.second % 600, repairSeconds, (r.pendingTask?.completesAt ?? Infinity) - s.second, ...nextReport.map(t => t - s.second), Math.max(1, nextJob - s.second));
    const before = delivered(s), start = s.second;
    advancePortSession(s, Math.max(1, amount), false, false);
    let checkpoint = false;
    if (i.repairStarted && i.repairWork < e.repairTarget) {
      i.repairWork = Math.min(e.repairTarget, i.repairWork + s.plan.equipment.dispatch.technicians * (s.second - start) / 60);
      if (i.repairWork >= e.repairTarget - 1e-7) {
        i.repairWork = e.repairTarget; e.technicalAt = s.second / 60; checkpoint = true;
        clue(r, 'technical', '维修回执', '技术工作完成；恢复审查尚未通过。还须完成检查及实际受控交接。');
      }
    }
    if (r.scenario === 'system' && (i.manual || i.testing)) {
      const increase = delivered(s) - before;
      if (i.manual) {
        i.manualDelivered += increase;
        const last = Math.max(start, ...Object.values(s.boxes).flatMap(b => b.deliveredAt !== null && b.deliveredAt > start ? [b.deliveredAt] : []));
        const active = f.gateLimit === 0 ? last - start : s.second - start;
        s.effort.personSeconds += 2 * active; s.cost += 2 * active * 2.1 / 3600;
      } else i.testDelivered += increase;
      if (f.gateLimit === 0) {
        checkpoint = true;
        if (i.manual) { i.manual = false; clue(r, 'manual-complete', '备用交付回执', '24箱备用额度已实际交付完毕。后续电子交付仍须满足恢复证据。'); }
        else { i.testing = false; i.testPassed = true; clue(r, 'trial-complete', '试放行回执', '3箱已实际完成提箱、运输及闸口核验；可审查服务恢复。'); }
        f.enabled.gate = false; refreshPhysicalRates(s);
      }
    }
    if (r.scenario === 'equipment' && i.testing && outage!.trialCompleted >= 3) {
      i.testDelivered = outage!.trialCompleted; i.testing = false; i.testPassed = true; checkpoint = true;
      clue(r, 'trial-complete', '场桥1试吊回执', '场桥1已实际完成3次箱交接。试吊额度用尽，继续停用等待复工审查；空载转场未计入试吊。');
    } else if (r.scenario === 'equipment' && i.testing) i.testDelivered = outage!.trialCompleted;
    if (r.pendingTask && s.second >= r.pendingTask.completesAt) {
      const task = r.pendingTask; r.pendingTask = null; finishTask(r, task.kind); checkpoint = true;
    }
    for (const at of [95, 110]) if (!e.reports.includes(at) && s.second >= at * 60) { releaseReport(r, at); checkpoint = true; }
    // Finalize at the exact arrival event, including when it equals this tick's
    // endpoint. Deferring to the next tick would create a zero-second command.
    if(progressReliefReturn(r))checkpoint=true;
    sync(r, snapshot);
    if (s.second % 600 === 0 || s.second === r.endpoint * 60 || checkpoint) {
      const t = r.terminal, sample = { minute: t.minute, delivered: t.delivered, quay: t.queues[0], transit: t.queues[1], yard: t.queues[2] };
      if (t.samples.at(-1)?.minute !== t.minute) t.samples.push(sample);
    }
    if (checkpoint) return;
  }
  note(r, s.second >= r.endpoint * 60 ? '观察结束，请保存实际结果；未恢复也可完成失败处置复盘。' : `已到第${r.terminal.minute.toFixed(1)}分钟；设备、车辆、维修和成本按实际过程更新。`);
}
function validLedger(ids: string[]) {
  if (!Array.isArray(ids) || ids.length !== 2 || new Set(ids).size !== 2 || ids.some(id => !PORT_LAB_LEDGER.some(row => row.id === id))) return false;
  const retained = PORT_LAB_LEDGER.filter(row => !ids.includes(row.id));
  return retained.every(row => row.version === 18 && row.declared === row.independent) && ['T01', 'T02', 'T05'].every(ticket => retained.filter(row => row.ticket === ticket).length === 1);
}
export function applyPortIncidentCommand(current: PortClassLab, command: PortLabCommand, snapshot: Snapshot): PortClassLab {
  if (!command || typeof command !== 'object') throw Error('无效实验指令。');
  if (current.commands.length >= 600) throw Error('操作记录已满，请导出后建立新场次。');
  if (current.simulation!.second >= current.endpoint * 60) throw Error('观察已结束，可保留结果、完成复盘并从同一场景重开方案。');
  const r = structuredClone(current), s = r.simulation!, f = s.facilities!, i = r.incident!, e = r.emergency!, system = r.scenario === 'system';
  if (r.pendingTask && command.kind !== 'tick' && command.kind !== 'advance') throw Error('检查尚未完成，请继续耗时操作至完成节点；模拟暂停时检查不累计。');
  if (command.kind === 'tick' || command.kind === 'advance') {
    const amount = command.kind === 'tick' ? command.seconds : command.minutes * 60;
    if (!Number.isInteger(amount) || amount < 1 || amount > 21600 || command.kind === 'advance' && !Number.isInteger(command.minutes)) throw Error('推进量须为有效整数。');
    advanceScenario(r, amount, snapshot);
  } else if (command.kind === 'record') {
    if (i.recorded) throw Error('已固定当前事件证据。'); i.recorded = true;
    note(r, '已固定告警时点与当前现场；原因与范围须通过独立检查补充，证据回报会逐步出现。');
  } else if (command.kind === 'inspect') {
    const target = command.target;
    if (!['scope', ...(system ? ['logs', 'backup'] : ['mechanical'])].includes(target) || e.evidence[target]) throw Error('检查对象无效或已取得该证据。');
    if (target === 'logs' && !e.evidence.scope || target === 'backup' && !e.evidence.logs) throw Error('先取得上一步检查证据，再定位所需资料。');
    startTask(r, target, target === 'mechanical' ? 5 : target === 'logs' ? 4 : 3);
  } else if (command.kind === 'isolate') {
    if (!['gate', 'all'].includes(command.scope) || i.isolated) throw Error('隔离范围无效或已执行。');
    if (!i.recorded) throw Error('先固定当前告警证据。');
    if (!system && (!e.evidence.mechanical || s.jobs.some(j => j.kind === 'yard' && j.resource === f.yardIncident!.failed))) throw Error('先完成设备诊断，并等待场桥1当前交接安全结束。');
    i.scope = command.scope;
    if (command.scope === 'all') Object.assign(f.enabled, { quay: [false, false], truck: false, yard: false });
    if (system) { i.isolated = true; e.isolatedAt = s.second / 60; setGate(r, false, null); note(r, command.scope === 'all' ? '电子交付已隔离；全部内部新作业暂停，在途车辆完成安全路段。可补查范围后调整。' : '电子交付接口已隔离，其余内部业务保持独立作业。'); }
    else {
      startTask(r, 'secure', 2);
      const pose=f.yardMachines[f.yardIncident!.failed]!.pose;
      f.yardIncident!.retreat={start:s.second,end:s.second+120,from:{...pose},to:{...pose,x:pose.x-30,z:pose.z-14}};
    }
    refreshPhysicalRates(s);
  } else if (command.kind === 'resume-internal') {
    if (!i.isolated || !e.evidence.scope) throw Error('先取得独立范围证据并完成隔离。');
    Object.assign(f.enabled, { quay: [true, true], truck: true, yard: true }); refreshPhysicalRates(s);
    note(r, '恢复非受影响内部作业；故障设备或电子交付的恢复限制继续保留。');
  } else if (command.kind === 'repair-team') {
    if (![1, 2].includes(command.people) || i.repairStarted) throw Error('维修班组须在启动维修前选择1或2人。');
    const result = applyPortCommand(s, { kind: 'dispatch', dispatch: { ...s.plan.equipment.dispatch, technicians: command.people } }, false);
    if (result.outcome !== 'applied') throw Error(result.message);
    note(r, `维修班组已配置${command.people}人；工作量${e.repairTarget}人分钟，实际岗位成本随运行累计。`);
  } else if (command.kind === 'repair') {
    if (!i.isolated || i.repairStarted || !(system ? e.evidence.logs : e.evidence.mechanical) || s.plan.equipment.dispatch.technicians < 1) throw Error('维修需隔离完成、诊断证据及技术人员，且不能重复启动。');
    i.repairStarted = true; note(r, `启动${e.repairTarget}人分钟技术工作；检查、内部作业及备用方案可与维修并行推进。`);
  } else if (system && (command.kind === 'start-audit' || command.kind === 'audit')) {
    if (!i.isolated || !e.evidence.backup || i.backupVerified) throw Error('先隔离接口并调取备用资料，再核验一次。');
    if (!validLedger(command.quarantine)) throw Error('核验未通过：请逐行检查票号唯一性、版本和独立数量，当前选择仍保留异常或删除有效证据。');
    startTask(r, 'audit', 10);
  } else if (system && command.kind === 'manual') {
    if (!i.isolated || !i.backupVerified || i.manual || i.manualDelivered >= 24 || i.testing || i.restoredAt !== null) throw Error('备用交付需可信记录、隔离和剩余额度。');
    i.manual = true; s.plan.equipment.dispatch.gateClerks = 1; setGate(r, true, 24 - i.manualDelivered);
    note(r, '双人复核备用交付启用：单道、最多24箱，另计2名复核人员成本；每箱须实际提取、运输和核验。');
  } else if (!system && command.kind === 'relief') {
    if(typeof command.enabled!=='boolean')throw Error('替代调度状态须为布尔值。');
    const outage = f.yardIncident!;
    if (!i.isolated || i.testing || i.testPassed || i.restoredAt !== null) throw Error('替代场桥需安全隔离完成，并在试吊与正式复工前撤回。');
    if (command.enabled) {
      if (outage.relief !== null || e.reliefReturned) throw Error('本轮替代调度已启动或撤回。');
      outage.relief = 2; outage.reliefActive = true; e.reliefUsed = true;
      note(r, '场桥3改派故障作业区；先完成其原任务，再沿预约道路转场。Y3暂失该设备，代价将反映在实际箱流和图表中。');
    } else {
      if (outage.relief === null || outage.returnRequested) throw Error('尚无待撤回的替代场桥。');
      outage.returnRequested = true; outage.reliefActive = false; e.reliefReturning = true;
      note(r, '替代场桥停止接新任务；完成当前交接后沿道路返回原区，返回完成自动暂停。');
      progressReliefReturn(r);
    }
    refreshPhysicalRates(s);
  } else if (command.kind === 'start-reconcile' || command.kind === 'reconcile') {
    if (i.repairWork < e.repairTarget || system && !i.backupVerified || i.dataChecked || i.restoredAt !== null) throw Error('先完成技术工作及所需证据，再进行恢复检查。');
    if (system) { i.manual = false; setGate(r, false, null); }
    startTask(r, 'reconcile', system ? 10 : 5);
  } else if (command.kind === 'test') {
    if (!i.dataChecked || i.testing || i.testPassed || i.restoredAt !== null) throw Error('先完成维修后检查或恢复对账。');
    if (system) { i.manual = false; s.plan.equipment.dispatch.gateClerks = 1; setGate(r, true, 3); }
    else {
      const outage = f.yardIncident!;
      if (outage.relief !== null) throw Error('替代场桥尚未实际返回原区，请撤回并推进至返回节点。');
      if (!f.enabled.yard) throw Error('场桥业务仍暂停，请依据范围证据恢复内部独立作业。');
      outage.mode = 'trial'; outage.trialRemaining = 3; outage.trialCompleted = 0;
      returnPhysicalYardMachine(s,outage.failed,outage.yard);
      refreshPhysicalRates(s);
    }
    i.testing = true; e.trialAt = s.second / 60;
    note(r, system ? '3箱试放行已启动，须实际经过闸口；完成后自动暂停。' : '场桥1受控试吊已启动，须实际完成3次箱交接；移机、等待均计时，完成后自动暂停。');
  } else if (command.kind === 'restore') {
    if (!i.recorded || !i.isolated || !i.dataChecked || !i.testPassed || i.restoredAt !== null) throw Error('恢复未获通过：需告警证据、安全隔离、恢复检查及3次实际受控交接。');
    i.restoredAt = s.second / 60;
    if (system) { s.plan.equipment.dispatch.gateClerks = 2; setGate(r, true, null); }
    else { delete f.yardIncident; refreshPhysicalRates(s); }
    note(r, system ? '电子交付已通过恢复审查；服务恢复时点已记录，继续观察积压消化。' : '场桥1已通过复工审查；重新接收正常任务，继续检查故障期间积压及替代方案代价。', 'recovery');
  } else throw Error('该指令不适用于当前场景。');
  sync(r, snapshot);
  const logged = command.kind === 'tick' ? { ...command, seconds: s.second - current.simulation!.second } : structuredClone(command);
  const previous = r.commands.at(-1);
  if (logged.kind === 'tick' && previous?.kind === 'tick' && current.feedback.startsWith('已到第') && previous.seconds + logged.seconds <= 21600) previous.seconds += logged.seconds;
  else r.commands.push(logged);
  return r;
}

/** Only same fixture, rules and scenario may be used for plan comparison. */
export function comparablePortIncident(a: PortClassLab, b: PortClassLab) {
  return a.lesson === 12 && b.lesson === 12 && a.version === b.version && a.scenario === b.scenario && a.emergency?.version === b.emergency?.version && a.checkpoint === b.checkpoint && a.endpoint === b.endpoint;
}
