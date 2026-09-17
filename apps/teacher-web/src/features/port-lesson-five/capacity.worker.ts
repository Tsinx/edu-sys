import { createCapacityRun, advanceCapacityRun, restoreCapacityRun, serializeCapacityRun, capacityView, type CapacityRun, type PortCapacityPlan } from '@edu/port-simulation-core';
let run:CapacityRun|undefined;
self.onmessage=(event:MessageEvent<{id:number;type:'load'|'advance';plan?:PortCapacityPlan;raw?:string;seconds?:number}>)=>{
 const m=event.data;
 try{
  if(m.type==='load'){run=m.raw?restoreCapacityRun(m.raw):createCapacityRun(m.plan!);if(run.plan!==m.plan)throw new Error('记录与当前方案不一致。');}
  else {if(!run)throw new Error('实验尚未初始化。');advanceCapacityRun(run,m.seconds!);}
  postMessage({id:m.id,view:capacityView(run!),raw:serializeCapacityRun(run!)});
 }catch(error){postMessage({id:m.id,error:error instanceof Error?error.message:String(error)});}
};
