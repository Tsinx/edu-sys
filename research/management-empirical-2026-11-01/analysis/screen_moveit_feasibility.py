"""Assess the observed stage support of all65obtained packets, without regression.

The screen reports original-notice assertions, not verified delivery. It retains
plans/templates/rolling cohorts instead of silently converting them to actual dates.
"""
import collections
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def delta(end, start):
    return (dt.date.fromisoformat(end) - dt.date.fromisoformat(start)).days


def main():
    initial = json.loads((ROOT / "records/moveit-stage-coding.json").read_text(encoding="utf-8"))
    extra = json.loads((ROOT / "records/moveit-additional-packet-screen.json").read_text(encoding="utf-8"))
    rows = initial["packets"] + extra["packets"]
    idx = {r["id"]: r for r in rows}
    for correction in extra["corrections_to_first20"]:
        idx[correction["id"]][correction["field"]] = correction["value"]
    receipt = json.loads((ROOT / "records/moveit-notice-receipt.json").read_text(encoding="utf-8"))
    assert len(rows) == len(idx) == len(receipt) == 65
    assert set(idx) == {r["id"][:10] for r in receipt}

    # Strict main subset: retrospective assertion of an initiated postal mailing,
    # excluding rolling aggregate endpoints, mixed channels, plans and dated templates.
    actual = [r for r in rows if r["consumer_status"] == "actual"]
    alert_pairs, scope_pairs = [], []
    for row in actual:
        lo, hi = row["consumer_low"], row["consumer_high"]
        common = {"id": row["id"], "org": row["org"], "host": row["host"],
                  "mail_low": lo, "mail_high": hi,
                  "source_date_precision": row.get("date_precision", "date_only_as_reported")}
        if row.get("client_alert"):
            alert_pairs.append({**common, "alert": row["client_alert"],
                                "days_low": delta(lo, row["client_alert"]),
                                "days_high": delta(hi, row["client_alert"])})
        if row.get("scope_identified"):
            scope_pairs.append({**common, "scope": row["scope_identified"],
                                "scope_basis": row.get("scope_basis", "see_original_first20coding_note"),
                                "days_low": delta(lo, row["scope_identified"]),
                                "days_high": delta(hi, row["scope_identified"])})
    hosts = collections.defaultdict(list)
    for row in alert_pairs:
        hosts[row["host"]].append(row["org"])
    output = {
        "obtained_packets": len(receipt),
        "focused_stage_screens": len(rows),
        "independent_double_coding": False,
        "outcome_status_counts": dict(collections.Counter(r["consumer_status"] for r in rows)),
        "strict_actual_postal_start_assertions": len(actual),
        "strict_actual_hosts": dict(collections.Counter(r["host"] for r in actual)),
        "client_alert_and_actual_mail": alert_pairs,
        "within_host_client_alert_support": dict(hosts),
        "stated_scope_and_actual_mail": scope_pairs,
        "direct_warning": [
            "Client alert content differs: a possible incident, affected files, identified people and a completed policy schedule are not the same informational state.",
            "A same-host regression cannot repair these differences or infer an unobserved delegation/approval date.",
            "No current matched comparison proves customers mailed before the compromised operator's own customers; some operator dates are plans.",
            "Same incident, same parent, recipient batch and repeated templates create dependence; file count is not effective sample size.",
            "These support counts qualify the pilot, not the entire19,771-record corpus or all possible original sources."
        ],
        "decision": "Retain original records and process measurement lead. The65-packet sample alone does not identify a credible causal effect of outsourcing or delegated approval. Complete direct-neighbor readings and seek independently measured governance/variation before claiming a high-level management contribution."
    }
    (ROOT / "analysis/moveit-feasibility-screen.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in output.items() if k not in {"stated_scope_and_actual_mail", "client_alert_and_actual_mail"}}, indent=2))


if __name__ == "__main__":
    main()
