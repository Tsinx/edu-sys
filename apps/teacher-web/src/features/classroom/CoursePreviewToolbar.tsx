import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FullscreenButtons } from './FullscreenButtons';
import { usePresentationFullscreen } from './usePresentationFullscreen';
import { PresentationToolbar } from './PageTools';
import './page-tools.css';

export function CoursePreviewToolbar({ page, titles, onPage, title, onProjection, children, previousPage, nextPage }:
  { page: number; titles: readonly string[]; onPage: (page: number) => void; title: string; onProjection?: () => void; children?: ReactNode; previousPage?: number | null; nextPage?: number | null }) {
  const [fullscreenError, setFullscreenError] = useState('');
  const fullscreen = usePresentationFullscreen({ documentTarget: true, onError: setFullscreenError });
  const previous = previousPage === undefined ? page > 1 ? page - 1 : null : previousPage;
  const next = nextPage === undefined ? page < titles.length ? page + 1 : null : nextPage;
  return <><PresentationToolbar label="课件工具栏" navigation={<nav className="presentation-slide-navigation" aria-label="课件翻页">
    <button type="button" aria-label="上一页" disabled={previous === null} onClick={() => previous !== null && onPage(previous)}><ChevronLeft size={18}/></button>
    <label className="presentation-slide-page"><small>{title}</small><input type="number" aria-label="当前页码" min="1" max={titles.length} value={page}
      onChange={event => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= titles.length) onPage(next); }}/><span>/ {titles.length}</span></label>
    <button type="button" aria-label="下一页" disabled={next === null} onClick={() => next !== null && onPage(next)}><ChevronRight size={18}/></button>
  </nav>} more={<>
    <label>选择页面<select aria-label={`${title}课件页`} value={page} onChange={event => onPage(Number(event.target.value))}>
      {titles.map((text, index) => <option key={index} value={index + 1}>{index + 1} · {text}</option>)}
    </select></label>{children}
    {onProjection && <button type="button" onClick={() => void fullscreen.exitFullscreen().then(onProjection)}>纯画面投影</button>}
  </>} end={<FullscreenButtons controls={fullscreen}/>}/>
    {fullscreenError && <p className="presentation-fullscreen-notice" role="status">{fullscreenError}</p>}
  </>;
}
