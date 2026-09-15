# 正常流程实训：练习场与实战场

本次在实时 3D 物理模型外新增训练会话层，保持四类实验视图、已有设备选型与规划能力。场景和设备参数是教学假设。

## 操作规则

默认正常流程方案使用常态双船、300 箱、12 台集卡、23 人、建设投入 736 教学点；班次上限 480 分钟。学生开局前可调整设备、布局和人员，课堂教师发布的工况与训练场规则锁定。

练习场首次遇到具备处置条件的待办时暂停，可以随时手动继续等待航道或缓存释放。同一待办只提醒暂停一次。错误指令被拦截、解释并记录，不扣分；默认 120×，可调速。

实战场开局后以 60× 连续运行。切换实验视图不会暂停；网页后台和冻结恢复使用实际经过时间补算。刷新、离开或开启另一场次后，未完成的实战只作为中断记录复盘。

| 节点 | 生成条件 | 完成依据 |
| --- | --- | --- |
| A / B 船到港放行 | 场次开始时两船在锚地 | 放行成功，进入共享航道 |
| A / B 船系泊 | 到达各自泊位 | 确认系泊成功 |
| A / B 泊位开工 | 对应船已系泊 | 对应船实际产生卸箱量 |
| 水平运输 | 岸侧产生待运箱 | 实际产生运输箱量 |
| 堆场接箱 | 运输交接区产生箱量 | 实际产生入场箱量 |
| 闸口交付 | 堆场产生待交付箱 | 实际产生交付箱量 |

每个节点只生成一次。提前启用运输、场桥或闸口班组也能通过实际作业完成节点。事件卡、现场控制台和人员调度均通过同一会话命令执行。等待条件的卡片保留资源调整、接续下游作业或继续运行入口。

## 评分与复盘

9 个节点各 10 分，全量交付额外 10 分。未完成的节点不计分。总分为完成得分减扣分，下限为 0。

实战中“未到达就确认系泊”和“未系泊就启动岸桥”分别是明确的流程错误，每个节点的每种错误仅扣 5 分一次。资源不足、缓存满载、航道占用、重复或过期提交、无效资源表单不扣分。普通事件没有超时扣分，延误通过运行成本、排队和吞吐体现。

复盘记录每次学生指令、处置前原始状态、规则编号、判定、扣分及结果，并保存事件状态变化时间线。导出版本为 `terminal-training/1.0`，脚本 `normal-flow/1.0`。导入由初始方案和指令重算所有事件与分数，文件内附带的成绩不能覆盖计算结果。

历史 `terminal-lab/2.0` 和 `terminal-lab/2.1` 继续按原引擎重放、原样导出，不补算新成绩；可从原始方案开始新的训练场次。

## 保存与课程接口

- 新的存档键：`edu-terminal-training:<actor/course scope>:<scenario>:<practice|battle>:normal-flow/1.0`。旧键保留，并作为旧版记录列入历史。首次升级默认进入新的正常流程练习预设。历史场次单独存储，索引位于 `:history`。
- 本地快照始终保存为可复盘的安全状态：练习暂停，未完成实战中断。因此浏览器异常退出也不会把实战恢复成可继续作答的活跃场次。
- 课堂沿用按身份隔离的 IndexedDB 存储适配器，独立预览使用 localStorage。导出仅包含模型方案、指令和评分证据，不含课程身份、姓名、学号或身份令牌。
- 课堂配置接口新增可选 `trainingMode: practice | battle`，未配置默认练习场；更新其他字段时保留既有规则。学生读取课堂快照后锁定此选择。未增加服务器端成绩表或实时学生监控。

## 代码与验证

- `packages/port-simulation-core/src/terminal-training.ts`：事件生成、每秒边界暂停、处置分类、去重评分、匿名导出与确定性重放。
- `useTerminalTraining.ts`：真实经过时间、后台补算、场次存储、历史归档、刷新恢复。
- `TerminalTrainingPanel.tsx`：单张展开卡片、队列、3D 定位、处置结果和复盘。
- `packages/contracts/src/index.ts` 与 `apps/platform-api/src/store.ts`：教师配置与快照。

运行：

```powershell
pnpm --filter @edu/port-simulation-core test
pnpm --filter @edu/platform-api test
pnpm --filter @edu/teacher-web test
pnpm typecheck
pnpm --filter @edu/teacher-web exec tsx ../../scripts/terminal-training-browser-audit.mjs
pnpm --filter @edu/teacher-web build
$env:TERMINAL_TEST_URL = 'http://127.0.0.1:4173'
pnpm --filter @edu/teacher-web exec tsx ../../scripts/terminal-training-browser-audit.mjs
pnpm --filter @edu/teacher-web exec tsx ../../scripts/terminal-training-resource-audit.mjs
git diff --check
```

浏览器审计直接点击界面执行处置；为缩短等待，仅在测试浏览器调整墙上时钟，仿真继续使用原有一秒内核。后台补算通过 Chromium 冻结 / 恢复生命周期验证。截图暂时冻结测试响应中的绘制循环以避免软件 WebGL 清屏采样；不改变应用状态。

当前验收结果以 `output/terminal-3d-qa/training-browser-report.json` 和 `training-production-report.json` 为准。

## 验收记录 · 2026-09-11

- 核心 42 项、教师 Web 76 项、API 53 项测试通过，共 171 项；包含课堂规则默认值、修改保留、非法值拒绝、教师锁定和旧存档升级。
- 全工作区类型检查、生产构建通过。构建保留原有大分块体积提示。
- 4173 生产页面通过 13 项综合检查、4 项资源阻塞恢复检查；桌面和 390px 窄屏均完成双船 300 箱交付，得到 100 分。另一次零司机、岸侧 60 箱满载场景，经现场调度后恢复箱流，未产生扣分。
- 卡片与现场控制台共同完成真实节点；练习自动暂停、手动继续、实战固定 60×、错误去重、Chromium 冻结后台后的时间补算、刷新中断、匿名导入导出、2.0 / 2.1 原样重放均通过。
- 原始生产报告：`training-production-report.json`、`training-resources-report.json`；4 张生产截图位于 `output/terminal-3d-qa/`，已完成视觉复查，无横向溢出或被截断的事件文案。卸船与全量交付通知各出现一次。
- API 4300 已重启加载新配置，健康检查成功；4173 已更新到本次构建。没有提交或推送仓库。
