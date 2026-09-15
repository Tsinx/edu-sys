"""Preserve a trained artifact even when the validation rule retains the baseline.

A rejected last checkpoint is diagnostic only. It must never be relabelled as
the validation winner merely because a later streaming test happens to pass.
"""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
import argparse
import json
from pathlib import Path
import shutil
import torch
from personalize_train import save_json, sha

parser = argparse.ArgumentParser()
parser.add_argument('--run', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
run, output = args.run, args.output
status = json.loads((run / 'status.json').read_text())
config = json.loads((run / 'config.json').read_text())
assert status['state'] == 'complete'
output.mkdir(parents=True, exist_ok=True)
assert not (output / 'candidate-artifact.json').exists(), 'Refusing to overwrite a finalized artifact'
selected = status['trainedCandidateSelected']
path = run / ('best.pt' if selected else 'last.pt')
base = torch.load(run / 'baseline.pt', map_location='cpu', weights_only=True)['model']
checkpoint = torch.load(path, map_location='cpu', weights_only=True)
candidate = checkpoint['model']
changed = [n for n, p in base.items() if not torch.equal(p, candidate[n])]
assert changed, 'Export must contain actual trained weights'
assert all(n in config['allowedTrainableNames'] for n in changed), 'Frozen tensor changed'
drift = {}
for group, prefix in [('projection', 'joiner.encoder_proj.'), ('last_encoder', 'encoder.encoders.5.')]:
    names = [n for n in config['allowedTrainableNames'] if n.startswith(prefix)]
    relative = float(torch.sqrt(sum((candidate[n] - base[n]).square().sum() for n in names)) / torch.sqrt(sum(base[n].square().sum() for n in names)))
    cap = config['groups'][group]['relativeL2Cap']
    assert relative <= cap + 1e-6
    drift[group] = dict(relativeL2=relative, cap=cap)
for src in list(run.glob('*.json')) + list(run.glob('*.jsonl')):
    name = 'selected-baseline-test.json' if not selected and src.name == 'candidate-test.json' else src.name
    shutil.copy2(src, output / name)
shutil.copytree(run / 'validation', output / 'validation', dirs_exist_ok=True)
shutil.copy2(path, output / 'candidate.pt')
manifest = dict(checkpoint=str(path), epoch=checkpoint['epoch'], checkpointSha256=sha(path),
                validationWinner=selected, validationSelectedEpoch=status['bestEpoch'],
                purpose='validation-selected candidate' if selected else 'rejected final checkpoint for streaming diagnosis only',
                productionPromotion=False, outputCheckpoint=str(output / 'candidate.pt'))
save_json(output / 'candidate-artifact.json', manifest)
save_json(output / 'candidate-weight-audit.json', dict(passed=True, frozenTensorsUnchanged=True,
          changedTensors=changed, drift=drift, candidateSha256=sha(path), baselineSha256=sha(run / 'baseline.pt')))
print(json.dumps(manifest), flush=True)
