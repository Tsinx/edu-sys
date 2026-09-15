# 第4讲教师端升级与验收

2026-09-15。版本 `release-port-management-authored-v10`。44页、90分钟；全课程197页，第4讲全局154—197页。

## 2026-09-15 修订：固定课件颜色，实验改为独立页面

- 根因：通用 `.authored-slide` 的深色文字覆盖了第4讲场景色。画布现在独立声明背景、标题和正文颜色，使用 `color-scheme: only light` 和画布范围内的 `forced-color-adjust: none`；不依赖页面日夜模式。
- 第10／19／30／35页跳转 `/simulations` 对应分段，使用完整实验系统原有界面；课件内的演示宿主已移除。教师指南及助手动作使用相同入口。
- 实验页提供“返回课件”。课堂状态在离开前关闭嵌入演示标记，浏览器返回不会再次跳走；课件页与动画进度恢复。跨页面后按需要重新进入全屏。
- 教师演示记录使用独立存储范围，重新进入和刷新保持暂停。学生任务发布及自主练习保持独立。
- 同步投影继续同步课件页与动画；实验演示投影完整实验系统窗口。
- 当前回归脚本：`scripts/port-lesson-four-v10-browser-audit.mjs`（已增加颜色检查及日夜模式）、`scripts/port-lesson-four-navigation-audit.mjs`。下方的内嵌演示检查是初版历史记录，不表示当前交互方式。

### 本次修订验证

| 检查 | 结果 | 本地证据 |
|---|---|---|
| 44页 × 教师/投屏 × 1600/390px × 日间/夜间 | 352个状态全部通过；标题颜色、文字边界、图片及教师信息隔离无异常 | `output/port-lesson-four-navigation-qa/browser.json` |
| 四段预览与四段正式课堂入口 | 跳转完整实验系统，正确分段，暂停进入；返回/重进/刷新及浏览器后退通过 | `output/port-lesson-four-navigation-qa/navigation.json` |
| 助手动作与动画返回 | 服务端动作触发相同跳转；返回第3页保持37.5%动画进度；390px返回按钮高44px | 同上 |
| 学生隔离 | 正式课堂四段跳转前后学生模拟状态一致；教师演示独立保存 | 同上 |
| 自动检查 | 前端96项、课程上下文11项、全项目类型检查、生产构建及差异检查通过 | `output/port-lesson-four-v10-qa/navigation-*-final.log` |

运行时API4300已重新载入并确认使用“跳转到完整实验系统”的提示词。下列初版日志继续作为历史证据保留。

## 初版交付内容（历史记录）

- [逐页教师讲稿](../course/port-management-lesson-four-teacher.md)：44页独立编写，讲授页250—284字；三个实机任务分别7、10、8分钟。
- [素材与参考](port-lesson-four-assets.md)：18张Imagegen素材、完整提示词、视觉参考、Alpha信息、SHA-256和使用页；另有4张实际模拟证据画面。
- 1600×1000画布，电影场景、剖面、方向动画、状态时间线、箱记录与大数字构图交替；16页动画一次播放后停住。
- 第10／19／30／35页在当前主舞台进入真实三维模拟；数字人和教师控制保留。操作、目标和记录可按需展开。
- 返回恢复来源页、动画进度与课堂全屏；重进、刷新恢复暂停现场。明确点击“重播本段”才重置。加载失败可返回课件或打开已验证证据画面。
- 五层提示词继续可编辑。四个专属演示模块通过 `simulation.open_demo({cueId})` 与 `simulation.return_to_slides()` 接入同一服务端校验。
- 当前运行摘要携带runId及递增revision，拒绝旧运行或旧版本摘要；演示状态与学生任务发布及自主练习记录分别保存。
- 保留原28个稳定标识，新增16个标识；v9数字书签逐项迁移，原教师自定义提示词保留。前153页内容与原构图保留，仅在现有注册表尾部追加第4讲。

## 初版验证结果（历史记录）

证据路径以仓库根目录为起点。最终页面验收使用生产预览 http://127.0.0.1:4173；主舞台测试使用隔离API4314，实际使用服务为4300。

| 检查 | 最终结果 | 证据 |
|---|---|---|
| 44页×教师／投屏×桌面／390px | 176个状态通过；无图片缺失、文字越界、页面溢出或教师元数据泄露；16:10比例保持 | `output/port-lesson-four-v10-qa/browser.json`及176张页面截图 |
| 16个动画页的0/25/50/75/100% | 80个关键画面；首次1秒延迟、手动暂停、重播、单轮停止与不自动翻页通过 | `motion.json`、`motion-*.png` |
| 四段实际主舞台运行 | 全部目标完成；切入暂停、播放暂停、返回、重进、刷新、重播通过；实际WebGL ready | `classroom.json`、`l4-*-main-stage.png`、`l4-*-completed.png` |
| 来源页、动画、全屏恢复 | 从动画页通过助手动作切入，再返回原页，37.5%进度和原全屏均保持 | `classroom.json` |
| 同步投影、窄屏和故障入口 | 页面、动画和三维现场同步；教师信息隔离；键盘Enter可切入；390px点击区域高58px；失败可返回并打开有效证据图 | `projection.json`、`projection-390-live.png`、`teacher-demo-390.png`、`demo-fallback.png` |
| 44页与4个演示的真实请求注入 | 实际API编译结果与提供给测试模型的系统消息完全一致；五层齐全；S01上下文正确；第41页自定义答案不注入 | `api-final.log`中的第4讲及assistant-prompts测试 |
| 动作与迁移 | 指定分段、返回、重复请求、无效入口、跨页更新、旧摘要拒绝、28个数字书签和自定义提示保留通过 | `api-final.log` |
| 在线模型口令 | 配置的真实课堂模型完成4次指定演示、4次返回及第41页提示；第41页进一步收紧后重新核验，只提供检查方向 | `live-assistant.json`、`live-ai-*.sse`、`live-ai-guidance-final.sse` |
| API上下文及投屏文案测试 | 17/17通过，包括全课程逐页五层提示检查、学生文案与状态迁移 | `api-final.log` |
| 共享页面DOM与教学证据测试 | 9/9通过，覆盖全197页显式构图及教师元数据隔离 | `web-final.log` |
| 四段业务内核及重放 | 四段完成、序列化后重放状态一致；装卸冻结快照116卸／78装／88提离已重跑核对 | `output/port-lesson-four-qa/evidence.json`、四个`*-demonstration.json` |
| 全项目类型检查 | 通过 | `typecheck-final.log` |
| 生产构建 | 通过；原有大资源块提示保留，退出码0 | `build-final.log` |
| git diff --check | 通过；Windows换行提示不影响检查 | `diff-check.log` |

表内简写文件均在 `output/port-lesson-four-v10-qa/`。视觉检查覆盖全部44页缩略图，并逐张查看开场、双向箱流、四类入口、任务、快照、岗位配置、释放时间线、问题与解析、主舞台及窄屏页。发现的字宽、照片与正文重叠、嵌入模拟首屏被说明区挤占等问题已经修正并重测。

外部模型首次回归出现一次连接失败；最终完整在线回归成功，其中一次调用在重试后成功。重复动作经过服务端校验，不会重置模拟或发布学生任务。第41页在线复核只要求提示，没有提前发送第42页解析或教师参考答案。

## 复现命令

```powershell
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-lesson-four-teacher-notes.mts
pnpm --filter @edu/platform-api exec tsx --test test/port-lesson-four.test.ts test/assistant-prompts.test.ts test/course-context.test.ts test/state-migration.test.ts
pnpm --filter @edu/teacher-web exec tsx --test test/teaching-slides.test.ts
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-lesson-four-evidence.mts
pnpm typecheck
pnpm --filter @edu/teacher-web build
node scripts/port-lesson-four-v10-browser-audit.mjs
node scripts/port-lesson-four-motion-audit.mjs
node scripts/port-lesson-four-v10-classroom-audit.mjs
node scripts/port-lesson-four-projection-audit.mjs
node scripts/port-lesson-four-live-assistant-audit.mjs
git diff --check
```

浏览器脚本默认5173，完整页面审计可用环境变量 `PORT_L4_URL=http://127.0.0.1:4173` 指定生产预览。主舞台与在线模型脚本默认隔离API4314；在线模型测试使用已有配置，可能产生模型调用费用。素材生成无需为复测重复执行。

本轮建设教师端课堂衔接，沿用现有学生实机模块；设备选型、布局优化和综合挑战保持在后续讲次。代码、课件与素材随项目统一纳入版本管理；运行日志保留在本地 output 目录。
