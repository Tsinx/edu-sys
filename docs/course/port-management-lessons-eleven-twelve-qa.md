# 港口管理概论 · 第11—12讲验收

日期：2026-10-12。版本：`release-port-management-performance-safety-v15`。

建设范围为两讲各48页、90分钟，共96页；课程总页数581。第11讲486—533页，第12讲534—581页，24页处分为两个45分钟单元。正式课堂、授课台、学生跟随、自主浏览与独立阅读均已接入。第13—16讲仍待建设。

| 检查 | 结果与证据 |
|---|---|
| 学生文案、页序、来源与助手边界 | 相关课程接口21项测试通过，包含全课581页文案审计、上下文与288页扩展课程状态验证。`output/port-performance-safety-api-final.log` |
| 前端、模型与交互 | 201项测试通过，包含评分权重、同均值样本、必要确认、只读与披露边界、现有页面工具和PDF章节模型兼容性。`output/port-performance-safety-web-final.log` |
| 类型检查 | 全部包类型检查通过。`output/port-performance-safety-typecheck-final.log` |
| 生产网页构建 | Vite生产构建通过，保留既有分块大小警告。`output/port-performance-safety-production-final.log` |
| 全页预览 | 902个状态通过：96页×教师／投影／学生×1600／390宽度，加进度、选项与解析组合；检查图像、16:10、边界、页面溢出、作者字段及共享画面。`output/port-performance-safety-qa/browser.json` |
| 正式课堂 | 386个画面通过：96页×教师／学生×两种宽度，另加两讲独立阅读；选项与解析同步、刷新、进度恢复、自主浏览、一键跟随、403权限与409过期事件、前10讲边界均通过。`output/port-performance-safety-qa/classroom.json` |
| 自动播放 | 96页逐页验证1999毫秒不播放、2000毫秒启动；暂停、手动进度接管、离页清理、刷新后续播、只读投影、窄屏及减弱动态效果通过；不自动翻页或揭示答案。`output/port-performance-safety-qa/autoplay/browser.json` |
| 全屏与工具 | 两讲均验证播放中切换网页全屏、实际屏幕全屏及退出，画布节点未重建，进度与选项保留；拒绝屏幕请求显示错误且不偷偷切换模式；输入焦点、单工具栏及窄屏详细工具可达。`output/port-performance-safety-qa/fullscreen.json` |
| 视觉复核 | 96页全景截图与6张联系表逐页查看；放大核对月报标签、CPPI年份、交付分布、权重、必要确认与窄屏工具。证据卡保留中文与数字词组，未见破图、裁字或越界。`output/port-performance-safety-qa/` |
| 差异检查与并行工作 | `git diff --check`通过。34个初始工作区文件登记；仅3个共享文件追加本课程范围，其余初始文件字节未改变。构建器生成的经济数学旁白资产已按初始SHA-256恢复原字节。`output/port-performance-safety-qa/protected-final.json` |

复核中修正了月报卡片的前期／本期标签、数字词组换行及窄屏教师工具入口。新两讲的详细演示工具由现有外壳“更多工具”打开，未追加第二条工具栏，模型和播放状态仍在原控制器。

## 复现

隔离API使用独立验收数据与4321端口：`pnpm --filter @edu/platform-api exec tsx ../../scripts/port-performance-safety-audit-server.mts`。前端设置`EDU_API_PROXY_URL=http://127.0.0.1:4321`后，在5191启动Vite。

```text
node scripts/port-performance-safety-browser-audit.mjs
node scripts/port-performance-safety-classroom-audit.mjs
node scripts/port-performance-safety-autoplay-audit.mjs
node scripts/port-performance-safety-fullscreen-audit.mjs
pnpm --filter @edu/platform-api exec tsx --test test/course-context.test.ts test/port-expansion.test.ts test/app.test.ts test/study.test.ts test/port-lesson-five.test.ts test/port-lesson-six.test.ts
pnpm --filter @edu/teacher-web test
pnpm typecheck
pnpm --filter @edu/teacher-web exec vite build
git diff --check
```

浏览器验收期间保持课程源文件不变；热更新可能中断导航。同步检查等待事件写入响应，全屏检查等待浏览器事件和React状态都已更新。

## 交付边界

本轮完成本地课件、课堂接入、教师稿、来源台账与浏览器验收；没有新增独立模拟器、个人实验运行、自动成绩提交或训练认证。安全图解不提供真实危险品操作、设备／网络控制、事故处置步骤或现场批准。

工作区原有PDF导出改动保持。本次最初的`pnpm build`完成类型与网页构建后进入全项目PDF导出，额外导出已停止；最终类型检查和网页生产构建单独通过。本轮不交付或声称完成PDF导出。

未提交、推送或部署；浏览器检查不替代真实教室投影、声音和网络设备验收。参见[建设说明](./port-management-lessons-eleven-twelve-design.md)、[来源台账](./port-management-lessons-eleven-twelve-sources.md)、[第11讲教师稿](./port-management-lesson-eleven-teacher.md)、[第12讲教师稿](./port-management-lesson-twelve-teacher.md)。
