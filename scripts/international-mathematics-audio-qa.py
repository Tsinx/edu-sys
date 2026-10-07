"""Independent waveform and unprompted ASR checks for the English course.

The script never prints or writes the API key or Base64 request payload.
It does not regenerate audio. ASR checks intelligibility/text correspondence;
they do not establish accent quality, naturalness, or human listening approval.
"""
from __future__ import annotations
import argparse
import base64
import concurrent.futures
import difflib
import hashlib
import json
import math
import os
import re
import time
import unicodedata
import urllib.error
import urllib.request
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "teacher-web" / "public"
QA = ROOT / "output" / "international-mathematics" / "qa"
TRANSCRIPTS = QA / "audio-asr-transcripts"
ASR_MODEL = "qwen3-asr-flash-2026-02-10"
ASR_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DOCS = "https://help.aliyun.com/en/model-studio/qwen-asr-api-reference"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def spell_number(value):
    small = ["zero","one","two","three","four","five","six","seven","eight","nine",
             "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
             "seventeen","eighteen","nineteen"]
    tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]
    n = int(value)
    if n < 20:
        return small[n]
    if n < 100:
        return tens[n//10] + (" "+small[n%10] if n%10 else "")
    if n < 1000:
        return small[n//100]+" hundred"+(" "+spell_number(str(n%100)) if n%100 else "")
    return value


def tokens(text):
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("’", "'")
    # Orthographic aliases only; no semantic substitutions.
    for old, new in [("litres", "liters"), ("litre", "liter"),
                     ("colourful", "colorful"), ("coloured", "colored"),
                     ("labour", "labor"), ("labelled", "labeled")]:
        text = text.replace(old, new)
    text = text.replace("%", " percent ")
    text = re.sub(r"\b[0-9]+\b",lambda match:spell_number(match.group()),text)
    return re.findall(r"[a-z0-9]+", text)


def alignment(expected, actual):
    a, b = tokens(expected), tokens(actual)
    rows = [[0] * (len(b)+1) for _ in range(len(a)+1)]
    for i in range(len(a)+1):
        rows[i][0] = i
    for j in range(len(b)+1):
        rows[0][j] = j
    for i, x in enumerate(a, 1):
        for j, y in enumerate(b, 1):
            rows[i][j] = min(rows[i-1][j]+1, rows[i][j-1]+1, rows[i-1][j-1]+(x != y))
    ops = [{"operation": op, "expected": " ".join(a[i:j]), "recognized": " ".join(b[k:l])}
           for op, i, j, k, l in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes() if op != "equal"]
    return {"expectedWords": len(a), "recognizedWords": len(b),
            "editDistance": rows[-1][-1], "wordErrorRate": rows[-1][-1]/max(1,len(a)),
            "differences": ops, "exactAfterOrthographicNormalization": a == b}


def read_audio(path):
    with wave.open(str(path), "rb") as f:
        spec = {"sampleRate": f.getframerate(), "channels": f.getnchannels(),
                "sampleWidth": f.getsampwidth(), "frames": f.getnframes()}
        if spec["sampleWidth"] != 2:
            raise ValueError("Expected PCM16 WAV")
        pcm = f.readframes(f.getnframes())
    return spec, pcm


def waveform(path):
    spec, pcm = read_audio(path)
    a = np.frombuffer(pcm, dtype="<i2").astype(np.float64) / 32768
    rate = spec["sampleRate"] * spec["channels"]
    frame = max(1, round(rate * .02))
    padded = np.pad(a, (0, (-len(a)) % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1,frame)**2, axis=1))
    # -45 dBFS is a reproducible activity threshold, not a perceptual VAD.
    active = np.flatnonzero(rms > 10**(-45/20))
    first = float(active[0]*20) if len(active) else len(a)/rate*1000
    end = float(min(len(a)/rate*1000,(active[-1]+1)*20)) if len(active) else 0
    gap = 0
    run = 0
    if len(active):
        for value in rms[active[0]:active[-1]+1]:
            run = run + 1 if value <= 10**(-45/20) else 0
            gap = max(gap,run)
    peak = float(np.max(np.abs(a)))
    return {**spec, "sha256":sha(path.read_bytes()), "durationMs":len(a)/rate*1000,
            "peak":peak, "peakDbfs":20*math.log10(max(peak,1e-12)),
            "rms":float(np.sqrt(np.mean(a*a))),
            "clippedSamples":int(np.count_nonzero(np.abs(a) >= .999)),
            "activityThresholdDbfs":-45, "detectedLeadingSilenceMs":first,
            "detectedTrailingSilenceMs":len(a)/rate*1000-end,
            "activeSpanMs":max(0,end-first), "longestInnerPauseMs":gap*20}


def transcribe(job, key, workers):
    cache = TRANSCRIPTS / f"{job['id']}.json"
    digest = job["waveform"]["sha256"]
    if cache.exists():
        old = json.loads(cache.read_text(encoding="utf-8"))
        if old.get("audioSha256") == digest and old.get("model") == ASR_MODEL and old.get("transcript"):
            old["comparison"] = alignment(job["expected"], old["transcript"])
            cache.write_text(json.dumps(old,ensure_ascii=False,indent=2),encoding="utf-8")
            return old
    body = {"model":ASR_MODEL, "messages":[{"role":"user","content":[
        {"type":"input_audio","input_audio":{"data":"data:audio/wav;base64," +
         base64.b64encode(job["path"].read_bytes()).decode("ascii")}}]}],
        "stream":False, "asr_options":{"language":"en","enable_itn":False}}
    # Expected text is deliberately absent from the provider input.
    started = time.monotonic()
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                ASR_ENDPOINT, data=json.dumps(body).encode("utf-8"), method="POST",
                headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = json.load(response)
            text = payload["choices"][0]["message"]["content"].strip()
            record = {"id":job["id"],"audioSha256":digest,"model":ASR_MODEL,
                      "language":"en","enableItN":False,"contextProvided":False,
                      "transcript":text,"providerRequestId":payload.get("id"),
                      "usage":payload.get("usage"),"elapsedMs":round((time.monotonic()-started)*1000),
                      "comparison":alignment(job["expected"],text)}
            cache.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
            return record
        except urllib.error.HTTPError as error:
            if error.code not in (429,500,502,503,504) or attempt == 2:
                raise RuntimeError(f"ASR HTTP {error.code}") from None
            time.sleep(2*(attempt+1))
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as error:
            if attempt == 2:
                raise RuntimeError(f"ASR transport/response failure: {type(error).__name__}") from None
            time.sleep(2*(attempt+1))
    raise RuntimeError("ASR exhausted retry attempts")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--asr",action="store_true")
    parser.add_argument("--workers",type=int,default=4)
    parser.add_argument("--limit",type=int,default=0)
    args = parser.parse_args()
    QA.mkdir(parents=True,exist_ok=True)
    TRANSCRIPTS.mkdir(exist_ok=True)
    data = json.loads((ROOT/"output/international-mathematics/narration.json").read_text(encoding="utf-8"))
    definitions = json.loads((ROOT/"output/international-mathematics/course-definitions.json").read_text(encoding="utf-8"))
    expected_shots = {(l["number"],i+1):s["narration"] for l in definitions["lessons"] for i,s in enumerate(l["film"])}
    jobs = []
    concat = []
    issues = []
    for lesson in data["lessons"]:
        number = lesson["lesson"]
        path = PUBLIC/lesson["src"].lstrip("/")
        parts = []
        expected = []
        for shot in lesson["shots"]:
            p = PUBLIC/shot["src"].lstrip("/")
            spoken = expected_shots[(number,shot["shot"])]
            expected.append(spoken)
            stats = waveform(p)
            if shot["narration"] != spoken:
                issues.append({"id":shot["id"],"issue":"authored text differs from generation metadata"})
            if stats["durationMs"] != 15000 or stats["clippedSamples"] or stats["activeSpanMs"] <= 0:
                issues.append({"id":shot["id"],"issue":"duration, clipping, or missing speech"})
            if stats["detectedLeadingSilenceMs"] < 500 or stats["detectedTrailingSilenceMs"] < 300:
                issues.append({"id":shot["id"],"issue":"speech near a shot boundary"})
            if stats["longestInnerPauseMs"] > 1500:
                issues.append({"id":shot["id"],"issue":"long inner pause for review"})
            jobs.append({"id":shot["id"],"kind":"shot","lesson":number,"shot":shot["shot"],
                         "expected":spoken,"path":p,"waveform":stats})
            parts.append(read_audio(p)[1])
        full = waveform(path)
        matches = b"".join(parts) == read_audio(path)[1]
        concat.append({"lesson":number,"exactShotPcmConcatenation":matches})
        if not matches or full["durationMs"] != 90000 or full["clippedSamples"]:
            issues.append({"id":f"lesson-{number:02d}-intro","issue":"full film audio mismatch"})
        jobs.append({"id":f"lesson-{number:02d}-intro","kind":"full","lesson":number,
                     "expected":" ".join(expected),"path":path,"waveform":full})
    if args.limit:
        selected = jobs[:args.limit]
    else:
        selected = jobs
    recognized = {}
    errors = []
    if args.asr:
        key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("dashscope_api_key")
        if not key:
            raise RuntimeError("DASHSCOPE_API_KEY is not configured")
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(8,args.workers))) as pool:
            pending = {pool.submit(transcribe,job,key,args.workers):job for job in selected}
            for future in concurrent.futures.as_completed(pending):
                job = pending[future]
                try:
                    result = future.result()
                    recognized[job["id"]] = result
                    print(f"ASR {len(recognized)+len(errors)}/{len(selected)} {job['id']} WER={result['comparison']['wordErrorRate']:.3f}",flush=True)
                except Exception as error:
                    # Only safe error class/HTTP status is reported.
                    errors.append({"id":job["id"],"error":str(error)})
                    print(f"ASR failed {job['id']}: {error}",flush=True)
    records = []
    for job in jobs:
        record = {k:v for k,v in job.items() if k != "path"}
        record["file"] = str(job["path"].relative_to(ROOT)).replace("\\","/")
        if job["id"] in recognized:
            record["asr"] = recognized[job["id"]]
        records.append(record)
    mismatches = [{"id":j["id"],"comparison":recognized[j["id"]]["comparison"],
                   "expected":j["expected"],"recognized":recognized[j["id"]]["transcript"]}
                  for j in selected if j["id"] in recognized
                  and not recognized[j["id"]]["comparison"]["exactAfterOrthographicNormalization"]]
    report = {
        "createdAt":datetime.now(timezone.utc).isoformat(),
        "method":"PCM16 waveform measurements + unprompted Qwen-ASR transcription; no human listening",
        "officialApiReference":DOCS,"repoProviderReference":"apps/platform-api/src/study/speech.ts",
        "waveformFiles":len(jobs),"shotCount":96,"fullNarrationCount":16,
        "waveformIssues":issues,"exactPcmConcatenation":concat,
        "asrRequested":bool(args.asr),"asrSelected":len(selected) if args.asr else 0,
        "asrCompleted":len(recognized),"asrErrors":errors,"asrMismatches":mismatches,
        "normalization":"Case, punctuation, hyphens, accents, UK/US spelling, digits vs number words, and % vs percent only; no semantic replacements.",
        "humanListeningStatus":"Not performed. ASR agreement does not certify accent, prosody, naturalness, or classroom audibility.",
        "records":records,
    }
    (QA/"audio-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    lines = ["# International Mathematics: independent audio QA", "",
             f"Waveform files: {len(jobs)} (96 shots + 16 full narrations).",
             f"ASR completed: {len(recognized)} / {len(selected) if args.asr else 0}.",
             f"Waveform issues: {len(issues)}. ASR failures: {len(errors)}. Text differences: {len(mismatches)}.", "",
             "Expected text was not supplied to the recognition provider. Source WAV hashes tie each transcript to its checked asset.",
             "All full WAVs are compared byte-for-byte at the PCM level with their six checked shot segments.", "",
             "## Differences requiring review", ""]
    for m in mismatches:
        lines += ["### "+m["id"],"", "Expected: "+m["expected"],"",
                  "Recognized: "+m["recognized"],"", json.dumps(m["comparison"]["differences"],ensure_ascii=False),""]
    lines += ["## Acceptance boundary","",
              "No human listening was performed. ASR checks intelligibility and text correspondence; waveform checks detect clipping and measurable silence. Neither establishes voice naturalness, subjective pacing, accent quality, or projector/classroom audio acceptance."]
    (QA/"audio-qa.md").write_text("\n".join(lines),encoding="utf-8")
    print(json.dumps({k:report[k] for k in ["waveformFiles","asrCompleted","waveformIssues","asrErrors"]},ensure_ascii=False),flush=True)


if __name__ == "__main__":
    main()
