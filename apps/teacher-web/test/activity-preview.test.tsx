import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionPreview } from "../src/features/activities/QuestionPreview";

test("answering preview excludes solutions and teacher-only authoring metadata", () => {
  const html = renderToStaticMarkup(
    <QuestionPreview
      exercise={{
        title: "TEACHER_TITLE",
        lesson: 1,
        pack: "PACK_PRIVATE",
        category: "CATEGORY_PRIVATE",
        order: 1,
        minute: 5,
        slide: 1,
        durationSeconds: 60,
        optional: false,
        collaboration: "individual",
        archived: false,
        teachingCue: "TEACHING_PRIVATE",
        assistantCue: "ASSISTANT_PRIVATE",
        content: {
          kind: "question",
          requestId: "00000000-0000-4000-8000-000000000000",
          question: "Which option?",
          mode: "single",
          options: [
            { id: "A", text: "Option A" },
            { id: "B", text: "Option B" },
          ],
          correctOptionIds: ["A"],
          explanation: "ANSWER_PRIVATE",
        },
      }}
    />,
  );
  assert.match(html, /Which option\?/);
  assert.match(html, /Option A/);
  assert.doesNotMatch(
    html,
    /PRIVATE|TEACHER_TITLE|teachingCue|assistantCue|correctOptionIds/,
  );
  assert.equal(
    (html.match(/type="button"/g) ?? []).length,
    2,
    "preview controls must not submit the surrounding exercise form",
  );
});
