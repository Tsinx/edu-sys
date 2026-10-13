export const PORT_PERFORMANCE_SAFETY_SOURCES = {
 'ps-case':{label:'本课程 · 港口绩效与安全教学情境',url:'/port-expansion-preview.html',date:'2026-10-12',boundary:'港口、记录、金额和事件均为独立虚构，非实港数据、事故复演、现场作业指令或训练认证。'},
 'ps-concept':{label:'本课程 · 指标与责任关系图解',url:'/port-expansion-preview.html',date:'2026-10-12',boundary:'图示用于分析对象、证据与责任，不按场地比例，不替代现场制度、专业判断或操作授权。'},
 'ps-cppi':{label:'世界银行 · CPPI 2020—2024（2025年报告）',url:'https://www.worldbank.org/en/topic/transport/publication/cppi-2024',date:'访问2026-10-12',boundary:'报告主要比较集装箱船在港时间，数据截至2024年；不将其解释为全货种、全目标排名或港方管理的因果效果。'},
 'ps-ilo':{label:'ILO · 港口安全与健康（2016修订）',url:'https://www.ilo.org/resource/other/safety-and-health-ports-revised-2016',date:'2018年发布；访问2026-10-12',boundary:'指南用于安全管理框架，不自动等同于本地现行法律；课堂不提供危险货物参数、设备操作或真实应急处置指令。'},
 'ps-isps':{label:'IMO · SOLAS XI-2与ISPS规则说明',url:'https://www.imo.org/en/ourwork/security/pages/solas-xi-2%20isps%20code.aspx',date:'访问2026-10-12',boundary:'仅说明适用国际框架及责任角色，不推断每个港区的适用范围，不替代核准的保安计划或地方授权。'},
 'ps-cyber':{label:'IAPH · 港口网络安全指南入口',url:'https://www.iaphworldports.org/products/',date:'访问2026-10-12',boundary:'用于理解组织、信息与作业依赖，不提供攻击实施、漏洞利用、网络隔离配置或生产系统恢复步骤。'}
} as const;
export const PERFORMANCE_CASE = {
 periods:['前期','本期'],throughput:[100,120],vesselHours:[20,16],lateDeliveries:[20,30],deliveryCount:100,
 samples:[[2,2,2,2,2,8],[3,3,3,3,3,3]],deadline:4,
 scores:{A:[90,40],B:[60,80]},
} as const;
const validOption=(n:number)=>{if(!Number.isInteger(n)||n<0||n>2)throw Error('教学选项无效');return n;};
export function performancePerspective(n:number){const weights=[.75,.5,.25][validOption(n)]!;return {speedWeight:weights,reliabilityWeight:1-weights,A:90*weights+40*(1-weights),B:60*weights+80*(1-weights)};}
export function sampleDeliverySummary(days:readonly number[],deadline:number){if(!days.length||days.some(d=>!Number.isFinite(d)||d<0)||!Number.isFinite(deadline)||deadline<0)throw Error('交付记录必须为有限非负数');return {count:days.length,mean:days.reduce((a,b)=>a+b,0)/days.length,late:days.filter(d=>d>deadline).length,max:Math.max(...days)};}
export function safetyEvidenceGate(n:number){const option=validOption(n),confirmed=[option!==0,true,option!==2];return {confirmed,readyForAuthorizedReview:confirmed.every(Boolean),missing:confirmed.flatMap((v,i)=>v?[]:[['屏障状态确认','责任角色确认','信息一致性确认'][i]!])};}
