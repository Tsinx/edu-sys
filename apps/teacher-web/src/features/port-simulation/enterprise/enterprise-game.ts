import { assetSpec, hourDate, hourLabel, type EnterpriseCommand, type EnterpriseView } from '@edu/port-simulation-core';

export const ENTERPRISE_WORKSPACES = [
  {id:'management',label:'经营方针',group:'日常管理',description:'选择目标、日常授权、维护与异常升级规则'},
  {id:'yard',label:'堆场规划',group:'日常管理',description:'进口出口分区、ABC分类、共享与动态货位'},
  {id:'review',label:'经营周报与收获',group:'统计与记录',description:'交付、成本、翻箱、同条件试验与经营足迹'},
  {id:'technology',label:'技术与升级',group:'资源与投资',description:'信息协同、自动化、电动化与实际投资回报'},
  {id:'ships',label:'船舶与单证',group:'生产与接续',description:'船期、泊位计划与独立业务回执'},
  {id:'dispatch',label:'生产调度',group:'生产与接续',description:'靠泊、优先级与日常运行授权'},
  {id:'cargo',label:'货物与库场',group:'生产与接续',description:'库存、监管状态与逐批运输路径'},
  {id:'logistics',label:'集疏运计划',group:'生产与接续',description:'公路限额、铁路与驳船窗口'},
  {id:'assets',label:'设备与采购',group:'资源与投资',description:'选型、购租、交期、投运、维修与调拨'},
  {id:'projects',label:'港区建设',group:'资源与投资',description:'扩建、供电、自动化与配套工期'},
  {id:'staff',label:'人员与排班',group:'资源与投资',description:'班次覆盖、招聘、技能培训与人员安排'},
  {id:'energy',label:'能源与环境',group:'资源与投资',description:'供电、岸电、排放与风险保障'},
  {id:'digital',label:'数字协同',group:'资源与投资',description:'接口、资料协同与共享条件'},
  {id:'market',label:'客户与合同',group:'经营与保障',description:'报价、季度机会与履约责任'},
  {id:'finance',label:'财务与资金',group:'经营与保障',description:'现金、借款、投资、利润与月报'},
  {id:'emergency',label:'风险与恢复',group:'经营与保障',description:'核查、隔离、备用、修复与恢复确认'},
  {id:'analysis',label:'经营统计',group:'统计与记录',description:'分货种绩效、约束与同条件对照'},
  {id:'journal',label:'决策复盘',group:'统计与记录',description:'经营、投资、调度与年度决策说明'},
  {id:'storage',label:'存档与回放',group:'统计与记录',description:'本机保存、练习分支、导入导出与检查点'},
  {id:'tasks',label:'任务与提交',group:'统计与记录',description:'个人任务领取、封存和主动提交'},
  {id:'handbook',label:'经营手册',group:'统计与记录',description:'设备参数、模型规则与统计口径'},
  {id:'learning',label:'教练与训练',group:'统计与记录',description:'从经营规则开始，逐步读懂港口与长期决策'},
] as const;
export const ENTERPRISE_MAIN_WORKSPACES=new Set(['management','yard','staff','energy','technology','market','review','storage','learning','tasks']);
export type EnterpriseWorkspace = typeof ENTERPRISE_WORKSPACES[number]['id'];
export const ENTERPRISE_COMMAND_LABELS:Record<EnterpriseCommand['kind'],string>={advance:'推进经营',policy:'生产规则','management-plan':'经营方针','yard-plan':'堆场规则','staff-plan':'应用班表','incident-plan':'授权处置','order-asset':'设备订购','assign-asset':'设备调拨',maintain:'设备检修',dispose:'设备退出',project:'工程开工',hire:'人员招聘',staff:'班次调整',train:'技能培训','release-staff':'人员退出',berth:'泊位计划',document:'资料核对',inspect:'货批核查',route:'接续路径','accept-contract':'承接合同',respond:'现场处置',loan:'取得借款',repay:'偿还本金',supplies:'采购补给',governance:'经营协议',note:'个人复盘',seal:'封存记录'};
export function workspaceLabel(id: string) { return ENTERPRISE_WORKSPACES.find(w=>w.id===id)?.label ?? '港口现场'; }

/** Only published plans are used. This is an observation point, not a forecast of hidden arrivals. */
export function nextEnterpriseObservation(v: EnterpriseView) {
  const candidates: Array<{hour:number;label:string}> = [];
  const add=(hour:number,label:string)=>{if(Number.isFinite(hour)&&hour>v.hour)candidates.push({hour:Math.ceil(hour),label});};
  for(const c of v.calls){if(c.stage==='announced')add(c.eta,c.name+'预计到港');if(c.moveUntil>v.hour)add(c.moveUntil,c.name+'通行节点');for(const d of Object.values(c.documents))if(d.status==='submitted')add(d.readyHour+1,c.name+'回执核对');}
  for(const a of v.assets){if(a.status==='ordered')add(a.readyHour+1,'设备交付验收');if(a.repairUntil!==null)add(a.repairUntil+1,'设备检修验收');}
  for(const p of v.projects)if(p.status==='building')add(p.completes+1,'建设项目验收');
  for(const c of v.crews)if(c.trainingUntil>v.hour)add(c.trainingUntil+1,'班组培训验收');
  for(const i of v.incidents)if(i.resolves!==null)add(i.resolves+1,'技术修复验收');
  const d=hourDate(v.hour);add(v.hour+(24-d.getUTCHours()),'生产日复核');
  const target=candidates.sort((a,b)=>a.hour-b.hour)[0]??{hour:v.hour+8,label:'下一班次复核'};
  return {...target,hour:Math.min(v.horizon,target.hour),hours:Math.max(0,Math.min(v.horizon,target.hour)-v.hour)};
}

export function berthCompatibility(v: EnterpriseView, callId: string, terminalId: string) {
  const c=v.calls.find(c=>c.id===callId),t=v.terminals.find(t=>t.id===terminalId);
  if(!c||!t)return '对象已不在当前现场';
  if(c.goods!==t.goods)return '货种不匹配';
  if(c.length>t.length)return '岸线长度不足';
  if(c.draft>t.depth)return '水深不足';
  if(!t.enabled)return '作业区未开放';
  return null;
}

export interface EnterpriseDecisionFeedback { title:string;message:string;changes:string[];workspace:EnterpriseWorkspace; }
export function enterpriseDecisionFeedback(before: EnterpriseView, after: EnterpriseView, command: EnterpriseCommand): EnterpriseDecisionFeedback | null {
  if(command.kind==='advance'||!after.result?.ok)return null;
  const money=(n:number)=>(n/10000).toLocaleString('zh-CN',{maximumFractionDigits:2})+'万元';
  const changes:string[]=[];
  if(Math.abs(after.cash-before.cash)>.005)changes.push('现金 '+money(before.cash)+' → '+money(after.cash)+'（'+(after.cash<before.cash?'减少':'增加')+money(Math.abs(after.cash-before.cash))+'）');
  if(after.debt!==before.debt)changes.push('借款本金 '+money(before.debt)+' → '+money(after.debt));
  let title='安排已生效',workspace:EnterpriseWorkspace='journal';
  if(command.kind==='management-plan'){title='经营规则已批准';workspace='management';changes.push('系统按规则执行常规业务；实际限制、耗时与责任继续保留');}
  else if(command.kind==='yard-plan'){title='堆场规则已生效';workspace='yard';changes.push('只改变后续入场；已有库存需要真实提取和移位后释放');}
  else if(command.kind==='staff-plan'){title='班表已应用';workspace='staff';changes.push('现有总人数保持不变；培训中的人员仍不能参与生产');}
  else if(command.kind==='incident-plan'){title='事件处置方案已授权';workspace='emergency';changes.push('技术修复按人员与预算执行；备用持续费用单独记账');}
  else if(command.kind==='order-asset'){
    const spec=assetSpec(command.model),asset=after.assets.find(a=>!before.assets.some(b=>b.id===a.id));title=spec.name+'订单已建立';workspace='assets';
    if(asset)changes.push('计划交付 '+hourLabel(asset.readyHour)+'；当前仍在订购途中，尚未提供生产能力');
    if(spec.required!=='none')changes.push('投运还需'+({grid:'升级供电',rail:'轨道基础',automation:'自动化接口'} as const)[spec.required]+'，以及合格岗位与共享资源');
    if(command.ownership==='leased')changes.push('首月预付抵扣实际日租；后续租金与退出责任继续保留');
  }else if(command.kind==='project'){
    title='工程已进入建设日历';workspace='projects';const p=after.projects.find(p=>!before.projects.some(b=>b.id===p.id));if(p)changes.push('计划验收 '+hourLabel(p.completes)+'；施工完成前不增加可用能力');
  }else if(command.kind==='hire'){title='新班组已招聘';workspace='staff';const c=after.crews.find(c=>!before.crews.some(b=>b.id===c.id));if(c)changes.push('入岗培训至 '+hourLabel(c.trainingUntil)+'；培训期间不计入生产人员');
  }else if(command.kind==='train'){title='技能培训已安排';workspace='staff';changes.push('培训期间该班组退出可用生产人员；完成后再检查班次覆盖');
  }else if(command.kind==='staff'){title='班次已调整';workspace='staff';changes.push('一个班组只覆盖一个班次；请核对其他班次的岗位缺口');
  }else if(command.kind==='document'){title='资料已提交，等待独立回执';workspace='ships';changes.push('提交成功不等于回执有效；按时间推进后核对同一份资料');
  }else if(command.kind==='berth'){title='泊位计划已登记';workspace='ships';changes.push('计划不预占泊位；实际到达、有效手续、航道与拖轮仍决定能否靠泊');
  }else if(command.kind==='policy'){title='后续运行策略已更新';workspace='dispatch';changes.push('已发生的业务保持原记录，新策略用于后续执行');
  }else if(command.kind==='respond'){title='应急处置已记录';workspace='emergency';changes.push('核对事件实际状态；隔离、技术完成和确认恢复分别记录');
  }else if(command.kind==='loan'||command.kind==='repay'){title=command.kind==='loan'?'借款已到账':'本金已偿付';workspace='finance';changes.push('融资与偿还本金不计为经营收入或经营利润');
  }else if(['maintain','dispose','assign-asset'].includes(command.kind)){workspace='assets';title='设备安排已记录';}
  return {title,message:after.result.message,changes,workspace};
}
