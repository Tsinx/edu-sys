import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Recover without rendering an unrelated page or changing the saved classroom. */
export function ClassroomDeckNotice({ courseId, english = false, issue = 'sync', student = false, lessonNumber,
  onStartNew, busy = false, error = '' }: {
  courseId: string; english?: boolean; issue?: 'archived' | 'sync'; student?: boolean; lessonNumber?: number;
  onStartNew?: () => void; busy?: boolean; error?: string;
}) {
  const archived = issue === 'archived';
  return <main className="classroom-subsystem classroom-subsystem--centered classroom-deck-notice" role="alert">
    <CircleAlert size={34} />
    <h1>{archived ? (english ? 'This classroom uses archived slides' : '此课堂使用的课件已归档') : (english ? 'Classroom slides need to sync' : '课堂课件需要重新同步')}</h1>
    <p className="classroom-deck-notice__body">{archived
      ? (english ? 'The course has a newer slide release. This classroom retains its original version, page position and experiment state. Reloading cannot switch its release.' : '课程课件已更新。这个课堂保留原版本、页码和实验状态，刷新页面不会切换到新版。')
      : (english ? 'The classroom and this page use different slide versions or positions. Reload to sync. Your saved classroom is retained.' : '课堂快照与当前课件的版本或页码不一致。请重新加载同步，已保存的课堂记录会保留。')}</p>
    {archived && <p className="classroom-deck-notice__body">{student
      ? (english ? 'Ask your teacher for the new classroom link, or read the current course slides independently.' : '请使用老师提供的新课堂链接，或先独立阅读当前课件。')
      : (english ? `Start a separate classroom using the current slides${lessonNumber ? ` from the beginning of Lecture ${lessonNumber}` : ''}. The original classroom record will remain available.` : `可使用新版另开课堂${lessonNumber ? `，从第${lessonNumber}讲首页开始` : ''}。原课堂记录继续保留。`)}</p>}
    {error && <p className="classroom-deck-notice__body" role="status">{error}</p>}
    <div className="classroom-deck-notice__actions">
      {archived ? (!student && onStartNew && <button type="button" className="classroom-primary-button" disabled={busy} onClick={onStartNew}>{busy ? (english ? 'Starting…' : '正在开启…') : (english ? 'Start a new classroom' : '使用新版新建课堂')}</button>)
        : <button type="button" className="classroom-secondary-button" onClick={() => window.location.reload()}>{english ? 'Reload classroom' : '重新加载课堂'}</button>}
      <Link className="classroom-secondary-button" to={student ? `/study/${courseId}` : `/courses/${courseId}`}>{student ? (english ? 'Read current slides' : '独立阅读新版课件') : (english ? 'Return to course' : '返回课程工作区')}</Link>
    </div>
  </main>;
}
