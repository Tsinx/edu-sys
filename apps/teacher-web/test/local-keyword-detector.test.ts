import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { LocalKeywordDetector } from "../src/features/classroom/local-keyword-detector";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  messages: Array<{ type?: string; generation?: number; samples?: Float32Array }> = [];
  terminated = 0;
  constructor(readonly url: string) { FakeWorker.instances.push(this); }
  postMessage(message: (typeof this.messages)[number]) { this.messages.push(message); }
  terminate() { this.terminated++; }
  emit(data: unknown) { this.onmessage?.({ data }); }
}

function mockWorker(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { configurable: true, writable: true, value: FakeWorker });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "Worker", original);
    else Reflect.deleteProperty(globalThis, "Worker");
  });
}

test("resident model rejects stale frames across disconnect/reconnect and frees on dispose", async t => {
  mockWorker(t);
  const detector = new LocalKeywordDetector("personal-20260909");
  const worker = FakeWorker.instances.at(-1)!;
  const count = FakeWorker.instances.length;
  assert.match(worker.url, /personal-20260909/);
  worker.emit({ type: "ready" });
  await detector.ready(new AbortController().signal);
  const received: unknown[] = [];
  detector.connect(frame => received.push(frame), error => { throw error; });
  const first = worker.messages.at(-1)!.generation;
  const frame = { type: "frame", generation: first, samples: new Float32Array(10), keywords: [{ kind: "wake", start: 0 }] };
  detector.accept(new Float32Array(10));
  detector.disconnect();
  const pausedMessageCount = worker.messages.length;
  detector.accept(new Float32Array(10)); worker.emit(frame);
  assert.equal(worker.messages.length, pausedMessageCount);
  assert.equal(received.length, 0);
  assert.equal(worker.terminated, 0);
  await detector.ready(new AbortController().signal);
  detector.connect(value => received.push(value), error => { throw error; });
  worker.emit(frame);
  assert.equal(received.length, 0);
  worker.emit({ ...frame, generation: worker.messages.at(-1)!.generation });
  assert.equal(received.length, 1);
  assert.equal(FakeWorker.instances.length, count);
  detector.dispose(); detector.dispose();
  assert.equal(worker.terminated, 1);
});

test("aborting one model-load waiter does not unload the session or affect the next waiter", async t => {
  mockWorker(t);
  const detector = new LocalKeywordDetector();
  const worker = FakeWorker.instances.at(-1)!;
  const controller = new AbortController();
  const waiting = detector.ready(controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
  assert.equal(worker.terminated, 0);
  worker.emit({ type: "ready" });
  await detector.ready(new AbortController().signal);
  detector.dispose();
});

test("model failure while paused is retained and disposal rejects pending loading", async t => {
  mockWorker(t);
  const detector = new LocalKeywordDetector();
  const worker = FakeWorker.instances.at(-1)!;
  worker.emit({ type: "ready" });
  await detector.ready(new AbortController().signal);
  worker.onerror?.();
  await assert.rejects(detector.ready(new AbortController().signal), /检测中断/);
  detector.dispose();
  const loading = new LocalKeywordDetector();
  const ready = loading.ready(new AbortController().signal);
  loading.dispose();
  await assert.rejects(ready, { name: "AbortError" });
});
