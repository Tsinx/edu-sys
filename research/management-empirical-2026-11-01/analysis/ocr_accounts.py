"""Local, serial OCR of selected original financial-statement PDF pages.

OCR is a discovery aid, not verified financial data. Keep boxes/confidence and
original hashes so numeric cells can be checked against the original page.
Run with the isolated data/ocr-venv interpreter. No document leaves the machine.
"""
from __future__ import annotations
import os
for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[name] = "1"
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import time

import cv2
import numpy as np
import pymupdf
from rapidocr import RapidOCR

ROOT = Path(__file__).resolve().parents[1]
PARAMS = {
    "EngineConfig.onnxruntime.intra_op_num_threads": 1,
    "EngineConfig.onnxruntime.inter_op_num_threads": 1,
    "EngineConfig.onnxruntime.use_cuda": False,
    "EngineConfig.onnxruntime.use_dml": False,
    "EngineConfig.onnxruntime.use_cann": False,
    "EngineConfig.onnxruntime.use_coreml": False,
    "Global.log_level": "warning",
    "Global.max_side_len": 1800,
    "Rec.rec_batch_num": 1,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--company", nargs="+", required=True)
    ap.add_argument("--pages", nargs="+", type=int, default=[1, 2])
    args = ap.parse_args()
    if len(args.company) > 15 or len(args.pages) > 8 or min(args.pages) < 1:
        raise ValueError("Bounded job: at most 15 statements and eight selected pages each")
    cv2.setNumThreads(1)
    engine = RapidOCR(params=PARAMS)
    receipt = json.loads((ROOT / "records/ch-targeted-download-receipt.json").read_text())
    records = {x["company_number"]: x for x in receipt["records"]}
    out = ROOT / "data/ch-account-ocr"
    out.mkdir(exist_ok=True)
    versions = {x: importlib.metadata.version(x) for x in ("rapidocr", "onnxruntime", "pymupdf")}
    for number in args.company:
        r = records[number]
        if r["status"] != "downloaded" or r["format"] != ".pdf":
            raise ValueError(f"No retrieved original PDF for {number}")
        path = ROOT / r["path"]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != r["sha256"]:
            raise ValueError("Original PDF hash mismatch")
        with pymupdf.open(path) as doc:
            for page_number in sorted(set(args.pages)):
                if page_number > len(doc):
                    continue
                dest = out / f"{path.stem}-p{page_number:03d}.json"
                if dest.exists():
                    cached = json.loads(dest.read_text())
                    if cached["pdf_sha256"] != digest:
                        raise ValueError("Cached OCR belongs to another original")
                    print(number, page_number, "cached", flush=True)
                    continue
                page = doc[page_number - 1]
                scale = min(150 / 72, 1300 / page.rect.width)
                pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                started = time.monotonic()
                result = engine(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
                lines = []
                if result.txts is not None:
                    for text, confidence, box in zip(result.txts, result.scores, result.boxes):
                        lines.append({"text": text, "confidence": float(confidence), "box": box.tolist()})
                payload = {"status": "machine OCR; numeric cells NOT independently verified",
                           "company_number": number, "pdf_sha256": digest,
                           "pdf_path": str(path.relative_to(ROOT)), "page_1based": page_number,
                           "image_width": pix.width, "image_height": pix.height,
                           "seconds": time.monotonic()-started, "versions": versions,
                           "cpu_parameters": PARAMS, "lines": lines}
                dest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
                dest.with_suffix(".txt").write_text("\n".join(x["text"] for x in lines), encoding="utf-8")
                print(number, page_number, len(lines), round(payload["seconds"], 2), flush=True)
    model_root = Path(__import__("rapidocr").__file__).parent / "models"
    models = [{"file": p.name, "bytes": p.stat().st_size,
               "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(model_root.glob("*.onnx"))]
    (ROOT / "records/local-ocr-environment.json").write_text(
        json.dumps({"versions": versions, "models": models, "cpu_parameters": PARAMS,
                    "documents_processed_locally": True, "parallel_workers": 1}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
