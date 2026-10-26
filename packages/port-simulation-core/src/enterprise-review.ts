import { sha256Hex } from './sha256.js';
import { assetSpec, ENTERPRISE_PARAMETER_NOTES } from './enterprise-catalogue.js';
import { assertEnterprise, cleanEnterpriseConfig, createEnterprise, executeEnterprise, validateEnterpriseCommand } from './enterprise-engine.js';
import { ENTERPRISE_RULES, ENTERPRISE_VERSION, ENTERPRISE_NOTE_TOPICS, CARGO_LABELS, hourLabel, quarterIndex, type EnterpriseRecord, type EnterpriseScore, type EnterpriseState } from './enterprise-model.js';
import { assetValue, bookValue, clamp, leaseDeliveryHour, money, terminalStock, weather } from './enterprise-support.js';

export const ENTERPRISE_SUBMISSION_SCHEMA = 'port-enterprise-submission/1' as const;
export interface EnterprisePackage { schema: typeof ENTERPRISE_SUBMISSION_SCHEMA; record: EnterpriseRecord; expected: { hash: string; score: number }; }
export function enterpriseRecord(s: EnterpriseState): EnterpriseRecord { return { schema: s.schema, rules: { ...s.rules }, config: { ...s.config }, commands: s.journal.map(j => structuredClone(j.command)) }; }
export function restoreEnterprise(value: unknown, position?: number,onProgress?:(hour:number)=>void): EnterpriseState {
  const raw = JSON.stringify(value);
  if (!raw || new TextEncoder().encode(raw).length > 8_000_000 || !value || typeof value !== 'object' || Array.isArray(value)) throw Error('经营记录为空或超过8MB。');
  const r = value as EnterpriseRecord;
  if (Object.keys(r).some(k => !['schema', 'rules', 'config', 'commands'].includes(k)) || r.schema !== ENTERPRISE_VERSION || JSON.stringify(r.rules) !== JSON.stringify(ENTERPRISE_RULES)) throw Error('经营记录的引擎、设备目录或规则版本不兼容；原文件应保留。');
  const config = cleanEnterpriseConfig(r.config);
  if (!Array.isArray(r.commands) || r.commands.length > 75000) throw Error('指令记录无效或超过75,000条。');
  r.commands.forEach(validateEnterpriseCommand);
  const stop = position === undefined ? r.commands.length : Math.min(r.commands.length, Math.max(0, Math.floor(position)));
  let s = createEnterprise(config);
  for (let i = 0; i < stop; i++) s = executeEnterprise(s, r.commands[i]!,onProgress,true);
  assertEnterprise(s); return s;
}
export function enterpriseHash(s: EnterpriseState) { const { journal, ...business } = s; return sha256Hex(new TextEncoder().encode(JSON.stringify(business))); }
export function enterpriseGoods(s: EnterpriseState) {
  return Object.entries(CARGO_LABELS).map(([kind, info]) => {
    const lots = s.lots.filter(l => l.goods === kind), due = lots.filter(l => l.deadline <= s.hour);
    const generated = lots.reduce((n, l) => n + l.quantity, 0), dueQuantity = due.reduce((n, l) => n + l.quantity, 0);
    const delivered = lots.reduce((n, l) => n + l.completed, 0), onTime = due.reduce((n, l) => n + l.completed - l.lateUnits, 0);
    return { kind, ...info, generated, due: dueQuantity, delivered, onTime, lost: lots.reduce((n, l) => n + l.lost, 0), outstanding: generated - delivered - lots.reduce((n, l) => n + l.lost, 0), revenue: lots.reduce((n, l) => n + l.revenue, 0),averageTime:delivered?lots.reduce((n,l)=>n+l.completedTimeSum,0)/delivered:null,systemUnitHours:lots.reduce((n,l)=>n+l.waitingUnitHours,0), fulfillment: dueQuantity ? onTime / dueQuantity : null };
  });
}
export function enterpriseScore(s: EnterpriseState): EnterpriseScore {
  const goods = enterpriseGoods(s), observed = goods.filter(g => g.due > 0), rate = observed.length ? observed.reduce((n, g) => n + (g.fulfillment ?? 0), 0) / observed.length : 0;
  const value = assetValue(s), receivables = s.receivables.reduce((n, r) => n + r.amount, 0), inventory = money(s.fuelStock * 7.2 + s.spareParts * 4000);
  const leases = s.assets.filter(a => a.ownership === 'leased' && a.status !== 'retired').reduce((n, a) => n + Math.max(0, Math.min(90, Math.ceil((leaseDeliveryHour(a) + 365 * 24 - s.hour) / 24))) * assetSpec(a.model).leaseDaily, 0);
  const contracts = s.contracts.filter(c => c.accepted && !c.settled).reduce((n, c) => n + Math.max(0, c.promised - c.shipped) * c.price * c.penalty, 0);
  const prepaidLease=s.assets.reduce((n,a)=>n+a.leaseCredit,0);
  // Prepaid rent is already an asset below; keep gross exit obligations here.
  const futureObligations = money(leases + contracts), equity = money(s.cash + value + receivables + inventory+prepaidLease - s.debt - futureObligations);
  const profit = s.months.reduce((n, m) => n + m.revenue - m.operating - m.interest - m.depreciation - m.tax, 0);
  const complete = s.hour >= s.horizon, progress = s.hour / s.horizon;
  const active = s.assets.filter(a => a.status !== 'retired' && a.readyHour <= s.hour), health = active.length ? active.reduce((n, a) => n + a.health / 100, 0) / active.length : 0;
  const unresolved = s.incidents.filter(i => i.status !== 'resolved').length;
  const notes = new Set(s.notes.filter(n => ENTERPRISE_NOTE_TOPICS.includes(n.topic) && n.text.trim().length >= 20).map(n => n.topic)).size;
  const observedLoss = goods.filter(g => g.generated > 0);
  const lossRate = observedLoss.length ? observedLoss.reduce((n, g) => n + g.lost / g.generated, 0) / observedLoss.length : 0;
  const conversion: Record<string, number> = { container: 1, bulk: .1, liquid: .12, general: .3, roro: .5, passenger: .04 };
  const work = goods.reduce((n, g) => n + g.delivered * conversion[g.kind]!, 0), intensity = work ? s.stats.emissions / work : 0;
  const pieces = [
    { id: 'service', label: '到期履约', max: 30, value: rate, detail: '六类业务分别计算到期按时交付率，再取平均；未完成与货损留在分母。' },
    { id: 'finance', label: '经营与资金', max: 20, value: clamp(.4 + (equity - s.initialEquity) / Math.max(1, s.initialEquity * .15), 0, 1) * (s.cash < 0 ? .5 : 1), detail: '依据期末净资产、应收、债务、存货及后续义务；不以现金余额替代利润。' },
    { id: 'assets', label: '资产与维护', max: 15, value: health * (active.length ? active.filter(a => a.status !== 'failed').length / active.length : 0), detail: '资产健康与可用状态共同计入；闲置大额投资仍负担折旧和资金占用。' },
    { id: 'safety', label: '风险与恢复', max: 10, value: clamp(1 - unresolved * .18 - lossRate * 10, 0, 1), detail: '保留未恢复事件与分货种货损率的平均值；被系统拒绝的安全操作不等同事故。' },
    { id: 'environment', label: '能源与环境', max: 10, value: work ? clamp(1 - intensity / 150, 0, 1) : 0, detail: '按版本化教学工作量折算因子诊断能耗影响；150为教学标尺，非现实行业标准。' },
    { id: 'coverage', label: '业务完整性', max: 5, value: goods.filter(g => g.delivered > 0).length / goods.length, detail: '六类业务均有实际交付，经营期和未完成状态分别显示。' },
    { id: 'notes', label: '决策证据', max: 10, value: Math.min(1, notes / 4), detail: '四类不少于20字的决策说明仅核验完整性，不自动评价文字质量。' },
  ];
  const earned = clamp(progress, 0, 1);
  const components = pieces.map(p => ({ id: p.id, label: p.label, max: p.max, score: Math.round(p.max * p.value * earned * 100) / 100, detail: p.detail }));
  const completedWaiting=s.calls.filter(c=>c.stage==='departed').reduce((n,c)=>n+c.wait.berth+c.wait.channel+c.wait.documents,0);
  return { total: Math.round(components.reduce((n, p) => n + p.score, 0) * 100) / 100, complete, progress, components, equity, assetValue: value, receivables, futureObligations, profit,prepaidLease,deliveryRate: rate, waitingHours: s.stats.departed ? completedWaiting / s.stats.departed : 0, emissionsPerUnit: intensity, benchmark: '教学诊断量规/1；分项按已完成经营期折算，原实验评分不变。' };
}
export function enterpriseView(s: EnterpriseState) {
  const visible = s.calls.filter(c => c.eta <= s.hour + 24 && c.stage !== 'departed');
  const ids = new Set(visible.map(c => c.id));
  const lots = s.lots.filter(l => ids.has(l.callId) || l.completed + l.lost < l.quantity);
  const calls = visible.map(({ arrival, issue, ...c }) => ({ ...c, actualArrival: c.arrivedHour, needsCorrection: c.documents.manifest.status === 'correction' }));
  return {
    schema: s.schema, rules: s.rules, config: s.config, hour: s.hour, date: hourLabel(s.hour), horizon: s.horizon, sealed: s.sealed,
    quarter: quarterIndex(s.hour) + 1, weather: weather(s), cash: s.cash, debt: s.debt, score: enterpriseScore(s), goods: enterpriseGoods(s),
    terminals: s.terminals.map(t => ({ ...t, stock: terminalStock(s, t.id), queued: visible.filter(c => c.terminalId === t.id && c.stage === 'waiting').length })),
    assets: s.assets, crews: s.crews, calls, lots, outstandingLots: lots.length,
    projects: s.projects, contracts: s.contracts, customers: s.customers, incidents: s.incidents, policy: s.policy, stats: s.stats,
    events: s.events.slice(-120), months: s.months, ledger: s.ledger.slice(-400), notes: s.notes, gridKw: s.gridKw, solarKw: s.solarKw,
    digitalLevel: s.digitalLevel, fuelStock: s.fuelStock, spareParts: s.spareParts, governance: s.governance, concessionRate: s.concessionRate,
    journal: s.journal.map(({ hour, command, ok, message }, index) => ({ index, hour, kind: command.kind, ok, message })),
    assetBooks: Object.fromEntries(s.assets.map(a => [a.id, bookValue(s, a)])), parameters: ENTERPRISE_PARAMETER_NOTES,
    result: s.journal.at(-1) ?? null,
  };
}
export type EnterpriseView = ReturnType<typeof enterpriseView>;
export function makeEnterprisePackage(s: EnterpriseState): EnterprisePackage {
  if (!s.sealed) throw Error('请先封存个人经营记录。');
  assertEnterprise(s);
  return { schema: ENTERPRISE_SUBMISSION_SCHEMA, record: enterpriseRecord(s), expected: { hash: enterpriseHash(s), score: enterpriseScore(s).total } };
}
export function verifyEnterprisePackage(pkg: EnterprisePackage) {
  if (!pkg || pkg.schema !== ENTERPRISE_SUBMISSION_SCHEMA || !pkg.expected || !/^[a-f0-9]{64}$/.test(pkg.expected.hash) || !Number.isFinite(pkg.expected.score)) throw Error('经营提交包格式无效。');
  const s = restoreEnterprise(pkg.record);
  if (!s.sealed || enterpriseHash(s) !== pkg.expected.hash || enterpriseScore(s).total !== pkg.expected.score) throw Error('经营记录、状态或成绩与独立重放不一致。');
  return { result: enterpriseScore(s), stateHash: enterpriseHash(s), config: s.config, hour: s.hour, complete: s.hour === s.horizon, view: enterpriseView(s) };
}
export function enterpriseCsv(s: EnterpriseState) {
  const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const header = ['月份', '收入元', '运营成本元', '投资现金支出元', '利息元', '折旧元', '税费元', '月末现金元', '月末债务元', '购电及充电量kWh', '模型排放kgCO2e'];
  return '\ufeff' + [header, ...s.months.map(m => [m.month, m.revenue, m.operating, m.capital, m.interest, m.depreciation, m.tax, m.cashEnd, m.debtEnd, m.energy, m.emissions])].map(row => row.map(escape).join(',')).join('\r\n');
}
