import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Recover without rendering an unrelated page or changing the saved classroom. */
export function ClassroomDeckNotice({ courseId, english = false }: { courseId: string; english?: boolean }) {
  return <main className="classroom-subsystem classroom-subsystem--centered" role="alert">
    <CircleAlert size={34} />
    <h1>{english ? 'Classroom slides need to sync' : '课堂课件需要重新同步'}</h1>
    <p>{english ? 'The classroom and this page use different slide versions or positions. Reload to sync. Your saved classroom is retained.' : '课堂快照与当前课件的版本或页码不一致。请重新加载同步，已保存的课堂记录会保留。'}</p>
    <button type="button" className="classroom-secondary-button" onClick={() => window.location.reload()}>{english ? 'Reload classroom' : '重新加载课堂'}</button>
    <Link className="classroom-secondary-button" to={`/courses/${courseId}`}>{english ? 'Return to course' : '返回课程工作区'}</Link>
  </main>;
}
