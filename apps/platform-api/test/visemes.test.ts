import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pcmWave, withSpeechVisemes } from "../src/study/visemes.js";
import type { StudyTtsChunk } from "../src/study/speech.js";

test("PCM WAV header describes unchanged mono audio", () => {
  const pcm = Buffer.from([1, 2, 3, 4]); const wave = pcmWave(pcm);
  assert.equal(wave.readUInt32LE(24), 24000); assert.equal(wave.readUInt32LE(40), 4);
  assert.deepEqual(wave.subarray(44), pcm);
});

test("optional analysis preserves exact PCM and bounds cue timestamps to each streamed block", async t => {
  const binary = process.env.EDU_RHUBARB_PATH || fileURLToPath(new URL("../../../.runtime/rhubarb/Rhubarb-Lip-Sync-1.14.0-Windows/rhubarb.exe", import.meta.url));
  if (!existsSync(binary)) { t.skip("optional Rhubarb runtime is not installed"); return; }
  const pcm = Buffer.alloc(24000 * 2 * 4);
  async function* input(): AsyncGenerator<StudyTtsChunk> {
    for (let offset = 0; offset < pcm.length; offset += 11000) yield { audioBase64: pcm.subarray(offset, offset + 11000).toString("base64"), sampleRate: 24000, channels: 1, format: "pcm_s16le" };
  }
  const chunks: StudyTtsChunk[] = [];
  for await (const chunk of withSpeechVisemes(input(), true)) chunks.push(chunk);
  assert.equal(chunks.length, 2);
  assert.deepEqual(Buffer.concat(chunks.map(chunk => Buffer.from(chunk.audioBase64, "base64"))), pcm);
  for (const chunk of chunks) {
    assert.ok(chunk.mouthCues?.length, "real CLI must return cues, not silently fall back");
    const duration = Buffer.from(chunk.audioBase64, "base64").length / 48000;
    for (const cue of chunk.mouthCues) { assert.ok(cue.start >= 0 && cue.end <= duration && cue.end > cue.start); assert.equal(cue.value, "X"); }
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(async () => { for await (const _ of withSpeechVisemes(input(), true, controller.signal)) {} }, { name: "AbortError" });
});
