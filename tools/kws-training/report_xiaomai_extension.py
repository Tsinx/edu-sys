"""Verify and summarize the fixed-budget extension without selecting on tests."""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--parent-output', type=Path, required=True)
args = parser.parse_args()
root, parent = args.output, args.parent_output
read = lambda path: json.loads(Path(path).read_text(encoding='utf-8-sig'))
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
status, config, selection = [read(root / f'{n}.json') for n in ('status','config','selection')]
artifact = read(root / 'candidate-artifact.json')
browser = read(root / 'browser-selected-regression.json')
old_browser = read(parent / 'browser-audit.json')
base_browser = read(root / 'baseline-browser-validation.json')
native = read(root / 'native-streaming-audit.json')
history = [json.loads(s) for s in (root/'history.jsonl').read_text().splitlines() if s.strip()]
assert status['state'] == 'complete' and [r['epoch'] for r in history] == list(range(6,21))
assert status['additionalSteps'] == 210 and status['totalSteps'] == 280
assert read(root/'weight-audit.json')['frozenTensorsUnchanged'] and read(root/'checkpoint-audit.json')['passed']
assert sha(root/'scripts/extend_xiaomai.py') == config['scriptSha256']
assert not browser['provenance']['errors'] and browser['provenance']['selectedSplit'] == 'test'
assert len(browser['candidate']['rows']) == 62
assert datetime.fromisoformat(browser['provenance']['startedAt'].replace('Z','+00:00')) > datetime.fromisoformat(selection['recordedAt'])
assert browser['provenance']['runtimeSha256'] == base_browser['provenance']['runtimeSha256']
assert browser['provenance']['ttsSha256'] == base_browser['provenance']['ttsSha256']
assert browser['provenance']['fixtureManifestSha256'] == base_browser['provenance']['fixtureManifestSha256']
assert sha(root/'candidate.pt') == artifact['checkpointSha256']
for name, digest in artifact['modelFiles'].items():
    assert sha(root/'model'/name) == digest
    assert browser['provenance']['servedModelHashes']['candidate']['/vendor/local-kws/'+name] == digest
before = read(root/'deployed-before.json')
assert all(sha(Path(r['Path'])) == r['Hash'].lower() for r in before)
epoch = selection['selectedEpoch']
loss5 = read(parent/'validation/epoch-05.json')['rnntLoss']
loss20 = history[-1]['validation']['rnntLoss']
improved = selection['improvedOnBrowserValidation']
lines = ['# 小麦关键词：续训至 20 轮', '',
    ('本轮网页验证出现了检出改善；新检查点仍需结合回归结果判断。' if improved else
     '**已从第 5 轮权重续训至第 20 轮。网页验证未出现召回提升，现有网页模型保持不变。**'), '',
    f"新增 15 轮、210 次更新，累计 20 轮、280 次更新；本段训练耗时 {status['seconds']:.1f} 秒。验证 RNNT 损失从第 5 轮的 {loss5:.4f} 降至第 20 轮的 {loss20:.4f}，再下降 {(1-loss20/loss5)*100:.1f}%。", '',
    '本次继承的是刚结束的四词微调第 5 轮权重，不是更早的两词微调模型。第 5 轮检查点只有模型权重和轮次，未保存优化器，因此本次重新初始化 AdamW 和随机序列、用 10 次更新预热；不是逐状态无缝恢复。新检查点已经保存优化器、随机数状态和累计步数，且完成可读取核对。', '',
    '保持 56／12／12 的源录音划分及全部增强、回放和蒸馏设置。仅训练 41,280 个投影层参数（约 1.31%），所有编码层仍冻结；学习率沿原 20 轮余弦计划继续下降。本段取消早停，未以中途验证结果调整参数或训练总轮数。', '',
    f"**约束参照始终是原始预训练权重。** 第 20 轮投影层分组权重相对 L2 偏移 {history[-1]['drift']['projection']['relativeL2']*100:.4f}%，低于 2% 上限；冻结张量逐项核对通过。没有把第 5 轮当作新的约束起点来扩大累计偏移。", '',
    '## 固定检查点的网页验证', '',
    '每个条件只有 12 条验证源录音。处理音、原音和轻扰动是同一批录音的三个版本，合计 36 次相关检查。另有 14 个合成行为用例、6 次噪声/静音阶段检查及6次公开语音阶段探针。', '',
    '| 模型 | 处理音 | 原音 | 轻扰动 | 行为用例 | 权重相对偏移 |', '|---|---:|---:|---:|---:|---:|']
for key, label, drift in [('original','原版','0%'),('epoch5','第 5 轮','0.3030%'),
                         *[(f'epoch{e}',f'第 {e} 轮',f"{read(root/'epochs'/f'epoch-{e:02}'/'artifact.json')['relativeL2ToOriginal']*100:.4f}%") for e in (10,15,20)]]:
    c = selection['comparison'][key]
    lines.append(f"| {label} | {c['byVariant']['clean']}/12 | {c['byVariant']['original']}/12 | {c['byVariant']['mild_stress']}/12 | {c['controls']['synthetic_behavior_regression']}/14 | {drift} |")
lines += ['', f"在回归重放开始前，按预先记录的网页验证规则选定第 {epoch} 轮用于最终对照：旧词表现和控制行为不能退步，优先验证集成功数，相同时比较验证损失。"
    + ('该候选在网页验证中有改善，尚未部署。' if improved else '各轮没有网页召回收益；此处选择仅用于保留诊断候选，不代表通过上线标准。'), '',
    '逐轮 PyTorch 声学诊断仍记录在 history.jsonl 中。它的跨词命中没有网页阶段控制和 VAD，不等同于实际错误结束；本段训练开始前就已约定以实际网页验证作为可用性比较依据。', '',
    '如果“resumption cancels pending”或“cancel discards pending”用例显示 injected=false，表示短“谢谢”未产生疑似退出状态，测试没有播放后续注入语音；不能把这种失败直接解释成“续说或取消动作失效”。', '',
    '## 已看过的测试录音：回归对照', '',
    '**这不是新的独立测试集。** 原版、此前两词微调和第 5 轮的数字引用上一轮同批音频的实际网页结果；本轮复测了原版和第 5 轮验证基线，并对选定新检查点重放回归数据。未使用回归成绩重新选轮次或调参。', '',
    '| 模型 | 处理音 | 原音 | 轻扰动 |', '|---|---:|---:|---:|']
models = [('原版（历史参考）',old_browser['original']),('此前两词微调版（历史参考）',old_browser['previous_personal']),
          ('第 5 轮（历史参考）',old_browser['candidate']),(f'第 {epoch} 轮（本轮重放）',browser['candidate'])]
for label, result in models:
    s = result['summary']['test']
    lines.append('| '+label+' | '+' | '.join(f"{s[v]['correct']}/{s[v]['total']}" for v in ('clean','original','mild_stress'))+' |')
lines += ['', '### 非常感谢', '', '| 模型 | 处理音 | 原音 | 轻扰动 |', '|---|---:|---:|---:|']
for label, result in models:
    lines.append('| '+label+' | '+' | '.join(f"{result['summary']['test'][v]['byCategory']['end']}/3" for v in ('clean','original','mild_stress'))+' |')
lines += ['', '这些数字衡量播放“非常感谢”后网页是否正确输出结束事件，包含网页过滤和状态逻辑，不是单独的声学模型分数。每格只有 3 条源录音。', '',
    '### 最终候选的行为与原生流式检查', '']
s = browser['candidate']['summary']
for kind, label in [('synthetic_behavior_regression','合成行为回归'),('synthetic_noise','静音／噪声两阶段'),('public_speech_probe','公开语音两阶段探针')]:
    lines.append(f"- {label}：{s[kind]['correct']}/{s[kind]['total']}，不符合预期项：{', '.join(s[kind]['mismatches']) or '无'}。")
ns = native['candidate_fp32']['summary']['test']
lines += [f"- 原生 FP32 对应关键词检出：处理音 {ns['clean']['correct']}/12、原音 {ns['original']['correct']}/12、轻扰动 {ns['mild_stress']['correct']}/12。这是声学图结果，不能替代网页结果。", '',
    '公开语音没有人工逐字核对，合成噪声和既有 TTS 也不是独立的真实课堂样本。这些检查不能推出每小时误唤醒率或多说话人泛化表现。', '',
    '## 产物与复现', '',
    f'- candidate.pt / model/：第 {epoch} 轮权重与 FP32 ONNX。候选身份以 selection.json 和 candidate-artifact.json 为准。',
    '- epochs/epoch-10、epoch-15、epoch-20：固定轮次的检查点、ONNX、权重偏移与导出记录。',
    '- config.json、history.jsonl、status.json：续训设置与完整进度；split-manifest.json 沿用原源录音分组。',
    '- checkpoint-audit.json、weight-audit.json：优化器／随机数状态保存检查、冻结与原始锚点约束核对。',
    '- baseline-browser-validation.json、browser-epoch-*-validation.json：参与选择的网页验证。',
    '- browser-selected-regression.json、native-streaming-audit.json：选定后运行的回归对照。',
    '- scripts/：执行脚本快照；环境沿用 Edu-KWS，依赖版本见 environment.json。', '',
    '没有替换网页模型，也没有更改阈值、VAD、录音或交互逻辑。本轮检验的是增加训练轮数的效果；训练损失继续下降与网页召回变化分别报告。', '']
(root/'README.md').write_text('\n'.join(lines),encoding='utf-8')
artifact['regressionCompleted'] = True
(root/'candidate-artifact.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
paths = [root/'README.md', root/'candidate.pt', root/'selection.json', root/'browser-selected-regression.json',
         root/'native-streaming-audit.json', *list((root/'model').iterdir())]
delivery = dict(complete=True, totalEpochs=20, addedEpochs=15, addedUpdates=210, originalAnchorPreserved=True,
    frozenTensorsVerified=True, fullCheckpointStateReadable=True, browserValidationCompared=True,
    regressionAfterSelection=True, previouslySeenTestExplicitlyLabelled=True,
    actualBrowserValidationImproved=improved, selectedEpoch=epoch, deployedAssetsUnchanged=True,
    files={str(p.relative_to(root)).replace('\\','/'):sha(p) for p in paths})
(root/'delivery-check.json').write_text(json.dumps(delivery,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in delivery.items() if k != 'files'},ensure_ascii=False))
