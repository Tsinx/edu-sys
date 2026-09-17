# 第5讲本地验收报告

验收日期：2026-09-17。课程版本：release-port-management-capacity-v11。实验版本：port-capacity/1.0；底层规则版本：port-operations/3.1。

## 交付结论与入口

本讲48页、90分钟，已注册为可用讲次，全局198—245页。教学设计、逐页教师稿、实验说明与网页课件已经完成；未增加Word、PPT或PDF。

- [第5讲授课台](http://127.0.0.1:5173/port-lesson-five-preview.html)
- [纯投影](http://127.0.0.1:5173/port-lesson-five-preview.html?projection=1)
- 正式课堂：进入《港口管理概论》，选择第5讲。教师在第19/22页打开A/B，第34页为个人C。
- 学生课堂与课下阅读均有独立C实验入口。教师授课台和演示页方案选择器可切换A—E。
- [教学设计与分镜](port-management-lesson-five-design.md) · [48页教师稿](port-management-lesson-five-teacher.md) · [实验与证据说明](port-management-lesson-five-experiment.md)

本地入口依赖开发服务：网页5173、API4300。重新启动可在项目根目录执行 `pnpm dev`。纯投影与授课台在同一浏览器使用同一channel参数同步；正式课堂的学生同步通过现有课堂事件通道。

## 验收结果

| 类别 | 实际核验 | 结果 |
|---|---|---|
| 内容 | 48个唯一页标识，全局198—245，8段时间合计90分钟 | 通过 |
| 学生文案 | 全课程245页共享渲染审计，第5讲逐页专属构图检查；教师/助手元数据不在画布或DOM属性 | 通过 |
| 演算 | min(60,40,50)=40；岸桥90仍为40；运输60后为50；六车均匀等待0，集中平均等待5分钟，两组忙碌12分钟 | 通过 |
| 五层提示词 | agent、course、lesson、page、tools；48页范围、前因与概念联系、未揭示答案和覆盖编辑约束 | 通过 |
| 精确实验 | A—E从同一起点运行并按命令复算；终点来自最后一次真实装卸事件 | 通过 |
| 独立记录 | 身份/课堂或学习域/用途/方案隔离；教师演示不写学生记录 | 通过 |
| 个人C | 填写假设与反证后才可运行；未完成时禁止结果解释；完成后比较A与个人C | 通过 |
| 恢复与归档 | 观察点刷新恢复、完整运行重入、JSON导出导入、重置归档及恢复 | 通过 |
| 失败与替代 | 错误版本触发“计算失败，未标记完成”；A/C记录分析保留完成方式及1/2/4小时证据 | 通过 |
| 页内交互 | 场景1秒后播放一轮、暂停/继续、重播、滑块、分幕；第6/28页演算手动展开 | 通过 |
| 答案控制 | 第45页教师手动揭示与收起，刷新恢复，学生同步；学生无揭示控件 | 通过 |
| 往返导航 | 教师回到来源课件页，学生课堂和课下第45页返回；动画375/1000恢复 | 通过 |
| 权限 | 学生提交教师呈现事件返回403；过期页状态与过期运行摘要被拒绝或忽略 | 通过 |
| 原功能 | 前四讲代表页1/61/107/154/163/197和原仿真入口可打开，旧规则重放测试通过 | 通过 |

实验结果：A 46130秒；B 46900秒；C 23628秒；D 14550秒；E 14550秒。A/B一小时卸船分别48/72箱，因此局部更快并不意味着整船装卸更早结束。以上是确定性教学模型记录，不是生产数据，也不等于因果机制已经唯一确定。

## 视觉与运行证据

- 授课预览：48页 × 教师/纯投影/学生 × 1600px/390px = **288个页面状态**。
- 正式课堂：48页 × 教师/学生 × 1600px/390px = **192个页面状态**。
- 共480个页面状态通过16:10比例、图片加载、文字边界、整页横向溢出及教师元数据检查。24个动画页分别截取0%、50%、100%，共72个动画画面。
- 查看全48页截图与联系表，另检查正式课堂窄屏控制栏、箱流起中终状态、结果曲线和实验完成页面。修复了岸侧队列没有积累的呈现、重合曲线辨识、控制栏文字颜色及快速翻页时过期进度的误提示。
- 最终程序证据：`output/port-lesson-five-qa/browser.json`、`classroom.json`。截图为同目录的 `slide-*`、`motion-*`、`class-*`、`lab-*`；中途失败追踪文件保留用于复核，最终结论以前述两个成功报告为准。
- A—E命令包及源码、命令SHA-256：`output/port-lesson-five-evidence/manifest.json`。课件数字和曲线来自生成的 `packages/course-content/src/port-lesson-five-evidence.ts`，没有人工填写曲线。

## 工程检查

按包限制测试并发执行完整测试集合：核心79项、API87项、网页111项，共277项通过。相关日志位于 `output/port-lesson-five-qa/core-tests.log`、`api-all-tests.log`、`web-tests.log`。

`pnpm build` 包含全工作区类型检查并通过生产构建；`git diff --check` 通过。构建保留现有较大资源包和动态导入提示，没有构建错误。回归中补齐了课程初始轨迹元数据以保持新建与重放一致，并修正提交测试的载荷类型；未改变底层作业规则。

复现命令（在项目根目录执行）：

```powershell
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-lesson-five-evidence.mts
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-lesson-five-docs.mts
pnpm --filter @edu/port-simulation-core exec tsx --test --test-concurrency=1 test/*.test.ts
pnpm --filter @edu/platform-api exec tsx --test --test-concurrency=1 test/*.test.ts
pnpm --filter @edu/teacher-web exec tsx --test --test-concurrency=1 test/*.test.ts test/*.test.tsx
pnpm build
git diff --check
node scripts/port-lesson-five-browser-audit.mjs
node scripts/port-lesson-five-classroom-audit.mjs
```

课堂浏览器脚本默认API4315供隔离测试，也可通过 `PORT_L5_API` 指定本地测试API；网页默认5173。测试会创建开发身份与验收课堂，应使用独立测试数据。脚本中的Playwright路径使用本机捆绑运行时。

## 未验证与范围边界

本次验收采用本机Chromium与开发身份，未进行真实90分钟课堂试教、校园网部署或多浏览器兼容验收。提示词与调用上下文经过测试提供器核验，没有把测试回答当作真实大模型教学效果评价。

个人记录保存在当前浏览器，本地导出后按教师指定渠道提交；本讲未增加自动收齐或评分服务。纯投影、教师演示、个人实机、记录分析的完成含义分别保留。

本次授权范围内无待完成或受阻事项。没有自动提交、推送或部署；工作区其他并行改动保留。
