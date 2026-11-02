"""Independent arithmetic/source checks for the frozen segment pilot.

The additional joint ABN bootstrap refits both training models on every draw.
It resamples whole group histories, keeping training and test dependence within
groups. Inference conditions on these calendar periods and revised snapshot.
"""
import os
for key in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[key] = "1"
import ast
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]


def main():
    original=ROOT/"data/au-payment-times-register-2026-10-30.xlsx"
    receipt=json.loads((ROOT/"records/au-register-download-receipt.json").read_text())
    digest=hashlib.sha256(original.read_bytes()).hexdigest()
    assert digest==receipt["sha256"]
    source=pd.read_csv(ROOT/"data/au-register-extracts/aasb8_report.csv",dtype=str,keep_default_na=False).set_index("_source_row")
    d=pd.read_csv(ROOT/"data/au-stable-segment-panel.csv",dtype={"abn":str,"_source_row":str})
    assert not d.duplicated(["abn","segment","period"]).any()
    for _,row in d.iterrows():
        actual=source.loc[row._source_row]
        assert actual.ReportId==row.ReportId
        assert abs(float(actual["Payments 30 days or less"])-row.group30)<1e-9
        assert abs(float(actual["Operating Segment Payments 30 days or less"])-row.segment30)<1e-9
    groups=sorted(d.abn.unique())
    statistics=[]
    for g in groups:
        f=d[d.abn.eq(g)].pivot(index="segment",columns="period",values=["group30","segment30"])
        # Different code path from the original merge: matrix pivot by exact key.
        current_g=f["group30"][[0,1]].to_numpy().T.ravel()
        current_s=f["segment30"][[0,1]].to_numpy().T.ravel()
        target=f["segment30"][[1,2]].to_numpy().T.ravel()
        x=np.column_stack([np.ones(len(target)),current_g-50,current_s-current_g])
        y=target-current_g
        w=1/len(target)
        q=x.T@x*w
        v=x.T@y*w
        test_g=f["group30"][2].to_numpy()
        test_s=f["segment30"][2].to_numpy()
        test_y=f["segment30"][3].to_numpy()
        xt=np.column_stack([np.ones(len(test_y)),test_g-50,test_s-test_g])
        statistics.append((q,v,xt,test_y-test_g))
    def estimate(multiplicities):
        q=sum(n*z[0] for n,z in zip(multiplicities,statistics))
        v=sum(n*z[1] for n,z in zip(multiplicities,statistics))
        local=np.linalg.lstsq(q,v,rcond=None)[0]
        base=np.linalg.lstsq(q[:2,:2],v[:2],rcond=None)[0]
        gains=[]
        for _,_,x,y in statistics:
            gains.append(np.abs(x[:,:2]@base-y).mean()-np.abs(x@local-y).mean())
        return base,local,np.dot(multiplicities,gains)/sum(multiplicities)
    base,local,point=estimate(np.ones(len(groups),dtype=int))
    original_result=json.loads((ROOT/"analysis/au-segment-information-pilot.json").read_text())["primary_model"]
    assert np.allclose(local,original_result["training"]["with_local"]["coefficients"],atol=1e-9)
    assert abs(point-original_result["paired_absolute_gain_pp"]["mean"])<1e-9
    rng=np.random.default_rng(20261102)
    draw=[]
    for _ in range(1999):
        multiplicities=np.bincount(rng.integers(0,len(groups),len(groups)),minlength=len(groups))
        draw.append(estimate(multiplicities)[2])
    out={"source_sha256":digest,"source_hash_matches_receipt":True,"source_rows_checked":len(d),
         "independent_pivot_normal_equations_coefficients":local.tolist(),
         "independent_gain_pp":float(point),
         "joint_group_history_bootstrap_refits_models":{
             "draws":1999,"seed":20261102,"groups":len(groups),
             "ci95_percentile_gain_pp":np.quantile(draw,[.025,.975]).tolist(),
             "interpretation":"ABN histories resampled, both models refit; calendar time and revised-snapshot availability are conditioned upon"}}
    for path in (ROOT/"analysis").glob("*.py"):
        ast.parse(path.read_text(encoding="utf-8-sig"),filename=str(path))
    for path in (ROOT/"records").glob("au-*.json"):
        json.loads(path.read_text(encoding="utf-8-sig"))
    (ROOT/"records/au-pilot-verification.json").write_text(json.dumps(out,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps(out,indent=2))


if __name__=="__main__":
    main()
