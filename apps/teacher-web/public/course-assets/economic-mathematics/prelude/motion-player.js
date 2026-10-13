(async function () {
  'use strict';
  const api = window.EconomicPreludeFilm, $ = id => document.getElementById(id), canvas = $('motion'), music = $('music');
  const sample = new URLSearchParams(location.search).has('sample'), duration = sample ? 15 : api.DURATION;
  await document.fonts.load('900 316px "Prelude Display"');
  if (sample) music.src = 'sample-score.wav';
  let position = 0, playing = false, anchor = 0, startedAt = 0, raf;
  $('seek').max = duration;
  const fmt = n => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
  function draw(t) { position = Math.max(0, Math.min(duration, t)); const record = api.render(canvas, sample ? api.prototypeTime(position) : position); $('seek').value = position; $('clock').textContent = `${fmt(position)} / ${fmt(duration)}`; return record; }
  function pause() { playing = false; cancelAnimationFrame(raf); music.pause(); $('play').textContent = '播放'; }
  function tick(now) { if (!playing) return; draw(anchor + (now - startedAt) / 1000); if (position >= duration) pause(); else raf = requestAnimationFrame(tick); }
  async function play() { if (position >= duration) draw(0); music.currentTime = position; music.muted = !$('sound').checked; try { await music.play(); } catch { $('status').textContent = '配乐未启动；几何动画仍可播放。'; } anchor = position; startedAt = performance.now(); playing = true; $('play').textContent = '暂停'; raf = requestAnimationFrame(tick); }
  $('play').onclick = () => playing ? pause() : play(); $('replay').onclick = () => { pause(); draw(0); void play(); };
  $('seek').oninput = () => { pause(); draw(Number($('seek').value)); };
  $('sound').onchange = () => { music.muted = !$('sound').checked; };
  $('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : canvas.requestFullscreen();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.fullscreenElement) void document.exitFullscreen(); });
  draw(0);
  if (new URLSearchParams(location.search).get('export') === '1' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    $('export').hidden = false;
    $('export').onclick = async () => {
      pause(); $('export').disabled = true;
      try {
        const support = await VideoEncoder.isConfigSupported({ codec: 'vp09.00.10.08', width: 1920, height: 1200, framerate: api.FPS, bitrate: 12_000_000 });
        if (!support.supported) throw Error('浏览器不支持 VP9 编码。');
        const target = document.createElement('canvas'); target.width = 1920; target.height = 1200;
        const packets = [], records = [], total = duration * api.FPS; let failure;
        const encoder = new VideoEncoder({ error: e => { failure = e; }, output: chunk => {
          const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); const head = new Uint8Array(12), view = new DataView(head.buffer);
          view.setUint32(0, data.byteLength, true); view.setBigUint64(4, BigInt(Math.round(chunk.timestamp * api.FPS / 1e6)), true); packets.push(head, data);
        } }); encoder.configure(support.config);
        for (let i = 0; i < total; i++) {
          records.push(api.render(target, sample ? api.prototypeTime(i / api.FPS) : i / api.FPS));
          const frame = new VideoFrame(target, { timestamp: Math.round(i * 1e6 / api.FPS), duration: Math.round(1e6 / api.FPS) });
          encoder.encode(frame, { keyFrame: i % 120 === 0 }); frame.close();
          if (i % 12 === 0 || encoder.encodeQueueSize > 12) { await encoder.flush(); await new Promise(r => setTimeout(r, 0)); }
          if (failure) throw failure;
          if (i % 60 === 0) { $('status').textContent = `正在导出 ${i} / ${total} 帧`; canvas.getContext('2d').drawImage(target, 0, 0, canvas.width, canvas.height); }
        }
        await encoder.flush(); encoder.close();
        if (packets.length !== total * 2) throw Error('帧数不完整。');
        const header = new Uint8Array(32), h = new DataView(header.buffer); header.set([... 'DKIF'].map(c => c.charCodeAt(0))); h.setUint16(6, 32, true); header.set([... 'VP90'].map(c => c.charCodeAt(0)), 8);
        h.setUint16(12, 1920, true); h.setUint16(14, 1200, true); h.setUint32(16, api.FPS, true); h.setUint32(20, 1, true); h.setUint32(24, total, true);
        for (const [name, body] of [['frames', new Blob([header, ...packets])], ['audit', JSON.stringify(records)]]) {
          const res = await fetch(`/render/${sample ? 'sample-' : ''}${name}`, { method: 'POST', body }); if (!res.ok) throw Error(`保存失败 ${res.status}`);
        }
        $('status').textContent = `已保存全部 ${total} 帧。`;
      } catch (e) { $('status').textContent = `导出失败：${e.message}`; }
      $('export').disabled = false;
    };
  }
})();
