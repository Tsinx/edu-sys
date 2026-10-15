import {
  applyTerminalCommand, createTerminalSetup, createTerminalState, terminalCommandIssue,
  terminalComplete, terminalMetrics, terminalVesselProgress,
  type TerminalCommand, type TerminalDispatch, type TerminalState,
} from './terminal-lab.js';

/** Versioned short classroom experiments. Queue physics comes from the terminal engine.
 * Cargo is a continuous box-equivalent flow, not a ledger of individual containers. */
export const PORT_CLASS_LAB_VERSION = 'port-class-lab/1.0' as const;
export type PortClassLesson = 11 | 12;
export type PortLabKind = 'baseline' | 'trial' | 'incident';
export interface PortLabIncident {
  recorded: boolean; isolated: boolean; scope: 'gate' | 'all';
  backupVerified: boolean; manual: boolean; manualDelivered: number;
  repairStarted: boolean; repairWork: number; dataChecked: boolean;
  testing: boolean; testDelivered: number; testPassed: boolean;
  restoredAt: number | null;
}
export type PortLabCommand =
  | { kind: 'advance'; minutes: number }
  | { kind: 'dispatch'; value: TerminalDispatch }
  | { kind: 'record' }
  | { kind: 'isolate'; scope: 'gate' | 'all' }
  | { kind: 'audit'; quarantine: string[] }
  | { kind: 'manual' | 'repair' | 'reconcile' | 'test' | 'restore' | 'resume-internal' };
export interface PortLabEvent { minute: number; text: string; kind: 'operation' | 'checkpoint' | 'recovery' }
export interface PortClassLab {
  version: typeof PORT_CLASS_LAB_VERSION; lesson: PortClassLesson; kind: PortLabKind;
  checkpoint: number; endpoint: number; terminal: TerminalState;
  initialCost: number; initialWaiting: number; initialDelivered: number;
  deliveredAtDeadline: number | null; incident: PortLabIncident | null;
  commands: PortLabCommand[]; events: PortLabEvent[]; feedback: string;
}
export const PORT_LAB_LEDGER = [
  { id: 'R1', ticket: 'T01', version: 18, declared: 12, independent: 12 },
  { id: 'R2', ticket: 'T02', version: 18, declared: 18, independent: 18 },
  { id: 'R3', ticket: 'T02', version: 18, declared: 18, independent: 18 },
  { id: 'R4', ticket: 'T04', version: 17, declared: 10, independent: 12 },
  { id: 'R5', ticket: 'T05', version: 18, declared: 8, independent: 8 },
] as const;
const copy = <T>(v: T): T => structuredClone(v);
const finiteInteger = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && Number(v) >= min && Number(v) <= max;

function preparedTerminal(lesson: PortClassLesson) {
  const setup = createTerminalSetup('regular');
  if (lesson === 11) Object.assign(setup.dispatch, { drivers: 2, gateClerks: 1, technicians: 0 });
  let s = createTerminalState(setup);
  // Preparation uses the existing harbor commands, with ordinary admission/berthing complete.
  for (let n = 0; n < 120 && !s.operations.secured.every(Boolean); n++) {
    for (const vessel of [0, 1] as const) {
      const admit: TerminalCommand = { kind: 'harbor', vessel, action: 'admit' };
      if (s.operations.admittedAt[vessel] === null && !terminalCommandIssue(s, admit)) s = applyTerminalCommand(s, admit);
      if (terminalVesselProgress(s, vessel) === 1 && !s.operations.secured[vessel]) s = applyTerminalCommand(s, { kind: 'harbor', vessel, action: 'secure' });
    }
    if (!s.operations.secured.every(Boolean)) s = applyTerminalCommand(s, { kind: 'tick', seconds: 60 });
  }
  if (!s.operations.secured.every(Boolean)) throw new Error('短实验预置靠泊失败。');
  for (const target of ['crane-a', 'crane-b', 'transport', 'yard', 'gate'] as const) s = applyTerminalCommand(s, { kind: 'operate', target, running: true });
  const checkpoint = lesson === 11 ? 120 : 90;
  s = applyTerminalCommand(s, { kind: 'tick', seconds: Math.round((checkpoint - s.minute) * 60) });
  if (lesson === 12) s = applyTerminalCommand(s, { kind: 'operate', target: 'gate', running: false });
  return s;
}
export function createPortClassLab(lesson: PortClassLesson, kind?: PortLabKind): PortClassLab {
  if (lesson !== 11 && lesson !== 12) throw new Error('未知课堂实验。');
  const resolved = kind ?? (lesson === 11 ? 'baseline' : 'incident');
  if (lesson === 11 && !['baseline', 'trial'].includes(resolved) || lesson === 12 && resolved !== 'incident') throw new Error('实验类型与讲次不一致。');
  const terminal = preparedTerminal(lesson);
  return {
    version: PORT_CLASS_LAB_VERSION, lesson, kind: resolved, checkpoint: terminal.minute, endpoint: lesson === 11 ? 360 : 240,
    terminal, initialCost: terminal.cost, initialWaiting: terminal.waitingBoxMinutes, initialDelivered: terminal.delivered,
    deliveredAtDeadline: null,
    incident: lesson === 12 ? { recorded: false, isolated: false, scope: 'gate', backupVerified: false, manual: false, manualDelivered: 0, repairStarted: false, repairWork: 0, dataChecked: false, testing: false, testDelivered: 0, testPassed: false, restoredAt: null } : null,
    commands: [], events: [{ minute: terminal.minute, kind: 'checkpoint', text: lesson === 11 ? '载入第120分钟拥堵检查点；300箱同一货流，入港与系泊已完成。' : '第90分钟闸口接口失去可信记录，电子交付已暂停；设备及内部箱流仍可运行。' }],
    feedback: '预置现场已就绪。先查看队列、岗位和任务书，再下达操作。',
  };
}
export function portLabFinished(r: PortClassLab) { return r.terminal.minute >= r.endpoint - 1e-7 || terminalComplete(r.terminal); }
function note(r: PortClassLab, text: string, kind: PortLabEvent['kind'] = 'operation') {
  r.feedback = text; r.events.push({ minute: r.terminal.minute, text, kind });
}
function advance(r: PortClassLab, minutes: number) {
  const seconds = Math.min(Math.round(minutes * 60), Math.round((r.endpoint - r.terminal.minute) * 60));
  if (seconds <= 0 || terminalComplete(r.terminal)) return;
  const incident = r.incident;
  let previousDelivery = r.terminal.delivered;
  r.terminal = applyTerminalCommand(r.terminal, { kind: 'tick', seconds }, s => {
    if (incident) {
      if (incident.repairStarted && incident.repairWork < 60) {
        incident.repairWork = Math.min(60, incident.repairWork + s.setup.dispatch.technicians / 60);
        if (incident.repairWork >= 60 - 1e-7) {
          incident.repairWork = 60;
          r.events.push({ minute: s.minute, kind: 'recovery', text: '技术恢复完成；可信数据、受控试运行与恢复审查仍待完成。' });
        }
      }
      const amount = Math.max(0, s.delivered - previousDelivery);
      if (incident.manual || incident.testing) {
        const before = incident.manual ? incident.manualDelivered : incident.testDelivered;
        const cap = incident.manual ? 24 : 3;
        const accepted = Math.min(amount, Math.max(0, cap - before));
        // Only independently verified manifests can leave the gate. Preserve stock exactly.
        s.delivered -= amount - accepted; s.queues[2] += amount - accepted;
        if (incident.manual) { incident.manualDelivered += accepted; s.cost += 2 * .035 / 60; }
        else incident.testDelivered += accepted;
        if (before + accepted >= cap - 1e-7) {
          s.operations.gate = false;
          if (incident.manual) {
            incident.manual = false;
            r.events.push({ minute: s.minute, kind: 'checkpoint', text: '24箱当量的已核验备用额度用完，交付自动暂停。' });
          } else {
            incident.testing = false; incident.testPassed = true;
            r.events.push({ minute: s.minute, kind: 'recovery', text: '3箱当量受控试运行完成，交接流量与核验额度一致；可申请恢复。' });
          }
        }
      }
    }
    previousDelivery = s.delivered;
    if (r.lesson === 11 && s.minute >= 300 && r.deliveredAtDeadline === null) r.deliveredAtDeadline = s.delivered;
    return false;
  });
}
export function applyPortClassLabCommand(current: PortClassLab, command: PortLabCommand): PortClassLab {
  if (!command || typeof command !== 'object') throw new Error('无效实验指令。');
  if (current.commands.length >= 600) throw new Error('操作记录已满，请导出后重开本讲。');
  if (portLabFinished(current)) throw new Error('本次观察已结束。请保存结果或从检查点建立新试验。');
  const r = copy(current), incident = r.incident;
  if (command.kind === 'advance') {
    if (!finiteInteger(command.minutes, 1, 360)) throw new Error('推进量须为1至360个模拟分钟。');
    advance(r, command.minutes);
    note(r, portLabFinished(r) ? '观察结束；请同时查看已交付、未交付、在制积压和成本。' : `推进后已到第${r.terminal.minute.toFixed(1)}分钟。队列与费用已按实际运行更新。`);
  } else if (command.kind === 'dispatch') {
    if (r.lesson === 11 && r.kind === 'baseline') throw new Error('基准保持预置配置。请保存基准后在试验分支调整岗位。');
    if (r.lesson === 11 && r.terminal.minute !== r.checkpoint) throw new Error('试验岗位须在同一检查点设置；已运行后请建立新分支。');
    if (incident && (incident.repairStarted || incident.manual || incident.testing || incident.restoredAt !== null)) throw new Error('当前恢复阶段岗位已锁定；可在启动维修前配置。');
    r.terminal = applyTerminalCommand(r.terminal, { kind: 'dispatch', value: command.value });
    note(r, '岗位安排已生效。有效能力、人员成本与实际排队将随运行改变。');
  } else {
    if (!incident) throw new Error('该指令只用于第12讲信息中断实验。');
    const running = (gate: boolean) => { r.terminal.operations.gate = gate; };
    if (command.kind === 'record') {
      if (incident.recorded) throw new Error('事件已记录。');
      incident.recorded = true; note(r, '事件证据已固定：闸口记录不可依赖，最后可信快照为第75分钟；内部设备未发生物理故障。');
    } else if (command.kind === 'isolate') {
      if (!['gate', 'all'].includes(command.scope) || incident.isolated) throw new Error('隔离范围无效或本次接口已隔离。');
      incident.isolated = true; incident.scope = command.scope; running(false);
      if (command.scope === 'all') for (const target of ['crane-a', 'crane-b', 'transport', 'yard'] as const) r.terminal.operations[target] = false;
      note(r, command.scope === 'all' ? '已隔离接口并暂停全部内部箱流；停工将真实减少后续处理量。' : '已隔离闸口接口，保留独立的船岸、运输与堆场作业。');
    } else if (command.kind === 'resume-internal') {
      if (!incident.isolated) throw new Error('先确认受影响的接口边界。');
      for (const target of ['crane-a', 'crane-b', 'transport', 'yard'] as const) r.terminal.operations[target] = true;
      note(r, '已恢复非受影响的内部箱流；闸口仍按核验状态限制。');
    } else if (command.kind === 'audit') {
      if (!incident.isolated || incident.backupVerified) throw new Error('先隔离接口；本次备用记录只需核验一次。');
      if (r.endpoint-r.terminal.minute<10) throw new Error('观察终点前不足10分钟，无法完成本次核验。');
      if (!Array.isArray(command.quarantine) || command.quarantine.length !== 2 || new Set(command.quarantine).size !== 2 || !['R3', 'R4'].every(id => command.quarantine.includes(id))) throw new Error('核对未通过：请检查重复票号、记录版本，以及申报量与独立记录是否一致。');
      advance(r, 10); incident.backupVerified = true;
      note(r, '独立记录核验完成，异常行已隔离；可使用24箱当量的双人核验备用额度。核验耗时10模拟分钟。');
    } else if (command.kind === 'manual') {
      if (!incident.isolated || !incident.backupVerified || incident.manualDelivered >= 24 - 1e-7 || incident.testing || incident.restoredAt !== null) throw new Error('备用交付需要接口隔离、独立记录核验及剩余额度。');
      if (r.terminal.setup.dispatch.gateClerks < 1) throw new Error('备用闸口至少需要1名闸口岗位人员。');
      if (terminalMetrics(r.terminal.setup).personnel + 2 > 26) throw new Error('双人复核还需2名独立人员，本班总量不得超过26人。');
      incident.manual = true; r.terminal.setup.dispatch.gateClerks = 1; running(true);
      note(r, '单道备用交付已启用：上限22箱当量/时，总额度24箱当量，另计2名复核人员成本。');
    } else if (command.kind === 'repair') {
      if (!incident.isolated || incident.repairStarted || r.terminal.setup.dispatch.technicians < 1) throw new Error('先隔离接口并配置技术人员；维修不能重复启动。');
      incident.repairStarted = true; note(r, '技术恢复已启动，需要60人分钟；可推进时钟观察进度，并维持经核验的备用交付。');
    } else if (command.kind === 'reconcile') {
      if (incident.repairWork < 60 || !incident.backupVerified || incident.dataChecked || incident.restoredAt !== null) throw new Error('技术恢复完成且独立记录已核验后，才能进行一次系统对账。');
      if (r.endpoint-r.terminal.minute<10) throw new Error('观察终点前不足10分钟，无法完成本次对账。');
      incident.manual = false; running(false); advance(r, 10); incident.dataChecked = true;
      note(r, '恢复记录已与独立基准对账，重复与旧版本已排除。耗时10模拟分钟；电子交付仍待受控试运行。');
    } else if (command.kind === 'test') {
      if (!incident.dataChecked || incident.testing || incident.testPassed || incident.restoredAt !== null) throw new Error('先完成恢复记录对账，再启动一次受控试运行。');
      if (r.terminal.setup.dispatch.gateClerks < 1) throw new Error('试运行需要闸口岗位。');
      incident.testing = true; r.terminal.setup.dispatch.gateClerks = 1; running(true);
      note(r, '受控试运行已开始，最多交付3箱当量；推进时钟，核对真实完成量后才能恢复。');
    } else if (command.kind === 'restore') {
      if (!incident.recorded || !incident.isolated || !incident.dataChecked || !incident.testPassed || incident.restoredAt !== null) throw new Error('恢复未获通过：需事件记录、接口隔离、可信对账和实际完成的受控试运行。');
      incident.restoredAt = r.terminal.minute; incident.manual = false;
      r.terminal.setup.dispatch.gateClerks = 2; running(true);
      note(r, '已恢复双道电子交付；恢复时点已记录。剩余积压仍须通过实际作业消化。', 'recovery');
    } else throw new Error('不支持的实验指令。');
  }
  r.commands.push(copy(command));
  return r;
}
export function portClassLabMetrics(r: PortClassLab) {
  const s = r.terminal, delivered = s.delivered - r.initialDelivered, cost = s.cost - r.initialCost;
  const elapsed = s.minute - r.checkpoint;
  return {
    minute: s.minute, elapsed, delivered, cumulativeDelivered: s.delivered, remaining: Math.max(0, 300 - s.delivered),
    unloaded: s.unloaded[0] + s.unloaded[1], queues: [...s.queues] as [number, number, number],
    waitingBoxMinutes: s.waitingBoxMinutes - r.initialWaiting,
    averageInProcess: elapsed > 0 ? (s.waitingBoxMinutes - r.initialWaiting) / elapsed : null,
    cost, costPerDelivered: delivered > 1e-7 ? cost / delivered : null,
    deadlineShare: r.deliveredAtDeadline === null ? null : r.deliveredAtDeadline / 300,
    capacities: terminalMetrics(s.setup, s.minute, s.repairWork).rates,
    recoveryMinutes: r.incident?.restoredAt === null || !r.incident ? null : r.incident.restoredAt - r.checkpoint,
    dataExposureMinutes: r.lesson === 12 ? 15 : null,
  };
}
export function serializePortClassLab(r: PortClassLab) {
  return { version: r.version, lesson: r.lesson, kind: r.kind, commands: copy(r.commands) };
}
export function restorePortClassLab(value: unknown, expectedLesson: PortClassLesson): PortClassLab {
  if (!value || typeof value !== 'object') throw new Error('实验记录格式无效。');
  const v = value as ReturnType<typeof serializePortClassLab>;
  if (v.version !== PORT_CLASS_LAB_VERSION || v.lesson !== expectedLesson || !Array.isArray(v.commands) || v.commands.length > 600) throw new Error('实验版本、讲次或记录长度不匹配。');
  let r = createPortClassLab(v.lesson, v.kind);
  for (const command of v.commands) r = applyPortClassLabCommand(r, command);
  return r;
}
export function portLabCsv(runs: readonly PortClassLab[]) {
  const rows: (string | number | null)[][] = [['讲次','分支','观察分钟','新增交付箱当量','未交付箱当量','岸侧队列','运输接续队列','堆场队列','等待箱分钟','新增成本','单位交付成本','恢复耗时分钟']];
  for (const r of runs) { const m = portClassLabMetrics(r); rows.push([r.lesson,r.kind,m.minute,m.delivered,m.remaining,...m.queues,m.waitingBoxMinutes,m.cost,m.costPerDelivered,m.recoveryMinutes]); }
  return '\ufeff' + rows.map(row => row.map(v => v === null ? '' : `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
}

