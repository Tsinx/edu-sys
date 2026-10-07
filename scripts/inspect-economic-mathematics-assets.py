"""Build labelled contact sheets for inspection, without changing source assets."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
assets = json.loads((root / "docs/course/economic-mathematics-assets-v2.json").read_text(encoding="utf-8-sig"))["assets"]
out = root / "tmp/pdfs/economic-mathematics-v2-qa"
out.mkdir(parents=True, exist_ok=True)
for start in range(0, len(assets), 16):
    sheet = Image.new("RGB", (1440, 1040), "white")
    draw = ImageDraw.Draw(sheet)
    for j, asset in enumerate(assets[start:start + 16]):
        im = Image.open(root / "apps/teacher-web/public/course-assets/economic-mathematics/v2" / asset["file"]).convert("RGB")
        im.thumbnail((350, 230))
        x, y = (j % 4) * 360, (j // 4) * 260
        sheet.paste(im, (x, y))
        draw.text((x + 10, y + 235), asset["id"], fill="black", font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20))
    sheet.save(out / ("assets-" + str(start // 16 + 1) + ".jpg"))
print(len(assets), "assets; source pixels unchanged")
