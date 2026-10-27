import type { SlideFrame } from '@edu/contracts';
import { FlaskConical } from 'lucide-react';
import { PageToolsContribution } from '../classroom/PageTools';

/** Page resources belong to the course adapter, not the classroom shell. */
export function PortClassroomResources({ courseId, frame, localIndex, disabled, onSimulation }:
  { courseId: string; frame: SlideFrame; localIndex: number; disabled: boolean; onSimulation: () => void }) {
  const lesson = frame.lessonNumber ?? 0;
  if (courseId !== 'course-port-management-intro') return null;
  const url = lesson >= 7 && lesson <= 18 ? `/port-expansion-preview.html?lesson=${lesson}&page=${localIndex}`
    : lesson >= 4 && lesson <= 6 ? `/port-lesson-${({4:'four',5:'five',6:'six'} as const)[lesson as 4|5|6]}-preview.html?page=${localIndex}` : undefined;
  return <PageToolsContribution pageKey={frame.slideId} title="课程资源" priority="secondary">
    {url && <a href={url} target="_blank" rel="noreferrer">第{lesson}讲授课台 ↗</a>}
    {lesson === 18 && <a href="/port-investment-lab.html" target="_blank" rel="noreferrer">第18讲 · 分期投资模拟 ↗</a>}
    <a href="/port-enterprise" target="_blank" rel="noreferrer">港口长期独立经营 ↗</a>
    <a href="/port-enterprise?tab=tasks" target="_blank" rel="noreferrer">发布个人经营任务与查看结果 ↗</a>
    {(lesson === 11 || lesson === 12) && <a href={`/port-class-lab.html?lesson=${lesson}`} target="_blank" rel="noreferrer">第{lesson}讲 · 30分钟专用实验 ↗</a>}
    {lesson === 4 && <button type="button" disabled={disabled} onClick={onSimulation}><FlaskConical size={18}/>仿真系统</button>}
  </PageToolsContribution>;
}
