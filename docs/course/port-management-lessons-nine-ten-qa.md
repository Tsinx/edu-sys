# 港口管理概论 · 第9—10讲验收

日期：2026-09-22。版本：`release-port-management-governance-market-v14`。

## 建设范围

第9讲390—437页、第10讲438—485页，共96页。各90分钟，24页处分为两个45分钟单元。接入正式课堂、学生跟随、自由浏览、独立阅读和授课台，提供逐页教师讲稿与来源台账。第11—16讲保持待建设状态。

## 验证结果

| 检查 | 结果与证据 |
|---|---|
| 文案、来源、时长、页序、助手边界 | 课程上下文与接口相关19项测试通过；包含全课学生文案审计、192页扩展课程的逐页状态与披露边界验证。`output/port-governance-api-final.log` |
| 前端与模型 | 135项测试通过；覆盖支付收支守恒、路径成本、账单单位、选项边界、192页扩展课件静态渲染。`output/port-governance-web-final.log` |
| 类型与生产构建 | `pnpm build`通过，含各包类型检查；保留既有大分块和混合导入警告。`output/port-governance-build-final.log` |
| 全页预览 | 906个状态通过：96页×教师／投影／学生×1600／390宽度，加进度、选项及解析组合。另检查同步、刷新和减弱动态效果。`output/port-governance-qa/browser.json` |
| 实际课堂 | 386个画面通过：96页×教师／学生×两种宽度，另加两讲独立阅读。目录、跨讲、第四种管理模式、选项同步、解析开合、刷新进度、自主浏览、一键跟随、403越权和409过期页面均通过。`output/port-governance-qa/classroom.json` |
| 自动播放 | 全96页逐页验证1999毫秒仍未播放、2000毫秒启动，暂停保持、离页清理、手动进度接管、刷新后续播、只读投影、窄屏和减弱动态效果通过。`output/port-governance-qa/autoplay/browser.json` |
| 视觉复核 | 96页全景截图与6张联系表逐页查看；放大复核管理模式、现金流、总成本、可靠性与账单图。固定16:10，未见破图、文字越界、页面横向溢出和教师字段泄漏。`output/port-governance-qa/` |
| 差异检查 | `git diff --check`通过。`output/port-governance-diff-check.log` |

复核修正：四种管理模式的课堂协议允许第4个选项，并继续按页面校验；交付图横轴改为真实等距天数刻度；学生自主浏览补齐第9—10讲只读控制。动画不自动翻页或揭示解析。

## 复现

隔离验收服务：`pnpm --filter @edu/platform-api exec tsx ../../scripts/port-governance-audit-server.mts`，API监听4319，使用独立验收数据。前端启动时将`EDU_API_PROXY_URL`设为`http://127.0.0.1:4319`，在5188启动Vite。

依次运行：

```text
node scripts/port-governance-browser-audit.mjs
node scripts/port-governance-classroom-audit.mjs
node scripts/port-governance-autoplay-audit.mjs
pnpm --filter @edu/platform-api exec tsx --test test/course-context.test.ts test/port-expansion.test.ts test/app.test.ts test/study.test.ts
pnpm --filter @edu/teacher-web test
pnpm build
git diff --check
```

运行浏览器检查时保持课程源文件不变；热更新可能中断正在导航的验收页。同步测试等待教师状态写入响应后再比较学生自主浏览前后的快照。

## 交付边界

本轮完成本地源码、课件、文档和浏览器验收，未提交、推送或部署，未代替真实教室设备验收。工作区另有同时进行的登录及港口仿真工作；本任务没有编辑初始保护清单中的文件，其并发变化保留，记录于`output/port-governance-qa/protected-final.json`。本报告只认领第9—10讲建设与接入。

参见[建设说明](./port-management-lessons-nine-ten-design.md)、[来源台账](./port-management-lessons-nine-ten-sources.md)、[第9讲教师稿](./port-management-lesson-nine-teacher.md)、[第10讲教师稿](./port-management-lesson-ten-teacher.md)。
