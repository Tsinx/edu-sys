# OpenAvatarChat 集成说明

## 组件边界

OpenAvatarChat 作为独立服务保存在 `components/openavatarchat`，主教学系统通过
HTTP 探测其就绪配置、通过 WebSocket 建立课堂会话。教师端按需复用上游 WebUI
的 `AvatarHandler`、`Processor` 和 `LAMRenderer`，因此 Barbara 是真实 Gaussian
Splat WebGL 渲染，不是 iframe 截图、静态插画或自行模拟的动画。上游服务仍可独立
升级，课程、模拟器和教学评价代码不会混入其源码。

当前固定的上游信息：

- 仓库：`https://github.com/HumanAIGC-Engineering/OpenAvatarChat.git`
- 分支：`main`
- 提交：`dcfba11e5bb582084a163359bb3ad996415977cf`
- 提交日期：2026-05-29
- 上游许可证：Apache-2.0

主仓库自身含多个递归子模块，包括 OpenAvatarChat-WebUI、LAM、LiteAvatar、MuseTalk、CosyVoice、Silero VAD、Smart Turn 与 SoulX-FlashHead。当前环境只安装了 LAM 与 LiteAvatar 两套预设所需的依赖和模型。

## 本机已验证状态

验证日期：2026-07-29。

| 项目 | 结果 |
|---|---|
| GPU | NVIDIA GeForce RTX 3070 Laptop GPU，8 GB |
| NVIDIA 驱动 / CUDA 兼容层 | 610.74 / 13.3 |
| Python | 3.11.13 |
| PyTorch | 2.8.0+cu128 |
| `torch.cuda.is_available()` | `true` |
| ONNX Runtime | 1.20.2 |
| ONNX Providers | TensorRT、CUDA、CPU |
| LAM 冷启动预热 | 49.7 秒 |
| LAM 服务探测 | `/readiness` = 200，`/ui/index.html` = 200，初始化接口返回 `chat_mode=ws`、`avatar_type=lam` |
| 教师端资源 | `/download/lam_asset/barbara.zip` 经同源代理加载 |
| 教师端会话 | `/ws/session/:sessionId` 由课堂 LAM 适配器直连 |

GPU 验证包含一次真实 CUDA 矩阵运算；LAM 验证包含 SenseVoice 与 LAM 权重加载、
GPU 预热和 Uvicorn 服务启动。课堂页不会根据“计划状态”猜测服务可用性，而是通过
`GET /api/avatar/runtime/status` 返回离线、预热、就绪、配置不兼容或错误。

## 运行配置

### LAM（默认）

```powershell
.\scripts\start-openavatarchat.ps1 -Profile lam
```

对应项目配置 `config/chat_with_lam_edu_orchestrated.yaml`。该图只包含
`LamClient → VAD/百炼 ASR` 输入支路和 `AVATAR_TEXT → CosyVoice → LAM` 输出支路，
不加载 OpenAvatarChat 内置 LLM。LAM 在浏览器侧完成 3D 渲染，服务端生成语音和
表情驱动数据。首次启动仍会有明显的模型导入和预热时间。

课堂平台通过 WebSocket `SendAvatarText` 增量注入已提取的对白。这个消息生成同一
条可取消的 `AVATAR_TEXT` 流，并携带平台 `turn_id` 元数据；空的结束包只刷新 TTS，
不会向云端发送空文本。

启动脚本会在 `.runtime/openavatarchat/config` 生成运行时配置，默认把日志级别降为
`WARNING`。项目自有的 `scripts/run-openavatarchat.py` 会把同一等级应用到控制台和
文件 sink，并对形如 API key 的内容做最终脱敏；这修正了上游文件 sink 未继承日志
等级、可能把 handler 配置写入日志的问题。需要诊断时可显式传入 `-LogLevel INFO`，
但仍不得共享未经检查的日志文件。

### LiteAvatar

```powershell
.\scripts\start-openavatarchat.ps1 -Profile liteavatar
```

对应上游配置 `config/chat_with_openai_compatible_bailian_cosyvoice.yaml`，已下载官方 `20250408/sample_data` 示例人物，配置中的 `use_gpu: true` 保持启用。

LAM 课堂预设使用百炼 `fun-asr-realtime` 做领域语音终稿、CosyVoice 做 TTS，
平台 API 使用 OpenAI-compatible JSON 流模型（默认 DashScope `qwen-plus`）。
LiteAvatar 仍保留原上游一体化预设。密钥只放在根目录 `.env`，该文件已被 Git
忽略；平台服务启动时会读取同一文件。课堂 ASR 默认不落盘麦克风 PCM，ASR/TTS
日志只记录字符数而不记录师生原文。

## 本地生成内容

以下内容不会进入 Git：

- `components/openavatarchat/.venv`
- `components/openavatarchat/models`
- `components/openavatarchat/resource/avatar`
- `components/openavatarchat/logs`
- `.runtime/openavatarchat`
- 根目录 `.env`

Windows 上 `opuslib` 找不到系统级 `opus.dll`，但 PyAV wheel 已携带同一动态库。配置脚本会在 `.runtime/openavatarchat/bin` 创建一个本地别名，并在启动时加入进程 PATH；不会改系统目录。

## 更新上游

先确认上游变更与当前教学系统兼容，再更新固定提交：

```powershell
git -C components/openavatarchat fetch origin
git -C components/openavatarchat switch --detach origin/main
git -C components/openavatarchat submodule update --init --recursive --depth 1
git add components/openavatarchat
git commit -m "chore: update OpenAvatarChat"
```

更新后至少重新运行：

```powershell
.\scripts\setup-openavatarchat.ps1 -Profile both
.\scripts\test-openavatarchat-gpu.ps1
```
