import {useState} from 'react';
import {CARGO_LABELS,ROAD_PLANS,ROAD_BASE_CAPACITY,type LogisticsPlan} from '@edu/port-simulation-core';
import {CommandForm,EnterpriseTable,Metric,fmt,wan,useEnterpriseDraft} from './EnterpriseForms';
import type {PanelProps} from './EnterprisePanels';

export const ENTERPRISE_HUBS=[
  {id:'operations',label:'运营规则',description:'经营方针、堆场、水陆接续与巡港',entries:['management','yard','logistics','dispatch','director','cranes']},
  {id:'resources',label:'人力与设备',description:'班次保障、设备能力和补能',entries:['staff','assets','energy']},
  {id:'investment',label:'投资与技术',description:'瓶颈、建设和数字协同',entries:['technology','projects','digital']},
  {id:'market',label:'客户与合同',description:'报价、货源和履约承诺',entries:[]},
  {id:'funds',label:'资金与风险',description:'现金保障、融资和异常授权',entries:['finance','emergency']},
  {id:'reports',label:'经营报告',description:'按需查看趋势、周报、月报和经营证据',entries:['trends','review','analysis','journal']},
] as const;
export function workspaceParent(id:string){return ENTERPRISE_HUBS.find(h=>h.entries.some(e=>e===id))?.id??id;}
const labels:Record<string,string>={management:'经营方针与自动授权',yard:'堆场分区与货位',logistics:'运输与仓储政策',dispatch:'生产优先级与异常接管',staff:'班次与培训',assets:'设备购租与更新',energy:'补能与能源保障',technology:'技术方案与收益',projects:'工程与实施位置',digital:'信息协同追踪',finance:'收支、预算与融资',emergency:'重大异常与处置',review:'经营周报与收获',analysis:'完整统计与封存',journal:'个人决策证据',director:'总经理巡港日程',cranes:'岸桥岗位分配',trends:'经营趋势与日结'};
const stageLabels={quay:'岸边装卸',transport:'水平运输',yard:'堆场作业',gate:'闸口交付'};
export function CapacityPanel({v}:Pick<PanelProps,'v'>){
  const [focus,setFocus]=useState('');const t=v.strategy.terminals.find(t=>t.id===focus);
  return <section data-enterprise-control="capacity-board"><h3>先看能力，再决定投入</h3><p>点击一个作业区，查找值得优先核对的环节。以下是设备能力上限估算，实际执行还受岗位、共享供电、堆垛和接续窗口限制。</p>
    <EnterpriseTable headings={['作业区','最近观察日均工作量','名义最窄环节','库场占用']} rows={v.strategy.terminals.map(t=>{const terminal=v.terminals.find(x=>x.id===t.id)!;return [<button data-enterprise-control={'capacity-'+t.id} onClick={()=>setFocus(t.id)}>{terminal.name}</button>,fmt(t.observedDaily)+' '+CARGO_LABELS[terminal.goods].unit+'/日',stageLabels[t.bottleneck],fmt(t.inventory)+' / '+fmt(terminal.storageCapacity)];})}/>
    {t&&<div className="enterprise-review-detail" role="status"><strong>{focus} · 能力核对</strong><p>{Object.entries(t.capacity).map(([stage,value])=>stageLabels[stage as keyof typeof stageLabels]+' '+fmt(value,1)).join('；')}（本货种单位/小时）。优先检查{stageLabels[t.bottleneck]}，再核对班次、能源与实际积压；单台设备额定能力不能代替全港吞吐量。</p></div>}
  </section>;
}
export function EnterpriseHubPanel(props:PanelProps&{id:string}){
  const hub=ENTERPRISE_HUBS.find(h=>h.id===props.id);if(!hub)return null;
  return <><p className="enterprise-management-lead">{hub.description}。发布规则后，常规业务由系统持续执行；重大影响和超出授权的事项才送到事件。</p><div className="enterprise-hub-entries">{hub.entries.map(id=><button key={id} data-enterprise-control={'entry-'+id} onClick={()=>props.navigate(id)}><strong>{labels[id]}</strong><span>打开管理窗口 →</span></button>)}</div>{['resources','investment'].includes(props.id)&&<CapacityPanel v={props.v}/>}<div className="enterprise-metrics"><Metric label="可用现金" value={wan(props.v.cash)}/><Metric label="基础费用保障估算" value={fmt(props.v.strategy.cashDays,1)+'日'} detail="按当前工资、已观察燃料及固定费用估算，未含新投资与突发损失"/><Metric label="后备人员实际补位" value={fmt(props.v.management.metrics.reserveCoverHours,1)+'折合人时'}/></div></>;
}
export function LogisticsPolicyPanel({v,act,disabled,selected,navigate}:PanelProps){
  const [choice,setChoice]=useEnterpriseDraft('logistics-terminal',selected),terminal=v.terminals.find(t=>t.id===choice)??v.terminals[0]!,id=terminal.id;
  const p=v.management.logisticsPlans[id]!,routingOptions:Array<[string,string]>=terminal.rail?[["road","时效优先：公路接续"],["balanced","按公开窗口平衡铁路与公路"],["rail-first","铁路优先：允许等待发运"],["barge-first","驳船优先：等待每日窗口"]]:[["road","时效优先：公路接续"],["barge-first","驳船优先：等待每日窗口"]];
  const routingValue=!terminal.rail&&['balanced','rail-first'].includes(p.routing)?'road':p.routing;
  return <><p>决定每个作业区的运输保障、分流和仓储规则。后续货批自动执行，已集结或已进场库存保持原路径。</p><label className="enterprise-management-select">作业区<select aria-label="接续作业区" value={id} onChange={e=>setChoice(e.target.value)}>{v.terminals.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label>
    {terminal.goods!=='liquid'&&<CommandForm key={'road-'+id} id={'road-policy-'+id} title="公路保障选择" disabled={disabled} fields={[{name:'road',label:'道路保障档位',type:'select',value:p.road,options:Object.entries(ROAD_PLANS).map(([id,p])=>[id,p.name+' · '+ROAD_BASE_CAPACITY[terminal.goods]*p.capacity+CARGO_LABELS[terminal.goods].unit+'/小时 · '+p.daily+'元/日 + '+p.unit+'元/'+CARGO_LABELS[terminal.goods].unit])}]} onSubmit={f=>act({kind:'logistics-plan',terminalId:id,patch:{road:f.road as LogisticsPlan['road']}})} submit="发布道路保障" help="按需适合低负荷；预约适合稳定业务；高峰增援容量更大、固定支出更高。保障费用不会创造闸口和设备能力。"/>}
    {terminal.goods==='liquid'?<p className="enterprise-notice">液散采用专用管道接续，不设置无效的公路保障或铁路、驳船分流选项。可在设备与能源窗口管理泵组、管道和供电能力。</p>:<CommandForm key={'routing-'+id} id={'routing-policy-'+id} title="自动运输分流" disabled={disabled} fields={[{name:'routing',label:'接续规则',type:'select',value:routingValue,options:routingOptions}]} onSubmit={f=>act({kind:'logistics-plan',terminalId:id,patch:{routing:f.routing as LogisticsPlan['routing']}})} submit="发布分流规则" help={terminal.rail?'本区已接铁路；平衡策略检查每日600单位共享窗口，溢出转公路。铁路15元/发运单位，驳船12元，进口需实际集结。':'本区未接铁路，先建设铁路接口后再开放铁路分流。'}/>}
    {['container','general'].includes(terminal.goods)&&<><CommandForm key={'storage-'+id} id={'warehouse-policy-'+id} title="预约仓储业务" disabled={disabled||!terminal.bonded} fields={[{name:'warehousing',label:'预约货物处理',type:'select',value:p.warehousing,options:[['direct','普通库场等候预约提货'],['bonded','承接监管仓储服务并自动到期出区']]}]} onSubmit={f=>act({kind:'logistics-plan',terminalId:id,patch:{warehousing:f.warehousing as LogisticsPlan['warehousing']}})} submit="发布仓储政策" help="只有真实预约需求和实际在库量才计费；集装箱2元/TEU小时、件杂货1元/吨小时。独立放行条件继续有效。"/>{!terminal.bonded&&<button onClick={()=>navigate('projects')}>先查看监管仓储建设</button>}</>}
    {terminal.goods!=='liquid'&&<details><summary>铁路、驳船每日窗口</summary><CommandForm id="connection-windows" title="每日接续窗口" disabled={disabled} fields={[{name:'railHour',label:'铁路发运小时',type:'number',min:0,max:23,value:v.policy.railHour},{name:'bargeHour',label:'驳船接续小时',type:'number',min:0,max:23,value:v.policy.bargeHour}]} onSubmit={f=>act({kind:'policy',patch:{railHour:Number(f.railHour),bargeHour:Number(f.bargeHour)}})}/></details>}
  </>;
}
