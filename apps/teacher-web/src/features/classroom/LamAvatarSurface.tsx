import type {
  LamRuntimeStatus,
  TeacherAvatarCommandInput
} from "@edu/contracts";
import {
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RotateCw,
  ServerOff
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";

type VoiceCommand = Extract<
  TeacherAvatarCommandInput,
  { inputMode: "voice" }
>;

export type LamConnectionState =
  | "offline"
  | "warming"
  | "loading"
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export interface LamAvatarController {
  sendVoice: (input: VoiceCommand) => Promise<boolean>;
  pushDialogueDelta: (turnId: string, delta: string) => boolean;
  finishDialogue: (turnId: string) => boolean;
  interrupt: () => boolean;
  isConnected: () => boolean;
}

export interface LamAvatarSurfaceProps {
  runtime: LamRuntimeStatus | undefined;
  concealed?: boolean;
  onConnectionStateChange: (state: LamConnectionState) => void;
  onHumanTranscript: (message: string) => void;
  onRetry: () => void;
}

interface LamHandler {
  on(eventName: string, callback: (...args: unknown[]) => void): LamHandler;
  sendAudio(pcm: Int16Array, transport?: "base64" | "binary"): void;
  interrupt(needSendInterrupt?: boolean): void;
  exit(): void;
  removeAllListeners(): void;
}

interface LamSocket {
  engine: WebSocket | undefined;
  on(eventName: string, callback: (...args: unknown[]) => void): LamSocket;
  send(data: string | Int8Array | Uint8Array): void;
  removeAllListeners(): void;
  stop(): void;
}

function setStateFromLam(value: unknown): LamConnectionState | undefined {
  if (value === "Idle") return "ready";
  if (value === "Listening") return "listening";
  if (value === "Thinking") return "thinking";
  if (value === "Responding") return "speaking";
  return undefined;
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function sendAvatarText(
  socket: LamSocket | undefined,
  turnId: string,
  text: string,
  endOfSpeech: boolean
): boolean {
  if (
    !socket?.engine ||
    socket.engine.readyState !== WebSocket.OPEN
  ) {
    return false;
  }
  socket.send(
    JSON.stringify({
      header: {
        name: "SendAvatarText",
        request_id: crypto.randomUUID()
      },
      payload: {
        stream_key: turnId,
        mode: "increment",
        text,
        end_of_speech: endOfSpeech,
        metadata: {
          turn_id: turnId,
          source: "edu-platform-orchestrator"
        }
      }
    })
  );
  return true;
}

function audioBufferToPcm16(audioBuffer: AudioBuffer): Int16Array {
  const targetSampleRate = 16_000;
  const outputLength = Math.max(
    1,
    Math.round(audioBuffer.duration * targetSampleRate)
  );
  const output = new Int16Array(outputLength);
  const channelData = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, channel) => audioBuffer.getChannelData(channel)
  );
  const sampleRatio = audioBuffer.sampleRate / targetSampleRate;

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.min(
      audioBuffer.length - 1,
      Math.floor(index * sampleRatio)
    );
    let sample = 0;
    for (const channel of channelData) {
      sample += channel[sourceIndex] ?? 0;
    }
    sample /= channelData.length;
    const clamped = Math.max(-1, Math.min(1, sample));
    output[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return output;
}

export const LamAvatarSurface = forwardRef<
  LamAvatarController,
  LamAvatarSurfaceProps
>(function LamAvatarSurface(
  {
    runtime,
    concealed = false,
    onConnectionStateChange,
    onHumanTranscript,
    onRetry
  },
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef<LamHandler | undefined>(undefined);
  const socketRef = useRef<LamSocket | undefined>(undefined);
  const connectedRef = useRef(false);
  const [connectionState, setConnectionState] =
    useState<LamConnectionState>("offline");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  function updateConnectionState(state: LamConnectionState) {
    connectedRef.current = [
      "ready",
      "listening",
      "thinking",
      "speaking"
    ].includes(state);
    if (connectedRef.current) setError("");
    setConnectionState(state);
    onConnectionStateChange(state);
  }

  useImperativeHandle(
    forwardedRef,
    () => ({
      async sendVoice(input: VoiceCommand) {
        if (!connectedRef.current || !handlerRef.current) return false;
        const AudioContextConstructor =
          window.AudioContext ??
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error("当前浏览器无法解码录音");
        }
        const audioContext = new AudioContextConstructor();
        try {
          const decoded = await audioContext.decodeAudioData(
            decodeBase64(input.audioBase64)
          );
          const pcm = audioBufferToPcm16(decoded);
          const chunkSize = 3_200;
          for (let offset = 0; offset < pcm.length; offset += chunkSize) {
            handlerRef.current?.sendAudio(
              pcm.slice(offset, Math.min(pcm.length, offset + chunkSize)),
              "base64"
            );
            if (offset > 0 && offset % (chunkSize * 10) === 0) {
              await new Promise<void>((resolve) =>
                window.setTimeout(resolve, 0)
              );
            }
          }
          handlerRef.current?.sendAudio(new Int16Array(8_000), "base64");
          updateConnectionState("listening");
          return true;
        } finally {
          await audioContext.close();
        }
      },
      pushDialogueDelta(turnId: string, delta: string) {
        if (
          !connectedRef.current ||
          !delta
        ) {
          return false;
        }
        return sendAvatarText(
          socketRef.current,
          turnId,
          delta,
          false
        );
      },
      finishDialogue(turnId: string) {
        if (!connectedRef.current) return false;
        return sendAvatarText(socketRef.current, turnId, "", true);
      },
      interrupt() {
        if (!connectedRef.current || !handlerRef.current) return false;
        handlerRef.current.interrupt();
        updateConnectionState("ready");
        return true;
      },
      isConnected() {
        return connectedRef.current;
      }
    }),
    []
  );

  useEffect(() => {
    if (!runtime) {
      updateConnectionState("loading");
      return;
    }
    if (runtime.status !== "ready") {
      updateConnectionState(
        runtime.status === "warming"
          ? "warming"
          : runtime.status === "offline"
            ? "offline"
            : "error"
      );
      return;
    }
    if (
      !runtime.assetUrl ||
      !runtime.websocketUrl ||
      !containerRef.current
    ) {
      updateConnectionState("error");
      setError("LAM 返回的资源或会话地址不完整");
      return;
    }
    const assetUrl = runtime.assetUrl;
    const websocketUrl = runtime.websocketUrl;

    let active = true;
    let handler: LamHandler | undefined;
    let socket: LamSocket | undefined;
    let handlerExited = false;
    let modelLoaded = false;
    let sessionInitialized = false;

    setError("");
    setDownloadProgress(0);
    setLoadProgress(0);
    updateConnectionState("loading");

    const initializeTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ AvatarHandler }, { WS }] = await Promise.all([
            import("@openavatarchat-webui/handlers/avatarHandler"),
            import("@openavatarchat-webui/helpers/ws")
          ]);
          if (!active || !containerRef.current) return;

          socket = new WS(
            `${websocketUrl}/${crypto.randomUUID()}`
          ) as LamSocket;
          socketRef.current = socket;
          socket.on("WS_OPEN", () => {
            if (active) updateConnectionState("connecting");
          });
          socket.on("WS_ERROR", () => {
            if (!active) return;
            setError("LAM WebSocket 连接失败");
            updateConnectionState("error");
          });
          socket.on("WS_CLOSE", () => {
            if (!active) return;
            handlerExited = true;
            connectedRef.current = false;
            setError("LAM WebSocket 已断开");
            updateConnectionState("error");
          });

          handler = new AvatarHandler({
            container: containerRef.current,
            assetsPath: assetUrl,
            ws: socket,
            rendererType: "lam",
            downloadProgress: (percent: number) => {
              if (active) setDownloadProgress(Math.round(percent * 100));
            },
            loadProgress: (percent: number) => {
              if (!active) return;
              setLoadProgress(Math.round(percent * 100));
              if (percent >= 1) {
                modelLoaded = true;
                if (sessionInitialized) updateConnectionState("ready");
              }
            }
          }) as LamHandler;
          handlerRef.current = handler;

          handler.on("StateChanged", (value: unknown) => {
            if (!active) return;
            const nextState = setStateFromLam(value);
            if (!nextState) return;
            if (nextState === "ready") {
              sessionInitialized = true;
              if (modelLoaded) updateConnectionState("ready");
              return;
            }
            updateConnectionState(nextState);
          });
          handler.on("MessageReceived", (value: unknown) => {
            if (
              !active ||
              typeof value !== "object" ||
              value === null ||
              !("role" in value) ||
              !("payload" in value)
            ) {
              return;
            }
            const message = value as {
              role: unknown;
              payload: {
                text?: unknown;
                mode?: unknown;
                end_of_speech?: unknown;
              };
            };
            if (typeof message.payload.text !== "string") {
              return;
            }
            if (message.role === "human") {
              if (
                message.payload.end_of_speech === true &&
                message.payload.text.trim()
              ) {
                onHumanTranscript(message.payload.text.trim());
              }
              return;
            }
            // AVATAR_TEXT is echoed for diagnostics, while the subtitle uses
            // the platform SSE as its authoritative low-latency source.
          });
          handler.on("ErrorReceived", (value: unknown) => {
            if (!active) return;
            setError(
              typeof value === "string" ? value : "LAM 会话返回错误"
            );
            updateConnectionState("error");
          });
        } catch (reason) {
          if (!active) return;
          setError((reason as Error).message);
          updateConnectionState("error");
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(initializeTimer);
      connectedRef.current = false;
      handlerRef.current = undefined;
      socketRef.current = undefined;
      if (!handlerExited) {
        handler?.exit();
        handlerExited = true;
      }
      socket?.removeAllListeners();
      socket?.stop();
    };
  }, [
    connectionAttempt,
    runtime?.assetUrl,
    runtime?.status,
    runtime?.websocketUrl
  ]);

  const loading =
    connectionState === "loading" || connectionState === "connecting";
  const serviceUnavailable =
    !runtime ||
    runtime.status === "offline" ||
    runtime.status === "warming" ||
    runtime.status === "incompatible" ||
    runtime.status === "error";
  const connectionUnavailable =
    connectionState === "offline" || connectionState === "error";

  return (
    <div
      className={[
        "lam-avatar-surface",
        concealed ? "lam-avatar-surface--concealed" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={concealed || undefined}
      data-lam-connection={connectionState}
      data-lam-renderer="openavatarchat"
    >
      <div
        ref={containerRef}
        className="lam-model-host"
        aria-label="OpenAvatarChat LAM 数字人 Barbara"
      />

      <div className="lam-surface-badge">
        <strong>LAM</strong>
        <span>Barbara · OpenAvatarChat</span>
      </div>

      {(loading || serviceUnavailable || connectionUnavailable || error) && (
        <div className="lam-surface-state">
          {loading ? (
            <LoaderCircle className="spin" size={25} />
          ) : serviceUnavailable ? (
            <ServerOff size={25} />
          ) : (
            <CircleAlert size={25} />
          )}
          <strong>
            {loading
              ? runtime
                ? "正在装载 Barbara"
                : "正在检查 LAM"
              : runtime?.status === "warming"
              ? "LAM 正在预热"
              : serviceUnavailable
                ? "LAM 服务未连接"
                : "LAM 会话异常"}
          </strong>
          <p>{error || runtime?.message || "正在检查 OpenAvatarChat 服务"}</p>
          {loading && (
            <span>
              资源 {downloadProgress}% · 模型 {loadProgress}%
            </span>
          )}
          {(serviceUnavailable || connectionUnavailable || error) && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setConnectionAttempt((attempt) => attempt + 1);
                onRetry();
              }}
            >
              <RotateCw size={14} /> 重新检查
            </button>
          )}
        </div>
      )}

      {runtime?.uiUrl && (
        <a
          className="lam-native-console-link"
          href={runtime.uiUrl}
          target="_blank"
          rel="noreferrer"
        >
          原生控制台 <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
});
