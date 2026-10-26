import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EnterpriseAttemptSummary, EnterpriseTask } from '@edu/port-simulation-core';
import { request } from '../../../api';

type Overview = {
  teacher: boolean;
  totals: { openTasks: number; started: number; submitted: number; pending: number; verified: number };
  tasks: EnterpriseTask[];
  recent: Array<EnterpriseAttemptSummary & { taskTitle: string }>;
};
const status = { started: '场次已建立', queued: '等待核验', verifying: '重放核验中', verified: '已核验', rejected: '核验未通过' };
const taskUrl = (id: string) => '/port-enterprise?tab=tasks&task=' + encodeURIComponent(id);

/** Platform entry and personal status; the running simulation stays in its own controller. */
export function EnterprisePortalCard({ variant = 'course' }: { variant?: 'course' | 'tasks' | 'history' }) {
  const [data, setData] = useState<Overview>(), [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    const refresh = () => void request<Overview>('/api/port-enterprise/overview').then(value => {
      if (live) { setData(value); setError(''); }
    }).catch(reason => { if (live) setError(reason.message); });
    refresh(); const timer = setInterval(refresh, 15000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return <section className={variant === 'tasks' ? 'workspace-card' : 'workspace-section'} aria-label="港口长期独立经营" data-enterprise-portal={variant}><div>
    <span>港口管理概论 · 单人任务 · 本机运行</span>
    <h2>{variant === 'history' ? '长期经营提交记录' : '港口长期独立经营'}</h2>
    <p>1／3／5年经营；设备、建设、人员、生产、财务与应急沿同一时间线运行。</p>
    {data && <p role="status">{data.totals.openTasks}项开放任务 · {data.totals.verified}场已核验 · {data.totals.pending}场等待核验{!data.teacher && ` · ${data.totals.started}场可以继续`}</p>}
    {error && <p role="alert" className="workspace-error">{error}</p>}
    <div className="workspace-actions">
      <Link to="/port-enterprise">进入个人经营空间</Link>
      <Link to="/port-enterprise?tab=learning">详细教学模式与自学路线</Link>
      <Link to="/port-enterprise?tab=tasks">{data?.teacher ? '发布长期经营任务与查看个人结果' : '查看长期经营任务与提交'}</Link>
      <Link to="/port-enterprise?tab=storage">导入已有离线经营记录</Link>
    </div>
    {data && variant !== 'history' && data.tasks.length > 0 && <details><summary>最近公布的长期经营任务</summary>{data.tasks.map(task => <p key={task.id}><Link to={taskUrl(task.id)}>{task.title}</Link> · {task.config.years}年 · {task.closed ? '已关闭' : task.deadline && Date.parse(task.deadline) < Date.now() ? '已截止' : '可进入'}{task.completeRequired ? ' · 完整经营期' : ''}</p>)}</details>}
    {data && (variant === 'history' || data.recent.length > 0) && <div>
      <h3>最近5次正式提交</h3>
      {data.recent.map(attempt => <article className="workspace-row" key={attempt.id}><div>
        <strong>{attempt.taskTitle} · {status[attempt.status]}</strong>
        <p>{data.teacher ? attempt.displayName + ' · ' : ''}{new Date(attempt.submittedAt ?? attempt.createdAt).toLocaleString('zh-CN')}{attempt.result ? ` · ${attempt.result.total.toFixed(2)}分 · ${attempt.result.complete ? '已完成经营期' : '阶段结果'}` : ''}</p>
        {attempt.error && <p>{attempt.error}</p>}
      </div><Link to={taskUrl(attempt.taskId)}>查看任务与复盘</Link></article>)}
      {!data.recent.length && <p>尚无长期经营正式提交。经营记录需在场次封存后主动提交。</p>}
    </div>}
  </div></section>;
}
