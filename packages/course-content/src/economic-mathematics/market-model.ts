/** Classroom assumptions, not IBM's historical prices, accounts or measured demand. */
export const MARKET_SOURCES = {
 damaged:'https://onlinelibrary.wiley.com/doi/10.1111/j.1430-9134.1996.00149.x',
 versioning:'https://people.ischool.berkeley.edu/~hal/Papers/version.pdf',
 utility:'https://warwick.ac.uk/fac/soc/economics/staff/fsquintani/teaching/EC9D3_Lecture_1.pdf',
 macro:'https://www.richmondfed.org/publications/research/working_papers/2008/wp_08-1',
 sunk:'https://cognition.aau.at/bg/BA/Arkes%20%26%20Blumer%201985.pdf'
} as const;
export const marketModel={
 businessQuantity:(p:number)=>3000-10*p,
 ordinaryQuantity:(p:number)=>600-5*p,
 businessElasticity:(p:number)=>p>0&&p<300?p/(300-p):null,
 ordinaryElasticity:(p:number)=>p>0&&p<120?p/(120-p):null,
 businessRevenue:(p:number)=>p*(3000-10*p),
 businessProfit:(p:number,fixed=20000,cost=60)=>(p-cost)*(3000-10*p)-fixed,
 businessMR:(q:number)=>300-.2*q,
 utility:(q:number)=>Math.log(1+q),
 marginalUtility:(q:number)=>1/(1+q),
 platformCost:(q:number)=>50000+65*q,
 dedicatedCost:(q:number)=>300000+40*q,
 uniformProfit:(p:number)=>(p-60)*((p<=120?1:0)+(p<=300?1:0))
};
export type MenuChoice='快机'|'慢机'|'不购买'|'并列，需约定';
/** Refuse a silent tie-break: equal best options must be reported explicitly. */
export function menuOutcome(slow:number,fast:number,urgentSlow=110){
 if(![slow,fast,urgentSlow].every(Number.isFinite)||slow<0||fast<0)throw Error('MENU_DOMAIN');
 const choose=(vFast:number,vSlow:number)=>{
  const scores=[vFast-fast,vSlow-slow,0],best=Math.max(...scores),ties=scores.filter(v=>Math.abs(v-best)<1e-9).length;
  const choice:MenuChoice=ties>1?'并列，需约定':scores[0]===best?'快机':scores[1]===best?'慢机':'不购买';
  return{choice,surplus:best};
 };
 const ordinary=choose(120,100),urgent=choose(300,urgentSlow);
 const choices=[ordinary,urgent];
 const profit=choices.some(c=>c.choice==='并列，需约定')?null:choices.reduce((sum,c)=>sum+(c.choice==='快机'?fast-60:c.choice==='慢机'?slow-65:0),0);
 return{ordinary,urgent,profit,consumerSurplus:ordinary.surplus+urgent.surplus};
}
export function marketOptimum(capacity=3000,cost=60,fixed=20000){
 if(!Number.isFinite(capacity)||capacity<0||capacity>3000||!Number.isFinite(cost)||cost<0||cost>300||!Number.isFinite(fixed))throw Error('MARKET_DOMAIN');
 const quantity=Math.min(capacity,5*(300-cost)),price=300-.1*quantity;
 return{quantity,price,profit:marketModel.businessProfit(price,fixed,cost)};
}
const f=(x:number)=>Number(x.toFixed(2)).toLocaleString('zh-CN');
export function marketReadout(kind:'menu'|'market-elasticity',values:Readonly<Record<string,unknown>>):readonly(readonly[string,string])[]{
 if(kind==='menu'){
  const slow=Number(values.menuSlowPrice??99),fast=Number(values.menuFastPrice??288),v=Number(values.menuUrgentSlowValue??110),o=menuOutcome(slow,fast,v);
  return[['普通用户',o.ordinary.choice+'；净收益 '+f(o.ordinary.surplus)+' 元'],['急用用户',o.urgent.choice+'；净收益 '+f(o.urgent.surplus)+' 元'],['两类合计利润',o.profit===null?'选择并列，利润未唯一确定':f(o.profit)+' 元'],['版本价格差',f(fast-slow)+' 元'],['普通用户升级价值','20 元'],['急用用户升级价值',f(300-v)+' 元']];
 }
 const p=Number(values.marketPrice??100),q=marketModel.businessQuantity(p),E=marketModel.businessElasticity(p)!;
 return[['快机价格',f(p)+' 元/台'],['办公市场需求量',f(q)+' 台/月'],['点弹性 E',f(E)+'（无量纲）'],['月收入',f(marketModel.businessRevenue(p))+' 元/月'],['月利润',f(marketModel.businessProfit(p))+' 元/月'],['收入对价格的导数',f(q*(1-E))+'（元/月）/（元/台）']];
}
