import type { StudyAsrInput } from "@edu/contracts";
import { ArrowUp, Keyboard, LoaderCircle, Mic, Send, X } from "lucide-react";
import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState
} from "react";

interface StudyComposerProps {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendVoice: (input: StudyAsrInput) => Promise<void>;
  onRecordingChange?: (
    recording: boolean,
    outcome?: "submitted" | "cancelled"
  ) => void;
  onUserGesture?: () => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取录音"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("录音格式不受支持"));
        return;
      }
      resolve(reader.result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `00:${String(seconds).padStart(2, "0")}`;
}

export function StudyComposer({
  disabled = false,
  onSendText,
  onSendVoice,
  onRecordingChange,
  onUserGesture
}: StudyComposerProps) {
  const [mode, setMode] = useState<"voice" | "text">("text");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const startYRef = useRef(0);
  const cancelRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  function stopTimer() {
    if (timerRef.current !== undefined) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }

  useEffect(() => () => {
    cancelRef.current = true;
    stopTimer();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseStream();
  }, []);

  async function startRecording(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || sending || recording) return;
    event.preventDefault();
    onUserGesture?.();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持手动录音，请使用文字输入");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      startYRef.current = event.clientY;
      cancelRef.current = false;
      setCancelPending(false);

      recorder.ondataavailable = (dataEvent) => {
        if (dataEvent.data.size > 0) chunksRef.current.push(dataEvent.data);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current;
        const wasCancelled = cancelRef.current;
        const chunks = [...chunksRef.current];
        const mimeType = recorder.mimeType || "audio/webm";
        stopTimer();
        releaseStream();
        recorderRef.current = undefined;
        setRecording(false);
        setCancelPending(false);
        setElapsedMs(0);
        if (wasCancelled) {
          onRecordingChange?.(false, "cancelled");
          setError("本次录音已取消");
          return;
        }
        onRecordingChange?.(false, "submitted");
        void (async () => {
          setSending(true);
          try {
            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size === 0) throw new Error("没有采集到有效声音");
            await onSendVoice({
              audioBase64: await blobToBase64(blob),
              mimeType,
              durationMs: Math.min(60_000, Math.max(100, durationMs))
            });
          } catch (reason) {
            setError((reason as Error).message);
          } finally {
            setSending(false);
          }
        })();
      };

      recorder.start(180);
      event.currentTarget.setPointerCapture(event.pointerId);
      setRecording(true);
      onRecordingChange?.(true);
      timerRef.current = window.setInterval(() => {
        const duration = Date.now() - startTimeRef.current;
        setElapsedMs(duration);
        if (duration >= 60_000 && recorder.state === "recording") recorder.stop();
      }, 100);
    } catch (reason) {
      releaseStream();
      setError(
        (reason as DOMException).name === "NotAllowedError"
          ? "未获得麦克风权限，请允许访问或切换文字输入"
          : "无法启动录音，请检查麦克风"
      );
    }
  }

  function finishRecording(cancelled = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    cancelRef.current = cancelled || cancelRef.current;
    recorder.stop();
  }

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || disabled || sending) return;
    onUserGesture?.();
    setSending(true);
    setError("");
    try {
      await onSendText(content);
      setText("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="study-composer">
      {mode === "text" ? (
        <form className="study-composer__text" onSubmit={submitText}>
          <button type="button" aria-label="切换语音输入" onClick={() => setMode("voice")} disabled={disabled || sending}>
            <Mic size={20} /><small>语音</small>
          </button>
          <label>
            <span className="sr-only">向澜舟提问</span>
            <textarea
              value={text}
              rows={2}
              maxLength={2_000}
              placeholder="针对当前页提问，或输入“带我到第二讲”"
              disabled={disabled || sending}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <button className="study-composer__send" type="submit" aria-label="发送问题" disabled={!text.trim() || disabled || sending}>
            {sending ? <LoaderCircle className="spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      ) : (
        <div className="study-composer__voice">
          <button type="button" aria-label="切换文字输入" onClick={() => setMode("text")} disabled={disabled || sending || recording}>
            <Keyboard size={20} /><small>文字</small>
          </button>
          <button
            className={`study-hold-to-talk${recording ? " study-hold-to-talk--recording" : ""}${cancelPending ? " study-hold-to-talk--cancel" : ""}`}
            type="button"
            disabled={disabled || sending}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => void startRecording(event)}
            onPointerMove={(event) => {
              if (!recording) return;
              const cancel = startYRef.current - event.clientY > 72;
              cancelRef.current = cancel;
              setCancelPending(cancel);
            }}
            onPointerUp={() => finishRecording()}
            onPointerCancel={() => finishRecording(true)}
          >
            {sending ? <LoaderCircle className="spin" size={22} /> : cancelPending ? <X size={22} /> : <Mic size={22} />}
            <strong>{sending ? "正在识别" : cancelPending ? "松开取消" : recording ? formatDuration(elapsedMs) : "按住说话"}</strong>
          </button>
          <p>{recording ? <><ArrowUp size={13} /> 松开发送 · 上滑取消</> : "仅在按住期间收音，最长60秒"}</p>
        </div>
      )}
      {error && <p className="study-composer__error">{error}</p>}
    </div>
  );
}
