'use strict';
const svg = document.querySelector('#art > svg');
const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const mouthInput = document.querySelector('#mouth');
const speakButton = document.querySelector('#speak');
const blinkButton = document.querySelector('#blink');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let expression = 'neutral';
let speakingFrame = 0;
const idleButton = document.querySelector('#idle-toggle');
const eyeSlider = document.querySelector('#eye-close');
const breathSlider = document.querySelector('#breath-preview');
const motion = window.QingzhiMotion.create(svg, { onChange: state => {
  idleButton.textContent = state.running ? 'Ⅱ 暂停微动' : '▷ 继续微动';
  idleButton.setAttribute('aria-pressed', String(state.running));
  document.querySelector('#motion-state').textContent = state.running ? '自然微动' : state.solo ? '单次动作' : '静止观察';
  eyeSlider.value = String(Math.round(state.pose.blink * 100));
  document.querySelector('#eye-close-value').textContent = eyeSlider.value + '%';
  breathSlider.value = String(Math.round(state.pose.breath * 100));
  document.querySelector('#breath-preview-value').textContent = breathSlider.value + '%';
  if (state.reason === 'finished') setStatus(state.running ? '单次动作结束，继续自然微动。' : '单次动作结束，保持静止。');
} });
window.qingzhiMotion = motion;
const setStatus = message => {status.textContent = message;};
function setMouth(value) {
  const amount = Math.max(0, Math.min(100, Number(value) || 0));
  mouthInput.value = String(amount);
  document.querySelector('#mouth-value').textContent = Math.round(amount) + '%';
  mouthInput.setAttribute('aria-valuetext', amount ? Math.round(amount) + '% 张开' : '闭合');
  svg.dataset.mouthAmount = amount.toFixed(2);
  const softBrows = amount >= 3 && expression === 'smile';
  svg.querySelector('#brows-neutral').style.display = softBrows ? 'none' : '';
  svg.querySelector('#brows-soft').style.display = softBrows ? 'inline' : '';
  if (amount < 3) {svg.dataset.expression = expression; return;}
  svg.dataset.expression = 'speaking';
  const height = 4 + amount * .29;
  const width = 12 + amount * .12;
  const left = 451 - width;
  const right = 451 + width;
  const cavity = `M${left} 551Q451 556 ${right} 550C${right-1} ${551+height} ${left+1} ${553+height} ${left} 551Z`;
  svg.querySelector('#mouth-cavity').setAttribute('d', cavity);
  svg.querySelector('#mouth-clip-shape').setAttribute('d', cavity);
  svg.querySelector('#mouth-teeth').setAttribute('d', `M${left+2} 552Q451 557 ${right-2} 551L${right-5} 557Q451 560 ${left+5} 557Z`);
  svg.querySelector('#mouth-tongue').setAttribute('d', `M${451-width*.55} ${552+height*.65}Q451 ${548+height*.57} ${451+width*.5} ${551+height*.65}Q451 ${553+height*.92} ${451-width*.55} ${552+height*.65}Z`);
  svg.querySelector('#mouth-teeth').style.opacity = String(Math.min(1, amount / 30));
  svg.querySelector('#mouth-tongue').style.opacity = String(Math.max(0, (amount - 20) / 80));
  const lip = 556 + height * .78;
  svg.querySelector('#mouth-lower-light').setAttribute('d', `M${451-width*.5} ${lip}Q451 ${lip+2} ${451+width*.5} ${lip-1}`);
}
function stopSpeaking(reset = true) {cancelAnimationFrame(speakingFrame);speakingFrame = 0;speakButton.textContent = '◌ 口型演示';speakButton.removeAttribute('aria-pressed');if (reset) setMouth(0);}
document.querySelectorAll('[data-expression-choice]').forEach(button => button.addEventListener('click', () => {
  stopSpeaking();expression = button.dataset.expressionChoice;setMouth(0);
  document.querySelectorAll('[data-expression-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  setStatus(expression === 'smile' ? '浅笑：嘴角与眉形轻微变化。' : '自然：回到静态基准神态。');
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {stage.classList.toggle('detail', button.dataset.view === 'detail');document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));}));
document.querySelectorAll('[data-backdrop]').forEach(button => button.addEventListener('click', () => {
  const backdrop = button.dataset.backdrop;
  stage.classList.toggle('dark', backdrop === 'dark');stage.classList.toggle('transparent', backdrop === 'transparent');
  document.querySelectorAll('[data-backdrop]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelector('#backdrop-name').textContent = {paper:'浅草纸',dark:'深墨青',transparent:'透明网格'}[backdrop];
}));
idleButton.addEventListener('click', () => {
  if (motion.getState().running) { motion.pause(); setStatus('已暂停在当前一帧，可保存或继续。'); }
  else if (reducedMotion.matches) { setStatus('系统已开启减少动态效果；可用下方滑块静态检查。'); }
  else { motion.play(); setStatus('轻呼吸、自然眨眼与偶尔的视线变化。'); }
});
document.querySelector('#idle-reset').addEventListener('click', () => {
  motion.stop(); stopSpeaking(); setStatus('已停止动作，回到现版静态神态。');
});
blinkButton.addEventListener('click', () => {
  if (reducedMotion.matches) { motion.previewBlink(1); eyeSlider.value = '100'; document.querySelector('#eye-close-value').textContent = '100%'; setStatus('静态展示闭眼；点击停止回正可恢复。'); }
  else { motion.blink(); setStatus('一次自然眨眼。'); }
});
document.querySelector('#glance').addEventListener('click', () => {
  if (reducedMotion.matches) { setStatus('系统已开启减少动态效果，视线保持静止。'); return; }
  motion.glance(); setStatus('轻轻看一眼，稍作停留后回正。');
});
eyeSlider.addEventListener('input', () => {
  motion.previewBlink(Number(eyeSlider.value) / 100);
  document.querySelector('#eye-close-value').textContent = eyeSlider.value + '%';
  setStatus('静态检查眼睑闭合；滑回 0% 可睁眼，继续微动可恢复播放。');
});
breathSlider.addEventListener('input', () => {
  const value = Number(breathSlider.value);
  motion.previewBreath(value / 100); breathSlider.value = String(value);
  document.querySelector('#breath-preview-value').textContent = value + '%';
  setStatus('静态检查轻呼吸的幅度；点击停止回正可恢复。');
});
speakButton.addEventListener('click', () => {
  if (speakingFrame) {stopSpeaking();setStatus('口型演示已停止。');return;}
  if (reducedMotion.matches) {setMouth(50);setStatus('遵循减少动态效果偏好，展示 50% 静态口型；可拖动滑块。');return;}
  const start = performance.now();
  const cues = [[0,0],[160,42],[310,15],[460,67],[620,0],[900,0],[1080,53],[1230,26],[1450,75],[1590,12],[1790,44],[1960,0],[2330,0],[2480,35],[2660,64],[2840,14],[3020,47],[3200,0]];
  speakButton.textContent = '■ 停止演示';speakButton.setAttribute('aria-pressed','true');setStatus('正在演示一段无声口型，3.2 秒后恢复静止。');
  function tick(now) {
    const elapsed = now - start;
    if (elapsed >= 3200) {stopSpeaking();setStatus('口型演示结束，已恢复静止。');return;}
    let segment = 0;while (segment < cues.length-2 && elapsed > cues[segment+1][0]) segment++;
    const [t0,v0] = cues[segment];const [t1,v1] = cues[segment+1];
    const mix = Math.max(0,Math.min(1,(elapsed-t0)/(t1-t0)));const eased = mix*mix*(3-2*mix);
    setMouth(v0+(v1-v0)*eased);speakingFrame = requestAnimationFrame(tick);
  }
  speakingFrame = requestAnimationFrame(tick);
});
mouthInput.addEventListener('input', () => {stopSpeaking(false);setMouth(mouthInput.value);setStatus('手动检查嘴部开合；归零可恢复所选神态。');});
document.querySelector('#download').addEventListener('click', () => {
  const copy = svg.cloneNode(true);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n',new XMLSerializer().serializeToString(copy)], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);const anchor = document.createElement('a');anchor.href = url;anchor.download = `qingzhi-${copy.dataset.expression}-pose.svg`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(() => URL.revokeObjectURL(url),1000);
  setStatus('已发起 SVG 保存，请查看浏览器下载。');
});
document.addEventListener('visibilitychange', () => {
  motion.suspend(document.hidden);
  if (document.hidden) stopSpeaking();
});
window.addEventListener('pagehide', () => { motion.suspend(true); stopSpeaking(); });
window.addEventListener('pageshow', () => motion.suspend(document.hidden));
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { motion.stop(); stopSpeaking(); setStatus('已遵循系统偏好，切换为静止展示。'); }
  else setStatus('可点击继续微动开始播放。');
});
motion.suspend(document.hidden);
if (!reducedMotion.matches) { motion.play(); setStatus('自然微动中：轻呼吸、眨眼，偶尔轻看一眼。'); }
else setStatus('遵循减少动态效果偏好，静止展示中。');
