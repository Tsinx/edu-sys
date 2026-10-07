import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
import { CourseLessonDirectory } from "../src/portal/CourseLessonDirectory";
import { resolveCourseReaderIndex } from "../src/portal/course-reader-navigation";

const mathematics = getCourseDeckByCourseId("course-international-mathematics")!;

test("the shared course directory exposes all 16 lectures and 32 hour entry points in English", () => {
  const html = renderToStaticMarkup(<MemoryRouter><CourseLessonDirectory
    deck={mathematics} activityCounts={[{ lesson: 5, count: 4 }]} onPrepare={() => {}}
  /></MemoryRouter>);
  assert.match(html, /1,312 slides/);
  assert.match(html, /1,280 core · 32 optional/);
  assert.match(html, /32 teaching hours/);
  assert.match(html, /4 planned activities/);
  assert.equal((html.match(/class="workspace-lesson-row"/g) ?? []).length, 16);
  assert.equal((html.match(/&amp;hour=[12]"/g) ?? []).length, 32);
  assert.doesNotMatch(html, /teachingCue|assistantCue|teacherGuide|answerHidden/);
  assert.doesNotMatch(html, /[\p{Script=Han}]/u);
});

test("each published hour link resolves to its authored global start, overriding saved progress", () => {
  const saved = mathematics.getSlide(117).slideKey;
  for (const lesson of mathematics.lessons) {
    for (const hour of lesson.hourRanges!) {
      const index = resolveCourseReaderIndex(mathematics, {
        lesson: String(lesson.number), hour: String(hour.number),
      }, saved);
      assert.equal(index, hour.slideStart);
      assert.equal(mathematics.getSlide(index).lessonNumber, lesson.number);
      assert.equal(mathematics.getLessonPosition(index)?.localIndex, hour.localStart);
      assert.ok(index <= lesson.slideStart! + lesson.coreSlideTotal! - 1);
    }
  }
});

test("reading without a destination restores keys; malformed destinations cannot erase progress", () => {
  const saved = mathematics.getSlide(117).slideKey;
  for (const destination of [
    { lesson: null, hour: null }, { lesson: null, hour: "2" },
    { lesson: "999", hour: "2" }, { lesson: "1.5", hour: "1" },
    { lesson: "NaN", hour: "2" },
  ]) assert.equal(resolveCourseReaderIndex(mathematics, destination, saved), 117);
  for (const hour of [null, "9", "1.5", "NaN"])
    assert.equal(resolveCourseReaderIndex(mathematics, { lesson: "14", hour }, saved), mathematics.getGlobalIndex(14));
  assert.equal(resolveCourseReaderIndex(mathematics, { lesson: null, hour: null }, "missing-key"), 1);
});

test("existing courses work without optional counts or teaching-hour metadata", () => {
  const port = getCourseDeckByCourseId("course-port-management-intro")!;
  const html = renderToStaticMarkup(<MemoryRouter><CourseLessonDirectory
    deck={port} activityCounts={[]} onPrepare={() => {}}
  /></MemoryRouter>);
  assert.match(html, /查看课件/);
  assert.doesNotMatch(html, /workspace-hour-links|core ·|undefined|NaN/);
  assert.equal(resolveCourseReaderIndex(port, { lesson: "1", hour: "2" }), port.getGlobalIndex(1));
});
