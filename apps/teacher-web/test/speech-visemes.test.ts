import assert from "node:assert/strict";
import test from "node:test";
import { SpeechMeter } from "../src/features/avatar/SpeechMeter.js";

test("visemes follow scheduled audio time, not network arrival; reset and ended remove old cues", () => {
  const context = { currentTime: 1, state: "running", destination: {}, createAnalyser: () => ({ connect() {}, disconnect() {}, fftSize: 0, getFloatTimeDomainData(samples: Float32Array) { samples.fill(0.2); } }) };
  const source = Object.assign(new EventTarget(), { context, buffer: { duration: 2 }, connect() {} }) as unknown as AudioBufferSourceNode;
  const meter = new SpeechMeter();
  meter.connect(source);
  meter.schedule(source, 2, [{ start: 0, end: 0.5, value: "F" }, { start: 0.5, end: 1, value: "A" }, { start: 1, end: 2, value: "D" }]);
  assert.equal(meter.readViseme(), undefined);
  context.currentTime = 2.1; assert.equal(meter.readViseme(), "F");
  context.currentTime = 2.55; assert.equal(meter.readViseme(), "A");
  context.currentTime = 3.1; assert.equal(meter.readViseme(), "D");
  context.state = "suspended"; assert.equal(meter.readViseme(), undefined);
  context.state = "running";
  source.dispatchEvent(new Event("ended")); assert.equal(meter.readViseme(), undefined);
  meter.connect(source); meter.schedule(source, 3, [{ start: 0, end: 2, value: "F" }]);
  assert.equal(meter.readViseme(), "F");
  meter.reset(); assert.equal(meter.readViseme(), undefined); assert.equal(meter.read(), 0);
});
