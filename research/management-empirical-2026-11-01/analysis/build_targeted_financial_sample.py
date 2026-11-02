"""Reproduce the frozen outcome-stratified financial-document feasibility sample.

Stratifying on observed reporting status deliberately oversamples absences. This
is a collection-feasibility screen; unweighted rates do not describe the cohort.
"""
import hashlib
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp("2026-11-01")


def build():
    f = pd.read_csv(ROOT / "data/uk-payment-practices-2026-11-01.csv", dtype=str, keep_default_na=False)
    for col, alias in [("Start date", "start"), ("End date", "end"), ("Filing date", "filed")]:
        f[alias] = pd.to_datetime(f[col], errors="coerce")
    f["rid"] = pd.to_numeric(f["Report Id"], errors="coerce")
    f = f[f.end.le(AS_OF) & f.filed.le(AS_OF) & f.filed.ge(f.end)
          & (f.end-f.start).dt.days.add(1).between(150, 215)]
    f = f.sort_values(["filed", "rid"]).drop_duplicates(["Company number", "start", "end"], keep="last")

    def half(start, end):
        return f[f.start.eq(start) & f.end.eq(end) & f["Payments made in reporting period"].eq("True")]

    h1 = half("2025-01-01", "2025-06-30")
    h2 = half("2025-07-01", "2025-12-31")
    current = set(half("2026-01-01", "2026-06-30")["Company number"])
    baseline = set(h1["Company number"]) & set(h2["Company number"])
    by_number = h2.set_index("Company number")
    sample = []
    counts = {}
    for group in ("absent", "continued"):
        cohort = [n for n in baseline if (n in current) == (group == "continued")]
        counts[group] = len(cohort)
        cohort.sort(key=lambda n: hashlib.sha256(("scope-screen-v1:"+n).encode()).hexdigest())
        for rank, n in enumerate(cohort[:25], 1):
            r = by_number.loc[n]
            sample.append({"group": group, "rank": rank, "company_number": n,
                           "name": r["Company"], "prior_report_id": r["Report Id"],
                           "filing_history_url": f"https://find-and-update.company-information.service.gov.uk/company/{n}/filing-history"})
    plan = {"sampling": "SHA256(scope-screen-v1:+company_number), 25 per observed outcome stratum",
            "fixed_as_of": str(AS_OF.date()), "baseline": len(baseline),
            "absent_substantive": counts["absent"], "continued_substantive": counts["continued"],
            "sample": sample}
    path = ROOT / "records/targeted-financial-screen-plan.json"
    if path.exists():
        if json.loads(path.read_text()) != plan:
            raise ValueError("Reproduction differs from frozen original plan; investigate without overwriting")
    else:
        path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in plan.items() if k != "sample"}, indent=2))
    print("Frozen sample reproduced exactly")


if __name__ == "__main__":
    build()
