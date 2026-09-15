import { LocalKeywordRecording, type RecordingEvent } from "./local-keyword-recording";
import type { LocalKeywordModel } from "./local-keyword-model";
import { LocalKeywordDetector } from "./local-keyword-detector";
import type { RealtimeCaptureSink } from "./realtime-voice";
import { awaitVoiceStartup, microphoneFailureDetails, type VoiceStartupStage } from "./voice-startup";

export interface VoiceCapture { stop(): void; finish(): void; cancel(): void }

export async function startVoiceCapture(options: {
  mode?: "manual" | "handsfree";
  keywordModel?: LocalKeywordModel;
  detector?: LocalKeywordDetector;
  realtime: RealtimeCaptureSink;
  signal: AbortSignal;
  onState: (state: "recording" | "ending-pending" | "cancelled" | "timeout" | "transcribing") => void;
  onError: (error: Error) => void;
  onStartupStage?: (stage: VoiceStartupStage) => void;
}): Promise<VoiceCapture> {
  if (!options.realtime) throw new Error("课堂录音需要实时语音连接，请使用文字输入或检查服务配置。");
  const handsfree = options.mode !== "manual";
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("此页面无法访问麦克风。请使用受信任的 HTTPS 地址；另一台电脑访问 HTTP 局域网地址不能录音。");
  }
  if (typeof AudioWorkletNode === "undefined") {
    throw new Error("当前浏览器不支持麦克风音频处理，请使用最新版 Edge / Chrome。");
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
  let submitted = false;
  const recording = new LocalKeywordRecording(16000, options.realtime);
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
    if (!submitted) options.realtime?.cancel();
  }
  function fail(error: Error) { if (!stopped) { stop(); options.onError(error); } }
  async function handle(event: RecordingEvent) {
    if (event.type !== "audio") {
      if (event.type === "cancelled" || event.type === "timeout") options.realtime?.cancel();
      endingPending = false;
      // KWS owns wake/cancel phase changes synchronously; only an external timeout resets it.
      if (event.type === "timeout") detector?.resetWaiting();
      options.onState(event.type); return;
    }
    // Release capture before response generation; the caller retains KWS weights.
    releaseMicrophone();
    submitted = true;
    options.onState("transcribing");
    try { await options.realtime.commit(); }
    catch (error) { if (!options.signal.aborted) fail(error as Error); }
  }
  options.signal.addEventListener("abort", stop, { once: true });
  try {
    if (options.signal.aborted) throw new DOMException("已停止监听", "AbortError");
    // Model loading happens before microphone permission/capture. No hidden listening during loading.
    if (handsfree) {
      options.onStartupStage?.("model");
      detector = options.detector ?? new LocalKeywordDetector(options.keywordModel);
      await detector.ready(options.signal);
    }
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    options.onStartupStage?.("connection");
    await awaitVoiceStartup(options.realtime.prepare(), options.signal, 25_000, "实时语音连接超时，尚未开始录音。请检查服务器连接，或使用文字输入。");
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    options.onStartupStage?.("microphone");
    try {
      stream = await awaitVoiceStartup(navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }),
        options.signal, 20_000, "麦克风请求超过20秒仍未返回。请确认浏览器权限提示；内置浏览器或远程桌面无法打开设备时，请在你使用的电脑上用 Edge / Chrome 打开同一课堂地址。",
        late => late.getTracks().forEach(track => track.stop()));
    } catch (reason) { if (options.signal.aborted) throw reason; throw await microphoneFailureDetails(reason, options.signal); }
    if (stopped) { stream.getTracks().forEach(track => track.stop()); throw new DOMException("已停止监听", "AbortError"); }
    // The browser resamples microphone input to the model's 16 kHz rate.
    context = new AudioContext({ sampleRate: 16000 });
    if (context.sampleRate !== 16000) throw new Error("当前浏览器无法提供16kHz音频，请更换浏览器。");
    options.onStartupStage?.("worklet");
    await awaitVoiceStartup(context.audioWorklet.addModule("/audio/classroom-microphone.js"), options.signal, 15_000, "麦克风音频处理器加载超时，请检查网络后刷新课堂。");
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    options.onStartupStage?.("audio");
    await awaitVoiceStartup(context.resume(), options.signal, 10_000, "浏览器未能启动音频。请在当前课堂页面重新点击开始；若内置浏览器仍无响应，请使用 Edge / Chrome。");
    if (stopped) throw new DOMException("已停止监听", "AbortError");
    if (detector) {
      detector.connect(frame => {
        if (stopped || !receiving) return;
        pendingFrames--; lastReply = Date.now();
        let updates: RecordingEvent[];
        try { updates = recording.push(frame.samples, frame.keywords, Date.now()); }
        catch (error) { fail(error as Error); return; }
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
        try { for (const update of recording.push(event.data, [], Date.now())) void handle(update); }
        catch (error) { fail(error as Error); }
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
    throw reason;
  }
}
