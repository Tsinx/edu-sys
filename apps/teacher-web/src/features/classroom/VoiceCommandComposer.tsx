import { useEffect, useRef, useState, type FormEvent } from "react";
import { Keyboard, LoaderCircle, Send } from "lucide-react";
import { HandsFreeVoiceControl } from "./HandsFreeVoiceControl";
import type { RealtimeCaptureSink } from "./realtime-voice";

interface VoiceCommandComposerProps {
  locale?: "zh-CN" | "en";
  concealed?: boolean;
  compact?: boolean;
  collapsible?: boolean;
  onExpand?: () => void;
  disabled?: boolean;
  assistantBusy?: boolean;
  onCommand: (text: string) => Promise<void>;
  realtime?: RealtimeCaptureSink;
  voiceUnavailableReason?: string;
}

export function VoiceCommandComposer({
  locale, concealed = false, compact = false, collapsible = false, onExpand, disabled = false, assistantBusy = false, onCommand, realtime, voiceUnavailableReason
}: VoiceCommandComposerProps) {
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const [mode, setMode] = useState<"manual" | "handsfree" | "text">(locale === "en" ? "text" : "manual");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [inputsExpanded, setInputsExpanded] = useState(false);
  const inputsCollapsed = collapsible && !inputsExpanded && !concealed;
  const pending = useRef(false);
  const active = useRef(false);
  const blocked = useRef(false);
  blocked.current = disabled || assistantBusy;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

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
      <div className="teacher-command-composer__header"><strong>{t("向助教发出指令", "Ask Math Guide")}</strong><span>{t("选择输入方式", "Choose input")}</span></div>
      {!concealed && !inputsCollapsed && <p className="classroom-voice-status">{t("实时语音", "Realtime speech")}{!realtime ? t(" · 暂不可用", " \u00b7 Unavailable") : ""}</p>}
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
        <form className="text-command-row" onSubmit={submitText}>
          <label><span className="sr-only">{t("文字指令", "Text instruction")}</span>
            <input aria-label={t("文字指令", "Text instruction")} value={text} maxLength={500} placeholder={t("输入内容，按 Enter 发送", "Type your question, then press Enter")}
              disabled={disabled || sending || assistantBusy} onChange={event => setText(event.target.value)} autoFocus />
          </label>
          <button className="send-command-button" type="submit" aria-label={t("发送文字指令", "Send instruction")}
            disabled={!text.trim() || disabled || sending || assistantBusy}>
            {sending ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
          </button>
        </form>
      )}
      {concealed && mode === "text" && <button type="button" className="compact-text-expand" aria-label={t("展开文字输入", "Show text input")} onClick={() => { setInputsExpanded(true); onExpand?.(); }}><Keyboard size={20} /></button>}
      {error && <p className="command-composer-error" role="alert">{error}</p>}
    </div>
  );
}
