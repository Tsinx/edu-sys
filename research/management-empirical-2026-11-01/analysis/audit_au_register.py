"""Audit the actual Australian workbook extracts and test linkage feasibility.

Group/segment comparisons are contemporaneous descriptive evidence, not an
estimated reform effect. Historical groups use exact disclosed ABNs only.
"""
from collections import Counter
import json
from pathlib import Path
import re
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/"data/au-register-extracts"
AS_OF = pd.Timestamp("2026-11-01")


def read(name):
    return pd.read_csv(DATA/(name+".csv"),dtype=str,keep_default_na=False)


def abn(s):
    s = re.sub(r"[\s-]","",str(s))
    if not re.fullmatch(r"\d{11}",s):
        return ""
    digits = list(map(int,s))
    digits[0] -= 1
    if sum(a*b for a,b in zip(digits,[10,1,3,5,7,9,11,13,15,17,19])) % 89:
        return ""
    return s


def dates(frame):
    for col in ["Reporting Period Start Date","Reporting Period End Date","Submitted date","Original report date","Revised report date"]:
        if col in frame:
            frame[col+"_date"] = pd.to_datetime(frame[col],errors="coerce",format="mixed")
    frame["abn"] = frame["ABN"].map(abn)
    frame["start"] = frame["Reporting Period Start Date_date"]
    frame["end"] = frame["Reporting Period End Date_date"]
    frame["duration"] = (frame.end-frame.start).dt.days+1
    return frame


def valid(frame):
    return frame[frame.abn.ne("") & frame.duration.between(150,215) & frame.end.le(AS_OF)].copy()


def main():
    historical = dates(read("historical_reports"))
    historical["submitted"] = historical["Revised report date_date"].fillna(historical["Original report date_date"])
    h = valid(historical)
    h = h[h.submitted.isna() | h.submitted.le(AS_OF)]
    hduplicates = int(h.duplicated(["abn","start","end"],keep=False).sum())
    h = h.sort_values(["submitted","ReportId"],na_position="first").drop_duplicates(["abn","start","end"],keep="last")
    aasb = dates(read("aasb8_report"))
    parent_cols = [c for c in aasb.columns if c not in ("_source_row",) and not c.startswith("Operating Segment")]
    inconsistencies = aasb.groupby("ReportId")[parent_cols].nunique(dropna=False).gt(1).any(axis=1)
    consistent = set(inconsistencies.index[~inconsistencies])
    aasb_parent = aasb[aasb.ReportId.isin(consistent)].drop_duplicates("ReportId").copy()
    parent_frames = []
    for name,frame in [("standard_report",dates(read("standard_report"))),
                       ("aasb8_report",aasb_parent),
                       ("no_sb_procurement_report",dates(read("no_sb_procurement_report"))),
                       ("external_administration_report",dates(read("external_administration_report")))]:
        frame["_source_sheet"] = name
        parent_frames.append(frame)
    new_raw = pd.concat(parent_frames,ignore_index=True)
    new = valid(new_raw)
    new["submitted"] = new["Submitted date_date"]
    new = new[new.submitted.isna() | new.submitted.le(AS_OF)]
    nduplicates = int(new.duplicated(["abn","start","end"],keep=False).sum())
    new = new.sort_values(["submitted","ReportId"],na_position="first").drop_duplicates(["abn","start","end"],keep="last")
    new.to_csv(ROOT/"data/au-new-report-panel.csv",index=False)
    h.to_csv(ROOT/"data/au-historical-report-panel.csv",index=False)

    # The same report supplies its parent and operating-segment measures.
    group30 = "Payments 30 days or less"
    seg30 = "Operating Segment Payments 30 days or less"
    group95 = "95th Percentile Payment Time (days)"
    seg95 = "Operating Segment 95th Percentile Payment Time (days)"
    eligible_ids = set(new.loc[new.Type.eq("AASB8"),"ReportId"])
    seg = aasb[aasb.ReportId.isin(eligible_ids) & aasb["Operating Segment"].str.strip().ne("")].copy()
    group_bands = [group30,"Payments 31 - 60 days","Payments more than 60 days"]
    segment_bands = [seg30,"Operating Segment Payments 31-60 days","Operating Segment Payments 60 days or more"]
    for col in list(dict.fromkeys(group_bands+segment_bands+[group95,seg95,"Operating Segment Average Payment Time (days)","Average Payment Time (days)"])):
        seg[col+"_numeric"] = pd.to_numeric(seg[col],errors="coerce")
    gb = seg[[c+"_numeric" for c in group_bands]]
    sb = seg[[c+"_numeric" for c in segment_bands]]
    seg["group_band_sum"] = gb.sum(axis=1,min_count=3)
    seg["segment_band_sum"] = sb.sum(axis=1,min_count=3)
    seg["valid_ranges"] = (gb.ge(0)&gb.le(100)).all(axis=1) & (sb.ge(0)&sb.le(100)).all(axis=1)
    seg["valid_p30"] = (seg.valid_ranges & seg.group_band_sum.sub(100).abs().le(0.05)
                        & seg.segment_band_sum.sub(100).abs().le(0.05) & seg["Redacted report"].eq("No"))
    seg["valid_p95"] = seg.valid_p30 & seg[group95+"_numeric"].ge(0) & seg[seg95+"_numeric"].ge(0)
    comparison = seg[seg.valid_p30].copy()
    comparison["segment_minus_group_p30"] = comparison[seg30+"_numeric"]-comparison[group30+"_numeric"]
    spread = comparison.groupby("ReportId").agg(
        segments=("Operating Segment","nunique"),abn=("abn","first"),name=("Business Name","first"),
        parent_p30=(group30+"_numeric","first"),minimum_segment_p30=(seg30+"_numeric","min"),
        maximum_segment_p30=(seg30+"_numeric","max"),start=("start","first"),end=("end","first"))
    spread["range_p30_pp"] = spread.maximum_segment_p30-spread.minimum_segment_p30
    spread["parent_over_worst_segment_pp"] = spread.parent_p30-spread.minimum_segment_p30
    spread = spread[spread.segments.ge(2)]
    spread.to_csv(ROOT/"data/au-segment-spreads.csv")
    valid_tail = seg[seg.valid_p95]
    masked_fast = valid_tail[(valid_tail[group95+"_numeric"]<=20) & (valid_tail[seg95+"_numeric"]>20)]

    # Exact calendar-half historical group-link screen. A missing current child
    # report alone does not certify it was consolidated or that ownership stayed.
    base = h[h.start.eq("2024-01-01") & h.end.eq("2024-06-30")].copy()
    base["controller_abn"] = base["Controlling Corporation ABN"].map(abn)
    base["head_abn"] = base["Head Entity ABN"].map(abn)
    base["group_abn"] = base.controller_abn.where(base.controller_abn.ne(""),base.head_abn)
    base["group_abn"] = base.group_abn.where(base.group_abn.ne(""),base.abn)
    n1 = pd.to_numeric(base["Percentage of Number Invoices Paid Within 20 Days "],errors="coerce")
    n2 = pd.to_numeric(base["Percentage of Number Invoices Paid Between 21 and 30 Days"],errors="coerce")
    base["p30"] = (n1+n2).where(n1.between(0,100)&n2.between(0,100)&(n1+n2).between(0,100.000001))
    groups = base.groupby("group_abn").agg(members=("abn","nunique"),observed_p30=("p30","count"),
                                            minimum_p30=("p30","min"),maximum_p30=("p30","max"))
    groups["range_p30_pp"] = groups.maximum_p30-groups.minimum_p30
    groups = groups[groups.members.ge(2)]
    current = new[new.start.eq("2026-01-01") & new.end.eq("2026-06-30")]
    matched = groups.merge(current[["abn","Business Name","Type","ReportId","_source_row"]],
                           left_index=True,right_on="abn",how="inner",validate="one_to_one")
    matched.to_csv(ROOT/"data/au-group-linkage-pilot.csv",index=False)
    keys = set(current.abn)
    base["own_new_2026h1_report"] = base.abn.isin(keys)
    base.to_csv(ROOT/"data/au-baseline-group-members.csv",index=False)
    out = {"status":"actual-data feasibility and measurement audit; no causal reform estimate or publication clearance",
           "historical_raw_rows":len(historical),"historical_invalid_abn_rows":int(historical.abn.eq("").sum()),
           "historical_entity_period_duplicate_rows":hduplicates,"historical_valid_latest_rows":len(h),
           "historical_entities":int(h.abn.nunique()),"historical_period_start_range":[str(h.start.min().date()),str(h.start.max().date())],
           "aasb_parent_field_inconsistent_report_ids":int(inconsistencies.sum()),
           "new_raw_parent_reports":len(new_raw),"new_invalid_abn_rows":int(new_raw.abn.eq("").sum()),
           "new_entity_period_duplicate_rows":nduplicates,"new_valid_latest_parent_reports":len(new),
           "new_entities":int(new.abn.nunique()),"new_report_types":new.Type.value_counts().to_dict(),
           "new_period_start_counts":new.start.dt.strftime("%Y-%m-%d").value_counts().head(12).to_dict(),
           "valid_named_segment_rows":len(seg),"segment_reports":int(seg.ReportId.nunique()),
           "all_zero_segment_band_rows":int(seg.segment_band_sum.eq(0).sum()),
           "band_sum_tolerance_primary_pp":0.05,
           "valid_p30_segment_rows":len(comparison),"multi_segment_report_periods":len(spread),
           "multi_segment_entities":int(spread.abn.nunique()),
           "median_within_report_segment_range_p30_pp":float(spread.range_p30_pp.median()),
           "report_periods_with_segment_range_above20pp":int(spread.range_p30_pp.gt(20).sum()),
           "report_periods_parent95_within20days_and_segment95_over20days":int(masked_fast.ReportId.nunique()),
           "masked_fast_note":"one-period numeric criterion only; not actual Fast Payer designation or eligibility under its two-period rule",
           "baseline_2024h1_entities":len(base),"baseline_multiple_reporter_groups":len(groups),
           "old_groups_exactly_matched_to2026h1_parent":len(matched),
           "matched_new_report_types":matched.Type.value_counts().to_dict(),
           "matched_baseline_entities":int(base.group_abn.isin(set(matched.abn)).sum()),
           "widest_segment_examples":spread.sort_values("range_p30_pp",ascending=False).head(5).reset_index().astype(str).to_dict("records"),
           "matched_group_examples":matched.sort_values("members",ascending=False).head(8).fillna("").astype(str).to_dict("records")}
    (ROOT/"analysis/au-register-audit.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in out.items() if not k.endswith("examples")},indent=2))


if __name__ == "__main__":
    main()
