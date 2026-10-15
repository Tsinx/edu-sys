import type { PortClassLab } from '@edu/port-simulation-core';
import type { LabAttempt } from './port-class-notebook';

export interface IncidentNotice {
  id: string;
  minute: number;
  title: string;
  text: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  interrupt: boolean;
  order: number;
}

/** Read only actual, already observed events. Routine clock ticks are not bulletins. */
export function incidentNotices(run: PortClassLab, attempts: LabAttempt[]): IncidentNotice[] {
  const events = run.events.map((event, index) => ({ ...event, index })).filter(event => !event.text.startsWith('已到第'));
  return [
    ...events.map((event, index): IncidentNotice => {
      const initial = index === 0 && event.minute === run.checkpoint;
      const finished = event.text.startsWith('观察结束');
      const recovered = run.incident?.restoredAt != null;
      return {
        id: `event:${index}:${event.minute}:${event.text}`, minute: event.minute, text: event.text, order: event.index * 2,
        title: initial ? '故障通报' : event.kind === 'recovery' ? '恢复审查通过'
          : finished ? recovered ? '观察结束 · 已恢复' : '观察结束 · 尚未恢复'
          : event.kind === 'checkpoint' ? '现场与处置结果通报' : '处置指令已受理',
        tone: initial ? 'danger' : event.kind === 'recovery' ? 'success'
          : finished ? recovered ? 'success' : 'warning' : event.kind === 'checkpoint' ? 'warning' : 'info',
        interrupt: initial || finished || event.kind === 'checkpoint' || event.kind === 'recovery',
      };
    }),
    ...attempts.map((attempt, index): IncidentNotice => ({
      id: `rejected:${index}:${attempt.minute}:${attempt.message}`, minute: attempt.minute, order: (attempt.afterEvent ?? run.events.length) * 2 - 1,
      title: '处置未执行', text: attempt.message, tone: 'danger', interrupt: true,
    })),
  ].sort((a, b) => a.minute - b.minute || a.order - b.order);
}

export const INCIDENT_TEACHING_STAGES = ['识别告警', '独立检查', '隔离与连续性', '技术处置', '验证恢复', '观察与复盘'];

export function incidentTeachingStep(run: PortClassLab) {
  const i = run.incident!, e = run.emergency, system = run.scenario !== 'equipment';
  const step = (index: number, action: string, question: string) => ({ index, title: INCIDENT_TEACHING_STAGES[index]!, action, question });
  if (run.terminal.minute >= run.endpoint) return step(5, '保存当前结果，完成复盘，再从同一开局比较另一方案。', '恢复、交付、等待和成本分别说明了什么？哪些工作仍未完成？');
  if (!i.recorded) return step(0, '先固定当前告警证据，再安排独立检查。', '告警直接证明了什么？原因和影响范围中还有哪些未知？');
  if (run.pendingTask) return step(run.pendingTask.kind === 'reconcile' ? 4 : run.pendingTask.kind === 'secure' ? 2 : run.pendingTask.kind === 'audit' ? 3 : 1,
    '检查正在计时；继续耗时操作，取得回执后再判断。中途现场回报可能先到。', '这项检查尚未完成，现在能够作出哪些判断？');
  if (e && (!e.evidence.scope || !(system ? e.evidence.logs : e.evidence.mechanical))) return step(1,
    system ? '完成独立范围检查和接口日志追查。' : '完成独立范围检查和场桥1诊断，观察原交接安全收尾。',
    '哪些业务已被证实受影响？哪些独立业务可以继续？');
  if (!i.isolated) return step(2, '根据已取得的证据选择隔离范围，并执行隔离。', '局部隔离与全部暂停各会产生什么影响？');
  if (!i.repairStarted) return step(3, '选择维修班组并启动技术工作；再决定是否采用连续性方案。', '维修投入、备用或替代作业之间有哪些依赖与代价？');
  if (system && e && !i.backupVerified) return step(3, '按需要调取并核验备用台账，决定是否使用有限备用交付。', '备用记录是否可信且独立？不使用备用会有什么影响？');
  if (i.repairWork < (e?.repairTarget ?? 60)) return step(3, '继续观察技术工作与实际作业；设备场景可评估替代场桥。', '技术工作、内部作业和连续性方案哪些能够并行？');
  if (!i.dataChecked) return step(4, system ? '技术工作已完成，仍须执行恢复记录对账。' : '技术工作已完成，仍须进行维修后安全检查。', '维修完成为什么还不足以证明业务已经恢复？');
  if (!system && e?.reliefUsed && !e.reliefReturned) return step(4, '撤回替代场桥，继续推进至实际返回，再启动场桥1试吊。', '撤回指令与实际返回有什么区别？原作业区付出了什么代价？');
  if (!i.testPassed) return step(4, i.testing ? '受控交接已启动；继续观察至3次实际交接完成。' : system ? '启动3箱实际试放行，再连续推进观察结果。' : '启动场桥1的3次实际试吊，再连续推进观察结果。', '哪些实际记录能证明受控验证通过？空载转场能否计入？');
  if (i.restoredAt === null) return step(4, '受控验证已经通过；核对证据后下达恢复审查指令。', '恢复审查还需要核对哪些条件？');
  return step(5, '已通过恢复审查；继续观察至第240分钟，再比较同终点方案。', '业务恢复以后，积压是否已经清空？');
}
