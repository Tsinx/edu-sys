import {enterpriseDefaultReference} from './enterprise-benchmark.js';
import {financeView,depositPrincipal,nonPrincipalPayables} from './enterprise-finance.js';
import {enterpriseDirector,enterpriseTelemetryView} from './enterprise-director.js';
import { sha256Hex } from './sha256.js';
import {strategyView} from './enterprise-strategy.js';
import {managementView} from './enterprise-management.js';
import { assetSpec, ENTERPRISE_PARAMETER_NOTES } from './enterprise-catalogue.js';
import { assertEnterprise, cleanEnterpriseConfig, createEnterprise, executeEnterprise, validateEnterpriseCommand } from './enterprise-engine.js';
import { ENTERPRISE_VERSION, ENTERPRISE_NOTE_TOPICS, enterpriseRulesMatch, CARGO_LABELS, hourLabel, quarterIndex, type EnterpriseRecord, type EnterpriseScore, type EnterpriseState } from './enterprise-model.js';
import { assetValue, bookValue, clamp, leaseDeliveryHour, money, terminalStock, weather } from './enterprise-support.js';

export const ENTERPRISE_SUBMISSION_SCHEMA = 'port-enterprise-submission/1' as const;
export interface EnterprisePackage { schema: typeof ENTERPRISE_SUBMISSION_SCHEMA; record: EnterpriseRecord; expected: { hash: string; score: number }; }
export function enterpriseRecord(s: EnterpriseState): EnterpriseRecord { return { schema: s.schema, rules: { ...s.rules }, config: { ...s.config }, commands: s.journal.map(j => structuredClone(j.command)) }; }
export function restoreEnterprise(value: unknown, position?: number,onProgress?:(hour:number)=>void): EnterpriseState {
  const raw = JSON.stringify(value);
  if (!raw || new TextEncoder().encode(raw).length > 8_000_000 || !value || typeof value !== 'object' || Array.isArray(value)) throw Error('经营记录为空或超过8MB。');
  const r = value as EnterpriseRecord;
  if (Object.keys(r).some(k => !['schema', 'rules', 'config', 'commands'].includes(k)) || r.schema !== ENTERPRISE_VERSION || !enterpriseRulesMatch(r.rules)) throw Error('经营记录的引擎、设备目录或规则版本不兼容；原文件应保留。');
  const config = cleanEnterpriseConfig(r.config);
  if (!Array.isArray(r.commands) || r.commands.length > 75000) throw Error('指令记录无效或超过75,000条。');
  r.commands.forEach(validateEnterpriseCommand);
  if(position!==undefined&&(!Number.isSafeInteger(position)||position<0||position>r.commands.length))throw Error('回放指令位置无效，请选择记录范围内的整数位置。');
  const stop = position === undefined ? r.commands.length : position;
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
function enterpriseOutcomeMetrics(s:EnterpriseState){
  const goods = enterpriseGoods(s), observed = goods.filter(g => g.due > 0), rate = observed.length ? observed.reduce((n, g) => n + (g.fulfillment ?? 0), 0) / observed.length : 0;
  const value = assetValue(s), receivables = s.receivables.reduce((n, r) => n + r.amount, 0), inventory = money(s.fuelStock * 7.2 + s.spareParts * 4000+s.supplyOrders.filter(o=>o.status==='transit').reduce((n,o)=>n+o.price,0));
  const leases = s.assets.filter(a => a.ownership === 'leased' && a.status !== 'retired').reduce((n, a) => n + Math.max(0, Math.min(90, Math.ceil((leaseDeliveryHour(a) + 365 * 24 - s.hour) / 24))) * assetSpec(a.model).leaseDaily, 0);
  const contracts = s.contracts.filter(c => c.accepted && !c.settled).reduce((n, c) => n + Math.max(0, c.promised - c.shipped) * c.price * c.penalty, 0);
  const prepaidLease=s.assets.reduce((n,a)=>n+a.leaseCredit,0);
  // Prepaid rent is already an asset below; keep gross exit obligations here.
  const futureObligations = money(leases + contracts), equity = money(s.cash + depositPrincipal(s) + value + receivables + inventory+prepaidLease - s.debt - futureObligations-nonPrincipalPayables(s)-s.finance.loans.reduce((n,l)=>n+l.accruedInterest,0));
  const profit = s.months.reduce((n, m) => n + m.revenue - m.operating - m.interest - m.depreciation - m.tax, 0);
  const outcome=s.finance.status==='bankrupt'?'bankrupt' as const:s.hour>=s.horizon?'completed' as const:'operating' as const;
  const complete = outcome!=='operating', progress = s.hour / s.horizon;
  const active = s.assets.filter(a => a.status !== 'retired' && a.readyHour <= s.hour), health = active.length ? active.reduce((n, a) => n + a.health / 100, 0) / active.length : 0;
  const unresolved = s.incidents.filter(i => i.status !== 'resolved').length;
  const observedLoss = goods.filter(g => g.generated > 0);
  const lossRate = observedLoss.length ? observedLoss.reduce((n, g) => n + g.lost / g.generated, 0) / observedLoss.length : 0;
  const conversion: Record<string, number> = { container: 1, bulk: .1, liquid: .12, general: .3, roro: .5, passenger: .04 };
  const work = goods.reduce((n, g) => n + g.delivered * conversion[g.kind]!, 0), intensity = work ? s.stats.emissions / work : 0;
  const completedWaiting=s.calls.filter(c=>c.stage==='departed').reduce((n,c)=>n+c.wait.berth+c.wait.channel+c.wait.documents,0);
  return {goods,value,receivables,futureObligations,equity,profit,outcome,complete,progress,health,active,unresolved,lossRate,work,intensity,prepaidLease,
    deliveryRate:rate,waitingHours:s.stats.departed?completedWaiting/s.stats.departed:0,emissionsPerUnit:intensity};
}
export function enterpriseScore(s:EnterpriseState):EnterpriseScore{
  const m=enterpriseOutcomeMetrics(s),reference=enterpriseDefaultReference(s.config,s.hour,state=>{const x=enterpriseOutcomeMetrics(state);return {equity:x.equity,profit:x.profit,deliveryRate:x.deliveryRate,waitingHours:x.waitingHours,emissionsPerUnit:x.intensity,work:x.work};});
  const eligible=m.work>=reference.work*.85&&m.deliveryRate>=reference.deliveryRate-.03&&s.finance.status!=='bankrupt'&&s.finance.status!=='distress';
  const equityGain=m.equity-reference.equity;
  const waitingReduction=reference.waitingHours>0?(reference.waitingHours-m.waitingHours)/reference.waitingHours:0;
  const emissionsReduction=reference.emissionsPerUnit>0?(reference.emissionsPerUnit-m.intensity)/reference.emissionsPerUnit:0;
  const pieces=[
    {id:'service',label:'基础履约',max:22,value:m.deliveryRate,detail:'六类到期按时交付率分别计算，未完成与货损留在分母。'},
    {id:'finance',label:'资金与偿付',max:14,value:clamp(.4+(m.equity-s.initialEquity)/Math.max(1,s.initialEquity*.65*Math.max(.25,s.hour/8760)),0,1)*(s.finance.status==='bankrupt'?0:s.finance.status==='distress'?.5:1),detail:'净资产计入应收、债务、存货、应付及后续义务。'},
    {id:'assets',label:'资产与维护',max:11,value:m.health*(m.active.length?m.active.filter(a=>a.status!=='failed').length/m.active.length:0),detail:'健康与可用状态共同计入，闲置投资承担折旧。'},
    {id:'safety',label:'风险与恢复',max:7,value:clamp(1-m.unresolved*.18-m.lossRate*10,0,1),detail:'保留未恢复事件与分货种货损率。'},
    {id:'environment',label:'基础能源效率',max:7,value:m.work?clamp(1-m.intensity/150,0,1):0,detail:'按版本化教学工作量折算；150为教学标尺。'},
    {id:'coverage',label:'业务完整性',max:4,value:m.goods.filter(g=>g.delivered>0).length/m.goods.length,detail:'各货种分别保留自己的业务单位。'},
    {id:'improvement-finance',label:'经营改善',max:15,value:eligible?clamp(equityGain/Math.max(100000,Math.abs(reference.profit)*.05,s.initialEquity*.01*Math.max(.25,s.hour/8760)),0,1):0,detail:'同种子、同情景、同时点对照默认经营；净资产改善达到对照利润5%或初始权益每年1%时取满（取较高标尺）。'},
    {id:'improvement-service',label:'服务改善',max:10,value:eligible?clamp(waitingReduction/.25,0,1):0,detail:'对照默认经营减少平均已离港等候，减少25%取满。'},
    {id:'improvement-resource',label:'资源改善',max:10,value:eligible?clamp(emissionsReduction/.15,0,1):0,detail:'对照默认经营降低单位工作量排放，降低15%取满。'},
  ];
  const earned=clamp(m.progress,0,1),components=pieces.map(p=>({id:p.id,label:p.label,max:p.max,score:Math.round(p.max*p.value*earned*100)/100,detail:p.detail}));
  return {total:Math.min(m.outcome==='bankrupt'?40:100,Math.round(components.reduce((n,p)=>n+p.score,0)*100)/100),outcome:m.outcome,failureReason:s.finance.failureReason,complete:m.complete,progress:m.progress,components,equity:m.equity,assetValue:m.value,receivables:m.receivables,futureObligations:m.futureObligations,profit:m.profit,prepaidLease:m.prepaidLease,deliveryRate:m.deliveryRate,waitingHours:m.waitingHours,emissionsPerUnit:m.intensity,
    comparison:{reference,eligible,equityGain,waitingReduction,emissionsReduction},
    benchmark:'教学诊断量规/5：基础经营65分，同情景改善35分。改善要求工作量至少为对照85%、到期履约不低于对照3个百分点且无付款困难。文字说明供教师审阅，不按字数加分；各项按完成经营期折算。'};
}
export function enterpriseView(s: EnterpriseState) {
  const visible = s.calls.filter(c => c.eta <= s.hour + 24 && c.stage !== 'departed');
  const ids = new Set(visible.map(c => c.id));
  const lots = s.lots.filter(l => ids.has(l.callId) || l.completed + l.lost < l.quantity);
  const calls = visible.map(({ arrival, issue, ...c }) => ({ ...c, actualArrival: c.arrivedHour, needsCorrection: c.documents.manifest.status === 'correction' }));
  return {
    schema: s.schema, rules: s.rules, config: s.config, hour: s.hour, date: hourLabel(s.hour), horizon: s.horizon, sealed: s.sealed,finance:financeView(s),strategy:strategyView(s),management:managementView(s),director:enterpriseDirector(s),telemetry:enterpriseTelemetryView(s),
    quarter: quarterIndex(s.hour) + 1, weather: weather(s), cash: s.cash, debt: s.debt, score: enterpriseScore(s), goods: enterpriseGoods(s),
    terminals: s.terminals.map(t => ({ ...t, stock: terminalStock(s, t.id), queued: visible.filter(c => c.terminalId === t.id && c.stage === 'waiting').length })),
    assets: s.assets, crews: s.crews, calls, lots, outstandingLots: lots.length,
    projects: s.projects, supplyOrders:s.supplyOrders.filter(o=>o.status==='transit'||o.ordered>=s.hour-30*24),contracts: s.contracts, customers: s.customers, incidents: s.incidents, policy: s.policy, stats: s.stats,
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
export function verifyEnterprisePackage(pkg: EnterprisePackage,onProgress?:(hour:number)=>void) {
  if (!pkg || pkg.schema !== ENTERPRISE_SUBMISSION_SCHEMA || !pkg.expected || !/^[a-f0-9]{64}$/.test(pkg.expected.hash) || !Number.isFinite(pkg.expected.score)) throw Error('经营提交包格式无效。');
  const s = restoreEnterprise(pkg.record,undefined,onProgress);
  if (!s.sealed || enterpriseHash(s) !== pkg.expected.hash || enterpriseScore(s).total !== pkg.expected.score) throw Error('经营记录、状态或成绩与独立重放不一致。');
  return { result: enterpriseScore(s), stateHash: enterpriseHash(s), config: s.config, hour: s.hour, complete: s.hour === s.horizon||s.finance.status==='bankrupt', view: enterpriseView(s) };
}
export function enterpriseCsv(s: EnterpriseState) {
  const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const header = ['月份', '收入元', '运营成本元', '投资现金支出元', '利息元', '折旧元', '税费元', '月末现金元', '月末债务元','存款利息收入元','偿还本金元','月末定存本金元','月末应付款元', '用电量含补能kWh', '模型排放kgCO2e'];
  return '\ufeff' + [header, ...s.months.map(m => [m.month, m.revenue, m.operating, m.capital, m.interest, m.depreciation, m.tax, m.cashEnd, m.debtEnd,m.interestIncome,m.principalPaid,m.depositEnd,m.payablesEnd, m.energy, m.emissions])].map(row => row.map(escape).join(',')).join('\r\n');
}
