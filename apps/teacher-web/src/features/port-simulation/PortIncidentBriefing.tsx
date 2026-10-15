import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { PortClassLab } from '@edu/port-simulation-core';
import type { LabAttempt } from './port-class-notebook';
import { incidentNotices, incidentTeachingStep, INCIDENT_TEACHING_STAGES, type IncidentNotice } from './port-incident-teaching';

const minute = (value: number) => { const seconds = Math.round(value * 60); return `第${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`; };
const Icon = ({ tone }: { tone: IncidentNotice['tone'] }) => tone === 'success' ? <CheckCircle2 aria-hidden="true"/> : tone === 'info' ? <Info aria-hidden="true"/> : <AlertTriangle aria-hidden="true"/>;

export function PortIncidentBriefing({ run, attempts, teaching, onTeaching, onPause }: {
  run: PortClassLab; attempts: LabAttempt[]; teaching: boolean; onTeaching: (value: boolean) => void; onPause: () => void;
}) {
  const notices = useMemo(() => incidentNotices(run, attempts), [run, attempts]);
  const latest = notices.at(-1), step = incidentTeachingStep(run);
  const [opened, setOpened] = useState<IncidentNotice[]>([]), [dismissed, setDismissed] = useState('');
  const previous = useRef<Set<string> | null>(null), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const ids = new Set(notices.map(n => n.id)), prior = previous.current;
    const reset = !!prior && [...prior].some(id => !ids.has(id));
    const added = notices.filter(n => n.interrupt && (!prior || reset || !prior.has(n.id)));
    // Refresh keeps old reports in history; only a fresh opening or new results interrupt.
    if ((!prior || reset) && run.commands.length > 0) setOpened([]);
    else if (added.length) setOpened(current => [...current.filter(n => ids.has(n.id)), ...added.filter(n => !current.some(old => old.id === n.id))]);
    previous.current = ids;
  }, [notices, run.commands.length]);
  useEffect(() => {
    const element = dialog.current;
    if (opened.length && element && !element.open) element.showModal();
    else if (!opened.length && element?.open) element.close();
  }, [opened]);
  const close = () => { setDismissed(latest?.id ?? ''); setOpened([]); };
  const showLatest = () => { if (latest) { onPause(); setOpened([latest]); } };
  return <section className="pib" aria-label="故障与处置通报">
    <div className="pib-heading"><div><span>INCIDENT BRIEFING / 第12讲</span><h2>故障与处置通报</h2></div>
      <label className="pib-mode"><input type="checkbox" role="switch" aria-label="教学模式" checked={teaching} onChange={e => onTeaching(e.target.checked)}/><strong>教学模式</strong><small>{teaching ? '分步观察与讨论' : '自主实验'}</small></label>
    </div>
    {latest && <div className={`pib-banner pib-${latest.tone}`} aria-live="polite" aria-atomic="true"><Icon tone={latest.tone}/><div><span>{minute(latest.minute)} · 模拟时间</span><h3>{latest.title}</h3><p>{latest.text}</p></div><button type="button" onClick={showLatest}>放大查看通报</button></div>}
    {teaching && <div className="pib-teaching" aria-label="教学模式分步引导">
      <ol aria-label="教学阶段">{INCIDENT_TEACHING_STAGES.map((title, index) => <li key={title} aria-current={index === step.index ? 'step' : undefined}><span>{index + 1}</span>{title}</li>)}</ol>
      <div className="pib-prompt"><div><span>当前阶段 · {step.title}</span><h3>{step.action}</h3><p><strong>观察与讨论：</strong>{step.question}</p><small>切换模式会暂停运行；开启时设为10倍，可自行调整。通报确认后由你继续推进，处置条件与实际结果保持原规则。</small></div>
        <button type="button" onClick={() => document.querySelector('.pcl-operation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>定位处置台</button>
      </div>
    </div>}
    <details className="pib-history"><summary>查看全部通报（{notices.length}）</summary><ol>{notices.map(n => <li key={n.id} className={`pib-${n.tone}`}><time>{minute(n.minute)}</time><strong>{n.title}</strong><p>{n.text}</p></li>)}</ol></details>
    {latest && latest.id !== dismissed && !opened.length && <aside className={`pib-toast pib-${latest.tone}`} role={latest.tone === 'danger' ? 'alert' : 'status'} aria-label="最新处置通报"><Icon tone={latest.tone}/><div><strong>{latest.title}</strong><p>{latest.text}</p><button type="button" onClick={showLatest}>展开通报</button></div><button className="pib-dismiss" type="button" aria-label="收起最新通报" onClick={() => setDismissed(latest.id)}><X size={18}/></button></aside>}
    <dialog ref={dialog} className="pib-dialog" aria-labelledby="pib-dialog-title" onCancel={close} onClose={close} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <header><span>港口现场 · 事件通报</span><h2 id="pib-dialog-title">{opened.length > 1 ? `${opened.length}条新通报` : opened[0]?.title}</h2><p>请核对以下现场事实；确认后模拟仍保持暂停，由你决定下一步。</p></header>
      <div className="pib-dialog-body">{opened.map(n => <article key={n.id} className={`pib-${n.tone}`}><Icon tone={n.tone}/><div><span>{minute(n.minute)} · 模拟时间</span><h3>{n.title}</h3><p>{n.text}</p></div></article>)}</div>
      <footer><button type="button" className="pcl-primary" autoFocus onClick={close}>已阅读，返回实验</button><small>全部通报保留在通报中心，可随时回看。</small></footer>
    </dialog>
  </section>;
}
