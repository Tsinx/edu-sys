# 学生学习空间与课堂定位

学生首页、课堂和课下学习共用浅色视觉。第四讲课件下方提供“仿真系统”，教师进入独立实验系统，学生在课堂学习窗口中开展个人实验；课下学习保留独立实验页和返回入口。

## 使用行为

- 首次加入课堂默认跟随教师。学生翻页、选课次或操作实验后切换为自由浏览；顶部持续显示教师位置，点击“一键跟上教师”恢复跟随。
- 浏览状态按账号和课堂存入 sessionStorage。自由浏览时的页码、模块不会写回教师课堂。
- 仿真同步只定位模块。参数、时钟、结果和个人存档独立；重复位置消息不会重建实验。切换实验模块前等待当前运行状态及本机存档写入。
- 沿用原有账号与课程的学生实验存储范围。课堂结束后仍可浏览；SSE 不可用时使用 5 秒轮询，轮询正常时仍可跟随。
- 课件保持 1600×1000；目录在手机上以抽屉显示。动画控制位于画布外，课下答疑可收起。全屏时也显示教师位置与跟随入口。

## 接口

`ClassroomSnapshot.simulationNavigation` 为可选、可空字段，内容为 `{ unit, originSlideKey }`。unit 使用现有 arrival、cargo、yard、planning、departure、full 模块。

沿用 `POST /api/class-sessions/:id/events`，增加 `set_simulation_navigation` 事件；navigation 为定位对象或 null。接口沿用教师身份检查，验证课程及来源页，更新 runtimeVersion，重复相同定位不增加版本。null 返回来源页；教师翻页、切换课堂活动也清除独立实验位置。旧数据缺少字段时继续使用 activeActivity 和 slide。

教师独立实验 URL 携带 session 和站内 returnTo；模块选择更新课堂位置与当前 URL。返回链接及浏览器返回课堂都恢复课件定位。学生不能写入这些事件。

## 验证

```powershell
pnpm test
pnpm build
git diff --check
```

浏览器验收使用独立测试 API 和生产预览，勿指向正式课堂数据：

```powershell
$env:STUDENT_QA_API = 'http://127.0.0.1:4316'
$env:STUDENT_QA_URL = 'http://127.0.0.1:4176'
$env:STUDENT_QA_PART = 'pages' # 也可设为 simulation；不设置时执行全部
node scripts/student-learning-browser-audit.mjs
node scripts/student-learning-isolation-audit.mjs
```

报告与截图写入 `output/student-learning-qa/`。`browser-report-pages.json`、`browser-report-simulation.json` 与 `isolation-report.json` 分别记录页面、同步和隔离检查，`acceptance.json` 汇总本次验证。浏览器检查覆盖角色隔离、跟随与自主浏览、刷新、断线重连、独立仿真模块切换、课下学习返回、课程兼容和港口课件的 394 个页面/视口组合。浏览器启动参数使用软件 WebGL，避免依赖验收机器的显卡。
