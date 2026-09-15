"""CPU-only acoustic evidence: local neural VAD, KWS token anchors, and spectrum.

Token emission times are approximate anchors, not forced-alignment boundaries.
Analysis gain is applied to a temporary copy only; source WAV bytes stay intact.
Run with the existing Edu-KWS environment (sherpa-onnx, scipy, onnxruntime).
"""
import argparse
from collections import Counter
import hashlib
import io
import json
import os
from pathlib import Path
import wave
import zipfile

os.environ["CUDA_VISIBLE_DEVICES"] = ""
import numpy as np
import onnxruntime as ort
from scipy.ndimage import median_filter
import sherpa_onnx

RATE = 16000
FRAME, HOP = 400, 160
KEYWORDS = {
    "wake_xiaomai": "x iǎo m ài l ǎo sh ī :1.5 #0.15 @wake_xiaomai",
    "end_thanks": "x iè x iè :1.5 #0.3 @end_thanks",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_wav(raw):
    with wave.open(io.BytesIO(raw)) as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (1, 2, RATE)
        n = audio.getnframes()
        pcm = audio.readframes(n)
        assert len(pcm) == n * 2
    return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768


def runs(mask):
    edges = np.diff(np.pad(np.asarray(mask, dtype=np.int8), (1, 1)))
    return list(zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)))


def spectral(audio):
    centered = audio.astype(np.float64) - audio.mean()
    framed = np.lib.stride_tricks.sliding_window_view(np.pad(centered, (FRAME // 2, FRAME // 2)), FRAME)[::HOP]
    power = np.abs(np.fft.rfft(framed * np.hanning(FRAME), n=512)) ** 2
    frequencies = np.fft.rfftfreq(512, 1 / RATE)
    power /= np.sum(np.hanning(FRAME) ** 2) * 512 / 2
    bands = [(100, 800), (800, 2500), (2500, 7500)]
    band_power = np.array([power[:, (frequencies >= lo) & (frequencies < hi)].sum(axis=1) for lo, hi in bands])
    speech_power = band_power.sum(axis=0)
    energy_db = 10 * np.log10(np.maximum(speech_power, 1e-16))
    energy_db = median_filter(energy_db, size=3, mode="nearest")
    sub = power[:, (frequencies >= 100) & (frequencies < 7500)]
    flatness = np.exp(np.log(np.maximum(sub, 1e-16)).mean(axis=1)) / np.maximum(sub.mean(axis=1), 1e-16)
    centroid = (power * frequencies).sum(axis=1) / np.maximum(power.sum(axis=1), 1e-16)
    # Coarse log-frequency display grid; analysis retains all three full bands.
    bins = np.geomspace(100, 7500, 49)
    picture = np.array([10 * np.log10(np.maximum(power[:, (frequencies >= a) & (frequencies < b)].sum(axis=1), 1e-16)) for a, b in zip(bins[:-1], bins[1:])])
    return {
        "times": (np.arange(len(energy_db)) * HOP / RATE).round(4).tolist(),
        "energyDb": energy_db.round(2).tolist(),
        "bandsDb": (10 * np.log10(np.maximum(band_power, 1e-16))).round(2).tolist(),
        "flatness": flatness.round(4).tolist(), "centroidHz": centroid.round(1).tolist(),
        "spectrogram": picture[:, ::2].round(1).tolist(), "spectrogramHopSeconds": HOP * 2 / RATE,
    }


class Evidence:
    def __init__(self, model, keys):
        self.kws = sherpa_onnx.KeywordSpotter(
            tokens=str(model / "tokens.txt"), encoder=str(model / "encoder.onnx"),
            decoder=str(model / "decoder.onnx"), joiner=str(model / "joiner.onnx"),
            keywords_file=str(keys), num_threads=2, max_active_paths=8, provider="cpu")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.vad = ort.InferenceSession(str(model / "silero_vad.onnx"), options, providers=["CPUExecutionProvider"])
        assert [(x.name, x.shape) for x in self.vad.get_inputs()] == [("x", [1, 512]), ("h", [2, 1, 64]), ("c", [2, 1, 64])]

    def anchors(self, audio):
        stream = self.kws.create_stream()
        stream.accept_waveform(RATE, np.pad(audio, (RATE, RATE * 2)))
        stream.input_finished()
        found = []
        while self.kws.is_ready(stream):
            self.kws.decode_stream(stream)
            # Fetch once before reset: wrappers that fetch separate fields may lose them.
            result = self.kws.keyword_spotter.get_result(stream)
            if result.keyword:
                found.append({"keyword": result.keyword.strip(), "tokens": list(result.tokens),
                              "resetRelativeTokenTimes": [round(float(t), 4) for t in result.timestamps],
                              "absoluteTimeAvailable": False})
                self.kws.reset_stream(stream)
        return found

    def speech(self, audio):
        h = np.zeros((2, 1, 64), np.float32)
        c = np.zeros_like(h)
        padded = np.pad(audio, (0, (512 - len(audio) % 512) % 512 + RATE))
        probs = []
        for offset in range(0, len(padded) - 511, 512):
            probability, h, c = self.vad.run(None, {"x": padded[offset:offset + 512].reshape(1, 512), "h": h, "c": c})
            probs.append(float(probability[0, 0]))
        active, start, quiet = False, None, None
        regions = []
        for i, probability in enumerate(probs):
            if not active and probability >= .5:
                active, start, quiet = True, i, None
            elif active:
                if probability >= .25:
                    quiet = None
                elif quiet is None:
                    quiet = i
                if quiet is not None and i - quiet >= 4:
                    if quiet - start >= 3:
                        regions.append([round(start * .032, 4), round(min(quiet * .032, len(audio) / RATE), 4)])
                    active, start, quiet = False, None, None
        return {"hopSeconds": .032, "probabilities": np.round(probs[:int(np.ceil(len(audio) / 512))], 4).tolist(), "regions": regions}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--prior-report", type=Path, required=True)
    args = parser.parse_args()
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    assert not (output / "acoustic-evidence.json").exists(), "Evidence already exists; preserve it and choose another output"
    keys = output / "analysis-keywords.txt"
    keys.write_text("\n".join(KEYWORDS.values()) + "\n", encoding="utf-8")
    models = Evidence(args.model_dir, keys)
    previous = json.loads(args.prior_report.read_text(encoding="utf-8"))
    old = {c["id"]: c for c in previous["clips"]}
    source_bytes = args.archive.read_bytes()
    with zipfile.ZipFile(io.BytesIO(source_bytes)) as archive:
        assert archive.testzip() is None
        source = json.loads(archive.read("dataset.json"))
        assert len(source["clips"]) == 80
        remaining_ids = {c["id"] for c in source["clips"]}
        removed = [c for c in previous["clips"] if c["id"] not in remaining_ids]
        added = [c for c in source["clips"] if c["id"] not in old]
        assert len(removed) == len(added) == 1 and removed[0]["name"] == "end_thanks_12" and added[0]["category"] == "end_thanks"
        assert all(c["sha256"] == old[c["id"]]["originalSha256"] for c in source["clips"] if c["id"] in old)
        rows, counts = [], Counter()
        for clip in source["clips"]:
            counts[clip["category"]] += 1
            raw = archive.read(clip["file"])
            assert sha(raw) == clip["sha256"]
            if clip["category"] not in KEYWORDS:
                continue
            audio = read_wav(raw)
            name = old[clip["id"]]["name"] if clip["id"] in old else "end_thanks_12"
            centered = audio - audio.mean()
            robust_peak = float(np.percentile(np.abs(centered), 99.9))
            gain_db = float(np.clip(-12 - 20 * np.log10(max(robust_peak, 1e-8)), -18, 36))
            gain_db = min(gain_db, -1 - 20 * np.log10(max(float(np.max(np.abs(centered))), 1e-8)))
            normalized = (centered * 10 ** (gain_db / 20)).astype(np.float32)
            row = {"id": clip["id"], "name": name, "category": clip["category"], "text": clip["text"],
                   "sourceOrdinal": counts[clip["category"]], "sourceSha256": sha(raw), "sourceFile": clip["file"],
                   "duration": len(audio) / RATE, "analysisGainDb": round(gain_db, 3),
                   "userConfirmed": clip["category"] == "wake_xiaomai" and int(name.rsplit("_", 1)[1]) in [1, 3, 6, 9, 10, 14, 15],
                   "replacesId": removed[0]["id"] if clip["id"] not in old else None,
                   "rawHits": models.anchors(audio), "normalizedHits": models.anchors(normalized),
                   "rawVad": models.speech(audio), "normalizedVad": models.speech(normalized),
                   "spectrum": spectral(audio)}
            rows.append(row)
            print(json.dumps({k: row[k] for k in ["name", "duration", "analysisGainDb", "rawHits", "normalizedHits"]}, ensure_ascii=False), flush=True)
            (output / "acoustic-progress.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    report = {"sourceArchive": str(args.archive), "sourceArchiveSha256": sha(source_bytes), "sourceManifest": source,
              "modelHashes": {name: sha((args.model_dir / name).read_bytes()) for name in ["encoder.onnx", "decoder.onnx", "joiner.onnx", "tokens.txt", "silero_vad.onnx"]},
              "sherpaOnnxVersion": sherpa_onnx.__version__, "onnxRuntimeVersion": ort.__version__,
              "cpuOnly": True, "trainingStarted": False, "priorReport": str(args.prior_report), "clips": rows}
    assert sha(args.archive.read_bytes()) == report["sourceArchiveSha256"]
    (output / "acoustic-evidence.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
