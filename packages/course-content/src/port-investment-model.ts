/** Lecture 18: independent incremental project cash flows, not a production-port forecast. */
export const PORT_INVESTMENT_SOURCES={
 'pi-case':{label:'本课程 · 东湾港增量扩建情境',url:'/port-investment-lab.html',date:'2026-10-26',boundary:'全部货量、费用、工期、残值、概率及客户流失为独立教学设定；六年为比较窗口，不是港口设施寿命。只计相对不新增项目的现金流，不代替可研或投资审批。'},
 'pi-finance':{label:'OpenStax · 净现值与现金流折现',url:'https://openstax.org/books/principles-finance/pages/16-2-net-present-value-npv-method',date:'2022教材；核对2026-10-26',boundary:'采用逐期现金流折现的基本方法。课堂以固定教学折现率比较同口径项目，不据此给出真实项目资本成本、融资条件或税务处理。'},
 'pi-risk':{label:'世界银行 · 港口改革工具包',url:'https://www.worldbank.org/en/topic/transport/publication/port-reform-toolkit',date:'第三版；核对2026-10-26',boundary:'用于解释港口风险、融资与公共私人主体关系；课堂概率和分期收益由本课程编制，不是世界银行对某港的测算。'},
 'pi-tuas':{label:'新加坡MPA · 大士港分期发展',url:'https://www.mpa.gov.sg/maritime-singapore/port-of-the-future',date:'访问2026-10-26',boundary:'公开资料支持四期建设与港区整合；2040年代目标不等于当前完工或实际吞吐。分期事实不能单独证明净收益或期权价值。'},
 'pi-yangshan':{label:'央视网 · 洋山港与小洋山北建设',url:'https://news.cctv.cn/2024/09/29/ARTI6z6PUrG4m9TrDRnSmfnV240929.shtml',date:'2024-09-29',boundary:'历史报道用于观察既有运营与新增建设并存，不将报道中的规划视为当前实绩，不把上海画面标为虚构东湾港。'},
 'pi-chongqing':{label:'重庆市政府 · 果园重大件码头建设节点',url:'https://www.cq.gov.cn/zwgk/zfxxgkzl/fdzdgknr/zdxm/dtxx/202112/t20211228_10245010.html',date:'2021-12-28',boundary:'仅使用历史工程节点区分桩基、封顶、完工和计划交付；原文当时预计次年交付不是本课程独立核实的实际投运日期。'}
} as const;
export const PORT_INVESTMENT_FILMS={
 'l18-investment':{id:'l18-investment',title:'扩建的时间：在运营与建设之间选择',src:'/course-assets/port-management/investment-media/investment-opening.mp4',poster:'/course-assets/port-management/investment-media/investment-opening.jpg',captions:'/course-assets/port-management/investment-media/investment-opening.vtt',durationMs:44000,source:'pi-yangshan'}
} as const;
export const INVESTMENT_VERSION='port-investment/1.0' as const;
export type InvestmentInitial='full'|'phase'|'wait';
export type InvestmentDecision='keep'|'expand'|'build'|'none';
export type InvestmentMode='stable'|'shock';
export type InvestmentDemand=8|18|30;
export interface InvestmentConfig {rate:number;cash:number;reserve:number;retention:number;seed:number;mode:InvestmentMode}
export const INVESTMENT_DEFAULT:InvestmentConfig={rate:.1,cash:7000,reserve:500,retention:.8,seed:20261026,mode:'stable'};
export const INVESTMENT_CASE={horizon:6,margin:100,fullCost:6000,phaseCost:3200,expandCost:3100,fullCapacity:30,phaseCapacity:15,fullFixed:350,phaseFixed:200,expandedFixed:400,fullImpact:300,phaseImpact:180,expandImpact:120,fullResidual:1500,phaseResidual:800,expandedResidual:1700,delayedResidual:1800} as const;
export const INVESTMENT_STATES=[{q:8,probability:.25,label:'低需求'},{q:18,probability:.5,label:'中需求'},{q:30,probability:.25,label:'高需求'}] as const;
export const INVESTMENT_PLAN_LABELS={full:'立即完整建设',phase:'先建一期',wait:'先观察一年'} as const;
export const INVESTMENT_DECISION_LABELS={keep:'保持现有方案',expand:'追加二期',build:'启动完整建设',none:'不启动新增项目'} as const;
export interface InvestmentRow {year:number;demand:number;capacity:number;served:number;unserved:number;investment:number;construction:number;operating:number;residual:number;cashflow:number;pv:number;cash:number}
export interface InvestmentOutcome {initial:InvestmentInitial;decision:InvestmentDecision;q:InvestmentDemand;rows:InvestmentRow[];npv:number;minimumCash:number;feasible:boolean}
export function investmentConfigValid(c:InvestmentConfig){return !!c&&Number.isFinite(c.rate)&&c.rate>=0&&c.rate<=.3&&Number.isFinite(c.cash)&&c.cash>=0&&c.cash<=100000&&Number.isFinite(c.reserve)&&c.reserve>=0&&c.reserve<=c.cash&&Number.isFinite(c.retention)&&c.retention>=0&&c.retention<=1&&Number.isInteger(c.seed)&&c.seed>=0&&c.seed<=2147483647&&['stable','shock'].includes(c.mode);}
export function investmentPV(cashflow:number,year:number,rate=.1){if(!Number.isFinite(cashflow)||!Number.isInteger(year)||year<0||!Number.isFinite(rate)||rate<0||rate>.3)throw new RangeError('cashflow');return cashflow/(1+rate)**year;}
export function investmentFactor(from:number,to:number,rate=.1){let sum=0;for(let t=from;t<=to;t++)sum+=investmentPV(1,t,rate);return sum;}
export function investmentDemand(seed:number):InvestmentDemand{
 if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw new RangeError('seed');
 let v=(seed+0x6D2B79F5)>>>0;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);const u=((v^(v>>>14))>>>0)/4294967296;
 return u<.25?8:u<.75?18:30;
}
export function investmentDemandAt(q:InvestmentDemand,year:number,mode:InvestmentMode='stable'){return year<2?0:mode==='shock'&&year>=4?({8:6,18:10,30:12} as const)[q]:q;}
export function investmentDecisionValid(initial:InvestmentInitial,decision:InvestmentDecision){return initial==='full'?decision==='keep':initial==='phase'?decision==='keep'||decision==='expand':initial==='wait'&&(decision==='none'||decision==='build');}
export function investmentOutcome(initial:InvestmentInitial,decision:InvestmentDecision,q:InvestmentDemand,config:InvestmentConfig=INVESTMENT_DEFAULT):InvestmentOutcome{
 if(!investmentConfigValid(config)||![8,18,30].includes(q)||!investmentDecisionValid(initial,decision))throw new RangeError('investment inputs');
 const C=INVESTMENT_CASE,rows:InvestmentRow[]=[];let cash=config.cash;
 for(let year=0;year<=C.horizon;year++){
  let capital=0,construction=0,capacity=0,fixed=0,residual=0;
  if(initial==='full'){
   if(year===0)capital=-C.fullCost;if(year===1)construction=-C.fullImpact;
   if(year>=2){capacity=C.fullCapacity;fixed=C.fullFixed;}if(year===6)residual=C.fullResidual;
  }else if(initial==='phase'){
   if(year===0)capital=-C.phaseCost;if(year===1){construction=-C.phaseImpact;if(decision==='expand')capital=-C.expandCost;}
   if(year>=2){capacity=decision==='expand'&&year>=3?C.fullCapacity:C.phaseCapacity;fixed=decision==='expand'&&year>=3?C.expandedFixed:C.phaseFixed;}
   if(year===2&&decision==='expand')construction=-C.expandImpact;
   if(year===6)residual=decision==='expand'?C.expandedResidual:C.phaseResidual;
  }else if(decision==='build'){
   if(year===1)capital=-C.fullCost;if(year===2)construction=-C.fullImpact;
   if(year>=3){capacity=C.fullCapacity;fixed=C.fullFixed;}if(year===6)residual=C.delayedResidual;
  }
  const demand=investmentDemandAt(q,year,config.mode)*(initial==='wait'?config.retention:1),served=Math.min(demand,capacity),operating=capacity?served*C.margin-fixed:0,cashflow=capital+construction+operating+residual;
  cash+=cashflow;rows.push({year,demand,capacity,served,unserved:Math.max(0,demand-served),investment:capital,construction,operating,residual,cashflow,pv:investmentPV(cashflow,year,config.rate),cash});
 }
 const minimumCash=Math.min(config.cash,...rows.map(r=>r.cash));return {initial,decision,q,rows,npv:rows.reduce((s,r)=>s+r.pv,0),minimumCash,feasible:minimumCash>=config.reserve-1e-8};
}
export function investmentFullThreshold(rate=.1){const c=INVESTMENT_CASE;return ((c.fullCost+c.fullImpact/(1+rate)-investmentPV(c.fullResidual,6,rate))/investmentFactor(2,6,rate)+c.fullFixed)/c.margin;}
/** At t=1, compare expansion with keeping phase 1. The t=0 expenditure is common and cancels. */
export function investmentExpansionDelta(q:InvestmentDemand,config:InvestmentConfig=INVESTMENT_DEFAULT){return (investmentOutcome('phase','expand',q,config).npv-investmentOutcome('phase','keep',q,config).npv)*(1+config.rate);}
export function investmentExpansionThreshold(rate=.1){const c=INVESTMENT_CASE,a=investmentFactor(2,5,rate),net=(c.expandCost+c.expandImpact/(1+rate)-investmentPV(c.expandedResidual-c.phaseResidual,5,rate))/a;return c.phaseCapacity+(net+c.expandedFixed-c.phaseFixed)/c.margin;}
export function investmentComparisons(q:InvestmentDemand,config:InvestmentConfig=INVESTMENT_DEFAULT){return ([['full','keep'],['phase','keep'],['phase','expand'],['wait','none'],['wait','build']] as const).map(([a,b])=>investmentOutcome(a,b,q,config));}
export function investmentPolicies(config:InvestmentConfig=INVESTMENT_DEFAULT){
 const c={...config,mode:'stable' as const};
 const expected=(fn:(q:InvestmentDemand)=>number)=>INVESTMENT_STATES.reduce((s,v)=>s+v.probability*fn(v.q),0);
 const phaseKeep=expected(q=>investmentOutcome('phase','keep',q,c).npv),phaseExpand=expected(q=>investmentOutcome('phase','expand',q,c).npv);
 const phaseAdaptive=expected(q=>Math.max(investmentOutcome('phase','keep',q,c).npv,investmentOutcome('phase','expand',q,c).npv));
 return {full:expected(q=>investmentOutcome('full','keep',q,c).npv),phaseKeep,phaseExpand,phaseAdaptive,flexibility:phaseAdaptive-Math.max(phaseKeep,phaseExpand),waitAdaptive:expected(q=>Math.max(0,investmentOutcome('wait','build',q,c).npv))};
}
export type InvestmentRun={version:typeof INVESTMENT_VERSION;config:InvestmentConfig;initial:InvestmentInitial|null;decision:InvestmentDecision|null;year:number;stage:'plan'|'construction'|'review'|'operate'|'complete';initialReason:string;reviewReason:string;finding:string};
export function newInvestmentRun(config:InvestmentConfig=INVESTMENT_DEFAULT):InvestmentRun{if(!investmentConfigValid(config))throw new RangeError('config');return {version:INVESTMENT_VERSION,config:{...config},initial:null,decision:null,year:0,stage:'plan',initialReason:'',reviewReason:'',finding:''};}
export function investmentCommit(run:InvestmentRun,initial:InvestmentInitial,reason:string):InvestmentRun{
 if(run.stage!=='plan'||!['full','phase','wait'].includes(initial)||!reason.trim())throw new Error('先简要说明你的初始判断，再确定方案。');
 const need=initial==='full'?6300:initial==='phase'?3380:0;if(run.config.cash-need<run.config.reserve)throw new Error(`支付建设款与已知施工影响后低于${run.config.reserve}万元教学安全储备；请调整初始资金或选择可负担方案。`);
 return {...run,initial,initialReason:reason.trim().slice(0,2000),stage:'construction'};
}
export function investmentReview(run:InvestmentRun,decision:InvestmentDecision,reason:string):InvestmentRun{
 if(run.stage!=='review'||!run.initial||!investmentDecisionValid(run.initial,decision)||!reason.trim())throw new Error('请根据已公布的货源说明本次选择。');
 const result=investmentOutcome(run.initial,decision,investmentDemand(run.config.seed),run.config);
 const committedImpact=run.initial==='wait'&&decision==='build'?INVESTMENT_CASE.fullImpact:0;
 if(result.rows[1]!.cash-committedImpact<run.config.reserve)throw new Error('年末付款并预留已知施工支出后不足安全储备，本轮不能启动这项建设。');
 return {...run,decision,reviewReason:reason.trim().slice(0,2000),stage:'operate'};
}
export function investmentAdvance(run:InvestmentRun):InvestmentRun{
 if(run.stage==='construction')return {...run,year:1,stage:'review'};
 if(run.stage!=='operate'||!run.decision)throw new Error('请先完成当前决策。');
 const year=run.year+1;return {...run,year,stage:year===6?'complete':'operate'};
}
export function investmentRunValid(value:unknown):value is InvestmentRun{
 if(!value||typeof value!=='object')return false;const r=value as InvestmentRun;
 if(r.version!==INVESTMENT_VERSION||!investmentConfigValid(r.config)||!Number.isInteger(r.year)||r.year<0||r.year>6||![r.initialReason,r.reviewReason,r.finding].every(s=>typeof s==='string'&&s.length<=4000))return false;
 if(r.stage==='plan')return r.initial===null&&r.decision===null&&r.year===0;
 if(!['full','phase','wait'].includes(r.initial!))return false;
 let committed:InvestmentRun;
 try{committed=investmentCommit(newInvestmentRun(r.config),r.initial!,r.initialReason);}catch{return false;}
 if(r.stage==='construction')return r.year===0&&r.decision===null;
 if(r.stage==='review')return r.year===1&&r.decision===null;
 if(!((r.stage==='operate'&&r.year>=1&&r.year<6)||(r.stage==='complete'&&r.year===6)))return false;
 try{investmentReview({...committed,stage:'review',year:1},r.decision!,r.reviewReason);return true;}catch{return false;}
}
export function investmentPublicRows(run:InvestmentRun){
 if(!run.initial)return [];
 const decision=run.decision??(run.initial==='wait'?'none':'keep');
 return investmentOutcome(run.initial,decision,investmentDemand(run.config.seed),run.config).rows.slice(0,run.year+1);
}
type InvestmentSlideShape={slideKey:string;visual:string;mediaId?:string;rows?:readonly (readonly string[])[];equations?:readonly {tex:string;explanation:string}[];options?:readonly string[]};
export function investmentSlideSteps(p:InvestmentSlideShape){return p.equations?.length??(p.visual==='investment-cashflow'?7:p.rows?Math.max(1,p.rows.length-1):3);}
export function investmentSlideSummary(p:InvestmentSlideShape,s:{progress:number;option:number;cinematic?:{elapsedMs:number}}){
 if(p.mediaId)return `第18讲历史画面教学短片，44秒；${s.cinematic?'当前'+Math.floor(s.cinematic.elapsedMs/1000)+'秒。':'当前为观察卡。'}洋山港2024年历史画面与课程合成旁白，东湾港投资数字为独立教学设定，不证明已观看。`;
 if(s.progress===0)return '本页图解尚未展开，不解释后续计算。';
 const n=Math.floor(s.progress*investmentSlideSteps(p)+1e-6),f=(x:number)=>x.toFixed(2);
 if(p.equations)return p.equations.slice(0,n).map(e=>e.tex+'：'+e.explanation).join('；');
 if(p.rows)return p.rows.slice(0,n+1).map(r=>r.join(' / ')).join('；');
 if(p.visual==='investment-cashflow'){
  const config={...INVESTMENT_DEFAULT,retention:p.slideKey==='l18-waiting-has-cost'&&s.option===1?1:.8};
  const rows=investmentOutcome(p.slideKey==='l18-waiting-has-cost'?'wait':'full',p.slideKey==='l18-waiting-has-cost'?'build':'keep',30,config).rows;
  return rows.slice(0,n).map(r=>`t${r.year}：净现金${f(r.cashflow)}万元，现值${f(r.pv)}万元`).join('；')+(s.progress===1?'；总NPV '+f(rows.reduce((a,r)=>a+r.pv,0))+'万元。':'；总结果尚未展开。');
 }
 if(p.visual==='investment-scenarios')return INVESTMENT_STATES.slice(0,n).map(v=>`${v.label}q${v.q}万TEU/年，概率${v.probability*100}%，完整NPV${f(investmentOutcome('full','keep',v.q).npv)}万元`).join('；');
 if(p.visual==='investment-policy'){const v=investmentPolicies();return [['完整建设',v.full],['一期保持',v.phaseKeep],['一期必追加',v.phaseExpand]].slice(0,n).map(r=>r[0]+'：期望NPV '+f(Number(r[1]))+'万元').join('；');}
 if(p.visual==='investment-sensitivity'){
  if(s.progress<1)return '当前时点或折现率已给出，计算结果尚未全部展开。';
  if(p.slideKey==='l18-same-cash-different-year'){const t=[2,4,6][s.option]!;return `2650万元在第${t}年末发生，10%折现到t0为${f(investmentPV(2650,t))}万元。`;}
  const rate=[.05,.1,.15][s.option]!,v=investmentOutcome('full','keep',18,{...INVESTMENT_DEFAULT,rate});return `折现率${rate*100}%，中需求完整NPV${f(v.npv)}万元，零NPV需求门槛${f(investmentFullThreshold(rate))}万TEU/年。`;
 }
 if(p.visual==='investment-tree'){
  if(p.slideKey==='l18-year-one-information'){const q=INVESTMENT_STATES[s.option]!.q;return `t1观测需求${q}万TEU/年。`+(s.progress===1?`追加相对保持的t1增量NPV为${f(investmentExpansionDelta(q))}万元。`:'追加计算尚未完整展开。');}
  return INVESTMENT_STATES.slice(0,n).map(v=>{const r=investmentOutcome('phase',v.q===30?'expand':'keep',v.q);return `需求${v.q}：${v.q===30?'追加':'保持'}，t0 NPV${f(r.npv)}万元`;}).join('；')+(s.progress===1?`；期望${f(investmentPolicies().phaseAdaptive)}万元，相对最佳固定一期策略增加${f(investmentPolicies().flexibility)}万元。`:'');
 }
 return '当前公开的付款、施工与投产关系。'+(p.options?.[s.option]??'');
}
