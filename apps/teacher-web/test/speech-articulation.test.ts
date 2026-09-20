import assert from "node:assert/strict";
import test from "node:test";
import { SpeechMeter } from "../src/features/avatar/SpeechMeter.js";
import { speechMouthTarget } from "../src/features/avatar/xiaomai-mouth.js";

function setup() {
  let rms = 0;
  const analyser = { fftSize: 0, connect() {}, disconnect() {}, getFloatTimeDomainData(samples: Float32Array) { samples.fill(rms); } };
  const context = { currentTime: 1, state: "running", destination: {}, createAnalyser: () => analyser };
  const source = Object.assign(new EventTarget(), { context, connect() {} }) as unknown as AudioBufferSourceNode;
  const meter = new SpeechMeter();
  meter.connect(source);
  function advance(amplitude: number, seconds: number) {
    rms = amplitude;
    let result = 0;
    for (let i = 0; i < Math.round(seconds * 120); i++) { context.currentTime += 1 / 120; result = meter.read(); }
    return result;
  }
  return { meter, context, source, advance };
}

test("adjacent voiced syllables retain visible aperture contrast without silent gaps", () => {
  const { advance } = setup();
  for (let repeat = 0; repeat < 4; repeat++) {
    const strong = speechMouthTarget(undefined, advance(0.2, 0.12))[1]!;
    const weak = speechMouthTarget(undefined, advance(0.04, 0.08))[1]!;
    assert.ok(strong > weak * 1.8, `${strong} should visibly contract to ${weak}`);
  }
});

test("loud vowels remain distinct and short consonant gaps close the mouth", () => {
  const { advance, meter, source } = setup();
  const medium = advance(0.18, 0.2);
  const loud = advance(0.35, 0.2);
  assert.ok(loud - medium > 0.12, "loud speech must not plateau");
  assert.equal(speechMouthTarget(undefined, advance(0, 0.075))[1], 0);
  assert.ok(advance(0.12, 0.05) > 0.3, "next syllable opens promptly");
  source.dispatchEvent(new Event("ended"));
  assert.equal(meter.read(), 0);
});

test("phonetic closures, quiet vowels and continuous fallback preserve their shape", () => {
  for (const level of [0.05, 0.2, 0.5, 0.85]) {
    assert.equal(speechMouthTarget("A", level)[1], 0);
    assert.equal(speechMouthTarget("X", level)[1], 0);
  }
  assert.ok(speechMouthTarget("D", 0.1)[1]! > 0);
  assert.ok(speechMouthTarget("D", 0.7)[1]! > speechMouthTarget("D", 0.3)[1]! * 1.5);
  assert.ok(Math.abs(speechMouthTarget(undefined, 0.501)[1]! - speechMouthTarget(undefined, 0.499)[1]!) < 0.1);
  assert.equal(speechMouthTarget(undefined, 0)[1], 0);
});

test("suspension, interruption and a new audio context discard old energy", () => {
  const { advance, meter, context } = setup();
  advance(0.3, 0.1);
  context.state = "suspended";
  assert.equal(meter.read(), 0);
  context.state = "running";
  advance(0.3, 0.1);
  meter.reset();
  assert.equal(meter.read(), 0);
  const next = { ...context, currentTime: 0 };
  const source = Object.assign(new EventTarget(), { context: next, connect() {} }) as unknown as AudioBufferSourceNode;
  meter.connect(source);
  assert.equal(meter.read(), 0);
});
