export const PORT_PERFORMANCE_SAFETY_SOURCES = {
 'ps-safety-law':{label:'应急管理部 · 安全生产法第三条（2021年修正文本）',url:'https://www.mem.gov.cn/fw/flfgbz/fg/202107/t20210716_416558.shtml',date:'2021年修正文本；核验2026-10-14',boundary:'用于人民至上、生命至上和预防理念的价值依据。课程任务评价诚实记录、证据与责任交接，不凭表态评分；不提供现场法律意见、具体危险参数或授权判断。'},
 'ps-case':{label:'本课程 · 港口绩效与安全教学情境',url:'/port-expansion-preview.html',date:'2026-10-12',boundary:'港口、记录、金额和事件均为独立虚构，非实港数据、事故复演、现场作业指令或训练认证。'},
 'ps-concept':{label:'本课程 · 指标与责任关系图解',url:'/port-expansion-preview.html',date:'2026-10-12',boundary:'图示用于分析对象、证据与责任，不按场地比例，不替代现场制度、专业判断或操作授权。'},
 'ps-cppi':{label:'世界银行 · CPPI 2025及数据入口',url:'https://www.worldbank.org/en/topic/transport/publication/cppi',date:'核验2026-10-14',boundary:'采用2025数据版入口与2026方法说明。指数为港口层级的集装箱船时间基准，非单一码头、全目标评价或管理因果效果。'},
 'ps-cppi-method':{label:'世界银行 · CPPI方法说明（2026-06-10）',url:'https://thedocs.worldbank.org/en/doc/855fe5e7123d85b05d4e84c95b8fd1e2-0400012026/original/Methodology-Note.pdf',date:'2026-06-10；PDF第2—4、8—9页',boundary:'六事件记录中的离泊至驶出口岸不计入CPPI；按船型和单次作业量分层。教学数据不冒充官方数据，跨年比较采用同版可比序列。'},
 'ps-mpa':{label:'新加坡MPA · 拥堵说明（2024-05-30）',url:'https://www.mpa.gov.sg/media-centre/details/in-response-to-media-queries-on--vessels--extended-waiting-times-for-berths-in-the-port-of-singapore',date:'2024-05-30；正文第1—6段',boundary:'历史材料说明到港失序、集中到达与扩能应对，不作为当前实时状态，也不据公开说明识别单项措施的因果效果。'},
 'ps-tianjin':{label:'天津港8·12事故调查报告 · 应急管理部存档',url:'https://www.mem.gov.cn/gk/sgcc/tbzdsgdcbg/2016/201602/P020190415543917598002.pdf',date:'2016年报告；PDF第28—31、91—96页',boundary:'历史调查中的企业、评估、监管与应急问题分别核查。只据报告归因，不引用历史法规为现行操作依据，不重演化学危险过程。'},
 'ps-nagoya':{label:'日本国土交通省 · 名古屋港NUTS中断资料',url:'https://www.mlit.go.jp/kowan/kowan_mn2_000006.html',date:'2023-07事件；核验2026-10-14',boundary:'资料支持集装箱搬入搬出约三天停止，不能推定全港所有业务均停止。课堂恢复任务是独立设定，不冒充真实事件处置记录。'},
 'ps-bowtie':{label:'英国CAA · Bowtie方法说明',url:'https://www.caa.co.uk/safety-initiatives/working-with-industry/bowtie/about-bowtie/introduction-to-bowtie/',date:'核验2026-10-14',boundary:'借用威胁、顶事件、后果与屏障的通用分析结构。课堂图不是官方港口风险评估或实际作业批准。'},
 'ps-lab':{label:'课程参考运行 · port-class-lab/2.0',url:'/port-class-lab.html?lesson=11',date:'生成2026-10-14；可由指令重放',boundary:'数据来自本课程逐箱设施内核的冻结参考运行，单位为箱及教学成本。不是实港统计、个别学生成绩或CPPI；学生实操结果以其导出记录为准。'},
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
