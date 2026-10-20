import { portClassLabMetrics, portLabBackupCapacity, type PortClassLab } from '@edu/port-simulation-core';

export interface IncidentCoachStep {
  id: string; title: string; body: string; answer: string; reason: string; check: string;
  target: string; targets: string[]; action: string; chapter: string; phase: number;
}
export interface IncidentCoachContext {
  playing?: boolean; notes?: Record<string, string>; sealedAt?: string | null;
}
export const INCIDENT_LEARNING_PHASES = ['固定告警', '独立取证', '范围与隔离', '维修与连续性', '实际恢复验证', '终点观察', '复盘与交接'];
const n = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const at = (value: number | null) => value === null ? '未完成' : `第${n(value)}分钟`;

export function incidentTarget(id: string, guide?: IncidentCoachStep | null) {
  return { 'data-incident-target': id, 'data-incident-current': guide?.targets.includes(id) ? 'true' : undefined };
}

/** Examples use this run's evidence and results; they never claim an unperformed action. */
export function incidentReportExamples(run: PortClassLab): Record<string, { text: string; reason: string }> {
  const e = run.emergency, i = run.incident, m = portClassLabMetrics(run), system = run.scenario === 'system';
  if (!e || !i) return {};
  const internal = run.simulation!.facilities!.enabled.yard ? '内部场桥作业当前可运行' : '内部场桥作业当前仍暂停';
  return {
    scope: {
      text: `截至第${n(m.minute)}分钟，${e.evidence.scope ? system ? '独立范围回执证明岸桥、场桥和场内车控制正常，异常集中于电子交付接口' : '独立范围回执证明闸口及其余设备控制正常，故障集中于场桥1' : '尚未取得独立范围证据，影响仍待核查'}。${i.isolated ? `最初选择${i.scope === 'all' ? '同时暂停全部内部箱流' : '仅隔离受影响环节'}，隔离完成于${at(e.isolatedAt)}；${internal}。` : '尚未完成隔离，不能把保护性暂停当成隔离完成。'}`,
      reason: '写出证据、范围、动作和当前状态，才能判断有没有无依据地扩大停工。',
    },
    barriers: {
      text: system
        ? `电子交付依赖可信记录，重复票号、旧版本和数量冲突会破坏核验。${i.backupVerified ? `本轮保留记录已独立核验，备用上限${portLabBackupCapacity(run)}箱，实际备用交付${i.manualDelivered}箱；被隔离票据不计入额度。` : '本轮尚未通过备用核验，不能声称已有可信备用额度。'}技术修复、恢复对账和实际试放行分别提供不同证据。`
        : `场桥1保护停机保留已承诺交接的安全收尾，隔离后才可维修。${e.reliefUsed ? `本轮启用场桥3支援，Y3暂失该设备；${e.reliefReturned ? '替代场桥已实际返回' : '替代场桥尚未实际返回'}。` : '本轮未启用场桥3支援，选择等待维修，保留其原区能力。'}转场和空驶不计入场桥1的3次实际试吊。`,
      reason: '解释每道屏障防什么风险，也说明它不能替代哪一道后续检查。',
    },
    conclusion: {
      text: `截至第${n(m.minute)}分钟，技术工作${at(e.technicalAt)}，恢复检查${at(e.checkedAt)}，受控交接已完成${i.testDelivered}/3${system ? '箱' : '次'}；${system ? '服务恢复' : '设备复工'}审查${at(i.restoredAt)}。${m.recoveryMinutes === null ? '尚无有效恢复耗时' : `恢复耗时${n(m.recoveryMinutes)}分钟，目标${system ? 60 : 90}分钟，${m.recoveryMinutes <= (system ? 60 : 90) ? '达标' : '超出目标'}`}。新增交付${n(m.delivered)}箱，仍未交付${n(m.remaining)}箱，等待${n(m.waitingBoxMinutes)}箱分钟，成本${n(m.cost)}教学单位。${system && e.evidence.logs ? '初始快照暴露窗口15分钟，超过RPO目标10分钟；这不能直接推定最终丢失量。' : ''}`,
      reason: '恢复时点由审查通过登记；交付、等待和成本使用同一观察终点，不能用技术完成冒充业务恢复。',
    },
    handover: {
      text: `下一班由值班负责人和${system ? '数据核验岗' : '设备管理岗'}接续核查${n(m.remaining)}箱未交付任务、车辆等待与最新回执。${i.restoredAt === null ? '恢复审查尚未通过，应补齐缺少的检查和实际交接证据，保持当前限制。' : '恢复审查已通过，继续监测积压消化。'}如再次出现${system ? '记录冲突或电子校验失败' : '保护告警或交接异常'}，立即报告并按授权重新核查影响范围，记录触发时点和处理结果。`,
      reason: '交接要有未完成事项、责任岗位、下一动作和复核触发条件，下一班才接得上。',
    },
  };
}

export function incidentCoach(run: PortClassLab, context: IncidentCoachContext = {}): IncidentCoachStep | null {
  const e = run.emergency, i = run.incident;
  if (!e || !i) return null;
  const system = run.scenario === 'system', f = run.simulation!.facilities!;
  const step = (id: string, phase: number, title: string, body: string, reason: string, check: string,
    target: string, chapter = system ? 'system' : 'equipment', secondary: string[] = [], answer = body): IncidentCoachStep => {
    const guide = { id, phase, title, body, answer, reason, check, target, targets: [target, ...secondary], action: '定位高亮操作', chapter };
    if (context.playing && target !== 'pause') return { ...guide, id: `pause-${id}`, title: '正在运行，先暂停再执行本步处置',
      body: `先点击高亮的“暂停推进”。暂停后应做：${body}`, answer: body,
      reason: `运行时处置表单锁定，暂停后才能下达本步指令。${reason}`,
      check: '时钟暂停后，本步真实操作重新高亮；当前证据与进度保留。', target: 'pause', targets: ['pause'] };
    return guide;
  };
  const clock = (id: string, phase: number, title: string, body: string, reason: string, check: string,
    chapter = 'controls', secondary: string[] = []) => step(id, phase, title,
    context.playing ? `正在推进模拟时间。${body}需要查看现场时可点击高亮的“暂停推进”。` : body,
    reason, check, context.playing ? 'pause' : 'continue', chapter, context.playing ? [] : secondary);

  if (run.terminal.minute >= run.endpoint) {
    const labels: Record<string, string> = { scope: '影响范围与隔离依据', barriers: '失效屏障与共同依赖', conclusion: '恢复证据与目标核对', handover: '责任交接与下一班任务' };
    const missing = Object.keys(labels).find(key => (context.notes?.[key]?.trim().length ?? 0) < 15);
    if (missing) {
      const example = incidentReportExamples(run)[missing]!;
      return step(`note-${missing}`, 6, `填写复盘：${labels[missing]}`,
        `在高亮文本框写至少15字。下方“参考答案与原因”给出本次实际记录示例，可先采用再修改。${i.restoredAt === null ? '本轮尚未恢复，应如实保存失败处置复盘。' : ''}`,
        example.reason, '四项复盘分别填写完成；字数仅检查完整性，分析仍需结合证据判断。', `note-${missing}`, 'report', [], example.text);
    }
    if (!context.sealedAt) return step('save-review', 6, '保存本轮教学复盘', '点击“完成并保存教学复盘”。',
      '保存把本轮实际指令、结果和四项解释留在本机；教学练习不会被标成实战提交。',
      '页面显示“教学复盘已保存”。', 'save-review', 'submission');
    return step('complete', 6, '教学复盘已保存，可以提交、备份或比较另一方案', '点击页首“提交教师”定位提交区，登录学生账号后提交本轮教学记录；也可下载草稿备份，再从同一开局比较另一方案。',
      '比较同场景、同终点方案，才能区分维修人数、备用交付或替代调度的收益与代价。独立考核请另开实战。',
      '保留本轮文件；新方案从第90分钟开始，历史结果仍可对照。', 'export-draft', 'metrics', ['restart']);
  }
  if (run.pendingTask) {
    const task = run.pendingTask, names = { scope: '独立范围检查', logs: '接口日志追查', backup: '备用资料调取', mechanical: '场桥1诊断', secure: '检修区安全隔离', audit: '备用记录核验', reconcile: system ? '恢复记录对账' : '维修后安全检查' };
    return clock('waiting', ['scope', 'logs', 'mechanical'].includes(task.kind) ? 1 : task.kind === 'secure' ? 2 : task.kind === 'reconcile' ? 4 : 3,
      `${names[task.kind]}进行中，等待实际回执`, `目标完成时点是第${n(task.completesAt / 60)}分钟。暂停时点击“继续耗时操作”，若被中途回报暂停，就读回报后再继续。`,
      '检查按模拟时间累计；车辆或库存的新回报只带来一次暂停，不会替代尚未完成的检查。维修可与检查同时推进。',
      `${names[task.kind]}回执出现，并且“检查进行中”的完成时间提示消失。`);
  }
  if (!i.recorded) return step('record', 0, '第1步：固定告警，保留当前现场', '点击“固定当前告警证据”。',
    system ? '已知的是电子交付校验失败、放行保护性暂停；原因和范围还未知。先保留事实，后面才有可靠的时间起点和比较依据。' : '保护停机只是不再接新任务，正在交接的箱子仍须安全收尾。固定告警能保留故障时点和当前任务。',
    '“固定当前告警证据”完成，下一步高亮转到独立范围检查。', 'record');
  if (!e.evidence.scope) return step('scope', 1, '检查影响范围，不把局部异常当成全港停摆', '点击“独立范围检查 · 3分钟”，等待独立现场检查回执。',
    '告警只能证明发现异常的位置。独立范围检查用来确认哪些设备和业务仍正常，给隔离范围提供证据。',
    '事件证据台出现“独立现场检查”，再进行日志追查或设备诊断。', 'scope');
  if (!(system ? e.evidence.logs : e.evidence.mechanical)) return step('diagnosis', 1,
    system ? '追查接口日志，区分恢复时间与恢复点' : '诊断场桥1，查清维修条件',
    system ? '点击“追查接口日志 · 4分钟”；若在第95分钟被车辆回报暂停，点击“继续耗时操作”。' : '点击“诊断场桥1 · 5分钟”，等诊断回执；中途回报暂停后继续耗时操作。',
    system ? 'RTO是业务要在多久内恢复；RPO是允许数据恢复点落后多久。日志提供故障时点和最后可信快照，不能凭初始告警推定丢失量。' : '保护告警不能代替检修诊断。诊断说明故障和维修工作量，独立范围回执则说明其他设备能否继续作业。',
    system ? '出现“接口日志与独立时钟”回执；读到故障第90分钟、可信快照第75分钟。' : '出现“场桥1诊断记录”；读到90人分钟维修工作量。', system ? 'logs' : 'mechanical');
  if (!i.isolated) {
    const busy = !system && run.simulation!.jobs.some(job => job.kind === 'yard' && job.resource === f.yardIncident!.failed);
    if (busy) return clock('drain', 2, '先让场桥1完成当前交接', '点击“运行至下一节点”，观察当前箱交接安全结束后再隔离检修区。',
      '已经承诺的箱交接不能凭停机按钮取消；安全收尾保护箱、车和人员，也保留真实运行记录。', '场桥1不再有当前交接，随后高亮转到安全隔离。');
    return step('isolate', 2, '本轮建议只隔离受影响环节',
      `在“隔离范围”选择“${system ? '仅隔离电子交付接口' : '仅隔离故障场桥'}”，再点击“${system ? '执行所选隔离' : '安全隔离检修区 · 2分钟'}”。`,
      system ? '独立检查已证明内部设备正常。局部隔离阻断不可信电子放行，同时保留内部作业；全部暂停会扩大积压。日志的90−75＝15分钟暴露窗口超过RPO目标10分钟，但不等于最终丢失15分钟数据。' : '范围检查证明其他设备正常，诊断确认场桥1驱动控制保护异常。只隔离故障场桥能保留其他能力；安全隔离完成后才能进场维修。',
      system ? '隔离时点被登记，电子交付暂停，内部独立作业保留。' : '2分钟后出现隔离检查回执，检修区隔离完成。', 'isolate', undefined, ['isolation-scope']);
  }
  if (e.evidence.scope && (!f.enabled.yard || !f.enabled.truck || !f.enabled.quay.some(Boolean))) return step('resume-internal', 2,
    '恢复未受影响的内部作业，避免后面没有可验证任务', '点击“恢复非受影响内部作业”。',
    '你先前暂停了全部内部箱流；独立范围证据已确认其他环节正常。恢复它们不会解除故障设备或不可信电子交付的限制。',
    '内部设备重新接续任务；故障环节继续受限。', 'resume-internal');
  if (!i.repairStarted) return step('repair', 3, '本轮建议用2人维修，并与其他工作并行',
    '在“维修班组”选择“2名技术人员”，再点击“启动技术工作”。已启动过的班组不能在本轮中途更改。',
    `本场景工作量${e.repairTarget}人分钟：2人理想技术用时${e.repairTarget / 2}分钟，1人需${e.repairTarget}分钟。“人分钟”是人数×时间；对账、实际运输和验证仍另外耗时。2人方案是学习起点，可再用1人方案比较时间与成本。`,
    `技术工作开始累计至${e.repairTarget}/${e.repairTarget}人分钟；暂停时不累计。`, 'repair', undefined, ['repair-team']);
  if (system && !e.evidence.backup) return step('backup', 3, '调取两份资料，才有逐行核对依据', '点击“调取备用台账 · 3分钟”。取得后展开“独立核对凭据”，与待核验台账逐行比较。',
    '待核验台账是要检查的材料，独立值班副本是对照依据。可信版本、数量和票号唯一性必须一起核对。两份资料均为本课程预置情境。',
    '事件证据台出现“备用台账已调取”，处置台显示台账和独立凭据。', 'backup');
  if (system && !i.backupVerified) return step('audit', 3, '核验答案：隔离R3、R4，保留其余三行',
    '勾选表示“隔离排除”。本轮只勾R3、R4，再点击“核验备用记录 · 10分钟”；也可用下方按钮采用这一选择。',
    'R2与R3是同一T02的重复记录，保留任意一条即可；R4版本17且申报10箱，与独立凭据版本18、12箱冲突；R1、R5有效。保留R1、R2、R5共38箱，备用上限取24箱。',
    '10分钟后出现独立核验回执；去重方案解锁24箱。保守隔离R2、R3、R4也认可，剩余R1、R5共20箱，只解锁20箱，T02仍待恢复对账。',
    'audit', 'system', ['ledger']);
  if (i.repairWork < e.repairTarget) {
    const people = run.terminal.setup.dispatch.technicians, remaining = (e.repairTarget - i.repairWork) / people;
    const option = system ? i.manual ? `备用交付已启用，当前实际交付${i.manualDelivered}/${portLabBackupCapacity(run)}箱。` : i.manualDelivered >= portLabBackupCapacity(run) ? '本轮备用额度已用尽，继续等待技术工作。' : `可先点击“启用${portLabBackupCapacity(run)}箱双人复核备用交付”，再推进；也可不启用，直接等待维修。`
      : e.reliefUsed ? '场桥3替代调度已启动，观察其转场及Y3能力变化。' : '可先点击“改派场桥3支援故障区”，观察实际转场；也可保留场桥3原区能力，直接等待维修。';
    return clock('work', 3, `技术工作${n(i.repairWork)}/${e.repairTarget}人分钟：下一步继续推进`,
      `${option}点击“运行至下一节点”，必要时重复，直到技术工作完成。按当前${people}人班组，技术工作尚需约${n(remaining)}模拟分钟。`,
      system ? '备用交付缓解部分等待，但要增加2名复核人员成本，上限不等于已经交付。维修和备用可以并行；选择等待可少付额外复核成本，但可能延后交付。' : '替代场桥要完成原任务并沿道路转场，Y3暂失该设备；替代收益与原区代价都要用实际箱流、等待和成本判断。',
      `出现“维修回执”，进度达到${e.repairTarget}/${e.repairTarget}；技术完成后继续做恢复检查。`,
      system ? 'system' : 'equipment', system && !i.manual && i.manualDelivered < portLabBackupCapacity(run) ? ['manual'] : !system && !e.reliefUsed ? ['relief'] : []);
  }
  if (!i.dataChecked) return step('reconcile', 4, system ? '技术完成后，启动10分钟恢复对账' : '维修完成后，启动5分钟安全检查',
    `点击“${system ? '恢复记录对账 · 10分钟' : '维修后安全检查 · 5分钟'}”，等待检查回执。`,
    system ? '技术修复只说明系统工作完成，不能证明业务记录可信。恢复对账核查被保留和被隔离资料；此时先暂停备用交付，再准备3箱受控验证。' : '维修完成不能直接证明设备可安全作业。检查确认复工条件，后续还须替代设备实际返回和原设备实际试吊。',
    system ? '出现“恢复对账回执”；3箱实际试放行按钮解锁。' : '出现“维修后检查回执”；如使用替代场桥，下一步先撤回。', 'check', system ? 'system-recovery' : 'equipment-recovery');
  if (!system && f.yardIncident?.relief != null) return e.reliefReturning
    ? clock('returning', 4, '替代场桥正在返回，继续推进', '点击“运行至下一节点”，等待场桥3完成当前任务并沿道路返回原区。',
      '发出撤回指令不等于设备已经离场；替代设备与场桥1不能在受控试吊时占用同一故障作业区。', '出现“替代场桥已实际返回原作业区”的回执，试吊按钮解锁。', 'equipment-recovery')
    : step('return', 4, '先撤回场桥3，再让场桥1试吊', '点击“撤回替代场桥至原区”，随后继续推进至返回完成。',
      '安全检查已完成，但替代设备仍在故障区。它必须先完成当前交接并实际返回，才能开展原设备受控试吊。',
      '返回状态先显示“撤回中”，实际返回后出现回执。', 'return', 'equipment-recovery');
  if (!i.testPassed) return i.testing
    ? clock('testing', 4, `受控交接已完成${i.testDelivered}/3${system ? '箱' : '次'}，继续观察`, '点击“运行至下一节点”，必要时重复，直到显示已验证3/3。',
      system ? '箱子必须实际完成提取、运输和闸口核验。点击启动、车辆移动或等待，都不能冒充已交付。' : '必须由场桥1实际完成3次箱交接。沿轨移机、空载返回和替代场桥的作业都不算场桥1试吊通过。',
      '出现实际验证完成回执，显示3/3；随后仍须手动审查恢复。', system ? 'system-recovery' : 'equipment-recovery')
    : step('test', 4, system ? '启动3箱实际试放行' : '启动场桥1的3次实际试吊',
      `点击“${system ? '启动3箱实际试放行' : '启动场桥1的3次实际试吊'}”，然后继续推进模拟时间。`,
      '检查回执说明具备验证条件；用有限的真实箱交接检验业务链是否可用，避免直接全面恢复。',
      '已验证数量随实际交接增长至3/3，不能只看启动按钮是否变灰。', 'test', system ? 'system-recovery' : 'equipment-recovery');
  if (i.restoredAt === null) return step('restore', 4, '3次交接已通过，现在明确下达恢复审查',
    `点击“审查证据并恢复${system ? '电子交付' : '场桥1作业'}”。`,
    '受控验证通过还需要明确的恢复决定。系统在审查通过的实际时点登记恢复耗时，作为是否达到目标的依据。',
    `${system ? '服务恢复' : '设备复工'}时点被登记；目标${system ? 60 : 90}分钟从第90分钟事件起点计算。`, 'restore', system ? 'system-recovery' : 'equipment-recovery');
  return context.playing
    ? clock('observe', 5, '已恢复，继续观察至第240分钟', '当前正在观察恢复后的积压、交付、等待和成本。遇业务节点暂停后继续至终点。',
      '恢复证明业务可运行，积压仍要逐箱消化。所有方案观察到相同终点，经营指标才可比较。', '时钟达到第240分钟，然后按实际结果填写四项复盘。', 'metrics')
    : step('observe', 5, '已恢复，继续观察至第240分钟', '点击“连续运行至终点”；遇业务节点暂停后核对回报，再次运行至终点。',
      '恢复证明业务可运行，积压仍要逐箱消化。所有方案观察到相同终点，经营指标才可比较。超出恢复目标也应如实保留。',
      '时钟达到第240分钟，下一步高亮转到第一项复盘。', 'endpoint', 'metrics');
}
