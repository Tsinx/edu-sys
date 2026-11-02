"""Freeze a descriptive reporting-continuation probe; absence is not exemption."""
from pathlib import Path
import hashlib
import json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp("2026-11-01")
source = ROOT / "data/uk-payment-practices-2026-11-01.csv"
d = pd.read_csv(source, dtype=str, keep_default_na=False)
for col, alias in [("Start date", "start"), ("End date", "end"), ("Filing date", "filed")]:
    d[alias] = pd.to_datetime(d[col], errors="coerce")
d["rid"] = pd.to_numeric(d["Report Id"], errors="coerce")
d["days"] = pd.to_numeric(d["Average time to pay"], errors="coerce")
d["days"] = d.days.where(d.days.between(0, 365))
d["duration"] = (d.end - d.start).dt.days + 1
ok = (d.duration.between(150, 215) & d.end.le(AS_OF) & d.filed.le(AS_OF)
      & d.filed.ge(d.end) & d.start.ge("2017-01-01"))
x = d[ok].sort_values(["filed", "rid"]).drop_duplicates(
    ["Company number", "start", "end"], keep="last")
x = x[x.start.dt.month.eq(1) & x.start.dt.day.le(7)
      & x.end.dt.month.eq(6) & x.end.dt.day.ge(25)].copy()
x["year"] = x.end.dt.year
repeated_company_year = int(x.duplicated(["Company number", "year"], keep=False).sum())
x = x.sort_values(["filed", "rid"]).drop_duplicates(["Company number", "year"], keep="last")

# A deliberately conservative recorded procurement link: an exact identifier and
# compiled publication already before 2024. It does not certify covered contracts.
a = pd.read_csv(ROOT / "data/fts-payment-matched-awards.csv", dtype=str, keep_default_na=False)
a["compiled"] = pd.to_datetime(a.compiled_date, utc=True, errors="coerce")
ap = a[a.match_method.eq("identifier_exact") & a.compiled.lt("2024-01-01")]
any_gov = set(ap.company_number)
central = set(ap.loc[ap.central_type_proxy.str.lower().eq("true"), "company_number"])
rows, grouped, candidates = [], [], []
for year in range(2020, 2027):
    before1 = x[x.year.eq(year - 1)].set_index("Company number")
    before2 = x[x.year.eq(year - 2)].set_index("Company number")
    base = sorted(set(before1.index) & set(before2.index))
    current = set(x.loc[x.year.eq(year), "Company number"])
    t = before1.loc[base, ["Company", "days"]].copy()
    t["absent_same_half"] = ~t.index.isin(current)
    t["prior_recorded_government_award"] = t.index.isin(any_gov)
    t["prior_recorded_central_award"] = t.index.isin(central)
    t["baseline_year"] = year - 1
    t["outcome_year"] = year
    n, k = len(t), int(t.absent_same_half.sum())
    rows.append({"year": year, "two_prior_year_firms": n, "absent": k,
                 "absence_rate": k / n,
                 "prior_mean_days_remaining": float(t.loc[~t.absent_same_half, "days"].mean()),
                 "prior_mean_days_absent": float(t.loc[t.absent_same_half, "days"].mean()),
                 "remaining_valid_days_n": int(t.loc[~t.absent_same_half, "days"].notna().sum()),
                 "absent_valid_days_n": int(t.loc[t.absent_same_half, "days"].notna().sum())})
    for exposure in (["prior_recorded_government_award", "prior_recorded_central_award"] if year >= 2024 else []):
        for value, q in t.groupby(exposure):
            grouped.append({"year": year, "exposure": exposure, "value": bool(value),
                            "n": len(q), "absent": int(q.absent_same_half.sum()),
                            "absence_rate": float(q.absent_same_half.mean())})
    candidates.append(t.reset_index())
out = {"status": "descriptive screening, not policy treatment or causal inference",
       "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
       "as_of": str(AS_OF.date()), "window": "starts January 1-7, ends June 25-30; 150-215 days",
       "unit": "company-year, latest dated report after company-period deduplication",
       "repeated_company_year_rows_before_last_selection": repeated_company_year,
       "baseline": "observed in each of the two previous same-half calendar windows",
       "procurement": "exact identifier; compiled release before 2024; no covered-contract certification",
       "history": rows, "procurement_groups": grouped}
(ROOT / "analysis/reporting-continuation-pilot.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
pd.concat(candidates).to_csv(ROOT / "data/reporting-continuation-firm-years.csv", index=False)
print(json.dumps(out, indent=2))
