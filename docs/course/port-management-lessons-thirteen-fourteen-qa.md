# 第13—14讲内容交付检查

日期：2026-10-19。第13讲32页、第14讲40页，各90分钟；前后半场各45分钟。全课程连续621页，前12讲页码保持不变。

## 已通过

- 前端相关测试9项：第7—14讲逐页来源、可见材料与解析隔离；时间模型、费用敏感性、七区覆盖与媒体记录。
- API/内容上下文测试10项：课程目录、全局页码、学生文案、621页上下文边界，以及逐页呈现事件；4个视频标识与时长严格绑定当前页。
- 共享工具与全屏控制单元测试5项。此项不等于浏览器全屏实测。
- `pnpm typecheck` 全仓类型检查。
- `pnpm --filter @edu/teacher-web exec vite build` 生产前端构建。未以此冒充全部课程PDF重建或远端部署。
- `git diff --check`。
- 72页标题、导语、要点和表格的字体几何预算。Microsoft YaHei字体度量，不替代浏览器排版检查。
- 4段H.264/AAC视频完整解码、1280×800画幅、非静音音轨、时长和SHA-256核对；抽取最终画面检查原台标、日期、来源边界及完整画幅。
- 离线包22个文件，2份阅读HTML共72页、4个MP4，ZIP完整性及本地相对引用检查通过。阅读HTML不包含教师稿、助手约束字段或隐藏参考解析。

## 视频与课堂位置

第13讲16页40秒；第14讲18页32秒、19页40秒、23页45秒。共157秒。具体原片入出点、来源、输出指纹与观察字幕类型见公开媒体目录的`edl.json`。

## 2026-10-19视觉重构与浏览器验收

用户修复浏览器后，先建立72页视觉问题清单，再完成图解与排版重构。清单见`port-management-lessons-thirteen-fourteen-visual-review.md`。所有图解采用原生HTML/SVG；固定1600×1000画布，案例、课程时长、来源、4段原视频保持原有边界。

- 在内置Chromium浏览器逐页核对第13讲32页与第14讲40页，1440×1000及390×844各一遍。每次输入页码后等待对应页身份出现，再截图并读取边界；共144次检查，无错页、横向溢出、坏图、文字超出画布或作者字段泄漏。
- 逐页图内文本碰撞检查未发现交叠；通过全讲截图总览及关键页原尺寸检查。图示包括非比例联系图，不冒充实际行政地图、线路或围网。
- 教师8张解析页在桌面和390px分别展开，16次检查均无图解与答案遮挡；窄屏更多工具与解析按钮可操作。
- 4段视频在浏览器实播，定位到原片段，1280×800画面正常且有解码帧；暂停、进度定位、静音及音量滑块正常。
- 海关视频播放期间进入网页全屏、进入原生屏幕全屏、退出屏幕回到网页全屏再退出；视频持续推进，无重建或重播。通过原生全屏元素和解码帧数核对。
- 海关视频刷新后恢复到保存位置，保持暂停；教师与本机投影通过已有BroadcastChannel同步播放和暂停，投影静音且无教师控件。
- 浏览器控制台无错误或警告。Edge扩展首次连接超时后使用已恢复的内置浏览器完成验收，未修改浏览器系统设置。
- 修订相关前端14项、API/上下文10项测试通过；学生文案审核、全仓类型检查、前端Vite生产构建与`git diff --check`通过。构建有原有大分块提醒，不是构建失败。

## 使用边界

以上为本地课件、教师预览、学生独立阅读与本机双端投影验收；未验证生产课堂的多人服务器同步、实际教室投影音响或远端部署。没有把静态或本地验收当作这些环境的验收。

本地开发预览为`http://127.0.0.1:5193/port-expansion-preview.html?lesson=13`，切换`lesson=14`可查看第14讲。视觉修订版的课堂阅读HTML和视频保持完整相对目录；原交付包保留，另输出视觉修订版ZIP。

## 可复核记录

- `output/port-trade-tests.log`
- `output/port-trade-context-tests.log`
- `output/port-trade-shell-tests.log`
- `output/port-trade-all-typecheck.log`
- `output/port-trade-build.log`
- `output/port-trade-media/verification.json`
- `output/port-trade-delivery-archive.json`

媒体制作：`python scripts/port-trade-media.py discover`、`download`、`render`。内容导出：`pnpm --filter @edu/teacher-web exec tsx ../../scripts/export-port-trade-content.mts`。媒体与布局预算复核：`python scripts/verify-port-trade-content.py`。

## 本次复核记录

- `output/port-trade-browser-before/`：原72页桌面截图和问题审查。
- `output/port-trade-browser-after/verified-pages.json`：144次带页面身份的边界与权限检查。
- `output/port-trade-browser-after/reveals.json`：16次教师解析检查。
- `output/port-trade-browser-after/videos.json`：3段第14讲视频的实际播放状态。
- 同目录有桌面、390px、解析与播放截图；第13讲海关视频的播放、全屏、刷新和投影操作见本轮浏览器工具记录。
- `output/port-trade-revision-frontend.log`、`context.log`、`typecheck.log`、`build.log`（后3项同前缀）：本次测试与构建。
