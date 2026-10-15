# 第12讲：守住安全，才能抵达

约3分钟开场成片 `opening.mp4`，180秒、1920×1200、30fps、H.264/AAC立体声，含中文旁白、画面字幕及原创合成音乐。

- 课件：`/port-expansion-preview.html?lesson=12&page=1`，底部“播放开场片”；“影片控制”可暂停、定位、重播、静音、调音量和下载。
- 独立播放器：[index.html](./index.html)，支持18个镜头定位、逐字稿、资料来源、MP4和SRT下载。
- 实验：`/port-class-lab.html?lesson=12`。实验参数保持原样，各自进度与第11讲分开。
- 新版PDF：`/handouts/port-safety-civic-v18/port-management-lesson-12-v18-safety-civic.pdf`。

思政主线为人民至上、生命至上、安全发展与职业责任。片中以交班、记录差异、屏障、共同依赖和恢复验证连接价值判断与专业知识；结尾要求学生在进度与核验冲突时说明决定依据。任务评价诚实记录、证据、推理和责任交接，不以复述口号代替分析。片中没有提前公布票据隔离答案或最佳操作序列。

0—3分钟观看短片，3—8分钟写判断并核查案例，仍为90分钟、32页，33—63分钟个人实操。教师端输出声音，同步投影与跟随学生端静音；翻页停止，刷新暂停恢复，全屏保留同一个视频元素。

五幅新场景由内置image_gen工具生成：`handoff-source.png`（交班）、`warehouse-source.png`（仓储检查）、`records-source.png`（记录核验）、`drill-source.png`（协同演练）、`community-source.png`（港城关系）。另复用第11讲通用闸口场景。JPEG交付图在同目录，完整生成提示词见 [prompts.json](./prompts.json)，素材来源与哈希见 [asset-fingerprints.json](./asset-fingerprints.json)。15页使用场景图，文字、图表及标注由代码绘制，可编辑。

场景均为AI教学示意，非天津、名古屋事件影像，也不证明实际布局或合规距离。天津历史事实依应急管理部存档调查报告，名古屋事实依日本国土交通省资料；安全生产法第三条引用2021年修正文本的价值原则。教学图解和第90分钟实验情境分别标明，不替代现场制度或专业授权。

制作源：`storyboard.json`（18镜头、完整逐字稿、来源）、`animation.js`（确定性画面与图表）、`render.html`（画面预览）、`captions.srt`和`captions.vtt`。课件配图映射在 `packages/course-content/src/port-lesson-twelve-media.ts`。

从仓库根目录重建：

```text
node scripts/port-eleven-film.mjs prepare --lesson12
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-eleven-speech.mts --lesson12
node scripts/port-eleven-film.mjs render --lesson12
node scripts/port-eleven-film.mjs mux --lesson12
node scripts/port-eleven-film.mjs verify --lesson12
node scripts/port-eleven-browser-audit.mjs --lesson12
```

构建脚本复用第11讲的导出基础设施；本讲的脚本、镜头、画面与配乐独立存放。语音重建使用项目现有音色配置，凭据不写入素材。缓存会保留原始语音，并对极短的满幅采样作有记录的修复；持续失真会拒绝生成。成片可直接离线播放，无需访问在线语音服务。音乐为原创确定性合成，无外部采样。

验收资料在 `output/port-twelve-media/`，包括完整解码、媒体元数据、18镜头画面、响度、语音识别抽查、浏览器播放和32页版面记录。真实教室投影、音响和90分钟节奏仍需试讲。
