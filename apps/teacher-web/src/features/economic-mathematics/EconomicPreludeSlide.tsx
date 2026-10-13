import { useEffect, useRef } from 'react';

/** Uses the same artwork as the standalone first lesson, with no teacher UI in the frame. */
export function EconomicPreludeSlide({ page, step }: { page: number; step: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const state = useRef({page, step}); state.current = {page, step};
  const sync = () => ref.current?.contentWindow?.postMessage({type: 'economic-prelude-page', ...state.current}, location.origin);
  useEffect(sync, [page, step]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.origin === location.origin && e.source === ref.current?.contentWindow && e.data?.type === 'economic-prelude-playing') window.dispatchEvent(new CustomEvent('edu:exclusive-audio', {detail: 'prelude-film'}));
    };
    const pause = (e: Event) => { if ((e as CustomEvent).detail !== 'prelude-film') ref.current?.contentWindow?.postMessage({type: 'economic-prelude-pause'}, location.origin); };
    window.addEventListener('message', receive); window.addEventListener('edu:exclusive-audio', pause);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('edu:exclusive-audio', pause); };
  }, []);
  return <iframe className="em-slide" ref={ref} onLoad={sync} title={`第1讲 · 第${page}页`} src="/course-assets/economic-mathematics/prelude/embed.html" style={{width:1600,height:1000,border:0,display:'block'}} allow="autoplay; fullscreen"/>;
}
