import { useEffect, useRef, useState, type FormEvent } from "react";
import { Keyboard, LoaderCircle, Send } from "lucide-react";
import { HandsFreeVoiceControl } from "./HandsFreeVoiceControl";

interface VoiceCommandComposerProps {
  concealed?: boolean;
  compact?: boolean;
  onExpand?: () => void;
  disabled?: boolean;
  continuousAsrConfigured?: boolean;
  assistantBusy?: boolean;
  onCommand: (text: string, source: "text" | "voice_asr") => Promise<void>;
}

export function VoiceCommandComposer({
  concealed = false, compact = false, onExpand, disabled = false, continuousAsrConfigured = false, assistantBusy = false, onCommand
}: VoiceCommandComposerProps) {
  const [mode, setMode] = useState<"manual" | "handsfree" | "text">("manual");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const active = useRef(false);
  const blocked = useRef(false);
  blocked.current = disabled || assistantBusy;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function submit(command: string, source: "text" | "voice_asr") {
    command = command.trim();
    if (!command || blocked.current || pending.current || !active.current) return;
    if (command.length > 500) throw new Error("指令不能超过500字，请缩短后重试。");
    pending.current = true;
    setSending(true);
    setError("");
    try {
      await onCommand(command, source);
    } finally {
      pending.current = false;
      if (active.current) setSending(false);
    }
  }

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || blocked.current || pending.current) return;
    try {
      await submit(text, "text");
      if (active.current) setText("");
    } catch (reason) {
      if (active.current) setError((reason as Error).message);
    }
  }

  return (
    <div className={`teacher-command-composer ${compact || concealed ? "teacher-command-composer--compact" : ""} ${concealed ? "teacher-command-composer--concealed" : ""}`}>
      <div className="teacher-command-composer__header"><strong>向助教发出指令</strong><span>选择输入方式</span></div>
      <div className="command-input-modes" aria-label="选择输入方式">
        {([["handsfree", "检测输入"], ["manual", "按键输入"], ["text", "文字输入"]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} disabled={sending}
            onClick={() => { setMode(value); setError(""); }}>{label}</button>
        ))}
      </div>
      {mode !== "text" ? (
        <HandsFreeVoiceControl key={mode} mode={mode} disabled={disabled}
          configured={continuousAsrConfigured} assistantBusy={assistantBusy}
          onCommand={command => submit(command, "voice_asr")} />
      ) : (
        <form className="text-command-row" onSubmit={submitText}>
          <label><span className="sr-only">文字指令</span>
            <input aria-label="文字指令" value={text} maxLength={500} placeholder="输入内容，按 Enter 发送"
              disabled={disabled || sending || assistantBusy} onChange={event => setText(event.target.value)} autoFocus />
          </label>
          <button className="send-command-button" type="submit" aria-label="发送文字指令"
            disabled={!text.trim() || disabled || sending || assistantBusy}>
            {sending ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
          </button>
        </form>
      )}
      {concealed && mode === "text" && <button type="button" className="compact-text-expand" aria-label="展开文字输入" onClick={onExpand}><Keyboard size={20} /></button>}
      {error && <p className="command-composer-error" role="alert">{error}</p>}
    </div>
  );
}
