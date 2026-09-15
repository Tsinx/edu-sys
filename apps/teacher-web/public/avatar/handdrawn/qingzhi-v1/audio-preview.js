(function () {
  'use strict';
  const api = window.QingzhiAudioLips;
  const panel = document.querySelector('#audio-study');
  const controls = [...panel.querySelectorAll('[data-audio-case]')];
  const audioStatus = panel.querySelector('#audio-status');
  const meter = panel.querySelector('#voice-meter');
  const progress = panel.querySelector('#audio-progress');
  const counter = panel.querySelector('#audio-counter');
  let context, player, fixture, timer = 0, generation = 0;
  let scene = '', packet = 0, offset = 0, noise, speech, lastDraw = 0;
  const labels = { clean: '纯 TTS', noise: '仅背景噪音', mixed: 'TTS ＋ 背景' };
  const phases = { idle: '等待播放', loading: '缓冲中', buffering: '等待下一片 · 已闭嘴', speaking: '正在说话', silence: 'TTS 停顿 · 已闭嘴', ended: '播放结束 · 已闭嘴', stopped: '已停止 · 已闭嘴', suspended: '音频暂停 · 已闭嘴' };

  function clearDelivery() { clearTimeout(timer); timer = 0; generation++; }
  function stopAudio() {
    clearDelivery(); player?.stop();
    controls.forEach(button => button.setAttribute('aria-pressed', 'false'));
    panel.querySelector('#audio-stop').disabled = true;
  }
  function draw(state) {
    // Keep eyebrow mood independent of audio mouth shape.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMouth(state.amount);
    else setMouth(0);
    panel.dataset.audioState = state.status; panel.dataset.mouthAmount = state.amount.toFixed(2);
    panel.dataset.played = state.played.toFixed(3); panel.dataset.underruns = String(state.underruns);
    panel.dataset.packets = String(state.packets); panel.dataset.clock = state.clock;
    if (performance.now() - lastDraw < 80 && !['ended', 'stopped'].includes(state.status)) return;
    lastDraw = performance.now();
    meter.value = state.amount; progress.value = state.played;
    counter.textContent = `${state.played.toFixed(1)} / ${window.QingzhiAudioFixture.seconds.toFixed(1)} s`;
    audioStatus.textContent = `${scene ? labels[scene] + ' · ' : ''}${phases[state.status] || state.status}`;
    panel.querySelector('#audio-buffer').textContent = `已收 ${state.packets} 片 · 待播 ${state.queued.toFixed(2)} s · 断流 ${state.underruns} 次`;
    if (state.status === 'ended' || state.status === 'stopped') {
      controls.forEach(button => button.setAttribute('aria-pressed', 'false'));
      panel.querySelector('#audio-stop').disabled = true;
    }
  }

  async function playScene(selected) {
    stopAudio(); stopSpeaking(); scene = selected;
    const token = generation;
    try {
      context ||= new AudioContext({ sampleRate: 24000, latencyHint: 'interactive' });
      await context.resume();
      if (token !== generation) return;
      if (document.hidden) { stopAudio(); return; }
      player ||= api.createPlayer({ audioContext: context, onFrame: draw, onState: state => {
        if (['ended', 'stopped', 'suspended'].includes(state.status)) draw(state);
      } });
      window.qingzhiAudioPlayer = player;
      fixture ||= api.decodePCM16(window.QingzhiAudioFixture.pcm);
      // Reference speech RMS (0.05355 before padding) makes 0 dB a strong background challenge.
      const level = .05355 * Math.pow(10, Number(panel.querySelector('#noise-level').value) / 20);
      noise = api.makeNoise(fixture.length, 24000, level);
      speech = selected === 'noise' ? new Float32Array(fixture.length) : fixture;
      packet = 0; offset = 0;
      const turnId = `review-${token}`;
      player.begin({ turnId, sampleRate: 24000 });
      player.setVolume(Number(panel.querySelector('#audio-volume').value) / 100);
      panel.dataset.audioCase = selected;
      controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.audioCase === selected)));
      panel.querySelector('#audio-stop').disabled = false;
      progress.max = window.QingzhiAudioFixture.seconds;
      progress.value = 0; counter.textContent = `0.0 / ${window.QingzhiAudioFixture.seconds.toFixed(1)} s`;
      audioStatus.textContent = `${labels[selected]} · 缓冲中`;
      const network = panel.querySelector('#audio-network').value;
      const sizes = [2400, 3120, 1680, 3840, 1920, 2640]; // 70–160 ms chunks, unaligned to 20 ms frames
      const jitter = [8, -12, 18, -6, 4, -10];
      let deadline = performance.now();
      function deliver() {
        if (token !== generation) return;
        try {
          const end = Math.min(fixture.length, offset + sizes[packet % sizes.length]);
          const duration = (end - offset) / 24;
          player.pushPCM({ turnId, sequence: packet, tts: speech.slice(offset, end),
            background: selected === 'clean' ? undefined : noise.slice(offset, end) });
          packet++; offset = end;
          if (offset === fixture.length) { player.end(turnId); timer = 0; return; }
          // A stored real TTS sample is re-delivered over time; this is a stream simulation.
          const stall = network === 'gap' && packet === 30 ? 650 : 0;
          deadline += duration + (network === 'smooth' ? 0 : jitter[packet % jitter.length]) + stall;
          timer = setTimeout(deliver, Math.max(0, deadline - performance.now()));
        } catch (error) { stopAudio(); audioStatus.textContent = `播放失败：${error.message}`; }
      }
      deliver();
    } catch (error) { if (token === generation) { stopAudio(); audioStatus.textContent = `无法开始音频：${error.message}`; } }
  }

  controls.forEach(button => button.addEventListener('click', () => playScene(button.dataset.audioCase)));
  panel.querySelector('#audio-stop').addEventListener('click', stopAudio);
  panel.querySelector('#audio-volume').addEventListener('input', event => player?.setVolume(Number(event.target.value) / 100));
  panel.querySelector('#noise-level').addEventListener('input', event => {
    panel.querySelector('#noise-value').textContent = `${Number(event.target.value) > 0 ? '+' : ''}${event.target.value} dB`;
  });
  // A manual mouth experiment or reset owns the mouth until a new audio run is requested.
  document.querySelectorAll('#speak, #idle-reset, [data-expression-choice]').forEach(button => button.addEventListener('click', stopAudio, true));
  document.querySelector('#mouth').addEventListener('input', event => {
    const value = event.target.value; stopAudio(); event.target.value = value;
  }, true);
  panel.querySelector('#audio-network').addEventListener('change', stopAudio);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
  window.addEventListener('pagehide', stopAudio);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stopAudio);
  // Availability is visible, rather than pretending an unsupported browser played audio.
  if (!window.AudioContext) { controls.forEach(button => { button.disabled = true; }); audioStatus.textContent = '此浏览器不支持 Web Audio，请使用较新的 Chromium 浏览器。'; }
})();
