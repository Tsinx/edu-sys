# Windows 本地 Caddy 调试

## 一键启动

双击项目根目录 `start-classroom-https.bat`，或从仓库根目录执行：

```powershell
.\scripts\start-classroom.ps1 -Https
```

浏览器入口为 **https://localhost/**，保留 Vite 代码热更新。`http://localhost/`
会跳转到 HTTPS。首次启动会从 Caddy 官方 GitHub Release 下载固定版本 **2.11.4**
（Windows x64），核对固定 SHA256 后解压。脚本兼容 Windows PowerShell 5.1 和 PowerShell 7。
前后端依赖和语音配置与原有一键启动器相同；已运行的服务会复用。

## 请求路径

| 本地入口 | 转发目标 | 用途 |
| --- | --- | --- |
| `https://localhost/api/*` | `http://127.0.0.1:4300` | API、课堂事件和 AI 流式回复 |
| `https://localhost/*` | `http://127.0.0.1:5173` | 网页、资源、Vite HMR WebSocket |
| `https://localhost/openavatarchat-runtime/*` | Vite 的现有 8282 代理 | 按需启动的 LAM |
| `http://127.0.0.1:2020` | 项目 Caddy 管理端口 | 仅供脚本重载和停止 |

HTTP/HTTPS 仅绑定 IPv4/IPv6 回环地址（`127.0.0.1`、`::1`），用于本机调试。
不需要修改 hosts 文件。后端保持 `development` 配置，使用原有本地数据和 `.env`；
HTTPS 调试不切换到校园生产模式，也不导入服务器账号、学生名单或私钥。
不同 origin 的浏览器存储相互独立，首次进入 `https://localhost` 需重新允许麦克风访问。

## 管理 Caddy

前后端已经在 4300/5173 运行时，可单独启动代理：

```powershell
.\scripts\caddy-dev.ps1 start
.\scripts\caddy-dev.ps1 status
.\scripts\caddy-dev.ps1 validate
.\scripts\caddy-dev.ps1 reload
.\scripts\caddy-dev.ps1 stop
```

`start` 对已有项目进程执行配置重载；`stop` 只停止此项目记录且核对过身份的 Caddy，
保留 API 和 Vite。端口 80、443 或 2020 被其他服务占用时会报错并保留原服务。
修改 `deploy/local/Caddyfile` 后执行 `reload`，重载仍会校验配置和 HTTPS 页面/API。
这些后台进程随手动启动器运行，不安装系统服务或开机启动项。

## 文件和证书

| 内容 | 位置 |
| --- | --- |
| 可提交配置 | `deploy/local/Caddyfile` |
| Caddy 可执行文件、下载包和校验记录 | `.runtime/toolchain/caddy/` |
| CA、站点证书和私钥 | `.runtime/caddy/data/` |
| 进程记录、标准输出和错误日志 | `.runtime/caddy/` |
| 本地开发 CA 公钥证书 | `.runtime/caddy/data/pki/authorities/local/root.crt` |

启动器通过 Windows `certutil -user` 将此项目的 CA 公钥证书导入 `Cert:\CurrentUser\Root`，
首次导入时 Windows 可能显示根证书信任提示，后续启动检测到已信任证书便会跳过导入。
HTTPS 检查保持证书校验开启。
若某个浏览器使用独立证书存储，需要在那里信任同一份 `root.crt`。
`.runtime/` 已被 Git 忽略。不要删除 CA 数据后继续复用旧证书信任；重新生成 CA 后须重新运行启动器。

## 调试入口验收

在前后端和代理启动后运行 `node scripts/verify-caddy-dev.mjs`。脚本使用本机 Playwright，
可通过 `EDU_PLAYWRIGHT_ENTRY` 指向已安装 Playwright 的目录中的一个 JS 文件路径。
它检查可信 HTTPS、安全上下文、麦克风 API、HTTP 跳转、API、已有课堂的 SSE，
并临时创建一个模块、修改它，确认热更新通过 `wss://localhost` 生效后删除该模块。
没有已有课堂时 SSE 项会记录为跳过。结果和截图位于 `output/caddy-dev-qa/`。

Caddy 的配置和本地证书机制参考官方文档：
[本地 HTTPS](https://caddyserver.com/docs/automatic-https#local-https)、
[反向代理](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)、
[全局配置](https://caddyserver.com/docs/caddyfile/options)。
