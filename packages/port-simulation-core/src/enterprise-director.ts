import {ENTERPRISE_START,hourDate,monthKey,type EnterpriseState,type AssetHourSample,type EnterpriseDailyReport,type BerthCraneAllocation} from './enterprise-model.js';
import {assetSpec} from './enterprise-catalogue.js';
import {depositPrincipal,payableBalance} from './enterprise-finance.js';

/** The manager visits on the eighth day of each month; business keeps its original hourly clock. */
export function enterpriseDirector(s:Pick<EnterpriseState,'hour'|'horizon'|'incidents'|'management'>){
  const d=hourDate(s.hour),visitStart=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),8)-ENTERPRISE_START)/3_600_000,visitEnd=visitStart+24;
  const next=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,8)-ENTERPRISE_START)/3_600_000;
  const incident=s.incidents.find(i=>i.severity===2&&i.status!=='resolved'&&(!i.authorization||i.authorizationPaused)&&i.resolves===null&&!(i.evidence&&i.response==='repair'));
  const scheduled=s.hour>=visitStart&&s.hour<visitEnd;
  const mode=incident?'emergency' as const:scheduled?'observation' as const:'briefing' as const;
  const boundary=Math.min(s.horizon,scheduled?visitEnd:s.hour<visitStart?visitStart:next);
  return {mode,scheduled,visitStart,visitEnd,nextVisit:s.hour<visitStart?visitStart:next,boundary,incidentId:incident?.id??null,terminalId:incident?.terminalId??null,remaining:scheduled?visitEnd-s.hour:24,secondsPerHour:mode==='briefing'?1/24:6};
}

export interface CraneCandidate {id:string;staff:number;kw:number;fuel:number;}
export interface CraneDemand {terminalId:string;workHours:number;workUnits:number;deadline:number;waiting:number;cranes:CraneCandidate[];maxCranes?:number;}
/** First cover working berths, then fill weighted integer deficits. Resources and physical crane counts stay finite. */
export function allocateBerthCranes(demands:CraneDemand[],budget:{operators:number;power:number;fuel:number}){
  const groups=demands.filter(d=>d.workHours>0&&d.cranes.length).map(d=>({...d,remaining:[...d.cranes],assigned:[] as string[],baseline:0,extra:0}));
  const order=[...groups].sort((a,b)=>Math.floor(b.waiting/8)-Math.floor(a.waiting/8)||a.deadline-b.deadline||a.terminalId.localeCompare(b.terminalId));
  const left={...budget},sequence:string[]=[];
  const available=(g:typeof groups[number])=>g.assigned.length>=(g.maxCranes??g.cranes.length)?undefined:g.remaining.find(c=>c.staff<=left.operators+1e-9&&c.kw<=left.power+1e-9&&c.fuel<=left.fuel+1e-9);
  const assign=(g:typeof groups[number],base:boolean)=>{const c=available(g);if(!c)return false;left.operators-=c.staff;left.power-=c.kw;left.fuel-=c.fuel;g.remaining=g.remaining.filter(x=>x!==c);g.assigned.push(c.id);sequence.push(c.id);if(base)g.baseline++;else g.extra++;return true;};
  for(const g of order)assign(g,true);
  let extras=0;
  while(true){const active=groups.filter(g=>g.baseline&&available(g));if(!active.length)break;const total=active.reduce((n,g)=>n+g.workHours,0);
    const best=[...active].sort((a,b)=>(b.workHours/total*(extras+1)-b.extra)-(a.workHours/total*(extras+1)-a.extra)||a.deadline-b.deadline||a.terminalId.localeCompare(b.terminalId))[0]!;
    if(!assign(best,false))break;extras++;
  }
  const allocations:BerthCraneAllocation[]=groups.map(g=>({terminalId:g.terminalId,workHours:g.workHours,workUnits:g.workUnits,eligible:Math.min(g.cranes.length,g.maxCranes??Infinity),assigned:g.assigned.length,baseline:g.baseline,extra:g.extra,assetIds:g.assigned,reason:g.assigned.length?'先保障'+g.baseline+'台，按剩余工作量追加'+g.extra+'台':'当班岗位、供能或燃料不足；等待时间进入下一轮优先级'}));
  return {sequence,allocations,left};
}

export function recordAssetHour(s:EnterpriseState,assetId:string,sample:AssetHourSample){const samples=s.telemetry.assets[assetId]??[];samples.push(sample);while(samples.length&&samples[0]!.hour<s.hour-23)samples.shift();s.telemetry.assets[assetId]=samples;}
export function closeDirectorDay(s:EnterpriseState){
  if(s.hour%24!==0)return;
  const begin=s.hour-24,byKind=new Map<string,{due:number;onTime:number}>();
  for(const l of s.lots)if(l.deadline>=begin&&l.deadline<s.hour){const a=byKind.get(l.goods)??{due:0,onTime:0};a.due+=l.quantity;a.onTime+=l.completed-l.lateUnits;byKind.set(l.goods,a);}
  const ratios=[...byKind.values()].filter(v=>v.due>0).map(v=>Math.max(0,Math.min(1,v.onTime/v.due)));
  const departed=s.calls.filter(c=>c.departedHour!==null&&c.departedHour>=begin&&c.departedHour<s.hour),m=s.months.find(m=>m.month===monthKey(begin)),prior=s.telemetry.days.at(-1);
  const sameMonth=prior&&monthKey(prior.hour-1)===monthKey(begin),beforeRevenue=sameMonth?s.telemetry.days.filter(d=>monthKey(d.hour-1)===monthKey(begin)).reduce((n,d)=>n+d.revenue,0):0,beforeOperating=sameMonth?s.telemetry.days.filter(d=>monthKey(d.hour-1)===monthKey(begin)).reduce((n,d)=>n+d.operating,0):0;
  let workingHours=0,availableHours=0;for(const samples of Object.values(s.telemetry.assets))for(const h of samples){workingHours+=h.work;if(h.available)availableHours++;}
  const priorEnergy=s.telemetry.days.reduce((n,d)=>n+d.energy,0),priorEmissions=s.telemetry.days.reduce((n,d)=>n+d.emissions,0);
  const row:EnterpriseDailyReport={hour:s.hour,cash:s.cash,debt:s.debt,deposits:depositPrincipal(s),unpaid:payableBalance(s),revenue:(m?.revenue??0)-beforeRevenue,operating:(m?.operating??0)-beforeOperating,waitingShips:s.calls.filter(c=>c.stage==='waiting').length,meanBerthWait:departed.length?departed.reduce((n,c)=>n+c.wait.berth+c.wait.channel+c.wait.documents,0)/departed.length:null,deliveryRate:ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:null,energy:s.stats.energy-priorEnergy,emissions:s.stats.emissions-priorEmissions,workingHours,availableHours};
  s.telemetry.days.push(row);
}
export function enterpriseTelemetryView(s:EnterpriseState){return {...s.telemetry,assets:Object.fromEntries(s.assets.map(a=>{const samples=(s.telemetry.assets[a.id]??[]).filter(h=>h.hour>=s.hour-24),hours=samples.length,work=samples.reduce((n,h)=>n+h.work,0),staffed=samples.filter(h=>h.staffed).length,available=samples.filter(h=>h.available).length;return [a.id,{hours,work,staffed,available,load:hours?work/hours:null,staffCoverage:hours?staffed/hours:null,reasons:Object.fromEntries([...new Set(samples.map(h=>h.reason))].map(reason=>[reason,samples.filter(h=>h.reason===reason).length])),last:samples.at(-1)??null,stage:assetSpec(a.model).stage}];}))};}
