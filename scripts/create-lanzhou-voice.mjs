import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(join(process.cwd(), ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (!process.argv.includes("--confirm-cost")) {
  process.stderr.write(
    "此命令会创建计费音色。确认外观与音色描述后，请使用 pnpm avatar:create-voice -- --confirm-cost\n"
  );
  process.exit(2);
}

const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) throw new Error("缺少 DASHSCOPE_API_KEY");

const targetModel =
  process.env.EDU_SELFSTUDY_TTS_MODEL ??
  "qwen3-tts-vd-realtime-2026-01-15";
const endpoint =
  process.env.EDU_SELFSTUDY_VOICE_DESIGN_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization";
const voicePrompt =
  "知性、清澈、略温暖的普通话青年女声，吐字准确，语速中等略慢，适合大学港航课程；避免直播腔、过度甜美和夸张播音腔。";
const previewText =
  "你好，我是澜舟。海运把遥远的市场连接起来，而港口让这种低成本运输成为可重复的能力。";

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "qwen-voice-design",
    input: {
      action: "create",
      target_model: targetModel,
      preferred_name: "lanzhou",
      voice_prompt: voicePrompt,
      preview_text: previewText,
      language: "zh"
    },
    parameters: { sample_rate: 24_000, response_format: "wav" }
  })
});

if (!response.ok) {
  throw new Error(`声音设计失败（${response.status}）：${(await response.text()).slice(0, 800)}`);
}

const payload = await response.json();
const voiceId = payload.output?.voice;
const preview = payload.output?.preview_audio?.data;
if (typeof voiceId !== "string" || typeof preview !== "string") {
  throw new Error("声音设计响应缺少 output.voice 或 preview_audio.data");
}

const outputDirectory = join(
  process.cwd(),
  "artifacts",
  "avatar",
  "lanzhou",
  "voice"
);
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "lanzhou-preview.wav"), Buffer.from(preview, "base64"));
await writeFile(
  join(outputDirectory, "voice-receipt.json"),
  `${JSON.stringify({
    createdAt: new Date().toISOString(),
    requestId: payload.request_id,
    targetModel,
    voiceId,
    voicePrompt,
    previewText
  }, null, 2)}\n`
);

process.stdout.write("澜舟音色预览已保存到 artifacts/avatar/lanzhou/voice/lanzhou-preview.wav\n");
process.stdout.write(`请审核试听后设置：EDU_SELFSTUDY_TTS_VOICE_ID=${voiceId}\n`);
