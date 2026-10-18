import { createPortSession, advancePortSession, applyPortCommand } from './port-operations-engine.js';
import { defaultPortPlan, type PortSession, type PortBox } from './port-operations-model.js';
import { refreshPhysicalRates, preparePhysicalStaffHandover } from './port-facilities.js';
import { startPortResourceStatistics } from './port-resource-statistics.js';
import { terminalMetrics, validateTerminalSetup, type TerminalDispatch, type TerminalState } from './terminal-lab.js';
import * as legacy from './port-class-lab-legacy.js';
import { preparePortIncidentScenario, applyPortIncidentCommand, type PortLabScenario, type PortIncidentScenario, type PortIncidentCommand } from './port-incident-scenarios.js';
export const PORT_CLASS_LAB_VERSION = 'port-class-lab/2.0' as const;
export type PortClassLesson=11|12;
export type PortLabKind='baseline'|'trial'|'incident';
export type PortLabIncident=legacy.PortLabIncident;
export type PortLabCommand=legacy.PortLabCommand|PortIncidentCommand|{kind:'configure-dispatch';value:TerminalDispatch}|{kind:'tick';seconds:number}|{kind:'start-audit';quarantine:string[]}|{kind:'start-reconcile'};
export type PortLabEvent=legacy.PortLabEvent;
export interface PortLabTimedTask {kind:'audit'|'reconcile'|'scope'|'logs'|'backup'|'mechanical'|'secure';startedAt:number;completesAt:number}
export interface PortClassLab extends Omit<legacy.PortClassLab,'version'|'commands'> {
 version:typeof PORT_CLASS_LAB_VERSION|'port-class-lab/1.0'; simulation?:PortSession;
 commands:PortLabCommand[];
 pendingTask?:PortLabTimedTask|null;
 scenario?:PortLabScenario; emergency?:PortIncidentScenario;
}
export const PORT_LAB_LEDGER=legacy.PORT_LAB_LEDGER;
const clone=<T>(v:T):T=>structuredClone(v);
const delivered=(s:PortSession)=>Object.values(s.boxes).filter(b=>b.deliveredAt!==null).length;
function fixture(lesson:PortClassLesson):PortSession{
 const plan=defaultPortPlan();plan.equipment.vehicles=8;plan.equipment.yardMachines=3;
 plan.equipment.dispatch={berthCranes:[2,2],craneOperators:4,drivers:lesson===11?2:8,yardOperators:3,gateClerks:lesson===11?1:2,technicians:lesson===11?0:2,priority:'balanced'};
 for(const y of plan.yards)y.use=y.id==='Y6'?'inspection':'import';
 const s=createPortSession('practice',undefined,plan,'port-operations/3.2');
 s.schedules=s.schedules.slice(0,2);s.calls=Object.fromEntries(s.schedules.map(v=>[v.id,s.calls[v.id]!]));s.batches={};s.boxes={};s.events=[];s.notices=[];s.jobs=[];s.taught=['documents','arrival','work','yard','exception','departure'];s.status='running';
 for(const v of s.facilities!.vehicles)if(v.external)v.role='import';
 let index=0;
 s.schedules.forEach((v,i)=>{
  Object.assign(v,{name:`教学船${i?'B':'A'}`,large:!!i,unload:i?180:120,load:0,eta:0,ata:0,announceAt:0,updates:[]});
  const c=s.calls[v.id]!;Object.assign(c,{announced:true,stage:'berthed',arrivedAt:0,berthArrivedAt:0,berth:i,plannedBerth:i,move:null,working:true,milestones:{admit:0,secure:0}});s.berths[i]=v.id;
  for(const d of Object.values(c.docs))Object.assign(d,{status:'approved',submittedAt:0,returnedAt:0});
  for(let part=0;part<2;part++){
   const id=`${v.id}-I${part+1}`,count=v.unload/2,target=['Y1','Y2','Y3','Y1'][i*2+part]!;
   const b={id,callId:v.id,name:`进口批次${id}`,flow:'import' as const,bill:`LAB-${id}`,reference:`LAB-${id}/${count}`,document:{status:'approved' as const,value:'',reference:'',reason:'独立教学情境预置核验通过'},customs:true,carrier:true,vgm:false,targetYard:target,boxIds:[] as string[],availableAt:0};s.batches[id]=b;
   for(let n=0;n<count;n++){const boxId=`L${lesson}-${String(++index).padStart(3,'0')}`;b.boxIds.push(boxId);s.boxes[boxId]={id:boxId,batchId:id,location:`ship:${v.id}`,queuedAt:0,available:true,unloadedAt:null,loadedAt:null,deliveredAt:null,issueExpected:false,issue:'none',inspectionYard:null,reviewReady:false,history:[],carrier:null,shipSlot:v.unload-1-(part*count+n)};}
  }
 });
 advancePortSession(s,(lesson===11?120:90)*60,false,false);
 if(lesson===12){s.facilities!.enabled.gate=false;refreshPhysicalRates(s);}
 startPortResourceStatistics(s);
 s.commands=[];s.inputLog=[];return s;
}
export function portClassTerminal(s:PortSession):TerminalState{
 const boxes=Object.values(s.boxes),queues:[number,number,number]=[0,0,0],unloaded:[number,number]=[0,0];
 const moving=new Set(s.jobs.filter(j=>j.kind==='truck'&&['haul','road-wait'].includes(j.physical?.stage??'')).map(j=>j.boxId));
 for(const b of boxes){if(b.unloadedAt===null)continue;unloaded[s.batches[b.batchId]!.callId===s.schedules[0]!.id?0:1]++;if(b.deliveredAt!==null)continue;if(b.location.startsWith('quay:'))queues[moving.has(b.id)?1:0]++;else if(b.location.startsWith('handoff:'))queues[1]++;else queues[2]++;}
 const work={cranes:Array(s.plan.equipment.cranes).fill(0) as number[],vehicles:Array(s.plan.equipment.vehicles).fill(0) as number[]};
 for(const b of boxes)for(const h of b.history){if(h.action==='船岸交接'){const i=Number(h.resource.split('-')[1])-1;if(i>=0)work.cranes[i]!++;}if(h.action==='运输交接'){const i=Number(h.resource.split('-')[1])-1;if(i>=0&&i<work.vehicles.length)work.vehicles[i]!++;}}
 const e=s.facilities!.enabled;
 return {engine:'realtime',setup:clone(s.plan.equipment),initialSetup:clone(s.initialPlan.equipment),minute:s.second/60,unloaded,queues,delivered:delivered(s),energy:s.energy,cost:s.cost,waitingBoxMinutes:s.facilities!.waitingBoxSeconds/60,repairWork:0,answers:[],samples:[],commands:[],events:[],equipmentWork:work,operations:{admittedAt:[0,0],secured:[true,true],'crane-a':e.quay[0],'crane-b':e.quay[1],transport:e.truck,yard:e.yard,gate:e.gate}};
}
// Omitted scenario preserves replay of the original v2 records. New UI entries
// explicitly select a versioned incident scenario; old evidence stays reproducible.
export function createPortClassLab(lesson:PortClassLesson,kind?:PortLabKind,scenario?:PortLabScenario):PortClassLab{
 if(lesson!==11&&lesson!==12)throw Error('未知课堂实验。');const resolved=kind??(lesson===11?'baseline':'incident');if(lesson===11&&!['baseline','trial'].includes(resolved)||lesson===12&&resolved!=='incident')throw Error('实验类型与讲次不一致。');
 const simulation=fixture(lesson),terminal=portClassTerminal(simulation),checkpoint=terminal.minute;
 terminal.samples=[{minute:checkpoint,delivered:terminal.delivered,quay:terminal.queues[0],transit:terminal.queues[1],yard:terminal.queues[2]}];
 if(scenario&&(lesson!==12||!['system','equipment'].includes(scenario)))throw Error('事件场景与讲次不匹配。');
 const result:PortClassLab={version:PORT_CLASS_LAB_VERSION,lesson,kind:resolved,simulation,terminal,checkpoint,endpoint:lesson===11?360:240,initialCost:terminal.cost,initialWaiting:terminal.waitingBoxMinutes,initialDelivered:terminal.delivered,deliveredAtDeadline:null,
 incident:lesson===12?{recorded:false,isolated:false,scope:'gate',backupVerified:false,manual:false,manualDelivered:0,repairStarted:false,repairWork:0,dataChecked:false,testing:false,testDelivered:0,testPassed:false,restoredAt:null}:null,
 pendingTask:null,commands:[],events:[{minute:checkpoint,kind:'checkpoint',text:lesson===11?'载入同一300箱逐箱现场；设备、车辆、道路预约和库存均延续真实作业状态。':'第90分钟电子交付暂停；在途车辆驶向交接位，后续处置须保留逐箱证据。'}],feedback:'逐箱现场已就绪。查看设备当前任务、库存与任务书后下达指令。'};
 if(scenario){preparePortIncidentScenario(result,scenario);sync(result);}return result;
}
export function portLabFinished(r:PortClassLab){return r.version==='port-class-lab/1.0'?legacy.portLabFinished(r as legacy.PortClassLab):r.terminal.minute>=r.endpoint-1e-7;}
function note(r:PortClassLab,text:string,kind:PortLabEvent['kind']='operation',minute=r.terminal.minute){if(['checkpoint','recovery'].includes(kind)&&r.events.at(-1)?.text.startsWith('已到第'))r.events.pop();r.feedback=text;r.events.push({minute,text,kind});}
function sync(r:PortClassLab){const samples=r.terminal.samples;r.terminal=portClassTerminal(r.simulation!);r.terminal.samples=samples;}
function gateMode(r:PortClassLab,on:boolean,quota:number|null){const s=r.simulation!;s.facilities!.enabled.gate=on;s.facilities!.gateLimit=quota;for(const j of s.jobs.filter(j=>j.kind==='gate'&&j.to==='delivered')){if(j.remaining<=1e-8){j.remaining=1;j.updatedAt=s.second;}}refreshPhysicalRates(s);sync(r);}
function advance(r:PortClassLab,minutes:number){
 const s=r.simulation!,i=r.incident,end=Math.min(r.endpoint*60,s.second+minutes*60);
 while(s.second<end){
  const start=s.second,repairSeconds=i?.repairStarted&&i.repairWork<60&&s.plan.equipment.dispatch.technicians?Math.ceil((60-i.repairWork)/s.plan.equipment.dispatch.technicians*60):Infinity;
  const nextJob=Math.min(...s.jobs.map(j=>j.end??Infinity));
  const amount=Math.min(end-start,600-start%600,repairSeconds,(r.pendingTask?.completesAt??Infinity)-start,Math.max(1,nextJob-start)),before=delivered(s);advancePortSession(s,amount,false,false);const delta=s.second-start;
  let checkpoint=false;
  if(i){
   if(i.repairStarted&&i.repairWork<60){i.repairWork=Math.min(60,i.repairWork+s.plan.equipment.dispatch.technicians*delta/60);if(i.repairWork>=60-1e-7){i.repairWork=60;checkpoint=true;note(r,'技术恢复完成，已暂停推进；仍需对账、实际试运行和恢复审查。','recovery',s.second/60);}}
   const increase=delivered(s)-before;
   if(i.manual||i.testing){
    const manual=i.manual;if(manual)i.manualDelivered+=increase;else i.testDelivered+=increase;
    if(manual){const last=Math.max(start,...Object.values(s.boxes).flatMap(b=>b.deliveredAt!==null&&b.deliveredAt>start?[b.deliveredAt]:[])),active=s.facilities!.gateLimit===0?last-start:delta;s.effort.personSeconds+=2*active;s.cost+=2*active*2.1/3600;}
    if(s.facilities!.gateLimit===0){checkpoint=true;if(manual){i.manual=false;note(r,'24箱备用额度已实际交付完毕，已暂停推进与后续核验。','checkpoint',s.second/60);}else{i.testing=false;i.testPassed=true;note(r,'3箱受控试运行已实际通过闸口，已暂停推进，可申请恢复。','recovery',s.second/60);}s.facilities!.enabled.gate=false;refreshPhysicalRates(s);}
   }
  }
  if(r.pendingTask&&s.second>=r.pendingTask.completesAt){
   const task=r.pendingTask;r.pendingTask=null;
   if(task.kind==='audit'){i!.backupVerified=true;note(r,'备用记录核验通过，已暂停推进；可启用24箱双人复核备用额度。','checkpoint',s.second/60);}
   else{i!.dataChecked=true;note(r,'恢复记录对账完成，已暂停推进；电子交付仍待3箱实际试运行。','checkpoint',s.second/60);}
   checkpoint=true;
  }
  sync(r);if(r.lesson===11&&s.second>=18000&&r.deliveredAtDeadline===null)r.deliveredAtDeadline=delivered(s);
  const t=r.terminal;if(s.second%600===0||s.second===r.endpoint*60)r.terminal.samples.push({minute:t.minute,delivered:t.delivered,quay:t.queues[0],transit:t.queues[1],yard:t.queues[2]});
  if(checkpoint)return true;
 }
 return false;
}
export function validPortLedger(quarantine:unknown):boolean{
 if(!Array.isArray(quarantine)||quarantine.length!==2||new Set(quarantine).size!==2||quarantine.some(id=>!PORT_LAB_LEDGER.some(r=>r.id===id)))return false;
 const retained=PORT_LAB_LEDGER.filter(r=>!quarantine.includes(r.id));if(retained.some(r=>r.version!==18||r.declared!==r.independent))return false;
 return ['T01','T02','T05'].every(ticket=>retained.filter(r=>r.ticket===ticket).length===1);
}
export function applyPortClassLabCommand(current:PortClassLab,command:PortLabCommand):PortClassLab{
 if(current.scenario&&current.emergency)return applyPortIncidentCommand(current,command,portClassTerminal);
 if(['inspect','repair-team','relief'].includes(command?.kind))throw Error('该指令仅适用于新版第12讲场景。');
 if(current.version==='port-class-lab/1.0'){if(command.kind==='configure-dispatch'||command.kind==='tick'||command.kind==='start-audit'||command.kind==='start-reconcile')throw Error('旧版记录仅支持原始推进指令。');return legacy.applyPortClassLabCommand(current as legacy.PortClassLab,command as legacy.PortLabCommand);}
 if(!command||typeof command!=='object')throw Error('无效实验指令。');if(current.commands.length>=600)throw Error('操作记录已满，请导出后建立新场次。');if(portLabFinished(current))throw Error('观察已结束，可保存成功或失败的复盘，并保留本次记录后重试。');
 const r=clone(current);let s=r.simulation!;const i=r.incident;
 if(r.pendingTask&&command.kind!=='tick'&&command.kind!=='advance')throw Error('核验或对账尚未完成，请连续推进至完成节点后再下达业务指令。');
 if(command.kind==='advance'||command.kind==='tick'){
  if(command.kind==='advance'&&(!Number.isInteger(command.minutes)||command.minutes<1||command.minutes>360)||command.kind==='tick'&&(!Number.isInteger(command.seconds)||command.seconds<1||command.seconds>21600))throw Error('推进量须为有效整数：1至360分钟或1至21600秒。');const paused=advance(r,command.kind==='advance'?command.minutes:command.seconds/60);
  const feedback=portLabFinished(r)?'观察结束，请保存本次实际结果，包括未恢复和未完成事项。':`已到第${r.terminal.minute.toFixed(1)}分钟，设备、道路、交接与费用均按实际作业更新。`;
  if(!paused){if(command.kind==='tick'&&r.events.at(-1)?.text.startsWith('已到第')){r.feedback=feedback;Object.assign(r.events.at(-1)!,{minute:r.terminal.minute,text:feedback});}else note(r,feedback);}
 }else if(command.kind==='configure-dispatch'){
  if(r.lesson!==11)throw Error('开局岗位配置仅适用于第11讲试验。');
  if(r.kind==='baseline')throw Error('基准保持预置配置。');
  if(s.second!==r.checkpoint*60)throw Error('试验已经开始；请从同一检查点重开试验后修改开局岗位。');
  const value=command.value,errors=validateTerminalSetup({...s.plan.equipment,dispatch:value});
  if(errors.length)throw Error(errors.join('；'));
  for(const [role,max] of [['craneOperators',4],['drivers',8],['yardOperators',3],['gateClerks',2],['technicians',2]] as const)if(value[role]>max)throw Error('岗位人数超过本实验可配置范围。');
  if(value.berthCranes[0]!==2||value.berthCranes[1]!==2)throw Error('同一检查点试验保持泊位设备分配不变。');
  // Rebuild only the unadvanced scene. Old Apply actions may have reserved extra
  // tasks at this same second; no such tentative work belongs to the checkpoint.
  s=fixture(11);s.plan.equipment.dispatch=clone(value);preparePhysicalStaffHandover(s);r.simulation=s;
  sync(r);note(r,'开局岗位已保存；开始推进前可继续增减。检查点原有任务安全交接后撤岗，交接期间人工成本照计。');
 }else if(command.kind==='dispatch'){
  if(r.lesson===11&&r.kind==='baseline')throw Error('基准保持预置配置。');if(r.lesson===11&&r.terminal.minute!==r.checkpoint)throw Error('岗位须在同一检查点设置。');if(i&&(i.repairStarted||i.manual||i.testing||i.restoredAt!==null))throw Error('当前恢复阶段岗位已锁定。');
  const value=command.value;const result=applyPortCommand(s,{kind:'dispatch',dispatch:value},false);if(result.outcome!=='applied')throw Error(result.message);sync(r);note(r,'岗位已应用；在途车辆和交接任务保留，后续派工按新配置执行。');
 }else{
  if(!i)throw Error('该指令只适用于第12讲。');
  if(command.kind==='record'){if(i.recorded)throw Error('事件已记录。');i.recorded=true;note(r,'固定事件证据：第90分钟交付接口失去可信记录，最后可信快照为第75分钟；内部设备可用。');}
  else if(command.kind==='isolate'){if(!['gate','all'].includes(command.scope)||i.isolated)throw Error('隔离范围无效或已执行。');i.isolated=true;i.scope=command.scope;s.facilities!.enabled.gate=false;if(command.scope==='all')Object.assign(s.facilities!.enabled,{quay:[false,false],truck:false,yard:false});refreshPhysicalRates(s);sync(r);note(r,command.scope==='all'?'接口已隔离；内部新作业暂停，在途车辆先驶至安全交接位。':'仅隔离交付接口，内部独立作业继续。');}
  else if(command.kind==='resume-internal'){if(!i.isolated)throw Error('先确认隔离范围。');Object.assign(s.facilities!.enabled,{quay:[true,true],truck:true,yard:true});refreshPhysicalRates(s);sync(r);note(r,'内部独立作业已恢复，交付仍受证据与额度约束。');}
  else if(command.kind==='audit'||command.kind==='start-audit'){if(!i.isolated||i.backupVerified)throw Error('先隔离接口；备用记录只需核验一次。');if(r.endpoint-r.terminal.minute<10)throw Error('观察终点前不足10分钟。');if(!validPortLedger(command.quarantine))throw Error('核对未通过：保留一条有效T02，隔离旧版本及重复记录；有效记录须与独立数量一致。');
   if(command.kind==='start-audit'){r.pendingTask={kind:'audit',startedAt:s.second,completesAt:s.second+600};note(r,'开始10分钟独立记录核验；现场继续作业，完成后自动暂停。');}
   else{advance(r,10);i.backupVerified=true;note(r,'备用记录核验通过；R2与R3保留任意一条均有效。可启用24箱双人复核备用额度。');}}
  else if(command.kind==='manual'){if(!i.isolated||!i.backupVerified||i.manualDelivered>=24||i.testing||i.restoredAt!==null)throw Error('备用交付需要隔离、可信记录及剩余额度。');if(s.plan.equipment.dispatch.gateClerks<1||terminalMetrics(s.plan.equipment).personnel+2>26)throw Error('备用交付需1名闸口员及2名独立复核人员。');i.manual=true;s.plan.equipment.dispatch.gateClerks=1;gateMode(r,true,24-i.manualDelivered);note(r,'单道备用核验启用，最多24箱；提箱、装车、道路和闸口均须实际完成，另计2人复核成本。');}
  else if(command.kind==='repair'){if(!i.isolated||i.repairStarted||s.plan.equipment.dispatch.technicians<1)throw Error('先隔离并配置技术人员；恢复不能重复启动。');i.repairStarted=true;note(r,'启动60人分钟技术工作；时间推进后产生实际进度。');}
  else if(command.kind==='reconcile'||command.kind==='start-reconcile'){if(i.repairWork<60||!i.backupVerified||i.dataChecked||i.restoredAt!==null)throw Error('技术工作和备用核验完成后才能对账。');if(r.endpoint-r.terminal.minute<10)throw Error('观察终点前不足10分钟。');i.manual=false;gateMode(r,false,null);
   if(command.kind==='start-reconcile'){r.pendingTask={kind:'reconcile',startedAt:s.second,completesAt:s.second+600};note(r,'开始10分钟恢复记录对账；交付保持暂停，完成后自动停在审查节点。');}
   else{advance(r,10);i.dataChecked=true;note(r,'恢复记录对账完成；电子交付仍待3箱实际试运行。');}}
  else if(command.kind==='test'){if(!i.dataChecked||i.testing||i.testPassed||i.restoredAt!==null)throw Error('先完成恢复记录对账。');if(s.plan.equipment.dispatch.gateClerks<1)throw Error('试运行需闸口员。');i.manual=false;i.testing=true;s.plan.equipment.dispatch.gateClerks=1;gateMode(r,true,3);note(r,'启动3箱受控试运行，须完成提箱、运输及实际核验；到达3箱后自动暂停交付。');}
  else if(command.kind==='restore'){if(!i.recorded||!i.isolated||!i.dataChecked||!i.testPassed||i.restoredAt!==null)throw Error('恢复未获通过：需事件证据、隔离、对账和实际3箱试运行。');i.restoredAt=r.terminal.minute;i.manual=false;s.plan.equipment.dispatch.gateClerks=2;gateMode(r,true,null);note(r,'双道电子交付已恢复，服务恢复时点已记录；积压仍需逐箱消化。','recovery');}
  else throw Error('不支持的实验指令。');
 }
 const logged=command.kind==='tick'?{...command,seconds:r.simulation!.second-current.simulation!.second}:clone(command);
 const previous=r.commands.at(-1);if(logged.kind==='tick'&&previous?.kind==='tick'&&current.feedback.startsWith('已到第')&&previous.seconds+logged.seconds<=21600)previous.seconds+=logged.seconds;else r.commands.push(logged);return r;
}
export function portClassLabMetrics(r:PortClassLab){
 if(r.version==='port-class-lab/1.0')return legacy.portClassLabMetrics(r as legacy.PortClassLab);
 const s=r.terminal,increment=s.delivered-r.initialDelivered,elapsed=s.minute-r.checkpoint,cost=s.cost-r.initialCost,m=terminalMetrics(s.setup),enabled=r.simulation!.facilities!.enabled;
 const start=r.simulation!.second-600,boxes=Object.values(r.simulation!.boxes),window=Math.min(10,s.minute);
 const observedRates=[boxes.filter(b=>b.unloadedAt!==null&&b.unloadedAt>start).length,boxes.flatMap(b=>b.history.filter(h=>h.at>start&&h.action==='运输交接'&&h.from.startsWith('quay:'))).length,boxes.flatMap(b=>b.history.filter(h=>h.at>start&&h.action==='堆场交接'&&h.from.startsWith('handoff:'))).length,boxes.filter(b=>b.deliveredAt!==null&&b.deliveredAt>start).length].map(n=>window?n*60/window:0);
 const outage=r.simulation!.facilities!.yardIncident,yardFactor=outage&&(outage.mode==='fault'||outage.trialRemaining===0)?(s.setup.yardMachines-1)/s.setup.yardMachines:1;
 return {minute:s.minute,elapsed,delivered:increment,cumulativeDelivered:s.delivered,remaining:300-s.delivered,unloaded:s.unloaded[0]+s.unloaded[1],queues:[...s.queues] as [number,number,number],waitingBoxMinutes:s.waitingBoxMinutes-r.initialWaiting,averageInProcess:elapsed>0?(s.waitingBoxMinutes-r.initialWaiting)/elapsed:null,cost,costPerDelivered:increment>0?cost/increment:null,deadlineShare:r.deliveredAtDeadline===null?null:r.deliveredAtDeadline/300,capacities:[enabled.quay.some(Boolean)?m.rates[0]:0,enabled.truck?m.rates[1]:0,enabled.yard?m.rates[2]*yardFactor:0,enabled.gate?m.rates[3]:0] as [number,number,number,number],observedRates,recoveryMinutes:r.incident?.restoredAt===null||!r.incident?null:r.incident.restoredAt-r.checkpoint,dataExposureMinutes:r.lesson===12? r.scenario? r.scenario==='system'&&r.emergency?.evidence.logs?15:null :15 :null};
}
export function serializePortClassLab(r:PortClassLab){return {version:r.version,lesson:r.lesson,kind:r.kind,...(r.scenario?{scenario:r.scenario,scenarioVersion:r.emergency!.version}:{}),commands:clone(r.commands)};}
export function restorePortClassLab(value:unknown,expectedLesson:PortClassLesson):PortClassLab{
 if(!value||typeof value!=='object')throw Error('实验记录格式无效。');const v=value as ReturnType<typeof serializePortClassLab>;
 if(v.version==='port-class-lab/1.0')return legacy.restorePortClassLab(value,expectedLesson);
 if(v.version!==PORT_CLASS_LAB_VERSION||v.lesson!==expectedLesson||!Array.isArray(v.commands)||v.commands.length>600||v.scenario!==undefined&&(!['system','equipment'].includes(v.scenario)||v.scenarioVersion!==1))throw Error('实验版本、讲次、场景或记录长度不匹配。');let r=createPortClassLab(v.lesson,v.kind,v.scenario);for(const c of v.commands)r=applyPortClassLabCommand(r,c);return r;
}
export function portLabCsv(runs:readonly PortClassLab[]){
 if(runs.every(r=>r.version==='port-class-lab/1.0'))return legacy.portLabCsv(runs as legacy.PortClassLab[]);
 const rows:(string|number|null)[][]=[['规则版本','讲次','分支','场景','场景版本','观察分钟','岸桥操作员','司机','场桥操作员','闸口员','技术人员','新增交付箱','全部未交付箱','岸侧已接箱','运输交接箱','场内待交付箱','等待箱分钟','新增成本','单位交付成本','服务恢复分钟']];
 for(const r of runs){const m=portClassLabMetrics(r),d=r.terminal.setup.dispatch;rows.push([r.version,r.lesson,r.kind,r.scenario??'original',r.emergency?.version??null,m.minute,d.craneOperators,d.drivers,d.yardOperators,d.gateClerks,d.technicians,m.delivered,m.remaining,...m.queues,m.waitingBoxMinutes,m.cost,m.costPerDelivered,m.recoveryMinutes]);}
 return '\ufeff'+rows.map(row=>row.map(v=>v===null?'':`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
}

