import type { EconomicMathematicsAuthoredSlide as Slide, EconomicMathematicsLessonDefinition as Lesson } from './types.js';

/** Structural helper only. Every question, explanation and speech paragraph is authored in its lesson. */
export type FoundationPage = Omit<Partial<Slide>, 'teachingSeconds'> & {
  title: string;
  seconds: number;
  teachingCue: string;
  speech: readonly string[];
};
export function foundationLesson(number: 5 | 6, title: string, question: string, outcomes: readonly string[], routes: readonly [string, string], split: number, pages: readonly FoundationPage[]) {
  const core = pages.filter(p => p.routeRole !== 'optional');
  if (core.length !== pages.slice(0, core.length).filter(p => p.routeRole !== 'optional').length) throw new Error('FOUNDATION_OPTIONAL_ORDER');
  for (const span of [core.slice(0, split), core.slice(split)]) if (span.reduce((s,p) => s+p.seconds,0) !== 2700) throw new Error(`FOUNDATION_TIME:${number}`);
  const key = (i: number) => `em-l0${number}-limits-depth-20261016-p${String(i+1).padStart(3,'0')}`;
  const slides = pages.map(({speech, seconds, teachingCue, ...page}, i): Slide => {
    if (speech.length !== 1 + (page.steps?.length ?? 0)) throw new Error(`FOUNDATION_SPEECH:${number}:${i+1}`);
    const hour = i < split ? 1 : 2;
    return {
      slideKey:key(i), compositionId:`em-l0${number}-depth-composition-${i+1}`,
      section:number===5?'重要极限与等价无穷小':'连续性与存在性',
      kicker:`经济数学 / 第${number===5?'五':'六'}讲 / ${page.routeRole==='optional'?'拓展思考':'第'+hour+'课时'}`,
      kind:'definition', visual:'formula-board', layout:'essay', style:'editorial', accent:'ink', sourceLabel:'概念模型', sourceNote:'数学例题',
      classHour:hour, routeRole:'core', teachingSeconds:seconds, moduleId:`foundations-${number}-${hour}`,
      teachingCue:`${page.routeRole==='optional'?'拓展另行安排。':'预计'+seconds+'秒。'}${teachingCue}`,
      assistantCue:'只解释当前公开的题设、图形和揭示步骤，不提前透露答案。角度公式采用弧度；等价关系注明趋近过程和非零条件。区分函数值、极限、连续与可导。商业模型均为给定假设，不是统计估计。定理只能在其全部条件满足时使用。',
      ...page
    };
  });
  const lesson: Lesson = {number, title, unit:2, unitTitle:'极限与连续', hours:2, expectedSlides:slides.length, coreQuestion:question, outcomes, exerciseCapability:outcomes.join('；'),
    prerequisites:number===5?['第三、四讲极限定义、左右极限、极限法则与夹逼','高中三角恒等式、指数与对数']:['第三、四讲函数值与左右极限','第五讲重要极限与等价无穷小'],
    route:routes.map(activity=>({minutes:45,activity})), classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:core.length,activity:routes[1]}], slides};
  return {lesson, narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
