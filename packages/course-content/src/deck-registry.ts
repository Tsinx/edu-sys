import { PORT_MANAGEMENT_SLIDES } from "./slides.js";
import { PORT_LBL_LEGACY_KEYS } from "./port-lbl-migration.js";
import {
  ECONOMIC_MATHEMATICS_COURSE_CODE,
  ECONOMIC_MATHEMATICS_COURSE_ID,
  ECONOMIC_MATHEMATICS_COURSE_SLUG,
  ECONOMIC_MATHEMATICS_DECK_ID,
  ECONOMIC_MATHEMATICS_TEXTBOOKS,
  ECONOMIC_MATHEMATICS_TOTAL_HOURS,
  ECONOMIC_MATHEMATICS_VERSION_ID
} from "./economic-mathematics/curriculum.js";
import {
  ECONOMIC_MATHEMATICS_LESSONS,
  ECONOMIC_MATHEMATICS_SLIDES,
  getEconomicMathematicsGlobalSlideIndex,
  getEconomicMathematicsLessonSlidePosition,
  getEconomicMathematicsSlide,
  getEconomicMathematicsSlideByKey
} from "./economic-mathematics/slides.js";
import {
  getEconomicMathematicsInteractionDefinition,
  validateEconomicMathematicsInteractionState,
  validateEconomicMathematicsInteractionValues,
  type EconomicMathematicsInteractionScalar
} from "./economic-mathematics/interactions.js";

export interface CourseDeckSlideSummary {
  index: number;
  slideKey: string;
  lessonNumber: number;
  lessonTitle: string;
  section: string;
  title: string;
  summary: string;
}

export interface CourseDeckLessonSummary {
  number: number;
  title: string;
  slideStart: number;
  slideEnd: number;
  slideTotal: number;
  status: "ready" | "planned";
}

export interface CourseDeckPosition {
  globalIndex: number;
  lessonNumber: number;
  lessonStart: number;
  lessonEnd: number;
  localIndex: number;
  localTotal: number;
}

export interface CoursePresentationProfile {
  shortTitle: string;
  categoryLabel: string;
  description: string;
  heroImage: string;
  accent: "port" | "economic-mathematics";
  assistantName: string;
  supportsStudy: boolean;
  resources: readonly {
    role: string;
    title: string;
    detail: string;
    url?: string;
  }[];
}

export interface CourseDeckDescriptor {
  courseId: string;
  slug: string;
  code: string;
  deckId: string;
  versionId: string;
  title: string;
  totalHours: number;
  slideTotal: number;
  lessons: readonly CourseDeckLessonSummary[];
  allowedActivities: readonly (
    | "slides"
    | "globe"
    | "simulation"
    | "whiteboard"
    | "video"
    | "interaction"
  )[];
  presentation: CoursePresentationProfile;
  getSlide(index: number): CourseDeckSlideSummary;
  getSlideByKey(slideKey: string): CourseDeckSlideSummary | undefined;
  getLessonPosition(index: number): CourseDeckPosition | null;
  getGlobalIndex(lessonNumber: number, localIndex?: number): number | null;
  getInteractionDefaults(
    slideKey: string
  ): Readonly<Record<string, EconomicMathematicsInteractionScalar>> | null;
  validateInteractionPatch(
    slideKey: string,
    patch: Readonly<Record<string, EconomicMathematicsInteractionScalar>>,
    currentValues?: Readonly<Record<string, EconomicMathematicsInteractionScalar>>
  ): boolean;
}

function summarizePortSlide(index: number): CourseDeckSlideSummary {
  const safeIndex = Math.max(1, Math.min(PORT_MANAGEMENT_SLIDES.length, index));
  const slide = PORT_MANAGEMENT_SLIDES[safeIndex - 1]!;
  return {
    index: slide.index,
    slideKey: slide.slideKey,
    lessonNumber: slide.lesson,
    lessonTitle: slide.lessonTitle,
    section: slide.section,
    title: slide.title,
    summary: [
      slide.lead,
      ...(slide.bullets ?? []),
      ...(slide.steps ?? [])
    ]
      .filter(Boolean)
      .join("；") || slide.title
  };
}

const portLessons: CourseDeckLessonSummary[] = Array.from(
  new Set(PORT_MANAGEMENT_SLIDES.map((slide) => slide.lesson))
).map((lessonNumber) => {
  const slides = PORT_MANAGEMENT_SLIDES.filter(
    (slide) => slide.lesson === lessonNumber
  );
  return {
    number: lessonNumber,
    title: slides[0]?.lessonTitle ?? `第${lessonNumber}讲`,
    slideStart: slides[0]?.index ?? 1,
    slideEnd: slides.at(-1)?.index ?? 1,
    slideTotal: slides.length,
    status: "ready" as const
  };
});

const portDescriptor: CourseDeckDescriptor = {
  courseId: "course-port-management-intro",
  slug: "gangkou-guanli-gailun",
  code: "PM-INTRO-001",
  deckId: "deck-course-port-management-intro-foundations",
  versionId: "release-port-management-lbl-v8",
  title: "港口管理概论",
  totalHours: 32,
  slideTotal: PORT_MANAGEMENT_SLIDES.length,
  lessons: portLessons,
  allowedActivities: [
    "slides",
    "globe",
    "simulation",
    "whiteboard",
    "video",
    "interaction"
  ],
  presentation: {
    shortTitle: "港口管理",
    categoryLabel: "港航管理",
    description: "沿货物、航线与港口网络理解现代港口管理。",
    heroImage: "/course-assets/port-management/images/lesson1/oocl-spain-shanghai.png",
    accent: "port",
    assistantName: "澜舟",
    supportsStudy: true,
    resources: []
  },
  getSlide: summarizePortSlide,
  getSlideByKey(slideKey) {
    const resolvedKey=PORT_LBL_LEGACY_KEYS[slideKey]??slideKey;
    const slide = PORT_MANAGEMENT_SLIDES.find(
      (candidate) => candidate.slideKey === resolvedKey
    );
    return slide ? summarizePortSlide(slide.index) : undefined;
  },
  getLessonPosition(index) {
    const slide = PORT_MANAGEMENT_SLIDES[index - 1];
    if (!slide) return null;
    const lesson = portLessons.find(
      (candidate) => candidate.number === slide.lesson
    );
    if (!lesson) return null;
    return {
      globalIndex: index,
      lessonNumber: lesson.number,
      lessonStart: lesson.slideStart,
      lessonEnd: lesson.slideEnd,
      localIndex: index - lesson.slideStart + 1,
      localTotal: lesson.slideTotal
    };
  },
  getGlobalIndex(lessonNumber, localIndex = 1) {
    const lesson = portLessons.find(
      (candidate) => candidate.number === lessonNumber
    );
    if (!lesson || localIndex < 1 || localIndex > lesson.slideTotal) return null;
    return lesson.slideStart + localIndex - 1;
  },
  getInteractionDefaults() {
    return null;
  },
  validateInteractionPatch() {
    return false;
  }
};

function summarizeEconomicMathematicsSlide(
  index: number
): CourseDeckSlideSummary {
  const slide = getEconomicMathematicsSlide(index);
  return {
    index: slide.index,
    slideKey: slide.slideKey,
    lessonNumber: slide.lesson,
    lessonTitle: slide.lessonTitle,
    section: slide.section,
    title: slide.title,
    summary: [slide.lead, ...(slide.body ?? []), slide.prompt]
      .filter(Boolean)
      .join("；") || slide.title
  };
}

const economicMathematicsDescriptor: CourseDeckDescriptor = {
  courseId: ECONOMIC_MATHEMATICS_COURSE_ID,
  slug: ECONOMIC_MATHEMATICS_COURSE_SLUG,
  code: ECONOMIC_MATHEMATICS_COURSE_CODE,
  deckId: ECONOMIC_MATHEMATICS_DECK_ID,
  versionId: ECONOMIC_MATHEMATICS_VERSION_ID,
  title: "经济数学",
  totalHours: ECONOMIC_MATHEMATICS_TOTAL_HOURS,
  slideTotal: ECONOMIC_MATHEMATICS_SLIDES.length,
  lessons: ECONOMIC_MATHEMATICS_LESSONS.map((lesson) => ({
    number: lesson.number,
    title: lesson.title,
    slideStart: lesson.slideStart,
    slideEnd: lesson.slideEnd,
    slideTotal: lesson.slideTotal,
    status: "ready" as const
  })),
  allowedActivities: ["slides"],
  presentation: {
    shortTitle: "经济数学",
    categoryLabel: "商科基础",
    description:
      "从重庆消费情境出发，用函数、微积分与优化支持定价、客群和预算决策。",
    heroImage:
      "/course-assets/economic-mathematics/unit-01-functions-hero.webp",
    accent: "economic-mathematics",
    assistantName: "经数助教",
    supportsStudy: false,
    resources: ECONOMIC_MATHEMATICS_TEXTBOOKS.map((book) => ({
      role: book.role,
      title: book.title,
      detail: `${book.editor} · ${book.publisher} · ${book.year} · ISBN ${book.isbn}`,
      ...("url" in book && book.url ? { url: book.url } : {})
    }))
  },
  getSlide: summarizeEconomicMathematicsSlide,
  getSlideByKey(slideKey) {
    const slide = getEconomicMathematicsSlideByKey(slideKey);
    return slide ? summarizeEconomicMathematicsSlide(slide.index) : undefined;
  },
  getLessonPosition: getEconomicMathematicsLessonSlidePosition,
  getGlobalIndex: getEconomicMathematicsGlobalSlideIndex,
  getInteractionDefaults(slideKey) {
    const slide = getEconomicMathematicsSlideByKey(slideKey);
    if (!slide) return null;
    return getEconomicMathematicsInteractionDefinition(slide)?.defaults ?? null;
  },
  validateInteractionPatch(slideKey, patch, currentValues) {
    const slide = getEconomicMathematicsSlideByKey(slideKey);
    if (!slide) return false;
    const definition = getEconomicMathematicsInteractionDefinition(slide);
    if (!definition || !validateEconomicMathematicsInteractionValues(definition, patch)) {
      return false;
    }
    return validateEconomicMathematicsInteractionState(definition, {
      ...definition.defaults,
      ...currentValues,
      ...patch
    });
  }
};

export const COURSE_DECKS: readonly CourseDeckDescriptor[] = [
  portDescriptor,
  economicMathematicsDescriptor
];

export function getCourseDeckByCourseId(
  courseId: string
): CourseDeckDescriptor | undefined {
  return COURSE_DECKS.find((deck) => deck.courseId === courseId);
}

export function getCourseDeckByDeckId(
  deckId: string
): CourseDeckDescriptor | undefined {
  return COURSE_DECKS.find((deck) => deck.deckId === deckId);
}

export function getCoursePresentation(
  courseId: string
): CoursePresentationProfile | undefined {
  return getCourseDeckByCourseId(courseId)?.presentation;
}

export function isCourseDeckReady(courseId: string): boolean {
  return Boolean(getCourseDeckByCourseId(courseId)?.slideTotal);
}
