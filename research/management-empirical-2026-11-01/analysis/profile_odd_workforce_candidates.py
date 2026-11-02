"""Validate the expanded extracts and profile pre-event support, without effects."""
import os
for key in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[key] = "1"
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/odd"
KEYS = ["rcid", "year", "soccode_final", "_source_row"]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    receipt = json.loads((ROOT / "records/odd-workforce-candidate-extraction.json").read_text())
    path = DATA / "workforce-candidates-composition.csv"
    frame = pd.read_csv(path, keep_default_na=False)
    if digest(path) != receipt["tables"]["composition"]["sha256"]:
        raise ValueError("Composition extract changed")
    if frame.duplicated(KEYS[:3]).any() or frame._source_row.duplicated().any():
        raise ValueError("Duplicate source keys or ordinals")
    checks = {}
    for kind in ("promotion", "turnover"):
        path = DATA / f"workforce-candidates-{kind}.csv"
        other = pd.read_csv(path, keep_default_na=False)
        if digest(path) != receipt["tables"][kind]["sha256"]:
            raise ValueError(f"{kind} extract changed")
        for field in KEYS + ["total_rcid_year", "percent_with_photo", "soccode_label"]:
            if not frame[field].equals(other[field]):
                raise ValueError(f"{kind}: key, metadata or row alignment differs: {field}")
        values = other[f"total_{kind}"].to_numpy()
        if not np.isfinite(values).all() or (values < 0).any() or not np.equal(values, np.floor(values)).all():
            raise ValueError("Invalid event counts")
        frame[f"total_{kind}"] = values
        checks[kind] = {"all_keys_and_source_ordinals_equal": True,
                        "counts_above_cell_stock": int((values > frame.total_rcid_year.to_numpy()).sum())}
        del other
    stock = frame.total_rcid_year.to_numpy()
    if not np.isfinite(stock).all() or (stock <= 0).any():
        raise ValueError("Invalid source stocks")
    frame["group"] = np.where(frame.soccode_label.str.startswith("15-1"), "computer", "other")
    agg = frame.groupby(["rcid", "year", "group"], observed=True).agg(
        observed_count=("total_rcid_year", "sum"), promotions=("total_promotion", "sum"),
        movements=("total_turnover", "sum"), occupation_cells=("soccode_final", "size"))
    firmyears = frame.groupby(["rcid", "year"]).agg(
        observed_count=("total_rcid_year", "sum"), occupation_cells=("soccode_final", "size"))
    agg.to_csv(DATA / "workforce-candidates-firmyear-role-counts.csv")
    links = pd.read_csv(DATA / "breach-name-links.csv", keep_default_na=False)
    events = (links[links.has_primary_registry_link.eq(True)].sort_values("disclosed_date")
              .drop_duplicates("rcid"))
    support = []
    for event in events.itertuples():
        identity = int(event.rcid)
        year = int(event.disclosed_date[:4])
        try:
            total = firmyears.loc[identity].observed_count
            computer = agg.loc[(identity, slice(None), "computer"), "observed_count"]
            computer.index = computer.index.droplevel([0, 2])
        except KeyError:
            total = firmyears.loc[identity].observed_count if identity in firmyears.index.levels[0] else pd.Series(dtype=float)
            computer = pd.Series(dtype=float)
        pre = [year - 3, year - 2, year - 1]
        post = [year + 1, year + 2]
        support.append({"rcid": identity, "company": event.mapped_company,
                        "provisional_year": year, "provisional_date": event.disclosed_date,
                        "three_pre_firmyears": all(t in total.index for t in pre),
                        "two_post_firmyears": all(t in total.index for t in post),
                        "pre_mean_observed_count": float(total.reindex(pre, fill_value=0).mean()),
                        "pre_mean_computer_count": float(computer.reindex(pre, fill_value=0).mean()),
                        "government_linked_records": int((links.rcid.eq(identity) & links.has_primary_registry_link.eq(True)).sum())})
    support = pd.DataFrame(support)
    support["pre_support_50_5"] = (support.three_pre_firmyears & support.pre_mean_observed_count.ge(50)
                                    & support.pre_mean_computer_count.ge(5))
    support.to_csv(DATA / "workforce-candidates-source-support.csv", index=False)
    qualifying = support[support.pre_support_50_5]
    summary = {"status": "expanded source-support profile, no incident-effect estimate",
               "original_cell_rows": len(frame), "observed_company_ids": int(frame.rcid.nunique()),
               "unique_firmyears": len(firmyears), "duplicate_keys": 0,
               "cross_file_alignment": checks, "government_candidate_companies": len(support),
               "three_pre_firmyears": int(support.three_pre_firmyears.sum()),
               "pre_support_50_total_5_computer": len(qualifying),
               "of_pre_qualified_two_post_firmyears": int(qualifying.two_post_firmyears.sum()),
               "post_coverage_rule": "Post-event availability is reported, not used to select the pre-supported candidate set.",
               "definition": "SOC15-1 computer occupations, not a security-specialist or identified individual cohort.",
               "candidate_dates": "Earliest government-linked record in the 2010-2021 corpus window; all require source timing and perimeter checks.",
               "cohort_counts": {str(int(k)): int(v) for k,v in qualifying.provisional_year.value_counts().sort_index().items()},
               "files": {p.name: digest(p) for p in [DATA / "workforce-candidates-firmyear-role-counts.csv",
                                                      DATA / "workforce-candidates-source-support.csv"]}}
    (ROOT / "records/odd-workforce-candidate-support.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
