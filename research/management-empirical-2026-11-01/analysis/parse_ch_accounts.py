"""Extract supported iXBRL facts with contexts, units and explicit scale.

Facts with dimensions are kept separately. An undimensioned fact is NOT
automatically certified as individual-company data. No legal scope assignment
is made by this parser. Original statements require document-level review.
"""
from __future__ import annotations
from collections import Counter
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
X = "http://www.xbrl.org/2003/instance"
IX = {"http://www.xbrl.org/2013/inlineXBRL", "http://www.xbrl.org/2008/inlineXBRL"}
D = "http://xbrl.org/2006/xbrldi"
TAGS = {"TurnoverRevenue": "turnover", "Revenue": "turnover",
        "AverageNumberEmployeesDuringPeriod": "employees", "FixedAssets": "fixed_assets",
        "CurrentAssets": "current_assets", "Assets": "total_assets", "TotalAssets": "total_assets"}


def local(s):
    return s.rsplit("}", 1)[-1].split(":")[-1]


def parse_numeric(node):
    raw = "".join(node.itertext()).strip()
    fmt = local(node.get("format", ""))
    s = re.sub(r"[\s\u00a0]", "", raw)
    if fmt in ("numcommadot", "num-dot-decimal", "numdotdecimal", ""):
        s = s.replace(",", "")
    elif fmt in ("numdotcomma", "num-comma-decimal", "numcommadecimal"):
        s = s.replace(".", "").replace(",", ".")
    elif fmt in ("numdash", "fixed-zero", "zerodash") and s in ("-", "—", "–"):
        s = "0"
    else:
        return None, "unsupported_numeric_transform"
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        value = Decimal(s) * Decimal(10) ** int(node.get("scale", "0"))
    except (InvalidOperation, ValueError):
        return None, "unparsed_numeric"
    if node.get("sign") == "-":
        value = -value
    return float(value), "ok"


def extract(data, source, member):
    root = ET.fromstring(data)
    contexts = {}
    for c in root.iter(f"{{{X}}}context"):
        def txt(n):
            x = c.find(f".//{{{X}}}{n}")
            return x.text if x is not None else ""
        dims = [(m.get("dimension"), "".join(m.itertext()))
                for m in c.iter() if m.tag in (f"{{{D}}}explicitMember", f"{{{D}}}typedMember")]
        contexts[c.get("id")] = {"entity": txt("identifier"), "start": txt("startDate"),
                                  "end": txt("endDate"), "instant": txt("instant"),
                                  "dimensions": json.dumps(dims, ensure_ascii=False)}
    units = {u.get("id"): "|".join(m.text or "" for m in u.iter(f"{{{X}}}measure"))
             for u in root.iter(f"{{{X}}}unit")}
    facts, metadata = [], []
    for n in root.iter():
        if n.tag.split("}")[0].lstrip("{") not in IX:
            continue
        name = local(n.get("name", ""))
        if local(n.tag) == "nonNumeric" and re.search(
                "EntityCurrentLegal|EntityIsParent|ParentCompany|Consolidated|AccountsType|Dormant|AccountingStandards", name):
            metadata.append({"name": name, "context": n.get("contextRef"),
                             "text": "".join(n.itertext()).strip()[:1000]})
        if local(n.tag) != "nonFraction" or name not in TAGS:
            continue
        val, status = parse_numeric(n)
        c = contexts.get(n.get("contextRef"), {})
        facts.append({"source": source, "member": member,
                      "name": name, "variable": TAGS[name], "raw": "".join(n.itertext()).strip(),
                      "scale": n.get("scale", "0"), "sign": n.get("sign", ""),
                      "format": n.get("format", ""), "context": n.get("contextRef", ""),
                      "unit": units.get(n.get("unitRef"), ""), "value": val,
                      "status": status, **c})
    return facts, metadata


def main():
    batches = []
    daily = ROOT / "data/ch-accounts-bulk-2026-10-03.zip"
    receipt = json.loads((ROOT / "records/ch-daily-accounts-receipt.json").read_text())
    with zipfile.ZipFile(daily) as z:
        for m in receipt["matched_payment_firms_members"]:
            batches.append((z.read(m["member"]), receipt["source"], m["member"]))
    selected = ROOT / "data/ch-selected-accounts"
    if selected.exists():
        for p in sorted(selected.iterdir()):
            if p.suffix in (".html", ".xml"):
                batches.append((p.read_bytes(), "see selected-member receipt", p.name))
    range_receipt = ROOT / "records/ch-september-range-extraction.json"
    if range_receipt.exists():
        ranged = json.loads(range_receipt.read_text())
        for entry in ranged["files"]:
            p = ROOT / entry["path"]
            body = p.read_bytes()
            if hashlib.sha256(body).hexdigest() != entry["sha256"]:
                raise ValueError("Range-extracted original document hash mismatch")
            batches.append((body, ranged["source"], entry["member"]))
    targeted_receipt = ROOT / "records/ch-targeted-download-receipt.json"
    if targeted_receipt.exists():
        targeted = json.loads(targeted_receipt.read_text())["records"]
        for r in targeted:
            if r.get("status") != "downloaded" or r.get("format") != ".html":
                continue
            p = ROOT / r["path"]
            body = p.read_bytes()
            if hashlib.sha256(body).hexdigest() != r["sha256"]:
                raise ValueError("Targeted original document hash mismatch")
            batches.append((body, r["document_url"], p.name))
    allfacts, docs, errors = [], [], []
    seen = set()
    for data, source, member in batches:
        sha = hashlib.sha256(data).hexdigest()
        if sha in seen:
            continue
        seen.add(sha)
        try:
            facts, meta = extract(data, source, member)
        except ET.ParseError as e:
            errors.append({"member": member, "error": str(e)})
            continue
        allfacts.extend(facts)
        docs.append({"member": member, "source": source, "sha256": sha,
                     "facts": len(facts), "metadata": meta})
    frame = pd.DataFrame(allfacts)
    frame.to_csv(ROOT / "data/ch-account-facts.csv", index=False)
    out = {"status": "context-preserving extraction; scope not certified",
           "documents": len(docs), "numeric_facts": len(frame), "errors": errors,
           "parse_status": dict(Counter(frame.status)), "document_receipts": docs}
    (ROOT / "records/ch-accounts-facts-receipt.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "document_receipts"}, indent=2))
    default = frame[frame.dimensions.eq("[]") & frame.status.eq("ok")].copy()
    default["date"] = default.end.where(default.end.fillna("").ne(""), default.instant)
    for (member, date), q in default.groupby(["member", "date"]):
        v = q.groupby("variable").value.agg(lambda x: sorted(set(x)))
        print(member, date, v.to_dict())


if __name__ == "__main__":
    main()
