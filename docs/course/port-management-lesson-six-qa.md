# 第六讲验收记录

## 电影式分镜与固定旁白改造验收

记录时间：2026-09-19T16:08:10.041Z。本节对应当前12页电影式播片；下文保留早期课件和地球仪验收，空间页呈现与播放方式以本节为准。

- 第25、26、27、29、31—38页改为全画幅地球仪、连续镜头、逐镜字幕和预生成旁白。主片合计7.81分钟，计入原90分钟。第26页约58秒，其余约35—42秒。播完停在本页，48页及原有标识不变。
- 56段24kHz单声道本地WAV已生成并进入生产构建；保留文本哈希、文件哈希、模型和默认音色指纹。[分镜讲稿](port-management-lesson-six-film.md)列出逐镜字幕、口播、资源和时间点；[音频清单](../../packages/course-content/src/lesson-six-film-audio.json)可逐项复核。
- 用户已实际试听第26页完整样音，确认“音色、语速和读音合适”。其他11页尚无人工逐段试听确认。全部56段完成波形、SHA-256与ASR转写核对；转写差异主要为数字写法、同音字，另有“再观察/下观察”等待人工听辨项。ASR核对不替代主观试听。
- 港口、内陆节点与通道逐镜展开，水运青蓝、陆向砂金。“远洋网络”为概念端点；所有联系线为教学示意，不表示实际航迹、即时班次或独占腹地。第38页问题与答案使用独立片段，答案需揭示后主动播放。

| 检查 | 当前结果与证据 |
| --- | --- |
| 48页三模式、双宽度与选项/解析 | [472个状态通过](../../output/port-lesson-six-film/browser.json)；桌面1600×1100、窄屏390×844 |
| 标签调整后的12页复查 | [118个状态通过](../../output/port-lesson-six-film/browser-films.json)，含教师/投影/学生阅读与起中终点 |
| 12页实际音频播放 | [逐页起点、中间定位发声、终点停留通过](../../output/port-lesson-six-film/regression.json) |
| 教师与学生课堂 | [跟随、声音自主开启、自由浏览隔离、刷新通过](../../output/port-lesson-six-film/interactions.json) |
| 播放、暂停、拖动、重播、探索返回 | 同一时钟协调镜头、线条、字幕和音频；上述交互检查通过，无叠加发声 |
| 声画与跟随计时 | 该次本地测试音频调度估算偏差35ms；一键恢复相机98ms；不是扬声器到耳朵的声学测量或跨设备保证 |
| 权限与公开内容 | 课程上下文及API测试检查教师身份、片段/选项匹配、旧页拒绝、隐藏解析和未来字幕保护 |
| 失败场景 | 音频404提示并可静音继续；禁用WebGL及减少动态模式保留平面分镜、字幕和旁白；未点击前无自动发声 |
| 第一讲回归 | 原英法比较分镜可启动、暂停、继续、推进；未改现场LAM旁白逻辑 |
| 测试 | Web127/127、API89/89，最终第6讲7/7；学生文案审计包含在渲染测试中 |
| 类型及构建 | [最终pnpm build通过](../../output/port-lesson-six-film-build-final.log)，含全项目类型检查；56个构建音频与源文件哈希一致 |
| 差异格式 | [本次相关文件通过](../../output/port-lesson-six-film-scoped-diff-check.log)；全工作区发现并行文件格式问题，见下文 |

全讲截图：[1—12](../../output/port-lesson-six-film/contact-1.png)、[13—24](../../output/port-lesson-six-film/contact-2.png)、[25—36](../../output/port-lesson-six-film/contact-3.png)、[37—48](../../output/port-lesson-six-film/contact-4.png)。重点：[全国定位](../../output/port-lesson-six-film/slide-26.png)、[相邻门户](../../output/port-lesson-six-film/slide-33.png)、[水海接续](../../output/port-lesson-six-film/slide-35.png)、[窄屏学生](../../output/port-lesson-six-film/classroom-student-390.png)、[平面备选](../../output/port-lesson-six-film/fallback-webgl.png)。

运行环境为本机Playwright Chromium、ANGLE D3D11。默认SwiftShader双窗口冷加载曾超时，改用本机Intel显卡完成运行验收。API并行测试曾出现既有Rhubarb CLI未返回嘴型数据；未修改该模块，随后串行完整89项通过。[初次记录](../../output/port-lesson-six-film-api-tests.log)与[最终记录](../../output/port-lesson-six-film-api-tests-final.log)均保留。

全工作区差异检查当前输出：

apps/teacher-web/src/features/management-principles/ManagementSlideStage.tsx:54: new blank line at EOF.

并行管理学文件未由本任务改动。

尚未执行其余11页人工逐段试听、真实90分钟授课、校园多终端负载、真实手机与其他浏览器内核验收。390px为视口模拟。未制作MP4/PPT，未部署、提交或推送。

复查脚本：port-lesson-six-film-browser.mjs（全讲/--films-only）、port-lesson-six-film-interactions.mjs（4316隔离API）、port-lesson-six-film-regression.mjs、port-lesson-six-film-audio-audit.mts。验收文件哈希见[manifest.json](../../output/port-lesson-six-film/manifest.json)。

---

## 地球仪接入更新验收

记录时间：2026-09-19T09:48:33.503Z。以下为地球仪接入后的当前检查；后文保留首版课件验收，地图部分以本节为准。

- 第25、26、27、29、31—38页共12个空间页，复用已有InteractiveEarthGlobe。全国分布、上海/宁波舟山/果园港/天津/青岛案例、腹地重叠和定位题均使用三维地球。
- 地理节点与路线目录固定；逐层改变可见节点和连线，不因播放进度或方案切换重建WebGL画布。合肥、南京及长三角相邻港标签错开排布，地理点位不移动。
- 教师可拖动旋转、滚轮/双指缩放，并使用“地球全貌”“回到案例”。操作结束后同步视角。学生可独立探索；一键跟上采用教师当前页、图层、解析和视角。
- camera为兼容旧课堂的可选字段。服务端限制纬度±90、经度±180、距离1.45—4，并拒绝在非地图页携带相机。教师/学生权限沿用原事件通道。
- WebGL不可用时保留带实际节点和教学路线的本地平面备选，不显示空白。

| 验证 | 当前结果 |
| --- | --- |
| 地理页浏览器检查 | 12页×教师/投影/学生×1600/390宽度=72个状态通过 |
| 真实Three.js运行观察 | 相机与矩阵数值有限；四层展开、方案切换保持同一画布；无WebGL context lost |
| 教师视角同步 | 拖动后独立投影一致，刷新恢复；课堂视角快照持久化 |
| 学生自由探索 | 本地视角不写课堂；刷新仍保留自主视角；一键跟上恢复教师视角 |
| 旧地球仪回归 | 独立globe-preview、第二讲、第三讲入口正常渲染 |
| 不支持WebGL | 强制禁用WebGL后显示果园港平面节点与路线 |
| 全讲浏览器复查 | 48页三模式双宽度及交互共469个状态通过 |
| 前后端测试 | Web124/124、API89/89；包含隐藏答案、权限与相机校验 |
| 类型与生产构建 | pnpm build通过；包含typecheck |
| 差异格式 | git diff --check通过 |

[地球仪浏览器记录](../../output/port-lesson-six-qa/globe-audit.json) · [全讲记录](../../output/port-lesson-six-qa/browser.json) · [构建日志](../../output/port-lesson-six-qa/globe-build.log) · [当前哈希清单](../../output/port-lesson-six-qa/manifest.json)

[全国港口群](../../output/port-lesson-six-qa/slide-26.png) · [上海案例](../../output/port-lesson-six-qa/slide-31.png) · [果园港](../../output/port-lesson-six-qa/slide-34.png) · [学生窄屏](../../output/port-lesson-six-qa/globe-student-390.png)

运行探针为减少显卡负载采用0.5像素比；全讲视觉截图采用1倍像素比，390px检查为浏览器视口模拟。

批量双窗口冷加载时曾遇到教师刷新就绪超时；单窗口刷新复测通过，最终流程将双视图同步与刷新分开验证。未据此承诺不同显卡上的加载速度。

复查新增命令：node scripts/port-lesson-six-globe-audit.mjs；沿用4316隔离验收服务。未部署线上，未进行真实课堂、真实手机硬件及其他浏览器内核验收。

---

核验日期：2026-09-19；记录时间：2026-09-19T08:38:15.559Z。工作区：D:/codes/edu-sys。状态：本地课件与课堂接入验收通过；未部署线上。

## 交付

- 48页、90分钟，第24页后45分钟课间分界。全局246—293页，第6讲ready，总293页。既有1—245页逻辑标识和顺序保留。
- [逐页教师讲稿](port-management-lesson-six-teacher.md)、[教学设计](port-management-lesson-six-design.md)、[来源台账](port-management-lesson-six-sources.md)。
- [本地教师预览](http://localhost:5173/port-lesson-six-preview.html)、[学生独立阅读](http://localhost:5173/port-lesson-six-preview.html?student=1)。正式课堂与课下study入口也已接入。
- 教师控制播放、暂停、重播、下一幕、进度、选项、解析；学生随时自主浏览，保留一键跟上。没有新增个人仿真实验、PPT或成绩提交。

## 可重复检查结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 完整测试套件 | 302/302：核心89、API89、Web124 | [all-tests.log](../../output/port-lesson-six-qa/all-tests.log) |
| 最终渲染及演算测试 | 4/4；覆盖48页公开文案、隐藏答案、选项、单位与演算 | [final-render-tests.log](../../output/port-lesson-six-qa/final-render-tests.log) |
| 最终第6讲上下文/API测试 | 1/1；内部遍历48页及权限、覆盖、自定义提示保护 | [final-context-tests.log](../../output/port-lesson-six-qa/final-context-tests.log) |
| 类型检查与生产构建 | pnpm build通过，包含全项目typecheck | [build.log](../../output/port-lesson-six-qa/build.log) |
| git diff --check | 通过 | [diff-check.log](../../output/port-lesson-six-qa/diff-check.log) |
| 教师预览/投影/学生阅读 | 469个状态通过；48×3模式×2宽度=288页状态，另含展开、选项及解析状态 | [browser.json](../../output/port-lesson-six-qa/browser.json) |
| 正式课堂教师/学生 | 192页状态通过；48×2角色×2宽度；另有同步与隔离流程 | [classroom.json](../../output/port-lesson-six-qa/classroom.json) |
| 最终视觉修订复查 | 41个状态通过；术语页、全部受影响地图、时间/可靠性页、教师和学生控制栏、全屏 | [visual-review.json](../../output/port-lesson-six-qa/visual-review.json) |

浏览器为本机Playwright Chromium，桌面1600×1100与窄屏390×844。所有48页完成浏览器遍历、截图及拼图目视核查；最后修改另有逐页复查。没有用静态测试代替浏览器验收。

检查画布比例为1.6、图片加载、文字边界、页面横向溢出、教师元数据属性与正文泄漏。关键演示检查进度0、0.5、1及选项与解析；地图另检查四阶段：港口、内陆节点、连线、完整观察。最终控制栏增加元素命中检查，防止看似存在但被裁掉而不可点击。

## 同步、权限和阅读隔离

正式课堂检查教师揭示与收起、切换演示选项、进度持久化、教师/学生刷新恢复；学生自主揭示不改变教师快照；教师跨页时，自主浏览者保留自己的页与解析；学生刷新仍处于自主浏览；一键跟上回到教师当前页及公开状态。跟随时仍可用下一页或目录离开跟随，跨讲访问第2讲成功。课下study第6讲可重播与揭示，不影响课堂。

学生发送教师展示事件被403拒绝；旧页迟到事件被409拒绝；不适用的选项和无解析页的揭示被拒绝。缺省字段保持兼容。助手覆盖课程、讲次、页面、工具五层上下文；进度0不注入未展开要点，未揭示不注入作者答案，自定义页面提示也受保护。未调用真实模型评价回答质量。

前5讲各抽查首末页共10页的课堂入口与页面切换，并由原有前5讲渲染/上下文测试回归。没有修改港口仿真引擎和成绩提交逻辑；工作区原有并行修改被保留。

## 演算复核

- 稳定平均在场量：1,000箱/天×3天≈3,000箱；×5天≈5,000箱。统一实体箱、边界与长期稳定条件，不转换为实际场地容量。
- 收支过渡：3,000＋1,000－800=3,200；连续3天为3,200、3,400、3,600。柱形图使用零基准。
- 6车单点固定2分钟服务：均匀到达平均等待0；同时到达等待0、2、4、6、8、10，平均5分钟；两者忙碌12分钟。
- 路线广义成本：时间价值100时A/B=4,400/4,700；300时=6,000/5,700；200时=5,200/5,200元/箱。全部教学设定，全程天数含接续等待，可靠性另作定性判断。

## 视觉与来源修订结论

地图与节点投影一致，上海、宁波舟山、果园港、天津、青岛的区域镜头标签可读；果园港水运与陆向连线分色；全国图没有整省独占涂色。库存柱图改为零基准；交接条件用并列汇合表达；可靠性三项问题并列呈现。桌面控制栏已按实际内容分配行高，窄屏换行；教师全屏保持既有控制栏。

[1—12页拼图](../../output/port-lesson-six-qa/contact-1.png) · [13—24页](../../output/port-lesson-six-qa/contact-2.png) · [25—36页](../../output/port-lesson-six-qa/contact-3.png) · [37—48页](../../output/port-lesson-six-qa/contact-4.png)

[桌面授课台](../../output/port-lesson-six-qa/final-teacher-1600.png) · [窄屏授课台](../../output/port-lesson-six-qa/final-teacher-390.png) · [窄屏学生](../../output/port-lesson-six-qa/final-student-390.png)

## 验证边界与未执行项

本次通过的是上述本地浏览器与当前工作区快照检查。未执行真实师生90分钟授课、校园网多终端负载、Safari/Firefox和实际手机硬件测试，也未部署生产环境。390px检查是浏览器视口模拟。教师全屏沿用可收起的浮动数字人，完整投影时可在底栏收起；独立投影页面不带教师面板。

官方资料按来源台账逐项核对日期与口径。青岛原站直接抓取失败，使用检索返回的原站正文核验；重庆原域迁移已修正。所有地图和背景素材均本地加载，不依赖这些新闻网站在线响应。历史线路不作当前班次承诺。

工作区存在并行改动，未提交或推送。验收对应[文件哈希清单](../../output/port-lesson-six-qa/manifest.json)所记录快照；后续改动需重跑相应检查。

## 复查命令

在项目根目录使用PowerShell 7：

```powershell
pnpm --filter @edu/teacher-web dev
pnpm --filter @edu/platform-api exec tsx ../../scripts/port-lesson-six-audit-server.mts
node scripts/port-lesson-six-browser-audit.mjs
node scripts/port-lesson-six-classroom-audit.mjs
node scripts/port-lesson-six-visual-review.mjs
pnpm test
pnpm build
git diff --check
```

两个开发服务需分终端启动；课堂验收脚本使用独立4316端口与output内数据，不操作现有课堂数据。文档导出脚本port-lesson-six-docs.mts保留逐页手写讲述，可在课程正文修改后同步导出。验收归档脚本port-lesson-six-acceptance.mjs读取已经完成的检查日志，不自行宣称检查成功。
