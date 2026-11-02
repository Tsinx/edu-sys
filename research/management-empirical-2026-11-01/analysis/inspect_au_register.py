"""Read-only, bounded OpenXML inspection of the downloaded official workbook.

Preserves the XLSX exactly; no formula evaluation, network connections or Excel
automation. Uses a shared-string dictionary and streams worksheet rows.
"""
import hashlib
import json
from pathlib import Path
import posixpath
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


class Register:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        if sum(x.file_size for x in self.z.infolist()) > 512*1024**2:
            raise ValueError("Workbook exceeds bounded uncompressed inspection size")
        self.strings = []
        if "xl/sharedStrings.xml" in self.z.namelist():
            with self.z.open("xl/sharedStrings.xml") as stream:
                for _,el in ET.iterparse(stream, events=("end",)):
                    if el.tag == f"{{{NS}}}si":
                        self.strings.append("".join(n.text or "" for n in el.iter(f"{{{NS}}}t")))
                        el.clear()
        wb = ET.fromstring(self.z.read("xl/workbook.xml"))
        rels = ET.fromstring(self.z.read("xl/_rels/workbook.xml.rels"))
        targets = {x.get("Id"):x.get("Target") for x in rels}
        self.sheets = []
        for sheet in wb.find(f"{{{NS}}}sheets"):
            target = targets[sheet.get(f"{{{R}}}id")]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/"+target)
            self.sheets.append({"name":sheet.get("name"), "member":member})
        style = ET.fromstring(self.z.read("xl/styles.xml"))
        formats = style.find(f"{{{NS}}}numFmts")
        self.number_formats = {x.get("numFmtId"):x.get("formatCode") for x in formats} if formats is not None else {}
        self.style_numfmt = [x.get("numFmtId") for x in style.find(f"{{{NS}}}cellXfs")]

    def rows(self, member):
        with self.z.open(member) as stream:
            for event,el in ET.iterparse(stream,events=("end",)):
                if el.tag != f"{{{NS}}}row":
                    continue
                values = {}
                for cell in el:
                    if cell.tag != f"{{{NS}}}c":
                        continue
                    value = cell.find(f"{{{NS}}}v")
                    formula = cell.find(f"{{{NS}}}f")
                    kind = cell.get("t", "n")
                    raw = value.text if value is not None and value.text is not None else ""
                    if kind == "s" and raw:
                        raw = self.strings[int(raw)]
                    elif kind == "inlineStr":
                        raw = "".join(x.text or "" for x in cell.iter(f"{{{NS}}}t"))
                    values[cell.get("r")] = {"value":raw,"type":kind,"style":int(cell.get("s","0")),
                                               "formula":formula.text if formula is not None else None}
                row = {"row":int(el.get("r")),"cells":values}
                el.clear()
                yield row


def main():
    receipt = json.loads((ROOT/"records/au-register-download-receipt.json").read_text())
    path = ROOT/receipt["retained_original"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != receipt["sha256"]:
        raise ValueError("Retained original changed")
    book = Register(path)
    bad = book.z.testzip()
    if bad is not None:
        raise ValueError("OpenXML member CRC failed")
    sheets = []
    for sheet in book.sheets:
        preview = []
        for row in book.rows(sheet["member"]):
            if any(c["value"] for c in row["cells"].values()):
                preview.append(row)
            if len(preview) >= (35 if sheet["name"] == "Information" else 3):
                break
        sheets.append({**sheet,"uncompressed_xml_bytes":book.z.getinfo(sheet["member"]).file_size,"preview":preview})
    out = {"source_sha256":receipt["sha256"],"status":"read-only OpenXML inspection; original unchanged",
           "zip_crc_all_members":"passed", "shared_strings":len(book.strings),
           "number_formats":book.number_formats,"style_numfmt":book.style_numfmt,"sheets":sheets}
    (ROOT/"records/au-workbook-inventory.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    for sheet in sheets:
        print("\nSHEET",sheet["name"],"XMLbytes",sheet["uncompressed_xml_bytes"])
        for row in sheet["preview"]:
            if row["row"] > 2 and sheet["name"] != "Information":
                continue
            print(row["row"],{a:c["value"][:220] for a,c in row["cells"].items() if c["value"]})


if __name__ == "__main__":
    main()
