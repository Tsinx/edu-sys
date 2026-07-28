[CmdletBinding()]
param(
    [ValidateSet("lam", "liteavatar", "both")]
    [string]$Profile = "both"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ComponentRoot = Join-Path $RepoRoot "components\openavatarchat"
$VenvRoot = Join-Path $ComponentRoot ".venv"
$PythonExe = Join-Path $VenvRoot "Scripts\python.exe"
$RuntimeBin = Join-Path $RepoRoot ".runtime\openavatarchat\bin"
$AvLibraries = Join-Path $VenvRoot "Lib\site-packages\av.libs"

if (-not (Test-Path -LiteralPath $PythonExe)) {
    throw "OpenAvatarChat Python environment was not found at $PythonExe."
}

$env:Path = "$RuntimeBin;$AvLibraries;$env:Path"
$env:OPENAVATAR_TEST_PROFILE = $Profile

$CheckCode = @'
import json
import os
import pathlib
import sys

import onnxruntime as ort
import torch

root = pathlib.Path.cwd()
profile = os.environ["OPENAVATAR_TEST_PROFILE"]
required_files = {
    "sensevoice": root / "models/iic/SenseVoiceSmall/model.pt",
}
if profile in {"lam", "both"}:
    required_files.update({
        "lam": root / "models/LAM_audio2exp/pretrained_models/lam_audio2exp_streaming.tar",
        "wav2vec2": root / "models/wav2vec2-base-960h/pytorch_model.bin",
    })
if profile in {"liteavatar", "both"}:
    required_files.update({
        "liteavatar_onnx": root / "src/handlers/avatar/liteavatar/algo/liteavatar/weights/model_1.onnx",
        "liteavatar_model": root / "src/handlers/avatar/liteavatar/algo/liteavatar/weights/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch/model.pb",
        "liteavatar_lm": root / "src/handlers/avatar/liteavatar/algo/liteavatar/weights/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch/lm/lm.pb",
        "liteavatar_sample": root / "resource/avatar/liteavatar/20250408/sample_data/net.pth",
    })

missing = [name for name, path in required_files.items() if not path.is_file()]
providers = ort.get_available_providers()
problems = []

if not torch.cuda.is_available():
    problems.append("torch.cuda.is_available() is false")
if "CUDAExecutionProvider" not in providers:
    problems.append("ONNX Runtime CUDAExecutionProvider is missing")
if missing:
    problems.append("missing model files: " + ", ".join(missing))

checksum = None
gpu_name = None
compute_capability = None
if torch.cuda.is_available():
    value = torch.randn((1024, 1024), device="cuda")
    result = value @ value
    torch.cuda.synchronize()
    checksum = round(result[0, 0].item(), 6)
    gpu_name = torch.cuda.get_device_name(0)
    compute_capability = list(torch.cuda.get_device_capability(0))

opus_available = False
try:
    import opuslib

    opuslib.Encoder(24000, 1, opuslib.APPLICATION_VOIP)
    opus_available = True
except Exception as exc:
    problems.append(f"Opus unavailable: {exc}")

summary = {
    "profile": profile,
    "python": sys.version.split()[0],
    "torch": torch.__version__,
    "torch_cuda_build": torch.version.cuda,
    "cuda_available": torch.cuda.is_available(),
    "gpu": gpu_name,
    "compute_capability": compute_capability,
    "cuda_matmul_checksum": checksum,
    "onnxruntime": ort.__version__,
    "onnx_providers": providers,
    "opus_available": opus_available,
    "model_files_present": not missing,
}
print(json.dumps(summary, ensure_ascii=False, indent=2))

if problems:
    print("\nVerification failed:", file=sys.stderr)
    for problem in problems:
        print(f"- {problem}", file=sys.stderr)
    raise SystemExit(1)
'@

Push-Location $ComponentRoot
try {
    $CheckCode | & $PythonExe -
    if ($LASTEXITCODE -ne 0) {
        throw "OpenAvatarChat GPU verification failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
