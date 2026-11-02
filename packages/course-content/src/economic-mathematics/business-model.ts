import {marketReadout} from './market-model.js';
/** Legacy models retained for archived model checks. */
export const businessModel={
 price:(q:number)=>120-.1*q,
 quantity:(p:number)=>1200-10*p,
 revenue:(q:number)=>120*q-.1*q*q,
 cost:(q:number,fixed=2000,tax=0)=>fixed+(24+tax)*q+.02*q*q,
 marginalRevenue:(q:number)=>120-.2*q,
 marginalCost:(q:number,tax=0)=>24+tax+.04*q,
 profit:(q:number,fixed=2000,tax=0)=>96*q-.12*q*q-fixed-tax*q,
 marginalProfit:(q:number,tax=0)=>96-tax-.24*q,
 averageCost:(q:number,fixed=2000)=>q>0?fixed/q+24+.02*q:null,
 elasticity:(p:number)=>p>0&&p<120?p/(120-p):null,
 revenuePrice:(p:number)=>p*(1200-10*p),
 powerQuantity:(p:number,A=360000,eta=2)=>A*Math.pow(p,-eta),
 powerProfit:(p:number,A=360000,eta=2,c=30,fixed=1000)=>(p-c)*A*Math.pow(p,-eta)-fixed,
 revenueMinimumQuantity:(p:number)=>100*(p-2+2/p),
 revenueMinimumDerivative:(p:number)=>100*(1-2/(p*p))
};
export function businessOptimum(capacity=1200,fixed=2000,tax=0){
 if(!Number.isFinite(capacity)||capacity<0||capacity>1200||!Number.isFinite(fixed)||!Number.isFinite(tax)||tax<0)throw Error('BUSINESS_DOMAIN');
 const q=Math.max(0,Math.min(capacity,(96-tax)/.24));
 return{quantity:q,price:businessModel.price(q),profit:businessModel.profit(q,fixed,tax)};
}
export function capacityValue(capacity:number){return businessOptimum(capacity).profit;}
export function capacityMarginalValue(capacity:number){return Math.max(0,96-.24*capacity);}
export function finiteBusinessChange(q:number,h:number){return{
 revenue:h*(120-.2*q)-.1*h*h,
 cost:h*(24+.04*q)+.02*h*h,
 profit:h*(96-.24*q)-.12*h*h
};}
const fmt=(v:number)=>Number(v.toFixed(2)).toLocaleString('zh-CN');
export function businessReadout(kind:'marginal'|'elasticity'|'menu'|'market-elasticity',values:Readonly<Record<string,unknown>>):readonly(readonly[string,string])[]{
 if(kind==='menu'||kind==='market-elasticity')return marketReadout(kind,values);
 if(kind==='marginal'){
  const K=Number(values.businessCapacity??500),F=Number(values.businessFixed??2000),tax=Number(values.businessTax??0),q=Number(values.businessQuantity??400);
  const feasible=q<=K;
  return[['计划销量',fmt(q)+' 件/周'],['产能与可行性',fmt(K)+' 件/周；'+(feasible?'可行':'超出产能')],['统一价格',fmt(businessModel.price(q))+' 元/件'],['边际收入',fmt(businessModel.marginalRevenue(q))+' 元/件'],['边际成本',fmt(businessModel.marginalCost(q,tax))+' 元/件'],['计划利润',feasible?fmt(businessModel.profit(q,F,tax))+' 元/周':'不可行，不能作为执行方案']];
 }
 const p=Number(values.businessPrice??80),q=businessModel.quantity(p),E=businessModel.elasticity(p)!;
 return[['价格',fmt(p)+' 元/件'],['需求量',fmt(q)+' 件/周'],['点弹性 E',fmt(E)+'（无量纲）'],['收入',fmt(businessModel.revenue(q))+' 元/周'],['利润',fmt(businessModel.profit(q))+' 元/周'],['收入的价格导数',fmt(q*(1-E))+'（元/周）/（元/件）']];
}
