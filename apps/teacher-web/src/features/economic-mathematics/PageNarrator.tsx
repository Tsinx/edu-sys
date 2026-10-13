import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Live2DAvatarPlayer } from '../avatar/Live2DAvatarPlayer';
import { NarrationSpeech, type NarrationStatus, type NarrationVoice } from './NarrationSpeech';
import { visibleNarration } from './narration-scripts';
import { NARRATION_PRESENTATION_EVENT } from './narration-events';
import { COURSE_REVEAL_EVENT } from './PresentationChrome';
import { useNarrationVolume } from './narration-settings';
import './narration.css';
import { Keyboard, Pause, Play, Settings, SkipForward, SlidersHorizontal, Square, Undo2 } from 'lucide-react';
import { usePageTools, usePageToolsScope, type PageToolAction } from '../classroom/PageTools';

export interface PageNarratorProps {
  pageKey: string;
  paragraphs: readonly string[];
  step: number;
  onReveal?: (step: number) => void;
  onStart?: () => void;
  onReset?: () => void;
  navigation?: ReactNode;
  tools?: ReactNode;
  toolsLabel?: string;
}
export function PageNarrator({ pageKey, paragraphs, step, onReveal, onStart, onReset, navigation, tools, toolsLabel = '本页工具' }: PageNarratorProps) {
  const toolsHost = usePageToolsScope(), hosted = Boolean(toolsHost?.classroomSpeech);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [message, setMessage] = useState(''), [subtitle, setSubtitle] = useState('');
  const [panel, setPanel] = useState<'settings' | 'teacher' | 'tools' | null>(null);
  const [voice, setVoice] = useState<NarrationVoice>('course'), [rate, setRate] = useState(1);
  const [volume, setVolume] = useNarrationVolume();
  const [teacherText, setTeacherText] = useState('');
  const [autoNarrate, setAutoNarrate] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true), [pinAvatar, setPinAvatar] = useState(false), [showSubtitles, setShowSubtitles] = useState(true);
  const effectiveVolume = voice === 'device' ? Math.min(volume, 100) : volume;
  const panelId = useId(), root = useRef<HTMLElement>(null), teacherInput = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ pageKey: string; step: number } | null>(null);
  const speech = useRef<NarrationSpeech | null>(null);
  if (!speech.current) speech.current = new NarrationSpeech((s, m) => { setStatus(s); setMessage(m ?? ''); });
  useEffect(() => { speech.current!.setVolume(effectiveVolume / 100); }, [effectiveVolume]);
  const safeStep = Math.max(0, visibleNarration(paragraphs, step).length - 1), totalSteps = Math.max(0, paragraphs.length - 1);
  const current = useRef({ pageKey, paragraphs, step: safeStep, voice, rate, onStart });
  current.current = { pageKey, paragraphs, step: safeStep, voice, rate, onStart };
  const play = (parts: readonly string[]) => { onStart?.(); void speech.current!.play(parts, voice, rate, setSubtitle); };
  useEffect(() => {
    speech.current!.stop(); setSubtitle('');
    const request = pending.current;
    if (request?.pageKey === pageKey && request.step === safeStep) {
      pending.current = null; current.current.onStart?.();
      void speech.current!.play([current.current.paragraphs[safeStep]!], current.current.voice, current.current.rate, setSubtitle);
    } else if (request?.pageKey !== pageKey) pending.current = null;
  }, [pageKey, safeStep, paragraphs]);
  useEffect(() => { setPanel(null); }, [pageKey]);
  useEffect(() => {
    const interrupt = (event: Event) => { if ((event as CustomEvent).detail !== speech.current) { pending.current = null; speech.current!.stop(); } };
    const leave = () => { pending.current = null; speech.current!.stop(); };
    window.addEventListener('edu:exclusive-audio', interrupt); window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('edu:exclusive-audio', interrupt); window.removeEventListener('pagehide', leave); speech.current!.dispose(); };
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanel(null); };
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => { if (panel === 'teacher') teacherInput.current?.focus(); }, [panel]);
  const busy = ['loading', 'playing', 'paused'].includes(status);
  useEffect(() => { if (hosted) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status, subtitle } })); }, [hosted, status, subtitle]);
  useEffect(() => () => { if (hosted) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status: 'idle', subtitle: '' } })); }, [hosted]);
  const reveal = () => {
    if (!onReveal || safeStep >= totalSteps) return;
    speech.current!.stop();
    pending.current = autoNarrate ? { pageKey, step: safeStep + 1 } : null;
    onReveal(safeStep + 1);
  };
  useEffect(() => { window.addEventListener(COURSE_REVEAL_EVENT, reveal); return () => window.removeEventListener(COURSE_REVEAL_EVENT, reveal); }, [pageKey, safeStep, autoNarrate, onReveal]);
  const closePanel = () => { setPanel(null); toolsHost?.closePanel(); };
  const stop = () => { pending.current = null; speech.current!.stop(); };
  const narrationAction = () => {
    if (status === 'playing') void speech.current!.pause();
    else if (status === 'paused') void speech.current!.resume();
    else { pending.current = null; play(visibleNarration(paragraphs, safeStep)); }
  };
  const statusText = status === 'loading' ? '准备语音…' : status === 'playing' ? '正在发声' : status === 'paused' ? '已暂停' : status === 'error' ? message : message ? '发声结束' : '';
  const teacherForm = <form className="em-teacher-speech-form" onSubmit={event => {
    event.preventDefault(); const text = teacherText.trim(); if (!text) return;
    pending.current = null; onStart?.(); setTeacherText('');
    void speech.current!.play([text], voice, rate, setSubtitle, '教师发言已朗读完毕。');
  }}>
    <p>按原文朗读给全班听。</p>
    <textarea ref={teacherInput} aria-label="教师发言文字" maxLength={500} rows={3} value={teacherText} placeholder="输入要说的话…"
      onChange={event => setTeacherText(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }}/>
    <div className="em-teacher-speech-footer"><small>Enter 朗读 · Shift+Enter 换行</small><button type="submit" disabled={!teacherText.trim()}>朗读发言</button></div>
  </form>;
  const settings = <div className="em-speech-settings">
    <label>声音<select aria-label="讲解声音" value={voice} disabled={busy} onChange={event => setVoice(event.target.value as NarrationVoice)}><option value="course">课程数字人语音</option><option value="device">本机中文语音</option></select></label>
    <label>语速<select aria-label="讲解语速" value={rate} disabled={busy} onChange={event => setRate(Number(event.target.value))}><option value="0.85">慢速</option><option value="1">标准</option><option value="1.15">稍快</option></select></label>
    {!hosted && <label className="em-narrator-volume">朗读音量<input aria-label="讲解音量" type="range" min="0" max={voice === 'device' ? 100 : 500} step="10" value={effectiveVolume} onChange={event => setVolume(Number(event.target.value))}/><output>{effectiveVolume}%</output></label>}
    <small>{hosted ? '音量使用工具栏中的声音设置；本机语音最高100%。' : voice === 'device' ? '本机语音最高100%；课程语音支持增强至500%。' : '用于本页讲解和教师发言；短片使用视频播放器音量。'}</small>
    {onReveal && totalSteps > 0 && <label className="em-setting-check"><input type="checkbox" checked={autoNarrate} onChange={event => setAutoNarrate(event.target.checked)}/>展开步骤时自动讲解</label>}
    {!hosted && <><label className="em-setting-check"><input type="checkbox" checked={showAvatar} onChange={event => setShowAvatar(event.target.checked)}/>发声时显示数字人</label><label className="em-setting-check"><input type="checkbox" checked={showSubtitles} onChange={event => setShowSubtitles(event.target.checked)}/>显示字幕</label><button type="button" onClick={() => { setPinAvatar(!pinAvatar); closePanel(); }}>{pinAvatar ? '收起数字人预览' : '预览数字人'}</button></>}
    {busy && <button type="button" onClick={() => { pending.current = null; play(visibleNarration(paragraphs, safeStep)); }}>重新讲解本页</button>}
    {onReset && <button type="button" onClick={() => { stop(); onReset(); closePanel(); }}>恢复本页初始状态</button>}
  </div>;
  const actions: PageToolAction[] = [
    ...(onReveal && totalSteps > 0 ? [
      { id: 'reveal', label: '展开下一步', title: `展开下一步 · ${safeStep}/${totalSteps} 步`, icon: <SkipForward size={18}/>, disabled: safeStep === totalSteps, onInvoke: reveal },
      { id: 'undo', label: '收起一步', icon: <Undo2 size={18}/>, priority: 'secondary' as const, disabled: safeStep === 0, onInvoke: () => { pending.current = null; onReveal(safeStep - 1); } }
    ] : []),
    { id: 'narrate', label: status === 'loading' ? '准备中…' : status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '讲解本页',
      ariaLabel: status === 'playing' ? '暂停发声' : status === 'paused' ? '继续发声' : '数字人讲解本页',
      icon: status === 'playing' ? <Pause size={18}/> : <Play size={18}/>, disabled: status === 'loading', onInvoke: narrationAction },
    ...(busy ? [{ id: 'stop', label: '停止', ariaLabel: '停止发声', icon: <Square size={18}/>, onInvoke: stop }] : []),
    ...(tools ? [{ id: 'tools', label: toolsLabel, icon: <SlidersHorizontal size={18}/>, panelId: 'tools' }] : []),
    ...(!hosted ? [{ id: 'teacher', label: '教师发言', icon: <Keyboard size={18}/>, area: 'utility' as const, panelId: 'teacher' }] : []),
    { id: 'settings', label: '讲解设置', icon: <Settings size={18}/>, priority: 'secondary', panelId: 'settings' }
  ];
  const panels = [
    { id: 'settings', title: '讲解设置', content: settings },
    ...(!hosted ? [{ id: 'teacher', title: '教师发言', content: teacherForm }] : []),
    ...(tools ? [{ id: 'tools', title: toolsLabel, content: tools }] : [])
  ];
  const integrated = usePageTools({ pageKey, actions, panels, status: statusText ? { text: statusText, error: status === 'error' } : undefined });
  const overlays = <>
    {!hosted && showAvatar && (busy || pinAvatar) && !panel && <div className="em-narrator-avatar" aria-label="课程数字人">
      <Live2DAvatarPlayer state={status === 'playing' ? 'speaking' : status === 'loading' ? 'thinking' : 'idle'} subtitle="" readMouth={speech.current.meter.read} readViseme={speech.current.meter.readViseme}/>
    </div>}
    {!hosted && showSubtitles && busy && subtitle && <div className="em-narrator-subtitle" aria-live="off">{subtitle}</div>}
  </>;
  if (integrated) return overlays;
  return <section ref={root} className="em-narrator" aria-label="数字人逐页讲解">
    <div className="em-course-toolbar">{navigation}<div className="em-course-actions">
      {actions.map(action => <button type="button" key={action.id} disabled={action.disabled} aria-label={action.ariaLabel ?? action.label}
        aria-expanded={action.panelId ? panel === action.panelId : undefined} aria-controls={action.panelId ? panelId : undefined}
        onClick={() => action.panelId ? setPanel(old => old === action.panelId ? null : action.panelId as typeof panel) : action.onInvoke?.()}>{action.icon}{action.label}</button>)}
      {onReveal && totalSteps > 0 && <span className="em-step-position">{safeStep}/{totalSteps} 步</span>}
      {statusText && <span role="status" className={status === 'error' ? 'em-speech-error' : 'em-speech-status'}>{statusText}</span>}
    </div></div>
    {panel && <div className="em-narrator-popover" id={panelId} role="dialog" aria-label={panels.find(item => item.id === panel)?.title}>
      <div className="em-popover-head"><strong>{panels.find(item => item.id === panel)?.title}</strong><button type="button" aria-label="关闭面板" onClick={closePanel}>×</button></div>
      {panels.find(item => item.id === panel)?.content}
    </div>}
    {overlays}
  </section>;
}
