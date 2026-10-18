import { useEffect, useRef, useState } from 'react';
import { usePresentationFullscreen } from '../classroom/usePresentationFullscreen';
import { ECONOMIC_MATHEMATICS_LESSONS } from '@edu/course-content/economic-mathematics';
import './presentation.css';

export const COURSE_REVEAL_EVENT = 'edu:course-reveal';
export interface CourseNavigation {
  index: number;
  titles: readonly string[];
  onChange: (index: number) => void;
}
export function CoursePageNavigation({ index, titles, onChange }: CourseNavigation) {
  return <nav className="em-page-navigation" aria-label="课件翻页">
    <button type="button" aria-label="上一页" title="上一页 · ←" disabled={index === 0} onClick={() => onChange(index - 1)}>←</button>
    <select aria-label="课程页码" value={index} onChange={event => onChange(Number(event.target.value))}>
      {titles.map((title, i) => <option key={i} value={i}>{`${String(i + 1).padStart(2, '0')} ${title.replaceAll('\n', '')}`}</option>)}
    </select>
    <span className="em-page-position">{index + 1} / {titles.length}</span>
    <button type="button" aria-label="下一页" title="下一页 · →" disabled={index === titles.length - 1} onClick={() => onChange(index + 1)}>→</button>
  </nav>;
}

export function useCourseFullscreen() {
  const [error, setError] = useState('');
  const controls = usePresentationFullscreen({ documentTarget: true, onError: setError });
  return { ...controls, error };
}

interface CourseHeaderProps {
  lesson: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  duration: string;
  onRestart: () => void;
}
export function CourseHeader({ lesson, duration, onRestart }: CourseHeaderProps) {
  const resources = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !resources.current?.contains(event.target)) resources.current?.removeAttribute('open');
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);
  return <>
    <header className="em-course-header">
      <span className="em-course-brand">经济数学</span>
      <select aria-label="选择讲次" value={lesson} onChange={event => {
        const next = Number(event.target.value);
        if (next !== lesson) location.assign(next === 1 ? '/course-assets/economic-mathematics/prelude/index.html' : '/economic-narration.html?lesson=' + next);
      }}>{ECONOMIC_MATHEMATICS_LESSONS.slice(0,7).map(l=><option key={l.number} value={l.number}>{'第'+l.number+'讲 · '+l.title}</option>)}</select>
      <span className="em-course-duration">{duration}</span>
      <details className="em-course-resources" ref={resources}><summary>资料与帮助</summary><div>
        {lesson === 1 ? <>
          <a href="/course-assets/economic-mathematics/prelude/economic-mathematics-prelude-teacher.pdf" download>下载备课PDF</a>
          <a href="/course-assets/economic-mathematics/prelude/economic-mathematics-prelude.mp4" download>下载开场短片</a>
          <a href="/course-assets/economic-mathematics/prelude/motion.html" target="_blank" rel="noreferrer">查看动画时间轴</a>
        </> : lesson === 2 ? <>
          <a href="/course-assets/economic-mathematics/refined/worksheet-print.html" target="_blank" rel="noreferrer">课堂练习单</a>
          <a href="/course-assets/economic-mathematics/refined/answers-print.html" target="_blank" rel="noreferrer">练习答案</a>
          <a href="/course-assets/economic-mathematics/refined/teacher-print.html" target="_blank" rel="noreferrer">备课讲稿</a>
        </> : <>
          <a href={'/course-assets/economic-mathematics/limits/lesson0' + lesson + '-teacher.pdf'} download>下载备课PDF</a>
          <a href={'/course-assets/economic-mathematics/limits/lesson0' + lesson + '-worksheet.html'} target="_blank" rel="noreferrer">课堂练习单</a>
          <a href={'/course-assets/economic-mathematics/limits/lesson0' + lesson + '-script.html'} target="_blank" rel="noreferrer">完整讲稿与答案</a>
          {lesson<=4&&<a href="/course-assets/economic-mathematics/calculus-history/index.html" target="_blank" rel="noreferrer">独立短片与来源</a>}
        </>}
        <p>← → 翻页 · 空格展开步骤<br/>Esc 返回教师界面 · 自动保存进度</p>
        <a href="/avatar/live2d/NOTICE.txt" target="_blank" rel="noreferrer">数字人素材许可</a>
        <button type="button" onClick={() => { onRestart(); resources.current?.removeAttribute('open'); }}>{lesson === 1 ? '重置第1讲进度' : '回到本讲首页'}</button>
      </div></details>
    </header>
  </>;
}
