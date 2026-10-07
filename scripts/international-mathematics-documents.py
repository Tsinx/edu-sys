"""Build the four companion PDFs and editable sources from authored course data.

Run with the bundled Python runtime:
  python scripts/international-mathematics-documents.py
The JSON is exported from course-content, rather than re-authoring lesson prose.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import os
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('IM_OUTPUT_ROOT', ROOT / 'output' / 'international-mathematics' / 'v2')) / 'documents'
DATA = OUT.parent / 'course-definitions.json'
INK = colors.HexColor("#18232c")
BLUE = colors.HexColor("#2357d8")
CORAL = colors.HexColor("#ee653f")
GREEN = colors.HexColor("#14877b")
PALE = colors.HexColor("#f2f5ec")
PAPER = colors.HexColor("#fffdf7")
YELLOW = colors.HexColor("#f5d349")
FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Body", str(FONT_DIR / "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("Bold", str(FONT_DIR / "segoeuib.ttf")))
pdfmetrics.registerFont(TTFont("Chinese", str(FONT_DIR / "simhei.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold")

STYLE = {
    "title": ParagraphStyle("title", fontName="Bold", fontSize=30, leading=34, textColor=INK, spaceAfter=15),
    "h1": ParagraphStyle("h1", fontName="Bold", fontSize=21, leading=26, textColor=BLUE, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="Bold", fontSize=13, leading=18, textColor=INK, spaceBefore=10, spaceAfter=7),
    "body": ParagraphStyle("body", fontName="Body", fontSize=10.5, leading=15, textColor=INK, spaceAfter=7),
    "small": ParagraphStyle("small", fontName="Body", fontSize=9, leading=12.5, textColor=INK, spaceAfter=5),
    "question": ParagraphStyle("question", fontName="Body", fontSize=10.5, leading=15, textColor=INK, spaceAfter=4),
    "zh": ParagraphStyle("zh", fontName="Chinese", fontSize=10.5, leading=16, textColor=INK, wordWrap="CJK", spaceAfter=8),
    "zhsmall": ParagraphStyle("zhsmall", fontName="Chinese", fontSize=9, leading=13.5, textColor=INK, wordWrap="CJK", spaceAfter=5),
    "kicker": ParagraphStyle("kicker", fontName="Bold", fontSize=9, leading=13, textColor=CORAL, spaceAfter=12),
}


def clean(value: str) -> str:
    """Preserve readable mathematical Unicode; normalize PDF dash typography."""
    return value.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", " - ")


def para(value: str, style: str = "body") -> Paragraph:
    resolved = STYLE[style]
    if re.search(r"[\u4e00-\u9fff]", value) and resolved.fontName != "Chinese":
        resolved = ParagraphStyle(style + "-cjk", parent=resolved, fontName="Chinese", wordWrap="CJK")
    value = html.escape(clean(value)).replace("\n", "<br/>")
    return Paragraph(value, resolved)


def bullet(value: str, style: str = "body") -> Paragraph:
    return para("• " + value, style)


def source_text(lesson: dict) -> str:
    refs = []
    for ref in lesson["sources"]:
        p0, p1 = ref["printedPages"]
        d0, d1 = ref["pdfPages"]
        text = f"Jacques, 9th ed., §{ref['section']}; printed pp. {p0}-{p1}; PDF pp. {d0}-{d1}."
        if ref.get("supplement"):
            text += " Supplement: " + ref["supplement"] + "."
        refs.append(text)
    return " ".join(refs)


class CourseDocument(BaseDocTemplate):
    def __init__(self, path: Path, label: str):
        super().__init__(
            str(path), pagesize=A4, leftMargin=46, rightMargin=46,
            topMargin=62, bottomMargin=50, title=label,
            author="International Mathematics Course / edu-sys",
            subject="Jacques 9th edition, single-variable calculus course",
        )
        self.label = label
        self._heading_number = 0
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates(PageTemplate(id="course", frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        width, height = A4
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(BLUE)
        canvas.rect(0, height - 10, width * .72, 10, fill=1, stroke=0)
        canvas.setFillColor(CORAL)
        canvas.rect(width * .72, height - 10, width * .16, 10, fill=1, stroke=0)
        canvas.setFillColor(YELLOW)
        canvas.rect(width * .88, height - 10, width * .12, 10, fill=1, stroke=0)
        canvas.setFont("Bold", 8)
        canvas.setFillColor(BLUE)
        canvas.drawString(46, height - 35, "HIGHER MATHEMATICS / ECONOMICS & BUSINESS")
        canvas.setFont("Body", 8)
        canvas.setFillColor(INK)
        canvas.drawRightString(width - 46, height - 35, "ENGLISH COURSE · 32 HOURS")
        canvas.setStrokeColor(colors.HexColor("#d5dad5"))
        canvas.line(46, 36, width - 46, 36)
        canvas.setFont("Body", 7.5)
        canvas.drawString(46, 24, clean(self.label))
        canvas.drawRightString(width - 46, 24, str(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "h1":
            self._heading_number += 1
            key = f"section-{self._heading_number}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.getPlainText(), key, level=0)


def write_pdf(filename: str, label: str, story: list):
    CourseDocument(OUT / filename, label).build(story)


def cover(kicker: str, title: str, subtitle: str) -> list:
    return [
        Spacer(1, 28), para(kicker, "kicker"), para(title, "title"),
        Spacer(1, 16), para(subtitle, "body"), Spacer(1, 22),
        Table([["16 LESSONS", "32 HOURS", "SINGLE VARIABLE"]], colWidths=[168, 168, 166],
              style=TableStyle([
                  ("BACKGROUND", (0,0),(-1,-1), BLUE), ("TEXTCOLOR",(0,0),(-1,-1),colors.white),
                  ("FONTNAME",(0,0),(-1,-1),"Bold"), ("FONTSIZE",(0,0),(-1,-1),10),
                  ("TOPPADDING",(0,0),(-1,-1),16), ("BOTTOMPADDING",(0,0),(-1,-1),16),
              ])),
        Spacer(1, 24),
    ]


def make_syllabus(data: dict):
    lessons = data["lessons"]
    story = cover("COURSE MAP / 教学大纲", data["title"],
                  "A practical English-language introduction to single-variable calculus, grounded in everyday economic and business questions.")
    story += [
        para("国际生英文授课。32学时，共16次课，每次2学时；默认每学时45分钟，每次90分钟。", "zh"),
        para("Textbook: Ian Jacques, Mathematics for Economics and Business, 9th edition (2018)."),
        para("教材重点：第1、2、4、6章。极限直观、矩形逼近和微积分基本定理说明按补充内容标识。", "zh"),
        para("Course scope", "h2"),
        para("Quantities and functions; one-variable derivatives; elementary optimization; polynomial antiderivatives; definite integrals; economic applications. Matrices, partial derivatives, multivariable optimization, and spatial surfaces are outside the core route."),
        para("This course develops mathematical interpretation and modeling. Teaching prices, costs, demand curves, and investment flows are hypothetical models unless a public source is explicitly supplied."),
        PageBreak(),
        para("Learning, pacing, and assessment", "h1"),
        bullet("Build a simple function model with named variables, units, and a feasible domain."),
        bullet("Use derivatives to interpret a current change rate and verify elementary optimization decisions."),
        bullet("Use antiderivatives and definite integrals to recover levels and accumulated quantities."),
        bullet("Explain a result in clear English and distinguish an exact value from a local approximation."),
        para("课程实施", "h2"),
        para("每讲采用场景或证据→观察→问题→数学工具→决策的顺序。开场视频约90秒，结尾保留问题。提问、示范计算和即时检查嵌入讲授课，不另设实验学时。", "zh"),
        para("全课程1280页核心内容与32页Optional Challenge，共1312页。每45分钟学时36–45页核心内容，平均40页；每讲核心页数按课程地图变化，另有2页Optional Challenge。选学页与第7题均不作为后续核心内容的先修条件；第7讲商法则、积分例外和连续贴现放在选学路线。", "zh"),
        para("Language and access", "h2"),
        para("Student slides, exercises, film narration, and captions are in English. The teacher manual combines Chinese instructional cues with English classroom wording. Teacher-only cues and unrevealed reasoning stay outside student slides and student PDF exports."),
        para("Formative assessment", "h2"),
        para("The workbook provides six core problems and one optional challenge per lesson. Use short checks, worked calculations, explanations, and feedback. No institutional examination format or formal grade weighting is prescribed."),
        para("教材页码约定", "h2"),
        para("本课程映射同时记录教材印刷页码与PDF页码。指定PDF的页码偏移为17，即PDF页码=印刷页码+17。页码指教材来源范围，不表示所有页面内容逐字摘自教材。场景、图像和题目为课程作者编写。", "zh"),
        para("Source boundaries", "h2"),
        para("Limit intuition, rectangle sums, and the introductory Fundamental Theorem explanation are explicit supplements. Continuous production is a modeling approximation; indivisible units require finite differences or integer value comparisons."),
        PageBreak(),
    ]
    for offset in range(0, 16, 4):
        story.append(para(f"Course route / Lessons {offset+1}-{offset+4}", "h1"))
        for lesson in lessons[offset:offset+4]:
            block = [
                para(f"{lesson['number']:02d}  {lesson['title']}", "h2"),
                para(f"Opening film: {lesson['filmTitle']}", "small"),
                para("Opening question: " + lesson["openingQuestion"], "small"),
            ]
            block += [bullet(x, "small") for x in lesson["outcomes"]]
            block += [para(source_text(lesson), "small")]
            for hour in lesson["hours"]:
                block.append(para(f"Hour {hour['number']}: pages {hour['localStart']}-{hour['localEnd']} / {hour['coreSlides']} core slides / 45 minutes / {hour['title']}", "small"))
            block.append(Spacer(1, 7))
            story.append(KeepTogether(block))
        if offset < 12:
            story.append(PageBreak())
    story += [
        PageBreak(), para("Delivery and evidence boundaries", "h1"),
        para("交付内容", "h2"),
        para("16讲系统课件与分讲/全课程PDF；16条开场视频、英文字幕和旁白；英文练习册与独立答案册；中文教师手册与英文课堂话术；原创素材、可编辑源码及离线查看器。", "zh"),
        para("Classroom checks", "h2"),
        bullet("Verify units, domains, endpoint comparisons, elasticity convention, integration constants, and signed accumulation."),
        bullet("Keep producer surplus distinct from profit when fixed cost exists."),
        bullet("Treat investment flows as contributions, unless a separate return model is explicitly introduced."),
        bullet("Use teacher-controlled playback and reveal in class; students follow the shared state."),
        para("验收边界", "h2"),
        para("代码检查、页面浏览和文件渲染属于本地验证。投影设备、真实课堂节奏、学生英语与数学起点的接受度需要实际授课另行记录。此大纲不填造学校成绩比例、出勤、考试政策或教学效果数据。", "zh"),
    ]
    write_pdf("course-syllabus-and-textbook-map.pdf", "Course syllabus and textbook map", story)
    md = [
        "# " + data["title"], "",
        "32 academic hours; 16 lessons; 2 × 45 minutes per lesson. V2: 1280 core + 32 optional slides.", "",
        "教材：Ian Jacques, Mathematics for Economics and Business, 9th edition (2018).",
        "范围：一元微积分及经济业务应用；极限与基本定理直观为补充。未规定正式成绩权重。",
        "PDF页码=教材印刷页码+17。课程场景与练习由作者编写；教材映射表示来源范围。", "",
    ]
    for lesson in lessons:
        md += [f"## Lesson {lesson['number']:02d}: {lesson['title']}", "",
               f"Opening: **{lesson['filmTitle']}** — {lesson['openingQuestion']}", ""]
        md += ["- " + x for x in lesson["outcomes"]]
        md += ["", source_text(lesson), ""]
        for hour in lesson["hours"]:
            md += [f"Hour {hour['number']}: local pages {hour['localStart']}-{hour['localEnd']}, {hour['coreSlides']} core slides, 45 minutes. {hour['title']}", ""]
    md += ["## Assessment and evidence boundary", "",
           "Six core exercises and one optional challenge per lesson support formative feedback. No formal grade weighting is prescribed.",
           "Static checks and file rendering do not establish classroom, projector, or student acceptance."]
    (OUT / "course-syllabus-and-textbook-map.md").write_text("\n".join(md), encoding="utf-8")


def exercise_block(exercise: dict, include_answers: bool) -> list:
    optional = exercise.get("optional", False)
    label = ("OPTIONAL CHALLENGE" if optional else "CORE") + " · " + exercise["id"]
    question = re.sub(r"^Optional:\s*", "", exercise["question"])
    block = [para(label, "kicker"), para(question, "question")]
    if include_answers:
        block += [para("Answer: " + exercise["answer"], "body"),
                  para("Solution: " + exercise["solution"], "body"), Spacer(1, 5)]
    else:
        block += [Spacer(1, 23 if not optional else 28)]
    return block


def make_workbook_and_answers(data: dict):
    exercises_dir = OUT / "exercise-sheets"
    exercises_dir.mkdir(exist_ok=True)
    wb = cover("FORMATIVE PRACTICE", "English Exercise Workbook",
               "Six core exercises and one optional challenge for each of the sixteen lessons. Show working, label units, and explain each conclusion.")
    wb += [
        para("Name: _________________________    Group: _________________________"),
        para("Optional challenges may be skipped without affecting the later core lessons."),
        para("Use your own working paper when more space is needed. This workbook does not prescribe a formal grade weighting."),
        para("Source framework: Jacques, 9th edition. Questions are authored teaching exercises, not reproduced textbook exercises."),
        PageBreak(),
    ]
    ans = cover("TEACHER / INDEPENDENT REVIEW", "Detailed Answer Book",
                "Answers and worked solutions to all core exercises and optional challenges. Keep this book separate from the student exercise workbook.")
    ans += [
        para("Check reasoning, units, feasible domains, and whether a statement is exact or approximate."),
        para("Source framework: Jacques, 9th edition. Supplementary limit and accumulation explanations are marked in the lesson source map."),
        PageBreak(),
    ]
    wb_md = ["# English Exercise Workbook", "", "Six core exercises plus one optional challenge per lesson. No formal grade weighting is set.", ""]
    ans_md = ["# Detailed Answer Book", "", "Teacher / independent review. Keep separate from the student workbook.", ""]
    for lesson in data["lessons"]:
        title = f"Lesson {lesson['number']:02d}: {lesson['title']}"
        reference = "; ".join(f"Hour {h['number']}: slides {h['localStart']}-{h['localEnd']}" for h in lesson["hours"])
        wb += [para(title, "h1"), para(reference, "small"), para("Show working. State units and any relevant domain.", "small")]
        ans += [para(title, "h1"), para(reference, "small"), para(source_text(lesson), "small")]
        sheet = ["# " + title, "", "Name: ____________________   Group: ____________________", "",
                 "Show working. State units and relevant domains.", "", reference, ""]
        wb_md += ["## " + title, "", reference, ""]
        ans_md += ["## " + title, "", reference, "", source_text(lesson), ""]
        for exercise in lesson["exercises"]:
            wb.append(KeepTogether(exercise_block(exercise, False)))
            ans.append(KeepTogether(exercise_block(exercise, True)))
            marker = " (Optional Challenge)" if exercise.get("optional") else ""
            lines = [f"### {exercise['id']}{marker}", "", exercise["question"], "", "Working:", "", ""]
            sheet += lines
            wb_md += lines
            ans_md += [f"### {exercise['id']}{marker}", "", exercise["question"], "",
                       "**Answer:** " + exercise["answer"], "",
                       "**Solution:** " + exercise["solution"], ""]
        (exercises_dir / f"lesson-{lesson['number']:02d}-exercises.md").write_text("\n".join(sheet), encoding="utf-8")
        if lesson["number"] < 16:
            wb.append(PageBreak())
            ans.append(PageBreak())
    write_pdf("english-exercise-workbook.pdf", "English exercise workbook", wb)
    write_pdf("detailed-answer-book.pdf", "Detailed answer book", ans)
    (OUT / "english-exercise-workbook.md").write_text("\n".join(wb_md), encoding="utf-8")
    (OUT / "detailed-answer-book.md").write_text("\n".join(ans_md), encoding="utf-8")


def make_teacher_manual(data: dict):
    story = cover("TEACHER HANDBOOK / 教师手册", "Teaching the English Mathematics Course",
                  "Chinese page-by-page cues, English classroom wording, ninety-minute lesson pacing, and explicit mathematical boundaries.")
    story += [
        para("本手册为教师材料。teachingCue、assistantCue、参考答案与授课节奏不显示在学生课件或学生PDF中。", "zh"),
        para("每讲90分钟。开场视频约90秒；学生先观察和回答，再进入计算。先问单位、定义域和问题类型，后揭示推理。可选页不成为核心路线先修。", "zh"),
        para("Classroom phrases", "h2"),
        bullet("What does this number measure?"),
        bullet("Which quantity is changing, and with respect to what?"),
        bullet("Is this an exact increment or a local estimate?"),
        bullet("Check the feasible interval and the endpoints."),
        bullet("State the answer with its unit and its context."),
        para("模型与教材边界", "h2"),
        para("本课程经济场景与数值用于教学，不作为实际市场或投资证据。极限、矩形和基本定理直观按补充说明使用。学生语言全部英文，中文只出现在本教师手册和系统教师材料中。", "zh"),
        PageBreak(),
    ]
    md = ["# 教师手册 / Teaching the English Mathematics Course", "",
          "仅供教师；提示、助手约束和答案不进入学生DOM或学生PDF。每讲90分钟；选学可跳过。", ""]
    for lesson in data["lessons"]:
        title = f"Lesson {lesson['number']:02d}: {lesson['title']}"
        story += [
            para(title, "h1"), para(source_text(lesson), "small"),
            para("教学节奏与英文话术", "h2"), para(lesson["teacherGuide"], "zh"),
            para("Student outcomes", "h2"),
        ]
        story += [bullet(x) for x in lesson["outcomes"]]
        story += [para("Opening film", "h2"),
                  para(lesson["filmTitle"] + " — " + lesson["openingQuestion"]),
                  para("播放结尾保留问题，先让学生说明观察。不要在开场视频中提前公布课堂答案。", "zh"),
                  para("Vocabulary support", "h2")]
        for word, definition in lesson["vocabulary"]:
            story.append(para(word + ": " + definition, "small"))
        story += [
            para("核心验收提醒", "h2"),
            para("使用本讲独立答案册检查计算。核对量纲、定义域、精确值与近似值、可行区间、初始条件和符号约定。学生助手使用英文；未揭示答案时先给局部提示。", "zh"),
            PageBreak(),
        ]
        md += ["## " + title, "", source_text(lesson), "", "### 节奏与话术", "", lesson["teacherGuide"], "",
               "### 英文目标", ""]
        md += ["- " + x for x in lesson["outcomes"]]
        md += ["", "### 开场", "", lesson["filmTitle"] + ": " + lesson["openingQuestion"], "", "### 逐页提示", ""]
        for hour in lesson["hours"]:
            label = f"Hour {hour['number']} / local pages {hour['localStart']}-{hour['localEnd']} / 45 minutes"
            story += [para(label, "h2"), para(hour["title"]), para(hour["guide"], "zh")]
            md += ["### " + label, "", hour["title"], "", hour["guide"], ""]
            elapsed = 0
            for index in range(hour["localStart"]-1, hour["localEnd"]):
                slide = lesson["slides"][index]
                seconds = slide["pedagogy"]["seconds"]
                time = f"{elapsed//60:02}:{elapsed%60:02}-{(elapsed+seconds)//60:02}:{(elapsed+seconds)%60:02}"
                pause = " / pause for response" if slide["pedagogy"]["role"] in ("checkpoint", "misconception", "exit") else ""
                line = f"{time} · p{index+1} · {slide['title']}{pause}"
                story.append(para(line, "small"))
                md += [line]
                elapsed += seconds
            assert elapsed == 2700
            story += [para("秒数为备课估计。问题页已安排回答停顿；实际试讲可调整同一学时内的时间并记录。各时段按手动翻页推进。", "zhsmall"), PageBreak()]
        for start in range(0, len(lesson["slides"]), 9):
            end = min(start + 9, len(lesson["slides"]))
            story.append(para(f"Lesson {lesson['number']:02d} / Page cues {start+1}-{end}", "h1"))
            for index, slide in enumerate(lesson["slides"][start:end], start=start+1):
                optional = " / Optional: outside scheduled 90 minutes" if slide.get("optionalChallenge") else f" / Hour {slide['pedagogy']['hour']} / {slide['pedagogy']['seconds']} seconds"
                block = [
                    para(f"{index:02d}  {slide['title']}{optional}", "h2"),
                    para(slide["teachingCue"], "zhsmall"),
                    para("Assistant boundary: " + slide["assistantCue"], "small"),
                ]
                story.append(KeepTogether(block))
                md += [f"#### Page {index:02d}: {slide['title']}{optional}", "",
                       slide["teachingCue"], "", "Assistant boundary: " + slide["assistantCue"], ""]
            if lesson["number"] < 16 or end < len(lesson["slides"]):
                story.append(PageBreak())
    write_pdf("teacher-manual-bilingual.pdf", "Teacher manual / English classroom wording", story)
    (OUT / "teacher-manual-bilingual.md").write_text("\n".join(md), encoding="utf-8")


def audit(data: dict):
    results = []
    for path in sorted(OUT.glob("*.pdf")):
        reader = PdfReader(path)
        texts = [page.extract_text() or "" for page in reader.pages]
        if any(not text.strip() for text in texts):
            raise ValueError(f"Blank extracted PDF page: {path.name}")
        results.append({
            "file": path.name, "pages": len(reader.pages), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "textCharacters": sum(map(len, texts)), "blankPages": 0,
            "bookmarks": len(reader.outline),
        })
    report = {
        "course": data["title"], "lessons": len(data["lessons"]),
        "coreExercises": sum(not e.get("optional", False) for l in data["lessons"] for e in l["exercises"]),
        "optionalExercises": sum(bool(e.get("optional", False)) for l in data["lessons"] for e in l["exercises"]),
        "documents": results,
        "visualInspection": "Pending representative PNG inspection; see document-visual-audit.json.",
        "acceptanceBoundary": "PDF/local inspection does not establish projector or classroom acceptance.",
    }
    (OUT / "document-build-audit.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["all", "teacher"], default="all",
                        help="Preserve unchanged PDFs when refreshing teacher wording.")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA.read_text(encoding="utf-8"))
    if len(data["lessons"]) != 16:
        raise ValueError("Expected sixteen authored lessons")
    if args.only == "all":
        make_syllabus(data)
        make_workbook_and_answers(data)
    make_teacher_manual(data)
    audit(data)


if __name__ == "__main__":
    main()
