# 本机 Linux 校园部署

访问地址：**https://10.1.55.27:8443**。HTTP 入口 `http://10.1.55.27:2080` 自动跳转到 HTTPS。

项目位于 `/home/xingzhi/projects/edu-sys`。Node.js 24 和 pnpm 11.9.0 安装在 `.runtime/toolchain`。后端与 Caddy 使用 systemd 用户服务，已启用开机启动、失败重启；本机 `Linger=yes`，注销后仍运行。原有系统 Caddy 的 8080 测试页保持原配置。

## 访问和账号

教师账号为 `xingzhi`，随机密码保存在 `.runtime/campus/initial-teacher.json`（权限 `0600`）。不在网页、命令参数或 Git 中保存密码。

局域网入口使用 Caddy 私有 CA。访问设备需要导入 `.runtime/deploy/edu-campus-root.crt`，并将其信任为根证书；本机浏览器同样需要完成信任配置。此证书是可分发的公钥证书，不要分发 `.runtime/caddy` 中的私钥，也不要用忽略证书报错替代证书信任。

当前地址来自有线网卡，建议保留 DHCP 地址或配置固定地址。其他设备必须能连通服务器 TCP 8443；真实教室网络和客户端证书安装需在相应设备验证。此部署不包含公网端口映射。

## 配置和维护

| 内容 | 位置 |
| --- | --- |
| 正在运行的发布包 | `output/campus-current`（指向带时间戳目录） |
| 服务端配置 | `.runtime/campus/.env`（`0600`） |
| SQLite 数据 | `.runtime/campus/data/`（目录 `0700`） |
| Caddy 配置 | `.runtime/deploy/Caddyfile.user` |
| Caddy 证书和私钥存储 | `.runtime/caddy/`（目录 `0700`） |
| systemd 用户服务 | `~/.config/systemd/user/edu-campus.service`、`edu-campus-caddy.service` |
| 线上验证报告 | `.runtime/deploy/verification.json` |
| 独立包验证报告 | `output/campus-current/verification.json` |

云端 AI / 语音需要在 `.runtime/campus/.env` 填写服务商密钥及声音 ID，再重启后端。密钥当前未配置。

```bash
systemctl --user status edu-campus edu-campus-caddy
journalctl --user -u edu-campus -n 100 --no-pager
systemctl --user restart edu-campus
systemctl --user reload edu-campus-caddy
curl --noproxy '*' --cacert .runtime/deploy/edu-campus-root.crt \
  https://10.1.55.27:8443/api/health
```

管理账号使用隐藏密码输入，支持创建教师/学生以及重置密码：

```bash
python3 deploy/linux/account.py
```

修改访问 IP / 域名时，必须同时修改 Caddy 站点地址、HTTP 跳转目标及 `.env` 中的 `EDU_PUBLIC_ORIGIN`，再重启后端、重载 Caddy。正式域名配合可达的证书验证方式可改用公共受信任证书。

## 构建和安装

在项目根目录执行：

```bash
npm install --prefix .runtime/toolchain --no-audit --no-fund node@24 pnpm@11.9.0
export PATH="$PWD/.runtime/toolchain/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm kws:setup
pnpm build:campus
python3 deploy/linux/prepare-local.py 10.1.55.27
python3 deploy/linux/install-user-services.py 10.1.55.27
python3 deploy/linux/verify-live.py
```

校园生产构建只加载浏览器数字人，GPU / OpenAvatarChat 适配器保留给开发模式，因此不需要获取 GPU 子模块。首次制包会自动创建输出目录。

`prepare-local.py` 验证独立包鉴权、资源隔离、备份完整性后，初始化受保护的数据目录和随机教师密码。重复运行保留已有 `.env` 与账号，更新 `campus-current` 指向。更新正在运行的服务器前应先停服备份；安装脚本会重启用户服务。新机器应确保 systemd 用户管理器已启用 linger，否则只能随用户登录启动。

`verify-live.py` 通过真实 HTTPS 入口校验证书、全部离线资源的字节数和哈希、账号登录、来源限制、重启后会话保持、退出撤销及 Caddy 重载。它会短暂重启后端，应在课外运行。

## 备份

备份前停服，指定同一个生产 `.env` 和一个新的备份目录：

```bash
systemctl --user stop edu-campus
cd /home/xingzhi/projects/edu-sys/output/campus-current
EDU_ENV_FILE=/home/xingzhi/projects/edu-sys/.runtime/campus/.env \
  /home/xingzhi/projects/edu-sys/.runtime/toolchain/node_modules/node/bin/node \
  admin.mjs backup /home/xingzhi/projects/edu-sys/.runtime/backups/新的时间目录
systemctl --user start edu-campus
```

更新代码时保留 `.runtime`。服务器需保持开机、不休眠且网络在线。

## 合并云端更新并升级现有服务器

服务器维护分支为 `server/campus-linux`，云端内容分支为 `origin/codex/campus-edge-deployment`。先 fetch、merge 并解决冲突，保留生产模式、GPU 子模块隔离和 Linux 服务配置。不要对已有服务器重新运行首次初始化脚本来切换版本。

```bash
export PATH="$PWD/.runtime/toolchain/node_modules/.bin:$PATH"
git fetch origin
git merge origin/codex/campus-edge-deployment
pnpm install --frozen-lockfile
pnpm kws:setup
pnpm test
pnpm build:campus
# 将下方目录替换为本次构建输出；验证完成前不切换 current。
node scripts/verify-campus-release.mjs output/campus-server-本次时间戳
python3 deploy/linux/update-release.py output/campus-server-本次时间戳
python3 deploy/linux/verify-live.py
```

升级脚本停服后备份整套数据库，原子切换 `campus-current`，检查新版本健康状态及资源版本号；启动失败则恢复旧发布包和数据库。备份位于 `.runtime/backups/upgrade-*`。后端配置、账号和 Caddy 证书保持原位置。发布包 `release.json` 记录构建来源提交。

2026-09-15 已合入管理学（367页）、统计分析（前两讲100页）、港口课程（197页）、综合/3D实训、Live2D 小麦和课堂助手更新。计算、动画和通用中文唤醒在浏览器运行。管理学、统计分析可分别下载离线资源。

两套个人训练的唤醒模型位于原开发机被 Git 忽略的 `output/`，仓库没有提供权重或下载地址；本机使用已校验的通用模型，未安装的个人模型不会出现在选择器中。取得原始模型后可用 `setup-personal-kws.mjs --source` 安装并重新构建，构建时会校验并自动启用。AI/语音服务商密钥仍从当前服务器 `.env` 读取；Rhubarb 是可选口型增强，不影响基础浏览器口型与字幕。

客户端升级后应关闭旧教学页再重新进入，并重新下载离线包，以使用新课件和资源版本。

## 本机账号与 AI 配置

生产配置保存在 `.runtime/campus/.env`，支持 `dashscope_api_key` 和 `DASHSCOPE_API_KEY`。systemd 服务不会自动继承后来在终端中设置的变量；密钥应写入该受保护文件或服务环境，再重启 `edu-campus`。

`EDU_STUDENT_AI_ENABLED=false` 会在服务端拒绝学生的问答、语音识别和语音合成请求，同时停用学生问答输入，保留课件阅读与本地实验。教师权限不受该开关影响。`EDU_ACCOUNT_MIN_PASSWORD_LENGTH` 默认12，本机可按账号初始化要求显式设为6。

账号和选课范围存储于 `.runtime/campus/data/state.json.accounts.sqlite`，密码使用独立随机盐和 scrypt 哈希。选课限制同时应用于课程列表、课堂列表和直接访问；没有选课限制记录的旧账号保留原权限。私有导入名单位于 `.runtime/campus/rosters/`。上述数据、密钥及备份均被 Git 忽略，更新代码时必须保留。
