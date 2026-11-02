"""Check timing observability and freeze an outcome-blind chronology pilot.

The pilot matches collection targets, not causal treatment/control groups. Remedy
delivery, first suspected defect, rollout, decision and notification require
original-document coding. A rollout date is not a completed-repair date.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def digest(s):
    return hashlib.sha256(("recall-chronology-v1:"+s).encode()).hexdigest()


def main():
    f = pd.read_csv(ROOT / "data/nhtsa-campaign-screen.csv", dtype=str, keep_default_na=False)
    q = pd.read_csv(ROOT / "data/nhtsa-quarterly-clean.csv", dtype=str, keep_default_na=False)
    for k in ("involved", "remedied", "completion_unadjusted"):
        q[k] = pd.to_numeric(q[k], errors="coerce")
    q["quarter_end"] = pd.to_datetime(q.quarter_end)
    q["submitted_date"] = pd.to_datetime(q.submitted_date)
    q["owner_start_date"] = pd.to_datetime(q.owner_start, format="%Y%m%d", errors="coerce")
    f["owner_date_parsed"] = pd.to_datetime(f.owner_date, format="%Y%m%d", errors="coerce")
    f["received_date"] = pd.to_datetime(f.received_date)
    vehicle = f[f.recall_type.eq("V") & f.received_date.between("2015-01-01", "2026-11-01")].copy()
    x = q.merge(vehicle, on="campaign", suffixes=("_q", ""), validate="many_to_one")
    x["after_receipt"] = (x.quarter_end-x.received_date).dt.days
    x["before_letter"] = (x.owner_date_parsed-x.quarter_end).dt.days
    obs = x[x.after_receipt.ge(0) & x.before_letter.gt(0) & x.valid_completion.eq("True")
            & x.owner_start_date.eq(x.owner_date_parsed)]
    last = obs.sort_values("quarter_end").drop_duplicates("campaign", keep="last")
    last.to_csv(ROOT / "data/nhtsa-preletter-screen.csv", index=False)
    q["terminal_complete"] = q.involved.gt(0) & q.remedied.eq(q.involved)
    early = x[x.after_receipt.between(0,319) & x.valid_completion.eq("True")
              & x.involved.gt(0) & x.remedied.eq(x.involved)]
    out = {"status": "timing feasibility screen; no causal interpretation",
           "submissions_before_declared_quarter_end": int(q.submitted_date.lt(q.quarter_end).sum()),
           "campaigns_with_any_terminal_complete_record": int(q.loc[q.terminal_complete,"campaign"].nunique()),
           "vehicle_campaigns_complete_record_before_day320": int(early.campaign.nunique()),
           "ota_vehicle_campaigns_complete_record_before_day320": int(early.loc[early.ota_explicit.eq("True"),"campaign"].nunique()),
           "comparable_preletter_quarter_campaigns": len(last),
           "ota_comparable_preletter_quarter_campaigns": int(last.ota_explicit.eq("True").sum()),
           "interpretation": [
               "Quarterly reporting starts with campaign initiation and can end after full completion under 49CFR573.7; missing landmark rows cannot be coded as zero.",
               "1,093 files are submitted before the end of the labelled quarter; original22V050 PDFs confirm the labels. Treat quarter-end landmark summaries as provisional.",
               "Quarterly Total Remedied includes inspected-without-repair and returned-to-inventory units; call it reported remedy completion, not strictly completed repairs.",
               "No OTA campaign supplies a comparable pre-owner-letter quarter in this screen; do not estimate preletter completion from this flat file.",
               "22V050 original chronology: Jan15 precautionary corrective firmware, Jan26 recall determination, Feb2 report, Apr1 planned owner letter; rollout does not establish all units fixed."]}
    (ROOT / "analysis/nhtsa-timing-feasibility.json").write_text(json.dumps(out,indent=2),encoding="utf-8")

    # No completion outcome, quarter coverage or significance enters selection.
    eligible = f[f.recall_type.eq("V") & f.received_date.between("2019-01-01","2024-12-31")
                 & f.software_candidate.eq("True")].copy()
    eligible["firm_key"] = eligible.filing_manufacturer.str.lower().str.replace(r"[^a-z0-9]","",regex=True)
    eligible["year"] = eligible.received_date.dt.year
    eligible["population"] = pd.to_numeric(eligible.affected,errors="coerce")
    eligible = eligible[eligible.population.gt(0)]
    count = eligible.firm_key.value_counts()
    eligible = eligible[eligible.firm_key.map(count).ge(5)]
    def components(s):
        return {v.strip().split(":")[0] for v in s.split(" | ") if v.strip()}
    eligible["broad_components"] = eligible.component_categories.map(components)
    treated = eligible[eligible.ota_explicit.eq("True")].copy()
    treated["rank_key"] = treated.campaign.map(digest)
    controls = eligible[eligible.ota_explicit.eq("False") & eligible.remedy.str.contains(r"dealer|retailer",case=False,regex=True)]
    pairs, used_controls, firm_count = [], set(), Counter()
    for _,t in treated.sort_values("rank_key").iterrows():
        if firm_count[t.firm_key] >= 2:
            continue
        c = controls[controls.firm_key.eq(t.firm_key) & (controls.year-t.year).abs().le(1)
                     & ~controls.campaign.isin(used_controls)].copy()
        c = c[c.broad_components.map(lambda s: bool(s & t.broad_components))]
        if c.empty:
            continue
        c["year_gap"] = (c.year-t.year).abs()
        c["size_gap"] = (np.log(c.population)-np.log(t.population)).abs()
        c["rank_key"] = c.campaign.map(digest)
        control = c.sort_values(["year_gap","size_gap","rank_key"]).iloc[0]
        def public(row):
            return {k:row[k] for k in ["campaign","filing_manufacturer","received","affected","component_categories","remedy"]}
        pairs.append({"ota_candidate": public(t),"dealer_candidate": public(control),
                      "year_gap": int(control.year_gap)})
        used_controls.add(control.campaign)
        firm_count[t.firm_key] += 1
        if len(pairs) == 12:
            break
    plan = {"status": "frozen outcome-blind source-collection pilot; treatment labels await original-document verification",
            "as_of": "2026-11-01", "rule": "2019-2024 software candidates; >=5 software cases per normalized manufacturer; SHA256 treatment order; max2 pairs per manufacturer; dealer-worded controls in same manufacturer, year+-1 and intersecting broad component; nearest year then log population; no replacement",
            "campaign_screen_sha256": hashlib.sha256((ROOT/"data/nhtsa-campaign-screen.csv").read_bytes()).hexdigest(),
            "pairs": pairs}
    path = ROOT / "records/recall-chronology-pilot-plan.json"
    if path.exists() and json.loads(path.read_text()) != plan:
        raise ValueError("Frozen original pilot changed; investigate before replacing")
    path.write_text(json.dumps(plan,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in out.items() if k != "interpretation"},indent=2))
    print("Chronology collection pairs:",len(pairs),"manufacturers:",len(firm_count))
    for p in pairs:
        print(p["ota_candidate"]["campaign"],p["dealer_candidate"]["campaign"],p["ota_candidate"]["filing_manufacturer"])


if __name__ == "__main__":
    main()
