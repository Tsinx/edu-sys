import {portClassLabMetrics,portLabFinished,restorePortClassLab,serializePortClassLab,type PortClassLab} from './port-class-lab.js';

export type PortIncidentMode='teaching'|'practical';
export const PORT_INCIDENT_REPORT_FIELDS=['scope','barriers','conclusion','handover'] as const;
export interface PortIncidentCheck {id:string;label:string;complete:boolean}
/** Physical completion is separate from whether an RTO target was met. */
export function portIncidentCompletion(run:PortClassLab):PortIncidentCheck[]{
 const i=run.incident,e=run.emergency,system=run.scenario==='system';
 return [
  {id:'scenario',label:'本讲独立场景记录',complete:run.lesson===12&&!!run.scenario&&!!e},
  {id:'record',label:'固定告警证据',complete:!!i?.recorded},
  {id:'scope',label:'取得独立影响范围证据',complete:!!e?.evidence.scope},
  {id:'diagnosis',label:system?'取得接口日志证据':'取得设备诊断证据',complete:!!(system?e?.evidence.logs:e?.evidence.mechanical)},
  {id:'isolation',label:'完成受影响范围隔离',complete:!!i?.isolated},
  ...(system?[{id:'ledger',label:'调取并核验独立备用记录',complete:!!e?.evidence.backup&&!!i?.backupVerified}]:[{id:'relief',label:'替代设备如已启用则实际返回',complete:!!e&&(!e.reliefUsed||e.reliefReturned)}]),
  {id:'repair',label:'技术工作完成',complete:!!i&&!!e&&i.repairWork>=e.repairTarget},
  {id:'check',label:system?'完成恢复记录对账':'完成维修后安全检查',complete:!!i?.dataChecked},
  {id:'trial',label:system?'完成3箱实际试放行':'完成场桥1的3次实际试吊',complete:!!i?.testPassed&&i.testDelivered>=3},
  {id:'restore',label:system?'通过服务恢复审查':'通过设备复工审查',complete:i?.restoredAt!=null},
  {id:'endpoint',label:'观察至第240分钟',complete:portLabFinished(run)},
 ];
}
export function portIncidentReportComplete(notes:Record<string,string>){return PORT_INCIDENT_REPORT_FIELDS.every(k=>typeof notes[k]==='string'&&notes[k].trim().length>=15&&notes[k].length<=5000);}
export interface PortEmergencySubmission {
 version:'port-emergency-submission/1.0';lesson:12;mode:'practical';
 run:ReturnType<typeof serializePortClassLab>;notes:Record<string,string>;sealedAt:string;
 metrics:ReturnType<typeof portClassLabMetrics>;
}
/** Replays commands rather than trusting displayed time, flags, or supplied metrics. */
export function verifyPortEmergencySubmission(value:unknown):PortEmergencySubmission{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('实战提交包格式无效。');
 const v=value as Partial<PortEmergencySubmission>;
 if(v.version!=='port-emergency-submission/1.0'||v.lesson!==12||v.mode!=='practical')throw Error('只有第12讲实战模式可以生成正式提交包。');
 if(!v.notes||typeof v.notes!=='object'||Array.isArray(v.notes)||Object.keys(v.notes).some(k=>!(PORT_INCIDENT_REPORT_FIELDS as readonly string[]).includes(k))||!portIncidentReportComplete(v.notes))throw Error('请为四项实战复盘各写至少15字，内容不超过5000字。');
 if(typeof v.sealedAt!=='string'||!Number.isFinite(Date.parse(v.sealedAt)))throw Error('请先完成并封存实战复盘。');
 const run=restorePortClassLab(v.run,12),missing=portIncidentCompletion(run).filter(x=>!x.complete);
 if(missing.length)throw Error('实战尚未完成：'+missing.map(x=>x.label).join('；')+'。');
 return {version:'port-emergency-submission/1.0',lesson:12,mode:'practical',run:serializePortClassLab(run),notes:Object.fromEntries(PORT_INCIDENT_REPORT_FIELDS.map(k=>[k,v.notes![k]!.trim()])),sealedAt:v.sealedAt,metrics:portClassLabMetrics(run)};
}
