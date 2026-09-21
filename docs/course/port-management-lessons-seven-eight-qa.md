# 港口管理概论第7—8讲 · 本地验收记录

> 2026-09-21后续更新：自动播放现统一为进入动画页2秒后启动；以[自动播放验收记录](./port-management-autoplay-qa.md)为准，本文保留原轮次验收结果。

日期：2026-09-21。课程版本：`release-port-management-cargo-planning-v13`。

## 交付范围

第7讲294—341页、第8讲342—389页，共96页；各48页、90分钟，两段各45分钟，第24页后课间。前6讲293页的正文源文件没有改写，课程注册和导航扩展到389页；第9—16讲仍为待建设。

已接入正式教师课堂、学生跟随／自主浏览、课后自主学习及独立授课台。课堂演示状态与当前页绑定，教师控制解析揭示；学生不能写入教师演示状态。包含逐页教师讲稿、来源台账、课程建设说明与可重跑的验收脚本。

## 已完成检查

| 检查 | 结果 | 证据 |
|---|---|---|
| 逐页正文、来源、教师字段隔离、未揭示答案检查 | 96页及各选项通过 | `apps/teacher-web/test/port-expansion.test.tsx` |
| 模型计算、选项边界、需求与能力守恒 | 通过 | 同上 |
| 前端全部测试 | 132/132通过 | `output/port-expansion-web-final.log` |
| 后端课程、上下文、助手、课堂与学习相关测试 | 串行29/29通过 | `output/port-expansion-api-targeted.log` |
| 当前版本助手上下文补充回归 | 5/5通过 | `output/port-expansion-context-final.log` |
| 类型检查及生产构建 | 通过 | `output/port-expansion-build-final.log` |
| 独立预览全页浏览器检查 | 918状态通过 | `output/port-expansion-qa/browser.json` |
| 正式课堂全页检查 | 384状态通过 | `output/port-expansion-qa/classroom.json` |
| 最终目录、跨讲与课后学习补充检查 | 通过 | `output/port-expansion-qa/classroom-navigation.json` |
| 差异空白检查 | `git diff --check`通过 | 最终工作区检查 |

独立预览检查覆盖96页×教师／投影／学生×1600／390像素，另检查0%、50%、100%进度、全部选项与解析展开。浏览器确认固定16:10、无画布文字越界、无横向页面溢出、无缺图、无教师元数据泄漏，控制台错误为零；并验证投影握手同步、刷新恢复、暂停及减少动态效果设置。

正式课堂在隔离的4318端口API和5188端口前端运行，使用独立数据目录，不写入实际教学数据库。全页检查覆盖96页×教师／学生×1600／390像素；另验证选项和解析同步、拖动进度保存、刷新恢复、自主浏览不改变教师状态、一键跟随、学生403、过期页409及前6讲边界页导航。最终补充检查确认第7／8讲教师目录、第9讲禁用状态及第7／8讲独立学习入口。Playwright对原生option的禁用判定采用DOM的`disabled`属性核验。

全套页面截图与6张联系表已做视觉检查，另单独检查工艺配套图、港城图、决策解析、窄屏与学生入口。最后修正了封面标题短尾换行、停车场目的地标签与路线重叠；更新后的全页预览复核通过。逐页截图见`output/port-expansion-qa/slide-7-*.png`及`slide-8-*.png`。

## 全量后端测试的例外

全量后端测试本次为103/107通过，不能表述为全部通过。日志：`output/port-expansion-api-tests-v2.log`。

1. `app.test.ts`在线人数断言在并发测试负载下得到0而预期1；该文件在随后串行相关测试中通过。仍保留为并发时序问题，未放宽断言。
2. `port-submissions.test.ts`与`portal.test.ts`中的Python清理子进程退出9009，调用名为`python3`，当前Windows环境未能正常运行该命令。本轮未改写这些清理测试或系统命令映射。
3. `statistical-analysis-regression.test.ts`检查旧统计数据文件的字节哈希失败。工作区文件为CRLF，Git原始内容为LF；将工作区CRLF规范为LF后与预期哈希完全一致。本轮没有改写该数据。原始工作区SHA-256：`dba5030333fd7f8d3fcf9e4bf68ad251532bbec874fd59fee92ee76e058ea685`；Git／LF预期：`04f4419c426b6424a2f89086a5fb05c391344e561767697424028d889a3f0d62`。

构建中的动态／静态混合导入和插件耗时提示为警告，构建退出码为0。

## 复核命令

```powershell
pnpm --filter @edu/teacher-web test
pnpm --filter @edu/platform-api exec tsx --test --test-concurrency=1 test/app.test.ts test/course-context.test.ts test/assistant-prompts.test.ts test/assistant-stream.test.ts test/port-lesson-four.test.ts test/port-lesson-five.test.ts test/port-lesson-six.test.ts test/port-expansion.test.ts test/study.test.ts
pnpm build
git diff --check
```

启动隔离API和前端后，在仓库根运行`node scripts/port-expansion-browser-audit.mjs`及`node scripts/port-expansion-classroom-audit.mjs`；追加`--navigation-only`可单独重查导航与学习入口。脚本的浏览器运行时路径与端口按当前Windows工作区配置；换机器应相应调整。文件与报告SHA-256清单见`output/port-expansion-qa/manifest.json`。

## 验收边界

这是当前工作区的本地实现与Chromium验收，未提交Git、未推送、未部署。未声称真实课堂、实际学生设备、全部浏览器、现场音响或连续人工授课已验收。本轮没有新增正式配音或PDF导出。

港口史采用有来源的代际分析框架；第五代不是统一认证。工程、能力、需求和费用数字为教学设定；真实港口案例的规划目标与已完成设施分别表述。全部教学来源及逐页映射见[来源台账](./port-management-lessons-seven-eight-sources.md)。
