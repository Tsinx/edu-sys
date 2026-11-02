import {GUIDED_FINANCE_PLAN,hourLabel,incidentBudget,type EnterpriseCommand,type EnterpriseRecord,type EnterpriseView} from '@edu/port-simulation-core';

export const ENTERPRISE_TEACHING_VERSION='port-enterprise-teaching/7' as const;
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
  kind:'command'|'advance'|'observe'|'finish';expected?:EnterpriseCommand;alternatives?:EnterpriseCommand[];
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
  const command=(id:string,month:number,title:string,tab:string,target:string,expected:EnterpriseCommand,now:string,why:string,fields?:TeachingField[],drafts?:Record<string,string>,alternatives?:EnterpriseCommand[])=>{const valid=[expected,...alternatives??[]],complete=valid.some(c=>ok(id,c));add({id,month,chapter:chapter(month),title,tab,target,kind:'command',expected,alternatives,now,why,fields,drafts,complete,evidence:complete?[v.journal.filter(j=>j.ok&&valid.some(c=>enterpriseCommandMatches(commands[j.index],c))).at(-1)?.message??'管理决定已真实执行']:[]});};
  const wait=(id:string,month:number,title:string,hour:number,why:string)=>add({id,month,chapter:chapter(month),title,tab:'overview',target:'tour-advance',kind:'advance',planHour:Math.min(ENTERPRISE_TEACHING_END_HOUR,hour),now:'点击时间按钮，让港口按已批准的规则经营。',why,complete:v.hour>=hour,evidence:['已经营至'+hourLabel(v.hour)]});
  const observe=(id:string,month:number,title:string,tab:string,target:string,now:string,why:string,evidence:string[],drafts?:Record<string,string>)=>add({id,month,chapter:chapter(month),title,tab,target,kind:'observe',now,why,evidence,drafts,complete:receipt(id)});
  command('strategy',1,'接管第一周的经营','management','goal-balanced',{kind:'management-plan',patch:{goal:'balanced'}},'点亮“稳健经营”，把常规业务交给运行规则。','经营方针改变优先级和资源排序，资金保障由固定资金方案统一管理。');
  observe('director-calendar',1,'核对总经理的每月现场日','director','director-calendar-check','点击日历中的8日，确认本月现场安排。','日常快进、每月现场日和重大异常共用同一个港口；现场日自动放慢。',['每月8日观察24小时，前半年资金方式继续固定']);
  command('finance-policy',1,'固定前半年的资金安排','finance','finance-policy',{kind:'finance-plan',patch:{...GUIDED_FINANCE_PLAN}},'确认30日现金保障、30日定存和500万元周转授信。','前半年资金规则固定，借款资金不增加计息自有资金；到期付款自动处理。',[{name:'reserveDays',value:'30',title:'现金保障固定30日'},{name:'depositDays',value:'30',title:'闲置自有资金固定30日定存'},{name:'creditLimit',value:'5000000',title:'自动授信上限固定500万元'}]);
  observe('loan-schedule',1,'认识每一期还本和付息','finance','finance-loan-check','点击核对贷款还款表。','初始借款分36期还本，利息按真实占用时间计提；本金偿付不是费用。',['已查看初始贷款的真实还款计划']);
  wait('first-week',1,'让港口经营第一周',168,'先运行一周，再用真实交付判断港口是否运转。');
  observe('first-site',1,'抵达第一个现场观察日','overview','director-site-inspect','点击“查看现场”，核对岸桥与泊位。','人手少于设备数时先保障正在装卸的泊位，剩余岗位再按工作量分配。',['当前管理状态 '+(v.director.scheduled?'每月现场观察日':'日常简报')]);
  observe('scene-load',1,'在港口里找出设备压力','overview','scene-load','点击“设备负荷”，让实际作业数据映射到设备。','高负荷需要结合等待与缺人判断，停机用独立标记，无样本不会冒充低负荷。',['查看过去24小时的真实作业时长占比']);
  const week=v.management.reviews.find(r=>r.endHour===168)??v.management.latestReview;
  observe('first-delivery',1,'领取第一周经营反馈','review','review-container','点击集装箱交付数，看看这一周的真实成果。','TEU、吨、立方米、辆和人各按自己的单位比较。',['首周集装箱交付 '+(week?.delivered.container??0)+' TEU']);
  observe('capacity',1,'先找值得核对的瓶颈','resources','capacity-T1','点击T1，查看四个环节的能力。','先找约束，再决定是否投资；名义能力还要核对班次、供电和实际积压。',['已查看T1能力核对板']);
  observe('crane-allocation',1,'读懂岸桥的基础保障与追加岗位','cranes','crane-current-check','点击核对实际岸桥分配。','待命、缺少合格人员和没有可执行装卸工作是不同原因，不能把所有闲置都当作浪费。',['先覆盖具备条件的泊位，再按剩余标准作业小时追加']);
  command('road-policy',1,'给公路接续选择保障','logistics','road-policy-T1',{kind:'logistics-plan',terminalId:'T1',patch:{road:'reserved'}},'比较费用和容量，选择一个档位，再发布。','按需减少固定费用；预约与增援提供更多通行容量，但不会创造设备能力。',undefined,{'logistics-terminal':'T1'},(['basic','reserved','surge'] as const).map(road=>({kind:'logistics-plan',terminalId:'T1',patch:{road}})));
  command('yard-zones',1,'给堆场留出共享缓冲','yard','yard-zones-T1',{kind:'yard-plan',terminalId:'T1',patch:{importShare:50,sharedShare:20,maxTiers:3}},'进口50%、共享20%、最高3层；按亮起的字段逐项设置。','出口使用剩余30%；留出的共享空间要配合分配规则才能接货。',[{name:'importShare',value:'50',title:'进口区保持50%'},{name:'sharedShare',value:'20',title:'把共享区改为20%'},{name:'maxTiers',value:'3',title:'把后续入场堆高改为3层'}],{'yard-terminal':'T1'});
  command('yard-class',1,'让相近周转的箱子放在一起','yard','yard-class-turnover',{kind:'yard-plan',terminalId:'T1',patch:{classification:'turnover'}},'点击“按预计周转 ABC”。','这里按预计周转分类：A为24小时内、B为48小时内，其余为C。',undefined,{'yard-terminal':'T1'});
  command('yard-dynamic',1,'允许货位在全场调剂','yard','yard-allocation-dynamic',{kind:'yard-plan',terminalId:'T1',patch:{allocation:'dynamic'}},'点击“动态货位”。','ABC决定怎样分组，动态分配决定允许放在哪里；两者可以组合。',undefined,{'yard-terminal':'T1'});
  wait('month-one',1,'经营到一月结算',31*24,'资金会经历收入确认、回款和费用支付，月末再看完整收支。');
  observe('finance-january',1,'核对第一份月报','finance','finance-summary-2027-01','点击“一月收支”，查看钱怎样进出港口。','收入已经确认时，货款可能还在路上；现金不是净利润。',['一月月报已实际形成']);
  observe('daily-trends',2,'从报告菜单打开日结折线','trends','trends-live-check','点击定位最新日结，核对趋势上的真实日期。','折线图只在需要时打开。无到期或离港样本的日期保留空缺，时间相邻的变化不自动等于因果。',['已形成 '+v.telemetry.days.length+'个真实日结点']);
  observe('interest-receipt',2,'核对闲置资金实际挣了多少利息','finance','finance-interest','点击查看已取得的存款利息。','存款本金不是收益，提前取回的未入账利息不会到账。',['已到账利息 '+(v.finance.depositInterest+v.finance.demandInterest)+'元']);
  observe('finance-forecast',2,'看清未来90日的付款压力','finance','finance-forecast','点击查看90日现金预测。','保守预测只计已确认回款，借款到期、费用和存款到期分别计算。',['已查看三段资金预测']);
  command('electric-order',2,'为轮充增加一台电动车','assets','asset-order',{kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'},'选电动集卡，送到T1并购置。','这笔105万元订单需要35日交付；付款后不会立即增加车辆。',[{name:'model',value:'electric-tractor',title:'选择电动集卡'},{name:'terminal',value:'T1',title:'接收作业区选T1'},{name:'ownership',value:'owned',title:'选择购置'}],{'assets-terminal':'T1','assets-filter':'all','assets-catalog-stage':'all','assets-focus':''});
  command('digital-build',2,'启动信息协同改造','technology','build-port-community',{kind:'project',type:'port-community',terminalId:'T1'},'点击启动信息协同项目，投入400万元。','工程要建设60日；投产后才会改善回执等待和周转估计。');
  command('standing-rules',2,'把日常中断和补给交给规则','management','standing-policy',{kind:'management-plan',patch:{routineResponse:'repair',routineBudget:120000,fuelDays:7,partsTarget:12}},'核对自动修复、12万元上限、7日燃料和12份备件，再发布。','普通事件按授权处理，严重事件和超限仍报批；补给占用真实现金。',[{name:'routineResponse',value:'repair',title:'普通中断选择自动修复'},{name:'routineBudget',value:'120000',title:'授权上限设为120000元'},{name:'fuelDays',value:'7',title:'保留7日燃料保障'},{name:'partsTarget',value:'12',title:'备件目标12份'}]);
  command('staff-template',2,'选择适合业务的班表','staff','staff-template-choice',{kind:'staff-plan',template:'balanced'},'选择三班均衡、日班加强或后备保障，再发布。','日班加强可减少夜班溢价；后备会按实际缺口补位，每人每日最多8小时。',undefined,undefined,(['balanced','day-heavy','reserve'] as const).map(template=>({kind:'staff-plan',template})));
  command('maintenance',2,'把常规维护安排到夜间','management','management-detail',{kind:'management-plan',patch:{maintenance:'offpeak',escalation:'major'}},'将维护改为“优先夜间”，保存规则。','紧急故障仍要立即处理；夜间维护也会占用技术人员。',[{name:'maintenance',value:'offpeak',title:'选择优先夜间维护'},{name:'escalation',value:'major',title:'重大事件继续由你授权'}]);
  wait('month-two',2,'经营到三月',59*24,'车辆和工程仍按真实工期推进，人员和维护规则持续执行。');
  const order=v.journal.find(j=>j.ok&&commands[j.index]?.kind==='order-asset'&&enterpriseCommandMatches(commands[j.index],{kind:'order-asset',model:'electric-tractor',terminalId:'T1',ownership:'owned'}));
  const electric=v.assets.find(a=>a.id===order?.message.split('：').at(-1));
  wait('vehicle-ready',3,'等待新车实际交付',(electric?.readyHour??66*24)+1,'等交期结束，再核对新车是否具备投运条件。');
  observe('vehicle-accept',3,'验收刚到的电动车','assets','asset-'+(electric?.id??'pending'),'点击新车的设备卡，核对状态。','车辆到货还需要供电、岗位与补能安排，额定能力不是全港能力。',electric?[electric.id+' · '+electric.note]:[],{'assets-terminal':'T1','assets-filter':'all','assets-catalog-stage':'all','assets-focus':electric?.id??''});
  command('charging',3,'给两台车制定补能计划','energy','charging-plan',{kind:'management-plan',patch:{charging:'staggered'}},'选择低电量、错峰或谷时优先，再发布补能计划。','夜间电价更低；错峰更灵活；低电量补能优先保留当前作业。结果受车数和共享供电影响。',undefined,undefined,(['threshold','staggered','offpeak'] as const).map(charging=>({kind:'management-plan',patch:{charging}})));
  const digital=v.projects.find(p=>p.type==='port-community'&&p.terminalId==='T1');
  wait('digital-ready',3,'经营至协同平台验收',(digital?.completes??91*24)+1,'信息协同只有在实际验收后才改变运行条件。');
  observe('digital-accept',4,'查看信息协同的投产成果','technology','inspect-port-community','点击“查看投产成果”。','信息等级提高会改善回执和估计条件，不会凭空增加场桥和车辆。',['当前信息等级 '+v.digitalLevel]);
  command('service-goal',4,'为客户责任调整经营重点','management','goal-service',{kind:'management-plan',patch:{goal:'service'}},'点击“履约优先”。','优先保障合同资源；不改写固定资金方案和已经发布的补能规则。');
  command('pricing',4,'为下一阶段选择报价','market','pricing',{kind:'policy',patch:{tariff:1}},'选择一个报价并发布；下个月再核对业务与收入。','高价会流失价格敏感货源，低价会增加产能压力。已经公布的价格不会改写。',undefined,undefined,Array.from({length:17},(_,i)=>({kind:'policy',patch:{tariff:Number((.7+i*.05).toFixed(2))}})));
  const acceptedCommand=v.journal.find(j=>j.ok&&j.kind==='accept-contract'&&j.index>=(learning.starts.contract?.position??0));
  const accepted=acceptedCommand?commands[acceptedCommand.index]:undefined;
  const contract=accepted?.kind==='accept-contract'?v.contracts.find(c=>c.id===accepted.contractId):tutorialContract(v);
  command('contract',4,'承接一项季度服务协议','market','contract-'+(contract?.id??'pending'),{kind:'accept-contract',contractId:contract?.id??''},'点击亮起的协议，承接相对基础业务量较小的一项增量。','合同增加未来工作量和违约责任；收入仍按真实交付确认。');
  command('investment-choice',4,'决定本期优先改造什么','technology','investment-choice',{kind:'project',type:'road-upgrade',terminalId:'T1'},'选择流线改造或库场扩容，再批准开工。','流线解决运输距离，扩容增加空间；都要付费、施工，并接受真实业务检验。',undefined,undefined,[{kind:'project',type:'yard-extension',terminalId:'T1'}]);
  wait('month-four',4,'经营到五月',120*24,'让新设备、运行规则与合同一起接受实际业务检验。');
  observe('contract-review',5,'检查合同有没有真正交付','market','contract-status-'+(contract?.id??'pending'),'点击协议的履约进度。','承接合同不等于已经挣到合同金额，要核对承诺量与实际交付。',contract?['已承诺 '+contract.promised+'；已交付 '+contract.shipped]:[]);
  command('routing-choice',5,'把集疏运分配交给策略','logistics','routing-policy-T2',{kind:'logistics-plan',terminalId:'T2',patch:{routing:'balanced'}},'T2已有铁路，选择一条分流规则，再发布。','公路灵活但单价较高；铁路和驳船按固定窗口发运。新规则只影响后续货批。',undefined,{'logistics-terminal':'T2'},(['road','balanced','rail-first','barge-first'] as const).map(routing=>({kind:'logistics-plan',terminalId:'T2',patch:{routing}})));
  const investment=v.projects.find(p=>['road-upgrade','yard-extension'].includes(p.type)&&p.terminalId==='T1');
  wait('road-ready',5,'让所选改造走完工期',(investment?.completes??166*24)+1,'所选项目按自己的工期完成；建设影响和资金支出持续保留。');
  observe('road-accept',6,'验收所选改造并判断收益','technology','inspect-investment','点击核对本期改造成果。','投产不等于已经回本。把能力变化与周报中的交付、翻箱、费用一起看。',['T1距离系数 '+(v.terminals.find(t=>t.id==='T1')?.distance??0).toFixed(2)+'；库场 '+(v.terminals.find(t=>t.id==='T1')?.storageCapacity??0)+' TEU']);
  wait('half-year',6,'经营到前半年结束',ENTERPRISE_TEACHING_END_HOUR,'把前半年所有决定留在同一个港口里，继续观察实际成果。');
  observe('finance-june',6,'核对六月收支并准备交接','finance','finance-summary-2027-06','点击“六月收支”，核对半年的经营结果。','没有完成的货物、应收、借款和建设责任会交给后续经营。',['已形成 '+v.months.length+'期月报']);
  observe('finance-handover',6,'接管半年的存款和贷款责任','finance','finance-handover','查看接管后的资金规则，再回到港口。','原有存款、到期计划和欠款不会清零；半年后可以调整规则，也可能因持续付款失败而破产。',['资金锁定已结束；未偿本金 '+v.debt+'元']);
  add({id:'graduate',month:6,chapter:chapter(6),title:'前半年带教完成',tab:'overview',target:'tour-graduate',kind:'finish',now:'你可以接管余下经营了。',why:'规则、堆场、班表、补能、投资、合同与异常都已经亲手管理过。',complete:receipt('graduate'),evidence:['已经营 '+Math.floor(v.hour/24)+'日；原港口继续保留']});
  return steps;
}
export function currentTeachingStep(v:EnterpriseView,record:EnterpriseRecord|undefined,p:EnterpriseTeaching){const steps=enterpriseTeachingSteps(v,record,p);return steps.find(s=>s.id===p.selected)??steps.find(s=>!s.complete)??steps.at(-1)!;}
export function enterpriseIncidentLesson(v:EnterpriseView){
  const incident=v.incidents.find(i=>v.management.attention.includes(i.id));if(!incident)return undefined;
  const plan=['power','system'].includes(incident.type)?'continuity' as const:'repair' as const,budget=incidentBudget(v,incident,plan);
  return {incident,tab:'emergency',target:'incident-plan-'+incident.id,expected:{kind:'incident-plan',incidentId:incident.id,plan,budget} as EnterpriseCommand,
    fields:[{name:'plan',value:plan,title:plan==='continuity'?'选择连续性优先，备用与修复并行':'选择控制后修复'},{name:'budget',value:String(budget),title:'按已知修复和备用费用，授权'+budget+'元上限'}],
    title:incident.title,now:'为这起异常选择处置方案和预算。',why:plan==='continuity'?'备用与技术修复分别计费，实际技术完成后再恢复。':'先控制影响再修复，系统按技术人员与工期恢复。'};
}
export function teachingAllowsCommand(v:EnterpriseView,record:EnterpriseRecord|undefined,p:EnterpriseTeaching,c:EnterpriseCommand){
  const incident=enterpriseIncidentLesson(v);if(incident)return enterpriseCommandMatches(c,incident.expected);
  const step=currentTeachingStep(v,record,p);
  if(step.complete)return false;
  if(step.kind==='advance'){if(c.kind!=='advance'||c.stopOnIncident!==true)return false;const remain=Math.max(0,(step.planHour??0)-v.hour);return c.hours===Math.min(c.stopAtVisit?(v.director.mode==='briefing'?24:1):24*93,remain,v.horizon-v.hour,c.stopAtVisit?v.director.boundary-v.hour:Infinity);}
  return !!step.expected&&[step.expected,...step.alternatives??[]].some(expected=>enterpriseCommandMatches(c,expected));
}
