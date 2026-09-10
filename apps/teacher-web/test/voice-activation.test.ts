import assert from "node:assert/strict";
import test from "node:test";
import { LocalKeywordRecording, cleanRecordedCommand } from "../src/features/classroom/local-keyword-recording";
import { encodeVoiceWav } from "../src/features/classroom/continuous-voice";

test("ordinary speech, finish and cancel cannot record without a local wake hit", () => {
  const gate = new LocalKeywordRecording(10);
  for (let i = 0; i < 1000; i++) assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "finish", start: i }], i * 1000), []);
});
test("local wake and end extract one recording, excluding preceding speech and end word", () => {
  const gate = new LocalKeywordRecording(10);
  gate.push(new Float32Array(10).fill(-1), [], 0);
  assert.deepEqual(gate.push(new Float32Array(10).fill(.2), [{ kind: "wake", start: 1 }], 1000), [{ type: "recording" }]);
  gate.push(new Float32Array(10).fill(.4), [], 2000);
  const events = gate.push(new Float32Array(10).fill(.8), [{ kind: "finish", start: 3 }], 3000);
  assert.equal(events[0]?.type, "audio");
  if (events[0]?.type === "audio") assert.deepEqual(events[0].samples, new Float32Array([...new Float32Array(10).fill(.2), ...new Float32Array(10).fill(.4)]));
  assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "finish", start: 4 }], 4000), []);
});
test("cancel discards the command and allows a fresh wake", () => {
  const gate = new LocalKeywordRecording(10);
  gate.push(new Float32Array(10), [{ kind: "wake", start: 0 }], 0);
  assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "cancel", start: 1 }], 1000), [{ type: "cancelled" }]);
  assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "finish", start: 2 }], 2000), []);
  assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "wake", start: 3 }], 3000), [{ type: "recording" }]);
});

test("a repeated wake cannot restart or truncate an active recording or extend its deadline", () => {
  const gate = new LocalKeywordRecording(10);
  gate.push(new Float32Array(10).fill(.1), [{ kind: "wake", start: 0 }], 0);
  assert.equal(gate.isRecording, true);
  assert.deepEqual(gate.push(new Float32Array(10).fill(.2), [{ kind: "wake", start: 1 }], 59_000), []);
  const audio = gate.finish(59_500);
  assert.equal(audio?.type, "audio");
  if (audio?.type === "audio") assert.equal(audio.samples.length, 20);
  assert.equal(gate.isRecording, false);
  const timeoutGate = new LocalKeywordRecording(10);
  timeoutGate.push(new Float32Array(10), [{ kind: "wake", start: 0 }], 0);
  timeoutGate.push(new Float32Array(10), [{ kind: "wake", start: 1 }], 59_000);
  assert.equal(timeoutGate.expire(60_000)?.type, "timeout");
});
test("60 second deadline cancels without audio arriving; late end cannot submit", () => {
  const gate = new LocalKeywordRecording(10);
  gate.push(new Float32Array(10), [{ kind: "wake", start: 0 }], 100);
  assert.equal(gate.expire(60100)?.type, "timeout");
  assert.deepEqual(gate.push(new Float32Array(10), [{ kind: "finish", start: 1 }], 61000), []);
});
test("sample duration bounds recording even if wall clock moves backward", () => {
  const gate = new LocalKeywordRecording(10);
  gate.push(new Float32Array(10), [{ kind: "wake", start: 0 }], 100);
  assert.equal(gate.push(new Float32Array(600), [], 0)[0]?.type, "timeout");
});
test("same-frame wake and end support delayed timestamps", () => {
  const gate = new LocalKeywordRecording(10);
  const events = gate.push(new Float32Array(30), [{ kind: "wake", start: .2 }, { kind: "finish", start: 2 }], 0);
  assert.equal(events[1]?.type, "audio");
  if (events[1]?.type === "audio") assert.equal(events[1].samples.length, 18);
});
test("ASR cleanup preserves math punctuation and does not require keyword recognition", () => {
  assert.equal(cleanRecordedCommand("助教，你好！解释 x=-1.5，谢谢助教。"), "解释 x=-1.5");
  assert.equal(cleanRecordedCommand("解释 x=-1.5"), "解释 x=-1.5");
  assert.equal(cleanRecordedCommand("蓝舟你好，请进入第二讲。"), "请进入第二讲。");
  assert.equal(cleanRecordedCommand("助教你好。"), "");
  assert.equal(cleanRecordedCommand("你好助手，请解释港口的作用，非常感谢。"), "请解释港口的作用");
  assert.equal(cleanRecordedCommand("你好，小助手，请解释 x=-1.5，非常感谢。"), "请解释 x=-1.5");
  assert.equal(cleanRecordedCommand("你好！小助手，非常感谢。"), "");
  assert.equal(cleanRecordedCommand("助教你好，请解释 x=-1.5，非常感谢。"), "请解释 x=-1.5");
  assert.equal(cleanRecordedCommand("助教你好，非常，感谢！"), "");
  assert.equal(cleanRecordedCommand("助教你好，请解释港口的作用，谢谢。"), "请解释港口的作用");
  assert.equal(cleanRecordedCommand("小麦老师，请翻到下一页，谢谢。"), "请翻到下一页");
  assert.equal(cleanRecordedCommand("小麦老师，谢谢，我再补充一点，请小麦老师解释港口，非常感谢。"), "谢谢，我再补充一点，请小麦老师解释港口");
  assert.equal(cleanRecordedCommand("请小麦老师解释港口，谢谢。"), "请小麦老师解释港口");
});
test("WAV is mono 16kHz PCM with correct clipping", () => {
  const encoded = encodeVoiceWav(new Float32Array([-2, 0, 2]), 16000);
  const bytes = Buffer.from(encoded.audioBase64, "base64");
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.readUInt32LE(24), 16000);
  assert.equal(bytes.readUInt16LE(22), 1);
  assert.equal(bytes.readInt16LE(44), -32768);
  assert.equal(bytes.readInt16LE(48), 32767);
});

test("manual and keyword starts share cancellation and exactly-once completion", () => {
  for (const manual of [true, false]) {
    const gate = new LocalKeywordRecording(10);
    if (manual) assert.equal(gate.begin(0)?.type, "recording");
    gate.push(new Float32Array(10).fill(.4), manual ? [] : [{ kind: "wake", start: 0 }], 0);
    assert.equal(gate.begin(10), undefined);
    assert.equal(gate.cancel()?.type, "cancelled");
    assert.equal(gate.finish(20), undefined);
    assert.equal(gate.begin(30)?.type, "recording");
    gate.push(new Float32Array(10).fill(.8), [], 40);
    const audio = gate.finish(50);
    assert.equal(audio?.type, "audio");
    if (audio?.type === "audio") assert.deepEqual(audio.samples, new Float32Array(10).fill(.8));
    assert.equal(gate.finish(60), undefined);
    assert.equal(gate.begin(70), undefined);
  }
});

test("manual finish at the deadline cancels instead of uploading", () => {
  const gate = new LocalKeywordRecording(10);
  gate.begin(0);
  gate.push(new Float32Array(10), [], 1);
  assert.equal(gate.finish(60_000)?.type, "timeout");
  assert.equal(gate.finish(60_001), undefined);
});
