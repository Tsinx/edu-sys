import type { KeywordHit } from "./local-keyword-recording";
import type { LocalKeywordModel } from "./local-keyword-model";

type Frame = { type: "frame"; samples: Float32Array; keywords: KeywordHit[]; generation: number; endingPending?: boolean };

/** One loaded model per user-enabled listening session, reused across microphone rounds. */
export class LocalKeywordDetector {
  private readonly worker: Worker;
  private readonly initialized: Promise<void>;
  private rejectInitialization: (error: Error) => void = () => {};
  private failure: Error | undefined;
  private disposed = false;
  private generation = 0;
  private onFrame: ((frame: Frame) => void) | undefined;
  private onError: ((error: Error) => void) | undefined;

  constructor(model: LocalKeywordModel = "original") {
    this.worker = new Worker(model === "original"
      ? "/audio/classroom-keywords.js"
      : `/audio/classroom-keywords.js?model=${encodeURIComponent(model)}`);
    this.initialized = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error("本地唤醒模型加载超时，请检查模型文件后重试。")), 45_000);
      this.rejectInitialization = error => { clearTimeout(timer); reject(error); };
      this.worker.onmessage = event => {
        if (this.disposed) return;
        if (event.data.type === "ready") { clearTimeout(timer); resolve(); }
        else if (event.data.type === "error") this.fail(new Error("本地唤醒模型初始化失败，请检查本地模型文件。"));
        else if (event.data.type === "frame" && event.data.generation === this.generation) this.onFrame?.(event.data);
      };
      this.worker.onerror = () => this.fail(new Error("本地关键词检测中断，监听已关闭。"));
    });
    // Loading can finish while the microphone is paused; keep failure for ready().
    void this.initialized.catch(() => {});
  }

  private fail(error: Error) {
    if (this.disposed) return;
    this.failure = error;
    this.rejectInitialization(error);
    this.onError?.(error);
  }

  async ready(signal: AbortSignal): Promise<void> {
    if (signal.aborted || this.disposed) throw new DOMException("已停止监听", "AbortError");
    if (this.failure) throw this.failure;
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(new DOMException("已停止监听", "AbortError"));
      signal.addEventListener("abort", abort, { once: true });
      void this.initialized.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
    if (signal.aborted || this.disposed) throw new DOMException("已停止监听", "AbortError");
    if (this.failure) throw this.failure;
  }

  connect(onFrame: (frame: Frame) => void, onError: (error: Error) => void): void {
    if (this.disposed) throw new Error("本地唤醒模型已关闭。");
    if (this.failure) throw this.failure;
    this.generation++;
    this.onFrame = onFrame;
    this.onError = onError;
    this.worker.postMessage({ type: "reset", generation: this.generation });
  }

  disconnect(): void {
    this.onFrame = undefined;
    this.onError = undefined;
    this.generation++;
    // Drop queued results immediately; the worker clears its small decoding streams
    // after already-queued frames, without unloading any network weights.
    if (!this.disposed) this.worker.postMessage({ type: "reset", generation: this.generation });
  }

  accept(samples: Float32Array): void {
    if (!this.disposed && this.onFrame) this.worker.postMessage({ samples, generation: this.generation }, [samples.buffer]);
  }

  resetWaiting(): void {
    if (!this.disposed) this.worker.postMessage({ mode: "waiting", generation: this.generation });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disconnect();
    this.rejectInitialization(new DOMException("已停止监听", "AbortError"));
    this.worker.terminate();
  }
}
