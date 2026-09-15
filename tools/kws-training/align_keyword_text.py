"""Reference-constrained RNN-T Viterbi alignment on the existing base checkpoint.

Unlike online KWS timestamps, this uses the full utterance encoder clock.
It locates a supplied transcript; it is not independent transcript verification.
CPU-only. No optimizer or changes to the inference models.
"""
import argparse
import json
import os
from pathlib import Path
import zipfile

os.environ["CUDA_VISIBLE_DEVICES"] = ""
import numpy as np
import torch

from personalize_common import feature_extractor, load_model, token_ids, TOKENS, PRETRAINED
from analyze_keyword_regions import read_wav, sha


def viterbi(logp, labels):
    frames, contexts, _ = logp.shape
    assert contexts == len(labels) + 1
    dp = np.full((frames + 1, contexts), -np.inf)
    move = np.zeros_like(dp, dtype=np.uint8)
    dp[0, 0] = 0
    # Standard transducer lattice: emit label at this frame or advance with blank.
    for t in range(frames):
        for u in range(contexts):
            if u < len(labels):
                score = dp[t, u] + logp[t, u, labels[u]]
                if score > dp[t, u + 1]:
                    dp[t, u + 1], move[t, u + 1] = score, 2
            score = dp[t, u] + logp[t, u, 0]
            if score > dp[t + 1, u]:
                dp[t + 1, u], move[t + 1, u] = score, 1
    t, u = frames, len(labels)
    token_frames = []
    while t or u:
        if move[t, u] == 2:
            token_frames.append((t, u - 1, float(np.exp(logp[t, u - 1, labels[u - 1]]))))
            u -= 1
        else:
            assert move[t, u] == 1
            t -= 1
    return list(reversed(token_frames)), float(dp[-1, -1])


@torch.inference_mode()
def align(model, extractor, audio, labels, speech_bounds):
    padding = 16000
    samples = np.pad(audio, (padding, padding))
    features = extractor(torch.from_numpy(samples.copy())).unsqueeze(0)
    encoded, lengths = model.forward_encoder(features, torch.tensor([features.shape[1]], dtype=torch.int64))
    decoded = model.decoder(torch.tensor([[0] + labels], dtype=torch.int64))
    logits = model.joiner(encoded.unsqueeze(2), decoded.unsqueeze(1))
    logp = logits[0, :int(lengths[0])].log_softmax(-1).numpy()
    frame_times = np.arange(len(logp)) * .04 - 1
    outside = (frame_times < speech_bounds[0]) | (frame_times > speech_bounds[1])
    for u, label in enumerate(labels):
        logp[outside, u, label] = -np.inf
    token_frames, score = viterbi(logp, labels)
    # This pinned encoder subsamples 10ms input frames by four.
    assert abs(features.shape[1] / int(lengths[0]) - 4) < .3
    times = [round(t * .04 - 1, 4) for t, _, _ in token_frames]
    return {"times": times, "tokenProbabilities": [round(p, 5) for _, _, p in token_frames],
            "pathLogProbability": round(score, 3), "frameSeconds": .04,
            "referenceConstrained": True, "independentTranscriptVerification": False,
            "allowedEmissionBounds": [round(v, 4) for v in speech_bounds]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("evidence", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = json.loads(args.evidence.read_text(encoding="utf-8"))
    destination = args.output or args.evidence.with_name("text-alignment.json")
    assert not destination.exists()
    model, extractor = load_model(device="cpu"), feature_extractor()
    rows = []
    with zipfile.ZipFile(report["sourceArchive"]) as archive:
        for row in report["clips"]:
            raw = archive.read(row["sourceFile"])
            assert sha(raw) == row["sourceSha256"]
            audio = read_wav(raw)
            normalized = ((audio - audio.mean()) * 10 ** (row["analysisGainDb"] / 20)).astype(np.float32)
            labels = token_ids(row["text"])
            assert len(labels) == len(row["text"]) * 2
            # Exclude only artificial padding. VAD can miss quiet fricative words
            # and must not force the transcript into an unrelated click/noise burst.
            bounds = (0, row["duration"])
            original = align(model, extractor, audio, labels, bounds)
            adjusted = align(model, extractor, normalized, labels, bounds)
            difference = max(abs(a - b) for a, b in zip(original["times"], adjusted["times"]))
            result = {"id": row["id"], "name": row["name"], "text": row["text"],
                      "tokens": [TOKENS[i] for i in labels], "raw": original, "normalized": adjusted,
                      "maxTokenShiftSeconds": round(difference, 4)}
            rows.append(result)
            print(json.dumps({"name": row["name"], "times": adjusted["times"], "minimumTokenP": min(adjusted["tokenProbabilities"]), "gainStabilitySeconds": difference}, ensure_ascii=False), flush=True)
    result = {"method": "Full-utterance reference-constrained RNN-T Viterbi; 40ms encoder clock; not forced equal durations or peak counts", "checkpoint": str(PRETRAINED / "exp/pretrained.pt"),
              "checkpointSha256": sha((PRETRAINED / "exp/pretrained.pt").read_bytes()), "sourceArchiveSha256": report["sourceArchiveSha256"], "clips": rows}
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
