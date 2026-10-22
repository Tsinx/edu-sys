"""统计分析方法 12—13 讲：可读、可复算的 INPRES 教学项目。

原始资料：1995 SUPAS 的公开处理版，不是作者的完整复制包。
首次运行按固定版本下载到 data/；校验成功后可断网运行。
不上传数据、不启动服务、不并行拟合、不自动寻找显著规格。
"""
from pathlib import Path
import hashlib
import json
import os
import urllib.request

# Keep numerical libraries to one thread before importing numpy/scipy.
for _key in ("OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "OMP_NUM_THREADS"):
    os.environ[_key] = "1"
import numpy as np
import pandas as pd
from scipy.stats import t
import statsmodels.formula.api as smf
from linearmodels.iv import IV2SLS
from threadpoolctl import threadpool_limits

# A Notebook may have imported numpy before this module. Enforce the limit on
# already-loaded BLAS/OpenMP libraries too, rather than only setting env vars.
_NUMERIC_THREAD_LIMIT = threadpool_limits(limits=1)

COMMIT = "c3b4868a66ab908f8fd09354e0439fed4cb92085"
URL = f"https://raw.githubusercontent.com/droodman/Duflo2001/{COMMIT}/inpresdata.dta"
SHA256 = "1a0be1709ef2ed7e182b02b13da9791f4300a94818b4f13efea3e6868a984e5a"
ROOT = Path(__file__).resolve().parent


def load_data(path=None):
    """原始字节不改写；先验 hash 校验防止课堂上悄悄换数据。"""
    path = Path(path) if path else ROOT / "data/inpresdata.dta"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(URL, headers={"User-Agent": "INPRES-teaching-project/1.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read(25_000_001)
        if len(payload) > 25_000_000:
            raise ValueError("下载超过25 MB，请核查来源，不继续运行。")
        if hashlib.sha256(payload).hexdigest() != SHA256:
            raise ValueError("来源校验失败，不保存或改用其他数据。")
        path.write_bytes(payload)
    if hashlib.sha256(path.read_bytes()).hexdigest() != SHA256:
        raise ValueError("SHA-256不一致：请保留当前文件并核查，不自动覆盖。")
    return pd.read_stata(path, convert_categoricals=False)


def prepare(raw):
    """一行是一名受访者；source_row 仅为本文件行号，不是追踪个人ID。"""
    d = raw.copy()
    # Source stores several columns as float32. Compute means, square-root
    # weights and matrix products in float64, without changing source values.
    for column in ["yeduc", "lhwage", "weight", "recp"]:
        d[column] = d[column].astype(float)
    d["source_row"] = np.arange(len(d)) + 1
    d["birth_year"] = 1900 + d["p504thn"]
    d["age74"] = 1974 - d["birth_year"]
    d["high"] = d["recp"]  # 来源预定义的高强度地区，不按结果重分组
    d["district"] = d["birthpl"].astype(int)
    d["young"] = d["age74"].between(2, 6).astype(int)
    d["z"] = d["high"] * d["young"]
    d = d.dropna(subset=["yeduc", "birth_year", "weight", "high"])
    assert d["weight"].gt(0).all()
    assert d["high"].isin([0, 1]).all()
    assert d.groupby("district")["high"].nunique().max() == 1
    assert d["source_row"].is_unique
    return d


def main_sample(d, wage=False):
    s = d[d["age74"].between(2, 6) | d["age74"].between(12, 17)].copy()
    return s.dropna(subset=["lhwage"]).copy() if wage else s


def fit_wls(formula, sample, weighted=True):
    """权重是调查观测权重；不冒称倾向得分权重或完整复杂抽样方差。"""
    return smf.wls(formula, sample, weights=sample["weight"] if weighted else np.ones(len(sample))).fit(
        cov_type="cluster", cov_kwds={"groups": sample["district"]}, use_t=True)


def estimate(model, term, sample):
    beta = float(model.params[term])
    errors = model.bse if hasattr(model, "bse") else model.std_errors
    se = float(errors[term])
    groups = int(sample["district"].nunique())
    critical = float(t.ppf(.975, groups - 1))
    return dict(beta=beta, se=se, ci=[beta-critical*se, beta+critical*se],
                n=len(sample), clusters=groups, df=groups-1)


def four_cells(sample, outcome="yeduc", weighted=True):
    rows = []
    for high in [0, 1]:
        for young in [0, 1]:
            g = sample[(sample.high == high) & (sample.young == young)]
            rows.append(dict(high=high, young=young, n=len(g), mean=float(np.average(
                g[outcome].to_numpy(dtype=float), weights=g.weight.to_numpy(dtype=float) if weighted else None))))
    return rows


def did(cells):
    m = {(r["high"], r["young"]): r["mean"] for r in cells}
    return (m[1, 1]-m[1, 0])-(m[0, 1]-m[0, 0])


def ar_confidence(sample, first, reduced):
    """单工具的聚类 AR 检验反演；不把弱第一阶段下的 Wald 区间当稳健区间。

    用联合聚类 sandwich 得到 (reduced-form, first-stage) 的协方差，
    反演 (rho-b*pi)^2 <= t_(G-1)^2 Var(rho-b*pi)，不裁掉无界端。
    这是本教学线性模型的渐近聚类AR集合，不是弱识别/排除限制的证明。
    """
    x = first.model.wexog
    bread = np.linalg.inv(x.T @ x)
    rf_score = x * np.asarray(reduced.wresid)[:, None]
    fs_score = x * np.asarray(first.wresid)[:, None]
    groups = sample.district.to_numpy()
    u = np.unique(groups)
    rf_sum = np.array([rf_score[groups == g].sum(axis=0) for g in u])
    fs_sum = np.array([fs_score[groups == g].sum(axis=0) for g in u])
    j = first.model.exog_names.index("z")
    correction = len(u)/(len(u)-1) * (len(sample)-1)/(len(sample)-x.shape[1])
    cov = float((bread @ rf_sum.T @ fs_sum @ bread)[j, j] * correction)
    rho, pi = float(reduced.params.z), float(first.params.z)
    vr, vp = float(reduced.cov_params().loc["z", "z"]), float(first.cov_params().loc["z", "z"])
    critical2 = float(t.ppf(.975, len(u)-1)**2)
    a, b, c = pi*pi-critical2*vp, -2*(rho*pi-critical2*cov), rho*rho-critical2*vr
    disc = b*b-4*a*c
    if disc < 0:
        kind, intervals = ("all-real", [[None, None]]) if a < 0 else ("empty", [])
    else:
        roots = sorted([(-b-np.sqrt(disc))/(2*a), (-b+np.sqrt(disc))/(2*a)])
        kind, intervals = ("bounded", [roots]) if a > 0 else ("disjoint-unbounded", [[None, roots[0]], [roots[1], None]])
    return dict(kind=kind, intervals=intervals, covarianceRF_FS=cov,
                quadratic=[a, b, c], critical2=critical2)


def analyze(raw):
    d = prepare(raw)
    s, w = main_sample(d), main_sample(d, wage=True)
    result = dict(source=dict(url=URL, commit=COMMIT, sha256=SHA256),
                  audit=dict(rawRows=len(raw), validRows=len(d), missingEducation=int(raw.yeduc.isna().sum()),
                             eligibleRows=len(s), wageRows=len(w), excludedWage=len(s)-len(w),
                             districtsAll=int(s.district.nunique()), districtsWage=int(w.district.nunique()),
                             allLhwageMissing=int(raw.lhwage.isna().sum())))
    result["cells"] = four_cells(s)
    result["wageSchoolCells"] = four_cells(w)
    result["wageCells"] = four_cells(w, "lhwage")
    result["education"] = estimate(fit_wls("yeduc ~ high + young + z", s), "z", s)
    first = fit_wls("yeduc ~ high + young + z", w)
    reduced = fit_wls("lhwage ~ high + young + z", w)
    result["first"] = estimate(first, "z", w)
    result["first"]["clusterT2"] = float(first.tvalues.z**2)
    result["reduced"] = estimate(reduced, "z", w)
    result["ols"] = estimate(fit_wls("lhwage ~ high + young + yeduc", w), "yeduc", w)
    iv = IV2SLS.from_formula("lhwage ~ 1 + high + young + [yeduc ~ z]", w, weights=w.weight).fit(
        cov_type="clustered", clusters=w.district, debiased=True)
    # The package covariance matches the stated CR1 model. We explicitly use t_(G-1)
    # for the displayed conventional interval instead of silently adopting its default df.
    result["iv"] = estimate(iv, "yeduc", w)
    result["ar"] = ar_confidence(w, first, reduced)
    result["diagnostics"] = iv.first_stage.diagnostics.reset_index().to_dict("records")
    result["unweighted"] = dict(
        education=estimate(fit_wls("yeduc ~ high + young + z", s, False), "z", s),
        first=estimate(fit_wls("yeduc ~ high + young + z", w, False), "z", w),
        reduced=estimate(fit_wls("lhwage ~ high + young + z", w, False), "z", w))
    unweighted_iv = IV2SLS.from_formula("lhwage ~ 1 + high + young + [yeduc ~ z]", w).fit(
        cov_type="clustered", clusters=w.district, debiased=True)
    result["unweighted"]["iv"] = estimate(unweighted_iv, "yeduc", w)
    placebo = d[d.age74.between(12, 24)].copy()
    placebo["old12to17"] = placebo.age74.between(12, 17).astype(int)
    placebo["placebo_z"] = placebo.old12to17*placebo.high
    result["placebo"] = estimate(fit_wls("yeduc ~ high + old12to17 + placebo_z", placebo), "placebo_z", placebo)
    profile = fit_wls("yeduc ~ high * C(age74, Treatment(reference=12))", d)
    result["cohorts"] = []
    for age in range(24, 1, -1):
        if age == 12:
            row = dict(beta=0., se=0., ci=[0., 0.])
        else:
            term = f"high:C(age74, Treatment(reference=12))[T.{float(age)}]"
            row = estimate(profile, term, d)
        result["cohorts"].append(dict(age74=age, birthYear=1974-age, **row))
    result["preview"] = d[["source_row", "district", "age74", "high", "yeduc", "lhwage"]].head(5).replace({np.nan: None}).to_dict("records")
    for cells, model in [(result["cells"], result["education"]), (result["wageSchoolCells"], result["first"]), (result["wageCells"], result["reduced"])]:
        assert np.isclose(did(cells), model["beta"], atol=1e-10)
    assert np.isclose(result["iv"]["beta"], result["reduced"]["beta"]/result["first"]["beta"], atol=1e-9)
    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "results/reference-results.json")
    args = parser.parse_args()
    results = analyze(load_data(args.data))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False)+"\n", encoding="utf-8")
    print(json.dumps({"audit": results["audit"], "education": results["education"],
                      "first": results["first"], "iv": results["iv"], "ar": results["ar"]}, ensure_ascii=False, indent=2))
