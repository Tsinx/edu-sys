import { useEffect, useRef, useState, type FormEvent } from "react";
import { Keyboard, LoaderCircle, Send, Square, Volume2 } from "lucide-react";
import { usePageTools, usePageToolsScope } from './PageTools';
import { HandsFreeVoiceControl } from "./HandsFreeVoiceControl";
import type { RealtimeCaptureSink } from "./realtime-voice";
import { NarrationSpeech, type NarrationStatus } from '../economic-mathematics/NarrationSpeech';
import { useNarrationVolume } from '../economic-mathematics/narration-settings';
import { NARRATION_PRESENTATION_EVENT } from '../economic-mathematics/narration-events';

interface VoiceCommandComposerProps {
  locale?: "zh-CN" | "en";
  courseId?: string;
  concealed?: boolean;
  compact?: boolean;
  collapsible?: boolean;
  onExpand?: () => void;
  disabled?: boolean;
  assistantBusy?: boolean;
  onCommand: (text: string) => Promise<void>;
  realtime?: RealtimeCaptureSink;
  voiceUnavailableReason?: string;
  request?: { id: number; mode: 'speech' | 'text' };
}

export function VoiceCommandComposer({
  locale, courseId, concealed = false, compact = false, collapsible = false, onExpand, disabled = false, assistantBusy = false, onCommand, realtime, voiceUnavailableReason, request
}: VoiceCommandComposerProps) {
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const [mode, setMode] = useState<"manual" | "handsfree" | "text">(locale === "en" ? "text" : "manual");
  const [text, setText] = useState("");
  const [directRead, setDirectRead] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<NarrationStatus>('idle');
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [volume, setVolume] = useNarrationVolume();
  const speech = useRef<NarrationSpeech | null>(null);
  const hasSpoken = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [inputsExpanded, setInputsExpanded] = useState(false);
  const textInput = useRef<HTMLInputElement>(null), toolsHost = usePageToolsScope();
  const inputsCollapsed = collapsible && !inputsExpanded && !concealed;
  const pending = useRef(false);
  const active = useRef(false);
  const blocked = useRef(false);
  blocked.current = disabled || assistantBusy;
  if (!speech.current) speech.current = new NarrationSpeech((status, message) => {
    if (active.current) { setSpeechStatus(status); setSpeechMessage(message ?? ''); }
  }, courseId);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    speech.current!.setVolume(volume / 100);
  }, [volume]);
  useEffect(() => {
    if (hasSpoken.current) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status: speechStatus, subtitle: speechText } }));
  }, [speechStatus, speechText]);
  useEffect(() => {
    const interrupt = (event: Event) => { if ((event as CustomEvent).detail !== speech.current) speech.current!.stop(); };
    const leave = () => speech.current!.stop();
    window.addEventListener('edu:exclusive-audio', interrupt); window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('edu:exclusive-audio', interrupt); window.removeEventListener('pagehide', leave); speech.current!.dispose();
      if (hasSpoken.current) window.dispatchEvent(new CustomEvent(NARRATION_PRESENTATION_EVENT, { detail: { owner: speech.current, meter: speech.current!.meter, status: 'idle', subtitle: '' } }));
    };
  }, []);
  useEffect(() => { if (disabled || mode !== 'text' || !directRead) speech.current!.stop(); }, [disabled, mode, directRead]);
  useEffect(() => {
    if (!request) return;
    setMode('text'); setDirectRead(request.mode === 'speech'); setInputsExpanded(true);
  }, [request?.id, request?.mode]);
  useEffect(() => {
    if (request && mode === 'text' && !concealed) textInput.current?.focus();
  }, [request?.id, mode, directRead, concealed]);
  usePageTools(toolsHost && ['loading', 'playing', 'paused'].includes(speechStatus) ? {
    pageKey: toolsHost.pageKey,
    actions: [{ id: 'stop-teacher-speech', label: t('停止朗读', 'Stop reading'), icon: <Square size={18}/>, area: 'utility', onInvoke: () => speech.current!.stop() }],
    status: { text: speechStatus === 'loading' ? t('准备语音…', 'Preparing speech…') : speechStatus === 'paused' ? t('发言已暂停', 'Message paused') : t('教师发言中', 'Reading teacher message') }
  } : null);

  async function submit(command: string) {
    command = command.trim();
    if (!command || blocked.current || pending.current || !active.current) return;
    if (command.length > 500) throw new Error(t("指令不能超过500字，请缩短后重试。", "Instructions cannot exceed 500 characters. Please shorten them."));
    pending.current = true;
    setSending(true);
    setError("");
    try {
      await onCommand(command);
    } finally {
      pending.current = false;
      if (active.current) setSending(false);
    }
  }

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (directRead) {
      const spoken = text.trim(); if (!spoken || disabled) return;
      hasSpoken.current = true; setText(''); setError('');
      void speech.current!.play([spoken], 'course', 1, setSpeechText, t('教师发言已朗读完毕。', 'Your message has been read aloud.'));
      return;
    }
    if (!text.trim() || blocked.current || pending.current) return;
    try {
      await submit(text);
      if (active.current) setText("");
    } catch (reason) {
      if (active.current) setError((reason as Error).message);
    }
  }

  return (
    <div className={`teacher-command-composer ${compact || concealed ? "teacher-command-composer--compact" : ""} ${concealed ? "teacher-command-composer--concealed" : ""} ${inputsCollapsed ? "teacher-command-composer--inputs-collapsed" : ""}`}>
      {collapsible && !concealed && <button type="button" className="command-input-toggle"
        aria-label={inputsExpanded ? t("隐藏输入面板", "Hide input panel") : t("显示输入面板", "Show input panel")} aria-expanded={inputsExpanded}
        onClick={() => setInputsExpanded(value => !value)}>
        <Keyboard size={15} />{inputsExpanded ? t("隐藏输入", "Hide input") : t("显示输入", "Show input")}
      </button>}
      <div className="teacher-command-composer__header"><strong>{mode === 'text' && directRead ? t('教师发言', 'Teacher message') : t("向助教发出指令", "Ask Math Guide")}</strong><span>{mode === 'text' && directRead ? t('朗读给全班听', 'Read to the class') : t("选择输入方式", "Choose input")}</span></div>
      {mode !== 'text' && !concealed && !inputsCollapsed && <p className="classroom-voice-status">{t("实时语音", "Realtime speech")}{!realtime ? t(" · 暂不可用", " \u00b7 Unavailable") : ""}</p>}
      <div className="command-input-modes" aria-label={t("选择输入方式", "Choose input")}>
        {(locale === "en" ? [["manual", "Record speech"], ["text", "Text"]] as const : [["handsfree", t("检测输入", "Hands-free")], ["manual", t("按键输入", "Record speech")], ["text", t("文字输入", "Text")]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} disabled={sending}
            onClick={() => { setMode(value); setError(""); }}>{label}</button>
        ))}
      </div>
      {mode !== "text" ? (
        <HandsFreeVoiceControl key={mode} mode={mode} locale={locale} disabled={disabled} realtime={realtime}
          unavailableReason={voiceUnavailableReason} assistantBusy={assistantBusy} />
      ) : (
        <><div className="teacher-text-purpose" role="group" aria-label={t('文字用途', 'Text purpose')}>
          <button type="button" aria-pressed={!directRead} disabled={sending} onClick={() => setDirectRead(false)}>{t('问助教', 'Ask guide')}</button>
          <button type="button" aria-pressed={directRead} disabled={sending} onClick={() => setDirectRead(true)}>{t('教师发言', 'Teacher message')}</button>
        </div>
        <form className="text-command-row" onSubmit={submitText}>
          <label><span className="sr-only">{directRead ? t('教师发言文字', 'Teacher message text') : t("文字指令", "Text instruction")}</span>
            <input ref={textInput} aria-label={directRead ? t('教师发言文字', 'Teacher message text') : t("文字指令", "Text instruction")} value={text} maxLength={500} placeholder={directRead ? t('输入要说的话，按 Enter 朗读', 'Type what you want to say, then press Enter') : t("输入问题，按 Enter 问助教", "Type your question, then press Enter")}
              disabled={disabled || (!directRead && (sending || assistantBusy))} onChange={event => setText(event.target.value)} autoFocus />
          </label>
          <button className="send-command-button" type="submit" aria-label={directRead ? t('朗读我的文字', 'Read my text aloud') : t("发送文字指令", "Send instruction")}
            disabled={!text.trim() || disabled || (!directRead && (sending || assistantBusy))}>
            {sending ? <LoaderCircle className="spin" size={19} /> : directRead ? <Volume2 size={19}/> : <Send size={19} />}
          </button>
        </form>
        {directRead && <>{!toolsHost && <div className="teacher-direct-speech-tools"><details><summary>{t('语音设置', 'Speech settings')} · {volume}%</summary><label>{t('音量', 'Volume')}<input aria-label={t('教师发言音量', 'Teacher message volume')} type="range" min="0" max="500" step="10" value={volume} onChange={event => setVolume(Number(event.target.value))}/><output>{volume}%</output></label></details>{['loading', 'playing', 'paused'].includes(speechStatus) && <button type="button" onClick={() => speech.current!.stop()}>{t('停止朗读', 'Stop reading')}</button>}</div>}<p className="teacher-direct-speech-status" role="status">{speechStatus === 'loading' ? t('正在准备语音…', 'Preparing speech…') : speechStatus === 'playing' ? t('正在朗读；可以输入下一句话。', 'Reading aloud; you may type the next message.') : speechMessage || t('按原文朗读 · 最多500字', 'Reads your exact text · Up to 500 characters')}</p></>}</>
      )}
      {concealed && mode === "text" && <button type="button" className="compact-text-expand" aria-label={t("展开文字输入", "Show text input")} onClick={() => { setInputsExpanded(true); onExpand?.(); }}><Keyboard size={20} /></button>}
      {error && <p className="command-composer-error" role="alert">{error}</p>}
    </div>
  );
}
