"""Extract the management source decks without rewriting the originals.

The output is a private audit corpus, not authored student-facing courseware.
"""
from __future__ import annotations

import hashlib
import json
import posixpath
import re
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "management-principles" / "source"
ARCHIVE = Path(r"C:\Users\Administrator\OneDrive\xwechat_files\wxid_fshw98lv7bso22_b98a\msg\file\2026-09\韦笑-管理学2025.rar")
SEVEN = Path(r"C:\Program Files\7-Zip\7z.exe")
DECKS = [
    (1, "l1", "1 管理导论.pptx", 56),
    (2, "l2", "2 管理理论的历史演变.pptx", 67),
    (3, "l3", "3 决策与决策过程.pptx", 65),
    (4, "l4a", "4 环境分析与理性决策-1.pptx", 78),
    (4, "l4b", "4 环境分析与理性决策-2.pptx", 33),
]
NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main", "p": "http://schemas.openxmlformats.org/presentationml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
RID = "{" + NS["r"] + "}"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def relationships(z: zipfile.ZipFile, path: str) -> dict:
    rel_path = posixpath.join(posixpath.dirname(path), "_rels", posixpath.basename(path) + ".rels")
    if rel_path not in z.namelist():
        return {}
    return {r.attrib["Id"]: {**r.attrib, "resolved": r.attrib["Target"] if r.attrib.get("TargetMode") == "External" else posixpath.normpath(posixpath.join(posixpath.dirname(path), r.attrib["Target"]))} for r in ET.fromstring(z.read(rel_path))}


def paragraph(p: ET.Element) -> dict:
    runs = []
    for run in p:
        kind = run.tag.rsplit("}", 1)[-1]
        if kind in ("r", "fld"):
            props = run.find("a:rPr", NS)
            runs.append({"text": "".join(run.itertext()), "properties": props.attrib if props is not None else {}, "xml": ET.tostring(props, encoding="unicode") if props is not None else None})
        elif kind == "br":
            runs.append({"text": "\n", "properties": {}})
    props = p.find("a:pPr", NS)
    return {"text": "".join(r["text"] for r in runs), "runs": runs, "properties": props.attrib if props is not None else {}}


def extract_deck(lesson: int, deck_id: str, name: str, expected: int) -> dict:
    data = subprocess.run([str(SEVEN), "x", "-so", str(ARCHIVE), "韦笑-管理学2025/" + name], capture_output=True, check=True).stdout
    if not data:
        data = subprocess.run([str(SEVEN), "x", "-so", str(ARCHIVE), "韦笑-管理学2025\\" + name], capture_output=True, check=True).stdout
    ppt_path = OUT / "originals" / name
    ppt_path.parent.mkdir(parents=True, exist_ok=True)
    if ppt_path.exists() and digest(ppt_path.read_bytes()) != digest(data):
        raise RuntimeError(f"Refusing to replace changed source: {ppt_path}")
    ppt_path.write_bytes(data)
    with zipfile.ZipFile(ppt_path) as z:
        pres = ET.fromstring(z.read("ppt/presentation.xml"))
        rels = relationships(z, "ppt/presentation.xml")
        size = pres.find("p:sldSz", NS).attrib
        slides = []
        for ordinal, slide_id in enumerate(pres.find("p:sldIdLst", NS), 1):
            path = rels[slide_id.attrib[RID + "id"]]["resolved"]
            root = ET.fromstring(z.read(path))
            slide_rels = relationships(z, path)
            objects = []
            for node in root.findall(".//p:spTree//*", NS):
                kind = node.tag.rsplit("}", 1)[-1]
                if kind not in ("sp", "pic", "graphicFrame", "cxnSp"):
                    continue
                c_nv_pr = node.find(".//p:cNvPr", NS)
                transform = node.find(".//a:xfrm", NS)
                if transform is None:
                    transform = node.find("p:xfrm", NS)
                obj = {"kind": kind, "id": c_nv_pr.attrib.get("id") if c_nv_pr is not None else None, "name": c_nv_pr.attrib.get("name") if c_nv_pr is not None else None, "paragraphs": [paragraph(p) for p in node.findall(".//a:p", NS)], "transform": ET.tostring(transform, encoding="unicode") if transform is not None else None, "xml": ET.tostring(node, encoding="unicode")}
                table = node.find(".//a:tbl", NS)
                if table is not None:
                    obj["table"] = [[{"text": "\n".join(paragraph(p)["text"] for p in cell.findall(".//a:p", NS)), "properties": cell.attrib} for cell in row.findall("a:tc", NS)] for row in table.findall("a:tr", NS)]
                blips = node.findall(".//a:blip", NS)
                obj["images"] = [slide_rels[b.attrib[RID + "embed"]]["resolved"] for b in blips if RID + "embed" in b.attrib]
                # SmartArt text lives in the related diagram data, not slide.xml.
                for link in node.iter():
                    if link.tag.endswith('}relIds') and RID+'dm' in link.attrib:
                        diagram_path=slide_rels[link.attrib[RID+'dm']]['resolved']
                        diagram=ET.fromstring(z.read(diagram_path))
                        obj['diagram']={'path':diagram_path,'xml':ET.tostring(diagram,encoding='unicode')}
                        obj['paragraphs'].extend(paragraph(p) for p in diagram.findall('.//a:p',NS))
                objects.append(obj)
            notes = []
            for rel in slide_rels.values():
                if rel["Type"].endswith("/notesSlide"):
                    notes_root = ET.fromstring(z.read(rel["resolved"]))
                    notes = [paragraph(p)["text"] for p in notes_root.findall(".//a:p", NS)]
            images = sorted(set(image for obj in objects for image in obj["images"]))
            for source_image in images:
                destination = OUT / "media" / deck_id / Path(source_image).name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(z.read(source_image))
            timing = root.find("p:timing", NS)
            slide = {"sourceId": f"{deck_id}-s{ordinal:03}", "lesson": lesson, "documentId": deck_id, "file": name, "page": ordinal, "xmlPath": path, "size": size, "objects": objects, "paragraphs": [p['text'] for o in objects for p in o['paragraphs'] if p['text'].strip()], "notes": notes, "images": [f"media/{deck_id}/{Path(i).name}" for i in images], "timing": ET.tostring(timing, encoding="unicode") if timing is not None else None, "relationships": slide_rels}
            slides.append(slide)
        assert len(slides) == expected, (name, len(slides), expected)
        return {"id": deck_id, "lesson": lesson, "file": name, "sha256": digest(data), "pages": len(slides), "size": size, "slides": slides}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    decks = [extract_deck(*deck) for deck in DECKS]
    corpus = {"archive": str(ARCHIVE), "archiveSha256": digest(ARCHIVE.read_bytes()), "pageTotal": sum(d["pages"] for d in decks), "decks": decks}
    assert corpus["pageTotal"] == 299
    (OUT / "corpus.json").write_text(json.dumps(corpus, ensure_ascii=False, indent=2), encoding="utf-8")
    for deck in decks:
        text = [f"# {deck['file']}\n"]
        for slide in deck["slides"]:
            text.extend([f"\n## {slide['sourceId']} · 原第 {slide['page']} 页\n", "\n".join(slide["paragraphs"])])
        (OUT / f"{deck['id']}-text.md").write_text("\n".join(text), encoding="utf-8")
    summary = {"archiveSha256": corpus["archiveSha256"], "pageTotal": corpus["pageTotal"], "decks": [{k:v for k,v in d.items() if k != "slides"} for d in decks]}
    (OUT / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
