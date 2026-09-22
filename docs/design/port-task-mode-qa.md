# 模拟实验台：自由模式、流程任务与成绩上传验收

日期：2026-09-19。范围：本地当前工作区；未提交、推送或部署。

## 行为

- 入港、装卸、堆场、规划、离港、综合六类实验均提供教学／实战选择。切换保留原记录并另开场次；分段实战固定60倍，目标中途不暂停。
- 教师可从当前实验或标准演示公布当前流程，也可从课堂配置发布。任务按课程和流程保存在SQLite；新发布不关闭旧任务。学生端每10秒更新状态。
- 公布前允许练习，公布后由学生主动上传。后端校验教师发布权限、学生身份、课程权限、任务状态，并独立重放计分。
- 教学与实战综合实验均支持开始后提前上传。结果保留实际模式和未完成标记，列表、详情与CSV一致。每流程保留最高有效成绩及对应操作轨迹；低分、同分及核验失败均不覆盖已有最高分。2026-09-22 规则更新见 [成绩说明](port-submission-scoring.md)。
- 上传入口位于复盘面板顶部；教师演示、操作教学不进入学生成绩。

## 检查结果

- `pnpm test`：内核84项、API88项、前端120项通过；随后新增的五类分段实战回归纳入专项复验。
- 内核提交专项13/13通过，覆盖两种模式、提前结束、旧记录、篡改拒绝与五个实战分段的完整重放。一次并发检查中的综合测试超时，结束竞争任务后重跑全部通过。
- API任务与提交专项3/3通过，覆盖未发布拒绝、学生禁止发布、多流程并存、重启持久化、旧成绩保留与幂等提交。
- `pnpm build`（含工作区类型检查）通过；`git diff --check`通过。
- 浏览器完整提交／回放21项检查通过：六类结果上传、教师读取与重放一致；断网后封存重试、重新登录、版本冲突重试、独立成绩和桌面／390px窄屏检查。
- 浏览器模式专项8项检查通过：教师在标准演示中发布当前流程、运行中切换模式另开场次、实战与教学两种提前上传均经服务端验证为未完成、教师详情和CSV标记一致。

## 证据与复现

完整业务验收：`output/port-submission-qa/browser-report.json`。
模式专项：`output/port-task-mode-qa/browser-report.json`及同目录截图、`results.csv`。
最终上传入口布局：`output/port-task-mode-qa-layout/`。
命令日志：`output/port-task-tests.log`、`output/port-task-core-final.log`、`output/port-task-api.log`、`output/port-task-final-build.log`。

```powershell
$env:EDU_PORT_QA_NO_WEBGL='1'
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-submission-browser-audit.mts
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-task-mode-browser-audit.mts
$env:EDU_PORT_QA_LAYOUT_ONLY='1'
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-task-mode-browser-audit.mts
```

最终浏览器验收使用无WebGL的业务回退界面，真实身份、HTTP请求、持久化、工作线程、计分与回放仍实际执行。软件WebGL尝试发生交互超时；本次不声称完成三维画面性能验收，也不等同于学校网络部署验收。已检查实际截图中的任务发布条、模式选择、上传卡及教师成绩详情。
