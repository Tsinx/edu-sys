"""Retain original regulator-hosted notices for the frozen source-check sample."""
import hashlib
import argparse
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request
import pandas as pd
import pymupdf as fitz

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data/odd/incident-source-pilot"
RECEIPT=ROOT/"records/odd-incident-source-downloads.json"


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--plan",default="records/odd-breach-source-plan.json")
    parser.add_argument("--receipt",default="records/odd-incident-source-downloads.json")
    parser.add_argument("--out",default="data/odd/incident-source-pilot")
    args=parser.parse_args()
    planpath=(ROOT/args.plan).resolve()
    receipt=(ROOT/args.receipt).resolve()
    out=(ROOT/args.out).resolve()
    if not all(p.is_relative_to(ROOT.resolve()) for p in (planpath,receipt,out)):
        raise ValueError("All input/output paths must stay within this research directory")
    plan=json.loads(planpath.read_text())
    links=pd.read_csv(ROOT/"data/odd/breach-name-links.csv",keep_default_na=False)
    out.mkdir(exist_ok=True)
    previous=json.loads(receipt.read_text()) if receipt.exists() else {"records":[]}
    retained={z["rcid"]:z for z in previous["records"] if z["status"]=="downloaded"}
    records=[]
    for identity in plan["targets"]:
        if identity in retained:
            old=retained[identity]
            if hashlib.sha256((ROOT/old["path"]).read_bytes()).hexdigest()!=old["sha256"]:
                raise ValueError("Retained incident original changed")
            records.append(old)
            continue
        row=links[links.rcid.eq(identity)&links.has_primary_registry_link.eq(True)].sort_values("disclosed_date").iloc[0]
        base={"rcid":identity,"mapped_company":row.mapped_company,"event_org_name":row.event_org_name,
              "corpus_event_id":row.event_id,"corpus_disclosed_date":row.disclosed_date,
              "corpus_discovered_date":row.discovered_date,"corpus_source_row":int(row.source_jsonl_row)}
        original_urls=list(dict.fromkeys(json.loads(row.primary_registry_urls)))
        options=[u for u in original_urls if ".pdf" in urllib.parse.urlparse(u).path.lower()]
        options.sort(key=lambda u:0 if "agportal-s3bucket.s3.amazonaws.com" in u else 1)
        attempts=[]
        got=False
        for source in options[:2]:
            url=source.rstrip(";.,")
            if url.startswith("http://oag.ca.gov/"):
                url="https://"+url[len("http://"):]
            try:
                req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
                with urllib.request.urlopen(req,timeout=25) as response:
                    data=response.read(20*1024*1024+1)
                if len(data)>20*1024*1024 or not data.startswith(b"%PDF"):
                    raise ValueError("Not a bounded PDF response")
                dest=out/f"{identity}-{row.event_id[:10]}.pdf"
                sha=hashlib.sha256(data).hexdigest()
                if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=sha:
                    raise ValueError("Refusing to overwrite a different incident original")
                dest.write_bytes(data)
                doc=fitz.open(dest)
                dest.with_suffix(".txt").write_text("\n".join(f"\n=== PDF {i+1} ===\n"+page.get_text() for i,page in enumerate(doc)),encoding="utf-8")
                records.append({**base,"status":"downloaded","original_source_url":source,"source_url":url,
                    "path":str(dest.relative_to(ROOT)),"sha256":sha,"bytes":len(data),"pages":len(doc),
                    "reading_status":"not yet manually source-coded","attempts":attempts})
                got=True
                break
            except Exception as exc:
                attempts.append({"source_url":url,"error":str(exc)[:220]})
            time.sleep(.2)
        if not got:
            records.append({**base,"status":"no_pdf_link" if not options else "retrieval_failed", "attempts":attempts,
                            "source_urls":original_urls})
        receipt.write_text(json.dumps({"status":"original notices retained; source-coding remains separate",
            "frozen_target_companies":len(plan["targets"]),"completed_targets":len(records),"records":records},indent=2),encoding="utf-8")
        print(json.dumps({"completed":len(records),"rcid":identity,"status":records[-1]["status"]}),flush=True)
        time.sleep(.15)
    print(json.dumps({"targets":len(records),"downloaded":sum(z["status"]=="downloaded" for z in records),
                      "pages":sum(z.get("pages",0) for z in records)},indent=2),flush=True)


if __name__=="__main__":
    main()
