import { randomUUID } from "node:crypto";
import WebSocket, { type RawData } from "ws";

export interface StudyAsrRequest {
  audioBase64: string;
  mimeType: string;
  context: string;
  signal?: AbortSignal;
}

export interface StudyTtsChunk {
  audioBase64: string;
  sampleRate: 24_000;
  channels: 1;
  format: "pcm_s16le";
}

export interface StudySpeechProvider {
  readonly name: string;
  readonly asrConfigured: boolean;
  readonly ttsConfigured: boolean;
  transcribe(request: StudyAsrRequest): Promise<string>;
  synthesize(
    text: string,
    signal?: AbortSignal
  ): AsyncIterable<StudyTtsChunk>;
}

export class StudySpeechProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudySpeechProviderError";
  }
}

/** A valid ASR response with no speech is not a transport/provider outage. */
export class StudyAsrNoSpeechError extends StudySpeechProviderError {
  constructor() {
    super("没有识别到可用语音，请继续说话。");
    this.name = "StudyAsrNoSpeechError";
  }
}

interface DashScopeStudySpeechProviderOptions {
  apiKey?: string;
  apiUrl?: string;
  asrModel?: string;
  ttsModel?: string;
  ttsVoiceId?: string;
  ttsWebSocketUrl?: string;
  fetchImplementation?: typeof fetch;
}

interface DashScopeAsrResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

interface DashScopeTtsEvent {
  type?: string;
  delta?: string;
  error?: { code?: string; message?: string };
}

class AsyncMessageQueue<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<{
    resolve: (value: T | undefined) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private ended = false;
  private failure: unknown;

  push(value: T) {
    if (this.values.length >= 256) { this.fail(new StudySpeechProviderError("语音接收缓冲已满，请重试。")); return; }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.resolve(value);
      return;
    }
    this.values.push(value);
  }

  end() {
    this.ended = true;
    for (const waiter of this.waiters.splice(0)) waiter.resolve(undefined);
  }

  fail(reason: unknown) {
    this.failure = reason;
    this.ended = true;
    for (const waiter of this.waiters.splice(0)) waiter.reject(reason);
  }

  async next(): Promise<T | undefined> {
    if (this.failure) throw this.failure;
    const value = this.values.shift();
    if (value !== undefined) return value;
    if (this.ended) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }
}

function endpointFromBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/u, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function abortError(): DOMException {
  return new DOMException("课下语音请求已中断", "AbortError");
}

export class DashScopeStudySpeechProvider implements StudySpeechProvider {
  readonly name = "dashscope-study-speech";
  private readonly apiKey?: string;
  private readonly apiUrl: string;
  private readonly asrModel: string;
  private readonly ttsModel: string;
  private readonly ttsVoiceId?: string;
  private readonly ttsWebSocketUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: DashScopeStudySpeechProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.DASHSCOPE_API_KEY;
    this.apiUrl =
      options.apiUrl ??
      process.env.EDU_SELFSTUDY_SPEECH_API_URL ??
      process.env.EDU_ASSISTANT_API_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.asrModel =
      options.asrModel ??
      process.env.EDU_SELFSTUDY_ASR_MODEL ??
      "qwen3-asr-flash-2026-02-10";
    this.ttsModel =
      options.ttsModel ??
      process.env.EDU_SELFSTUDY_TTS_MODEL ??
      "qwen3-tts-vd-realtime-2026-01-15";
    this.ttsVoiceId =
      options.ttsVoiceId ?? process.env.EDU_SELFSTUDY_TTS_VOICE_ID;
    this.ttsWebSocketUrl =
      options.ttsWebSocketUrl ??
      process.env.EDU_SELFSTUDY_TTS_WS_URL ??
      "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
    this.fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  }

  get asrConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  get ttsConfigured(): boolean {
    return Boolean(this.apiKey && this.ttsVoiceId);
  }

  async transcribe(request: StudyAsrRequest): Promise<string> {
    if (!this.apiKey) {
      throw new StudySpeechProviderError(
        "课下ASR尚未配置，请设置DASHSCOPE_API_KEY。"
      );
    }
    const dataUrl = `data:${request.mimeType};base64,${request.audioBase64}`;
    let response: Response;
    try {
      response = await this.fetchImplementation(
        endpointFromBaseUrl(this.apiUrl),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: this.asrModel,
            messages: [
              {
                role: "system",
                content: request.context
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_audio",
                    input_audio: { data: dataUrl }
                  }
                ]
              }
            ],
            stream: false,
            asr_options: { enable_itn: true }
          }),
          signal: request.signal
        }
      );
    } catch (error) {
      if (request.signal?.aborted) throw abortError();
      throw new StudySpeechProviderError(
        `课下ASR连接失败：${(error as Error).message}`
      );
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new StudySpeechProviderError(
        `课下ASR返回${response.status}${detail ? `：${detail}` : ""}`
      );
    }
    const payload = (await response.json()) as DashScopeAsrResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new StudySpeechProviderError("课下ASR返回格式无效");
    const text = content.trim();
    if (!text) throw new StudyAsrNoSpeechError();
    return text;
  }

  async *synthesize(
    text: string,
    signal?: AbortSignal
  ): AsyncGenerator<StudyTtsChunk> {
    if (!this.apiKey || !this.ttsVoiceId) {
      throw new StudySpeechProviderError(
        "澜舟专属音色尚未配置；当前保留字幕并跳过语音。"
      );
    }
    if (signal?.aborted) throw abortError();

    const url = new URL(this.ttsWebSocketUrl);
    url.searchParams.set("model", this.ttsModel);
    const socket = new WebSocket(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
    const events = new AsyncMessageQueue<DashScopeTtsEvent>();
    let responseCompleted = false;

    const onAbort = () => {
      events.fail(abortError());
      socket.close();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    socket.on("message", (data: RawData) => {
      try {
        events.push(
          JSON.parse(data.toString("utf8")) as DashScopeTtsEvent
        );
      } catch {
        events.fail(
          new StudySpeechProviderError("澜舟TTS返回了无法解析的数据")
        );
      }
    });
    socket.on("error", (error) => {
      events.fail(
        new StudySpeechProviderError(`澜舟TTS连接失败：${error.message}`)
      );
    });
    socket.on("close", () => events.end());

    const send = (value: object) => socket.send(JSON.stringify(value));

    try {
      while (true) {
        const event = await events.next();
        if (!event) break;

        if (event.type === "session.created") {
          send({
            event_id: `event-${randomUUID()}`,
            type: "session.update",
            session: {
              voice: this.ttsVoiceId,
              mode: "commit",
              language_type: "Chinese",
              response_format: "pcm",
              sample_rate: 24_000,
              speech_rate: 0.96,
              volume: 50
            }
          });
          continue;
        }

        if (event.type === "session.updated") {
          send({
            event_id: `event-${randomUUID()}`,
            type: "input_text_buffer.append",
            text
          });
          send({
            event_id: `event-${randomUUID()}`,
            type: "input_text_buffer.commit"
          });
          continue;
        }

        if (event.type === "response.audio.delta" && event.delta) {
          yield {
            audioBase64: event.delta,
            sampleRate: 24_000,
            channels: 1,
            format: "pcm_s16le"
          };
          continue;
        }

        if (event.type === "response.done") {
          responseCompleted = true;
          send({
            event_id: `event-${randomUUID()}`,
            type: "session.finish"
          });
          break;
        }

        if (event.type === "error") {
          throw new StudySpeechProviderError(
            `澜舟TTS失败：${event.error?.message ?? event.error?.code ?? "未知错误"}`
          );
        }
      }

      if (!responseCompleted && !signal?.aborted) {
        throw new StudySpeechProviderError("澜舟TTS连接提前关闭");
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }
  }
}
