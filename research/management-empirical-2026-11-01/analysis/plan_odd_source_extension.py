"""Freeze an additional source-review cohort using pre-event support only."""
import hashlib
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def main():
    support_path = ROOT / "data/odd/workforce-candidates-source-support.csv"
    frame = pd.read_csv(support_path)
    original = json.loads((ROOT / "records/odd-breach-source-plan.json").read_text())
    eligible = frame[frame.pre_support_50_5 & ~frame.rcid.isin(original["targets"])].copy()
    eligible["selection_hash"] = eligible.rcid.map(
        lambda x: hashlib.sha256(f"odd-supported-source-20261101:{int(x)}".encode()).hexdigest())
    selected = eligible.sort_values("selection_hash").head(60)
    plan = {"stage": "after all32 obtained original pilot packets were source-read and expanded pre-support was profiled; before any incident-effect coefficient",
            "purpose": "source-validate technical event, organization link, and role-specific timing in a pre-supported cohort",
            "algorithm": "first60 by SHA256(odd-supported-source-20261101:<rcid>) among475 pre-supported candidates, excluding all original40 source targets",
            "support_rule": "all3 pre-firmyears, pre-mean observed total>=50 and SOC15-1 computer>=5; chosen after initial40 support audit, exploratory",
            "post_rule": "No post-event outcome, effect direction or p value used for selection; post availability not a selection criterion",
            "support_input_sha256": hashlib.sha256(support_path.read_bytes()).hexdigest(),
            "eligible_after_original40_exclusion": len(eligible),
            "targets": list(map(int, selected.rcid)),
            "target_metadata": selected[["rcid", "company", "provisional_year", "provisional_date",
                                          "pre_mean_observed_count", "pre_mean_computer_count", "selection_hash"]].to_dict("records"),
            "source_rule": "Original regulator PDF for earliest linked government record2010-2021; keep failed/no-PDF cases, no replacement",
            "coding": "Separate own technical, upstream technical, shared hosting, administrative, insider and unknown cases. Do not substitute detection, review completion, planned mailing or document-production code for actual disclosure.",
            "inference": "Identity is a conservative company-name linkage, not certified legal perimeter. Repeated common vendors are shared shocks, not independent treatments."}
    path = ROOT / "records/odd-supported-source-plan.json"
    if path.exists() and json.loads(path.read_text()) != plan:
        raise ValueError("Refusing to replace a different fixed source cohort")
    path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(json.dumps({"selected": len(selected), "eligible": len(eligible),
                      "first12": selected[["rcid", "company", "provisional_year"]].head(12).to_dict("records")}, indent=2))


if __name__ == "__main__":
    main()
