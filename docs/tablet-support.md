# 平板上课与港口实训

本轮重点是学生入口与当前默认的港口分段实训（入港、装卸、堆场、规划、离港、综合）。保留原有课程内容、1600×1000 课件画布、评分规则和存档格式。

## 操作方式

- 单指拖动画面旋转视角，双指缩放或平移。轻点选择对象，再点“办理选中对象”进入工作台。
- 船舶调度使用“目的位置”与“申请进港 / 移泊”；预约使用计划时刻与“预约”；货批通过目标堆场下拉框分配。鼠标用户仍可拖拽。
- 操作教学在触屏上使用“选择对象 → 点选目标”，直接点教学操作区里的泊位、锚位或堆场按钮；每次操作仍由原业务内核检查并结算。
- 工作区可用宽度不超过 1100 像素时，现场与工作台纵向排列，使用“现场视图／业务工作台”切换定位。该规则也覆盖课堂嵌入区域和分屏窗口。
- 触屏设备默认使用“流畅”画面：像素比上限 1、1024 阴影贴图、低功耗渲染偏好；可以选择“清晰”。这是渲染设置，仿真时间和评分保持原规则。
- 全屏提供可点按的退出按钮；原有浏览器内铺满窗口方案覆盖不提供元素全屏 API 的环境。横竖屏调整不重建当前场景。
- 触屏上的主要按钮和表单高度至少为 44 CSS 像素；输入框和选择框使用 16 像素字号。学生首页、目录、课件导航和课堂播放控件同步调整。

## 实现位置

- `PortOperationsStudio.tsx`、`port-operations.css`：布局、业务入口、视角按钮、画质选择。
- `PortOperationsScene.tsx`、`TerminalScene3D.tsx`、`scene-gesture.ts`：触摸与鼠标手势分离，多指和取消事件不触发点选。
- `PortTutorialOverlay.tsx`、`useTouchInput.ts`：根据触屏能力显示点按教学说明。
- `student-home.css`、`student-classroom.css`：学生入口和课堂控件。

## 回归验证

在仓库根目录执行：

```powershell
pnpm test
pnpm build
git diff --check
node scripts/port-course-browser-audit.mjs
node scripts/tablet-simulation-browser-audit.mjs
node scripts/tablet-gestures-browser-audit.mjs
```

`tablet-simulation-browser-audit.mjs` 支持 `TABLET_BROWSER=webkit`、`TABLET_QA_PART=fullscreen` 或 `tutorial`。Chromium 覆盖 768×1024、1024×768、820×1180、1180×820、600×960、390×844；WebKit 使用 768×1024 和 1024×768。审计包含触屏点按、可见按钮尺寸、模块与工作台、横竖屏变化和全屏回退。手势审计另外发送真实浏览器触摸事件并验证业务状态、画质切换和 WebGL 丢失恢复。

学生入口使用生产构建的本地预览（开发模式默认打开教师界面），配合独立测试 API：

```powershell
$env:TABLET_QA_URL='http://127.0.0.1:4177'
$env:TABLET_QA_API='http://127.0.0.1:4317'
node scripts/tablet-student-browser-audit.mjs
```

浏览器审计读取 `PLAYWRIGHT_MODULE` 指定的 Playwright 模块；未指定时使用当前 Windows 工作环境的运行时路径。JSON 报告与截图位于 `output/tablet-qa/`。学生测试在独立 API 上创建并结束测试课堂，不应对正式教学数据运行。

这些检查是 Windows 主机上的 Chromium/WebKit 触屏模拟，不等同于 iPad Safari 或 Android 平板真机验收。真实设备上的帧率、温度、续航、软键盘及系统浏览器栏仍需要课堂设备确认；本轮没有实测性能提升百分比。

## 本轮验收（2026-09-16）

- 全仓库测试 262 项通过（仿真内核 68、API 85、Web 109）；最后的界面修正后再次通过 Web 109 项测试。
- Chromium 六种尺寸均完成六个模块、全部工作台页签的检查；另行验证打开的全屏工作台、横竖屏变化、44 像素控件及全屏 API 缺失时的退出。
- 入港、装卸、堆场、规划、离港五段教学均通过触屏点按完成，业务完成状态由实际内核返回。
- WebKit 通过 768×1024 与 1024×768 的全屏工作台、触屏控件与旋转检查。
- Windows WebKit 整页截图未捕获 WebGL 合成层；直接在绘制帧内读取画布已得到完整港区，未发生上下文丢失或 GL 错误。证据为 `webkit-canvas-readback.png`、`webkit-render-diagnostic.json`。后续审计在 WebKit 整页截图旁另存画布 PNG，不能仅凭整页截图或 `data-renderer=ready` 判断画面是否成功。
- 真实浏览器触摸事件覆盖旋转、双指缩放和平移、取消；画质切换、WebGL 丢失与恢复均保持业务状态。
- 生产构建学生端在 820、1180、768 像素宽度完成 15 个首页、课堂目录、跟随与自主浏览、课后学习及模拟入口检查，返回课件保留课次。
- 类型检查、生产构建和 `git diff --check` 通过；尚未进行真机验收。

验收汇总在 `output/tablet-qa/acceptance.json`，通过的专项报告为 `chromium-fullscreen-report.json`、`chromium-tutorial-report.json`、`webkit-fullscreen-report.json`、`gestures-report.json`、`student-report.json`。早期调试记录保留在输出目录，最终状态以验收汇总及这些专项报告为准。
