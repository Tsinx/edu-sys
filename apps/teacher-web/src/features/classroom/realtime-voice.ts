import type { RealtimeClientEvent, RealtimeServerEvent } from "@edu/contracts";

export interface RealtimeCaptureSink {
  prepare(): Promise<void>;
  begin(): void;
  append(samples: Float32Array): void;
  commit(): Promise<void>;
  cancel(): void;
}
export function pcm16Base64(samples: Float32Array) {
  const bytes = new Uint8Array(samples.length * 2); const view = new DataView(bytes.buffer);
  samples.forEach((sample, i) => { const clipped = Math.max(-1, Math.min(1, sample)); view.setInt16(i * 2, clipped * (clipped < 0 ? 32768 : 32767), true); });
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export class RealtimeVoiceClient implements RealtimeCaptureSink {
  private ws?: WebSocket;
  private connecting?: Promise<void>;
  private turn?: { id: string; submitted: boolean; resolve: () => void; reject: (error: Error) => void; done: Promise<void> };
  private remainder = new Float32Array(0);
  constructor(private readonly sessionId: string, private readonly receive: (event: RealtimeServerEvent) => void) {}
  get turnId() { return this.turn?.id; }
  prepare() {
    if (this.connecting) return this.connecting;
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    const url = new URL(`/api/class-sessions/${encodeURIComponent(this.sessionId)}/assistant/realtime`, location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = this.ws = new WebSocket(url);
    this.connecting = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { reject(new Error("实时语音连接超时。")); ws.close(); }, 25_000);
      const done = (error?: Error) => { window.clearTimeout(timer); if(this.ws===ws)this.connecting = undefined; error ? reject(error) : resolve(); };
      ws.onmessage = message => {
        if (this.ws !== ws) return;
        let event: RealtimeServerEvent;
        try { event = JSON.parse(String(message.data)); } catch { ws.close(); return; }
        if (event.type === "session.ready") { done(); this.receive(event); return; }
        if (event.type === "error" && !event.turnId) { done(new Error(event.message)); this.fail(new Error(event.message)); this.receive(event); return; }
        if ("turnId" in event && event.turnId !== this.turn?.id) return;
        this.receive(event);
        if (event.type === "turn.completed") { const turn = this.turn; this.turn = undefined; turn?.resolve(); }
        if (event.type === "error" || event.type === "turn.cancelled") this.fail(new Error(event.type === "error" ? event.message : "本轮已取消。"));
      };
      ws.onerror = () => done(new Error("实时语音无法连接，请检查配置或使用文字输入。"));
      ws.onclose = () => {
        done(new Error("实时语音连接已断开。"));
        if (this.ws !== ws) return;
        this.ws = undefined;
        // The cloud may have finished while speech is still buffered locally.
        // Notify the avatar on every unexpected disconnect to stop that queue.
        this.receive({ type: "error", turnId: this.turn?.id, code: "DISCONNECTED", message: "实时语音已断线，播放已停止，请重新开始或使用文字输入。" });
        this.fail(new Error("实时语音连接已断开。"));
      };
    });
    return this.connecting;
  }
  private send(event: RealtimeClientEvent) {
    if (this.ws?.readyState !== WebSocket.OPEN) throw new Error("实时语音尚未连接。");
    if (this.ws.bufferedAmount > 256 * 1024) { this.cancel(); throw new Error("网络跟不上录音，本轮已取消。"); }
    this.ws.send(JSON.stringify(event));
  }
  begin() {
    if (this.turn) throw new Error("上一轮实时语音尚未结束。");
    const id = `rt-${crypto.randomUUID()}`;
    let resolve!: () => void, reject!: (error: Error) => void;
    const done = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
    void done.catch(() => undefined);
    this.turn = { id, submitted: false, resolve, reject, done }; this.remainder = new Float32Array(0);
    this.send({ type: "turn.begin", turnId: id });
  }
  append(samples: Float32Array) {
    const turn = this.turn;
    if (!turn || turn.submitted) throw new Error("录音轮次已失效。");
    const buffer = new Float32Array(this.remainder.length + samples.length); buffer.set(this.remainder); buffer.set(samples, this.remainder.length);
    let offset = 0;
    for (; offset + 1600 <= buffer.length; offset += 1600) this.send({ type: "audio.append", turnId: turn.id, audioBase64: pcm16Base64(buffer.subarray(offset, offset + 1600)) });
    this.remainder = buffer.slice(offset);
  }
  commit() {
    const turn = this.turn;
    if (!turn || turn.submitted) return Promise.reject(new Error("本轮已经结束。"));
    if (this.remainder.length) this.send({ type: "audio.append", turnId: turn.id, audioBase64: pcm16Base64(this.remainder) });
    this.remainder = new Float32Array(0); turn.submitted = true;
    window.dispatchEvent(new CustomEvent("edu:voice-timing", { detail: { path: "realtime", turnId: turn.id, event: "commit", at: performance.now() } }));
    this.send({ type: "turn.commit", turnId: turn.id });
    return turn.done;
  }
  private fail(error: Error) { const turn = this.turn; this.turn = undefined; this.remainder = new Float32Array(0); turn?.reject(error); }
  cancel() {
    const turn = this.turn;
    this.fail(new Error("本轮已取消。"));
    if (turn && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "turn.cancel", turnId: turn.id }));
  }
  close() { this.cancel(); const ws = this.ws; this.ws = undefined; this.connecting = undefined; ws?.close(); }
}
