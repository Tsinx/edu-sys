/** Official documents and dated case materials; classroom inputs remain separately labelled. */
export const PORT_TRADE_SOURCES = {
 'pt-case':{label:'本课程 · 澄江机电业务情境',url:'/port-expansion-preview.html?lesson=13',date:'2026-10-19',boundary:'企业、货票、时刻和金额为教学设定；不代表实际报关资料、费率、预约或法律意见。'},
 'pt-concept':{label:'本课程 · 业务关系图解',url:'/port-expansion-preview.html?lesson=14',date:'2026-10-19',boundary:'流程与空间图为概念示意，不是生产SOP、行政边界、精确线路或全部适用条件。'},
 'pt-declaration':{label:'海关总署令277号 · 申报管理规定',url:'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2025/art_703b3595d0b540a3aec57766577e5481.html',date:'2025-05-01施行',boundary:'解释申报主体、资料、提前及两步申报；个案以现行商品、企业和监管条件核实，不代填真实申报。'},
 'pt-two-step':{label:'海关总署2025年第115号 · 全面推广两步申报',url:'https://www.tid.gov.hk/en/tradecircular/files/2025/ci4982025a.pdf',date:'2025-06',boundary:'采用海关总署公告官方转载；全面推广不取消适用条件、负面清单、担保与完整申报义务。'},
 'pt-window':{label:'中国国际贸易单一窗口',url:'https://www.singlewindow.cn/',date:'核对2026-10-19',boundary:'服务入口支持申报和查询功能说明；不能据入口存在推定实际申报已受理或数据自动准确。'},
 'pt-carrier':{label:'Maersk · 交付及用箱条款',url:'https://terms.maersk.com/dnd',date:'核对2026-10-19',boundary:'只说明承运人条款、免费期和计费边界需要单独核对，不把一家公司的条款作为全行业统一标准。'},
 'pt-zones-law':{label:'海关总署令256号 · 综合保税区管理办法',url:'https://www.beijing.gov.cn/zhengce/zhengcefagui/qtwj/202202/t20220225_2616995.html',date:'2022-04-01施行',boundary:'解释综保区货物流向、业务与账册管理；税收、许可、检疫与特殊业务须按现行具体规定核实。保税不同于永久免税。'},
 'pt-origin':{label:'财政部 · 保税区简介',url:'https://gss.mof.gov.cn/gszhs/guanshuizhishi/202009/t20200922_3592540.htm',date:'2020-09-22',boundary:'仅使用1990年外高桥获批等历史事实，不把文中旧时区域数量当作当前全国总数。'},
 'pt-yangshan':{label:'国务院 · 设立洋山保税港区批复',url:'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2005/art_13c61603eafd484baa63b851bf9ff9d8.html',date:'2005-06-22',boundary:'用于解释保税港区历史上的港区联动；不把2005年政策直接视为当前所有综保区规则。'},
 'pt-suzhou':{label:'苏州商务局 · 特殊监管区建设沿革',url:'https://commerce.suzhou.gov.cn/szsswj/szkfq/201506/4da63e3dc231418bb49eefff87fbabac.shtml',date:'2015-06',boundary:'仅采用2006年首家综保区获批沿革；旧时经济量和区域数量不作当前比较。'},
 'pt-integration':{label:'国务院办公厅 · 整合优化方案',url:'https://kab.sww.sh.gov.cn/xxgk/003006/003006003/003006003002/20150906/946d1c6d-d49e-49c4-b96f-769568b3b04a.html',date:'2015-08-28',boundary:'整合是制度安排，不是各类区域必经的单线升级；不能推断所有历史区域现已完成转换。'},
 'pt-five-centres':{label:'国务院 · 综保区高水平开放高质量发展',url:'https://app.www.gov.cn/govdata/gov/201901/25/434517/article.html',date:'2019-01-25',boundary:'五大中心为政策功能方向，非每区均已建成或同样适合的实绩。'},
 'pt-ftz':{label:'济南自贸片区 · 保税区与自贸试验区辨析',url:'https://ftz.jinan.gov.cn/col/col67633/art/2026/art_b4f81b519c0948789b343207ec33f757.html',date:'2026-10',boundary:'采用制度维度辨析；税收优惠的适用条件须回到法规，不作无条件入区退税或免税推断。'},
 'pt-hainan':{label:'海南商务厅 · 自贸港法五周年发布会',url:'https://dofcom.hainan.gov.cn/dofcom/xwfbh/202606/b03ed3d7ce614dbb9ef54541b814df5c.shtml',date:'2026-06',boundary:'海南已于2025-12-18启动全岛封关运作；自由贸易港专门制度不得直接套用于综保区，不讲成封岛。'},
 'pt-cq-overview':{label:'重庆市政府 · 招商平台总览',url:'https://www.cq.gov.cn/zt/yhyshj/zsyz/',date:'核对2026-10-19',boundary:'官方总览列7个综保区、2个保税物流中心；图解不代替实时名录，业务能力和状态须逐区核实。'},
 'pt-cq-history':{label:'重庆市政府 · 两路果园港调整与更名',url:'https://www.cq.gov.cn/ywdt/jrcq/202202/t20220219_10414538.html',date:'2022-02-19',boundary:'说明2022年水港功能区由寸滩转至果园港、空港功能区不变；不把企业开发管理范围当综保区围网范围。'},
 'pt-cq-guoyuan':{label:'重庆商务委 · 规划调整验收',url:'https://sww.cq.gov.cn/zymyq/ywxx/dtyw/202301/t20230118_11517975.html',date:'2023-01-18',boundary:'采用两路果园港调整后规划面积6.49平方公里和验收事实；面积不等于企业全部开发管理面积。'},
 'pt-cq-xiyong':{label:'重庆市政府 · 西永综合保税区',url:'https://www.cq.gov.cn/zt/yhyshj/zsyz/zspt/zhq/202409/t20240923_13651520.html',date:'2024-09-23',boundary:'介绍电子信息制造和研发等功能；不把招商目标与所有企业的既有实绩混同。'},
 'pt-cq-jiangjin':{label:'重庆市政府 · 江津综合保税区',url:'https://cq.gov.cn/ykbzt/yhyshj/zsyz/zspt/zhq/202601/t20260127_15356953.html',date:'2026-01-27',boundary:'解释珞璜、小南垭、水公铁和产业联系；公开通道时效不作实时承诺。'},
 'pt-cq-fuling':{label:'重庆市政府 · 涪陵综合保税区',url:'https://www.cq.gov.cn/zt/yhyshj/zsyz/zspt/zhq/202601/t20260127_15357004.html',date:'2026-01-27',boundary:'2019年封关及加工物流服务功能；产业发展方向与已实现产出分别说明。'},
 'pt-cq-wanzhou':{label:'重庆市政府 · 万州综合保税区',url:'https://admin.cq.gov.cn/zt/yhyshj/zsyz/zspt/zhq/202605/t20260521_15694425.html',date:'2026-05-21',boundary:'2022年6月封关；新田港和机场联系为区位条件，不把邻近理解为同一监管围网。'},
 'pt-cq-yongchuan':{label:'重庆市政府 · 永川综合保税区',url:'https://www.cq.gov.cn/zt/yhyshj/zsyz/zspt/zhq/202605/t20260521_15692026.html',date:'2026-05-21',boundary:'采用2021年获批、2023年封关及产业方向；不采用高增速直接证明政策因果或未来收益。'},
 'pt-cq-rail':{label:'重庆市政府 · 国际铁路港综保区验收',url:'https://admin.cq.gov.cn/ywdt/tpxw/202509/t20250924_15038446.html',date:'2025-09-24',boundary:'2025年9月正式验收，具备封关运作条件；验收不等同于具体某日每种业务都已全面运营。'},
 'pt-cq-ftz':{label:'重庆商务委 · 自贸试验区功能片区',url:'https://sww.cq.gov.cn/zymyq/',date:'核对2026-10-19',boundary:'3个法定片区与5个功能片区是不同表述层次；不以功能片区划分擅自改变批准范围。'},
 'pt-repair-law':{label:'商务部等三部门 · 第四批维修产品目录',url:'https://www.mofcom.gov.cn/swbhqzczt/dwmy/art/2026/art_631e697afde1423c86c29009d3454922.html',date:'2025年第82号',boundary:'保税维修受产品目录、环境、企业与监管条件约束；不得视为允许任意旧设备或固废入区。'},
 'pt-video-customs':{label:'央视网 · 高新技术货物查验节选',url:'https://tv.cctv.com/2026/07/31/VIDEdkKqJxZxKuXWcON3Lirk260731.shtml',date:'2026-07-31',boundary:'新闻节选只支持报道中的措施和时点，不是完整报关教程，也不证明所有口岸或货物具有同样效果。'},
 'pt-video-bonded':{label:'央视网 · 全国综保区新闻节选',url:'https://tv.cctv.com/2026/04/28/VIDE8cw5Bndsp3cVdYehjWkA260428.shtml',date:'2026-04-28',boundary:'全国2026年一季度报道，不作单个区域排名、利润或政策因果证明。'},
 'pt-video-guoyuan':{label:'央视网 · 中国港·重庆果园港节选',url:'https://tv.cctv.com/2023/03/16/VIDEE8NoWdAPxzAoyF22kdjX230316.shtml',date:'2023-03-16',boundary:'历史影像解释多式联运节点；片中数字不当作2026年现值，不把整座港区当成综保区围网。'},
 'pt-video-repair':{label:'央视网 · 航空保税维修节选',url:'https://tv.cctv.com/2025/01/13/VIDECzlehKsiZEUZ2CSU1TRk250113.shtml',date:'2025-01-13',boundary:'海南航空维修案例，不是重庆现场，也不把海南政策泛化到所有综保区。'},
} as const;

export const PORT_TRADE_FILMS = {
 'l13-customs':{id:'l13-customs',title:'海关手续：查验安排怎样改变？',src:'/course-assets/port-management/trade-media/customs.mp4',poster:'/course-assets/port-management/trade-media/customs.jpg',captions:'/course-assets/port-management/trade-media/customs.vtt',durationMs:40000,source:'pt-video-customs'},
 'l14-national':{id:'l14-national',title:'全国综保区：规模之外看功能',src:'/course-assets/port-management/trade-media/bonded.mp4',poster:'/course-assets/port-management/trade-media/bonded.jpg',captions:'/course-assets/port-management/trade-media/bonded.vtt',durationMs:32000,source:'pt-video-bonded'},
 'l14-guoyuan':{id:'l14-guoyuan',title:'重庆果园港：水铁公怎样连接？',src:'/course-assets/port-management/trade-media/guoyuan.mp4',poster:'/course-assets/port-management/trade-media/guoyuan.jpg',captions:'/course-assets/port-management/trade-media/guoyuan.vtt',durationMs:45000,source:'pt-video-guoyuan'},
 'l14-repair':{id:'l14-repair',title:'航空保税维修：服务怎样形成价值？',src:'/course-assets/port-management/trade-media/repair.mp4',poster:'/course-assets/port-management/trade-media/repair.jpg',captions:'/course-assets/port-management/trade-media/repair.vtt',durationMs:40000,source:'pt-video-repair'},
} as const;
export type PortTradeFilmId=keyof typeof PORT_TRADE_FILMS;

export const TRADE_READINESS = [
 {id:'X',customs:8.5,carrier:7,terminal:9,transport:14},
 {id:'Y',customs:12,carrier:8,terminal:7.5,transport:9},
 {id:'Z',customs:8,carrier:12,terminal:7.5,transport:10},
] as const;
export function tradeReadiness(option:number){
 const row=TRADE_READINESS[option];if(!row)throw Error('未知教学货票');
 const ready=Math.max(row.customs,row.carrier,row.terminal,row.transport);
 return {...row,ready,gateOut:ready+.5,factory:ready+3.5};
}
export const BONDED_OPTIONS=[{days:30,rate:.08},{days:60,rate:.08},{days:90,rate:.08},{days:60,rate:.06}] as const;
export function bondedComparison(option:number){
 const v=BONDED_OPTIONS[option];if(!v)throw Error('未知教学方案');
 const tax=1_000_000,benefit=tax*v.rate*v.days/365,cost=6000+100*v.days;
 return {...v,tax,benefit,cost,net:benefit-cost,breakEven:tax*v.rate/365>100?6000/(tax*v.rate/365-100):null};
}
export function tradeClock(hour:number){const h=Math.floor(hour);return `${String(h).padStart(2,'0')}:${String(Math.round((hour-h)*60)).padStart(2,'0')}`;}
