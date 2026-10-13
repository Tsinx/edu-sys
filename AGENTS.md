# Repository guidance

## Teaching frontend architecture (required reading)

- Before changing classroom, presentation, fullscreen, narration, globe, or
  experiment controls, read [`docs/frontend-page-tools.md`](docs/frontend-page-tools.md).
- Each teaching surface has one bottom toolbar owned by its presentation shell.
  Courses contribute page actions and panels through `PageTools`; they must not
  append a second course-specific toolbar when hosted by a shell.
- Keep playback, narration, microphone capture, drafts, reveal state, and model
  calculations in their existing controllers. Fullscreen is a layout change;
  it must not remount those controllers or move the canvas between React roots.
- Keep Page fullscreen (viewport layout, browser chrome visible) and Screen
  fullscreen (browser Fullscreen API) as two explicit toolbar buttons. A denied
  screen request must report failure, never silently enter page fullscreen.
- Put teacher controls outside the fixed slide canvas. Register tools for the
  current page only, close obsolete panels on page changes, and enforce the
  teacher/student/projection permissions. Tool definitions are UI data, not
  student content or assistant context.
- Use the common toolbar and panel styles. On narrow screens, collect secondary
  actions in a panel or scroll the action group; do not add another toolbar row.
- Validate economic narration, an economic parameter experiment, and a port
  globe page before migrating other controls; also check fullscreen continuity,
  student read-only behavior, keyboard/input focus, and desktop/narrow layouts.

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
