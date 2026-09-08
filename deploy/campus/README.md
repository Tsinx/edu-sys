# 校园服务器运行包

本运行包在校园 PC 上提供网页、账号、SQLite 记录、SSE 课堂同步、端侧存档同步与 AI 代理。仿真和数字人播放在教师/学生浏览器完成。无需 Python、CUDA、OpenAvatarChat 子模块或模型文件。

## 部署前准备

1. 准备 Node.js 24 或更高版本、PowerShell 7、Caddy（或学校已有 HTTPS 代理）。本次验收运行版本及测试结论见随包 `DEPLOYMENT.md`（仓库 `docs/campus-deployment.md`）。
2. 申请固定内网地址、学校域名和匹配的受信任证书。确认教室 Wi-Fi/VLAN 能到达服务器 HTTPS 端口，服务器能访问模型服务商。
3. 将整个运行包放到本机 SSD，例如 `D:\edu-campus`。`data` 目录不要放在网络共享盘、OneDrive 或 FTP 目录。

## 配置与启动

在运行包目录执行：

```powershell
npm ci --omit=dev
Copy-Item campus.env.example .env
notepad .env
pwsh -File .\New-CampusAccount.ps1 -Role teacher
pwsh -File .\New-CampusAccount.ps1 -Role student
pwsh -File .\Start-CampusServer.ps1
```

发布包若尚未包含 `package-lock.json`，在制包机器先执行 `npm install --package-lock-only --ignore-scripts` 并纳入锁文件；正式部署使用 `npm ci`。不得使用预置的通用师生密码。账号记录持久化，重启后身份保持至过期。管理员通过 `New-CampusAccount.ps1 -ResetPassword` 重置密码，旧会话随即失效。`.env` 和 `data` 仅授权给服务器运行账号与管理员。

复制 `Caddyfile.example` 为 `Caddyfile`，修改域名和证书路径，然后执行：

```powershell
caddy validate --config .\Caddyfile
caddy run --config .\Caddyfile
```

浏览器使用 `.env` 中的 `EDU_PUBLIC_ORIGIN` 访问。不要把4300直接暴露为学生入口；使用 HTTPS 代理后安全 Cookie、麦克风与离线缓存才能按设计工作。教学服务与代理应托管为开机启动、失败重启的系统服务；关闭上课期间休眠，将系统更新安排到课外。

## 使用与维护

- 学生登录后进入学习空间，教师登录后进入现有教学工作台。当前为一个教学部署范围，教师共同管理部署内课程；不是隔离多个院系的多租户系统。
- 点击右下角“离线与同步”，下载对应课程和可选角色素材。必须显示“已校验，可离线使用”，再进行断网演练。首次账号登录需要连接服务器，离线使用遵守上次会话有效期。
- 仿真使用 IndexedDB 保存并定期补传检查点；换设备首次读取已有服务器存档。同步冲突保留本机分支，先导出再选择服务器版本。存档同步不把本地分数变成认证成绩。
- AI 请求默认限制总并发6、等待30、每账号每天100次；其中预留教师容量。计数为请求次数，不是按人民币计费的精确账单；最终费用以服务商为准。角色未配置 TTS 时使用字幕。
- 应用更新时先备份，再更换运行包中的代码和 `web`，保留 `.env`、证书和 `data`。课程仍可迭代；浏览器下载包按构建版本校验。关闭所有旧教学页后重新进入，再下载更新后的资源。
- 日常备份：先停止教学服务，执行 `node admin.mjs backup D:\edu-backups\新的时间目录`。备份包含数据库中的账号哈希、会话和学习记录，应限制访问。另行保护 `.env`、证书和发布包。恢复时停服，把完整备份恢复到配置的数据目录，再启动检查。
- 外网故障时已缓存教学、课堂同步与作答可继续；服务器断线时本地课件/个人仿真继续，联网指令和动态 AI 暂停，恢复后补传。

## 部署完成后的现场检查

从真实教室的教师电脑和学生手机/电脑分别登录，检查课堂翻页、作答、同步回执、缓存下载、离线重开和恢复补传。另行验证服务商配额、声音配置与实际人数负载。本机制包验收不能替代校园网络和真实设备验收。
