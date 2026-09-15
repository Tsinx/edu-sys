import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpeechVisemeCue } from "@edu/contracts";
import type { StudyTtsChunk } from "./speech.js";

const bundled = fileURLToPath(new URL("../../../../.runtime/rhubarb/Rhubarb-Lip-Sync-1.14.0-Windows/rhubarb.exe", import.meta.url));
let active = 0;
const rate = 24_000;
const blockBytes = rate * 2 * 3;
const contextBytes = rate * 2 * 0.16;

export function pcmWave(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function recognizeVisemes(pcm: Buffer, signal?: AbortSignal): Promise<SpeechVisemeCue[] | undefined> {
  const executable = process.env.EDU_RHUBARB_PATH || bundled;
  if (!existsSync(executable) || active >= 2) return undefined;
  signal?.throwIfAborted();
  active += 1;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), "edu-visemes-"));
    const wave = join(directory, "speech.wav");
    const resultFile = join(directory, "mouth.json");
    await writeFile(wave, pcmWave(pcm));
    await new Promise<void>((resolve, reject) => {
      execFile(executable, ["-r", "phonetic", "-f", "json", "--threads", "2", "-q", "-o", resultFile, wave],
        { timeout: 2500, maxBuffer: 512 * 1024, windowsHide: true, signal },
        error => error ? reject(error) : resolve());
    });
    const output = await readFile(resultFile, "utf8");
    const result = JSON.parse(output) as { mouthCues?: SpeechVisemeCue[] };
    const duration = pcm.length / (rate * 2);
    return result.mouthCues?.filter(cue => /^[A-HX]$/u.test(cue.value) && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 && cue.end > cue.start && cue.end <= duration + 0.02);
  } catch {
    signal?.throwIfAborted();
    // Lip analysis must never suppress or fail the spoken answer.
    return undefined;
  } finally {
    active -= 1;
    if (directory && dirname(resolve(directory)) === resolve(tmpdir()) && basename(directory).startsWith("edu-visemes-")) {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

/** Small audio windows, with context at both edges. Cue times are relative to each emitted PCM block. */
export async function* withSpeechVisemes(chunks: AsyncIterable<StudyTtsChunk>, enabled: boolean | undefined, signal?: AbortSignal): AsyncIterable<StudyTtsChunk> {
  if (!enabled || !existsSync(process.env.EDU_RHUBARB_PATH || bundled)) { yield* chunks; return; }
  let pending = Buffer.alloc(0);
  let preceding = Buffer.alloc(0);
  const emit = async (size: number): Promise<StudyTtsChunk> => {
    signal?.throwIfAborted();
    const pcm = pending.subarray(0, size);
    const offset = preceding.length / (rate * 2);
    const duration = pcm.length / (rate * 2);
    const analyzed = await recognizeVisemes(Buffer.concat([preceding, pending.subarray(0, size + contextBytes)]), signal);
    const mouthCues = analyzed?.map(cue => ({ start: Math.max(0, cue.start - offset), end: Math.min(duration, cue.end - offset), value: cue.value })).filter(cue => cue.end > cue.start);
    preceding = Buffer.from(pcm.subarray(Math.max(0, pcm.length - contextBytes)));
    pending = pending.subarray(size);
    return { audioBase64: pcm.toString("base64"), sampleRate: rate, channels: 1, format: "pcm_s16le", mouthCues };
  };
  for await (const chunk of chunks) {
    signal?.throwIfAborted();
    pending = Buffer.concat([pending, Buffer.from(chunk.audioBase64, "base64")]);
    while (pending.length >= blockBytes + contextBytes) yield await emit(blockBytes);
  }
  if (pending.length) yield await emit(pending.length);
}
