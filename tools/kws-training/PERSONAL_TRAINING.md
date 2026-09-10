# 个人关键词适配实验

目标词为录音清单中的“你好助手”“非常感谢”。使用 Edu-KWS 独立 uv 环境及 RTX 3070 Laptop 8 GB，训练产物位于 `/home/edu/projects/edu-kws/runs/`。脚本不自动替换网页模型。

## 本轮方法

采用局部参数微调：只更新最后一个 Zipformer 编码器堆栈和 `joiner.encoder_proj`。声学前端、前五组编码层、预测网络和词表输出层保持冻结。对于单人同次录制的 40 条正样本，限制可训练参数比直接全参更新更保守；这个约 316 万参数的网络没有采用 LoRA，也不需要引入新的适配器导出路径。这是本轮工程选择，尚未做全参/LoRA 的对照试验。

原始权重来自[官方发布的中文 KWS 权重](https://github.com/pkufool/keyword-spotting-models/releases/tag/v0.11)的 `exp/pretrained.pt`，架构沿用[icefall WenetSpeech KWS](https://github.com/k2-fsa/icefall/tree/master/egs/wenetspeech/KWS)。训练使用完整 RNN-T 损失，小批次下无需裁剪标签路径。

每个短语 14 条训练、3 条验证、3 条最终测试。先按原始录音划分，再生成增强数据；原音和处理音属于同一组，绝不跨集合。验证集选择检查点，测试集仅在选择结束后比较基线与候选。验证和测试来自同一人、同次采集，不能代表新设备、其他人或未来录音。

每批 3 条个人录音和 1 条已有合成语音。回放语音包含普通话、相似短语及原有助手命令；在这部分数据上加入冻结原模型的 KL 约束，并惩罚参数偏离初始权重，减少原有能力遗失。

增强只应用于训练集：0.95–1.05 倍轻微重采样（会同时轻微改变音高）、−9 至 +3 dB 音量、22–35 dB 信噪比合成噪声、偶发弱单次回声、首尾静音、1–4 个频带遮挡。短口令不做时间遮挡。单次回声不是实测教室混响；噪声也是合成的。

初始学习率 `3e-5`，余弦衰减至 `5e-6`；batch 4，每轮 14 步，最多 20 轮，验证连续 5 轮没有进步则早停。使用 FP32，PyTorch 分配器上限为显存的 65%；该上限不包含 CUDA 驱动自身占用。不改变系统功耗、显卡设置或终止其他进程。

验证使用与网页默认目标词相同的 boost/threshold，因果块长 16、左侧上下文 64；在干净处理音、原音及固定轻度扰动上比较。Python 检查不等同于浏览器流式验收，导出后还需 sherpa-onnx 流式验证。

## 运行与结果

```powershell
wsl -d Edu-KWS --cd /home/edu/projects/edu-kws --exec bash -lc '.venv/bin/python -u /mnt/d/codes/edu-sys/tools/kws-training/personalize_train.py --run /home/edu/projects/edu-kws/runs/personal-20260909-01 --epochs 20'
```

同一训练目录存在 `history.jsonl` 时拒绝覆盖。再次试验请指定新目录，并保留原先的测试集边界，不基于最终测试成绩反复调参。

- `config.json`：方法、参数范围、硬件、权重哈希及限制。
- `split-manifest.json`：按源录音分组的清单、路径、哈希和公开探针来源。
- `history.jsonl` / `status.json`：训练进度、验证指标、GPU 分配峰值。
- `best.pt` / `last.pt` / `baseline.pt`：所选模型、最后训练状态、原模型。
- `baseline-validation.json` / `best-validation.json`：模型选择依据。
- `baseline-test.json` / `candidate-test.json`：模型选择结束后的测试结果。

公开 WenetSpeech 示例语音仅用于短时检查，并未用于梯度更新。这里没有人工核对其逐字文本，因此称为“公开语音探针”，不把其触发数包装成长时间真实课堂误报率。已有回放语音是 TTS，也不能替代真实人声负样本。

本轮可以回答“模型是否学到这些录音、保留样本是否改善”，还不能回答“在真实课堂每小时误触发多少次”。

## 首轮结果

`personal-20260909-01` 已完成 20 轮 / 280 步，选中第 20 轮，42.8 万可训练参数，冻结权重核对通过。完整报告位于项目 `output/kws-personal-training-20260909/README.md`。

原生 FP32 固定扰动测试从 5/6 提升至 6/6，但实际网页通过率没有提高：`classroom-keywords.js` 的 `maxGap <= 0.6` 将已识别出的、带自然停顿的“你好助手”丢弃。候选模型已导出但未替换网页。需要先独立核对这条控制规则，再开展新录音的实测；不把本轮低损失作为上线依据。
