import type { PortView } from './port-operations-view.js';
import type { PortJob } from './port-operations-model.js';
import { physicalVehiclePose } from './port-facilities.js';
import { facilityRoutePose, facilityVehicleHeight, gateExchange, shipSlotPosition, yardSlotPosition, type FacilityPosition } from './port-facility-layout.js';
import { portNavigationPose } from './port-navigation.js';

type Box=PortView['boxes'][number];
const mix=(a:number,b:number,t:number)=>a+(b-a)*Math.max(0,Math.min(1,t));
const between=(a:FacilityPosition,b:FacilityPosition,t:number):FacilityPosition=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t),heading:mix(a.heading,b.heading,t)});
const trailerCargo=(p:{x:number;z:number;heading:number}):FacilityPosition=>({x:p.x+Math.sin(p.heading)*.8,z:p.z+Math.cos(p.heading)*.8,y:facilityVehicleHeight(p)+3.25,heading:p.heading+Math.PI/2});
export function physicalPhaseProgress(j:PortJob,clock:number){return Math.max(0,Math.min(1,1-j.remaining+Math.max(0,clock-j.updatedAt)*j.rate));}
export function physicalBoxPosition(view:PortView,box:Box,clock:number,location=box.location,slot?:number):FacilityPosition{
  const f=view.facilities!;
  if(box.carrier!==null&&box.carrier!==undefined&&location===box.location){const p=physicalVehiclePose(f,view.jobs,box.carrier,clock);return trailerCargo(p);}
  const [kind,id]=location.split(':');
  if(kind==='ship'){
    const call=view.vessels.find(v=>v.id===id)?.call,berth=call?.berth??0,p=shipSlotPosition(berth,slot??box.shipSlot??0);
    if(call?.move?.navigation){const pose=portNavigationPose(call.move.navigation,clock-call.move.start),x=p.x-(berth?62:-62),z=p.z+78,angle=-pose.heading;return {x:pose.x+x*Math.cos(angle)+z*Math.sin(angle),z:pose.z-x*Math.sin(angle)+z*Math.cos(angle),y:p.y,heading:angle};}
    return p;
  }
  if(kind==='yard'){const y=view.plan.yards.find(y=>y.id===id)!;return yardSlotPosition(y.col,y.row,slot??box.slot??0);}
  if(['handoff','pickup'].includes(kind!)){const y=view.plan.yards.find(y=>y.id===id)!;return {x:-90+y.col*36,z:y.row*36+12.5,y:4.2,heading:0};}
  return {...gateExchange(view.plan.equipment),y:4.2,heading:0};
}
/** The hook carries the same box instance; release precedes empty-hoist return. */
export function physicalHoist(view:PortView,j:PortJob,clock:number){
  const box=view.boxes.find(b=>b.id===j.boxId)!,p=j.physical!,t=physicalPhaseProgress(j,clock);
  const vehicle=p.carrier===null?null:physicalVehiclePose(view.facilities!,view.jobs,p.carrier,clock);
  const onVehicle:FacilityPosition=vehicle?trailerCargo(vehicle):{x:0,z:0,y:4.2,heading:0};
  const from=j.from.startsWith('handoff:')||j.from.startsWith('loading:')?onVehicle:physicalBoxPosition(view,box,clock,j.from,p.sourceSlot);
  const to=j.to.startsWith('quay:')||j.to.startsWith('pickup:')?onVehicle:physicalBoxPosition(view,box,clock,j.to,j.kind==='quay'?box.targetShipSlot:p.targetSlot);
  const height=j.kind==='quay'?Math.max(25.5,from.y+3,to.y+3):Math.max(17,from.y+3,to.y+3);
  const aboveFrom={...from,y:height},aboveTo={...to,y:height};
  const park=j.kind==='yard'?view.facilities!.yardMachines[j.resource]!.pose:{x:from.x,z:-26,heading:0};
  const abovePark={...park,y:height};
  let hook:FacilityPosition,cargo:FacilityPosition,carrying=false;
  if(t<.15){hook=between(abovePark,aboveFrom,t/.15);cargo=from;}
  else if(t<.3){hook=between(aboveFrom,{...from,y:from.y+1.6},(t-.15)/.15);cargo=from;}
  else if(t<.45){hook=between({...from,y:from.y+1.6},aboveFrom,(t-.3)/.15);cargo={...hook,y:hook.y-1.6};carrying=true;}
  else if(t<.65){hook=between(aboveFrom,aboveTo,(t-.45)/.2);cargo={...hook,y:hook.y-1.6};carrying=true;}
  else if(t<.8){hook=between(aboveTo,{...to,y:to.y+1.6},(t-.65)/.15);cargo={...hook,y:hook.y-1.6};carrying=true;}
  else{hook=between({...to,y:to.y+1.6},abovePark,(t-.8)/.2);cargo=to;}
  return {hook,cargo,carrying,progress:t};
}
export function physicalContainerPosition(view:PortView,box:Box,clock:number):FacilityPosition{
  const j=view.jobs.find(j=>j.boxId===box.id);
  if(j?.physical?.stage==='service'&&['quay','yard'].includes(j.kind))return physicalHoist(view,j,clock).cargo;
  return physicalBoxPosition(view,box,clock);
}
export function physicalQuayCranePose(view:PortView,resource:number,clock:number){const f=view.facilities!,shift=f.quayShift;if(shift){const t=Math.max(0,Math.min(1,(clock-shift.start)/(shift.end-shift.start))),a=shift.from[resource]!,b=shift.to[resource]!;return {x:mix(a.x,b.x,t),z:-39,heading:0};}const j=view.jobs.find(j=>j.kind==='quay'&&j.resource===resource);return j?.physical?.stage==='crane'&&j.physical.route?facilityRoutePose(j.physical.route,physicalPhaseProgress(j,clock)):f.quayCranes[resource]!.pose;}
export function physicalYardMachinePose(view:PortView,resource:number,clock:number){const f=view.facilities!,retreat=f.yardIncident?.failed===resource?f.yardIncident.retreat:undefined;if(retreat){const t=(clock-retreat.start)/(retreat.end-retreat.start);return {x:mix(retreat.from.x,retreat.to.x,t),z:mix(retreat.from.z,retreat.to.z,t),heading:0};}const j=view.jobs.find(j=>j.kind==='yard'&&j.resource===resource);return j?.physical?.stage==='machine'&&j.physical.route?{...facilityRoutePose(j.physical.route,physicalPhaseProgress(j,clock)),heading:0}:f.yardMachines[resource]!.pose;}
