import { portLabFinished } from '@edu/port-simulation-core';
import { currentTrialSaved, trialNumber, type Notebook } from './port-class-notebook';
import type { PortAnalysisChart } from './port-analysis-config';

export interface LabCoachStep {id:string;title:string;instruction:string;why:string;targets:string[];read?:boolean}
export type LabCoachEvent = {kind:'intro'|'camera'|'resource'|'add-chart'|'locate'|'speed'|'run'|'pause'|'inspect'|'details'|'layout'|'legend'|'export'|'dispatch'|'apply'} | {kind:'chart';chart:PortAnalysisChart};
const step=(id:string,title:string,instruction:string,why:string,targets:string[],read=false):LabCoachStep=>({id,title,instruction,why,targets,read});

const baseline:LabCoachStep[]=[
  step('intro','先认清基准与观察终点','这是第120分钟的同一拥堵现场。先保持基准岗位，观察至第360分钟；第一次试验再亲自修改岗位。上方六项指标随实际箱流更新。','先建立可比基准。高亮只指路，时钟与设备由你操作；可以随时收起引导。',['lab:kpis'],true),
  step('camera','切换现场视角','点击“岸侧”“堆场”或“闸口”切换视角；三维现场中也可点选设备。总览可返回全场。','先看清岸桥、车辆、场桥与闸口的接续关系，再用图表判断等待发生在哪里。',['lab:camera']),
  step('resource','选一台要观察的设备','在“当前分析设备”中选择“场内车 1”或另一台设备。岸桥、集卡、场桥、闸口和堆场区域都可分析。','设备名称与现场对象对应；后面可以勾选多台、按设备类型比较。',['lab:resource']),
  step('add-chart','亲手添加第一张图表','点击“为所选设备添加图表”。本次从空白分析台开始；添加图表不会重置模拟，也不会遗漏此前记录。','先选对象，再选指标和图形。已有模拟记录独立于图表保存。',['lab:add-chart']),
  step('chart','设置对象、指标与时间窗','先保留“设备状态与时长”和“状态时间轴”，勾选想观察的设备后保存。这里还能设置占用率、完成交接量、任务周期、堆场库存，选择折线／柱状图、分组、观察范围和分段。','状态时间轴适合追查单台设备。占用包含等待，不能直接当效率。设置若已关闭，重新点击“添加图表”或已有图的“设置”。',['lab:chart-editor','lab:chart-save']),
  step('locate','把统计对象定位到现场','点击“定位所选设备”，核对刚才选中的设备。图表中的历史数据也能定位当前现场。','定位只移动镜头；不会倒退时钟，也不会把历史统计当作当前动作。',['lab:locate']),
  step('speed','选择适合观察的运行倍速','调整“运行倍速”：1×适合看单次动作，30×或120×适合观察一段流程。','倍速只改变观看速度；暂停期间不累计设备作业时间和成本。',['lab:speed']),
  step('run','连续推进一小段','点击“连续推进 5 分钟”，观察实际设备与车辆作业，也可选择15／30分钟或运行至终点。','“运行至下一节点”会在整10分钟节点暂停；连续推进按你选择的目标暂停。',['lab:advance']),
  step('pause','暂停并核对运行结果','点击“暂停推进”，或等待目标节点自动暂停。看看现场、队列和分析图是否一起更新；需要时可继续至原目标。','离开页面会自动暂停；刷新后现场进度、图表配置与文字仍可恢复。',['lab:pause']),
  step('inspect','读出一段真实状态','点击图表中的彩色时间段、柱子或数据点；也可用Tab选中并按回车。下方会显示历史统计与设备定位入口。','把“设备很忙”分解为作业、载箱等待、道路等待或未配岗，才能提出可检验的解释。',['lab:plot']),
  step('details','核对数值与统计口径','展开“查看数值与统计口径”，核对观察分钟、任务占用和完成交接量。','交接量是各环节实际完成的箱次，不能把多个环节相加当作最终交付量。',['lab:numbers']),
  step('finish','取得同一终点的基准','继续运行至第360分钟。需要直接取得终态时，可展开“快算”并选择“快算至观察终点”。','连续推进展示作业过程；快算跳过画面但仍使用同一逐箱计算。保存前必须到达统一终点。',['lab:endpoint','lab:quick']),
  step('finding','写下发现，再进入第一次试验','在“本次实验的发现”中简写1—2句，例如观察到了哪类等待、下一次想改哪项岗位。然后点击“保存基准并建立试验”。','基准发现会独立保留；下一次仍从同一第120分钟检查点开始。',['lab:finding','lab:submit']),
];
const trial:LabCoachStep[]=[
  step('dispatch','修改第一次试验的岗位','在“试验开局岗位”中修改一项岗位。开始推进前可反复增减；岸桥、司机、场桥、闸口和技术岗位各有上限。','优先检验你在基准中提出的解释；多项协同改动也可以，但要在发现中说明。',['lab:dispatch']),
  step('apply','应用配置后再运行','点击“应用岗位配置”。还想修改时，可继续增减并再次应用；推进前没有调整次数限制。','开始后现场已有任务，重开试验才能重新设计岗位；原任务会先安全交接，交接期间成本照计。',['lab:apply']),
  step('add-chart','为试验添加一张对照图','选择需要比较的设备，点击“为所选设备添加图表”。基准期间建立的图表仍然保留，也可以点“设置”修改已有图。','用同样的对象、指标和观察区间比较，避免把不同时长的数量直接作差。',['lab:add-chart']),
  step('compare','把当前试验与基准叠加','将指标设为“分时段任务占用率”或“分时段完成交接量”，选择折线或柱状图，勾选“叠加已保存基准”后保存。可勾多台设备并按类型汇总。','浅色／虚线为基准，两组共用刻度和区间。设置若已关闭，重新点击“添加图表”或已有图的“设置”。',['lab:chart-editor','lab:chart-save']),
  step('window','试用时间窗与统计分段','在图表“设置”中把观察范围改成“最近30模拟分钟”或“指定模拟时间区间”，再保存。还可调整1／5／10／15分钟分段。','改变时间窗不改变模拟记录。“全部”适合总体比较，局部时间窗适合检查瓶颈出现的时段。',['lab:chart-settings','lab:chart-editor']),
  step('layout','整理自己的分析台','点击任一图表的“展开宽图／恢复半宽”，或使用复制、上移、下移整理图表。移除图表也不会删除模拟记录。','可以同时保留状态、占用、交接量、周期分布和库存图；分析台最多放12张图。',['lab:chart-layout']),
  step('run','运行试验并观察改动','点击“连续推进 5 分钟”，先查看岗位变化如何影响接续，再决定继续观察的长度。','运行前若有未应用的岗位修改，需先应用配置；同终点完成后才评价经营改善。',['lab:advance']),
  step('pause','暂停，检查局部效果','点击暂停，或等待所选目标自动暂停。对照当前与基准的同一时段。','改善可能先出现在局部；不要把进行中的交付量直接和360分钟基准相减。',['lab:pause']),
  step('legend','用图例筛选比较对象','点击折线／柱状图下方的设备图例，可同时隐藏或显示该设备的当前和基准系列；再点一次即可恢复。','临时筛选只帮助阅读；持久的设备选择请在“设置”中修改。',['lab:legend']),
  step('inspect','查一个具体数据点','点击对照图中的柱子、数据点或状态段，读出数值、时间和对象；必要时定位当前现场。','同时核对等待、完成量与成本，避免只凭“设备更忙”判断配置更好。',['lab:plot']),
  step('export','导出一张图的依据','点击“下载记录 CSV”，查看当前图表的实际区间和设备数据。页面下方还可下载整份实验JSON与结果CSV，或载入JSON复盘。','JSON保留指令、图表和发现；载入时重新计算现场。CSV用于进一步核对数据。',['lab:chart-export']),
  step('finish','运行到统一终点','继续推进，或使用快算，直至第360分钟。此时下方对照表才计算当前试验相对基准的交付与成本差异。','下一次试验起由你自主选岗位、图表和时段；保存满3次后仍可继续重开。',['lab:endpoint','lab:quick']),
  step('finding','保存本次发现，开始自主试验','简写本次发现：改了什么、结果如何、下一次准备验证什么。点击“保存本次试验”或“保存并建立下一试验”。','每次试验独立保留发现；相同岗位也可重复验证。简短记录即可，不要求得到预设结论。',['lab:finding','lab:submit']),
];

export function labCoachPhase(book:Notebook){return book.run.lesson!==11||!book.learning||currentTrialSaved(book)?null:book.run.kind==='baseline'?'baseline':trialNumber(book)===1?'trial':null;}
export function labCoachState(book:Notebook,playing:boolean){
  const phase=labCoachPhase(book),steps=phase==='baseline'?baseline:phase==='trial'?trial:[];
  const completed=new Set(book.learning?.guide.completed??[]);
  if(book.run.terminal.minute>book.run.checkpoint){completed.add('run');if(!playing)completed.add('pause');}
  if(portLabFinished(book.run))completed.add('finish');
  if(currentTrialSaved(book))completed.add('finding');
  return {phase,steps,completed:steps.filter(s=>completed.has(s.id)).length,current:portLabFinished(book.run)?steps.find(s=>s.id==='finding')??null:steps.find(s=>!completed.has(s.id))??null};
}
/** Progress records actual UI actions; the coach never issues a simulation command. */
export function recordLabCoachEvent(book:Notebook,event:LabCoachEvent):Notebook{
  const phase=labCoachPhase(book);if(!phase)return book;
  if(event.kind==='pause'&&book.run.terminal.minute<=book.run.checkpoint)return book;
  const ids=event.kind==='chart'?(phase==='baseline'?['chart']:[...(event.chart.baseline&&event.chart.chart!=='timeline'?['compare']:[]),...(event.chart.window!=='all'?['window']:[])]):[event.kind];
  const guide=book.learning!.guide,completed=[...new Set([...guide.completed,...ids])];
  return completed.length===guide.completed.length?book:{...book,learning:{...book.learning!,guide:{...guide,completed}}};
}
