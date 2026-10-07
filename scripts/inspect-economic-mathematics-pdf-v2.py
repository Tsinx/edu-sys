"""Audit page order and geometry; render every page using bundled Poppler."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import fitz
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
pdf = root / "output/pdf/economic-mathematics-v2-teacher-2026.pdf"
manifest = json.loads((root / "docs/course/economic-mathematics-deck-v2.json").read_text(encoding="utf-8-sig"))
out = root / "tmp/pdfs/economic-mathematics-v2-qa"
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
issues = []
assert len(doc) == manifest["slideTotal"]
revealed_steps = 0
image_pages = 0
normalize = lambda text: "".join(text.split())
for i, page in enumerate(doc):
    expected = manifest["pages"][i]
    if abs(page.rect.width - 1200) > .01 or abs(page.rect.height - 750) > .01:
        issues.append({"page": i + 1, "issue": "canvas"})
    text = normalize(page.get_text())
    if normalize(expected["title"]) not in text:
        issues.append({"page": i + 1, "issue": "title/order", "title": expected["title"]})
    for title in expected["revealTitles"]:
        revealed_steps += 1
        if normalize(title) not in text:
            issues.append({"page": i + 1, "issue": "missing public answer step", "title": title})
    if expected.get("image") or expected.get("style") == "constructivist":
        image_pages += 1
        if not page.get_images():
            issues.append({"page": i + 1, "issue": "missing image"})
    label = {"elasticity-profit-lab": "利润最优价格", "unconstrained-optimum-lab": "全局最优", "budget-constraint-lab": "最优配置"}.get(expected.get("interactionId"))
    if label and label not in text:
        issues.append({"page": i + 1, "issue": "missing laboratory teacher answer", "label": label})
    if "teachingCue" in text or "assistantCue" in text:
        issues.append({"page": i + 1, "issue": "private metadata"})
toc = doc.get_toc()
if len(toc) != 32 or [b[2] for b in toc] != [l["slideStart"] for l in manifest["lessons"]]:
    issues.append({"issue": "bookmarks"})
assert len(doc) == manifest["slideTotal"]
poppler = shutil.which("pdftoppm")
assert poppler, "Bundled Poppler must be available"
subprocess.run([poppler, "-png", "-scale-to", "1000", str(pdf), str(out / "page")], check=True)
pages = sorted(out.glob("page-*.png"))
assert len(pages) == len(doc)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 19)
for start in range(0, len(pages), 20):
    sheet = Image.new("RGB", (2000, 1700), "#deded7")
    draw = ImageDraw.Draw(sheet)
    for j, path in enumerate(pages[start:start + 20]):
        im = Image.open(path).convert("RGB")
        im.thumbnail((490, 307))
        x, y = (j % 4) * 500 + 5, (j // 4) * 340 + 5
        sheet.paste(im, (x, y))
        draw.text((x + 5, y + 313), "Page " + str(start + j + 1), fill="black", font=font)
    sheet.save(out / ("slides-" + str(start // 20 + 1).zfill(2) + ".jpg"), quality=92)
report = {"pages": len(doc), "bookmarks": len(toc), "renderedPages": len(pages),
          "revealedSteps": revealed_steps, "verifiedImagePages": image_pages,
          "geometryPt": [1200, 750], "sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
          "bytes": pdf.stat().st_size, "issues": issues}
(out / "pdf-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
assert not issues, issues
