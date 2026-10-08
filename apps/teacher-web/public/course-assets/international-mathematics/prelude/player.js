/* Standalone player: no framework, API, network font, login, or telemetry. */
(async function () {
  'use strict';
  const api = window.MathPrelude, canvas = document.getElementById('preview'), music = document.getElementById('music');
  const play = document.getElementById('play'), replay = document.getElementById('replay'), seek = document.getElementById('seek');
  const clock = document.getElementById('clock'), status = document.getElementById('status'), sound = document.getElementById('sound');
  await document.fonts.load('100px "Prelude Black"'); await document.fonts.load('24px "Prelude Mono"');
  let position = 0, playing = false, anchor = 0, startedAt = 0, raf;
  const format = n => `00:${Math.floor(n).toString().padStart(2, '0')}`;
  function draw(t) { position = Math.abs(t - api.DURATION) < 1e-5 ? api.DURATION : Math.min(api.DURATION, Math.max(0, t)); api.render(canvas, position); seek.value = String(position); clock.textContent = `${format(position)} / 00:36`; }
  function pause() { playing = false; cancelAnimationFrame(raf); music.pause(); play.textContent = 'Play animation'; status.textContent = `Paused at ${format(position)}. Play or drag the timeline to continue.`; }
  function tick(now) { if (!playing) return; draw(anchor + (now - startedAt) / 1000); if (position >= api.DURATION) { pause(); status.textContent = 'Finished. Replay or drag the timeline to explore.'; } else raf = requestAnimationFrame(tick); }
  async function start() {
    if (position >= api.DURATION) draw(0);
    music.currentTime = position; music.muted = !sound.checked;
    let audioError = false;
    try { await music.play(); } catch { audioError = true; }
    anchor = position; startedAt = performance.now(); playing = true; play.textContent = 'Pause animation';
    status.textContent = audioError ? 'Music could not start. The animation still plays; use Music and Play to retry.' : 'Playing the editable animation. Pause to hold a frame.';
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => playing ? pause() : start());
  replay.addEventListener('click', () => { pause(); draw(0); void start(); });
  seek.addEventListener('input', () => { pause(); draw(Number(seek.value)); music.currentTime = position; status.textContent = `Paused at ${format(position)}. Play or drag the timeline to continue.`; });
  sound.addEventListener('change', () => { music.muted = !sound.checked; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  draw(0); window.preludeReady = true;

  // Local export only: the same frames are encoded with explicit timestamps.
  // The helper server receives one IVF blob; no public endpoint or cloud upload.
  const exportButton = document.getElementById('export');
  if (new URLSearchParams(location.search).get('export') === '1' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    document.getElementById('source-preview').open = true; exportButton.hidden = false;
    exportButton.addEventListener('click', async () => {
      pause(); exportButton.disabled = true;
      try {
        const support = await VideoEncoder.isConfigSupported({codec:'vp09.00.10.08',width:1920,height:1200,framerate:api.FPS,bitrate:9_000_000});
        if (!support.supported) throw new Error('This browser cannot encode VP9.');
        const renderCanvas = document.createElement('canvas'); renderCanvas.width = 1920; renderCanvas.height = 1200;
        const packets = [], records = [], total = api.DURATION * api.FPS;
        let encoderError;
        const encoder = new VideoEncoder({ error: e => { encoderError = e; }, output: chunk => {
          const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
          const head = new Uint8Array(12), view = new DataView(head.buffer);
          view.setUint32(0, data.byteLength, true); view.setBigUint64(4, BigInt(Math.round(chunk.timestamp * api.FPS / 1e6)), true);
          packets.push(head, data);
        }});
        encoder.configure(support.config);
        for (let i = 0; i < total; i++) {
          const record = api.render(renderCanvas, i / api.FPS); records.push(record);
          const frame = new VideoFrame(renderCanvas, { timestamp: Math.round(i * 1e6 / api.FPS), duration: Math.round(1e6 / api.FPS) });
          encoder.encode(frame, { keyFrame: i % 60 === 0 }); frame.close();
          if (i % 12 === 0 || encoder.encodeQueueSize > 12) { await encoder.flush(); await new Promise(resolve => setTimeout(resolve, 0)); }
          if (encoderError) throw encoderError;
          if (i % 30 === 0) status.textContent = `Rendering ${i}/${total} frames…`;
        }
        await encoder.flush(); encoder.close();
        if (packets.length !== total * 2) throw new Error(`Expected ${total} frames; received ${packets.length / 2}.`);
        const header = new Uint8Array(32), h = new DataView(header.buffer);
        header.set([... 'DKIF'].map(v => v.charCodeAt(0)), 0); h.setUint16(6, 32, true);
        header.set([... 'VP90'].map(v => v.charCodeAt(0)), 8); h.setUint16(12, 1920, true); h.setUint16(14, 1200, true);
        h.setUint32(16, api.FPS, true); h.setUint32(20, 1, true); h.setUint32(24, total, true);
        const response = await fetch('/render/frames', { method:'POST', headers:{'Content-Type':'application/octet-stream'}, body:new Blob([header,...packets]) });
        if (!response.ok) throw new Error(`Frame export: HTTP ${response.status}`);
        const audit = await fetch('/render/audit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(records) });
        if (!audit.ok) throw new Error(`Frame audit: HTTP ${audit.status}`);
        status.textContent = `Rendered and saved all ${total} frames.`; window.preludeExport = { complete: true, frames:total };
      } catch (error) { status.textContent = `Export failed: ${error.message}`; window.preludeExport = { complete:false, error:String(error) }; }
      exportButton.disabled = false;
    });
  }
})();
