const $ = id => document.getElementById(id);
const groups = ['wake', 'end', 'wake_xiaomai', 'end_thanks'];
let state, category = 'wake', phase = 'idle', draft, stream, context, source, processor;
let chunks = [], sampleCount = 0, timeout, ticker, startedAt = 0, level = 0, generation = 0;
const canvas = $('waveform'), brush = canvas.getContext('2d');
const tips = [
  ['先用平常的语气。', '前 5 条保持舒适的语速和距离。每条前后留一点安静，避免切掉开头或结尾。'],
  ['换一点语速。', '第 6–10 条可以有的稍快、有的稍慢，仍保持自然、完整。不要把字拆开读。'],
  ['换一点音量。', '第 11–15 条轻声和正常音量交替。无需喊叫，也不必刻意压低声音。'],
  ['回到真实的使用距离。', '最后 5 条在你平时使用助手的位置录制，稍微改变朝向。不要遮挡麦克风。'],
];
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
  $('message').hidden = !text;
}
function count(group) { return state?.clips.filter(c => c.category === group).length ?? 0; }
function nextGroup() {
  const start = groups.indexOf(category);
  return groups.slice(start + 1).concat(groups.slice(0, start)).find(group => count(group) < state.target);
}
function busy() { return phase !== 'idle'; }
async function request(path, options = {}) {
  const response = await fetch(path, { signal: AbortSignal.timeout(15000), ...options, headers: { 'X-Collector-Token': state?.token ?? '', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? '请求失败，请重试。');
  return result;
}
async function refresh() {
  const firstLoad = !state;
  state = await request('/api/state');
  if (firstLoad) category = groups.find(group => count(group) < state.target) ?? groups[0];
  $('storage-path').textContent = state.storagePath;
  render();
  renderClips();
}
function render() {
  if (!state) return;
  const total = state.clips.length, n = count(category), done = n >= state.target, target = state.target * groups.length;
  $('total-count').replaceChildren(document.createTextNode(`${total} `), Object.assign(document.createElement('small'), { textContent: `/ ${target}` }));
  $('overall-progress').style.width = `${total / target * 100}%`;
  for (const group of groups) {
    const selected = category === group;
    $(group + '-tab').classList.toggle('selected', selected);
    $(group + '-tab').setAttribute('aria-pressed', String(selected));
    $(group + '-tab').disabled = busy();
    $(group + '-count').textContent = `${count(group)} / ${state.target}`;
    $(group + '-phrase').textContent = state.phrases[group];
    $(group + '-progress').style.width = `${count(group) / state.target * 100}%`;
    $(group + '-input').value = state.phrases[group];
    $(group + '-input').disabled = busy() || count(group) > 0;
  }
  $('apply-config').disabled = busy() || groups.every(group => count(group) > 0);
  $('prompt').textContent = state.phrases[category];
  $('take-label').textContent = done ? `${state.target} 条已保存` : `准备录制第 ${String(n + 1).padStart(2, '0')} 条 / 共 ${state.target} 条`;
  $('record').hidden = Boolean(draft) || done;
  $('record').disabled = !['idle', 'recording'].includes(phase);
  $('record').classList.toggle('recording', phase === 'recording');
  $('record-label').textContent = { idle: '开始录音', arming: '正在打开麦克风…', recording: '停止录音', stopping: '整理录音…' }[phase] ?? '开始录音';
  $('record-status').textContent = { idle: '麦克风未开启', arming: '等待麦克风权限', recording: '正在收音', stopping: '正在停止', draft: '麦克风已关闭 · 待保存', saving: '正在保存至本机' }[phase];
  $('record-hint').textContent = done ? '这一组已完成，录音已保存在本机。' : draft ? '先试听，确认声音完整后保存这一条。' : phase === 'recording' ? '请说出上方词语，说完稍停半秒，再停止。' : '点击开始，稍停半秒，再自然地说出这句话。';
  document.querySelector('.keyboard-hint').hidden = Boolean(draft) || done;
  $('draft').hidden = !draft;
  $('save').disabled = phase !== 'draft';
  $('save').textContent = phase === 'saving' ? '正在保存…' : '保存这一条 ↗';
  $('discard').disabled = phase !== 'draft';
  $('group-done').hidden = !done;
  const next = nextGroup();
  $('next-group').hidden = !next;
  $('next-group').textContent = next ? `录制“${state.phrases[next]}” →` : '全部已收齐';
  $('library-count').textContent = String(total);
  $('export').classList.toggle('disabled', total === 0);
  $('export').setAttribute('aria-disabled', String(total === 0));
  $('empty').hidden = total > 0;
  const step = Math.min(3, Math.floor(n / 5));
  $('tip-title').textContent = tips[step][0];
  $('tip-copy').textContent = tips[step][1];
  document.querySelectorAll('.tip-steps i').forEach((el, i) => el.classList.toggle('active', i === step));
  document.querySelectorAll('.remove-clip').forEach(el => { el.disabled = busy(); });
}
function select(group) { if (!busy()) { category = group; message(''); render(); } }
for (const group of groups) $(group + '-tab').onclick = () => select(group);
$('next-group').onclick = () => { const next = nextGroup(); if (next) select(next); };
$('config-form').onsubmit = async event => {
  event.preventDefault();
  if (busy()) return;
  const phrases = Object.fromEntries(groups.map(group => [group, $(group + '-input').value.trim()]));
  phase = 'saving'; render();
  try {
    await request('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(phrases) });
    await refresh();
    $('phrase-settings').open = false;
    message('词语已保存，可以开始录音。');
  } catch (error) { message(error.message, true); }
  finally { phase = 'idle'; render(); }
};

function stopPlayback() {
  document.querySelectorAll('audio').forEach(audio => audio.pause());
}
document.addEventListener('play', event => {
  if (event.target instanceof HTMLAudioElement) document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
}, true);
async function cleanup() {
  clearTimeout(timeout); clearInterval(ticker);
  stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
  stream = undefined;
  if (processor) { processor.port.onmessage = null; processor.disconnect(); processor = undefined; }
  source?.disconnect(); source = undefined;
  const previous = context; context = undefined;
  if (previous && previous.state !== 'closed') await previous.close().catch(() => {});
  level = 0;
}
function draw() {
  brush.clearRect(0, 0, canvas.width, canvas.height);
  const bars = 59, center = canvas.height / 2;
  for (let i = 0; i < bars; i++) {
    const envelope = Math.sin((i + 1) / (bars + 1) * Math.PI);
    const height = phase === 'recording' ? 4 + Math.min(74, level * 260 * envelope * (0.55 + Math.sin(i * 1.7 + performance.now() / 140) * 0.45)) : 3 + envelope * (2 + Math.sin(i * 2.3) * 2);
    brush.fillStyle = phase === 'recording' ? '#3a947d' : '#c9d9c6';
    brush.fillRect(i * 12.8 + 3, center - height / 2, 3, height);
  }
  requestAnimationFrame(draw);
}
function timer(seconds) {
  $('timer').replaceChildren(document.createTextNode(`${seconds.toFixed(1).padStart(4, '0')} `), Object.assign(document.createElement('small'), { textContent: '/ 08 秒' }));
}
async function start() {
  if (!state || busy() || count(category) >= state.target) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) { message('当前浏览器不支持录音，请使用本机 Chrome / Edge 打开此页面。', true); return; }
  stopPlayback(); message(''); phase = 'arming'; chunks = []; sampleCount = 0; timer(0); render();
  const attempt = ++generation;
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (attempt !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
    stream = acquired;
    context = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
    if (context.sampleRate !== 16000) throw new Error('浏览器未能使用 16 kHz，请更换 Chrome / Edge 后重试。');
    await context.audioWorklet.addModule('/microphone.js');
    await context.resume();
    source = context.createMediaStreamSource(stream);
    processor = new AudioWorkletNode(context, 'collector-microphone');
    processor.port.onmessage = event => {
      if (phase !== 'recording') return;
      const remaining = 128000 - sampleCount;
      const samples = event.data.length > remaining ? event.data.slice(0, remaining) : event.data;
      if (samples.length) {
        chunks.push(samples); sampleCount += samples.length;
        level = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      }
      if (sampleCount >= 128000) void stop();
    };
    source.connect(processor); processor.connect(context.destination);
    phase = 'recording'; startedAt = performance.now();
    stream.getTracks().forEach(track => { track.onended = () => { message('麦克风连接已中断，请试听确认这条录音。', true); void stop(); }; });
    timeout = setTimeout(() => void stop(), 8050);
    ticker = setInterval(() => timer(Math.min(8, (performance.now() - startedAt) / 1000)), 100);
    render();
  } catch (error) {
    await cleanup(); phase = 'idle';
    const text = { NotAllowedError: '麦克风权限未开启。请在地址栏允许麦克风访问，再点击开始录音。', NotFoundError: '没有找到麦克风，请连接设备后重试。', NotReadableError: '麦克风无法打开，请检查是否被其他程序独占。' }[error.name] ?? error.message;
    message(text, true); render();
  }
}
function encode(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const text = (at, str) => { for (let i = 0; i < str.length; i++) view.setUint8(at + i, str.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, i) => { const s = Math.max(-1, Math.min(1, value)); view.setInt16(44 + i * 2, Math.round(s * (s < 0 ? 32768 : 32767)), true); });
  return new Blob([buffer], { type: 'audio/wav' });
}
async function stop() {
  if (phase !== 'recording') return;
  phase = 'stopping'; render();
  await cleanup();
  const samples = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
  chunks = [];
  const duration = samples.length / 16000;
  timer(duration);
  if (duration < 0.7) { phase = 'idle'; message('这条太短了。开始后稍停半秒，说完再停止。', true); render(); return; }
  let sum = 0, clipped = 0;
  for (const sample of samples) { sum += sample * sample; if (Math.abs(sample) >= .999) clipped++; }
  const rms = Math.sqrt(sum / samples.length);
  if (rms < .0001) { phase = 'idle'; message('几乎没有录到声音，请检查麦克风的输入设备与音量。', true); render(); return; }
  const blob = encode(samples);
  draft = { blob, category, phrase: state.phrases[category], url: URL.createObjectURL(blob), id: crypto.randomUUID().replaceAll('-', '') };
  $('draft-audio').src = draft.url;
  $('draft-duration').textContent = `${duration.toFixed(2)} 秒 · ${(blob.size / 1024).toFixed(0)} KB`;
  $('quality-hint').textContent = clipped / samples.length > .005 ? '音量可能过大，出现削波。建议离麦克风稍远一点后重录。' : rms < .006 ? '声音偏轻，请先试听；如果听不清，靠近麦克风后重录。' : '请确认词语完整、没有说错或杂音。这条录音尚未保存。';
  phase = 'draft'; render();
}
function clearDraft() {
  if (draft) URL.revokeObjectURL(draft.url);
  $('draft-audio').pause(); $('draft-audio').removeAttribute('src'); $('draft-audio').load();
  draft = undefined;
}
$('record').onclick = () => phase === 'recording' ? void stop() : void start();
$('discard').onclick = () => { if (phase !== 'draft') return; clearDraft(); phase = 'idle'; timer(0); render(); void start(); };
$('save').onclick = async () => {
  if (phase !== 'draft' || !draft) return;
  phase = 'saving'; render();
  try {
    const query = new URLSearchParams({ category: draft.category, phrase: draft.phrase });
    const clip = await request(`/api/clips?${query}`, { method: 'POST', headers: { 'Content-Type': 'audio/wav', 'X-Clip-Id': draft.id }, body: draft.blob });
    if (!state.clips.some(c => c.id === clip.id)) state.clips.push(clip);
    clearDraft(); phase = 'idle'; timer(0);
    message(groups.every(group => count(group) >= state.target) ? `${state.clips.length} 条已全部保存！可以导出 ZIP 留存，之后再准备训练。` : `已保存第 ${count(category)} 条“${state.phrases[category]}”录音。`);
    renderClips();
  } catch (error) { phase = 'draft'; message(`保存未完成：${error.message} 录音仍在待保存区，可以重试。`, true); }
  render();
};
function renderClips() {
  const list = $('clip-list');
  list.querySelectorAll('audio').forEach(audio => audio.pause());
  list.replaceChildren();
  for (const group of groups) state.clips.filter(c => c.category === group).forEach((clip, i) => {
    const row = document.createElement('article'); row.className = 'clip'; row.dataset.clipId = clip.id;
    const number = document.createElement('span'); number.className = 'clip-number'; number.textContent = `${group.startsWith('wake') ? '唤' : '止'} ${String(i + 1).padStart(2, '0')}`;
    const info = document.createElement('div');
    const text = document.createElement('div'); text.className = 'clip-text'; text.textContent = clip.text;
    const meta = document.createElement('div'); meta.className = 'clip-meta'; meta.textContent = `${clip.duration.toFixed(2)} 秒 · 16 kHz WAV`;
    info.append(text, meta);
    const actions = document.createElement('div'); actions.className = 'clip-actions';
    const play = document.createElement('button'); play.textContent = '试听'; play.setAttribute('aria-label', `试听${clip.text}第 ${i + 1} 条`);
    let audio;
    play.onclick = () => {
      if (phase === 'recording' || phase === 'arming') { message('请先停止录音，再试听。'); return; }
      if (!audio) { audio = document.createElement('audio'); audio.controls = true; audio.src = `/api/audio/${clip.id}`; row.append(audio); }
      if (audio.paused) audio.play().catch(() => message('播放失败，请检查服务连接后重试。', true)); else audio.pause();
    };
    const remove = document.createElement('button'); remove.textContent = '移除'; remove.className = 'remove-clip'; remove.setAttribute('aria-label', `移除${clip.text}第 ${i + 1} 条`);
    let confirming = false;
    remove.onclick = async () => {
      if (busy()) return;
      if (!confirming) { confirming = true; remove.textContent = '确认移除'; remove.classList.add('delete-confirm'); return; }
      phase = 'saving'; render();
      try { await request(`/api/clips/${clip.id}`, { method: 'DELETE' }); await refresh(); message('已移除这一条，可以重新录制。'); }
      catch (error) { message(error.message, true); }
      finally { phase = 'idle'; render(); }
    };
    actions.append(play, remove); row.append(number, info, actions); list.append(row);
  });
}
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.target !== document.body) return;
  event.preventDefault();
  if (phase === 'recording') void stop(); else if (phase === 'idle') void start();
});
window.addEventListener('beforeunload', event => {
  if (busy()) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', () => { generation++; void cleanup(); });
draw();
refresh().catch(error => message(`无法连接本机录音服务：${error.message} 请启动服务后刷新页面。`, true));
