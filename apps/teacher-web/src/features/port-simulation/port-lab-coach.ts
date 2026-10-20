import {portLabFinished,type TerminalDispatch} from '@edu/port-simulation-core';
import {currentTrialSaved,trialNumber,type Notebook,type LabGuideTopic} from './port-class-notebook';
import type {PortAnalysisChart} from './port-analysis-config';
export const LAB_DISPATCH_FIELDS=[['craneOperators','岸桥操作员',4],['drivers','集卡司机',8],['yardOperators','场桥操作员',3],['gateClerks','闸口岗位',2],['technicians','技术岗位',2]] as const;
export const LAB_GUIDE_TOPICS=[['view','现场与倍速'],['charts','指标与图形'],['window','时间窗与分段'],['legend','图例与数据点'],['layout','分析台布局'],['export','导出与复盘']] as const;
export interface LabCoachStep {id:string;title:string;instruction:string;why:string;targets:string[];action?:'evidence'|'review'|'unchanged'|'finish-input'|'help-close';watch?:boolean}
export type LabCoachEvent={kind:'intro'|'camera'|'resource'|'add-chart'|'locate'|'speed'|'run'|'pause'|'inspect'|'details'|'layout'|'legend'|'export'|'apply'|'evidence'|'review'|'unchanged'}|{kind:'dispatch'|'choose-dispatch';field?:keyof TerminalDispatch}|{kind:'chart';chart:PortAnalysisChart}|{kind:'help';topic:LabGuideTopic};
export interface LabCoachContext {draftDispatch?:TerminalDispatch;editingDispatch?:boolean}
export interface LabCoachUI {editorOpen:boolean;editorMetric:string;editorChart:string;editorBaseline:boolean;pointAvailable:boolean;seriesHidden:boolean;inspectionVisible:boolean;settingsAvailable:boolean;chartAvailable:boolean;findingFocused?:boolean;advancedOpen?:boolean}
const step=(id:string,title:string,instruction:string,why:string,targets:string[],extra:Partial<LabCoachStep>={}):LabCoachStep=>({id,title,instruction,why,targets,...extra});
export function labDispatchChanges(from:TerminalDispatch,to:TerminalDispatch){return LAB_DISPATCH_FIELDS.filter(([key])=>from[key]!==to[key]).map(([key,label])=>`${label} ${from[key]}→${to[key]}`);}
export function labCoachPhase(book:Notebook){return book.run.lesson!==11||!book.learning||currentTrialSaved(book)?null:book.run.kind==='baseline'?'baseline':trialNumber(book)===1?'trial':null;}
export function labGuideVisible(book:Notebook){return !!book.learning&&!book.learning.guide.hidden&&(labCoachPhase(book)!==null||(book.learning.guide.topic??'core')!=='core');}
function helpStep(topic:LabGuideTopic):LabCoachStep{
 const end={action:'help-close' as const};
 switch(topic){
  case 'view':return step('help-view','现场与倍速','切换岸侧、堆场或闸口视角，再按需要调整倍速。1×适合看动作，高倍速适合取得长时段记录。','镜头和倍速不改变岗位、货量或逐箱规则。',['lab:camera','lab:speed'],end);
  case 'charts':return step('help-charts','按问题选择指标与图形','添加图表或打开已有图的设置。状态图追查等待，占用率看时间分配，完成量看实际交接，周期与库存补充解释。','图表设置改变观察方式，岗位配置才改变运行条件。',['lab:add-chart'],end);
  case 'window':return step('help-window','用同一时间窗核查变化','打开图表设置，选择全部、最近30分钟或指定区间，再选择分段。当前与基准应使用相同区间。','若暂无数据，选择已运行区间；原始记录不会被删除。',['lab:chart-settings'],end);
  case 'legend':return step('help-legend','筛选后，知道如何恢复','点击图例可隐藏或显示系列。隐藏后可用“显示全部系列”恢复，再点数据点或展开数值表核查。','没有可见系列时，不会要求你点击空白图形。',['lab:legend'],end);
  case 'layout':return step('help-layout','整理自己的分析台','可展开宽图、复制或调整顺序。状态、占用、交接量和库存可并排保留；移除图表不会删除记录。','先保留能回答问题的图。最多12张图。',['lab:chart-layout'],end);
  case 'export':return step('help-export','保存可核查的依据','图表CSV记录所选对象和区间；整份JSON保留指令、图表与发现，载入时重新计算现场。','导出到本机不等于平台已收到；换电脑前请下载JSON。',['lab:chart-export','lab:report-export'],end);
  default:return step('help-core','回到实验主线','按当前阶段继续观察、验证与复盘。','重置本次保留结果；从基准新开会另存当前练习。',['lab:advance'],end);
 }
}
/** The coach follows actual state and never issues simulation commands. */
export function labCoachState(book:Notebook,playing:boolean,context:LabCoachContext={}){
 const phase=labCoachPhase(book),topic=book.learning?.guide.topic??'core';
 const stages=phase==='baseline'?['原配置观察','添加图表','读取证据','统一终点','保存基准']:phase==='trial'?['选择改动','应用岗位','运行观察','同段对照','终点评审','保存发现']:[];
 const result=(current:LabCoachStep|null,completed=0)=>({phase,steps:stages,completed,current});
 if(book.run.lesson!==11||!book.learning)return result(null);
 if(topic!=='core'){const help=helpStep(topic);return {...result(topic==='charts'&&book.analysis.charts.length>=12?{...help,instruction:'已到12张图的上限。点击已有图的设置，修改指标与图形；也可先移除不需要的图。',targets:['lab:chart-settings']}:help),steps:['专题帮助']};}
 if(!phase)return result(null);
 const r=book.run,g=book.learning.guide,seen=(id:string)=>g.revision===2&&g.completed.includes(id),finished=portLabFinished(r),elapsed=r.terminal.minute-r.checkpoint,observed=elapsed>=5;
 const base=book.baseline?.terminal.setup.dispatch??r.terminal.setup.dispatch,applied=labDispatchChanges(base,r.terminal.setup.dispatch),draft=context.draftDispatch??r.terminal.setup.dispatch,pending=labDispatchChanges(r.terminal.setup.dispatch,draft),field=g.dispatchField;
 if(playing)return result(step('watch','观察正在发生的作业',observed?'继续观察现场、队列与交付；到所选目标会自动暂停，需要细看时也可自行暂停。':'先观察至少5模拟分钟：车辆在运输、接箱，还是等待交接？达到目标会自动暂停。','运行中不修改岗位。暂停保留当前任务。',['lab:scene','lab:live','lab:pause'],{watch:true}),seen('evidence')?(phase==='baseline'?3:4):phase==='baseline'?0:2);
 if(phase==='trial'&&elapsed>0&&!applied.length&&!seen('unchanged'))return result(step('recover-dispatch','本轮已经运行，岗位已锁定','要改变人员，请“重置本次实验”回到第120分钟，记录会保留；也可明确保留本轮，作为原配置重复验证。','当前没有已应用的岗位差异，不能描述为人员改善试验。',['lab:reset'],{action:'unchanged'}));
 if(phase==='trial'&&elapsed===0){
  const invalid=LAB_DISPATCH_FIELDS.find(([key,,max])=>!Number.isInteger(draft[key])||draft[key]<0||draft[key]>max);
  if(invalid)return result(step('invalid-dispatch','先把人数填入允许范围',`${invalid[1]}应为0—${invalid[2]}的整数。`,'修改后再完成输入并应用。',[`lab:dispatch-${invalid[0]}`]));
  if(pending.length){const key=field??LAB_DISPATCH_FIELDS.find(([key])=>draft[key]!==r.terminal.setup.dispatch[key])![0];return result(context.editingDispatch?step('dispatch-edit','完成人数输入，再确认应用',`当前草稿：${pending.join('；')}。完成后按Enter、Tab，或点击“完成输入”。`,'只有应用后才改变本轮岗位。',[`lab:dispatch-${key}`],{action:'finish-input'}):step('apply','把岗位草稿应用到本轮',`草稿变化：${pending.join('；')}。点击“应用岗位配置”，再核对实际变化。`,'开跑前可反复增减并重新应用，不限制调整次数。',['lab:apply']),1);}
  if(!applied.length&&!field)return result(step('plan','先从基准发现选择验证方向','回顾基准的等待现象，再在“本次准备调整的岗位”中选择一个岗位。此时才开始设计人员变化。','选择不会自动修改人数，也没有预设最佳配置。',['lab:choose-dispatch']));
  if(!applied.length){const label=LAB_DISPATCH_FIELDS.find(([key])=>key===field)![1];return result(step('dispatch',`修改${label}人数`,`在高亮框中修改${label}，说明希望改善哪类等待。完成输入后再应用。`,'相同检查点、设备与货量，便于比较。',[`lab:dispatch-${field}`]));}
 }
 if(!observed)return result(step(elapsed?'resume':'run',phase==='baseline'?'先运行原配置，观察5分钟':'岗位已应用，先运行观察',phase==='baseline'?(elapsed?'请继续推进，累计观察至少5分钟。原岗位保持固定。':'点击“连续推进5分钟”。先看现场，有实际记录后再添加第一张图表。'):(elapsed?'继续观察至少5模拟分钟，再和基准同期比较。':`已应用：${applied.join('；')||'原配置重复验证'}。点击“连续推进5分钟”。`),'倍速只改变观看速度。先看到现象，再选择图表。',[elapsed?'lab:continue':'lab:advance']),phase==='baseline'?0:2);
 if(finished&&book.learning.current.finding.trim())return result(step('finding','保存本次发现与真实结果','核对发现引用了实际观察，再点击保存。发现会随独立场次保留。','如实记录改善、代价或未解决问题。',['lab:submit']),stages.length-1);
 if(!book.analysis.charts.length)return result(step('chart','用已有记录添加第一张图','已有实际作业记录。可先换分析设备，再点击“为所选设备添加图表”。','先看状态与等待，更多指标可以稍后学习。',['lab:add-chart']),1);
 if(phase==='trial'&&!book.analysis.charts.some(c=>c.baseline&&['occupancy','output','inventory'].includes(c.metric)&&['bar','line'].includes(c.chart)))return result(step('compare','为同一时段建立对照图','添加一张图，或设置已有图。选择分时段占用率或交接量，并叠加已保存基准。','先比较已运行的同一时段；最终判断要等统一终点。',book.analysis.charts.length>=12?['lab:chart-settings']:['lab:add-chart','lab:chart-settings']),3);
 if(!seen('inspect')&&!seen('details'))return result(step('inspect','点一条真实数据，读清发生了什么','点击状态段、柱子或数据点，读取对象、时间与数值。没有可点击图形时可展开数值表。','把占用拆成作业、等待和接续，再解释。',['lab:plot-point','lab:numbers']),phase==='baseline'?2:3);
 if(!seen('evidence'))return result(step('evidence','先读证据，再继续运行',phase==='baseline'?'读这条状态或数值说明：它支持哪种等待判断？记录观察，再继续基准。':'读当前与基准的同段数据：哪项变化，哪项仍未改善？局部结果还不是最终结论。','点击只是打开证据，读懂后再进入下一步。',['lab:inspection','lab:numbers'],{action:'evidence'}),phase==='baseline'?2:3);
 if(!finished)return result(step('finish','继续到统一第360分钟','点击“连续运行至终点”，也可用快算取得终态。最终比较使用同一观察终点。','中途暂停可以继续，不必重来。',['lab:endpoint','lab:quick']),phase==='baseline'?3:4);
 if(phase==='trial'&&!seen('review'))return result(step('review','把改善与代价一起评审','核对对照表中的交付、等待、成本和未交付。指出一项改善、一项代价或未解决的问题。','软件展示实际差异，经营建议需要证据解释。',['lab:results'],{action:'review'}),4);
 return result(step('finding',phase==='baseline'?'写下基准发现，再进入首次试验':'记录发现，再开始自主试验','写1—2句，说明观察到了什么、下一步验证什么，然后保存。','重置无需填写；保存或进入下一试验需要独立发现。',['lab:finding','lab:submit']),stages.length-1);
}
export function resolveLabCoachStep(s:LabCoachStep|null,u:LabCoachUI):LabCoachStep|null{
 if(!s)return null;
 if(s.id==='finding'&&u.findingFocused)return {...s,targets:['lab:finding']};
 if(['chart','compare','help-charts','help-window'].includes(s.id)&&u.editorOpen){
  if(s.id==='help-window')return u.advancedOpen?{...s,targets:['lab:chart-window','lab:chart-bin']}:{...s,title:'展开时间窗与分段设置',instruction:'点击“更多图表设置”，再选择观察范围与统计分段。',targets:['lab:chart-advanced']};
  if(s.id==='help-charts')return u.editorMetric==='state'&&!u.advancedOpen?{...s,targets:['lab:chart-advanced','lab:chart-metric']}:{...s,targets:['lab:chart-metric','lab:chart-type']};
  if(s.id==='compare'&&!['occupancy','output','inventory'].includes(u.editorMetric))return {...s,id:'compare-metric',title:'选择能作同期对照的指标',instruction:'选择分时段任务占用率或完成交接量，再核对图形。',targets:['lab:chart-metric']};
  if(s.id==='compare'&&!u.editorBaseline)return {...s,id:'compare-baseline',title:'把已保存基准叠加进来',instruction:'勾选“叠加已保存基准”，两组使用相同对象、刻度和区间。',targets:['lab:chart-baseline']};
  return {...s,id:s.id+'-save',title:'核对后保存这张图',instruction:s.id==='chart'?'保留状态时间轴和所选设备，点击“保存图表配置”。更多设置稍后展开。':'核对指标、图形与基准叠加后，点击“保存图表配置”。',targets:['lab:chart-save']};
 }
 if(s.id==='inspect'&&u.seriesHidden&&!u.pointAvailable)return {...s,id:'restore-series',title:'先恢复可见的数据系列',instruction:'图例已隐藏数据。点击“显示全部系列”，再选择数据点。',why:'空白图形不代表没有实际记录。',targets:['lab:legend-restore']};
 if(s.id==='inspect'&&!u.pointAvailable)return {...s,id:'inspect-numbers',title:'暂无可点击图形，先读数值',instruction:'展开“查看数值与统计口径”，核对对象和区间，也可更换对象或时间窗。',targets:['lab:numbers']};
 if(s.id==='evidence'&&!u.inspectionVisible)return {...s,id:'evidence-reopen',title:'重新打开一条证据说明',instruction:'刷新或更换场次后，点数据或展开数值表，再阅读解释。',targets:u.pointAvailable?['lab:plot-point']:['lab:numbers'],action:undefined};
 if(['help-window','help-layout','help-export','help-legend'].includes(s.id)&&!u.chartAvailable)return {...s,instruction:'先添加图表，再使用本专题功能；实际记录会保留。',targets:['lab:add-chart']};
 if(s.id==='help-legend'&&u.seriesHidden)return {...s,targets:['lab:legend-restore','lab:legend']};
 if(s.id==='help-legend'&&!u.pointAvailable)return {...s,targets:['lab:numbers','lab:chart-settings']};
 return s;
}
export function recordLabCoachEvent(book:Notebook,event:LabCoachEvent):Notebook{
 if(book.run.lesson!==11||!book.learning)return book;const g=book.learning.guide;
 if(event.kind==='help')return {...book,learning:{...book.learning,guide:{...g,revision:2,topic:event.topic,hidden:false}}};
 if(!labCoachPhase(book)&&event.kind!=='dispatch'&&event.kind!=='choose-dispatch')return book;
 const ids=event.kind==='details'?['details','inspect']:['inspect','evidence','review','unchanged'].includes(event.kind)?[event.kind]:[];
 const completed=[...new Set([...(g.revision===2?g.completed:[]),...ids])],dispatchField=(event.kind==='dispatch'||event.kind==='choose-dispatch')?event.field??g.dispatchField:g.dispatchField;
 if(g.revision===2&&JSON.stringify(completed)===JSON.stringify(g.completed)&&dispatchField===g.dispatchField)return book;
 return {...book,learning:{...book.learning,guide:{...g,revision:2,completed,...(dispatchField?{dispatchField}:{})}}};
}
