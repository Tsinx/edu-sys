"""Independent audit of the original UK payment-practices export.

Run: python research/management-empirical-2026-11-01/analysis/audit_payments.py
The count and value shares below both concern invoices PAID in the period.
The value overdue / all paid ratio is deliberately NOT treated as a late share:
the numerator and denominator cover different invoice cohorts.
"""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp("2026-11-01")
SOURCE = ROOT / "data/uk-payment-practices-2026-11-01.csv"
d = pd.read_csv(SOURCE, dtype=str, keep_default_na=False)
out = {"as_of": str(AS_OF.date()), "rows_original": len(d),
       "columns_original": len(d.columns), "firms_original": d["Company number"].nunique(),
       "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest()}
out["regimes"] = d["Policy Regime"].value_counts().to_dict()
for c, alias in [("Start date", "start"), ("End date", "end"),
                 ("Filing date", "filed"), ("Financial period start date", "fy_start")]:
    d[alias] = pd.to_datetime(d[c], format="%Y-%m-%d", errors="coerce")
d["duration"] = (d.end-d.start).dt.days+1
out["invalid_dates"] = {
    "end_after_as_of": int((d.end > AS_OF).sum()),
    "filed_after_as_of": int((d.filed > AS_OF).sum()),
    "filed_before_end": int((d.filed < d.end).sum()),
    "negative_or_zero_duration": int((d.duration <= 0).sum()),
}
out["original_end_years"] = d.end.dt.year.value_counts().sort_index().to_dict()
out["duplicate_company_period_rows"] = int(d.duplicated(["Company number", "start", "end"], keep=False).sum())
d["rid"] = pd.to_numeric(d["Report Id"], errors="coerce")
valid_dates = (d.start.notna() & d.end.notna() & d.filed.notna()
               & d.end.le(AS_OF) & d.filed.le(AS_OF) & d.filed.ge(d.end)
               & d.start.ge("2017-01-01") & d.duration.between(1, 400))
x = d.loc[valid_dates].sort_values(["filed", "rid"]).drop_duplicates(
    ["Company number", "start", "end"], keep="last").copy()
numcols = {
    "Average time to pay": "days",
    "% Invoices paid within 30 days": "n30",
    "% Invoices paid between 31 and 60 days": "n3160",
    "% Invoices paid later than 60 days": "n60",
    "Total value invoices paid within 30 days": "v30",
    "Total value invoices paid between 31 and 60 days": "v3160",
    "Total value invoices paid later than 60 days": "v60",
    "% Invoices not paid within agreed terms": "late_count",
    "Total value invoices paid later than agreed terms": "late_pounds",
    "% Invoices not paid due to dispute": "disputed_count",
    "Shortest (or only) standard payment period": "terms_min",
    "Longest standard payment period": "terms_max",
}
for c, alias in numcols.items():
    x[alias] = pd.to_numeric(x[c], errors="coerce")
x["value_total_paid"] = x[["v30", "v3160", "v60"]].sum(axis=1, min_count=3)
x["count_band_sum"] = x[["n30", "n3160", "n60"]].sum(axis=1, min_count=3)
count_ok = (x[["n30", "n3160", "n60"]].ge(0).all(axis=1)
            & x[["n30", "n3160", "n60"]].le(100).all(axis=1)
            & x.count_band_sum.between(99, 101))
x["count_bands_valid"] = count_ok
x["canonical_half_year"] = x.duration.between(150, 215)
new = x["Policy Regime"].isin(["Regime-2", "Regime-3"])
value_ok = x[["v30", "v3160", "v60"]].ge(0).all(axis=1) & x.value_total_paid.gt(0)
z = x.loc[new & value_ok & count_ok & x.canonical_half_year].copy()
z["value_share_60"] = z.v60 / z.value_total_paid * 100
z["value_share_30"] = z.v30 / z.value_total_paid * 100
z["gap_60_pp"] = z.value_share_60-z.n60
z["gap_30_pp"] = z.value_share_30-z.n30
z["paid60_size_ratio_to_all"] = z.value_share_60/z.n60.replace(0, np.nan)
z["paid60_size_ratio_to_others"] = ((z.value_share_60/(100-z.value_share_60))
                                          /(z.n60/(100-z.n60)))
out["date_clean_dedup_rows"] = len(x)
out["date_clean_firms"] = x["Company number"].nunique()
out["days_outside_0_365"] = int((~x.days.between(0,365) & x.days.notna()).sum())
out["new_regime_rows"] = int(new.sum())
out["new_regime_with_positive_total_paid"] = int((new & value_ok).sum())
out["paired_canonical_rows"] = len(z)
out["paired_canonical_firms"] = z["Company number"].nunique()
out["paired_reports_by_end_year"] = z.end.dt.year.value_counts().sort_index().to_dict()
out["paired_reports_per_firm"] = z.groupby("Company number").size().value_counts().sort_index().to_dict()
out["paired_statistics"] = z[["days", "n60", "value_share_60", "gap_60_pp",
                                  "n30", "value_share_30", "gap_30_pp",
                                  "paid60_size_ratio_to_others"]].replace([np.inf,-np.inf], np.nan).describe(
                                      percentiles=[.1,.25,.5,.75,.9,.95,.99]).to_dict()
out["gap_thresholds"] = {str(g): int(z.gap_60_pp.gt(g).sum()) for g in [0,5,10,20]}
out["gap_negative_below_minus5"] = int(z.gap_60_pp.lt(-5).sum())
out["report_headline_passing_descriptive"] = {}
for cutoff in [45,55]:
    q = z[z.n60.le(5) & z.days.between(0,cutoff)]
    out["report_headline_passing_descriptive"][str(cutoff)] = {
        "n": len(q), "firms": q["Company number"].nunique(),
        "value_60_gt10": int(q.value_share_60.gt(10).sum()),
        "value_60_gt20": int(q.value_share_60.gt(20).sum()),
        "value_60_median": float(q.value_share_60.median()),
        "value_60_q90": float(q.value_share_60.quantile(.9)),
        "qualification_note": "Report-only headline, not legal tender eligibility: scope, intercompany adjustment, two periods and action plans not assessed."
    }
first = z.sort_values(["end", "filed", "rid"]).groupby("Company number").head(1)
out["first_new_report_firm_balanced"] = {
    "n": len(first), "median_gap": float(first.gap_60_pp.median()),
    "gap_gt5": int(first.gap_60_pp.gt(5).sum()),
    "gap_lt_minus5": int(first.gap_60_pp.lt(-5).sum())}
out["paid_cohort_identity_note"] = "Relative mean invoice value, not supplier size or supplier cash constraints. Integer invoice percentages cause rounding error."
out["not_estimated"] = ["causal effect of new disclosure", "actual supplier size effects",
                        "total share of overdue invoice value (due cohort denominator absent)"]
out["generated_at_utc"] = datetime.now(timezone.utc).isoformat()
(ROOT/"analysis/payment-audit.json").write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
keep = ["Report Id", "Company number", "Company", "Policy Regime", "start", "end", "filed", "fy_start",
        "duration", "days", "n30", "n3160", "n60", "v30", "v3160", "v60", "value_total_paid",
        "value_share_60", "gap_60_pp", "value_share_30", "gap_30_pp", "late_count", "late_pounds",
        "terms_min", "terms_max", "Supply-chain financing offered", "E-Invoicing offered", "URL"]
z[keep].to_csv(ROOT/"data/payment-paired-audit-sample.csv", index=False)
print(json.dumps({k:out[k] for k in ["rows_original","firms_original","invalid_dates",
    "duplicate_company_period_rows","date_clean_dedup_rows","days_outside_0_365",
    "paired_canonical_rows","paired_canonical_firms","paired_reports_per_firm",
    "gap_thresholds","gap_negative_below_minus5","report_headline_passing_descriptive",
    "first_new_report_firm_balanced"]}, ensure_ascii=False, indent=2))
