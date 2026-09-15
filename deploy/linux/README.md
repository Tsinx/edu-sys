# 本机 Linux 校园部署

访问地址：**https://10.1.55.27:8443**。HTTP 入口 `http://10.1.55.27:2080` 自动跳转到 HTTPS。

项目位于 `/home/xingzhi/projects/edu-sys`。Node.js 24 和 pnpm 11.9.0 安装在 `.runtime/toolchain`。后端与 Caddy 使用 systemd 用户服务，已启用开机启动、失败重启；本机 `Linger=yes`，注销后仍运行。原有系统 Caddy 的 8080 测试页保持原配置。

## 访问和账号

2026-09-15 已更新为 1 个管理员账号、70 个名单内学生账号和 1 个测试学生账号。管理员沿用系统 `teacher` 管理权限，保留原账号内部 ID 和已有教学记录；初始登录凭据保存在 `.runtime/campus/initial-teacher.json`（权限 `0600`），具体账号与密码不写入文档或 Git。

71 个学生账号均绑定港口管理概论（`course-port-management-intro`），课程列表与课堂列表只返回该账号可访问的课程，直接访问未选课程也会被服务端拒绝。学生可阅读课件和使用本地港口仿真，暂不能调用 AI。学生名单及初始化规则保存在受保护的本机目录，数据库只保存带随机盐的密码哈希。

局域网入口使用 Caddy 私有 CA。访问设备需要导入 `.runtime/deploy/edu-campus-root.crt`，并将其信任为根证书；本机浏览器同样需要完成信任配置。此证书是可分发的公钥证书，不要分发 `.runtime/caddy` 中的私钥，也不要用忽略证书报错替代证书信任。

当前地址来自有线网卡，建议保留 DHCP 地址或配置固定地址。其他设备必须能连通服务器 TCP 8443；真实教室网络和客户端证书安装需在相应设备验证。此部署不包含公网端口映射。

## 配置和维护

| 内容 | 位置 |
| --- | --- |
| 正在运行的发布包 | `output/campus-current`（指向带时间戳目录） |
| 服务端配置 | `.runtime/campus/.env`（`0600`） |
| SQLite 数据 | `.runtime/campus/data/`（目录 `0700`） |
| 私有学生名单 | `.runtime/campus/rosters/`（目录 `0700`，名单文件 `0600`） |
| 账号验证报告 | `.runtime/campus/account-verification.json` |
| 学生页面验证报告 | `.runtime/campus/accounts-browser-qa.json` |
| Caddy 配置 | `.runtime/deploy/Caddyfile.user` |
| Caddy 证书和私钥存储 | `.runtime/caddy/`（目录 `0700`） |
| systemd 用户服务 | `~/.config/systemd/user/edu-campus.service`、`edu-campus-caddy.service` |
| 线上验证报告 | `.runtime/deploy/verification.json` |
| 独立包验证报告 | `output/campus-current/verification.json` |

云端 AI / 语音需要在 `.runtime/campus/.env` 填写服务商密钥及所用声音配置，再重启后端。2026-09-15 核查时，当前进程、systemd 用户环境及本机配置均未读到有效 DashScope 密钥，因此尚未启用并验证真实云端调用。

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

若终端已有密钥，在设置变量的那个终端运行以下命令即可备份配置、仅导入密钥字段并重启教学服务；脚本不会打印密钥，也不会改变学生 AI 开关：

```bash
python3 deploy/linux/configure-ai.py
# 或读取已有密钥文件（替换为真实路径）：
python3 deploy/linux/configure-ai.py --env-file /绝对路径/已有密钥.env
# 或在本机终端中隐藏输入：
python3 deploy/linux/configure-ai.py --prompt
```

脚本接受大写 `DASHSCOPE_API_KEY`、小写 `dashscope_api_key` 和独立的 `EDU_ASSISTANT_API_KEY`，写入文件权限为 `0600`。未读取到有效值时直接退出，保留原配置。看到生产文件中只有 `DASHSCOPE_API_KEY=`，表示变量名已定义但密钥仍为空，改大小写无法补上缺失的值。

模型适配器会忽略空字符串与纯空白：有效的独立助手密钥优先，其次是 DashScope 大写、小写变量；同类密钥的非空进程配置优先于文件。空白的独立助手配置不再遮住 DashScope 密钥，空白的进程变量也不会遮住文件中的有效值。只有真实服务商返回成功后，才能确认云端模型可用。

`EDU_STUDENT_AI_ENABLED=false` 会在服务端拒绝学生的问答、语音识别和语音合成请求，同时停用学生问答输入，保留课件阅读与本地实验。教师权限不受该开关影响。`EDU_ACCOUNT_MIN_PASSWORD_LENGTH` 默认12，本机可按账号初始化要求显式设为6。

本机当前设置如下，密钥需另行填写到同一受保护配置文件中：

```dotenv
EDU_STUDENT_AI_ENABLED=false
EDU_ACCOUNT_MIN_PASSWORD_LENGTH=6
```

后续填写有效密钥并重启服务后，学生 AI 仍保持停用。只有明确修改 `EDU_STUDENT_AI_ENABLED` 并重启后端才会改变该策略。

账号和选课范围存储于 `.runtime/campus/data/state.json.accounts.sqlite`，密码使用独立随机盐和 scrypt 哈希。选课限制同时应用于课程列表、课堂列表和直接访问；没有选课限制记录的旧账号保留原权限。私有导入名单位于 `.runtime/campus/rosters/`。上述数据、密钥及备份均被 Git 忽略，更新代码时必须保留。

`account.py` 负责创建账号和重置密码，不会自动为新学生绑定课程。批量更新名单和选课前必须停服并备份整套数据库；本次私有导入脚本会重置名单内账号密码并撤销旧会话，不应作为日常启动步骤重复执行。

## 2026-09-15 账号部署验收

该轮账号验收使用提交 `2c80f7b`，发布包为 `output/campus-server-20260915051531749`。当前运行版本以 `output/campus-current/release.json` 为准；仅更新文档不需要重建运行包。

- 自动测试 231 项通过，1 项可选 Rhubarb 测试跳过；类型检查、生产构建与 `git diff --check` 通过。
- 70 个正式学生的初始密码哈希及选课范围逐一校验；管理员内部 ID 保持不变，数据库完整性检查通过。
- 经实际 Caddy HTTPS 入口验证管理员、正式学生抽样及测试学生登录；学生课程可见性、AI 接口拒绝、来源校验、重启后会话保持及退出撤销通过。
- 浏览器在 1600px 与 390px 宽度验证测试学生登录、单课程入口、翻页、文字和语音输入停用；未发现横向溢出、损坏图片或页面脚本错误。管理员的 AI 输入权限保持可用。
- HTTPS 证书校验和 545 项静态资源字节数、哈希检查通过；后端与 Caddy 用户服务均处于启用和运行状态。

升级前备份位于 `.runtime/backups/upgrade-20260915-131601/`，账号导入前备份位于 `.runtime/backups/accounts-20260915-131629/`。这些备份包含私有数据，只保留在本机受保护目录。上述结果来自服务器本机访问局域网 HTTPS 地址，不代表已完成其他学生设备、校园无线网络或真实云端 AI 验收。

## 2026-09-15 密钥读取修复

针对“课堂助手模型尚未配置”报错，重新检查了大小写环境变量、登录终端、systemd 用户环境与生产文件。生产文件中的 `DASHSCOPE_API_KEY` 仍为空，尚未找到可用于真实调用的密钥；这与空值遮蔽缺陷分别记录，不能将读取逻辑修复视为服务商已连通。

平台 API 测试 67 项通过、1 项可选 Rhubarb 测试跳过；密钥回退回归测试和配置工具的 2 项 Python 测试通过，类型检查与生产构建通过。测试使用合成凭据和模型响应替身，验证大写、小写、空白回退、配置文件优先级、ASR 鉴权头及显式停用行为；不发送真实师生信息，也不替代真实云端调用验收。
