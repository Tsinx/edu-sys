"""Retrieve a bounded fixed set of already observed original notice URLs.

No site discovery, credentials, browser bypasses, model calls or paid services.
Default: 20 documents ordered by a fixed outcome-independent hash. Existing files
are reused. --limit 65 obtains the entire currently observed WA-linked candidate set.
"""
import argparse
import hashlib
import json
import pathlib
import time
import urllib.request

import fitz

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.limit <= 65:
        parser.error("limit must be between 1 and 65")
    rows = [json.loads(line) for line in (ROOT / "data/breach-tracker-incidents-2026-11-01.jsonl").read_text(encoding="utf-8").splitlines()]
    candidates = []
    for row in rows:
        if row.get("imported_from") or "moveit" not in str([row.get("summary"), row.get("technology_involved"), row.get("third_party")]).lower():
            continue
        urls = sorted({s["url"] for s in row["sources"] if "agportal-s3bucket.s3.amazonaws.com" in s["url"] and s["url"].lower().endswith(".pdf")})
        if urls:
            candidates.append({"id": row["id"], "org": row["org_name"], "url": urls[0],
                               "disclosed": row.get("disclosed_date"), "discovered": row.get("discovered_date"),
                               "vendor": row.get("third_party"), "summary": row.get("summary")})
    (ROOT / "data/moveit-notice-candidates.json").write_text(json.dumps(candidates, indent=2), encoding="utf-8")
    candidates.sort(key=lambda r: hashlib.sha256(("moveit-stage-audit-01:" + r["id"]).encode()).hexdigest())
    receipts = []
    failures = []
    for i, row in enumerate(candidates[:args.limit]):
        dest = ROOT / "literature" / ("moveit-" + row["id"][:10] + ".pdf")
        try:
            raw = dest.read_bytes() if dest.exists() else urllib.request.urlopen(row["url"], timeout=20).read()
            if not raw.startswith(b"%PDF"):
                raise ValueError("The response is not a PDF")
            dest.write_bytes(raw)
            doc = fitz.open(stream=raw, filetype="pdf")
            body = "\n".join(page.get_text() for page in doc)
            dest.with_suffix(".txt").write_text(body, encoding="utf-8")
            receipts.append({**row, "file": str(dest.relative_to(ROOT)), "bytes": len(raw),
                             "sha256": hashlib.sha256(raw).hexdigest(), "pages": len(doc), "chars": len(body)})
            print(i + 1, row["org"], len(raw), len(doc), flush=True)
        except Exception as exc:
            failures.append({"id": row["id"], "url": row["url"], "error": str(exc)})
            print(i + 1, row["org"], type(exc).__name__, flush=True)
        # Persist after every document; interrupted retrieval does not lose receipts.
        (ROOT / "records/moveit-notice-receipt.json").write_text(json.dumps(receipts, indent=2), encoding="utf-8")
        (ROOT / "records/moveit-notice-retrieval-errors.json").write_text(json.dumps(failures, indent=2), encoding="utf-8")
        time.sleep(0.4)


if __name__ == "__main__":
    main()
