# 第11、12讲实拍纪实开场片验收

2026-10-14，课程版本 `release-port-management-documentary-v19`。每片180秒，1920×1200、30fps、H.264/yuv420p与AAC立体声48kHz。沿用1600×1000课堂画布、同一影片控制器和统一工具栏；两讲32页、90分钟及30分钟电脑实操的时段保持一致。

| 讲次 | 影片 | 画面剪辑段 | 许可实拍来源 | 档案标题节选 | 中文旁白 |
|---|---|---:|---:|---:|---:|
| 11 | 等待，发生在哪里 | 26 | 9 | 9秒 | 13段，约102秒 |
| 12 | 放行之前 | 25 | 11 | 16秒 | 13段，约116秒 |

第11讲用作业动作观察运输、堆存和交付的接续，再回到MPA原始说明和可复核试验；第12讲从交接与核验进入生命安全、调查档案、信息可信、暂停与恢复的责任。开场保留动作和片段原声，旁白跨切点，转折留出停顿，片尾给出问题和署名。配乐为原创合成；字幕分句时间依据实际旁白录音计算。

## 直接使用

- [第11讲纪实片](http://127.0.0.1:5173/course-assets/port-management/l11-media/documentary-v2/index.html)、[第11讲课件](http://127.0.0.1:5173/port-expansion-preview.html?lesson=11&page=1)。
- [第12讲纪实片](http://127.0.0.1:5173/course-assets/port-management/l12-media/documentary-v2/index.html)、[第12讲课件](http://127.0.0.1:5173/port-expansion-preview.html?lesson=12&page=1)。

各播放器含章节定位、完整旁白、MP4和字幕下载、逐项素材署名、许可链接、历史事实范围、剪辑时间表与旧版对照。原 `l11-media/index.html`、`l12-media/index.html`转入新版；两份V1成片及编辑源均保留，旧片文件SHA256未改变。

实拍依据 [Pexels License](https://www.pexels.com/license/)剪辑，不以教学用途推断自动免责。每个来源的发布页、作者、片中使用时间和原文件SHA256均在 `documentary-v2/storyboard.json`列出。原素材只存放在ignored工作目录，不发布为素材库。普通港口、仓储实拍不是新加坡、天津或名古屋事件现场；素材人物与历史案件无关，无当事人采访或案件同期声。MPA明确当时锚地并未拥挤；名古屋材料指集装箱进出作业约三天中断，不扩写成全港物理作业停摆。

## 已核查

- 两片完整解码、5400帧、180秒与音视频格式；素材区间、剪辑连续性、来源覆盖及字幕文字完整性。
- 每讲13段旁白的波形均非静音、无削波；各抽取三段做实际语音识别，人工核对识别文本与脚本。未声称完成主观试听或实际教室音响试播。
- 实际浏览器中播放、暂停、定位、从头重播、自然结束、暂停后刷新、离页停止、全屏连续性、教师有声/投影静音跟随、学生只读及一条工具栏。
- 独立播放器整段连续播放至结束、章节跳转、原入口跳转、MP4下载、390px布局；两讲全部64页×1600/390两种宽度，共128页幅检查。图片、文本边界、局部溢出、教师元数据检查均无问题。
- teacher-web全套212项、platform-api全套145项通过；包含学生文案审计、上下文和影片事件权限校验。全工作区类型检查与Vite生产构建通过；构建保留既有大分块提示。
- 港口相关 `git diff --check`通过。全仓检查仍报告既有 `docs/course/economic-mathematics-limits-exercises.md:953`文件末尾空行；未改动这项无关工作。

第11讲首次在并行导出期间遇到4倍连续播放的60秒检查超时；之后增加分段进度记录并完成全段播放，最终浏览器报告无媒体或控制台错误。初次记录保存于 `output/port-documentary-recut/l11/browser/attempt-01/`，最终报告为同目录上级 `audit.json`。最终交付文件另外比对public、生产目录与浏览器下载的SHA256。

## PDF与证据

两份新版PDF各32页、32个书签，嵌入中文字体，逐页检查无越界文字，已重新渲染检查封面和各页。第11讲最少214字符/页，第12讲最少212字符/页。按8页分批，只导出这两讲；Windows硬CPU上限10%、整个任务内存上限1536MiB，测得峰值分别521.8与528.2MiB。整门549页旧导出未重建。

- 第11讲：`/handouts/port-documentary-v19-l11/port-management-lesson-11-v19-documentary.pdf`。
- 第12讲：`/handouts/port-documentary-v19-l12/port-management-lesson-12-v19-documentary.pdf`。

机器证据在 `output/port-documentary-recut/`：各讲 `media-qa.json`、`audio-audit.json`、`final-contact.jpg`、`browser/audit.json`、`pdf-checks.json`，以及 `delivery-audit.json`、前后端测试日志和生产构建日志。制作脚本为 `port-documentary-sources.mjs`、`port-documentary-author.mjs`、`port-eleven-speech.mts --documentary`、`port-documentary-film.mjs`、`port-documentary-player.mjs`。原片保留在工作输出，课堂播放件可进行体积优化；最终校验以实际交付MP4为准。

本地浏览器与文件检查不替代真实整班90分钟、投影和音响试讲。
