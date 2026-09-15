"""Build conservative whole-phrase crops from reference alignment and spectrum.

Never cut inside a phrase. Neural VAD is supporting evidence, not a hard gate.
Reuse the previous forty original-command results by hash; preserve stable names.
"""
import argparse
from collections import Counter
import csv
import json
from pathlib import Path
import zipfile

import numpy as np
from scipy.ndimage import median_filter

from process_recordings import RATE, decode, encode, measure, digest


def runs(mask):
    edges = np.diff(np.pad(np.asarray(mask, dtype=np.int8), (1, 1)))
    return list(zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)))


def focus_region(row, alignment):
    times = np.asarray(row["spectrum"]["times"])
    energy = np.asarray(row["spectrum"]["energyDb"])
    anchors = np.median([alignment["raw"]["times"], alignment["normalized"]["times"]], axis=0)
    assert len(anchors) == 2 * len(row["text"]) and np.all(np.diff(anchors) >= 0)
    assert 0 <= anchors[0] <= anchors[-1] <= row["duration"]
    local = (times >= anchors[0] - .25) & (times <= anchors[-1] + .25)
    threshold = max(float(np.percentile(energy[local], 95)) - 32, float(np.percentile(energy, 15)) + 8)
    active = median_filter((energy > threshold).astype(np.uint8), size=3, mode="nearest").astype(bool)
    components = [(max(0, a * .01 - .0125), min(row["duration"], b * .01 + .0125))
                  for a, b in runs(active) if b - a >= 3]
    first = [(a, b) for a, b in components if a <= anchors[0] + .08 and b >= anchors[0] - .08]
    last = [(a, b) for a, b in components if a <= anchors[-1] + .12 and b >= anchors[-1] - .08]
    start = min([a for a, _ in first] + [float(anchors[0] - .16)])
    end = max([b for _, b in last] + [float(anchors[-1] + .12)])
    # Keep weak fricatives immediately adjoining the first/last matched phone.
    start = max(0, min(start, anchors[0] - .08))
    end = min(row["duration"], max(end, anchors[-1] + .08))
    probabilities = np.asarray(alignment["normalized"]["tokenProbabilities"])
    unreliable_split = bool(np.max(np.diff(anchors)) > .8 and probabilities.min() < .1)
    uncertain = bool(probabilities.min() < .02 or alignment["maxTokenShiftSeconds"] > .12 or unreliable_split)
    if uncertain:
        related = [(a, b) for a, b in row["rawVad"]["regions"] + row["normalizedVad"]["regions"]
                   if b >= anchors[0] and a <= anchors[-1] + .2]
        if related:
            start = min(start, min(a for a, _ in related))
            end = max(end, max(b for _, b in related))
    boundaries = [start]
    for i in range(1, len(row["text"])):
        lo, hi = float(anchors[2 * i - 1]), float(anchors[2 * i])
        candidates = np.flatnonzero((times >= lo) & (times <= hi))
        midpoint = (lo + hi) / 2
        if len(candidates) > 1:
            # Prefer a low-energy transition between adjacent phone anchors.
            costs = energy[candidates] + np.abs(times[candidates] - midpoint) * 8
            boundary = float(times[candidates[np.argmin(costs)]])
        else:
            boundary = midpoint
        boundaries.append(max(boundaries[-1] + .005, boundary))
    boundaries.append(end)
    chars = []
    power = 10 ** (energy / 10)
    for i, char in enumerate(row["text"]):
        a, b = boundaries[i:i + 2]
        ix = np.flatnonzero((times >= a) & (times <= b))
        weights = power[ix]
        cumulative = np.cumsum(weights) / max(float(weights.sum()), 1e-20)
        core = [float(times[ix[min(int(np.searchsorted(cumulative, q)), len(ix) - 1)]]) for q in (.1, .9)]
        center = float(np.average(times[ix], weights=np.maximum(weights, 1e-20)))
        chars.append({"character": char, "index": i + 1, "estimatedStart": round(a, 4), "estimatedEnd": round(b, 4),
                      "central80PercentEnergy": [round(v, 4) for v in core], "energyCenter": round(center, 4),
                      "phonemeAnchors": anchors[2 * i:2 * i + 2].round(4).tolist(),
                      "modelTokenProbabilities": probabilities[2 * i:2 * i + 2].round(5).tolist()})
    # Do not present an implausible allocation of a word to a noise burst as a
    # valid character boundary. The whole audio remains available for training.
    if unreliable_split:
        chars = []
    padding = .30 if uncertain else .20
    left = max(0, int(np.floor((start - padding) * RATE)))
    right = min(round(row["duration"] * RATE), int(np.ceil((end + padding) * RATE)))
    overlap = any(b > start and a < end for a, b in row["normalizedVad"]["regions"])
    return {"start": round(start, 4), "end": round(end, 4), "leftSample": left, "rightSample": right,
            "paddingSeconds": padding, "energyThresholdDb": round(threshold, 2), "characters": chars,
            "alignmentUncertain": uncertain, "characterSplitUnavailable": unreliable_split, "normalizedVadOverlaps": overlap,
            "tokenGainStabilitySeconds": alignment["maxTokenShiftSeconds"]}


def process_audio(audio, region):
    left, right = region["leftSample"], region["rightSample"]
    result = audio[left:right] - audio.mean()
    a = max(0, int(region["start"] * RATE) - left)
    b = min(len(result), int(region["end"] * RATE) - left)
    rms_db = 20 * np.log10(max(float(np.sqrt(np.mean(result[a:b] ** 2))), 1e-9))
    gain = min(24, -26 - rms_db, -3 - 20 * np.log10(max(float(np.max(np.abs(result))), 1e-9)))
    result *= 10 ** (gain / 20)
    if left:
        result[:80] *= np.linspace(0, 1, 80)
    if right < len(audio):
        result[-80:] *= np.linspace(1, 0, 80)
    return result, float(gain)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--prior-directory", type=Path, required=True)
    args = parser.parse_args()
    output = args.directory
    evidence = json.loads((output / "acoustic-evidence.json").read_text(encoding="utf-8"))
    alignment = json.loads((output / "text-alignment-final.json").read_text(encoding="utf-8"))
    previous = json.loads((args.prior_directory / "quality-report.json").read_text(encoding="utf-8"))
    assert evidence["sourceArchiveSha256"] == alignment["sourceArchiveSha256"] == digest(args.archive.read_bytes())
    by_id = {r["id"]: r for r in evidence["clips"]}
    aligned = {r["id"]: r for r in alignment["clips"]}
    old = {r["id"]: r for r in previous["clips"]}
    rows, clips = [], []
    with zipfile.ZipFile(args.archive) as archive:
        source = json.loads(archive.read("dataset.json"))
        for clip in source["clips"]:
            raw = archive.read(clip["file"])
            assert digest(raw) == clip["sha256"]
            audio, _ = decode(raw)
            if clip["id"] in by_id:
                info = by_id[clip["id"]]
                name = info["name"]
                region = focus_region(info, aligned[clip["id"]])
                result, gain = process_audio(audio, region)
                processed = encode(result)
                row = {"name": name, "id": clip["id"], "category": clip["category"], "text": clip["text"],
                       "sourceOrdinal": info["sourceOrdinal"], "replacesId": info["replacesId"],
                       "userConfirmed": info["userConfirmed"], "region": region, "alignment": aligned[clip["id"]],
                       "rawVad": info["rawVad"], "normalizedVad": info["normalizedVad"], "spectrum": info["spectrum"],
                       "before": measure(audio), "processing": {"retainedStartSample": region["leftSample"], "retainedEndSample": region["rightSample"],
                       "trimStartSeconds": region["leftSample"] / RATE, "trimEndSeconds": (len(audio) - region["rightSample"]) / RATE, "gainDb": round(gain, 3)},
                       "reviewNotes": ["无法可靠分配逐字边界，未提供逐字标签；保留完整主体与更宽余量"] if region["characterSplitUnavailable"] else ["逐字界限仅供参考；采用较宽边界保留语音"] if region["alignmentUncertain"] else []}
                # A compact waveform for the report; original amplitude remains in WAV.
                step = max(1, len(audio) // 800)
                row["waveform"] = [float(np.max(np.abs(audio[i:i + step]))) for i in range(0, len(audio), step)]
            else:
                prior = old[clip["id"]]
                assert digest(raw) == prior["originalSha256"]
                processed = (args.prior_directory / prior["processedFile"]).read_bytes()
                assert digest(processed) == prior["processedSha256"]
                name = prior["name"]
                row = {**prior, "reusedPriorProcessing": True}
            row.update(originalFile=f"originals/{name}.wav", processedFile=f"processed/{clip['category']}/{name}.wav", originalSha256=digest(raw), processedSha256=digest(processed))
            after, _ = decode(processed)
            row["after"] = measure(after)
            assert row["after"]["clippedSamples"] == 0
            assert np.max(np.abs(after)) <= 10 ** (-3 / 20) + 1 / 32768
            for relative, payload in [(row["originalFile"], raw), (row["processedFile"], processed)]:
                path = output / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(payload)
            rows.append(row)
            clips.append({**clip, "file": row["processedFile"], "sha256": row["processedSha256"], "sourceSha256": clip["sha256"],
                          "duration": row["after"]["duration"], "stableName": name, "processing": row["processing"]})
    rows.sort(key=lambda r: (list(source["phrases"]).index(r["category"]), r["name"]))
    report = {"sourceArchive": str(args.archive.resolve()), "sourceArchiveSha256": evidence["sourceArchiveSha256"], "phrases": source["phrases"],
              "counts": dict(Counter(c["category"] for c in clips)), "totalDurationBefore": round(sum(r["before"]["duration"] for r in rows), 3),
              "totalDurationAfter": round(sum(r["after"]["duration"] for r in rows), 3), "sourceClippedSamples": sum(r["before"]["clippedSamples"] for r in rows),
              "outputClippedSamples": 0, "trainingStarted": False, "gpuUsed": False, "clips": rows,
              "reviewNames": [r["name"] for r in rows if r.get("region", {}).get("alignmentUncertain")],
              "note": "Reference-constrained alignment plus spectral energy estimates, not independent ASR or sample-accurate character boundaries. Online KWS reset-relative timestamps are not used to crop."}
    dataset = {**source, "id": source["id"] + "-focused-v1", "sourceDatasetId": source["id"], "clips": clips, "trainingReady": False}
    for filename, data in [("quality-report.json", report), ("dataset.json", dataset), ("source-manifest.json", source)]:
        (output / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (output / "character-regions.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["稳定编号", "原包组内序号", "词语", "字序", "字", "估计开始秒", "估计结束秒", "能量中心秒", "主要80%能量开始秒", "主要80%能量结束秒", "字界估计不稳", "用户已复听确认"])
        for row in rows:
            if "region" in row:
                for char in row["region"]["characters"]:
                    writer.writerow([row["name"], row["sourceOrdinal"], row["text"], char["index"], char["character"], char["estimatedStart"], char["estimatedEnd"], char["energyCenter"], *char["central80PercentEnergy"], row["region"]["alignmentUncertain"], row["userConfirmed"]])
    (output / "recordings.jsonl").write_text("".join(json.dumps({"audio_filepath": c["file"], "text": c["text"], "category": c["category"], "id": c["id"], "duration": c["duration"]}, ensure_ascii=False) + "\n" for c in clips), encoding="utf-8")
    readme = f"""# 录音精细定位与处理

实际输入：{args.archive.resolve()}。该文件只替换了此前“谢谢”第 12 条，其余 79 条原音校验值一致。
新导出中重录样本排在“谢谢”第 20 条；此交付保留稳定编号 end_thanks_12，后续文件仍可按此前编号核对。

共 80 条，四组各 20 条。前两组 40 条沿用此前处理结果；新增两组 40 条采用频谱与文本约束音素对齐定位。
原始 {report['totalDurationBefore']:.3f} 秒，处理后 {report['totalDurationAfter']:.3f} 秒。全部原音保留；不删条目、不裁句中、不做变速或强降噪。

## 方法与边界

- 25 ms 短时傅里叶分析，每 10 ms 更新，分别查看 100–800、800–2500、2500–7500 Hz 的能量、谱平坦度与频谱重心。
- 已安装的 Silero VAD v4（16 kHz）分别分析原音与调整增益的副本，作为旁证。VAD 可能漏检轻声与清辅音，不作为硬裁剪开关。
- 已有通用 Zipformer 检查点按给定“小麦老师／谢谢”文本进行 RNN-T Viterbi 对齐，使用完整音频的 40 ms 编码器时钟。比较原音和调整增益后的时间点。
- 先获得音素时间锚点，再在相邻锚点之间参考能量低谷估计字界，并计算每字区域内的能量中心和中央 80% 能量范围。不会为凑 4 个或 2 个峰而均分时长。
- 字界是带文本先验的估计，不能据此证明词语内容被独立识别正确；40 ms 是模型步长，不是误差上限。字界不稳的录音采用更宽边界，仍全部保留。
- 输出保留整句，首尾各加 200 ms 余量；不稳时加 300 ms。去直流偏置，整条固定增益向主体 RMS -26 dBFS 调整，最高 +24 dB，峰值限制 -3 dBFS，裁切边缘 5 ms 淡入淡出。调整增益不等于改善信噪比。
- 在线 KWS 的时间戳会在长空白后重置，本报告没有把这些相对时间用于裁剪。

## 用户确认

小麦老师 01、03、06、09、10、14、15：用户已明确复听确认无误，记录为通过；之前尾部能量提示不再作为录音错误。
谢谢 12：替换为新录音。其标识为 {next(c['id'] for c in clips if c['stableName']=='end_thanks_12')}。

字界估计不稳的样本：{', '.join(report['reviewNames']) or '无'}。这里评估的是定位精度，不是要求重录。

## 文件

index.html：交互式波形、频谱、逐字标注与原音／处理版试听。
character-regions.csv：{sum(len(r.get('region', {}).get('characters', [])) for r in rows)} 个字的候选区间与能量中心；无法可靠定位的条目不强制填写字界。quality-report.json：逐条信号与处理参数。
dataset.json / recordings.jsonl：80 条处理录音索引。originals/：原始 80 条。processed/：处理后 80 条。

未启动训练、未修改前端识别模型。原音及其处理版必须归入同一训练／验证数据划分。

方法来源：[sherpa-onnx KWS API](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.7/sherpa-onnx/python/sherpa_onnx/keyword_spotter.py)、[Silero VAD 实现](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.7/sherpa-onnx/csrc/silero-vad-model.cc)、[icefall 训练方法](https://github.com/k2-fsa/icefall/tree/3f848bb6d0acc970c9b294a30ca0a04a7c9c78d1/egs/wenetspeech/KWS/zipformer)。
"""
    (output / "README.md").write_text(readme, encoding="utf-8")
    template = Path(__file__).with_name("keyword_focus_template.html").read_text(encoding="utf-8")
    (output / "index.html").write_text(template.replace("__REPORT_DATA__", json.dumps(report, ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")
    with zipfile.ZipFile(output / "kws-recordings-focused.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
        for clip in clips:
            bundle.write(output / clip["file"], clip["file"])
        for file in ["dataset.json", "source-manifest.json", "recordings.jsonl", "quality-report.json", "character-regions.csv", "README.md", "text-alignment-final.json", "FINE_TUNING_NOTES.md"]:
            bundle.write(output / file, file)
    assert digest(args.archive.read_bytes()) == evidence["sourceArchiveSha256"]
    print(json.dumps({k: v for k, v in report.items() if k not in ["clips", "note"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
