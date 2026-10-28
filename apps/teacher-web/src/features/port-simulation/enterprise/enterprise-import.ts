import {ENTERPRISE_SUBMISSION_SCHEMA,type EnterpriseRecord} from '@edu/port-simulation-core';
/** Parse an import without replacing the active port. Replay validates rules and commands later. */
export function parseEnterpriseImport(text:string):EnterpriseRecord{
  let value:unknown;try{value=JSON.parse(text);}catch{throw Error('文件不是有效的JSON存档，请选择从本系统导出的经营记录或封存包。');}
  const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(value))throw Error('存档内容应为经营记录对象，请保留原文件并重新选择。');
  const record=value.schema===ENTERPRISE_SUBMISSION_SCHEMA?value.record:value;
  if(!object(record))throw Error('封存包缺少完整经营记录，请保留原文件并重新导出。');
  return record as unknown as EnterpriseRecord;
}
