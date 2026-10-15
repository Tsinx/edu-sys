# 第11讲插图与3分钟开场片

片名：繁忙的港口，等待的货物。成片 `opening.mp4` 为180秒、1920×1200、30fps、H.264/AAC立体声，含中文旁白、画面字幕与原创合成配乐。无需联网调用语音服务。

- 课件入口：`/port-expansion-preview.html?lesson=11&page=1`。统一底部工具栏点击“播放开场片”；“影片控制”内可定位、静音、调音量、重播和下载。翻页停止，刷新暂停恢复，网页全屏与屏幕全屏均保留同一个播放器。
- 独立播放器：本目录 `index.html`，支持原生播放控制、逐镜头定位、逐字稿、MP4与SRT下载。
- 时间安排：0—3分钟开场片，3—8分钟写假设和核查新加坡资料；仍为90分钟、32页，33—63分钟个人电脑实操。
- 教师端输出声音，同步投影端与跟随的学生端静音，以免重叠回声。

四幅新插图由内置 image_gen 工具生成：通用港区全景、场桥与集卡、闸口、港外船舶。复用两幅既有课堂插图：岸侧作业与调度控制室。完整提示词见 [prompts.json](./prompts.json)，交付图片哈希与来源见 [asset-fingerprints.json](./asset-fingerprints.json)。共14页使用场景配图。

这些场景属于AI教学示意，不是新加坡事件实拍或实时AIS。2024年新加坡历史数据来自MPA 2024-05-30说明；其中明确锚地当时并未拥挤。改线机制、到达分布、任务结构、未完成样本与存量流量图为独立教学图解。120分钟与300箱为本讲实验设定。

可编辑源：`storyboard.json`（18镜头、逐字稿与来源）、`animation.js`（定时画面与图表）、`render.html`（制作预览）。课件标注在 `packages/course-content/src/port-lesson-eleven-media.ts`，用HTML文字绘制，不写进图片。

重建命令（从仓库根目录）：

```text
node scripts/port-eleven-film.mjs prepare
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-eleven-speech.mts
node scripts/port-eleven-film.mjs render
node scripts/port-eleven-film.mjs mux
node scripts/port-eleven-film.mjs verify
node scripts/port-eleven-browser-audit.mjs
```

渲染使用已运行的本地5173预览。语音重建使用项目现有授课音色配置，不在素材中保存凭据。音乐为确定性加法合成与节奏设计，未使用外部音乐采样。

验收数据保存在 `output/port-eleven-media/`：媒体元数据、完整解码、18镜头画面、声音响度、浏览器播放与版面记录。浏览器验证不替代真实教室音响和投影试讲。
