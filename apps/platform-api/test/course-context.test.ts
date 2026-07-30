import assert from "node:assert/strict";
import test from "node:test";
import {
  getPortManagementAssistantContext,
  getPortManagementGlobalSlideIndex,
  getPortManagementLessonSlidePosition,
  getPortManagementSlideByKey,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_IMAGEGEN_ASSETS,
  PORT_MANAGEMENT_LESSONS,
  PORT_MANAGEMENT_SLIDES,
  PORT_MANAGEMENT_SLIDE_CONTEXT_MAX_CHARS,
  PORT_MANAGEMENT_SOURCES,
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

test("course catalog exposes sixteen honest lesson states and continuous 36-page ranges", () => {
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
      [1, 1, 36],
      [2, 37, 72],
      [3, 73, 108]
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

  assert.equal(PORT_MANAGEMENT_SLIDES.length, 108);
  assert.deepEqual(
    PORT_MANAGEMENT_SLIDES.map((slide) => slide.index),
    Array.from({ length: 108 }, (_, index) => index + 1)
  );
  assert.equal(
    new Set(PORT_MANAGEMENT_SLIDES.map((slide) => slide.slideKey)).size,
    108
  );
  assert.equal(PORT_MANAGEMENT_DECK_VERSION, "release-port-management-voyage-v5");
});

test("lesson-local page numbers map cleanly onto the internal global index", () => {
  assert.deepEqual(
    [1, 36, 37, 72, 73, 108].map((globalIndex) => {
      const position = getPortManagementLessonSlidePosition(globalIndex)!;
      return [
        position.lessonNumber,
        position.localIndex,
        position.localTotal
      ];
    }),
    [
      [1, 1, 36],
      [1, 36, 36],
      [2, 1, 36],
      [2, 36, 36],
      [3, 1, 36],
      [3, 36, 36]
    ]
  );
  assert.equal(getPortManagementGlobalSlideIndex(1, 1), 1);
  assert.equal(getPortManagementGlobalSlideIndex(2, 12), 48);
  assert.equal(getPortManagementGlobalSlideIndex(3, 36), 108);
  assert.equal(getPortManagementGlobalSlideIndex(4, 1), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 0), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 37), null);
  assert.equal(getPortManagementGlobalSlideIndex(2, 1.5), null);
  assert.equal(getPortManagementLessonSlidePosition(0), null);
  assert.equal(getPortManagementLessonSlidePosition(109), null);
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
    assert.ok(slide.narrative.progress <= 108);
    for (const sourceId of slide.sourceIds ?? []) {
      assert.ok(
        PORT_MANAGEMENT_SOURCES[sourceId],
        `${slide.slideKey} references unknown source ${sourceId}`
      );
    }
  }

  for (const slideKey of [
    "l1-container-open",
    "l2-disruption-brief",
    "l2-container-origin",
    "l3-diagnosis-brief"
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
    getPortManagementSlideByKey("l2-reconstructed-route")?.narrative.publicLabel,
    "路线示意"
  );
  assert.equal(
    getPortManagementSlideByKey("l1-wrong-question")?.narrative.publicLabel,
    "史料"
  );
});

test("student-facing slide copy is free of lesson-authoring language", () => {
  const forbiddenPatterns = [
    /让学生/u,
    /告诉学生/u,
    /今天的任务/u,
    /先拆掉/u,
    /今天不先/u,
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

  const firstSlide = PORT_MANAGEMENT_SLIDES[0]!;
  assert.match(firstSlide.teachingCue, /让学生观察/u);
  assert.doesNotMatch(
    getStudentVisibleCopy(firstSlide),
    /让学生观察/u
  );
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
    assert.match(context.voyagePrompt, /OOCL Spain/);
    assert.match(context.voyagePrompt, /教学货物/);
  }

  const vesselScale = getPortManagementAssistantContext(3);
  assert.match(vesselScale.slidePrompt, /24,188 TEU/);
  assert.match(vesselScale.slidePrompt, /OOCL/);

  const france = getPortManagementAssistantContext(13);
  assert.match(france.slidePrompt, /法国/);
  assert.match(france.lessonPrompt, /重要海洋强国/);

  const opportunityCost = getPortManagementAssistantContext(19);
  assert.match(opportunityCost.slidePrompt, /机会成本/);
  assert.doesNotMatch(opportunityCost.slidePrompt, /离港审批/);

  const maritimeShare = getPortManagementAssistantContext(31);
  assert.match(maritimeShare.slidePrompt, />80% \/ ≈70%/);
  assert.match(maritimeShare.slidePrompt, /货量 \/ 价值/);
  assert.match(maritimeShare.slidePrompt, /超过八成/);
  assert.match(maritimeShare.slidePrompt, /UNCTAD/);

  const waterCost = getPortManagementAssistantContext(25);
  assert.match(waterCost.slidePrompt, /17\.25% → 55\.65%/);
  assert.match(waterCost.slidePrompt, /水路∶铁路∶公路约为1∶2∶6/);
  assert.match(waterCost.slidePrompt, /不是全国统一报价/);

  const slowSteaming = getPortManagementAssistantContext(27);
  assert.match(slowSteaming.slidePrompt, /航速 −10%/);
  assert.match(slowSteaming.slidePrompt, /功率需求约下降27%/);
  assert.match(slowSteaming.slidePrompt, /燃料节约约19%/);

  const leadTime = getPortManagementAssistantContext(29);
  assert.match(leadTime.slidePrompt, /平均提前期/);
  assert.match(leadTime.slidePrompt, /提前期波动/);
  assert.match(leadTime.slidePrompt, /不得回答成慢完全没有成本/);

  const schedulingScenario = getPortManagementAssistantContext(30);
  assert.match(schedulingScenario.slidePrompt, /证据状态：教学情境/);
  assert.match(schedulingScenario.slidePrompt, /30天±1天/);
  assert.match(schedulingScenario.slidePrompt, /18天±8天/);

  const routeClassifications = getPortManagementAssistantContext(48);
  assert.match(routeClassifications.lessonPrompt, /不得把五大或六大航线/);
  assert.match(routeClassifications.slidePrompt, /分类口径/);

  const reconstructedRoute = getPortManagementAssistantContext(57);
  assert.match(reconstructedRoute.slidePrompt, /教学路线示意/);
  assert.match(reconstructedRoute.slidePrompt, /实时轨迹/);

  const disruption = getPortManagementAssistantContext(58);
  assert.match(disruption.slidePrompt, /证据状态：教学情境/);
  assert.match(disruption.lessonPrompt, /不得说成OOCL Spain真实事故/);

  const generationLens = getPortManagementAssistantContext(86);
  assert.match(generationLens.slidePrompt, /逐层累积/);

  const automation = getPortManagementAssistantContext(87);
  assert.match(automation.slidePrompt, /自动化/);
  assert.match(automation.lessonPrompt, /自动化本身不能证明属于第四代/);

  const authoringNoteSlide = getPortManagementAssistantContext(1);
  assert.doesNotMatch(authoringNoteSlide.slidePrompt, /只报时间、地点和船名/);
});

test("the deck declares exactly 24 unique ImageGen narrative assets", () => {
  assert.equal(PORT_MANAGEMENT_IMAGEGEN_ASSETS.length, 24);
  assert.equal(new Set(PORT_MANAGEMENT_IMAGEGEN_ASSETS).size, 24);
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l1-")
    ).length,
    8
  );
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l2-")
    ).length,
    8
  );
  assert.equal(
    PORT_MANAGEMENT_IMAGEGEN_ASSETS.filter((asset) =>
      asset.includes("/story-l3-")
    ).length,
    8
  );
});
