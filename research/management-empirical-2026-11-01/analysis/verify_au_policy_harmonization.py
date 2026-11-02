"""Independent CSV/date-loop reconstruction and QR-based regression check."""
from __future__ import annotations

import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import csv
from datetime import date, datetime
import json
import math
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
PERIODS=[("2024-07-01","2024-12-31"),("2025-01-01","2025-06-30"),
         ("2025-07-01","2025-12-31"),("2026-01-01","2026-06-30")]
LOW="Common Payment Term (minimum)"
HIGH="Common Payment Term (maximum)"
FL="Forecast Minimum Payment Term"
FH="Forecast Maximum Payment Term"
MODE="Common Payment Terms (days)"
MEAN="Average Payment Time (days)"
ON="Percentage of SB invoices paid within Payment Term"


def rows(path):
    with path.open(encoding="utf-8",newline="") as f:
        return list(csv.DictReader(f))


def number(row,key):
    try:
        return float(row[key])
    except (ValueError,KeyError):
        return float("nan")


def range_valid(row,a,b):
    x,y=number(row,a),number(row,b)
    return (math.isfinite(x) and math.isfinite(y) and y>=x>=0
            and abs(x-round(x))<=1e-6 and abs(y-round(y))<=1e-6)


def main():
    versions=[]
    seen=set()
    for sheet in ("standard_report","aasb8_report"):
        for r in rows(ROOT/f"data/au-register-extracts/{sheet}.csv"):
            if r["ReportId"] in seen:
                continue
            seen.add(r["ReportId"])
            a="".join(r["ABN"].split()).replace("-","")
            if len(a)!=11 or not a.isdecimal():
                continue
            digits=[int(x) for x in a]
            digits[0]-=1
            if sum(v*w for v,w in zip(digits,(10,1,3,5,7,9,11,13,15,17,19)))%89:
                continue
            try:
                period=PERIODS.index((r["Reporting Period Start Date"],r["Reporting Period End Date"]))
                submitted=datetime.fromisoformat(r["Submitted date"])
            except (ValueError,KeyError):
                continue
            if submitted.date()>date(2026,11,1):
                continue
            versions.append({**r,"abn":a,"period":period,"submitted":submitted})
    first,last={},{}
    for r in sorted(versions,key=lambda z:(z["submitted"],z["ReportId"])):
        key=(r["abn"],r["period"])
        first.setdefault(key,r)
        last[key]=r
    reconstructed={}
    for (entity,period),a in first.items():
        b=last.get((entity,period+1))
        if b is None or a["Revised Report"]!="No":
            continue
        lead=(datetime.fromisoformat(b["Reporting Period End Date"])-a["submitted"]).total_seconds()/86400
        if lead<90 or not all((range_valid(a,LOW,HIGH),range_valid(a,FL,FH),range_valid(b,LOW,HIGH))):
            continue
        current=number(a,HIGH)-number(a,LOW)
        forecast=number(a,FH)-number(a,FL)
        target=number(b,HIGH)-number(b,LOW)
        reconstructed[(a["ReportId"],b["ReportId"])]=dict(
            abn=entity,period=period,lead_days=lead,spread=current,forecast_spread=forecast,
            next_spread=target,planned_spread_change=forecast-current,
            actual_spread_change=target-current,forecast_gain=abs(target-current)-abs(target-forecast),
            change_mean_days=number(b,MEAN)-number(a,MEAN),
            change_on_time_pp=number(b,ON)-number(a,ON),
            actual_min_change=number(b,LOW)-number(a,LOW),actual_max_change=number(b,HIGH)-number(a,HIGH),
            current=a,target=b)
    saved=rows(ROOT/"data/au-policy-harmonization-transitions.csv")
    actual={(r["ReportId"],r["next_ReportId"]):r for r in saved}
    if len(actual)!=len(saved) or set(actual)!=set(reconstructed):
        raise AssertionError("Independent transition keys differ")
    checked=0
    for key,r in reconstructed.items():
        for col in ("period","lead_days","spread","forecast_spread","next_spread",
                    "planned_spread_change","actual_spread_change","forecast_gain",
                    "change_mean_days","change_on_time_pp","actual_min_change","actual_max_change"):
            a,b=r[col],number(actual[key],col)
            if not (math.isnan(a) and math.isnan(b)) and not math.isclose(a,b,abs_tol=1e-9,rel_tol=1e-10):
                raise AssertionError((key,col,a,b))
            checked+=1
        if (actual[key]["abn"]!=r["abn"]
                or actual[key]["_source_row"]!=r["current"]["_source_row"]
                or actual[key]["next__source_row"]!=r["target"]["_source_row"]):
            raise AssertionError("Original source-row provenance differs")
    results=json.loads((ROOT/"analysis/au-policy-harmonization-pilot.json").read_text())
    reg_checks=[]
    for target in ("mean_days","on_time_pp"):
        data=[]
        for r in reconstructed.values():
            a=r["current"]
            v=[r["change_"+target],r["spread"],number(a,MODE),number(a,MEAN),number(a,ON)]
            if all(map(math.isfinite,v)) and 0<=v[4]<=100 and v[3]>=0:
                data.append((r,v))
        entities=[r[0]["abn"] for r in data]
        counts={e:entities.count(e) for e in set(entities)}
        periods=sorted({r[0]["period"] for r in data})
        x=np.array([[1,int(r["planned_spread_change"]<=-7),*v[1:],
                     *[int(r["period"]==p) for p in periods[1:]]] for r,v in data])
        y=np.array([v[0] for _,v in data])
        w=np.array([1/counts[e] for e in entities])
        q,rr=np.linalg.qr(x*np.sqrt(w)[:,None],mode="reduced")
        beta=np.linalg.solve(rr,q.T@(y*np.sqrt(w)))
        inverse=np.linalg.solve(rr,np.eye(rr.shape[0]))
        bread=inverse@inverse.T
        scores=x*(w*(y-x@beta))[:,None]
        meat=np.zeros((x.shape[1],x.shape[1]))
        for e in counts:
            v=scores[np.array(entities)==e].sum(axis=0)
            meat+=np.outer(v,v)
        n,k=x.shape
        g=len(counts)
        covariance=g/(g-1)*(n-1)/(n-k)*bread@meat@bread
        se=float(np.sqrt(covariance[1,1]))
        stored=next(a for a in results["associative_regressions"] if a["outcome"]==target)
        if not math.isclose(float(beta[1]),stored["planned_contraction_coefficient"],abs_tol=1e-7):
            raise AssertionError("QR coefficient differs")
        if not math.isclose(se,stored["cluster_se"],abs_tol=1e-7):
            raise AssertionError("QR cluster SE differs")
        reg_checks.append({"outcome":target,"rows":n,"groups":g,"rank":int(np.linalg.matrix_rank(x)),
                           "qr_coefficient":float(beta[1]),"qr_cluster_se":se})
    planned=[r for r in reconstructed.values() if r["planned_spread_change"]<=-7]
    result={"status":"independent source-pair, endpoint, timing and QR/cluster verification passed",
            "source_calendar_parent_versions":len(versions),"primary_pairs":len(reconstructed),
            "primary_groups":len({r["abn"] for r in reconstructed.values()}),
            "numeric_cells_checked":checked,"planned_contraction_rows":len(planned),
            "planned_contraction_groups":len({r["abn"] for r in planned}),
            "actual_contraction_ge7_fraction":sum(r["actual_spread_change"]<=-7 for r in planned)/len(planned),
            "regressions":reg_checks}
    (ROOT/"records/au-policy-harmonization-verification.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2))


if __name__=="__main__":
    main()
