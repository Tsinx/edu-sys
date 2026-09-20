import type { RealtimeClientEvent, RealtimeServerEvent } from "@edu/contracts";

export interface RealtimeCaptureSink {
  prepare(): Promise<void>;
  begin(): void;
  append(samples: Float32Array): void;
  commit(): Promise<void>;
  cancel(): void;
}
export function realtimeErrorMessage(message: string) {
  return message.includes("文字输入") ? message : `${message} 请重新开始，或使用文字输入。`;
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
      let ready = false;
      let failure: Error | undefined;
      const timer = window.setTimeout(() => {
        reportFailure(new Error("实时语音连接超时，尚未开始录音。"), "CONNECTION_TIMEOUT");
        ws.close();
      }, 25_000);
      const done = (error?: Error) => { window.clearTimeout(timer); if(this.ws===ws)this.connecting = undefined; error ? reject(error) : resolve(); };
      const reportFailure = (error: Error, code: string) => {
        if (this.ws !== ws || failure) return;
        failure = error;
        done(error);
        this.receive({ type: "error", turnId: this.turn?.id, code, message: error.message });
        this.fail(error);
      };
      ws.onmessage = message => {
        if (this.ws !== ws || failure) return;
        let event: RealtimeServerEvent;
        try { event = JSON.parse(String(message.data)); } catch { ws.close(); return; }
        if (event.type === "session.ready") { ready = true; done(); this.receive(event); return; }
        if (event.type === "error" && !event.turnId) { reportFailure(new Error(event.message), event.code); ws.close(); return; }
        if ("turnId" in event && event.turnId !== this.turn?.id) return;
        this.receive(event);
        if (event.type === "turn.completed") { const turn = this.turn; this.turn = undefined; turn?.resolve(); }
        if (event.type === "error" || event.type === "turn.cancelled") this.fail(new Error(event.type === "error" ? event.message : "本轮已取消。"));
      };
      ws.onerror = () => {
        reportFailure(new Error(ready ? "实时语音连接中断，播放已停止。" : "实时语音无法连接，请检查服务连接或使用文字输入。"), ready ? "DISCONNECTED" : "CONNECTION_FAILED");
        ws.close();
      };
      ws.onclose = () => {
        if (this.ws !== ws) { done(new Error("实时语音连接已取消。")); return; }
        // The cloud may have finished while speech is still buffered locally.
        // Stop it on disconnect, but never overwrite an earlier failure cause.
        reportFailure(new Error(ready ? "实时语音已断线，播放已停止，请重新开始或使用文字输入。" : "实时语音连接在就绪前关闭，尚未开始录音。"), ready ? "DISCONNECTED" : "CONNECTION_CLOSED");
        this.ws = undefined;
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
