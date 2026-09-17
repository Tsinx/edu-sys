# 48 小时港口综合实训验收记录

验收日期：2026-09-13。实现版本：`port-operations/3.0`，船期生成器：`port-arrivals/1.0`。

生产预览：<http://127.0.0.1:4173/port-simulation-preview.html>。原训练入口为同一地址加 `?lab=legacy`。实施规则与接口边界见 [设计与使用说明](port-operations-48h.md)。

## 自动化检查

| 检查 | 最终结果 | 记录 |
|---|---|---|
| 仿真核心 | 51 / 51 通过 | `output/port-operations-qa/core-tests-final.log` |
| API 与课程配置 | 53 / 53 通过 | `output/port-operations-qa/tests.log` 中 API 测试组 |
| 网页组件与本地同步边界 | 79 / 79 通过 | `output/port-operations-qa/web-tests.log` |
| 全仓类型检查 | 通过 | `output/port-operations-qa/typecheck.log` |
| 最终网页类型检查 | 通过 | `output/port-operations-qa/web-typecheck-final.log` |
| 生产构建 | 通过，保留已有的大体积资源提示 | `output/port-operations-qa/build.log` |
| `git diff --check` 与新增文件空白检查 | 通过 | `output/port-operations-qa/diff-check.log` |

三个测试组最终共 183 项通过。网页测试记录采用修正后的独立重跑结果；初次总测试日志中的旧网页结果不作为最终结果。

核心测试覆盖三档波动强度各 100,000 次抽样：平均间隔接近 300 分钟、参考服务均值接近 240 分钟，且前者较大。覆盖同种子复现、随机流独立、到达顺序改变、预报信息隔离、资源原子预留、兼容泊位阻塞、满锚地等待、流程错误去重、逐箱记录、异常限制、资源调整后的剩余作业、精确教学暂停、交班和确定性重放。

## 完整 48 小时运行

固定种子 `20260932`，所有指标均来自教学模型。

| 指标 | 最终浏览器操作记录重放 | 有效配置验收样本 |
|---|---:|---:|
| 总成绩 | 92.66 | 100 |
| 已到期箱量 | 1,712 | 1,712 |
| 按时完成到期箱量 | 1,467 | 1,712 |
| 总完成箱量，含提前完成任务 | 1,870 | 1,962 |
| 船舶流程完成 | 40 / 40 | 40 / 40 |
| 交班核对完成 | 16 / 16 | 12 / 12 |
| 实际单位成本 | 1.782928 教学点 / 箱 | 1.397644 教学点 / 箱 |
| 参考单位成本 | 1.766077 教学点 / 箱 | 1.766077 教学点 / 箱 |

有效配置为 5 台宽幅岸桥、12 台 AGV、4 台 RMG、2 套智能闸口，岗位共 15 人，建设投入 1,117 教学点。该样本验证满分可以通过有效规划和完整作业获得，不表示所有初始方案均能满分。固定参考方案是评分对照，不宣称最优。

最终数据见 `final-browser.json`、`final-export.json`、`reference-comparison.json` 和 `efficient-plan.json`，均位于 `output/port-operations-qa/`。早期 `browser-prod.json` 保留完整操作链的执行证据；最终成绩以同一操作记录在最终内核与参考规则下的 `final-browser.json` 为准。

## 网页与兼容性

- 完整新界面操作链 9 项通过；最后一轮生产交互与存档复核 7 项通过。实际操作覆盖船舶拖拽、泊位时段预约、货批分配、人员与岸桥拖拽、手续、异常、作业和交班。
- 桌面与 390 像素窄屏检查了预报表、三维场景、工作台、数字输入和拖拽的等效选择操作，无页面横向溢出。窄屏提供现场与业务工作台快捷入口。
- 教师配置检查 3 项通过：教师指定模式覆盖本地偏好、学生不能切换模式、相反模式存档导入被拒绝且当前场次不受影响。记录为 `classroom-browser.json`。
- 旧版生产浏览器检查 13 项通过：旧训练完整 300 箱作业、教学与实战时钟、后台补算、中断存档以及 `terminal-lab/2.0`、`2.1`、`terminal-training/1.0` 的兼容。记录为 `output/terminal-3d-qa/training-production-report.json`。
- 导入忽略文件附带成绩，由操作记录重放计算；损坏存档被隔离，新挑战可正常建立；已完成实战可以选择最终结果并导出。上述浏览器检查均未出现页面运行错误。

代表截图位于 `output/port-operations-qa/`：`desktop-working-prod.png`、`final-narrow-dispatch.png`、`final-desktop-review.png`、`final-narrow-review.png`、`final-live-render.png`。

## 性能检查与验证范围

在 Chromium 无头浏览器的 SwiftShader 软件渲染环境，以 1600 × 1000 视口加载完整 48 小时记录，连续观察实际 WebGL 绘制 10.01 秒：116 帧，约 11.59 帧 / 秒；主线程脚本耗时约 0.684 秒，JavaScript 堆约 15.17 MiB，工作台切换响应约 193 毫秒，页面运行错误为 0。该结果只代表当前软件渲染环境，不作为实体显卡或手机的帧率承诺。原始记录为 `performance.json`。

完整作业链浏览器测试使用测试专用墙钟压缩等待，通过实际 DOM 输入操作；这不等于持续等待了 48 分钟现实时间。产品实战仍固定 60×。性能检查没有冻结渲染。

以上为原版实训验收范围。后续已增加独立的实验提交、服务端复算、教师汇总和只读回放；普通存档仍不进入校园同步队列。新增功能及复验入口见 [实验提交与成绩检阅](port-submissions.md)。

## 复验命令

在仓库根目录执行；浏览器脚本使用当前环境已安装的 Playwright，课堂配置脚本需要 5173 开发服务，其余新界面脚本使用 4173 生产预览。

```powershell
pnpm test
pnpm typecheck
pnpm --filter @edu/teacher-web build
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-operations-reference-audit.mts
$env:PORT_OPS_TEST_URL='http://127.0.0.1:4173'
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-operations-browser-audit.mjs
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-operations-final-audit.mjs
node scripts/port-operations-classroom-audit.mjs
node scripts/port-operations-performance-audit.mjs
$env:TERMINAL_TEST_URL='http://127.0.0.1:4173'
node scripts/terminal-training-browser-audit.mjs
git diff --check
```
