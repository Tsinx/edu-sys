"""Inspect the existing uv environment without initializing CUDA or training."""
import argparse
import importlib.metadata as metadata
import importlib.util
import json
import os
from pathlib import Path
import platform
import sys
from datetime import datetime, timezone

# Hide GPUs before importing torch. Never call torch.cuda or allocate GPU tensors.
os.environ["CUDA_VISIBLE_DEVICES"] = ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    versions = {}
    for name in ("torch", "torchaudio", "k2", "lhotse", "onnx", "onnxruntime-gpu"):
        try:
            versions[name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            versions[name] = None
    errors = []
    cuda_build = None
    try:
        import torch
        import torchaudio  # Also checks that its native libraries can load.
        cuda_build = torch.version.cuda
    except Exception as error:
        errors.append(str(error))
    missing = [name for name in ("k2", "lhotse") if versions[name] is None]
    if importlib.util.find_spec("icefall") is None:
        missing.append("icefall (source checkout on PYTHONPATH)")
    torch_version, audio_version = versions["torch"], versions["torchaudio"]
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "executable": sys.executable,
        "platform": platform.platform(),
        "packages": versions,
        "torchCudaBuild": cuda_build,
        "torchAudioVersionsMatch": bool(torch_version and torch_version == audio_version),
        "torchGpuPackageReady": bool(cuda_build and torch_version == audio_version and not errors),
        "missingTrainingDependencies": missing,
        "importErrors": errors,
        "zipformerTrainingReady": False,
        "gpuRuntimeTest": "SKIPPED: GPU reserved for user's other workload; no CUDA calls or tensors",
        "trainingStarted": False,
        "remainingChecks": [
            "CUDA-enabled k2 matching torch and CUDA; native Windows official wheels are CPU-only",
            "Compatible icefall KWS recipe and original trainable .pt checkpoint (ONNX is inference-only)",
            "Lhotse data preparation, positive/negative audio, and independent validation data",
            "CUDA smoke test and small-batch memory measurement only after GPU is available",
        ],
        "sources": [
            "https://k2-fsa.github.io/icefall/installation/index.html",
            "https://k2-fsa.github.io/k2/installation/from_wheels.html",
        ],
    }
    content = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content + "\n", encoding="utf-8")
    print(content)
    return 0 if report["torchGpuPackageReady"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
