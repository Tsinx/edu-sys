import type { SlideFrame } from '@edu/contracts';
import { FlaskConical } from 'lucide-react';
import { PageToolsContribution } from '../classroom/PageTools';

/** Page resources belong to the course adapter, not the classroom shell. */
export function PortClassroomResources({ courseId, frame, localIndex, disabled, onSimulation }:
  { courseId: string; frame: SlideFrame; localIndex: number; disabled: boolean; onSimulation: () => void }) {
  const lesson = frame.lessonNumber ?? 0;
  if (courseId !== 'course-port-management-intro' || lesson < 4 || lesson > 10) return null;
  const url = lesson >= 7 ? `/port-expansion-preview.html?lesson=${lesson}&page=${localIndex}`
    : `/port-lesson-${({4:'four',5:'five',6:'six'} as const)[lesson as 4|5|6]}-preview.html?page=${localIndex}`;
  return <PageToolsContribution pageKey={frame.slideId} title="课程资源" priority="secondary">
    <a href={url} target="_blank" rel="noreferrer">第{lesson}讲授课台 ↗</a>
    {lesson === 4 && <button type="button" disabled={disabled} onClick={onSimulation}><FlaskConical size={18}/>仿真系统</button>}
  </PageToolsContribution>;
}
