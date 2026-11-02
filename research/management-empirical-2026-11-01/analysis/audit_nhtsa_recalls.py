"""Audit official recall/quarterly flat files and screen remedy feasibility.

The regex flags are discovery aids, not verified treatments or recurrence codes.
Keep campaigns as the unit; model/component rows must not multiply the sample.
"""
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AS_OF = pd.Timestamp("2026-11-01")
NAMES = ["record_id", "campaign", "make", "model", "model_year", "mfg_campaign", "component",
         "filing_manufacturer", "build_start", "build_end", "recall_type", "affected", "owner_date",
         "initiated_by", "manufacturer", "received", "created", "regulation", "fmvss", "defect",
         "consequence", "remedy", "notes", "component_id", "mfr_component_name", "mfr_component_desc",
         "mfr_component_part", "do_not_drive", "park_outside"]
QNAMES = ["manufacturer", "campaign", "mfg_campaign", "subject", "owner_start", "owner_end",
          "report_number", "quarter", "involved", "remedied", "unreachable", "removed", "submitted"]


def audit():
    receipts = json.loads((ROOT / "records/nhtsa-download-receipt.json").read_text())["files"]
    for r in receipts:
        if r["status"] != "downloaded":
            raise ValueError("Required source not downloaded")
        if hashlib.sha256((ROOT / r["path"]).read_bytes()).hexdigest() != r["sha256"]:
            raise ValueError("Raw source hash changed")
    campaigns, malformed = {}, []
    field_counts, types = Counter(), Counter()
    records = 0
    with zipfile.ZipFile(ROOT / "data/nhtsa-FLAT_RCL_POST_2010.zip") as z:
        member = z.infolist()[0]
        if member.file_size > 350 * 1024**2:
            raise ValueError("Bounded uncompressed file limit")
        with z.open(member) as raw:
            for line_number, line in enumerate(raw, 1):
                line = line.rstrip(b"\r\n")
                if not line:
                    continue
                v = line.decode("utf-8", errors="replace").split("\t")
                field_counts[len(v)] += 1
                if len(v) != len(NAMES):
                    malformed.append(line_number)
                    continue
                records += 1
                d = {k:s.strip() for k,s in zip(NAMES,v)}
                types[d["recall_type"]] += 1
                num = d["campaign"]
                if num not in campaigns:
                    campaigns[num] = {k:d[k] for k in ["campaign", "filing_manufacturer", "manufacturer", "recall_type",
                                                      "affected", "owner_date", "received", "initiated_by", "defect",
                                                      "consequence", "remedy", "notes", "do_not_drive", "park_outside"]}
                    campaigns[num].update(variant_rows=0, model_years=set(), components=set(),
                                          field_variants={k:set() for k in ["remedy", "received", "affected", "filing_manufacturer"]})
                c = campaigns[num]
                c["variant_rows"] += 1
                if d["model_year"].isdigit() and 1900 <= int(d["model_year"]) <= 2030:
                    c["model_years"].add(int(d["model_year"]))
                c["components"].add(d["component"])
                for k in c["field_variants"]:
                    c["field_variants"][k].add(d[k])
    rows = []
    for c in campaigns.values():
        c["minimum_model_year"] = min(c["model_years"], default=None)
        c["maximum_model_year"] = max(c["model_years"], default=None)
        c["component_categories"] = " | ".join(sorted(c.pop("components")))
        c.pop("model_years")
        variants = c.pop("field_variants")
        c["conflicting_campaign_fields"] = ",".join(k for k,v in variants.items() if len(v) > 1)
        rows.append(c)
    f = pd.DataFrame(rows)
    f["received_date"] = pd.to_datetime(f.received, format="%Y%m%d", errors="coerce")
    f["affected"] = pd.to_numeric(f.affected, errors="coerce")
    f["ota_explicit"] = f.remedy.str.contains(r"over[ -]the[ -]air|\bOTA\b", case=False, regex=True)
    f["software_candidate"] = f.remedy.str.contains(r"software|reprogram|reflash", case=False, regex=True)
    f["prior_recall_candidate"] = (f.defect + " " + f.remedy + " " + f.notes).str.contains(
        r"previously recalled|prior recall|previous recall|recall[s]? .*?(?:did not|may not have|inadequate)|remedy .*?incomplete",
        case=False, regex=True)
    f.to_csv(ROOT / "data/nhtsa-campaign-screen.csv", index=False)

    with zipfile.ZipFile(ROOT / "data/nhtsa-FLAT_RCL_Qrtly_Rpts.zip") as z:
        with z.open(z.namelist()[0]) as raw:
            q = pd.read_csv(raw, sep="\t", header=None, names=QNAMES, dtype=str,
                            keep_default_na=False, encoding="utf-8", encoding_errors="replace")
    for k in ["report_number", "involved", "remedied", "unreachable", "removed"]:
        q[k] = pd.to_numeric(q[k], errors="coerce")
    q["submitted_date"] = pd.to_datetime(q.submitted, format="%Y%m%d", errors="coerce")
    valid_q = q.quarter.str.fullmatch(r"\d{4}-[1-4]")
    q["quarter_end"] = pd.NaT
    q.loc[valid_q, "quarter_end"] = pd.PeriodIndex(q.loc[valid_q, "quarter"].str.replace("-", "Q"), freq="Q").end_time.normalize()
    raw_q = len(q)
    q = q[valid_q & q.submitted_date.le(AS_OF) & q.quarter_end.le(AS_OF)]
    duplicates = q.duplicated(["campaign", "quarter"], keep=False).sum()
    q = q.sort_values(["submitted_date", "report_number"]).drop_duplicates(["campaign", "quarter"], keep="last")
    q["valid_completion"] = q.involved.gt(0) & q.remedied.ge(0) & q.remedied.le(q.involved)
    q["completion_unadjusted"] = (q.remedied / q.involved).where(q.valid_completion)
    q.to_csv(ROOT / "data/nhtsa-quarterly-clean.csv", index=False)
    vehicle = f[f.recall_type.eq("V") & f.received_date.le(AS_OF)
                & f.received_date.ge("2015-01-01") & f.conflicting_campaign_fields.eq("")].copy()
    v = q.merge(vehicle, on="campaign", how="inner", suffixes=("_quarter", ""), validate="many_to_one")
    v["age_days"] = (v.quarter_end-v.received_date).dt.days
    v["distance_to_365"] = (v.age_days-365).abs()
    horizon = v[v.age_days.between(320,410) & v.valid_completion].sort_values(
        ["campaign", "distance_to_365", "quarter_end"]).drop_duplicates("campaign")
    horizon.to_csv(ROOT / "data/nhtsa-completion-horizon-screen.csv", index=False)
    def groups(frame):
        return [{"ota_explicit": bool(k), "campaigns": len(g),
                 "software_candidates": int(g.software_candidate.sum()),
                 "mean_completion_unadjusted": float(g.completion_unadjusted.mean()),
                 "median_age_days": float(g.age_days.median()),
                 "prior_recall_candidates": int(g.prior_recall_candidate.sum()),
                 "manufacturers": int(g.filing_manufacturer.nunique())} for k,g in frame.groupby("ota_explicit")]
    out = {"status": "feasibility audit; remedy flags unverified; no causal comparison",
           "raw_variant_records": records, "field_counts": dict(field_counts), "malformed_lines": malformed[:30],
           "raw_recall_types": dict(types), "unique_campaigns": len(f),
           "campaigns_with_conflicting_fields": int(f.conflicting_campaign_fields.ne("").sum()),
           "raw_quarterly_rows": raw_q, "duplicated_campaign_quarter_rows": int(duplicates),
           "latest_quarterly_rows_asof": len(q), "invalid_completion_rows": int((~q.valid_completion).sum()),
           "eligible_vehicle_campaigns_2015on": len(vehicle), "ota_explicit_eligible": int(vehicle.ota_explicit.sum()),
           "software_candidates_eligible": int(vehicle.software_candidate.sum()),
           "near_12_month_horizon": groups(horizon),
           "horizon_definition": "PROVISIONAL screen only: closest labelled-quarter end to day365 within days320-410; one campaign each",
           "horizon_cautions": ["Early complete campaigns can stop reporting under49CFR573.7 and disappear from this landmark sample; do not interpret missing rows as zero.",
                                 "Some reports precede their labelled-quarter end; inspect nhtsa-timing-feasibility.json and original reports before using the horizon as an outcome.",
                                 "Total Remedied includes inspected-without-repair and returned-to-inventory units; this is reported remedy completion, not a pure repair count."],
           "ota_by_manufacturer": vehicle.loc[vehicle.ota_explicit,"filing_manufacturer"].value_counts().to_dict(),
           "ota_examples": vehicle.loc[vehicle.ota_explicit,["campaign","filing_manufacturer","received","remedy"]].head(8).to_dict("records")}
    (ROOT / "analysis/nhtsa-recall-audit.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in out.items() if k != "ota_examples"}, indent=2))


if __name__ == "__main__":
    audit()
