"""Export a completed checkpoint through the pinned upstream streaming exporter."""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
from personalize_common import MODEL_ARGS, TOKEN_PATH, RECIPE
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import torch
import onnx

parser = argparse.ArgumentParser()
parser.add_argument('--checkpoint', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
if (args.output / 'export-report.json').exists():
    raise RuntimeError('Export report exists; use a new destination')
checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
torch.save({'model':checkpoint['model']}, args.output / 'epoch-1.pt')
command = [sys.executable, str(RECIPE / 'export-onnx-streaming.py'), '--exp-dir', str(args.output),
           '--tokens', str(TOKEN_PATH), '--epoch', '1', '--avg', '1', '--use-averaged-model', 'false',
           '--enable-int8-quantization', '1', *MODEL_ARGS]
result = subprocess.run(command, capture_output=True, text=True, env=os.environ.copy())
(args.output / 'export.log').write_text(result.stdout + result.stderr)
if result.returncode:
    print(result.stderr[-6000:])
    raise SystemExit(result.returncode)
files = {}
for part in ('encoder', 'decoder', 'joiner'):
    for variant in ('', '.int8'):
        source = args.output / f'{part}-epoch-1-avg-1-chunk-16-left-64{variant}.onnx'
        path = args.output / f'{part}{variant}.onnx'
        shutil.copy2(source, path)
        onnx.checker.check_model(str(path))
        files[path.name] = dict(bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
shutil.copy2(TOKEN_PATH, args.output / 'tokens.txt')
report = dict(checkpoint=str(args.checkpoint), epoch=checkpoint.get('epoch', 0), files=files,
              encoderChunk=16, leftContextFrames=64, gpuUsed=False, onnxStructurePassed=True)
(args.output / 'export-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
