"""Check panel keys, raw denominator semantics and provisional event support."""
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"
KEYS=["rcid","year","soccode_final"]


def load(prefix):
    composition=pd.read_csv(DATA/f"{prefix}-composition.csv",keep_default_na=False)
    for col in KEYS:
        composition[col]=pd.to_numeric(composition[col],errors="coerce")
    if composition.duplicated(KEYS).any():
        raise ValueError("Pilot has duplicate original observation keys")
    merged=composition
    for kind in ("promotion","turnover"):
        f=pd.read_csv(DATA/f"{prefix}-{kind}.csv",keep_default_na=False)
        for col in KEYS:
            f[col]=pd.to_numeric(f[col],errors="coerce")
        columns=KEYS+[f"total_{kind}","_source_row"]
        merged=merged.merge(f[columns],on=KEYS,validate="one_to_one",how="outer",indicator=True,suffixes=("","_check"))
        if not merged._merge.eq("both").all() or not merged._source_row.eq(merged._source_row_check).all():
            raise ValueError("Pilot source keys/ordinals differ across stock and flow files")
        merged=merged.drop(columns=["_merge","_source_row_check"])
    return merged


def main():
    sample=load("pilot")
    targets=load("breach-source-pilot")
    common=sample.merge(targets[KEYS+["_source_row","total_rcid_year","total_promotion","total_turnover"]],
                        on=KEYS,validate="one_to_one",suffixes=("","_other"))
    for col in ("_source_row","total_rcid_year","total_promotion","total_turnover"):
        if not np.allclose(common[col],common[col+"_other"],atol=1e-8):
            raise ValueError("Independent extracts disagree on overlapping source rows")
    g=sample.groupby(["rcid","year"]).agg(rows=("rcid","size"),
        denominator_nunique=("total_rcid_year","nunique"),coverage_nunique=("percent_with_photo","nunique"))
    links=pd.read_csv(DATA/"breach-name-links.csv",keep_default_na=False)
    earliest=links[links.has_primary_registry_link.eq(True)].sort_values("disclosed_date").drop_duplicates("rcid")
    event=earliest.set_index("rcid")
    support=[]
    targets["is_it"]=targets.soccode_label.str.startswith("15-1")
    targets["strict_security"]=targets.soccode_label.isin(["15-1212","15-1122"])
    for identity,f in targets.groupby("rcid"):
        e=event.loc[identity]
        year=int(e.disclosed_date[:4])
        pre_years=[year-3,year-2,year-1]
        post_years=[year+1,year+2]
        whole=f.groupby("year").total_rcid_year.sum()
        it=f[f.is_it].groupby("year").total_rcid_year.sum()
        security=f[f.strict_security].groupby("year").total_rcid_year.sum()
        row={"rcid":int(identity),"company":e.mapped_company,"provisional_corpus_year":year,
             "all_five_pre_post_firmyears_present":all(t in whole.index for t in pre_years+post_years),
             "baseline_mean_observed_count":float(whole.reindex(pre_years,fill_value=0).mean()),
             "baseline_mean_IT_count":float(it.reindex(pre_years,fill_value=0).mean()),
             "baseline_any_IT":bool(it.reindex(pre_years,fill_value=0).sum()>0),
             "baseline_any_strict_security":bool(security.reindex(pre_years,fill_value=0).sum()>0)}
        support.append(row)
    outframe=pd.DataFrame(support)
    outframe.to_csv(DATA/"breach-source-pilot-support.csv",index=False)
    result={"status":"measurement/support check, no event effect estimated",
            "company_random_pilot":{"rows":len(sample),"companies":int(sample.rcid.nunique()),"firm_years":len(g),
                "duplicate_keys":0,"multicell_firmyears":int(g.rows.gt(1).sum()),
                "raw_total_varies_across_occupations":int(g.denominator_nunique.gt(1).sum()),
                "raw_photo_coverage_varies_across_occupations":int(g.coverage_nunique.gt(1).sum()),
                "promotion_counts_exceed_occupational_denominator":int(sample.total_promotion.gt(sample.total_rcid_year).sum()),
                "turnover_counts_exceed_occupational_denominator":int(sample.total_turnover.gt(sample.total_rcid_year).sum())},
            "overlap_independent_extract_rows_checked":len(common),
            "frozen40_source_pilot":{"rows":len(targets),"companies":len(outframe),
                "five_pre_post_firmyears_present":int(outframe.all_five_pre_post_firmyears_present.sum()),
                "baseline_any_IT":int(outframe.baseline_any_IT.sum()),
                "baseline_any_strict_security":int(outframe.baseline_any_strict_security.sum()),
                "baseline_mean_count_ge50_and_IT_ge5":int((outframe.baseline_mean_observed_count.ge(50)&outframe.baseline_mean_IT_count.ge(5)&outframe.all_five_pre_post_firmyears_present).sum())},
            "interpretation":"Raw total_rcid_year and percent_with_photo empirically refer to occupational cells in these data, despite dictionary rcid-year labels. Composition proportions are within-cell composition; promotion/turnover proportions divide by total events. Source notices must establish event locus, date role and organization boundary before any causal or organizational-learning claim."}
    (ROOT/"records/odd-pilot-support-check.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2))


if __name__=="__main__":
    main()
