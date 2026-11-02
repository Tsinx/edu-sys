"""Frozen chronological pilot of organizational payment-information granularity.

All statistical weights below describe equal-group/equal-segment estimands,
not invoice weights. Source data are never edited. No real-time availability
or causal effect is inferred from the revised register snapshot.
"""
import os
for variable in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[variable] = "1"
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.optimize import linprog
from scipy.stats import t as student_t

ROOT = Path(__file__).resolve().parents[1]
PERIODS = [("2024-07-01", "2024-12-31"), ("2025-01-01", "2025-06-30"),
           ("2025-07-01", "2025-12-31"), ("2026-01-01", "2026-06-30")]
GB = ["Payments 30 days or less", "Payments 31 - 60 days", "Payments more than 60 days"]
SB = ["Operating Segment Payments 30 days or less", "Operating Segment Payments 31-60 days",
      "Operating Segment Payments 60 days or more"]
GM = ["Average Payment Time (days)", "Median Payment Time (days)",
      "80th Percentile Payment Time (days)", "95th Percentile Payment Time (days)"]
SM = ["Operating Segment " + c for c in GM]


def finite_json(x):
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        return float(x) if np.isfinite(x) else None
    raise TypeError(type(x).__name__)


def distribution_ok(values, tolerance):
    return (np.isfinite(values).all(axis=1) & (values >= 0).all(axis=1)
            & (values <= 100).all(axis=1) & (np.abs(values.sum(axis=1) - 100) <= tolerance))


def timing_ok(values):
    return (np.isfinite(values).all(axis=1) & (values >= 0).all(axis=1)
            & (values[:, 1] <= values[:, 2]) & (values[:, 2] <= values[:, 3]))


def prepare(tolerance=0.020001):
    raw = pd.read_csv(ROOT / "data/au-register-extracts/aasb8_report.csv", dtype=str, keep_default_na=False)
    parent = pd.read_csv(ROOT / "data/au-new-report-panel.csv", dtype=str, keep_default_na=False)
    d = raw[raw.ReportId.isin(set(parent.loc[parent.Type.eq("AASB8"), "ReportId"]))].copy()
    d["segment"] = d["Operating Segment"].str.strip().str.casefold().str.replace(r"\s+", " ", regex=True)
    d["abn"] = d.ABN.str.replace(r"[\s-]", "", regex=True)
    duplicates = set(d.loc[d.duplicated(["ReportId", "segment"], keep=False), "ReportId"])
    d["period"] = -1
    for period, (start, end) in enumerate(PERIODS):
        d.loc[d["Reporting Period Start Date"].eq(start) & d["Reporting Period End Date"].eq(end), "period"] = period
    for c in GB + SB + GM + SM:
        d[c] = pd.to_numeric(d[c], errors="coerce")
    d["nil_segment"] = d[SB].eq(0).all(axis=1)
    d["valid_segment"] = (distribution_ok(d[SB].to_numpy(), tolerance)
                           & timing_ok(d[SM].to_numpy()) & d.segment.ne(""))
    d["valid_group"] = distribution_ok(d[GB].to_numpy(), tolerance) & timing_ok(d[GM].to_numpy())
    d["row_eligible"] = (d.valid_group & (d.nil_segment | d.valid_segment)
                           & d["Redacted report"].eq("No") & ~d.ReportId.isin(duplicates))
    complete_ids = set(d.groupby("ReportId").row_eligible.all().loc[lambda z: z].index)
    clean = d[d.ReportId.isin(complete_ids) & d.valid_segment & ~d.nil_segment].copy()
    active = clean.groupby("ReportId").size()
    multi = set(active[active.ge(2)].index)
    clean = clean[clean.ReportId.isin(multi)].copy()
    stable = []
    for entity, frame in clean[clean.period.ge(0)].groupby("abn"):
        sets = {int(period): set(g.segment) for period, g in frame.groupby("period")}
        if set(sets) == set(range(4)) and all(sets[i] == sets[0] for i in range(1, 4)):
            stable.append(entity)
    primary = clean[clean.abn.isin(stable) & clean.period.ge(0)].copy()
    primary["group30"] = primary[GB[0]]
    primary["segment30"] = primary[SB[0]]
    primary["local_deviation"] = primary.segment30 - primary.group30
    audit = {"tolerance_pp": tolerance, "latest_raw_segment_rows": len(d),
             "duplicate_name_report_ids": sorted(duplicates), "nil_rows": int(d.nil_segment.sum()),
             "complete_unredacted_valid_report_ids": len(complete_ids),
             "complete_multi_active_report_ids": int(clean.ReportId.nunique()),
             "complete_multi_active_groups": int(clean.abn.nunique()),
             "stable_four_period_groups": len(stable), "stable_segment_keys": int(primary[["abn", "segment"]].drop_duplicates().shape[0]),
             "primary_rows": len(primary)}
    return d, clean, primary, audit


def transitions(primary):
    cols = ["abn", "segment", "period", "ReportId", "group30", "segment30", "local_deviation"]
    now = primary[cols].copy()
    nex = now.rename(columns={"period": "next_period", "ReportId": "next_ReportId",
                              "group30": "next_group30", "segment30": "next_segment30",
                              "local_deviation": "next_local_deviation"})
    nex["period"] = nex.next_period - 1
    return now.merge(nex, on=["abn", "segment", "period"], how="inner", validate="one_to_one")


def fit_wls(frame, local=True):
    y = (frame.next_segment30 - frame.group30).to_numpy(float)
    x = np.column_stack([np.ones(len(frame)), frame.group30.to_numpy() - 50])
    if local:
        x = np.column_stack([x, frame.local_deviation])
    group = frame.abn.to_numpy()
    counts = frame.groupby("abn").size()
    weights = np.array([1.0 / counts[a] for a in group])
    xtwx = x.T @ (weights[:, None] * x)
    inverse = np.linalg.pinv(xtwx)
    beta = inverse @ (x.T @ (weights * y))
    residual = y - x @ beta
    meat = np.zeros((x.shape[1], x.shape[1]))
    for entity in np.unique(group):
        mask = group == entity
        score = x[mask].T @ (weights[mask] * residual[mask])
        meat += np.outer(score, score)
    clusters, n, k = len(np.unique(group)), len(frame), x.shape[1]
    correction = clusters / (clusters - 1) * (n - 1) / (n - k)
    variance = correction * inverse @ meat @ inverse
    se = np.sqrt(np.maximum(np.diag(variance), 0))
    critical = student_t.ppf(0.975, clusters - 1)
    result = {"n": n, "clusters": clusters, "rank": int(np.linalg.matrix_rank(xtwx)),
              "terms": ["intercept", "group30_centered50"] + (["local_deviation"] if local else []),
              "coefficients": beta.tolist(), "cluster_se_cr1": se.tolist(),
              "ci95_t_clusters_minus1": np.column_stack([beta-critical*se, beta+critical*se]).tolist()}
    # Independent weighted least-squares solution as a numerical cross-check.
    other = np.linalg.lstsq(np.sqrt(weights)[:, None] * x, np.sqrt(weights) * y, rcond=None)[0]
    result["lstsq_max_difference"] = float(np.max(np.abs(beta - other)))
    return beta, result


def predict(frame, beta):
    x = np.column_stack([np.ones(len(frame)), frame.group30.to_numpy() - 50])
    if len(beta) == 3:
        x = np.column_stack([x, frame.local_deviation])
    return frame.group30.to_numpy() + x @ beta


def bootstrap(values):
    values = np.asarray(values, float)
    rng = np.random.default_rng(20261101)
    means = np.mean(values[rng.integers(0, len(values), size=(1999, len(values)))], axis=1)
    return {"mean": float(values.mean()), "ci95_percentile_block_bootstrap": np.quantile(means, [.025, .975]).tolist(),
            "groups": len(values), "draws": 1999}


def run_model(primary):
    pairs = transitions(primary)
    training, test = pairs[pairs.period.isin([0, 1])].copy(), pairs[pairs.period.eq(2)].copy()
    if training.abn.nunique() < 10 or test.abn.nunique() < 10:
        return {"status": "too few groups for declared pilot", "training": len(training), "test": len(test)}, test
    base_beta, base = fit_wls(training, False)
    local_beta, local = fit_wls(training, True)
    test["pred_group_model"] = predict(test, base_beta)
    test["pred_local_model"] = predict(test, local_beta)
    test["pred_group_persistence"] = test.group30
    test["pred_segment_persistence"] = test.segment30
    metrics = {}
    for model in ["group_model", "local_model", "group_persistence", "segment_persistence"]:
        error = test["pred_"+model] - test.next_segment30
        test["abs_"+model] = np.abs(error)
        test["sq_"+model] = error**2
        metrics[model] = {"group_equal_mae_pp": float(test.groupby("abn")["abs_"+model].mean().mean()),
                          "group_equal_mse_pp2": float(test.groupby("abn")["sq_"+model].mean().mean()),
                          "segment_equal_mae_pp": float(test["abs_"+model].mean()),
                          "predictions_outside_0_100": int((test["pred_"+model].lt(0) | test["pred_"+model].gt(100)).sum())}
    test["paired_absolute_gain_pp"] = test.abs_group_model - test.abs_local_model
    test["paired_squared_gain_pp2"] = test.sq_group_model - test.sq_local_model
    gains = test.groupby("abn").paired_absolute_gain_pp.mean()
    loo = [(gains.sum()-v)/(len(gains)-1) for v in gains]
    contemporaneous = float(np.corrcoef(pairs.local_deviation, pairs.next_local_deviation)[0, 1])
    return {"status": "chronological diagnostic, not a causal or real-time backtest",
            "training": {"group_only": base, "with_local": local},
            "holdout_segments": len(test), "holdout_groups": int(test.abn.nunique()), "holdout_metrics": metrics,
            "paired_absolute_gain_pp": bootstrap(gains),
            "paired_squared_gain_pp2": bootstrap(test.groupby("abn").paired_squared_gain_pp2.mean()),
            "group_fraction_absolute_error_improved": float(gains.gt(0).mean()),
            "leave_one_group_out_absolute_gain_range_pp": [float(min(loo)), float(max(loo))],
            "raw_adjacent_local_deviation_correlation": contemporaneous}, test


def conservative_unallocated_bound(group, segments):
    """Outer-relaxation LP with independent +/-0.005pp rounding intervals.

    Nonnegative segment mass w and residual band masses r must sum to one.
    Mean/quantile information and unknown invoice counts are not used.
    The relaxation can only understate the required residual mass if all
    published bands refer to the same group and segment payment populations.
    It is not an estimate of actual overhead payments or evidence of intent.
    """
    rounding = 0.0050001 / 100
    a = np.asarray(group, float)/100
    b = np.asarray(segments, float)/100
    lo, hi = np.maximum(b-rounding, 0), np.minimum(b+rounding, 1)
    a_lo, a_hi = np.maximum(a-rounding, 0), np.minimum(a+rounding, 1)
    m = len(b)
    # w * segment lower + residual <= group upper;
    # -(w * segment upper + residual) <= -group lower.
    bounds_matrix = np.vstack([np.column_stack([lo.T, np.eye(3)]),
                               -np.column_stack([hi.T, np.eye(3)])])
    bounds_vector = np.concatenate([a_hi, -a_lo])
    objective = np.r_[np.zeros(m), np.ones(3)]
    fit = linprog(objective, A_ub=bounds_matrix, b_ub=bounds_vector,
                  A_eq=np.ones((1,m+3)), b_eq=[1], bounds=[(0,None)]*(m+3), method="highs")
    return float(max(0,fit.fun)) if fit.success else None


def main():
    raw, clean, primary, audit = prepare()
    primary.to_csv(ROOT/"data/au-stable-segment-panel.csv", index=False)
    model, holdout = run_model(primary)
    holdout.to_csv(ROOT/"data/au-segment-holdout.csv", index=False)
    sensitivity = {}
    for label, tolerance in [("rounding_0.015001",0.015001), ("rounding_0.050001",0.050001)]:
        _, _, frame, sample = prepare(tolerance)
        result, _ = run_model(frame)
        sensitivity[label] = {"sample": sample, "pilot": result}
    # Entire groups with any extreme segment in any period are excluded here;
    # selection is explicitly a sensitivity and is not the primary estimand.
    extreme = set(primary.loc[primary.segment30.isin([0,100]), "abn"])
    result, _ = run_model(primary[~primary.abn.isin(extreme)])
    sensitivity["exclude_groups_with_any_extreme_segment"] = result
    spreads = clean.groupby("ReportId").agg(
        abn=("abn","first"), group30=(GB[0],"first"), n=("segment","size"),
        minimum=(SB[0],"min"), maximum=(SB[0],"max"))
    spreads["range"] = spreads.maximum-spreads.minimum
    descriptive = {"median_range_p30_pp": float(spreads["range"].median()),
                   "report_periods_range_above20pp": int(spreads["range"].gt(20).sum())}
    # Full distributions, including single-active-segment reports. Require all
    # source segment rows (including nils) to pass the complete-report screen.
    report_ok = raw.groupby("ReportId").row_eligible.all()
    allocation = []
    for reportid, frame in raw[raw.ReportId.isin(report_ok[report_ok].index)].groupby("ReportId"):
        active = frame[frame.valid_segment & ~frame.nil_segment]
        if active.empty:
            continue
        bound = conservative_unallocated_bound(active[GB].iloc[0].to_numpy(), active[SB].to_numpy())
        allocation.append({"ReportId": reportid, "abn": frame.abn.iloc[0],
                           "name": frame["Business Name"].iloc[0], "end": frame["Reporting Period End Date"].iloc[0],
                           "segments": len(active), "conditional_minimum_unallocated_mass": bound,
                           "source_rows": ",".join(frame._source_row.astype(str))})
    allocation = pd.DataFrame(allocation)
    allocation.to_csv(ROOT/"data/au-unallocated-bounds.csv", index=False)
    out = {"source_workbook_sha256": hashlib.sha256((ROOT/"data/au-payment-times-register-2026-10-30.xlsx").read_bytes()).hexdigest(),
           "frozen_plan_sha256": hashlib.sha256((ROOT/"records/au-segment-pilot-plan.json").read_bytes()).hexdigest(),
           "sample": audit, "descriptive": descriptive, "primary_model": model,
           "sensitivity": sensitivity,
           "allocation_screen": {"complete_report_periods": len(allocation), "groups": int(allocation.abn.nunique()),
                                 "lp_infeasible": int(allocation.conditional_minimum_unallocated_mass.isna().sum()),
                                 "conditional_bound_above_0_1pct": int(allocation.conditional_minimum_unallocated_mass.gt(.001).sum()),
                                 "conditional_bound_above10pct": int(allocation.conditional_minimum_unallocated_mass.gt(.1).sum()),
                                 "interpretation": "A mathematical lower bound under a common population and complete reported segments; omitted overhead is permitted. Inconsistent submissions can also generate a positive bound."}}
    (ROOT/"analysis/au-segment-information-pilot.json").write_text(json.dumps(out, indent=2, default=finite_json, allow_nan=False), encoding="utf-8")
    print(json.dumps({"sample": audit, "descriptive": descriptive, "primary_model": model,
                      "allocation_screen": out["allocation_screen"]}, indent=2))


if __name__ == "__main__":
    main()
