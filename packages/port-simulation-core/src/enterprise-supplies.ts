import {enterpriseRandom,type EnterpriseState} from './enterprise-model.js';
import {event,post,spend} from './enterprise-support.js';

export function orderSupplies(s:EnterpriseState,item:'fuel'|'parts',quantity:number){
  const price=Math.round(quantity*(item==='fuel'?7.2:4000));spend(s,price,'inventory','订购'+(item==='fuel'?'燃料':'维修备件'));
  const order={id:'supply-'+s.nextId++,item,quantity,price,ordered:s.hour,ready:s.hour+(item==='fuel'?24:48),delayed:false,status:'transit' as const};
  s.supplyOrders.push(order);event(s,'supply','补给已下单',quantity+(item==='fuel'?'L燃料':'份备件')+'，预计第'+order.ready+'小时到货。',order.id);
}
export function receiveSupplies(s:EnterpriseState){
  if(s.hour%24===0){const holding=Math.round((s.fuelStock*7.2+s.spareParts*4000)*.0003);if(holding)post(s,'inventory-holding',holding,-holding,'库存保管与占用费用');}
  for(const o of s.supplyOrders){
    if(o.status!=='transit'||o.ready>s.hour)continue;
    if(!o.delayed&&enterpriseRandom(s.config.seed,'supply-delay-'+o.id,Math.floor(s.hour/24))<(s.config.scenario==='resilience'?.35:.05)){
      o.delayed=true;o.ready+=s.config.scenario==='resilience'?72:48;event(s,'supply','供应到货延期','新预计到货：第'+o.ready+'小时；已有库存继续保障作业。',o.id);continue;
    }
    if(o.item==='fuel')s.fuelStock+=o.quantity;else s.spareParts+=o.quantity;
    o.status='received';event(s,'supply','补给验收入库',o.quantity+(o.item==='fuel'?'L燃料':'份维修备件'),o.id);
  }
}
export function replenishSupplies(s:EnterpriseState){
  if(!s.policy.autoSupplies||s.cash<=s.policy.reserveCash)return;
  const daily=s.hour>=24?s.stats.fuel/(s.hour/24):900,target=Math.ceil(Math.max(600,daily)*s.management.plan.fuelDays);
  if(s.fuelStock<target*.5&&!s.supplyOrders.some(o=>o.item==='fuel'&&o.status==='transit')){
    const quantity=Math.max(0,Math.min(target-Math.floor(s.fuelStock),Math.floor((s.cash-s.policy.reserveCash)/7.2)));if(quantity)orderSupplies(s,'fuel',quantity);
  }
  if(s.spareParts<s.management.plan.partsTarget/2&&!s.supplyOrders.some(o=>o.item==='parts'&&o.status==='transit')){
    const quantity=Math.min(s.management.plan.partsTarget-s.spareParts,Math.floor(Math.max(0,s.cash-s.policy.reserveCash)/4000));if(quantity)orderSupplies(s,'parts',quantity);
  }
}
