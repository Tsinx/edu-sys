"""Build the portable learner materials. Does not copy raw SUPAS microdata."""
from pathlib import Path
import hashlib
import json
import zipfile
import nbformat as nbf

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "apps/teacher-web/public/course-assets/statistical-analysis/project-12-13"
M, C = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell


def save(name, cells):
    notebook = nbf.v4.new_notebook(cells=cells, metadata={
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.13"},
    })
    # Stable cell IDs avoid nondeterministic changes on rebuild.
    for i, cell in enumerate(notebook.cells):
        cell.id = f"{name.split('.')[0]}-{i:02d}"
    nbf.validate(notebook)
    nbf.write(notebook, DEST / name)


setup = C('''from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from inpres_project import (load_data, prepare, main_sample, four_cells, did,
                            fit_wls, estimate, ar_confidence, SHA256)
OUT = Path("results")
OUT.mkdir(exist_ok=True)
plt.rcParams.update({"figure.figsize": (9, 4.8), "font.size": 11,
                     "axes.spines.top": False, "axes.spines.right": False})
TEAL, AMBER = "#197f7a", "#b87921"
def save_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2,
                                      allow_nan=False) + "\\n", encoding="utf-8")
''')

save("01_did.ipynb", [
 M("""# 第12讲｜小学建设改变教育了吗？

一份真实数据的项目教程。目标：从1995年SUPAS公开处理版，构造地区强度×年龄队列的四格比较，再检查其解释边界。

跟做顺序：P1资料核查 → P2四格表 → P3加权DID → P4队列图 → P5设计核查 → P6备忘录。
这不是原论文全部结果的复制。图中横轴是1974年年龄，不是政策后的日历年。

## 准备
先按README建立Python环境。第一次运行需联网下载固定版本并核对SHA-256，之后可断网运行。
每个单元按顺序执行。代码完整提供；请把时间用在核对、解释与小幅修改上。"""),
 setup,
 M("""## P1｜载入与审核（课件第7页）
一行是一位1995年受访者。先查看关键列与缺失；不使用整表dropna把教育样本提前限制为工资样本。
数据源与处理边界见`DATA.md`。如果校验失败，先核查来源，不替换数据追数值。"""),
 C('''raw = load_data()
df = prepare(raw)
s = main_sample(df)
w = main_sample(df, wage=True)
audit = {"sha256": SHA256, "raw_rows": len(raw), "valid_rows": len(df),
         "education_sample": len(s), "wage_sample": len(w),
         "wage_missing_in_eligible": len(s)-len(w),
         "districts": int(s.district.nunique())}
assert (len(raw), len(df), len(s), len(w)) == (152990, 152989, 78470, 31061)
assert df.source_row.is_unique
save_json("audit.json", audit)
display(pd.Series(audit, name="audit"))
display(raw[["yeduc", "lhwage", "p504thn", "weight"]].isna().sum().to_frame("missing"))'''),
 M("""## P2｜四格表（课件第14页）
`high`沿用来源中的`recp`；`young`为1974年2—6岁，年长比较组为12—17岁。
实际人数不加权；教育均值使用调查观测权重。它不是倾向得分权重。
先核对四格、人数与均值，再看差分。"""),
 C('''cells = four_cells(s)
cell_table = pd.DataFrame(cells)
assert len(cell_table) == 4 and int(cell_table.n.sum()) == len(s)
cell_table.to_csv(OUT / "did_cells.csv", index=False)
display(cell_table.round({"mean": 6}))
delta = did(cells)
print(f"加权四格DID = {delta:.6f} 教育年")'''),
 M("""### 观察两段队列差额
线段连接不同人的队列均值，不是同一人的成长轨迹。纵轴使用聚焦尺度，必须在图注中说明。
保存这张图，并用一句话说明第二次相减扣除了什么。"""),
 C('''fig, ax = plt.subplots()
for high, color, label, marker in [(1, AMBER, "High intensity", "o"),
                                  (0, TEAL, "Low intensity", "s")]:
    g = cell_table[cell_table.high.eq(high)].sort_values("young")
    ax.plot(g.young, g["mean"], marker=marker, color=color, label=label)
ax.set(xticks=[0, 1], xticklabels=["Age 12-17 in 1974", "Age 2-6 in 1974"],
       ylabel="Weighted years of education", ylim=(6, 10),
       title="1995 SUPAS: cohort means (focused y-axis)")
ax.legend(frameon=False)
fig.tight_layout()
fig.savefig(OUT / "did_means.png", dpi=160)
plt.show()'''),
 M("""## P3｜回归与手算核对（课件第22页）
同样本、同权重、同控制，`z`系数应等于四格DID。
按出生地区计算CR1聚类方差，并用t(G−1)构造95%区间；这没有重建完整复杂抽样设计。"""),
 C('''fit = fit_wls("yeduc ~ high + young + z", s)
result = estimate(fit, "z", s)
assert abs(result["beta"] - delta) < 1e-8
assert result["n"] == 78470 and result["clusters"] == 290
save_json("did_results.json", result)
display(pd.DataFrame([result]))'''),
 M("""### 读出结果，而不改写结果
点估计约0.036年，95%地区聚类区间跨0。不能写成精确确认教育增加，也不能反向说已证明建校没有作用。
因果解释另外依赖跨队列平行变化、合理暴露与样本构成等条件。

## P4｜队列暴露剖面（课件第29页）
每个年龄与high交互；12岁为规范化基期。点和逐点95%区间，不是联合置信带。"""),
 C('''profile = fit_wls("yeduc ~ high * C(age74, Treatment(reference=12))", df)
cohorts = []
for age in range(24, 1, -1):
    if age == 12:
        row = {"beta": 0.0, "ci": [0.0, 0.0]}
    else:
        term = f"high:C(age74, Treatment(reference=12))[T.{float(age)}]"
        row = estimate(profile, term, df)
    cohorts.append({"age74": age, **row})
cp = pd.DataFrame(cohorts)
cp.to_csv(OUT / "cohort_profile.csv", index=False)
fig, ax = plt.subplots()
estimated = cp[cp.age74.ne(12)]
yerr = np.array([[r.beta-r.ci[0], r.ci[1]-r.beta]
                 for r in estimated.itertuples()]).T
ax.errorbar(estimated.age74, estimated.beta, yerr=yerr, fmt="o",
            color=TEAL, capsize=3, markersize=4)
ax.plot([12], [0], "D", color=AMBER, label="Reference age 12 (normalized)")
ax.axhline(0, color="gray", linewidth=1)
ax.set(xlim=(24.7, 1.3), xlabel="Age in 1974 (older to younger)",
       ylabel="High-low education gap relative to age 12 (years)",
       title="Cohort exposure profile: pointwise 95% district-cluster intervals")
ax.legend(frameon=False)
fig.tight_layout()
fig.savefig(OUT / "cohort_profile.png", dpi=160)
plt.show()'''),
 M("""### 安慰剂与权重敏感性
较老队列的12—17岁与18—24岁比较，不能证明年轻队列反事实成立。年龄跨度不同，不直接作偏差扣除。
加权/不加权结果都保留，不选更显著的一行。"""),
 C('''older = df[df.age74.between(12, 24)].copy()
older["old12to17"] = older.age74.between(12, 17).astype(int)
older["placebo_z"] = older.old12to17 * older.high
placebo = estimate(fit_wls("yeduc ~ high + old12to17 + placebo_z", older),
                    "placebo_z", older)
unweighted = estimate(fit_wls("yeduc ~ high + young + z", s, False), "z", s)
save_json("did_diagnostics.json", {"placebo": placebo, "unweighted": unweighted})
display(pd.DataFrame([{"model": "weighted", **result},
                      {"model": "unweighted", **unweighted},
                      {"model": "older-cohort placebo", **placebo}]))'''),
 M("""## P5｜设计核查（课件第36页）
打开`vibe-coding-prompts.md`的第12讲提示，核查结果列、分组、权重、聚类、样本与坐标。
无AI也可以逐项完成。把你自己的发现写入`results/design_check.md`。

不要让AI把年龄队列改成日历年份，不要复制行制造面板，不要写“未显著所以平行趋势已被证明”。

## P6｜自己的研究备忘录（课件第43页）
在`results/memo_did.md`中写150—250字：对象与比较、关键估计与区间、队列图含义、一项具体风险、一项资料需求。

## 完成检查与下讲接口
重启内核并从头运行；保留audit、四格表、结果JSON、两张图与自己的文字。
下一讲用同一资料的工资完整样本。教育主样本的DID不能直接借作工资IV的第一阶段。

来源：[Duflo (2001)](https://www.aeaweb.org/articles?id=10.1257/aer.91.4.795)；
[公开处理版说明与后续复核](https://github.com/droodman/Duflo-2001)。
本Notebook没有估计日历事件研究：缺少政策实施前后逐期结果。"""),
])

save("02_iv.ipynb", [
 M("""# 第13讲｜从建校差异到教育回报

继续同一INPRES项目。目标：共同工资样本 → 工具条件 → 第一阶段与简约式 → 2SLS → 弱工具与AR集合 → 研究备忘录。

不是以得到显著正系数为成功标准。当前简化规格的工具很弱，要保留这个结果。

## 准备
使用README中的相同环境与目录。即使刚运行完01，也从本Notebook第一格重新开始，避免隐藏状态。"""),
 setup,
 M("""## P7｜共同工资样本（课件第6页）
工资缺失不补0；`lhwage`已是自然对数，不再次取对数。所有阶段使用相同观察、权重和外部控制。"""),
 C('''df = prepare(load_data())
w = main_sample(df, wage=True)
assert len(w) == 31061 and w.district.nunique() == 290
assert w[["yeduc", "lhwage", "high", "young", "z", "weight"]].notna().all().all()
sample_audit = {"n": len(w), "districts": int(w.district.nunique()),
                "weight": "survey observation weight", "controls": ["high", "young"],
                "endogenous": "yeduc", "instrument": "z=high*young"}
pd.DataFrame([sample_audit]).to_csv(OUT / "sample_iv.csv", index=False)
display(pd.Series(sample_audit))'''),
 M("""## P8｜候选工具的条件（课件第14页）
先写`iv_assumptions.md`：相关性准备计算什么；外生比较根据什么；哪条Z→Y直接通路可能破坏排除限制。
教育年限是多值变量，不能机械把IV斜率说成所有人的ATE或简单二元处理LATE。

### 同样本OLS基线
保留关联斜率，不预先给它因果名称。"""),
 C('''ols_fit = fit_wls("lhwage ~ high + young + yeduc", w)
ols_result = estimate(ols_fit, "yeduc", w)
display(pd.DataFrame([ols_result]))'''),
 M("""## P9｜第一阶段、简约式与比率（课件第22页）
π的单位是教育年，ρ的单位是log工资。先核查共同样本，不把01中的教育主样本差分当分母。
比率点估计有代数对应，不代表可以把两个区间端点相除。"""),
 C('''first = fit_wls("yeduc ~ high + young + z", w)
reduced = fit_wls("lhwage ~ high + young + z", w)
pi, rho = first.params["z"], reduced.params["z"]
wald = rho / pi
stages = {"first": estimate(first, "z", w),
          "reduced": estimate(reduced, "z", w), "ratio": float(wald)}
save_json("stages.json", stages)
display(pd.DataFrame([{"equation": "first stage", **stages["first"]},
                      {"equation": "reduced form", **stages["reduced"]}]))
print(f"rho / pi = {wald:.6f}")'''),
 M("""## P10｜正式2SLS与算法核对（课件第29页）
两次WLS可以理解点估计，第二阶段普通SE不能替代IV方差。
下列公式外部是外生控制，方括号内是内生变量与排除工具。
显示区间显式使用t(290−1)，不是不加说明地复制软件默认区间。"""),
 C('''from linearmodels.iv import IV2SLS
iv = IV2SLS.from_formula(
    "lhwage ~ 1 + high + young + [yeduc ~ z]", w,
    weights=w["weight"]).fit(cov_type="clustered", clusters=w["district"], debiased=True)
iv_result = estimate(iv, "yeduc", w)
assert abs(iv_result["beta"] - wald) < 1e-8
diagnostics = iv.first_stage.diagnostics
display(diagnostics)
display(pd.DataFrame([{"model": "OLS", **ols_result}, {"model": "2SLS", **iv_result}]))
save_json("iv_results.json", {"sample": sample_audit, "ols": ols_result, "iv": iv_result,
                             "diagnostics": diagnostics.reset_index().to_dict("records")})'''),
 M("""### 点与常规区间一起保留
本图只是常规区间；当前第一阶段弱，不能替代接下来的AR集合。两种估计器大小不同，不证明某个更接近真值。"""),
 C('''fig, ax = plt.subplots()
for y, label, model, color in [(1, "OLS association", ols_result, TEAL),
                              (0, "2SLS conventional CI", iv_result, AMBER)]:
    b = model["beta"]
    ax.errorbar(b, y, xerr=[[b-model["ci"][0]], [model["ci"][1]-b]],
                fmt="o", color=color, capsize=5)
ax.axvline(0, color="gray", linewidth=1)
ax.set(yticks=[0, 1], yticklabels=["2SLS", "OLS"], ylim=(-.7, 1.7),
       xlabel="Log hourly wage per year of education",
       title="Same wage sample: conventional 95% district-cluster intervals")
fig.tight_layout()
fig.savefig(OUT / "iv_comparison.png", dpi=160)
plt.show()'''),
 M("""## P11｜弱工具与AR检验反演（课件第36页）
不先除以π。对候选β₀回归Y−β₀S，检验z还能否解释剩余结果。
单工具线性模型可以用联合聚类协方差解二次不等式；函数保留无限端，不用有限网格边界冒称区间。
这仍依赖工具有效性；渐近聚类AR不是排除限制的检验。"""),
 C('''ar = ar_confidence(w, first, reduced)
assert ar["kind"] == "all-real"
display(pd.Series(ar))
save_json("ar_confidence.json", ar)
# 用直接回归独立核查若干候选值，并非靠这几个值认定整个集合。
candidate_checks = []
for beta0 in [-10.0, -1.0, 0.0, float(wald), 1.0, 10.0]:
    candidate = w.assign(ar_outcome=w.lhwage.astype(float)-beta0*w.yeduc.astype(float))
    ar_fit = fit_wls("ar_outcome ~ high + young + z", candidate)
    t2 = float(ar_fit.tvalues["z"]**2)
    expected = (rho-beta0*pi)**2 / (
        reduced.bse["z"]**2 + beta0**2*first.bse["z"]**2
        - 2*beta0*ar["covarianceRF_FS"])
    assert np.isclose(t2, expected, rtol=1e-5, atol=1e-7)
    candidate_checks.append({"beta0": beta0, "cluster_t2": t2,
                             "accepted_95": bool(t2 <= ar["critical2"])})
display(pd.DataFrame(candidate_checks))'''),
 M("""### 解释本项目的实际结果
AR的95%集合为全体实数：这条简化工具没有给出有限的信息性教育回报范围。
不是证明效应为零，也不是程序运行失败。

### 权重敏感性
不加权结果作为预先保留的比较，不据结果选择权重。"""),
 C('''iv_u = IV2SLS.from_formula("lhwage ~ 1 + high + young + [yeduc ~ z]", w).fit(
    cov_type="clustered", clusters=w.district, debiased=True)
unweighted_iv = estimate(iv_u, "yeduc", w)
save_json("iv_sensitivity.json", {"weighted": iv_result, "unweighted": unweighted_iv})
display(pd.DataFrame([{"weights": "survey", **iv_result},
                      {"weights": "none", **unweighted_iv}]))'''),
 M("""## P12｜研究备忘录（课件第43页）
写`results/memo_iv.md`，并把两讲整合为`memo.md`：

1. 地区×队列DID：教育主样本、结果、估计对象与条件。
2. 工资样本：第一阶段、简约式、2SLS，不能混用全体教育样本分母。
3. 第一阶段弱，AR集合无有限信息边界；并列讨论排除限制与工资样本选择。
4. 一项具体后续资料需求，而不是自动搜索显著规格。

## 重跑与交接
重启内核从头运行；核对文件、n、权重、控制、聚类与区间类型。保存自己的第一版，不用参考答案覆盖。

来源：[Duflo (2001)](https://www.aeaweb.org/articles?id=10.1257/aer.91.4.795)；
[Roodman复核](https://arxiv.org/abs/2207.09036)；
[linearmodels公式与推断接口](https://bashtage.github.io/linearmodels/iv/examples/basic-examples.html)。
本模型不复制原论文全部规格，也不因为工具来自政策就视为随机实验。"""),
])

(DEST / "prepare_data.py").write_text('''"""课前下载与校验，不运行回归。"""
from inpres_project import load_data, SHA256
data = load_data()
print(f"数据准备完成：{data.shape}；SHA-256 {SHA256}；后续可断网运行。")
''', encoding="utf-8")

# Production intentionally excludes loose Markdown authoring files. Student
# reading links use text copies; Markdown originals remain inside the ZIP.
for stem in ["README", "vibe-coding-prompts"]:
    source = DEST / f"{stem}.md"
    if source.exists():
        (DEST / f"{stem}.txt").write_text(source.read_text(encoding="utf-8"), encoding="utf-8")

# Explicit allowlist: student pack never contains teacher transcripts or raw microdata.
names = ["01_did.ipynb", "02_iv.ipynb", "inpres_project.py", "prepare_data.py",
         "requirements.txt", "requirements-verified.txt", "README.md", "DATA.md",
         "vibe-coding-prompts.md", "memo-template.md", "reference-results.json"]
if all((DEST / n).exists() for n in names):
    with zipfile.ZipFile(DEST / "project-12-13.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            entry = zipfile.ZipInfo(f"inpres-project/{name}", date_time=(2026, 10, 21, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, (DEST / name).read_bytes())
    manifest = {name: hashlib.sha256((DEST/name).read_bytes()).hexdigest() for name in names}
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Built 2 notebooks and student ZIP ({len(names)} files); raw data not redistributed.")
else:
    print("Built 2 notebooks; write project documentation before packaging ZIP.")
