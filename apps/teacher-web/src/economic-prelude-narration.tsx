import { createRoot } from 'react-dom/client';
import { PageNarrator } from './features/economic-mathematics/PageNarrator';
import { preludeNarration } from './features/economic-mathematics/narration-scripts';

declare global {
  interface Window {
    EconomicPreludeNarration?: { render: (id: string, step: number, reveal: (step: number) => void) => void; stop: () => void };
  }
}
const host = document.getElementById('narration-root');
if (host) {
  const root = createRoot(host);
  window.EconomicPreludeNarration = {
    render(id, step, reveal) {
      const paragraphs = preludeNarration[id];
      if (!paragraphs) { root.render(null); return; }
      root.render(<PageNarrator pageKey={`prelude-${id}`} paragraphs={paragraphs} step={step} onReveal={reveal} onStart={() => document.querySelector<HTMLVideoElement>('#stage video')?.pause()}/>);
    },
    stop() { root.render(null); }
  };
  window.dispatchEvent(new Event('economic-narration-ready'));
}
