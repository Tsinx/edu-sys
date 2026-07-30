import assert from "node:assert/strict";
import test from "node:test";
import {
  getPortManagementSlide,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_SLIDES
} from "@edu/course-content";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH,
  type SlideFrame
} from "@edu/contracts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SlideStage } from "../src/features/classroom/TeachingSlides.js";

function renderSlide(index: number): string {
  const slide = getPortManagementSlide(index);
  const frame: SlideFrame = {
    deckId: "port-management",
    versionId: PORT_MANAGEMENT_DECK_VERSION,
    slideId: slide.slideKey,
    index: slide.index,
    total: PORT_MANAGEMENT_SLIDES.length,
    logicalWidth: SLIDE_LOGICAL_WIDTH,
    logicalHeight: SLIDE_LOGICAL_HEIGHT,
    aspectRatio: SLIDE_ASPECT_RATIO,
    title: slide.title,
    lessonNumber: slide.lesson,
    lessonTitle: slide.lessonTitle,
    section: slide.section,
    summary: slide.lead ?? slide.title
  };
  return renderToStaticMarkup(createElement(SlideStage, { frame }));
}

test("shared slide markup never exposes teacher-only metadata", () => {
  for (const slide of PORT_MANAGEMENT_SLIDES) {
    const markup = renderSlide(slide.index);
    assert.doesNotMatch(markup, /data-teaching-cue/u);
    assert.doesNotMatch(markup, /data-evidence-status/u);
    assert.doesNotMatch(markup, /未决：/u);
    assert.equal(
      markup.includes(slide.teachingCue),
      false,
      `${slide.slideKey} exposed its teaching cue`
    );
    if (slide.assistantCue) {
      assert.equal(
        markup.includes(slide.assistantCue),
        false,
        `${slide.slideKey} exposed its assistant cue`
      );
    }
  }
});

test("student context strip renders only public time-and-place labels", () => {
  const history = renderSlide(6);
  assert.match(history, /海峡两岸：共同基础与不同压力/u);
  assert.match(history, /英吉利海峡/u);
  assert.match(history, /17—18世纪/u);
  assert.match(history, /史料/u);
  assert.doesNotMatch(history, /校正问题|证据链|课程组手工编排/u);

  const route = renderSlide(57);
  assert.match(route, /路线示意/u);
  assert.doesNotMatch(route, /事实边界|非实时信息/u);

  const scenario = renderSlide(58);
  assert.match(scenario, /教学情境/u);
  assert.match(scenario, /稳定通行窗口尚未形成/u);
  assert.doesNotMatch(scenario, /目标不是猜新闻/u);
});

test("source footer describes evidence without exposing production tooling", () => {
  const sourcedImage = renderSlide(5);
  assert.match(sourcedImage, /来源：/u);
  assert.match(sourcedImage, /教学复原图/u);
  assert.doesNotMatch(sourcedImage, /OpenAI ImageGen/u);

  const unsourcedConcept = renderSlide(8);
  assert.doesNotMatch(unsourcedConcept, /课程组手工编排/u);
});

test("every visible slide counter uses lesson-local numbering", () => {
  const lessonStarts = [
    [1, "01 / 36"],
    [37, "01 / 36"],
    [73, "01 / 36"]
  ] as const;
  for (const [index, coverCounter] of lessonStarts) {
    const markup = renderSlide(index);
    assert.match(markup, new RegExp(coverCounter.replace("/", "\\/"), "u"));
    assert.match(markup, /港口管理概论 · 1\/36/u);
    assert.doesNotMatch(markup, /\/108/u);
  }

  for (const index of [36, 72, 108]) {
    const markup = renderSlide(index);
    assert.match(markup, /港口管理概论 · 36\/36/u);
    assert.doesNotMatch(markup, /\/108/u);
  }
});
