# 消失的增量

第三讲历史短片，3分钟，1920×1200、60fps，中文旁白、固定中文字幕、原创电子配乐。三次危机分别说明原有认识、出现的矛盾及后来的理论推进。

## 播放

直接打开 `calculus-history.mp4` 即可离线播放，不需要登录或调用语音服务。

在课程中访问 `/course-assets/economic-mathematics/calculus-history/index.html`，可以暂停、定位章节、重播、调节音量、静音和全屏。网页中的“动画源预览”使用同一套几何画面和已经混合的音轨。

## 修改与重新导出

- `animation.js`：原生1600×1000画面、几何模型和镜头运动。
- `storyboard.json`：章节、旁白、字幕窗口和教师备课问题。
- `data.js`：只含公开章节与字幕的派生数据。
- `narration.flac`、`score.flac`、`soundtrack.m4a`：独立旁白、配乐与混合音轨。
- `captions.srt`、`captions.vtt`：独立字幕。
- `sources.json`、`prompts.json`：逐项来源、许可说明，以及两张场景插画的ImageGen内置工具提示词。
- `fonts/`：本地中文字体与OFL许可。

离线资料包中的 `tools/calculus-history-film.mjs` 支持 Node 22以上版本及FFmpeg。解压后，在资料包目录中执行：

```powershell
node tools/calculus-history-film.mjs serve --dir . --output ../calculus-film-build
# 在浏览器打开 http://127.0.0.1:5198/?export=1
# 点击“导出全部动画帧”，等待显示已保存10800帧。
node tools/calculus-history-film.mjs mux --dir . --output ../calculus-film-build
node tools/calculus-history-film.mjs verify --dir . --output ../calculus-film-build
```

如需修改章节或字幕，先更新 `storyboard.json`，再运行 `prepare`（同样带上 `--dir` 和 `--output`），然后导出。修改旁白文字需要在原项目中运行 `scripts/calculus-history-speech.mjs` 重新合成；资料包不携带服务凭据。已有旁白不需要重新合成。

历史书房和印刷作坊为生成插画，肖像与论文原件使用已记录的公共领域文件。几何、字幕、剪辑和配乐由本项目制作。教师课堂放置建议见资料包中的 `classroom-guide.md`，本地验收与试讲边界见 `validation.md`。
