import { ENTERPRISE_VERSION, type EnterpriseRecord, type EnterprisePackage } from '@edu/port-simulation-core';
import type { EnterpriseTeaching } from './enterprise-teaching';
export interface EnterpriseSave {
  id: string; scope: string; title: string; savedAt: string; schema: typeof ENTERPRISE_VERSION;
  record: EnterpriseRecord; checkpoints: Array<{ hour: number; position: number; record: EnterpriseRecord }>;
  attemptId?: string; taskId?: string; pending?: { requestId: string; package: EnterprisePackage };
  teaching?: EnterpriseTeaching;
}
const DATABASE = 'edu-port-enterprise-local';
const STORE = 'personal-runs';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('当前环境没有可用的本机数据库，请使用存档导出保存进度。')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('本机数据库打开失败。'));
    request.onblocked = () => reject(Error('本机数据库更新被其他窗口占用，请关闭旧窗口后重试。'));
  });
}
export async function listEnterpriseSaves(scope: string): Promise<EnterpriseSave[]> {
  const db = await open();
  try { return await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readonly'), request = tx.objectStore(STORE).getAll(); request.onsuccess = () => resolve((request.result as EnterpriseSave[]).filter(s => s.scope === scope).sort((a, b) => b.savedAt.localeCompare(a.savedAt))); request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
export async function saveEnterprise(save: EnterpriseSave): Promise<void> {
  const db = await open();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(save); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? Error('本机存档写入失败。')); tx.onabort = () => reject(tx.error ?? Error('本机存档事务中断。')); }); }
  finally { db.close(); }
}
export function enterpriseScope(actorId?: string) { return 'personal:' + (actorId ?? 'offline') + ':course-port-management-intro:' + ENTERPRISE_VERSION; }
export function downloadEnterprise(filename: string, data: unknown, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
