import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { avatarCuePackSchema } from "@edu/contracts";
import {
  chooseAvatarCue,
  chooseIdleMicroCue,
  getIdleBaselineCue,
  idleMicroDelayMs
} from "../src/features/study/study-utils.js";

test("Lanzhou ready manifest matches its immutable approved action pack", async () => {
  const root = process.cwd();
  const manifestPath = join(root, "public", "avatar", "lanzhou", "v1", "manifest.json");
  const manifest = avatarCuePackSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")) as unknown);
  const poster = await readFile(join(root, "public", manifest.poster.replace(/^\//u, "")));
  const posterHash = createHash("sha256").update(poster).digest("hex");
  const buffers = [poster];

  assert.equal(manifest.characterId, "lanzhou");
  assert.equal(manifest.characterVersion, "1.1.0");
  assert.equal(manifest.status, "ready");
  assert.equal(manifest.canvas.width, 720);
  assert.equal(manifest.canvas.height, 960);
  assert.equal(manifest.canvas.fps, 25);
  assert.equal(posterHash, manifest.posterSha256);
  assert.equal(manifest.clips.length, 11);

  for (const clip of manifest.clips) {
    const video = await readFile(join(root, "public", clip.src.replace(/^\//u, "")));
    const hash = createHash("sha256").update(video).digest("hex");
    assert.equal(hash, clip.sha256);
    assert.equal(clip.entryPose, "neutral");
    assert.equal(clip.exitPose, "neutral");
    buffers.push(video);
  }

  const contentHash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  assert.equal(manifest.contentHash, contentHash);
});

test("cue selection avoids an immediate repeat when another matching clip exists", () => {
  const clips = [
    { id: "talk-a", state: "speaking", src: "/a.mp4", durationMs: 2_000, loop: true, entryPose: "neutral", exitPose: "neutral", weight: 1, sha256: "a".repeat(64) },
    { id: "talk-b", state: "speaking", src: "/b.mp4", durationMs: 2_000, loop: true, entryPose: "neutral", exitPose: "neutral", weight: 1, sha256: "b".repeat(64) }
  ] as const;
  assert.equal(chooseAvatarCue(clips, "speaking", "talk-a")?.id, "talk-b");
  assert.equal(chooseAvatarCue(clips, "thinking"), undefined);
});

test("idle playback keeps a still baseline and schedules only sparse one-shot micro actions", () => {
  const clips = [
    { id: "idle-still", state: "idle", src: "/still.mp4", durationMs: 10_000, loop: false, entryPose: "neutral", exitPose: "neutral", weight: 1, sha256: "a".repeat(64) },
    { id: "idle-blink", state: "idle", src: "/blink.mp4", durationMs: 5_000, loop: false, entryPose: "neutral", exitPose: "neutral", weight: 2, sha256: "b".repeat(64) },
    { id: "idle-soft-smile", state: "idle", src: "/soft-smile.mp4", durationMs: 5_000, loop: false, entryPose: "neutral", exitPose: "neutral", weight: 1, sha256: "c".repeat(64) }
  ] as const;

  assert.equal(getIdleBaselineCue(clips)?.id, "idle-still");
  assert.equal(chooseIdleMicroCue(clips, undefined, () => 0)?.id, "idle-blink");
  assert.equal(chooseIdleMicroCue(clips, "idle-blink", () => 0)?.id, "idle-soft-smile");
  assert.equal(idleMicroDelayMs(() => 0), 35_000);
  assert.equal(idleMicroDelayMs(() => 1), 55_000);
});
