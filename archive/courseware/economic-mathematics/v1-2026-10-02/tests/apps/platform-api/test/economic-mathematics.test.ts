import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { classroomSnapshotSchema } from "@edu/contracts";
import {
  ECONOMIC_MATHEMATICS_COURSE_ID,
  ECONOMIC_MATHEMATICS_DECK_ID,
  ECONOMIC_MATHEMATICS_EXPECTED_SLIDES,
  ECONOMIC_MATHEMATICS_INTERACTIONS,
  ECONOMIC_MATHEMATICS_LESSONS,
  ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS,
  ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS,
  ECONOMIC_MATHEMATICS_SLIDES,
  ECONOMIC_MATHEMATICS_VERSION_ID,
  getEconomicMathematicsInteractionDefinition,
  validateEconomicMathematicsInteractionState,
  validateEconomicMathematicsInteractionValues,
  type EconomicMathematicsInteractionDefinition,
  type EconomicMathematicsInteractionRule,
  type EconomicMathematicsInteractionScalar
} from "@edu/course-content/economic-mathematics";
import { buildApp } from "../src/app.js";
import { createSeedState } from "../src/seed.js";
import type {
  AssistantJsonStreamProvider,
  AssistantJsonStreamRequest
} from "../src/assistant/provider.js";

const EXPECTED_LESSON_SLIDES = [
  44, 47, 45, 45, 47, 46, 47, 44, 46, 43, 46, 44, 45, 47, 45, 47,
  43, 44, 46, 45, 47, 46, 45, 46, 47, 47, 45, 47, 46, 47, 47, 44
] as const;

class CapturingEconomicMathematicsAssistant implements AssistantJsonStreamProvider {
  readonly name = "economic-mathematics-prompt-test";
  readonly requests: AssistantJsonStreamRequest[] = [];

  async *streamJson(request: AssistantJsonStreamRequest): AsyncGenerator<string> {
    this.requests.push(request);
    yield JSON.stringify({
      dialogue: "先识别变量和已知条件。",
      actions: [],
      schema: "edu.classroom.assistant.response",
      version: "1.0"
    });
  }
}

function invalidValueFor(
  rule: EconomicMathematicsInteractionRule
): EconomicMathematicsInteractionScalar {
  if (rule.type === "boolean") return "not-a-boolean";
  if (rule.type === "enum") return "not-an-allowed-enum-value";
  return rule.max + (rule.step ?? 1);
}

function changedDefault(
  definition: EconomicMathematicsInteractionDefinition
): { key: string; value: EconomicMathematicsInteractionScalar } {
  for (const [key, rule] of Object.entries(definition.rules)) {
    const original = definition.defaults[key];
    if (rule.type === "boolean") {
      return { key, value: !original };
    }
    if (rule.type === "enum") {
      const alternative = rule.values.find((value) => value !== original);
      if (alternative !== undefined) return { key, value: alternative };
      continue;
    }
    const step = rule.step ?? 1;
    const upward = typeof original === "number" ? original + step : rule.min;
    if (upward <= rule.max) return { key, value: upward };
    return { key, value: rule.max - step };
  }
  throw new Error(`NO_CHANGEABLE_INTERACTION_DEFAULT:${definition.id}`);
}

test("economic mathematics deck has 32 manually registered lessons and exactly 1,460 continuous slides", () => {
  assert.equal(ECONOMIC_MATHEMATICS_EXPECTED_SLIDES, 1_460);
  assert.equal(ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.length, 32);
  assert.equal(ECONOMIC_MATHEMATICS_LESSONS.length, 32);
  assert.equal(ECONOMIC_MATHEMATICS_SLIDES.length, 1_460);

  const slideKeys = new Set<string>();
  const compositionIds = new Set<string>();
  let nextSlideIndex = 1;

  for (const [lessonOffset, lesson] of ECONOMIC_MATHEMATICS_LESSONS.entries()) {
    const lessonNumber = lessonOffset + 1;
    const expectedSlides = EXPECTED_LESSON_SLIDES[lessonOffset];
    if (expectedSlides === undefined) {
      throw new Error(`UNEXPECTED_ECONOMIC_MATHEMATICS_LESSON:${lessonNumber}`);
    }
    const definition = ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS[lessonOffset];

    assert.equal(lesson.number, lessonNumber);
    assert.equal(definition?.number, lessonNumber);
    assert.equal(lesson.slideStart, nextSlideIndex);
    assert.equal(lesson.slideTotal, expectedSlides);
    assert.equal(lesson.expectedSlides, expectedSlides);
    assert.equal(definition?.slides.length, expectedSlides);
    assert.equal(lesson.slideEnd, lesson.slideStart + expectedSlides - 1);
    nextSlideIndex = lesson.slideEnd + 1;
  }
  assert.equal(nextSlideIndex, 1_461);

  for (const [offset, slide] of ECONOMIC_MATHEMATICS_SLIDES.entries()) {
    assert.equal(slide.index, offset + 1);
    assert.equal(slide.localTotal, EXPECTED_LESSON_SLIDES[slide.lesson - 1]);
    assert.ok(slide.localIndex >= 1 && slide.localIndex <= slide.localTotal);
    assert.ok(slide.slideKey.trim(), `slide ${slide.index} has slideKey`);
    assert.ok(slide.compositionId.trim(), `slide ${slide.index} has compositionId`);
    assert.ok(slide.section.trim(), `slide ${slide.index} has section`);
    assert.ok(slide.title.trim(), `slide ${slide.index} has title`);
    assert.ok(slide.kicker.trim(), `slide ${slide.index} has kicker`);
    assert.ok(slide.kind, `slide ${slide.index} has kind`);
    assert.ok(slide.visual, `slide ${slide.index} has visual`);
    assert.ok(slide.sourceLabel, `slide ${slide.index} has public source label`);
    assert.ok(slide.accent, `slide ${slide.index} has accent`);
    assert.ok(slide.teachingCue.trim(), `slide ${slide.index} has teachingCue`);
    assert.ok(slide.assistantCue.trim(), `slide ${slide.index} has assistantCue`);
    assert.equal(slideKeys.has(slide.slideKey), false, slide.slideKey);
    assert.equal(compositionIds.has(slide.compositionId), false, slide.compositionId);
    slideKeys.add(slide.slideKey);
    compositionIds.add(slide.compositionId);
  }

  assert.equal(slideKeys.size, 1_460);
  assert.equal(compositionIds.size, 1_460);
});

test("every economic mathematics interaction declares valid defaults and rejects unknown or out-of-range values", () => {
  const referencedInteractionIds = new Set<string>();
  const interactiveSlideKeys: string[] = [];

  for (const slide of ECONOMIC_MATHEMATICS_SLIDES) {
    if (!slide.interactionId) continue;
    interactiveSlideKeys.push(slide.slideKey);
    referencedInteractionIds.add(slide.interactionId);
    const definition = getEconomicMathematicsInteractionDefinition(slide);
    assert.ok(definition, `${slide.slideKey} resolves its interaction`);
    assert.deepEqual(
      Object.keys(definition.defaults).sort(),
      Object.keys(definition.rules).sort(),
      `${definition.id} defaults cover exactly its allowed keys`
    );
    assert.equal(
      validateEconomicMathematicsInteractionValues(
        definition,
        definition.defaults
      ),
      true,
      `${definition.id} defaults are valid`
    );
    assert.equal(
      validateEconomicMathematicsInteractionState(definition, definition.defaults),
      true,
      `${slide.slideKey} has a valid complete default state`
    );
  }

  assert.equal(interactiveSlideKeys.length, 66);
  assert.deepEqual(
    Object.keys(ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS).sort(),
    interactiveSlideKeys.sort(),
    "every interaction slide declares its own defaults"
  );

  assert.deepEqual(
    [...referencedInteractionIds].sort(),
    Object.keys(ECONOMIC_MATHEMATICS_INTERACTIONS).sort()
  );

  for (const definition of Object.values(ECONOMIC_MATHEMATICS_INTERACTIONS)) {
    assert.equal(
      validateEconomicMathematicsInteractionValues(definition, {
        unknownKey: 1
      }),
      false,
      `${definition.id} rejects unknown keys`
    );
    assert.equal(
      validateEconomicMathematicsInteractionValues(
        definition,
        JSON.parse('{"toString":42}') as Record<string, number>
      ),
      false,
      `${definition.id} rejects inherited-rule names`
    );
    assert.equal(
      validateEconomicMathematicsInteractionValues(
        definition,
        JSON.parse('{"__proto__":42}') as Record<string, number>
      ),
      false,
      `${definition.id} rejects prototype mutation names`
    );
    for (const [key, rule] of Object.entries(definition.rules)) {
      assert.equal(
        validateEconomicMathematicsInteractionValues(definition, {
          [key]: invalidValueFor(rule)
        }),
        false,
        `${definition.id}.${key} rejects an invalid value`
      );
    }
  }


  const smallBudgetSlide = ECONOMIC_MATHEMATICS_SLIDES.find(
    (slide) => slide.slideKey === "em-l32-32-lab-small-budget"
  );
  assert.ok(smallBudgetSlide);
  const smallBudgetDefinition = getEconomicMathematicsInteractionDefinition(smallBudgetSlide);
  assert.ok(smallBudgetDefinition);
  assert.equal(
    validateEconomicMathematicsInteractionState(smallBudgetDefinition, {
      ...smallBudgetDefinition.defaults,
      channelX: 80
    }),
    false,
    "channel allocation cannot exceed the selected budget"
  );

  const sequenceSlide = ECONOMIC_MATHEMATICS_SLIDES.find(
    (slide) => slide.interactionId === "sequence-limit-lab"
  );
  assert.ok(sequenceSlide);
  const sequenceDefinition = getEconomicMathematicsInteractionDefinition(sequenceSlide);
  assert.ok(sequenceDefinition);
  assert.equal(
    validateEconomicMathematicsInteractionState(sequenceDefinition, {
      ...sequenceDefinition.defaults,
      n: 0
    }),
    true,
    "the sequence experiment includes its authored n=0 starting term"
  );

  const continuitySlide = ECONOMIC_MATHEMATICS_SLIDES.find(
    (slide) => slide.interactionId === "continuity-threshold-lab"
  );
  assert.ok(continuitySlide);
  const continuityDefinition = getEconomicMathematicsInteractionDefinition(continuitySlide);
  assert.ok(continuityDefinition);
  assert.equal(
    validateEconomicMathematicsInteractionState(continuityDefinition, {
      ...continuityDefinition.defaults,
      orderAmount: 99.01,
      approach: "left"
    }),
    false,
    "a left-approach state cannot sit to the right of the threshold"
  );
  assert.equal(
    validateEconomicMathematicsInteractionState(continuityDefinition, {
      ...continuityDefinition.defaults,
      orderAmount: 99.01,
      approach: "right"
    }),
    true,
    "a right-approach state remains valid on the right of the threshold"
  );

  assert.deepEqual(
    ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS["em-l32-25-lab-intro"],
    { budget: "80", channelX: 40, revealOptimum: false, revealStep: false },
    "the budget stress-test opens at an unrevealed equal split"
  );
  for (const slideKey of [
    "em-l30-23-lab-optimum",
    "em-l30-24-lab-flatness",
    "em-l30-25-lab-overshoot",
    "em-l30-26-lab-loss-radius",
    "em-l30-27-lab-boundary"
  ]) {
    assert.equal(
      ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS[slideKey]?.revealClassification,
      true,
      `${slideKey} keeps the already-published optimum classification revealed`
    );
  }
});

test("economic mathematics seed migration is idempotent and starts the registered 1,460-slide deck", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-economic-seed-"));
  const dataFile = join(tempDirectory, "state.json");
  const legacyState = createSeedState();
  legacyState.courses = legacyState.courses.filter(
    (course) => course.id !== ECONOMIC_MATHEMATICS_COURSE_ID
  );
  await writeFile(dataFile, `${JSON.stringify(legacyState, null, 2)}\n`, "utf8");

  let app = await buildApp({ dataFile, portSimulationTickMs: 0 });
  try {
    const courses = (await app.inject({ method: "GET", url: "/api/courses" })).json();
    assert.equal(
      courses.filter(
        (course: { id: string }) => course.id === ECONOMIC_MATHEMATICS_COURSE_ID
      ).length,
      1
    );
  } finally {
    await app.close();
  }

  app = await buildApp({ dataFile, portSimulationTickMs: 0 });
  try {
    const courses = (await app.inject({ method: "GET", url: "/api/courses" })).json();
    assert.equal(
      courses.filter(
        (course: { id: string }) => course.id === ECONOMIC_MATHEMATICS_COURSE_ID
      ).length,
      1
    );

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${ECONOMIC_MATHEMATICS_COURSE_ID}/class-sessions`
    });
    assert.equal(startResponse.statusCode, 201);
    const sessionId = startResponse.json().id as string;
    const snapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`
    });
    assert.equal(snapshotResponse.statusCode, 200);
    const snapshot = classroomSnapshotSchema.parse(snapshotResponse.json());
    assert.equal(snapshot.courseId, ECONOMIC_MATHEMATICS_COURSE_ID);
    assert.equal(snapshot.courseTitle, "经济数学");
    assert.equal(snapshot.slide.deckId, ECONOMIC_MATHEMATICS_DECK_ID);
    assert.equal(snapshot.slide.versionId, ECONOMIC_MATHEMATICS_VERSION_ID);
    assert.equal(snapshot.slide.index, 1);
    assert.equal(snapshot.slide.total, 1_460);
    assert.equal(snapshot.slide.logicalWidth, 1_600);
    assert.equal(snapshot.slide.logicalHeight, 1_000);
    assert.equal(snapshot.slide.aspectRatio, "16:10");
    assert.equal(snapshot.activeActivity, "slides");
    assert.equal(snapshot.slideInteraction, null);
    assert.equal(snapshot.simulation, null);
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("teacher interaction updates are validated, revisioned, recoverable and isolated from port activities", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-economic-interaction-"));
  const dataFile = join(tempDirectory, "state.json");
  const app = await buildApp({ dataFile, portSimulationTickMs: 0 });

  try {
    const startResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${ECONOMIC_MATHEMATICS_COURSE_ID}/class-sessions`
    });
    assert.equal(startResponse.statusCode, 201);
    const sessionId = startResponse.json().id as string;
    const eventUrl = `/api/class-sessions/${sessionId}/events`;
    const interactiveSlide = ECONOMIC_MATHEMATICS_SLIDES.find(
      (slide) => slide.interactionId === "price-profit-lab"
    );
    assert.ok(interactiveSlide);
    const definition = getEconomicMathematicsInteractionDefinition(interactiveSlide);
    assert.ok(definition);
    const changed = changedDefault(definition);

    const goToInteraction = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "set_slide", index: interactiveSlide.index }
    });
    assert.equal(goToInteraction.statusCode, 201);
    const initial = classroomSnapshotSchema.parse(goToInteraction.json());
    assert.deepEqual(initial.slideInteraction, {
      deckId: ECONOMIC_MATHEMATICS_DECK_ID,
      slideId: interactiveSlide.slideKey,
      revision: 1,
      values: definition.defaults
    });

    const validUpdate = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: interactiveSlide.slideKey,
        expectedRevision: 1,
        patch: { [changed.key]: changed.value }
      }
    });
    assert.equal(validUpdate.statusCode, 201);
    const updated = classroomSnapshotSchema.parse(validUpdate.json());
    assert.equal(updated.slideInteraction?.revision, 2);
    assert.equal(updated.slideInteraction?.values[changed.key], changed.value);

    const revisionConflict = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: interactiveSlide.slideKey,
        expectedRevision: 1,
        patch: { [changed.key]: changed.value }
      }
    });
    assert.equal(revisionConflict.statusCode, 409);
    assert.equal(
      revisionConflict.json().error,
      "SLIDE_INTERACTION_REVISION_CONFLICT"
    );

    const unknownKey = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: interactiveSlide.slideKey,
        expectedRevision: 2,
        patch: { unexpected: 1 }
      }
    });
    assert.equal(unknownKey.statusCode, 400);
    assert.equal(unknownKey.json().error, "SLIDE_INTERACTION_INVALID");

    const outOfRange = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: interactiveSlide.slideKey,
        expectedRevision: 2,
        patch: { price: 111 }
      }
    });
    assert.equal(outOfRange.statusCode, 400);
    assert.equal(outOfRange.json().error, "SLIDE_INTERACTION_INVALID");

    const nextSlide = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "next_slide" }
    });
    assert.equal(nextSlide.statusCode, 201);
    assert.equal(nextSlide.json().slideInteraction, null);

    const previousSlide = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "previous_slide" }
    });
    assert.equal(previousSlide.statusCode, 201);
    const restored = classroomSnapshotSchema.parse(previousSlide.json());
    assert.equal(restored.slideInteraction?.revision, 2);
    assert.equal(restored.slideInteraction?.values[changed.key], changed.value);

    const reset = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "reset_slide_interaction",
        slideId: interactiveSlide.slideKey,
        expectedRevision: 2
      }
    });
    assert.equal(reset.statusCode, 201);
    const resetSnapshot = classroomSnapshotSchema.parse(reset.json());
    assert.equal(resetSnapshot.slideInteraction?.revision, 3);
    assert.deepEqual(resetSnapshot.slideInteraction?.values, definition.defaults);

    const smallBudgetSlide = ECONOMIC_MATHEMATICS_SLIDES.find(
      (slide) => slide.slideKey === "em-l32-32-lab-small-budget"
    );
    assert.ok(smallBudgetSlide);
    const goToSmallBudget = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "set_slide", index: smallBudgetSlide.index }
    });
    assert.equal(goToSmallBudget.statusCode, 201);
    assert.deepEqual(goToSmallBudget.json().slideInteraction.values, {
      budget: "25",
      channelX: 16,
      revealOptimum: true,
      revealStep: true
    });
    const impossibleAllocation = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: smallBudgetSlide.slideKey,
        expectedRevision: 1,
        patch: { channelX: 80 }
      }
    });
    assert.equal(impossibleAllocation.statusCode, 400);
    assert.equal(impossibleAllocation.json().error, "SLIDE_INTERACTION_INVALID");

    const forbiddenGlobe = await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "set_activity", activity: "globe" }
    });
    assert.equal(forbiddenGlobe.statusCode, 409);
    assert.equal(forbiddenGlobe.json().error, "COURSE_ACTIVITY_NOT_AVAILABLE");

    const forbiddenSimulation = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      payload: { expectedStudentCount: 24 }
    });
    assert.equal(forbiddenSimulation.statusCode, 409);
    assert.equal(
      forbiddenSimulation.json().error,
      "COURSE_ACTIVITY_NOT_AVAILABLE"
    );

    const publicSnapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`
    });
    const publicSnapshot = classroomSnapshotSchema.parse(
      publicSnapshotResponse.json()
    );
    const serializedPublicSnapshot = JSON.stringify(publicSnapshot);
    for (const forbiddenAuthorField of [
      "teachingCue",
      "assistantCue",
      "openQuestion",
      "storyBeat",
      "voyageStage"
    ]) {
      assert.doesNotMatch(serializedPublicSnapshot, new RegExp(forbiddenAuthorField, "u"));
    }
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("economic mathematics assistant omits unrevealed answers until every required reveal is active", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-economic-assistant-"));
  const provider = new CapturingEconomicMathematicsAssistant();
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    assistantProvider: provider,
    portSimulationTickMs: 0
  });

  try {
    const started = await app.inject({
      method: "POST",
      url: `/api/courses/${ECONOMIC_MATHEMATICS_COURSE_ID}/class-sessions`
    });
    const sessionId = started.json().id as string;
    const eventUrl = `/api/class-sessions/${sessionId}/events`;
    const askUrl = `/api/class-sessions/${sessionId}/assistant/turns`;
    const predictionSlide = ECONOMIC_MATHEMATICS_SLIDES.find(
      (slide) => slide.slideKey === "em-l25-23-lab-predict-revenue"
    );
    assert.ok(predictionSlide);

    await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "set_slide", index: predictionSlide.index }
    });
    await app.inject({
      method: "POST",
      url: askUrl,
      payload: { text: "峰值在哪里？", source: "text" }
    });
    const hiddenPrompt = provider.requests.at(-1)?.messages[0]?.content ?? "";
    assert.match(hiddenPrompt, /当前页答案尚未揭示/u);
    assert.doesNotMatch(hiddenPrompt, /模型收入峰值在p=60/u);

    await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: predictionSlide.slideKey,
        expectedRevision: 1,
        patch: { revealStep: true }
      }
    });
    await app.inject({
      method: "POST",
      url: askUrl,
      payload: { text: "现在可以核对吗？", source: "text" }
    });
    const revealedPrompt = provider.requests.at(-1)?.messages[0]?.content ?? "";
    assert.match(revealedPrompt, /模型收入峰值在p=60/u);

    const elasticitySlide = ECONOMIC_MATHEMATICS_SLIDES.find(
      (slide) => slide.slideKey === "econ-math-l16-26"
    );
    assert.ok(elasticitySlide);
    await app.inject({
      method: "POST",
      url: eventUrl,
      payload: { type: "set_slide", index: elasticitySlide.index }
    });
    await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: elasticitySlide.slideKey,
        expectedRevision: 1,
        patch: { revealStep: true }
      }
    });
    await app.inject({
      method: "POST",
      url: askUrl,
      payload: { text: "两个峰值是多少？", source: "text" }
    });
    const partlyRevealedPrompt = provider.requests.at(-1)?.messages[0]?.content ?? "";
    assert.doesNotMatch(partlyRevealedPrompt, /A收益峰60、利润峰70/u);

    await app.inject({
      method: "POST",
      url: eventUrl,
      payload: {
        type: "set_slide_interaction",
        slideId: elasticitySlide.slideKey,
        expectedRevision: 2,
        patch: { revealOptimum: true }
      }
    });
    await app.inject({
      method: "POST",
      url: askUrl,
      payload: { text: "现在核对两个峰值。", source: "text" }
    });
    const fullyRevealedPrompt = provider.requests.at(-1)?.messages[0]?.content ?? "";
    assert.match(fullyRevealedPrompt, /A收益峰60、利润峰70/u);
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
