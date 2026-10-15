import { TERMINAL_EQUIPMENT, type TerminalDispatch } from './terminal-lab.js';
import type { PortBox, PortJob, PortPlan, PortSession } from './port-operations-model.js';
import { externalParking, facilityGantryRoute, facilityRoadRoute, facilityRoadCells, facilityRoutePose, gateExchange, reserveFacilityRoad, truckParking, yardCentre, yardExchange, yardRoadFront, yardSlotPosition,
  type FacilityPoint, type FacilityPose, type FacilityRoute, type RoadReservation } from './port-facility-layout.js';

export const PORT_FACILITY_VERSION = 'port-facilities/1.0' as const;
export interface PhysicalVehicle { id:number; external:boolean; role?:'import'|'export'; pose:FacilityPose; loadedBox:string|null; reservedBy:number|null }
export interface PhysicalYardMachine { id:number; yard:string; pose:FacilityPose }
export interface PhysicalJob {
  stage:'traffic-wait'|'road-wait'|'work-wait'|'empty'|'haul'|'machine'|'crane'|'service'; nextStage?:'empty'|'haul'|'machine';
  carrier:number|null; yard:string|null; route:FacilityRoute|null; duration:number; phaseStart:number; nextDuration?:number;
  targetSlot?:number; sourceSlot?:number; rehandle?:boolean; parking?:boolean; originBay?:string; roadDeparture?:number;
}
export interface PortFacilityState {
  version:typeof PORT_FACILITY_VERSION;
  vehicles:PhysicalVehicle[]; yardMachines:PhysicalYardMachine[]; bays:Record<string,number>;
  quayCranes:{id:number;pose:FacilityPose}[];
  quayShift?:{start:number;end:number;from:FacilityPose[];to:FacilityPose[]};
  reservations:RoadReservation[];
  enabled:{quay:[boolean,boolean];truck:boolean;yard:boolean;gate:boolean};
  gateLimit:number|null;
  waitingBoxSeconds:number;
  drainCommitted?:boolean;
  closedRoads:{owner:number;keys:string[]}[];
  moves:{job:number;vehicle:number;empty:boolean;from:FacilityPoint;to:FacilityPoint;start:number;end:number;distance:number}[];
  /** Classroom incident only. Protection drains the committed transfer before maintenance. */
  yardIncident?:{failed:number;yard:string;isolated:boolean;mode:'fault'|'trial';trialRemaining:number;trialCompleted:number;relief:number|null;reliefHome:string;reliefActive:boolean;returnRequested:boolean;retreat?:{start:number;end:number;from:FacilityPose;to:FacilityPose}};
}
export function createPortFacilities(plan:PortPlan):PortFacilityState {
  const internal=plan.equipment.vehicles, outside=Math.max(2,plan.equipment.gates*2);
  return {version:PORT_FACILITY_VERSION,vehicles:Array.from({length:internal+outside},(_,id)=>({id,external:id>=internal,...(id>=internal?{role:((id-internal)%2?'export':'import') as 'import'|'export'}:{}),pose:{...(id>=internal?externalParking(id-internal):truckParking(id)),heading:0},loadedBox:null,reservedBy:null})),
    yardMachines:Array.from({length:plan.equipment.yardMachines},(_,id)=>{const y=plan.yards[id%plan.yards.length]!;return {id,yard:y.id,pose:{...yardCentre(y.col,y.row),heading:0}};}),quayCranes:Array.from({length:plan.equipment.cranes},(_,id)=>({id,pose:craneHome(plan,id)})),bays:{},reservations:[],enabled:{quay:[true,true],truck:true,yard:true,gate:true},gateLimit:null,waitingBoxSeconds:0,closedRoads:[],moves:[]};
}
function craneHome(plan:PortPlan,id:number):FacilityPose{const a=plan.equipment.dispatch.berthCranes[0],b=id<a?0:1,local=id-(b?a:0),n=plan.equipment.dispatch.berthCranes[b],assigned=a+plan.equipment.dispatch.berthCranes[1];return {x:id>=assigned?130+(id-assigned)*16:(b?62:-62)-27.5+(n===1?3.5:local===0?0:7)*8,z:-39,heading:0};}
function craneClear(s:PortSession,id:number,target:number){const from=s.facilities!.quayCranes[id]!.pose.x;return s.facilities!.quayCranes.every(other=>{if(other.id===id)return true;const j=s.jobs.find(j=>j.kind==='quay'&&j.resource===other.id),end=j?.physical?.stage==='crane'?j.physical.route?.points.at(-1)?.x??other.pose.x:other.pose.x,lo=Math.min(other.pose.x,end),hi=Math.max(other.pose.x,end);return other.id<id?hi+14<=Math.min(from,target):Math.max(from,target)+14<=lo;});}
export function physicalResourceCapacities(s:PortSession) {
  const e=s.plan.equipment,d=e.dispatch;
  return {quay:Math.min(e.cranes,d.craneOperators,d.berthCranes[0]+d.berthCranes[1]),truck:Math.min(e.vehicles,d.drivers*(e.vehicle==='agv'?4:1),e.vehicle==='tractor'?16:e.facilities.filter(f=>f.kind==='charger').length*8),yard:Math.min(e.yardMachines,d.yardOperators),gate:Math.min(e.gates,d.gateClerks*(e.gateSystem==='smart'?2:1),e.facilities.filter(f=>f.kind==='gate').length*2)};
}
const pointDistance=(a:FacilityPoint,b:FacilityPoint)=>Math.hypot(a.x-b.x,a.z-b.z);
const berthOf=(s:PortSession,box:PortBox)=>s.calls[s.batches[box.batchId]!.callId]!.berth??0;
export function physicalQuayPoint(s:Pick<PortSession,'plan'>,crane:number,box?:PortBox):FacilityPoint {
  if(box?.dockX!==undefined)return {x:box.dockX,z:-37};
  const a=s.plan.equipment.dispatch.berthCranes[0],berth=crane<a?0:1,local=crane-(berth?a:0),n=s.plan.equipment.dispatch.berthCranes[berth];
  return {x:(berth?62:-62)+(local-(n-1)/2)*19,z:-37};
}
export function physicalLocationPoint(s:Pick<PortSession,'plan'|'calls'>,location:string):FacilityPoint {
  const [kind,id]=location.split(':');
  if(['yard','handoff','pickup'].includes(kind!)){const y=s.plan.yards.find(y=>y.id===id);if(y)return kind==='yard'?yardCentre(y.col,y.row):yardExchange(y.col,y.row);}
  if(['quay','loading','ship'].includes(kind!))return {x:s.calls[id!]?.berth===1?62:-62,z:kind==='ship'?-70:-26};
  return gateExchange(s.plan.equipment);
}
function release(s:PortSession,key:string,carrier:number|null){if(carrier!==null&&s.facilities!.bays[key]===carrier)delete s.facilities!.bays[key];}
function leaveBay(s:PortSession,j:PortJob){const p=j.physical!;if(p.originBay)release(s,p.originBay,p.carrier);if(j.from.startsWith('quay:'))release(s,`dock:${s.boxes[j.boxId]!.dock}`,p.carrier);if(j.from.startsWith('pickup:'))release(s,`yard:${j.from.slice(7)}`,p.carrier);if(j.from==='gate:in')release(s,`gate:${s.boxes[j.boxId]!.gateLane}`,p.carrier);}
function stage(s:PortSession,j:PortJob,name:PhysicalJob['stage'],duration:number,route:FacilityRoute|null=null){
  Object.assign(j.physical!,{stage:name,duration:Math.max(1,Math.ceil(duration)),phaseStart:s.second,route});j.remaining=1;j.updatedAt=s.second;j.rate=1/j.physical!.duration;j.end=s.second+j.physical!.duration;
}
function move(s:PortSession,j:PortJob,route:FacilityRoute,name:'empty'|'haul'|'machine'){
  const f=s.facilities!,external=j.physical!.carrier!==null&&f.vehicles[j.physical!.carrier]!.external,speed=name==='machine'?.6:external?2:2*(s.plan.equipment.vehicle==='tractor'?1:s.plan.equipment.vehicle==='electric'?1.1:1.2);
  if(roadClosed(s,route,j.id)){stage(s,j,'traffic-wait',1,route);j.physical!.nextStage=name;j.rate=0;j.end=null;return;}
  f.reservations=f.reservations.filter(r=>r.end>s.second&&r.owner!==j.id);
  const booked=reserveFacilityRoad(route,s.second,speed,j.id,f.reservations);
  if(booked.start>s.second){stage(s,j,'road-wait',booked.start-s.second,route);j.physical!.nextStage=name;j.physical!.duration=booked.start-s.second;}
  else{stage(s,j,name,booked.duration,route);if(name==='haul'||j.physical!.parking)leaveBay(s,j);}
  // Movement duration is attached to the next phase when road entry is delayed.
  if(j.physical!.stage==='road-wait'){j.physical!.nextDuration=booked.duration;j.physical!.roadDeparture=booked.start;}
}
function roadClosed(s:PortSession,route:FacilityRoute,owner:number){const keys=facilityRoadCells(route);return s.facilities!.closedRoads.some(c=>c.owner!==owner&&c.keys.some(k=>keys.includes(k)));}
function yardWorkKeys(s:PortSession,j:PortJob){const y=s.plan.yards.find(y=>y.id===j.physical!.yard)!,front=yardRoadFront(y.col,y.row),keys:string[]=[];for(let x=Math.floor((front.x-15)/6);x<=Math.ceil((front.x+15)/6);x++)for(let z=Math.floor((front.z-4)/6);z<=Math.ceil((front.z+4)/6);z++)keys.push(`road:${x},${z}`);return keys;}
function closeYardWork(s:PortSession,j:PortJob){if(!s.facilities!.closedRoads.some(c=>c.owner===j.id))s.facilities!.closedRoads.push({owner:j.id,keys:yardWorkKeys(s,j)});}
// Additional phase metadata is kept in the command-replayed authoritative state.
function serviceDuration(s:PortSession,j:PortJob){const e=s.plan.equipment;if(j.kind==='yard'){const p=j.physical!,y=s.plan.yards.find(y=>y.id===p.yard)!,slot=yardSlotPosition(y.col,y.row,p.targetSlot??p.sourceSlot??0),front=yardExchange(y.col,y.row);return 3600/TERMINAL_EQUIPMENT.yardMachine[e.yardMachine].rate+Math.abs(slot.z-front.z)/.5+Math.abs(slot.x-front.x); }return j.kind==='quay'?3600/(TERMINAL_EQUIPMENT.crane[e.crane].rate*.75*s.wind):3600/TERMINAL_EQUIPMENT.gateSystem[e.gateSystem].rate;}
function service(s:PortSession,j:PortJob){
  if(j.kind==='quay'){
    const crane=s.facilities!.quayCranes[j.resource]!,target={x:s.boxes[j.boxId]!.dockX!,z:-39};
    if(pointDistance(crane.pose,target)>.01){const route={points:[crane.pose,target],length:pointDistance(crane.pose,target),edges:[]};stage(s,j,'crane',route.length/.5,route);return;}
  }
  if(j.kind==='yard'){
    const duration=Math.ceil(serviceDuration(s,j)),keys=yardWorkKeys(s,j);
    closeYardWork(s,j);
    const start=Math.max(s.second,...s.facilities!.reservations.filter(r=>r.owner!==j.id&&keys.includes(r.key)&&r.end>s.second).map(r=>Math.ceil(r.end)));
    if(start>s.second){stage(s,j,'work-wait',start-s.second);j.physical!.nextDuration=duration;return;}
  }
  if(j.kind==='gate'&&j.from==='external'){const v=s.facilities!.vehicles[j.physical!.carrier!]!;v.loadedBox=j.boxId;s.boxes[j.boxId]!.carrier=v.id;}
  stage(s,j,'service',serviceDuration(s,j));
}
function startApproach(s:PortSession,j:PortJob){
  const f=s.facilities!,p=j.physical!;
  if(p.carrier===null){service(s,j);return;}
  const vehicle=f.vehicles[p.carrier]!;
  const target=j.kind==='quay'?physicalQuayPoint(s,j.resource,s.boxes[j.boxId]):j.kind==='yard'?physicalLocationPoint(s,`handoff:${p.yard}`):gateExchange(s.plan.equipment,j.resource);
  if(pointDistance(vehicle.pose,target)<.01){service(s,j);return;}
  move(s,j,facilityRoadRoute(vehicle.pose,target),'empty');
}
function freeVehicle(s:PortSession,external:boolean,target:FacilityPoint,flow?:'import'|'export'){const f=s.facilities!,c=physicalResourceCapacities(s);return f.vehicles.filter(v=>v.external===external&&(!external||!flow||v.role===flow)&&v.loadedBox===null&&v.reservedBy===null&&(external||v.id<c.truck)).sort((a,b)=>pointDistance(a.pose,target)-pointDistance(b.pose,target)||a.id-b.id)[0];}
interface Candidate {box:PortBox;kind:PortJob['kind'];to:string;purpose:'flow'|'relocate';berth?:number}
function stackBlockers(s:PortSession,box:PortBox){return Object.values(s.boxes).filter(b=>b.id!==box.id&&b.location===box.location&&b.slot!==null&&b.slot!==undefined&&box.slot!==null&&box.slot!==undefined&&b.slot%21===box.slot%21&&b.slot>box.slot).sort((a,b)=>b.slot!-a.slot!);}
function vacantSlot(s:PortSession,yard:string,exclude=-1):number|null{
  const capacity=s.plan.yards.find(y=>y.id===yard)!.capacity;
  const occupied=new Set(Object.values(s.boxes).filter(b=>b.location===`yard:${yard}`&&b.slot!==null&&b.slot!==undefined).map(b=>b.slot!));
  for(const j of s.jobs)if(j.physical?.yard===yard&&j.physical.targetSlot!==undefined)occupied.add(j.physical.targetSlot);
  for(let level=0;level<5;level++)for(let column=0;column<21;column++){const n=level*21+column;if(column!==exclude&&n<capacity&&!occupied.has(n)&&(level===0||occupied.has(n-21)))return n;}
  return null;
}
function craneColumn(s:PortSession,resource:number,slot:number){const a=s.plan.equipment.dispatch.berthCranes[0],b=resource<a?0:1,n=s.plan.equipment.dispatch.berthCranes[b],local=resource-(b?a:0);return Math.floor((slot%8)*n/8)===local;}
function shipSlotX(s:PortSession,box:PortBox,slot:number){return (berthOf(s,box)?62:-62)-27.5+(slot%8)*8;}
function freeShipSlot(s:PortSession,box:PortBox,resource:number):number|null{
  const call=s.batches[box.batchId]!.callId,used=new Set<number>(),installed=new Set<number>(),imports=new Set<number>();
  for(const b of Object.values(s.boxes).filter(b=>s.batches[b.batchId]!.callId===call)){if(b.shipSlot!==null&&b.shipSlot!==undefined&&b.location===`ship:${call}`){used.add(b.shipSlot);installed.add(b.shipSlot);if(s.batches[b.batchId]!.flow==='import'&&b.unloadedAt===null)imports.add(b.shipSlot%32);}if(b.targetShipSlot!==undefined)used.add(b.targetShipSlot);}
  for(let n=0;n<256;n++)if(craneColumn(s,resource,n)&&!imports.has(n%32)&&!used.has(n)&&(n<32||installed.has(n-32))&&craneClear(s,resource,shipSlotX(s,box,n)))return n;return null;
}
/** Discrete handling with a physical carrier: no container can leave a ship or a stack by itself. */
export function schedulePhysicalJobs(s:PortSession,options:Candidate[]){
  const f=s.facilities!,c=physicalResourceCapacities(s),used=new Set(s.jobs.map(j=>j.boxId));
  const allBoxes=Object.values(s.boxes),shipTop=new Map<string,number>(),stacks=new Map<string,PortBox[]>(),progress=new Map<string,number>();
  for(const b of allBoxes){if(b.location.startsWith('ship:')&&b.shipSlot!==null&&b.shipSlot!==undefined){const key=`${b.location}:${b.shipSlot%32}`;shipTop.set(key,Math.max(shipTop.get(key)??-1,b.shipSlot));}if(b.location.startsWith('yard:')&&b.slot!==null&&b.slot!==undefined){const key=`${b.location}:${b.slot%21}`,stack=stacks.get(key)??[];stack.push(b);stacks.set(key,stack);}if(b.unloadedAt!==null||b.loadedAt!==null){const call=s.batches[b.batchId]!.callId;progress.set(call,(progress.get(call)??0)+1);}}
  const blockers=(box:PortBox)=>(stacks.get(`${box.location}:${box.slot!%21}`)??[]).filter(b=>b.slot!>box.slot!).sort((a,b)=>b.slot!-a.slot!);
  const rehandles:Candidate[]=[];
  for(const n of options.filter(n=>n.kind==='yard'&&n.box.location.startsWith('yard:'))){const top=blockers(n.box)[0];if(top&&!used.has(top.id)&&!options.some(o=>o.box.id===top.id))rehandles.push({box:top,kind:'yard',to:top.location,purpose:'relocate'});}
  options=[...rehandles,...options];
  const craneOrder=Array.from({length:c.quay},(_,i)=>i).sort((a,b)=>{
    const berth=(i:number)=>i<s.plan.equipment.dispatch.berthCranes[0]?0:1;
    const count=(i:number)=>{const call=s.berths[berth(i)];return call?progress.get(call)??0:Infinity;};
    const preferred=s.plan.equipment.dispatch.priority;return preferred==='balanced'?count(a)-count(b)||a-b:((berth(a)===(preferred==='a'?0:1)?0:1)-(berth(b)===(preferred==='a'?0:1)?0:1))||a-b;
  });
  for(const kind of ['yard','gate','truck','quay'] as const)for(const resource of kind==='quay'?craneOrder:Array.from({length:kind==='truck'?f.vehicles.length:c[kind]},(_,i)=>i)){
    if(s.jobs.some(j=>j.kind===kind&&j.resource===resource)||kind==='quay'&&(resource===s.failedCrane||f.quayShift))continue;
    const incident=f.yardIncident;
    if(kind==='yard'&&incident&&resource===incident.failed&&(incident.mode==='fault'||incident.trialRemaining<=0))continue;
    if(kind==='yard'&&incident?.returnRequested&&resource===incident.relief)continue;
    const enabled=kind==='quay'?f.enabled.quay[resource<s.plan.equipment.dispatch.berthCranes[0]?0:1]:f.enabled[kind];if(!enabled)continue;
    for(const n of options.filter(n=>n.kind===kind&&!used.has(n.box.id))){
      const box=n.box,batch=s.batches[box.batchId]!,from=box.location;
      let carrier:number|null=null,yard:string|null=null,relocation:FacilityRoute|null=null,targetSlot:number|undefined;
      const rehandle=kind==='yard'&&n.to===from;
      if(kind==='quay'){
        const berth=resource<s.plan.equipment.dispatch.berthCranes[0]?0:1;
        if(n.berth!==berth||s.schedules.find(v=>v.id===batch.callId)!.large&&TERMINAL_EQUIPMENT.crane[s.plan.equipment.crane].reach<24)continue;
        if(from.startsWith('ship:')){
          if(!batch.targetYard||!f.enabled.truck||f.bays[`dock:${resource}`]!==undefined)continue;
          const slot=box.shipSlot!;if(!craneColumn(s,resource,slot)||shipTop.get(`${from}:${slot%32}`)!>slot||!craneClear(s,resource,shipSlotX(s,box,slot)))continue;
          box.dockX=shipSlotX(s,box,slot);const v=freeVehicle(s,false,physicalQuayPoint(s,resource,box));if(!v)continue;carrier=v.id;
        }else{
          carrier=box.carrier??null;if(carrier===null||f.vehicles[carrier]!.reservedBy!==null)continue;
          if(pointDistance(f.vehicles[carrier]!.pose,physicalQuayPoint(s,resource,box))>.01||box.dock!==resource)continue;
        }
      }else if(kind==='truck'){
        carrier=box.carrier??null;if(carrier===null||carrier!==resource||f.vehicles[carrier]!.reservedBy!==null||!f.vehicles[carrier]!.external&&carrier>=c.truck)continue;
        if(n.to.startsWith('handoff:')){yard=n.to.slice(8);if(f.bays[`yard:${yard}`]!==undefined)continue;}
        if(n.to==='gate:out'){const gates=Math.min(s.plan.equipment.gates,s.plan.equipment.facilities.filter(f=>f.kind==='gate').length*2);const lane=Array.from({length:gates},(_,i)=>i).find(i=>f.bays[`gate:${i}`]===undefined);if(lane===undefined)continue;box.gateLane=lane;f.bays[`gate:${lane}`]=carrier;}
        if(n.to.startsWith('loading:')){
          if(box.targetShipSlot!==undefined){if(f.bays[`dock:${box.dock}`]!==undefined)continue;f.bays[`dock:${box.dock}`]=carrier;}
          else{
          const berth=berthOf(s,box),available=Array.from({length:c.quay},(_,i)=>i).filter(i=>(i<s.plan.equipment.dispatch.berthCranes[0]?0:1)===berth&&i!==s.failedCrane&&f.bays[`dock:${i}`]===undefined);
          const slots=available.map(crane=>({crane,slot:freeShipSlot(s,box,crane)})).filter(x=>x.slot!==null);if(!slots.length)continue;
          const choice=slots.sort((a,b)=>a.slot!-b.slot!||a.crane-b.crane)[0]!;
          box.dock=choice.crane;box.targetShipSlot=choice.slot!;box.dockX=shipSlotX(s,box,choice.slot!);f.bays[`dock:${choice.crane}`]=carrier;
          }
        }
      }else if(kind==='yard'){
        yard=from.split(':')[1]!;const y=s.plan.yards.find(y=>y.id===yard)!;
        const machine=f.yardMachines[resource]!;
        // The failed gantry is secured in an isolated maintenance bay. Relief is an
        // actual RTG transfer, with its ordinary road reservations and travel time.
        if(incident&&yard===incident.yard&&resource!==incident.failed&&!(resource===incident.relief&&incident.reliefActive))continue;
        if(incident?.relief!==null&&incident?.relief!==undefined&&yard===incident.reliefHome&&resource!==incident.relief)continue;
        if(incident&&resource===incident.relief&&incident.reliefActive&&yard!==incident.yard)continue;
        if(incident&&resource===incident.failed&&incident.mode==='trial'&&yard!==incident.yard)continue;
        if(f.yardMachines.some(m=>m.id!==resource&&m.yard===yard&&!(incident?.isolated&&incident.reliefActive&&m.id===incident.failed))||s.jobs.some(j=>j.kind==='yard'&&j.resource!==resource&&j.physical?.yard===yard))continue;
        if(s.plan.equipment.yardMachine==='rmg'&&machine.yard!==yard)continue;
        if(machine.yard!==yard){const fromY=s.plan.yards.find(y=>y.id===machine.yard)!;const route=facilityGantryRoute(s.plan.equipment,yardRoadFront(fromY.col,fromY.row),yardRoadFront(y.col,y.row));if(!route)continue;relocation={...route,points:[machine.pose,...route.points,yardCentre(y.col,y.row)],length:route.length+36};}
        if(from.startsWith('handoff:')||rehandle){const slot=vacantSlot(s,yard,rehandle?box.slot!%21:-1);if(slot===null)continue;targetSlot=slot;}
        if(from.startsWith('yard:')&&blockers(box).length)continue;
        if(from.startsWith('handoff:')){carrier=box.carrier??null;if(carrier===null||f.vehicles[carrier]!.reservedBy!==null)continue;}
        else if(!rehandle){if(f.bays[`yard:${yard}`]!==undefined)continue;const external=batch.flow==='import'&&n.purpose!=='relocate';const v=freeVehicle(s,external,yardExchange(y.col,y.row),'import');if(!v||!external&&!f.enabled.truck)continue;carrier=v.id;
          if(batch.flow==='export'&&n.purpose==='flow'){const berth=berthOf(s,box),slots=Array.from({length:c.quay},(_,crane)=>({crane,slot:(crane<s.plan.equipment.dispatch.berthCranes[0]?0:1)===berth?freeShipSlot(s,box,crane):null})).filter(v=>v.slot!==null);if(!slots.length)continue;const choice=slots.sort((a,b)=>a.slot!-b.slot!)[0]!;box.dock=choice.crane;box.targetShipSlot=choice.slot!;box.dockX=shipSlotX(s,box,choice.slot!);}
        }
      }else{
        if(f.gateLimit!==null&&f.gateLimit<=0)continue;
        if(from==='external'){if(f.bays[`gate:${resource}`]!==undefined||options.some(o=>o.kind==='truck'&&o.to==='gate:out'))continue;const v=freeVehicle(s,true,gateExchange(s.plan.equipment,resource),'export');if(!v)continue;carrier=v.id;box.gateLane=resource;f.bays[`gate:${resource}`]=carrier;}
        else{carrier=box.carrier??null;if(carrier===null||f.vehicles[carrier]!.reservedBy!==null||box.gateLane!==resource)continue;}
      }
      const j:PortJob={id:++s.jobSequence,boxId:box.id,kind,resource,from,to:n.to,remaining:1,rate:0,updatedAt:s.second,start:s.second,end:null,purpose:n.purpose,physical:{stage:'service',carrier,yard,route:null,duration:1,phaseStart:s.second,...(targetSlot===undefined?{}:{targetSlot}),...(box.slot===undefined||box.slot===null?{}:{sourceSlot:box.slot}),...(rehandle?{rehandle:true}:{})}};
      used.add(box.id);s.jobs.push(j);
      if(carrier!==null)f.vehicles[carrier]!.reservedBy=j.id;
      if(kind==='quay')f.bays[`dock:${resource}`]=carrier!;
      if(yard&&carrier!==null)f.bays[`yard:${yard}`]=carrier;
      if(kind==='truck'){
        const target=n.to.startsWith('loading:')?physicalQuayPoint(s,box.dock!,box):n.to==='gate:out'?gateExchange(s.plan.equipment,box.gateLane):physicalLocationPoint(s,n.to);
        move(s,j,facilityRoadRoute(f.vehicles[carrier!]!.pose,target),'haul');
      }else if(relocation)move(s,j,relocation,'machine');else startApproach(s,j);
      break;
    }
  }
  // Dispatch directly whenever the next interface is available. Only a blocked
  // loaded carrier clears its current interface into the off-road holding bay.
  if(f.enabled.truck)for(const v of f.vehicles){if(!v.loadedBox||v.reservedBy!==null)continue;const box=s.boxes[v.loadedBox]!;if(!box.location.startsWith('quay:')&&!box.location.startsWith('pickup:')&&box.location!=='gate:in')continue;const bay=Object.entries(f.bays).find(([,carrier])=>carrier===v.id)?.[0];if(bay)returnToStandby(s,{boxId:box.id},v,bay,true);}
  refreshPhysicalRates(s);
}

export function refreshPhysicalRates(s:PortSession){
  const c=physicalResourceCapacities(s),f=s.facilities!;
  const retreat=f.yardIncident?.retreat;
  if(retreat&&s.second>=retreat.end){f.yardMachines[f.yardIncident!.failed]!.pose={...retreat.to};delete f.yardIncident!.retreat;}
  if(f.quayShift&&s.second>=f.quayShift.end){f.quayCranes.forEach((crane,i)=>crane.pose=f.quayShift!.to[i]!);delete f.quayShift;}
  for(const j of s.jobs){
    j.remaining=Math.max(0,j.remaining-(s.second-j.updatedAt)*j.rate);j.updatedAt=s.second;
    const p=j.physical!;
    // A committed vehicle segment ends at a safe bay; a stop prevents the next dispatch.
    const moving=['empty','haul','machine'].includes(p.stage);
    const enabled=j.kind==='quay'?f.enabled.quay[berthOf(s,s.boxes[j.boxId]!)]&&s.calls[s.batches[s.boxes[j.boxId]!.batchId]!.callId]!.working:f.enabled[j.kind];
    const safeDrain=f.drainCommitted&&j.kind!=='gate';
    const staffed=j.kind==='truck'?p.carrier!==null&&(f.vehicles[p.carrier]!.external||p.carrier<c.truck):j.resource<c[j.kind]&&(j.kind!=='quay'||j.resource!==s.failedCrane);
    if(p.stage==='traffic-wait'){if((p.parking||(enabled||safeDrain)&&staffed)&&p.route&&!roadClosed(s,p.route,j.id))move(s,j,p.route,p.nextStage!);if(p.stage==='traffic-wait'){j.rate=0;j.end=null;continue;}}
    if(p.stage==='service'&&j.kind==='quay')p.duration=Math.max(1,Math.ceil(serviceDuration(s,j)));
    j.rate=j.kind==='gate'&&j.to==='delivered'&&f.gateLimit===0?0:moving||p.parking||(enabled||safeDrain)&&staffed?1/p.duration:0;
    j.end=j.remaining<1e-8?s.second:j.rate?s.second+Math.max(1,Math.ceil(j.remaining/j.rate-1e-8)):null;
  }
}

/** Return true only when the cargo transfer itself has completed. */
export function completePhysicalStage(s:PortSession,j:PortJob):boolean {
  const p=j.physical!,f=s.facilities!,carrier=p.carrier===null?null:f.vehicles[p.carrier]!;
  if(p.stage==='road-wait'){
    if(p.roadDeparture!==s.second){const route=p.route!,next=p.nextStage!;delete p.nextDuration;delete p.roadDeparture;move(s,j,route,next);s.jobs.push(j);return false;}
    const next=p.nextStage!;if(roadClosed(s,p.route!,j.id)){stage(s,j,'traffic-wait',1,p.route);p.nextStage=next;j.rate=0;j.end=null;s.jobs.push(j);return false;}stage(s,j,next,p.nextDuration!,p.route);delete p.nextStage;delete p.nextDuration;
    delete p.roadDeparture;
    if(next==='haul'||p.parking)leaveBay(s,j);
    s.jobs.push(j);return false;
  }
  if(p.stage==='work-wait'){stage(s,j,'service',p.nextDuration!);delete p.nextDuration;s.jobs.push(j);return false;}
  if(p.stage==='crane'){f.quayCranes[j.resource]!.pose={...facilityRoutePose(p.route!,1),heading:0};if(p.parking)return false;stage(s,j,'service',serviceDuration(s,j));s.jobs.push(j);return false;}
  if(['empty','haul','machine'].includes(p.stage)){
    const end=facilityRoutePose(p.route!,1);
    if(p.stage==='machine'){const machine=f.yardMachines[j.resource]!;machine.pose={...end,heading:0};machine.yard=p.yard!;if(p.parking){f.closedRoads=f.closedRoads.filter(c=>c.owner!==j.id);return false;}startApproach(s,j);s.jobs.push(j);return false;}
    if(carrier){carrier.pose=end;f.moves.push({job:j.id,vehicle:carrier.id,empty:p.stage==='empty',from:p.route!.points[0]!,to:p.route!.points.at(-1)!,start:p.phaseStart,end:s.second,distance:p.route!.length});f.moves=f.moves.slice(-200);s.distance+=p.route!.length;}
    if(p.parking){if(carrier)carrier.reservedBy=null;return false;}
    if(p.stage==='empty'){service(s,j);s.jobs.push(j);return false;}
  }
  if(j.kind==='gate'&&j.to==='delivered'&&f.gateLimit!==null){if(f.gateLimit<=0){j.remaining=0;j.rate=0;j.end=null;s.jobs.push(j);return false;}f.gateLimit--;}
  return true;
}
export function afterPhysicalTransfer(s:PortSession,j:PortJob){
  const f=s.facilities!,p=j.physical!,box=s.boxes[j.boxId]!,v=p.carrier===null?null:f.vehicles[p.carrier]!;
  f.closedRoads=f.closedRoads.filter(c=>c.owner!==j.id);
  if(j.kind==='yard'&&f.yardIncident?.mode==='trial'&&j.resource===f.yardIncident.failed){f.yardIncident.trialRemaining--;f.yardIncident.trialCompleted++;}
  if(v)v.reservedBy=null;
  if(p.rehandle){box.slot=p.targetSlot;return;}
  if(j.kind==='quay'&&j.from.startsWith('ship:')){box.carrier=v!.id;box.dock=j.resource;box.shipSlot=null;v!.loadedBox=box.id;}
  else if(j.kind==='quay'){if(v)v.loadedBox=null;box.carrier=null;box.shipSlot=box.targetShipSlot;delete box.targetShipSlot;if(v)returnToStandby(s,j,v,`dock:${j.resource}`);}
  else if(j.kind==='yard'&&j.from.startsWith('handoff:')){if(v)v.loadedBox=null;box.carrier=null;box.slot=p.targetSlot;if(v)returnToStandby(s,j,v,`yard:${p.yard}`);}
  else if(j.kind==='yard'){box.carrier=v!.id;box.slot=null;v!.loadedBox=box.id;}
  else if(j.kind==='gate'&&j.to==='gate:in'){box.carrier=v!.id;v!.loadedBox=box.id;}
  else if(j.kind==='gate'){if(v)v.loadedBox=null;box.carrier=null;if(v)returnToStandby(s,j,v,`gate:${j.resource}`);}
  if(j.kind==='quay'){const crane=f.quayCranes[j.resource]!,home=craneHome(s.plan,j.resource);if(pointDistance(crane.pose,home)>.01){const back:PortJob={...j,id:++s.jobSequence,from:box.location,to:box.location,physical:{stage:'crane',carrier:null,yard:null,route:null,duration:1,phaseStart:s.second,parking:true}};stage(s,back,'crane',pointDistance(crane.pose,home)/.5,{points:[crane.pose,home],length:pointDistance(crane.pose,home),edges:[]});s.jobs.push(back);}}
}
/** A real empty RTG return. It is recorded as repositioning, never as cargo output. */
export function returnPhysicalYardMachine(s:PortSession,id:number,yard:string):boolean{
  const f=s.facilities!,machine=f.yardMachines[id];
  if(!machine||s.jobs.some(j=>j.kind==='yard'&&j.resource===id))return false;
  const destination=s.plan.yards.find(y=>y.id===yard)!;
  const centre={...yardCentre(destination.col,destination.row),heading:0};
  if(machine.yard===yard&&pointDistance(machine.pose,centre)<.01)return true;
  const target=s.plan.yards.find(y=>y.id===yard)!,from=s.plan.yards.find(y=>y.id===machine.yard)!;
  if(f.yardMachines.some(m=>m.id!==id&&m.yard===yard))return false;
  const route=machine.yard===yard?{points:[machine.pose,centre],length:pointDistance(machine.pose,centre),edges:[]}:facilityGantryRoute(s.plan.equipment,yardRoadFront(from.col,from.row),yardRoadFront(target.col,target.row));if(!route)return false;
  const path=machine.yard===yard?route:{...route,points:[machine.pose,...route.points,centre],length:route.length+36};
  const j:PortJob={id:++s.jobSequence,boxId:'',kind:'yard',resource:id,from:`yard:${from.id}`,to:`yard:${target.id}`,remaining:1,rate:0,updatedAt:s.second,start:s.second,end:null,purpose:'flow',physical:{stage:'machine',carrier:null,yard:yard,route:path,duration:1,phaseStart:s.second,parking:true}};
  move(s,j,path,'machine');s.jobs.push(j);refreshPhysicalRates(s);return false;
}
function returnToStandby(s:PortSession,previous:Pick<PortJob,'boxId'>,v:PhysicalVehicle,bay:string,loaded=false){
  const point=v.external?externalParking(v.id-s.plan.equipment.vehicles):truckParking(v.id),id=++s.jobSequence;
  const j:PortJob={id,boxId:previous.boxId,kind:'truck',resource:v.id,from:s.boxes[previous.boxId]!.location,to:s.boxes[previous.boxId]!.location,remaining:1,rate:0,updatedAt:s.second,start:s.second,end:null,purpose:'flow',physical:{stage:'empty',carrier:v.id,yard:null,route:null,duration:1,phaseStart:s.second,parking:true,originBay:bay}};
  v.reservedBy=id;s.jobs.push(j);move(s,j,facilityRoadRoute(v.pose,point),loaded?'haul':'empty');
}
/** All cranes translate together on the same rail; ordered endpoints preserve non-overtaking. */
export function redistributePhysicalCranes(s:PortSession,previous:TerminalDispatch){
  if(!s.facilities||JSON.stringify(previous.berthCranes)===JSON.stringify(s.plan.equipment.dispatch.berthCranes))return;
  const f=s.facilities!,d=s.plan.equipment.dispatch,a=d.berthCranes[0],assigned=a+d.berthCranes[1];
  const from=f.quayCranes.map(c=>({...c.pose})),to=from.map((_,i)=>craneHome(s.plan,i));
  f.quayShift={start:s.second,end:s.second+Math.max(1,Math.ceil(Math.max(...from.map((p,i)=>pointDistance(p,to[i]!)))/.5)),from,to};
}
export function physicalDispatchIssue(s:PortSession,d:TerminalDispatch){
  if(!s.facilities)return '';
  if(d.berthCranes.some(n=>n>2))return '本教学岸线每泊位设两个作业区，最多同时投入两台岸桥；其余岸桥保持待命。';
  if(s.jobs.some(j=>j.kind==='quay'&&j.resource>=d.craneOperators||j.kind==='yard'&&j.resource>=d.yardOperators))return '待撤岗设备仍有吊装或移机任务；待设备完成当前任务后再撤下对应操作员。';
  if(JSON.stringify(d.berthCranes)!==JSON.stringify(s.plan.equipment.dispatch.berthCranes)&&(s.facilities.quayShift||s.jobs.some(j=>j.kind==='quay')||Object.values(s.boxes).some(b=>b.targetShipSlot!==undefined)||Object.keys(s.facilities.bays).some(k=>k.startsWith('dock:'))))return '岸侧仍有作业、移机或已预约的装船交接；待任务与交接位清空后再移动岸桥。';
  const available=Math.min(s.plan.equipment.vehicles,d.drivers*(s.plan.equipment.vehicle==='agv'?4:1));
  if(s.facilities.vehicles.some(v=>!v.external&&v.id>=available&&(v.reservedBy!==null||v.loadedBox!==null)))return '车辆仍在执行交接或运输；待其完成任务并返回待命位后再撤下司机。';
  return '';
}
export function physicalJobPower(s:PortSession,j:PortJob){
  if(j.rate<=0)return 0;const e=s.plan.equipment,p=j.physical!;
  return p.stage==='traffic-wait'||p.stage==='road-wait'||p.stage==='work-wait'?0:p.stage==='empty'||p.stage==='haul'?TERMINAL_EQUIPMENT.vehicle[p.carrier!==null&&s.facilities!.vehicles[p.carrier]!.external?'tractor':e.vehicle].energy:p.stage==='machine'?TERMINAL_EQUIPMENT.yardMachine[e.yardMachine].energy:j.kind==='quay'?TERMINAL_EQUIPMENT.crane[e.crane].energy:j.kind==='yard'?TERMINAL_EQUIPMENT.yardMachine[e.yardMachine].energy:TERMINAL_EQUIPMENT.gateSystem[e.gateSystem].energy;
}

export function physicalVehiclePose(f:PortFacilityState,jobs:PortJob[],id:number,clock:number):FacilityPose{
  const v=f.vehicles[id]!,j=jobs.find(j=>j.physical?.carrier===id),p=j?.physical;
  if(j&&p&&['empty','haul'].includes(p.stage)&&p.route)return facilityRoutePose(p.route,Math.max(0,Math.min(1,1-j.remaining+(clock-j.updatedAt)*j.rate)));
  return v.pose;
}

