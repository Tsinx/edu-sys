import { assetSpec, projectSpec } from './enterprise-catalogue.js';
import { CARGO_LABELS, enterpriseRandom, hourDate, monthKey, quarterIndex, type Asset, type CargoKind, type EnterpriseState, type MonthReport, type EnterpriseCall, type Terminal } from './enterprise-model.js';

export const money = (n: number) => Math.round(n);
/** Original delivery date is immutable; later transfers must not restart a lease. */
export const leaseDeliveryHour = (a: Asset) => a.orderedHour + assetSpec(a.model).leadDays * 24;
export const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
export function terminal(s: EnterpriseState, id: string): Terminal { const t = s.terminals.find(t => t.id === id); if (!t) throw Error('作业区不存在。'); return t; }
export function event(s: EnterpriseState, kind: string, title: string, detail = '', object = '') {
  s.events.push({ id: ++s.eventSequence, hour: s.hour, kind, title, detail, object });
  if (s.events.length > 1200) s.events.splice(0, s.events.length - 1200);
}
const monthKeys=new WeakMap<EnterpriseState,{hour:number;key:string}>();
export function month(s: EnterpriseState): MonthReport {
  const hour=Math.min(s.hour,s.horizon-1);
  let cached=monthKeys.get(s);
  if(!cached||cached.hour!==hour){cached={hour,key:monthKey(hour)};monthKeys.set(s,cached);}
  const key=cached.key;
  let m = s.months.at(-1);
  if (!m || m.month !== key) { m = { month: key, revenue: 0, operating: 0, capital: 0, interest: 0, depreciation: 0, tax: 0, handled: 0, onTime: 0, generated: 0, energy: 0, emissions: 0, waiting: 0, rehandles: 0, cashEnd: s.cash, debtEnd: s.debt }; s.months.push(m); }
  return m;
}
export function post(s: EnterpriseState, category: string, amount: number, cash: number, note: string) {
  const a = money(amount), c = money(cash), m = month(s);
  if (category === 'revenue') m.revenue += a;
  else if (category === 'capital') m.capital += a;
  else if (category === 'interest') m.interest += a;
  else if (category === 'depreciation') m.depreciation += a;
  else if (category === 'tax') m.tax += a;
  else if (!['collection', 'loan', 'repay', 'inventory', 'disposal','prepaid'].includes(category)) m.operating += a;
  s.cash += c;
  const day = Math.floor(s.hour / 24);
  const prior = s.ledger.slice(-36).find(e => Math.floor(e.hour / 24) === day && e.category === category && e.note === note);
  if (prior) { prior.amount += a; prior.cash += c; } else s.ledger.push({ hour: s.hour, category, amount: a, cash: c, note });
  m.cashEnd = s.cash; m.debtEnd = s.debt;
}
export function spend(s: EnterpriseState, amount: number, category: string, note: string) {
  if (!Number.isFinite(amount) || amount < 0 || s.cash < amount) throw Error('可用现金不足，请调整规模、延期或安排融资。');
  post(s, category, amount, -amount, note);
}
export function bookValue(s: EnterpriseState, a: Asset) {
  if (a.status === 'retired' || a.ownership === 'leased') return 0;
  if (a.commissionedHour === null) return a.purchasePrice;
  const spec = assetSpec(a.model), remainingHours = Math.max(365 * 24, (spec.lifeYears - a.oldAgeYears) * 365 * 24);
  return money(Math.max(a.residual, a.bookAtStart - (a.bookAtStart - a.residual) * Math.max(0, s.hour - a.commissionedHour) / remainingHours));
}
export function assetValue(s: EnterpriseState) {
  return s.assets.reduce((n, a) => n + bookValue(s, a), 0) + s.projects.reduce((n, p) => n + (p.status === 'building' ? p.price : Math.round(p.price * Math.max(.1, 1 - (s.hour - p.completes) / (20 * 365 * 24)))), 0);
}
export function weather(s: EnterpriseState) {
  const day = Math.floor(s.hour / 24), r = enterpriseRandom(s.config.seed, 'weather', day), date = hourDate(s.hour);
  const severe = s.config.scenario === 'resilience' ? .055 : .018;
  const wind = r < severe ? .35 : r < .12 ? .75 : 1;
  const tide = 1 + .6 * Math.sin(s.hour / 6 * Math.PI);
  return { wind, visibility: r < severe / 2 ? .2 : 1, tide, raining: r < .22, temperature: 18 + 12 * Math.sin((date.getUTCMonth() - 2) / 12 * Math.PI * 2), label: wind < .5 ? '强风 / 限制作业' : wind < 1 ? '风况降效' : '常态' };
}
export function terminalStock(s: EnterpriseState, id: string) { return s.lots.filter(l => l.terminalId === id).reduce((n, l) => n + l.yard, 0); }
export function isBlocked(s: EnterpriseState, terminalId: string, stage: string) {
  return s.incidents.some(i => i.status !== 'resolved' && (i.terminalId === null || i.terminalId === terminalId) &&
    (i.type === 'flood' || i.type === 'spill' || i.type === 'security' || i.type === 'power' && !i.backupActive || i.type === 'system' && !i.backupActive || i.type === 'road' && stage === 'transport'));
}
export function updateProjects(s: EnterpriseState) {
  for (const p of s.projects) if (p.status === 'building' && p.completes <= s.hour) {
    const t = terminal(s, p.terminalId), effect = projectSpec(p.type).effect;
    if (effect === 'storage') t.storageCapacity = Math.round(t.storageCapacity * 1.5);
    if (effect === 'road') t.distance = Math.max(.25, t.distance * .8);
    if (effect === 'rail') t.rail = true;
    if (effect === 'shore') t.shore = true;
    if (effect === 'grid') { s.gridKw += 2500; t.gridLevel++; }
    if (effect === 'solar') s.solarKw += 1500;
    if (effect === 'automation') t.automation++;
    if (effect === 'digital') s.digitalLevel++;
    if (effect === 'security') t.security++;
    if (effect === 'flood') t.floodProtection++;
    if (effect === 'dust') t.dustControl++;
    if (effect === 'bonded') t.bonded = true;
    if (effect === 'depth') t.depth += 1.5;
    if (effect === 'berth') { t.length += 60; t.storageCapacity = Math.round(t.storageCapacity * 1.2); }
    p.status = 'completed'; event(s, 'construction', projectSpec(p.type).name + '投产', t.name, p.id);
  }
}
export function updateAssets(s: EnterpriseState) {
  let technicians = Math.max(0, s.crews.filter(c => c.role === 'technician' && c.shift === Math.floor(s.hour % 24 / 8) && c.trainingUntil <= s.hour).reduce((n, c) => n + c.count*c.skill/100, 0) - s.assets.filter(a => a.status === 'maintenance').length-s.incidents.filter(i=>i.resolves!==null).length);
  for (const a of s.assets) {
    const t = terminal(s, a.terminalId), spec = assetSpec(a.model);
    if (a.status === 'ordered' && a.readyHour <= s.hour) { a.status = 'commissioning'; event(s, 'asset', spec.name + '已交付', '检查基础、供电、接口和人员条件。', a.id); }
    if (a.status === 'commissioning' && a.readyHour <= s.hour) {
      const ready = spec.required === 'none' || spec.required === 'rail' && t.rail || spec.required === 'grid' && t.gridLevel > 0 || spec.required === 'automation' && t.automation > 0;
      if (ready) { a.status = 'active'; if(a.commissionedHour===null)a.commissionedHour=s.hour; a.note = '已投运'; event(s, 'asset', spec.name + '完成调试', t.name, a.id); }
      else a.note = '等待配套：' + ({ none: '', rail: '轨道与铁路接口', grid: '供电扩容', automation: '自动化接口' }[spec.required]);
    }
    if (a.status === 'maintenance' && a.repairUntil !== null && a.repairUntil <= s.hour) {
      a.status = 'active'; a.repairUntil = null; a.serviceHours = 0; a.health = Math.max(a.health, 92); a.batteryHealth = Math.max(a.batteryHealth, .85); a.note = '维修验收完成'; event(s, 'maintenance', spec.name + '恢复可用', a.id, a.id);
    }
    if (a.status === 'failed' && s.policy.maintenance === 'preventive' && technicians >= 1 && s.spareParts > 0 && s.cash > s.policy.reserveCash) {
      const fee = Math.round(spec.price * .0015); post(s, 'maintenance', fee + 4000, -fee, '按维修策略修复故障设备');
      s.spareParts--; technicians--; a.status = 'maintenance'; a.repairUntil = s.hour + spec.repairDays * 24; s.stats.maintenance++;
      event(s, 'maintenance', spec.name + '故障维修已排程', '领用备件并占用技术岗位；完成前保持停机。', a.id);
    }
  }
}
export function market(s: EnterpriseState) {
  const q = quarterIndex(s.hour);
  if (q === s.lastMarketQuarter) return;
  s.lastMarketQuarter = q;
  for (const customer of s.customers) {
    const late = customer.served ? customer.late / customer.served : 0;
    customer.loyalty = clamp(customer.loyalty + (late < .15 ? 3 : -8), 35, 100);
  }
  const kinds: CargoKind[] = ['container', 'bulk', 'liquid', 'general', 'roro', 'passenger'];
  for (let i = 0; i < 3; i++) {
    const goods = kinds[(q + i * 2) % kinds.length]!, customer = s.customers.find(c => c.goods === goods)!;
    s.contracts.push({ id: 'contract-' + q + '-' + i, customerId: customer.id, goods, title: customer.name + '季度服务协议', volume: 100 + Math.round(enterpriseRandom(s.config.seed, 'tender-' + i, q) * 220), price: Math.round(CARGO_LABELS[goods].rate * (1.08 + i * .04)), startHour: s.hour, endHour: Math.min(s.horizon, s.hour + 90 * 24), accepted: false, expires: s.hour + 14 * 24, shipped: 0, promised: 0, penalty: .12, settled: false });
  }
  event(s, 'market', '新季度货源与客户评估', '新增三项合同机会；已有订单、设备、建设和责任持续保留。');
}
function documents(id: string): EnterpriseCall['documents'] {
  return Object.fromEntries(['entry', 'manifest', 'customs', 'carrier', 'departure'].map(k => [k, { status: 'draft', readyHour: 0, reference: id + '-' + k, reason: '' }])) as EnterpriseCall['documents'];
}
export function arrivals(s: EnterpriseState) {
  const day = Math.floor(s.hour / 24), at = day * 24;
  if (s.calls.some(c => c.id === 'call-' + day + '-T1')) return;
  const year = hourDate(s.hour).getUTCFullYear() - 2027;
  const trend = s.config.scenario === 'growth' ? 1 + year * .18 : 1 + year * .045;
  const season = 1 + .15 * Math.sin(day / 365 * 2 * Math.PI), tariff = clamp(1.5 - s.policy.tariff * .5, .65, 1.15);
  const volume: Record<CargoKind, number> = { container: 420, bulk: 1300, liquid: 1450, general: 210, roro: 130, passenger: 320 };
  for (const [index, t] of s.terminals.entries()) {
    if (!t.enabled || t.goods !== 'container' && day % 2 === 1) continue;
    const customer = s.customers.find(c => c.goods === t.goods)!;
    const contract = s.contracts.find(c => c.accepted && c.customerId === customer.id && c.startHour <= at && c.endHour > at);
    const random = enterpriseRandom(s.config.seed, 'demand-' + t.id, day), size = Math.max(20, Math.round(volume[t.goods] * trend * season * tariff * (.8 + random * .4) * customer.loyalty / 80 + (contract?.volume ?? 0)));
    const eta = at + 6 + index % 4 * 3, arrival = Math.max(at + 1, eta + Math.round(enterpriseRandom(s.config.seed, 'eta-' + t.id, day) * 6 - 2));
    const id = 'call-' + day + '-' + t.id, large = t.goods === 'container' && random > .68;
    const c: EnterpriseCall = { id, terminalId: t.id, customerId: customer.id, name: ['东湾', '海联', '江运', '远航'][day % 4] + '-' + (day + 1) + t.id, goods: t.goods, eta, arrival, arrivedHour: null, berthedHour: null, workHour: null, departedHour: null, stage: 'announced', moveUntil: 0, plannedTerminal: null, contractId: contract?.id ?? null, length: large ? 310 : t.goods === 'passenger' ? 120 : 210, draft: large ? 13.8 : t.goods === 'passenger' ? 5 : 10, rows: large ? 22 : 16, importLot: id + '-I', exportLot: id + '-E', deadline: eta + 36, documents: documents(id), issue: enterpriseRandom(s.config.seed, 'papers-' + t.id, day) < .065, inspected: false, wait: { berth: 0, channel: 0, documents: 0, equipment: 0 }, price: contract?.price ?? Math.round(customer.rate * s.policy.tariff) };
    s.calls.push(c);
    const incoming = Math.round(size * .6), outgoing = size - incoming;
    for (const flow of ['import', 'export'] as const) {
      const quantity = flow === 'import' ? incoming : outgoing;
      s.lots.push({ connectionReady:0,id: flow === 'import' ? c.importLot : c.exportLot, callId: id, terminalId: t.id, goods: t.goods, flow, quantity, ship: flow === 'import' ? quantity : 0, apron: 0, yard: 0, land: flow === 'export' ? quantity : 0, completed: 0, lost: 0, quarantine: c.issue && flow === 'import', inspectionUntil: null, release: false, bonded: false, route: t.goods === 'liquid' ? 'pipeline' : s.policy.transport === 'balanced' ? t.rail ? 'rail' : 'road' : s.policy.transport, deadline: flow === 'export' ? c.deadline : c.deadline + 12, firstHour: flow==='export'?eta-6:eta, lastHour: s.hour, waitingUnitHours: 0, completedTimeSum:0,rehandleRemaining:0,lateUnits: 0, revenue: 0, storageFees: 0, rehandles: 0 });
    }
    if (contract) contract.promised += size;
    s.stats.generated += size; month(s).generated += size;
  }
}
export function collectAndSettle(s: EnterpriseState) {
  for (const r of s.receivables) if (r.due <= s.hour && r.amount > 0) { post(s, 'collection', 0, r.amount, '到期应收款'); r.amount = 0; }
  s.receivables = s.receivables.filter(r => r.amount > 0);
  for (const c of s.contracts) if (c.accepted && !c.settled && c.endHour <= s.hour) {
    const missing = Math.max(0, c.promised - c.shipped), penalty = money(missing * c.price * c.penalty);
    if (penalty) post(s, 'contract', penalty, -penalty, '未完成合同履约责任');
    c.settled = true; event(s, 'contract', c.title + '结算', '未完成量：' + missing + CARGO_LABELS[c.goods].unit, c.id);
  }
}
