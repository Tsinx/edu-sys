"""Check empty strings as well as NA in the published firm-name mapping."""
from pathlib import Path
import json
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"


def main():
    blank=set()
    identities=set()
    with pd.read_stata(DATA/"company_name.dta",chunksize=50_000) as reader:
        for f in reader:
            identities.update(map(int,f.rcid))
            blank.update(map(int,f.loc[f.company.fillna("").str.strip().eq(""),"rcid"]))
    raw_blank=0
    period_blank=0
    period_ids=set()
    n=0
    with pd.read_stata(DATA/"raw/rcid_yo_composition.dta",chunksize=500_000,
                       columns=["rcid","year"],convert_categoricals=False) as reader:
        for f in reader:
            isblank=f.rcid.isin(blank)
            period=f.year.between(2003,2023)
            raw_blank+=int(isblank.sum())
            period_blank+=int((isblank&period).sum())
            period_ids.update(map(int,f.loc[period&~isblank,"rcid"].unique()))
            n+=len(f)
    sample=pd.read_csv(DATA/"pilot-company-sample.csv",keep_default_na=False)
    pilot=pd.read_csv(DATA/"pilot-composition.csv",usecols=["rcid"])
    result={"status":"complete name-empty-string and source-coverage check",
        "mapping_identities":len(identities),"blank_name_identities":len(blank),
        "nonblank_name_identities":len(identities)-len(blank),"all_source_rows":n,
        "raw_rows_with_blank_mapped_name":raw_blank,"period_2003_2023_rows_with_blank_mapped_name":period_blank,
        "nonblank_named_identities_observed_2003_2023":len(period_ids),
        "fixed2000_sample_blank_names":int(sample.rcid.isin(blank).sum()),
        "fixed2000_sample_observed_rows_with_blank_name":int(pilot.rcid.isin(blank).sum()),
        "correction":"Initial isna-only inspection missed Stata empty strings. Existing sample identities and outcomes are preserved. Main-source membership counts certify mapping IDs, not nonblank names; unnamed identities cannot be treated as known unbreached controls."}
    (ROOT/"records/odd-name-coverage-check.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2),flush=True)


if __name__=="__main__":
    main()
