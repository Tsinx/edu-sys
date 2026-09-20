import {getLessonSixFilm,lessonSixFilmDuration,type LessonSixFilmState} from './port-lesson-six-film.js';
import type { PortManagementSlideSpec, PortLessonTimingBlock } from './index.js';

export const PORT_LESSON_SIX_TITLE = '箱子离船以后：堆场、集疏运与港口腹地';
export const PORT_LESSON_SIX_SOURCES = {
  'l6-model': {label:'教学模型 · 本课程编制',url:'/port-lesson-six-preview.html',date:'2026-09-19',boundary:'箱量、时序、费用与时间价值均为教学设定，非生产或报价数据。'},
  'l6-concept': {label:'概念图解 · 本课程编制',url:'/port-lesson-six-preview.html',date:'2026-09-19',boundary:'流程为概论教学抽象，不是现实提箱指令、完整口岸程序或工程设计。'},
  'l6-intermodal': {label:'交通运输部 · 多式联运概念（2017）',url:'https://xxgk.mot.gov.cn/jigou/ysfws/202006/t20200623_3315343.html',date:'2017-01-04',boundary:'仅据通知开头解释两种及以上方式衔接与全程一体化组织，不讲解现行经营准入或法律责任。'},
  'l6-groups': {label:'交通运输部 · 沿海港口布局规划（2006框架）',url:'https://xxgk.mot.gov.cn/2020/jigou/zhghs/202006/t20200630_3320031.html',date:'2006',boundary:'五大区域港口群作为空间认识框架，不代表最新港口项目清单或排他的腹地界线。'},
  'l6-shanghai': {label:'上港集团长江公司 · 派河航线资料（2025）',url:'https://changjiang.portshanghai.com.cn/gsxw/4689.jhtml',date:'2025-08-29',boundary:'支持合肥经内河通道联系上海港的公开案例；不代表当前船期或某一票货物实际路径。'},
  'l6-ningbo': {label:'宁波舟山港 · 海铁联运资料（2024）',url:'https://www.zjseaport.com/jtnews/222/626/202404/t20240423_3895957_ext.shtml',date:'2024-04-23',boundary:'支持浙江及河南平舆等内陆货源的海铁联运联系，不推定所有货物均走该通道。'},
  'l6-guoyuan': {label:'重庆市交通运输委 · 果园港联运资料（2024）',url:'https://jtysw.cq.gov.cn/sy_240/jdtp/202401/t20240104_12788140.html',date:'2024-01-04',boundary:'支持水富航线和西南、西北铁水联运联系；不把远洋船画入重庆，不声称班次仍保持不变。'},
  'l6-tianjin': {label:'天津港集团 · 集团简介（访问2026-09-19）',url:'https://www.ptacn.com/contents/12/40.html',date:'访问2026-09-19',boundary:'支持京津冀与三北门户定位；不同货类腹地不同，不使用页面宣传比例估算货流。'},
  'l6-qingdao': {label:'青岛政务网 · 沿黄联系资料（2024）',url:'https://www.qingdao.gov.cn/zwgk/xxgk/fgw/ywfl/jjfz/202403/t20240329_7934970.shtml',date:'2024-03-29',boundary:'支持青岛与西安、太原等沿黄地区的陆向联系；沿黄腹地不表示集装箱沿黄河航行到港。'}
} as const;
export type LessonSixSource = keyof typeof PORT_LESSON_SIX_SOURCES;
export type LessonSixVisual = 'scene'|'journey'|'flows'|'handoff'|'stack'|'balance'|'inventory'|'formula'|'timeline'|'gate'|'queue'|'map'|'comparison'|'routes'|'question'|'summary';
export interface PortLessonSixPage extends PortManagementSlideSpec {
  localPage:number; points:readonly string[]; teachingCue:string; assistantCue:string;
  visual:LessonSixVisual; source:LessonSixSource; reveal?:string; options?:readonly string[];
  animationSeconds?:number; answerHidden:boolean;
}
export interface LessonSixCamera {latitude:number;longitude:number;distance:number}
export interface LessonSixPresentation {progress:number;revealed:boolean;option:number;camera?:LessonSixCamera;cinematic?:LessonSixFilmState}
export const LESSON_SIX_DEFAULT:LessonSixPresentation={progress:0,revealed:false,option:0};
export function lessonSixStateValid(page:PortLessonSixPage,state:LessonSixPresentation):boolean {
  const c=state.camera;
  const validCamera=c===undefined||(page.visual==='map'&&c!==null&&Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=90&&Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180&&Number.isFinite(c.distance)&&c.distance>=1.45&&c.distance<=4);
  const film=getLessonSixFilm(page.localPage,state.option,state.revealed),v=state.cinematic;
  const validFilm=v===undefined||!!(film&&v&&v.clipId===film.id&&['paused','playing'].includes(v.status)&&Number.isFinite(v.elapsedMs)&&v.elapsedMs>=0&&v.elapsedMs<=lessonSixFilmDuration(film)&&typeof v.runId==='string'&&v.runId.length>0&&v.runId.length<=80&&(v.status==='paused'?v.startedAt===null:Number.isFinite(v.startedAt)&&v.startedAt!>0));
  return validFilm&&validCamera&&Number.isFinite(state.progress)&&state.progress>=0&&state.progress<=1&&typeof state.revealed==='boolean'&&(!state.revealed||!!page.reveal)&&Number.isInteger(state.option)&&state.option>=0&&state.option<(page.options?.length??1);
}
export function averageYardStock(arrivalsPerDay:number,dwellDays:number){return arrivalsPerDay*dwellDays;}
export function closingYardStock(opening:number,arrivals:number,departures:number){return opening+arrivals-departures;}
export const LESSON_SIX_ROUTES=[{id:'A',fee:3600,days:8},{id:'B',fee:4200,days:5}] as const;
export function routeGeneralizedCost(route:typeof LESSON_SIX_ROUTES[number],valuePerDay:number){return route.fee+route.days*valuePerDay;}
export function gateSchedule(arrivals:readonly number[],serviceMinutes=2){let free=0;return arrivals.map(arrival=>{const start=Math.max(arrival,free);free=start+serviceMinutes;return {arrival,start,end:free,wait:start-arrival};});}
const sections=['船走了，箱子还在','堆场与箱流','停留时间与积压','提箱与闸口','港口与腹地','典型港口的联系','出运路线的选择','交付与迁移'];
const ends=[4,10,18,24,30,38,44,48];
type Input={n:number;key:string;title:string;lead:string;points:string[];teaching:string;visual:LessonSixVisual;source?:LessonSixSource;reveal?:string;options?:string[];assistant?:string};
function p(v:Input):PortLessonSixPage {
  const source=v.source??'l6-concept',section=sections[ends.findIndex(e=>v.n<=e)]!;
  return {index:245+v.n,localPage:v.n,lesson:6,lessonTitle:PORT_LESSON_SIX_TITLE,slideKey:`l6-${v.key}`,section,kicker:'PORT HINTERLAND · 06',layout:'split',title:v.title,lead:v.lead,points:v.points,steps:v.points,visual:v.visual,source,sourceIds:[source],teachingCue:v.teaching,assistantCue:`${PORT_LESSON_SIX_SOURCES[source].boundary} ${v.assistant??''} 教师控制展开；只依据当前公开图层和选项解释，不引用后续页答案，不把课堂演示当作个人实验完成。`,answerHidden:!!v.reveal,reveal:v.reveal,options:v.options,animationSeconds:12,narrative:{location:'港内堆场—集疏运—腹地',voyageStage:section,storyBeat:v.reveal?'decision':'evidence',evidence:source==='l6-model'?'scenario':source==='l6-concept'?'concept':'documented',publicLabel:source==='l6-model'?'教学情境':source==='l6-concept'?'概念模型':'官方资料',progress:245+v.n}};
}

// Each slide is individually authored. Diagram steps follow these public observations.
export const PORT_LESSON_SIX_SLIDES:readonly PortLessonSixPage[]=[
p({n:1,key:'cover',title:'箱子离船以后',lead:'堆场、集疏运与港口腹地',points:['船已完成装卸。','箱子还在等待下一程。'],visual:'scene',teaching:'开场停留在港区全景。请回想第5讲关注的整船装卸终点，再把视线移到堆场中的一只箱子。今天追踪的是货物从港内暂存到腹地交付的过程。先问箱子还可能等谁，不急着列术语；本讲三个尺度是一个箱位、一段接续和一片货源联系。'}),
p({n:2,key:'ship-gone',title:'船离泊了，货物到了吗？',lead:'教学箱I-01已经卸下，目的地是一家内陆工厂。',points:['已卸船','仍在堆场','尚未交付收货人'],visual:'journey',source:'l6-model',teaching:'逐步点亮三个状态。船离泊只能确认船舶相关作业和离港条件，不能证明进口货物到厂。I-01是本讲新设教学箱，不与前讲C-01或仿真中的逐箱记录拼接。请学生指出还缺少哪一段运输与哪一次交接。'}),
p({n:3,key:'waiting-places',title:'一次交付，经过几处等待',lead:'从卸船到到厂，移动与等待交替发生。',points:['堆场等待具备提箱条件','车辆等待场内交接','货物等待下一班运输'],visual:'timeline',teaching:'沿时间带前进，区分正在移动和停着等待。停留可能来自单证与放行条件、收货安排、场内作业或班次衔接，不把所有停留都归为码头低效。让学生说出想核查的一条时间记录，随后用它解释如何确定改进对象。'}),
p({n:4,key:'finish-question',title:'增加岸桥，能缩短哪段时间？',lead:'进口箱已卸下，却还没有提箱安排。',points:['岸桥装卸段','堆场等待段','出港后的运输段'],visual:'question',reveal:'增加岸桥主要改变船岸装卸能力；已卸箱的提箱安排没有随之自动改变。应先核查箱子在等待哪项条件。',teaching:'保留三个时间段，请学生选择可能直接受影响的一段并说明条件。不要把增加岸桥说成毫无作用，也不要把船舶时间改善推广到货物全程。讨论后点击揭示解析，以等待原因引入堆场组织。'}),
p({n:5,key:'three-flows',title:'同在堆场，下一程不同',lead:'箱子的去向决定它需要接上哪一项作业。',points:['进口：船 → 场 → 陆侧提离','出口：陆侧集港 → 场 → 船','中转：来船 → 场 → 接续船'],visual:'flows',teaching:'逐条展开三个方向，用目的环节区分进口、出口和水水中转。中转箱未必经过陆侧闸口。冷藏、危险货物属于另一种属性分类，可与进出口方向重叠，不将它们列成互斥去向。请学生观察哪些资源会被不同箱流共同使用。'}),
p({n:6,key:'inside-outside',title:'场内运输与外集卡',lead:'集港把货物运到港口；疏港把货物运离港口。',points:['场内：连接岸桥和堆场作业点','外集卡：连接港区和收发货地','交接：核对箱号、任务与接收条件'],visual:'handoff',teaching:'指向岸桥至堆场的场内搬运，再指向堆场至港外的车辆。AGV只是场内水平运输的一种实现，其他码头也使用有人驾驶车辆。图中两个车的角色不可混同；在任何设备形式下，前一环节交出都需要后一环节能够接收。'}),
p({n:7,key:'yard-location',title:'箱位让一只箱子可被找到',lead:'堆存是货物在港内暂存；找到箱位以后，还要能够取出。',points:['区：箱子位于哪个作业区域','位：水平位置与堆叠层次','任务：下一次移动何时、去哪里'],visual:'stack',teaching:'把I-01标在下层。解释区、水平位置和层次是定位的基本维度，具体码头编码不同，本图不提供真实箱位代码。先要求学生找到目标箱，再问设备能否直接取出；把记住位置与能够高效取出分开。'}),
p({n:8,key:'rehandle',title:'提箱顺序与翻箱',lead:'翻箱：为提取目标箱而额外搬移遮挡箱。',points:['识别本次目标箱','检查是否受到上层箱遮挡','提取目标箱并完成交接'],visual:'stack',options:['先提下层I-01','先提上层I-02'],teaching:'切换两种提箱顺序，并用下一幕逐步展示取箱。先提下层时，上层需要一次临时搬移；先提上层则可以直接提走。这里固定两层和一个可用临时位，只演示翻箱原因，不用这个小图计算真实码头平均翻箱率。'}),
p({n:9,key:'yard-arrangement',title:'堆得下，还要取得出',lead:'箱位安排需要兼顾空间、作业顺序与特殊要求。',points:['接近提箱时间的箱子便于接近','不同去向与作业批次便于组织','冷藏、危险货物另有适配要求'],visual:'stack',teaching:'回到堆场整体，强调土地利用只是一个观察角度。取箱顺序、设备移动与特殊货物要求共同约束安排；不能为了少翻箱而忽略安全与设施适配。只介绍概念，不编造危险货物隔离距离、冷藏温度或现场规则。'}),
p({n:10,key:'yard-question',title:'场地相同，为什么取箱更慢？',lead:'两组箱子的数量相同，提箱顺序与堆叠顺序不同。',points:['比较目标箱的可接近性','数一数额外搬移动作','检查临时位置是否足够'],visual:'question',reveal:'箱数相同不意味着作业量相同。目标箱受到遮挡时，需要额外翻箱；顺序和临时位置会影响取箱时间。',teaching:'用上一页的两层箱图作为参照，让学生口头描述一次多出来的动作。揭示后只把差异归到本情境已固定的遮挡关系。过渡到下一段：即使每次取箱都很快，箱子停留许多天仍会占用场地。'}),
p({n:11,key:'stock-flow',title:'流量与在场箱量',lead:'“一天经过多少箱”和“此刻留着多少箱”是两个量。',points:['进入流量：箱/天','离开流量：箱/天','在场箱量：箱'],visual:'balance',teaching:'在堆场边界画出进入和离开箭头，中间标库存。用单位帮助学生辨认流量与存量，注意实体箱与TEU不能直接相加。我们随后全部使用实体箱；不同尺寸也都按一只实体箱计数，不把它直接当作实际场地占用面积。'}),
p({n:12,key:'conservation',title:'一天结束，场里剩多少箱？',lead:'期初3,000箱；当天进入1,000箱，离开800箱。',points:['先确定同一个堆场边界','把进入量加到期初','再扣除真正离开的箱子'],visual:'balance',source:'l6-model',reveal:'期末在场箱量＝3,000＋1,000－800＝3,200箱。当天净增加200箱。',teaching:'请学生先独立算，再点击解析核对3,200。进入和离开必须在同一日、同一场界统计。场内换位没有跨越边界，不会改变总在场箱量；同一箱翻一次也不能重复计作入场。'}),
p({n:13,key:'dwell-clock',title:'停留时间从哪一刻开始？',lead:'本讲堆场口径：入场记录 → 出场交接记录。',points:['每只箱都有自己的起止时刻','平均值需要同一统计口径','观察窗口内未离开的箱子仍占位'],visual:'timeline',teaching:'点亮入场和离开端点，说明港口停留、堆场停留和车辆周转使用不同边界。本讲只谈所定义的堆场边界。若只计算已离开的箱子，长期未离场箱可能被遗漏；此处提出观察边界，不讲生存分析。'}),
p({n:14,key:'three-days',title:'每天1,000箱，平均停留3天',lead:'流量与存量稳定时，可以连接这两个平均量。',points:['日均进入：1,000箱/天','平均停留：3天','平均在场：约3,000箱'],visual:'inventory',source:'l6-model',teaching:'逐层显示三个日均箱群，每组代表1,000箱，不是某天真实堆位。解释平均在场量约等于平均日流量乘平均停留时间；要求长期稳定、边界一致且系统没有持续积压。这个关系用于解释，不直接给出工程所需场地面积。'}),
p({n:15,key:'five-days',title:'停留延长，会多留多少箱？',lead:'日均流量相同，比较两个稳定情境。',points:['情境A：平均停留3天','情境B：平均停留5天','比较长期平均在场箱量'],visual:'inventory',source:'l6-model',options:['平均3天','平均5天'],reveal:'平均在场箱量由约3,000箱变为约5,000箱，相差2,000箱。这是两个稳定情境的比较，不是切换条件后库存瞬间增加。',teaching:'先切换3天与5天，让学生根据前页关系预测差额，再揭示。图中每组表示1,000箱的教学箱群，先比较组数，再揭示总量与差额；不把箱群图当作实际堆场容量。重复说明不是实时仿真，不把两种稳态画成同一天跳变的库存。'}),
p({n:16,key:'transition',title:'积压是怎样一天天形成的？',lead:'从3,000箱开始，每天进入1,000箱、离开800箱。',points:['第1天净增加200箱','第2天继续净增加200箱','只要进多出少，箱量仍会增长'],visual:'balance',source:'l6-model',teaching:'逐日展开3,200、3,400、3,600箱的收支。持续净流入的过程不满足稳态条件，不能直接套平均停留公式宣称已经达到5,000箱稳态。要想积压停止增长，需要重新让进入与离开相匹配。'}),
p({n:17,key:'reduce-dwell',title:'缩短停留，需要改变什么？',lead:'先追查等待原因，再选择干预位置。',points:['提箱条件迟迟未齐 → 核查信息与办理环节','车辆接续不及时 → 协调提箱安排','场内取箱等待长 → 检查作业顺序与资源'],visual:'handoff',teaching:'这里提出候选机制，不说每个港口都存在这些问题。让学生把一项干预与一类记录对应：条件生效时间、车辆预约或到达时间、取箱开始时间。降低平均停留也可能把库存推向港外仓库，随后要检查全程影响。'}),
p({n:18,key:'stock-question',title:'箱量下降，就能证明服务改善吗？',lead:'某天在场箱量减少，但进入量也同时减少。',points:['离开量有没有增加？','同批货物的停留有没有缩短？','等待有没有转移到港外？'],visual:'question',reveal:'不能仅凭库存下降确认服务改善。应同时检查进入、离开、同口径停留时间及港外等待，区分需求减少与组织改善。',teaching:'这是一个反证练习。库存减少可能只是货源减少，不一定说明服务更快。收集两种解释再公开结论，用同口径数据判断机制，避免把一个好看的数字当成全部绩效。'}),
p({n:19,key:'pickup-ready',title:'车到门口，箱子能提吗？',lead:'车辆、货物条件与作业任务，需要在交接时接上。',points:['货物具备适用的提离条件','车辆与提箱任务对应','场内能够安排取箱和交接'],visual:'gate',teaching:'依次点亮三项条件。手续要求随业务和口岸而变，本图不列现实法定审批清单，也不把提交等同于生效。请学生判断只让车早到会改变什么；如果箱子还不能提，等待可能移到闸口外。'}),
p({n:20,key:'gate-queue',title:'六辆车，同一条服务通道',lead:'每辆服务2分钟，所有箱子均已具备提箱条件。',points:['同批6辆车','同一服务能力','只改变车辆到达时刻'],visual:'queue',source:'l6-model',options:['每2分钟到1辆','6辆同时到达'],teaching:'先确认控制变量：服务点每次只处理一辆，服务固定2分钟，货物和交接条件已满足。切换均匀到达和集中到达，按时间带观察排队。用这个小模型检验到达节奏，不冒充整个码头复杂闸口的实测结果。'}),
p({n:21,key:'gate-wait',title:'忙碌时间相同，等待呢？',lead:'两种到达方式都要完成12分钟服务。',points:['均匀到达：逐车接上服务','同时到达：后车依次等待','平均等待按全部6辆计算'],visual:'queue',source:'l6-model',options:['每2分钟到1辆','6辆同时到达'],reveal:'均匀到达平均等待0分钟；同时到达的等待为0、2、4、6、8、10分钟，平均5分钟。服务忙碌时间均为12分钟。',teaching:'让学生先算集中到达的后两辆，再合计30除以6。不要把每辆2分钟服务误算进等待。解析说明相同忙碌时间可以对应不同等待；固定服务能力与全部可提条件是结论的前提。'}),
p({n:22,key:'appointment',title:'预约怎样帮助接续？',lead:'安排到达时段，也要核查该时段能接住多少任务。',points:['预计到达与可服务能力对齐','临时变化及时调整','堆场取箱与闸口交接同步检查'],visual:'gate',teaching:'预约的作用在于协调，不保证消除全部排队。车辆可能迟到，任务可能变化，场内还可能受阻。把预约时段当作一项计划，与实际到达、开始作业和离开记录对照；不提出当前平台已具备预约系统的说法。'}),
p({n:23,key:'handover-window',title:'错过一班，等待可能更长',lead:'多式联运：衔接两种及以上运输方式，组织全程货物运输。',points:['货到节点','完成换装准备','接上可用班次'],visual:'timeline',source:'l6-intermodal',teaching:'画一条班次发车线，货物到站不等于已经赶上班次，还要完成必要作业。可以减少一段驾驶时间却仍错过发车；全程时间要包含节点等待。图中班次不引用真实时刻表，留到腹地部分解释内陆节点的功能。'}),
p({n:24,key:'half-review',title:'这次等待，应该从哪里查起？',lead:'船舶装卸提前结束，进口箱到厂时间却没有变化。',points:['查箱子的入场与提离时刻','查车辆和下一班运输的接续','比较同一交付终点'],visual:'question',reveal:'沿货物时间链逐段核查，识别节省的时间是否被堆场或接续等待抵消。船舶作业改善可以成立，货物交付改善仍需另证。',teaching:'上半讲收束，给一分钟自行写两项要查的记录，再揭示。45分钟到此结束。课间后把尺度从港区拉向地图：接走货物的地区和通道，就是理解港口腹地的起点。'}),
p({n:25,key:'hinterland',title:'港口服务的货源与市场在哪里？',lead:'腹地：通过运输联系，由港口服务的内陆经济区域。',points:['出口货物从哪里来','进口货物向哪里去','哪些通道把两端连接起来'],visual:'map',teaching:'地图先亮海港，再亮内陆节点，最后连线。用进出口两个方向说明腹地既有货源也有消费或生产市场。距离只是联系条件之一，还要看货种、费用、时效与服务。画面不画行政归属边界，强调联系对象而非圈地。'}),
p({n:26,key:'port-groups',title:'中国沿海港口群的空间位置',lead:'以五大区域港口群框架认识沿海门户。',points:['环渤海 · 大连、天津、青岛','长三角 · 上海、宁波舟山','东南沿海 · 福州、厦门','珠三角 · 广州、深圳','西南沿海 · 湛江、北部湾'],visual:'map',source:'l6-groups',teaching:'先让学生在图上定位长江口，再向北与向南认识五大区域。注明这是2006布局规划的区域框架，用于定位，不充当最新建设项目清单。图中只选代表港口，并非完整名单；重庆果园港是内河节点，不列入沿海港口群。'}),
p({n:27,key:'direct-extended',title:'腹地联系可以延伸到更远处',lead:'港口附近的直接联系，可通过干线与内陆节点向外延伸。',points:['近域：公路衔接周边工厂与市场','远域：铁路或内河连接内陆节点','末端：节点再连接具体收发货地'],visual:'map',teaching:'在同一张底图上由近到远展开联系。直接腹地和延伸腹地是本讲用于认识联系尺度的概念，不等于按固定公里数划分。内陆港站可以组织集货、换装和相关服务，但每个节点提供的功能仍需具体核实。'}),
p({n:28,key:'three-modes',title:'公路、铁路与水路怎样分工？',lead:'方式选择需要同时考虑货量、通达性与接续。',points:['公路：联系具体收发货点，组织灵活','铁路：依托站点和班次组织干线运输','内河：依托可通航水系与港口组织水运'],visual:'comparison',teaching:'避免用水运永远最便宜、铁路永远最准时等绝对判断。三种方式需要连同起终点接驳、换装和等待一起比较。不要画一条水线从任何内陆城市直通海港，通航水系和船型条件始终是约束。'}),
p({n:29,key:'overlap',title:'同一货源地，可以联系不同港口',lead:'腹地可能重叠，服务条件会改变货物的选择。',points:['距离与接驳费用','航线、班次与接续等待','时效要求与服务可靠性'],visual:'map',options:['显示联系方向','叠加两种选择'],teaching:'用一个内陆节点连向两个沿海门户，明确这里只表示可以比较的方向，不承诺某条具体货运产品存在。学生应能解释重叠来自网络选择，而非两条行政边界冲突。选项只展开联系，不自动给出推荐港口。'}),
p({n:30,key:'hinterland-question',title:'离得最近，就一定选这个港吗？',lead:'最近的港口缺少适合的接续班次，另一个港口有稳定服务。',points:['总运输费用如何变化？','到达后还要等待多久？','货主能接受多大的延误？'],visual:'question',reveal:'最近距离只是一项条件。应比较完整接续、费用、交付时间与可靠性；在这些条件不同的情况下，较远港口也可能被选择。',teaching:'先让学生选择还需要补充的数据，不允许只凭地图距离判断最优。揭示后把一般概念带入真实案例：接下来每个港都用节点、通道和货源联系解释，不背排他的省份清单。'}),
p({n:31,key:'shanghai',title:'上海港：沿江货流接上海运',lead:'长江沿线节点把内陆货源与长江口门户连接起来。',points:['位置：长江口的沿海门户','通道：沿江支线与内陆节点接续','案例：合肥地区货物经派河通道联系上海'],visual:'map',source:'l6-shanghai',teaching:'先定位上海，再沿长江向内陆回看。公开资料支持派河联系上海的案例；合肥位于支流水网联系中，不能画成直接坐落长江干流岸边。资料说明连接存在，不说明任意一票货物都走该线，也不保证此刻的班次和价格。'}),
p({n:32,key:'ningbo',title:'宁波舟山港：铁路延伸内陆联系',lead:'海铁联运把内陆集货节点与海港连接。',points:['位置：浙江沿海','通道：内陆港站—铁路—海港','案例：河南平舆户外休闲产品的出海联系'],visual:'map',source:'l6-ningbo',teaching:'在地图上找到宁波舟山，再点亮浙江内陆和河南平舆。2024年资料回顾2017年平舆班列联系，用于说明非沿海县域也能进入海港运输网络。图线是联系示意，不标成精准铁路走向；不要推定所有当地产品都由此出口。'}),
p({n:33,key:'delta-compare',title:'相邻门户，连接方式各有侧重',lead:'上海与宁波舟山的公开案例展示了不同的内陆接续。',points:['上海案例：沿江与支流水网联系','宁波舟山案例：内陆港站与海铁联运','两港都具有多种集疏运方式'],visual:'map',options:['上海案例','宁波舟山案例','连贯对照'],source:'l6-shanghai',assistant:'本页另参考l6-ningbo资料。不能将案例差别推广为上海只走水路、宁波舟山只走铁路。',teaching:'切换两组连线，让学生说出各案例的节点和方式。本页同时引用上港派河资料与宁波海铁联运资料，图示仅选一个代表机制，不能形成排他的方式分类。保留腹地可能重叠的认识，解释竞争与合作都可能存在。'}),
p({n:34,key:'guoyuan',title:'重庆果园港：水、铁、公在内陆相接',lead:'内河港也能成为内陆货物组织和换装的节点。',points:['位置：重庆长江沿线','联系：西南及西北方向的内陆节点','接续：铁路、公路与长江水运'],visual:'map',source:'l6-guoyuan',teaching:'镜头移到重庆。引用2024年交通运输委资料中的水富航线和铁路联系，解释果园港既可服务周边也可集并更远地区货流。重庆不是海港，远洋船不能沿本图直接开入果园港；跨方式接续要在相应港站完成。'}),
p({n:35,key:'river-sea',title:'内陆节点与海港，处在同一条链上',lead:'重庆—长江—沿海门户，是一种江海接续的教学示意。',points:['内陆组织：集货、到港或到站','沿江运输：使用适配内河条件的船舶','沿海换装：接续适合的海运服务'],visual:'map',source:'l6-guoyuan',teaching:'沿重庆、武汉、南京到上海展开线条，用换装标志区分内河船与远洋船。整条图是依据公开节点关系制作的教学路径，不对应某票真实货物。不要把图中的节点全部解释成必经停靠港，也不要把果园港承担所有重庆货流。'}),
p({n:36,key:'tianjin',title:'天津港：联系京津冀与更远腹地',lead:'公路、铁路和内陆节点，把北方货源连接到海港。',points:['位置：渤海西岸','近域：京津冀生产与消费联系','延伸：三北地区的陆向运输网络'],visual:'map',source:'l6-tianjin',teaching:'先定位天津和京津冀，再将示意线延伸到内蒙古方向。三北是东北、华北、西北的概括，不能理解为天津独占全部三北货流。集团简介覆盖多种货类，本讲不将其中综合吞吐比例套到集装箱上。'}),
p({n:37,key:'qingdao',title:'青岛港：沿黄地区的陆向联系',lead:'内陆港站与海铁联运，连接山东及更远货源地。',points:['位置：山东半岛沿海','案例节点：西安、太原','连接方式：陆向干线与港站接续'],visual:'map',source:'l6-qingdao',teaching:'引用2024年公开资料中的西安、太原合作和沿黄内陆联系。沿黄描述的是经济区域，不是箱子沿黄河航行到青岛；这里使用陆向运输线。天津与青岛腹地可能重叠，应比较具体货物条件，不在图上割出互斥的省域。'}),
p({n:38,key:'map-check',title:'把港口、腹地和通道连起来',lead:'观察图中编号，指出它们的联系特点。',points:['① 哪个节点位于长江上游？','② 哪个门户连接沿黄陆向货源？','③ 哪两个相邻门户可比较不同接续？'],visual:'map',reveal:'① 重庆果园港；② 青岛港；③ 上海港与宁波舟山港。说明通道时应分别核查水路、铁路和公路，不把腹地当行政归属。',teaching:'先显示编号位置而不显示答案名称。请学生用位置加一种通道回答，而不只报港名。揭示后将编号换成名称，核对重庆内河、青岛陆向联系和长三角相邻门户。没有在线提交或评分，教师根据口头回答调整讲解。'}),
p({n:39,key:'route-data',title:'同一票货物，两种出运方案',lead:'同一起讫点、同一种40英尺箱；费用与时间均按全程口径。',points:['A：3,600元/箱，8天','B：4,200元/箱，5天','运输报价不包含本题单列的时间成本'],visual:'routes',source:'l6-model',teaching:'明确这是独立的两方案教学表，不是上海或宁波舟山的实际报价。A和B的起终点、箱型和费用范围一致，给定全程天数已包含运输及接续等待。这里不让学生凭港名偏好作答，而是使用同口径条件进行比较。'}),
p({n:40,key:'time-value',title:'一天时间，对这票货值多少？',lead:'用教学时间成本，把交付时间纳入同一比较。',points:['广义成本＝运输费用＋时间成本','时间成本＝全程天数×每天价值','同一票货物使用同一个每天价值'],visual:'formula',source:'l6-model',options:['100元/箱·天','300元/箱·天'],teaching:'先解释每天价值是机会成本或库存时间成本的简化表达，不是码头收取的日费，更不是货物销售价格。切换100和300，只改变一个参数；不可同时偷偷改变班次、货量或运输费。可靠性尚未货币化，稍后另作讨论。'}),
p({n:41,key:'cost-low',title:'每天100元，哪种方案成本低？',lead:'把8天与5天分别放回同一个公式。',points:['A：3,600＋8×100','B：4,200＋5×100','先比较，再说明适用条件'],visual:'routes',source:'l6-model',reveal:'A为4,400元/箱，B为4,700元/箱。在本题时间价值100元/箱·天、其他条件相同的情况下，A低300元/箱。',teaching:'先给一分钟独立计算。揭示时逐项核对乘法的单位，再比较差额。A的天数更长但运输费更低，所以广义成本在这个参数下较低；结论只属于本题，不能说低价方案适合所有货物。'}),
p({n:42,key:'cost-high',title:'每天300元，判断会改变吗？',lead:'运输费和天数不变，只提高时间价值。',points:['A：3,600＋8×300','B：4,200＋5×300','检查节省的时间是否抵消价差'],visual:'routes',source:'l6-model',reveal:'A为6,000元/箱，B为5,700元/箱。在本题条件下，B低300元/箱。时间价值提高后，较快方案的优势增加。',teaching:'只切换每天价值到300。请学生在计算前预测方向，之后核对6,000和5,700。不要把预测正确等同于已理解；追问为什么节省3天的价值从300变为900，足以改变600元运费差的比较。'}),
p({n:43,key:'threshold',title:'两种方案，何时恰好相同？',lead:'B多付600元，却节省3天。',points:['价差：4,200－3,600','时间差：8－5','临界每天价值：价差÷时间差'],visual:'formula',source:'l6-model',reveal:'临界值为600÷3＝200元/箱·天。此时两方案均为5,200元/箱；低于该值A较低，高于该值B较低，前提是其余条件不变。',teaching:'用价差除以时间差推导阈值，比直接移项更易理解。揭示后让学生代回两个公式检查5,200。阈值是模型条件下的相等点，不是现实市场统一标准，也不能代替可靠性或合同交付约束。'}),
p({n:44,key:'reliability',title:'平均更快，还要检查什么？',lead:'需要稳定交付的货物，也关心延误与错过班次的风险。',points:['给定天数是平均值还是承诺？','延误后还有哪一班可以接续？','收货方能承受多大波动？'],visual:'timeline',teaching:'停止继续加公式，说明前面的模型没有提供概率分布，因此不能算预期延误成本或宣称B一定更可靠。真实决策应补充历史波动、服务承诺和备选接续。保留信息不足也是一种合理结论。'}),
p({n:45,key:'transfer',title:'港内快了两天，交付一定更早吗？',lead:'一种方案缩短港内停留，却增加港外仓库等待。',points:['两段是否使用相同起止时刻？','节省与新增等待各是多少？','货物到收货人的终点有没有改变？'],visual:'question',reveal:'应比较同一票货物、同一起点与交付终点的全程时间。港内改善可能成立，但若等待被转移，不能直接断言全程交付更早。',teaching:'将堆场和腹地两段重新接起来。请学生先画出前后两个时间链，再谈结论。不给定新增等待数值时，不能计算净改善；揭示的重点是核对边界和证据，而不是预设所有优化都会转移拥堵。'}),
p({n:46,key:'knowledge',title:'三个尺度，连成一条货物链',lead:'箱位决定怎样取；接续影响等多久；腹地说明服务谁。',points:['堆场：箱位、翻箱、在场箱量、停留时间','集疏运：公路、铁路、内河与节点交接','腹地：货源和市场联系，可延伸也可重叠'],visual:'summary',teaching:'回顾术语但不机械背定义。每列请学生说一个例子：下层箱提取、错过班次、内陆港站接上海港。知识目标要能定位和解释，分析目标要会比较口径，应用目标要能给出有条件的运输建议。'}),
p({n:47,key:'exit',title:'用一张小图解释你的选择',lead:'画出一个内陆节点与两个可比较的沿海门户。',points:['标出港口位置与运输方式','写出一项影响选择的条件','指出还缺少哪条证据'],visual:'question',reveal:'合格解释应同时包含节点、通道与条件。例如先核查可用接续，再比较同口径费用和时间；只有距离或港名不足以形成选择依据。',teaching:'留两分钟在纸上画图，不要求上传、组队或调用仿真。检查学生是否把远洋船画进重庆、是否把沿黄理解成黄河水运、是否把腹地划成行政独占区。解析只是评价标准，不提供唯一港口答案。'}),
p({n:48,key:'next-cargo',title:'换成矿石、原油或汽车呢？',lead:'货物改变，暂存设施与运输衔接也会改变。',points:['集装箱：箱位与提箱','散货：堆存与装卸适配','下一讲：货种与港口功能'],visual:'scene',teaching:'把本讲普通集装箱的边界明确下来。不同货种对设施、作业和安全有不同需求，留到第7讲展开。最后回到第一张港口全景：港口既要接住船交来的货，也要把货接入通往腹地的运输链，不声称第7讲课件已经建成。'})
];
export const PORT_LESSON_SIX_TIMING:readonly PortLessonTimingBlock[]=ends.map((end,i)=>({label:sections[i]!,purpose:sections[i]!,minutes:[8,12,15,10,12,13,12,8][i]!,slideStart:246+(i?ends[i-1]!:0),slideEnd:245+end}));

/** Model-visible observations use the same step threshold as the classroom renderer. */
export function lessonSixVisiblePoints(page:PortLessonSixPage,progress:number){
  return page.points.slice(0,Math.min(page.points.length,Math.floor(Math.max(0,Math.min(1,progress))*page.points.length+1e-6)));
}
