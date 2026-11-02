"""Exploratory checks specified after the first frozen AU segment pilot."""
import os
for key in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[key] = "1"
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.optimize import linprog
from probe_au_segment_information import (ROOT, GB, SB, GM, SM, PERIODS, prepare,
                                           bootstrap, conservative_unallocated_bound)

ON = "Percentage of SB invoices paid within Payment Term"
SON = "Operating Segment Percentage of SB invoices paid within Payment Term"
TERM = "Common Payment Terms (days)"
STERM = "Operating Segment Common Payment Terms (days)"
GROUP_FEATURES = GB[:1] + GM + [ON, TERM]
OUTCOMES = [("p30", GB[0], SB[0], True), ("mean_days", GM[0], SM[0], False),
            ("within_terms", ON, SON, True)]


def paired(frame, group_col, local_col):
    d = frame.copy()
    for col in list(dict.fromkeys(GROUP_FEATURES + [group_col, local_col, STERM])):
        d[col] = pd.to_numeric(d[col], errors="coerce")
    d["local_y"] = d[local_col]
    d["group_y"] = d[group_col]
    d["local_gap"] = d.local_y - d.group_y
    d["term_gap"] = d[STERM] - d[TERM]
    cols = ["abn", "segment", "period", "ReportId", "local_y", "group_y", "local_gap", "term_gap"] + GROUP_FEATURES
    cols = list(dict.fromkeys(cols))
    a = d[cols].copy()
    nex = d[["abn", "segment", "period", "local_y", "ReportId"]].rename(
        columns={"local_y":"target", "period":"next_period", "ReportId":"next_report"})
    nex["period"] = nex.next_period-1
    p = a.merge(nex, on=["abn","segment","period"],validate="one_to_one")
    numeric = list(dict.fromkeys(GROUP_FEATURES + ["group_y", "local_gap", "term_gap", "target"]))
    p = p[np.isfinite(p[numeric].to_numpy(float)).all(axis=1)].copy()
    p = p[p[ON].between(0,100) & p[TERM].ge(0) & (p.term_gap + p[TERM]).ge(0)]
    if local_col in [SB[0],SON]:
        p = p[p.target.between(0,100) & p.local_y.between(0,100)]
    else:
        p = p[p.target.ge(0) & p.local_y.ge(0)]
    return p


def weights(frame):
    return 1/frame.abn.map(frame.groupby("abn").size()).to_numpy(float)


def ridge_fit(x, y, w, penalty):
    total = w.sum()
    center = (x*w[:,None]).sum(axis=0)/total
    scale = np.sqrt((((x-center)**2)*w[:,None]).sum(axis=0)/total)
    scale[scale < 1e-8] = 1
    z = np.column_stack([np.ones(len(x)),(x-center)/scale])
    regularizer = np.diag([0]+[penalty]*x.shape[1])
    beta = np.linalg.pinv(z.T@(w[:,None]*z)+regularizer)@(z.T@(w*y))
    return center,scale,beta


def ridge_predict(fit, x):
    center,scale,beta = fit
    return np.column_stack([np.ones(len(x)),(x-center)/scale])@beta


def grouped_cv(train, cols, bounded):
    fold = train.abn.map(lambda v:int(hashlib.sha256(v.encode()).hexdigest()[:8],16)%5)
    x, y = train[cols].to_numpy(float),train.target.to_numpy(float)
    scores = {}
    for penalty in [0,.01,.1,1,10,100]:
        errors = np.full(len(train),np.nan)
        for k in range(5):
            fit_mask,test_mask = fold.ne(k).to_numpy(),fold.eq(k).to_numpy()
            if not fit_mask.any() or not test_mask.any():
                continue
            fit = ridge_fit(x[fit_mask],y[fit_mask],weights(train.iloc[np.flatnonzero(fit_mask)]),penalty)
            prediction = np.maximum(0,ridge_predict(fit,x[test_mask]))
            if bounded:
                prediction = np.minimum(prediction,100)
            errors[test_mask] = np.abs(prediction-y[test_mask])
        scoring = pd.DataFrame({"abn":train.abn.to_numpy(),"error":errors})
        scores[penalty] = float(scoring.groupby("abn").error.mean().mean())
    chosen = min(scores,key=scores.get)
    return chosen,scores,ridge_fit(x,y,weights(train),chosen)


def evaluate(frame, outcome):
    label,gcol,scol,bounded=outcome
    p = paired(frame,gcol,scol)
    train,test = p[p.period.isin([0,1])].copy(),p[p.period.eq(2)].copy()
    if min(train.abn.nunique(),test.abn.nunique()) < 10:
        return {"status":"too few groups"},pd.DataFrame()
    group_cols = list(dict.fromkeys(["group_y"]+GROUP_FEATURES))
    local_cols = group_cols+["local_gap","term_gap"]
    details = {}
    for name,cols in [("group_only",group_cols),("with_local",local_cols)]:
        chosen,scores,fit=grouped_cv(train,cols,bounded)
        pred=np.maximum(0,ridge_predict(fit,test[cols].to_numpy(float)))
        if bounded:
            pred=np.minimum(100,pred)
        test["prediction_"+name]=pred
        test["abs_"+name]=np.abs(pred-test.target)
        test["sq_"+name]=(pred-test.target)**2
        details[name]={"features":cols,"chosen_penalty":chosen,"grouped_training_cv_mae":scores,
                       "holdout_group_equal_mae":float(test.groupby("abn")["abs_"+name].mean().mean()),
                       "holdout_group_equal_mse":float(test.groupby("abn")["sq_"+name].mean().mean()),
                       "holdout_segment_equal_mae":float(test["abs_"+name].mean())}
    test["absolute_gain"]=test.abs_group_only-test.abs_with_local
    gains=test.groupby("abn").absolute_gain.mean()
    result={"outcome":label,"training_rows":len(train),"training_groups":int(train.abn.nunique()),
            "holdout_rows":len(test),"holdout_groups":int(test.abn.nunique()),"models":details,
            "absolute_gain":bootstrap(gains),"fraction_groups_improved":float(gains.gt(0).mean())}
    test["outcome"]=label
    return result,test


def bound_checks(raw):
    cases=[([80,10,10],[[80,10,10]],0),
           ([70,20,10],[[80,10,10]],.125),
           ([50,25,25],[[20,40,40],[80,10,10]],0),
           ([0,0,100],[[100,0,0]],1)]
    checks=[]
    for a,b,exact in cases:
        value=conservative_unallocated_bound(a,b)
        if value is None or value > exact+1e-7 or abs(value-exact)>.001:
            raise AssertionError((a,b,exact,value))
        checks.append({"group_bands":a,"segments":b,"analytic_exact_bound":exact,"rounded_relaxation_bound":value})
    ok=raw.groupby("ReportId").row_eligible.all()
    sensitivity=[]
    for rid,frame in raw[raw.ReportId.isin(ok[ok].index)].groupby("ReportId"):
        active=frame[frame.valid_segment & ~frame.nil_segment]
        if active.empty:
            continue
        a=active[GB].iloc[0].to_numpy(float)/100
        b=active[SB].to_numpy(float)/100
        # The broader interval also accommodates whole-percentage-point input.
        rounding=.5/100
        lo,hi=np.maximum(b-rounding,0),np.minimum(b+rounding,1)
        alo,ahi=np.maximum(a-rounding,0),np.minimum(a+rounding,1)
        matrix=np.vstack([np.column_stack([lo.T,np.eye(3)]),-np.column_stack([hi.T,np.eye(3)])])
        vector=np.r_[ahi,-alo]
        c=np.r_[np.zeros(len(b)),np.ones(3)]
        fit=linprog(c,A_ub=matrix,b_ub=vector,A_eq=np.ones((1,len(c))),b_eq=[1],bounds=[(0,None)]*len(c),method="highs")
        if fit.success:
            residual=max(np.max(matrix@fit.x-vector),abs(fit.x.sum()-1),-fit.x.min())
            if residual>1e-7:
                raise AssertionError("LP feasibility residual")
            sensitivity.append({"ReportId":rid,"abn":frame.abn.iloc[0],"broad_rounding_bound":max(0,float(fit.fun))})
    d=pd.DataFrame(sensitivity)
    d.to_csv(ROOT/"data/au-unallocated-bounds-rounding-sensitivity.csv",index=False)
    return {"analytic_checks":checks,"strict_distribution_reports":len(d),
            "broad_rounding_half_percentage_point":{
                "bound_above_0_1pct":int(d.broad_rounding_bound.gt(.001).sum()),
                "bound_above10pct":int(d.broad_rounding_bound.gt(.1).sum()),
                "entities_bound_above10pct":int(d.loc[d.broad_rounding_bound.gt(.1),"abn"].nunique())}}


def historical_screen():
    base=pd.read_csv(ROOT/"data/au-baseline-group-members.csv",dtype=str,keep_default_na=False)
    match=pd.read_csv(ROOT/"data/au-group-linkage-pilot.csv",dtype=str,keep_default_na=False)
    bands=[c for c in base.columns if c.startswith("Percentage of Number Invoices Paid")]
    numeric=base[bands].apply(pd.to_numeric,errors="coerce")
    good=(numeric.ge(0)&numeric.le(100)).all(axis=1) & numeric.sum(axis=1,min_count=6).sub(100).abs().le(.030001)
    d=base[good].copy()
    d["p30"]=numeric.loc[good,bands[:2]].sum(axis=1)
    # Resolve bands by their labels, never assumed CSV column order.
    d["p30"]=numeric.loc[good,"Percentage of Number Invoices Paid Within 20 Days "]+numeric.loc[good,"Percentage of Number Invoices Paid Between 21 and 30 Days"]
    groups=d.groupby("group_abn").agg(active_reporters=("abn","nunique"),minimum=("p30","min"),maximum=("p30","max"))
    groups=groups[groups.active_reporters.ge(2)].copy()
    groups["range_pp"]=groups.maximum-groups.minimum
    links=groups.merge(match[["abn","Business Name","Type","ReportId"]],left_index=True,right_on="abn",validate="one_to_one")
    links.to_csv(ROOT/"data/au-active-historical-group-links.csv",index=False)
    table=[]
    for kind,frame in links.groupby("Type"):
        table.append({"new_type":kind,"groups":len(frame),"old_active_reporters":int(frame.active_reporters.sum()),
                      "median_old_range_pp":float(frame.range_pp.median()),"groups_old_range_over20pp":int(frame.range_pp.gt(20).sum())})
    return {"baseline_valid_active_entities":len(d),"matched_groups_two_or_more_active":len(links),"by_new_type":table,
            "interpretation":"One-hop historical ABN relation and exact new parent ABN; no certified stable ownership, unchanged payment population, or causal reform effect."}


def main():
    raw,clean,primary,sample=prepare(.015001)
    results,tests={},[]
    for sample_name,frame in [("stable_four_period",primary),("adjacent_matches",clean[clean.period.ge(0)])]:
        results[sample_name]={}
        for outcome in OUTCOMES:
            result,test=evaluate(frame,outcome)
            results[sample_name][outcome[0]]=result
            test["sample"]=sample_name
            tests.append(test)
    pd.concat(tests,ignore_index=True).to_csv(ROOT/"data/au-information-followup-holdout.csv",index=False)
    out={"status":"exploratory strengthening after first P30 pilot","sample":sample,
         "information_models":results,"allocation_checks":bound_checks(raw),"historical_links":historical_screen()}
    (ROOT/"analysis/au-information-followup.json").write_text(json.dumps(out,indent=2,allow_nan=False),encoding="utf-8")
    compact={name:{outcome:{"n":z.get("holdout_rows"),"groups":z.get("holdout_groups"),
                           "mae_group":z.get("models",{}).get("group_only",{}).get("holdout_group_equal_mae"),
                           "mae_local":z.get("models",{}).get("with_local",{}).get("holdout_group_equal_mae"),
                           "gain":z.get("absolute_gain")} for outcome,z in values.items()} for name,values in results.items()}
    print(json.dumps({"models":compact,"allocation":out["allocation_checks"],"historical_links":out["historical_links"]},indent=2))


if __name__ == "__main__":
    main()
