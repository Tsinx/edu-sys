(function () {
  'use strict';
  const api = window.EconomicPrelude, renderer = window.EconomicPreludeSlides;
  const $ = id => document.getElementById(id), key = 'economic-mathematics-prelude-progress';
  const params = new URLSearchParams(location.search), reviewMode = params.get('review') === '1';
  let saved;
  try { if (!reviewMode) saved = api.restore(localStorage.getItem(key)); } catch { /* Playback remains available without storage. */ }
  let index = saved?.index ?? 0, steps = saved?.steps ?? api.pages.map(() => 0), filmTime = saved?.filmTime ?? 0;
  const requestedPage = Number(params.get('page'));
  if (Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= api.pages.length) index = requestedPage - 1;
  const listeners = new Set();
  let snapshot = { index, pageId: api.pages[index].id, step: steps[index] };
  function save() {
    if (reviewMode) return;
    try { localStorage.setItem(key, JSON.stringify({ version: api.version, index, steps, filmTime })); }
    catch { $('notice').textContent = '此浏览器未允许保存进度；当前演示仍可使用。'; }
  }
  function scale() {
    const available = Math.max(0, Math.min($('projector').clientWidth, 1600, $('projector').clientHeight * 1.6));
    $('stage').style.transform = `scale(${available / 1600})`;
    $('stage-holder').style.width = `${available}px`;
    $('stage-holder').style.height = `${available / 1.6}px`;
  }
  function render() {
    $('notice').textContent = '';
    if (params.has('page')) { params.set('page', String(index + 1)); history.replaceState(null, '', `${location.pathname}?${params}`); }
    const oldVideo = $('stage').querySelector('video');
    if (oldVideo) { filmTime = oldVideo.currentTime; oldVideo.pause(); }
    $('stage').replaceChildren(renderer.renderPage(index, steps[index]));
    const video = $('stage').querySelector('video');
    if (video) {
      video.addEventListener('play', () => window.dispatchEvent(new CustomEvent('edu:exclusive-audio', { detail: 'prelude-film' })));
      video.addEventListener('loadedmetadata', () => { if (filmTime && Number.isFinite(video.duration)) video.currentTime = Math.min(filmTime, video.duration); });
      video.addEventListener('timeupdate', () => { filmTime = video.currentTime; save(); });
      video.addEventListener('ended', () => go(1));
      video.addEventListener('error', () => { $('notice').textContent = '视频未能载入。可在“资料与帮助”中打开动画时间轴，或检查短片文件是否完整。'; });
    }
    save(); scale();
    snapshot = { index, pageId: api.pages[index].id, step: steps[index] };
    listeners.forEach(listener => listener());
  }
  function go(n) {
    if (!Number.isInteger(n)) return;
    const next = Math.min(api.pages.length - 1, Math.max(0, n));
    if (next !== index) { index = next; render(); }
  }
  function setStep(next) {
    const clamped = api.clampStep(index, next);
    if (clamped !== steps[index]) { steps[index] = clamped; render(); }
  }
  window.EconomicPreludePlayer = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    go, setStep,
    resetPage: () => setStep(0),
    restart() {
      const video = $('stage').querySelector('video');
      if (video) { video.pause(); video.currentTime = 0; }
      index = 0; steps = api.pages.map(() => 0); filmTime = 0; render();
    }
  };
  new ResizeObserver(scale).observe($('projector'));
  addEventListener('resize', scale);
  document.addEventListener('fullscreenchange', scale);
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.closest('select,input,button,textarea,video,[contenteditable="true"]'))) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    if (event.key === ' ') { event.preventDefault(); window.dispatchEvent(new Event('edu:course-reveal')); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { $('stage').querySelector('video')?.pause(); save(); }
  });
  render();
})();
