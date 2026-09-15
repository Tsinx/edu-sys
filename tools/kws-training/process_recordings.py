"""Conservative CPU-only signal QC. No ASR, model imports, or training."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import wave
import zipfile

import numpy as np

RATE = 16000
FRAME = 320
HOP = 160
MARGIN = 4000  # 250 ms on both sides of the energy-detected activity span.


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def db(value):
    return float(20 * np.log10(max(float(value), 1e-9)))


def decode(raw):
    with wave.open(io.BytesIO(raw), "rb") as audio:
        if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth(), audio.getcomptype()) != (RATE, 1, 2, "NONE"):
            raise ValueError("Expected 16 kHz mono PCM16 WAV; unexpected formats require separate review")
        frames = audio.getnframes()
        if frames < FRAME or frames > RATE * 60:
            raise ValueError("Unexpected audio duration")
        pcm = audio.readframes(frames)
        if len(pcm) != frames * 2:
            raise ValueError("Truncated WAV")
    return np.frombuffer(pcm, dtype="<i2").astype(np.float64) / 32768, digest(pcm)


def encode(samples):
    raw = np.rint(np.clip(samples, -1, 32767 / 32768) * 32768).astype("<i2").tobytes()
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setframerate(RATE)
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.writeframes(raw)
    return output.getvalue()


def measure(samples):
    centered = samples - samples.mean()
    frame_samples = np.lib.stride_tricks.sliding_window_view(centered, FRAME)[::HOP]
    power = np.mean(frame_samples ** 2, axis=1)
    frame_db = 10 * np.log10(np.maximum(power, 1e-18))
    floor = float(np.percentile(frame_db, 20))
    threshold = max(floor + 10, -55)
    active = np.flatnonzero(frame_db > threshold)
    start = int(active[0] * HOP) if len(active) else None
    end = int(active[-1] * HOP + FRAME) if len(active) else None
    active_db = 10 * float(np.log10(max(float(np.mean(power[active])), 1e-18))) if len(active) else None
    return {
        "duration": round(len(samples) / RATE, 4),
        "rmsDbfs": round(db(np.sqrt(np.mean(samples ** 2))), 2),
        "peakDbfs": round(db(np.max(np.abs(samples))), 2),
        "clippedSamples": int(np.count_nonzero(np.abs(samples) >= 32760 / 32768)),
        "dcOffset": float(samples.mean()),
        "noiseFloorProxyDbfs": round(floor, 2),
        "activityThresholdDbfs": round(threshold, 2),
        "activeRmsDbfs": round(active_db, 2) if active_db is not None else None,
        "activityContrastDb": round(active_db - floor, 2) if active_db is not None else None,
        "activeSeconds": round(len(active) * HOP / RATE, 4),
        "activityStartSample": start,
        "activityEndSample": end,
    }


def process(samples):
    before = measure(samples)
    start, end = before["activityStartSample"], before["activityEndSample"]
    flags = []
    if start is None or before["activeSeconds"] < .20:
        flags.append("有效声音过少，请复听或重录")
        # Keep uncertain recordings unchanged rather than guessing their content.
        left, right = 0, len(samples)
        gain_db = 0
        result = samples.copy()
    else:
        left, right = max(0, start - MARGIN), min(len(samples), end + MARGIN)
        # Do not cut tiny fragments merely to obtain a uniform duration.
        if left < RATE * .15:
            left = 0
        if len(samples) - right < RATE * .15:
            right = len(samples)
        if start < RATE * .15:
            flags.append("开头较早出现声音，复听确认是词语还是操作声")
        if len(samples) - end < RATE * .15:
            flags.append("结尾较近仍有声音，复听确认尾字完整")
        if before["activityContrastDb"] < 15:
            flags.append("声音与背景能量差较小，建议复听清晰度")
        if before["activeRmsDbfs"] < -40:
            flags.append("有效声音偏轻，建议复听清晰度")
        result = samples[left:right] - samples.mean()
        # Target active-region RMS -26 dBFS, gain capped at +12 dB; peak <= -3 dBFS.
        # A single constant gain preserves dynamics and background/speech ratio.
        desired = -26 - before["activeRmsDbfs"]
        headroom = -3 - db(np.max(np.abs(result)))
        gain_db = min(12, desired, headroom)
        result *= 10 ** (gain_db / 20)
        # Only soften edges when they were actually cut in the quiet margin.
        fade = 80
        if left > 0:
            result[:fade] *= np.linspace(0, 1, fade)
        if right < len(samples):
            result[-fade:] *= np.linspace(1, 0, fade)
    if before["clippedSamples"]:
        flags.append("原始音频存在近满幅样本，处理不能修复已发生的削波")
    actions = {"trimStartSeconds": round(left / RATE, 4), "trimEndSeconds": round((len(samples) - right) / RATE, 4),
               "retainedStartSample": left, "retainedEndSample": right, "gainDb": round(gain_db, 3),
               "dcRemoved": float(samples.mean()) if start is not None and before["activeSeconds"] >= .20 else 0,
               "edgeFadeMs": 5 if left > 0 or right < len(samples) else 0}
    return result, before, actions, flags


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    archive_hash = digest(args.archive.read_bytes())
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        raise ValueError("Output directory must be empty; choose a new directory to preserve earlier results")
    rows, clips, hashes = [], [], defaultdict(list)
    with zipfile.ZipFile(args.archive) as archive:
        entries = archive.infolist()
        if len(entries) > 1000 or sum(e.file_size for e in entries) > 256_000_000:
            raise ValueError("Archive exceeds this collector's expected size")
        names = [e.filename for e in entries]
        if len(names) != len(set(names)):
            raise ValueError("Archive contains duplicate entry names")
        for name in names:
            if PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts or "\\" in name or ":" in name:
                raise ValueError("Unsafe archive path")
        if archive.testzip() is not None:
            raise ValueError("ZIP checksum error")
        source = json.loads(archive.read("dataset.json"))
        if set(source["phrases"]) not in ({"wake", "end"}, {"wake", "end", "wake_xiaomai", "end_thanks"}):
            raise ValueError("Unexpected categories")
        filenames = [c["file"] for c in source["clips"]]
        if len(filenames) != len(set(filenames)) or set(filenames) != {n for n in names if n.lower().endswith(".wav")}:
            raise ValueError("Manifest and WAV file list differ")
        counts = Counter()
        ids = set()
        for clip in source["clips"]:
            group = clip["category"]
            if group not in source["phrases"] or clip["text"] != source["phrases"][group] or not re.fullmatch(r"[a-f0-9]{32}", clip["id"]) or clip["id"] in ids:
                raise ValueError("Unexpected or conflicting clip identity/label")
            ids.add(clip["id"])
            raw = archive.read(clip["file"])
            if digest(raw) != clip["sha256"]:
                raise ValueError(f"Source hash mismatch: {clip['file']}")
            samples, pcm_hash = decode(raw)
            counts[group] += 1
            name = f"{group}_{counts[group]:02d}"
            hashes[pcm_hash].append(name)
            result, before, actions, flags = process(samples)
            processed_raw = encode(result)
            restored, _ = decode(processed_raw)
            after = measure(restored)
            if after["clippedSamples"] or np.max(np.abs(restored)) > 10 ** (-3 / 20) + 1 / 32768:
                raise ValueError(f"Unexpected output clipping or headroom violation: {name}")
            if len(restored) != actions["retainedEndSample"] - actions["retainedStartSample"]:
                raise ValueError("Output sample count mismatch")
            if before["activityStartSample"] is not None:
                assert actions["retainedStartSample"] <= before["activityStartSample"]
                assert actions["retainedEndSample"] >= before["activityEndSample"]
            original_path, processed_path = f"originals/{name}.wav", f"processed/{group}/{name}.wav"
            for relative, payload in ((original_path, raw), (processed_path, processed_raw)):
                destination = output / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(payload)
            rows.append({"name": name, "id": clip["id"], "category": group, "text": clip["text"],
                         "originalFile": original_path, "processedFile": processed_path,
                         "originalSha256": digest(raw), "processedSha256": digest(processed_raw),
                         "before": before, "after": after, "processing": actions, "reviewNotes": flags,
                         "labelVerifiedByAsrOrListening": False})
            clips.append({"id": clip["id"], "category": group, "text": clip["text"],
                          "file": processed_path, "duration": after["duration"], "sampleRate": RATE, "channels": 1,
                          "sampleWidth": 2, "sha256": digest(processed_raw), "sourceSha256": digest(raw),
                          "createdAt": clip.get("createdAt"), "processing": actions})
    duplicate_groups = [items for items in hashes.values() if len(items) > 1]
    for row in rows:
        if any(row["name"] in items for items in duplicate_groups):
            row["reviewNotes"].append("存在完全相同的 PCM 录音，训练前去重")
    report = {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
              "sourceArchive": str(args.archive.resolve()), "sourceArchiveSha256": archive_hash,
              "sourceDatasetId": source["id"], "counts": dict(counts), "phrases": source["phrases"],
              "totalDurationBefore": round(sum(r["before"]["duration"] for r in rows), 3),
              "totalDurationAfter": round(sum(r["after"]["duration"] for r in rows), 3),
              "sourceClippedSamples": sum(r["before"]["clippedSamples"] for r in rows),
              "outputClippedSamples": sum(r["after"]["clippedSamples"] for r in rows),
              "exactPcmDuplicateGroups": duplicate_groups,
              "reviewNames": [r["name"] for r in rows if r["reviewNotes"]],
              "labelVerification": "Manifest labels only; no ASR, keyword model or human listening performed",
              "method": "Energy heuristic: 20 ms frames / 10 ms hop, threshold max(20th percentile + 10 dB, -55 dBFS); 250 ms margins. Not semantic VAD. Remove DC; constant gain toward active RMS -26 dBFS, capped +12 dB / peak -3 dBFS; 5 ms fades only at trimmed edges. No denoising, resampling, internal cuts, speed changes or augmentation.",
              "noiseMetricCaveat": "20th percentile frame energy is a background proxy; contrast is not measured SNR and does not certify speech intelligibility.",
              "trainingStarted": False, "gpuUsed": False, "clips": rows}
    write_json(output / "quality-report.json", report)
    write_json(output / "source-manifest.json", source)
    dataset = {"schemaVersion": 1, "id": source["id"] + "-processed-v1", "sourceDatasetId": source["id"],
               "phrases": source["phrases"], "target": source["target"], "clips": clips,
               "trainingReady": False, "note": "Derived data; original recordings must remain in the same eventual dataset split. Labels and boundaries still require listening review."}
    write_json(output / "dataset.json", dataset)
    with (output / "quality-report.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["编号", "词语", "原始秒", "处理后秒", "原始RMS_dBFS", "处理后RMS_dBFS", "原始活动RMS_dBFS", "处理后活动RMS_dBFS", "增益_dB", "裁去开头秒", "裁去结尾秒", "复听提示"])
        for row in rows:
            b, a, p = row["before"], row["after"], row["processing"]
            writer.writerow([row["name"], row["text"], b["duration"], a["duration"], b["rmsDbfs"], a["rmsDbfs"], b["activeRmsDbfs"], a["activeRmsDbfs"], p["gainDb"], p["trimStartSeconds"], p["trimEndSeconds"], "；".join(row["reviewNotes"])])
    (output / "recordings.jsonl").write_text("".join(json.dumps({"audio_filepath": c["file"], "text": c["text"], "category": c["category"], "duration": c["duration"], "id": c["id"]}, ensure_ascii=False) + "\n" for c in clips), encoding="utf-8")
    phrase_counts = "，".join(f"「{phrase}」{counts[group]} 条" for group, phrase in source["phrases"].items())
    readme = f"""# 关键词录音基本检查与处理

{phrase_counts}。
原始总时长 {report['totalDurationBefore']:.2f} 秒；处理后 {report['totalDurationAfter']:.2f} 秒。
原始 / 处理后近满幅样本数：{report['sourceClippedSamples']} / {report['outputClippedSamples']}。
完全相同的 PCM 重复组：{len(duplicate_groups)}。

处理方式：保持 16 kHz 单声道 PCM16；减去直流偏置，基于短时能量定位声音范围，首尾保留 250 ms，句内不裁剪。
使用整条固定增益向活动段 RMS -26 dBFS 调整，最多提高 12 dB，峰值不超过 -3 dBFS。只对新裁切的边缘做 5 ms 淡入淡出。
没有做强降噪、均衡、变速或数据增强。提升音量也会等比例提升背景声音，不代表信噪比改善。

需要优先复听的编号：{', '.join(report['reviewNames']) or '无自动标记'}。
标记只是能量规则提示，可能包括操作声；不等于录音不合格。没有自动删除任何一条。
请在 index.html 对比原始与处理后声音，尤其确认轻声辅音、开头和结尾完整。

本次只做信号检查，未通过 ASR、关键词模型或人工试听核实标签。背景能量估计不是严格 SNR。
这 {len(rows)} 条为个人关键词正样本，尚未创建训练/验证划分，也不是完整训练数据。
原音与处理版属于同一源样本，不应当作两条独立录音跨训练/验证集使用。
未启动训练，未调用 GPU。源 ZIP 未修改；source-manifest.json 保留原始标签及校验值。

processed/ 为处理后音频；dataset.json / recordings.jsonl 是索引；quality-report.csv / .json 是逐条检查和处理记录。
此 ZIP 仅打包 {len(rows)} 条处理版和报告；对照网页及 originals/ 保留在项目输出目录。
"""
    (output / "README.md").write_text(readme, encoding="utf-8")
    template = Path(__file__).with_name("review_template.html").read_text(encoding="utf-8")
    (output / "index.html").write_text(template.replace("__REPORT_DATA__", json.dumps(report, ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")
    bundle_path = output / "kws-recordings-processed.zip"
    with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as bundle:
        for clip in clips:
            bundle.write(output / clip["file"], clip["file"])
        for filename in ("dataset.json", "source-manifest.json", "quality-report.json", "quality-report.csv", "recordings.jsonl", "README.md"):
            bundle.write(output / filename, filename)
    with zipfile.ZipFile(bundle_path) as bundle:
        assert bundle.testzip() is None
        assert sum(n.endswith(".wav") for n in bundle.namelist()) == len(rows)
        for clip in clips:
            assert digest(bundle.read(clip["file"])) == clip["sha256"]
    assert digest(args.archive.read_bytes()) == archive_hash
    print(json.dumps({k: v for k, v in report.items() if k not in ("clips", "method", "noiseMetricCaveat")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
