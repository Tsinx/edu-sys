import { useState } from 'react';
import { CARGO_LABELS, STAFF_LABELS, ENTERPRISE_ASSETS, ENTERPRISE_PROJECTS, assetSpec, hourLabel, type EnterpriseCommand, type EnterpriseView, type EnterpriseScore, type Policy, type DocumentKind, type CargoLot } from '@edu/port-simulation-core';
import { CommandForm, EnterpriseTable, Metric, SparkChart, fmt, wan, pct, useEnterpriseDraft, type EnterpriseField } from './EnterpriseForms';
export interface PanelProps { v: EnterpriseView; act: (c: EnterpriseCommand) => void; disabled: boolean; selected: string; select: (id: string) => void; navigate: (id: string) => void; }
const terminalOptions = (v: EnterpriseView): Array<[string, string]> => v.terminals.map(t => [t.id, t.name]);
const roleOptions = Object.entries(STAFF_LABELS) as Array<[string, string]>;
const shifts: Array<[string, string]> = [['0', '00:00—08:00'], ['1', '08:00—16:00'], ['2', '16:00—24:00'], ['reserve', '预备 / 休息']];
const shiftValue = (value: string) => value === 'reserve' ? 'reserve' as const : Number(value) as 0 | 1 | 2;
const assetStatus = { ordered: '订购在途', commissioning: '等待投运', active: '可用', maintenance: '检修', failed: '故障', retired: '已退出' };
const shipStatus = { announced: '已公布船期', waiting: '港外等待', entering: '进港中', berthed: '在泊作业', leaving: '出港中', departed: '已离港' };
const documentLabels: Record<DocumentKind, string> = { entry: '进口岸资料', manifest: '舱单核对', customs: '监管放行', carrier: '承运人交付', departure: '出口岸准备' };
const documentState = { draft: '未提交', submitted: '等待回执', approved: '有效回执', correction: '需要补正' };
const terminalName = (v: EnterpriseView, id: string) => v.terminals.find(t => t.id === id)?.name ?? id;
export function AssetsPanel({ v, act, disabled }: PanelProps) {
  const [filter, setFilter] = useEnterpriseDraft('assets-filter', 'all');
  const assets = v.assets.filter(a => filter === 'all' || a.status === filter);
  return <><div className="enterprise-section-head"><div><h2>设备与资产</h2><p>每台设备独立保有型号、归属、工时、维护和资金记录。</p></div><label>状态筛选<select aria-label="设备状态筛选" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部设备</option>{Object.entries(assetStatus).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div>
    <div className="enterprise-metrics"><Metric label="资产账面价值" value={wan(v.score.assetValue)}/><Metric label="在用 / 检修 / 故障" value={v.assets.filter(a => a.status === 'active').length + ' / ' + v.assets.filter(a => a.status === 'maintenance').length + ' / ' + v.assets.filter(a => a.status === 'failed').length}/><Metric label="在途与待投运" value={v.assets.filter(a => ['ordered','commissioning'].includes(a.status)).length}/></div>
    <CommandForm id="asset-order" title="采购或租赁设备" disabled={disabled} fields={[
      { name: 'model', label: '设备型号', type: 'select', options: ENTERPRISE_ASSETS.map(a => [a.id, a.name + ' · ' + wan(a.price) + ' · 交期' + a.leadDays + '日']) },
      { name: 'terminal', label: '目标作业区', type: 'select', options: terminalOptions(v) }, { name: 'ownership', label: '保有方式', type: 'select', options: [['owned','购置并资本化'],['leased','租赁并承担租期责任']] },
    ]} help="到货后仍需轨道、供电或自动化接口。技术能力和价格均为本情境参数。" onSubmit={f => act({ kind: 'order-asset', model: f.model!, terminalId: f.terminal!, ownership: f.ownership as 'owned' | 'leased' })} submit="确认设备订单"/>
    <details className="enterprise-subpanel"><summary>展开设备规格与选型目录 · {ENTERPRISE_ASSETS.length}种型号</summary><p>比较额定能力、人员、能耗和配套条件。实际小时能力还受健康、风况、距离、接口与共享资源约束。</p><EnterpriseTable headings={['型号 / 适用货种','额定能力','人员要求','电力 / 燃料','伸距 / 起重量','交期 / 寿命','购置 / 日租','配套条件']} rows={ENTERPRISE_ASSETS.map(a=>[a.name+' / '+a.goods.map(g=>CARGO_LABELS[g].name).join('、'),a.stage==='marine'?a.rate+'次通行/小时':a.rate+' '+CARGO_LABELS[a.goods[0]!]!.unit+'/小时',a.staffRequired+' '+STAFF_LABELS[a.staff],a.kw+'kW / '+a.fuel+'L每作业小时',a.reach+'箱列 / '+a.lift+'t',a.leadDays+'日 / '+a.lifeYears+'年',wan(a.price)+' / '+fmt(a.leaseDaily)+'元',({none:'常规接口',grid:'升级供电',rail:'轨道基础',automation:'自动化接口'} as const)[a.required]])}/><p className="enterprise-muted">租赁交付起计费，首月预付抵扣实际租金；一年责任期内提前退出，最多承担90日租金。全部价格为教学设定。</p></details>
    <EnterpriseTable headings={['资产 / 型号','归属 / 保有','状态与约束','健康 / 电池','本期工时','账面价值','交付 / 维修时间','操作']} rows={assets.map(a => [<span data-enterprise-control={'asset-'+a.id}><strong>{assetSpec(a.model).name}</strong><small>{a.id}</small></span>, <>{terminalName(v,a.terminalId)}<small>{a.ownership === 'owned' ? '自有' : '租赁'}</small></>, <><span className={'enterprise-badge enterprise-badge--' + a.status}>{assetStatus[a.status]}</span><small>{a.note}</small></>, <>{fmt(a.health,1)}%{assetSpec(a.model).battery > 0 && <small>{fmt(a.battery)}kWh · 健康{pct(a.batteryHealth)}</small>}</>, fmt(a.workedHours,1), wan(v.assetBooks[a.id] ?? 0), a.repairUntil !== null ? hourLabel(a.repairUntil) : a.status === 'ordered' ? hourLabel(a.readyHour) : '已交付', <div className="enterprise-inline-actions"><button data-enterprise-control={'maintain-'+a.id} disabled={disabled || !['active','failed'].includes(a.status)} onClick={() => act({ kind:'maintain',assetId:a.id,overhaul:false })}>安排维修</button><button disabled={disabled || !['active','failed'].includes(a.status)} onClick={() => act({kind:'maintain',assetId:a.id,overhaul:true})}>大修</button><button disabled={disabled || a.status === 'retired'} onClick={() => act({kind:'dispose',assetId:a.id})}>退出设备</button></div>])}/>
    <CommandForm id="asset-transfer" title="空闲设备调拨" fields={[{name:'asset',label:'设备',type:'select',options:v.assets.filter(a=>a.status==='active').map(a=>[a.id,assetSpec(a.model).name+' · '+a.id])},{name:'terminal',label:'接收作业区',type:'select',options:terminalOptions(v)}]} onSubmit={f=>act({kind:'assign-asset',assetId:f.asset!,terminalId:f.terminal!})} disabled={disabled} help="调拨占用时间与费用，待重新验收后投运。"/>
  </>;
}
export function ProjectsPanel({ v, act, disabled }: PanelProps) {
  return <><h2>港区规划与建设</h2><p>项目投入、建设占用和投产条件沿经营时间线持续保留。</p>
    <CommandForm id="project" title="安排建设项目" disabled={disabled} fields={[{name:'type',label:'项目',type:'select',options:ENTERPRISE_PROJECTS.map(p=>[p.id,p.name+' · '+wan(p.price)+' · '+p.days+'日'])},{name:'terminal',label:'实施位置',type:'select',options:terminalOptions(v)}]} onSubmit={f=>act({kind:'project',type:f.type!,terminalId:f.terminal!})} submit="确认开工"/>
    <div className="enterprise-project-catalogue">{ENTERPRISE_PROJECTS.map(p=><article key={p.id}><strong>{p.name}</strong><span>{wan(p.price)} / {p.days}日</span><p>{p.description}</p></article>)}</div>
    <div data-enterprise-control="projects-status"><EnterpriseTable headings={['项目','作业区','投资','计划投产','进度']} rows={v.projects.map(p=>[ENTERPRISE_PROJECTS.find(s=>s.id===p.type)?.name,terminalName(v,p.terminalId),wan(p.price),hourLabel(p.completes),<><progress aria-label="项目进度" max={p.completes-p.started} value={Math.min(p.completes-p.started,Math.max(0,v.hour-p.started))}/><small>{p.status==='completed'?'已投产':'施工中'}</small></>])}/></div>
  </>;
}
export function StaffPanel({v,act,disabled}:PanelProps) {
  return <><h2>人员、技能与班次</h2><p>每个班组只属于一个班次，培训期间退出可用生产人员。</p>
    <div className="enterprise-metrics"><Metric label="在册人员" value={v.crews.reduce((n,c)=>n+c.count,0)+'人'}/><Metric label="培训中" value={v.crews.filter(c=>c.trainingUntil>v.hour).reduce((n,c)=>n+c.count,0)+'人'}/><Metric label="当前班次" value={shifts[Math.floor(v.hour%24/8)]![1]}/></div>
    <CommandForm id="hire" title="招聘与入岗安排" disabled={disabled} fields={[{name:'role',label:'岗位',type:'select',options:roleOptions},{name:'count',label:'人数',type:'number',min:1,max:50,value:4},{name:'shift',label:'目标班次',type:'select',options:shifts}]} onSubmit={f=>act({kind:'hire',role:f.role as keyof typeof STAFF_LABELS,count:Number(f.count),shift:shiftValue(f.shift!)})} submit="招聘并安排培训"/>
    <EnterpriseTable headings={['班组','人数','班次','技能','培训状态','工资 / 人时','操作']} rows={v.crews.map(c=>[<>{STAFF_LABELS[c.role]}<small>{c.id}</small></>,c.count,<select data-enterprise-control={'staff-'+c.id} aria-label={'调整班次 '+c.id} disabled={disabled||c.trainingUntil>v.hour} value={String(c.shift)} onChange={e=>act({kind:'staff',crewId:c.id,shift:shiftValue(e.target.value)})}>{shifts.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>,fmt(c.skill)+'%',c.trainingUntil>v.hour?'至 '+hourLabel(c.trainingUntil):'可排班',fmt(c.wage)+'元',<div className="enterprise-inline-actions"><button data-enterprise-control={'train-'+c.id} disabled={disabled||c.trainingUntil>v.hour||c.skill>=100} onClick={()=>act({kind:'train',crewId:c.id})}>技能培训</button><button disabled={disabled} onClick={()=>act({kind:'release-staff',crewId:c.id})}>退出结算</button></div>])}/>
  </>;
}
function policyFields(v:EnterpriseView):EnterpriseField[] { return [
  {name:'autoBerth',label:'按计划自动安排靠泊',type:'checkbox',value:String(v.policy.autoBerth)},
  {name:'priority',label:'业务优先级',type:'select',value:v.policy.priority,options:[['deadline','承诺期限优先'],['fifo','先到先服务'],['export','出口装船优先']]},
  {name:'documents',label:'单证提交策略',type:'select',value:v.policy.documents,options:[['automatic','按核验规则自动提交'],['manual','逐项人工提交']]},
  {name:'verifiedExceptions',label:'授权独立资料复核与异常核查',type:'checkbox',value:String(v.policy.verifiedExceptions)},
  {name:'maintenance',label:'设备维护策略',type:'select',value:v.policy.maintenance,options:[['preventive','计划维护与故障维修排程'],['reactive','故障后由本人安排']]},
  {name:'maintenanceHealth',label:'预防维护健康阈值 %',type:'number',min:30,max:90,value:v.policy.maintenanceHealth},
  {name:'reserveCash',label:'自动维护及补给现金保留 元',type:'number',min:0,max:50000000,step:100000,value:v.policy.reserveCash},
  {name:'autoSupplies',label:'执行燃料与备件补给策略',type:'checkbox',value:String(v.policy.autoSupplies)},
]; }
export function DispatchPanel({v,act,disabled}:PanelProps) {
  const apply=(f:Record<string,string>)=>act({kind:'policy',patch:{autoBerth:f.autoBerth==='true',priority:f.priority as Policy['priority'],documents:f.documents as Policy['documents'],verifiedExceptions:f.verifiedExceptions==='true',maintenance:f.maintenance as Policy['maintenance'],maintenanceHealth:Number(f.maintenanceHealth),reserveCash:Number(f.reserveCash),autoSupplies:f.autoSupplies==='true'}});
  return <><h2>联合计划与运行策略</h2><p>已批准的策略持续执行。资源不足形成等待，关键事件仍需本人处置。</p><CommandForm id="dispatch-policy" title="更新生产与保障策略" fields={policyFields(v)} onSubmit={apply} disabled={disabled} submit="应用运行策略"/>
    <EnterpriseTable headings={['作业区','当前船舶','等泊','库场实际占用','运输距离系数','基础条件']} rows={v.terminals.map(t=>[t.name,v.calls.find(c=>c.id===t.berthCall)?.name??'空闲',t.queued,<>{fmt(t.stock)}/{fmt(t.storageCapacity)} {CARGO_LABELS[t.goods].unit}<progress aria-label={t.name+'库场利用率'} max={t.storageCapacity} value={t.stock}/></>,fmt(t.distance,2),[t.rail?'铁路/轨道':'无铁路',t.shore?'岸电':'无岸电',t.automation?'自动化接口':'人工接口'].join(' · ')])}/>
  </>;
}
export function ShipsPanel({v,act,disabled}:PanelProps) {
  const [choice,setChoice]=useEnterpriseDraft('selected-call',v.calls[0]?.id??'');
  const selected=v.calls.find(c=>c.id===choice)??v.calls[0];
  return <><h2>船期、泊位与口岸回执</h2><p>船期是预测；实际到达、有效回执、靠妥与开工分别记录。</p>
    <EnterpriseTable headings={['船舶 / 货种','预计到港','实际状态','泊位 / 预约','承诺离港','等待分解 h']} rows={v.calls.slice(0,150).map(c=>[<button className="enterprise-text-button" onClick={()=>setChoice(c.id)}>{c.name}<small>{CARGO_LABELS[c.goods].name}</small></button>,hourLabel(c.eta),shipStatus[c.stage],terminalName(v,c.plannedTerminal??c.terminalId),hourLabel(c.deadline),c.wait.berth+' 泊位 / '+c.wait.documents+' 手续 / '+c.wait.channel+' 通行'])}/>
    {selected&&<section className="enterprise-subpanel"><h3>{selected.name} · 独立资料与业务回执</h3><p>船长{selected.length}m · 吃水{selected.draft}m · 横向箱列{selected.rows} · 泊位预约不预占实际资源。</p>
      <CommandForm id={'berth-'+selected.id} title="安排目标泊位" fields={[{name:'terminal',label:'兼容作业区',type:'select',value:selected.terminalId,options:terminalOptions(v)}]} onSubmit={f=>act({kind:'berth',callId:selected.id,terminalId:f.terminal!})} disabled={disabled||!['waiting','announced'].includes(selected.stage)} submit="登记泊位计划"/>
      <div className="enterprise-document-grid" data-enterprise-control="ship-documents">{(Object.keys(documentLabels) as DocumentKind[]).map(kind=><article key={kind}><strong>{documentLabels[kind]}</strong><span className={'enterprise-badge enterprise-badge--'+selected.documents[kind].status}>{documentState[selected.documents[kind].status]}</span><p>{selected.documents[kind].reason||'尚无回执'}</p><small>独立资料编号：{selected.id+'-'+kind}</small><CommandForm id={'document-'+selected.id+'-'+kind} title={'填报'+documentLabels[kind]} fields={[{name:'reference',label:'资料引用 '+documentLabels[kind],value:selected.id+'-'+kind}]} onSubmit={f=>act({kind:'document',callId:selected.id,document:kind,reference:f.reference!})} disabled={disabled||selected.documents[kind].status==='approved'} submit="核对并提交"/></article>)}</div>
    </section>}
  </>;
}
export function CargoPanel({v,act,disabled,selected}:PanelProps) {
  const [filter,setFilter]=useEnterpriseDraft('cargo-filter','all');
  const [pageValue,setPage]=useEnterpriseDraft('cargo-page','0');
  const all=v.lots.filter(l=>filter==='all'||l.terminalId===filter), page=Math.min(Math.max(0,Number(pageValue)),Math.max(0,Math.ceil(all.length/100)-1)), lots=all.slice(page*100,(page+1)*100);
  return <><div className="enterprise-section-head"><div><h2>货物、堆存与业务状态</h2><p>货物数量在船、岸边、库场、陆侧及已交付之间守恒。监管状态单独判断。</p></div><select aria-label="货批作业区筛选" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部作业区</option>{terminalOptions(v).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>
    <EnterpriseTable headings={['货批 / 货种','方向与路径','船上 / 岸边 / 库场 / 陆侧','已交付 / 总量','监管与交付','承诺时刻','操作']} rows={lots.map(l=>[<>{l.id}<small>{CARGO_LABELS[l.goods].name+' · '+CARGO_LABELS[l.goods].unit}</small></>,(l.flow==='import'?'进口':'出口')+' · '+l.route,[l.ship,l.apron,l.yard,l.land].map(n=>fmt(n)).join(' / '),fmt(l.completed)+' / '+fmt(l.quantity),l.quarantine?'隔离核查':l.bonded?'保税库存':l.release?'具备交付条件':'等待放行或交付条件',hourLabel(l.deadline),<button disabled={disabled||!l.quarantine||l.inspectionUntil!==null} onClick={()=>act({kind:'inspect',lotId:l.id})}>{l.inspectionUntil!==null?'核查中':'安排核查'}</button>])}/>
    <div className="enterprise-inline-actions"><button disabled={page<=0} onClick={()=>setPage(String(page-1))}>上一页货批</button><span>第{page+1}页 / 共{all.length}条</span><button disabled={(page+1)*100>=all.length} onClick={()=>setPage(String(page+1))}>下一页货批</button></div>
    <p className="enterprise-muted">待处理总数{v.outstandingLots}，按页查看；全量记录进入复盘与核验。</p>
    <CommandForm id="lot-route" title="调整货物路径与仓储" disabled={disabled} fields={[{name:'lot',label:'货批',type:'select',options:v.lots.filter(l=>l.completed+l.lost<l.quantity).map(l=>[l.id,l.id+' · '+CARGO_LABELS[l.goods].name])},{name:'route',label:'集疏运路径',type:'select',options:[['road','公路'],['rail','铁路班列'],['barge','驳船接续'],['pipeline','液散管道']]},{name:'bonded',label:'进入保税仓储',type:'checkbox',value:'false'}]} onSubmit={f=>act({kind:'route',lotId:f.lot!,route:f.route as CargoLot['route'],bonded:f.bonded==='true'})} help="进入保税仓储需要对应设施；已进场货物调整路径会产生移位、时间和费用。"/>
  </>;
}
export function LogisticsPanel({v,act,disabled}:PanelProps) {
  return <><h2>集疏运与腹地接续</h2><p>铁路、驳船按窗口接续；港外等待仍进入全程诊断。</p><div className="enterprise-metrics"><Metric label="尚待陆侧接续的货批" value={v.lots.filter(l=>l.land>0||l.yard>0).length}/><Metric label="铁路接入作业区" value={v.terminals.filter(t=>t.rail).length}/><Metric label="各作业区公路小时限额" value={v.policy.roadQuota} detail="按对应货种的单位分别计算"/></div>
    <CommandForm id="logistics" title="设置运输接续计划" disabled={disabled} fields={[{name:'transport',label:'新货批默认路径',type:'select',value:v.policy.transport,options:[['road','公路'],['rail','铁路'],['barge','驳船'],['balanced','按设施选择铁路或公路']]},{name:'roadQuota',label:'每作业区公路小时限额',type:'number',min:20,max:600,value:v.policy.roadQuota},{name:'railHour',label:'铁路每日发运小时 UTC',type:'number',min:0,max:23,value:v.policy.railHour},{name:'bargeHour',label:'驳船每日接续小时 UTC',type:'number',min:0,max:23,value:v.policy.bargeHour}]} onSubmit={f=>act({kind:'policy',patch:{transport:f.transport as Policy['transport'],roadQuota:Number(f.roadQuota),railHour:Number(f.railHour),bargeHour:Number(f.bargeHour)}})} submit="更新接续计划"/>
    <EnterpriseTable headings={['作业区','货种与单位','铁路','岸电','监管仓储','库场容量']} rows={v.terminals.map(t=>[t.name,CARGO_LABELS[t.goods].name+' / '+CARGO_LABELS[t.goods].unit,t.rail?'已接入':'待建设',t.shore?'可连接':'待建设',t.bonded?'可用':'待建设',fmt(t.storageCapacity)])}/>
  </>;
}
export function MarketPanel({v,act,disabled}:PanelProps) {
  return <><h2>市场、客户与经营协议</h2><p>服务价格与客户可靠性共同影响后续工作量，承接合同会增加履约责任。</p>
    <CommandForm id="pricing" title="调整后续服务报价" fields={[{name:'tariff',label:'基础价格系数 0.7—1.5',type:'number',min:.7,max:1.5,step:.05,value:v.policy.tariff}]} disabled={disabled} onSubmit={f=>act({kind:'policy',patch:{tariff:Number(f.tariff)}})} help="已生成挂靠仍按原报价或合同价格执行；需求响应是公开的教学情境规则。"/>
    <div className="enterprise-contracts">{v.contracts.slice(-12).map(c=><article key={c.id}><div><span className="enterprise-eyebrow">{CARGO_LABELS[c.goods].name}</span><h3>{c.title}</h3><p>额外到港工作量：{c.volume}{CARGO_LABELS[c.goods].unit}/日 · 服务单价{fmt(c.price)}元/{CARGO_LABELS[c.goods].unit}</p><p>协议结束：{hourLabel(c.endHour)} · 未完成量责任系数{pct(c.penalty)}</p><small>已承诺{fmt(c.promised)} / 已交付{fmt(c.shipped)}</small></div><button data-enterprise-control={'contract-'+c.id} disabled={disabled||c.accepted||c.expires<v.hour} onClick={()=>act({kind:'accept-contract',contractId:c.id})}>{c.accepted?'已承接':c.expires<v.hour?'机会已过期':'承接此合同'}</button></article>)}</div>
    <EnterpriseTable headings={['客户','业务','服务稳定性指数','累计服务量','逾期交付量','基础报价']} rows={v.customers.map(c=>[c.name,CARGO_LABELS[c.goods].name,fmt(c.loyalty),fmt(c.served),fmt(c.late),fmt(c.rate)+'元/'+CARGO_LABELS[c.goods].unit])}/>
    <CommandForm id="governance" title="经营协议与公共资源责任" fields={[{name:'value',label:'情境协议',type:'select',value:v.governance,options:[['integrated','综合经营协议 · 公共资源费用2.5%'],['landlord','租赁经营协议 · 公共资源费用12%']]}]} disabled={disabled} onSubmit={f=>act({kind:'governance',value:f.value as 'integrated'|'landlord'})} help="两种教学协议使用不同费用责任；监管机构独立提供回执，经营者不能自行授予放行。变更有25万元组织成本。"/>
  </>;
}
export function FinancePanel({v,act,disabled}:PanelProps) {
  return <><h2>财务、现金与经营责任</h2><p>购置形成资产，折旧进入损益；应收款在账期到期后收回。</p>
    <div className="enterprise-metrics"><Metric label="可用现金" value={wan(v.cash)}/><Metric label="累计会计利润" value={wan(v.score.profit)}/><Metric label="借款本金" value={wan(v.debt)}/><Metric label="应收 / 后续义务" value={wan(v.score.receivables)} detail={'后续义务 '+wan(v.score.futureObligations)}/><Metric label="调整后净资产" value={wan(v.score.equity)} detail="包含库存、资产、应收与债务"/></div>
    <div className="enterprise-two-column"><CommandForm id="loan" title="安排融资" fields={[{name:'amount',label:'借款金额 元',type:'number',min:100000,max:80000000,step:100000,value:5000000}]} disabled={disabled} onSubmit={f=>act({kind:'loan',amount:Number(f.amount)})} help="年利率6.5%，月末计息；额度受资产和既有债务约束。" submit="取得借款"/><CommandForm id="repay" title="偿还本金" fields={[{name:'amount',label:'偿付金额 元',type:'number',min:1,max:100000000,step:1,value:5000000}]} disabled={disabled} onSubmit={f=>act({kind:'repay',amount:Number(f.amount)})} submit="偿还借款"/></div>
    <SparkChart label="月末现金 · 元" series={v.months.map(m=>m.cashEnd)}/>
    <div data-enterprise-control="finance-months"><EnterpriseTable headings={['月份','收入','运营费用','投资现金支出','折旧','利息 / 税费','月末现金','月末债务']} rows={v.months.map(m=>[m.month,wan(m.revenue),wan(m.operating),wan(m.capital),wan(m.depreciation),wan(m.interest)+' / '+wan(m.tax),wan(m.cashEnd),wan(m.debtEnd)])}/></div>
    <h3>近期资金与成本流水</h3><EnterpriseTable headings={['发生时刻','业务','确认金额','现金变动']} rows={v.ledger.slice(-80).reverse().map(e=>[hourLabel(e.hour),e.note,wan(e.amount),wan(e.cash)])}/>
  </>;
}
export function EnergyPanel({v,act,disabled,navigate}:PanelProps) {
  return <><h2>能源、环境与港城影响</h2><p>供电、充电、船舶岸电与设备作业共享容量，绿色投入通过实际使用产生效果。</p>
    <div className="enterprise-metrics"><Metric label="接入供电容量" value={fmt(v.gridKw)+'kW'}/><Metric label="光伏储能配置" value={fmt(v.solarKw)+'kW'}/><Metric label="累计设备电量" value={fmt(v.stats.energy)+'kWh'}/><Metric label="燃料消耗" value={fmt(v.stats.fuel)+'L'}/><Metric label="模型核算排放" value={fmt(v.stats.emissions/1000,1)+'tCO₂e'}/></div>
    <CommandForm id="energy-policy" title="岸电与风险保障" fields={[{name:'shorePower',label:'在条件具备时使用岸电',type:'checkbox',value:String(v.policy.shorePower)},{name:'insurance',label:'购买情境风险保障',type:'checkbox',value:String(v.policy.insurance)}]} onSubmit={f=>act({kind:'policy',patch:{shorePower:f.shorePower==='true',insurance:f.insurance==='true'}})} disabled={disabled} submit="更新能源与保障策略"/>
    <SparkChart label="月度设备电量 · kWh" series={v.months.map(m=>m.energy)} color="#bb8e38"/>
    <EnterpriseTable headings={['作业区','岸电','供电接口等级','防洪等级','抑尘与污水收集','保安监测']} rows={v.terminals.map(t=>[t.name,t.shore?'已建设':'未建设',t.gridLevel,t.floodProtection,t.dustControl,t.security])}/>
    <button className="enterprise-button" onClick={()=>navigate('projects')}>安排岸电、供电、抑尘或防洪项目</button>
    <p className="enterprise-muted">排放为本情境活动量核算，设备购电按0.52kgCO₂e/kWh、柴油按2.68kgCO₂e/L计算；靠泊船舶使用简化边界。系数不表示当期地区电网实测值。港外等待与污染事件单独保留。</p>
  </>;
}
export function DigitalPanel({v,act,disabled,navigate}:PanelProps) {
  const pending=v.calls.filter(c=>Object.values(c.documents).some(d=>d.status==='correction'));
  return <><h2>数字协同与业务信息</h2><p>源业务发生与收到回执是不同时间。自动化依赖接口、合格人员与可用网络。</p><div className="enterprise-metrics"><Metric label="协同平台等级" value={v.digitalLevel}/><Metric label="正常单证反馈" value={Math.max(1,4-v.digitalLevel)+'小时'}/><Metric label="待补正挂靠" value={pending.length}/><Metric label="自动化作业区" value={v.terminals.filter(t=>t.automation>0).length}/></div>
    <EnterpriseTable headings={['船舶','进口岸','舱单','监管','承运人','离港准备']} rows={v.calls.slice(0,100).map(c=>[c.name,...(Object.keys(documentLabels) as DocumentKind[]).map(k=><span className={'enterprise-badge enterprise-badge--'+c.documents[k].status}>{documentState[c.documents[k].status]}</span>)])}/>
    <div className="enterprise-two-column"><section className="enterprise-subpanel"><h3>状态核对</h3><p>物理卸船、数据记录完成、监管放行和承运人交付分别检查。资料退补保持原始业务，不能通过重新生成货批绕过。</p><button onClick={()=>navigate('ships')}>核对船舶与回执</button></section><section className="enterprise-subpanel"><h3>系统连续性</h3><p>系统事件需要核查证据、隔离范围、修复和恢复确认；备用系统继续产生费用。</p><button onClick={()=>navigate('emergency')}>查看事件与恢复</button></section></div><button className="enterprise-button" onClick={()=>navigate('projects')}>建设协同平台或自动化接口</button>
  </>;
}
export function EmergencyPanel({v,act,disabled}:PanelProps) {
  return <><h2>风险、应急与恢复</h2><p>核查影响与证据，控制范围，安排修复，再确认恢复。积压业务在恢复后继续。</p>
    <div className="enterprise-metrics"><Metric label="尚未恢复事件" value={v.incidents.filter(i=>i.status!=='resolved').length}/><Metric label="累计恢复" value={v.stats.recovered}/><Metric label="燃料库存" value={fmt(v.fuelStock)+'L'}/><Metric label="维修备件" value={v.spareParts+'份'}/></div>
    <div className="enterprise-incidents" data-enterprise-control="incidents">{v.incidents.slice(-20).reverse().map(i=><article key={i.id}><div><span className={'enterprise-badge enterprise-badge--'+i.status}>{i.status==='resolved'?'已恢复':i.status==='contained'?'已控制':'正在影响业务'}</span><h3>{i.title}</h3><p>{i.terminalId?terminalName(v,i.terminalId):'全港共享资源'} · 发生于{hourLabel(i.started)}</p><p>直接损失{wan(i.loss)} · 持续{fmt(i.blockedHours)}小时 · {i.evidence?'证据已核查':'待核查证据'}</p>{i.resolves!==null&&<small>预计技术修复：{hourLabel(i.resolves)}</small>}</div><div className="enterprise-inline-actions">{([['audit','核查证据'],['isolate','隔离范围'],['backup','启用备用'],['repair','技术修复'],['recover','确认恢复']] as const).map(([action,label])=><button key={action} data-enterprise-control={'incident-'+i.id+'-'+action} disabled={disabled||i.status==='resolved'||action==='repair'&&i.resolves!==null||action==='recover'&&(i.response!=='repair'||i.resolves!==null)} onClick={()=>act({kind:'respond',incidentId:i.id,action})}>{label}</button>)}</div></article>)}</div>
    {!v.incidents.length&&<p className="enterprise-empty">当前未发生事件。设备维护、备用能力与防护投资仍会影响后续风险。</p>}
    <CommandForm id="supplies" title="补充生产与维修物资" fields={[{name:'item',label:'物资',type:'select',options:[['fuel','柴油 · 7.2元/L'],['parts','维修备件 · 4000元/份']]},{name:'quantity',label:'数量',type:'number',min:1,max:200000,value:20}]} disabled={disabled} onSubmit={f=>act({kind:'supplies',item:f.item as 'fuel'|'parts',quantity:Number(f.quantity)})} submit="采购入库"/>
  </>;
}
export function ScorePanel({score}:{score:EnterpriseScore}) { return <section className="enterprise-subpanel"><h3>经营诊断量规 · {fmt(score.total,2)}分</h3><p>{score.complete?'已完成经营期':'当前为阶段结果，尚未完成全部经营期'} · 进度{pct(score.progress)}</p><EnterpriseTable headings={['评价项','得分 / 分值','计算边界']} rows={score.components.map(c=>[c.label,fmt(c.score,2)+' / '+c.max,c.detail])}/><small>{score.benchmark}</small></section>; }
export interface Comparison { title:string; hour:number; config:string; rules:string; score:EnterpriseScore; goods:EnterpriseView['goods']; }
export function AnalysisPanel({v,comparisons,onSave}:PanelProps&{comparisons:Comparison[];onSave:()=>void}) {
  return <><h2>绩效、对照与经营证据</h2><p>按相同观察时点、场景、种子和规则比较。不同货种保持各自单位。</p>
    <div data-enterprise-control="analysis-goods"><EnterpriseTable headings={['业务','生成量','已到承诺期','已交付','到期按时率','未完成 / 货损','累计收入']} rows={v.goods.map(g=>[g.name+' / '+g.unit,fmt(g.generated),fmt(g.due),fmt(g.delivered),g.fulfillment===null?'尚无到期业务':pct(g.fulfillment),fmt(g.outstanding)+' / '+fmt(g.lost),wan(g.revenue)])}/></div>
    <div className="enterprise-metrics"><Metric label="已离港船舶平均等待" value={fmt(v.score.waitingHours,1)+'小时'} detail="包含单证、航道和等泊等待"/><Metric label="发生移位的货批" value={v.lots.filter(l=>l.rehandles>0).length}/></div>
    <EnterpriseTable headings={['业务','已交付平均在港时间','全程在系统量积分']} rows={v.goods.map(g=>[g.name,g.averageTime===null?'尚无交付':fmt(g.averageTime,1)+'小时',fmt(g.systemUnitHours)+' '+g.unit+'·小时'])}/><p className="enterprise-muted">在系统量积分包含处理、移位与等待；货种之间保留各自单位，不直接求和比较。</p>
    <ScorePanel score={v.score}/><button className="enterprise-button" onClick={onSave}>保存当前观察结果用于对照</button>
    <EnterpriseTable headings={['观察记录','时点','可比性','履约','利润','净资产','诊断分']} rows={comparisons.map(c=>[c.title,hourLabel(c.hour),c.hour===v.hour&&c.config===JSON.stringify(v.config)&&c.rules===JSON.stringify(v.rules)?'同条件，可比较':'观察时点或情境不同，不能解释为因果差异',pct(c.score.deliveryRate),wan(c.score.profit),wan(c.score.equity),fmt(c.score.total,2)])}/>
    <SparkChart label="月度收入与投入的观察：收入 · 元" series={v.months.map(m=>m.revenue)}/>
  </>;
}
export function JournalPanel({v,act,disabled}:PanelProps) {
  return <><h2>个人决策与只读证据</h2><p>说明依据、预期影响、观察结果和适用边界。保存文字仅证明记录完整，不替代对内容质量的判断。</p><CommandForm id="decision-note" title="保存个人决策说明" fields={[{name:'topic',label:'决策类别',type:'select',options:[['经营决策','经营与客户'],['设备投资','设备与建设'],['生产调度','人员与生产'],['异常与边界','风险、恢复与局限'],...Array.from({length:v.config.years},(_,i):[string,string]=>['第'+(i+1)+'年经营复盘','第'+(i+1)+'年经营复盘'])]},{name:'text',label:'依据、决定与观察',type:'textarea'}]} disabled={disabled} onSubmit={f=>act({kind:'note',topic:f.topic!,text:f.text!})} submit="保存到经营记录"/>
    <div className="enterprise-notes">{v.notes.slice(-20).reverse().map((n,i)=><article key={i}><strong>{n.topic}</strong><small>{hourLabel(n.hour)}</small><p>{n.text}</p></article>)}</div>
    <EnterpriseTable headings={['节点','发生时刻','指令类型','判定','业务反馈']} rows={v.journal.slice(-100).reverse().map(j=>[j.index+1,hourLabel(j.hour),j.kind,j.ok?'已执行':'未执行',j.message])}/>
  </>;
}
export function HandbookPanel({v}:PanelProps) {
  return <><h2>经营手册与参数边界</h2><div className="enterprise-handbook"><article><h3>接管与安排</h3><p>先核对各作业区能力、在用设备、班组和现金。设备订购需要交期，建设需要时间，培训期间人员不参与生产。日常执行按已批准策略推进。</p></article><article><h3>运行与异常</h3><p>按小时、班次、生产日或季度推进。船舶通行需要手续、泊位适配和港作服务；货物交付需要物理库存、监管回执、承运条件和运输接续。</p></article><article><h3>设备与资金</h3><p>自有设备的购置款资本化，折旧进入损益；租赁承担期间费用和提前退出责任。燃料与备件采购形成库存，使用时结转成本。</p></article><article><h3>恢复与提交</h3><p>日常自动存档在本机数据库，也可导出独立文件。回放不修改原经营现场。正式任务绑定个人场次，封存后主动提交，平台按相同规则重放核验。</p></article></div>
    <EnterpriseTable headings={['参数组','来源类型','单位','适用边界']} rows={v.parameters.map(p=>[p.group,p.provenance,p.unit,p.boundary])}/>
    <h3>模型公开规则</h3><p className="enterprise-muted">长期运行以货批和小时为粒度，月度结算、季度客户评估。基础需求随季节和情境趋势变化，价格响应系数为max(0.65,min(1.15,1.5−0.5×报价系数))；客户服务稳定性也影响后续工作量。天气、船期、业务偏差和故障使用独立可复现随机流。</p><p className="enterprise-muted">不同货种总量不作为现实吞吐量直接相加。能源诊断使用教学折算权重：集装箱1、干散货0.1、液散0.12、件杂货0.3、滚装0.5、客运0.04。保安、防洪、数字化和维修措施通过业务条件及风险过程体现。</p>
  </>;
}
