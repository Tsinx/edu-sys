import type { EconomicMathematicsAuthoredSlide as Slide, EconomicMathematicsLessonDefinition as Lesson } from './types.js';

export type LimitPage = Partial<Slide> & { title: string; teachingCue: string; speech: readonly string[] };
/** Only IDs, privacy and route metadata are supplied here; each page is authored separately. */
export function limitsLesson(number: 3 | 4, title: string, question: string, outcomes: readonly string[], pages: readonly LimitPage[], minutes: readonly number[], split: number): { lesson: Lesson; narration: Readonly<Record<string, readonly string[]>> } {
  if (pages.length !== minutes.length) throw new Error(`LIMIT_PAGE_BUDGET:${number}`);
  for (const span of [minutes.slice(0, split), minutes.slice(split)]) if (span.reduce((s, n) => s + n, 0) !== 45) throw new Error(`LIMIT_HOUR_BUDGET:${number}`);
  const key = (i: number) => `em-l0${number}-limits-sequence-20261011-p${String(i + 1).padStart(3, '0')}`;
  const slides = pages.map(({ teachingCue, speech, ...page }, i): Slide => {
    if (speech.length !== 1 + (page.steps?.length ?? 0)) throw new Error(`LIMIT_NARRATION_STEPS:${number}:${i + 1}`);
    return {
      slideKey: key(i), compositionId: `em-l0${number}-limits-sequence-composition-${i + 1}`,
      section: '极限、证据与条件', kicker: `经济数学 / 第${number === 3 ? '三' : '四'}讲 / 第${i < split ? '一' : '二'}课时`,
      kind: 'definition', visual: 'formula-board', sourceLabel: '概念模型', sourceNote: '数学例题', accent: 'ink', layout: 'essay', style: 'editorial',
      teachingCue: `预计${minutes[i]}分钟。${teachingCue}${page.exerciseMinutes ? '留足独立作答时间，计时不自动公开答案。' : ''}`,
      assistantCue: '只依据当前已公开文字、公式和图形。不得提前透露隐藏步骤、后页练习答案或历史作者的虚构对白。新词先解释含义；商家和合同是给定教学假设，不是统计估计。区分报价网格与连续近似、有限合同与理想延伸，保持原题单位。',
      classHour: i < split ? 1 : 2, routeRole: 'core', teachingSeconds: minutes[i]! * 60, moduleId: `limits-l${number}-hour${i < split ? 1 : 2}`,
      ...page
    };
  });
  const route = number === 3 ? ['差商与历史短片 → 数列与无穷直觉 → 误差带与ε–N → 基础判断、门槛证明及反馈', '否定条件与正负无穷 → 扩容期限 → 数列到函数、ε–δ及练习 → 返回80元两侧'] : ['从80元两侧到左右极限 → 合同门槛 → 有条件的法则与变形 → 基础选择与参数证明', '有限采购范围与理想延伸 → 输入规模与输出高度 → 夹逼 → 本批采购与库存费用'];
  return { narration: Object.fromEntries(pages.map((page, i) => [key(i), page.speech])), lesson: {
    number, title, unit: 2, unitTitle: '极限与连续', hours: 2, expectedSlides: pages.length, coreQuestion: question, exerciseCapability: outcomes.join('；'),
    prerequisites: ['第二讲商家模型、可行集和报价网格', '高中导数符号、代数恒等式、绝对值与指数'], outcomes,
    route: route.map(activity => ({ minutes: 45, activity })),
    classHours: [{ hour: 1, minutes: 45, slideStart: 1, slideEnd: split, activity: route[0]! }, { hour: 2, minutes: 45, slideStart: split + 1, slideEnd: slides.length, activity: route[1]! }], slides
  } };
}
