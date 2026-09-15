# 小麦老师形象与语音选择

当前课堂和课下学习的“数字人形象”只提供“小麦老师 · Live2D”和“澜舟 · 视频”。Haru、名取仁、日和与 LAM 已从选单移除；旧的 Live2D/LAM 偏好自动归一为小麦老师及现有音色。切换到视频仍会先中断讲解，再释放旧模型。

左右转头已按验收意见停用，其他已验收动作继续使用，待机采用呼吸、眨眼与留有安静间隔的微小姿态变化。当前实装安排见 [验收后的实装调整](xiaomai-head-proxy-delivery.md#验收后的实装调整)。以下音色和制作记录保留为历史资料。

| 外观 | 语音 | TTS 模型 |
| --- | --- | --- |
| 小麦老师（绿开衫短发） | 现有配置音色 | 保留 EDU_SELFSTUDY_TTS_MODEL / EDU_SELFSTUDY_TTS_VOICE_ID |
| Haru | 现有配置音色 | 保留 EDU_SELFSTUDY_TTS_MODEL / EDU_SELFSTUDY_TTS_VOICE_ID |
| 名取仁 | Ethan / 晨煦，男声 | qwen3-tts-flash-realtime-2025-11-27 |
| 日和 | Serena / 苏瑶，女声 | qwen3-tts-flash-realtime-2025-11-27 |

唤醒名、自我身份、提示词、课程知识与语音检测模型均保持“小麦老师”；人物名称只用于外观选择和素材署名。默认仍保留用户原有选择。

名取仁、日和使用官方 CubismWebSamples 的 4-r.7 标签素材，匹配现有 Cubism 4 Core。出处与素材条款见 public/avatar/live2d/NOTICE.txt，文件校验和见同目录 assets.json。音色清单：https://www.alibabacloud.com/help/en/model-studio/qwen-tts-voice-list 。预置音色必须使用对应的 Flash Realtime 模型，不能交给原有 VD 音色设计模型。

客户端只发送受限的 voiceProfile（default / natori / hiyori），后端为每个请求独立选择模型和音色，不修改共享配置。课堂 TTS 和课下分段 TTS 都传递该字段，旧客户端省略字段时维持原有音色。现有部署仍需原有的语音服务配置。

## 验证

- pnpm typecheck、前端生产构建、API 61 项和前端 80 项测试通过；新增课下音色传递、课堂音色传递与非法音色拒绝断言通过。
- node scripts/verify-live2d-assets.mjs：94 个文件校验和，以及三个模型全部引用通过。
- node scripts/verify-live2d-browser.mjs：真实 WebGL、口型、打断、切换、刷新持久化、窄屏、故障回退通过。
- EDU_LIVE2D_CHARACTER=natori 或 hiyori 执行 node scripts/verify-live2d-classroom.mjs：各通过课堂桌面/头像/全屏/窄屏、课下桌面/窄屏共 6 种布局，无页面错误。
- 真实本地 API 已重启，并分别向在线 TTS 请求“小麦老师”介绍。名取仁返回 18 个 PCM 块（5.96 秒），日和返回 20 个 PCM 块（7.12 秒），均 HTTP 200 且无服务错误。此处验证音频返回及播放链路，不代替用户对音色喜好的试听确认。

截图、浏览器报告和两段真实 WAV 预览位于 output/live2d-qa/；其中 natori/ 和 hiyori/ 为课堂/课下截图与报告。

## 小麦老师 A 首版接入（2026-09-14）

- 选择项为“小麦老师 · Live2D”，模型位于 `apps/teacher-web/public/avatar/live2d/xiaomai/`。已有角色和浏览器的历史选择继续保留；选择小麦老师后会记住该选择。
- 模型来自 `artifacts/avatar/xiaomai/cubism-trial-v1/` 的 Cubism 工程，MOC3 和纹理原样复制；model3 增补标准 EyeBlink、LipSync 参数组，运行时共 27 个网格。可编辑工程和分层 PSD 仍保留在试模目录。
- 当前提供自动眨眼、随真实 TTS 播放音量变化的嘴部开合、胸像/头像两种取景。口型随静音、讲解结束或打断归零；没有增加下一版的转头、手势、连续眼睑变形等动作。
- 小麦老师发送 `voiceProfile: default`，沿用现有配置声音；唤醒名、人物身份、课程提示词不变。署名明确为本项目定制形象，不套用官方示例角色的素材归属。
- 半身素材使用独立取景比例和 1 倍渲染分辨率。播放器绘制上限约 60 FPS，隐藏页面或折叠数字人时暂停绘制。

本轮验收结果：

- `pnpm typecheck`、前端 80 项测试、前端生产构建通过；生产目录已包含小麦老师完整运行资源。
- 98 个资产校验和及四个模型的引用检查通过。
- 浏览器 18 组检查通过，包括小麦老师实际网格眨眼、PCM 音频驱动口型、静音/打断闭嘴、角色切换、刷新持久化、两种取景和失败回退；没有页面错误。
- 真实课堂问答和在线 TTS 验证通过：HTTP 200、27 个 PCM 块、505,872 字节，实际模型嘴部参数峰值约 0.467。此数值是本次采样，不表示性能或音质保证。
- 课堂桌面、头像、全屏、窄屏，以及课下学习桌面、窄屏共六种布局通过，画布未溢出，无页面异常。
- 证据：`output/live2d-qa/browser-report.json`、`output/live2d-qa/xiaomai/classroom-live-report.json` 及同目录截图。本轮更新当前本地教学系统，未执行远端发布或 Git 推送。

## 小麦老师 A 口型修正版（2026-09-14 13:15 前）

本版在现有 Live2D 模型上增加浏览器矢量嘴部控制。讲话时隐藏原来的两张嘴部图，用 7 条矢量路径连续调整嘴宽、开口、牙齿和舌头；不再把张嘴和闭嘴图做透明度混合。静止时恢复原模型的嘴部。原始 CMO3、PSD、MOC3 未修改，这些新口型目前属于教学系统播放器扩展。

- 课堂和课下语音请求增加可选 `lipSync`。服务端使用 Rhubarb 1.14.0 的 phonetic 分析器，按 3 秒窗口处理真实 24kHz PCM，两端保留 160ms 语音上下文。音频字节保持不变。
- SSE 每个音频块可携带相对该块的 `mouthCues`。浏览器以 `AudioContext.currentTime` 和 `source.start()` 的排程时间定位，提供 A-H/X 共 9 类嘴形（闭唇、扁口、张口、圆唇、唇齿、舌头和停顿等）；约 35ms 插值，闭唇约 18ms。发音分类是自动估计，尚不等于逐个汉语音素的人工校准。
- 静音、音频结束、打断及角色切换会清除旧口型。浏览器仅分析/播放助教输出，沿用现有声音、身份与唤醒名。
- Rhubarb 在本机 `.runtime/rhubarb/`，可运行 `pwsh -File scripts/setup-rhubarb.ps1 -Check`；其他部署需运行安装脚本或设置 `EDU_RHUBARB_PATH`。官方来源： https://github.com/DanielSWolf/rhubarb-lip-sync 。下载包保留原许可，脚本校验固定版本 SHA-256。
- 口型进程上限 2、单窗口超时 2.5 秒，可取消。工具缺失、繁忙或分析失败时继续播放音频并使用无叠影的音量开合。

本轮证据保存在 `output/live2d-qa/lip-sync-v2/`。真实中文样本 445,872 字节（约 9.3 秒），4 个分段、60 个口型时间点、9 类嘴形，首段约 2.6 秒返回。这个数字是本机单次测量。`verify-xiaomai-live-speech.mjs` 验证在线接口，`verify-xiaomai-visemes.mjs` 验证同音量下口型差异与中断、取景、切换，原有完整 Live2D 浏览器检查仍保留。

最后的下唇修正：口腔和下唇共享同一条内边界，下唇向外扩展，避免大张口时被口腔遮住；圆唇的下唇与高光按嘴宽缩放。逐项复查 A/B/D/F/H 截图，补齐可见唇缘。原有 80 项前端与 61 项 API 测试、新增 1 项播放时钟测试和 2 项 WAV/真实口型进程测试通过；完整 18 组浏览器检查、9 类口型专项检查、真实课堂语音（67 个口型时间点）和六种页面布局通过。类型检查、生产构建与 98 项资源校验通过。当前本地课堂页面已刷新。

## P0 动画与眼部精修（2026-09-14 课后）

当前版本已补齐连续眼睑、独立视线、眉形、表情口型、小幅转头、点头、歪头、呼吸及发梢跟随，详见 [P0 制作与验收说明](xiaomai-p0-animation.md)。眼部改为复用原始图层，修正了重画眼形造成的大小眼、透明黑色采样接缝和发丝交界错位；有原图逐像素对照、三倍放大图和连续眨眼帧证据。

这些动作通过 Cubism 渲染与播放器扩展共同实现，未写入原生模型关键形。教学系统预览入口为 `/avatar/xiaomai/preview`。当前本地系统及生产构建已包含新动作，未执行远端发布或 Git 推送。

后续已采用 Blender 头部代理烘焙的二维转头、无损分层纹理和 P1/P2 动作库。原版 P0 可在预览里对照；当前运行方式、验收记录及跳过的手势见 [立体辅助转头与动作交付](xiaomai-head-proxy-delivery.md)。
