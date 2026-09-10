"""Build a source-backed experiment report after native and browser checks."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = args.output
def read(name):
    return json.loads((root / name).read_text(encoding='utf-8-sig'))
status, config, artifact = read('status.json'), read('config.json'), read('candidate-artifact.json')
weights, split = read('candidate-weight-audit.json'), read('split-audit.json')
browser, native = read('browser-audit.json'), read('native-streaming-audit.json')
history = [json.loads(line) for line in (root / 'history.jsonl').read_text().splitlines() if line.strip()]
baseline = read('baseline-validation.json')
assert status['state'] == 'complete' and weights['passed'] and split['passed']
assert browser['provenance']['workerUnmodified'] and not browser['provenance']['errors']
export = read('export-report.json')
assert export['onnxStructurePassed'] and export['epoch'] == artifact['epoch']
assert hashlib.sha256((root / 'candidate.pt').read_bytes()).hexdigest() == artifact['checkpointSha256']
assert hashlib.sha256((root / 'scripts/finetune_xiaomai.py').read_bytes()).hexdigest() == config['scriptSha256']
for name in ('encoder.onnx', 'decoder.onnx', 'joiner.onnx'):
    assert hashlib.sha256((root / 'model' / name).read_bytes()).hexdigest() == export['files'][name]['sha256']
names = {'original': '原版', 'previous_personal': '此前微调版（网页混合路由）', 'candidate': '本轮训练权重（诊断候选）'}
selected = artifact['validationWinner']
lines = ['# 小麦老师／谢谢微调结果', '',
    '本轮已完成训练、权重核对、ONNX 导出、CPU 原生流式检查和实际浏览器 KWS/VAD 回归。', '',
    ('验证规则选中了训练后的候选检查点。' if selected else
     '**本次试验没有产生获准替换原版的模型。验证规则仍选中原版；最后训练权重已保留并导出，仅供诊断。**'), '',
    f"完成 {status['completedEpochs']} 轮、{status['steps']} 次 GPU 更新；训练及末尾评估耗时 {status['seconds']:.1f} 秒。GPU 为 {config['gpu']}。",
    f"本轮从原版权重出发，初始只开放 {config['groups']['projection']['parameters']:,} / {config['totalParameters']:,} 个参数（约 {config['groups']['projection']['parameters']/config['totalParameters']*100:.2f}%）。"
    + ('末端编码层通过门槛后解冻。' if status['encoderUnfrozen'] else '末端编码层未通过解冻门槛，始终冻结；其配置学习率没有实际参与更新。'), '',
    '## 数据与训练', '',
    '- 四词各 20 条，共 80 条；训练 56、验证 12、测试 12。源录音 SHA256 分组，旧 40 条划分保持不变。重录的 `end_thanks_12` 已核对。',
    '- 全句 RNNT 标签；不以估算的逐字能量区间训练。训练时混用处理版和原音，再做小幅增强。',
    '- 投影层学习率 3e-5；末端编码层预设 8e-6，未解冻时实际为零。预热、余弦衰减、AdamW、梯度裁剪、L2 起点约束和旧语音蒸馏均已执行。',
    '- 每批四词各一条，加一条旧语音回放。回放来自上一轮已归档的 WAV 与标签，避免同名临时音频后来改写造成标签错配。',
    f"- 冻结张量核对通过；实际修改 {len(weights['changedTensors'])} 个张量。投影层分组权重相对 L2 变化 {weights['drift']['projection']['relativeL2']*100:.4f}%（上限 2%），末端编码层 {weights['drift']['last_encoder']['relativeL2']*100:.4f}%（上限 1%）。", '',
    '## 验证选型', '',
    '12 条源录音各运行处理版、原音和固定轻扰动，共 36 次相关测试；不能视为 36 条独立录音。以下为 PyTorch 声学图的额外跨词命中，尚未经过网页阶段控制和 VAD。公开语音没有人工核对文本，命中只作风险线索。', '',
    '| 轮次 | RNNT 验证损失 | 目标检出 | 额外跨词命中 | 公开语音探针命中条数 | 通过选型约束 |',
    '|---|---:|---:|---:|---:|---|',
    f"| 原版 | {baseline['rnntLoss']:.4f} | {baseline['correct']}/36 | {baseline['wrong']} | {baseline['publicProbeTriggers']}/3 | 基线 |"]
for row in history:
    v = row['validation']
    lines.append(f"| {row['epoch']} | {v['rnntLoss']:.4f} | {v['correct']}/36 | {v['wrong']} | {v['publicProbeTriggers']}/3 | {'是' if row['admissible'] else '否'} |")
lines += ['', '模型选定后才运行保留测试集。若原版胜出，`selected-baseline-test.json` 对应所选原版；`candidate-artifact.json` 明确指明后续导出的实际训练权重。后续原生和浏览器检查不用于重新调参或把被拒候选改称验证最佳。', '',
    '## 实际网页 KWS/VAD：保留测试集', '',
    '使用未修改的网页 worker 和 VAD，在临时本机 HTTP 服务中映射模型文件，按 2048 样本分块输入音频。成功要求预期事件数量正确，且没有额外唤醒、结束或取消。', '',
    '| 模型 | 处理版 | 原音 | 固定轻扰动 |', '|---|---:|---:|---:|']
for name, label in names.items():
    s = browser[name]['summary']['test']
    lines.append('| ' + label + ' | ' + ' | '.join(f"{s[v]['correct']}/{s[v]['total']}" for v in ('clean', 'original', 'mild_stress')) + ' |')
lines += ['', '本轮候选全部关键词图使用同一套训练权重；此前网页微调选项对短“谢谢”及取消采用通用模型。因此网页结果与直接对旧模型所有图使用同一权重的原生检查不能混作同一种配置。', '',
    '| 模型 | 合成行为回归 | 静音／噪声两阶段检查 | 公开语音探针两阶段检查* |', '|---|---:|---:|---:|']
for name, label in names.items():
    s = browser[name]['summary']
    lines.append('| ' + label + ' | ' + ' | '.join(f"{s[k]['correct']}/{s[k]['total']}" for k in ('synthetic_behavior_regression', 'synthetic_noise', 'public_speech_probe')) + ' |')
lines += ['', '*公开语音这一列表示“没有输出控制事件”的检查次数，未核对逐字文本，不作为真实误报率。静音／噪声只有 3 段各 30 秒、在两个阶段分别运行；不代表长时间课堂误唤醒率。', '',
    '合成行为覆盖“小麦老师”唤醒、明确结束、短“谢谢”、续说取消待退出、“谢谢大家”、重复称呼、取消以及旧别名。既有 TTS 回归包含可能已回放的旧命令，属于遗忘回归而非独立泛化证据。', '',
    '### 候选失败项', '']
failures = [r for r in browser['candidate']['rows'] if not r['correct']]
if not failures:
    lines.append('本组浏览器用例未见失败；验证集风险约束仍独立有效，不能据此认定适合真实课堂。')
else:
    lines += ['| 样本 | 划分／条件 | 控制事件 |', '|---|---|---|']
    for row in failures:
        hits = ', '.join(h['kind'] + ':' + h['phrase'] for h in row['hits']) or '无'
        lines.append(f"| {row['id']} | {row['split']} / {row['variant']} / {'交流中' if row.get('collecting') else '等待唤醒'} | {hits} |")
lines += ['', '## 原生 ONNX 流式检查', '',
    '下表仅判断对应声学关键词是否命中；没有执行网页连贯性过滤、阶段状态和 VAD。故不能将原生检出直接称为网页成功。', '',
    '| 模型 | 测试处理版 | 测试原音 | 测试轻扰动 |', '|---|---:|---:|---:|']
for name, data in native.items():
    s = data['summary']['test']
    lines.append('| ' + name + ' | ' + ' | '.join(f"{s[v]['correct']}/{s[v]['total']}" for v in ('clean', 'original', 'mild_stress')) + ' |')
lines += ['', 'ONNX FP32 与 INT8 结构校验通过；实际浏览器只测试 FP32，未将 INT8 作为网页候选。', '',
    '## 判断与后续边界', '',
    '这次试验表明，降低整句识别损失并不必然改善短词控制；本轮选择规则拒绝了额外命中上升的权重。已有原版在这些目标词上基线较强，继续增加正样本拟合力度需要以易混淆语音和真实课堂背景的证据来约束。下一次实验应使用新增、独立录制的评估语音，避免反复查看本次测试集后继续调参。', '',
    '没有更改网页模型资产，没有修改唤醒/结束阈值，没有终止其他服务。本报告的证据来自单人样本及受控音频回放，尚无真实远场麦克风课堂验收。', '',
    '## 文件', '',
    '- `candidate.pt`：已训练检查点；是否为验证胜者必须同时查看 `candidate-artifact.json`。',
    '- `model/`：对应 FP32 encoder / decoder / joiner / tokens，供诊断。',
    '- `config.json`、`split-audit.json`、`split-manifest.json`、`history.jsonl`：训练设置、来源边界、逐轮结果。',
    '- `candidate-weight-audit.json`、`export-report.json`：冻结与偏移核对、ONNX 导出证据。',
    '- `native-streaming-audit.json`、`browser-audit.json`：逐样本原生及真实浏览器结果。',
    '- `delivery-check.json`：最终文件哈希与网页资产保留检查。',
    '- `environment.json`、`scripts/`：本次依赖版本、icefall 提交及执行脚本快照。', '',
    '实现：`tools/kws-training/finetune_xiaomai.py`；完整流程说明：`tools/kws-training/XIAOMAI_TRAINING.md`。', '',
    '方法参考：[PyTorch 参数冻结](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html)、[L2-SP 起点约束论文](https://proceedings.mlr.press/v80/li18a.html)。这些参考支撑方法选择，不证明本次模型有性能提升。', '']
(root / 'README.md').write_text('\n'.join(lines), encoding='utf-8')
before = read('deployed-before.json')
unchanged = all(hashlib.sha256(Path(row['Path']).read_bytes()).hexdigest() == row['Hash'].lower() for row in before)
assert unchanged
files = {str(p.relative_to(root)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
         for p in [root / 'candidate.pt', root / 'README.md', root / 'browser-audit.json', root / 'native-streaming-audit.json', *sorted((root / 'model').iterdir())] if p.is_file()}
delivery = dict(trainingCompleted=True, validationWinnerIsTrainedCandidate=selected, candidateDiagnosticOnly=not selected,
                frozenWeightsVerified=True, sourceSplitVerified=True, onnxChecked=True, actualBrowserChecked=True,
                browserHarnessErrors=[], deployedModelFilesUnchanged=unchanged, files=files)
(root / 'delivery-check.json').write_text(json.dumps(delivery, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k:v for k,v in delivery.items() if k != 'files'}, ensure_ascii=False))
