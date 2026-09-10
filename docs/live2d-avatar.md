# Live2D 数字人

2026-09-10 接入。首个角色为 Live2D 官方 Haru 示例模型，按本项目个人自用需求配置。

## 使用

刷新教师课堂或港口管理课下学习页面。首次默认使用 Live2D · Haru；教师课堂右侧小麦老师名称下方的下拉框可切换 Live2D、澜舟视频或 LAM · Barbara。学生页支持 Live2D 和视频。选择保存在当前浏览器；校园模式不提供 LAM 服务选项。全屏时退出全屏后可切换形象。

继续使用已有的检测输入、按键输入和文字输入。切换形象会中断当前讲解。Live2D 无需启动 OpenAvatarChat，但在线问答、ASR 和 TTS 仍使用平台配置的服务。停止/打断会清空音频并关闭口型。收起数字人继续保留现有语音会话。

画面左下角提供“胸像 / 头像”取景切换，默认胸像。取景偏好在当前浏览器保存，切换不会重新加载模型或打断语音。采用完整模型的实时裁切，无需另外制作头像素材；肩部、上胸部或下方身体随取景裁切。

## 结构

- `features/avatar/Live2DAvatarPlayer.tsx`：独立 WebGL 画布、胸像/头像取景、状态动作和口型、失败回退与重试。手臂使用 Haru 的收拢姿态，完整模型的腿部不进入构图。
- `features/avatar/natural-motion.ts`：安静的略带侧倾站姿、低幅呼吸、不等间隔眨眼、稀疏视线变化；聆听、思考和完成状态采用约 0.45 秒时间常数的平滑过渡。减少动态效果时保留静态站姿及说话口型。
- `features/avatar/SpeechMeter.ts`：TTS AudioBufferSource → 独立 AnalyserNode → 扬声器。嘴部从实际播放信号提取 RMS，经门限与平滑处理；不读取麦克风，不按网络分片到达时刻直接张嘴。
- `campus/BrowserAvatarSurface.tsx`：复用现有课堂 ASR/TTS 端点、文字与字幕链路；取消旧请求时隔离迟到回调。只有选择 LAM 才走原有 LAM 分支与状态轮询。
- `features/avatar/avatar-preference.ts`：本浏览器的显示偏好，和服务端部署 profile 分离。向现有课堂协议报告 `browser` 或 `lam`，不把 Live2D 误报成需要 GPU 推理的 LAM。
- `StudentStudyPage.tsx`：复用学生流式语音播放队列，使用同一个音轨分析器。

角色仍采用音量口型，不是逐音素/汉语韵母口型。课堂浏览器分支沿用收到整段回答后发起 TTS 的行为，TTS 返回后分片排队播放；本次没有改造成 LLM 按句并行合成。

## 模型与许可

运行库和资源在 `apps/teacher-web/public/avatar/live2d/`，约 4.5 MB，全部本地加载。Core 与 Haru 来自官方 `CubismSdkForWeb-4-r.7.zip`，原文件未改写。`assets.json` 记录来源、文件尺寸与 SHA-256；`NOTICE.txt`、`SDK-LICENSE.txt`、`CORE-LICENSE.txt` 保存版权说明和协议链接，角色右下角可查看。

渲染适配器固定为 `pixi-live2d-display@0.4.0`、`pixi.js@6.5.10`。仅本次 Cubism 4 Core + Haru 组合得到验证；不能据此承诺任意 Cubism 5 模型兼容。新增模型需保留许可证并验证模型参数、纹理、动作和运行库版本。青栀 SVG 并未被转换成 Live2D。

离线清单把 Live2D 运行库和模型归入数字人资源组，并支持缓存 `.moc3`。下载数字人资源后可本地渲染；这不等于离线 ASR、LLM 或 TTS。

## 验证与证据

- `pnpm avatar:live2d:verify`：51 个文件校验和，25 条模型资源引用。
- `pnpm avatar:live2d:test`：真实 Core/模型渲染；确定性 PCM 音轨的开口、静音闭口、中断；播放中切换、折叠、全屏、390px、偏好持久化；TTS 故障、模型缺失与重试；减少动态效果、WebGL context loss 恢复。使用 Playwright 软件 WebGL；默认读取本机 Codex 的 Playwright，可用 `EDU_PLAYWRIGHT_ENTRY` 指向其他安装位置。
- `node scripts/verify-live2d-classroom.mjs`：真实教师课堂和学生自学页面的桌面、窄屏、全屏布局。要求本地服务和现有进行中课堂。设置 `EDU_LIVE_SPEECH_QA=1` 会向当前课堂发送一句港口问题，调用真实问答/TTS 并留下该轮课堂记录。
- 本次在线课堂验证返回 HTTP 200、25 个 PCM 分片、461872 字节音频；实际模型嘴部参数峰值约 0.482。没有模拟在线 TTS 响应。
- `pnpm test`（包含学生文案审查、上下文与共享 DOM 测试）、`pnpm build`（包含全工作区类型检查）、`git diff --check`。

截图与浏览器报告：`output/live2d-qa/`。浏览器验证证明播放管线和模型参数变化；未测量实体扬声器的声画延迟、真实教室麦克风效果或低配置投影电脑性能，也未进行长时间稳定性测试。
