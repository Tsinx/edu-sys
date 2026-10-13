# 经济数学 · 从一个点开始

独立的45分钟、40页中文课程序章。主课程的八单元、32讲、64学时与历史课堂位置保持原样。

短片当前版本为 `chromatic-motion-v2-2026-10-08`：钴蓝、亮黄和鲜绿撞色，俯冲与低机位环绕，几何碰撞与900字重大字共同落在配乐重音上。按追加要求加入变量、函数、极限、导数、积分、偏导数、等高线和最优解等词语；14组文字累计23.2秒。

## 使用

打开 `index.html`。第一页为90秒短片，播放结束后进入课程地图。使用画布外的按钮翻页、分步展开或全屏投影；方向键翻页，空格展开。本机自动保存页码、各页展开步骤和短片播放位置。“重新开始序章”清空本序章进度。

离线时保留本目录的完整结构，双击 `index.html`；也可以独立播放 `economic-mathematics-prelude.mp4`。文件方式下的保存能力取决于浏览器；若浏览器不允许本地存储，会在画布外显示提示。

`motion.html` 是同源几何动画的实时预览，支持暂停、重播、静音和拖动时间轴。MP4兼容无需WebGL的播放器；实时三维预览需要浏览器支持WebGL2。

## 内容

- 01：几何动态艺术短片，1分30秒。
- 02—15：课程框架与八单元地图，12分30秒。
- 16—20：认识李行之老师，6分钟。
- 21—32：教材、考核与学习须知，13分钟。
- 33—38：降价、销量、收入与利润的第一次判断，10分钟。
- 39—40：退出条与进入课程，2分钟。

完整答案及逐页讲稿见 `economic-mathematics-prelude-teacher.pdf`。其教师备注位于投影画布之外。40页播放器仅呈现当前已展开的公开内容。

## 编辑与再导出

`film-source.js` 是原始动画源文件，`film.js` 是包含本地Three.js的运行包。时间单位为秒，场景、摄像机、几何体和文字均由同一时间参数确定；预览与视频逐帧导出调用同一个 `render` 函数。渲染无外部图像、随机网络请求或远程字体。

在项目根目录执行：

```text
node scripts/economic-mathematics-prelude.mjs build
node scripts/economic-mathematics-prelude.mjs score
node scripts/economic-mathematics-prelude.mjs serve
```

在浏览器打开 `http://127.0.0.1:5196/motion.html?export=1`，点击“导出逐帧视频”，完成后执行：

```text
node scripts/economic-mathematics-prelude.mjs mux
node scripts/economic-mathematics-prelude.mjs verify
node scripts/economic-mathematics-prelude.mjs contact
```

`?sample=1&export=1` 与命令末尾的 `--sample` 用于15秒代表性片段。编码规格为1920×1200、60fps、H.264与AAC立体声；完整影片5400帧，时长90秒。

样片使用 `sample-score.wav`，音轨按对应四段源时间截取，保持样片内的碰撞与重音同步。`score` 命令同时生成两份音轨。

音乐由脚本中的加法合成与固定种子打击音原创生成，120 BPM，无人声、外部音乐或采样。影片中的有量纲教学模型使用课程中的销量速率及预算响应函数；纯形态变化属于艺术表现。

课程页面在 `course-data.js` 中逐页编辑，布局在 `slides.js` 和 `prelude.css` 中维护。逐页教师讲稿源位于项目的 `docs/course/economic-mathematics-prelude-notes.cjs`，不由交互播放器加载。修改文案后运行字体子集脚本与备课文档脚本。

备课PDF使用同一份逐页内容、全部揭示和矢量图形重新排版，画布下方增加教师备注；需要Python的FontTools、PyMuPDF与Pillow：

```text
python scripts/economic-mathematics-prelude-fonts.py --pdf-fonts
node scripts/economic-mathematics-prelude-docs.mjs
python scripts/economic-mathematics-prelude-pdf.py
```

字体首次构建从Google / Noto官方仓库获取OFL字体；播放与PDF阅读不需要联网。字体版权及许可在 `fonts/OFL-sans.txt`、`fonts/OFL-serif.txt` 中。

所有内容在本机运行，无登录、遥测或第三方请求。全屏、音量与45分钟课堂节奏仍应使用实际教室设备试讲。
