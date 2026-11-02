"""Retain observed public policy PDFs, without accessing register endpoints."""
import hashlib
import json
from pathlib import Path
import urllib.request
import fitz

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "au-reporting-fields-march2025": "https://paymenttimes.gov.au/sites/ptrs.gov.au/files/2025-03/reporting-fields-guidance.pdf",
    "au-reporting-guidance-march2025": "https://paymenttimes.gov.au/sites/ptrs.gov.au/files/regulatory-resource/ptrs-guidance-materials-march2025.pdf",
    "au-statutory-review-2023": "https://treasury.gov.au/sites/default/files/2023-08/p2023-428993.pdf",
    "au-liaison-forum-september2026": "https://paymenttimes.gov.au/sites/ptrs.gov.au/files/2026-09/liaison-forum-slides-202609.pdf",
}


def main():
    out = []
    for name, url in SOURCES.items():
        target = ROOT / "literature" / (name + ".pdf")
        if not target.exists():
            req = urllib.request.Request(url, headers={"User-Agent": "Academic research source verification"})
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read(20 * 1024 * 1024 + 1)
            if len(raw) > 20 * 1024 * 1024 or not raw.startswith(b"%PDF"):
                raise ValueError("Not an acceptable public PDF: " + url)
            target.write_bytes(raw)
        raw = target.read_bytes()
        with fitz.open(target) as doc:
            text = "\n".join(f"\n--- PDF page {i + 1} ---\n{p.get_text()}" for i, p in enumerate(doc))
            pages = len(doc)
        target.with_suffix(".txt").write_text(text, encoding="utf-8")
        out.append({"url": url, "local": str(target.relative_to(ROOT)), "bytes": len(raw),
                    "sha256": hashlib.sha256(raw).hexdigest(), "pdf_pages": pages})
    (ROOT / "records/au-policy-sources.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
