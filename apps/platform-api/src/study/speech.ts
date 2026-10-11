import type { AvatarVoiceProfile, SpeechVisemeCue } from "@edu/contracts";
import { randomUUID } from "node:crypto";
import WebSocket, { type RawData } from "ws";
import { dashScopeApiKey } from "../runtime-env.js";

export interface StudyAsrRequest {
  audioBase64: string;
  mimeType: string;
  context: string;
  signal?: AbortSignal;
}

export interface StudyTtsChunk {
  mouthCues?: SpeechVisemeCue[];
  audioBase64: string;
  sampleRate: 24_000;
  channels: 1;
  format: "pcm_s16le";
}

export interface StudySpeechProvider {
  readonly name: string;
  readonly asrConfigured: boolean;
  readonly ttsConfigured: boolean;
  canSynthesize?(options?: StudySpeechOptions, voiceProfile?: AvatarVoiceProfile): boolean;
  transcribe(request: StudyAsrRequest): Promise<string>;
  synthesize(
    text: string,
    signal?: AbortSignal,
    voiceProfile?: AvatarVoiceProfile,
    options?: StudySpeechOptions
  ): AsyncIterable<StudyTtsChunk>;
}

export interface StudySpeechOptions {
  language?: "Chinese" | "English";
  voice?: string;
  model?: string;
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
  ttsPresetModel?: string;
  ttsVoiceId?: string;
  ttsWebSocketUrl?: string;
  ttsTaskWebSocketUrl?: string;
  asrNativeApiUrl?: string;
  fetchImplementation?: typeof fetch;
}

interface DashScopeAsrResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  output?: { text?: string; output?: { sentence?: { text?: string } } };
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
    if (this.ended) return;
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
    if (this.ended) return;
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

function speechEndpoint(baseUrl: string, pathname: string): string {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function nativeAsrParameters(request: StudyAsrRequest) {
  const mime = request.mimeType.split(";", 1)[0]!.trim().toLowerCase();
  const formats: Record<string, string> = {"audio/wav": "wav", "audio/wave": "wav", "audio/x-wav": "wav",
    "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/webm": "webm", "audio/mp4": "m4a",
    "audio/ogg": "ogg", "audio/opus": "opus", "audio/flac": "flac", "audio/pcm": "pcm"};
  const format = formats[mime];
  if (!format) throw new StudySpeechProviderError("当前音频格式不支持语音识别");
  let sampleRate = 16_000;
  if (format === "wav") {
    const wave = Buffer.from(request.audioBase64, "base64");
    if (wave.length >= 12 && wave.toString("ascii", 0, 4) === "RIFF" && wave.toString("ascii", 8, 12) === "WAVE") {
      for (let offset = 12; offset + 8 <= wave.length;) {
        const size = wave.readUInt32LE(offset + 4);
        if (wave.toString("ascii", offset, offset + 4) === "fmt " && size >= 16 && offset + 24 <= wave.length) {
          sampleRate = wave.readUInt32LE(offset + 12); break;
        }
        offset += 8 + size + size % 2;
      }
    }
  }
  return {format, ...(format === "wav" || format === "pcm" ? {sample_rate: String(sampleRate)} : {})};
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
  private readonly ttsPresetModel: string;
  private readonly ttsVoiceId?: string;
  private readonly ttsWebSocketUrl: string;
  private readonly ttsTaskWebSocketUrl: string;
  private readonly asrNativeApiUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: DashScopeStudySpeechProviderOptions = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey.trim() || undefined : dashScopeApiKey();
    this.apiUrl =
      options.apiUrl ??
      process.env.EDU_SELFSTUDY_SPEECH_API_URL ??
      process.env.EDU_ASSISTANT_API_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.asrModel =
      options.asrModel ??
      process.env.EDU_SELFSTUDY_ASR_MODEL ??
      "qwen-audio-3.1-asr-flash";
    this.ttsModel =
      options.ttsModel ??
      process.env.EDU_SELFSTUDY_TTS_MODEL ??
      "qwen-audio-3.1-tts-flash";
    // System voices are independent of a previously enrolled custom voice model.
    this.ttsPresetModel =
      options.ttsPresetModel ??
      (process.env.EDU_SELFSTUDY_TTS_PRESET_MODEL?.trim() || "qwen-audio-3.1-tts-flash");
    this.ttsVoiceId =
      options.ttsVoiceId ?? process.env.EDU_SELFSTUDY_TTS_VOICE_ID;
    this.ttsWebSocketUrl =
      options.ttsWebSocketUrl ??
      process.env.EDU_SELFSTUDY_TTS_WS_URL ??
      "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
    const workspaceUrl = process.env.EDU_REALTIME_URL?.trim();
    this.ttsTaskWebSocketUrl = options.ttsTaskWebSocketUrl ??
      process.env.EDU_SELFSTUDY_TTS_TASK_WS_URL ??
      speechEndpoint(workspaceUrl || this.ttsWebSocketUrl, "/api-ws/v1/inference");
    const nativeBase = new URL(workspaceUrl || this.apiUrl);
    nativeBase.protocol = "https:";
    this.asrNativeApiUrl = options.asrNativeApiUrl ?? process.env.EDU_SELFSTUDY_ASR_NATIVE_URL ??
      speechEndpoint(nativeBase.toString(), "/api/v1/services/aigc/multimodal-generation/generation");
    this.fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  }

  get asrConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  get ttsConfigured(): boolean {
    return this.canSynthesize();
  }

  canSynthesize(options: StudySpeechOptions = {}, voiceProfile?: AvatarVoiceProfile): boolean {
    return Boolean(this.apiKey && (options.language === "English" || options.voice ||
      voiceProfile === "hiyori" || voiceProfile === "natori" || this.ttsVoiceId ||
      (options.model ?? this.ttsModel).startsWith("qwen-audio-")));
  }

  async transcribe(request: StudyAsrRequest): Promise<string> {
    if (!this.apiKey) {
      throw new StudySpeechProviderError(
        "课下ASR尚未配置，请设置DASHSCOPE_API_KEY。"
      );
    }
    const dataUrl = `data:${request.mimeType};base64,${request.audioBase64}`;
    const native = this.asrModel.startsWith("qwen-audio-");
    const messages = [
      ...(native ? (request.context.trim() ? [{role: "user", content: [{type: "input_text", text: request.context.slice(0, 400)}]}] : []) :
        [{role: "system", content: request.context}]),
      {role: "user", content: [{type: "input_audio", input_audio: {data: dataUrl}}]}
    ];
    let response: Response;
    try {
      response = await this.fetchImplementation(
        native ? this.asrNativeApiUrl : endpointFromBaseUrl(this.apiUrl),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(native ? {"X-DashScope-SSE": "disable"} : {})
          },
          body: JSON.stringify({
            model: this.asrModel,
            ...(native ? {input: {messages}, parameters: nativeAsrParameters(request)} :
              {messages, stream: false, asr_options: {enable_itn: true}})
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
    const content = native ? payload.output?.text ?? payload.output?.output?.sentence?.text :
      payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new StudySpeechProviderError("课下ASR返回格式无效");
    const text = content.trim();
    if (!text) throw new StudyAsrNoSpeechError();
    return text;
  }

  async *synthesize(
    text: string,
    signal?: AbortSignal,
    voiceProfile: AvatarVoiceProfile = "default",
    options: StudySpeechOptions = {}
  ): AsyncGenerator<StudyTtsChunk> {
    const english = options.language === "English";
    const systemVoice = voiceProfile === "natori" || voiceProfile === "hiyori" || english;
    const model = options.model ?? (systemVoice ? this.ttsPresetModel : this.ttsModel);
    const native = model.startsWith("qwen-audio-");
    const preset = native
      ? (english ? (voiceProfile === "hiyori" ? "Emily_v3.1" : "Eric_v3.1") :
        voiceProfile === "hiyori" ? "longanhuan_v3.1" : voiceProfile === "natori" ? "longanlang_v3.1" : undefined)
      : voiceProfile === "natori" ? "Ethan" : voiceProfile === "hiyori" ? "Serena" : undefined;
    const voice = options.voice ?? (english ? preset ?? "Ethan" : preset ??
      (this.ttsVoiceId?.trim() || (native ? "longanhuan_v3.1" : undefined)));
    if (!this.apiKey || !voice) {
      throw new StudySpeechProviderError(
        "澜舟专属音色尚未配置；当前保留字幕并跳过语音。"
      );
    }
    if (signal?.aborted) throw abortError();
    if (native) {
      yield* this.synthesizeAudioTask(text, model, voice, options.language ?? "Chinese", signal);
      return;
    }

    const url = new URL(this.ttsWebSocketUrl);
    url.searchParams.set("model", model);
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
    socket.on("close", (code, reason) => {
      if (!responseCompleted && !signal?.aborted) {
        const detail = reason.toString("utf8").replaceAll(this.apiKey!, "[redacted]").slice(0, 200);
        events.fail(new StudySpeechProviderError(
          `TTS连接提前关闭（${code}）${detail ? `：${detail}` : ""}`
        ));
      } else events.end();
    });

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
              voice,
              mode: "commit",
              language_type: options.language ?? "Chinese",
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

  private async *synthesizeAudioTask(text: string, model: string, voice: string,
    language: "Chinese" | "English", signal?: AbortSignal): AsyncGenerator<StudyTtsChunk> {
    const taskId = randomUUID();
    type TaskEvent = {header?: {task_id?: string; event?: string; error_code?: string; error_message?: string}};
    const events = new AsyncMessageQueue<{audio: Buffer} | {event: TaskEvent}>();
    const socket = new WebSocket(this.ttsTaskWebSocketUrl, {
      headers: {Authorization: `Bearer ${this.apiKey}`}, handshakeTimeout: 15_000, maxPayload: 8 * 1024 * 1024
    });
    let completed = false, receivedFinish = false, started = false, receivedAudio = false, remainder = Buffer.alloc(0);
    const diagnostic = (detail: string) => detail.replaceAll(this.apiKey!, "[redacted]").slice(0, 300);
    const send = (action: string, payload: object) => socket.send(JSON.stringify({
      header: {action, task_id: taskId, streaming: "duplex"}, payload
    }));
    const failIdle = () => {events.fail(new StudySpeechProviderError("TTS服务响应超时")); socket.terminate();};
    let timer = setTimeout(failIdle, 30_000);
    const onAbort = () => {events.fail(abortError()); socket.terminate();};
    signal?.addEventListener("abort", onAbort, {once: true});
    socket.on("open", () => {
      if (signal?.aborted) return onAbort();
      send("run-task", {task_group: "audio", task: "tts", function: "SpeechSynthesizer", model,
        parameters: {text_type: "PlainText", voice, format: "pcm", sample_rate: 24_000,
          volume: 50, rate: 0.96, pitch: 1, language_hints: [language === "English" ? "en" : "zh"]}, input: {}});
    });
    socket.on("message", (data: RawData, binary: boolean) => {
      clearTimeout(timer); timer = setTimeout(failIdle, 30_000);
      try {
        if (binary) events.push({audio: Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data)});
        else {
          const event = JSON.parse(data.toString("utf8")) as TaskEvent;
          if (event.header?.event === "task-failed") events.fail(new StudySpeechProviderError(
            `TTS失败：${diagnostic(event.header.error_message ?? event.header.error_code ?? "未知错误")}`));
          else {
            if (event.header?.event === "task-finished" && event.header.task_id === taskId) {
              // A consumer may still be analyzing lip cues while queued PCM drains.
              receivedFinish = true;
              clearTimeout(timer);
            }
            events.push({event});
          }
        }
      } catch {events.fail(new StudySpeechProviderError("TTS返回了无法解析的数据"));}
    });
    socket.on("error", error => events.fail(new StudySpeechProviderError(`TTS连接失败：${diagnostic(error.message)}`)));
    socket.on("close", (code, reason) => {
      if (!receivedFinish && !signal?.aborted) events.fail(new StudySpeechProviderError(
        `TTS连接提前关闭（${code}）${reason.length ? `：${diagnostic(reason.toString("utf8"))}` : ""}`));
      else events.end();
    });
    try {
      while (true) {
        signal?.throwIfAborted();
        const message = await events.next();
        if (!message) break;
        if ("audio" in message) {
          if (!started) throw new StudySpeechProviderError("TTS在任务确认前返回了音频");
          const pcm = Buffer.concat([remainder, message.audio]), size = pcm.length - pcm.length % 2;
          remainder = Buffer.from(pcm.subarray(size));
          if (size) {
            receivedAudio = true;
            yield {audioBase64: pcm.subarray(0, size).toString("base64"), sampleRate: 24_000, channels: 1, format: "pcm_s16le"};
          }
          continue;
        }
        const header = message.event.header;
        if (header?.task_id !== taskId) throw new StudySpeechProviderError("TTS返回了不匹配的任务编号");
        if (header.event === "task-started" && !started) {
          started = true;
          send("continue-task", {input: {text}});
          send("finish-task", {input: {}});
        } else if (header.event === "task-failed") {
          throw new StudySpeechProviderError(`TTS失败：${diagnostic(header.error_message ?? header.error_code ?? "未知错误")}`);
        } else if (header.event === "task-finished") {
          if (!receivedAudio || remainder.length) throw new StudySpeechProviderError("TTS没有返回完整的PCM音频");
          completed = true;
          break;
        }
      }
      if (!completed && !signal?.aborted) throw new StudySpeechProviderError("TTS任务未完成");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (socket.readyState === WebSocket.OPEN) socket.close();
      else if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
    }
  }
}
