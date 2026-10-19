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

## 使用边界

当前浏览器工具只有MCP应用，内置浏览器与Edge均报告不可用。用户确认可能与Codex资料迁移有关，并明确要求暂不处理、先完成内容。因此未执行桌面/390px逐页浏览、播放/暂停/拖动、教师投影同步、原生全屏连续性或实际投影音响验收。类型检查、静态检查及单元测试不代替这些验收。

本地开发预览为`http://127.0.0.1:5193/port-expansion-preview.html?lesson=13`，切换`lesson=14`可查看第14讲。完整内容包为`output/港口管理概论-第13-14讲-课件与视频.zip`。未进行远端部署。

## 可复核记录

- `output/port-trade-tests.log`
- `output/port-trade-context-tests.log`
- `output/port-trade-shell-tests.log`
- `output/port-trade-all-typecheck.log`
- `output/port-trade-build.log`
- `output/port-trade-media/verification.json`
- `output/port-trade-delivery-archive.json`

媒体制作：`python scripts/port-trade-media.py discover`、`download`、`render`。内容导出：`pnpm --filter @edu/teacher-web exec tsx ../../scripts/export-port-trade-content.mts`。媒体与布局预算复核：`python scripts/verify-port-trade-content.py`。
