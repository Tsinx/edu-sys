(() => {
  let current = -1, currentStep = -1;
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const message = event.data;
    if (message?.type === 'economic-prelude-pause') { document.querySelector('video')?.pause(); return; }
    if (message?.type !== 'economic-prelude-page' || !Number.isInteger(message.page) || message.page < 1 || message.page > EconomicPrelude.pages.length) return;
    const index = message.page - 1, step = EconomicPrelude.clampStep(index, message.step);
    if (index === current && step === currentStep) return;
    document.querySelector('video')?.pause(); current = index; currentStep = step;
    document.getElementById('page').replaceChildren(EconomicPreludeSlides.renderPage(index, step));
    document.querySelector('video')?.addEventListener('play', () => parent.postMessage({type:'economic-prelude-playing'}, location.origin));
  });
})();
