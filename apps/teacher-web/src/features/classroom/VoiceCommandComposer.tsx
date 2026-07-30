import type { TeacherAvatarCommandInput } from "@edu/contracts";
import {
  ArrowUp,
  Keyboard,
  LoaderCircle,
  Mic,
  Send,
  X
} from "lucide-react";
import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState
} from "react";

type VoiceCommandInput = Extract<
  TeacherAvatarCommandInput,
  { inputMode: "voice" }
>;

interface VoiceCommandComposerProps {
  disabled?: boolean;
  voiceDisabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendVoice: (input: VoiceCommandInput) => Promise<void>;
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

export function VoiceCommandComposer({
  disabled = false,
  voiceDisabled = false,
  onSendText,
  onSendVoice
}: VoiceCommandComposerProps) {
  const [mode, setMode] = useState<"voice" | "text">("voice");
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
    if (timerRef.current !== undefined) {
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }

  useEffect(
    () => () => {
      cancelRef.current = true;
      stopTimer();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      releaseStream();
    },
    []
  );

  async function startRecording(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || voiceDisabled || sending || recording) return;
    event.preventDefault();
    const button = event.currentTarget;
    const pointerId = event.pointerId;
    startYRef.current = event.clientY;
    cancelRef.current = false;
    setCancelPending(false);
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持手动录音，请切换为文字输入");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (dataEvent) => {
        if (dataEvent.data.size > 0) {
          chunksRef.current.push(dataEvent.data);
        }
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
          setError("本次录音已取消");
          return;
        }

        void (async () => {
          setSending(true);
          try {
            const audioBlob = new Blob(chunks, { type: mimeType });
            if (audioBlob.size === 0) {
              throw new Error("没有采集到有效声音");
            }
            const audioBase64 = await blobToBase64(audioBlob);
            await onSendVoice({
              inputMode: "voice",
              audioBase64,
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
      button.setPointerCapture(pointerId);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const duration = Date.now() - startTimeRef.current;
        setElapsedMs(duration);
        if (duration >= 60_000 && recorder.state === "recording") {
          recorder.stop();
        }
      }, 100);
    } catch (reason) {
      releaseStream();
      setError(
        (reason as DOMException).name === "NotAllowedError"
          ? "未获得麦克风权限，请允许访问或切换为文字输入"
          : "无法启动录音，请检查麦克风"
      );
    }
  }

  function updateRecordingGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!recording) return;
    const shouldCancel = startYRef.current - event.clientY > 72;
    cancelRef.current = shouldCancel;
    setCancelPending(shouldCancel);
  }

  function finishRecording(cancelled = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    cancelRef.current = cancelled || cancelRef.current;
    recorder.stop();
  }

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = text.trim();
    if (!command || disabled || sending) return;
    setSending(true);
    setError("");
    try {
      await onSendText(command);
      setText("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="teacher-command-composer">
      <div className="teacher-command-composer__header">
        <strong>向助手发出指令</strong>
        <span><Mic size={13} /> {mode === "voice" ? "语音" : "文字"}</span>
      </div>

      {mode === "voice" ? (
        <>
          <div className="voice-command-row">
            <button
              className="command-mode-switch"
              type="button"
              aria-label="切换文字输入"
              title="切换文字输入"
              disabled={disabled || sending || recording}
              onClick={() => {
                setMode("text");
                setError("");
              }}
            >
              <Keyboard size={20} />
              <small>文字</small>
            </button>
            <button
              className={`hold-to-talk ${recording ? "hold-to-talk--recording" : ""} ${
                cancelPending ? "hold-to-talk--cancel" : ""
              }`}
              type="button"
              aria-label="按住说话"
              disabled={disabled || voiceDisabled || sending}
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={(event) => void startRecording(event)}
              onPointerMove={updateRecordingGesture}
              onPointerUp={() => finishRecording()}
              onPointerCancel={() => finishRecording(true)}
            >
              {sending ? (
                <LoaderCircle className="spin" size={23} />
              ) : cancelPending ? (
                <X size={23} />
              ) : recording ? (
                <span className="voice-wave" aria-hidden="true">
                  <i /><i /><i /><i /><i />
                </span>
              ) : (
                <Mic size={23} />
              )}
              <strong>
                {sending
                  ? "正在发送"
                  : cancelPending
                    ? "松开取消"
                    : recording
                      ? formatDuration(elapsedMs)
                      : "按住说话"}
              </strong>
            </button>
          </div>
          <p className={cancelPending ? "voice-gesture-hint voice-gesture-hint--cancel" : "voice-gesture-hint"}>
            {cancelPending ? (
              <><X size={13} /> 松开取消本次录音</>
            ) : recording ? (
              <><ArrowUp size={13} /> 松开发送 · 上滑取消</>
            ) : (
              "麦克风仅在按住期间收音"
            )}
          </p>
        </>
      ) : (
        <form className="text-command-row" onSubmit={submitText}>
          <button
            className="command-mode-switch"
            type="button"
            aria-label="切换语音输入"
            title="切换语音输入"
            disabled={disabled || voiceDisabled || sending}
            onClick={() => {
              setMode("voice");
              setError("");
            }}
          >
            <Mic size={20} />
            <small>语音</small>
          </button>
          <label>
            <span className="sr-only">文字指令</span>
            <input
              aria-label="文字指令"
              value={text}
              maxLength={500}
              placeholder="输入内容，按 Enter 发送"
              disabled={disabled || sending}
              onChange={(event) => setText(event.target.value)}
              autoFocus
            />
          </label>
          <button
            className="send-command-button"
            type="submit"
            aria-label="发送文字指令"
            disabled={!text.trim() || disabled || sending}
          >
            {sending ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
          </button>
        </form>
      )}

      {error && <p className="command-composer-error" role="alert">{error}</p>}
    </div>
  );
}
