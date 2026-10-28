import { ENTERPRISE_VERSION, type EnterpriseRecord, type EnterprisePackage } from '@edu/port-simulation-core';
import type { EnterpriseTeaching } from './enterprise-teaching';
export interface EnterpriseSave {
  id: string; scope: string; title: string; savedAt: string; schema: typeof ENTERPRISE_VERSION;
  revision?: number;
  record: EnterpriseRecord; checkpoints: Array<{ hour: number; position: number; record: EnterpriseRecord }>;
  attemptId?: string; taskId?: string; pending?: { requestId: string; package: EnterprisePackage };
  teaching?: EnterpriseTeaching;
}
const DATABASE = 'edu-port-enterprise-local';
const STORE = 'personal-runs';
// Version 2 prevents an already-open legacy client from bypassing revision checks.
const DATABASE_VERSION=2;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('当前环境没有可用的本机数据库，请使用存档导出保存进度。')); return; }
    let settled=false;
    const request = indexedDB.open(DATABASE,DATABASE_VERSION);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}settled=true;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>{settled=true;reject(request.error?.name==='VersionError'?Error('本机存档格式已更新，请刷新此页面后继续；不要清空浏览器数据。'):request.error??Error('本机数据库打开失败。'));};
    request.onblocked=()=>{settled=true;reject(Error('本机数据库更新被其他窗口占用，请关闭旧窗口后重试。'));};
  });
}
export async function listEnterpriseSaves(scope: string): Promise<EnterpriseSave[]> {
  const db = await open();
  try { return await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readonly'), request = tx.objectStore(STORE).getAll(); request.onsuccess = () => resolve((request.result as EnterpriseSave[]).filter(s => s.scope === scope).sort((a, b) => b.savedAt.localeCompare(a.savedAt))); request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
export class EnterpriseSaveConflict extends Error {
  readonly code='ENTERPRISE_SAVE_CONFLICT';
  constructor(){super('其他窗口已保存较新进度，本窗口已暂停写入。请恢复最新记录，或将当前进度另存为个人练习。');this.name='EnterpriseSaveConflict';}
}
export async function saveEnterprise(save: EnterpriseSave): Promise<EnterpriseSave> {
  const db = await open();
  try { return await new Promise<EnterpriseSave>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),read=store.get(save.id);
    let stored:EnterpriseSave,failure:Error|undefined;
    read.onsuccess=()=>{
      const prior=read.result as EnterpriseSave|undefined,expected=save.revision??0;
      if(!Number.isSafeInteger(expected)||expected<0||prior&&(prior.scope!==save.scope||(prior.revision??0)!==expected)||!prior&&expected!==0){failure=new EnterpriseSaveConflict();tx.abort();return;}
      try{stored={...save,revision:expected+1};store.put(stored);}catch(error){failure=error instanceof Error?error:Error(String(error));tx.abort();}
    };
    tx.oncomplete=()=>resolve(stored!);
    tx.onerror=()=>reject(failure??tx.error??Error('本机存档写入失败。'));
    tx.onabort=()=>reject(failure??tx.error??Error('本机存档事务中断。'));
  }); }
  finally { db.close(); }
}
export function enterpriseScope(actorId?: string) { return 'personal:' + (actorId ?? 'offline') + ':course-port-management-intro:' + ENTERPRISE_VERSION; }
export function downloadEnterprise(filename: string, data: unknown, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
