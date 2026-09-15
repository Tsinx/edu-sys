import type { SpeechVisemeCue } from "@edu/contracts";

/** Measures only the assistant's scheduled TTS output, never the microphone. */
export class SpeechMeter {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private samples = new Float32Array(1024);
  private sources = new Set<AudioBufferSourceNode>();
  private level = 0;
  private lastTime = 0;
  private cues = new Map<AudioBufferSourceNode, { startAt: number; cues: SpeechVisemeCue[] }>();

  connect(source: AudioBufferSourceNode) {
    const context = source.context as AudioContext;
    if (this.context !== context) {
      this.analyser?.disconnect();
      this.cues.clear(); this.sources.clear(); this.lastTime = 0;
      this.context = context;
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = this.samples.length;
      this.analyser.connect(context.destination);
    }
    source.connect(this.analyser!);
    this.sources.add(source);
    source.addEventListener("ended", () => { this.sources.delete(source); this.cues.delete(source); }, { once: true });
  }

  schedule(source: AudioBufferSourceNode, startAt: number, cues?: SpeechVisemeCue[]) {
    if (cues?.length) this.cues.set(source, { startAt, cues });
  }

  readonly readViseme = (): SpeechVisemeCue["value"] | undefined => {
    if (this.context?.state !== "running") return undefined;
    const now = this.context.currentTime;
    for (const [source, entry] of this.cues) {
      const time = now - entry.startAt;
      if (time < 0 || time >= (source.buffer?.duration ?? 0)) continue;
      // Small anticipation compensates for lip muscle interpolation, using the audio clock.
      return entry.cues.find(cue => time + 0.025 >= cue.start && time + 0.025 < cue.end)?.value ?? "X";
    }
    return undefined;
  };

  readonly read = () => {
    if (!this.analyser || this.context?.state !== "running" || !this.sources.size) {
      this.level = 0;
      return 0;
    }
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    const rms = Math.sqrt(sum / this.samples.length);
    const target = rms < 0.006 ? 0 : Math.min(0.85, Math.sqrt(rms) * 2.1);
    const now = this.context.currentTime;
    const delta = Math.max(0, Math.min(0.1, now - this.lastTime));
    this.lastTime = now;
    this.level += (target - this.level) * (1 - Math.exp(-delta / (target > this.level ? 0.025 : 0.055)));
    return this.level;
  };

  reset() { this.sources.clear(); this.cues.clear(); this.level = 0; this.lastTime = 0; }
}
