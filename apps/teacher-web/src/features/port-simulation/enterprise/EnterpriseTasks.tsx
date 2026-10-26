import { useCallback, useEffect, useState } from 'react';
import type { ClassroomActor } from '@edu/contracts';
import { SCENARIOS, type EnterpriseTask, type EnterpriseAttemptSummary, type EnterprisePackage, type EnterpriseConfig } from '@edu/port-simulation-core';
import { CommandForm, EnterpriseTable, fmt, pct, wan } from './EnterpriseForms';
import { downloadEnterprise } from './enterprise-storage';
import type { useEnterprise } from './useEnterprise';
export async function enterpriseRequest<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch('/api/port-enterprise/' + path, { method: method ?? (body === undefined ? 'GET' : 'POST'), credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000), headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => { throw Error('教学平台未返回有效数据。请保留本机存档，联网后重试。'); });
  if (!response.ok) throw Error(data.message ?? '任务服务暂不可用。'); return data as T;
}
type ResultRow = { actorId: string; displayName: string; identifier: string; attempts: EnterpriseAttemptSummary[]; selected: EnterpriseAttemptSummary | null };
const statusLabel: Record<EnterpriseAttemptSummary['status'], string> = { started: '个人场次已建立', queued: '等待核验', verifying: '重放核验中', verified: '已核验', rejected: '核验未通过' };
export function EnterpriseTasks({ actor, confirmed, runtime, navigate }: { actor?: ClassroomActor; confirmed: boolean; runtime: ReturnType<typeof useEnterprise>; navigate: (tab: string) => void }) {
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]), [attempts, setAttempts] = useState<EnterpriseAttemptSummary[]>([]), [error, setError] = useState(''), [message, setMessage] = useState(''), [waiting, setWaiting] = useState(false), [rows, setRows] = useState<ResultRow[]>([]), [selectedTask, setSelectedTask] = useState('');
  const teacher = !!actor?.roles.includes('teacher');
  const requestedTask = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('task');
  useEffect(() => {
    if (!confirmed || !requestedTask) return;
    let live = true;
    void enterpriseRequest<{ rows: ResultRow[] }>('tasks/' + encodeURIComponent(requestedTask) + '/results').then(data => {
      if (live) { setRows(data.rows); setSelectedTask(requestedTask); }
    }).catch(reason => { if (live) setError(reason.message); });
    return () => { live = false; };
  }, [confirmed, requestedTask]);
  const refresh = useCallback(async () => { if (!confirmed) return; try { const data = await enterpriseRequest<{ tasks: EnterpriseTask[]; attempts: EnterpriseAttemptSummary[] }>('tasks'); setTasks(data.tasks); setAttempts(data.attempts); setError(''); } catch (e) { setError((e as Error).message); } }, [confirmed]);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 10000); return () => clearInterval(timer); }, [refresh]);
  const work = async (fn: () => Promise<void>) => { setWaiting(true); setError(''); setMessage(''); try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); } finally { setWaiting(false); } };
  const start = (task: EnterpriseTask, existing?: EnterpriseAttemptSummary) => work(async () => {
    const attempt = existing ?? await enterpriseRequest<EnterpriseAttemptSummary>('tasks/' + task.id + '/attempts', { requestId: crypto.randomUUID() });
    const local = runtime.saves.find(s => s.attemptId === attempt.id);
    if (local) await runtime.load(local); else await runtime.create(attempt.config);
    runtime.bindAttempt(attempt.id, task.id); await runtime.waitForSave(); navigate('overview');
  });
  const submit = () => work(async () => {
    const save = runtime.currentSave;
    if (!save?.attemptId) throw Error('请从已公布任务建立正式个人场次。当前练习可以继续保存和导出。');
    await runtime.waitForSave();
    const response = await runtime.send({ type: 'package' }), pkg = response.package;
    if (!pkg) throw Error('尚未生成封存包。');
    const requestId = save.pending?.requestId ?? crypto.randomUUID();
    await runtime.savePending(requestId, pkg);
    const result = await enterpriseRequest<EnterpriseAttemptSummary>('attempts/' + save.attemptId + '/submit', { requestId, package: pkg });
    setMessage('提交已接收：' + statusLabel[result.status] + '。本机封存包已保留。');
  });
  const attachImported = (task: EnterpriseTask, attempt: EnterpriseAttemptSummary) => work(async () => {
    await runtime.waitForSave();
    const save = runtime.currentSave;
    if (!save || save.attemptId || JSON.stringify(save.record.config) !== JSON.stringify(attempt.config) || JSON.stringify(save.record.rules) !== JSON.stringify(task.rules)) throw Error('当前记录的初始条件或规则与该正式场次不一致。请保留原文件。');
    runtime.bindAttempt(attempt.id, task.id); await runtime.waitForSave();
    setMessage('当前导入记录已关联到自己的正式场次。核对后可主动提交，原有本机记录继续保留。');
  });
  const showResults = (taskId: string) => work(async () => { const data = await enterpriseRequest<{ rows: ResultRow[] }>('tasks/' + taskId + '/results'); setRows(data.rows); setSelectedTask(taskId); });
  const replay = (id: string) => work(async () => { const data = await enterpriseRequest<{ package: EnterprisePackage }>('attempts/' + id + '/replay'); await runtime.importRecord(data.package.record); navigate('analysis'); });
  const csv = () => {
    const q = (value: unknown) => { const raw=String(value??'');return '"'+(/^[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')+'"'; };
    const table = [['姓名','学号','核验状态','完成经营期','诊断分','到期履约率','净资产元','利润元'], ...rows.map(r => [r.displayName,r.identifier,r.selected?'已核验':'未形成核验结果',r.selected?.result?.complete?'完成':'未完成',r.selected?.result?.total??'',r.selected?.result?.deliveryRate??'',r.selected?.result?.equity??'',r.selected?.result?.profit??''])];
    downloadEnterprise('港口独立经营-个人结果.csv','\ufeff'+table.map(row=>row.map(q).join(',')).join('\r\n'),'text/csv');
  };
  return <><h2>{teacher?'个人任务发布与成绩复盘':'正式个人任务与提交'}</h2><p>每名学生独立运行和存档。正式场次绑定任务的初始条件、规则与允许次数。</p>
    {!confirmed&&<p className="enterprise-notice">当前可完整进行本机练习。连接教学平台并确认登录后，可领取正式任务和提交核验；已保存进度保持在本机。</p>}
    {error&&<p className="enterprise-error" role="alert">{error}</p>}{message&&<p className="enterprise-success" role="status">{message}</p>}
    {teacher&&confirmed&&<CommandForm id="publish-enterprise" title="公布新的独立经营任务" disabled={waiting||runtime.busy} fields={[{name:'title',label:'任务名称',value:'港口长期独立经营 · 期末任务'},{name:'scenario',label:'经营情境',type:'select',options:Object.entries(SCENARIOS).map(([id,s])=>[id,s.name])},{name:'years',label:'经营年数',type:'select',value:'3',options:[['1','1年'],['3','3年'],['5','5年']]},{name:'seed',label:'固定情境种子',type:'number',min:1,max:2147483647,value:20261025},{name:'maxAttempts',label:'正式场次数',type:'number',min:1,max:5,value:1},{name:'deadline',label:'截止时间 ISO格式（留空不限）',value:''},{name:'completeRequired',label:'要求完成全部经营期',type:'checkbox',value:'true'}]} onSubmit={f=>void work(async()=>{const task=await enterpriseRequest<EnterpriseTask>('tasks',{title:f.title,config:{seed:Number(f.seed),years:Number(f.years),scenario:f.scenario,mode:'exam'},maxAttempts:Number(f.maxAttempts),deadline:f.deadline?new Date(f.deadline).toISOString():null,completeRequired:f.completeRequired==='true'});setMessage('已公布任务：'+task.title);})} submit="公布个人任务" help="发布后的初始条件保持固定。需要改变规则时另发任务；已有个人场次不被覆盖。"/>}
    <div className="enterprise-task-list">{tasks.map(task=>{const own=attempts.filter(a=>a.taskId===task.id&&a.actorId===actor?.actorId),started=own.find(a=>a.status==='started');const canAttach=started&&!runtime.currentSave?.attemptId&&JSON.stringify(runtime.currentSave?.record.config)===JSON.stringify(started.config)&&JSON.stringify(runtime.currentSave?.record.rules)===JSON.stringify(task.rules);return <article key={task.id}><div><span className="enterprise-eyebrow">{task.closed?'已关闭':'已公布'} · {task.config.years}个经营年</span><h3>{task.title}</h3><p>{SCENARIOS[task.config.scenario].name} · 种子{task.config.seed} · 最多{task.maxAttempts}次正式场次</p><small>{task.deadline?'截止 '+new Date(task.deadline).toLocaleString('zh-CN'):'未设置截止时间'} · {task.completeRequired?'需完成全部经营期':'允许按实际进度提交'}</small></div><div className="enterprise-inline-actions">{teacher?<><button disabled={waiting} onClick={()=>void showResults(task.id)}>查看个人结果</button><button disabled={waiting} onClick={()=>void work(async()=>{await enterpriseRequest('tasks/'+task.id,{closed:!task.closed},'PATCH');})}>{task.closed?'重新开放':'关闭任务'}</button></>:<><button disabled={waiting||runtime.busy||task.closed||!started&&own.length>=task.maxAttempts} onClick={()=>void start(task,started)}>{started?'恢复个人场次':'建立正式个人场次'}</button>{canAttach&&<button disabled={waiting||runtime.busy||task.closed||runtime.replaying} onClick={()=>void attachImported(task,started!)}>关联当前导入记录</button>}<button disabled={waiting} onClick={()=>void showResults(task.id)}>查看我的结果</button></>}</div></article>;})}</div>
    {!teacher&&<section className="enterprise-subpanel"><h3>当前记录的提交状态</h3><p>{runtime.currentSave?.attemptId?'已绑定正式个人场次：'+runtime.currentSave.attemptId:'当前为本机练习，尚未绑定正式场次。'}</p><p>提交前完成个人决策说明并封存。平台独立重放，不直接采用浏览器显示的分数。</p><button className="enterprise-button enterprise-button--primary" disabled={!confirmed||waiting||runtime.busy||!runtime.view?.sealed||!runtime.currentSave?.attemptId} onClick={()=>void submit()}>{runtime.currentSave?.pending?'重试同一封存包':'主动提交教师'}</button></section>}
    <EnterpriseTable headings={['任务 / 场次','学生','状态','完成状态','诊断分','反馈']} rows={attempts.slice(0,50).map(a=>[<>{tasks.find(t=>t.id===a.taskId)?.title??a.taskId}<small>{a.id}</small></>,a.displayName,statusLabel[a.status],a.result?(a.result.complete?'已完成':'按实际进度'):'—',a.result?fmt(a.result.total,2):'—',a.error??''])}/>
    {selectedTask&&<section className="enterprise-subpanel"><h3>{tasks.find(t=>t.id===selectedTask)?.title} · 个人结果</h3><button onClick={csv}>导出结果CSV</button><EnterpriseTable headings={['姓名 / 学号','最新有效结果','完成经营期','履约','利润','操作']} rows={rows.map(r=>[<>{r.displayName}<small>{r.identifier}</small></>,r.selected?fmt(r.selected.result!.total,2)+'分':'未提交或尚未核验',r.selected?.result?.complete?'完成':'未完成',r.selected?pct(r.selected.result!.deliveryRate):'—',r.selected?wan(r.selected.result!.profit):'—',<button disabled={!r.selected||waiting} onClick={()=>r.selected&&void replay(r.selected.id)}>打开只读复盘</button>])}/><p className="enterprise-muted">每项任务独立保留全部场次，按最近核验通过的个人场次展示；失败记录不覆盖有效结果。重放核验确认记录一致性，不构成远程监考。</p></section>}
  </>;
}
