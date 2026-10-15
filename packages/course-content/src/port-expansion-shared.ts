import {PORT_PERFORMANCE_SAFETY_SOURCES,PERFORMANCE_CASE,performancePerspective,safetyEvidenceGate,sampleDeliverySummary} from './port-performance-safety-models.js';
import {PORT_GOVERNANCE_SOURCES,concessionScenario,portChoiceScenario,storageScenario} from './port-governance-models.js';
import type {PortManagementSlideSpec,PortLessonTimingBlock} from './index.js';

export const PORT_EXPANSION_SOURCES = {
  ...PORT_GOVERNANCE_SOURCES,
  ...PORT_PERFORMANCE_SAFETY_SOURCES,
  'pe-concept':{label:'本课程 · 概念图解',url:'/port-expansion-preview.html',date:'2026-09-21',boundary:'示意图不按比例，不作为作业指令或工程设计。'},
  'pe-model':{label:'本课程 · 教学情境',url:'/port-expansion-preview.html',date:'2026-09-21',boundary:'货量、能力、费用和地图均为独立教学设定，非实港数据、报价或投资建议。'},
  'pe-bulk':{label:'PEMP · 干散货与液体散货',url:'https://porteconomicsmanagement.org/pemp/contents/part5/bulk-breakbulk-terminal-design-equipment/',date:'访问2026-09-21',boundary:'教材用于解释工艺关系；不同货物和码头的设备与操作条件需另行核查。'},
  'pe-roro':{label:'PEMP · 滚装运输',url:'https://porteconomicsmanagement.org/pemp/contents/part5/automotive-roro-markets/',date:'访问2026-09-21',boundary:'只解释滚装工艺与空间组织，不提供装载、系固或坡道操作参数。'},
  'pe-terminal':{label:'鹿特丹港务局 · 多货种码头',url:'https://www.portofrotterdam.com/en/logistics/storage-and-transhipment/terminals',date:'访问2026-09-21',boundary:'港方资料支持业务类型存在，不据此推定效率排名或所有设施可互换。'},
  'pe-breakbulk':{label:'鹿特丹港务局 · 件杂货与项目货',url:'https://www.portofrotterdam.com/en/logistics/cargo/breakbulk',date:'访问2026-09-21',boundary:'用于识别钢材、林产品及重大件业务；不推定具体吊装能力。'},
  'pe-reefer':{label:'鹿特丹港务局 · 冷藏箱服务',url:'https://www.portofrotterdam.com/en/logistics/cargo/containers/reefer-containers',date:'访问2026-09-21',boundary:'支持冷藏箱的配套服务需求，不引用随时间变化的插座数量或货物统一温度。'},
  'pe-imo':{label:'IMO · 货物安全规范入口',url:'https://www.imo.org/en/ourwork/safety/pages/cargoes.aspx',date:'访问2026-09-21',boundary:'仅辨认包装危险货物、固体散货、液化气等规范适用对象，不代替现行条文和专业授权。'},
  'pe-imsbc':{label:'IMO · IMSBC Code说明',url:'https://www.imo.org/en/ourwork/safety/pages/cargoesinbulk-default.aspx',date:'访问2026-09-21',boundary:'仅说明部分固体散货的运输风险；不将全部散货认定为会液化，不提供限值或现场操作程序。'},
  'pe-generation':{label:'PEMP · 港口功能与空间演化框架',url:'https://porteconomicsmanagement.org/pemp/contents/introduction/defining-seaports/functional-spatial-development-seaport/',date:'访问2026-09-21',boundary:'采用UNCTAD及Flynn、Lee、Notteboom等研究的代际视角。第五代为客户与社区导向的研究框架，非统一认证或排行榜；各代能力可以共存。'},
  'pe-planning':{label:'PEMP · 港口规划与发展',url:'https://porteconomicsmanagement.org/pemp/contents/part11/port-planning-and-development/',date:'访问2026-09-21',boundary:'用于规划过程与适应性规划概念；课堂计算为独立编制，不是该教材提供的工程参数。'},
  'pe-city':{label:'PEMP · 港城关系',url:'https://porteconomicsmanagement.org/pemp/contents/part11/port-city-relationships/',date:'访问2026-09-21',boundary:'港城演变为分析视角，不宣称各港遵循相同时间表或必然搬迁。'},
  'pe-tuas':{label:'新加坡交通部 · 大士港规划（2026-08）',url:'https://www.mot.gov.sg/what-we-do/maritime/shaping-the-future-of-maritime-singapore/',date:'2026-08-25',boundary:'2040年代建成、6500万TEU/年为公开远期能力规划，不是已实现吞吐量。'},
  'pe-ura':{label:'新加坡URA · 中区规划（2025）',url:'https://www.ura.gov.sg/land-planning/master-plan/master-plan-2025/regional-plans/central-region/vibrant-city-living-for-all/',date:'访问2026-09-21',boundary:'港口整合与滨水更新是规划关系，不表示原港区已全部腾退或新用途已经完成。'}
} as const;
export type ExpansionSource=keyof typeof PORT_EXPANSION_SOURCES;
export type CargoKind='container'|'dry'|'grain'|'liquid'|'lng'|'roro'|'project'|'reefer'|'passenger';
export type ExpansionVisual='hero'|'terminal'|'chain'|'matrix'|'section'|'ledger'|'bars'|'network'|'map'|'generations'|'city'|'scenario'|'phases'|'decision'|'rights'|'contract'|'cashflow'|'choice'|'invoice'|'service'|'evidence'|'performance'|'sample'|'scorecard'|'barriers'|'incident'|'dependency'|'timeline'|'distribution'|'bowtie'|'recovery'|'lab'|'records';
export interface ExpansionFilmPresentation {clipId:'l11-opening-v2'|'l12-opening-v2';status:'paused'|'playing';elapsedMs:number;startedAt:number|null}
export interface ExpansionPresentation {progress:number;option:number;revealed:boolean;cinematic?:ExpansionFilmPresentation}
export const EXPANSION_DEFAULT:ExpansionPresentation={progress:0,option:0,revealed:false};
export interface PortExpansionPage extends PortManagementSlideSpec {
  lesson:7|8|9|10|11|12;localPage:number;visual:ExpansionVisual;points:readonly string[];source:ExpansionSource;
  cargo?:CargoKind;image?:string;labels?:readonly string[];rows?:readonly (readonly string[])[];
  values?:readonly number[];unit?:string;reveal?:string;options?:readonly string[];focus?:number;
  teachingCue:string;assistantCue:string;
}
const sectionEnds={7:[6,14,20,24,32,38,44,48],8:[6,12,18,24,30,36,42,48],9:[6,12,18,24,30,36,42,48],10:[6,12,18,24,30,36,42,48],11:[4,8,12,16,20,24,28,32],12:[4,8,12,16,20,24,28,32]} as const;
export function expansionTotal(lesson:7|8|9|10|11|12){return lesson>=11?32:48;}
export function expansionStart(lesson:7|8|9|10|11|12){return lesson===12?518:294+(lesson-7)*48;}
type PageInput={n:number;key:string;title:string;lead:string;points:string[];teaching:string;visual:ExpansionVisual;source?:ExpansionSource;cargo?:CargoKind;image?:string;labels?:string[];rows?:string[][];values?:number[];unit?:string;reveal?:string;options?:string[];focus?:number};
export const EXPANSION_TITLES={7:'货种改变，港口为什么必须跟着改变？',8:'港口如何演进，又该建在哪里、建多大？',9:'谁拥有港口，谁承担责任？',10:'港口怎样竞争、定价并赢得货源？',11:'港口绩效诊断与运营改善',12:'港口风险屏障与中断恢复'} as const;
const sections={7:['同一港湾，不同货物','干散货与粮食','液体散货与液化气','滚装与交付','重大件、冷链与客运','工艺比较','方案适配','综合判断'],8:['从旧码头到港口网络','第一至第三代能力','第四、第五代视角','港城空间演变','区位与约束','需求与规模','分期与触发','规划决策'],9:['同一港区，多种责任','资产与权利','四种治理组合','权利落实到主体','一份特许经营约定','风险与激励','监督与公共责任','变更、退出与决策'],10:['客户买的是什么','竞争发生在哪里','全程成本与时间','可靠性与约束','收费结构与成本','定价与客户差异','竞争响应与合作','价值主张与证据'],11:['一份好消息，三种结果','规模、效率与效果','指标的口径与证据','基准与比较边界','均值、波动与尾部','全程结果与局部改善','多目标与行为激励','评价建议与复核'],12:['赶船期的一次确认','危险、风险与屏障','屏障依赖与硬约束','责任与授权接口','安全、保安与应急','信息与物理作业','事件时间线与证据','恢复审查与责任']} as const;
const ADVANCED_SECTIONS={11:['新加坡拥堵的竞争解释','时间、能力与积压','可比样本与评价设计','实操A：预置现场与基准','实操B：同起点改善试验','从运行记录解释结果','经营评审与方案取舍','迁移、复核与提交'],12:['调查证据与信息中断','蝴蝶结与屏障依赖','业务影响与恢复目标','实操A：事件与备用流程','实操B：对账与恢复验证','恢复时点与积压轨迹','屏障、责任与连续性评审','证据交接与退出任务']} as const;
export function expansionPage(lesson:7|8|9|10|11|12,v:PageInput):PortExpansionPage {
  const source=v.source??(lesson>=11?'ps-concept':'pe-concept'),section=(lesson>=11?ADVANCED_SECTIONS[lesson as 11|12]:sections[lesson])[sectionEnds[lesson].findIndex(end=>v.n<=end)]!,index=expansionStart(lesson)-1+v.n;
  return {index,lesson,localPage:v.n,slideKey:`l${lesson}-${v.key}`,lessonTitle:EXPANSION_TITLES[lesson],section,kicker:`PORT STUDIES / ${String(lesson).padStart(2,'0')}`,layout:'split',title:v.title,lead:v.lead,points:v.points,visual:v.visual,source,sourceIds:[source],cargo:v.cargo,image:v.image,labels:v.labels,rows:v.rows,values:v.values,unit:v.unit,reveal:v.reveal,options:v.options,focus:v.focus,teachingCue:v.teaching,assistantCue:`${PORT_EXPANSION_SOURCES[source].boundary} 只解释已展开图层、当前选项和已揭示解析。不得复述未展开要点、教师稿或后续页答案。无学生记录时不能声称已提交或完成。`,narrative:{location:lesson===11?'港口绩效记录—交付结果—评价证据':lesson===12?'教学告警—责任接口—授权审查':lesson===7?'港湾—专业化码头—货物交接':lesson===8?'城市—港区—腹地网络':lesson===9?'港口资产—经营主体—权责接口':'客户交付任务—竞争路径—全程服务',voyageStage:section,storyBeat:v.reveal?'decision':'evidence',evidence:source==='ps-case'?'scenario':source==='ps-concept'?'concept':source==='pe-model'?'scenario':source==='pe-concept'?'concept':'documented',publicLabel:source==='ps-case'?'教学情境':source==='ps-concept'?'概念图解':source==='pe-model'?'教学情境':source==='pe-concept'?'概念图解':source==='pe-generation'?'研究框架':'公开资料',progress:index}};
}
export function expansionTiming(lesson:7|8|9|10|11|12):readonly PortLessonTimingBlock[]{
  const start=expansionStart(lesson),ends=sectionEnds[lesson];
  const minutes=lesson>=11?[8,12,13,12,18,12,9,6]:lesson===7?[9,15,12,9,16,11,12,6]:lesson===8?[9,12,12,12,11,12,12,10]:lesson===9?[9,12,12,12,12,12,11,10]:[9,11,13,12,12,11,12,10];
  const labels=lesson>=11?ADVANCED_SECTIONS[lesson as 11|12]:sections[lesson];
  return labels.map((label,i)=>({label,slideStart:start+(i===0?0:ends[i-1]!),slideEnd:start+ends[i]!-1,minutes:minutes[i]!,purpose:label}));
}
export function expansionStateValid(page:PortExpansionPage,s:ExpansionPresentation){
 const c=s?.cinematic;
 const expectedClip=page.slideKey==='l11-singapore-question'?'l11-opening-v2':page.slideKey==='l12-investigation-question'?'l12-opening-v2':undefined;
 const filmValid=!c||(expectedClip!==undefined&&c.clipId===expectedClip&&['paused','playing'].includes(c.status)&&Number.isFinite(c.elapsedMs)&&c.elapsedMs>=0&&c.elapsedMs<=180000&&(c.status==='paused'?c.startedAt===null:typeof c.startedAt==='number'&&Number.isFinite(c.startedAt)&&c.startedAt>0));
 return !!s&&filmValid&&Number.isFinite(s.progress)&&s.progress>=0&&s.progress<=1&&Number.isInteger(s.option)&&s.option>=0&&s.option<(page.options?.length??1)&&typeof s.revealed==='boolean'&&(!s.revealed||!!page.reveal);
}
export function expansionVisiblePoints(page:PortExpansionPage,progress:number){return page.points.slice(0,Math.floor(Math.max(0,Math.min(1,progress))*page.points.length+1e-6));}
export function effectiveChainCapacity(capacities:readonly number[]){if(!capacities.length||capacities.some(x=>!Number.isFinite(x)||x<0))throw new Error('能力必须为同口径非负数');return Math.min(...capacities);}
export const PLANNING_DEMAND=[80,100,120] as const;
export function planningBalance(demand:number,capacity:number){if(!Number.isFinite(demand)||!Number.isFinite(capacity)||demand<0||capacity<=0)throw new Error('需求与能力口径无效');return {served:Math.min(demand,capacity),shortfall:Math.max(0,demand-capacity),spare:Math.max(0,capacity-demand),ratio:demand/capacity};}
export function expansionOptionSummary(p:PortExpansionPage,s:ExpansionPresentation){
  if(p.visual==='cashflow'){const v=concessionScenario(s.option);return `教学年收入${v.revenue}万元、运营支出${v.operating}万元；固定支付60万元，组合支付20万元加收入的10%，即${v.sharedFee}万元。不含建设融资、税费或完整收益评价。`;}
  if(p.visual==='choice'){const v=portChoiceScenario(s.option);return `教学同一40英尺箱：A港港内500元、陆运700元、3天；B港港内650元、陆运450元、2天；C港港内450元、陆运600元、5天。时间折算${v.daily}元/箱日；简化总成本A/B/C为${v.totals.join('/')}元/箱，未计尾部延误及换港费用。`;}
  if(p.visual==='invoice'){const v=storageScenario(s.option);return `教学单箱装卸360元，免费堆存3日，超期40元/箱日；停留${v.days}日，收费堆存${v.chargeDays}日，总额${v.total}元。不代表实际费率或按日取整规则。`;}

  if(p.slideKey==='l7-bulk-bottleneck')return `教学能力（吨/小时）：卸船${s.option===0?900:1200}、输送600、出库750。`;
  if(p.slideKey==='l7-reefer-capacity')return `教学冷藏区：空箱位24个；可用插座${s.option===0?16:24}个；待接入冷藏箱20只。`;
  if(p.slideKey==='l8-demand-lab')return `教学需求${PLANNING_DEMAND[s.option]}万实体吨/年；同货种有效能力90万实体吨/年。`;
  if(p.slideKey==='l8-phase-lab')return `教学第1/2期需求：${s.option===0?'80/100':s.option===1?'80/150':'80/70'}万实体吨/年；一次建设能力150；分期能力90→150；两期之间可扩建，建设提前期在本演示中固定满足。`;
  return p.options?.[s.option]??'';
}
export function expansionDiagramSummary(p:PortExpansionPage,s:ExpansionPresentation){
  if(s.cinematic)return `第${p.lesson}讲开场短片《${p.lesson===12?'放行之前':'等待，发生在哪里'}》，总长180秒；教师${s.cinematic.status==='playing'?'正在播放':'暂停在'}${Math.floor(s.cinematic.elapsedMs/1000)}秒。采用许可实拍素材与官方档案；一般作业实拍不能当成所述事件现场，人物与案件无关。旁白为课程合成配音，无当事人采访；当前时间不证明学生已观看或完成实验。不推断尚未播放镜头。`;
  if(p.lesson>=11&&!['performance','sample','scorecard','barriers'].includes(p.visual)){
    if(s.progress===0)return '图解尚未展开，不推断未显示材料。';
    const count=Math.ceil(s.progress*(p.labels?.length??0));
    if(p.values)return p.values.slice(0,count).map((v,i)=>(p.labels?.[i]??String(i+1))+'：'+v).join('；')+'；单位：'+(p.unit??'模拟分钟');
    const rows=p.visual==='lab'?(p.rows??[]).slice(0,Math.ceil(s.progress*(p.rows?.length??0))):['chain','incident','bowtie'].includes(p.visual)?s.progress>.5?p.rows??[]:[]:['records','decision','evidence','ledger','matrix'].includes(p.visual)?(p.rows??[]).slice(0,1+Math.floor(s.progress*Math.max(1,(p.rows?.length??1)-1)+1e-6)):[];
    return [...(p.labels??[]).slice(0,count),...rows.map(r=>r.join('：'))].join('；')||'当前公开图解。';
  }

  if(p.lesson>=11){if(s.progress===0)return '图解尚未展开，不推断未显示材料。';if(p.visual==='scorecard'){const v=performancePerspective(s.option);return `教学无量纲评分：速度权重${v.speedWeight}、可靠性权重${v.reliabilityWeight}；A=${v.A}，B=${v.B}。只比较已给定维度，安全不参与加权抵消。`;}if(p.visual==='performance')return '独立教学月报：吞吐量100→120千TEU；平均船舶在港时间20→16小时/次挂靠；交付超期20→30次/100票。各行独立刻度，不跨单位比较。';if(p.visual==='sample'){const shown=Math.floor(s.progress*6+1e-6);return PERFORMANCE_CASE.samples.map((x,i)=>{const v=sampleDeliverySummary(x,4);return `${i?'B':'A'}已展开${shown}次记录：${x.slice(0,shown).join('、')}天。${shown===6?`完整教学均值${v.mean}天、超过4天${v.late}次；样本不预测未来概率。`:'不推断未展开记录。'}`;}).join('；');}if(p.visual==='barriers'&&p.options){if(s.progress<1)return '确认项仍在展开；不能将未展开项当成已确认，不提供现场批准。';const v=safetyEvidenceGate(s.option);return v.readyForAuthorizedReview?'教学确认项齐备，仍待有权角色审查；不等于允许现场复工。':`教学缺项：${v.missing.join('、')}；效率收益不能补齐证据。`;}return (p.rows??[]).filter((_,i)=>i===0||s.progress>=i/Math.max(1,(p.rows?.length??1)-1)).map(r=>r.join('：')).join('；')||p.labels?.slice(0,Math.ceil(s.progress*p.labels.length)).join(' → ')||'当前公开图解。';}

  if(['cashflow','choice','invoice'].includes(p.visual))return expansionOptionSummary(p,s);
  if(p.options&&['l7-bulk-bottleneck','l7-reefer-capacity','l8-demand-lab','l8-phase-lab'].includes(p.slideKey))return expansionOptionSummary(p,s);
  if(p.rows){const count=p.visual==='matrix'?1+Math.floor(s.progress*(p.rows.length-1)+1e-6):Math.floor(s.progress*p.rows.length+1e-6);return p.rows.slice(0,count).map(row=>row.join(' / ')).join('；');}
  if(p.values)return p.values.map((value,i)=>`${p.labels?.[i]??i+1}：${value}`).join('；')+`；单位：${p.unit??'图示阶段'}`;
  if(s.progress===0)return '图解输入尚未展开；不推断未显示的关系。';
  return (p.labels??[]).slice(0,Math.ceil(s.progress*(p.labels?.length??0))).join(' → ');
}
