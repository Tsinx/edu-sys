import type { EconomicMathematicsAuthoredSlide as Page, EconomicMathematicsLessonDefinition as Lesson } from "../types.js";

/** One literal line is one authored page. Module headings only allocate teacher time. */
export function expandedLesson(base: Lesson, hours: readonly [string, string], scripts: readonly [string, string], details: Readonly<Record<string, Partial<Page>>> = {}): Lesson {
  const pages: Page[] = [], route: { minutes: number; activity: string }[] = [];
  const classHours: NonNullable<Lesson["classHours"]>[number][] = [];
  for (const [h, script] of scripts.entries()) {
    const start = pages.length + 1;
    let modulePages: Page[] = [], minutes = 0, topic = "", block = 0;
    const finish = () => {
      if (!modulePages.length) return;
      const weights = modulePages.map(p => p.kind === "exercise" ? 5 : p.kind === "interaction" ? 6 : p.kind === "question" ? 2 : p.kind === "derivation" ? 2 : 1);
      const sum = weights.reduce((a, b) => a + b, 0);
      let used = 0;
      modulePages.forEach((p, i) => { p.teachingSeconds = i === modulePages.length - 1 ? minutes * 60 - used : Math.round(minutes * 60 * weights[i]! / sum); used += p.teachingSeconds; });
      route.push({minutes, activity: topic});
      modulePages = [];
    };
    for (const raw of script.trim().split("\n")) {
      const line = raw.trim(); if (!line) continue;
      if (line.startsWith("##")) { finish(); const [n, ...name] = line.slice(2).split(":"); minutes = Number(n); topic = name.join(":"); block++; continue; }
      if (!block || !Number.isFinite(minutes) || minutes <= 0) throw new Error("INVALID_V3_MODULE:" + base.number);
      let page: Partial<Page>;
      if (line.startsWith("@")) {
        const title = line.slice(1); const native = base.slides.find(p => p.title === title);
        if (!native) throw new Error("UNKNOWN_AUTHORED_NATIVE_PAGE:" + base.number + ":" + title);
        page = {...native};
      } else {
        const [heading, body, formula, prompt, reveals] = line.split("|");
        const marker = heading![0], prefixed = "?!=>^".includes(marker!);
        const title = prefixed ? heading!.slice(1) : heading!;
        const kind = marker === "?" ? "question" : marker === "!" ? "exercise" : marker === "=" ? "solution" : marker === ">" ? "error-audit" : "definition";
        page = {title, kind, layout: kind === "exercise" || kind === "question" ? "exercise" : kind === "error-audit" ? "compare" : "essay", style: kind === "error-audit" ? "constructivist" : "editorial", body: body ? body.split(" / ") : undefined, formula: formula || undefined, prompt: prompt || undefined};
        if (marker === "^") { const [file, ...alt] = (body ?? "").split("~"); page.image = file; page.imageAlt = alt.join("~"); page.body = undefined; page.layout = "story"; page.kind = "scene"; page.sourceLabel = "教学情境"; }
        if (reveals) page.steps = reveals.split("//").map(s => { const [title, text, formula] = s.split("~"); return {title: title!, text: text || undefined, formula: formula || undefined}; });
      }
      const p: Page = {section: topic, kicker: "", visual: "formula-board", accent: "ink", sourceLabel: "概念模型", teachingCue: "根据当前公开问题组织观察与作答，核对条件、单位和结果。", assistantCue: "只解释当前公开步骤。区分教学模型与现实证据，不提前公开答案。", ...(page as Partial<Page> & Pick<Page, "title" | "kind">), ...details[page.title!], slideKey: `em-v3-l${String(base.number).padStart(2,"0")}-p${String(pages.length + 1).padStart(3,"0")}`, compositionId: `editorial-v3-l${base.number}-p${pages.length + 1}`, classHour: (h + 1) as 1 | 2, moduleId: `l${base.number}-h${h + 1}-m${block}`, routeRole: "core"};
      if (!p.title || !(p.body?.length || p.formula || p.prompt || p.image || p.plot || p.table || p.steps?.length || p.interactionId || p.lead)) throw new Error("EMPTY_V3_PAGE:" + p.slideKey);
      pages.push(p); modulePages.push(p);
    }
    finish();
    const count = pages.length - start + 1;
    if (count < 30 || count > 50) throw new Error(`V3_HOUR_PAGE_COUNT:${base.number}:${h + 1}:${count}`);
    if (pages.slice(start - 1).reduce((s, p) => s + (p.teachingSeconds ?? 0), 0) !== 2700) throw new Error("V3_HOUR_TIMING:" + base.number + ":" + h);
    classHours.push({hour: (h + 1) as 1 | 2, minutes:45, slideStart:start, slideEnd:pages.length, activity:hours[h]!});
  }
  return {...base, slides:pages, expectedSlides:pages.length, route, classHours};
}
