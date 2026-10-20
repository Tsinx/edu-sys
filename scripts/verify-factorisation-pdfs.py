"""Reopen the new PDFs, add section bookmarks, and verify the public offline package."""
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile
import fitz

sys.stdout.reconfigure(encoding="utf-8")
root = Path.cwd()
output = root / "output/international-mathematics/factorisation-supplement"
public = root / "apps/teacher-web/public/course-assets/international-mathematics/factorisation"
examples = [("Example 1: x²+5x+6", 3), ("Example 2: x²+7x+12", 10),
            ("Example 3: x²−5x+6", 13), ("Example 4: x²+x−6", 17),
            ("Example 5: x²−x−6", 20), ("Example 6: repeated factors", 24),
            ("Example 7: missing middle term", 26), ("Example 8: zero constant", 28)]
report = {"status": "passed", "files": []}
for name, expected in [("slides", 40), ("worksheet", 12), ("teacher-answers", 25)]:
    file = output / f"{name}.pdf"
    doc = fitz.open(file)
    assert len(doc) == expected, (name, len(doc))
    text = "\n".join(p.get_text() for p in doc)
    assert all(len(p.get_text().strip()) > 60 for p in doc), name
    assert all(p.get_fonts() for p in doc), name
    for p in doc:
        if name == "slides":
            assert abs(p.rect.width / p.rect.height - 1.6) < .001
        for word in p.get_text("words"):
            assert word[0] >= -2 and word[1] >= -2 and word[2] <= p.rect.width + 2 and word[3] <= p.rect.height + 2, (name, p.number, word)
    if name != "teacher-answers":
        for private in ["Correct answer:", "Teacher answer book", "teachingCue", "assistantCue", "optionExplanations"]:
            assert private not in text, (name, private)
    if name == "slides":
        toc = [[1, "Lecture 3 supplement: Factoring Quadratics", 1]]
        toc += [[2, label, page] for label, page in examples]
        toc += [[2, "From factors to roots", 30], [2, "Practice and exit checks", 37]]
    elif name == "worksheet":
        assert [int(n) for n in re.findall(r"Q(\d+)\s*·\s*Rank", text)] == list(range(1, 25))
        toc = [[1, "24 ranked choice questions", 1], [2, "Foundation: Q1–8", 1],
               [2, "Core: Q9–16", 5], [2, "Application: Q17–22", 9], [2, "Optional Challenge: Q23–24", 12]]
    else:
        assert text.count("Correct answer:") == 24
        toc = [[1, "Private teaching guide", 1], [1, "Teacher answers and distractor explanations", 2]]
    doc.set_toc(toc)
    pending = output / f"{name}.pending.pdf"
    doc.save(pending, garbage=4, deflate=True)
    doc.close()
    pending.replace(file)
    reopened = fitz.open(file)
    assert len(reopened) == expected and len(reopened.get_toc()) == len(toc)
    for i in ([2, 7, 15, 23, 28, 35, 38] if name == "slides" else [0, len(reopened) - 1]):
        reopened[i].get_pixmap(matrix=fitz.Matrix(1, 1)).save(output / f"qa/pdf-{name}-{i+1:02}.png")
    report["files"].append({"file": file.name, "pages": expected, "bookmarks": len(toc),
                            "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
    reopened.close()
    if name != "teacher-answers":
        (public / file.name).write_bytes(file.read_bytes())

student_zip = output / "Lecture-3-Factorisation-Student-Offline.zip"
with zipfile.ZipFile(student_zip, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(public.rglob("*")):
        if file.is_file():
            assert "teacher" not in file.name.lower()
            archive.write(file, file.relative_to(public).as_posix())
with zipfile.ZipFile(student_zip) as archive:
    assert archive.testzip() is None
    assert {"index.html", "slides.pdf", "worksheet.pdf", "public-pack.json"}.issubset(archive.namelist())
    pack = json.loads(archive.read("public-pack.json"))
    assert len(pack["questions"]) == 24
    assert all("correctOptionId" not in q and "solution" not in q for q in pack["questions"])
report["offlineZip"] = {"file": student_zip.name, "sha256": hashlib.sha256(student_zip.read_bytes()).hexdigest(), "integrity": "passed"}
(output / "qa/pdf-audit.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
