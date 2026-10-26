import { PageToolsContribution } from '../../classroom/PageTools';

export function EnterpriseLearningTool({ courseId, pageKey }: { courseId: string; pageKey: string }) {
  if (courseId !== 'course-port-management-intro') return null;
  return <PageToolsContribution pageKey={pageKey} title="个人经营" audience="local" priority="secondary">
    <a href="/port-enterprise" target="_blank" rel="noreferrer">打开个人长期经营 ↗</a>
    <a href="/port-enterprise?tab=tasks" target="_blank" rel="noreferrer">查看经营任务与提交 ↗</a>
  </PageToolsContribution>;
}
