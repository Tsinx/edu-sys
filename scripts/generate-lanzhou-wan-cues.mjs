import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";

try {
  loadEnvFile(join(process.cwd(), ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const ACTIONS = [
  {
    id: "idle-still",
    state: "idle",
    loop: false,
    duration: 10,
    seed: 314160,
    weight: 1,
    motion: "十秒内保持几乎完全静止的中性待命姿态，头部、肩部和视线方向都不改变，只保留难以察觉的自然呼吸，并在不固定的时点自然眨眼一到两次"
  },
  {
    id: "idle-blink",
    state: "idle",
    loop: false,
    duration: 5,
    seed: 271829,
    weight: 2,
    motion: "全程保持正面中性姿态、固定视线和固定肩部，只在中段自然眨眼一次，不转头、不侧目、不点头"
  },
  {
    id: "idle-soft-smile",
    state: "idle",
    loop: false,
    duration: 5,
    seed: 271833,
    weight: 0.5,
    motion: "头部、肩部和视线方向全程固定，嘴唇始终闭合，只让嘴角出现一次几乎不可察觉的温和微笑并恢复中性，不转头、不低头、不张嘴、不说话"
  },
  {
    id: "listening",
    state: "listening",
    loop: true,
    duration: 5,
    seed: 161803,
    motion: "专注倾听学生提问，轻微前倾并保持温和眼神，中段极轻地点头一次，最后恢复中性正面姿态"
  },
  {
    id: "thinking",
    state: "thinking",
    loop: true,
    duration: 5,
    seed: 141421,
    motion: "安静思考，目光短暂略向下并自然回到镜头，眉眼有很轻的思索变化，不摸脸、不做夸张手势"
  },
  {
    id: "speaking-calm-a",
    state: "speaking",
    loop: true,
    duration: 5,
    seed: 173205,
    motion: "像大学助教一样平静讲解，嘴部做自然连续但不对应具体语句的说话动作，轻微点头，肩部稳定"
  },
  {
    id: "speaking-calm-b",
    state: "speaking",
    loop: true,
    duration: 5,
    seed: 223606,
    motion: "自然讲解另一段内容，嘴部有克制的说话动作，头部有一次很小的侧向强调后回正，保持专业亲和"
  },
  {
    id: "speaking-emphasis",
    state: "speaking",
    loop: true,
    duration: 5,
    seed: 244949,
    motion: "讲到重点时略微抬眉并做一次小幅度开放手势，嘴部持续自然说话，随后收回手并恢复中性姿态"
  },
  {
    id: "nod",
    state: "affirming",
    loop: false,
    duration: 5,
    seed: 264575,
    motion: "先保持中性姿态，清晰但克制地点头一次表示确认，露出很轻的认可表情，再回到中性正面姿态"
  },
  {
    id: "encourage",
    state: "affirming",
    loop: false,
    duration: 5,
    seed: 282842,
    motion: "温和鼓励学生，露出自然浅笑并轻轻点头，做一次幅度很小的掌心向上手势，最后回到中性姿态"
  },
  {
    id: "goodbye",
    state: "goodbye",
    loop: false,
    duration: 5,
    seed: 316227,
    motion: "结束学习时自然浅笑，右手在胸像安全范围内做一次克制的告别手势，然后放下并回到中性姿态"
  }
];

const COMMON_PROMPT =
  "严格保持参考图片中同一位虚构中国女性港航助教的脸型、五官、发型、年龄、深海军蓝外套、米白内搭、青绿色细节、港口控制室背景、柔和侧光和正面胸像构图。固定相机、固定焦距、固定背景、单一连续镜头，人物始终位于相同位置。视频开头至少0.6秒为中性姿态，结尾至少0.8秒回到与开头一致的中性姿态。无对白、无声音、无文字、无字幕、无标识、无水印。动作自然、专业、亲和，避免主播感和表演感。";
const NEGATIVE_PROMPT =
  "换脸，脸型变化，年龄变化，发型变化，服装变化，背景变化，镜头运动，推拉摇移，抖动，变焦，画面切换，新增人物，多余手指，手部畸形，手遮挡面部，夸张表情，夸张手势，身体离开画面，主播，直播，船长帽，制服cosplay，耳麦，文字，字幕，标志，水印，低清晰度，闪烁，闪脸";

const root = process.cwd();
const artifactsRoot = join(root, "artifacts", "avatar", "lanzhou");
const referencePath = join(artifactsRoot, "candidates", "lanzhou-candidate-b.png");
const productionRoot = join(artifactsRoot, "production");
const mastersRoot = join(productionRoot, "masters");
const processedRoot = join(productionRoot, "processed");
const receiptPath = join(productionRoot, "wan-tasks.json");
const runtimeRoot = join(root, "apps", "teacher-web", "public", "avatar", "lanzhou", "v1");
const manifestPath = join(runtimeRoot, "manifest.json");

const apiKey = process.env.DASHSCOPE_API_KEY;
const apiBase = (process.env.EDU_WAN_API_BASE ?? "https://dashscope.aliyuncs.com/api/v1").replace(/\/+$/u, "");
const model = process.env.EDU_WAN_MODEL ?? "wan2.7-r2v-2026-06-12";
const selectedIds = new Set(
  (process.argv.find((value) => value.startsWith("--only="))?.slice(7) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const selectedActions = selectedIds.size > 0
  ? ACTIONS.filter((action) => selectedIds.has(action.id))
  : ACTIONS;
const shouldReencode = process.argv.includes("--reencode");

if (selectedActions.length === 0) throw new Error("--only没有匹配任何动作ID");

await mkdir(mastersRoot, { recursive: true });
await mkdir(processedRoot, { recursive: true });
await mkdir(runtimeRoot, { recursive: true });

async function readReceipt() {
  try {
    return JSON.parse(await readFile(receiptPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      schema: "edu.avatar.wan-production",
      version: "1.0",
      characterId: "lanzhou",
      selectedCandidate: "B",
      referencePath: "artifacts/avatar/lanzhou/candidates/lanzhou-candidate-b.png",
      model,
      apiBase,
      createdAt: new Date().toISOString(),
      tasks: {}
    };
  }
}

async function saveReceipt(receipt) {
  receipt.updatedAt = new Date().toISOString();
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { message: raw.slice(0, 800) }; }
  if (!response.ok) {
    throw new Error(`万相API请求失败（${response.status}）：${payload.message ?? payload.code ?? "未知错误"}`);
  }
  return payload;
}

async function submit() {
  if (!process.argv.includes("--confirm-cost")) {
    throw new Error("提交万相任务会产生费用；请显式添加 --confirm-cost");
  }
  if (!apiKey) throw new Error("缺少DASHSCOPE_API_KEY");
  const reference = await readFile(referencePath);
  const dataUrl = `data:image/png;base64,${reference.toString("base64")}`;
  const receipt = await readReceipt();

  for (const action of selectedActions) {
    const existing = receipt.tasks[action.id];
    if (existing?.taskId && !["FAILED", "CANCELED", "UNKNOWN"].includes(existing.status)) {
      process.stdout.write(`SKIP ${action.id} 已有任务 ${existing.status}\n`);
      continue;
    }
    const payload = await requestJson(
      `${apiBase}/services/aigc/video-generation/video-synthesis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify({
          model,
          input: {
            prompt: `${COMMON_PROMPT}${action.motion}。`,
            negative_prompt: NEGATIVE_PROMPT,
            media: [{ type: "reference_image", url: dataUrl }]
          },
          parameters: {
            resolution: "720P",
            ratio: "3:4",
            duration: action.duration,
            prompt_extend: false,
            watermark: false,
            seed: action.seed
          }
        })
      }
    );
    const taskId = payload.output?.task_id;
    if (typeof taskId !== "string") throw new Error(`${action.id}未返回task_id`);
    receipt.tasks[action.id] = {
      id: action.id,
      state: action.state,
      loop: action.loop,
      seed: action.seed,
      duration: action.duration,
      taskId,
      requestId: payload.request_id,
      status: payload.output?.task_status ?? "PENDING",
      submittedAt: new Date().toISOString()
    };
    await saveReceipt(receipt);
    process.stdout.write(`SUBMITTED ${action.id} ${taskId}\n`);
  }
}

async function pollOnce() {
  if (!apiKey) throw new Error("缺少DASHSCOPE_API_KEY");
  const receipt = await readReceipt();
  for (const action of selectedActions) {
    const task = receipt.tasks[action.id];
    if (!task?.taskId || ["SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"].includes(task.status)) continue;
    const payload = await requestJson(`${apiBase}/tasks/${task.taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    task.status = payload.output?.task_status ?? "UNKNOWN";
    task.code = payload.output?.code;
    task.message = payload.output?.message;
    task.videoUrl = payload.output?.video_url;
    task.usage = payload.usage;
    task.polledAt = new Date().toISOString();
    process.stdout.write(`STATUS ${action.id} ${task.status}\n`);
  }
  await saveReceipt(receipt);
  return receipt;
}

async function downloadAndEncode(action, task) {
  if (task.runtime?.sha256 && !shouldReencode) return;
  if (typeof task.videoUrl !== "string") throw new Error(`${action.id}成功但缺少video_url`);
  const sourcePath = join(mastersRoot, `${action.id}.source.mp4`);
  try {
    await stat(sourcePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const sourceResponse = await fetch(task.videoUrl);
    if (!sourceResponse.ok) throw new Error(`${action.id}下载失败：${sourceResponse.status}`);
    await writeFile(sourcePath, Buffer.from(await sourceResponse.arrayBuffer()));
  }

  const temporaryPath = join(processedRoot, `${action.id}.tmp.mp4`);
  const encodedPath = join(processedRoot, `${action.id}.mp4`);
  const ffmpeg = spawnSync("ffmpeg", [
    "-y", "-i", sourcePath, "-an",
    "-vf", "scale=720:960:force_original_aspect_ratio=increase,crop=720:960,fps=25",
    "-c:v", "libx264", "-preset", "medium", "-crf", "24",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", temporaryPath
  ], { encoding: "utf8" });
  if (ffmpeg.status !== 0) throw new Error(`${action.id} FFmpeg失败：${ffmpeg.stderr.slice(-1200)}`);

  await rm(encodedPath, { force: true });
  if (action.id === "goodbye") {
    const returnPath = join(processedRoot, `${action.id}.return.tmp.mp4`);
    const returnToNeutral = spawnSync("ffmpeg", [
      "-y", "-i", temporaryPath, "-an",
      "-filter_complex",
      "[0:v]split=2[fwd][revsrc];[fwd]trim=start=0:end=3.5,setpts=PTS-STARTPTS[a];[revsrc]trim=start=2:end=3.5,setpts=PTS-STARTPTS,reverse[b];[a][b]concat=n=2:v=1:a=0,fps=25,scale=720:960,format=yuv420p[out]",
      "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "24",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", returnPath
    ], { encoding: "utf8" });
    if (returnToNeutral.status !== 0) {
      throw new Error(`${action.id} 回位剪辑失败：${returnToNeutral.stderr.slice(-1200)}`);
    }
    await rm(temporaryPath, { force: true });
    await rename(returnPath, encodedPath);
  } else {
    await rename(temporaryPath, encodedPath);
  }

  const buffer = await readFile(encodedPath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const runtimeName = `${action.id}.${sha256.slice(0, 12)}.mp4`;
  const runtimePath = join(runtimeRoot, runtimeName);
  await copyFile(encodedPath, runtimePath);
  const probe = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "json", runtimePath
  ], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`${action.id} ffprobe失败`);
  const durationMs = Math.round(Number(JSON.parse(probe.stdout).format?.duration ?? action.duration) * 1000);
  task.runtime = {
    src: `/avatar/lanzhou/v1/${runtimeName}`,
    sha256,
    durationMs,
    bytes: (await stat(runtimePath)).size,
    encodedAt: new Date().toISOString()
  };
  process.stdout.write(`ENCODED ${action.id} ${runtimeName}\n`);
}

async function collect(receipt) {
  for (const action of selectedActions) {
    const task = receipt.tasks[action.id];
    if (task?.status === "SUCCEEDED") await downloadAndEncode(action, task);
  }
  await saveReceipt(receipt);
  await publishManifestIfComplete(receipt);
}

async function publishManifestIfComplete(receipt) {
  const complete = ACTIONS.every((action) => receipt.tasks[action.id]?.runtime?.sha256);
  if (!complete) {
    const count = ACTIONS.filter((action) => receipt.tasks[action.id]?.runtime?.sha256).length;
    process.stdout.write(`PREVIEW ${count}/${ACTIONS.length} 动作已经编码，完整后才发布ready清单\n`);
    return;
  }
  const currentManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const posterPath = join(root, "apps", "teacher-web", "public", currentManifest.poster.slice(1));
  const buffers = [await readFile(posterPath)];
  const clips = [];
  for (const action of ACTIONS) {
    const runtime = receipt.tasks[action.id].runtime;
    buffers.push(await readFile(join(root, "apps", "teacher-web", "public", runtime.src.slice(1))));
    clips.push({
      id: action.id,
      state: action.state,
      src: runtime.src,
      durationMs: runtime.durationMs,
      loop: action.loop,
      entryPose: "neutral",
      exitPose: "neutral",
      weight: action.weight ?? (action.id === "speaking-emphasis" ? 0.55 : 1),
      sha256: runtime.sha256
    });
  }
  const manifest = {
    ...currentManifest,
    characterVersion: "1.1.0",
    status: "ready",
    clips,
    contentHash: createHash("sha256").update(Buffer.concat(buffers)).digest("hex"),
    disclosure: "澜舟是独立设计的AI课程助教形象；动作视频为AI教学复原素材，不承诺逐音素口型同步，准确内容以字幕与课程资料为准。"
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`READY ${ACTIONS.length}段动作已写入不可变清单\n`);
}

async function waitForTasks() {
  const deadline = Date.now() + 25 * 60_000;
  while (Date.now() < deadline) {
    const receipt = await pollOnce();
    const tasks = selectedActions.map((action) => receipt.tasks[action.id]).filter(Boolean);
    const terminal = tasks.length === selectedActions.length && tasks.every((task) =>
      ["SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"].includes(task.status)
    );
    if (terminal) {
      await collect(receipt);
      const failed = tasks.filter((task) => task.status !== "SUCCEEDED");
      if (failed.length > 0) {
        throw new Error(`万相任务未全部成功：${failed.map((task) => `${task.id}:${task.status}:${task.message ?? ""}`).join(", ")}`);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error("等待万相任务超过25分钟；任务回执已保存，可稍后继续 --wait");
}

if (process.argv.includes("--submit")) await submit();
if (process.argv.includes("--poll")) await pollOnce();
if (process.argv.includes("--collect")) await collect(await readReceipt());
if (process.argv.includes("--wait")) await waitForTasks();
if (!["--submit", "--poll", "--collect", "--wait"].some((flag) => process.argv.includes(flag))) {
  process.stdout.write("用法：pnpm avatar:wan -- --submit --confirm-cost [--only=idle-neutral]\n");
  process.stdout.write("      pnpm avatar:wan -- --wait [--only=idle-neutral]\n");
}
