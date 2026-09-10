import { LocalKeywordRecording, cleanRecordedCommand, type RecordingEvent } from "./local-keyword-recording";
import type { StudyAsrInput } from "@edu/contracts";
import type { LocalKeywordModel } from "./local-keyword-model";
import { LocalKeywordDetector } from "./local-keyword-detector";

export function encodeVoiceWav(samples: Float32Array, sampleRate: number): StudyAsrInput {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const label = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  label(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); label(8, "WAVE");
  label(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, index) => {
    const clipped = Math.max(-1, Math.min(1, value));
    view.setInt16(44 + index * 2, clipped * (clipped < 0 ? 32768 : 32767), true);
  });
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return { audioBase64: btoa(binary), mimeType: "audio/wav", durationMs: Math.max(100, Math.round(samples.length / sampleRate * 1000)) };
}

export async function transcribeClassroomVoice(input: StudyAsrInput, signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/teacher/asr", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input), signal
  });
  if (!response.ok) throw new Error("语音识别暂不可用，监听已关闭；请检查服务后重试。");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("text" in result) || typeof result.text !== "string") {
    throw new Error("语音识别返回无效，监听已关闭。");
  }
  return result.text;
}

export interface VoiceCapture { stop(): void; finish(): void; cancel(): void }

export async function startVoiceCapture(options: {
  mode?: "manual" | "handsfree";
  keywordModel?: LocalKeywordModel;
  detector?: LocalKeywordDetector;
  signal: AbortSignal;
  onTranscript: (text: string) => void;
  onState: (state: "recording" | "ending-pending" | "cancelled" | "timeout" | "transcribing") => void;
  onError: (error: Error) => void;
}): Promise<VoiceCapture> {
  const handsfree = options.mode !== "manual";
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
    throw new Error("当前浏览器不支持本地语音唤醒，请使用 Edge / Chrome 的 HTTPS 页面或本机页面。");
  }
  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let processor: AudioWorkletNode | undefined;
  let detector: LocalKeywordDetector | undefined;
  const ownsDetector = !options.detector;
  let stopped = false;
  let receiving = true;
  let pendingFrames = 0;
  let lastReply = Date.now();
  let endingPending = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const recording = new LocalKeywordRecording();
  function releaseMicrophone() {
    receiving = false;
    if (processor) { processor.port.onmessage = null; processor.port.close(); processor.disconnect(); }
    source?.disconnect();
    stream?.getTracks().forEach(track => track.stop());
    if (context) void context.close().catch(() => {});
    detector?.disconnect();
    if (ownsDetector) detector?.dispose();
    clearInterval(timer);
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    options.signal.removeEventListener("abort", stop);
    releaseMicrophone();
  }
  function fail(error: Error) { if (!stopped) { stop(); options.onError(error); } }
  async function handle(event: RecordingEvent) {
    if (event.type !== "audio") {
      endingPending = false;
      // KWS owns wake/cancel phase changes synchronously; only an external timeout resets it.
      if (event.type === "timeout") detector?.resetWaiting();
      options.onState(event.type); return;
    }
    // Disconnect audio before ASR; a caller-owned detector keeps its weights resident.
    releaseMicrophone();
    options.onState("transcribing");
    try {
      const text = event.samples.length ? await transcribeClassroomVoice(encodeVoiceWav(event.samples, 16000),
        AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])) : "";
      if (!stopped && !options.signal.aborted) options.onTranscript(handsfree ? cleanRecordedCommand(text) : text.trim());
    } catch (error) {
      if (!options.signal.aborted) fail(error instanceof Error ? error : new Error("本轮语音识别失败，请重试。"));
    }
  }
  options.signal.addEventListener("abort", stop, { once: true });
  try {
    if (options.signal.aborted) throw new DOMException("已停止监听", "AbortError");
    // Model loading happens before microphone permission/capture. No hidden listening during loading.
    if (handsfree) {
      detector = options.detector ?? new LocalKeywordDetector(options.keywordModel);
      await detector.ready(options.signal);
    }
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (stopped) { stream.getTracks().forEach(track => track.stop()); throw new DOMException("已停止监听", "AbortError"); }
    // The browser resamples microphone input to the model's 16 kHz rate.
    context = new AudioContext({ sampleRate: 16000 });
    if (context.sampleRate !== 16000) throw new Error("当前浏览器无法提供16kHz音频，请更换浏览器。");
    await context.audioWorklet.addModule("/audio/classroom-microphone.js");
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    await context.resume();
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    if (detector) {
      detector.connect(frame => {
        if (stopped || !receiving) return;
        pendingFrames--; lastReply = Date.now();
        const updates = recording.push(frame.samples, frame.keywords, Date.now());
        for (const update of updates) void handle(update);
        // Cancellation/timeout/submission wins over a queued pending-state update.
        if (receiving && recording.isRecording && !updates.some(update => update.type !== "recording") && endingPending !== !!frame.endingPending) {
          endingPending = !!frame.endingPending;
          options.onState(endingPending ? "ending-pending" : "recording");
        }
      }, fail);
    }
    lastReply = Date.now();
    timer = setInterval(() => {
      if (stopped || !receiving) return;
      const expired = recording.expire(Date.now());
      if (expired) void handle(expired);
      if (pendingFrames && Date.now() - lastReply > 5000) fail(new Error("本地关键词检测无响应，监听已关闭。"));
    }, 500);
    processor = new AudioWorkletNode(context, "classroom-microphone");
    processor.onprocessorerror = () => fail(new Error("麦克风音频处理异常，监听已关闭。"));
    processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (stopped || !receiving) return;
      if (!handsfree) {
        for (const update of recording.push(event.data, [], Date.now())) void handle(update);
        return;
      }
      if (++pendingFrames > 24) { fail(new Error("本地关键词检测跟不上收音，监听已关闭。")); return; }
      detector!.accept(event.data);
    };
    source = context.createMediaStreamSource(stream);
    source.connect(processor); processor.connect(context.destination);
    stream.getAudioTracks().forEach(track => track.addEventListener("ended", () => {
      if (!stopped && receiving) fail(new Error("麦克风已断开，监听已关闭。"));
    }, { once: true }));
    if (!handsfree) {
      const event = recording.begin(Date.now());
      if (event) void handle(event);
    }
    return {
      stop,
      finish() {
        if (stopped || !receiving) return;
        const event = recording.finish(Date.now());
        if (event) void handle(event);
      },
      cancel() {
        if (stopped || !receiving) return;
        const event = recording.cancel();
        if (event) void handle(event);
      }
    };
  } catch (reason) {
    stop();
    if (reason instanceof DOMException && reason.name === "NotAllowedError") {
      throw new Error("未获得麦克风权限，请允许访问后重新开启监听。");
    }
    throw reason;
  }
}
