import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { dashScopeApiKey } from "../runtime-env.js";

export interface RealtimeConfig { enabled: boolean; url: string; model: string; voice: string; apiKey: string }
export function realtimeConfig(env = process.env): RealtimeConfig {
  const config = {
    enabled: env.EDU_REALTIME_ENABLED === "true",
    url: env.EDU_REALTIME_URL?.trim() ?? "",
    model: env.EDU_REALTIME_MODEL?.trim() || "qwen-audio-3.0-realtime-plus",
    voice: env.EDU_REALTIME_VOICE?.trim() || "longanqian",
    apiKey: env.EDU_REALTIME_API_KEY?.trim() || dashScopeApiKey(env) || ""
  };
  if (config.url && !config.url.startsWith("wss://")) throw new Error("EDU_REALTIME_URL 必须使用 wss://");
  return config;
}
export function realtimeAvailable(config: RealtimeConfig) { return config.enabled && Boolean(config.url && config.apiKey); }

// Upstream events are deliberately contained in this adapter. Browser code only
// sees our small, versioned-by-code classroom event union, never credentials.
export type QwenEvent = { type: string; [key: string]: any };
export interface RealtimeTransport {
  open(signal: AbortSignal): Promise<void>;
  send(event: QwenEvent): void;
  request(event: QwenEvent, ack: string, signal: AbortSignal): Promise<QwenEvent>;
  respond(modalities: string[], receive: (event: QwenEvent) => void, signal: AbortSignal): Promise<QwenEvent>;
  subscribe(receive: (event: QwenEvent) => void): () => void;
  close(): void;
}

export class QwenRealtimeTransport implements RealtimeTransport {
  private ws?: WebSocket;
  private listeners = new Set<(event: QwenEvent) => void>();
  private failure?: Error;
  constructor(private readonly config: RealtimeConfig) {}
  subscribe(receive: (event: QwenEvent) => void) { this.listeners.add(receive); return () => { this.listeners.delete(receive); }; }
  private emit(event: QwenEvent) { for (const receive of this.listeners) receive(event); }
  async open(signal: AbortSignal) {
    signal.throwIfAborted();
    const url = new URL(this.config.url); url.searchParams.set("model", this.config.model);
    const ws = this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${this.config.apiKey}` }, handshakeTimeout: 15_000, maxPayload: 8 * 1024 * 1024 });
    ws.on("message", data => {
      try {
        const event = JSON.parse(data.toString()) as QwenEvent;
        if (event.type === "error") {
          this.failure = new Error(`实时模型返回错误：${String(event.error?.code ?? "UPSTREAM_ERROR")}`);
          this.emit({ type: "transport.error", message: this.failure.message });
        } else this.emit(event);
      } catch { this.emit({ type: "transport.error", message: "实时模型返回无效事件。" }); }
    });
    ws.on("error", () => { this.failure = new Error("实时模型连接失败，请检查业务空间、地域和模型权限。"); this.emit({ type: "transport.error", message: this.failure.message }); });
    ws.on("close", () => { this.failure ??= new Error("实时模型连接已断开。"); this.emit({ type: "transport.error", message: this.failure.message }); });
    await new Promise<void>((resolve, reject) => {
      const abort = () => { ws.terminate(); finish(new Error("实时连接已取消。")); };
      const error = () => finish(this.failure ?? new Error("实时模型握手失败。"));
      const opened = () => finish();
      const finish = (reason?: Error) => { signal.removeEventListener("abort", abort); ws.off("error", error); ws.off("open", opened); reason ? reject(reason) : resolve(); };
      signal.addEventListener("abort", abort, { once: true }); ws.once("error", error); ws.once("open", opened);
    });
    await this.request({ type: "session.update", session: { modalities: ["text", "audio"], voice: this.config.voice,
      input_audio_format: "pcm", output_audio_format: "pcm", turn_detection: null, enable_search: false, max_history_turns: 50 } }, "session.updated", signal);
  }
  send(event: QwenEvent) {
    if (this.failure) throw this.failure;
    if (this.ws?.readyState !== WebSocket.OPEN) throw new Error("实时模型尚未连接。");
    if (this.ws.bufferedAmount > 256 * 1024) throw new Error("实时音频网络积压，本轮已停止。");
    this.ws.send(JSON.stringify({ event_id: randomUUID(), ...event }));
  }
  private wait(predicate: (event: QwenEvent) => boolean, signal: AbortSignal, start: () => void, receive?: (event: QwenEvent) => void) {
    return new Promise<QwenEvent>((resolve, reject) => {
      const finish = (event?: QwenEvent, error?: unknown) => { clearTimeout(timer); unsubscribe(); signal.removeEventListener("abort", abort); error ? reject(error) : resolve(event!); };
      const abort = () => finish(undefined, new DOMException("已取消", "AbortError"));
      const unsubscribe = this.subscribe(event => {
        try {
          if (event.type === "transport.error") return finish(undefined, new Error(event.message));
          receive?.(event);
          if (predicate(event)) finish(event);
        } catch (error) { finish(undefined, error); }
      });
      const timer = setTimeout(() => finish(undefined, new Error("实时模型响应超时。")), 120_000); timer.unref();
      if (signal.aborted) { abort(); return; }
      signal.addEventListener("abort", abort, { once: true });
      try { start(); } catch (error) { finish(undefined, error); }
    });
  }
  request(event: QwenEvent, ack: string, signal: AbortSignal) {
    return this.wait(e => e.type === ack && (!event.item_id || e.item_id === event.item_id), signal, () => this.send(event));
  }
  async respond(modalities: string[], receive: (event: QwenEvent) => void, signal: AbortSignal) {
    let id: string | undefined;
    const result = await this.wait(e => e.type === "response.done" && e.response?.id === id, signal,
      () => this.send({ type: "response.create", response: { modalities } }), e => {
        if (e.type === "response.created") id = e.response?.id;
        if (id && (e.response_id === id || e.response?.id === id)) receive(e);
      });
    if (result.response?.status !== "completed") throw new Error("实时回答未完整生成，本轮已停止。");
    return result;
  }
  close() { this.ws?.terminate(); }
}
