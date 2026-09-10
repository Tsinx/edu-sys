/* Local keyword spotting only. No audio is uploaded by this worker. */
importScripts('/vendor/local-kws/sherpa-onnx-wasm-web.js', '/vendor/local-kws/sherpa-onnx-kws.js',
  '/vendor/local-kws/sherpa-onnx-vad.js', '/audio/classroom-ending.js');
let spotter, stream, spotters, cancelStream, thanksStream, pendingFinish, vad;
let phase = 'waiting', epoch = 0, samplesSeen = 0, quiet = 0, generation = 0;
const ending = new ClassroomEndingGate();
const vadWindow = new Float32Array(512);
let vadBuffered = 0, completed = false, lastSpeechAt = -Infinity, cancelledShortAt = -Infinity;
function switchPhase(next) {
  stream?.free(); cancelStream?.free(); thanksStream?.free();
  cancelStream = undefined; thanksStream = undefined; pendingFinish = undefined;
  ending.reset(); vad?.reset(); vadBuffered = 0;
  completed = false;
  lastSpeechAt = -Infinity;
  cancelledShortAt = -Infinity;
  phase = next; spotter = spotters[phase]; stream = spotter.createStream();
  // Warm up on silence, never on the wake phrase's tail: that tail can become a false
  // “谢谢” prefix and turn the next “助教取消” into a premature end-word hit.
  stream.acceptWaveform(rate, new Float32Array(rate));
  while (spotter.isReady(stream)) spotter.decode(stream);
  if (next === 'collecting') {
    cancelStream = spotters.cancel.createStream();
    cancelStream.acceptWaveform(rate, new Float32Array(rate));
    while (spotters.cancel.isReady(cancelStream)) spotters.cancel.decode(cancelStream);
    thanksStream = spotters.thanks.createStream();
    thanksStream.acceptWaveform(rate, new Float32Array(rate));
    while (spotters.thanks.isReady(thanksStream)) spotters.thanks.decode(thanksStream);
  }
  epoch = samplesSeen / rate;
}
const rate = 16000;
async function initialize() {
  const model = new URL(self.location.href).searchParams.get('model') || 'original';
  const modelRoots = {
    original: '/vendor/local-kws/',
    'personal-20260909': '/vendor/local-kws/personal-20260909/',
    'xiaomai-20260909-epoch10': '/vendor/local-kws/xiaomai-20260909-epoch10/'
  };
  if (!Object.hasOwn(modelRoots, model)) throw new Error('未知的本地唤醒模型');
  const modelRoot = modelRoots[model];
  const module = await SherpaOnnx({ locateFile: file => '/vendor/local-kws/' + file });
  await Promise.all(['encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt'].map(async file => {
    const response = await fetch(modelRoot + file);
    if (!response.ok) throw new Error('缺少本地唤醒模型文件');
    module.FS.writeFile('/' + file, new Uint8Array(await response.arrayBuffer()));
  }));
  // Only the earlier two-phrase model needs general weights for short thanks
  // and cancellation. The four-phrase epoch-10 model uses its own weights for
  // every graph, matching the browser validation that selected this checkpoint.
  const thanksPrefix = model === 'personal-20260909' ? '/general' : '';
  if (thanksPrefix) {
    module.FS.mkdir(thanksPrefix);
    await Promise.all(['encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt'].map(async file => {
      const response = await fetch('/vendor/local-kws/' + file);
      if (!response.ok) throw new Error('缺少通用结束词模型文件');
      module.FS.writeFile(thanksPrefix + '/' + file, new Uint8Array(await response.arrayBuffer()));
    }));
  }
  const vadResponse = await fetch('/vendor/local-kws/silero_vad.onnx');
  if (!vadResponse.ok) throw new Error('缺少本地语音活动检测模型');
  module.FS.writeFile('/silero_vad.onnx', new Uint8Array(await vadResponse.arrayBuffer()));
  vad = createVad(module, {
    sileroVad: { model: '/silero_vad.onnx', threshold: 0.5, minSilenceDuration: 0.064,
      minSpeechDuration: 0.064, maxSpeechDuration: 60, windowSize: 512 },
    sampleRate: rate, numThreads: 1, provider: 'cpu', debug: 0, bufferSizeInSeconds: 65
  });
  if (!vad.handle) throw new Error('无法初始化本地语音活动检测模型');
  // WenetSpeech KWS uses tone-marked pinyin initials/finals, not Chinese characters.
  const wakeWords = [
    'x iǎo m ài l ǎo sh ī :1.8 #0.12 @wake',
    'n ǐ h ǎo zh ù sh ǒu :1.8 #0.12 @wake',
    'n ǐ h ǎo x iǎo zh ù sh ǒu :1.8 #0.12 @wake',
    'zh ù j iào n ǐ h ǎo :1.8 #0.12 @wake',
    'l án zh ōu n ǐ h ǎo :1.8 #0.12 @wake'
  ];
  const endWords = [
    'x iè x iè zh ù j iào :2.5 #0.15 @finish-assistant',
    'f ēi ch áng g ǎn x iè :2.0 #0.2 @finish-thanks',
    'x iè x iè l án zh ōu :2.5 #0.15 @finish-name'
  ];
  const cancelWords = [
    'zh ù j iào q ǔ x iāo :2.5 #0.15 @cancel',
    'l án zh ōu q ǔ x iāo :2.5 #0.15 @cancel',
    // The suffix may already have been spoken by the time short KWS catches up.
    // Preserve this common classroom courtesy as continued speech, not an ending.
    'x iè x iè d à j iā :1.5 #0.4 @continue'
  ];
  function create(words, prefix = '', maxActivePaths = 8) {
    const keywords = words.join('\n');
    const kws = createKws(module, {
      featConfig: { samplingRate: rate, featureDim: 80 },
      modelConfig: { transducer: { encoder: prefix + '/encoder.onnx', decoder: prefix + '/decoder.onnx', joiner: prefix + '/joiner.onnx' },
        tokens: prefix + '/tokens.txt', provider: 'cpu', numThreads: 1, debug: 0, modelingUnit: 'cjkchar' },
      keywords: '', keywordsBuf: keywords, keywordsBufSize: new TextEncoder().encode(keywords).length,
      maxActivePaths, numTrailingBlanks: 1, keywordsScore: 1.5, keywordsThreshold: 0.25
    });
    if (!kws.handle) throw new Error('无法初始化本地关键词模型');
    return kws;
  }
  // Separate graphs prevent a sensitive end-word path from suppressing the wake phrase.
  spotters = { waiting: create(wakeWords), collecting: create(endWords), cancel: create(cancelWords, thanksPrefix),
    thanks: create(['x iè x iè :1.5 #0.3 @short-thanks'], thanksPrefix) };
  switchPhase('waiting');
  self.postMessage({ type: 'ready' });
}
self.onmessage = event => {
  try {
    if (event.data.type === 'reset') {
      generation = event.data.generation;
      samplesSeen = 0; quiet = 0;
      if (spotters) switchPhase('waiting');
      return;
    }
    if (event.data.generation !== undefined && event.data.generation !== generation) return;
    if (event.data.mode === 'waiting' || event.data.mode === 'collecting') {
      if (spotters && phase !== event.data.mode) switchPhase(event.data.mode);
      return;
    }
    const samples = event.data.samples;
    if (!stream || !(samples instanceof Float32Array)) return;
    samplesSeen += samples.length;
    const keywords = [];
    // Frames already queued when the main thread starts ASR must not start or
    // finish another round. A new microphone generation explicitly resets this.
    if (completed) {
      self.postMessage({ type: 'frame', samples, keywords, generation, endingPending: false }, [samples.buffer]);
      return;
    }
    const wasCollecting = phase === 'collecting';
    let confirmedShortEnd = false;
    if (wasCollecting) {
      // Check every 32 ms, including speech that resumes and ends within one KWS frame.
      for (let offset = 0; offset < samples.length;) {
        const count = Math.min(vadWindow.length - vadBuffered, samples.length - offset);
        vadWindow.set(samples.subarray(offset, offset + count), vadBuffered);
        vadBuffered += count; offset += count;
        if (vadBuffered !== vadWindow.length) continue;
        vad.acceptWaveform(vadWindow); vadBuffered = 0;
        const speaking = vad.isDetected();
        if (speaking) lastSpeechAt = samplesSeen - samples.length + offset;
        const decision = ending.advance(vadWindow.length, speaking);
        if (decision === 'finish') confirmedShortEnd = true;
        if (decision === 'resumed') cancelledShortAt = samplesSeen - samples.length + offset;
        if (speaking) confirmedShortEnd = false;
        while (!vad.isEmpty()) vad.pop();
      }
    }
    // Cancellation has an independent graph and takes priority over a pending ending.
    if (cancelStream) {
      cancelStream.acceptWaveform(rate, samples);
      while (spotters.cancel.isReady(cancelStream)) {
        spotters.cancel.decode(cancelStream);
        const result = spotters.cancel.getResult(cancelStream);
        if (result.keyword === 'continue') {
          const times = result.timestamps;
          const duration = times.at(-1) - times[0];
          const gap = Math.max(0, ...times.slice(1).map((time, i) => time - times[i]));
          // A genuine suffix follows 谢谢 closely. On bare 谢谢 the decoder can
          // invent 大家 across its trailing silence; do not let that veto an end.
          const connectedSuffix = times[4] - times[3] <= 0.241;
          if (samplesSeen - lastSpeechAt <= rate * 0.64 && connectedSuffix && duration >= 0.4 && duration <= 2.4 && gap <= 0.4 && times.at(-1) - times[4] >= 0.079) {
            ending.reset(); confirmedShortEnd = false; cancelledShortAt = samplesSeen;
            spotters.thanks.reset(thanksStream);
          }
          spotters.cancel.reset(cancelStream);
        } else if (result.keyword) {
          keywords.push({ kind: 'cancel', start: samplesSeen / rate, phrase: 'cancel' });
          switchPhase('waiting');
          self.postMessage({ type: 'frame', samples, keywords, generation, endingPending: false }, [samples.buffer]);
          return;
        }
      }
    }
    stream.acceptWaveform(rate, samples);
    while (spotter.isReady(stream)) {
      spotter.decode(stream);
      const result = spotter.getResult(stream);
      if (result.keyword) {
        // sherpa resets decoder timestamps after hits and long blanks, without rebasing
        // start_time. Anchor to our audio clock, never to those reset-relative timestamps.
        // Keep the wake phrase plus a bounded look-back; retain the complete end phrase
        // for transcript cleanup instead of risking clipping the actual instruction.
        const duration = result.timestamps.at(-1) - result.timestamps[0];
        const kind = result.keyword.startsWith('finish-') ? 'finish' : result.keyword;
        const start = kind === 'wake'
          ? Math.max(0, samplesSeen / rate - Math.min(4, duration + 0.8))
          : samplesSeen / rate;
        const maxGap = Math.max(0, ...result.timestamps.slice(1).map((time, i) => time - result.timestamps[i]));
        // Reject phrases stitched across a pause, e.g. “非常感慨 … 谢谢大家”.
        // Token alignment gaps include phoneme duration, not just silence. The
        // personal recordings support a wider gap for “你好助手”. Keep aliases
        // conservative: widening “你好小助手” admits a known cross-sentence false hit.
        const wakeMaxGap = result.tokens.join(' ') === 'n ǐ h ǎo zh ù sh ǒu' ? 1.0 : 0.6;
        const coherent = kind === 'wake' ? duration <= 3 && maxGap <= wakeMaxGap
          : kind !== 'finish' || (duration <= 2.4 && maxGap <= 0.6);
        if (coherent) {
          const hit = { kind, start, phrase: result.keyword };
          if (kind === 'finish') {
            pendingFinish ??= { hit, at: samplesSeen };
            ending.reset(); confirmedShortEnd = false;
          }
          else keywords.push(hit);
        }
        if (keywords.length && kind === 'wake') { switchPhase('collecting'); break; }
        if (keywords.length && kind === 'cancel') { switchPhase('waiting'); break; }
        spotter.reset(stream);
      }
    }
    // Only end/cancel graphs run while collecting, including tentative ending.
    if (wasCollecting && thanksStream) {
      thanksStream.acceptWaveform(rate, samples);
      while (spotters.thanks.isReady(thanksStream)) {
        spotters.thanks.decode(thanksStream);
        const result = spotters.thanks.getResult(thanksStream);
        if (!result.keyword) continue;
        const duration = result.timestamps.at(-1) - result.timestamps[0];
        const maxGap = Math.max(0, ...result.timestamps.slice(1).map((time, i) => time - result.timestamps[i]));
        // KWS can finish its look-ahead after VAD has already gone quiet. Accept
        // fast phoneme alignments, but reject compressed re-hits of a cancelled
        // candidate: those must not re-arm an ending after the speaker continued.
        const recentSpeech = samplesSeen - lastSpeechAt <= rate * 1.2;
        const repeatedTail = duration < 0.239 && samplesSeen - cancelledShortAt < rate * 2;
        if (!pendingFinish && !confirmedShortEnd && !repeatedTail && recentSpeech && duration >= 0.079 && duration <= 1.4 && maxGap <= 0.6) {
          ending.begin(vad.isDetected());
        }
        spotters.thanks.reset(thanksStream);
      }
    }
    // Allow the independent cancel detector to finish the suffix of “助教取消”
    // before committing a competing end hit. This adds at most one second after KWS.
    if (pendingFinish && samplesSeen - pendingFinish.at >= rate) {
      keywords.push({ ...pendingFinish.hit, start: samplesSeen / rate });
      pendingFinish = undefined;
    } else if (confirmedShortEnd && !pendingFinish) {
      keywords.push({ kind: 'finish', start: samplesSeen / rate, phrase: 'finish-short-thanks' });
    }
    if (keywords.some(hit => hit.kind === 'finish')) { completed = true; ending.reset(); }
    // Recreate on a quiet boundary to bound the streaming feature history.
    const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
    quiet = rms < 0.006 ? quiet + samples.length : 0;
    if (!completed && !pendingFinish && !ending.pending && samplesSeen / rate - epoch > 30 && quiet > rate) {
      switchPhase(phase);
    }
    self.postMessage({ type: 'frame', samples, keywords, generation, endingPending: ending.pending }, [samples.buffer]);
  } catch (error) { self.postMessage({ type: 'error', message: String(error) }); }
};
initialize().catch(error => self.postMessage({ type: 'error', message: String(error) }));
