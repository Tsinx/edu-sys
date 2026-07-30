# Repository guidance

## Student-facing courseware

- Treat every field rendered inside the fixed `1600×1000` slide canvas as
  student-facing teaching material. It may contain scenes, evidence, data,
  questions, conclusions, and instructions addressed directly to students.
- Do not put lesson-authoring language in student-facing fields. Phrases such
  as “让学生……”, “告诉学生……”, “先拆掉……”, “今天不先……”, “不背口号”,
  or explanations of how the teacher intends to sequence the class belong in
  `teachingCue`.
- Put factual boundaries and LLM answer constraints in `assistantCue`. Do not
  use a full slide to explain internal sourcing, prompt, or generation policy;
  use a compact source footer or an approved public label instead.
- `teachingCue`, `assistantCue`, `storyBeat`, `voyageStage`, `openQuestion`,
  and other authoring metadata must not be rendered or attached as data
  attributes in the shared/student slide DOM.
- Apply the direct-projection test before accepting a slide: without access to
  the lesson plan, it must still look and read like material that belongs on a
  classroom screen rather than an editor note.
- Prefer the sequence “scene or evidence → observation → question → concept or
  decision”. A meta slide explaining how the course will teach is not a
  substitute for the evidence itself.
- Keep source boundaries honest. Historical records, official data, teaching
  scenarios, and route reconstructions must remain distinguishable, but the
  distinction should be expressed with a short public label or footer.
- Course slide copy is authored and reviewed page by page. Do not bulk-generate
  templated prose and treat it as finished teaching material.

## Verification for slide changes

- Preserve the logical `1600×1000` (`16:10`) canvas unless the task explicitly
  changes it.
- Run the student-facing copy audit, context tests, type checks, production
  build, and `git diff --check`.
- Inspect representative rewritten pages and complete a browser pass through
  the deck at desktop and narrow widths. Confirm there are no broken images,
  clipped words, overflow, or leaked teacher-only metadata.
