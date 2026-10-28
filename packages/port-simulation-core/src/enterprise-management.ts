import {assetSpec} from './enterprise-catalogue.js';
import {CARGO_LABELS,STAFF_LABELS,type Asset,type CargoKind,type Crew,type EnterpriseManagement,type EnterpriseState,type ManagementBaseline,type ManagementMetrics,type ManagementPlan,type YardPlan,type Incident} from './enterprise-model.js';
import {event,post,terminal} from './enterprise-support.js';
import {createYardBlocks,DEFAULT_YARD_PLAN,yardOverview} from './enterprise-yard.js';

const kinds=Object.keys(CARGO_LABELS) as CargoKind[];
const emptyGoods=()=>Object.fromEntries(kinds.map(k=>[k,0])) as Record<CargoKind,number>;
export const emptyManagementMetrics=():ManagementMetrics=>({yardStored:0,yardRetrieved:0,yardRehandles:0,travelWork:0,yardBlockedHours:0,sharedUnits:0,chargingHours:0,chargingWaitHours:0,chargingEnergy:0});
export function createManagement():EnterpriseManagement{
  return {plan:{goal:'balanced',staffing:'balanced',charging:'threshold',chargeTarget:80,chargeReserve:35,chargingLimit:50,maintenance:'standard',escalation:'major'},
    yardPlans:{T1:{...DEFAULT_YARD_PLAN},T2:{...DEFAULT_YARD_PLAN}},blocks:[...createYardBlocks('T1'),...createYardBlocks('T2')],metrics:emptyManagementMetrics(),
    baseline:{hour:0,cash:85_000_000,revenue:0,operating:0,delivered:emptyGoods(),metrics:emptyManagementMetrics(),energy:0},reviews:[],changes:[],planCount:0,yardPlanCount:0};
}
function enumValue(value:unknown,allowed:readonly string[]){if(typeof value!=='string'||!allowed.includes(value))throw Error('管理策略选项无效。');}
function numberValue(value:unknown,min:number,max:number,step=1){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||value%step!==0)throw Error('管理参数应在'+min+'至'+max+'之间，步长'+step+'。');}
export function applyManagementPlan(s:EnterpriseState,patch:Partial<ManagementPlan>){
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length)throw Error('请选择至少一项运营规则。');
  const enums:Record<string,readonly string[]>={goal:['balanced','service','flow','green'],staffing:['balanced','day-heavy','reserve','custom'],charging:['threshold','staggered','offpeak'],maintenance:['standard','offpeak','risk'],escalation:['major','all']};
  for(const [key,value]of Object.entries(patch)){
    if(!Object.hasOwn(s.management.plan,key))throw Error('未知的管理策略字段。');
    if(enums[key])enumValue(value,enums[key]);
    else if(key==='chargeTarget')numberValue(value,40,95,5);
    else if(key==='chargeReserve')numberValue(value,0,80,5);
    else if(key==='chargingLimit')numberValue(value,10,100,5);
  }
  // Staffing is applied by a physical cohort-preserving command, never by a hidden productivity multiplier.
  if(patch.staffing!==undefined&&patch.staffing!==s.management.plan.staffing)throw Error('请通过班表模板安排实际人员。');
  if(patch.goal&&Object.keys(patch).length===1){
    const goal=patch.goal;
    s.policy={...s.policy,autoBerth:true,documents:'automatic',verifiedExceptions:true,transport:'balanced',roadQuota:goal==='service'?300:240,priority:goal==='flow'?'fifo':'deadline',shorePower:true};
    Object.assign(s.management.plan,{charging:goal==='green'?'offpeak':goal==='balanced'?'threshold':'staggered',chargeTarget:goal==='green'?90:80,chargeReserve:goal==='service'?50:35,chargingLimit:goal==='green'?40:50});
  }
  Object.assign(s.management.plan,patch);s.management.planCount++;
  return '运营规则已生效。常规单证、靠泊与补给按授权执行；真实回执、资源条件和成本仍逐项计算。';
}
export function applyYardPlan(s:EnterpriseState,terminalId:string,patch:Partial<YardPlan>){
  const t=terminal(s,terminalId),current=s.management.yardPlans[terminalId];
  if(t.goods!=='container'||!current)throw Error('周转分组与堆垛策略用于集装箱作业区；其他货种继续采用对应专用设施。');
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length)throw Error('堆场策略不能为空。');
  const next={...current};
  for(const [key,value]of Object.entries(patch)){
    if(!Object.hasOwn(next,key))throw Error('未知堆场策略。');
    if(key==='allocation')enumValue(value,['fixed','shared','dynamic']);
    else if(key==='classification')enumValue(value,['arrival','turnover','voyage']);
    else if(key==='importShare')numberValue(value,20,80,10);
    else if(key==='sharedShare')numberValue(value,0,30,10);
    else if(key==='maxTiers')numberValue(value,2,4);
    Object.assign(next,{[key]:value});
  }
  if(next.importShare+next.sharedShare>90)throw Error('需为出口保留至少10%的规划区块。');
  s.management.yardPlans[terminalId]=next;s.management.yardPlanCount++;
  return '堆场规则已更新，适用于后续入场。已有库存留在原位，通过实际提取和翻箱逐步释放。';
}
export function applyStaffPlan(s:EnterpriseState,template:'balanced'|'day-heavy'|'reserve'){
  enumValue(template,['balanced','day-heavy','reserve']);
  const weights=template==='day-heavy'?[.25,.5,.25,0]:template==='reserve'?[.3,.3,.3,.1]:[1/3,1/3,1/3,0];
  const result:Crew[]=[];
  for(const role of Object.keys(STAFF_LABELS) as Crew['role'][]){
    const groups=s.crews.filter(c=>c.role===role),count=groups.reduce((n,c)=>n+c.count,0),targets=weights.map(w=>Math.floor(w*count));
    for(let n=targets.reduce((a,b)=>a+b,0);n<count;n++)targets[n%3]!++;
    const pools=groups.map(c=>({...c,cohort:c.cohort??c.id}));let pool=0;
    for(let shift=0;shift<4;shift++){
      let remaining=targets[shift]!;
      while(remaining&&pool<pools.length){
        const source=pools[pool]!,n=Math.min(source.count,remaining),destination=shift===3?'reserve' as const:shift as 0|1|2;
        const same=result.find(c=>c.cohort===source.cohort&&c.shift===destination&&c.skill===source.skill&&c.trainingUntil===source.trainingUntil);
        if(same)same.count+=n;
        else result.push({...source,id:result.some(c=>c.id===source.id)?'crew-'+s.nextId++:source.id,count:n,shift:destination});
        source.count-=n;remaining-=n;if(!source.count)pool++;
      }
    }
  }
  if(result.reduce((n,c)=>n+c.count,0)!==s.crews.reduce((n,c)=>n+c.count,0))throw Error('班表未能保持人员总量。');
  s.crews=result;s.management.plan.staffing=template;
  return '班表已按现有人数重新分配；技能、培训和工资历史保留，培训中的人员仍不能生产。';
}
export function chargingWanted(s:EnterpriseState,a:Asset,ready:number,total:number,alreadyCharging:number){
  const spec=assetSpec(a.model);if(!spec.battery)return false;
  const critical=a.battery<spec.kw*1.1;if(critical)return true;
  const p=s.management.plan,h=s.hour%24;
  if(p.charging==='threshold'||a.battery>=spec.battery*a.batteryHealth*p.chargeTarget/100)return false;
  if(p.charging==='offpeak'&&h>=6&&h<22)return false;
  if(p.charging==='staggered'&&h>=17&&h<=21)return false;
  return ready-alreadyCharging>Math.ceil(total*p.chargeReserve/100);
}
export function plannedMaintenanceAllowed(s:EnterpriseState,a:Asset){
  const spec=assetSpec(a.model),p=s.management.plan,urgent=a.health<35||a.serviceHours>spec.maintenanceHours*1.5;
  if(p.maintenance==='offpeak'&&!urgent&&s.hour%24>=6)return false;
  return a.health<(p.maintenance==='risk'?Math.max(75,s.policy.maintenanceHealth):s.policy.maintenanceHealth)||a.serviceHours>spec.maintenanceHours*(p.maintenance==='risk'?.8:1);
}
export function needsManagementAttention(i:Incident){return i.status!=='resolved'&&(!i.authorization||!!i.authorizationPaused);}
function technicians(s:EnterpriseState){return Math.max(0,s.crews.filter(c=>c.role==='technician'&&c.shift===Math.floor(s.hour%24/8)&&c.trainingUntil<=s.hour).reduce((n,c)=>n+c.count*c.skill/100,0)-s.assets.filter(a=>a.status==='maintenance').length-s.incidents.filter(i=>i.resolves!==null).length);}
export function authorizeIncident(s:EnterpriseState,id:string,plan:'repair'|'continuity',budget:number){
  const i=s.incidents.find(i=>i.id===id);if(!i||i.status==='resolved')throw Error('该事件已经恢复或不存在。');
  enumValue(plan,['repair','continuity']);numberValue(budget,30000,1_000_000,1000);
  if(plan==='continuity'&&!['power','system'].includes(i.type))throw Error('该类事件须恢复现场条件，备用供电或系统不能绕过限制。');
  if(budget<(i.authorizedSpent??0)+(i.resolves===null&&i.response!=='repair'?30000:0))throw Error('授权上限不足以覆盖已发生费用及后续修复。');
  i.authorization=plan;i.authorizedBudget=budget;i.authorizedSpent??=0;i.authorizationPaused=false;i.authorizationNote='';
  if(plan==='repair')i.backupActive=false;
  processIncidentAuthorizations(s);
  return '处置方案已授权。系统按预算排修，实际技术完成后确认恢复；等待、备用费用与积压仍保留。';
}
export function processIncidentAuthorizations(s:EnterpriseState){
  for(const i of s.incidents){
    if(i.status==='resolved')continue;
    if(!i.authorization&&i.type==='road'&&s.management.plan.escalation==='major'&&s.cash>s.policy.reserveCash){i.authorization='repair';i.authorizedBudget=40000;i.authorizedSpent=0;}
    if(!i.authorization)continue;
    const notify=(reason:string)=>{i.authorizationPaused=true;if(i.authorizationNote!==reason){i.authorizationNote=reason;event(s,'decision',i.title+'需要调整授权',reason,i.id);}};
    const pay=(amount:number,note:string)=>{if((i.authorizedSpent??0)+amount>(i.authorizedBudget??0)||s.cash<amount){notify('可用现金或授权预算不足，请调整预算或恢复方案。');return false;}post(s,'incident',amount,-amount,note);i.authorizedSpent=(i.authorizedSpent??0)+amount;return true;};
    if(!i.evidence){i.evidence=true;event(s,'incident',i.title+'完成证据核查','按已授权方案核对独立记录。',i.id);}
    if(i.status==='active'){i.status='contained';i.response='isolate';}
    if(i.resolves===null&&i.response==='repair'){i.status='resolved';i.backupActive=false;s.stats.recovered++;event(s,'recovery',i.title+'按授权恢复','技术工作已实际完成，积压按原规则继续处理。',i.id);continue;}
    if(i.authorizationPaused)continue;
    if(i.authorization==='continuity'&&!i.backupActive&&i.resolves===null&&i.response!=='repair'){
      if(!pay(45000,'按授权启用备用资源'))continue;i.backupActive=true;i.response='backup';
    }
    if(i.resolves===null&&i.response!=='repair'&&technicians(s)>=1){
      if(!pay(30000,'按授权安排技术修复'))continue;
      i.response='repair';i.resolves=s.hour+(i.type==='system'?Math.max(4,18-s.digitalLevel*3):12);
      event(s,'incident',i.title+'进入技术修复','预计完成于第'+i.resolves+'小时；完成前仍受实际限制。',i.id);
    }
    if(i.backupActive&&((i.authorizedSpent??0)+1200>(i.authorizedBudget??0)||s.cash<1200)){i.backupActive=false;notify('备用预算不足以覆盖下一小时，请调整预算或等待修复。');}
  }
}
export function managementBaseline(s:EnterpriseState):ManagementBaseline{
  const delivered=emptyGoods();for(const l of s.lots)delivered[l.goods]+=l.completed;
  return {hour:s.hour,cash:s.cash,revenue:s.months.reduce((n,m)=>n+m.revenue,0),operating:s.months.reduce((n,m)=>n+m.operating,0),delivered,metrics:{...s.management.metrics},energy:s.stats.energy};
}
export function finishManagementWeek(s:EnterpriseState){
  const before=s.management.baseline,after=managementBaseline(s),delivered=emptyGoods(),backlog=emptyGoods();
  for(const k of kinds)delivered[k]=after.delivered[k]-before.delivered[k];
  const due=Object.fromEntries(kinds.map(k=>[k,{quantity:0,onTime:0}])) as Record<CargoKind,{quantity:number;onTime:number}>;
  for(const l of s.lots){backlog[l.goods]+=l.quantity-l.completed-l.lost;if(l.deadline>before.hour&&l.deadline<=s.hour){due[l.goods].quantity+=l.quantity;due[l.goods].onTime+=l.completed-l.lateUnits;}}
  const observed=Object.values(due).filter(d=>d.quantity>0),metrics=emptyManagementMetrics();
  for(const key of Object.keys(metrics) as Array<keyof ManagementMetrics>)metrics[key]=after.metrics[key]-before.metrics[key];
  s.management.reviews.push({startHour:before.hour,endHour:s.hour,cashChange:s.cash-before.cash,cashEnd:s.cash,revenue:after.revenue-before.revenue,operating:after.operating-before.operating,energy:after.energy-before.energy,delivered,backlog,fulfillment:observed.length?observed.reduce((n,d)=>n+d.onTime/d.quantity,0)/observed.length:null,metrics,changes:[...s.management.changes]});
  if(s.management.reviews.length>60)s.management.reviews.shift();
  s.management.baseline=after;s.management.changes=[];event(s,'review','本期经营简报已形成','观察交付、翻箱、能源与现金；前后时段的需求和事件也可能变化。');
}
export function managementMilestones(s:EnterpriseState){
  const checks=[['plan','规则已接管','提交一套经营规则',s.management.planCount>0],['week','第一份周报','实际运行一周并形成反馈',s.management.reviews.length>0],['yard','堆场设计师','配置堆场分区与货位策略',s.management.yardPlanCount>0],['shared','空间调剂','共享或动态区块承接了真实货物',s.management.metrics.sharedUnits>0],['delivery','服务已交付','六类业务都产生实际交付',kinds.every(k=>s.lots.some(l=>l.goods===k&&l.completed>0))],['technology','改造已投产','一项工程完成实际验收',s.projects.some(p=>p.status==='completed')],['resilience','恢复闭环','一项真实事件恢复运营',s.stats.recovered>0],['year','年度经营者','运行完整首年并形成月报',s.hour>=8760],['finish','长期经营完成','经营期末与未完成责任如实保留',s.hour===s.horizon]] as const;
  return checks.map(([id,title,description,earned])=>({id,title,description,earned}));
}
export function managementView(s:EnterpriseState){
  const blocks=yardOverview(s),latest=s.management.reviews.at(-1),prior=s.management.reviews.at(-2);
  return {...s.management,blocks:undefined,yardBlocks:blocks,baseline:undefined,milestones:managementMilestones(s),latestReview:latest??null,previousReview:prior??null,
    staffing:s.crews.map(c=>({id:c.id,role:c.role,count:c.count,shift:c.shift,training:c.trainingUntil>s.hour})),
    attention:s.incidents.filter(needsManagementAttention).map(i=>i.id)};
}
