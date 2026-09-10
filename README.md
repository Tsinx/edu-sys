# edu-sys

面向完整教学流程的模块化系统，规划覆盖课堂 Slides、自研模拟软件、教学管理、学习评价与数字人交互。

## 校园单 PC 部署（当前默认生产架构）

生产模式采用 HTTPS 入口、一个 Node API 进程和本机 SQLite。师生浏览器运行仿真、课件与轻量数字人，缓存课程资源并保存个人存档；校园服务器处理账号、课堂记录、同步及服务商 API 代理。服务器无需 GPU 或 OpenAvatarChat 运行环境。

```powershell
pnpm install --frozen-lockfile
pnpm build:campus
```

运行包生成在 `output/campus-server-*`，包含编译后的服务端、网页、运行依赖锁文件、账号工具和配置示例。部署机器只需安装运行依赖，无需复制源码或子模块。详见 [当前架构](docs/architecture.md) 与 [服务器部署及验收说明](docs/campus-deployment.md)。下方 `pnpm dev` 和 OpenAvatarChat 章节属于开发/增强模式，不是校园服务器部署步骤。

## 当前已接入

- `apps/teacher-web`：可交互的教师系统入口，包含课程、课堂、模拟实验、教学评价、资源中心与个人设置路由。
- `apps/teacher-web/src/features/classroom`：独立课堂教学子系统，包含固定 16:10 Slides 运行时、真实心跳在线人数、课堂活动切换、手动语音/文字指令和 OpenAvatarChat LAM/Barbara 渲染。
- `apps/platform-api`：教师、课程、课堂运行状态、账号和 AI 代理；校园模式使用 SQLite，开发模式保留 JSON 适配器。
- `packages/contracts`：前后端共享的 Zod 运行时契约与 TypeScript 类型。
- 平台课堂助手：模型返回结构化 JSON 流，服务端实时只提取 `dialogue`，完整校验后才执行 `edu.classroom.control/1.0` 白名单动作。
- `components/openavatarchat`：官方 OpenAvatarChat Git 子模块，包含 WebUI、LAM、LiteAvatar 及其递归依赖。
- Python 3.11 隔离环境：`components/openavatarchat/.venv`。
- GPU 栈：PyTorch 2.8 + CUDA 12.8、ONNX Runtime GPU。
- 本地模型：LAM、LiteAvatar、SenseVoice 与 LiteAvatar 示例人物。
- Windows 启动、自检与重建脚本：`scripts/`。

第三方源码、虚拟环境和模型彼此分离：主项目只记录 OpenAvatarChat 的固定提交，不把数 GB 的环境与模型写入本仓库。

## 运行教师系统入口

本机一键启动前后端、LAM 和语音检测资源：双击桌面的“教学系统一键启动”，
或项目根目录的 `start-classroom.bat`。使用与日志说明见 [Windows 一键启动](docs/classroom-launcher.md)。

安装前端与平台 API 依赖：

```powershell
pnpm install
```

同时启动 API 与教师端：

```powershell
pnpm dev
```

浏览器访问 `http://127.0.0.1:5173/`，API 健康检查位于 `http://127.0.0.1:4300/api/health`。首次启动会在 `.runtime/platform-api/state.json` 写入李行之老师与“港口管理概论”的种子数据。

入口效果图、已接通操作、接口清单与数据边界见 [教师系统入口说明](docs/system-entry.md)。
进入课堂后的子系统边界、Slide 固定画布契约、语音交互与多设备验收见
[课堂教学子系统说明](docs/classroom-subsystem.md)。
数字人 JSON 动作、能力发现接口和安全边界见
[数字人课堂控制协议](docs/avatar-control-protocol.md)。

## 运行 OpenAvatarChat

先配置平台 LLM、云端 ASR 与 TTS 所需的密钥：

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

LAM 完成预热后，课堂页会自动从“服务预热中”进入 Barbara 资源装载和 WebSocket
连接；未启动时保持明确的离线状态，不显示数字人占位图。

默认 LAM 配置不再运行 OpenAvatarChat 内置 LLM：语音先经云端 ASR 回到平台，
平台模型通过 SSE 返回 JSON 流；浏览器只把实时提取出的 `dialogue` 增量送入
CosyVoice 与 LAM。翻页和活动切换只在服务端收到并校验完整 JSON 后执行。

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

## 项目架构

总体领域模型、模块边界、数据与部署架构、课堂实时/课下轻量双级数字人方案和分阶段落地计划见 [总体架构](docs/architecture.md)。
