import type { EconomicMathematicsUnitNumber } from "./types.js";

export const ECONOMIC_MATHEMATICS_COURSE_ID = "course-economic-mathematics";
export const ECONOMIC_MATHEMATICS_COURSE_SLUG = "economic-mathematics";
export const ECONOMIC_MATHEMATICS_COURSE_CODE = "14210850";
export const ECONOMIC_MATHEMATICS_DECK_ID = "deck-economic-mathematics-2026";
export const ECONOMIC_MATHEMATICS_VERSION_ID =
  "release-economic-mathematics-v1";
export const ECONOMIC_MATHEMATICS_CANVAS_WIDTH = 1600;
export const ECONOMIC_MATHEMATICS_CANVAS_HEIGHT = 1000;
export const ECONOMIC_MATHEMATICS_TOTAL_HOURS = 64;
export const ECONOMIC_MATHEMATICS_TOTAL_LESSONS = 32;
export const ECONOMIC_MATHEMATICS_EXPECTED_SLIDES = 1460;

export const ECONOMIC_MATHEMATICS_TEXTBOOKS = [
  {
    role: "指定教材",
    title: "经济数学——微积分（第5版）",
    editor: "吴传生 主编",
    publisher: "高等教育出版社",
    year: 2026,
    isbn: "978-7-04-066151-4",
    url: "https://www.hep.com.cn/book/show/d00ab8e3-a707-4083-8b71-6160b32eaaaa"
  },
  {
    role: "学习辅导",
    title: "经济数学——微积分 第4版 学习辅导与习题选解",
    editor: "吴传生 主编",
    publisher: "高等教育出版社",
    year: 2022,
    isbn: "978-7-04-057704-4"
  }
] as const;

export const ECONOMIC_MATHEMATICS_UNITS: readonly {
  number: EconomicMathematicsUnitNumber;
  title: string;
  hours: number;
  lessonStart: number;
  lessonEnd: number;
  expectedSlides: number;
}[] = [
  { number: 1, title: "函数与营销定量模型", hours: 4, lessonStart: 1, lessonEnd: 2, expectedSlides: 91 },
  { number: 2, title: "极限与连续", hours: 8, lessonStart: 3, lessonEnd: 6, expectedSlides: 183 },
  { number: 3, title: "导数与微分", hours: 10, lessonStart: 7, lessonEnd: 11, expectedSlides: 226 },
  { number: 4, title: "导数应用、边际与弹性分析", hours: 10, lessonStart: 12, lessonEnd: 16, expectedSlides: 228 },
  { number: 5, title: "不定积分", hours: 8, lessonStart: 17, lessonEnd: 20, expectedSlides: 178 },
  { number: 6, title: "定积分及累计量应用", hours: 10, lessonStart: 21, lessonEnd: 25, expectedSlides: 231 },
  { number: 7, title: "多元函数微分", hours: 8, lessonStart: 26, lessonEnd: 29, expectedSlides: 185 },
  { number: 8, title: "无约束、约束优化与营销决策", hours: 6, lessonStart: 30, lessonEnd: 32, expectedSlides: 138 }
] as const;

export const ECONOMIC_MATHEMATICS_MODEL_LEDGER = {
  priceSegments: {
    segmentA: "q_A=1200-10p",
    segmentB: "q_B=900-6p",
    unitCost: 20,
    fixedCost: 2000
  },
  cumulativeSales: "v(t)=120+24t-3t^2, 0<=t<=8",
  marketingResponse: "Q(p,a)=1200-8p+24sqrt(a)",
  unconstrainedProfit: "Pi(x,y)=40x+30y-x^2-y^2-100",
  constrainedResponse: "G(x,y)=40sqrt(x)+30sqrt(y), x+y=B"
} as const;
