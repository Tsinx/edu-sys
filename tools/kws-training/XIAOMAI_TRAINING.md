# 小麦老师／谢谢：小样本微调

输入为 `output/kws-audio-focus-20260909/dataset.json` 的 80 条整句。包含“你好助手、非常感谢、小麦老师、谢谢”，各 20 条；已核对重录的 `end_thanks_12`。逐字能量区间不参与训练监督。

先按源录音划分，每词 14 条训练、3 条验证、3 条测试，共 56／12／12 条。旧 40 条保留上一轮的划分。原音、处理音和增强音不跨集合。录音来自单一说话人，验证/测试并非独立设备、说话人或新场次；旧测试数据也曾用于历史模型评估。

从原版检查点开始，只开放 `joiner.encoder_proj` 的 41,280 个参数。前 4 轮只训练这一层，满足验证门槛后才开放最后一个编码器堆栈。编码器学习率 8e-6，投影层 3e-5，其余层为零；预热后余弦下降。最多 20 轮，每轮 14 步，连续 5 轮没有合格验证收益则早停。

每批 4 条个人录音（每词一条）和 1 条旧语音回放。个人录音按 70% 处理版、30% 原音选取；训练时使用轻微速度/音高变化、音量变化、合成噪声、弱单次反射、静音边距及窄频带遮挡。没有实测教室背景噪声或 RIR，不将合成增强称作真实课堂增强。验证和测试另跑确定性扰动，三个版本仍然只算一条源录音。

损失为整句 RNNT、0.5 倍回放 KL 蒸馏及相对初始权重的 L2 约束。AdamW 权重衰减 1e-4，梯度范数裁剪到 1，投影层/末端编码层的分组权重偏移分别限制在 2%/1%。冻结方法见 [PyTorch 文档](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html)；以初始权重为参照的惩罚见 [L2-SP 原论文](https://proceedings.mlr.press/v80/li18a.html)。这些数值是本次保守试验设置，不是论文对该 KWS 模型给出的最优值。

验证规则在训练前固定：旧词检出不低于原版，跨词命中与公开语音探针命中不增加；合格模型按检出、额外命中和损失排序。原版可以继续胜出。只有验证合格，且检出提高或在检出不退步时 RNNT 损失下降至少 5%，才允许解冻末端编码层。保留完整拒绝记录，不以低训练损失判定成功。

## 执行

在 Windows 项目根目录运行；依赖已有独立 Edu-KWS WSL 环境：

```powershell
wsl -d Edu-KWS --cd /home/edu/projects/edu-kws --exec .venv/bin/python -u /mnt/d/codes/edu-sys/tools/kws-training/finetune_xiaomai.py --run /home/edu/projects/edu-kws/runs/xiaomai-20260909-01 --epochs 20
```

同一目录拒绝覆盖。`status.json` 为 complete 后，使用 `prepare_xiaomai_export.py` 核对权重并归档，再通过 `export_personal.py` 导出，运行 `audit_xiaomai.py` 和 `verify_xiaomai_candidate.mjs`。

如果原版胜出，归档工具会把最后一个实际训练检查点明确标记为“被拒候选，仅供诊断”，以便核对流式表现；不能将这个检查点冒充验证最佳模型。`candidate-artifact.json` 是导出身份的依据。模型选择后不再利用保留测试集调参。

原生检查比较原版、此前微调版、新候选 FP32 和混合 INT8。浏览器检查运行原封不动的 `classroom-keywords.js` 和 `classroom-ending.js`，在临时本机 HTTP 服务中替换模型文件映射；网页现有资产不变。此前网页微调选项对“谢谢”采用通用模型，报告会区分这种混合路由与新候选全部图使用同一权重。

公开语音探针没有人工逐字标签，其命中只作风险线索。合成行为测试覆盖“谢谢大家”、续说、取消、重复称呼及旧别名，但不能替代真实课堂误触发率和远场麦克风测试。

本次结果与检查点归档在 `output/kws-xiaomai-training-20260909/`。

## 延长至 20 轮的试验

用户要求继续观察更多 epoch 后，使用 `extend_xiaomai.py` 从上述第 5 轮检查点追加 15 轮，取消早停，保持投影层训练和原始权重锚点。旧检查点缺少优化器状态，因此继承权重后重建优化器并预热；新增检查点保存完整优化器及随机数状态。

```powershell
wsl -d Edu-KWS --cd /home/edu/projects/edu-kws --exec .venv/bin/python -u /mnt/d/codes/edu-sys/tools/kws-training/extend_xiaomai.py --parent-run /home/edu/projects/edu-kws/runs/xiaomai-20260909-01 --run /home/edu/projects/edu-kws/runs/xiaomai-20260909-extended20 --until-epoch 20
```

第 10／15／20 轮分别通过 `export_xiaomai_milestone.py` 导出，再做不含测试录音的网页验证。`select_xiaomai_extension.py` 记录选择后才运行已有测试录音的回归；这些录音不再称为新测试集。结果位于 `output/kws-xiaomai-extended20-20260909/README.md`。其中根目录 candidate.pt 是第 10 轮诊断候选，三个固定检查点都保留在 epochs 下。继续训练降低了损失，但网页召回未提高，第 15／20 轮短“谢谢”还出现漏检回退，未替换现有网页模型。

随后应用户要求，将第10轮 FP32 ONNX 加入网页的独立选项“小麦老师微调模型（第10轮）”，保留原始模型及之前的个人版。四个关键词图均使用该检查点；安装和校验见 `scripts/xiaomai-kws-assets.json`、`pnpm kws:xiaomai:setup`。这是供用户实测比较的新增选项，不改变历史报告的评测结论。
