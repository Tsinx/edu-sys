/* Qingzhi v1: PCM cadence, explicit TTS/background routing, output-clock playback.
 * This is an amplitude gate for a known TTS stem, NOT a speech/source classifier.
 * No microphone, service credentials, network calls or third-party runtime. */
(function (global) {
  'use strict';
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const FRAME_SECONDS = .02;

  function createEnvelope(sampleRate) {
    const frameSize = Math.round(sampleRate * FRAME_SECONDS);
    let gate = false, below = 0, amount = 0;
    return {
      frameSize,
      next(samples) {
        let sum = 0, square = 0;
        for (const x of samples) { sum += x; square += x * x; }
        // Subtract DC, but retain unvoiced syllables: harmonic-only gates lose consonants.
        const rms = Math.sqrt(Math.max(0, square / samples.length - (sum / samples.length) ** 2));
        if (rms >= .004) { gate = true; below = 0; }
        else if (rms < .0025) { if (++below >= 2) gate = false; }
        else below = 0;
        const target = gate ? 80 * Math.pow(clamp((rms - .0025) / .12, 0, 1), .65) : 0;
        const tau = target > amount ? .025 : .055;
        amount += (target - amount) * (1 - Math.exp(-FRAME_SECONDS / tau));
        if (!gate && amount < 2) amount = 0;
        return { rms, active: gate, amount };
      },
    };
  }

  function decodePCM16(base64) {
    const bytes = global.atob(base64);
    if (bytes.length % 2) throw new Error('PCM16 数据必须包含完整的双字节采样。');
    const pcm = new Float32Array(bytes.length / 2);
    for (let i = 0; i < pcm.length; i++) {
      const value = bytes.charCodeAt(i * 2) | bytes.charCodeAt(i * 2 + 1) << 8;
      pcm[i] = (value >= 32768 ? value - 65536 : value) / 32768;
    }
    return pcm;
  }

  // Deterministic synthetic fan rumble + hiss + keyboard-like transients.
  // Test fixture only; no claim that this represents all environmental noise.
  function makeNoise(length, sampleRate, level = .055, seed = 90208) {
    const pcm = new Float32Array(length);
    let colored = 0, energy = 0;
    function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; }
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate, white = random();
      colored = .985 * colored + .015 * white;
      const click = (t + .21) % .73;
      const transient = click < .022 ? white * Math.exp(-click / .006) * 1.4 : 0;
      pcm[i] = colored * 2 + white * .22 + Math.sin(t * Math.PI * 2 * 90) * .14 + transient;
      energy += pcm[i] ** 2;
    }
    const gain = level / Math.max(1e-9, Math.sqrt(energy / Math.max(1, length)));
    for (let i = 0; i < length; i++) pcm[i] = clamp(pcm[i] * gain, -.6, .6);
    return pcm;
  }

  function createPlayer({ audioContext: context, onFrame = () => {}, onState = () => {}, bufferMs = 120,
    raf = global.requestAnimationFrame.bind(global), cancelRaf = global.cancelAnimationFrame.bind(global),
    now = () => global.performance.now() }) {
    if (!context) throw new Error('需要已获用户手势授权的 AudioContext。');
    const lead = clamp(bufferMs, 60, 500) / 1000;
    const output = context.createGain(); output.gain.value = .8; output.connect(context.destination);
    let turn = null, expected = 0, rate = 24000, envelope, carryTTS = [], carryBG = [], frames = [];
    let timeline = [], sources = new Set(), rafId = 0, inputEnded = false, nextStart = 0;
    let totalSamples = 0, receivedSamples = 0, started = false, needsBuffer = true, destroyed = false;
    let state = { status: 'idle', amount: 0, rms: 0, active: false, played: 0, queued: 0, packets: 0, underruns: 0, clock: 'pending' };

    function report(status) { state.status = status; onState({ ...state }); }
    function outputTime() {
      const stamp = context.getOutputTimestamp?.();
      if (stamp && stamp.contextTime > 0 && stamp.performanceTime > 0) {
        state.clock = 'output-timestamp';
        return Math.min(context.currentTime, stamp.contextTime + Math.max(0, now() - stamp.performanceTime) / 1000);
      }
      state.clock = 'latency-estimate';
      return Math.max(0, context.currentTime - (context.outputLatency || 0) - (context.baseLatency || 0));
    }
    function ensureFrame() { if (!rafId && turn !== null) rafId = raf(tick); }
    function schedule() {
      if (!frames.length) return;
      if (needsBuffer && !inputEnded && frames.length * FRAME_SECONDS < lead - 1e-6) return;
      // Every envelope frame is tied to the exact AudioBuffer start, never packet arrival.
      const begin = Math.max(context.currentTime + (needsBuffer ? .035 : .015), nextStart);
      const batch = frames; frames = [];
      const buffer = context.createBuffer(1, batch.length * envelope.frameSize, rate);
      const audio = buffer.getChannelData(0);
      let previous = timeline.length && begin <= nextStart + .001 ? timeline[timeline.length - 1].amount : 0;
      for (let i = 0; i < batch.length; i++) {
        const frame = batch[i], offset = i * envelope.frameSize;
        for (let j = 0; j < envelope.frameSize; j++) {
          // Only the speaker path is mixed. Background is excluded from envelope.next().
          audio[offset + j] = clamp(frame.tts[j] + frame.background[j], -1, 1);
        }
        timeline.push({ ...frame.feature, from: previous, start: begin + i * FRAME_SECONDS,
          end: begin + (i + 1) * FRAME_SECONDS, media: totalSamples / rate });
        previous = frame.feature.amount; totalSamples += envelope.frameSize;
      }
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(output);
      sources.add(source); source.onended = () => { sources.delete(source); source.disconnect(); };
      source.start(begin); nextStart = begin + buffer.duration;
      needsBuffer = false; started = true;
    }
    function tick() {
      rafId = 0;
      if (turn === null) return;
      if (context.state === 'suspended' || context.state === 'interrupted') {
        state.amount = 0; state.active = false; onFrame({ ...state }); report('suspended'); ensureFrame(); return;
      }
      const clock = outputTime();
      while (timeline.length && timeline[0].end <= clock) {
        state.played = timeline[0].media + FRAME_SECONDS; timeline.shift();
      }
      const current = timeline[0];
      state.queued = Math.max(0, nextStart - clock) + frames.length * FRAME_SECONDS;
      if (current && clock >= current.start) {
        const u = clamp((clock - current.start) / FRAME_SECONDS, 0, 1);
        state.amount = current.from + (current.amount - current.from) * (u * u * (3 - 2 * u));
        state.rms = current.rms; state.active = current.active;
        state.played = current.media + clock - current.start;
        report(state.amount >= 3 ? 'speaking' : 'silence');
      } else {
        state.amount = 0; state.rms = 0; state.active = false;
        if (inputEnded && !timeline.length && !frames.length && clock >= nextStart) {
          state.played = receivedSamples / rate; onFrame({ ...state });
          turn = null; report('ended'); return;
        }
        if (started && !timeline.length && !needsBuffer) {
          state.underruns++; needsBuffer = true; envelope = createEnvelope(rate);
        }
        report(started ? 'buffering' : 'loading');
        schedule();
      }
      onFrame({ ...state }); ensureFrame();
    }
    function stop() {
      turn = null; if (rafId) cancelRaf(rafId); rafId = 0;
      for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
      sources.clear(); frames = []; timeline = []; carryTTS = []; carryBG = [];
      state.amount = 0; state.rms = 0; state.active = false; state.queued = 0;
      onFrame({ ...state }); report('stopped');
    }
    return {
      begin({ turnId, sampleRate = 24000 }) {
        if (destroyed) throw new Error('播放器已销毁。');
        if (typeof turnId !== 'string' || !turnId || ![16000, 24000, 48000].includes(sampleRate)) throw new Error('无效的语音轮次或采样率。');
        stop(); turn = turnId; rate = sampleRate; envelope = createEnvelope(rate); expected = 0;
        inputEnded = false; started = false; needsBuffer = true; nextStart = 0; totalSamples = 0; receivedSamples = 0;
        state = { status: 'loading', amount: 0, rms: 0, active: false, played: 0, queued: 0, packets: 0, underruns: 0, clock: 'pending' };
        report('loading'); ensureFrame();
      },
      pushPCM({ turnId, sequence, tts, background }) {
        if (turn !== turnId || turn === null || inputEnded) return false;
        if (sequence < expected) return false; // duplicate or obsolete packet
        if (sequence !== expected) throw new Error('音频分片缺失或乱序；应由传输层重排后提交。');
        if (!(tts instanceof Float32Array) || (background && (!(background instanceof Float32Array) || background.length !== tts.length))) throw new Error('需要等长的单声道 Float32 PCM。');
        if (tts.length > rate * 10 || nextStart - context.currentTime + frames.length * FRAME_SECONDS + tts.length / rate > 15) throw new Error('音频队列超过 15 秒，请对上游施加背压。');
        // Validate before modifying state so a rejected packet is safe to retry.
        for (let i = 0; i < tts.length; i++) if (!Number.isFinite(tts[i]) || Math.abs(tts[i]) > 1 || (background && (!Number.isFinite(background[i]) || Math.abs(background[i]) > 1))) throw new Error('PCM 采样必须是 -1 到 1 的有限数值。');
        expected++; state.packets++; receivedSamples += tts.length;
        for (let i = 0; i < tts.length; i++) {
          carryTTS.push(tts[i]); carryBG.push(background ? background[i] : 0);
          if (carryTTS.length === envelope.frameSize) {
            const voice = Float32Array.from(carryTTS), noise = Float32Array.from(carryBG);
            frames.push({ tts: voice, background: noise, feature: envelope.next(voice) });
            carryTTS = []; carryBG = [];
          }
        }
        // Detect a gap even when a packet arrives between animation frames.
        if (started && context.currentTime > nextStart && !needsBuffer) needsBuffer = true;
        schedule(); ensureFrame(); return true;
      },
      end(turnId) {
        if (turn !== turnId || turn === null) return false;
        inputEnded = true;
        if (carryTTS.length) {
          const voice = new Float32Array(envelope.frameSize), noise = new Float32Array(envelope.frameSize);
          voice.set(carryTTS); noise.set(carryBG);
          frames.push({ tts: voice, background: noise, feature: envelope.next(voice) });
          carryTTS = []; carryBG = [];
        }
        schedule(); ensureFrame(); return true;
      },
      stop,
      setVolume(value) { output.gain.value = clamp(Number(value) || 0, 0, 1); },
      getState() { return { ...state }; },
      destroy() { stop(); output.disconnect(); destroyed = true; },
    };
  }
  global.QingzhiAudioLips = { createEnvelope, decodePCM16, makeNoise, createPlayer, frameSeconds: FRAME_SECONDS };
})(window);
