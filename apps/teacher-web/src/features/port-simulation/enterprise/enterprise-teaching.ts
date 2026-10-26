import { assetSpec, CARGO_LABELS, hourLabel, type EnterpriseCommand, type EnterpriseRecord, type EnterpriseView } from '@edu/port-simulation-core';

/** UI learning receipts are deliberately outside the engine record and formal grading rules. */
export const ENTERPRISE_TEACHING_VERSION = 'port-enterprise-teaching/1' as const;
export interface TeachingReceipt { hour: number; position: number; evidence: string[]; }
export interface EnterpriseTeaching {
  schema: typeof ENTERPRISE_TEACHING_VERSION; active: boolean; selected: string;
  answers: Record<string, string>; receipts: Record<string, TeachingReceipt>;
}
export const newEnterpriseTeaching = (): EnterpriseTeaching => ({ schema: ENTERPRISE_TEACHING_VERSION, active: true, selected: 'takeover', answers: {}, receipts: {} });
export interface TeachingQuiz { question: string; options: Array<{ id: string; text: string; feedback: string }>; correct: string; }
export interface TeachingStep {
  id: string; chapter: string; title: string; tab: string; target: string;
  now: string; answer: string; why: string; verify: string; evidence: string[]; complete: boolean;
  quiz?: TeachingQuiz; planHour?: number; drafts?: Record<string, string>;
}
type Command<K extends EnterpriseCommand['kind']> = Extract<EnterpriseCommand, { kind: K }>;
const amount = (n: number) => (n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + '万元';
export function enterpriseTeachingSteps(v: EnterpriseView, record: EnterpriseRecord | undefined, learning: EnterpriseTeaching): TeachingStep[] {
  const commands = record?.commands ?? [];
  const ok = <K extends EnterpriseCommand['kind']>(kind: K, match: (c: Command<K>) => boolean = () => true) => v.journal.some(j => j.ok && j.kind === kind && commands[j.index]?.kind === kind && match(commands[j.index] as Command<K>));
  const policy = (match: (p: Command<'policy'>['patch']) => boolean) => ok('policy', c => match(c.patch));
  const receipt = (id: string) => { const r = learning.receipts[id]; return !!r && r.position <= commands.length; };
  const callCommand = commands.find((c, i): c is Command<'berth'> => c.kind === 'berth' && !!v.journal[i]?.ok);
  const docCommand = commands.find((c, i): c is Command<'document'> => c.kind === 'document' && c.document === 'entry' && !!v.journal[i]?.ok);
  const callId = callCommand?.callId ?? docCommand?.callId ?? v.calls.find(c => c.goods === 'container' && ['announced', 'waiting'].includes(c.stage))?.id ?? v.calls[0]?.id ?? '';
  const call = v.calls.find(c => c.id === callId), callLabel = call?.name ?? callId;
  const reference = (kind: string) => callId + '-' + kind;
  const documentStatus = { draft: '未提交', submitted: '等待独立回执', approved: '有效回执', correction: '需要补正' };
  const hired = v.crews.find(c => c.hiredHour >= 0 && !c.id.startsWith('crew-technician-') && c.role === 'technician' && ok('hire', x => x.role === 'technician'));
  const maintenance = commands.find((c, i): c is Command<'maintain'> => c.kind === 'maintain' && !!v.journal[i]?.ok);
  const maintainAsset = v.assets.find(a => a.id === maintenance?.assetId) ?? v.assets.filter(a => a.status === 'active' && a.lastWork === 0).sort((a, b) => a.health - b.health)[0];
  const routeCommand = commands.find((c, i): c is Command<'route'> => c.kind === 'route' && c.route === 'rail' && !!v.journal[i]?.ok);
  const railLot = v.lots.find(l => l.id === routeCommand?.lotId) ?? v.lots.find(l => l.terminalId === 'T2' && l.completed + l.lost < l.quantity && l.rehandleRemaining === 0);
  const project = v.projects.find(p => p.type === 'automation' && p.terminalId === 'T1');
  const vehicleOrder = v.journal.find(j => j.ok && commands[j.index]?.kind === 'order-asset' && (commands[j.index] as Command<'order-asset'>).model === 'agv' && (commands[j.index] as Command<'order-asset'>).terminalId === 'T1');
  const vehicle = v.assets.find(a => a.id === vehicleOrder?.message.split('：').at(-1));
  const leased = v.assets.find(a => a.model === 'manual-gate' && a.ownership === 'leased');
  const baseVolume = { container: 420, bulk: 1300, liquid: 1450, general: 210, roro: 130, passenger: 320 };
  const contract = v.contracts.find(c => c.accepted) ?? v.contracts.filter(c => c.expires >= v.hour).sort((a, b) => a.volume / baseVolume[a.goods] - b.volume / baseVolume[b.goods])[0];
  const steps: TeachingStep[] = [];
  const add = (step: TeachingStep) => { step.complete ||= receipt(step.id); steps.push(step); };
  const quiz = (step: Omit<TeachingStep, 'complete' | 'evidence'> & { quiz: TeachingQuiz }) => add({ ...step, complete: learning.answers[step.id] === step.quiz.correct, evidence: learning.answers[step.id] === step.quiz.correct ? ['已选择正确解释；这是知识检查，不是正式成绩。'] : [] });

  quiz({ id: 'takeover', chapter: '01 接管与单证', title: '核对接管底账', tab: 'overview', target: 'summary',
    now: '先看七个作业区，再到财务页核对现金、借款和净资产。不要急于连续推进。',
    answer: '新场次现金8500万元、借款本金2000万元；现金可支付投资与工资，但不是利润。集装箱、吨、立方米、辆和人分别统计。',
    why: '接管的是一组资产、负债、人员和业务责任。先认清资金与单位，才有条件判断扩建是否可负担。',
    verify: '回答下面的底账问题。后续步骤由真实业务记录核验。',
    quiz: { question: '接管时的8500万元现金应怎样理解？', correct: 'cash', options: [
      { id: 'profit', text: '它就是本期经营利润', feedback: '现金包含接管资金和融资。利润还要扣除运营费用、折旧、利息与税费。' },
      { id: 'cash', text: '它是支付能力，还要同时看2000万元借款及资产责任', feedback: '正确。借款会增加现金和负债，购置会减少现金并形成资产。' },
      { id: 'units', text: '只要把六种业务数量相加就能判断经营水平', feedback: '六类业务单位不同，应分别看交付、到期履约和收入。' },
    ] } });
  add({ id: 'manual', chapter: '01 接管与单证', title: '先亲手核对一次口岸业务', tab: 'dispatch', target: 'dispatch-policy',
    now: '把单证提交策略改为“逐项人工提交”，保留自动靠泊和计划维护，暂不授权独立异常复核，提交运行策略。',
    answer: '自动靠泊：勾选；单证：逐项人工提交；异常复核：不勾选；维护：计划维护；现金保留5000000元。其余保持现值。',
    why: '先把资料提交、独立回执和实际靠泊分开观察。后面再把日常执行交给已批准的自动策略。',
    verify: '操作日志出现成功的策略指令，且单证为人工模式。', complete: policy(p => p.documents === 'manual' && p.autoBerth === true && p.verifiedExceptions === false), evidence: ['当前单证策略：' + (v.policy.documents === 'manual' ? '人工' : '自动')] });
  add({ id: 'berth', chapter: '01 接管与单证', title: '为第一艘船登记泊位计划', tab: 'ships', target: 'berth-' + callId, drafts: { 'selected-call': callId },
    now: '选择' + callLabel + '，查看货种、船长、吃水和泊位条件，再登记兼容泊位。',
    answer: '本路线优先用第一艘集装箱船的原作业区：' + (call?.terminalId ?? '查看该船原作业区') + '。点击“登记泊位计划”。计划不会立即让船靠妥。',
    why: '泊位计划只表达意图；船舶还需实际到达、取得有效手续、具备航道与拖轮服务，并等候空闲泊位。',
    verify: '日志出现成功的泊位指令。单纯查看船期不算完成。', complete: ok('berth'), evidence: callCommand ? ['已登记挂靠：' + callCommand.callId] : [] });
  for (const [kind, title] of [['entry', '进口岸资料'], ['manifest', '舱单核对']] as const) add({ id: 'doc-' + kind, chapter: '01 接管与单证', title: '核对并提交' + title, tab: 'ships', target: 'document-' + callId + '-' + kind, drafts: { 'selected-call': callId },
    now: '定位' + callLabel + '的“' + title + '”，把引用与页面独立资料编号逐字核对，再提交。',
    answer: '引用填写：' + reference(kind) + '。如果故意改错，系统应拒绝，原业务状态保留；修正后再次提交。',
    why: kind === 'entry' ? '填报内容必须指向独立业务资料。点击提交只进入等待回执，不能由经营者自行批准。' : '舱单与原始挂靠记录相互核对。资料退补应纠正原记录，不能重建货批绕过约束。',
    verify: '这艘船的该项提交指令执行成功；下一步再验证回执。', complete: ok('document', c => c.callId === callId && c.document === kind), evidence: ok('document', c => c.callId === callId && c.document === kind) ? ['已成功提交：' + reference(kind)] : [] });
  add({ id: 'receipts', chapter: '01 接管与单证', title: '观察回执与实际到港', tab: 'ships', target: 'ship-documents', drafts: { 'selected-call': callId }, planHour: Math.max(8, (call?.eta ?? 0) + 8),
    now: '用本步的限时推进观察回执；遇到新事件会暂停。回到同一艘船核对实际状态。',
    answer: '本情境初始协同等级1，正常回执等待3小时。进口岸与舱单均显示“有效回执”才通过；天气与航道可能让靠泊更晚。',
    why: '预计到港不等于实际到达，回执有效也不等于已经靠妥。把预测、手续、物理状态分开，才能解释等待。',
    verify: '本步必须先完成两项真实提交，再看到两项有效回执。', complete: !!call && call.documents.entry.status === 'approved' && call.documents.manifest.status === 'approved' && ok('document', c => c.callId === callId && c.document === 'entry') && ok('document', c => c.callId === callId && c.document === 'manifest'), evidence: call ? ['进口岸：' + documentStatus[call.documents.entry.status], '舱单：' + documentStatus[call.documents.manifest.status], '实际到达：' + (call.actualArrival === null ? '尚未到达' : hourLabel(call.actualArrival))] : [] });
  add({ id: 'handoff-docs', chapter: '01 接管与单证', title: '补齐监管、交付与离港准备', tab: 'ships', target: 'ship-documents', drafts: { 'selected-call': callId },
    now: '在同一艘船下，分别提交监管放行、承运人交付和出口岸准备三项资料。每项都要核对独立编号。',
    answer: ['customs', 'carrier', 'departure'].map(k => reference(k)).join('；') + '。三个表单分别点击“核对并提交”。',
    why: '卸下船并不等于可以提货，承运人交付与监管回执也各有作用。出口岸准备影响离港，不能用一个“放行”按钮代替所有环节。',
    verify: '三项成功的资料提交均进入操作日志。', complete: (['customs', 'carrier', 'departure'] as const).every(k => ok('document', c => c.callId === callId && c.document === k)), evidence: (['customs', 'carrier', 'departure'] as const).filter(k => ok('document', c => c.callId === callId && c.document === k)).map(k => '已提交：' + k) });

  add({ id: 'routine', chapter: '02 生产与人员', title: '批准日常运行策略', tab: 'dispatch', target: 'dispatch-policy',
    now: '改为按核验规则自动提交，勾选授权独立资料复核与异常核查；保留承诺期限优先、计划维护和自动补给。',
    answer: '单证：自动；异常复核：勾选；优先级：承诺期限；维护阈值65%；保留现金500万元；自动补给勾选。',
    why: '长期经营需要可持续的日常策略。授权复核仍遵循独立资料和核查耗时；系统中断与恢复继续由本人处置。',
    verify: '记录中存在成功的自动单证与异常复核策略。', complete: policy(p => p.documents === 'automatic' && p.verifiedExceptions === true), evidence: ['当前异常复核授权：' + (v.policy.verifiedExceptions ? '已授权' : '未授权')] });
  add({ id: 'logistics', chapter: '02 生产与人员', title: '协调公路、铁路与窗口', tab: 'logistics', target: 'logistics',
    now: '设置新货批按设施选择铁路或公路，把公路小时限额设为240，核对铁路与驳船接续窗口。',
    answer: '默认路径：按设施选择铁路或公路；公路限额240；铁路10时UTC；驳船16时UTC，提交接续计划。',
    why: '铁路有基础条件和发运窗口。调高公路限额只放松接续约束，设备、班组或监管不足仍会形成等待。',
    verify: '成功提交接续计划。现有货批路径不会被默认策略追溯改写。', complete: policy(p => p.transport === 'balanced' && p.roadQuota === 240), evidence: ['当前接续：' + v.policy.transport + '；限额' + v.policy.roadQuota] });
  add({ id: 'rail-lot', chapter: '02 生产与人员', title: '给一批货选择真实接续路径', tab: 'cargo', target: 'lot-route',
    now: railLot ? '选取T2货批' + railLot.id + '，设置铁路接续。' : '选择仍未完成且具有铁路接口的T2货批；若当前没有，先推进一个生产日再返回。',
    answer: (railLot?.id ?? '一条T2未完成货批') + ' → 铁路班列；保税仓储不勾选。T1尚无铁路，不能直接给T1选择铁路；已有库场货物换路径会产生移位。',
    why: '货物保持原库存与监管状态。路径调整是实际业务变更，不能将库存瞬间转移到另一作业区。',
    verify: '至少一次铁路路径指令执行成功。缺少接口的失败尝试不算通过。', complete: ok('route', c => c.route === 'rail'), evidence: routeCommand ? ['铁路货批：' + routeCommand.lotId] : [], drafts: railLot ? { 'lot-route.lot': railLot.id } : undefined });
  add({ id: 'hire', chapter: '02 生产与人员', title: '招聘技术后备力量', tab: 'staff', target: 'hire',
    now: '招聘2名维修技术人员，先放在预备/休息班次，等待7日入岗培训。',
    answer: '岗位：维修技术；人数2；班次：预备/休息。招聘与入岗培训现金支出13000元。',
    why: '新员工不能当天变成熟练生产能力。招聘、培训、排班和持续工资分属不同约束。',
    verify: '成功招聘技术班组；本步只证明招聘，后面还需验证培训完成和实际排班。', complete: ok('hire', c => c.role === 'technician' && c.count === 2 && c.shift === 'reserve'), evidence: hired ? [hired.id + '：' + hired.count + '人，培训至' + hourLabel(hired.trainingUntil)] : [] });
  add({ id: 'train', chapter: '02 生产与人员', title: '安排一次技能提升', tab: 'staff', target: 'train-crew-driver-2',
    now: '找到车辆操作的夜班组crew-driver-2，点击技能培训。观察培训期间该组不计入生产人员。',
    answer: '培训crew-driver-2（原夜班技能78%），7日后提升10个百分点。此时不要把另两个车辆班组一起送去培训。',
    why: '培训会改善后续效率，也会暂时减少当班能力。长期收益必须与当前服务责任一起考虑。',
    verify: '针对该班组的培训指令成功进入日志。', complete: ok('train', c => c.crewId === 'crew-driver-2'), evidence: ['夜班车辆技能：' + v.crews.find(c => c.id === 'crew-driver-2')?.skill + '%'] });
  add({ id: 'maintenance', chapter: '02 生产与人员', title: '安排可追溯的设备检修', tab: 'assets', target: maintainAsset ? 'maintain-' + maintainAsset.id : 'asset-order',
    now: maintainAsset ? '查看' + maintainAsset.id + '（' + assetSpec(maintainAsset.model).name + '）的健康与状态，安排普通维修。' : '找一台可用或故障设备安排普通维修；若没有合适对象，等待计划维护结束后再做。',
    answer: '点击对应设备“安排维修”，不是大修或退出。需要当班技术人员和至少1份备件；工期按型号计算，期间设备停用。',
    why: '维护既有直接成本，也会减少可用能力。应保留资产记录、领料、停机和验收证据。',
    verify: '一次本人安排的维修指令执行成功。自动计划维护不代替这次操作。', complete: ok('maintain', c => !c.overhaul), evidence: maintenance ? ['检修对象：' + maintenance.assetId] : [] });

  add({ id: 'agv-purchase', chapter: '03 投资与设备配置', title: '购置一台自动导引运输车', tab: 'assets', target: 'asset-order',
    now: '在设备目录比较柴油集卡、电动集卡与AGV，再购置一台AGV到T1。核对自动化接口、数字岗位与电池条件。',
    answer: '设备型号：自动导引运输车；目标T1；购置并资本化。价格190万元、交期60日、额定22TEU/设备小时、240kWh电池、每台需要0.25数字岗位及自动化接口。',
    why: '额定能力不等于全港吞吐量。车辆还受电池、充电、数字岗位、距离、岸桥和场桥的共同限制。',
    verify: 'T1自动导引运输车购置指令成功。到货与投运另行验证。', complete: ok('order-asset', c => c.model === 'agv' && c.terminalId === 'T1' && c.ownership === 'owned'), evidence: vehicle ? [vehicle.id + '：' + vehicle.note, '到货计划：' + hourLabel(vehicle.readyHour)] : [] });
  add({ id: 'lease', chapter: '03 投资与设备配置', title: '比较租赁的现金和责任', tab: 'assets', target: 'asset-order',
    now: '为T2租赁一套人工核验闸口。比较预付现金、实际日租和提前退出义务。',
    answer: '人工核验闸口 → T2 → 租赁。交期15日，日租600元，首月预付18000元；交付起抵扣实际租金，一年责任期内提前退出最多承担90日租金。',
    why: '较低的首期现金支出不表示没有后续责任。租赁承诺、预付资产与实际费用必须分开看。',
    verify: '人工闸口租赁指令执行成功。', complete: ok('order-asset', c => c.model === 'manual-gate' && c.terminalId === 'T2' && c.ownership === 'leased'), evidence: leased ? [leased.id + '：预付余额' + amount(leased.leaseCredit)] : [] });
  add({ id: 'automation-build', chapter: '03 投资与设备配置', title: '把配套工程排进建设日历', tab: 'projects', target: 'project',
    now: '在T1开工自动化与人员转型项目。先算现金，再确认150日工期。',
    answer: '项目：自动化与人员转型；位置T1；1400万元；150日后启用AGV和智能闸口所需接口。原有人员不会被自动裁撤。',
    why: '设备60日到货早于配套150日投产，会出现待投运。这个错配可被观察，后续投资应考虑交期匹配。',
    verify: '成功开工T1自动化项目。项目列表显示建设中及计划投产时点。', complete: !!project, evidence: project ? ['项目投资' + amount(project.price), '计划投产：' + hourLabel(project.completes)] : [] });
  add({ id: 'energy', chapter: '03 投资与设备配置', title: '配置能源与风险保障', tab: 'energy', target: 'energy-policy',
    now: '批准在具备条件时使用岸电，并保留情境风险保障。观察T1与T2岸电条件差异。',
    answer: '岸电勾选，风险保障勾选，然后提交。T2原有岸电；T1建设自动化接口，不会凭空获得船舶岸电设施或增加供电容量。',
    why: '策略、基础设施与实际使用是三个层次。保险不消除中断，绿色配置也不自动等于较低单位排放。',
    verify: '成功提交岸电与保障策略。', complete: policy(p => p.shorePower === true && p.insurance === true), evidence: ['当前供电' + v.gridKw + 'kW；累计设备电量' + Math.round(v.stats.energy) + 'kWh'] });

  add({ id: 'pricing', chapter: '04 客户与资金', title: '确认报价对后续需求的影响', tab: 'market', target: 'pricing',
    now: '将后续服务基础价格系数设置为1.05，并查看公开需求响应规则。',
    answer: '价格系数1.05。按本模型价格响应项max(0.65,min(1.15,1.5−0.5×价格系数))得到0.975；客户稳定性、季节与情境趋势仍同时作用。',
    why: '涨价提高单位收入，也可能影响工作量。已生成业务不会倒改报价，不应只看单价判断利润。',
    verify: '成功提交1.05的报价策略。', complete: policy(p => p.tariff === 1.05), evidence: ['当前基础价格系数：' + v.policy.tariff] });
  add({ id: 'contract', chapter: '04 客户与资金', title: '承接一项有责任的季度协议', tab: 'market', target: contract ? 'contract-' + contract.id : 'pricing',
    now: contract ? '查看' + contract.title + '的额外工作量、期限与罚则，再决定承接。' : '本季度机会已过期。到下季度查看新协议；不要为完成步骤反复承接已过期的合同。',
    answer: contract ? '本次参考：' + contract.title + '，增加' + contract.volume + CARGO_LABELS[contract.goods].unit + '/日，未完成责任系数' + (contract.penalty * 100).toFixed(0) + '%。本路线优先观察相对基础工作量增幅较小的可用协议；仍需检查现场能力。收入以实际交付确认。' : '每季度仅公布三类协议，货种随季度轮换。选择存在且未过期的一项，核对工作量、期限与责任后再承接。',
    why: '协议增加的是工作量与承诺，而不是立即到账的收入。码头、人员与接续不足时，新增业务也可能拖累履约。',
    verify: '至少一项实际存在、未过期的季度协议承接成功。', complete: v.contracts.some(c => c.accepted), evidence: v.contracts.filter(c => c.accepted).map(c => c.title + '：已交付' + c.shipped + ' / 已承诺' + c.promised) });
  add({ id: 'loan', chapter: '04 客户与资金', title: '辨认融资与收入', tab: 'finance', target: 'loan',
    now: '借款50万元，观察现金和债务同时变化。本步用于认识账务关系，不表示当前经营必须融资。',
    answer: '借款金额500000元，点击取得借款。年利率6.5%，月末计息；融资不增加营业收入。',
    why: '只追求现金余额会鼓励无限借款。真正的经营评价还要检查债务、利息、应收、资产与后续责任。',
    verify: '50万元借款指令执行成功。', complete: ok('loan', c => c.amount === 500000), evidence: ['当前借款本金：' + amount(v.debt)] });
  add({ id: 'repay', chapter: '04 客户与资金', title: '偿付并保留周转资金', tab: 'finance', target: 'repay',
    now: '偿还50万元本金，核对现金与本金同时减少，留出未来工资、检修与建设资金。',
    answer: '偿付金额500000元。还本金不是运营费用；利息才进入当期费用。',
    why: '融资与偿付的现金流不能混同于经营利润。足够流动性比账上暂时好看的净收入更能支持连续运营。',
    verify: '50万元偿付指令成功；超过现金或未还本金会被拒绝。', complete: ok('repay', c => c.amount === 500000), evidence: ['现金' + amount(v.cash) + '；本金' + amount(v.debt)] });
  add({ id: 'supplies', chapter: '04 客户与资金', title: '补给、库存与领用成本', tab: 'emergency', target: 'supplies',
    now: '采购3份维修备件，检查库存与现金变化。', answer: '物资选维修备件，数量3；支付12000元。采购先形成库存，实际领用才结转相应成本。',
    why: '现金支出时点与费用确认时点可能不同。备件足够也仍需要当班技术人员才能开展维修。',
    verify: '3份备件采购指令执行成功。', complete: ok('supplies', c => c.item === 'parts' && c.quantity === 3), evidence: ['当前备件：' + v.spareParts + '份'] });

  add({ id: 'agv-delivery', chapter: '05 投运与应急实证', title: '观察60日到货及接口等待', tab: 'assets', target: vehicle ? 'asset-' + vehicle.id : 'asset-order', planHour: vehicle ? vehicle.orderedHour + 60 * 24 + 1 : 60 * 24 + 1,
    now: '推进至AGV交付时点。新事件会中断推进，按应急卡处理完再继续。',
    answer: '60日交付时点后的小时结算中可看到新AGV到货；T1自动化工程尚未完工，因此设备应为等待投运。不能把设备到货当成能力已增加。',
    why: '“先买设备再补条件”会形成闲置资金。本步保留这个可观察的投资错配，用后续投运结果检验解释。',
    verify: 'AGV达到交付时点，并显示等待投运或已具备条件后的可用状态。', complete: !!vehicle && v.hour >= vehicle.orderedHour + 60 * 24 && vehicle.status !== 'ordered', evidence: vehicle ? [vehicle.id + '：' + vehicle.note, '当前自动化接口：' + v.terminals.find(t => t.id === 'T1')?.automation] : [] });
  add({ id: 'incident', chapter: '05 投运与应急实证', title: '完成一次真实中断的恢复闭环', tab: 'emergency', target: 'incidents', planHour: 60 * 24,
    now: '如有未恢复事件，先使用下方应急卡；依次核查、隔离、技术修复、等待完成、确认恢复。无事件时继续观察至第60日。',
    answer: '先核查证据，再隔离范围；需要短期连续性时启用备用（45000元）；启动技术修复（30000元），等到真实完成时点，再确认恢复。备用不等于恢复。',
    why: '压住告警或修复任务已启动，都不表示业务已恢复。未完成技术工作之前，恢复申请必须被拒绝或保持禁用。',
    verify: '至少一个事件有证据、隔离、技术修复及成功恢复记录。仅点击隔离不能完成。', complete: v.incidents.some(i => i.status === 'resolved' && i.evidence && ok('respond', c => c.incidentId === i.id && c.action === 'repair') && ok('respond', c => c.incidentId === i.id && c.action === 'recover')), evidence: ['累计确认恢复：' + v.stats.recovered + '次'] });
  add({ id: 'automation-commission', chapter: '05 投运与应急实证', title: '验收150日配套与设备投运', tab: 'projects', target: 'projects-status', planHour: (project?.completes ?? 150 * 24) + 1,
    now: '继续推进至T1自动化工程实际投产。每次最长93日，遇新事件停止；按应急卡完成后继续。',
    answer: 'T1自动化等级至少1；新AGV不再因自动化接口等待。自动化项目不会增加全港供电容量，充电与作业仍会竞争供电。到货早的租赁闸口已按交付起计租。',
    why: '把计划投产日期与实际投产、设备可用和能耗放在一起核对，才能证明投资生效。额外设备仍可能受到其他环节瓶颈限制。',
    verify: 'T1自动化项目完成，且订购AGV已经投运（可用或正常检修），不能仍处于订购/待投运。', complete: project?.status === 'completed' && !!vehicle && ['active', 'maintenance'].includes(vehicle.status), evidence: ['T1自动化等级：' + v.terminals.find(t => t.id === 'T1')?.automation, '供电容量：' + v.gridKw + 'kW', vehicle ? vehicle.id + '：' + vehicle.note : '尚未订购路线设备'] });
  add({ id: 'staff-shift', chapter: '05 投运与应急实证', title: '让完成培训的后备人员入班', tab: 'staff', target: hired ? 'staff-' + hired.id : 'hire',
    now: '找到此前招聘的维修技术班组，确认培训结束后，将它安排到16:00—24:00夜班。',
    answer: (hired?.id ?? '新技术班组') + ' → 16:00—24:00。一个班组只覆盖一个班次，不能复制成全天人力。',
    why: '招聘成功、培训完成和当班可用是三个节点。夜班能力应由实际排班证明。',
    verify: '新招聘班组培训结束，且存在将其安排到夜班的成功指令。', complete: !!hired && hired.trainingUntil <= v.hour && ok('staff', c => c.crewId === hired.id && c.shift === 2), evidence: hired ? [hired.id + '：技能' + hired.skill + '%；班次' + hired.shift] : [] });
  quiz({ id: 'finance-check', chapter: '06 绩效与解释', title: '读懂月报中的现金、折旧与利润', tab: 'finance', target: 'finance-months',
    now: '查看已形成的月报，分别找到收入、投资现金支出、折旧、利息和月末现金。',
    answer: 'AGV190万元购置形成资产；投入使用后按规则折旧。融资、购置、偿本金和利润分属不同口径。',
    why: '如果把购置款一次性当作经营费用，或把借款当收入，就无法比较租赁与购置的长期效果。',
    verify: '回答月报口径问题；月度实际数据在下方财务表中。',
    quiz: { question: '哪种判断能正确解释本场投资？', correct: 'capital', options: [
      { id: 'expense', text: '购置190万元应当全部记为本月运营费用', feedback: '本模型购置形成资本资产，折旧随规则进入损益；现金会先减少。' },
      { id: 'capital', text: '分别核对购置现金支出、资产价值、折旧与实际使用', feedback: '正确。还要结合交期和配套等待判断资金占用。' },
      { id: 'rent', text: '租赁首月预付之后就不再有费用或退出责任', feedback: '预付抵扣实际日租；责任期内提前退出仍有义务。' },
    ] } });
  quiz({ id: 'performance-check', chapter: '06 绩效与解释', title: '从瓶颈解释绩效', tab: 'analysis', target: 'analysis-goods',
    now: '逐货种查看到期量、已交付、未完成和平均在港时间，再看等待分解与电量。',
    answer: '先找按时交付率最低的已到期货种，回查单证、泊位、设备、班组与接续。不同时间、种子或政策组合不能直接称为同条件因果对照。',
    why: '设备额定能力提高并不保证履约提高。模型诊断分还按经营期进度折算，早期分低不表示全部操作错误。',
    verify: '回答对照问题；个人解释应引用实际指标，不用本教学路线作为最优策略证明。',
    quiz: { question: '150日与365日的两份履约数据可以直接证明购置设备的因果效果吗？', correct: 'compare', options: [
      { id: 'yes', text: '可以，只要后一次数据更好', feedback: '观察时点、需求、事件与其他策略同时变化，不能单独归因于设备。' },
      { id: 'compare', text: '应使用相同规则、种子和观察时点的另一个练习作对照', feedback: '正确。先控制比较条件，再解释政策组合和瓶颈。' },
      { id: 'score', text: '只需要比较总分，货种与等待无需查看', feedback: '总分会隐藏货种差异，而且按进度折算；必须看分项证据。' },
    ] } });
  const noteReferences: Record<string, string> = {
    '经营决策': '说明1.05报价及所承接季度协议的依据，引用已承诺与已交付量，再解释价格、需求和履约责任之间的取舍。',
    '设备投资': '记录AGV190万元、60日到货、自动化项目1400万元与150日工期，说明待投运期间的资金占用及投运后的瓶颈。',
    '生产调度': '说明为何采用设施适配路径、240公路限额、夜班技能培训及技术后备班组，引用等待或交付变化，并保留单位。',
    '异常与边界': '引用一个真实事件编号、核查/隔离/修复/恢复时点及积压变化；明确这些为教学情境参数，结果不代表真实港口保证。',
  };
  for (const [i, topic] of Object.keys(noteReferences).entries()) add({ id: 'note-' + i, chapter: '06 绩效与解释', title: '撰写' + topic + '说明', tab: 'journal', target: 'decision-note', drafts: { 'decision-note.topic': topic },
    now: '选择类别“' + topic + '”，用本场真实数据写下依据、决定、结果和边界。',
    answer: noteReferences[topic]!, why: '文字记录帮助复盘决策链。系统仅检查类别和至少20字的完整性；内容质量与分析深度仍需人工评价。',
    verify: '该类别存在不少于20字的真实决策记录。可以按自己的分析填写，不必逐字复制参考。', complete: v.notes.some(n => n.topic === topic && n.text.trim().length >= 20), evidence: v.notes.filter(n => n.topic === topic).map(n => hourLabel(n.hour) + '，' + n.text.trim().length + '字') });

  for (let year = 1; year <= v.config.years; year++) {
    const boundary = Math.round((Date.UTC(2027 + year, 0, 1) - Date.UTC(2027, 0, 1)) / 3600000);
    add({ id: 'year-' + year, chapter: '07 年度滚动经营', title: '完成第' + year + '年滚动观察', tab: 'analysis', target: 'analysis-goods', planHour: Math.min(v.horizon, boundary),
    now: '按季度安排观察，再推进到年度节点。每次遇新事件都会暂停；先完成恢复，再继续。可随时回设备、市场和财务页修订后续政策。',
    answer: '每季度复核到期履约、库场与接续、设备健康、现金与债务；每年复核资产折旧、租赁责任、技能和项目回报。投资与合同应有实际约束依据，不要求重复采购。',
    why: '长期经营会累积老化、维护、客户稳定性、季节需求和融资成本。首月可行的组合未必能支撑三年。',
    verify: '经营时间达到第' + year + '年末，至少有实际业务交付，并形成年度月报。', complete: v.hour >= boundary && v.stats.delivered > 0, evidence: ['已运行' + Math.floor(v.hour / 24) + '日；月报' + v.months.length + '期', '当前现金' + amount(v.cash) + '；到期履约' + (v.score.deliveryRate * 100).toFixed(1) + '%'] });
    add({ id: 'year-review-' + year, chapter: '07 年度滚动经营', title: '提交第' + year + '年经营复盘', tab: 'journal', target: 'decision-note', drafts: { 'decision-note.topic': '第' + year + '年经营复盘' },
      now: '到达第' + year + '年末后，回查该年度12期月报，并保存一段年度经营复盘。之后再进入下一年度。',
      answer: '选择“第' + year + '年经营复盘”。引用该年收入、运营费用、折旧、现金与债务，再选一个履约或风险问题，说明下一年度保持/修改什么及原因。至少20字，数值取自本场实际报表。',
      why: '仅把时钟推进到年末不能证明完成了分析。年度说明与真实时点一起保存，让政策修订有依据。此项不改变原四类说明的评分规则。',
      verify: '第' + year + '年末之后，存在该年度类别的不少于20字说明。提前填好的年度说明不算。',
      complete: v.notes.some(n => n.topic === '第' + year + '年经营复盘' && n.hour >= boundary && n.text.trim().length >= 20), evidence: v.notes.filter(n => n.topic === '第' + year + '年经营复盘').map(n => hourLabel(n.hour) + '，' + n.text.trim().length + '字') });
  }
  add({ id: 'close', chapter: '08 结业与保存', title: '核对经营期末的未完成责任', tab: 'analysis', target: 'seal',
    now: '到期末后检查六类业务、尚未恢复事件、债务、应收与租赁/合同后续义务。先完成四类决策说明，再封存本场。经营期后无法继续维修，未恢复责任要如实写入异常说明。',
    answer: '教学路线完成不等于满分。期末未完成量、货损和义务如实保留；封存会使本场只读，后续探索可复制为个人练习。',
    why: '负面结果同样是学习证据，不能删货批或倒改过去的政策来美化成绩。',
    verify: '到达经营期末、四类说明完整，并由本人点击底部“封存本场”。未恢复事项保留在期末结果。', complete: v.hour >= v.horizon && v.sealed && Object.keys(noteReferences).every(t => v.notes.some(n => n.topic === t && n.text.trim().length >= 20)), evidence: ['期末：' + (v.hour >= v.horizon ? '已到达' : '未到达'), '封存：' + (v.sealed ? '是' : '否'), '未恢复事件：' + v.incidents.filter(i => i.status !== 'resolved').length] });
  quiz({ id: 'archive', chapter: '08 结业与保存', title: '确认保存、回放与正式回执的区别', tab: 'storage', target: 'storage-export',
    now: '导出完整经营记录与月度CSV，再用只读检查点查看过去并返回当前现场。学习报告在完整教学路线页导出。',
    answer: '本机自动保存用于继续经营；完整JSON用于备份与重放；CSV用于分析；学习报告用于复盘。正式任务须在本人绑定的场次主动提交，收到“已核验”后才算平台完成接收核验。',
    why: '关闭页面、更换地址、清理浏览器和平台提交是不同操作。明确每份文件和回执的用途，才能避免把本机存档误当成作业已交。',
    verify: '回答保存口径问题；实际下载文件还应在浏览器下载列表确认。',
    quiz: { question: '页面显示“已保存”，是否表示教师已收到正式作业？', correct: 'local', options: [
      { id: 'sent', text: '是，自动保存就会提交给教师', feedback: '自动保存写入当前浏览器的本机数据库，不会自动交作业。' },
      { id: 'local', text: '只是本机保存，正式提交还需要绑定场次和平台核验回执', feedback: '正确。自由教学练习与正式场次分别保存，平台核验会独立重放经营记录。' },
    ] } });
  return steps;
}

export function enterpriseIncidentLesson(v: EnterpriseView): { incident: EnterpriseView['incidents'][number]; tab: string; action: 'audit' | 'isolate' | 'wait' | 'recover' | 'repair' | 'ended'; target: string; title: string; instruction: string; planHour?: number } | undefined {
  const incident = v.incidents.find(i => i.status !== 'resolved');
  if (!incident) return undefined;
  const base = { incident, tab: 'emergency' };
  if(v.hour>=v.horizon)return {...base,tab:'analysis',action:'ended',target:'analysis-goods',title:'保留期末未恢复责任',instruction:'经营期已经结束，不能继续技术工作。请把本事件的状态、未完成修复及业务影响如实写入“异常与边界”，再封存。本机原记录不会被删除。'};
  if (!incident.evidence) return { ...base, action: 'audit', target: 'incident-' + incident.id + '-audit', title: '先核查证据', instruction: '点击“核查证据”，确认影响范围与独立业务记录。仅隔离还不能启动修复。' };
  if (incident.status === 'active') return { ...base, action: 'isolate', target: 'incident-' + incident.id + '-isolate', title: '隔离影响范围', instruction: '证据已核查，点击“隔离范围”。控制范围会限制业务，尚未表示恢复。' };
  if (incident.resolves !== null) return { ...base, action: 'wait', target: 'incidents', title: '等待实际技术完成', instruction: '技术计划时点为' + hourLabel(incident.resolves) + '；本模型在小时结算中验收，请推进到' + hourLabel(incident.resolves+1) + '后核对恢复按钮。此时不能提前恢复。', planHour: incident.resolves+1 };
  if (incident.response === 'repair') return { ...base, action: 'recover', target: 'incident-' + incident.id + '-recover', title: '核对后确认恢复', instruction: '技术工作已经完成。点击“确认恢复”，观察事件变为已恢复；积压会继续沿原业务处理。' };
  return { ...base, action: 'repair', target: 'incident-' + incident.id + '-repair', title: '安排技术修复', instruction: '点击“技术修复”（30000元，需当班技术人员）。如需短期连续性，可先启用备用（45000元）；备用仍需修复与恢复确认。若提示技术人员不足，检查当班排班与在修设备，可补入已培训后备班组或按底部工具栏推进1小时后复核。' };
}
