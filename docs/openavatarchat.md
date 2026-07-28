# OpenAvatarChat 集成说明

## 组件边界

OpenAvatarChat 作为独立服务保存在 `components/openavatarchat`，主教学系统后续通过 HTTP/WebSocket 与它集成。这样可以独立升级数字人组件，也能避免把上游源码与课程、模拟器、教学评价代码混在一起。

当前固定的上游信息：

- 仓库：`https://github.com/HumanAIGC-Engineering/OpenAvatarChat.git`
- 分支：`main`
- 提交：`dcfba11e5bb582084a163359bb3ad996415977cf`
- 提交日期：2026-05-29
- 上游许可证：Apache-2.0

主仓库自身含多个递归子模块，包括 OpenAvatarChat-WebUI、LAM、LiteAvatar、MuseTalk、CosyVoice、Silero VAD、Smart Turn 与 SoulX-FlashHead。当前环境只安装了 LAM 与 LiteAvatar 两套预设所需的依赖和模型。

## 本机已验证状态

验证日期：2026-07-28。

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
| LAM 服务探测 | `/` = 307，`/ui/index.html` = 200，初始化接口 = 200 |

GPU 验证包含一次真实 CUDA 矩阵运算；LAM 验证包含 SenseVoice 与 LAM 权重加载、GPU 预热和 Uvicorn 服务启动。由于尚未配置用户的 `DASHSCOPE_API_KEY`，没有把云端 LLM/TTS 对话调用计为已验证。

## 运行配置

### LAM（默认）

```powershell
.\scripts\start-openavatarchat.ps1 -Profile lam
```

对应上游配置 `config/chat_with_lam.yaml`。LAM 在浏览器侧完成 3D 渲染，服务端主要生成表情驱动数据，适合后续多课堂或多会话场景。首次启动会有明显的模型导入和预热时间。

### LiteAvatar

```powershell
.\scripts\start-openavatarchat.ps1 -Profile liteavatar
```

对应上游配置 `config/chat_with_openai_compatible_bailian_cosyvoice.yaml`，已下载官方 `20250408/sample_data` 示例人物，配置中的 `use_gpu: true` 保持启用。

两个预设都使用本地 SenseVoice ASR，并默认调用 DashScope 的 Qwen 与 CosyVoice。密钥只放在根目录 `.env`，该文件已被 Git 忽略。

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
