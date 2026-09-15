# Windows 一键启动

双击桌面的 **教学系统一键启动**，或项目根目录的 `start-classroom.bat`。

启动器会校验本地语音检测模型（缺失时下载并校验），启动平台 API（4300）、
教师网页（5173），等待真实就绪检查通过后打开教学网页。
已运行的服务会复用，重复点击不会重复启动。后台进程不弹出额外控制台，
关闭启动窗口不会关闭服务。视频数字人和 Live2D 在浏览器中运行；LAM（8282）
按需手动启动，一键启动不加载 LAM 模型，也不等待它的服务或代理就绪。

本地关键词检测运行在浏览器 Worker 中，没有单独的后台检测进程。
进入课堂后选择“检测输入”，点击“开启语音唤醒”并允许麦克风访问即可。
启动器准备资源和服务，不会自动开始课堂或开启麦克风。

日志及服务记录位于 `.runtime/launcher/`：每个服务分别记录标准输出和错误日志；
`ready.json` 记录最近一次成功就绪检查的时间，它不是持续在线监控；
其中 `lamStartup: "manual"` 表示 LAM 的启动方式，不代表 LAM 当前是否在线。
端口冲突、依赖缺失或启动失败会显示原因，失败窗口保留以便查看。
启动器不会终止其他程序，不会修改课堂数据路径或重写 `.env`。

运行前应完成 `pnpm install`，并在 `.env` 或 Windows 用户环境变量中
配置 `DASHSCOPE_API_KEY`。启动器使用 Windows 自带 PowerShell 5.1，兼容 PowerShell 7；
直接调用 Node，不依赖桌面进程能否找到 pnpm，也不要求安装 LAM 的 Python 环境。
这是本机教学入口，绑定 `127.0.0.1`，与校园 HTTPS 生产部署分开。

TTS 还需要项目根目录 `.env` 中的 `EDU_SELFSTUDY_TTS_VOICE_ID` 音色配置。
API 默认按代码位置读取根目录 `.env`，从根目录或 `apps/platform-api` 启动均一致；
显式 `EDU_ENV_FILE` 仍可指定其他配置文件，已有进程环境变量优先。
配置只在进程启动时加载。若 ASR 已配置而 TTS 未配置，应检查音色配置及 API 启动方式，
不需要因此重新生成密钥。启动器会区分代理连接失败、密钥未加载和音色未配置。

需要使用 LAM 时，在已安装 OpenAvatarChat 环境的机器上，从项目根目录手动运行：

```powershell
.\scripts\start-openavatarchat.ps1 -Profile lam
```

等待 LAM 完成模型预热，再在课堂数字人选项中选择 LAM。用完后可在该终端按
`Ctrl+C` 停止 LAM 并释放资源；一键启动不会关闭已经手动运行的 LAM。

可重新创建桌面快捷方式：

```powershell
.\scripts\install-classroom-shortcut.ps1
```

只启动、检查服务，不打开浏览器：

```powershell
.\scripts\start-classroom.ps1 -NoBrowser
```

## HTTPS 开发入口

双击项目根目录 `start-classroom-https.bat`，或运行：

```powershell
.\scripts\start-classroom.ps1 -Https -NoBrowser
```

完成相同的前后端和语音资源检查后，启动器额外启动 Caddy，入口为
`https://localhost/`。Vite 热更新、API 和流式回复走同一 HTTPS 入口。
首次启动自动下载并校验 Caddy，将项目开发 CA 导入当前 Windows 用户的根证书存储。
配置、重载、停止和证书说明见 [本地 Caddy 调试](../deploy/local/README.md)。
