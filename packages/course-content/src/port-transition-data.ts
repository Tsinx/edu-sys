/** Dated primary evidence and independent teaching cases for lectures 15–16. */
export const PORT_TRANSITION_SOURCES = {
 'px-case':{label:'本课程 · 澄江港改善决策',url:'/port-expansion-preview.html?lesson=15',date:'2026-10-21',boundary:'企业、货票、记录、排放系数、成本和投资项目为独立教学设定；不代表真实港口实测、报价、法定核算或投资建议。'},
 'px-concept':{label:'本课程 · 业务与核算关系图',url:'/port-expansion-preview.html?lesson=16',date:'2026-10-21',boundary:'业务关系和核算边界为概论示意；不构成系统接口规范、电气操作规程、认证或生产授权。'},
 'px-digital-policy':{label:'交通运输部 · 智慧港口和智慧航道建设意见',url:'https://xxgk.mot.gov.cn/2020/jigou/syj/202312/t20231204_3961959.html',date:'2023-12-04',boundary:'政策支持需求导向、数据标准、协同与有序自动化；2027年目标不是已经全部完成的实绩。'},
 'px-wb-digital':{label:'世界银行 · 港口改革工具包第9模块',url:'https://documents1.worldbank.org/curated/en/099073025114520809/pdf/P176624-a344f438-24ae-4721-bd90-9bef51983f0b.pdf',date:'2025',boundary:'用于数字转型、港口社区系统与治理框架；本课样例与参数为自编，不是该报告给出的实测结果。'},
 'px-wb-green':{label:'世界银行 · 港口改革工具包第8模块',url:'https://documents1.worldbank.org/curated/en/099073025114570099/pdf/P176624-7f744870-850b-4ff9-9a13-e5d620525935.pdf',date:'2025',boundary:'环境可持续性包括地方污染、气候与治理；方案须结合港口货种、运营和当地环境，不套用统一投资排序。'},
 'px-imo-window':{label:'IMO · 海事单一窗口',url:'https://www.imo.org/en/ourwork/facilitation/pages/maritimesinglewindow-default.aspx',date:'核对2026-10-21',boundary:'海事单一窗口涉及船舶到港、在港、离港与公共机关的信息交换；不等同中国国际贸易单一窗口、港口社区系统或码头生产系统。'},
 'px-cq-data':{label:'重庆市政府 · 船边放行、智能分流',url:'https://www.cq.gov.cn/zt/szzqjs/fwgpzsh/sczx/202409/t20240927_13668675.html',date:'2024-09-27',boundary:'果园港历史案例，已提前申报且理货正常等条件仍需满足；不外推为所有货物均自动放行，不采用预估效率当当前实测。'},
 'px-cq-vehicles':{label:'重庆交通局 · 果园港无人集卡应用',url:'https://jtj.cq.gov.cn/sy_240/bmdt/202503/t20250314_14407378.html',date:'2025-03-14',boundary:'历史报道说明无人集卡与有人车辆混行应用；不能推定全部港区无人化或任意场景可直接复制。'},
 'px-ghg':{label:'GHG Protocol · 企业核算标准',url:'https://ghgprotocol.org/corporate-standard',date:'核对2026-10-21',boundary:'概念采用组织边界与范围1、2、3的区分；范围归属取决于组织边界，不替代正式温室气体盘查与披露。'},
 'px-shore-law':{label:'交通运输部 · 岸电管理办法（2025修正）',url:'https://xxgk.mot.gov.cn/jigou/fgs/202505/t20250521_4169121.html',date:'2025-05-21公布',boundary:'按现行办法解释适用船舶、靠泊时间、设施匹配与例外；概论核对不能代替有资质人员操作及船岸安全确认。'},
 'px-huanghua':{label:'交通运输部 · 绿色港口试点验收',url:'https://xxgk.mot.gov.cn/2020/jigou/zhghs/202404/t20240422_4136924.html',date:'2024-04-22',boundary:'黄骅煤炭港区的粉尘与煤污水治理为特定货种、特定范围成果；不宣称所有港区或全部环境影响为零。'},
 'px-cq-green':{label:'重庆市政府 · 两江新区绿色发展记录',url:'https://wap.cq.gov.cn/ywdt/zwhd/bmdt/202412/t20241230_14031084.html',date:'2024-12-30',boundary:'历史材料说明果园港岸电、设备与绿色运输举措；不据此声称全港已实现零排放或零碳认证。'},
 'px-video-smart':{label:'央视网 · 青岛港自动化码头',url:'https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml',date:'2025-05-22',boundary:'原报道作业现场与采访；单机作业纪录不是常态保证、全程交付时效或自动化的独立因果效果。'},
 'px-video-green':{label:'央视网 · 港口智慧绿色转型',url:'https://tv.cctv.com/2025/06/09/VIDEHV4MAQdbeBL4IovSAvuX250609.shtml',date:'2025-06-09',boundary:'短片保留原声及天津港岸电等报道地点；历史数字不是当前全港数值，受访者减排表述不替代本课独立核算。'},
} as const;

export const PORT_TRANSITION_FILMS = {
 'l15-smart':{id:'l15-smart',title:'智慧港口：任务怎样变成动作？',src:'/course-assets/port-management/transition-media/smart.mp4',poster:'/course-assets/port-management/transition-media/smart.jpg',captions:'/course-assets/port-management/transition-media/smart.vtt',durationMs:45000,source:'px-video-smart'},
 'l16-green':{id:'l16-green',title:'绿色港口：接上岸电以后',src:'/course-assets/port-management/transition-media/green.mp4',poster:'/course-assets/port-management/transition-media/green.jpg',captions:'/course-assets/port-management/transition-media/green.vtt',durationMs:37400,source:'px-video-green'},
} as const;

export const DIGITAL_HANDOFFS = [
 {label:'原流程',customs:510,carrier:420,terminal:540,transport:600,latency:90},
 {label:'及时共享',customs:510,carrier:420,terminal:540,transport:600,latency:5},
 {label:'共享并提前派车',customs:510,carrier:420,terminal:540,transport:555,latency:5},
] as const;
export function digitalHandoff(option:number){
 const v=DIGITAL_HANDOFFS[option];if(!v)throw Error('未知数据协同情境');
 const conditions=Math.max(v.customs,v.carrier,v.terminal,v.transport);
 // In this case carrier/customs/terminal confirmations are shared, transport readiness is known locally.
 const recognized=Math.max(v.customs+v.latency,v.carrier+v.latency,v.terminal+v.latency,v.transport);
 return {...v,conditions,recognized,gate:recognized+30,factory:recognized+210,informationWait:recognized-conditions};
}
export function transitionClock(minutes:number){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.round(minutes%60)).padStart(2,'0')}`;}

export const SHORE_SCENARIOS=[{hours:5,gridFactor:.55},{hours:5,gridFactor:.85},{hours:2,gridFactor:.55}] as const;
export function shoreComparison(option:number){
 const s=SHORE_SCENARIOS[option];if(!s)throw Error('未知岸电教学情境');
 const load=120,kwh=load*s.hours,litres=kwh*.27,dieselKg=litres*3.1,gridKg=kwh*s.gridFactor;
 return {...s,load,kwh,litres,dieselKg,gridKg,savedKg:dieselKg-gridKg,dieselCost:litres*7.5,electricCost:kwh*1.25,savedCost:litres*7.5-kwh*1.25};
}
export function greenIntensity(option:number){
 const cases=[{boxes:100000,tonnes:1000},{boxes:140000,tonnes:1120}] as const;
 const v=cases[option];if(!v)throw Error('未知排放强度情境');
 return {...v,kgPerBox:v.tonnes*1000/v.boxes};
}

/** Alternative project screening, all figures are synthetic and separate from the single-call shore example. */
export const TRANSITION_PROJECTS=[
 {id:'D',name:'数据协同与预约',capital:120,annualSaving:45,annualCost:15,reduction:60,condition:'统一货票标识、车队按约到达'},
 {id:'S',name:'岸电服务改造',capital:220,annualSaving:30,annualCost:10,reduction:180,condition:'船岸匹配、年度有效使用达到假设'},
 {id:'E',name:'更新电动集卡',capital:300,annualSaving:70,annualCost:25,reduction:240,condition:'充电窗口、电网容量与备用能力'}
] as const;
export const TRANSITION_PORTFOLIOS=[['D','S'],['D','E'],['S','E']] as const;
export function transitionPortfolio(option:number,lowUse=false){
 const ids=TRANSITION_PORTFOLIOS[option];if(!ids)throw Error('未知投资组合');
 const projects=TRANSITION_PROJECTS.filter(p=>(ids as readonly string[]).includes(p.id));
 const capital=projects.reduce((n,p)=>n+p.capital,0),netAnnual=projects.reduce((n,p)=>n+p.annualSaving*(lowUse&&p.id==='S'?.5:1)-p.annualCost,0);
 const reduction=projects.reduce((n,p)=>n+p.reduction*(lowUse&&p.id==='S'?.5:1),0);
 return {ids,capital,withinBudget:capital<=420,netAnnual,reduction,simplePayback:capital/netAnnual};
}
