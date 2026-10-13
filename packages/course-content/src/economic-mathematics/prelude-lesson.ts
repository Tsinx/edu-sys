import data from './prelude-pages.json' with { type: 'json' };
import type { EconomicMathematicsLessonDefinition } from './types.js';

// A projection of the individually authored prelude, not a second set of prose.
interface Page {
  id: string; title: string; section: string; layout: string; subtitle?: string;
  lines?: string[]; items?: string[][]; columns?: string[]; rows?: string[][];
  options?: string[]; reveals?: string[]; conclusion?: string; source?: string; unit?: number;
}
export const preludeLesson: EconomicMathematicsLessonDefinition = {
  number: 1, unit: 1, unitTitle: '课程引入与函数模型', title: '课程引入：从一个点开始',
  hours: 1, expectedSlides: 40, coreQuestion: '如何用数学检查一个经济判断？',
  exerciseCapability: '区分收入与利润，使用比例关系检验降价判断。',
  prerequisites: ['乘法与比例'], outcomes: ['了解课程框架与学习要求', '使用比例关系检验收入与利润判断'],
  route: [{ minutes: 1.5, activity: '几何动态短片' }, { minutes: 12.5, activity: '课程框架' }, { minutes: 6, activity: '认识老师' }, { minutes: 13, activity: '学习须知' }, { minutes: 10, activity: '第一次数学判断' }, { minutes: 2, activity: '收束' }],
  slides: (data.pages as Page[]).map((p, i) => ({
    slideKey: `em-intro-${p.id}`, compositionId: `em-intro-${p.id}`, preludeId: p.id,
    title: p.title.replaceAll('\n', ''), section: p.section, kicker: '经济数学 / 第1讲',
    kind: 'scene', visual: 'editorial-scene', accent: 'cyan', sourceLabel: '公开资料', sourceNote: p.source,
    lead: p.subtitle,
    body: [...(p.lines ?? []), ...(p.items ?? []).map(row => row.join('：')), ...(p.options ?? []),
      ...(p.layout === 'map' ? data.units : p.unit ? [data.units[p.unit - 1]!] : []).map(u => `${u.title}：${u.hours}学时，第${u.lessons}讲`)],
    table: p.columns && p.rows ? { columns: p.columns, rows: p.rows } : undefined,
    steps: p.reveals?.map((text, j) => ({ title: text, text: j === p.reveals!.length - 1 ? p.conclusion : undefined })),
    teachingCue: `课程引入第${i + 1}页；按已公开步骤讲解。`, assistantCue: '仅讨论当前公开材料，不提前给出未公开答案。'
  }))
};
