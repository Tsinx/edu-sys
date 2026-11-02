"""Extract main count fields for named incident candidates and fixed comparators.

This extends the source pilot before any incident-effect coefficient is read.
It does not certify the automatically compiled incident dates or firm linkage.
"""
import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"


def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    links=pd.read_csv(DATA/"breach-name-links.csv",keep_default_na=False)
    sample=pd.read_csv(DATA/"pilot-company-sample.csv",keep_default_na=False)
    named_sample=sample[sample.company.str.strip().ne("")]
    candidates=set(map(int,links.loc[links.has_primary_registry_link.eq(True),"rcid"]))
    identities=sorted(candidates|set(map(int,named_sample.rcid)))
    plan={"stage":"expanded measurement/source feasibility after frozen40case support inspection, before any incident-effect estimate",
          "period":[2007,2023],"incident_candidate_rule":"all unique conservative name matches with original government URLs, disclosed2010-2021",
          "incident_candidate_ids":sorted(candidates),"fixed_comparator_frame_ids":sorted(map(int,named_sample.rcid)),
          "comparator_interpretation":"A random named-identity frame, not certified unbreached firms. All known earlier, concurrent and later events must be screened before matching.",
          "all_extracted_ids":identities,"fields":"occupation-level observed counts, photo coverage, recorded promotions/movement, decoded SOC and one-based source row",
          "source_linkage_sha256":digest(DATA/"breach-name-links.csv"),"original_2000_sample_sha256":digest(DATA/"pilot-company-sample.csv"),
          "source_coding_rule":"Own digital-system incidents, upstream vendor incidents, administrative errors, intentional insider behavior, uncertain/partial scope remain separate.",
          "support_screen_for_next_step":"Report baseline observed employment and15-1computer occupations over3preyears. The50total/5computer average screen was chosen after40case feasibility, not preregistered. Never condition on the sign of outcomes.",
          "no_causal_status":True}
    planpath=ROOT/"records/odd-workforce-candidate-plan.json"
    if planpath.exists() and json.loads(planpath.read_text())!=plan:
        raise ValueError("Refusing to overwrite a different extraction plan")
    planpath.write_text(json.dumps(plan,indent=2),encoding="utf-8")
    selected=pd.Index(identities,dtype="int64")
    originals=json.loads((ROOT/"records/odd-archive-members.json").read_text())["files"]
    details={}
    for kind in ("composition","promotion","turnover"):
        source=DATA/f"raw/rcid_yo_{kind}.dta"
        entry=next(v for v in originals if Path(v["path"]).name==source.name)
        if source.stat().st_size!=entry["bytes"]:
            raise ValueError("Original source size changed")
        output=DATA/f"workforce-candidates-{kind}.csv"
        fields=["rcid","year","soccode_final","total_rcid_year","percent_with_photo"]
        if kind!="composition":
            fields+=["total_"+kind]
        n=0
        written=0
        found=set()
        with pd.read_stata(source,iterator=True,convert_categoricals=False,columns=fields) as reader:
            labels={int(k):v for k,v in reader.value_labels()["soccode_final"].items()}
            expected=int(reader._nobs)
            while n<expected:
                f=reader.read(500_000)
                mask=(selected.get_indexer(f.rcid.to_numpy())>=0)&f.year.between(2007,2023).to_numpy()
                sub=f.loc[mask].copy()
                if len(sub):
                    sub["_source_row"]=np.arange(n+1,n+len(f)+1)[mask]
                    sub["soccode_label"]=sub.soccode_final.map(labels).fillna("")
                    sub.to_csv(output,index=False,mode="w" if written==0 else "a",header=written==0)
                    written+=len(sub)
                    found.update(map(int,sub.rcid.unique()))
                n+=len(f)
                if n%20_000_000==0:
                    print(json.dumps({"kind":kind,"read_rows":n,"written_rows":written}),flush=True)
        details[kind]={"source_rows":n,"selected_rows":written,"selected_ids_observed":len(found),
                       "path":str(output.relative_to(ROOT)),"bytes":output.stat().st_size,"sha256":digest(output),
                       "original_sha256_from_extraction_receipt":entry["sha256"]}
    result={"status":"expanded count panel extracted; candidate incidents remain unvalidated",
            "source_integrity":"Original member sizes checked; full member hashes and source-row alignment were verified in prior extraction/audits. No redundant30GB rehash here.",
            "plan_sha256":digest(planpath),"government_source_candidate_ids":len(candidates),
            "named_fixed_random_frame_ids":len(named_sample),"union_ids":len(identities),"tables":details}
    (ROOT/"records/odd-workforce-candidate-extraction.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2),flush=True)


if __name__=="__main__":
    main()
