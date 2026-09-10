import assert from "node:assert/strict";
import test from "node:test";
import {
  getPortManagementAssistantContext,
  getPortManagementGlobeCue,
  getPortManagementGlobalSlideIndex,
  getPortManagementLessonSlidePosition,
  getPortManagementSlideByKey,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_GLOBE_CUES,
  PORT_MANAGEMENT_IMAGEGEN_ASSETS,
  PORT_MANAGEMENT_LESSONS,
  PORT_MANAGEMENT_SLIDES,
  PORT_MANAGEMENT_SLIDE_CONTEXT_MAX_CHARS,
  PORT_MANAGEMENT_SOURCES,
  PORT_LBL_SLIDES, PORT_LBL_LEGACY_KEYS,
  PORT_MANAGEMENT_VOYAGE_DOSSIER,
  type PortManagementSlideSpec
} from "@edu/course-content";

function getStudentVisibleCopy(slide: PortManagementSlideSpec): string {
  return [
    slide.lessonTitle,
    slide.section,
    slide.kicker,
    slide.title,
    slide.lead,
    ...(slide.bullets ?? []),
    ...(slide.steps ?? []),
    ...(slide.columns?.flatMap((column) => [
      column.heading,
      column.body,
      column.note
    ]) ?? []),
    ...(slide.table?.headers ?? []),
    ...(slide.table?.rows.flat() ?? []),
    slide.stat?.value,
    slide.stat?.label,
    slide.stat?.detail,
    slide.prompt,
    slide.imageAlt,
    slide.narrative.location,
    slide.narrative.timeMarker,
    slide.narrative.publicLabel
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

test("course catalog exposes sixteen honest lesson states and continuous lesson ranges", () => {
  assert.equal(PORT_MANAGEMENT_LESSONS.length, 16);
  assert.deepEqual(
    PORT_MANAGEMENT_LESSONS.map((lesson) => lesson.number),
    Array.from({ length: 16 }, (_, index) => index + 1)
  );

  const readyLessons = PORT_MANAGEMENT_LESSONS.filter(
    (lesson) => lesson.status === "ready"
  );
  assert.deepEqual(
    readyLessons.map((lesson) => [
      lesson.number,
      lesson.slideStart,
      lesson.slideEnd
    ]),
    [
      [1, 1, 47],
      [2, 48, 99],
      [3, 100, 153]
    ]
  );
  for (const lesson of readyLessons) {
    assert.equal(
      lesson.timing.reduce((minutes, block) => minutes + block.minutes, 0),
      90
    );
    assert.ok(lesson.assistantBrief);
  }

  const plannedLessons = PORT_MANAGEMENT_LESSONS.filter(
    (lesson) => lesson.status === "planned"
  );
  assert.equal(plannedLessons.length, 13);
  for (const lesson of plannedLessons) {
    assert.equal(lesson.title, null);
    assert.equal(lesson.slideStart, null);
    assert.equal(lesson.slideEnd, null);
    assert.equal(lesson.assistantBrief, null);
  }

  assert.equal(PORT_MANAGEMENT_SLIDES.length, 153);
  assert.deepEqual(
    PORT_MANAGEMENT_SLIDES.map((slide) => slide.index),
    Array.from({ length: 153 }, (_, index) => index + 1)
  );
  assert.equal(
    new Set(PORT_MANAGEMENT_SLIDES.map((slide) => slide.slideKey)).size,
    153
  );
  assert.equal(PORT_MANAGEMENT_DECK_VERSION, "release-port-management-lbl-v8");
});

test("lesson-local page numbers map cleanly onto the internal global index", () => {
  assert.deepEqual(
    [1, 47, 48, 99, 100, 153].map((globalIndex) => {
      const position = getPortManagementLessonSlidePosition(globalIndex)!;
      return [
        position.lessonNumber,
        position.localIndex,
        position.localTotal
      ];
    }),
    [
      [1, 1, 47],
      [1, 47, 47],
      [2, 1, 52],
      [2, 52, 52],
      [3, 1, 54],
      [3, 54, 54]
    ]
  );
  assert.equal(getPortManagementGlobalSlideIndex(1, 1), 1);
  assert.equal(getPortManagementGlobalSlideIndex(1, 47), 47);
  assert.equal(getPortManagementGlobalSlideIndex(2, 12), 59);
  assert.equal(getPortManagementGlobalSlideIndex(3, 54), 153);
  assert.equal(getPortManagementGlobalSlideIndex(4, 1), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 0), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 53), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 1.5), null);
  assert.equal(getPortManagementLessonSlidePosition(0), null);
  assert.equal(getPortManagementLessonSlidePosition(154), null);
});

test("every slide carries complete narrative and source metadata", () => {
  const evidenceStates = new Set(["documented", "scenario", "concept"]);
  const storyBeats = new Set([
    "evidence",
    "concept",
    "decision",
    "consequence",
    "transition"
  ]);

  for (const slide of PORT_MANAGEMENT_SLIDES) {
    assert.ok(slide.slideKey);
    assert.ok(slide.narrative.location);
    assert.ok(slide.narrative.voyageStage);
    assert.ok(evidenceStates.has(slide.narrative.evidence));
    assert.ok(storyBeats.has(slide.narrative.storyBeat));
    assert.ok(slide.narrative.progress >= 1);
    assert.ok(slide.narrative.progress <= 153);
    for (const sourceId of slide.sourceIds ?? []) {
      assert.ok(
        PORT_MANAGEMENT_SOURCES[sourceId],
        `${slide.slideKey} references unknown source ${sourceId}`
      );
    }
  }

  for (const slideKey of [
    "l1-time-has-price",
    "l2-lbl-order",
    "l2-lbl-missed-week",
    "l3-lbl-management"
  ]) {
    assert.equal(
      getPortManagementSlideByKey(slideKey)?.narrative.evidence,
      "scenario"
    );
  }

  for (const slide of PORT_MANAGEMENT_SLIDES) {
    if (slide.narrative.evidence === "scenario") {
      assert.equal(
        slide.narrative.publicLabel,
        "教学情境",
        `${slide.slideKey} must identify its scenario to students`
      );
      assert.notEqual(
        slide.narrative.timeMarker,
        slide.narrative.publicLabel,
        `${slide.slideKey} must not duplicate its public label as a time marker`
      );
    }
  }
  assert.equal(
    getPortManagementSlideByKey("l2-lbl-rotation")?.narrative.publicLabel,
    "官方资料"
  );
  assert.equal(
    getPortManagementSlideByKey("l1-jiangnan-huguang-model")?.narrative.publicLabel,
    "概念模型"
  );
});

test("student-facing slide copy is free of lesson-authoring language", () => {
  const forbiddenPatterns = [
    /让学生/u,
    /告诉学生/u,
    /今天的任务/u,
    /先拆掉/u,
    /今天不先/u,
    /不先给结论/u,
    /不背口号/u,
    /目标不是猜新闻/u,
    /课程组手工编排/u,
    /教学复原图：OpenAI ImageGen/u,
    /不要回答[“"]最好/u
  ];

  for (const slide of PORT_MANAGEMENT_SLIDES) {
    const visibleCopy = getStudentVisibleCopy(slide);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        visibleCopy,
        pattern,
        `${slide.slideKey} contains lesson-authoring language`
      );
    }
  }

  for (const cue of PORT_MANAGEMENT_GLOBE_CUES) {
    for (const step of cue.steps) {
      const visibleCopy = `${step.eyebrow}\n${step.title}\n${step.caption}`;
      for (const pattern of forbiddenPatterns) {
        assert.doesNotMatch(
          visibleCopy,
          pattern,
          `${cue.id}/${step.id} contains lesson-authoring language`
        );
      }
    }
  }

  const wagerSlide = getPortManagementSlideByKey("l1-1700-wager")!;
  assert.match(wagerSlide.teachingCue, /先投票/u);
  assert.doesNotMatch(
    getStudentVisibleCopy(wagerSlide),
    /先投票，不给答案/u
  );
});

test("the opening globe cue is fixed, sourced and totals ninety seconds", () => {
  assert.equal(PORT_MANAGEMENT_GLOBE_CUES.length, 1);
  const cue = getPortManagementGlobeCue(
    "l1-opening-trade-influence"
  )!;
  assert.equal(cue.startSlideKey, "l1-1700-wager");
  assert.equal(cue.returnSlideKey, "l1-france-england-scale");
  assert.equal(
    cue.steps.reduce((total, step) => total + step.durationMs, 0),
    90_000
  );
  assert.equal(new Set(cue.steps.map((step) => step.id)).size, 7);
  assert.ok(cue.steps.every((step) => step.narration.length > 20));
  assert.match(cue.steps[0]?.title ?? "", /下注完成/u);
  assert.match(cue.steps.at(-1)?.title ?? "", /改变你的最初判断/u);
  for (const step of cue.steps) {
    for (const sourceId of step.sourceIds) {
      assert.ok(PORT_MANAGEMENT_SOURCES[sourceId]);
    }
  }
});

test("the voyage dossier preserves the historical snapshot and teaching boundary", () => {
  assert.match(PORT_MANAGEMENT_VOYAGE_DOSSIER.vessel.name, /OOCL Spain/);
  assert.equal(PORT_MANAGEMENT_VOYAGE_DOSSIER.vessel.capacityTeu, 24_188);
  assert.equal(PORT_MANAGEMENT_VOYAGE_DOSSIER.service.cycleDays, 84);
  assert.equal(
    PORT_MANAGEMENT_VOYAGE_DOSSIER.service.portRotation.at(0),
    "上海"
  );
  assert.equal(
    PORT_MANAGEMENT_VOYAGE_DOSSIER.service.portRotation.at(-1),
    "上海"
  );
  assert.match(
    PORT_MANAGEMENT_VOYAGE_DOSSIER.teachingScenario.disclaimer,
    /教学情境/
  );
  assert.match(PORT_MANAGEMENT_VOYAGE_DOSSIER.routeDisclaimer, /实时AIS/);
});

test("assistant context stays bounded, page-specific and free of authoring notes", () => {
  for (const slide of PORT_MANAGEMENT_SLIDES) {
    const context = getPortManagementAssistantContext(slide.index);
    assert.equal(context.slideIndex, slide.index);
    assert.equal(context.slideKey, slide.slideKey);
    assert.equal(context.lessonNumber, slide.lesson);
    assert.ok(
      context.slidePrompt.length <= PORT_MANAGEMENT_SLIDE_CONTEXT_MAX_CHARS
    );
    assert.match(
      context.slidePrompt,
      new RegExp(slide.title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    );
    assert.match(context.slidePrompt, /证据状态：(真实资料|教学情境|概念模型)/);
    if (slide.lesson === 1 && slide.index < 40) {
      assert.match(context.voyagePrompt, /第一讲历史主线/);
      assert.match(context.voyagePrompt, /现代巨轮从本讲第40页/);
      assert.doesNotMatch(context.voyagePrompt, /教学货物/);
    } else {
      assert.match(context.voyagePrompt, /OOCL Spain/);
      assert.match(context.voyagePrompt, /教学货物/);
    }
  }

  const population = getPortManagementAssistantContext(3);
  assert.match(population.slidePrompt, /约500万人/);
  assert.match(population.slidePrompt, /约2000万人/);
  assert.match(population.lessonPrompt, /法国仍是欧洲强国/);

  const cantonManifest = getPortManagementAssistantContext(9);
  assert.match(cantonManifest.slidePrompt, /10,200件/);
  assert.match(cantonManifest.slidePrompt, /British Library/);

  const opportunityCost = getPortManagementAssistantContext(18);
  assert.match(opportunityCost.slidePrompt, /机会成本/);
  assert.match(opportunityCost.slidePrompt, /2石粮/);
  assert.match(opportunityCost.slidePrompt, /5石粮/);

  const maritimeShare = getPortManagementAssistantContext(44);
  assert.match(maritimeShare.slidePrompt, />80% \/ ≈70%/);
  assert.match(maritimeShare.slidePrompt, /国际贸易货量 \/ 贸易价值/);
  assert.match(maritimeShare.slidePrompt, /UNCTAD/);

  const waterCost = getPortManagementAssistantContext(43);
  assert.match(waterCost.slidePrompt, /17\.25%/);
  assert.match(waterCost.slidePrompt, /55\.65%/);
  assert.match(waterCost.slidePrompt, /水路∶铁路∶公路＝1∶2∶6/);

  const slowSteaming = getPortManagementAssistantContext(42);
  assert.match(slowSteaming.slidePrompt, /航速下降10%/);
  assert.match(slowSteaming.slidePrompt, /推进功率需求约下降27%/);
  assert.match(slowSteaming.slidePrompt, /整航程燃料节约约19%/);

  const leadTime = getPortManagementAssistantContext(45);
  assert.match(leadTime.slidePrompt, /平均提前期/);
  assert.match(leadTime.slidePrompt, /30天/);
  assert.match(leadTime.slidePrompt, /±1天/);
  assert.match(leadTime.slidePrompt, /18天/);
  assert.match(leadTime.slidePrompt, /±8天/);
  assert.match(leadTime.slidePrompt, /证据状态：教学情境/);

  const containerJourney = getPortManagementAssistantContext(50);
  assert.match(containerJourney.voyagePrompt,/C-01/);
  assert.match(containerJourney.voyagePrompt,/普通工业零件/);
  assert.match(containerJourney.lessonPrompt,/挂靠不等于本箱中转/);
  const hormuz = getPortManagementAssistantContext(137);
  assert.match(hormuz.slidePrompt,/通道仍在/);
  assert.match(hormuz.lessonPrompt,/2026-09-09/);
  assert.match(hormuz.lessonPrompt,/不能消除湾内油轮/);
  assert.doesNotMatch(hormuz.voyagePrompt,/电动车|新能源汽车/);
  const fleet = getPortManagementAssistantContext(144);
  assert.match(fleet.slidePrompt,/证据状态：教学情境/);
  assert.match(fleet.lessonPrompt,/10艘增为12艘/);

  const authoringNoteSlide = getPortManagementAssistantContext(1);
  assert.doesNotMatch(authoringNoteSlide.slidePrompt, /只报时间、地点和船名/);
});

test("the deck retains previous assets and adds fourteen LBL images", () => {
  assert.equal(PORT_MANAGEMENT_IMAGEGEN_ASSETS.length, 49);
  assert.equal(new Set(PORT_MANAGEMENT_IMAGEGEN_ASSETS).size, 49);
  assert.equal(PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter(asset=>asset.includes("/lbl/")).length,14);
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l1-")
    ).length,
    17
  );
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l2-")
    ).length,
    10
  );
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l3-")
    ).length,
    8
  );
});

test("each LBL lecture lasts ninety minutes and has a forty-five minute midpoint",()=>{
  for(const lesson of [2,3]){
    const pages=PORT_LBL_SLIDES.filter(p=>p.lesson===lesson);
    assert.equal(pages.reduce((n,p)=>n+p.durationSeconds,0),5400);
    assert.equal(pages.slice(0,26).reduce((n,p)=>n+p.durationSeconds,0),2700);
  }
  assert.equal(Object.keys(PORT_LBL_LEGACY_KEYS).length,72);
  for(const [oldKey,newKey] of Object.entries(PORT_LBL_LEGACY_KEYS)){
    assert.equal(getPortManagementSlideByKey(oldKey)?.slideKey,newKey);
  }
});
