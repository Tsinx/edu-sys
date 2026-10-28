import {hourLabel,type EnterpriseCommand,type EnterpriseRecord,type EnterpriseView} from '@edu/port-simulation-core';

export const ENTERPRISE_TEACHING_VERSION='port-enterprise-teaching/4' as const;
export const ENTERPRISE_TEACHING_END_HOUR=181*24;
export interface TeachingReceipt {hour:number;position:number;evidence:string[]}
export interface EnterpriseTeaching {
  schema:typeof ENTERPRISE_TEACHING_VERSION;active:boolean;selected:string;pausedAt?:number;
  answers:Record<string,string>;receipts:Record<string,TeachingReceipt>;
  actions:Record<string,number>;starts:Record<string,{position:number;hour:number}>;
}
export const newEnterpriseTeaching=():EnterpriseTeaching=>({schema:ENTERPRISE_TEACHING_VERSION,active:true,selected:'strategy',answers:{},receipts:{},actions:{},starts:{}});
export function restartEnterpriseTeaching(previous:EnterpriseTeaching,stepId:string,position:number):EnterpriseTeaching{
  const answers={...previous.answers};delete answers[stepId];
  return {...previous,selected:stepId,active:true,answers,actions:{[stepId]:0},starts:{},receipts:Object.fromEntries(Object.entries(previous.receipts).filter(([id,r])=>id!==stepId&&r.position<=position))};
}
export interface TeachingField {name:string;value:string;title:string}
export interface TeachingStep {
  id:string;month:number;chapter:string;title:string;tab:string;target:string;
  now:string;why:string;evidence:string[];complete:boolean;
  kind:'command'|'advance'|'observe'|'finish';expected?:EnterpriseCommand;
  fields?:TeachingField[];planHour?:number;drafts?:Record<string,string>;
}
export function enterpriseCommandMatches(actual:unknown,expected:unknown):boolean{
  if(expected===null||typeof expected!=='object')return actual===expected;
  if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
  const a=actual as Record<string,unknown>,e=expected as Record<string,unknown>;
  return Object.keys(a).length===Object.keys(e).length&&Object.entries(e).every(([k,v])=>Object.hasOwn(a,k)&&enterpriseCommandMatches(a[k],v));
}
export function tutorialContract(v:EnterpriseView){
  const base={container:420,bulk:1300,liquid:1450,general:210,roro:130,passenger:320};
  return v.contracts.filter(c=>!c.accepted&&c.startHour>=90*24&&c.expires>=v.hour).sort((a,b)=>a.volume/base[a.goods]-b.volume/base[b.goods]||a.id.localeCompare(b.id))[0];
}
export function enterpriseTeachingSteps(v:EnterpriseView,record:EnterpriseRecord|undefined,learning:EnterpriseTeaching):TeachingStep[]{
  const commands=record?.commands??[],steps:TeachingStep[]=[];
  const ok=(id:string,expected:EnterpriseCommand)=>v.journal.some(j=>j.index>=(learning.starts[id]?.position??0)&&j.ok&&enterpriseCommandMatches(commands[j.index],expected));
  const receipt=(id:string)=>{const r=learning.receipts[id];return !!r&&r.position<=commands.length;};
  const add=(s:TeachingStep)=>{s.complete||=receipt(s.id);steps.push(s);};
  const chapter=(m:number)=>['','一月 · 接管港口','二月 · 安排资源','三月 · 设备与补能','四月 · 技术与客户','五月 · 投资与履约','六月 · 改造与交接'][m]!;
  const command=(id:string,month:number,title:string,tab:string,target:string,expected:EnterpriseCommand,now:string,why:string,fields?:TeachingField[],drafts?:Record<string,string>)=>add({id,month,chapter:chapter(month),title,tab,target,kind:'command',expected,now,why,fields,drafts,complete:ok(id,expected),evidence:ok(id,expected)?[v.journal.filter(j=>j.ok&&enterpriseCommandMatches(commands[j.index],expected)).at(-1)?.message??'管理决定已真实执行']:[]});
  const wait=(id:string,month:number,title:string,hour:number,why:string)=>add({id,month,chapter:chapter(month),title,tab:'overview',target:'tour-advance',kind:'advance',planHour:Math.min(ENTERPRISE_TEACHING_END_HOUR,hour),now:'点击时间按钮，让港口按已批准的规则经营。',why,complete:v.hour>=hour,evidence:['已经营至'+hourLabel(v.hour)]});
  const observe=(id:string,month:number,title:string,tab:string,target:string,now:string,why:string,evidence:string[],drafts?:Record<string,string>)=>add({id,month,chapter:chapter(month),title,tab,target,kind:'observe',now,why,evidence,drafts,complete:receipt(id)});
  command('strategy',1,'接管第一周的经营','management','goal-balanced',{kind:'management-plan',patch:{goal:'balanced'}},'点亮“稳健经营”，把常规业务交给运行规则。','靠泊、单证与补给会自动执行；你管理规则和资源。');
  wait('first-week',1,'让港口经营第一周',168,'先运行一周，再用真实交付判断港口是否运转。');
  const week=v.management.reviews.find(r=>r.endHour===168)??v.management.latestReview;
  observe('first-delivery',1,'领取第一周经营反馈','review','review-container','点击集装箱交付数，看看这一周的真实成果。','TEU、吨、立方米、辆和人各按自己的单位比较。',['首周集装箱交付 '+(week?.delivered.container??0)+' TEU']);
  command('yard-zones',1,'给堆场留出共享缓冲','yard','yard-zones-T1',{kind:'yard-plan',terminalId:'T1',patch:{importShare:50,sharedShare:20,maxTiers:3}},'进口50%、共享20%、最高3层；按亮起的字段逐项设置。','出口使用剩余30%；留出的共享空间要配合分配规则才能接货。',[{name:'importShare',value:'50',title:'进口区保持50%'},{name:'sharedShare',value:'20',title:'把共享区改为20%'},{name:'maxTiers',value:'3',title:'把后续入场堆高改为3层'}],{'yard-terminal':'T1'});
  command('yard-class',1,'让相近周转的箱子放在一起','yard','yard-class-turnover',{kind:'yard-plan',terminalId:'T1',patch:{classification:'turnover'}},'点击“按预计周转 ABC”。','这里按预计周转分类：A为24小时内、B为48小时内，其余为C。',undefined,{'yard-terminal':'T1'});
  command('yard-dynamic',1,'允许货位在全场调剂','yard','yard-allocation-dynamic',{kind:'yard-plan',terminalId:'T1',patch:{allocation:'dynamic'}},'点击“动态货位”。','ABC决定怎样分组，动态分配决定允许放在哪里；两者可以组合。',undefined,{'yard-terminal':'T1'});
  wait('month-one',1,'经营到一月结算',31*24,'资金会经历收入确认、回款和费用支付，月末再看完整收支。');
  observe('finance-january',1,'核对第一份月报','finance','finance-summary-2027-01','点击“一月收支”，查看钱怎样进出港口。','收入已经确认时，货款可能还在路上；现金不是净利润。',['一月月报已实际形成']);
  command('electric-order',2,'为轮充增加一台电动车','assets','asset-order',{kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'},'选电动集卡，送到T1并购置。','这笔105万元订单需要35日交付；付款后不会立即增加车辆。',[{name:'model',value:'electric-tractor',title:'选择电动集卡'},{name:'terminal',value:'T1',title:'接收作业区选T1'},{name:'ownership',value:'owned',title:'选择购置'}],{'assets-terminal':'T1','assets-filter':'all','assets-catalog-stage':'all','assets-focus':''});
  command('digital-build',2,'启动信息协同改造','technology','build-port-community',{kind:'project',type:'port-community',terminalId:'T1'},'点击启动信息协同项目，投入400万元。','工程要建设60日；投产后才会改善回执等待和周转估计。');
  command('staff-template',2,'安排全天三班覆盖','staff','staff-plan-balanced',{kind:'staff-plan',template:'balanced'},'点击“三班均衡”。','只重新分配现有人员；培训和技能条件继续保留。');
  command('maintenance',2,'把常规维护安排到夜间','management','management-detail',{kind:'management-plan',patch:{maintenance:'offpeak',escalation:'major'}},'将维护改为“优先夜间”，保存规则。','紧急故障仍要立即处理；夜间维护也会占用技术人员。',[{name:'maintenance',value:'offpeak',title:'选择优先夜间维护'},{name:'escalation',value:'major',title:'重大事件继续由你授权'}]);
  wait('month-two',2,'经营到三月',59*24,'车辆和工程仍按真实工期推进，人员和维护规则持续执行。');
  const order=v.journal.find(j=>j.ok&&commands[j.index]?.kind==='order-asset'&&enterpriseCommandMatches(commands[j.index],{kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'}));
  const electric=v.assets.find(a=>a.id===order?.message.split('：').at(-1));
  wait('vehicle-ready',3,'等待新车实际交付',(electric?.readyHour??66*24)+1,'等交期结束，再核对新车是否具备投运条件。');
  observe('vehicle-accept',3,'验收刚到的电动车','assets','asset-'+(electric?.id??'pending'),'点击新车的设备卡，核对状态。','车辆到货还需要供电、岗位与补能安排，额定能力不是全港能力。',electric?[electric.id+' · '+electric.note]:[],{'assets-terminal':'T1','assets-filter':'all','assets-catalog-stage':'all','assets-focus':electric?.id??''});
  command('charging',3,'安排两台车错峰轮充','energy','charging-plan',{kind:'management-plan',patch:{charging:'staggered'}},'选择“错峰轮充”，应用补能计划。','保留可用车，再让其他车补能；低电量车辆仍可随时补能。',[{name:'charging',value:'staggered',title:'把补能方式改为错峰轮充'}]);
  const digital=v.projects.find(p=>p.type==='port-community'&&p.terminalId==='T1');
  wait('digital-ready',3,'经营至协同平台验收',(digital?.completes??91*24)+1,'信息协同只有在实际验收后才改变运行条件。');
  observe('digital-accept',4,'查看信息协同的投产成果','technology','inspect-port-community','点击“查看投产成果”。','信息等级提高会改善回执和估计条件，不会凭空增加场桥和车辆。',['当前信息等级 '+v.digitalLevel]);
  command('service-goal',4,'为客户责任调整经营重点','management','goal-service',{kind:'management-plan',patch:{goal:'service'}},'点击“履约优先”。','先按承诺期限安排业务，并保留更多可用电动车。');
  const acceptedCommand=v.journal.find(j=>j.ok&&j.kind==='accept-contract'&&j.index>=(learning.starts.contract?.position??0));
  const accepted=acceptedCommand?commands[acceptedCommand.index]:undefined;
  const contract=accepted?.kind==='accept-contract'?v.contracts.find(c=>c.id===accepted.contractId):tutorialContract(v);
  command('contract',4,'承接一项季度服务协议','market','contract-'+(contract?.id??'pending'),{kind:'accept-contract',contractId:contract?.id??''},'点击亮起的协议，承接相对基础业务量较小的一项增量。','合同增加未来工作量和违约责任；收入仍按真实交付确认。');
  wait('month-four',4,'经营到五月',120*24,'让新设备、运行规则与合同一起接受实际业务检验。');
  observe('contract-review',5,'检查合同有没有真正交付','market','contract-status-'+(contract?.id??'pending'),'点击协议的履约进度。','承接合同不等于已经挣到合同金额，要核对承诺量与实际交付。',contract?['已承诺 '+contract.promised+'；已交付 '+contract.shipped]:[]);
  command('road-build',5,'改造港区运输流线','technology','build-road-upgrade',{kind:'project',type:'road-upgrade',terminalId:'T1'},'启动T1道路与流线改造，投入500万元。','45日施工期间运输和库场会受影响；验收后才缩短运输距离。');
  const road=v.projects.find(p=>p.type==='road-upgrade'&&p.terminalId==='T1');
  wait('road-ready',5,'让道路改造走完实际工期',(road?.completes??165*24)+1,'建设成本和施工影响持续保留，不能用点击代替工期。');
  observe('road-accept',6,'验收流线改造','technology','inspect-road-upgrade','点击“查看投产成果”。','道路改造缩短了运输距离；堆场、人员和充电仍可能成为约束。',['T1距离系数 '+(v.terminals.find(t=>t.id==='T1')?.distance??0).toFixed(2)]);
  wait('half-year',6,'经营到前半年结束',ENTERPRISE_TEACHING_END_HOUR,'把前半年所有决定留在同一个港口里，继续观察实际成果。');
  observe('finance-june',6,'核对六月收支并准备交接','finance','finance-summary-2027-06','点击“六月收支”，核对半年的经营结果。','没有完成的货物、应收、借款和建设责任会交给后续经营。',['已形成 '+v.months.length+'期月报']);
  add({id:'graduate',month:6,chapter:chapter(6),title:'前半年带教完成',tab:'overview',target:'tour-graduate',kind:'finish',now:'你可以接管余下经营了。',why:'规则、堆场、班表、补能、投资、合同与异常都已经亲手管理过。',complete:receipt('graduate'),evidence:['已经营 '+Math.floor(v.hour/24)+'日；原港口继续保留']});
  return steps;
}
export function currentTeachingStep(v:EnterpriseView,record:EnterpriseRecord|undefined,p:EnterpriseTeaching){const steps=enterpriseTeachingSteps(v,record,p);return steps.find(s=>s.id===p.selected)??steps.find(s=>!s.complete)??steps.at(-1)!;}
export function enterpriseIncidentLesson(v:EnterpriseView){
  const incident=v.incidents.find(i=>v.management.attention.includes(i.id));if(!incident)return undefined;
  const plan=['power','system'].includes(incident.type)?'continuity' as const:'repair' as const;
  return {incident,tab:'emergency',target:'incident-plan-'+incident.id,expected:{kind:'incident-plan',incidentId:incident.id,plan,budget:120000} as EnterpriseCommand,
    fields:[{name:'plan',value:plan,title:plan==='continuity'?'选择连续性优先，备用与修复并行':'选择控制后修复'},{name:'budget',value:'120000',title:'将累计处置上限设为120000元'}],
    title:incident.title,now:'为这起异常选择处置方案和预算。',why:plan==='continuity'?'备用与技术修复分别计费，实际技术完成后再恢复。':'先控制影响再修复，系统按技术人员与工期恢复。'};
}
export function teachingAllowsCommand(v:EnterpriseView,record:EnterpriseRecord|undefined,p:EnterpriseTeaching,c:EnterpriseCommand){
  const incident=enterpriseIncidentLesson(v);if(incident)return enterpriseCommandMatches(c,incident.expected);
  const step=currentTeachingStep(v,record,p);
  if(step.complete)return false;
  if(step.kind==='advance')return c.kind==='advance'&&c.stopOnIncident===true&&c.hours===Math.min(24*93,Math.max(0,(step.planHour??0)-v.hour),v.horizon-v.hour);
  return !!step.expected&&enterpriseCommandMatches(c,step.expected);
}
