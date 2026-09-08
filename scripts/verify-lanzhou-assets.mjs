import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const publicRoot = join(root, "apps", "teacher-web", "public");
const manifestPath = join(publicRoot, "avatar", "lanzhou", "v1", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];
const buffers = [];

function localPath(url) {
  if (typeof url !== "string" || !url.startsWith("/avatar/lanzhou/v1/")) {
    failures.push(`运行资源必须位于 /avatar/lanzhou/v1/：${String(url)}`);
    return null;
  }
  return join(publicRoot, ...url.slice(1).split("/"));
}

async function verifyHash(url, expected) {
  const path = localPath(url);
  if (!path) return 0;
  try {
    const buffer = await readFile(path);
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (actual !== expected) failures.push(`${basename(path)} SHA-256不匹配`);
    buffers.push(buffer);
    return (await stat(path)).size;
  } catch (error) {
    failures.push(`${url} 无法读取：${error.message}`);
    return 0;
  }
}

let totalBytes = await verifyHash(manifest.poster, manifest.posterSha256);
if (totalBytes > 4 * 1024 * 1024) failures.push("首屏海报超过4MB");

const requiredStates = new Set([
  "idle", "listening", "thinking", "speaking", "affirming", "goodbye"
]);
const availableStates = new Set();

for (const clip of manifest.clips ?? []) {
  availableStates.add(clip.state);
  const clipBytes = await verifyHash(clip.src, clip.sha256);
  totalBytes += clipBytes;
  if (!basename(clip.src).includes(clip.sha256.slice(0, 12))) {
    failures.push(`${clip.id} 文件名未包含内容哈希前12位`);
  }
  if (clip.entryPose !== "neutral" || clip.exitPose !== "neutral") {
    failures.push(`${clip.id} 没有声明中性首尾姿态`);
  }

  const clipPath = localPath(clip.src);
  if (!clipPath) continue;
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", clipPath],
    { encoding: "utf8" }
  );
  if (probe.status !== 0) {
    failures.push(`${clip.id} 无法通过ffprobe：${probe.stderr.trim()}`);
    continue;
  }
  const details = JSON.parse(probe.stdout);
  const video = details.streams?.find((stream) => stream.codec_type === "video");
  const audio = details.streams?.find((stream) => stream.codec_type === "audio");
  if (!video || video.codec_name !== "h264") failures.push(`${clip.id} 不是H.264视频`);
  if (video?.width !== 720 || video?.height !== 960) failures.push(`${clip.id} 不是720×960`);
  if (video?.pix_fmt !== "yuv420p") failures.push(`${clip.id} 不是yuv420p`);
  if (video?.avg_frame_rate !== "25/1") failures.push(`${clip.id} 不是25fps`);
  if (audio) failures.push(`${clip.id} 含有不应存在的音轨`);
}

if (manifest.status === "ready") {
  for (const state of requiredStates) {
    if (!availableStates.has(state)) failures.push(`ready动作包缺少 ${state} 状态`);
  }
  if ((manifest.clips ?? []).length < 10) failures.push("ready动作包少于约定的10个片段");
} else if ((manifest.clips ?? []).length > 0) {
  failures.push("preview清单不得发布尚未确认的动作片段");
}

if (totalBytes > 20 * 1024 * 1024) failures.push("完整运行资源超过20MB");
const contentHash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
if (contentHash !== manifest.contentHash) failures.push("动作包contentHash与运行文件不一致");

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS 澜舟${manifest.status}资源：${manifest.clips.length}段视频，${(totalBytes / 1024 / 1024).toFixed(2)}MB，哈希有效。\n`
  );
  if (manifest.status === "ready") {
    process.stdout.write("NOTE 首尾姿态、闪脸、手部和水印仍须完成人工逐段审看。\n");
  }
}
