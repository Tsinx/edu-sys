import { PORT_MANAGEMENT_SLIDES } from "./slides.js";
import { MANAGEMENT_BUILD, MANAGEMENT_COURSE_ID, MANAGEMENT_DECK_ID, MANAGEMENT_VERSION_ID, MANAGEMENT_SLIDES, MANAGEMENT_LESSONS, getManagementSlide, getManagementSlideByKey, getManagementLessonPosition, getManagementGlobalIndex, getManagementInteractionDefinition, validateManagementInteraction } from './management-principles/index.js';
import { STATISTICAL_ANALYSIS_SLIDES, STATISTICAL_ANALYSIS_LESSONS, STATISTICAL_ANALYSIS_COURSE_ID, STATISTICAL_ANALYSIS_DECK_ID, STATISTICAL_ANALYSIS_VERSION_ID, getStatisticalAnalysisSlide, getStatisticalAnalysisSlideByKey, getStatisticalAnalysisLessonPosition, getStatisticalAnalysisGlobalIndex } from './statistical-analysis/index.js';
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
  slideStart: number | null;
  slideEnd: number | null;
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
  accent: "port" | "economic-mathematics" | "statistical-analysis" | "management-principles";
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
  code: string | null;
  deckId: string;
  versionId: string;
  title: string;
  totalHours: number | null;
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
  versionId: "release-port-management-authored-v10",
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
    assistantName: "小麦老师",
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
    if (!lesson || lesson.slideStart === null || lesson.slideEnd === null) return null;
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
    if (!lesson || lesson.slideStart === null || localIndex < 1 || localIndex > lesson.slideTotal) return null;
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
    assistantName: "小麦老师",
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

const statisticalAnalysisDescriptor: CourseDeckDescriptor = {
  courseId: STATISTICAL_ANALYSIS_COURSE_ID, slug: 'statistical-analysis', code: 'statistical-analysis',
  deckId: STATISTICAL_ANALYSIS_DECK_ID, versionId: STATISTICAL_ANALYSIS_VERSION_ID,
  title: '统计分析方法', totalHours: 32, slideTotal: STATISTICAL_ANALYSIS_SLIDES.length,
  lessons: STATISTICAL_ANALYSIS_LESSONS, allowedActivities: ['slides'],
  presentation: {
    shortTitle: '统计分析', categoryLabel: '商科研究生',
    description: '从研究问题与数据证据出发，衔接科研可视化、回归、问卷测量、因果推断与时间序列。32课时16讲，前两讲各90分钟。',
    heroImage: '/course-assets/statistical-analysis/images/l1-01-retail-night.png',
    accent: 'statistical-analysis', assistantName: '小麦老师', supportsStudy: false,
    resources: [
      {role:'统计推断',title:'ASA关于p值的声明',detail:'2016 · 统计显著性与解释边界',url:'https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf'},
      {role:'数据',title:'Anscombe四重奏',detail:'R datasets · 原始点与统计摘要',url:'https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/anscombe.html'},
      {role:'科研图形',title:'Wilke · Fundamentals of Data Visualization',detail:'图形任务与图形分类',url:'https://clauswilke.com/dataviz/directory-of-visualizations.html'}
    ]
  },
  getSlide: getStatisticalAnalysisSlide, getSlideByKey: getStatisticalAnalysisSlideByKey,
  getLessonPosition: getStatisticalAnalysisLessonPosition, getGlobalIndex: getStatisticalAnalysisGlobalIndex,
  getInteractionDefaults: () => null, validateInteractionPatch: () => false
};

const managementDescriptor: CourseDeckDescriptor = {
  courseId: MANAGEMENT_COURSE_ID, slug: MANAGEMENT_COURSE_ID, code: null,
  deckId: MANAGEMENT_DECK_ID, versionId: MANAGEMENT_VERSION_ID, title: '管理学', totalHours: null,
  slideTotal: MANAGEMENT_SLIDES.length, lessons: MANAGEMENT_LESSONS, allowedActivities: ['slides'],
  presentation: { shortTitle:'管理学', categoryLabel:'管理学基础',
    description:'管理导论、管理理论演变、决策过程、环境分析与理性决策。管理学课程组 · 韦笑。',
    heroImage:'/course-assets/management-principles/mg-001.webp', accent:'management-principles', assistantName:'小麦老师', supportsStudy:false,
    resources:[{role:'课程署名',title:'管理学课程组 · 韦笑',detail:'据原始课件转换；课程代码及总学时待完善。'},{role:'建设范围',title:`前${MANAGEMENT_LESSONS.length}讲`,detail:`${MANAGEMENT_BUILD.sourcePageCount}个原页，${MANAGEMENT_SLIDES.length}个连续网页页面。`}]
  },
  getSlide:getManagementSlide, getSlideByKey:getManagementSlideByKey,
  getLessonPosition:getManagementLessonPosition, getGlobalIndex:getManagementGlobalIndex,
  getInteractionDefaults(key){const p=getManagementSlideByKey(key);return p?.demo?getManagementInteractionDefinition(p.demo).defaults:null;},
  validateInteractionPatch(key,patch,current){const p=getManagementSlideByKey(key);return p?.demo?validateManagementInteraction(p.demo,patch,current):false;}
};

export const COURSE_DECKS: readonly CourseDeckDescriptor[] = [
  portDescriptor,
  economicMathematicsDescriptor,
  statisticalAnalysisDescriptor,
  managementDescriptor
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
