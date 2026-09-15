import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { startVoiceCapture, type VoiceCapture } from "./continuous-voice";
import { localKeywordModels, readKeywordModel, saveKeywordModel, type LocalKeywordModel } from "./local-keyword-model";
import { LocalKeywordDetector } from "./local-keyword-detector";


interface HandsFreeVoiceControlProps {
  mode?: "manual" | "handsfree";
  disabled: boolean;
  configured: boolean;
  assistantBusy: boolean;
  onCommand: (text: string) => Promise<void>;
}

export function HandsFreeVoiceControl({ mode = "handsfree", disabled, configured, assistantBusy, onCommand }: HandsFreeVoiceControlProps) {
  const handsfree = mode === "handsfree";
  const [keywordModel, setKeywordModel] = useState<LocalKeywordModel>(readKeywordModel);
  const [enabled, setEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [endingPending, setEndingPending] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const captureRef = useRef<VoiceCapture | undefined>(undefined);
  const detectorRef = useRef<LocalKeywordDetector | undefined>(undefined);
  const [modelReady, setModelReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const commandRef = useRef(onCommand);
  commandRef.current = onCommand;
  // Hands-free listening is a user-enabled session, independent of window visibility.
  const blocked = disabled || !configured || assistantBusy || submitting || (!handsfree && hidden);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const needsEchoDelay = useRef(false);
  if (assistantBusy || submitting) needsEchoDelay.current = true;

  function close() {
    controllerRef.current?.abort();
    detectorRef.current?.dispose();
    detectorRef.current = undefined;
    captureRef.current = undefined;
    setTranscribing(false);
    setEnabled(false);
    setReady(false);
    setDraft("");
    setCollecting(false);
    setEndingPending(false);
  }

  useEffect(() => {
    const closeWhenHidden = () => {
      setHidden(document.hidden);
      if (document.hidden && !handsfree) close();
    };
    const closeOnExit = () => close();
    document.addEventListener("visibilitychange", closeWhenHidden);
    window.addEventListener("pagehide", closeOnExit);
    return () => {
      document.removeEventListener("visibilitychange", closeWhenHidden);
      window.removeEventListener("pagehide", closeOnExit);
    };
  }, [handsfree]);

  useEffect(() => {
    if (disabled || !configured) close();
  }, [disabled, configured]);

  useEffect(() => {
    if (!collecting) { setElapsed(0); return; }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 200);
    return () => window.clearInterval(timer);
  }, [collecting]);

  // Model ownership follows the listening switch, not assistant/TTS or recording rounds.
  useEffect(() => {
    setModelReady(false);
    if (!handsfree || !enabled || disabled || !configured) return;
    const lifetime = new AbortController();
    let detector: LocalKeywordDetector;
    try { detector = new LocalKeywordDetector(keywordModel); }
    catch (error) { setEnabled(false); setNotice((error as Error).message); return; }
    detectorRef.current = detector;
    void detector.ready(lifetime.signal).then(() => {
      if (detectorRef.current === detector) setModelReady(true);
    }).catch((error: Error) => {
      if (!lifetime.signal.aborted && detectorRef.current === detector) { close(); setNotice(error.message); }
    });
    return () => {
      lifetime.abort(); detector.dispose();
      if (detectorRef.current === detector) detectorRef.current = undefined;
    };
  }, [enabled, handsfree, disabled, configured, keywordModel]);

  useEffect(() => {
    setTranscribing(false);
    setReady(false);
    setDraft("");
    setCollecting(false);
    setEndingPending(false);
    if (!enabled || blocked) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const fail = (error: Error) => {
      if (controller.signal.aborted) return;
      controller.abort();
      setEnabled(false);
      setNotice(error.message);
    };
    const begin = async () => {
      try {
        const capture = await startVoiceCapture({
          mode,
          keywordModel,
          detector: handsfree ? detectorRef.current : undefined,
          signal: controller.signal,
          onError: fail,
          onState: state => {
            if (controller.signal.aborted || blockedRef.current) return;
            setCollecting(state === "recording" || state === "ending-pending");
            setEndingPending(state === "ending-pending");
            setTranscribing(state === "transcribing");
            setNotice(state === "ending-pending" ? "听到“谢谢”，正在确认是否说完；继续说话即可继续本轮。" : state === "recording" ? (handsfree ? "正在收音。说“非常感谢”发送，或说“谢谢”后停顿约1秒。" : "已开始录音，请说出指令。") : state === "cancelled" ? "本轮已取消。" : state === "timeout" ? "本轮已超时并取消。" : (handsfree ? "已确认结束，录音已结束，正在识别本轮指令…" : "录音结束，正在识别本轮指令…"));
            if (!handsfree && (state === "cancelled" || state === "timeout")) close();
          },
          onTranscript: text => {
            if (controller.signal.aborted || blockedRef.current) return;
            if (!text || text.length > 500) {
              controller.abort();
              setNotice(!text ? "未听清有效指令，请重新开始。" : "本轮超过500字，已取消。请缩短指令。");
              if (!handsfree) setEnabled(false);
              setCycle(value => value + 1);
              return;
            }
            setDraft(text);
            // Close the microphone and abort queued ASR before dispatching exactly one command.
            controller.abort();
            captureRef.current = undefined;
            setCollecting(false);
            setEndingPending(false);
            setTranscribing(false);
            if (!handsfree) setEnabled(false);
            setReady(false);
            setSubmitting(true);
            setNotice("指令已提交。");
            void commandRef.current(text).catch((error: Error) => {
              setNotice(error.message || "指令提交失败，请重试。");
            }).finally(() => {
              setSubmitting(false);
              // Start a fresh round even when a fast reply batches both submitting updates.
              // A reply failure ends this round, not the user's hands-free listening session.
              setCycle(value => value + 1);
            });
          }
        });
        if (!controller.signal.aborted) {
          captureRef.current = capture;
          setReady(true);
          setNotice(previous => previous || (handsfree ? "本地模型已就绪，等待“小麦老师”。" : "已开始录音，请说出指令。"));
        }
      } catch (error) { fail(error as Error); }
    };
    // Do not capture the tail of the avatar's loudspeaker audio when listening resumes.
    const timer = window.setTimeout(() => void begin(), handsfree && needsEchoDelay.current ? 1200 : 0);
    needsEchoDelay.current = false;
    return () => { window.clearTimeout(timer); controller.abort(); captureRef.current = undefined; };
  }, [enabled, blocked, cycle, mode, keywordModel]);

  // A manual round interrupted by classroom state must never restart by itself.
  useEffect(() => { if (!handsfree && blocked) close(); }, [handsfree, blocked]);

  if (!handsfree) return (
    <section className="hands-free-control" aria-label="按键输入">
      <button type="button" className={`hold-to-talk ${collecting ? "hold-to-talk--recording" : ""}`}
        aria-label={collecting ? "结束并发送" : "开始录音"}
        disabled={blocked || (enabled && !collecting)}
        onClick={() => {
          if (collecting) captureRef.current?.finish();
          else { setNotice(""); setEnabled(true); }
        }}>
        <Mic size={23} />
        <strong>{submitting ? "正在发送" : transcribing ? "正在识别本轮指令" : collecting ? `结束并发送 · 00:${String(elapsed).padStart(2, "0")}` : enabled ? "正在开启麦克风…" : "开始录音"}</strong>
      </button>
      {enabled && <button type="button" aria-label="取消本轮" onClick={() => { close(); setNotice("本轮已取消。"); }}><X size={16} /><span>取消本轮</span></button>}
      <p>按一次开始，再按一次结束并发送。60秒未结束会取消本轮。</p>
      {assistantBusy && <p role="status">助手回答中，收音暂停</p>}
      {notice && <p className="hands-free-control__notice" role="status">{notice}</p>}
      {!configured && <p>服务器尚未配置语音识别，请使用文字输入。</p>}
    </section>
  );

  const status = !enabled ? "监听已关闭" : blocked ? "助手回答中，收音暂停" : !ready ? (modelReady ? "正在恢复收音…" : "正在加载本地唤醒模型…") : transcribing ? "正在识别本轮指令" : endingPending ? "正在确认是否说完" : collecting ? "正在接收指令" : "等待唤醒";
  return (
    <section className="hands-free-control" aria-label="助教语音唤醒">
      <label className="hands-free-control__model">
        <span>唤醒模型</span>
        <select aria-label="唤醒模型" value={keywordModel} disabled={enabled || submitting || disabled}
          onChange={event => {
            const model = event.target.value as LocalKeywordModel;
            setKeywordModel(model); saveKeywordModel(model); setNotice("");
          }}>
          {Object.entries(localKeywordModels).map(([id, model]) => <option key={id} value={id}>{model.label}</option>)}
        </select>
        <small>{enabled ? "关闭监听后可切换模型。" : localKeywordModels[keywordModel].description}</small>
      </label>
      <div className="hands-free-control__status" role="status">
        {enabled && ready ? <Mic size={15} /> : <MicOff size={15} />}
        <strong>{status}</strong>
      </div>
      <button type="button" aria-label={enabled ? "关闭语音唤醒" : "开启语音唤醒"} aria-pressed={enabled} disabled={!enabled && (disabled || !configured)} onClick={() => {
        if (enabled) { close(); setNotice("麦克风已关闭，本轮未提交内容已清除。"); }
        else { setNotice(""); setEnabled(true); }
      }}>{enabled ? <Mic size={18} /> : <MicOff size={18} />}<span>{enabled ? "关闭语音唤醒" : "开启语音唤醒"}</span></button>
      <p>说“<b>小麦老师</b>”开始，说“<b>非常感谢</b>”发送。</p>
      <p>也可以说“<b>谢谢</b>”后停顿约1秒；确认说完前继续说话，就继续收音。</p>
      <p>保留“你好助手”“你好小助手”“助教你好”“澜舟你好”唤醒，以及“谢谢助教／谢谢澜舟”发送。</p>
      <p>说“助教取消”放弃本轮。录音期间再次称呼“小麦老师”不会重新唤醒。</p>
      <p>开启后，切换窗口仍保持监听；可随时点击“关闭语音唤醒”。</p>
      {collecting && <p className="hands-free-control__draft" aria-label="待发送指令">{draft || "请说出你的问题或操作指令…"}</p>}
      {notice && <p className="hands-free-control__notice" role="status">{notice}</p>}
      {!configured && <p>服务器尚未配置语音识别，请使用文字输入。</p>}
      <small>唤醒、结束、取消均在本机检测。待机不持续上传；说结束词后，仅本轮录音（含短暂唤醒上下文）送去识别。60秒未结束会取消本轮。</small>
    </section>
  );
}
