# Windows 一键启动

双击桌面的 **教学系统一键启动**，或项目根目录的 `start-classroom.bat`。

启动器会校验本地语音检测模型（缺失时下载并校验），启动平台 API（4300）、
教师网页（5173）和 LAM（8282），等待真实就绪检查通过后打开教学网页。
已运行的服务会复用，重复点击不会重复启动。后台进程不弹出额外控制台，
关闭启动窗口不会关闭服务。LAM 冷启动需要加载模型，启动窗口会显示等待进度。

本地关键词检测运行在浏览器 Worker 中，没有单独的后台检测进程。
进入课堂后选择“检测输入”，点击“开启语音唤醒”并允许麦克风访问即可。
启动器准备资源和服务，不会自动开始课堂或开启麦克风。

日志及服务记录位于 `.runtime/launcher/`：每个服务分别记录标准输出和错误日志；
`ready.json` 记录最近一次成功就绪检查的时间，它不是持续在线监控。
端口冲突、依赖缺失或启动失败会显示原因，失败窗口保留以便查看。
启动器不会终止其他程序，不会修改课堂数据路径或重写 `.env`。

运行前应完成 `pnpm install`、LAM 环境安装，并在 `.env` 或 Windows 用户环境变量中
配置 `DASHSCOPE_API_KEY`。启动器使用 Windows 自带 PowerShell 5.1，兼容 PowerShell 7；
直接调用 Node 和项目内的 Python 虚拟环境，不依赖桌面进程能否找到 pnpm。
这是本机 LAM 增强入口，绑定 `127.0.0.1`，与校园 HTTPS 生产部署分开。

可重新创建桌面快捷方式：

```powershell
.\scripts\install-classroom-shortcut.ps1
```

只启动、检查服务，不打开浏览器：

```powershell
.\scripts\start-classroom.ps1 -NoBrowser
```
