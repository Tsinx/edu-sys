"""Describe manually verified stages without converting a source audit into a causal study."""
import collections
import datetime as dt
import json
import pathlib
import statistics

ROOT = pathlib.Path(__file__).resolve().parents[1]


def days(end, start):
    return (dt.date.fromisoformat(end) - dt.date.fromisoformat(start)).days


def summarize(values):
    return {"n": len(values), "min": min(values), "median": statistics.median(values),
            "mean": statistics.mean(values), "max": max(values)} if values else {"n": 0}


def main():
    coding = json.loads((ROOT / "records/moveit-stage-coding.json").read_text(encoding="utf-8"))
    source_rows = [json.loads(line) for line in (ROOT / "data/breach-tracker-incidents-2026-11-01.jsonl").read_text(encoding="utf-8").splitlines()]
    source = {row["id"][:10]: row for row in source_rows}
    exact, after_alert, corrections = [], [], []
    for packet in coding["packets"]:
        low, high = packet["consumer_low"], packet["consumer_high"]
        if packet["consumer_status"] != "actual":
            continue
        if packet.get("scope_identified") and low == high:
            exact.append({"org": packet["org"], "host": packet["host"],
                          "scope_basis": "client_data_impact" if packet["id"] in {"a214d496a2", "89edfaf2e6"} else "affected_people_identified",
                          "scope_date": packet["scope_identified"], "mail_date": low,
                          "days_after_stated_scope_milestone": days(low, packet["scope_identified"])})
        if packet.get("client_alert"):
            after_alert.append({"org": packet["org"], "host": packet["host"],
                                "days_min": days(low, packet["client_alert"]),
                                "days_max": days(high, packet["client_alert"])})
        corrections.append({"org": packet["org"], "corpus_disclosed": source[packet["id"]]["disclosed_date"],
                            "actual_mail_low": low, "actual_mail_high": high,
                            "corpus_minus_mail_min_days": days(source[packet["id"]]["disclosed_date"], high),
                            "corpus_minus_mail_max_days": days(source[packet["id"]]["disclosed_date"], low)})
    result = {
        "audit_packets": len(coding["packets"]),
        "outcome_status": dict(collections.Counter(p["consumer_status"] for p in coding["packets"])),
        "exact_scope_to_mailing": exact,
        "stated_scope_to_mailing_summary_heterogeneous_milestones": summarize([r["days_after_stated_scope_milestone"] for r in exact]),
        "affected_people_identified_to_mailing_only": summarize([r["days_after_stated_scope_milestone"] for r in exact if r["scope_basis"] == "affected_people_identified"]),
        "client_alert_to_mailing": after_alert,
        "corpus_date_comparisons_actual_only": corrections,
        "interpretation": "Small nonindependently double-coded source audit. Scope milestones differ: client-data impact versus identification of affected people, reported separately. Neither means all uncertainty is resolved. Describes observed stages and measurement feasibility, not a population delay estimate, causal outsourcing effect, policy effect, or proof of intentional withholding.",
    }
    (ROOT / "analysis/notification-stage-pilot.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
