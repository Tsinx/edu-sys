"""Obtain original Part573 reports using actual observed official-page links.

Serial and cached, <=5MiB per PDF; amended links remain in the source manifest.
Page text is retained for source coding, not passed off as verified event dates.
"""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.request import urlopen
import fitz

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT/"records/recall-public-report-links.json").read_text())
    plan = json.loads((ROOT/"records/recall-chronology-pilot-plan.json").read_text())
    expected = {p[side]["campaign"] for p in plan["pairs"] for side in ("ota_candidate","dealer_candidate")}
    grouped = defaultdict(list)
    for number,caption,suffix in manifest["links"]:
        if not re.fullmatch(r"20\d\d/RCLRPT-[0-9A-Z]+-\d{4}\.(?i:pdf)",suffix):
            raise ValueError("Unexpected observed public file link")
        grouped[number].append((caption,suffix))
    if set(grouped) != expected or len(expected) != 24:
        raise ValueError("Source manifest does not match frozen24-case collection plan")
    destination = ROOT/"data/nhtsa-chronology-pilot"
    destination.mkdir(exist_ok=True)
    receipt_path = ROOT/"records/nhtsa-chronology-downloads.json"
    prior = json.loads(receipt_path.read_text()) if receipt_path.exists() else {"records":[]}
    records = {r["campaign"]:r for r in prior["records"]}
    for number,links in grouped.items():
        initial = [(c,s) for c,s in links if re.match(r"^(Defect Notice|Noncompliance Notice|Non-Compliance)",c,re.I)]
        if not initial:
            initial = [(c,s) for c,s in links if c == "Recall 573 Report"]
        if len(initial) != 1:
            raise ValueError("Original-link caption ambiguous; source review needed")
        caption,suffix = initial[0]
        url = manifest["base_url"]+suffix
        path = destination/Path(suffix).name
        r = {"campaign":number,"ui_caption":caption,"source_url":url,
             "source_role":"original-labelled report; actual version/date still checked in PDF"}
        try:
            previous = records.get(number)
            if path.exists():
                body = path.read_bytes()
                if previous and previous.get("status") == "downloaded" and hashlib.sha256(body).hexdigest() != previous["sha256"]:
                    raise ValueError("Cached original hash mismatch")
            else:
                with urlopen(url,timeout=35) as response:
                    body = response.read(5*1024**2+1)
                if not body.startswith(b"%PDF") or len(body)>5*1024**2:
                    raise ValueError("Expected bounded original PDF")
                path.write_bytes(body)
                time.sleep(0.3)
            with fitz.open(path) as doc:
                text = "\n".join(f"\n--- PDF PAGE {i+1} ---\n"+p.get_text() for i,p in enumerate(doc))
                pages = len(doc)
            path.with_suffix(".txt").write_text(text,encoding="utf-8")
            r.update(status="downloaded",path=str(path.relative_to(ROOT)),bytes=len(body),
                     sha256=hashlib.sha256(body).hexdigest(),pdf_pages=pages,extracted_characters=len(text))
        except Exception as e:
            r.update(status="retrieval_failed",error_type=type(e).__name__,error=str(e).split("?")[0][:200])
        records[number] = r
        receipt_path.write_text(json.dumps({"source_manifest":"recall-public-report-links.json",
                                            "selection_plan":"recall-chronology-pilot-plan.json",
                                            "records":list(records.values())},indent=2),encoding="utf-8")
        print(number,r["status"],r.get("pdf_pages",""),flush=True)


if __name__ == "__main__":
    main()
