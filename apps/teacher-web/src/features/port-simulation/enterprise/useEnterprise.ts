import { useCallback, useEffect, useRef, useState } from 'react';
import { ENTERPRISE_VERSION, quarterIndex, type EnterpriseConfig, type EnterpriseCommand, type EnterpriseRecord, type EnterpriseView, type EnterprisePackage } from '@edu/port-simulation-core';
import { listEnterpriseSaves, saveEnterprise, type EnterpriseSave } from './enterprise-storage';
import { ENTERPRISE_TEACHING_VERSION, newEnterpriseTeaching, type EnterpriseTeaching } from './enterprise-teaching';
type Response = { id: number; type: string; view?: EnterpriseView; record?: EnterpriseRecord; package?: EnterprisePackage; csv?: string; error?: string; persist?: boolean; replaying?: boolean; hour?: number; horizon?: number };
type Request = { type: string; config?: EnterpriseConfig; command?: EnterpriseCommand; record?: EnterpriseRecord; position?: number };
const defaultConfig: EnterpriseConfig = { seed: 20261025, years: 3, scenario: 'balanced', mode: 'practice' };
export function useEnterprise(scope: string) {
  const [view, setView] = useState<EnterpriseView>(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [storageError, setStorageError] = useState(''), [savedAt, setSavedAt] = useState(''), [saves, setSaves] = useState<EnterpriseSave[]>([]), [replaying, setReplaying] = useState(false), [progress, setProgress] = useState('');
  const [, renderMetadata] = useState(0);
  const worker = useRef<Worker | null>(null), seq = useRef(0), meta = useRef<EnterpriseSave | null>(null), activating = useRef<EnterpriseSave | null>(null);
  const currentView = useRef(view); currentView.current = view;
  const pending = useRef(new Map<number, { resolve: (r: Response) => void; reject: (e: Error) => void }>()), queue = useRef(Promise.resolve());
  const persist = useCallback((save: EnterpriseSave) => {
    queue.current = queue.current.catch(() => {}).then(async () => {
      try { await saveEnterprise(save); setSavedAt(save.savedAt); setStorageError(''); setSaves(await listEnterpriseSaves(scope)); }
      catch (e) { setStorageError('进度尚未写入本机数据库：' + (e as Error).message + ' 请导出存档。'); }
    });
  }, [scope]);
  const send = useCallback((request: Request) => new Promise<Response>((resolve, reject) => {
    if (!worker.current) { reject(Error('本机仿真线程尚未就绪。')); return; }
    const id = ++seq.current; pending.current.set(id, { resolve, reject }); setBusy(true); setError(''); worker.current.postMessage({ ...request, id });
  }), []);
  const activate = useCallback(async (save?: EnterpriseSave, config = defaultConfig, teaching?: EnterpriseTeaching) => {
    const next: EnterpriseSave = save ?? { id: crypto.randomUUID(), scope, title: (teaching ? '教学路线 · ' : '东湾港 · ') + new Date().toLocaleString('zh-CN'), schema: ENTERPRISE_VERSION, savedAt: '', record: { schema: ENTERPRISE_VERSION, rules: {} as EnterpriseRecord['rules'], config, commands: [] }, checkpoints: [], ...(teaching ? {teaching} : {}) };
    activating.current = next;
    try { await send(save ? { type: 'restore', record: save.record } : { type: 'create', config }); }
    catch (e) { activating.current = null; throw e; }
  }, [scope, send]);
  useEffect(() => {
    let live = true;
    const w = new Worker(new URL('./enterprise.worker.ts', import.meta.url), { type: 'module' }); worker.current = w;
    w.onmessage = (event: MessageEvent<Response>) => {
      if (!live) return;
      const m = event.data;
      if (m.type === 'progress') { setProgress('本机正在计算至第' + Math.floor((m.hour ?? 0) / 24) + '个生产日…'); return; }
      setBusy(false); setProgress('');
      if (m.type === 'error') { setError(m.error ?? '仿真失败。'); pending.current.get(m.id)?.reject(Error(m.error)); pending.current.delete(m.id); return; }
      if (m.view) {
        setView(m.view); setReplaying(!!m.replaying);
        if (m.persist && m.record) {
          const base = activating.current ?? meta.current;
          if (base) {
            const checkpoints = [...base.checkpoints], last = checkpoints.at(-1);
            if (!last || quarterIndex(last.hour) !== quarterIndex(m.view.hour) || m.record.commands.length - last.position >= 25 || m.view.sealed) checkpoints.push({ hour: m.view.hour, position: m.record.commands.length, record: m.record });
            const save = { ...base, record: m.record, savedAt: new Date().toISOString(), checkpoints: checkpoints.slice(-8) };
            meta.current = save; activating.current = null; persist(save);
          }
        }
      }
      pending.current.get(m.id)?.resolve(m); pending.current.delete(m.id);
    };
    w.onerror = event => { if (live) { setError('本机仿真线程失败：' + event.message); setBusy(false); for (const p of pending.current.values()) p.reject(Error(event.message)); pending.current.clear(); } };
    void (async()=>{
      let entries:EnterpriseSave[];
      try{entries=await listEnterpriseSaves(scope);}catch(e){if(!live)return;setStorageError((e as Error).message);await activate().catch(reason=>setError((reason as Error).message));return;}
      if(!live)return;setSaves(entries);
      try{await activate(entries[0]);}catch(e){if(live)setError((e as Error).message);}
    })();
    return () => { live = false; w.terminate(); worker.current = null; for (const p of pending.current.values()) p.reject(Error('运行空间已关闭。')); pending.current.clear(); };
  }, [scope, activate, persist]);
  const command = useCallback((command: EnterpriseCommand) => send({ type: 'command', command }), [send]);
  const create = useCallback((config: EnterpriseConfig) => activate(undefined, config), [activate]);
  const createTeaching = useCallback(async () => { await queue.current; return activate(undefined, defaultConfig, newEnterpriseTeaching()); }, [activate]);
  const load = useCallback((save: EnterpriseSave) => activate(save), [activate]);
  const importRecord = useCallback(async (record: EnterpriseRecord) => {
    const next: EnterpriseSave = { id: crypto.randomUUID(), scope, title: '导入 · ' + new Date().toLocaleString('zh-CN'), schema: ENTERPRISE_VERSION, savedAt: '', record, checkpoints: [] };
    await activate(next);
  }, [activate, scope]);
  const bindAttempt = useCallback((attemptId: string, taskId: string) => { if (!meta.current) return; meta.current = { ...meta.current, attemptId, taskId }; persist(meta.current); }, [persist]);
  const updateTeaching = useCallback((update: (previous: EnterpriseTeaching) => EnterpriseTeaching) => {
    const save = meta.current;
    if (!save?.teaching || save.teaching.schema !== ENTERPRISE_TEACHING_VERSION || save.attemptId || save.record.config.mode === 'exam') return;
    meta.current = { ...save, teaching: update(save.teaching), savedAt: new Date().toISOString() }; renderMetadata(n => n + 1); persist(meta.current);
  }, [persist]);
  const savePending = useCallback(async (requestId: string, pkg: EnterprisePackage) => { if (!meta.current) throw Error('个人存档尚未建立。'); await queue.current;meta.current = { ...meta.current, pending: { requestId, package: pkg } }; await saveEnterprise(meta.current); }, []);
  return { view, busy, error, setError, storageError, savedAt, saves, replaying, progress, send, command, create, createTeaching, updateTeaching, load, importRecord, bindAttempt, savePending, currentSave: meta.current, waitForSave: () => queue.current };
}
