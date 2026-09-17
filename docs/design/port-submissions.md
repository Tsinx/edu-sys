# 港口实验提交与成绩检阅

## 使用入口与评分

学生登录后进入港口仿真，在“复盘”页提交。入港、装卸、堆场、规划、离港和48小时综合实训分别提交；每位学生在每门课程的每类实验只有一份当前有效结果。

分段可主动“结束并提交”，目标完成度为当前已达成目标数 / 总目标数 × 100，四舍五入到两位小数；未达成目标仍在详情中列出。预置场景不新增计分目标，规划分段中的系统试运行不被标为学生业务操作。综合实训必须完成48小时实战，履约50分、船舶流程完成15分、按时离港5分、效率20分、交班10分，另计明确流程错误扣分；评分版本1的旧记录保持原流程20分规则，教学模式及中断实战不能提交最终成绩。

教师通过课程工作区“实验成绩 · 浏览与复现”进入 `/courses/course-port-management-intro/experiment-results`。列表按学生展示六类实验，支持学生、实验及状态筛选和CSV导出；未提交保持“未提交”，不填0分。新提交核验失败不覆盖原成绩。不增加人工改分、审批、评语或课程总评权重。

分段目标完成度不是管理能力总分。详情与复盘另列本段仿真耗时、扣除预置操作后的成本与运输距离、翻箱、错误、补正次数和提交时间跨度；成绩表导出同时保留耗时与本段成本。只对相同起点、任务和配置作效率比较。

## 封存与复现证据

`port-experiment-submission/1` 封装实验类型、结束方式、完整原始记录、预期业务状态SHA-256和分数。原始记录保留：

- 内核、航行、船期生成器或分段预置版本，初始配置、种子、方案和船期。
- 原有可重放指令序列 `commands`，以及未合并的完整输入 `inputLog`，包含等待、错误、拒绝和时钟操作。
- 分段预置清单 `fixture`；自选规划方案仍由实际指令记录。
- `traceCoverage` 标记完整采集或旧版记录。旧版可以按原规则重放，未记录的拒绝操作不能补造。

封存先暂停分段时钟，等待已经发送的工作线程消息按顺序处理，再保存不可继续修改的快照。重新练习建立新记录。待上传包先持久化到学生本机，再发网络请求。点击提交之外，普通练习不会自动上传；它仍不进入 `/api/edge/records` 同步队列。

服务端独立重放并重算分数和业务状态，检查版本、初始参数、船期、完整输入与原指令的一致性。附带分数不作为权威分数，篡改或不一致的提交会拒绝。服务器额外保存节点操作、前后关键状态、逐箱交接及运营指标，系统预置、学生输入和规划系统试运行有来源标记。

这证明提交内容能够按版本复现，不证明操作必然由学生本人完成，也不构成在线监考证明。

## 服务与状态

| 接口 | 行为 |
| --- | --- |
| `POST /api/port-operations/submissions` | 学生以幂等编号、当前成绩版本和封存包提交；返回接收状态 |
| `GET /api/port-operations/submissions/:id` | 本人或教师读取核验进度及服务器结果 |
| `GET /api/port-operations/courses/:courseId/results` | 学生读取自己的最新结果；教师读取课程名单、最新结果及待处理状态 |
| `GET /api/port-operations/submissions/:id/replay` | 核验通过后读取或下载不可变提交包、节点轨迹和报告 |

身份从会话获取，不接受客户端指定成绩归属人。学生路由白名单、学生课程权限、提交本人权限、课堂所属课程及教师角色均在服务器检查；开发模式下也必须提供身份。教师沿用平台现有课程访问范围。可选课堂编号经校验后持久化为来源信息，不限制课后提交。

数据库位于 `${EDU_DATA_FILE}.port-results.sqlite`，保存不可变提交、持久化队列和最新有效结果指针。状态为 `queued → verifying → verified/rejected`。默认单工作线程，180秒超时、512 MB工作线程堆限制，上传请求最大20,000,000字节，最多50,000条输入。单学生最多同时有6份待核验提交。

重复请求返回同一编号；复算成功后通过事务检查当前版本再替换。多设备冲突或核验失败保留旧结果，学生需刷新后主动重试。退出或重启服务会保留队列，启动时恢复中断任务。成绩列表只查询小型结果摘要，不在每次刷新时加载全部复现文件。

## 教师回放与兼容

教师详情默认显示最终分数、目标或评分项。按需打开完整节点和独立只读三维播放器，支持播放/暂停、倍速、前后节点、跳过等待和按仿真时间定位到此前已完成的操作。同一时刻的指令使用原顺序。

播放器以初始状态重建或从当前节点继续执行，规划自动试运行可以定位到单个系统操作执行后的现场。使用服务端已核验的参考单位成本重算最终评分，并校验业务状态哈希。它不运行学生保存钩子、不发业务指令、不改变课堂画面。WebGL不可用时仍有结果、节点、状态及下载入口。下载包可通过仿真器的导入功能重新读取，之后重练才建立可操作的新场次。

旧本机历史保留供兼容和备份，常规界面只显示当前练习和最近提交。后台保存旧提交用于追溯，不展示学生多次成绩排行榜。

## 发布与复验

校园发布包新增 `port-submission-worker.mjs`，必须随 `server.mjs` 一起分发。既有 `admin.mjs backup` 会纳入成绩SQLite；应停止服务后执行跨数据库一致性备份。

```powershell
pnpm --filter @edu/port-simulation-core exec tsx --test test/port-submission.test.ts test/port-operations.test.ts test/port-course.test.ts
pnpm --filter @edu/platform-api exec tsx --test test/port-submissions.test.ts
pnpm typecheck
pnpm --filter @edu/teacher-web build
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-submission-browser-audit.mts
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-submission-browser-followup.mts
node scripts/build-campus-release.mjs output/新的发布包目录
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-submission-release-audit.mts output/新的发布包目录
git diff --check
```

浏览器脚本在临时数据目录创建独立师生账号，并使用本地5187端口；发布包验证使用5197端口。输出位于 `output/port-submission-qa/`。六类完成场次通过确定性内核生成并经真实导入、提交按钮和教师界面验收；这不等于学生实际持续上课48分钟或已在学校网络部署。
