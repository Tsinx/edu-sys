"""Conservative organization-name linkage, not certified treatment assignment."""
from collections import Counter,defaultdict
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlparse
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"


def normalize(value):
    value=unicodedata.normalize("NFKC",str(value)).casefold().strip()
    value=re.sub(r"[.,'’]","",value)
    value=re.sub(r"\s+"," ",value)
    suffix=r"\s+(?:inc|incorporated|corp|corporation|llc|ltd|limited|plc|co|company)$"
    while re.search(suffix,value):
        value=re.sub(suffix,"",value).strip()
    return "".join(c for c in value if c.isalnum())


def main():
    names=defaultdict(dict)
    with pd.read_stata(DATA/"company_name.dta",chunksize=50_000) as reader:
        for chunk in reader:
            for identity,name in zip(chunk.rcid,chunk.company):
                if str(name).strip():
                    names[normalize(name)][int(identity)]=name
    selected=set(json.loads((ROOT/"records/odd-pilot-extraction-plan.json").read_text())["selected_rcids"])
    counts=Counter()
    linked=[]
    with (ROOT/"data/breach-tracker-incidents-2026-11-01.jsonl").open(encoding="utf-8") as f:
        for ordinal,line in enumerate(f,1):
            r=json.loads(line)
            try:
                when=date.fromisoformat(r.get("disclosed_date",""))
            except (ValueError,TypeError):
                continue
            if not 2010<=when.year<=2021:
                continue
            counts["source_records_disclosed_2010_2021"]+=1
            candidate=names.get(normalize(r.get("org_name","")),{})
            if not candidate:
                continue
            if len(candidate)!=1:
                counts["ambiguous_mapping_records"]+=1
                continue
            identity,name=next(iter(candidate.items()))
            urls=[z["url"] for z in r.get("sources",[]) if z.get("url")]
            gov=[u for u in urls if urlparse(u).netloc.casefold() in {
                "oag.ca.gov","justice.oregon.gov","agportal-s3bucket.s3.amazonaws.com",
                "data.wa.gov","consumer.sc.gov","ago.vermont.gov","ocrportal.hhs.gov","oag.my.site.com"}]
            linked.append({"rcid":identity,"mapped_company":name,"event_org_name":r.get("org_name"),
                "event_id":r["id"],"source_jsonl_row":ordinal,"disclosed_date":when.isoformat(),
                "discovered_date":r.get("discovered_date"),"incident_date":r.get("incident_date"),
                "org_country":r.get("org_country"),"org_type":r.get("org_type"),
                "evidence_level":r.get("evidence_level"),"extraction_model":r.get("extracted_by",{}).get("model"),
                "has_primary_registry_link":bool(gov),"primary_registry_urls":json.dumps(gov),
                "all_source_urls":json.dumps(urls),"in_outcome_independent_2000_sample":identity in selected,
                "link_status":"unique conservative name match; legal organization and event still require source review"})
    d=pd.DataFrame(linked)
    d.to_csv(DATA/"breach-name-links.csv",index=False)
    gov=d[d.has_primary_registry_link]
    targets=sorted(gov.rcid.unique(),key=lambda n:hashlib.sha256(f"odd-breach-source-20261101:{n}".encode()).digest())[:40]
    plan={"stage":"source-validation targets selected before inspecting linked employment outcomes",
          "algorithm":"first40 unique primary-registry-linked company IDs by SHA256(odd-breach-source-20261101:<rcid>)",
          "source_scope":"unique normalized company-name matches to public corpus records disclosed2010-2021",
          "purpose":"verify legal entity/name, actual announcement date and observed pre/post occupational support",
          "targets":list(map(int,targets)),"no_treatment_or_effect_claim":True}
    planpath=ROOT/"records/odd-breach-source-plan.json"
    if planpath.exists() and json.loads(planpath.read_text())!=plan:
        raise ValueError("Refusing to change previously frozen source targets")
    planpath.write_text(json.dumps(plan,indent=2),encoding="utf-8")
    result={"status":"name-linkage feasibility only; automatically compiled incident records are not certified events",
            "counts":dict(counts),"unique_name_matched_records":len(d),"unique_name_matched_companies":int(d.rcid.nunique()),
            "primary_registry_linked_records":len(gov),"primary_registry_linked_companies":int(gov.rcid.nunique()),
            "companies_in_2000_pilot":int(d.loc[d.in_outcome_independent_2000_sample,"rcid"].nunique()),
            "source_validation_target_companies":len(targets),
            "event_origin_counts":d.extraction_model.value_counts().to_dict(),
            "period":"announcement years2010-2021 allow at least2calendar post-years in ODD2003-2023",
            "limits":"No industry, size, event severity or outcome filters used in selecting source targets. Name equality does not certify ownership or geographic scope; never-observed is not never-breached."}
    (ROOT/"records/odd-breach-linkage-screen.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2),flush=True)


if __name__=="__main__":
    main()
