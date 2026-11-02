"""Audit the obtained open corpus; SEC source presence is NOT disclosure coverage.

Run from the repository root with Python 3. No network calls or paid dependencies.
The source includes automatic extraction and imports. These are candidate records,
not a validated incident census. All original records are retained unchanged.
"""
from __future__ import annotations

import collections
import csv
import datetime as dt
import hashlib
import json
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/breach-tracker-incidents-2026-11-01.jsonl"
COMMIT = "e13395831b6cf8f1a373343ba7af285dfac4f38b"


def counter(values):
    return dict(collections.Counter(values).most_common())


def norm(name):
    # Deliberately retain GROUP/HOLDINGS/BANK: these can distinguish legal entities.
    name = re.sub(r"\b(THE|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|LLC|PLC)\b", "", name.upper())
    return re.sub(r"[^A-Z0-9]", "", name)


def family(url):
    host = urllib.parse.urlparse(url).netloc.lower()
    if host == "oag.ca.gov":
        return "CA"
    if host in {"agportal-s3bucket.s3.amazonaws.com", "data.wa.gov"}:
        return "WA"
    if host == "justice.oregon.gov":
        return "OR"
    if host == "oag.my.site.com":
        return "TX"
    if host == "consumer.sc.gov":
        return "SC"
    if host == "ago.vermont.gov":
        return "VT"
    if host == "ocrportal.hhs.gov":
        return "HHS"
    if host in {"sec.gov", "www.sec.gov"} and "/Archives/" in url:
        return "SEC"
    return "other"


def date(value):
    try:
        return dt.date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def main():
    raw = SOURCE.read_bytes()
    rows = [json.loads(line) for line in raw.splitlines() if line]
    sec = json.loads((ROOT / "records/sec-company-tickers.json").read_text(encoding="utf-8"))
    names = collections.defaultdict(dict)
    for firm in sec.values():
        names[norm(firm["title"])][firm["cik_str"]] = firm

    out, candidate_rows = [], []
    group_rows = collections.defaultdict(list)
    for row in rows:
        families = sorted({family(source["url"]) for source in row["sources"]} - {"other"})
        for source_family in families:
            group_rows[source_family].append(row)
        imported = bool(row.get("imported_from"))
        discovered, disclosed = date(row.get("discovered_date")), date(row.get("disclosed_date"))
        lag = (disclosed - discovered).days if discovered and disclosed else None
        matches = names.get(norm(row["org_name"]), {})
        unique_cik = next(iter(matches)) if len(matches) == 1 else None
        sec_ciks = sorted({int(m.group(1)) for source in row["sources"]
                           if (m := re.search(r"sec\.gov/Archives/edgar/data/(\d+)/", source["url"]))})
        flat = {
            "id": row["id"], "org_name": row["org_name"],
            "disclosed_date": row.get("disclosed_date"),
            "discovered_date": row.get("discovered_date"),
            "incident_date": row.get("incident_date"), "lag_candidate_days": lag,
            "regulator_families": ";".join(families),
            "model": row["extracted_by"].get("model"), "reviewed": row.get("reviewed"),
            "imported": imported, "current_name_candidate_cik": unique_cik,
            "current_name_candidate_title": matches[unique_cik]["title"] if unique_cik else "",
            "sec_source_ciks": ";".join(map(str, sec_ciks)),
            "records_affected_unvalidated": row.get("records_affected"),
            "vendor_unvalidated": row.get("third_party", {}).get("vendor"),
            "source_urls": " | ".join(s["url"] for s in row["sources"]),
        }
        out.append(flat)
        # Includes independent regulator records whether or not SEC is also a source.
        if (not imported and unique_cik and disclosed and
                dt.date(2021, 1, 1) <= disclosed <= dt.date(2025, 12, 31) and
                any(x in families for x in ["CA", "WA", "OR", "TX", "SC", "HHS"])):
            candidate_rows.append(flat)

    fields = list(out[0])
    for name, items in [("cyber-corpus-audit-rows.csv", out),
                        ("cyber-regulator-sec-name-candidates.csv", candidate_rows)]:
        with (ROOT / "data" / name).open("w", newline="", encoding="utf-8-sig") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            writer.writerows(items)

    # Fixed audit sample: pseudorandom order independent of outcome, 10 per side.
    audit = []
    for post in [False, True]:
        pool = [r for r in candidate_rows if (r["disclosed_date"] >= "2024-01-01") == post]
        pool.sort(key=lambda r: hashlib.sha256(("source-audit-01:" + r["id"]).encode()).hexdigest())
        audit.extend(pool[:10])
    with (ROOT / "data/cyber-source-audit-sample.csv").open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(audit)

    receipt = {
        "source": f"https://raw.githubusercontent.com/thesubtlety/breach-tracker/{COMMIT}/data/incidents.jsonl",
        "commit": COMMIT, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
        "license": "CC BY-SA 4.0; see saved publisher LICENSE; underlying source terms also apply",
        "rows": len(rows), "unique_ids": len({r["id"] for r in rows}),
        "human_reviewed": sum(bool(r.get("reviewed")) for r in rows),
        "models": counter(r["extracted_by"].get("model") for r in rows),
        "imported": sum(bool(r.get("imported_from")) for r in rows),
        "source_groups_overlap": {
            k: {"rows": len(v), "with_discovery_date": sum(bool(date(r.get("discovered_date"))) for r in v),
                "disclosure_years": counter((r.get("disclosed_date") or "")[:4] for r in v)}
            for k, v in sorted(group_rows.items())
        },
        "negative_candidate_lag": sum(r["lag_candidate_days"] is not None and r["lag_candidate_days"] < 0 for r in out),
        "name_candidates_2021_2025_independent_regulator": {
            "rows": len(candidate_rows), "current_ciks": len({r["current_name_candidate_cik"] for r in candidate_rows}),
            "years": counter(r["disclosed_date"][:4] for r in candidate_rows),
            "discovery_date_present": sum(bool(r["discovered_date"]) for r in candidate_rows),
            "SEC_source_also_present_not_disclosure_rate": sum(bool(r["sec_source_ciks"]) for r in candidate_rows),
        },
        "interpretation": [
            "Sources overlap; families are not mutually exclusive observations.",
            "Imported VCDB disclosure dates are incident dates and are excluded from timing candidates.",
            "Current ticker names omit delisted firms and do not validate historical parent ownership or issuer status.",
            "A missing SEC source is not evidence of no SEC disclosure; retrieve issuer filings independently.",
            "Merged dates/counts can refer to different audiences. Reconstruct original notices before inference.",
            "Vendor flags and affected counts are automatically coded candidates, not validated mechanism evidence.",
        ],
    }
    (ROOT / "analysis/cyber-corpus-audit.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in receipt.items() if k != "source_groups_overlap"}, indent=2))
    print("Fixed source-audit sample:")
    for row in audit:
        print(row["org_name"], row["disclosed_date"], row["id"], row["source_urls"][:260])


if __name__ == "__main__":
    main()
