import {
  ECONOMIC_MATHEMATICS_TOTAL_LESSONS
} from "./curriculum.js";
import { lesson01 } from "./v2/lesson-01.js";
import { lesson02 } from "./v2/lesson-02.js";
import { lesson03 } from "./v2/lesson-03.js";
import { lesson04 } from "./v2/lesson-04.js";
import { lesson05 } from "./v2/lesson-05.js";
import { lesson06 } from "./v2/lesson-06.js";
import { lesson07 } from "./v2/lesson-07.js";
import { lesson08 } from "./v2/lesson-08.js";
import { lesson09 } from "./v2/lesson-09.js";
import { lesson10 } from "./v2/lesson-10.js";
import { lesson11 } from "./v2/lesson-11.js";
import { lesson12 } from "./v2/lesson-12.js";
import { lesson13 } from "./v2/lesson-13.js";
import { lesson14 } from "./v2/lesson-14.js";
import { lesson15 } from "./v2/lesson-15.js";
import { lesson16 } from "./v2/lesson-16.js";
import { lesson17 } from "./v2/lesson-17.js";
import { lesson18 } from "./v2/lesson-18.js";
import { lesson19 } from "./v2/lesson-19.js";
import { lesson20 } from "./v2/lesson-20.js";
import { lesson21 } from "./v2/lesson-21.js";
import { lesson22 } from "./v2/lesson-22.js";
import { lesson23 } from "./v2/lesson-23.js";
import { lesson24 } from "./v2/lesson-24.js";
import { lesson25 } from "./v2/lesson-25.js";
import { lesson26 } from "./v2/lesson-26.js";
import { lesson27 } from "./v2/lesson-27.js";
import { lesson28 } from "./v2/lesson-28.js";
import { lesson29 } from "./v2/lesson-29.js";
import { lesson30 } from "./v2/lesson-30.js";
import { lesson31 } from "./v2/lesson-31.js";
import { lesson32 } from "./v2/lesson-32.js";
import type {
  EconomicMathematicsLessonDefinition,
  EconomicMathematicsLessonSpec,
  EconomicMathematicsSlidePosition,
  EconomicMathematicsSlideSpec
} from "./types.js";

export const ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS: readonly EconomicMathematicsLessonDefinition[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
  lesson09,
  lesson10,
  lesson11,
  lesson12,
  lesson13,
  lesson14,
  lesson15,
  lesson16,
  lesson17,
  lesson18,
  lesson19,
  lesson20,
  lesson21,
  lesson22,
  lesson23,
  lesson24,
  lesson25,
  lesson26,
  lesson27,
  lesson28,
  lesson29,
  lesson30,
  lesson31,
  lesson32
] as const;

export const ECONOMIC_MATHEMATICS_EXPECTED_SLIDES = ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.reduce((sum, lesson) => sum + lesson.slides.length, 0);

function assertEconomicMathematicsDeck() {
  if (
    ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.length !==
    ECONOMIC_MATHEMATICS_TOTAL_LESSONS
  ) {
    throw new Error(
      `ECONOMIC_MATHEMATICS_LESSON_COUNT:${ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.length}`
    );
  }

  const slideKeys = new Set<string>();
  const compositionIds = new Set<string>();
  let slideTotal = 0;
  for (const [lessonIndex, lesson] of ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.entries()) {
    if (lesson.number !== lessonIndex + 1) {
      throw new Error(
        `ECONOMIC_MATHEMATICS_LESSON_SEQUENCE:${lesson.number}:${lessonIndex + 1}`
      );
    }
    if (lesson.slides.length !== lesson.expectedSlides) {
      throw new Error(
        `ECONOMIC_MATHEMATICS_SLIDE_COUNT:L${lesson.number}:${lesson.slides.length}:${lesson.expectedSlides}`
      );
    }
    for (const slide of lesson.slides) {
      if (slideKeys.has(slide.slideKey)) {
        throw new Error(`ECONOMIC_MATHEMATICS_DUPLICATE_SLIDE_KEY:${slide.slideKey}`);
      }
      if (compositionIds.has(slide.compositionId)) {
        throw new Error(
          `ECONOMIC_MATHEMATICS_DUPLICATE_COMPOSITION:${slide.compositionId}`
        );
      }
      slideKeys.add(slide.slideKey);
      compositionIds.add(slide.compositionId);
      slideTotal += 1;
    }
  }
  if (slideTotal !== ECONOMIC_MATHEMATICS_EXPECTED_SLIDES) {
    throw new Error(
      `ECONOMIC_MATHEMATICS_DECK_TOTAL:${slideTotal}:${ECONOMIC_MATHEMATICS_EXPECTED_SLIDES}`
    );
  }
}

assertEconomicMathematicsDeck();

export const ECONOMIC_MATHEMATICS_SLIDES: readonly EconomicMathematicsSlideSpec[] =
  ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.flatMap((lesson, lessonIndex) => {
    const lessonStart = ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS
      .slice(0, lessonIndex)
      .reduce((total, item) => total + item.slides.length, 0);
    return lesson.slides.map((slide, localIndex) => ({
      ...slide,
      index: lessonStart + localIndex + 1,
      lesson: lesson.number,
      lessonTitle: lesson.title,
      unit: lesson.unit,
      unitTitle: lesson.unitTitle,
      localIndex: localIndex + 1,
      localTotal: lesson.slides.length
    }));
  });

export const ECONOMIC_MATHEMATICS_SLIDE_TOTAL =
  ECONOMIC_MATHEMATICS_SLIDES.length;

export const ECONOMIC_MATHEMATICS_LESSONS: readonly EconomicMathematicsLessonSpec[] =
  ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.map((lesson, index) => {
    const slideStart =
      ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS.slice(0, index).reduce(
        (total, item) => total + item.slides.length,
        0
      ) + 1;
    const slideEnd = slideStart + lesson.slides.length - 1;
    return {
      number: lesson.number,
      unit: lesson.unit,
      unitTitle: lesson.unitTitle,
      title: lesson.title,
      hours: lesson.hours,
      expectedSlides: lesson.expectedSlides,
      coreQuestion: lesson.coreQuestion,
      exerciseCapability: lesson.exerciseCapability,
      slideStart,
      slideEnd,
      prerequisites: lesson.prerequisites,
      outcomes: lesson.outcomes,
      route: lesson.route,
      slideTotal: lesson.slides.length
    };
  });

export function getEconomicMathematicsSlide(
  index: number
): EconomicMathematicsSlideSpec {
  const safeIndex = Number.isInteger(index)
    ? Math.max(1, Math.min(ECONOMIC_MATHEMATICS_SLIDE_TOTAL, index))
    : 1;
  return ECONOMIC_MATHEMATICS_SLIDES[safeIndex - 1]!;
}

export function getEconomicMathematicsSlideByKey(
  slideKey: string
): EconomicMathematicsSlideSpec | undefined {
  return ECONOMIC_MATHEMATICS_SLIDES.find(
    (candidate) => candidate.slideKey === slideKey
  );
}

export function getEconomicMathematicsLesson(
  lessonNumber: number
): EconomicMathematicsLessonSpec | undefined {
  return ECONOMIC_MATHEMATICS_LESSONS.find(
    (candidate) => candidate.number === lessonNumber
  );
}

export function getEconomicMathematicsLessonSlidePosition(
  globalIndex: number
): EconomicMathematicsSlidePosition | null {
  if (!Number.isInteger(globalIndex)) return null;
  const slide = ECONOMIC_MATHEMATICS_SLIDES[globalIndex - 1];
  if (!slide) return null;
  const lesson = ECONOMIC_MATHEMATICS_LESSONS[slide.lesson - 1];
  if (!lesson) return null;
  return {
    globalIndex,
    lessonNumber: lesson.number,
    lessonStart: lesson.slideStart,
    lessonEnd: lesson.slideEnd,
    localIndex: globalIndex - lesson.slideStart + 1,
    localTotal: lesson.slideTotal
  };
}

export function getEconomicMathematicsGlobalSlideIndex(
  lessonNumber: number,
  localIndex = 1
): number | null {
  const lesson = getEconomicMathematicsLesson(lessonNumber);
  if (
    !lesson ||
    !Number.isInteger(localIndex) ||
    localIndex < 1 ||
    localIndex > lesson.slideTotal
  ) {
    return null;
  }
  return lesson.slideStart + localIndex - 1;
}
