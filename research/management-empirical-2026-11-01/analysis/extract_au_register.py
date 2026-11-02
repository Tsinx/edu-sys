"""Stream the retained public workbook into inspectable CSV analysis inputs.

No XLSX mutation. Preserve all nonempty source rows, identifiers, blanks, numeric
precision and a source-row pointer. Convert only numeric cells carrying an
explicit Excel date style, using the workbook's date system.
"""
from collections import Counter
import csv
from datetime import datetime, timedelta
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from inspect_au_register import Register, NS, ROOT


def column(address):
    return re.match(r"[A-Z]+",address)[0]


def main():
    receipt = json.loads((ROOT/"records/au-register-download-receipt.json").read_text())
    path = ROOT/receipt["retained_original"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != receipt["sha256"]:
        raise ValueError("Original workbook changed")
    book = Register(path)
    wb = ET.fromstring(book.z.read("xl/workbook.xml"))
    props = wb.find(f"{{{NS}}}workbookPr")
    date1904 = props is not None and props.get("date1904") in ("1","true")
    epoch = datetime(1904,1,1) if date1904 else datetime(1899,12,30)
    date_styles = set()
    for i,fmt in enumerate(book.style_numfmt):
        code = book.number_formats.get(fmt, "")
        if int(fmt) in range(14,23) or re.search(r"[dy]",code,re.I):
            date_styles.add(i)
    destination = ROOT/"data/au-register-extracts"
    destination.mkdir(exist_ok=True)
    tables = []
    for sheet in book.sheets:
        if sheet["name"] == "Information":
            continue
        output = destination/(re.sub(r"[^a-z0-9]+","_",sheet["name"].lower()).strip("_")+".csv")
        headers,definitions = None,{}
        count,formula_count,date_count = 0,0,0
        ids,types = Counter(),Counter()
        with output.open("w",encoding="utf-8",newline="") as out:
            writer = csv.writer(out)
            for row in book.rows(sheet["member"]):
                cells = {column(a):c for a,c in row["cells"].items()}
                if row["row"] == 1:
                    definitions = {c:v["value"] for c,v in cells.items() if v["value"]}
                    continue
                if row["row"] == 2:
                    headers = [(c,v["value"]) for c,v in cells.items() if v["value"]]
                    labels = [v for _,v in headers]
                    if len(set(labels)) != len(labels):
                        raise ValueError("Duplicate source column labels require explicit disambiguation")
                    writer.writerow(["_source_row"]+labels)
                    continue
                if row["row"] < 3 or not any(v["value"] for v in cells.values()):
                    continue
                if headers is None:
                    raise ValueError("Expected source header row2")
                known = {c for c,_ in headers}
                if any(c not in known and v["value"] for c,v in cells.items()):
                    raise ValueError("Nonempty source cell outside observed headers")
                values = []
                for c,label in headers:
                    cell = cells.get(c,{"value":"","type":"","style":0,"formula":None})
                    value = cell["value"]
                    if cell["formula"] is not None:
                        formula_count += 1
                    if value and cell["type"] == "n" and cell["style"] in date_styles:
                        t = epoch+timedelta(days=float(value))
                        value = t.date().isoformat() if t.time() == datetime.min.time() else t.isoformat(timespec="microseconds").rstrip("0").rstrip(".")
                        date_count += 1
                    values.append(value)
                    if label in ("ReportId","Application Id","Notice Id","Failure to Comply Id") and value:
                        ids[value] += 1
                    if label in ("Type","Application Type","Notices Type") and value:
                        types[value] += 1
                writer.writerow([row["row"]]+values)
                count += 1
        tables.append({"sheet":sheet["name"],"path":str(output.relative_to(ROOT)),"rows":count,
                       "columns":[{"excel_column":c,"name":label,"definition":definitions.get(c,"")} for c,label in headers or []],
                       "distinct_record_ids":len(ids),"repeated_record_id_rows":sum(n-1 for n in ids.values()),
                       "cached_formula_cells":formula_count,"converted_explicit_date_cells":date_count,
                       "source_types":dict(types),"sha256":hashlib.sha256(output.read_bytes()).hexdigest()})
        print(sheet["name"],"rows",count,"uniqueIDs",len(ids),"repeatedIDrows",sum(n-1 for n in ids.values()),flush=True)
    result = {"source_sha256":receipt["sha256"],"xlsx_unchanged":hashlib.sha256(path.read_bytes()).hexdigest()==receipt["sha256"],
              "method":"streamed OpenXML cells; retained source row numbers; no forward fill, aggregation or deduplication",
              "date_system":"1904" if date1904 else "1900", "date_styles":sorted(date_styles),"tables":tables}
    (ROOT/"records/au-register-extraction.json").write_text(json.dumps(result,indent=2),encoding="utf-8")


if __name__ == "__main__":
    main()
