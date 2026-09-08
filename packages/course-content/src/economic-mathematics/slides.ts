import {
  ECONOMIC_MATHEMATICS_EXPECTED_SLIDES,
  ECONOMIC_MATHEMATICS_TOTAL_LESSONS
} from "./curriculum.js";
import { economicMathematicsLesson01 } from "./lessons/lesson-01.js";
import { economicMathematicsLesson02 } from "./lessons/lesson-02.js";
import { economicMathematicsLesson03 } from "./lessons/lesson-03.js";
import { economicMathematicsLesson04 } from "./lessons/lesson-04.js";
import { economicMathematicsLesson05 } from "./lessons/lesson-05.js";
import { economicMathematicsLesson06 } from "./lessons/lesson-06.js";
import { economicMathematicsLesson07 } from "./lessons/lesson-07.js";
import { economicMathematicsLesson08 } from "./lessons/lesson-08.js";
import { economicMathematicsLesson09 } from "./lessons/lesson-09.js";
import { economicMathematicsLesson10 } from "./lessons/lesson-10.js";
import { economicMathematicsLesson11 } from "./lessons/lesson-11.js";
import { economicMathematicsLesson12 } from "./lessons/lesson-12.js";
import { economicMathematicsLesson13 } from "./lessons/lesson-13.js";
import { economicMathematicsLesson14 } from "./lessons/lesson-14.js";
import { economicMathematicsLesson15 } from "./lessons/lesson-15.js";
import { economicMathematicsLesson16 } from "./lessons/lesson-16.js";
import { economicMathematicsLesson17 } from "./lessons/lesson-17.js";
import { economicMathematicsLesson18 } from "./lessons/lesson-18.js";
import { economicMathematicsLesson19 } from "./lessons/lesson-19.js";
import { economicMathematicsLesson20 } from "./lessons/lesson-20.js";
import { economicMathematicsLesson21 } from "./lessons/lesson-21.js";
import { economicMathematicsLesson22 } from "./lessons/lesson-22.js";
import { economicMathematicsLesson23 } from "./lessons/lesson-23.js";
import { economicMathematicsLesson24 } from "./lessons/lesson-24.js";
import { economicMathematicsLesson25 } from "./lessons/lesson-25.js";
import { economicMathematicsLesson26 } from "./lessons/lesson-26.js";
import { economicMathematicsLesson27 } from "./lessons/lesson-27.js";
import { economicMathematicsLesson28 } from "./lessons/lesson-28.js";
import { economicMathematicsLesson29 } from "./lessons/lesson-29.js";
import { economicMathematicsLesson30 } from "./lessons/lesson-30.js";
import { economicMathematicsLesson31 } from "./lessons/lesson-31.js";
import { economicMathematicsLesson32 } from "./lessons/lesson-32.js";
import type {
  EconomicMathematicsLessonDefinition,
  EconomicMathematicsLessonSpec,
  EconomicMathematicsSlidePosition,
  EconomicMathematicsSlideSpec
} from "./types.js";

export const ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS: readonly EconomicMathematicsLessonDefinition[] = [
  economicMathematicsLesson01,
  economicMathematicsLesson02,
  economicMathematicsLesson03,
  economicMathematicsLesson04,
  economicMathematicsLesson05,
  economicMathematicsLesson06,
  economicMathematicsLesson07,
  economicMathematicsLesson08,
  economicMathematicsLesson09,
  economicMathematicsLesson10,
  economicMathematicsLesson11,
  economicMathematicsLesson12,
  economicMathematicsLesson13,
  economicMathematicsLesson14,
  economicMathematicsLesson15,
  economicMathematicsLesson16,
  economicMathematicsLesson17,
  economicMathematicsLesson18,
  economicMathematicsLesson19,
  economicMathematicsLesson20,
  economicMathematicsLesson21,
  economicMathematicsLesson22,
  economicMathematicsLesson23,
  economicMathematicsLesson24,
  economicMathematicsLesson25,
  economicMathematicsLesson26,
  economicMathematicsLesson27,
  economicMathematicsLesson28,
  economicMathematicsLesson29,
  economicMathematicsLesson30,
  economicMathematicsLesson31,
  economicMathematicsLesson32
] as const;

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
