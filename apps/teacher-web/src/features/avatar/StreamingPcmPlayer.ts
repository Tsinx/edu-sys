import { decodePcm16Base64 } from "../study/study-utils";
import type { SpeechMeter } from "./SpeechMeter";

/** Plays each available block without waiting for the end of the response. */
export class StreamingPcmPlayer {
  private next = 0;
  private sources = new Map<AudioBufferSourceNode, () => void>();
  private firstSound = false;
  constructor(private readonly context: AudioContext, private readonly meter: SpeechMeter, private readonly turnId: string) {}
  push(base64: string, sampleRate: number) {
    const samples = decodePcm16Base64(base64);
    if (!samples.length) return;
    if (sampleRate !== 24000) throw new Error("实时音频采样率不匹配。");
    if (this.next - this.context.currentTime > 60) throw new Error("播放队列超过60秒，本轮已停止。");
    const block = this.context.createBuffer(1, samples.length, sampleRate); block.getChannelData(0).set(samples);
    const source = this.context.createBufferSource(); source.buffer = block;
    this.meter.connect(source);
    this.next = Math.max(this.next, this.context.currentTime + .03);
    const audible = samples.findIndex(value => Math.abs(value) > .002);
    if (!this.firstSound && audible >= 0) {
      this.firstSound = true;
      window.dispatchEvent(new CustomEvent("edu:voice-timing", { detail: { path: "realtime", turnId: this.turnId, event: "first-audio", at: performance.now() + (this.next - this.context.currentTime + audible / sampleRate) * 1000 } }));
    }
    source.onended = () => { const resolve = this.sources.get(source); this.sources.delete(source); source.disconnect(); resolve?.(); };
    this.sources.set(source, () => {}); source.start(this.next); this.next += block.duration;
  }
  async finish() {
    await Promise.all([...this.sources.keys()].map(source => new Promise<void>(resolve => { this.sources.set(source, resolve); })));
  }
  stop() {
    for (const [source, resolve] of this.sources) { source.onended = null; try { source.stop(); source.disconnect(); } catch {} resolve(); }
    this.sources.clear(); this.meter.reset();
  }
}
