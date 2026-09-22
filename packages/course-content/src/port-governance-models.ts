export const PORT_GOVERNANCE_SOURCES={
 'pe-governance':{label:'世界银行 · 港口改革工具包（2025）',url:'https://www.worldbank.org/en/topic/transport/publication/port-reform-toolkit',date:'访问2026-09-22',boundary:'用于通用治理职能与模式分析，不把理想类型当作各国现行法律或所有港口的完整组织图。'},
 'pe-ppp':{label:'世界银行 · 港口私营参与',url:'https://ppp.worldbank.org/sector/transportation/ports',date:'访问2026-09-22',boundary:'用于认识特许经营安排；课堂条款为独立虚构，不是可签署合同、法律意见或现实项目承诺。'},
 'pe-risk':{label:'世界银行 · 港口风险分配',url:'https://ppp.worldbank.org/transportation/ports-module',date:'访问2026-09-22',boundary:'风险分配是分析框架；责任认定须依法律、具体合同及事实，风险没有因合同签订而消失。'},
 'pe-rotterdam-org':{label:'鹿特丹港务局 · 组织与使命',url:'https://www.portofrotterdam.com/en/about-port-authority',date:'访问2026-09-22',boundary:'只支持港务局公共股东与公开职能，不证明所有码头由其直接经营或某种所有制更有效率。'},
 'pe-mpa-org':{label:'新加坡MPA · 码头运营主体',url:'https://www.mpa.gov.sg/port-marine-ops/operations/port-infrastructure/terminals',date:'访问2026-09-22',boundary:'只支持PSA和Jurong Port作为商业运营主体的公开信息，不外推具体合同权利或收费权限。'},
 'pe-competition':{label:'PEMP · 港际竞争',url:'https://porteconomicsmanagement.org/pemp/contents/part9/inter-port-competition/',date:'访问2026-09-22',boundary:'用于服务链与竞争层次分析，不提供真实市场份额、实时航线或企业偏好的估计。'},
 'pe-pricing':{label:'PEMP · 港口定价',url:'https://porteconomicsmanagement.org/pemp/contents/part9/port-pricing/',date:'访问2026-09-22',boundary:'只解释定价概念与收费结构；所有算例另行编制，不是实港报价、法定费率或企业利润预测。'}
} as const;
const option=(n:number)=>{if(!Number.isInteger(n)||n<0||n>2)throw Error('情境选项无效');return n;};
export function concessionScenario(n:number){const i=option(n),revenue=[200,600,1000][i]!,operating=revenue*.5,sharedFee=20+revenue*.1;return {revenue,operating,fixedFee:60,sharedFee,fixedRemainder:revenue-operating-60,sharedRemainder:revenue-operating-sharedFee};}
export function portChoiceScenario(n:number){const daily=[0,100,400][option(n)]!,cash=[1200,1100,1050],days=[3,2,5];return {daily,cash,days,totals:cash.map((v,i)=>v+daily*days[i]!)};}
export function storageScenario(n:number){const days=[2,5,8][option(n)]!,chargeDays=Math.max(0,days-3);return {days,chargeDays,handling:360,storage:chargeDays*40,total:360+chargeDays*40};}
