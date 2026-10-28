import {enterpriseRandom,type CargoLot,type EnterpriseState,type YardBlock,type YardColumn,type YardLayer,type YardPlan} from './enterprise-model.js';
import {month,post,terminal} from './enterprise-support.js';

export const DEFAULT_YARD_PLAN:YardPlan={allocation:'fixed',classification:'arrival',importShare:50,sharedShare:10,maxTiers:4};
const total=(column:YardColumn)=>column.layers.reduce((n,l)=>n+l.quantity,0);
const lotIndexes=new WeakMap<EnterpriseState,{count:number;values:Map<string,CargoLot>}>();
function lotIndex(s:EnterpriseState){let index=lotIndexes.get(s);if(!index){index={count:0,values:new Map()};lotIndexes.set(s,index);}while(index.count<s.lots.length){const l=s.lots[index.count++]!;index.values.set(l.id,l);}return index.values;}
export function createYardBlocks(terminalId:string):YardBlock[]{
  return Array.from({length:10},(_,index)=>({id:terminalId+'-B'+(index+1),terminalId,index,columns:Array.from({length:5},()=>({layers:[]}))}));
}
export function yardPurpose(plan:YardPlan,index:number):'import'|'export'|'shared'{
  return index<plan.importShare/10?'import':index<(100-plan.sharedShare)/10?'export':'shared';
}
export function yardBlockCapacity(s:EnterpriseState,b:YardBlock){
  const capacity=terminal(s,b.terminalId).storageCapacity;
  return Math.floor(capacity/10)+(b.index<capacity%10?1:0);
}
function columnCapacity(s:EnterpriseState,b:YardBlock,index:number){const n=yardBlockCapacity(s,b);return Math.floor(n/5)+(index<n%5?1:0);}
function room(s:EnterpriseState,b:YardBlock,c:YardColumn,index:number,layer:YardLayer){
  const physical=columnCapacity(s,b,index),unit=Math.ceil(physical/4),top=c.layers.at(-1),plan=s.management.yardPlans[b.terminalId]!;
  if(c.layers.length>plan.maxTiers)return 0;
  const available=top?.lotId===layer.lotId&&top.quantity<unit?unit-top.quantity:c.layers.length<plan.maxTiers?unit:0;
  return Math.max(0,Math.min(physical-total(c),available));
}
const distance=(block:YardBlock,flow:CargoLot['flow'],retrieving=false)=>1+((flow==='import')!==retrieving?block.index:9-block.index)*.06;
function eligible(plan:YardPlan,b:YardBlock,flow:CargoLot['flow']){
  const purpose=yardPurpose(plan,b.index);
  return purpose===flow||plan.allocation!=='fixed'&&purpose==='shared'||plan.allocation==='dynamic';
}
function layerFor(s:EnterpriseState,l:CargoLot):YardLayer{
  // Only published commitments and current release information are used; never actual future arrivals.
  const error=(enterpriseRandom(s.config.seed,'yard-estimate-'+l.id,0)-.5)*(s.digitalLevel>=2?8:24);
  const expectedHour=l.deadline+(l.release?0:12)+error;
  const remaining=expectedHour-s.hour;
  const plan=s.management.yardPlans[l.terminalId]!;
  return {lotId:l.id,quantity:0,expectedHour,group:plan.classification==='voyage'?l.callId:remaining<=24?'A':remaining<=48?'B':'C'};
}
function candidates(s:EnterpriseState,l:CargoLot,layer:YardLayer,exclude?:YardColumn,avoidLot?:string){
  const plan=s.management.yardPlans[l.terminalId]!;
  // Scores are fixed during this search. Compute each once instead of allocating
  // and re-evaluating a ranking function for every sort comparison.
  const result:Array<{b:YardBlock;c:YardColumn;index:number;rank:number}>=[];
  for(const b of s.management.blocks){
    if(b.terminalId!==l.terminalId||!eligible(plan,b,l.flow))continue;
    for(let index=0;index<b.columns.length;index++){
      const c=b.columns[index]!;
      if(c===exclude||avoidLot&&c.layers.some(p=>p.lotId===avoidLot)||room(s,b,c,index,layer)<=0)continue;
      const top=c.layers.at(-1);
      const rank=top?.lotId===l.id?-100:plan.classification==='arrival'?distance(b,l.flow)*10+index*.01:
        (top?.group===layer.group?-5:!top?-2:3)+(top&&top.expectedHour<layer.expectedHour?8:0)+distance(b,l.flow,true)*(layer.group==='A'?3:1)+index*.01;
      result.push({b,c,index,rank});
    }
  }
  return result.sort((a,b)=>a.rank-b.rank||a.b.index-b.b.index||a.index-b.index);
}
function append(c:YardColumn,layer:YardLayer,n:number,perLayer:number){const top=c.layers.at(-1);if(top?.lotId===layer.lotId&&top.quantity<perLayer)top.quantity+=n;else c.layers.push({...layer,quantity:n});}
export function storeYard(s:EnterpriseState,l:CargoLot,requested:number,movementBudget:number){
  if(requested<=0)return {quantity:0,movement:0};
  if(movementBudget<=0){if(l.goods==='container')s.management.metrics.yardBlockedHours++;return {quantity:0,movement:0};}
  if(l.goods!=='container')return {quantity:Math.max(0,Math.min(requested,movementBudget)),movement:Math.max(0,Math.min(requested,movementBudget))};
  let quantity=0,movement=0;const layer=layerFor(s,l),plan=s.management.yardPlans[l.terminalId]!;
  while(quantity<requested){
    const target=candidates(s,l,layer).find(x=>Math.floor((movementBudget-movement)/distance(x.b,l.flow))>0);if(!target)break;
    const n=Math.min(requested-quantity,room(s,target.b,target.c,target.index,layer),Math.floor((movementBudget-movement)/distance(target.b,l.flow)));
    if(n<=0)break;
    append(target.c,layer,n,Math.ceil(columnCapacity(s,target.b,target.index)/4));const work=Math.ceil(n*distance(target.b,l.flow));quantity+=n;movement+=work;
    if(yardPurpose(plan,target.b.index)!==l.flow)s.management.metrics.sharedUnits+=n;
  }
  s.management.metrics.yardStored+=quantity;s.management.metrics.travelWork+=movement;
  if(requested>0&&quantity===0)s.management.metrics.yardBlockedHours++;
  return {quantity,movement};
}

/** Relocations are planned atomically, need real free slots and consume crane/vehicle capacity. */
function relocate(s:EnterpriseState,source:{b:YardBlock;c:YardColumn},targetLot:string,yardBudget:number,transportBudget:number){
  const top=source.c.layers.at(-1);if(!top||top.lotId===targetLot||top.quantity>=yardBudget)return null;
  const owner=lotIndex(s).get(top.lotId)!;
  const options=candidates(s,owner,top,source.c,targetLot),shadow=new Map<YardColumn,YardColumn>();
  let remaining=top.quantity,transport=0;
  for(const x of options){
    const column={layers:x.c.layers.map(p=>({...p}))};
    const factor=x.b.id===source.b.id?0:1+Math.abs(x.b.index-source.b.index)*.06;
    const limit=factor?Math.floor((transportBudget-transport)/factor):remaining;
    const n=Math.min(remaining,room(s,x.b,column,x.index,top),limit);if(n<=0)continue;
    append(column,top,n,Math.ceil(columnCapacity(s,x.b,x.index)/4));shadow.set(x.c,column);remaining-=n;transport+=Math.ceil(n*factor);if(!remaining)break;
  }
  if(remaining)return null;
  source.c.layers.pop();for(const [original,copy]of shadow)original.layers=copy.layers;
  owner.rehandles+=top.quantity;s.stats.rehandles+=top.quantity;month(s).rehandles+=top.quantity;
  s.management.metrics.yardRehandles+=top.quantity;
  post(s,'rehandling',top.quantity*55,-top.quantity*55,'堆叠遮挡实际翻箱');
  return {moves:top.quantity,transport};
}
export function retrieveYard(s:EnterpriseState,l:CargoLot,requested:number,yardBudget:number,movementBudget:number,relocationTransportBudget:number,sharedTransport=false){
  if(requested<=0)return {quantity:0,movement:0,rehandles:0,relocationTransport:0};
  if(yardBudget<=0||movementBudget<=0){if(l.goods==='container')s.management.metrics.yardBlockedHours++;return {quantity:0,movement:0,rehandles:0,relocationTransport:0};}
  if(l.goods!=='container')return {quantity:Math.max(0,Math.min(requested,yardBudget,movementBudget)),movement:Math.max(0,Math.min(requested,yardBudget,movementBudget)),rehandles:0,relocationTransport:0};
  let quantity=0,movement=0,rehandles=0,relocationTransport=0;
  const locations=s.management.blocks.filter(b=>b.terminalId===l.terminalId).flatMap(b=>b.columns.map(c=>({b,c}))).filter(x=>x.c.layers.some(p=>p.lotId===l.id));
  locations.sort((a,b)=>Number(b.c.layers.at(-1)?.lotId===l.id)-Number(a.c.layers.at(-1)?.lotId===l.id)||distance(a.b,l.flow,true)-distance(b.b,l.flow,true));
  for(const x of locations){
    while(quantity<requested&&x.c.layers.some(p=>p.lotId===l.id)){
      const top=x.c.layers.at(-1)!;
      if(top.lotId!==l.id){
        const moved=relocate(s,x,l.id,yardBudget-movement-rehandles,relocationTransportBudget-relocationTransport-(sharedTransport?movement:0));
        if(!moved)break;rehandles+=moved.moves;relocationTransport+=moved.transport;continue;
      }
      const n=Math.min(top.quantity,requested-quantity,Math.floor((yardBudget-movement-rehandles)/distance(x.b,l.flow,true)),Math.floor((movementBudget-movement-(sharedTransport?relocationTransport:0))/distance(x.b,l.flow,true)));
      if(n<=0)break;
      top.quantity-=n;if(!top.quantity)x.c.layers.pop();quantity+=n;movement+=Math.ceil(n*distance(x.b,l.flow,true));
    }
  }
  s.management.metrics.yardRetrieved+=quantity;s.management.metrics.travelWork+=movement+relocationTransport;
  if(requested>0&&quantity===0)s.management.metrics.yardBlockedHours++;
  return {quantity,movement,rehandles,relocationTransport};
}
export function discardYard(s:EnterpriseState,lotId:string,quantity:number){
  let remaining=quantity;
  for(const b of s.management.blocks)for(const c of b.columns)for(let i=c.layers.length-1;i>=0&&remaining;i--){const p=c.layers[i]!;if(p.lotId!==lotId)continue;const n=Math.min(p.quantity,remaining);p.quantity-=n;remaining-=n;if(!p.quantity)c.layers.splice(i,1);}
}
export function yardOverview(s:EnterpriseState){
  const lots=lotIndex(s);
  return s.management.blocks.map(b=>{
    const plan=s.management.yardPlans[b.terminalId]!,layers=b.columns.flatMap(c=>c.layers),used=layers.reduce((n,p)=>n+p.quantity,0);
    return {id:b.id,terminalId:b.terminalId,index:b.index,purpose:yardPurpose(plan,b.index),capacity:yardBlockCapacity(s,b),used,
      importStock:layers.reduce((n,p)=>n+(lots.get(p.lotId)?.flow==='import'?p.quantity:0),0),
      exportStock:layers.reduce((n,p)=>n+(lots.get(p.lotId)?.flow==='export'?p.quantity:0),0),
      layers:b.columns.reduce((n,c)=>Math.max(n,c.layers.length),0),groups:[...new Set(layers.map(p=>p.group))]};
  });
}
export function assertYards(s:EnterpriseState){
  const lots=lotIndex(s);
  const quantities=new Map<string,number>();
  for(const b of s.management.blocks){
    let used=0;
    for(const [index,c]of b.columns.entries()){
      if(c.layers.length>4)throw Error('堆垛物理层数超限：'+b.id);
      for(const p of c.layers){const l=lots.get(p.lotId);if(!Number.isSafeInteger(p.quantity)||p.quantity<=0||!l||l.goods!=='container'||l.terminalId!==b.terminalId)throw Error('堆垛货批或数量无效。');quantities.set(p.lotId,(quantities.get(p.lotId)??0)+p.quantity);used+=p.quantity;}
      if(total(c)>columnCapacity(s,b,index))throw Error('堆垛容量超限：'+b.id);
    }
    if(used>yardBlockCapacity(s,b))throw Error('区块容量超限：'+b.id);
  }
  for(const l of s.lots)if(l.goods==='container'&&(quantities.get(l.id)??0)!==l.yard)throw Error('区块库存与货批不一致：'+l.id);
}
