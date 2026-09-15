# 港口仿真操作教学

新增独立的“操作教学”，与自主练习、课程标准演示分别运行。学生跟随高亮和虚拟手势操作，实际业务仍由原箱级仿真内核执行。

## 使用方法

- 进入教学模式、切换课程或重新挑战时，选择“开始操作教学”或“跳过，直接练习”。全屏、面板切换和从教学／演示返回不重复询问。
- 顶部“操作教学”可随时重新打开。教师指定短课程时只提供对应教程；综合教学提供入港、装卸、堆场、规划、离港五段目录。
- 教程中根据高亮点击或右键对象，对照资料填写，再亲自拖拽分配。拖拽源与有效目标同时出现在操作区；键盘和触屏可以选择对象后直接点目标。
- “再演示一次”只重播手势。“继续运行”才推进等待中的业务。“收起提示”保留当前步骤与操作入口，给现场更多空间。
- 教程完成或退出后返回原练习，原练习保持暂停，由学生手动继续。教程不计成绩、不写课程完成标记，也不能导入或导出自主练习记录。
- 刷新放弃当前教程，再次进入原练习的教学询问。实战开局前可以主动学习，运行中不允许切入教程，仍固定 60×。

## 业务与界面边界

`port-tutorial/1.0` 是内存教程脚本版本，不是新的成绩存档版本。`PortExperience` 区分 `practice | tutorial | demonstration`，不改变原有教学／实战规则。

独立教程复用现有单船课程起始情境。手续以有效回执为完成依据；分配和调度以真实指令生效为依据；箱流、异常核查、离港与资源释放以真实作业结果为依据。多个兼容泊位或堆场均可接受，提前配置会自动识别。观察指令仅记录打开档案、岗位面板或有实际历史的箱记录，不会提交业务命令。

教程时钟在离散事件处检查步骤变化，新步骤只停一次。资料待回执、通行、核查和设备作业都必须运行时钟；重复点击或手动继续不会反复触发同一步暂停。普通课程的目标停点和旧存档重放规则保持原样。

原练习 Worker 保留并暂停，教程使用另一临时 Worker，即使 `storage: null` 也能返回原练习。退出会清理时钟和未完成请求；教程禁用历史持久化、导入、导出与课程完成回调。返回保留原练习的已应用方案、箱流、操作记录、选中对象与面板。

UI 通过 `data-tutorial-target` 注册稳定目标。聚光层使用真实 DOM 边界并裁掉滚动容器外的区域；Three.js 提供对象位置投影和轻量地面标记。手势为 SVG 动画，遵循减少动态效果设置，不派发鼠标事件或业务指令。引导层属于全屏舞台，步骤变化不重建场景。

## 验证入口

```powershell
pnpm test
pnpm typecheck
pnpm --filter @edu/teacher-web build
$env:PORT_TUTORIAL_TEST_URL='http://127.0.0.1:4173'
node scripts/port-tutorial-browser-audit.mjs
node scripts/port-tutorial-isolation-audit.mjs
node scripts/port-tutorial-visual-audit.mjs
$env:PORT_COURSE_TEST_URL='http://127.0.0.1:4173'
node scripts/port-course-browser-audit.mjs
node scripts/port-course-classroom-audit.mjs
pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-operations-final-audit.mjs
git diff --check
```

隔离与课堂脚本使用 5173 开发服务挂载真实课堂组件；完整五段操作与旧版业务浏览器回归使用 4173 生产预览。浏览器只缩短测试墙钟等待，不注入完成状态或成绩；隔离脚本额外模拟一条未返回的时钟请求，验证退出后重新进入仍可运行。

产物位于 `output/port-tutorial-qa/`，含测试、类型检查、构建日志，五段浏览器结果、隔离结果与桌面／窄屏截图。原有课程回归和 48 小时复盘结果分别保留在 `output/port-course-qa/` 与 `output/port-operations-qa/`。

## 本次验收记录（2026-09-14）

| 检查 | 结果与证据 |
|---|---|
| 全项目测试 | 222 项通过：核心 65、API 63、网页 94；`tests.log` |
| 最终网页针对性测试 | 教程入口、目标定位及课程入口 6 项通过；`web-final.log` |
| 类型与生产构建 | 全项目类型检查通过；最终网页类型检查及构建通过；`typecheck.log`、`typecheck-final.log`、`build-final.log` |
| 五段真实操作 | 7 组浏览器验收通过，涵盖五段完成、真实右键与拖拽、错误目标等待、390px 键盘等效操作、回到原练习；`browser-production.json` |
| 会话隔离 | 4 组通过：教师锁定、无存储保留、未返回时钟请求清理、反复进入、刷新与实战 60×；`isolation-browser.json` |
| 最终视觉与坐标 | 3 组通过：页面／侧栏滚动对齐、指针实际落点、390px 全屏输入框不被提示卡遮挡；`visual-browser.json` |
| 原课程与标准演示 | 5 组课程浏览器检查、3 组课堂检查通过；`../port-course-qa/browser-production.json`、`../port-course-qa/classroom-browser.json` |
| 48 小时旧业务回归 | 7 组通过；导入后重算仍为 92.66 分，忽略附带伪造成绩；`../port-operations-qa/final-browser.json` |
| 空白与补丁 | `git diff --check` 及新增文件行尾检查通过 |

代表截图：`offer-desktop.png`、`drag-gesture-desktop.png`、`document-gesture-desktop.png`、`document-gesture-narrow-fullscreen.png`。所有数值为教学情境；构建保留既有大分块体积提醒，无构建错误。
