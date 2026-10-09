import { SpeechMeter } from '../avatar/SpeechMeter';
import { decodePcm16Base64 } from '../study/study-utils';
import { getAvatarVoice } from '../avatar/avatar-preference';

export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type NarrationVoice = 'course' | 'device';
/** One owned playback queue. It never opens a microphone or an LLM conversation. */
export class NarrationSpeech {
  readonly meter = new SpeechMeter();
  private context?: AudioContext;
  private controller?: AbortController;
  private sources = new Map<AudioBufferSourceNode, () => void>();
  private utterance?: SpeechSynthesisUtterance;
  private status: NarrationStatus = 'idle';
  private paused = false;
  private pauseWaiters: Array<() => void> = [];
  constructor(private update: (status: NarrationStatus, message?: string) => void) {}
  private set(status: NarrationStatus, message?: string) { this.status = status; this.update(status, message); }
  private async awaitResume(signal: AbortSignal) {
    if (!this.paused) return;
    await new Promise<void>(resolve => this.pauseWaiters.push(resolve));
    signal.throwIfAborted();
  }
  stop() {
    this.controller?.abort(); this.controller = undefined;
    for (const [source, resolve] of this.sources) { source.onended = null; try { source.stop(); source.disconnect(); } catch { /* Already ended. */ } resolve(); }
    this.sources.clear(); this.meter.reset();
    if (this.utterance) { speechSynthesis.cancel(); this.utterance = undefined; }
    this.paused = false; this.pauseWaiters.splice(0).forEach(resolve => resolve());
    this.set('idle');
  }
  async pause() {
    if (!['loading', 'playing'].includes(this.status)) return;
    this.paused = true;
    if (this.utterance) speechSynthesis.pause();
    await this.context?.suspend();
    if (this.paused) this.set('paused');
  }
  async resume() {
    if (!this.paused) return;
    await this.context?.resume();
    if (this.utterance) speechSynthesis.resume();
    this.paused = false; this.pauseWaiters.splice(0).forEach(resolve => resolve());
    if (this.controller) this.set('playing');
  }
  async play(paragraphs: readonly string[], voice: NarrationVoice, rate: number, onParagraph: (text: string) => void) {
    this.stop();
    window.dispatchEvent(new CustomEvent('edu:exclusive-audio', { detail: this }));
    const controller = new AbortController(); this.controller = controller;
    const signal = controller.signal;
    this.set('loading');
    try {
      // Unlock audio within the teacher's button gesture, before any network request.
      if (voice === 'course') { this.context ??= new AudioContext({ sampleRate: 24000 }); await this.context.resume(); }
      for (const text of paragraphs) {
        signal.throwIfAborted(); await this.awaitResume(signal); onParagraph(text);
        if (voice === 'device') await this.device(text, rate, signal);
        else await this.cloud(text, rate, signal);
      }
      signal.throwIfAborted();
      if (this.controller === controller) { this.controller = undefined; this.meter.reset(); this.set('idle', '本页已公开内容讲解完毕。'); }
    } catch (error) {
      if (signal.aborted || this.controller !== controller) return;
      this.stop(); this.set('error', error instanceof Error ? error.message : '讲解失败，请重试。');
    }
  }
  private device(text: string, rate: number, signal: AbortSignal) {
    if (!('speechSynthesis' in window)) throw new Error('此浏览器没有本机朗读功能，请使用课程语音。');
    const voice = speechSynthesis.getVoices().find(v => /^zh(-|_)/i.test(v.lang));
    if (!voice) throw new Error('未找到本机中文语音，请使用课程语音或在系统中安装中文语音。');
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text); this.utterance = utterance;
      utterance.lang = 'zh-CN'; utterance.voice = voice; utterance.rate = rate;
      const cleanup = () => { signal.removeEventListener('abort', abort); if (this.utterance === utterance) this.utterance = undefined; };
      const abort = () => { speechSynthesis.cancel(); cleanup(); reject(new DOMException('Stopped', 'AbortError')); };
      utterance.onstart = () => { if (!signal.aborted && !this.paused) this.set('playing'); };
      utterance.onend = () => { cleanup(); resolve(); };
      utterance.onerror = () => { cleanup(); reject(new Error('本机中文语音未能播放，请重试或改用课程语音。')); };
      signal.addEventListener('abort', abort, { once: true }); speechSynthesis.speak(utterance);
    });
  }
  private async cloud(text: string, rate: number, signal: AbortSignal) {
    const timeout = new AbortController();
    // Reset on each incoming block; a stalled connection cannot leave the button stuck.
    let timer = setTimeout(() => timeout.abort(), 25000);
    const requestSignal = AbortSignal.any([signal, timeout.signal]);
    try {
      const response = await fetch('/api/teacher/tts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, courseId: 'course-economic-mathematics', voiceProfile: getAvatarVoice(), lipSync: true }), signal: requestSignal });
      if (!response.ok || !response.body) throw new Error(response.status === 401 || response.status === 403 ? '请先登录教师账号，再使用课程语音；也可选择本机中文语音。' : '课程语音暂不可用。请确认平台服务已启动，或选择本机中文语音后重试。');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '', next = this.context!.currentTime, count = 0;
      const played: Promise<void>[] = [];
      try {
        while (true) {
          const chunk = await reader.read(); signal.throwIfAborted();
          clearTimeout(timer); timer = setTimeout(() => timeout.abort(), 25000);
          buffer += decoder.decode(chunk.value, { stream: !chunk.done }); if (chunk.done) buffer += '\n';
          const lines = buffer.split('\n'); buffer = lines.pop()!;
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const event = JSON.parse(line.slice(5));
            if (event.error) throw new Error(String(event.error));
            if (!event.audioBase64) continue;
            if (event.sampleRate !== 24000) throw new Error('语音采样率异常，已停止播放。');
            const samples = decodePcm16Base64(event.audioBase64); if (!samples.length) continue;
            const ctx = this.context!, block = ctx.createBuffer(1, samples.length, event.sampleRate);
            block.getChannelData(0).set(samples);
            const source = ctx.createBufferSource(); source.buffer = block; source.playbackRate.value = rate;
            this.meter.connect(source); next = Math.max(next, ctx.currentTime + .035);
            const cues = event.mouthCues?.map((cue: { start: number; end: number; value: string }) => ({ ...cue, start: cue.start / rate, end: cue.end / rate }));
            this.meter.schedule(source, next, cues);
            played.push(new Promise<void>(resolve => { this.sources.set(source, resolve); source.onended = () => { this.sources.delete(source); source.disconnect(); resolve(); }; }));
            source.start(next); next += block.duration / rate; count++;
            if (!this.paused) this.set('playing');
          }
          if (chunk.done) break;
        }
      } finally { reader.releaseLock(); }
      clearTimeout(timer);
      if (!count) throw new Error('语音服务没有返回声音，请重试或选择本机中文语音。');
      await Promise.all(played); signal.throwIfAborted();
    } catch (error) {
      if (timeout.signal.aborted && !signal.aborted) throw new Error('课程语音响应超时，请重试或选择本机中文语音。');
      throw error;
    } finally { clearTimeout(timer); }
  }
  dispose() { this.stop(); void this.context?.close(); }
}
