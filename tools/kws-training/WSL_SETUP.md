# WSL2 训练基础系统

2026-09-08 完成失效发行版清理与新系统安装。

| 项目 | 当前配置 |
| --- | --- |
| WSL | 2.7.13.0 |
| Linux 内核 | 6.18.33.2-microsoft-standard-WSL2 |
| 发行版名称 | Edu-KWS，默认发行版，WSL2 |
| 系统 | Ubuntu 22.04.5 LTS |
| 磁盘文件 | D:\WSL\Edu-KWS\ext4.vhdx |
| 默认用户 | edu，UID 1000 |
| 工作目录 | /home/edu/projects |
| 项目访问路径 | /mnt/d/codes/edu-sys |
| uv | Linux 版 0.12.10，/home/edu/.local/bin/uv |
| 网络 | mirrored，DNS tunneling，继承 Windows HTTP 代理 |

进入 Linux：

```powershell
wsl -d Edu-KWS --cd /home/edu
```

普通用户 `edu` 没有预设口令，也未添加免密 sudo。需要系统管理时可以显式进入 root：

```powershell
wsl -d Edu-KWS -u root
```

如需设置 Linux 用户自己的口令，手动执行 `wsl -d Edu-KWS -u root -- passwd edu`，由用户在终端输入。

两个旧发行版 `Ubuntu-22.04`、`Ubuntu-24.04-DZNProbe` 的虚拟磁盘均不存在，已使用 `wsl --unregister` 清理。清理前的注册信息备份在：

`C:\Users\Administrator\.codex\backups\wsl-reset-20260908-234551\`

该备份是注册信息，不包含已丢失的旧 Linux 文件系统。新系统使用 Ubuntu 官方 WSL 镜像，SHA-256：

`4499c4fe257f2fc83145b429ce211a0a43fd590e70d6261ede616210947d9f8f`

网络配置位于 `C:\Users\Administrator\.wslconfig`。建立该文件前不存在旧配置，配置内容为：

```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
autoProxy=true
```

验证范围：系统启动、默认用户、WSL2 版本、Linux uv、项目挂载、Linux 工作目录写权限、外部 HTTPS 网络。
只检查了 `/dev/dxg` 和 Windows 提供的 CUDA 驱动库是否存在，没有加载模型、运行 CUDA 运算或启动训练。

2026-09-09 已在 `/home/edu/projects/edu-kws` 部署独立 uv 训练依赖环境，包含 GPU 版 Torch、Torchaudio、k2、kaldifeat、Lhotse 与固定版本的 icefall。安装配置及检查边界见 [environment/README.md](environment/README.md)。Windows 的 LAM 环境保持原有配置。

官方依据：[WSL 命令](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)、[镜像网络](https://learn.microsoft.com/en-us/windows/wsl/networking)、[Ubuntu 镜像清单](https://github.com/microsoft/WSL/blob/master/distributions/DistributionInfo.json)。
