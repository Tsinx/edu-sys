# 课程分段、标准演示与全屏验收

验收日期：2026-09-13。当前生产预览为 `http://127.0.0.1:4173/port-simulation-preview.html`。

| 验证项 | 结果 | 证据 |
|---|---|---|
| 仿真核心 | 56 / 56 通过 | `output/port-course-qa/tests.log` |
| API 与课程发布 | 53 / 53 通过 | 同上 |
| 网页与本地存储 | 80 / 80 通过 | 同上 |
| 最终分段核心复验 | 5 / 5 通过，包括自选堆场用途后的真实试运行 | `output/port-course-qa/core-course-final.log` |
| 全仓及最终网页类型检查 | 通过 | `typecheck.log`、`web-typecheck-final.log` |
| 生产构建 | 通过，保留已有的大资源包提示 | `build.log` |
| 分段生产浏览器验收 | 5 项通过，页面运行错误 0 | `browser-production.json` |
| 教师锁定与演示入口 | 3 项通过，页面运行错误 0 | `classroom-browser.json` |
| 原 48 小时综合挑战回归 | 7 项通过，导入后重算仍为 92.66 分 | `output/port-operations-qa/final-browser.json` |
| 差异与新增文件空白检查 | 通过 | `output/port-course-qa/diff-check.log` |

除明确给出其他目录者，表内日志均位于 `output/port-course-qa/`。三个完整测试组共 189 项通过；分段核心最终复验包含在该数量中，不重复计数。

## 已实际验证的操作

- 新用户进入单船入港实训，显示六个课程入口，黄色标准演示按钮可见；入港工作台只列船舶和复盘。
- 在全屏中办理三项手续、等待回执、申请进港并完成靠泊，目标依据实际状态完成。首次达到目标暂停，继续后同一目标不重复暂停。
- 全屏切换计划与操作面板、退出后保持相同 Three.js 画布和原作业状态。
- 标准演示可以播放、暂停、单步执行和完成；关闭演示后恢复原自主练习，存储中的原练习记录没有被演示覆盖。
- 装卸实训从已靠妥现场开始；通过真实鼠标拖拽把进口批次分配至堆场。堆场实训保留两批进口箱、已发生的交接记录和待核查箱。
- 390px 窄屏课程导航无横向溢出，全屏操作抽屉、课程目标与 Esc 退出均可用。
- 演示镜头跟随移动对象；选择全景或手动操作镜头可接管取景。窄屏全屏操作抽屉展开时，画面中心上移，船舶和码头保持可见。
- 教师发布的装卸分段覆盖学生已存偏好和 URL 参数；其他分段锁定。该分段的演示可独立打开，返回时原练习仍为未开始现场。
- 五个短分段分别以自主练习和示范指令完成，并从记录重放得到相同箱状态、任务与目标。提前进港不会完成目标；伪造完成字段不被采纳。
- 原综合挑战保留规划、调度、拖拽、导入重算、最终结果选择与损坏记录恢复能力。

## 画面证据

代表截图：

- `output/port-course-qa/arrival-desktop.png`
- `output/port-course-qa/fullscreen-plans.png`
- `output/port-course-qa/fullscreen-arrival-complete.png`
- `output/port-course-qa/standard-demonstration.png`
- `output/port-course-qa/yard-narrow.png`
- `output/port-course-qa/fullscreen-narrow.png`

使用 Chromium 无头浏览器和 SwiftShader 检查实际 Three.js 渲染。操作链测试采用测试专用墙钟缩短等待，业务仍由产品内核和实际页面指令推进；未用测试脚本直接赋予目标完成状态。原 48 小时回归在课程接入完成后验证，随后对演示镜头和窄屏取景的调整另行完成了生产浏览器与视觉复核。
