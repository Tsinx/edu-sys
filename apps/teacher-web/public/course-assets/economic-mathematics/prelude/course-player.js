(function () {
  'use strict';
  const api = window.EconomicPrelude, renderer = window.EconomicPreludeSlides, $ = id => document.getElementById(id), key = 'economic-mathematics-prelude-progress';
  let saved; try { saved = api.restore(localStorage.getItem(key)); } catch { /* Private browsing may disable storage. */ }
  let index = saved?.index ?? 0, steps = saved?.steps ?? api.pages.map(() => 0), filmTime = saved?.filmTime ?? 0;
  const params = new URLSearchParams(location.search), requestedPage = Number(params.get('page'));
  if (Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 40) index = requestedPage - 1;
  for (let i = 0; i < api.pages.length; i++) { const opt = document.createElement('option'); opt.value = i; opt.textContent = `${String(i + 1).padStart(2, '0')} ${api.pages[i].title.replaceAll('\n', '')}`; $('page-select').append(opt); }
  function save() { try { localStorage.setItem(key, JSON.stringify({ version: api.version, index, steps, filmTime })); } catch { $('notice').textContent = '此浏览器未允许保存进度；当前演示仍可使用。'; } }
  function scale() { const availableHeight = Math.max(240, innerHeight - document.querySelector('.app-head').offsetHeight - document.querySelector('.controls').offsetHeight - (document.getElementById('narration-root')?.offsetHeight ?? 0) - 80); const available = Math.min($('projector').clientWidth, 1600, availableHeight * 1.6); const s = available / 1600; $('stage').style.transform = `scale(${s})`; $('stage-holder').style.width = `${available}px`; $('stage-holder').style.height = `${1000 * s}px`; }
  function render() {
    $('notice').textContent = '';
    if (params.has('page')) { params.set('page', String(index + 1)); history.replaceState(null, '', `${location.pathname}?${params}`); }
    const oldVideo = $('stage').querySelector('video'); if (oldVideo) { filmTime = oldVideo.currentTime; oldVideo.pause(); }
    $('stage').replaceChildren(renderer.renderPage(index, steps[index]));
    const video = $('stage').querySelector('video');
    if (video) { video.addEventListener('play', () => window.dispatchEvent(new CustomEvent('edu:exclusive-audio', { detail: 'prelude-film' }))); video.addEventListener('loadedmetadata', () => { video.currentTime = filmTime; }); video.addEventListener('timeupdate', () => { filmTime = video.currentTime; save(); }); video.addEventListener('ended', () => { index = 1; render(); }); video.addEventListener('error', () => { $('notice').textContent = '视频未能载入。可打开“动画时间轴”播放同源动画，或检查短片文件是否完整。'; }); }
    $('page-select').value = index; $('prev').disabled = index === 0; $('next').disabled = index === 39;
    $('reveal').disabled = steps[index] >= (api.pages[index].reveals?.length ?? 0); $('reset-step').disabled = steps[index] === 0;
    $('position').textContent = `${index + 1} / 40 · 展开 ${steps[index]} / ${api.pages[index].reveals?.length ?? 0}`;
    save(); scale();
    window.EconomicPreludeNarration?.render(api.pages[index].id, steps[index], next => { steps[index] = api.clampStep(index, next); render(); });
  }
  function go(n) { const next = Math.min(39, Math.max(0, n)); if (next === index) return; index = next; render(); }
  function reveal() { if (steps[index] < (api.pages[index].reveals?.length ?? 0)) { steps[index]++; render(); } }
  $('next').onclick = () => go(index + 1); $('prev').onclick = () => go(index - 1); $('reveal').onclick = reveal;
  $('reset-step').onclick = () => { steps[index] = 0; render(); }; $('page-select').onchange = () => { index = +$('page-select').value; render(); };
  $('restart').onclick = () => { const video = $('stage').querySelector('video'); if (video) { video.pause(); video.currentTime = 0; } index = 0; steps = api.pages.map(() => 0); filmTime = 0; render(); };
  $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else { await document.body.requestFullscreen(); $('projector').focus(); } } catch { $('notice').textContent = '浏览器未允许全屏；可使用浏览器全屏功能。'; } };
  addEventListener('resize', scale); document.addEventListener('fullscreenchange', scale);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.fullscreenElement) { void document.exitFullscreen(); return; } if (['SELECT', 'INPUT', 'BUTTON', 'VIDEO'].includes(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return; if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); } if (event.key === ' ') { event.preventDefault(); reveal(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { const video = $('stage').querySelector('video'); if (video) video.pause(); save(); } });
  window.addEventListener('economic-narration-ready', render);
  render();
})();
