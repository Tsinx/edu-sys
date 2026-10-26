import { assetSpec } from './enterprise-catalogue.js';
import { CARGO_LABELS, STAFF_LABELS, enterpriseRandom, hourDate, monthKey, type Asset, type CargoLot, type EnterpriseState, type EnterpriseCall, type StaffRole, type Stage } from './enterprise-model.js';
import { arrivals, assetValue, clamp, collectAndSettle, event, isBlocked, leaseDeliveryHour, market, money, month, post, terminal, terminalStock, updateAssets, updateProjects, weather } from './enterprise-support.js';

interface Slot { asset: Asset; stage: Stage; terminalId: string; capacity: number; remaining: number; usage: number; }
interface Frame { slots: Slot[]; power: number; fuel: number; charging: number; roles: Record<StaffRole, number>; }
interface Index {callCount:number;lotCount:number;calls:Map<string,EnterpriseCall>;lots:Map<string,CargoLot>;activeCalls:Map<string,EnterpriseCall>;activeLots:Map<string,CargoLot>;}
const localIndexes=new WeakMap<EnterpriseState,Index>();
function indexes(s:EnterpriseState):Index{
  let index=localIndexes.get(s);
  if(!index){index={callCount:0,lotCount:0,calls:new Map(),lots:new Map(),activeCalls:new Map(),activeLots:new Map()};localIndexes.set(s,index);}
  while(index.callCount<s.calls.length){const c=s.calls[index.callCount++]!;index.calls.set(c.id,c);if(c.stage!=='departed')index.activeCalls.set(c.id,c);}
  while(index.lotCount<s.lots.length){const l=s.lots[index.lotCount++]!;index.lots.set(l.id,l);if(l.completed+l.lost<l.quantity)index.activeLots.set(l.id,l);}
  return index;
}
function crews(s: EnterpriseState) {
  const shift = Math.floor(s.hour % 24 / 8), roles = Object.fromEntries(Object.keys(STAFF_LABELS).map(r => [r, 0])) as Record<StaffRole, number>;
  for (const c of s.crews) {
    if (c.trainingUntil > 0 && c.trainingUntil <= s.hour) { c.skill = Math.min(100, c.skill + c.trainingGain); c.trainingUntil = 0; c.trainingGain = 0; event(s, 'staff', '培训完成', STAFF_LABELS[c.role] + '技能提升', c.id); }
    if (c.shift === shift && c.trainingUntil <= s.hour) roles[c.role] += c.count * c.skill / 100;
  }
  roles.technician = Math.max(0, roles.technician - s.assets.filter(a => a.status === 'maintenance').length);
  return roles;
}
function resources(s: EnterpriseState): Frame {
  const roles = crews(s), h = s.hour % 24, w = weather(s), solar = Math.max(0, Math.sin((h - 6) / 12 * Math.PI)) * s.solarKw * (w.raining ? .45 : 1);
  const f: Frame = { slots: [], power: Math.max(0, s.gridKw + solar - 180), fuel: s.fuelStock, charging: 0, roles };
  const deadlines = new Map<string, number>();
  for (const c of indexes(s).activeCalls.values()) if (c.stage !== 'announced') deadlines.set(c.terminalId, Math.min(deadlines.get(c.terminalId) ?? Number.MAX_SAFE_INTEGER, c.deadline));
  const ordered = [...s.assets].sort((a, b) => (deadlines.get(a.terminalId) ?? Number.MAX_SAFE_INTEGER) - (deadlines.get(b.terminalId) ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
  let chargers = Math.max(2, s.terminals.reduce((n, t) => n + t.gridLevel * 2, 0));
  for (const a of ordered) {
    const spec = assetSpec(a.model), t = terminal(s, a.terminalId);
    a.lastWork = 0;
    if (a.status !== 'active') { if (a.status !== 'retired' && a.status !== 'ordered') a.downtimeHours++; continue; }
    if (!t.enabled || isBlocked(s, t.id, spec.stage)) { a.note = '区域或系统受阻'; a.downtimeHours++; continue; }
    if (a.battery < spec.kw * 1.1 && spec.battery > 0) {
      const power = Math.min(90, f.power, spec.battery * a.batteryHealth - a.battery);
      if (chargers > 0 && power > 0) { a.battery += power * .94; f.power -= power; f.charging += power; chargers--; a.note = '充电中'; } else a.note = '等待充电容量';
      continue;
    }
    if (roles[spec.staff] < spec.staffRequired) { a.note = '缺少合格' + STAFF_LABELS[spec.staff] + '人员'; continue; }
    if (spec.kw > 0 && spec.battery === 0 && f.power < spec.kw) { a.note = '供电容量不足'; continue; }
    if (spec.fuel > f.fuel) { a.note = '燃料库存不足'; continue; }
    if (spec.stage === 'quay' && t.constructionUntil > s.hour) { a.note = '泊位施工停用'; continue; }
    roles[spec.staff] -= spec.staffRequired;
    if (spec.battery === 0) f.power -= spec.kw;
    f.fuel -= spec.fuel;
    const health = .68 + .32 * a.health / 100, wind = spec.stage === 'quay' ? w.wind : 1;
    const distance = spec.stage === 'transport' ? 1 / Math.max(.6, t.distance / 1.6) : 1;
    const building = s.projects.some(p => p.terminalId === t.id && p.status === 'building') && ['transport', 'yard'].includes(spec.stage) ? .85 : 1;
    const capacity = spec.stage === 'marine' ? 1 : Math.max(0, Math.floor(spec.rate * health * wind * distance * building));
    f.slots.push({ asset: a, stage: spec.stage, terminalId: t.id, capacity, remaining: capacity, usage: 0 }); a.note = '可用';
  }
  return f;
}
function capacity(f: Frame, stage: Stage, id: string, goods: CargoLot['goods'], rows = 0) {
  return f.slots.filter(q => q.stage === stage && (stage === 'marine' || q.terminalId === id) && assetSpec(q.asset.model).goods.includes(goods) && (stage !== 'quay' || !assetSpec(q.asset.model).reach || assetSpec(q.asset.model).reach >= rows)).reduce((n, q) => n + q.remaining, 0);
}
function take(f: Frame, stage: Stage, id: string, goods: CargoLot['goods'], quantity: number, rows = 0) {
  let remaining = Math.max(0, Math.floor(quantity));
  for (const q of f.slots) {
    if (q.stage !== stage || stage !== 'marine' && q.terminalId !== id || !assetSpec(q.asset.model).goods.includes(goods) || stage === 'quay' && assetSpec(q.asset.model).reach > 0 && assetSpec(q.asset.model).reach < rows) continue;
    const n = Math.min(q.remaining, remaining); q.remaining -= n; q.usage += q.capacity ? n / q.capacity : 0; remaining -= n;
    if (!remaining) break;
  }
  return Math.floor(quantity) - remaining;
}
function handleDocuments(s: EnterpriseState) {
  const index=indexes(s),lotMap=index.lots;
  const needed=new Set([...index.activeCalls.keys(),...Array.from(index.activeLots.values(),l=>l.callId)]);
  for (const id of needed) {const c=index.calls.get(id)!;
    if (c.stage === 'departed' && [c.importLot,c.exportLot].every(id=>{const l=lotMap.get(id)!;return l.completed+l.lost===l.quantity;})) continue;
    for (const [kind, d] of Object.entries(c.documents)) {
      if (s.policy.documents === 'automatic' && d.status === 'draft' && c.eta <= s.hour + 24) {
        d.status = 'submitted'; d.readyHour = s.hour + Math.max(1, 4 - s.digitalLevel); d.reason = '按已批准核验策略提交';
      }
      if (d.status === 'submitted' && d.readyHour <= s.hour) {
        if (c.issue && kind === 'manifest' && !c.inspected) { d.status = 'correction'; d.reason = '舱单数量与独立交接资料不一致，请核对后补正'; event(s, 'documents', c.name + '舱单退补', d.reason, c.id); }
        else { d.status = 'approved'; d.reason = '已取得有效回执'; }
      }
      if (kind === 'manifest' && d.status === 'correction' && s.policy.verifiedExceptions) { c.inspected = true; d.status = 'submitted'; d.readyHour = s.hour + 4; post(s, 'inspection', 300, -300, '按授权策略核对独立业务资料'); }
    }
    for (const id of [c.importLot, c.exportLot]) {
      const l = lotMap.get(id)!;
      if (s.policy.verifiedExceptions && l.quarantine && l.inspectionUntil === null && c.inspected) { l.inspectionUntil = s.hour + 6; post(s, 'inspection', 1200, -1200, '按授权策略安排异常货批核查'); }
      if (l.inspectionUntil !== null && l.inspectionUntil <= s.hour) { l.quarantine = false; l.inspectionUntil = null; event(s, 'inspection', '货批核查完成', l.id, l.id); }
      l.release = c.documents.customs.status === 'approved' && c.documents.carrier.status === 'approved' && !l.quarantine;
    }
  }
}
function moveShips(s: EnterpriseState, f: Frame) {
  let channel = 1;
  const w = weather(s);
  const index=indexes(s),lotMap=index.lots;
  const calls = [...index.activeCalls.values()].sort((a, b) => s.policy.priority === 'deadline' ? a.deadline - b.deadline || a.id.localeCompare(b.id) : a.arrival - b.arrival || a.id.localeCompare(b.id));
  for (const c of calls) {
    if (c.stage === 'announced' && c.arrival <= s.hour) { c.stage = 'waiting'; c.arrivedHour = s.hour;c.deadline=s.hour+36;const incoming=lotMap.get(c.importLot)!,outgoing=lotMap.get(c.exportLot)!;incoming.firstHour=s.hour;incoming.deadline=c.deadline+12;outgoing.deadline=c.deadline; event(s, 'arrival', c.name + '实际到达', terminal(s, c.terminalId).name, c.id); }
    if (c.stage === 'entering' && c.moveUntil <= s.hour) { c.stage = 'berthed'; c.berthedHour = s.hour; c.workHour = s.hour; event(s, 'berth', c.name + '靠妥开工', '', c.id); }
    if (c.stage === 'leaving' && c.moveUntil <= s.hour) { c.stage = 'departed';index.activeCalls.delete(c.id); c.departedHour = s.hour; const t = terminal(s, c.terminalId); if (t.berthCall === c.id) t.berthCall = null; s.stats.departed++; s.stats.vesselHours += s.hour - (c.arrivedHour ?? s.hour); event(s, 'departure', c.name + '完成本港作业离港', '', c.id); }
    const t = terminal(s, c.plannedTerminal ?? c.terminalId);
    if (c.stage === 'waiting') {
      if (c.documents.entry.status !== 'approved' || c.documents.manifest.status !== 'approved') { c.wait.documents++; s.stats.vesselWaiting++; continue; }
      if ((!s.policy.autoBerth && !c.plannedTerminal) || t.berthCall || t.constructionUntil > s.hour || !t.enabled || t.goods !== c.goods || t.length < c.length || t.depth + w.tide < c.draft) { c.wait.berth++; s.stats.vesselWaiting++; continue; }
      if (!channel || w.wind < .5 || w.visibility < .5 || capacity(f, 'marine', t.id, c.goods) < 1 || isBlocked(s, t.id, 'marine')) { c.wait.channel++; s.stats.vesselWaiting++; continue; }
      if (c.terminalId !== t.id && s.lots.some(l => l.callId === c.id && (l.yard > 0 || l.apron > 0))) { c.wait.berth++; s.stats.vesselWaiting++; continue; }
      c.terminalId = t.id; for (const l of s.lots) if (l.callId === c.id) l.terminalId = t.id;
      t.berthCall = c.id; c.stage = 'entering'; c.moveUntil = s.hour + 1; channel--; take(f, 'marine', t.id, c.goods, 1);
    }
    if (c.stage === 'berthed') {
      const incoming = lotMap.get(c.importLot)!, outgoing = lotMap.get(c.exportLot)!;
      if (incoming.ship === 0 && outgoing.completed + outgoing.lost >= outgoing.quantity && c.documents.departure.status === 'approved' && channel && w.wind >= .5 && w.visibility >= .5 && capacity(f, 'marine', t.id, c.goods) >= 1) {
        c.stage = 'leaving'; c.moveUntil = s.hour + 1; channel--; take(f, 'marine', t.id, c.goods, 1);
      }
    }
  }
}
function bill(s: EnterpriseState, l: CargoLot, n: number, c: EnterpriseCall) {
  if (n <= 0) return;
  const amount = money(n * c.price);
  l.completed += n; l.lastHour = s.hour; l.revenue += amount; s.stats.delivered += n; month(s).handled += n;
  l.completedTimeSum+=n*Math.max(0,s.hour-l.firstHour);
  const onTime = s.hour <= l.deadline;
  if (onTime) { s.stats.onTime += n; month(s).onTime += n; } else l.lateUnits += n;
  const customer = s.customers.find(cu => cu.id === c.customerId)!; customer.served += n; if (!onTime) customer.late += n;
  const contract = s.contracts.find(ct => ct.id === c.contractId); if (contract) contract.shipped += n;
  post(s, 'revenue', amount, 0, '货物与客运服务收入');
  const id = 'invoice-' + Math.floor(s.hour / 24), receivable = s.receivables.find(r => r.id === id);
  if (receivable) receivable.amount += amount; else s.receivables.push({ id, due: (Math.floor(s.hour / 24) + 30) * 24, amount });
  const fee = money(amount * s.concessionRate); post(s, 'concession', fee, -fee, '公共设施与经营协议费用');
}
function routeCapacity(s: EnterpriseState, l: CargoLot) {
  const t = terminal(s, l.terminalId), h = s.hour % 24;
  if (l.route === 'rail') return t.rail && h === s.policy.railHour ? 600 : 0;
  if (l.route === 'barge') return h === s.policy.bargeHour ? 500 : 0;
  if (l.route === 'pipeline') return l.goods === 'liquid' ? 600 : 0;
  return s.policy.roadQuota;
}
function production(s: EnterpriseState, f: Frame) {
  const index=indexes(s),callMap=index.calls;
  const stocks = new Map<string, number>(), buffers = new Map<string, number>();
  for (const l of index.activeLots.values()) { stocks.set(l.terminalId, (stocks.get(l.terminalId) ?? 0) + l.yard); buffers.set(l.terminalId, (buffers.get(l.terminalId) ?? 0) + l.apron); }
  const lots = [...index.activeLots.values()].sort((a, b) => s.policy.priority === 'export' ? (a.flow === 'export' ? -1 : 1) - (b.flow === 'export' ? -1 : 1) || a.deadline - b.deadline : s.policy.priority === 'deadline' ? a.deadline - b.deadline : a.firstHour - b.firstHour);
  const routeUsed = new Map<string, number>();
  for(const l of lots)if(l.rehandleRemaining>0&&!isBlocked(s,l.terminalId,'transport')){
    const n=Math.min(l.rehandleRemaining,capacity(f,'transport',l.terminalId,l.goods),capacity(f,'yard',l.terminalId,l.goods));
    take(f,'transport',l.terminalId,l.goods,n);take(f,'yard',l.terminalId,l.goods,n);l.rehandleRemaining-=n;l.rehandles+=n;s.stats.rehandles+=n;month(s).rehandles+=n;if(n)post(s,'rehandling',n*55,-n*55,'路径调整实际移位');
  }
  // Downstream-to-upstream order gives every transfer at least one hourly boundary.
  for (const l of lots) {
    const c = callMap.get(l.callId)!, t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (l.flow === 'export' && c.stage === 'berthed' && l.release && !isBlocked(s, t.id, 'quay')) {
      const n = take(f, 'quay', t.id, l.goods, Math.min(l.apron, capacity(f, 'quay', t.id, l.goods, c.rows)), c.rows);
      l.apron -= n; buffers.set(t.id, (buffers.get(t.id) ?? 0) - n); s.stats.loaded += n; bill(s, l, n, c);
      if (!n && l.apron > 0) c.wait.equipment++;
    }
    if (l.flow === 'import' && l.release && !l.bonded && !isBlocked(s, t.id, 'gate')) {
      const key = l.terminalId + ':' + l.route, limit = Math.max(0, routeCapacity(s, l) - (routeUsed.get(key) ?? 0));
      const n = Math.min(l.yard, capacity(f, 'gate', t.id, l.goods), capacity(f, 'yard', t.id, l.goods), limit);
      take(f, 'gate', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, n); l.yard -= n; stocks.set(t.id, (stocks.get(t.id) ?? 0) - n); routeUsed.set(key, (routeUsed.get(key) ?? 0) + n); bill(s, l, n, c);
      if (n) { const cost = money(n * (l.route === 'road' ? 24 : l.route === 'rail' ? 15 : 12)); post(s, 'logistics', cost, -cost, '腹地运输接续'); }
      if (l.yard && !n) s.stats.roadWaiting += l.yard;
    }
  }
  for (const l of lots) {
    const t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (isBlocked(s, t.id, 'transport')) continue;
    if (l.flow === 'export') {
      const call=callMap.get(l.callId)!;
      if(call.stage!=='berthed')continue;
      const freeBuffer=Math.max(0,Math.floor(t.storageCapacity*.15)-(buffers.get(t.id)??0));
      const n = Math.min(l.yard, freeBuffer, capacity(f, 'transport', t.id, l.goods), capacity(f, 'yard', t.id, l.goods));
      take(f, 'transport', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, n); l.yard -= n; l.apron += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) - n); buffers.set(t.id, (buffers.get(t.id) ?? 0) + n);
    } else {
      const free = Math.max(0, t.storageCapacity - (stocks.get(t.id) ?? 0));
      const n = Math.min(l.apron, free, capacity(f, 'transport', t.id, l.goods), capacity(f, 'yard', t.id, l.goods));
      take(f, 'transport', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, n); l.apron -= n; l.yard += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) + n); buffers.set(t.id, (buffers.get(t.id) ?? 0) - n);
    }
  }
  for (const l of lots) {
    const c = callMap.get(l.callId)!, t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (l.flow === 'import' && c.stage === 'berthed' && !isBlocked(s, t.id, 'quay')) {
      const buffer = Math.max(0, Math.floor(t.storageCapacity * .15) - (buffers.get(t.id) ?? 0));
      const n = take(f, 'quay', t.id, l.goods, Math.min(l.ship, buffer, capacity(f, 'quay', t.id, l.goods, c.rows)), c.rows);
      l.ship -= n; l.apron += n; buffers.set(t.id, (buffers.get(t.id) ?? 0) + n); s.stats.unloaded += n; if (!n && l.ship > 0) c.wait.equipment++;
    }
    if (l.flow === 'export' && l.release && l.firstHour <= s.hour && !isBlocked(s, t.id, 'gate')) {
      const key = l.terminalId + ':' + l.route, limit = Math.max(0, routeCapacity(s, l) - (routeUsed.get(key) ?? 0)), free = Math.max(0, t.storageCapacity - (stocks.get(t.id) ?? 0));
      const n = Math.min(l.land, free, capacity(f, 'gate', t.id, l.goods), capacity(f, 'yard', t.id, l.goods), limit);
      take(f, 'gate', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, n); l.land -= n; l.yard += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) + n); routeUsed.set(key, (routeUsed.get(key) ?? 0) + n);
      if (l.land) s.stats.roadWaiting += l.land;
    }
  }
  // Residence time includes rehandling, blocked stages and physical processing.
  for (const l of lots) {
    const c = callMap.get(l.callId)!;
    const remaining = l.quantity - l.completed - l.lost;
    if ((l.flow === 'export' && l.firstHour <= s.hour) || (l.flow === 'import' && c.arrivedHour !== null)) {
      l.waitingUnitHours += remaining; s.stats.waitingUnitHours += remaining; month(s).waiting += remaining;
    }
    if (!remaining) index.activeLots.delete(l.id);
  }
}
function assetWork(s: EnterpriseState, f: Frame) {
  let energy = f.charging, fuel = 0, shipEmissions = 0;
  for (const q of f.slots) {
    const a = q.asset, spec = assetSpec(a.model), use = clamp(q.usage, 0, 1);
    a.lastWork = use; a.ageHours += use; a.workedHours += use; a.serviceHours += use;
    const electric = spec.kw * use, diesel = spec.fuel * use; fuel += diesel;
    if (spec.battery > 0) { a.battery = Math.max(0, a.battery - electric); a.batteryHealth = Math.max(.55, a.batteryHealth - use * .000012); } else energy += electric;
    a.health = Math.max(0, a.health - use * (100 / (spec.maintenanceHours * 4)));
    if (use > 0) a.note = '执行已批准的作业';
    const probability = a.health < 35 ? .003 : a.serviceHours > spec.maintenanceHours * 1.5 ? .0008 : .000015;
    if (use && enterpriseRandom(s.config.seed, 'failure-' + a.id, s.hour) < probability) {
      a.status = 'failed'; a.note = '故障，等待维修'; event(s, 'fault', spec.name + '发生故障', a.id, a.id);
    }
    if (s.policy.maintenance === 'preventive' && a.status === 'active' && (a.health < s.policy.maintenanceHealth || a.serviceHours > spec.maintenanceHours) && s.spareParts > 0 && f.roles.technician >= 1 && s.cash > s.policy.reserveCash) {
      const cost = money(spec.price * .0006); post(s, 'maintenance', cost + 4000, -cost, '计划维护与领用备件'); s.spareParts--; f.roles.technician--;
      a.status = 'maintenance'; a.repairUntil = s.hour + 16; s.stats.maintenance++; event(s, 'maintenance', spec.name + '进入计划维护', '停机16小时；已领用备件与技术岗位。', a.id);
    }
  }
  for (const c of indexes(s).activeCalls.values()) {if(c.stage!=='berthed')continue;
    const t = terminal(s, c.terminalId);
    if (s.policy.shorePower && t.shore && f.power >= 180 && !isBlocked(s, t.id, 'power')) { energy += 180; f.power -= 180; }
    else shipEmissions += 150;
  }
  if (fuel > s.fuelStock + .0001) throw Error('燃料资源分配失衡。');
  s.fuelStock = Math.max(0, s.fuelStock - fuel);
  const clean = Math.min(energy, Math.max(0, s.solarKw * Math.sin((s.hour % 24 - 6) / 12 * Math.PI)) * (weather(s).raining ? .45 : 1));
  const powerCost = money(Math.max(0, energy - clean) * (s.hour % 24 >= 17 && s.hour % 24 <= 21 ? 1.15 : .78));
  post(s, 'energy', powerCost, -powerCost, '购电费用'); post(s, 'fuel', fuel * 7.2, 0, '燃料消耗结转');
  s.stats.energy += energy; s.stats.fuel += fuel; const emissions = Math.max(0, energy - clean) * .52 + fuel * 2.68 + shipEmissions;
  s.stats.emissions += emissions; month(s).energy += energy; month(s).emissions += emissions;
  let wages = 0;
  for (const c of s.crews) if (c.shift === Math.floor(s.hour % 24 / 8)) wages += c.count * c.wage;
  post(s, 'wages', wages, -wages, '当班及培训人员工资');
  for (const a of s.assets) if (a.ownership === 'leased' && a.status !== 'retired' && leaseDeliveryHour(a) <= s.hour) { const n = money(assetSpec(a.model).leaseDaily / 24),credit=Math.min(a.leaseCredit,n);a.leaseCredit-=credit; post(s, 'lease', n, -(n-credit), '设备租赁费用'); }
  if (s.policy.insurance) post(s, 'insurance', 380, -380, '风险保障费用');
  const backup = s.incidents.filter(i => i.status !== 'resolved' && i.response === 'backup').length;
  if (backup) { post(s, 'backup', backup * 1200, -backup * 1200, '备用系统与供能'); s.stats.emissions += backup * 90; month(s).emissions += backup * 90; }
}
function incidents(s: EnterpriseState) {
  for (const i of s.incidents) if (i.status !== 'resolved') {
    i.blockedHours++;
    if (i.resolves !== null && i.resolves <= s.hour) {
      i.resolves = null; i.status = 'contained'; i.response = 'repair'; event(s, 'incident', i.title + '技术修复完成', '请核对恢复证据后执行恢复。', i.id);
    }
  }
  if (s.hour % 24 !== 10 || s.incidents.filter(i => i.status !== 'resolved').length >= 3) return;
  const day = Math.floor(s.hour / 24), chance = s.config.scenario === 'resilience' ? .05 : .015;
  if (day < 4 || enterpriseRandom(s.config.seed, 'incident', day) > chance) return;
  const types = ['power', 'system', 'flood', 'spill', 'security', 'road'] as const, index = Math.floor(enterpriseRandom(s.config.seed, 'incident-type', day) * types.length), type = types[index]!;
  const t = s.terminals[Math.floor(enterpriseRandom(s.config.seed, 'incident-terminal', day) * s.terminals.length)]!;
  if ((type === 'flood' && t.floodProtection > 0 || type === 'security' && t.security > 0 || type === 'spill' && t.dustControl > 0) && enterpriseRandom(s.config.seed, 'protection', day) < .75) { event(s, 'prevention', '防护设施抑制了异常扩大', t.name); return; }
  const title = { power: '供电中断', system: '业务系统数据异常', flood: '局部积水与停工', spill: '污染与货损事件', security: '限制区异常侵入', road: '港区道路中断' }[type];
  const id = 'incident-' + s.hour, loss = type === 'spill' ? 180000 : 30000;
  s.incidents.push({ id, type, title, terminalId: type === 'system' || type === 'power' ? null : t.id, started: s.hour, status: 'active', response: 'none', resolves: null, evidence: false, loss, blockedHours: 0 });
  post(s, 'incident', loss, -loss, '异常直接损失');
  if (s.policy.insurance) s.receivables.push({ id: 'insurance-' + id, due: s.hour + 30 * 24, amount: Math.round(loss * .7) });
  if (type === 'spill') {
    const lot = s.lots.find(l => l.terminalId === t.id && l.yard > 0);
    if (lot) { const n = Math.min(lot.yard, Math.max(1, Math.round(lot.yard * .05))); lot.yard -= n; lot.lost += n; s.stats.lost += n; }
    s.stats.spillExposure += 1;
  }
  event(s, 'incident', title, t.name + '：需要核查、控制、技术处置与恢复确认。', id);
}
export function advanceEnterpriseHour(s: EnterpriseState) {
  if (s.hour >= s.horizon) return;
  if (s.hour % 24 === 0) {
    market(s); arrivals(s); collectAndSettle(s);
    if (s.policy.autoSupplies && s.cash > s.policy.reserveCash) {
      if (s.fuelStock < 15000) { s.fuelStock += 30000; post(s, 'inventory', 216000, -216000, '按补给策略采购燃料'); }
      if (s.spareParts < 6) { s.spareParts += 12; post(s, 'inventory', 48000, -48000, '按补给策略采购备件'); }
    }
  }
  updateProjects(s); updateAssets(s); handleDocuments(s); incidents(s);
  const value = assetValue(s), f = resources(s);
  moveShips(s, f); production(s, f); assetWork(s, f);
  const nextValue = assetValue({ ...s, hour: s.hour + 1 });
  post(s, 'depreciation', Math.max(0, value - nextValue), 0, '固定资产折旧');
  if (monthKey(s.hour + 1) !== monthKey(s.hour) || s.hour + 1 === s.horizon) {
    const m = month(s), interest = money(Math.max(0, s.debt) * .065 / 12);
    post(s, 'interest', interest, -interest, '借款月度利息');
    const tax = money(Math.max(0, m.revenue - m.operating - m.depreciation - m.interest) * .15);
    post(s, 'tax', tax, -tax, '教学情境经营所得税');
    if (s.cash < 0) event(s, 'finance', '出现现金缺口', '应付支出仍然结转，采购与建设将受限制。');
  }
  s.hour++;
}
