import {assetSpec,projectSpec} from './enterprise-catalogue.js';
import {CARGO_LABELS,enterpriseRandom,type CargoKind,type CargoLot,type EnterpriseState,type LogisticsPlan,type Terminal,type Incident,type StaffRole} from './enterprise-model.js';

export const DEFAULT_LOGISTICS_PLAN:LogisticsPlan={road:'reserved',routing:'balanced',warehousing:'direct'};
export const ROAD_PLANS={basic:{name:'按需通行',capacity:1,daily:0,unit:32},reserved:{name:'预约保障',capacity:2,daily:800,unit:24},surge:{name:'高峰增援',capacity:4,daily:2600,unit:21}} as const;
export const ROAD_BASE_CAPACITY:Record<CargoKind,number>={container:20,bulk:100,liquid:200,general:30,roro:30,passenger:80};
export function roadPlan(s:EnterpriseState,id:string){return ROAD_PLANS[(s.management.logisticsPlans[id]??DEFAULT_LOGISTICS_PLAN).road];}
export function roadCapacity(s:EnterpriseState,t:Terminal){return Math.min(s.policy.roadQuota,ROAD_BASE_CAPACITY[t.goods]*roadPlan(s,t.id).capacity);}
export function electricityRate(hour:number){const h=hour%24;return h>=17&&h<22?1.18:h>=22||h<6?.46:.82;}
export function priceResponse(s:EnterpriseState,goods:CargoKind){
  const elasticity:Record<CargoKind,number>={container:1.45,bulk:2.1,liquid:1.05,general:1.3,roro:1.6,passenger:2.3};
  const sensitivity=s.config.scenario==='green'?.8:s.config.scenario==='growth'?1.15:1;
  return Math.max(.35,Math.min(1.8,Math.exp(-elasticity[goods]*sensitivity*(s.policy.tariff-1))));
}
export function preferredRoute(s:EnterpriseState,t:Terminal,at:number,quantity=0):CargoLot['route']{
  if(t.goods==='liquid')return 'pipeline';
  const routing=s.management.logisticsPlans[t.id]?.routing??'balanced';
  if(routing==='road')return 'road';
  if(routing==='barge-first')return 'barge';
  if(routing==='rail-first')return t.rail?'rail':'road';
  const day=Math.floor(at/24),booked=s.lots.filter(l=>l.terminalId===t.id&&l.route==='rail'&&Math.floor(l.firstHour/24)===day).reduce((n,l)=>n+l.quantity,0);
  return t.rail&&(s.policy.railHour-at%24+24)%24<=12&&booked+quantity<=600?'rail':'road';
}
export function projectUnavailable(s:EnterpriseState,type:string,terminalId:string):string|null{
  const p=projectSpec(type),t=s.terminals.find(t=>t.id===terminalId);if(!t)return '作业区不存在';
  if(s.hour+p.days*24>=s.horizon)return '本经营期内无法投产';
  if(s.projects.some(x=>x.status==='building'&&x.type===type&&(x.terminalId===terminalId||p.target==='port'&&type!=='grid-upgrade')))return '相同项目正在建设';
  const invalid:Partial<Record<typeof p.effect,boolean>>={
    rail:t.rail||!['container','bulk','general'].includes(t.goods),shore:t.shore,bonded:t.bonded||!['container','general'].includes(t.goods),
    automation:t.automation>=1||t.goods!=='container',digital:s.digitalLevel>=5,security:t.security>=1,flood:t.floodProtection>=1,
    dust:t.dustControl>=1||!['bulk','liquid'].includes(t.goods),depth:!['container','bulk'].includes(t.goods)||t.depth>=16.5,
    berth:!['container','bulk'].includes(t.goods)||t.length>=390,road:t.distance<=.96,solar:s.solarKw>=4500,grid:s.gridKw>=16700,
    storage:s.projects.filter(p=>p.type===type&&p.terminalId===terminalId).length>=3,
  };
  return invalid[p.effect]?'该位置已达到本情境的有效等级，或货种不适用':null;
}
/** Public operational estimates; never reads future arrivals, weather or incidents. */
export function strategyView(s:EnterpriseState){
  const shift=Math.floor(s.hour%24/8);
  const coverage=Object.keys(CARGO_LABELS);
  const terminals=s.terminals.map(t=>{
    const stages=['quay','transport','yard','gate'] as const;
    const capacity=Object.fromEntries(stages.map(stage=>[stage,s.assets.filter(a=>a.terminalId===t.id&&a.status==='active'&&assetSpec(a.model).stage===stage).reduce((n,a)=>{
      const p=assetSpec(a.model),distance=stage==='transport'?1/Math.max(.6,t.distance/1.6):1;
      return n+p.rate*(.68+.32*a.health/100)*distance;
    },0)])) as Record<typeof stages[number],number>;
    const bottleneck=stages.reduce((a,b)=>capacity[a]<=capacity[b]?a:b);
    const observed=s.lots.filter(l=>l.terminalId===t.id&&l.firstHour>=Math.max(0,s.hour-168)&&l.firstHour<=s.hour);
    const recent=observed.reduce((n,l)=>n+l.quantity,0),window=Math.max(24,Math.min(168,s.hour));
    const road=roadPlan(s,t.id),inventory=s.lots.filter(l=>l.terminalId===t.id).reduce((n,l)=>n+l.yard,0);
    return {id:t.id,capacity,bottleneck,observedDaily:recent/window*24,inventory,roadCapacity:roadCapacity(s,t),reservationDaily:t.goods==='liquid'?0:road.daily,plan:s.management.logisticsPlans[t.id]??DEFAULT_LOGISTICS_PLAN};
  });
  const wageDaily=s.crews.reduce((n,c)=>n+c.count*c.wage*8,0);
  const fuelDaily=s.hour?s.stats.fuel/(s.hour/24):900;
  return {terminals,wageDaily,fuelDaily,cashDays:s.cash/Math.max(1,wageDaily+fuelDaily*7.2+10000),
    insuranceHourly:92,market:coverage.map(kind=>{const k=kind as CargoKind;return {kind:k,name:CARGO_LABELS[k].name,demandFactor:priceResponse(s,k)};}),
    projects:Object.fromEntries(s.terminals.map(t=>[t.id,Object.fromEntries(['yard-extension','road-upgrade','rail-link','shore-power','grid-upgrade','solar-storage','automation','port-community','security','flood','dust','bonded-warehouse','channel-depth','berth-extension'].map(id=>[id,projectUnavailable(s,id,t.id)]))])),
    staffing:s.crews.filter(c=>c.shift===shift&&c.trainingUntil<=s.hour).reduce((n,c)=>n+c.count*c.skill/100,0)};
}
export function absenceCount(s:EnterpriseState,role:string,shift:number,count:number){
  const day=Math.floor(s.hour/24),chance=s.config.scenario==='resilience'?.24:.1;
  return enterpriseRandom(s.config.seed,'absence-'+role+'-'+shift,day)<chance?Math.max(1,Math.ceil(count*.25)):0;
}
export function staffCapacity(s:EnterpriseState,role:StaffRole){
  const shift=Math.floor(s.hour%24/8),day=Math.floor(s.hour/24),current=s.crews.filter(c=>c.role===role&&c.shift===shift&&c.trainingUntil<=s.hour);
  const count=current.reduce((n,c)=>n+c.count,0),fte=current.reduce((n,c)=>n+c.count*c.skill/100,0),missing=absenceCount(s,role,shift,count);
  const reserve=s.crews.filter(c=>c.role===role&&c.shift==='reserve'&&c.trainingUntil<=s.hour).reduce((n,c)=>n+c.count*c.skill/100,0);
  const used=s.management.reserveDay===day?s.management.reserveUsed[role]??0:0;
  const total=s.crews.filter(c=>c.role===role&&c.trainingUntil<=s.hour).reduce((n,c)=>n+c.count*c.skill/100,0),duty=s.management.reserveDay===day?s.management.dutyUsed[role]??0:0,remaining=Math.max(0,total*8-duty),base=Math.min(remaining,Math.max(0,fte-(count?fte/count*missing:0)));
  return {base,missing:count?fte/count*missing:0,reserve:Math.max(0,Math.min(reserve,reserve*8-used,remaining-base))};
}
export function incidentRepairHours(s:Pick<EnterpriseState,'digitalLevel'>,i:Incident){return (i.type==='system'?Math.max(4,18-s.digitalLevel*3):12)*(i.severity??1);}
export function incidentBudget(s:Pick<EnterpriseState,'digitalLevel'>,i:Incident,plan:'repair'|'continuity'){
  const severity=i.severity??1;
  return plan==='repair'?30000*severity:Math.ceil((75000*severity+1200*severity*incidentRepairHours(s,i)+5000)/1000)*1000;
}
