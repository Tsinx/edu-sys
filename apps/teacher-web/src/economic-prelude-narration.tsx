import './features/classroom/page-tools.css';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { PageNarrator } from './features/economic-mathematics/PageNarrator';
import { CourseHeader, CoursePageNavigation, useCourseFullscreen } from './features/economic-mathematics/PresentationChrome';
import { FullscreenButtons } from './features/classroom/FullscreenButtons';
import { preludeNarration } from './features/economic-mathematics/narration-scripts';
import { PageToolsProvider, PresentationToolbar } from './features/classroom/PageTools';

interface PreludeSnapshot { index: number; pageId: string; step: number }
interface PreludePlayer {
  getSnapshot: () => PreludeSnapshot;
  subscribe: (listener: () => void) => () => void;
  go: (index: number) => void;
  setStep: (step: number) => void;
  resetPage: () => void;
  restart: () => void;
}
declare global {
  interface Window {
    EconomicPreludePlayer?: PreludePlayer;
    EconomicPrelude?: { pages: readonly { id: string; title: string }[] };
  }
}
function PreludeControls({ player }: { player: PreludePlayer }) {
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const fullscreen = useCourseFullscreen();
  const titles = window.EconomicPrelude!.pages.map(page => page.title);
  const paragraphs = preludeNarration[snapshot.pageId];
  return <PageToolsProvider pageKey={`prelude-${snapshot.pageId}`} role="teacher">
    {createPortal(<CourseHeader lesson={1} duration={`45分钟 · ${titles.length}页`} onRestart={player.restart}/>, document.getElementById('course-head')!)}
    {paragraphs && <PageNarrator pageKey={`prelude-${snapshot.pageId}`} paragraphs={paragraphs} step={snapshot.step} onReveal={player.setStep} onReset={player.resetPage} onStart={() => document.querySelector<HTMLVideoElement>('#stage video')?.pause()}/>}
    <PresentationToolbar label="课件工具栏" navigation={<CoursePageNavigation index={snapshot.index} titles={titles} onChange={player.go}/>}
      end={<FullscreenButtons controls={fullscreen}/>}/>
    {fullscreen.error && <p className="presentation-fullscreen-notice" role="status">{fullscreen.error}</p>}
  </PageToolsProvider>;
}
const host = document.getElementById('narration-root'), player = window.EconomicPreludePlayer;
if (host && player) createRoot(host).render(<PreludeControls player={player}/>);
