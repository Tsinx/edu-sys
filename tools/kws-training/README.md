# 助手关键词录音与训练环境检查

录音工具只采集数据，不加载模型、调用 ASR 或启动训练。麦克风只在点击“开始录音”后开启；停止后释放。音频不离开本机。

## 录音

在项目根目录执行：

```powershell
.\scripts\start-kws-recorder.ps1
```

打开 <http://127.0.0.1:8766>。默认收集“你好助手”“非常感谢”“小麦老师”和“谢谢”四组，每组 20 条，共 80 条；每组第一次录音前可修改词语。修改只影响采集标签，不修改课堂助手的唤醒配置。

已有的两组录音会原样保留，服务启动时补上“小麦老师”和“谢谢”两组。打开页面会选中第一组尚未收齐的词语；若原来的 40 条已收齐，可直接补录新增的 40 条。短“谢谢”同样只说词语本身，开始和停止前各稍停半秒。

每次操作：开始 → 说出一句 → 停止 → 试听 → 保存。点击“重录这一条”会丢弃未保存草稿并重新开启录音。保存成功后再开始下一条。全部收齐后导出 ZIP。录错的已保存条目可点击两次“移除”，再补录。

- 格式：16 kHz、单声道、16 bit PCM WAV，每条 0.7–8 秒。
- 数据：`.runtime/kws-recordings/dataset.json` 与 `audio/wake/`、`audio/end/`、`audio/wake_xiaomai/`、`audio/end_thanks/`；项目已忽略 `.runtime/`，录音不会进入 Git。
- 已保存录音刷新、关闭页面及重启服务后均保留。未保存草稿仅在当前页面中保留，离开时浏览器会提示。
- 移除条目从清单和导出中排除，原始 WAV 移入 `discarded/`，方便恢复。
- ZIP 含音频、标签、时间、时长、校验值、`metadata.csv`、`recordings.jsonl`。JSONL 是原始采集索引，尚未转换为 Lhotse 训练清单。
- 录音前暂停课堂页面语音唤醒和扬声器播放。最好在平时使用的设备和位置，轻微改变语速、音量与距离；语音内容由录制人试听确认。
- 服务只绑定 `127.0.0.1`，无外部脚本、字体或网络请求。需要其他端口可传 `-Port 8767`。

## 已有 uv / Torch GPU 环境

复用 `components/openavatarchat/.venv`，其 `pyproject.toml` / `uv.lock` 已使用 uv 配置 PyTorch 官方 `cu128` 软件源。没有重复部署或修改正在供 LAM 使用的依赖。

2026-09-08 检查：Python 3.11.13、Torch 2.8.0+cu128、Torchaudio 2.8.0+cu128；`uv pip check` 的 175 个已安装包依赖兼容。完整实时检查结果位于 `.runtime/kws-training/environment-check.json`。

复查命令（GPU 隐藏，仅检查版本与 CPU 侧动态库导入，不进行 CUDA 运算）：

```powershell
uv pip check --python .\components\openavatarchat\.venv\Scripts\python.exe
uv run --no-project --python .\components\openavatarchat\.venv\Scripts\python.exe tools/kws-training/check_environment.py --output .runtime/kws-training/environment-check.json
```

**Windows 环境仍用于 LAM；2026-09-09 已另行在 Edu-KWS 中部署中文 Zipformer / icefall 训练软件依赖。** 见 [独立训练环境](environment/README.md)。以下是原 Windows 环境检查与后续训练边界。

1. 当前环境没有 k2、Lhotse 或 icefall。icefall 需源码中的 KWS recipe，k2 必须与 Torch / CUDA 匹配。[icefall 安装说明](https://k2-fsa.github.io/icefall/installation/index.html)
2. k2 官方 Windows 预编译包只有 CPU 版，CUDA 预编译包面向 Linux；Windows CUDA 版需自行编译。建议后续在独立 WSL2 Linux 环境中准备完整训练链。[k2 平台说明](https://k2-fsa.github.io/k2/installation/from_wheels.html)
3. WSL2 已恢复：失效的 `Ubuntu-22.04` 与 `Ubuntu-24.04-DZNProbe` 已注销，新的 `Edu-KWS` 使用 Ubuntu 22.04.5，磁盘位于 `D:\WSL\Edu-KWS\ext4.vhdx`。Linux 独立 uv 训练依赖位于 `/home/edu/projects/edu-kws`。见 [WSL_SETUP.md](WSL_SETUP.md)。
4. 浏览器使用的 ONNX 是推理文件，还需匹配的原始可训练 `.pt` 检查点。[官方 WenetSpeech KWS recipe](https://github.com/k2-fsa/icefall/tree/master/egs/wenetspeech/KWS)
5. 40 条个人正样本只完成第一轮采集；训练前还需非关键词/相似词负样本及独立录制的验证数据。不能据此保证召回率，也不能把同条音频的增强版本跨训练集和验证集混用。

上述环境检查当时因用户 GPU 正在执行其他任务而没有运行 CUDA 或训练，历史报告中的 `zipformerTrainingReady: false` 表达当时的验证边界。2026-09-09 用户已另行授权开始训练，个人适配方案与运行方法见 [PERSONAL_TRAINING.md](PERSONAL_TRAINING.md)；新训练结果单独保存，不覆盖历史检查报告。

## 验证

后端测试只使用临时合成音频和临时数据目录：

```powershell
uv run --no-project --python .\components\openavatarchat\.venv\Scripts\python.exe -m unittest discover -s tools/kws-training -p test_collector.py -v
```

浏览器检查脚本 `verify_collector.mjs` 使用 Playwright 与模拟麦克风，另起临时采集服务，不写正式录音。可通过 `EDU_PLAYWRIGHT_PATH` 指定 Playwright 的入口路径、`KWS_TEST_PYTHON` 指定 Python；默认使用本项目已有 Python。它验证权限拒绝、四组录音/保存/试听、重录、上传重试、刷新恢复、标签锁定、80 条目标、分组续录、ZIP 导出和窄屏布局。

## 收集后的基本检查与处理

```powershell
uv run --no-project --python .\components\openavatarchat\.venv\Scripts\python.exe tools/kws-training/process_recordings.py 'D:\Administrator\Downloads\kws-recordings.zip' --output output/kws-audio-review-20260908
```

输出目录必须为空，以免覆盖既有结果。脚本仅依赖 NumPy 和 Python 标准库；不导入 Torch，不启动 ASR、关键词推理或训练。它核对 ZIP、标签清单、原音校验值与 PCM 格式，检查音量、近满幅样本、完全重复和短时能量。基于能量裁剪首尾并保留 250 ms 余量，去除直流偏置，整条固定增益最多 +12 dB，峰值不超过 -3 dBFS，保持句中停顿。

输出包含原音、处理版、逐条 CSV/JSON 报告和可离线打开的 `index.html` 对照试听页，以及仅包含处理版的 ZIP。能量定位不等于语义 VAD，标签和声音边界仍须复听确认；原音及处理版是同一源样本，后续不能跨训练/验证集混用。

检查脚本兼容旧两组和新四组 ZIP；每组标签、计数和试听筛选分别保留。`personalize_train.py` 仍是此前两组录音的训练方案，新增录音不会自动进入训练或替换网页模型。
