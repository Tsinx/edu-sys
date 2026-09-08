# “澜舟”半写实港航助教：角色与动作资产规范

## 当前状态

- 角色：完全虚构的中国青年女性港航助教，不复刻教师、演员或公众人物。
- 运行模式：`selfstudy_prerecorded`，浏览器只播放静态文件，不连接 OpenAvatarChat，也不申请 GPU。
- 当前版本：`1.1.0`。教师已于2026-08-09确认 B 版为正式母版；十一段正式动作已经生成、人工逐段审看并通过运行资源校验。
- 候选母片只保存在被 Git 忽略的 `artifacts/avatar/lanzhou/candidates/`，Web 目录仅包含压缩后的运行海报。
- B版确认记录已经形成；后续万相任务必须复用同一母版、固定机位与同一动作清单，不得悄然更换角色外观。

## 三套候选母版

共同提示词骨架：

> 独立设计、完全虚构的中国青年女性港航课程助教“澜舟”，26—32岁，胸像近景，固定正面机位，半写实而非真人照片复刻。深海军蓝港航工作外套、米白内搭，只有少量青绿色识别色；港口控制室柔焦背景，柔和侧光。专业、可信、亲和，不呈现直播主播气质。不要船长帽，不要制服 cosplay，不要企业、学校、国旗或品牌标识，不要文字、水印、耳麦、夸张妆容和过度甜美表情。画面纵向3:4，便于720×960视频生产。

- A：偏写实、成熟专业，控制室灯光与服装纹理更强。
- B：半写实与大学助教气质最均衡，已经确认为澜舟正式母版与运行海报。
- C：数字IP感更明显，轮廓和青绿色识别色更突出。

生成记录：2026-08-09，使用 Codex `imagegen` skill 调用 OpenAI ImageGen。工具未暴露具体后端模型修订号，因此不得补写不存在的模型版本。候选属于项目原创视觉草案；上线、宣传或商业分发前仍须复核所用生成服务的当期条款，且不得对外声称为真人肖像或真人代言。

## 教师确认后的动作包

正式运行包包含十一段：

1. `idle-still`
2. `idle-blink`
3. `idle-soft-smile`
4. `listening`
5. `thinking`
6. `speaking-calm-a`
7. `speaking-calm-b`
8. `speaking-emphasis`
9. `nod`
10. `encourage`
11. `goodbye`

进入待机时，`idle-still`只播放一次：最初10秒保持几乎静止，结束后停在中性终帧，不循环。播放器每35—55秒才允许插入一次非循环微动作，结束后回到`idle-still`并再次停住；微动作权重为眨眼2、闭口微笑0.5。旧`idle-glance`因循环转头机械而退出正式清单，生成审查中出现张嘴、明显低头或背景漂移的候选同样不得发布。

所有万相参考生视频提示必须包含：固定相机、相同背景和光线、胸像不离开画面、自然眨眼和呼吸、动作幅度克制、无对白、无文字和水印、首尾回到同一中性姿态。说话片段只表现自然说话节奏，不承诺逐音素口型同步。

先制作并审看一段 `idle-still` 样片，避免把角色漂移扩散到整个动作包：

```powershell
pnpm avatar:wan -- --submit --confirm-cost --only=idle-still
pnpm avatar:wan -- --wait --only=idle-still
```

样片通过后再提交其余动作；任务ID会实时写入被Git忽略的生产回执，重复运行不会重复创建仍在进行或已经成功的付费任务：

```powershell
pnpm avatar:wan -- --submit --confirm-cost
pnpm avatar:wan -- --wait
```

母片输出到 `artifacts/avatar/lanzhou/masters/`。不要把母片、中间帧或云端任务回执加入 Git。每段经人工确认后再用 FFmpeg 8.0 转为：

```powershell
ffmpeg -i input.mp4 -an -vf "scale=720:960:force_original_aspect_ratio=increase,crop=720:960,fps=25" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 24 output.mp4
```

运行文件使用 `动作名.<sha256前12位>.mp4` 命名，并填写 `manifest.json` 的完整 `sha256`。海报不超过4MB，海报和十一段动作合计不超过20MB。执行：

```powershell
pnpm avatar:verify
```

脚本检查路径、哈希、H.264、720×960、25fps、`yuv420p`、无音轨和总大小；脸型、发型、服装、背景、首尾姿态、闪脸、手部异常、文字和水印必须再逐段人工审看。

2026-08-09生产验收：使用`wan2.7-r2v-2026-06-12`按同一B版母图生成正式动作。1.0版完成首轮十段素材；`goodbye`原始母片的手势未在终帧完全回位，因此在本地以同一连续动作做前进—回程剪辑，脚本中的同名后处理保证可复现。1.1版重新设计待机：正式运行资源共十一段、合计6.94MB；抽取连续帧和精确终帧后，脸型、发型、服装、背景、机位、手部与水印检查通过。被否决的转头、张嘴、低头和背景漂移片段只保留在Git忽略的制作归档中。

## 澜舟专属声音

Voice Design 的文字描述固定为：

> 知性、清澈、略温暖的普通话青年女声，吐字准确，语速中等略慢，适合大学港航课程；避免直播腔、过度甜美和夸张播音腔。

通过服务端一次性创建音色，音色 ID 只写入 `EDU_SELFSTUDY_TTS_VOICE_ID`。浏览器不得获得 DashScope 密钥或声音管理权限。审核描述并接受一次生成费用后执行：

```powershell
pnpm avatar:create-voice -- --confirm-cost
```

脚本把试听音频和不含密钥的回执保存在被 Git 忽略的 `artifacts/avatar/lanzhou/voice/`，并打印需要写入环境变量的音色 ID。运行时句级文字进入 Qwen3-TTS Voice Design 实时模型，服务端将24kHz单声道PCM分片通过 SSE 发送。TTS失败时字幕继续，ASR失败时文字输入继续。

## 事实与体验边界

- 字幕是教学内容的权威呈现；视频只提供姿态与情绪反馈。
- 学生新提问会中断上一轮回答和音频，禁止两段声音重叠。
- 原始麦克风音频只在内存中传给ASR，不写入状态文件。
- `prefers-reduced-motion`、视频解码失败或低带宽时显示海报，不假装动作视频正在播放。
- 课堂仍使用 LAM；本动作包仅服务 `/study/:courseId`。
