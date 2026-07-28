# edu-sys

面向完整教学流程的模块化系统，规划覆盖课堂 Slides、自研模拟软件、教学管理、学习评价与数字人交互。

## 当前已接入

- `components/openavatarchat`：官方 OpenAvatarChat Git 子模块，包含 WebUI、LAM、LiteAvatar 及其递归依赖。
- Python 3.11 隔离环境：`components/openavatarchat/.venv`。
- GPU 栈：PyTorch 2.8 + CUDA 12.8、ONNX Runtime GPU。
- 本地模型：LAM、LiteAvatar、SenseVoice 与 LiteAvatar 示例人物。
- Windows 启动、自检与重建脚本：`scripts/`。

第三方源码、虚拟环境和模型彼此分离：主项目只记录 OpenAvatarChat 的固定提交，不把数 GB 的环境与模型写入本仓库。

## 立即运行

先配置云端 LLM/TTS 所需的密钥：

```powershell
Copy-Item .env.example .env
notepad .env
```

启动默认的 LAM 数字人：

```powershell
.\scripts\start-openavatarchat.ps1 -Profile lam
```

浏览器访问 `http://127.0.0.1:8282/`。如需切换到 LiteAvatar：

```powershell
.\scripts\start-openavatarchat.ps1 -Profile liteavatar
```

检查 GPU、ONNX Runtime、Opus 与模型文件：

```powershell
.\scripts\test-openavatarchat-gpu.ps1
```

## 在新机器上重建

克隆本项目时先取回子模块，再运行一键配置：

```powershell
git clone --recurse-submodules <本项目仓库地址>
cd edu-sys
.\scripts\setup-openavatarchat.ps1 -Profile both
```

详细的组件边界、已验证状态和维护方式见 [OpenAvatarChat 集成说明](docs/openavatarchat.md)。
