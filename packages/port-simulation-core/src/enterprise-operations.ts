import {closeFinanceHour,financiallyHalted,refreshFinanceStatus,financeInsuranceActive} from './enterprise-finance.js';
import {receiveSupplies,replenishSupplies} from './enterprise-supplies.js';
import {electricityRate,roadCapacity,roadPlan,staffCapacity} from './enterprise-strategy.js';
import { assetSpec } from './enterprise-catalogue.js';
import {chargingWanted,finishManagementWeek,plannedMaintenanceAllowed,processIncidentAuthorizations} from './enterprise-management.js';
import {discardYard,retrieveYard,storeYard} from './enterprise-yard.js';
import {allocateBerthCranes,closeDirectorDay,recordAssetHour,type CraneDemand} from './enterprise-director.js';
import { CARGO_LABELS, STAFF_LABELS, enterpriseRandom, hourDate, monthKey, type Asset, type CargoLot, type EnterpriseState, type EnterpriseCall, type StaffRole, type Stage,type AssetHourSample } from './enterprise-model.js';
import { arrivals, assetValue, clamp, collectAndSettle, event, isBlocked, leaseDeliveryHour, market, money, month, post, terminal, terminalStock, updateAssets, updateProjects, weather } from './enterprise-support.js';

interface Slot { asset: Asset; stage: Stage; terminalId: string; capacity: number; remaining: number; usage: number; }
interface Frame { slots: Slot[]; power: number; fuel: number; charging: number; roles: Record<StaffRole, number>; blocks:Map<string,boolean>;traces:Map<string,AssetHourSample>; }
function blocked(s:EnterpriseState,f:Frame,terminalId:string,stage:string){
  const key=terminalId+':'+stage,known=f.blocks.get(key);if(known!==undefined)return known;
  const value=isBlocked(s,terminalId,stage);f.blocks.set(key,value);return value;
}
interface Index {callCount:number;lotCount:number;calls:Map<string,EnterpriseCall>;lots:Map<string,CargoLot>;activeCalls:Map<string,EnterpriseCall>;activeLots:Map<string,CargoLot>;}
const localIndexes=new WeakMap<EnterpriseState,Index>();
function indexes(s:EnterpriseState):Index{
  let index=localIndexes.get(s);
  if(!index){index={callCount:0,lotCount:0,calls:new Map(),lots:new Map(),activeCalls:new Map(),activeLots:new Map()};localIndexes.set(s,index);}
  while(index.callCount<s.calls.length){const c=s.calls[index.callCount++]!;index.calls.set(c.id,c);if(c.stage!=='departed')index.activeCalls.set(c.id,c);}
  while(index.lotCount<s.lots.length){const l=s.lots[index.lotCount++]!;index.lots.set(l.id,l);if(l.completed+l.lost<l.quantity)index.activeLots.set(l.id,l);}
  return index;
}
function productionNeeds(s:EnterpriseState){
  const index=indexes(s),stages=new Map<string,Set<Stage>>(),rows=new Map<string,number>();
  const add=(id:string,...items:Stage[])=>{let set=stages.get(id);if(!set){set=new Set();stages.set(id,set);}for(const item of items)set.add(item);};
  for(const l of index.activeLots.values()){
    if(l.completed+l.lost>=l.quantity)continue;const c=index.calls.get(l.callId)!;
    const berthed=c.stage==='berthed'||c.stage==='entering'&&c.moveUntil<=s.hour;
    if(l.rehandleRemaining>0)add(l.terminalId,'transport','yard');
    if(l.flow==='import'){
      if(l.ship>0&&berthed){add(l.terminalId,'quay');rows.set(l.terminalId,c.rows);}
      if(l.apron>0)add(l.terminalId,'transport','yard');
      if(l.yard>0&&l.release&&(!l.bonded||l.pickupHour<=s.hour)&&l.pickupHour<=s.hour){add(l.terminalId,'yard','gate');if(l.goods==='container')add(l.terminalId,'transport');}
    }else{
      const timed=l.route==='rail'||l.route==='barge';
      if(l.land>0&&l.release&&l.firstHour<=s.hour&&(!timed||l.connectionReady>0||routeCapacity(s,l)>0))add(l.terminalId,'gate','yard');
      if(l.yard>0&&berthed)add(l.terminalId,'yard','transport');
      if(l.apron>0&&l.release&&berthed){add(l.terminalId,'quay');rows.set(l.terminalId,c.rows);}
    }
  }
  const marine=[...index.activeCalls.values()].some(c=>c.stage==='waiting'||c.stage==='announced'&&c.arrival<=s.hour||c.stage==='berthed'&&index.lots.get(c.importLot)!.ship===0&&index.lots.get(c.exportLot)!.completed+index.lots.get(c.exportLot)!.lost>=index.lots.get(c.exportLot)!.quantity);
  return (a:Asset)=>{const spec=assetSpec(a.model);return spec.stage==='marine'?marine:!!stages.get(a.terminalId)?.has(spec.stage)&&(spec.stage!=='quay'||!spec.reach||spec.reach>=(rows.get(a.terminalId)??0));};
}
function crews(s: EnterpriseState,neededAsset:(a:Asset)=>boolean) {
  const roles=Object.fromEntries(Object.keys(STAFF_LABELS).map(r=>[r,0])) as Record<StaffRole,number>;
  for(const c of s.crews)if(c.trainingUntil>0&&c.trainingUntil<=s.hour){c.skill=Math.min(100,c.skill+c.trainingGain);c.trainingUntil=0;c.trainingGain=0;event(s,'staff','培训完成',STAFF_LABELS[c.role]+'技能提升',c.id);}
  const day=Math.floor(s.hour/24);if(s.management.reserveDay!==day){s.management.reserveDay=day;s.management.reserveUsed={};s.management.dutyUsed={};}
  for(const role of Object.keys(STAFF_LABELS) as StaffRole[]){
    const c=staffCapacity(s,role),needed=s.assets.filter(a=>a.status==='active'&&assetSpec(a.model).staff===role&&neededAsset(a)).reduce((n,a)=>n+assetSpec(a.model).staffRequired,0)+(role==='technician'?2+s.assets.filter(a=>a.status==='maintenance').length+s.incidents.filter(i=>i.resolves!==null).length:0);
    const cover=Math.min(c.reserve,Math.max(0,needed-c.base));roles[role]=c.base+cover;
    s.management.dutyUsed[role]=(s.management.dutyUsed[role]??0)+roles[role];s.management.reserveUsed[role]=(s.management.reserveUsed[role]??0)+cover;s.management.metrics.reserveCoverHours+=cover;s.management.metrics.absenceHours+=c.missing;
  }
  roles.technician=Math.max(0,roles.technician-s.assets.filter(a=>a.status==='maintenance').length-s.incidents.filter(i=>i.resolves!==null).length);
  return roles;
}
function resources(s: EnterpriseState): Frame {
  const traces=new Map<string,AssetHourSample>(s.assets.map(a=>[a.id,{hour:s.hour,work:0,staffed:false,available:a.status==='active',reason:a.status==='maintenance'?'maintenance':a.status==='failed'?'failed':a.status==='active'?'waiting':'inactive'}]));
  if(financiallyHalted(s)){for(const a of s.assets){a.lastWork=0;if(a.status==='active'){a.note='到期工资或能源拖欠，生产暂停';traces.get(a.id)!.reason='finance';}}s.telemetry.cranes=[];return {slots:[],power:0,fuel:0,charging:0,roles:Object.fromEntries(Object.keys(STAFF_LABELS).map(r=>[r,0])) as Record<StaffRole,number>,blocks:new Map(),traces};}
  const needed=productionNeeds(s),roles = crews(s,needed), h = s.hour % 24, w = weather(s), solar = Math.max(0, Math.sin((h - 6) / 12 * Math.PI)) * s.solarKw * (w.raining ? .45 : 1);
  const f: Frame = { slots: [], power: Math.max(0, s.gridKw + solar - 180), fuel: s.fuelStock, charging: 0, roles,blocks:new Map(),traces };
  const deadlines = new Map<string, number>();
  for (const c of indexes(s).activeCalls.values()) if (c.stage !== 'announced') deadlines.set(c.terminalId, Math.min(deadlines.get(c.terminalId) ?? Number.MAX_SAFE_INTEGER,c.deadline-(s.management.plan.goal==='service'&&c.contractId?12:0)));
  const allCraneCandidates=new Set<string>(),demands:CraneDemand[]=[];
  for(const t of s.terminals){
    if(!t.enabled||t.constructionUntil>s.hour||blocked(s,f,t.id,'quay'))continue;
    const call=[...indexes(s).activeCalls.values()].find(c=>(c.plannedTerminal??c.terminalId)===t.id&&(c.stage==='berthed'||c.stage==='entering'&&c.moveUntil<=s.hour));if(!call)continue;
    const workUnits=[...indexes(s).activeLots.values()].filter(l=>l.callId===call.id).reduce((n,l)=>n+(l.flow==='import'?l.ship:l.release?l.apron:0),0);if(!workUnits)continue;
    const candidates=s.assets.filter(a=>{const p=assetSpec(a.model);return a.terminalId===t.id&&a.status==='active'&&p.stage==='quay'&&p.staff==='crane'&&p.goods.includes(t.goods)&&(!p.reach||p.reach>=call.rows)&&needed(a);}).sort((a,b)=>assetSpec(b.model).rate-assetSpec(a.model).rate||a.id.localeCompare(b.id));
    if(!candidates.length)continue;for(const a of candidates)allCraneCandidates.add(a.id);
    const rate=candidates.reduce((n,a)=>n+assetSpec(a.model).rate*(.68+.32*a.health/100)*w.wind,0)/candidates.length;
    const count=Math.min(candidates.length,Math.max(1,Math.ceil(workUnits/Math.max(1,rate))));
    demands.push({terminalId:t.id,workHours:workUnits/Math.max(1,rate),workUnits,deadline:call.deadline,waiting:call.wait.equipment,maxCranes:count,cranes:candidates.map(a=>{const p=assetSpec(a.model);return {id:a.id,staff:p.staffRequired,kw:p.kw,fuel:p.fuel};})});
  }
  const cranePlan=allocateBerthCranes(demands,{operators:roles.crane,power:f.power,fuel:f.fuel}),craneIds=new Set(cranePlan.sequence);s.telemetry.cranes=cranePlan.allocations;
  const ordinary = [...s.assets].filter(a=>!craneIds.has(a.id)).sort((a, b) => (deadlines.get(a.terminalId) ?? Number.MAX_SAFE_INTEGER) - (deadlines.get(b.terminalId) ?? Number.MAX_SAFE_INTEGER) || (s.management.plan.goal==='green'?(assetSpec(a.model).fuel>0?1:0)-(assetSpec(b.model).fuel>0?1:0):0) || a.id.localeCompare(b.id));
  const assetMap=new Map(s.assets.map(a=>[a.id,a]));const ordered=[...cranePlan.sequence.map(id=>assetMap.get(id)!),...ordinary];
  let chargers = Math.max(2, s.terminals.reduce((n, t) => n + t.gridLevel * 2, 0));
  const fleet=s.assets.filter(a=>assetSpec(a.model).battery>0&&a.status!=='retired'),ready=fleet.filter(a=>a.status==='active');
  let chargingCount=0;const proactiveLimit=Math.max(1,Math.floor(fleet.length*s.management.plan.chargingLimit/100));
  for (const a of ordered) {
    const spec = assetSpec(a.model), t = terminal(s, a.terminalId);
    const trace=traces.get(a.id)!;
    a.lastWork = 0;
    if (a.status !== 'active') { if (a.status !== 'retired' && a.status !== 'ordered') a.downtimeHours++; continue; }
    if (!t.enabled || blocked(s,f,t.id, spec.stage)) { a.note = '区域或系统受阻'; a.downtimeHours++;trace.reason='blocked';trace.available=false; continue; }
    const critical=spec.battery>0&&a.battery<spec.kw*1.1;
    if ((critical||chargingCount<proactiveLimit)&&chargingWanted(s,a,ready.length,fleet.length,chargingCount)) {
      const target=spec.battery*a.batteryHealth*(critical?1:s.management.plan.chargeTarget/100);
      const power = Math.min(90, f.power, Math.max(0,target-a.battery)/.94);
      if (chargers > 0 && power > 0) { a.battery += power * .94; f.power -= power; f.charging += power; chargers--;chargingCount++;s.management.metrics.chargingHours++;s.management.metrics.chargingEnergy+=power; a.note = critical?'低电量补能':'按充电计划补能'; }
      else {a.note = '等待充电容量';s.management.metrics.chargingWaitHours++;}
      trace.reason='charging';
      continue;
    }
    if(!needed(a)){a.note='待命，不预占作业岗位或供电';continue;}
    if(allCraneCandidates.has(a.id)&&!craneIds.has(a.id)){const plan=cranePlan.allocations.find(p=>p.terminalId===a.terminalId);const covered=!!plan&&plan.assigned>=plan.eligible;a.note=covered?'本小时装卸工作已获覆盖，岸桥待命':'按泊位保障规则等待起重岗位或供能';trace.reason=covered?'waiting':cranePlan.left.operators<spec.staffRequired?'staff':cranePlan.left.power<spec.kw?'power':'fuel';continue;}
    if (roles[spec.staff] < spec.staffRequired) { a.note = '缺少合格' + STAFF_LABELS[spec.staff] + '人员';trace.reason='staff'; continue; }
    if (spec.kw > 0 && spec.battery === 0 && f.power < spec.kw) { a.note = '供电容量不足';trace.reason='power'; continue; }
    if (spec.fuel > f.fuel) { a.note = '燃料库存不足';trace.reason='fuel'; continue; }
    if (spec.stage === 'quay' && t.constructionUntil > s.hour) { a.note = '泊位施工停用';trace.reason='blocked';trace.available=false; continue; }
    roles[spec.staff] -= spec.staffRequired;
    if (spec.battery === 0) f.power -= spec.kw;
    f.fuel -= spec.fuel;
    const health = .68 + .32 * a.health / 100, wind = spec.stage === 'quay' ? w.wind : 1;
    const distance = spec.stage === 'transport' ? 1 / Math.max(.6, t.distance / 1.6) : 1;
    const building = s.projects.some(p => p.terminalId === t.id && p.status === 'building') && ['transport', 'yard'].includes(spec.stage) ? .85 : 1;
    const capacity = spec.stage === 'marine' ? 1 : Math.max(0, Math.floor(spec.rate * health * wind * distance * building));
    f.slots.push({ asset: a, stage: spec.stage, terminalId: t.id, capacity, remaining: capacity, usage: 0 }); a.note = '可用';
    trace.staffed=true;
  }
  return f;
}
function capacity(f: Frame, stage: Stage, id: string, goods: CargoLot['goods'], rows = 0) {
  return f.slots.filter(q => q.stage === stage && (stage === 'marine' || q.terminalId === id) && assetSpec(q.asset.model).goods.includes(goods) && (stage !== 'quay' || !assetSpec(q.asset.model).reach || assetSpec(q.asset.model).reach >= rows)).reduce((n, q) => n + q.remaining, 0);
}
function take(f: Frame, stage: Stage, id: string, goods: CargoLot['goods'], quantity: number, rows = 0) {
  let remaining = Math.max(0, Math.floor(quantity));
  if(remaining===0)return Math.floor(quantity);
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
    const incoming=lotMap.get(c.importLot)!,outgoing=lotMap.get(c.exportLot)!;
    if(c.documents.entry.status==='approved'&&c.documents.manifest.status==='approved'&&c.documents.customs.status==='approved'&&c.documents.carrier.status==='approved'&&c.documents.departure.status==='approved'&&incoming.release&&outgoing.release&&!incoming.quarantine&&!outgoing.quarantine&&incoming.inspectionUntil===null&&outgoing.inspectionUntil===null)continue;
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
      if (!channel || w.wind < .5 || w.visibility < .5 || capacity(f, 'marine', t.id, c.goods) < 1 || blocked(s,f,t.id, 'marine')) { c.wait.channel++; s.stats.vesselWaiting++; continue; }
      const incoming=lotMap.get(c.importLot)!,outgoing=lotMap.get(c.exportLot)!;
      if (c.terminalId !== t.id && (incoming.yard>0||incoming.apron>0||outgoing.yard>0||outgoing.apron>0)) { c.wait.berth++; s.stats.vesselWaiting++; continue; }
      c.terminalId = t.id; incoming.terminalId=t.id;outgoing.terminalId=t.id;
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
  const contract = s.contracts.find(ct => ct.id === c.contractId); if (contract) contract.shipped=Math.min(contract.promised,contract.shipped+n*c.contractShare);
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
  return roadCapacity(s,t);
}
function production(s: EnterpriseState, f: Frame) {
  const index=indexes(s),callMap=index.calls;
  const stocks = new Map<string, number>(), buffers = new Map<string, number>();
  for (const l of index.activeLots.values()) { stocks.set(l.terminalId, (stocks.get(l.terminalId) ?? 0) + l.yard); buffers.set(l.terminalId, (buffers.get(l.terminalId) ?? 0) + l.apron); }
  const lots = [...index.activeLots.values()].sort((a, b) => s.policy.priority === 'export' ? (a.flow === 'export' ? -1 : 1) - (b.flow === 'export' ? -1 : 1) || a.deadline - b.deadline : s.policy.priority === 'deadline' ? a.deadline-b.deadline+(s.management.plan.goal==='service'?((callMap.get(a.callId)?.contractId?-12:0)-(callMap.get(b.callId)?.contractId?-12:0)):0) : a.firstHour - b.firstHour);
  for(const l of lots){
    if(l.bonded&&l.pickupHour<=s.hour)l.bonded=false;
    if(l.bonded&&l.yard>0&&s.hour>=l.pickupHour-l.storageRequestHours&&s.hour<l.pickupHour){
      const amount=money(l.yard*(l.goods==='container'?2:1));l.storageFees+=amount;l.revenue+=amount;s.management.metrics.warehouseRevenue+=amount;post(s,'revenue',amount,0,'预约监管仓储服务');
      const id='invoice-'+Math.floor(s.hour/24),r=s.receivables.find(r=>r.id===id);if(r)r.amount+=amount;else s.receivables.push({id,due:(Math.floor(s.hour/24)+30)*24,amount});
    }
  }
  const routeUsed = new Map<string, number>();
  const staged=new Map<string,number>();
  for(const l of lots)if(l.flow==='import')staged.set(l.terminalId+':'+l.route,(staged.get(l.terminalId+':'+l.route)??0)+l.land);
  // A train/barge arrives once per window. Its received export cargo can clear the gate over later hours.
  for(const l of lots)if(l.flow==='export'&&['rail','barge'].includes(l.route)&&l.firstHour<=s.hour&&!blocked(s,f,l.terminalId,'transport')){
    const key=l.terminalId+':'+l.route,n=Math.min(l.land-l.connectionReady,Math.max(0,routeCapacity(s,l)-(routeUsed.get(key)??0)));
    l.connectionReady+=n;routeUsed.set(key,(routeUsed.get(key)??0)+n);
  }
  for(const l of lots)if(l.rehandleRemaining>0&&!blocked(s,f,l.terminalId,'transport')){
    const n=Math.min(l.rehandleRemaining,capacity(f,'transport',l.terminalId,l.goods),capacity(f,'yard',l.terminalId,l.goods));
    take(f,'transport',l.terminalId,l.goods,n);take(f,'yard',l.terminalId,l.goods,n);l.rehandleRemaining-=n;l.rehandles+=n;s.stats.rehandles+=n;month(s).rehandles+=n;if(n)post(s,'rehandling',n*55,-n*55,'路径调整实际移位');
  }
  // Downstream-to-upstream order gives every transfer at least one hourly boundary.
  for (const l of lots) {
    const c = callMap.get(l.callId)!, t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (l.flow === 'export' && c.stage === 'berthed' && l.release && !blocked(s,f,t.id, 'quay')) {
      const n = take(f, 'quay', t.id, l.goods, Math.min(l.apron, capacity(f, 'quay', t.id, l.goods, c.rows)), c.rows);
      l.apron -= n; buffers.set(t.id, (buffers.get(t.id) ?? 0) - n); s.stats.loaded += n; bill(s, l, n, c);
      if (!n && l.apron > 0) c.wait.equipment++;
    }
    if (l.flow === 'import' && (l.yard>0||l.land>0) && l.release && !l.bonded && l.pickupHour<=s.hour && !blocked(s,f,t.id, 'gate')) {
      const key = l.terminalId + ':' + l.route, timed=l.route==='rail'||l.route==='barge';
      const limit = Math.max(0, routeCapacity(s, l) - (routeUsed.get(key) ?? 0));
      if(timed&&!isBlocked(s,t.id,'transport')){const n=Math.min(l.land,limit);l.land-=n;staged.set(key,(staged.get(key)??0)-n);routeUsed.set(key,(routeUsed.get(key)??0)+n);bill(s,l,n,c);if(n)post(s,'logistics',n*(l.route==='rail'?15:12),-n*(l.route==='rail'?15:12),'按窗口实际发运');}
      const intake=timed?Math.max(0,(l.route==='rail'?600:500)-(staged.get(key)??0)):isBlocked(s,t.id,'transport')?0:limit;
      const pulled=retrieveYard(s,l,Math.min(l.yard,capacity(f,'gate',t.id,l.goods),intake),capacity(f,'yard',t.id,l.goods),capacity(f,'yard',t.id,l.goods),capacity(f,'transport',t.id,l.goods));
      const n=pulled.quantity;
      take(f, 'gate', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, pulled.movement+pulled.rehandles);take(f,'transport',t.id,l.goods,pulled.relocationTransport); l.yard -= n; stocks.set(t.id, (stocks.get(t.id) ?? 0) - n);
      if(timed){l.land+=n;staged.set(key,(staged.get(key)??0)+n);}else {routeUsed.set(key,(routeUsed.get(key)??0)+n);bill(s,l,n,c);if(n){const cost=money(n*(l.route==='road'?roadPlan(s,t.id).unit:12));post(s,'logistics',cost,-cost,'腹地运输接续');}}
      if (l.yard && !n) s.stats.roadWaiting += l.yard;
    }
  }
  for (const l of lots) {
    const t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (blocked(s,f,t.id, 'transport')) continue;
    if (l.flow === 'export'&&l.yard>0) {
      const call=callMap.get(l.callId)!;
      if(call.stage!=='berthed')continue;
      const freeBuffer=Math.max(0,Math.floor(t.storageCapacity*.15)-(buffers.get(t.id)??0));
      const pulled=retrieveYard(s,l,Math.min(l.yard,freeBuffer),capacity(f,'yard',t.id,l.goods),capacity(f,'transport',t.id,l.goods),capacity(f,'transport',t.id,l.goods),true),n=pulled.quantity;
      take(f, 'transport', t.id, l.goods, pulled.movement+pulled.relocationTransport); take(f, 'yard', t.id, l.goods, pulled.movement+pulled.rehandles); l.yard -= n; l.apron += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) - n); buffers.set(t.id, (buffers.get(t.id) ?? 0) + n);
    } else if(l.flow==='import'&&l.apron>0) {
      const free = Math.max(0, t.storageCapacity - (stocks.get(t.id) ?? 0));
      const stored=storeYard(s,l,Math.min(l.apron,free),Math.min(capacity(f,'transport',t.id,l.goods),capacity(f,'yard',t.id,l.goods))),n=stored.quantity;
      take(f, 'transport', t.id, l.goods, stored.movement); take(f, 'yard', t.id, l.goods, stored.movement); l.apron -= n; l.yard += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) + n); buffers.set(t.id, (buffers.get(t.id) ?? 0) - n);
    }
  }
  for (const l of lots) {
    const c = callMap.get(l.callId)!, t = terminal(s, l.terminalId);if(l.rehandleRemaining>0)continue;
    if (l.flow === 'import' && l.ship>0 && c.stage === 'berthed' && !blocked(s,f,t.id, 'quay')) {
      const buffer = Math.max(0, Math.floor(t.storageCapacity * .15) - (buffers.get(t.id) ?? 0));
      const n = take(f, 'quay', t.id, l.goods, Math.min(l.ship, buffer, capacity(f, 'quay', t.id, l.goods, c.rows)), c.rows);
      l.ship -= n; l.apron += n; buffers.set(t.id, (buffers.get(t.id) ?? 0) + n); s.stats.unloaded += n; if (!n && l.ship > 0) c.wait.equipment++;
    }
    if (l.flow === 'export' && l.land>0 && l.release && l.firstHour <= s.hour && !blocked(s,f,t.id, 'gate')) {
      const key = l.terminalId + ':' + l.route,timed=l.route==='rail'||l.route==='barge',limit = timed?l.connectionReady:Math.max(0, routeCapacity(s, l) - (routeUsed.get(key) ?? 0)), free = Math.max(0, t.storageCapacity - (stocks.get(t.id) ?? 0));
      const stored=storeYard(s,l,Math.min(l.land,free,capacity(f,'gate',t.id,l.goods),limit),capacity(f,'yard',t.id,l.goods)),n=stored.quantity;
      take(f, 'gate', t.id, l.goods, n); take(f, 'yard', t.id, l.goods, stored.movement); l.land -= n; l.yard += n; stocks.set(t.id, (stocks.get(t.id) ?? 0) + n);if(timed)l.connectionReady-=n;else {routeUsed.set(key,(routeUsed.get(key)??0)+n);if(n)post(s,'logistics',n*(l.route==='road'?roadPlan(s,t.id).unit:12),-n*(l.route==='road'?roadPlan(s,t.id).unit:12),'出口运输接续');}
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
  }
  // Idle equipment may be serviced; reserving production capacity is not a prerequisite for maintenance.
  for(const a of s.assets){const spec=assetSpec(a.model);
    if (s.policy.maintenance === 'preventive' && a.status === 'active' && plannedMaintenanceAllowed(s,a) && s.spareParts > 0 && f.roles.technician >= 1 && s.cash > s.policy.reserveCash) {
      const cost = money(spec.price * .0006); post(s, 'maintenance', cost + 4000, -cost, '计划维护与领用备件'); s.spareParts--; f.roles.technician--;
      a.status = 'maintenance'; a.repairUntil = s.hour + 16; s.stats.maintenance++; event(s, 'maintenance', spec.name + '进入计划维护', '停机16小时；已领用备件与技术岗位。', a.id);
    }
  }
  for (const c of indexes(s).activeCalls.values()) {if(c.stage!=='berthed')continue;
    const t = terminal(s, c.terminalId);
    if (s.policy.shorePower && t.shore && f.power >= 180 && !blocked(s,f,t.id, 'power')) { energy += 180; f.power -= 180; }
    else shipEmissions += 150;
  }
  if (fuel > s.fuelStock + .0001) throw Error('燃料资源分配失衡。');
  s.fuelStock = Math.max(0, s.fuelStock - fuel);
  const clean = Math.min(energy, Math.max(0, s.solarKw * Math.sin((s.hour % 24 - 6) / 12 * Math.PI)) * (weather(s).raining ? .45 : 1));
  const powerCost = money(Math.max(0, energy - clean) * electricityRate(s.hour));
  post(s, 'energy', powerCost, -powerCost, '购电费用'); post(s, 'fuel', fuel * 7.2, 0, '燃料消耗结转');
  s.stats.energy += energy; s.stats.fuel += fuel; const emissions = Math.max(0, energy - clean) * .52 + fuel * 2.68 + shipEmissions;
  s.stats.emissions += emissions; month(s).energy += energy; month(s).emissions += emissions;
  let wages = 0;
  for (const c of s.crews) {if (c.shift === Math.floor(s.hour % 24 / 8)) wages += c.count * c.wage*(s.hour%24<6||s.hour%24>=22?1.25:1);else if(c.shift==='reserve')wages+=c.count*c.wage/3*1.1;}
  if(financiallyHalted(s))wages*=.2;
  post(s, 'wages', wages, -wages, '当班及培训人员工资');
  for (const a of s.assets) if (a.ownership === 'leased' && a.status !== 'retired' && leaseDeliveryHour(a) <= s.hour) { const n = money(assetSpec(a.model).leaseDaily / 24),credit=Math.min(a.leaseCredit,n);a.leaseCredit-=credit; post(s, 'lease', n, -(n-credit), '设备租赁费用'); }
  if(financeInsuranceActive(s)){post(s,'insurance',92,-92,'风险保障费用');s.stats.insurancePremium+=92;}
  for(const i of s.incidents)if(i.status!=='resolved'&&i.backupActive){
    // Reserve the next hour's cost before allowing the next production frame to use backup.
    const fee=1200*(i.severity??1);post(s,'backup',fee,-fee,'备用系统与供能');s.stats.emissions+=90;month(s).emissions+=90;
    if(i.authorization){i.authorizedSpent=(i.authorizedSpent??0)+fee;if(i.authorizedSpent+fee>(i.authorizedBudget??0)||s.cash<fee){i.backupActive=false;i.authorizationPaused=true;i.authorizationNote='备用预算已耗尽，请增加授权或等待修复。';event(s,'decision',i.title+'备用预算到限',i.authorizationNote,i.id);}}
  }
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
  const candidates=type==='spill'?s.terminals.filter(t=>['bulk','liquid'].includes(t.goods)):s.terminals;
  const t = candidates[Math.floor(enterpriseRandom(s.config.seed, 'incident-terminal', day) * candidates.length)]!;
  if ((type === 'flood' && t.floodProtection > 0 || type === 'security' && t.security > 0 || type === 'spill' && t.dustControl > 0) && enterpriseRandom(s.config.seed, 'protection', day) < .75) { event(s, 'prevention', '防护设施抑制了异常扩大', t.name); return; }
  const title = { power: '供电中断', system: '业务系统数据异常', flood: '局部积水与停工', spill: '污染与货损事件', security: '限制区异常侵入', road: '港区道路中断' }[type];
  const severity=enterpriseRandom(s.config.seed,'incident-severity',day)<(s.config.scenario==='resilience'?.25:.1)?2 as const:1 as const;
  const id = 'incident-' + s.hour, loss = (type === 'spill' ? 360000 : 60000)*(severity===2?5:1);
  s.incidents.push({ id, type, title, terminalId: type === 'system' || type === 'power' ? null : t.id, started: s.hour, status: 'active', response: 'none', resolves: null, evidence: false, loss, severity, blockedHours: 0 });
  post(s, 'incident', loss, -loss, '异常直接损失');
  if (financeInsuranceActive(s)){const amount=Math.round(loss*.7);s.receivables.push({id:'insurance-'+id,due:s.hour+30*24,amount});post(s,'other-income',amount,0,'保险赔付应收确认');s.stats.insuranceClaims+=amount;}
  if (type === 'spill') {
    const lot = s.lots.find(l => l.terminalId === t.id && l.yard > 0);
    if (lot) { const n = Math.min(lot.yard, Math.max(1, Math.round(lot.yard * .05)));discardYard(s,lot.id,n); lot.yard -= n; lot.lost += n; s.stats.lost += n; }
    s.stats.spillExposure += 1;
  }
  event(s, 'incident', title, t.name + '：需要核查、控制、技术处置与恢复确认。', id);
}
export function advanceEnterpriseHour(s: EnterpriseState) {
  if (s.hour >= s.horizon||s.finance.status==='bankrupt'||s.finance.tutorialPaused) return;
  receiveSupplies(s);
  if (s.hour % 24 === 0) {
    market(s); arrivals(s); collectAndSettle(s);
    replenishSupplies(s);
  }
  if(s.hour%24===0)for(const t of s.terminals){const fee=t.goods==='liquid'?0:roadPlan(s,t.id).daily;if(fee){post(s,'logistics',fee,-fee,t.name+'道路预约保障');s.management.metrics.roadReservationCost+=fee;}if(t.bonded)post(s,'warehouse',600,-600,t.name+'监管仓储运维');}
  updateProjects(s); updateAssets(s); handleDocuments(s); incidents(s);processIncidentAuthorizations(s);
  const value = assetValue(s), f = resources(s);
  moveShips(s, f); production(s, f); assetWork(s, f);
  for(const a of s.assets){const trace=f.traces.get(a.id)!;trace.work=a.lastWork;if(trace.work>0)trace.reason='working';recordAssetHour(s,a.id,trace);}
  const nextValue = assetValue({ ...s, hour: s.hour + 1 });
  post(s, 'depreciation', Math.max(0, value - nextValue), 0, '固定资产折旧');
  closeFinanceHour(s);
  if (monthKey(s.hour + 1) !== monthKey(s.hour) || s.hour + 1 === s.horizon) {
    const m = month(s);
    const tax = money(Math.max(0, m.revenue - m.operating - m.depreciation - m.interest) * .15);
    post(s, 'tax', tax, -tax, '教学情境经营所得税');
    refreshFinanceStatus(s,s.hour+1);
  }
  s.hour++;
  closeDirectorDay(s);
  if(s.hour%168===0||s.hour===s.horizon)finishManagementWeek(s);
}
