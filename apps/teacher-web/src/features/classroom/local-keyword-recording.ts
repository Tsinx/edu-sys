export type KeywordHit = { kind: "wake" | "finish" | "cancel"; start: number };
export type RecordingEvent = { type: "recording" | "cancelled" | "timeout" } | { type: "audio"; samples: Float32Array };

/** Only a short local look-back is kept before wake; a command is capped at 60 seconds. */
export class LocalKeywordRecording {
  private frames: Array<{ start: number; samples: Float32Array }> = [];
  private position = 0;
  private start: number | undefined;
  private startedAt = 0;
  private finished = false;
  constructor(private readonly rate = 16000) {}

  get isRecording(): boolean { return this.start !== undefined && !this.finished; }

  begin(now: number, start = this.position): RecordingEvent | undefined {
    if (this.finished || this.start !== undefined) return;
    this.start = Math.max(this.frames[0]?.start ?? this.position, Math.min(this.position, start));
    this.startedAt = now;
    return { type: "recording" };
  }

  cancel(): RecordingEvent | undefined {
    if (this.finished || this.start === undefined) return;
    this.start = undefined; this.frames = [];
    return { type: "cancelled" };
  }

  finish(now: number, end = this.position): RecordingEvent | undefined {
    const timeout = this.expire(now);
    if (timeout) return timeout;
    if (this.finished || this.start === undefined) return;
    end = Math.min(this.position, end);
    const audio = new Float32Array(Math.max(0, end - this.start));
    for (const frame of this.frames) {
      const from = Math.max(this.start, frame.start);
      const to = Math.min(end, frame.start + frame.samples.length);
      if (to > from) audio.set(frame.samples.subarray(from - frame.start, to - frame.start), from - this.start);
    }
    this.frames = []; this.start = undefined; this.finished = true;
    return { type: "audio", samples: audio };
  }

  expire(now: number): RecordingEvent | undefined {
    if (this.start !== undefined && now - this.startedAt >= 60_000) {
      this.start = undefined; this.frames = [];
      return { type: "timeout" };
    }
  }

  push(samples: Float32Array, hits: KeywordHit[], now: number): RecordingEvent[] {
    if (this.finished) return [];
    const events: RecordingEvent[] = [];
    const timeout = this.expire(now);
    if (timeout) events.push(timeout);
    this.frames.push({ start: this.position, samples });
    this.position += samples.length;
    if (this.start !== undefined && this.position - this.start > this.rate * 60) {
      this.frames = []; this.start = undefined;
      events.push({ type: "timeout" });
      return events;
    }
    for (const hit of hits) {
      if (hit.kind === "wake" && this.start === undefined && !timeout) {
        // Include the bounded wake context to preserve immediately following words.
        const event = this.begin(now, Math.floor(hit.start * this.rate));
        if (event) events.push(event);
      } else if (hit.kind === "cancel" && this.start !== undefined) {
        const event = this.cancel();
        if (event) events.push(event);
      } else if (hit.kind === "finish" && this.start !== undefined) {
        const event = this.finish(now, Math.floor(hit.start * this.rate));
        if (event) events.push(event);
        break;
      }
    }
    if (this.start === undefined) {
      this.frames = this.frames.filter(frame => frame.start + frame.samples.length > this.position - this.rate * 4);
    }
    return events;
  }
}

/** KWS controls submission. ASR is used only to transcribe the completed command. */
export function cleanRecordedCommand(text: string): string {
  return text.trim()
    .replace(/^(?:小麦[\s，,]*老师|.*?(?:(?:助教|主教|助叫|澜舟|蓝舟|兰舟|岚舟)[\s，,]*你好|你好[\s，,。.!！?？]*(?:小[\s，,]*)?(?:助手|助教|澜舟|蓝舟|兰舟|岚舟)))[\s，,。.!！?？：:]*/su, "")
    .replace(/[\s，,。.!！?？]*(?:谢谢[\s，,]*(?:助教|主教|澜舟|蓝舟|兰舟|岚舟)|非常[\s，,]*感谢).*$/su, "")
    // A cancelled tentative "谢谢" inside the question is ordinary content.
    .replace(/[\s，,。.!！?？]*谢谢[\s，,。.!！?？]*$/su, "")
    .trim();
}
