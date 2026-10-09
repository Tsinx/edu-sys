import { useEffect, useRef, useState } from 'react';
import { Live2DAvatarPlayer } from '../avatar/Live2DAvatarPlayer';
import { NarrationSpeech, type NarrationStatus, type NarrationVoice } from './NarrationSpeech';
import { visibleNarration } from './narration-scripts';
import './narration.css';
import { NARRATION_PRESENTATION_EVENT } from './narration-events';

export interface PageNarratorProps {
  pageKey: string;
  paragraphs: readonly string[];
  step: number;
  onReveal?: (step: number) => void;
  onStart?: () => void;
}
export function PageNarrator({ pageKey, paragraphs, step, onReveal, onStart }: PageNarratorProps) {
  const [hosted, setHosted] = useState(false);
  useEffect(() => { setHosted(Boolean(document.querySelector('.classroom-avatar-dock'))); }, []);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [message, setMessage] = useState(''), [subtitle, setSubtitle] = useState(''), [open, setOpen] = useState(false);
  const [voice, setVoice] = useState<NarrationVoice>('course'), [rate, setRate] = useState(1);
  const pending = useRef<{ pageKey: string; step: number } | null>(null);
  const speech = useRef<NarrationSpeech | null>(null);
  if (!speech.current) speech.current = new NarrationSpeech((s, m) => { setStatus(s); setMessage(m ?? ''); });
  const safeStep = visibleNarration(paragraphs, step).length - 1;
  const current = useRef({ pageKey, paragraphs, step: safeStep, voice, rate, onStart }); current.current = { pageKey, paragraphs, step: safeStep, voice, rate, onStart };
  const play = (parts: readonly string[]) => { setOpen(true); onStart?.(); void speech.current!.play(parts, voice, rate, setSubtitle); };
  useEffect(() => {
    speech.current!.stop(); setSubtitle('');
    const request = pending.current;
    if (request?.pageKey === pageKey && request.step === safeStep) {
      pending.current = null; setOpen(true); current.current.onStart?.();
      void speech.current!.play([current.current.paragraphs[safeStep]!], current.current.voice, current.current.rate, setSubtitle);
    } else if (request?.pageKey !== pageKey) pending.current = null;
  }, [pageKey, safeStep, paragraphs]);
  useEffect(() => {
    const interrupt = (event: Event) => { if ((event as CustomEvent).detail !== speech.current) { pending.current = null; speech.current!.stop(); } };
    const leave = () => { pending.current = null; speech.current!.stop(); };
    window.addEventListener('edu:exclusive-audio', interrupt);
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('edu:exclusive-audio', interrupt); window.removeEventListener('pagehide', leave); speech.current!.dispose(); };
  }, []);
  const busy = ['loading', 'playing', 'paused'].includes(status);
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [open, status]);
  useEffect(() => { if (hosted) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status, subtitle } })); }, [hosted, status, subtitle]);
  useEffect(() => () => { if (hosted) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status: 'idle', subtitle: '' } })); }, [hosted]);
  return <section className="em-narrator" aria-label="数字人逐页讲解">
    <div className="em-narrator-actions">
      <button onClick={() => { pending.current = null; play(visibleNarration(paragraphs, safeStep)); }}>▶ {busy ? '从头讲解本页' : '数字人讲解本页'}</button>
      {busy && <button onClick={() => void (status === 'paused' ? speech.current!.resume() : speech.current!.pause())}>{status === 'paused' ? '继续讲解' : '暂停讲解'}</button>}
      {(busy || pending.current) && <button onClick={() => { pending.current = null; speech.current!.stop(); }}>停止讲解</button>}
      {onReveal && safeStep < paragraphs.length - 1 && <button onClick={() => { speech.current!.stop(); pending.current = { pageKey, step: safeStep + 1 }; onReveal(safeStep + 1); }}>公开下一步并讲解</button>}
      <label>声音<select aria-label="讲解声音" value={voice} disabled={busy} onChange={e => setVoice(e.target.value as NarrationVoice)}><option value="course">课程数字人语音</option><option value="device">本机中文语音</option></select></label>
      <label>语速<select aria-label="讲解语速" value={rate} disabled={busy} onChange={e => setRate(Number(e.target.value))}><option value="0.85">慢速</option><option value="1">标准</option><option value="1.15">稍快</option></select></label>
      {!hosted && <button onClick={() => setOpen(!open)}>{open ? '收起数字人' : '显示数字人'}</button>}
    </div>
    <p className="em-narrator-status" role="status">{status === 'loading' ? '正在准备语音…' : status === 'playing' ? '正在讲解 · 翻页或改变公开步骤将停止本段' : status === 'paused' ? '已暂停，可继续或停止' : message || `朗读本页已公开内容；当前公开 ${safeStep} / ${paragraphs.length - 1} 步。`}</p>
    {open && !hosted && <div className="em-narrator-panel">
      <div className="em-narrator-avatar"><Live2DAvatarPlayer state={status === 'playing' ? 'speaking' : status === 'loading' ? 'thinking' : 'idle'} subtitle="" readMouth={speech.current.meter.read} readViseme={speech.current.meter.readViseme}/></div>
      <div className="em-narrator-caption"><b>小麦 · 课程数字助教</b><p aria-live="off">{subtitle || '点击“数字人讲解本页”开始。你可以随时暂停，留出计算与讨论时间。'}</p>{voice === 'device' && <small>本机语音的声音由系统提供，不支持精确口型同步。</small>}</div>
    </div>}
  </section>;
}
