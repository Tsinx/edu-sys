# 教师系统入口 v0.1

## 目标

本纵切不是静态页面复刻，而是一条从教师界面到平台 API 和持久化状态的可运行链路。当前种子身份为重庆交通大学教师李行之，当前课程为“港口管理概论”。

## 视觉基线

ImageGen 生成的第一版入口效果图保存在：

- [`docs/design/system-entry-concept-v1.png`](design/system-entry-concept-v1.png)

正式界面沿用深海军蓝、港航青与珊瑚橙的视觉语言，但港口场景与卡通助手均由可维护的 React/SVG 组件重绘，没有把效果图当作网页背景。

## 已接通的操作

| 入口操作 | 实际行为 |
| --- | --- |
| 新建课程 | 打开表单，调用 `POST /api/courses`，持久化后进入新课程 |
| 继续备课 | 进入“港口管理概论”课程工作区 |
| 开始上课 | 调用 `POST /api/courses/:id/class-sessions`，建立课堂记录并进入独立课堂子系统 |
| 课堂实时助手 | 创建需要 GPU 的实时数字人计划，明确等待 OpenAvatarChat 课堂服务接管 |
| 课下轻量助手 | 创建无需实时 GPU 的预录动作/表情模式 |
| 主导航 | 进入课程、课堂、模拟实验、教学评价与资源中心的真实路由 |
| 通知与个人菜单 | 展开可操作菜单，可进入课堂、设置或退出演示 |
| 个人设置 | 将入口偏好保存到浏览器本地存储 |

## 平台 API

开发服务默认监听 `127.0.0.1:4300`：

- `GET /api/health`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses`
- `GET /api/class-sessions`
- `GET /api/class-sessions/:id`
- `POST /api/courses/:id/class-sessions`
- `GET /api/class-sessions/:id/snapshot`
- `POST /api/class-sessions/:id/events`
- `POST /api/class-sessions/:id/avatar/commands`
- `POST /api/class-sessions/:id/end`
- `POST /api/avatar/presentations`

前端通过 Vite 的 `/api` 代理访问平台 API，页面代码不绑定本机端口。

## 数据与生产边界

当前使用 `.runtime/platform-api/state.json` 作为开发持久化适配器。该文件被 Git 忽略；API 的数据访问集中在 `JsonStateStore` 中，后续可替换为 PostgreSQL 仓储而不改变前端接口。

当前实时数字人按钮会建立明确的调度计划，但不会在普通入口访问时直接占用 GPU。
进入课堂后可通过手动收音或文字输入提交教师指令：OpenAvatarChat 负责 ASR、
CosyVoice 与 LAM，平台 API 负责 JSON 流 LLM、`dialogue` 增量提取和课堂动作。
课下轻量模式始终不创建实时 GPU 会话。

课堂子系统使用固定 `1600×1000 / 16:10` 逻辑画布，所有设备只统一缩放完整
Slide，比例不满足时添加黑边，不使用普通网页的内容重排。实现与验收证据见
[课堂教学子系统说明](classroom-subsystem.md)。

## 本地验证

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

教师端：`http://127.0.0.1:5173/`

平台 API：`http://127.0.0.1:4300/api/health`
