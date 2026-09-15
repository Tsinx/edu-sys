"""Verify Linux training dependencies using CPU-only synthetic data and --help.

Never runs run.sh, prepares a real training set, initializes CUDA, or trains a model.
"""
import os

os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import argparse
import faulthandler
from datetime import datetime, timezone
import importlib
import importlib.metadata as metadata
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import traceback


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("/home/edu/projects/edu-kws"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    faulthandler.dump_traceback_later(60, repeat=True)
    checks = []
    errors = []
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "python": sys.version,
              "executable": sys.executable, "environment": str(args.root),
              "gpuRuntimeTest": "SKIPPED; CUDA_VISIBLE_DEVICES is empty; CPU-only probes",
              "trainingStarted": False, "checks": checks, "errors": errors}
    packages = ("torch", "torchaudio", "k2", "kaldifeat", "lhotse", "lilcom", "icefall", "numpy", "scipy",
                "kaldifst", "kaldilm", "kaldialign", "kaldi-decoder", "sentencepiece", "pypinyin",
                "tensorboard", "onnx", "onnxruntime", "onnxoptimizer", "onnxsim", "onnxconverter-common",
                "librosa", "soundfile", "huggingface-hub", "sherpa-onnx")
    report["versions"] = {name: metadata.version(name) for name in packages}
    modules = ("torch", "torchaudio", "k2", "kaldifeat", "lhotse", "lilcom", "icefall", "kaldifst", "kaldilm",
               "kaldialign", "kaldi_decoder", "sentencepiece", "pypinyin", "tensorboard", "onnx",
               "onnxruntime", "onnxoptimizer", "onnxsim", "onnxconverter_common", "librosa", "soundfile",
               "huggingface_hub", "sherpa_onnx")
    for name in modules:
        print("Checking import: " + name, flush=True)
        try:
            if name == "kaldilm":
                # Official recipes invoke this OpenFst utility as a separate CLI.
                # Loading it after kaldifst in one process deadlocks these wheels.
                subprocess.run([sys.executable, "-m", "kaldilm", "--help"],
                               capture_output=True, text=True, check=True, timeout=30)
            else:
                importlib.import_module(name)
            checks.append("isolated CLI: kaldilm --help" if name == "kaldilm" else "import: " + name)
        except Exception:
            errors.append({"check": "import: " + name, "traceback": traceback.format_exc()})
    try:
        print("Checking CPU operators", flush=True)
        import torch
        import torchaudio
        import k2
        import kaldifeat
        import lhotse
        import lilcom
        import numpy as np
        import onnx
        import onnxruntime as ort
        torch.set_num_threads(1)
        report["torchCudaBuild"] = torch.version.cuda
        report["torchCxx11Abi"] = torch._C._GLIBCXX_USE_CXX11_ABI
        assert torch.version.cuda == "12.8"
        assert metadata.version("torch") == metadata.version("torchaudio") == "2.8.0+cu128"
        for package in ("k2", "kaldifeat"):
            assert "cuda12.8.torch2.8.0" in metadata.version(package)
        checks.append("Torch / Torchaudio / k2 / kaldifeat CUDA build versions match")

        # A tiny finite-state graph tests the native k2 extension on CPU.
        fsa = k2.linear_fsa([1, 2, 3], device=torch.device("cpu"))
        assert fsa.labels.device.type == "cpu"
        assert fsa.labels.tolist() == [1, 2, 3, -1]
        checks.append("k2 native CPU finite-state graph")

        waveform = .03 * torch.sin(torch.arange(16000, device="cpu") * (2 * torch.pi * 220 / 16000))
        options = kaldifeat.FbankOptions()
        options.device = "cpu"
        options.frame_opts.dither = 0
        options.mel_opts.num_bins = 80
        features = kaldifeat.Fbank(options)(waveform)
        assert features.device.type == "cpu" and features.shape[1] == 80
        assert torch.isfinite(features).all()
        checks.append("kaldifeat CPU Fbank: 16 kHz synthetic audio to 80 bins")
        unpacked = lilcom.decompress(lilcom.compress(features.numpy()))
        assert unpacked.shape == tuple(features.shape) and np.isfinite(unpacked).all()
        checks.append("Lilcom feature compression and decompression")

        with tempfile.TemporaryDirectory(prefix="edu-kws-cpu-check-") as temporary:
            path = Path(temporary) / "synthetic.wav"
            torchaudio.save(str(path), waveform.unsqueeze(0), 16000, backend="soundfile")
            restored, rate = torchaudio.load(str(path), backend="soundfile")
            assert rate == 16000 and restored.shape == (1, 16000)
            recording = lhotse.Recording.from_file(path)
            loaded = recording.load_audio()
            assert loaded.shape == (1, 16000)
            checks.append("Torchaudio PCM WAV I/O and Lhotse recording loader")

        # Test the CPU export runtime with a tiny ONNX graph, not the KWS model.
        x = onnx.helper.make_tensor_value_info("x", onnx.TensorProto.FLOAT, [1, 2])
        y = onnx.helper.make_tensor_value_info("y", onnx.TensorProto.FLOAT, [1, 2])
        graph = onnx.helper.make_graph([onnx.helper.make_node("Identity", ["x"], ["y"])], "cpu-check", [x], [y])
        model = onnx.helper.make_model(graph, opset_imports=[onnx.helper.make_opsetid("", 17)])
        model.ir_version = 9
        onnx.checker.check_model(model)
        session = ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])
        value = np.array([[1, 2]], dtype=np.float32)
        np.testing.assert_array_equal(session.run(None, {"x": value})[0], value)
        checks.append("ONNX model validation and CPU runtime")
    except Exception:
        errors.append({"check": "CPU compatibility probes", "traceback": traceback.format_exc()})

    icefall_root = args.root / "vendor/icefall"
    report["icefallRevision"] = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=icefall_root, text=True).strip()
    report["icefallLocalPatch"] = "patch_icefall.py: escape two literal percent signs in finetune CLI help"
    recipe = icefall_root / "egs/wenetspeech/KWS"
    for script in ("zipformer/finetune.py", "zipformer/decode.py", "zipformer/export.py", "zipformer/export-onnx-streaming.py"):
        print("Checking recipe CLI: " + script, flush=True)
        try:
            result = subprocess.run([sys.executable, script, "--help"], cwd=recipe,
                                    capture_output=True, text=True, timeout=90, env=os.environ.copy())
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-12000:] + result.stdout[-1000:])
            assert "usage:" in result.stdout.lower()
            checks.append("recipe CLI imports: " + script)
        except Exception:
            errors.append({"check": script, "traceback": traceback.format_exc()})
    for command in (["ffmpeg", "-version"], ["sox", "--version"], ["cmake", "--version"],
                    ["ninja", "--version"], ["g++", "--version"], ["git", "lfs", "version"]):
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=10)
            checks.append("system: " + result.stdout.splitlines()[0])
        except Exception:
            errors.append({"check": " ".join(command), "traceback": traceback.format_exc()})
    report["dependencyChecksPassed"] = not errors
    report["knownConstraints"] = [
        "kaldilm must run as a separate process (python -m kaldilm), as in official recipes; "
        "importing kaldilm after kaldifst in one process hangs with these wheels."
    ]
    report["gpuTrainingValidated"] = False
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    faulthandler.cancel_dump_traceback_later()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
