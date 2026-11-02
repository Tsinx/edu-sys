"""Financial-pattern and exact-fiscal-window screen, prior to legal/entity review.

This deliberately conservative subset requires old-size qualification and new
nonqualification in BOTH years. It is not a full legal treatment classifier.
Employee facts with nonzero XBRL scale are withheld because source filings show
visible/tagged scale discrepancies; direct source review can resolve these.
"""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp("2026-11-01")
f = pd.read_csv(ROOT / "data/ch-account-facts.csv", keep_default_na=False)
f["value"] = pd.to_numeric(f.value, errors="coerce")
f["date"] = f.end.where(f.end.ne(""), f.instant)
default = f[f.dimensions.eq("[]") & f.status.eq("ok")].copy()
manual_path = ROOT / "records/manual-financial-checks.json"
if manual_path.exists():
    manual_rows = []
    for r in json.loads(manual_path.read_text())["records"]:
        p = ROOT / r["pdf_path"]
        if hashlib.sha256(p.read_bytes()).hexdigest() != r["sha256"]:
            raise ValueError("Visually reviewed financial original changed")
        for period in r["periods"]:
            for variable in ("turnover", "total_assets"):
                manual_rows.append({"member": p.name, "variable": variable,
                                    "value": period[variable], "scale": 0, "unit": "iso4217:GBP",
                                    "status": "ok", "dimensions": "[]", "start": period["start"],
                                    "end": period["date"], "instant": "", "date": period["date"],
                                    "source": "manual-financial-checks.json; visually verified original PDF cells"})
    default = pd.concat([default, pd.DataFrame(manual_rows)], ignore_index=True)
reports = pd.read_csv(ROOT / "data/uk-payment-practices-2026-11-01.csv", dtype=str, keep_default_na=False)
for col, alias in [("Start date", "start"), ("End date", "end"), ("Filing date", "filed")]:
    reports[alias] = pd.to_datetime(reports[col], errors="coerce")
reports["rid"] = pd.to_numeric(reports["Report Id"], errors="coerce")
reports = reports[reports.end.le(AS_OF) & reports.filed.le(AS_OF) & reports.filed.ge(reports.end)]
reports = reports.sort_values(["filed", "rid"]).drop_duplicates(
    ["Company number", "start", "end"], keep="last")
a = pd.read_csv(ROOT / "data/fts-payment-matched-awards.csv", dtype=str, keep_default_na=False)
a["compiled"] = pd.to_datetime(a.compiled_date, errors="coerce", utc=True)
ap = a[a.match_method.eq("identifier_exact") & a.compiled.lt("2024-01-01")]
gov = set(ap.company_number)
central = set(ap.loc[ap.central_type_proxy.str.lower().eq("true"), "company_number"])


def unique_value(q, variable, duration=False):
    z = q[q.variable.eq(variable)].copy()
    if variable == "employees":
        z = z[pd.to_numeric(z.scale).eq(0)]
    else:
        z = z[z.unit.str.contains(r"(?:^|:)GBP$", regex=True)]
    if duration:
        start = pd.to_datetime(z.start, errors="coerce")
        end = pd.to_datetime(z.end, errors="coerce")
        z = z[(end-start).dt.days.add(1).between(365, 366)]
    vals = z.value.dropna().unique()
    return float(vals[0]) if len(vals) == 1 and vals[0] >= 0 else None


def size_state(revenue, assets, headcount, threshold_revenue, threshold_assets):
    vals = [(revenue, threshold_revenue), (assets, threshold_assets), (headcount, 250)]
    lower = sum(v > threshold for v, threshold in vals if v is not None)
    upper = lower + sum(v is None for v, _ in vals)
    return True if lower >= 2 else (False if upper < 2 else None)


def observation(num, start):
    end = start + pd.DateOffset(months=6) - pd.Timedelta(days=1)
    q = reports[reports["Company number"].eq(num) & reports.start.between(start-pd.Timedelta(days=3),start+pd.Timedelta(days=3))
                & reports.end.between(end-pd.Timedelta(days=3),end+pd.Timedelta(days=3))]
    if q.empty:
        return {"present": False, "substantive": False}
    r = q.sort_values(["filed", "rid"]).iloc[-1]
    return {"present": True, "substantive": r["Payments made in reporting period"] == "True",
            "report_id": r["Report Id"], "filed": str(r.filed.date()),
            "qualifying_contracts": r["Qualifying contracts in reporting period"],
            "days": r["Average time to pay"]}


rows = []
for member, q in default.groupby("member"):
    num = re.search(r"_([A-Z0-9]{8})_(\d{8})", member)[1]
    dates = sorted({v for v in q.date if v})
    financials = []
    for date in dates:
        z = q[q.date.eq(date)]
        revenue = unique_value(z, "turnover", duration=True)
        headcount = unique_value(z, "employees", duration=True)
        fixed, current = unique_value(z, "fixed_assets"), unique_value(z, "current_assets")
        assets = unique_value(z, "total_assets")
        if assets is None and fixed is not None and current is not None:
            assets = fixed + current
        financials.append({"date": date, "turnover": revenue, "assets": assets, "employees": headcount,
                           "old_large": size_state(revenue, assets, headcount, 36e6, 18e6),
                           "new_large": size_state(revenue, assets, headcount, 54e6, 27e6)})
    if len(financials) < 2:
        pattern = "insufficient_years"
    else:
        last = financials[-2:]
        if all(x["old_large"] is True and x["new_large"] is False for x in last):
            pattern = "conservative_new_exemption_pattern"
        elif all(x["new_large"] is True for x in last):
            pattern = "remain_large_pattern"
        elif any(x["old_large"] is False for x in last):
            pattern = "does_not_meet_old_both_year_pattern"
        else:
            pattern = "missing_or_mixed_financial_pattern"
    latest = pd.Timestamp(dates[-1]) if dates else pd.NaT
    start = latest + pd.Timedelta(days=1)
    end = start + pd.DateOffset(months=6) - pd.Timedelta(days=1)
    deadline = end + pd.Timedelta(days=30)
    due = bool(start >= pd.Timestamp("2025-04-06") and deadline <= AS_OF)
    r = reports[reports["Company number"].eq(num)]
    current = observation(num, start) if due else None
    prior1, prior2 = observation(num, start-pd.DateOffset(months=6)), observation(num, start-pd.DateOffset(months=12))
    rows.append({"member": member, "company_number": num,
                 "name": r.Company.iloc[-1] if len(r) else "", "financial_pattern": pattern,
                 "financials": financials, "first_window_start_candidate": str(start.date()),
                 "first_window_end_candidate": str(end.date()), "deadline": str(deadline.date()),
                 "window_due_by_snapshot": due,
                 "both_immediate_prior_substantive": prior1["substantive"] and prior2["substantive"],
                 "previous_half": prior1, "previous_year_half": prior2,
                 "current_window": current, "recorded_gov_pre2024": num in gov,
                 "recorded_central_pre2024": num in central,
                 "scope_status": "document/company/group and historical-status review required"})
summary = pd.Series([r["financial_pattern"] for r in rows]).value_counts().to_dict()
usable = [r for r in rows if r["financial_pattern"] == "conservative_new_exemption_pattern"
          and r["window_due_by_snapshot"] and r["both_immediate_prior_substantive"]]
out = {"status": "conservative financial screen; no certified legal treatment or causal estimate",
       "selection": "all233 payment-firm matches in September2026 archive central directory (216 retained prefix originals +17 range-extracted originals), one October daily ZIP, frozen50-firm targeted sample and explicitly recorded manual PDF cells; electronic-account coverage not representative",
       "financial_pattern_counts": summary, "documents": len(rows),
       "due_new_exemption_patterns_with_two_prior_substantive_reports": len(usable),
       "candidate_continued": sum(r["current_window"]["substantive"] for r in usable),
       "rows": rows}
# The original BOTH-new-years-small screen above is intentionally narrower than
# the guidance's BOTH-dates-large inclusion test. Also report the broader
# financial transition (old-large at both dates, new-small at either date).
# Collapse duplicate renderings by company and latest balance date; disagreement
# between source documents remains unresolved rather than choosing a result.
entity_periods = {}
for r in rows:
    if len(r["financials"]) < 2:
        continue
    last = r["financials"][-2:]
    key = (r["company_number"], last[-1]["date"])
    entity_periods.setdefault(key, []).append(r)
broader, conflicting = [], []
for key, alternatives in entity_periods.items():
    fingerprints = {json.dumps(r["financials"][-2:], sort_keys=True) for r in alternatives}
    if len(fingerprints) != 1:
        conflicting.append({"company_number": key[0], "balance_date": key[1],
                            "members": [r["member"] for r in alternatives]})
        continue
    r = alternatives[0]
    last = r["financials"][-2:]
    if (all(x["old_large"] is True for x in last)
            and any(x["new_large"] is False for x in last)
            and r["window_due_by_snapshot"] and r["both_immediate_prior_substantive"]):
        broader.append({**r, "source_members": [v["member"] for v in alternatives]})
out["broader_both_dates_rule_screen"] = {
    "definition": "old individual financial test met at BOTH dates; new test fails at EITHER date; not certified legal treatment",
    "unique_company_balance_periods": len(entity_periods),
    "conflicting_document_periods": conflicting,
    "candidate_periods": len(broader),
    "substantive_current": sum(r["current_window"]["substantive"] for r in broader),
    "present_no_payments_current": sum(r["current_window"]["present"] and not r["current_window"]["substantive"] for r in broader),
    "no_current_report": sum(not r["current_window"]["present"] for r in broader),
    "rows": broader}
(ROOT / "analysis/scope-transition-pilot.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in out.items() if k != "rows"}, indent=2))
for r in usable:
    print(json.dumps({k: v for k, v in r.items() if k not in ["financials", "previous_half", "previous_year_half"]}))
