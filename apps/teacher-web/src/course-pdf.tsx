import { createRoot } from 'react-dom/client';
import { COURSE_DECKS, type CourseDeckDescriptor } from '@edu/course-content/deck-registry';
import type { SlideInteractionValues } from '@edu/contracts';
import { SlideStage } from './features/classroom/TeachingSlides';
import { PageToolsProvider } from './features/classroom/PageTools';
import { pdfChapterPlans } from './features/course-export/pdf-model';
import './features/classroom/classroom.css';
import './features/globe/interactive-earth-globe.css';
import './features/port-lbl/port-lbl.css';
import './features/port-lesson-four/port-lesson-four.css';
import './features/port-lesson-five/port-lesson-five.css';
import './features/port-lesson-six/port-lesson-six.css';
import './features/port-expansion/port-expansion.css';
import './features/course-export/pdf-print.css';

const courses = COURSE_DECKS.map(deck => ({
  courseId: deck.courseId, versionId: deck.versionId, title: deck.title,
  chapters: pdfChapterPlans(deck)
}));
declare global {
  interface Window {
    __COURSE_PDF_METADATA__?: typeof courses;
    __COURSE_PDF_READY__?: { ready: boolean; count: number; errors: string[] };
    __COURSE_PDF_RENDER__?: (input: { courseId: string; start: number; count: number }) => Promise<{ ready: boolean; count: number; errors: string[] }>;
    __COURSE_PDF_CLEAR__?: () => void;
  }
}
window.__COURSE_PDF_METADATA__ = courses;
const query = new URLSearchParams(location.search);
function finalValues(deck: CourseDeckDescriptor, slideKey: string): SlideInteractionValues | undefined {
  const defaults = deck.getInteractionDefaults(slideKey);
  if (!defaults) return undefined;
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key,
    key === 'playing' ? false : /^(step|presentationStep|revealStep)$/.test(key) ? 10_000 :
      /^reveal/.test(key) && typeof value === 'boolean' ? true : value]));
}

const root = createRoot(document.getElementById('root')!);
root.render(null);
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function renderChunk(input: { courseId: string; start: number; count: number }) {
  const deck = COURSE_DECKS.find(item => item.courseId === input.courseId);
  const plan = courses.find(item => item.courseId === input.courseId);
  if (!deck || !plan || !Number.isInteger(input.start) || input.start < 0 || !Number.isInteger(input.count) || input.count < 1 || input.count > 8) throw new Error('PDF_RENDER_RANGE');
  const indices = plan.chapters.flatMap(chapter => chapter.indices).slice(input.start, input.start + input.count);
  if (indices.length !== input.count) throw new Error('PDF_RENDER_EMPTY');
  window.__COURSE_PDF_READY__ = undefined;
  root.render(<main className="course-pdf-deck" key={`${input.courseId}:${input.start}`}>
    {indices.map(index => {
      const slide = deck.getSlide(index), values = finalValues(deck, slide.slideKey);
      const frame = { deckId: deck.deckId, versionId: deck.versionId, slideId: slide.slideKey,
        index, total: deck.slideTotal, title: slide.title, summary: slide.summary,
        lessonNumber: slide.lessonNumber, lessonTitle: slide.lessonTitle, section: slide.section,
        logicalWidth: 1600 as const, logicalHeight: 1000 as const, aspectRatio: '16:10' as const };
      return <section className="course-pdf-sheet" key={slide.slideKey} data-export-index={index}>
        <PageToolsProvider pageKey={slide.slideKey} role="projection">
          <SlideStage frame={frame} readOnly playbackMode="offline"
            interaction={values ? { deckId: deck.deckId, slideId: slide.slideKey, revision: 1, values } : null}
            presentationProgress={1} lessonFivePresentation={{ progress: 1, revealed: true }}
            lessonSixPresentation={{ progress: 1, revealed: true, option: 0 }} portExpansionPresentation={{ progress: 1, revealed: true, option: 0 }}/>
        </PageToolsProvider>
      </section>;
    })}
  </main>);
  const deadline = Date.now() + 45_000;
  // Course renderers are lazy. Do not declare readiness while a loading placeholder is present.
  const publicSlideReady = (sheet: Element) => {
    const canvas = sheet.querySelector('.slide-logical-canvas');
    if (canvas?.querySelector('article')) return true;
    const frame = canvas?.querySelector<HTMLIFrameElement>('iframe.em-slide');
    return Boolean(frame?.contentDocument?.querySelector('#page > article.slide'));
  };
  while (document.querySelectorAll('.course-pdf-sheet').length !== indices.length ||
    !Array.from(document.querySelectorAll('.course-pdf-sheet')).every(publicSlideReady) ||
    Array.from(document.querySelectorAll<HTMLElement>('.course-pdf-sheet'), sheet => Number(sheet.dataset.exportIndex)).join(',') !== indices.join(',')) {
    if (Date.now() > deadline) throw new Error('PDF_RENDER_TIMEOUT');
    await delay(100);
  }
  // The first Chinese mathematics lesson uses the same-origin public DOM
  // renderer. Its print mode keeps vector text and replaces the opening
  // video with its authored poster; teacher notes never enter the frame.
  const documents = [document];
  for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe.em-slide')) {
    const embedded = frame.contentDocument;
    const renderer = (frame.contentWindow as (Window & {
      EconomicPreludeSlides?: { renderPage: (index: number, step: number, print: boolean) => HTMLElement }
    }) | null)?.EconomicPreludeSlides;
    const page = Number(frame.title.match(/第(\d+)页/)?.[1]);
    if (!embedded || !renderer || !Number.isInteger(page) || page < 1) throw new Error('PDF_EMBEDDED_SLIDE');
    const printedSlide = renderer.renderPage(page - 1, 10_000, true);
    const movieFooter = printedSlide.querySelector<HTMLElement>('.layout-film .slide-foot, .slide-foot');
    if (movieFooter && printedSlide.classList.contains('layout-film')) {
      Object.assign(movieFooter.style, { display: 'flex', background: '#f1ede3', color: '#102c35', padding: '12px 16px' });
      const label = movieFooter.firstElementChild;
      if (label) label.textContent = `经济数学 · 视频画面（动画请在线播放） · ${label.textContent}`;
    }
    // Load the public print DOM as a fresh, script-free document. Updating
    // the live video frame can otherwise leave its cached poster layer in
    // the print output and omit the newly visible source footer.
    const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
    const base = new URL('./', frame.src).href;
    frame.srcdoc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="prelude.css"><style>html,body{width:1600px;height:1000px;margin:0;overflow:hidden}@page{size:1600px 1000px;margin:0}</style></head><body>${printedSlide.outerHTML}</body></html>`;
    await loaded;
    documents.push(frame.contentDocument!);
  }
  await Promise.all(documents.map(doc => doc.fonts.ready));
  while (document.querySelector('.earth-globe--loading,[data-render-state="loading"]')) {
    if (Date.now() > deadline) throw new Error('PDF_MAP_TIMEOUT');
    await delay(100);
  }
  for (const doc of documents) for (const media of doc.querySelectorAll<HTMLMediaElement>('video,audio')) { media.pause(); media.removeAttribute('autoplay'); }
  const errors: string[] = [];
  await Promise.all(documents.flatMap(doc => Array.from(doc.images, async image => {
    try { await image.decode(); if (!image.naturalWidth) throw new Error('empty'); }
    catch { errors.push(`PDF_IMAGE:${image.getAttribute('src')}`); }
  })));
  for (const doc of documents) for (const animation of doc.getAnimations()) animation.pause();
  await delay(150);
  for (const canvas of document.querySelectorAll<HTMLElement>('.slide-logical-canvas')) {
    const box = canvas.getBoundingClientRect();
    if (Math.abs(box.width - 1600) > 1 || Math.abs(box.height - 1000) > 1) errors.push('PDF_CANVAS_SIZE');
  }
  if (documents.some(doc => doc.querySelector('.katex-error,[data-teaching-cue],[data-assistant-cue],[data-story-beat],[data-voyage-stage]'))) errors.push('PDF_PUBLIC_CONTENT');
  const state = { ready: true, count: indices.length, errors };
  window.__COURSE_PDF_READY__ = state;
  return state;
}
window.__COURSE_PDF_RENDER__ = renderChunk;
window.__COURSE_PDF_CLEAR__ = () => root.render(null);
if (query.get('metadata') !== '1') void renderChunk({ courseId: query.get('course') ?? '', start: Number(query.get('start') ?? 0), count: Number(query.get('count') ?? 6) })
  .catch(error => { window.__COURSE_PDF_READY__ = { ready: true, count: 0, errors: [String(error)] }; });
