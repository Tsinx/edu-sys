import { assetSpec, projectSpec } from './enterprise-catalogue.js';
import { advanceEnterpriseHour } from './enterprise-operations.js';
import {applyManagementPlan,applyStaffPlan,applyYardPlan,authorizeIncident,createManagement,needsManagementAttention} from './enterprise-management.js';
import {assertYards} from './enterprise-yard.js';
import { ENTERPRISE_RULES, ENTERPRISE_VERSION, CARGO_LABELS, STAFF_LABELS, enterpriseHorizon, enterpriseRandom, quarterIndex, type Asset, type CargoKind, type Crew, type EnterpriseCommand, type EnterpriseConfig, type EnterpriseState, type StaffRole, type Terminal } from './enterprise-model.js';
import { arrivals, assetValue, bookValue, clamp, event, leaseDeliveryHour, market, money, post, spend, terminal, terminalStock, weather } from './enterprise-support.js';

export function cleanEnterpriseConfig(value: unknown): EnterpriseConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('经营任务参数无效。');
  const v = value as EnterpriseConfig;
  if (Object.keys(v).some(k => !['seed', 'years', 'scenario', 'mode'].includes(k)) || !Number.isSafeInteger(v.seed) || v.seed < 1 || v.seed > 2147483647 || ![1, 3, 5].includes(v.years) || !['balanced', 'growth', 'green', 'resilience'].includes(v.scenario) || !['practice', 'exam'].includes(v.mode)) throw Error('请选择有效的种子、经营期、情境和模式。');
  return { seed: v.seed, years: v.years, scenario: v.scenario, mode: v.mode };
}
const term = (id: string, name: string, goods: CargoKind, position: [number, number], options: Partial<Terminal> = {}): Terminal => ({ id, name, goods, position, length: 330, depth: 13.5, rail: false, shore: false, storageCapacity: goods === 'container' ? 2600 : goods === 'liquid' ? 14000 : goods === 'bulk' ? 18000 : 2200, distance: 1.6, gridLevel: 1, automation: 0, security: 0, dustControl: 0, floodProtection: 0, bonded: false, berthCall: null, constructionUntil: 0, enabled: true, ...options });
export function createEnterprise(config: EnterpriseConfig = { seed: 20261025, years: 3, scenario: 'balanced', mode: 'practice' }): EnterpriseState {
  const clean = cleanEnterpriseConfig(config);
  const s: EnterpriseState = {
    schema: ENTERPRISE_VERSION, rules: { ...ENTERPRISE_RULES }, config: clean, hour: 0, horizon: enterpriseHorizon(clean.years),
    terminals: [term('T1', '东湾集装箱一作业区', 'container', [0, 0]), term('T2', '东湾集装箱二作业区', 'container', [1, 0], { rail: true, shore: true, distance: 2.1 }), term('T3', '北岸散货码头', 'bulk', [2, 0]), term('T4', '液散储运区', 'liquid', [0, 1]), term('T5', '件杂货码头', 'general', [1, 1]), term('T6', '滚装作业区', 'roro', [2, 1]), term('T7', '客运与渡运站', 'passenger', [3, 1], { length: 180, depth: 8, distance: 1 })],
    assets: [], crews: [], calls: [], lots: [], customers: [], contracts: [], projects: [], incidents: [],management:createManagement(),
    policy: { autoBerth: true, documents: 'automatic', verifiedExceptions: true, priority: 'deadline', maintenance: 'preventive', maintenanceHealth: 65, shorePower: true, roadQuota: 240, railHour: 10, bargeHour: 16, transport: 'balanced', tariff: 1, reserveCash: 5_000_000, insurance: true, autoSupplies: true },
    cash: 85_000_000, debt: 20_000_000, initialEquity: 0, initialAssetValue: 0, receivables: [], ledger: [], months: [],
    stats: { generated: 0, delivered: 0, onTime: 0, lost: 0, unloaded: 0, loaded: 0, waitingUnitHours: 0, vesselWaiting: 0, vesselHours: 0, departed: 0, rehandles: 0, energy: 0, fuel: 0, emissions: 0, spillExposure: 0, roadWaiting: 0, maintenance: 0, unsafeAttempts: 0, recovered: 0, decisionNotes: 0 },
    events: [], eventSequence: 0, journal: [], notes: [], gridKw: clean.scenario === 'green' ? 2600 : 4200, solarKw: 0, digitalLevel: 1, fuelStock: 60000, spareParts: 18, governance: 'integrated', concessionRate: .025, lastMarketQuarter: -1, sealed: false, nextId: 1,
  };
  const initial: Record<string, string[]> = {
    T1: ['sts-standard', 'sts-wide', 'diesel-tractor', 'diesel-tractor', 'diesel-tractor', 'electric-tractor', 'rtg', 'reachstacker', 'manual-gate', 'manual-gate'],
    T2: ['sts-standard', 'sts-wide', 'diesel-tractor', 'diesel-tractor', 'diesel-tractor', 'diesel-tractor', 'rmg', 'manual-gate', 'manual-gate'],
    T3: ['ship-loader', 'bulk-conveyor', 'stacker', 'bulk-gate'], T4: ['liquid-arm', 'liquid-pipeline', 'tank-pump', 'liquid-dispatch'],
    T5: ['mobile-crane', 'forklift', 'warehouse-kit', 'general-gate'], T6: ['roro-ramp', 'tugmaster', 'roro-yard', 'roro-gate'], T7: ['passenger-gangway', 'passenger-transfer', 'passenger-hall', 'passenger-gate'],
  };
  for (const [id, models] of Object.entries(initial)) for (const model of models) addAsset(s, model, id, 'owned', true);
  addAsset(s, 'tug', 'T1', 'owned', true); addAsset(s, 'tug', 'T2', 'owned', true);
  const sizes: Record<StaffRole, number> = { crane: 8, driver: 15, yard: 9, gate: 13, technician: 4, marine: 6, digital: 3, handling: 9 };
  for (const role of Object.keys(sizes) as StaffRole[]) for (const shift of [0, 1, 2] as const) s.crews.push({ id: 'crew-' + role + '-' + shift, role, count: sizes[role], shift, skill: shift === 2 ? 78 : 90, trainingUntil: 0, trainingGain: 0, hiredHour: 0, wage: role === 'technician' || role === 'digital' ? 68 : 48 });
  for (const goods of Object.keys(CARGO_LABELS) as CargoKind[]) s.customers.push({ id: 'customer-' + goods, name: ({ container: '海联班轮', bulk: '北岸产业物流', liquid: '东湾化工物流', general: '装备贸易公司', roro: '汽车供应链', passenger: '湾区客运' })[goods], goods, loyalty: 80, served: 0, late: 0, rate: CARGO_LABELS[goods].rate });
  s.initialAssetValue = assetValue(s); s.initialEquity = s.cash + s.initialAssetValue + s.fuelStock * 7.2 + s.spareParts * 4000 - s.debt;
  market(s); arrivals(s); event(s, 'start', '独立接管东湾港', '全部参数为教学情境。每名学生管理独立港口，运行与存档留在本机。');
  return s;
}
function addAsset(s: EnterpriseState, model: string, terminalId: string, ownership: Asset['ownership'], initial = false) {
  const spec = assetSpec(model), id = 'asset-' + s.nextId++, old = initial ? 2 + enterpriseRandom(s.config.seed, id, 0) * 4 : 0;
  const health = initial ? 64 + Math.round(enterpriseRandom(s.config.seed, 'health-' + id, 0) * 30) : 100;
  s.assets.push({ id, model, terminalId, ownership, orderedHour: s.hour, readyHour: initial ? 0 : s.hour + spec.leadDays * 24, commissionedHour: initial ? 0 : null, status: initial ? 'active' : 'ordered', ageHours: initial ? Math.round(old * 1500) : 0, workedHours: 0, serviceHours: initial ? Math.round(spec.maintenanceHours * .35) : 0, health, battery: spec.battery, batteryHealth: initial ? .9 : 1, repairUntil: null, purchasePrice: spec.price, residual: Math.round(spec.price * .1), bookAtStart: initial ? Math.round(spec.price * (1 - old / spec.lifeYears)) : spec.price, oldAgeYears: old, downtimeHours: 0, lastWork: 0,leaseCredit:ownership==='leased'?spec.leaseDaily*30:0,note: initial ? '接管时在用设备' : '订购中，等待交付' });
  return id;
}
function integer(n: number, min: number, max: number) { if (!Number.isSafeInteger(n) || n < min || n > max) throw Error('数值应为' + min + '至' + max + '之间的整数。'); return n; }
function text(value: unknown, limit = 300) { if (typeof value !== 'string' || !value.trim() || value.length > limit) throw Error('文本为空或过长。'); return value.trim(); }
function findAsset(s: EnterpriseState, id: string) { const a = s.assets.find(a => a.id === id); if (!a || a.status === 'retired') throw Error('设备不存在或已退出运营。'); return a; }
function findCrew(s: EnterpriseState, id: string): Crew { const c = s.crews.find(c => c.id === id); if (!c) throw Error('班组不存在。'); return c; }
function availableTechnicians(s: EnterpriseState) { return Math.max(0, s.crews.filter(c => c.role === 'technician' && c.shift === Math.floor(s.hour % 24 / 8) && c.trainingUntil <= s.hour).reduce((n, c) => n + c.count*c.skill/100, 0) - s.assets.filter(a=>a.status==='maintenance').length-s.incidents.filter(i=>i.resolves!==null).length); }
const commandFields: Record<EnterpriseCommand['kind'], string[]> = {
  'management-plan':['patch'],'yard-plan':['terminalId','patch'],'staff-plan':['template'],'incident-plan':['incidentId','plan','budget'],
  advance: ['hours', 'stopOnIncident'], policy: ['patch'], 'order-asset': ['model', 'terminalId', 'ownership'], 'assign-asset': ['assetId', 'terminalId'], maintain: ['assetId', 'overhaul'], dispose: ['assetId'], project: ['type', 'terminalId'], hire: ['role', 'count', 'shift'], staff: ['crewId', 'shift'], train: ['crewId'], 'release-staff': ['crewId'], berth: ['callId', 'terminalId'], document: ['callId', 'document', 'reference'], inspect: ['lotId'], route: ['lotId', 'route', 'bonded'], 'accept-contract': ['contractId'], respond: ['incidentId', 'action'], loan: ['amount'], repay: ['amount'], supplies: ['item', 'quantity'], governance: ['value'], note: ['topic', 'text'], seal: [],
};
export function validateEnterpriseCommand(value: unknown): asserts value is EnterpriseCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('指令格式无效。');
  const v = value as EnterpriseCommand;
  if (!Object.hasOwn(commandFields, v.kind) || Object.keys(v).some(k => k !== 'kind' && !commandFields[v.kind].includes(k)) || JSON.stringify(v).length > 18000) throw Error('未知指令、附加字段或指令过长。');
  for (const x of Object.values(v)) if (typeof x === 'number' && !Number.isFinite(x)) throw Error('指令含非有限数值。');
  const finite = (x: unknown): void => { if (typeof x === 'number' && !Number.isFinite(x)) throw Error('指令含非有限数值。'); if (x && typeof x === 'object') Object.values(x).forEach(finite); };
  finite(v);
}
function apply(s: EnterpriseState, c: EnterpriseCommand, onProgress?: (hour: number) => void) {
  if (s.sealed) throw Error('场次已经封存，只能回放或另开练习。');
  if (s.hour >= s.horizon && !['note', 'seal', 'repay'].includes(c.kind)) throw Error('经营期已结束，请完成复盘并封存。');
  switch (c.kind) {
    case 'management-plan':return applyManagementPlan(s,c.patch);
    case 'yard-plan':return applyYardPlan(s,c.terminalId,c.patch);
    case 'staff-plan':return applyStaffPlan(s,c.template);
    case 'incident-plan':return authorizeIncident(s,c.incidentId,c.plan,c.budget);
    case 'advance': {
      integer(c.hours, 1, 24 * 93); if (c.stopOnIncident !== undefined && typeof c.stopOnIncident !== 'boolean') throw Error('观察选项无效。');
      const end = Math.min(s.horizon, s.hour + c.hours), before = s.hour;
      const attention=new Set(s.incidents.filter(needsManagementAttention).map(i=>i.id));
      while (s.hour < end) { advanceEnterpriseHour(s); if (s.hour % 24 === 0) onProgress?.(s.hour); if (c.stopOnIncident && s.incidents.some(i=>needsManagementAttention(i)&&!attention.has(i.id))) break; }
      if (s.hour === s.horizon) event(s, 'complete', '经营期结束', '未完成货物、应收、借款和合同义务保留在期末报表。');
      return '已推进' + (s.hour - before) + '小时；库存、在制业务和资产历史连续保留。';
    }
    case 'policy': {
      if (!c.patch || typeof c.patch !== 'object' || Array.isArray(c.patch)) throw Error('策略格式无效。');
      const next = { ...s.policy };
      for (const [key, value] of Object.entries(c.patch)) {
        if (!Object.hasOwn(next, key)) throw Error('未知策略字段。');
        if (['autoBerth', 'verifiedExceptions', 'shorePower', 'insurance', 'autoSupplies'].includes(key) && typeof value !== 'boolean') throw Error('策略开关无效。');
        const ranges: Record<string, [number, number]> = { maintenanceHealth: [30, 90], roadQuota: [20, 600], railHour: [0, 23], bargeHour: [0, 23], tariff: [.7, 1.5], reserveCash: [0, 50_000_000] };
        if (ranges[key] && (typeof value !== 'number' || !Number.isFinite(value) || value < ranges[key]![0] || value > ranges[key]![1] || ['railHour', 'bargeHour', 'roadQuota'].includes(key) && !Number.isInteger(value))) throw Error('策略数值超出允许范围。');
        const enums: Record<string, string[]> = { documents: ['automatic', 'manual'], priority: ['deadline', 'fifo', 'export'], maintenance: ['preventive', 'reactive'], transport: ['road', 'rail', 'barge', 'balanced'] };
        if (enums[key] && !enums[key]!.includes(String(value))) throw Error('策略选项无效。');
        Object.assign(next, { [key]: value });
      }
      s.policy = next; return '运行策略已更新；只影响后续业务，不改写已发生结果。';
    }
    case 'order-asset': {
      const spec = assetSpec(c.model), t = terminal(s, c.terminalId);
      if (!spec.goods.includes(t.goods) && spec.stage !== 'marine') throw Error('设备不适用于该作业区货种。');
      if (!['owned', 'leased'].includes(c.ownership)) throw Error('请选择购置或租赁。');
      if (s.assets.filter(a => a.status !== 'retired').length >= 300) throw Error('本任务最多保有300台在用或在途设备。');
      const cost = c.ownership === 'owned' ? spec.price : spec.leaseDaily * 30;
      spend(s, cost, c.ownership === 'owned' ? 'capital' : 'prepaid', spec.name + (c.ownership === 'owned' ? '购置' : '预付首月租金'));
      const id = addAsset(s, c.model, c.terminalId, c.ownership); event(s, 'order', spec.name + '订购确认', '交期' + spec.leadDays + '日；到货后核对配套条件。', id); return '订单已确认：' + id;
    }
    case 'assign-asset': {
      const a = findAsset(s, c.assetId), spec = assetSpec(a.model), t = terminal(s, c.terminalId);
      if (!spec.goods.includes(t.goods) && spec.stage !== 'marine') throw Error('该设备不能服务目标货种。');
      if (a.status !== 'active' || a.lastWork > 0) throw Error('请在设备空闲且可用时调拨。');
      spend(s, Math.round(spec.price * .001), 'relocation', '设备调拨与重新验收'); a.terminalId = t.id; a.status = 'commissioning'; a.readyHour = s.hour + 8; return '调拨已安排，至少8小时后重新调试。';
    }
    case 'maintain': {
      const a = findAsset(s, c.assetId), spec = assetSpec(a.model);
      if (!['active', 'failed'].includes(a.status) || typeof c.overhaul !== 'boolean') throw Error('设备当前不能安排检修。');
      if (availableTechnicians(s) < 1 || s.spareParts < (c.overhaul ? 3 : 1)) throw Error('需要当班技术人员及足够备件。');
      const parts = c.overhaul ? 3 : 1, cost = Math.round(spec.price * (c.overhaul ? .025 : .0015));
      spend(s, cost, 'maintenance', spec.name + (c.overhaul ? '大修' : '维修')); post(s, 'maintenance', parts * 4000, 0, '领用维修备件'); s.spareParts -= parts;
      a.status = 'maintenance'; a.repairUntil = s.hour + (c.overhaul ? spec.repairDays * 72 : spec.repairDays * 24); a.health = c.overhaul ? 98 : Math.max(80, a.health); a.lastWork = 0; s.stats.maintenance++; return '检修已排程，设备停用与相关费用已记录。';
    }
    case 'dispose': {
      const a = findAsset(s, c.assetId), spec = assetSpec(a.model);
      if (a.status === 'retired') throw Error('该设备已退出运营。');
      if (a.lastWork > 0 || a.status === 'maintenance') throw Error('请先完成当前作业或检修，再退出设备。');
      const value = bookValue(s, a), proceeds = a.ownership === 'owned' ? Math.round(value * (.45 + .35 * a.health / 100)) : 0;
      if (a.ownership === 'leased') { const fee = Math.max(0, Math.min(90, Math.ceil((leaseDeliveryHour(a) + 365 * 24 - s.hour) / 24))) * spec.leaseDaily,credit=Math.min(fee,a.leaseCredit); spend(s, fee-credit, 'lease', '租赁设备提前退出责任');post(s,'lease',credit,0,'预付租金抵扣退出责任');if(a.leaseCredit>credit)post(s,'prepaid',0,a.leaseCredit-credit,'未使用预付租金退回');a.leaseCredit=0; }
      else { post(s, 'disposal', 0, proceeds, '设备处置回款'); post(s, 'disposal-loss', Math.max(0, value - proceeds), 0, '处置账面损失'); }
      a.status = 'retired'; a.note = '已退出运营'; return '设备处置完成，保留历史记录。';
    }
    case 'project': {
      const spec = projectSpec(c.type), t = terminal(s, c.terminalId);
      if (s.projects.some(p => p.type === c.type && p.terminalId === c.terminalId && p.status === 'building')) throw Error('相同项目正在建设。');
      if (['rail', 'shore', 'bonded'].includes(spec.effect) && (spec.effect === 'rail' ? t.rail : spec.effect === 'shore' ? t.shore : t.bonded)) throw Error('该作业区已具备此项条件。');
      if (['depth', 'berth'].includes(spec.effect) && t.berthCall) throw Error('泊位仍有船舶，需先完成当前挂靠再施工。');
      spend(s, spec.price, 'capital', spec.name); const completes = s.hour + spec.days * 24;
      s.projects.push({ id: 'project-' + s.nextId++, type: c.type, terminalId: t.id, started: s.hour, completes, price: spec.price, status: 'building' });
      if (['depth', 'berth'].includes(spec.effect)) t.constructionUntil = Math.max(t.constructionUntil, completes);
      event(s, 'construction', spec.name + '开工', spec.description, t.id); return '建设已安排，' + spec.days + '日后完成。';
    }
    case 'hire': {
      if (!Object.hasOwn(STAFF_LABELS, c.role) || ![0, 1, 2, 'reserve'].includes(c.shift)) throw Error('岗位或班次无效。');
      integer(c.count, 1, 50); if (s.crews.reduce((n, g) => n + g.count, 0) + c.count > 800) throw Error('本情境人员总量最多800人。');
      spend(s, c.count * 6500, 'recruitment', '招聘与入岗培训');
      s.crews.push({ id: 'crew-' + s.nextId++, role: c.role, count: c.count, shift: c.shift, skill: 70, trainingUntil: s.hour + 7 * 24, trainingGain: 10, hiredHour: s.hour, wage: c.role === 'digital' || c.role === 'technician' ? 68 : 48 }); return '人员已招聘，完成7日培训后可排班。';
    }
    case 'staff': {
      const g = findCrew(s, c.crewId); if (![0, 1, 2, 'reserve'].includes(c.shift)) throw Error('班次无效。');
      if (g.trainingUntil > s.hour) throw Error('培训尚未结束，不能调整到生产班次。');
      g.shift = c.shift;s.management.plan.staffing='custom'; return '班组已分配至一个班次；其余时段休息。';
    }
    case 'train': {
      const g = findCrew(s, c.crewId); if (g.trainingUntil > s.hour || g.skill >= 100) throw Error('班组正在培训或已达到本情境技能上限。');
      spend(s, g.count * 2200, 'training', '岗位技能提升'); g.trainingUntil = s.hour + 7 * 24; g.trainingGain = 10; return '培训已开始，期间不计入可用生产人员。';
    }
    case 'release-staff': { const g = findCrew(s, c.crewId); spend(s, g.count * 6000, 'staff-transition', '人员退出与转岗安排'); s.crews = s.crews.filter(x => x.id !== g.id); return '人员退出已结算。'; }
    case 'berth': {
      const c1 = s.calls.find(x => x.id === c.callId), t = terminal(s, c.terminalId); if (!c1 || !['announced', 'waiting'].includes(c1.stage)) throw Error('该挂靠当前不能预约泊位。');
      if (c1.goods !== t.goods || c1.length > t.length || c1.draft > t.depth + 1.6) throw Error('船型、货种或水深与目标泊位不适配。');
      if (t.id !== c1.terminalId && s.lots.some(l => l.callId === c1.id && (l.yard > 0 || l.apron > 0))) throw Error('已有货物进场，不能通过改计划直接转移库存。');
      c1.plannedTerminal = t.id; return '泊位计划已登记；实际靠泊仍需手续、航道、服务资源和空闲泊位。';
    }
    case 'document': {
      const call = s.calls.find(x => x.id === c.callId); if (!call || !Object.hasOwn(call.documents, c.document)) throw Error('单证对象无效。');
      if (text(c.reference) !== call.id + '-' + c.document) throw Error('填报引用与独立业务资料不一致，请核对。');
      const doc = call.documents[c.document]; if (doc.status === 'approved') throw Error('该项已获得有效回执。');
      if (c.document === 'manifest') call.inspected = true;
      doc.status = 'submitted'; doc.readyHour = s.hour + Math.max(1, 4 - s.digitalLevel); doc.reason = '学生核对后提交'; return '已提交，等待独立回执；提交不等于批准。';
    }
    case 'inspect': {
      const l = s.lots.find(l => l.id === c.lotId); if (!l || !l.quarantine || l.inspectionUntil !== null) throw Error('该货批没有待启动的核查。');
      spend(s, 1200, 'inspection', '异常货批核查'); l.inspectionUntil = s.hour + 6; return '核查已开始，完成前保持隔离。';
    }
    case 'route': {
      const l = s.lots.find(l => l.id === c.lotId); if (!l || l.completed + l.lost >= l.quantity) throw Error('货批不存在或已经完成。');
      const t = terminal(s, l.terminalId); if (!['road', 'rail', 'barge', 'pipeline'].includes(c.route) || typeof c.bonded !== 'boolean') throw Error('运输路径无效。');
      if (c.route === 'rail' && !t.rail || c.route === 'pipeline' && l.goods !== 'liquid' || c.bonded && !t.bonded) throw Error('缺少铁路、管道货种或监管仓储条件。');
      if(l.rehandleRemaining>0)throw Error('现有路径调整移位尚未完成。');
      if((l.flow==='import'&&l.land>0||l.connectionReady>0)&&(l.route!==c.route||l.bonded!==c.bonded))throw Error('该货批有已集结或已接车货物，请完成当前接续后再换路径。');
      if (l.yard > 0 && (l.route !== c.route || l.bonded !== c.bonded)) l.rehandleRemaining=l.yard;
      l.route = c.route; l.bonded = c.bonded; return '业务路径已调整，现有监管条件与实际库存继续保留。';
    }
    case 'accept-contract': {
      const t = s.contracts.find(x => x.id === c.contractId); if (!t || t.accepted || t.expires < s.hour) throw Error('合同已过期或已承接。');
      if (s.contracts.some(x => x.accepted && x.customerId === t.customerId && x.endHour > s.hour)) throw Error('该客户已有执行中的季度协议。');
      t.accepted = true; event(s, 'contract', '承接' + t.title, '未来到港工作量与履约责任将增加。', t.id); return '合同已承接；收入以实际交付确认。';
    }
    case 'respond': {
      const i = s.incidents.find(i => i.id === c.incidentId); if (!i || i.status === 'resolved') throw Error('事件不存在或已恢复。');
      if (c.action === 'audit') { i.evidence = true; event(s, 'incident', i.title + '完成证据核查', '核对影响范围、日志和独立业务记录。', i.id); return '影响范围与证据已记录。'; }
      if (!['isolate', 'backup', 'repair', 'recover'].includes(c.action)) throw Error('请选择有效的处置动作。');
      if (c.action === 'isolate') { i.status = 'contained'; i.response = 'isolate'; return '影响范围已隔离，业务仍受相关限制。'; }
      if (!i.evidence || i.status === 'active') throw Error('请先核查证据并隔离影响，再启动备用或恢复工作。');
      if (c.action === 'backup') { if(i.backupActive)throw Error('备用资源已启用。');spend(s, 45000, 'incident', '备用资源启用'); i.backupActive=true;if(i.resolves===null)i.response = 'backup'; return '备用已启用，持续费用与能力约束将计入运行。'; }
      if (c.action === 'repair') { if(i.resolves!==null)throw Error('技术修复已经在进行。');if (availableTechnicians(s)<1) throw Error('缺少当班技术人员。'); spend(s, 30000, 'incident', '技术修复'); i.response = 'repair'; i.resolves = s.hour + (i.type === 'system' ? Math.max(4, 18 - s.digitalLevel * 3) : 12); return '技术修复已开始，完成后仍需恢复确认。'; }
      if (i.resolves !== null || i.response !== 'repair') throw Error('技术修复尚未完成，不能提前恢复。');
      i.status = 'resolved'; s.stats.recovered++; event(s, 'recovery', i.title + '恢复运营', '证据、隔离、技术修复和恢复确认均已记录。', i.id); return '恢复已确认，积压业务继续处理。';
    }
    case 'loan': { integer(c.amount, 100000, 80_000_000); if (s.debt + c.amount > Math.max(30_000_000, assetValue(s) * .6)) throw Error('超过教学情境融资额度。'); s.debt += c.amount; post(s, 'loan', 0, c.amount, '取得借款'); return '借款已到账，按年利率6.5%月度计息。'; }
    case 'repay': { integer(c.amount, 1, 100_000_000); if (c.amount > s.debt || c.amount > s.cash) throw Error('偿付超过未还本金或可用现金。'); s.debt -= c.amount; post(s, 'repay', 0, -c.amount, '偿还借款本金'); return '本金已偿还。'; }
    case 'supplies': { integer(c.quantity, 1, c.item === 'fuel' ? 200000 : 100); if (!['fuel', 'parts'].includes(c.item)) throw Error('补给类型无效。'); const cost = money(c.quantity * (c.item === 'fuel' ? 7.2 : 4000)); spend(s, cost, 'inventory', '采购' + (c.item === 'fuel' ? '燃料' : '备件')); if (c.item === 'fuel') s.fuelStock += c.quantity; else s.spareParts += c.quantity; return '补给已入库；使用时结转相应成本。'; }
    case 'governance': { if (!['integrated', 'landlord'].includes(c.value)) throw Error('经营模式无效。'); if (s.hour > 0 && s.hour % 24 !== 0) throw Error('请在每日交接时调整经营协议。'); spend(s, 250000, 'governance', '经营协议与责任调整'); s.governance = c.value; s.concessionRate = c.value === 'landlord' ? .12 : .025; return '经营协议已调整；公共资源费用按后续收入结算。'; }
    case 'note': { const topic = text(c.topic, 100), content = text(c.text, 5000); s.notes.push({ hour: s.hour, topic, text: content }); s.stats.decisionNotes++; return '决策说明已保存到当前经营记录。'; }
    case 'seal': { if (s.hour < 24) throw Error('请至少完成一个生产日后封存。'); s.sealed = true; event(s, 'seal', '个人经营记录已封存', '封存后不能继续改写；可导出、提交或只读回放。'); return '封存完成。'; }
  }
}
export function executeEnterprise(current: EnterpriseState, command: EnterpriseCommand, onProgress?: (hour: number) => void, replayInPlace=false): EnterpriseState {
  validateEnterpriseCommand(command);
  const inPlace=replayInPlace&&command.kind==='advance'&&!current.sealed&&current.hour<current.horizon&&Number.isSafeInteger(command.hours)&&command.hours>=1&&command.hours<=24*93;
  const s = inPlace?current:structuredClone(current), at = s.hour;
  try {
    const message = apply(s, command, onProgress);
    if(!['advance','note','seal'].includes(command.kind))s.management.changes=[...s.management.changes.slice(-5),message];
    s.journal.push({ hour: at, command: structuredClone(command), ok: true, message });
    return s;
  } catch (error) {
    if(inPlace)throw error;
    const unchanged = structuredClone(current), message = error instanceof Error ? error.message : String(error);
    unchanged.journal.push({ hour: at, command: structuredClone(command), ok: false, message });
    return unchanged;
  }
}
export function assertEnterprise(s: EnterpriseState) {
  assertYards(s);
  if (s.hour < 0 || s.hour > s.horizon || !Number.isSafeInteger(s.hour)) throw Error('经营时钟无效。');
  for (const l of s.lots) {
    if(!Number.isSafeInteger(l.connectionReady)||l.connectionReady<0||l.connectionReady>l.land)throw Error('水陆接续数量无效：'+l.id);
    const values = [l.ship, l.apron, l.yard, l.land, l.completed, l.lost];
    if (values.some(n => !Number.isSafeInteger(n) || n < 0) || values.reduce((a, b) => a + b, 0) !== l.quantity) throw Error('货批守恒失败：' + l.id);
  }
  for (const t of s.terminals) {if (terminalStock(s, t.id) > t.storageCapacity) throw Error('库场容量超限：' + t.id);if(s.lots.filter(l=>l.terminalId===t.id).reduce((n,l)=>n+l.apron,0)>Math.floor(t.storageCapacity*.15))throw Error('岸边缓冲容量超限：'+t.id);for(const route of ['rail','barge'])if(s.lots.filter(l=>l.terminalId===t.id&&l.flow==='import'&&l.route===route).reduce((n,l)=>n+l.land,0)>(route==='rail'?600:500))throw Error('接续集结区容量超限：'+t.id);}
  if (![s.cash, s.debt, s.fuelStock, s.stats.generated, s.stats.delivered].every(Number.isFinite) || s.fuelStock < -.0001) throw Error('资源或资金出现非有限值。');
  if (s.lots.reduce((n, l) => n + l.quantity, 0) !== s.stats.generated || s.lots.reduce((n, l) => n + l.completed, 0) !== s.stats.delivered) throw Error('货物统计与逐批记录不一致。');
  const cash = 85_000_000 + s.ledger.reduce((n, e) => n + e.cash, 0);
  if (cash !== s.cash) throw Error('现金流水与余额不一致。');
  return true;
}
