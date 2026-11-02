"""Retrieve normal public filing links for the frozen outcome-stratified sample.

Uses only links present in each official filing-history HTML table. No API key,
account, alternate authentication, fabricated document ID or signed-URL editing.
Serial, cached, 20 MiB per document; receipt excludes ephemeral signed queries.
"""
from __future__ import annotations
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.parse import urljoin
from urllib.request import urlopen

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://find-and-update.company-information.service.gov.uk"


class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.hrefs = [], None, None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row, self.hrefs = [], []
        elif self.row is not None and tag == "td":
            self.cell = []
        elif self.row is not None and tag == "a":
            href = dict(attrs).get("href", "")
            if href:
                self.hrefs.append(href)

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self.row is not None and self.cell is not None:
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip())
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append({"cells": self.row, "hrefs": self.hrefs})
            self.row, self.hrefs, self.cell = None, None, None


def fetch(url, path, max_bytes):
    if path.exists():
        return path.read_bytes()
    with urlopen(url, timeout=35) as r:
        content = r.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise ValueError("Response exceeds bounded download limit")
    path.write_bytes(content)
    time.sleep(0.3)
    return content


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit-per-group", type=int, default=4)
    args = ap.parse_args()
    if not 1 <= args.limit_per_group <= 25:
        raise ValueError("Use 1-25 observations per frozen stratum")
    plan = json.loads((ROOT / "records/targeted-financial-screen-plan.json").read_text())
    selected = [s for s in plan["sample"] if s["rank"] <= args.limit_per_group]
    out = ROOT / "data/ch-targeted-accounts"
    out.mkdir(exist_ok=True)
    receipt_path = ROOT / "records/ch-targeted-download-receipt.json"
    prior = json.loads(receipt_path.read_text()) if receipt_path.exists() else {"records": []}
    by_number = {r["company_number"]: r for r in prior["records"]}
    for s in selected:
        num = s["company_number"]
        previous = by_number.get(num)
        if previous and previous.get("status") == "downloaded":
            path = ROOT / previous["path"]
            if hashlib.sha256(path.read_bytes()).hexdigest() != previous["sha256"]:
                raise ValueError("Original targeted document changed")
            print(num, "cached", flush=True)
            continue
        record = dict(s)
        try:
            page_path = ROOT / f"data/ch-targeted-history-{num}.html"
            b = fetch(s["filing_history_url"], page_path, 2 * 1024**2)
            rows = Rows()
            rows.feed(b.decode("utf-8"))
            candidates = []
            for row in rows.rows:
                cells = row["cells"]
                if len(cells) < 3 or cells[1] != "AA" or "made up to 31 December 2025" not in cells[2]:
                    continue
                date = pd.to_datetime(cells[0], dayfirst=True, errors="raise")
                if date > pd.Timestamp("2026-11-01"):
                    continue
                hrefs = [u for u in row["hrefs"] if "/document?" in u]
                hrefs.sort(key=lambda u: "format=xhtml" not in u)
                if hrefs:
                    candidates.append((date, row, hrefs[0]))
            if not candidates:
                record["status"] = "2025_accounts_not_present_on_observed_first_page"
            else:
                date, row, href = max(candidates, key=lambda q: q[0])
                url = urljoin(HOST, href)
                if not url.startswith(HOST + f"/company/{num}/filing-history/"):
                    raise ValueError("Document link does not belong to observed company")
                suffix = ".html" if "format=xhtml" in href else ".pdf"
                target = out / f"CH_{num}_20251231{suffix}"
                body = fetch(url, target, 20 * 1024**2)
                if suffix == ".pdf" and not body.startswith(b"%PDF"):
                    raise ValueError("Public PDF link did not return a PDF")
                if suffix == ".html" and b"inlineXBRL" not in body[:10000]:
                    raise ValueError("Public iXBRL link did not return recognized inline XBRL")
                record.update(status="downloaded", document_url=url,
                              filing_date=str(date.date()), description=row["cells"][2],
                              path=str(target.relative_to(ROOT)), bytes=len(body),
                              sha256=hashlib.sha256(body).hexdigest(), format=suffix)
        except Exception as e:
            record.update(status="retrieval_failed", error_type=type(e).__name__,
                          error=str(e).split("?")[0][:220])
        by_number[num] = record
        receipt_path.write_text(json.dumps({"method": "normal hyperlinks in official filing-history tables",
                                           "frozen_plan": "targeted-financial-screen-plan.json",
                                           "records": list(by_number.values())}, indent=2), encoding="utf-8")
        print(num, record["status"], record.get("bytes", ""), flush=True)


if __name__ == "__main__":
    main()
