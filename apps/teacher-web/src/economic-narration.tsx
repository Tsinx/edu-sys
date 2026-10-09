import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ECONOMIC_MATHEMATICS_SLIDES, ECONOMIC_MATHEMATICS_DECK_ID, ECONOMIC_MATHEMATICS_VERSION_ID, getEconomicMathematicsInteractionDefinition, validateEconomicMathematicsInteractionState } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';
import { EconomicMathematicsSlideStage } from './features/economic-mathematics/EconomicMathematicsSlideStage';
import './features/economic-mathematics/narration-viewer.css';
const pages = ECONOMIC_MATHEMATICS_SLIDES.filter(p => p.lesson === 2), storage = 'economic-narration-lesson02-mapping-v1';
const reviewMode = new URLSearchParams(location.search).get('review') === '1';
function restore(): { index: number; values: Record<string, SlideInteractionValues> } {
  if (reviewMode) return { index: 0, values: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(storage) ?? '{}');
    if (raw.version !== ECONOMIC_MATHEMATICS_VERSION_ID) return { index: 0, values: {} };
    const values: Record<string, SlideInteractionValues> = {};
    for (const p of pages) { const def = getEconomicMathematicsInteractionDefinition(p); if (def && raw.values?.[p.slideKey] && validateEconomicMathematicsInteractionState(def, raw.values[p.slideKey])) values[p.slideKey] = raw.values[p.slideKey]; }
    const byKey = pages.findIndex(p => p.slideKey === raw.slideKey);
    return { index: byKey >= 0 ? byKey : Number.isInteger(raw.index) ? Math.max(0, Math.min(pages.length - 1, raw.index)) : 0, values };
  } catch { return { index: 0, values: {} }; }
}
function Viewer() {
  const [saved] = useState(restore);
  const [index, setIndex] = useState(() => { const query = new URLSearchParams(location.search); const p = Number(query.get('page')); return Number.isInteger(p) && p >= 1 && p <= pages.length ? p - 1 : query.has('lesson') ? 0 : saved.index; });
  const [allValues, setAllValues] = useState(saved.values);
  const spec = pages[index]!, def = getEconomicMathematicsInteractionDefinition(spec), values = allValues[spec.slideKey] ?? { ...def?.defaults };
  const patch = (next: SlideInteractionValues) => { const merged = { ...values, ...next }; if (def && validateEconomicMathematicsInteractionState(def, merged)) setAllValues(old => ({ ...old, [spec.slideKey]: merged })); };
  useEffect(() => {
    try { if (!reviewMode) localStorage.setItem(storage, JSON.stringify({ version: ECONOMIC_MATHEMATICS_VERSION_ID, slideKey: spec.slideKey, index, values: allValues })); } catch { /* Playback remains available without persistence. */ }
    const url = new URL(location.href); url.searchParams.set('page', String(index + 1)); url.searchParams.set('lesson', String(pages[index]!.lesson)); history.replaceState(null, '', url);
  }, [index, allValues]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,select,button,textarea') || e.ctrlKey || e.altKey || e.metaKey) return; if (e.key === 'ArrowRight') setIndex(i => Math.min(pages.length - 1, i + 1)); if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1)); }; addEventListener('keydown', key); return () => removeEventListener('keydown', key); }, []);
  return <main className="em-narration-viewer"><nav aria-label="讲次导航"><a href="/course-assets/economic-mathematics/prelude/index.html">第1讲 · 课程引入</a><button onClick={() => setIndex(0)}>第2讲 · 函数与营销定量模型</button><button disabled={!index} onClick={() => setIndex(index - 1)}>上一页</button><select aria-label="课程页码" value={index} onChange={e => setIndex(Number(e.target.value))}>{pages.map((p, i) => <option value={i} key={p.slideKey}>{`第${p.lesson}讲 ${p.localIndex}/${p.localTotal} ${p.title}`}</option>)}</select><button disabled={index === pages.length - 1} onClick={() => setIndex(index + 1)}>下一页</button><button onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>全屏演示</button></nav><EconomicMathematicsSlideStage frame={{ index: spec.index, deckId: ECONOMIC_MATHEMATICS_DECK_ID, versionId: ECONOMIC_MATHEMATICS_VERSION_ID, slideId: spec.slideKey, total: ECONOMIC_MATHEMATICS_SLIDES.length, title: spec.title, summary: spec.title, lessonNumber: spec.lesson, lessonTitle: spec.lessonTitle, section: spec.section, logicalWidth: 1600, logicalHeight: 1000, aspectRatio: '16:10' }} interaction={def ? { deckId: ECONOMIC_MATHEMATICS_DECK_ID, slideId: spec.slideKey, revision: 1, values } : null} readOnly={false} onInteractionPatch={patch} onInteractionReset={() => setAllValues(old => ({ ...old, [spec.slideKey]: { ...def?.defaults } }))}/></main>;
}
// This release uses a fresh storage namespace; historical positions are never remapped.
if (new URLSearchParams(location.search).get('lesson') === '1' && !new URLSearchParams(location.search).has('page')) location.replace('/course-assets/economic-mathematics/prelude/index.html');
else {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Viewer/>);
  import.meta.hot?.dispose(() => root.unmount());
}
