import {ENTERPRISE_SUBMISSION_SCHEMA,type EnterpriseRecord} from '@edu/port-simulation-core';
import {ENTERPRISE_TEACHING_VERSION,enterpriseTeachingSteps,newEnterpriseTeaching,type EnterpriseTeaching} from './enterprise-teaching';
import type {EnterpriseView} from '@edu/port-simulation-core';
export const ENTERPRISE_BACKUP_SCHEMA='port-enterprise-backup/1' as const;
export interface EnterpriseBackup {schema:typeof ENTERPRISE_BACKUP_SCHEMA;record:EnterpriseRecord;teaching?:EnterpriseTeaching}
export function enterpriseBackup(record:EnterpriseRecord,teaching?:EnterpriseTeaching):EnterpriseBackup{
  return {schema:ENTERPRISE_BACKUP_SCHEMA,record,...(teaching?{teaching:structuredClone(teaching)}:{})};
}
/** Parse an import without replacing the active port. Replay validates rules and commands later. */
export function parseEnterpriseBackup(text:string):{record:EnterpriseRecord;teaching?:unknown}{
  let value:unknown;try{value=JSON.parse(text);}catch{throw Error('文件不是有效的JSON存档，请选择从本系统导出的经营记录或封存包。');}
  const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(value))throw Error('存档内容应为经营记录对象，请保留原文件并重新选择。');
  const backup=value.schema===ENTERPRISE_BACKUP_SCHEMA;
  if(backup&&Object.keys(value).some(k=>!['schema','record','teaching'].includes(k)))throw Error('完整备份含有未知字段，请保留原文件。');
  const record=value.schema===ENTERPRISE_SUBMISSION_SCHEMA||backup?value.record:value;
  if(!object(record))throw Error('封存包缺少完整经营记录，请保留原文件并重新导出。');
  return {record:record as unknown as EnterpriseRecord,...(backup&&value.teaching!==undefined?{teaching:value.teaching}:{})};
}
export function parseEnterpriseImport(text:string):EnterpriseRecord{return parseEnterpriseBackup(text).record;}

/** Validate against the replayed port before it replaces the active run. Teaching never contributes to grades. */
export function restoreEnterpriseTeaching(value:unknown,record:EnterpriseRecord,v:EnterpriseView):EnterpriseTeaching|undefined{
  if(value===undefined)return undefined;
  const fail=():never=>{throw Error('备份中的带教进度无效或版本不兼容，当前港口未替换。请保留原文件。');};
  const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
  if(!object(value)||value.schema!==ENTERPRISE_TEACHING_VERSION||record.config.mode!=='practice'||!record.config.tutorial)fail();
  const p=value as unknown as EnterpriseTeaching,template=newEnterpriseTeaching();
  const ids=new Set(enterpriseTeachingSteps(v,record,template).map(s=>s.id));
  if(Object.keys(p).some(k=>!['schema','active','selected','pausedAt','answers','receipts','actions','starts'].includes(k))||typeof p.active!=='boolean'||!ids.has(p.selected))fail();
  const point=(x:unknown)=>object(x)&&Number.isSafeInteger(x.hour)&&Number(x.hour)>=0&&Number(x.hour)<=v.hour&&Number.isSafeInteger(x.position)&&Number(x.position)>=0&&Number(x.position)<=record.commands.length;
  if(p.pausedAt!==undefined&&(!Number.isSafeInteger(p.pausedAt)||p.pausedAt<0||p.pausedAt>v.hour))fail();
  for(const key of ['answers','receipts','actions','starts'] as const)if(!object(p[key])||Object.keys(p[key]).length>100||Object.keys(p[key]).some(id=>!ids.has(id)))fail();
  if(Object.values(p.answers).some(x=>typeof x!=='string'||x.length>5000)||Object.values(p.actions).some(x=>!Number.isSafeInteger(x)||x<0||x>v.hour+record.commands.length+100))fail();
  if(Object.values(p.starts).some(x=>!point(x)||Object.keys(x).some(k=>!['hour','position'].includes(k))))fail();
  if(Object.values(p.receipts).some(x=>!point(x)||Object.keys(x).some(k=>!['hour','position','evidence'].includes(k))||!Array.isArray(x.evidence)||x.evidence.length>20||x.evidence.some(y=>typeof y!=='string'||y.length>2000)))fail();
  const restored=structuredClone(p),steps=enterpriseTeachingSteps(v,record,restored),selected=steps.find(s=>s.id===p.selected)!;
  // A receipt cannot complete a rejected/missing business command or a future clock goal.
  for(const s of steps)if((s.kind==='command'||s.kind==='advance')&&restored.receipts[s.id]&&!s.complete)fail();
  const firstIncomplete=steps.findIndex(s=>!s.complete);
  restored.selected=firstIncomplete>=0&&steps.indexOf(selected)>firstIncomplete?steps[firstIncomplete]!.id:p.selected;
  restored.active=false;restored.pausedAt=v.hour;
  return restored;
}
