"""Export one immutable extended-run checkpoint and verify its original anchors."""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--run', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--epoch', type=int, required=True)
args = parser.parse_args()
run, output = args.run, args.output
checkpoint = run / f'epoch-{args.epoch:02}.pt'
validation_path = run / f'validation/epoch-{args.epoch:02}.json'
assert checkpoint.exists() and validation_path.exists(), 'Milestone not complete'
destination = output / 'epochs' / f'epoch-{args.epoch:02}'
destination.mkdir(parents=True, exist_ok=True)
assert not (destination / 'artifact.json').exists(), 'Milestone already archived'
export_root = run / f'export-epoch-{args.epoch:02}'
command = [sys.executable, str(Path(__file__).parent / 'export_personal.py'),
           '--checkpoint', str(checkpoint), '--output', str(export_root)]
result = subprocess.run(command, capture_output=True, text=True)
(destination / 'export.log').write_text(result.stdout + result.stderr)
if result.returncode:
    print(result.stderr[-4000:], flush=True)
    raise SystemExit(result.returncode)
report = json.loads((export_root / 'export-report.json').read_text())
assert report['epoch'] == args.epoch and report['onnxStructurePassed']
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
model_dir = destination / 'model'
model_dir.mkdir(exist_ok=True)
for name in ('encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt'):
    shutil.copy2(export_root / name, model_dir / name)
    assert sha(export_root / name) == sha(model_dir / name)
    if name in report['files']:
        assert sha(model_dir / name) == report['files'][name]['sha256']
shutil.copy2(export_root / 'export-report.json', destination / 'export-report.json')
shutil.copy2(validation_path, destination / 'validation.json')
shutil.copy2(checkpoint, destination / 'candidate.pt')
import torch
saved = torch.load(checkpoint, map_location='cpu', weights_only=True)
baseline = torch.load(run / 'baseline.pt', map_location='cpu', weights_only=True)['model']
config = json.loads((run / 'config.json').read_text())
assert saved['epoch'] == args.epoch and saved['optimizer']['state']
changed = [n for n, p in saved['model'].items() if not torch.equal(p, baseline[n])]
assert changed and all(n in config['actualTrainableNames'] for n in changed)
names = config['actualTrainableNames']
delta = torch.sqrt(sum((saved['model'][n] - baseline[n]).square().sum() for n in names))
norm = torch.sqrt(sum(baseline[n].square().sum() for n in names))
relative = float(delta / norm)
assert relative <= .02 + 1e-6
artifact = dict(epoch=args.epoch, checkpoint=str(checkpoint), checkpointSha256=sha(checkpoint),
                copiedCheckpointSha256=sha(destination / 'candidate.pt'), frozenTensorsUnchanged=True,
                changedTensors=changed, relativeL2ToOriginal=relative, cap=.02,
                originalAnchorSha256=sha(run / 'baseline.pt'), optimizerAndRngSaved=True,
                modelFiles={p.name: sha(p) for p in model_dir.iterdir()}, onnxChecked=True,
                exportRoot=str(export_root), deployment='Not deployed; awaiting validation comparison')
assert artifact['checkpointSha256'] == artifact['copiedCheckpointSha256']
(destination / 'artifact.json').write_text(json.dumps(artifact, indent=2) + '\n')
print('MILESTONE_EXPORTED', json.dumps(artifact), flush=True)
