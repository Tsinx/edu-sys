import type {PortManagementSlideSpec,PortLessonTimingBlock} from './index.js';

export const PORT_EXPANSION_SOURCES = {
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
export type ExpansionVisual='hero'|'terminal'|'chain'|'matrix'|'section'|'ledger'|'bars'|'network'|'map'|'generations'|'city'|'scenario'|'phases'|'decision';
export interface ExpansionPresentation {progress:number;option:number;revealed:boolean}
export const EXPANSION_DEFAULT:ExpansionPresentation={progress:0,option:0,revealed:false};
export interface PortExpansionPage extends PortManagementSlideSpec {
  lesson:7|8;localPage:number;visual:ExpansionVisual;points:readonly string[];source:ExpansionSource;
  cargo?:CargoKind;image?:string;labels?:readonly string[];rows?:readonly (readonly string[])[];
  values?:readonly number[];unit?:string;reveal?:string;options?:readonly string[];focus?:number;
  teachingCue:string;assistantCue:string;
}
const sectionEnds={7:[6,14,20,24,32,38,44,48],8:[6,12,18,24,30,36,42,48]} as const;
type PageInput={n:number;key:string;title:string;lead:string;points:string[];teaching:string;visual:ExpansionVisual;source?:ExpansionSource;cargo?:CargoKind;image?:string;labels?:string[];rows?:string[][];values?:number[];unit?:string;reveal?:string;options?:string[];focus?:number};
export const EXPANSION_TITLES={7:'货种改变，港口为什么必须跟着改变？',8:'港口如何演进，又该建在哪里、建多大？'} as const;
const sections={7:['同一港湾，不同货物','干散货与粮食','液体散货与液化气','滚装与交付','重大件、冷链与客运','工艺比较','方案适配','综合判断'],8:['从旧码头到港口网络','第一至第三代能力','第四、第五代视角','港城空间演变','区位与约束','需求与规模','分期与触发','规划决策']} as const;
export function expansionPage(lesson:7|8,v:PageInput):PortExpansionPage {
  const source=v.source??'pe-concept',section=sections[lesson][sectionEnds[lesson].findIndex(end=>v.n<=end)]!,index=(lesson===7?293:341)+v.n;
  return {index,lesson,localPage:v.n,slideKey:`l${lesson}-${v.key}`,lessonTitle:EXPANSION_TITLES[lesson],section,kicker:`PORT STUDIES / 0${lesson}`,layout:'split',title:v.title,lead:v.lead,points:v.points,visual:v.visual,source,sourceIds:[source],cargo:v.cargo,image:v.image,labels:v.labels,rows:v.rows,values:v.values,unit:v.unit,reveal:v.reveal,options:v.options,focus:v.focus,teachingCue:v.teaching,assistantCue:`${PORT_EXPANSION_SOURCES[source].boundary} 只解释已展开图层、当前选项和已揭示解析。不得复述未展开要点、教师稿或后续页答案。无学生记录时不能声称已提交或完成。`,narrative:{location:lesson===7?'港湾—专业化码头—货物交接':'城市—港区—腹地网络',voyageStage:section,storyBeat:v.reveal?'decision':'evidence',evidence:source==='pe-model'?'scenario':source==='pe-concept'?'concept':'documented',publicLabel:source==='pe-model'?'教学情境':source==='pe-concept'?'概念图解':source==='pe-generation'?'研究框架':'公开资料',progress:index}};
}
export function expansionTiming(lesson:7|8):readonly PortLessonTimingBlock[]{const start=lesson===7?294:342,ends=sectionEnds[lesson],minutes=lesson===7?[9,15,12,9,16,11,12,6]:[9,12,12,12,11,12,12,10];return sections[lesson].map((label,i)=>({label,slideStart:start+(i===0?0:ends[i-1]!),slideEnd:start+ends[i]!-1,minutes:minutes[i]!,purpose:label}));}
export function expansionStateValid(page:PortExpansionPage,s:ExpansionPresentation){return !!s&&Number.isFinite(s.progress)&&s.progress>=0&&s.progress<=1&&Number.isInteger(s.option)&&s.option>=0&&s.option<(page.options?.length??1)&&typeof s.revealed==='boolean'&&(!s.revealed||!!page.reveal);}
export function expansionVisiblePoints(page:PortExpansionPage,progress:number){return page.points.slice(0,Math.floor(Math.max(0,Math.min(1,progress))*page.points.length+1e-6));}
export function effectiveChainCapacity(capacities:readonly number[]){if(!capacities.length||capacities.some(x=>!Number.isFinite(x)||x<0))throw new Error('能力必须为同口径非负数');return Math.min(...capacities);}
export const PLANNING_DEMAND=[80,100,120] as const;
export function planningBalance(demand:number,capacity:number){if(!Number.isFinite(demand)||!Number.isFinite(capacity)||demand<0||capacity<=0)throw new Error('需求与能力口径无效');return {served:Math.min(demand,capacity),shortfall:Math.max(0,demand-capacity),spare:Math.max(0,capacity-demand),ratio:demand/capacity};}
export function expansionOptionSummary(p:PortExpansionPage,s:ExpansionPresentation){
  if(p.slideKey==='l7-bulk-bottleneck')return `教学能力（吨/小时）：卸船${s.option===0?900:1200}、输送600、出库750。`;
  if(p.slideKey==='l7-reefer-capacity')return `教学冷藏区：空箱位24个；可用插座${s.option===0?16:24}个；待接入冷藏箱20只。`;
  if(p.slideKey==='l8-demand-lab')return `教学需求${PLANNING_DEMAND[s.option]}万实体吨/年；同货种有效能力90万实体吨/年。`;
  if(p.slideKey==='l8-phase-lab')return `教学第1/2期需求：${s.option===0?'80/100':s.option===1?'80/150':'80/70'}万实体吨/年；一次建设能力150；分期能力90→150；两期之间可扩建，建设提前期在本演示中固定满足。`;
  return p.options?.[s.option]??'';
}
export function expansionDiagramSummary(p:PortExpansionPage,s:ExpansionPresentation){
  if(p.options&&['l7-bulk-bottleneck','l7-reefer-capacity','l8-demand-lab','l8-phase-lab'].includes(p.slideKey))return expansionOptionSummary(p,s);
  if(p.rows){const count=p.visual==='matrix'?1+Math.floor(s.progress*(p.rows.length-1)+1e-6):Math.floor(s.progress*p.rows.length+1e-6);return p.rows.slice(0,count).map(row=>row.join(' / ')).join('；');}
  if(p.values)return p.values.map((value,i)=>`${p.labels?.[i]??i+1}：${value}`).join('；')+`；单位：${p.unit??'图示阶段'}`;
  if(s.progress===0)return '图解输入尚未展开；不推断未显示的关系。';
  return (p.labels??[]).slice(0,Math.ceil(s.progress*(p.labels?.length??0))).join(' → ');
}
