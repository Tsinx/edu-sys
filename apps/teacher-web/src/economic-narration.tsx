import './features/classroom/page-tools.css';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ECONOMIC_MATHEMATICS_SLIDES, ECONOMIC_MATHEMATICS_DECK_ID, ECONOMIC_MATHEMATICS_VERSION_ID, getEconomicMathematicsInteractionDefinition, validateEconomicMathematicsInteractionState } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';
import { EconomicMathematicsSlideStage } from './features/economic-mathematics/EconomicMathematicsSlideStage';
import { CourseHeader, CoursePageNavigation, COURSE_REVEAL_EVENT, useCourseFullscreen } from './features/economic-mathematics/PresentationChrome';
import { FullscreenButtons } from './features/classroom/FullscreenButtons';
import './features/economic-mathematics/narration-viewer.css';
import { PageToolsProvider, PresentationToolbar } from './features/classroom/PageTools';
const requestedLesson = Number(new URLSearchParams(location.search).get('lesson') ?? 2);
const selectedLesson = ([2,3,4,5,6,7,8,9,10,11,12].includes(requestedLesson) ? requestedLesson : 2) as 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
const pages = ECONOMIC_MATHEMATICS_SLIDES.filter(p => p.lesson === selectedLesson);
const optionalPages=pages.filter(p=>p.routeRole==='optional').length;
document.title = '经济数学 · 第' + selectedLesson + '讲 · ' + pages[0]!.lessonTitle;
const storage = [11,12].includes(selectedLesson) ? 'economic-narration-analysis-20261022-lesson'+selectedLesson : [8,9,10].includes(selectedLesson) ? 'economic-narration-calculus-20261020-lesson'+selectedLesson : [6,7].includes(selectedLesson) ? 'economic-narration-calculus-20261017-lesson'+selectedLesson : [4,5].includes(selectedLesson) ? 'economic-narration-math-first-20261016-lesson'+selectedLesson : selectedLesson === 2 ? 'economic-narration-lesson02-mapping-v1' : 'economic-narration-limits-reinforcement-20261013-lesson' + selectedLesson;
const reviewMode = new URLSearchParams(location.search).get('review') === '1';
function restore(): { index: number; values: Record<string, SlideInteractionValues> } {
  if (reviewMode) return { index: 0, values: new URLSearchParams(location.search).get('answers') === '1' ? Object.fromEntries(pages.filter(p=>p.steps?.length||p.limitLab||p.historyFilm).map(p=>[p.slideKey,{...getEconomicMathematicsInteractionDefinition(p)?.defaults,presentationStep:p.steps?.length??0}])) : {} };
  try {
    const raw = JSON.parse(localStorage.getItem(storage) ?? '{}');
    const sameVersion = raw.version === ECONOMIC_MATHEMATICS_VERSION_ID;
    const compatibleKeys = (selectedLesson<=10 && raw.version==='release-economic-mathematics-differentiation-2026-10-20') || (selectedLesson<=7 && raw.version==='release-economic-mathematics-continuity-derivative-2026-10-17') || (selectedLesson<=5 && raw.version==='release-economic-mathematics-math-first-2026-10-16') || (selectedLesson<=3 && raw.version==='release-economic-mathematics-limits-reinforcement-2026-10-13');
    if (!sameVersion && !compatibleKeys && !(selectedLesson === 2 && ['release-economic-mathematics-lesson02-mapping-2026-10-09','release-economic-mathematics-limits-refined-2026-10-10','release-economic-mathematics-limits-sequence-2026-10-11'].includes(raw.version))) return { index: 0, values: {} };
    const values: Record<string, SlideInteractionValues> = {};
    for (const p of pages) { const def = getEconomicMathematicsInteractionDefinition(p); if (def && raw.values?.[p.slideKey] && validateEconomicMathematicsInteractionState(def, raw.values[p.slideKey])) values[p.slideKey] = raw.values[p.slideKey]; }
    const byKey = pages.findIndex(p => p.slideKey === raw.slideKey);
    return { index: byKey >= 0 ? byKey : sameVersion && Number.isInteger(raw.index) ? Math.max(0, Math.min(pages.length - 1, raw.index)) : 0, values };
  } catch { return { index: 0, values: {} }; }
}
function Viewer() {
  const fullscreen = useCourseFullscreen();
  const [saved] = useState(restore);
  const [index, setIndex] = useState(() => { const query = new URLSearchParams(location.search); const p = Number(query.get('page')); return Number.isInteger(p) && p >= 1 && p <= pages.length ? p - 1 : query.has('lesson') ? 0 : saved.index; });
  const [allValues, setAllValues] = useState(saved.values);
  const spec = pages[index]!, def = getEconomicMathematicsInteractionDefinition(spec), values = allValues[spec.slideKey] ?? { ...def?.defaults };
  const patch = (next: SlideInteractionValues) => {
    if (!def) return;
    setAllValues(old => {
      const merged = { ...(old[spec.slideKey] ?? def.defaults), ...next };
      return validateEconomicMathematicsInteractionState(def, merged) ? { ...old, [spec.slideKey]: merged } : old;
    });
  };
  useEffect(() => {
    try { if (!reviewMode) localStorage.setItem(storage, JSON.stringify({ version: ECONOMIC_MATHEMATICS_VERSION_ID, slideKey: spec.slideKey, index, values: allValues })); } catch { /* Playback remains available without persistence. */ }
    const url = new URL(location.href); url.searchParams.set('page', String(index + 1)); url.searchParams.set('lesson', String(pages[index]!.lesson)); history.replaceState(null, '', url);
  }, [index, allValues]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.isComposing || (e.target instanceof Element && e.target.closest('input,select,button,textarea,video,[contenteditable="true"]')) || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => Math.min(pages.length - 1, i + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
      if (e.key === ' ') { e.preventDefault(); window.dispatchEvent(new Event(COURSE_REVEAL_EVENT)); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, []);
  return <PageToolsProvider courseId="course-economic-mathematics" pageKey={spec.slideKey} role="teacher"><main className="em-narration-viewer">
    <CourseHeader lesson={selectedLesson} duration={optionalPages?`2 × 45分钟 · 主线${pages.length-optionalPages}页＋拓展${optionalPages}页`:`2 × 45分钟 · ${pages.length}页`} onRestart={() => setIndex(0)}/>
    <EconomicMathematicsSlideStage frame={{ index: spec.index, deckId: ECONOMIC_MATHEMATICS_DECK_ID, versionId: ECONOMIC_MATHEMATICS_VERSION_ID, slideId: spec.slideKey, total: ECONOMIC_MATHEMATICS_SLIDES.length, title: spec.title, summary: spec.title, lessonNumber: spec.lesson, lessonTitle: spec.lessonTitle, section: spec.section, logicalWidth: 1600, logicalHeight: 1000, aspectRatio: '16:10' }} interaction={def ? { deckId: ECONOMIC_MATHEMATICS_DECK_ID, slideId: spec.slideKey, revision: 1, values } : null} readOnly={false} onInteractionPatch={patch} onInteractionReset={() => setAllValues(old => ({ ...old, [spec.slideKey]: { ...def?.defaults } }))}/>
    <PresentationToolbar label="课件工具栏" navigation={<CoursePageNavigation index={index} titles={pages.map(page => page.title)} onChange={setIndex}/>}
      end={<FullscreenButtons controls={fullscreen}/>}/>
    {fullscreen.error && <p className="presentation-fullscreen-notice" role="status">{fullscreen.error}</p>}
  </main></PageToolsProvider>;
}
// This release uses a fresh storage namespace; historical positions are never remapped.
if (new URLSearchParams(location.search).get('lesson') === '1' && !new URLSearchParams(location.search).has('page')) location.replace('/course-assets/economic-mathematics/prelude/index.html');
else {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Viewer/>);
  import.meta.hot?.dispose(() => root.unmount());
}
