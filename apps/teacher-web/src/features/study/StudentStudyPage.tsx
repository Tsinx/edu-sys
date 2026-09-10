import {
  getPortManagementGlobalSlideIndex,
  getPortManagementLessonSlidePosition,
  getPortManagementReadyLessons,
  getPortManagementSlide,
  PORT_MANAGEMENT_LESSONS,
  PORT_MANAGEMENT_SLIDE_TOTAL
} from "@edu/course-content";
import type {
  AvatarCuePack,
  AvatarCueState,
  StudyAsrInput,
  StudySession
} from "@edu/contracts";
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Volume2,
  VolumeX
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { SlideStage } from "../classroom/TeachingSlides";
import "../classroom/classroom.css";
import { LanzhouAvatarPlayer } from "./LanzhouAvatarPlayer";
import { useAvatarRenderer } from "../avatar/avatar-preference";
import { AvatarSelector } from "../avatar/AvatarSelector";
import { SpeechMeter } from "../avatar/SpeechMeter";
const Live2DPlayer = lazy(() => import("../avatar/Live2DAvatarPlayer").then(module => ({ default: module.Live2DAvatarPlayer })));
import { StudyComposer } from "./StudyComposer";
import {
  buildStudySlideFrame,
  decodePcm16Base64,
  studySlidePosition
} from "./study-utils";
import "./study.css";

interface ConversationItem {
  id: string;
  role: "student" | "assistant";
  text: string;
  pending?: boolean;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StudentStudyPage() {
  const avatarRenderer = useAvatarRenderer();
  const speechMeter = useRef(new SpeechMeter());
  const { courseId = "" } = useParams();
  const [session, setSession] = useState<StudySession>();
  const [cuePack, setCuePack] = useState<AvatarCuePack>();
  const [avatarState, setAvatarState] = useState<AvatarCueState>("idle");
  const [subtitle, setSubtitle] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "你好，我是小麦老师。你可以针对当前页提问，也可以让我带你跳到某一讲或某一页。"
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [turnBusy, setTurnBusy] = useState(false);
  const [error, setError] = useState("");
  const [speechNotice, setSpeechNotice] = useState("准确字幕为准");
  const [pageInput, setPageInput] = useState("1");

  const activeTurnRef = useRef<AbortController | undefined>(undefined);
  const runSequenceRef = useRef(0);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextAudioStartRef = useRef(0);
  const streamCompletedRef = useRef(false);
  const affirmTimerRef = useRef<number | undefined>(undefined);

  const returnToIdle = useCallback(() => {
    if (affirmTimerRef.current !== undefined) window.clearTimeout(affirmTimerRef.current);
    setAvatarState("affirming");
    affirmTimerRef.current = window.setTimeout(() => setAvatarState("idle"), 850);
  }, []);

  const stopAudio = useCallback(() => {
    speechMeter.current.reset();
    for (const source of audioSourcesRef.current) {
      try { source.stop(); } catch { /* The source may already have ended. */ }
    }
    audioSourcesRef.current.clear();
    if (audioContextRef.current) nextAudioStartRef.current = audioContextRef.current.currentTime;
    streamCompletedRef.current = false;
  }, []);

  const primeAudio = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24_000 });
    void audioContextRef.current.resume().catch(() => undefined);
    return audioContextRef.current;
  }, []);

  const enqueueSpeech = useCallback((audioBase64: string, sampleRate: number) => {
    const context = primeAudio();
    const samples = decodePcm16Base64(audioBase64);
    if (samples.length === 0) return;
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    speechMeter.current.connect(source);
    const startAt = Math.max(context.currentTime + 0.025, nextAudioStartRef.current);
    nextAudioStartRef.current = startAt + buffer.duration;
    audioSourcesRef.current.add(source);
    source.onended = () => {
      audioSourcesRef.current.delete(source);
      if (audioSourcesRef.current.size === 0 && streamCompletedRef.current) returnToIdle();
    };
    source.start(startAt);
  }, [primeAudio, returnToIdle]);

  const interruptCurrentTurn = useCallback(() => {
    activeTurnRef.current?.abort();
    activeTurnRef.current = undefined;
    runSequenceRef.current += 1;
    stopAudio();
    setTurnBusy(false);
    setConversations((items) => items.map((item) =>
      item.pending
        ? { ...item, text: item.text || "上一轮回答已中断。", pending: false }
        : item
    ));
  }, [stopAudio]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        try {
          await api.getIdentitySession();
        } catch {
          await api.createDevelopmentIdentitySession("student");
        }
        const nextSession = await api.createStudySession({ courseId });
        const nextCuePack = nextSession.presentation.manifestUrl
          ? await api.getAvatarCuePack(nextSession.presentation.manifestUrl)
          : undefined;
        if (!active) return;
        setSession(nextSession);
        setCuePack(nextCuePack);
        setSubtitle("准备好后，从当前页开始提问吧。");
      } catch (reason) {
        if (active) setError((reason as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => {
    if (!session) return;
    const position = studySlidePosition(session);
    if (position) setPageInput(String(position.localIndex));
  }, [session]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [conversations]);

  useEffect(() => () => {
    activeTurnRef.current?.abort();
    stopAudio();
    if (affirmTimerRef.current !== undefined) window.clearTimeout(affirmTimerRef.current);
    void audioContextRef.current?.close();
  }, [stopAudio]);

  async function goToGlobalIndex(globalIndex: number) {
    if (!session || navigationBusy || globalIndex < 1 || globalIndex > PORT_MANAGEMENT_SLIDE_TOTAL) return;
    if (globalIndex === session.globalIndex) return;
    setNavigationBusy(true);
    setError("");
    try {
      const slide = getPortManagementSlide(globalIndex);
      const updated = await api.updateStudyProgress(session.id, {
        deckVersion: session.deckVersion,
        slideKey: slide.slideKey,
        globalIndex
      });
      setSession(updated);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setNavigationBusy(false);
    }
  }

  async function submitPageInput() {
    if (!session) return;
    const position = studySlidePosition(session);
    const value = Number(pageInput);
    if (!position || !/^\d+$/u.test(pageInput.trim()) || !Number.isInteger(value) || value < 1 || value > position.localTotal) {
      setError(`请输入当前讲1—${position?.localTotal ?? 1}之间的整数页码。`);
      setPageInput(String(position?.localIndex ?? 1));
      return;
    }
    const target = getPortManagementGlobalSlideIndex(position.lessonNumber, value);
    if (target !== null) await goToGlobalIndex(target);
  }

  async function runAssistantTurn(text: string, source: "text" | "voice_asr") {
    if (!session) return;
    interruptCurrentTurn();
    primeAudio();
    const runSequence = runSequenceRef.current;
    const controller = new AbortController();
    activeTurnRef.current = controller;
    streamCompletedRef.current = false;
    const assistantItemId = createLocalId("assistant");
    setConversations((items) => [
      ...items,
      { id: createLocalId("student"), role: "student", text },
      { id: assistantItemId, role: "assistant", text: "", pending: true }
    ]);
    setSubtitle("我正在结合当前课件整理回答……");
    setAvatarState("thinking");
    setTurnBusy(true);
    setError("");
    let finished = false;

    try {
      await api.streamStudyAssistantTurn(
        session.id,
        { text, source, commandId: createLocalId("study-turn") },
        (event) => {
          if (runSequence !== runSequenceRef.current) return;
          if (event.type === "dialogue.delta") {
            setSubtitle(event.accumulated);
            setConversations((items) => items.map((item) =>
              item.id === assistantItemId
                ? { ...item, text: event.accumulated, pending: true }
                : item
            ));
          } else if (event.type === "speech.chunk") {
            setAvatarState("speaking");
            setSpeechNotice("24 kHz语音播放中");
            enqueueSpeech(event.audioBase64, event.sampleRate);
          } else if (event.type === "navigation.command") {
            setSession(event.result.session);
          } else if (event.type === "turn.completed") {
            finished = true;
            streamCompletedRef.current = true;
            setSubtitle(event.dialogue);
            setConversations((items) => items.map((item) =>
              item.id === assistantItemId
                ? { ...item, text: event.dialogue, pending: false }
                : item
            ));
            if (event.navigation) setSession(event.navigation.session);
            if (event.speechStatus === "unavailable") {
              setSpeechNotice("TTS未配置或暂不可用，已保留完整字幕");
              returnToIdle();
            } else if (event.speechStatus === "disabled") {
              setSpeechNotice("本轮仅显示字幕");
              returnToIdle();
            } else if (audioSourcesRef.current.size === 0) {
              returnToIdle();
            }
          } else if (event.type === "turn.failed") {
            finished = true;
            setAvatarState("idle");
            setError(event.message);
            setConversations((items) => items.map((item) =>
              item.id === assistantItemId
                ? { ...item, text: event.message, pending: false }
                : item
            ));
          }
        },
        controller.signal
      );
    } catch (reason) {
      if ((reason as DOMException).name !== "AbortError" && runSequence === runSequenceRef.current) {
        const message = (reason as Error).message;
        setError(message);
        setConversations((items) => items.map((item) =>
          item.id === assistantItemId ? { ...item, text: message, pending: false } : item
        ));
      }
    } finally {
      if (runSequence === runSequenceRef.current) {
        activeTurnRef.current = undefined;
        setTurnBusy(false);
        if (!finished) setAvatarState("idle");
      }
    }
  }

  async function handleVoice(input: StudyAsrInput) {
    if (!session) return;
    setAvatarState("thinking");
    setSubtitle("正在识别你的问题……");
    setError("");
    try {
      const result = await api.transcribeStudyAudio(session.id, input);
      await runAssistantTurn(result.text, "voice_asr");
    } catch (reason) {
      setAvatarState("idle");
      setSubtitle("语音识别暂不可用，请改用文字提问。");
      throw reason;
    }
  }

  if (loading) {
    return <main className="study-loading"><LoaderCircle className="spin" size={30} /><p>正在恢复学习进度</p></main>;
  }
  if (!session) {
    return (
      <main className="study-loading study-loading--error">
        <CircleAlert size={34} /><h1>无法进入课下学习</h1><p>{error}</p>
        <Link to="/courses"><ArrowLeft size={16} /> 返回课程列表</Link>
      </main>
    );
  }

  const frame = buildStudySlideFrame(session);
  const position = getPortManagementLessonSlidePosition(session.globalIndex)!;
  const readyLessons = getPortManagementReadyLessons();

  return (
    <main className="study-page">
      <header className="study-header">
        <div className="study-header__course">
          <BookOpenCheck size={24} />
          <div><strong>{session.courseTitle}</strong><span>课下自主学习</span></div>
        </div>
        <div className="study-header__meta">
          <span><LockKeyhole size={14} /> 学习进度独立保存</span>
          <span>{session.mode === "teacher_preview" ? "教师预览" : session.actorDisplayName}</span>
          <Link to={session.mode === "teacher_preview" ? `/courses/${session.courseId}` : "/"}>
            <ArrowLeft size={15} /> 退出学习
          </Link>
        </div>
      </header>

      <div className="study-layout">
        <section className="study-deck" aria-label="课程Slides">
          <div className="study-deck__toolbar">
            <label>
              <span className="sr-only">选择课次</span>
              <select
                value={position.lessonNumber}
                disabled={navigationBusy || turnBusy}
                onChange={(event) => {
                  const lesson = readyLessons.find((item) => item.number === Number(event.target.value));
                  if (lesson?.slideStart) void goToGlobalIndex(lesson.slideStart);
                }}
              >
                {PORT_MANAGEMENT_LESSONS.map((lesson) => (
                  <option key={lesson.number} value={lesson.number} disabled={lesson.status !== "ready"}>
                    {lesson.status === "ready"
                      ? `第${lesson.number}讲 · ${lesson.title}`
                      : `第${lesson.number}讲 · 待建设`}
                  </option>
                ))}
              </select>
            </label>
            <span>{frame.section}</span>
            <small>{session.deckVersion}</small>
          </div>

          <div className="study-deck__stage"><SlideStage frame={frame} /></div>

          <nav className="study-deck__navigation" aria-label="Slides翻页">
            <button disabled={navigationBusy || session.globalIndex <= 1} onClick={() => void goToGlobalIndex(session.globalIndex - 1)}>
              <ChevronLeft size={18} /> 上一页
            </button>
            <div className="study-page-jump">
              <span>第{position.lessonNumber}讲</span>
              <label>
                <span className="sr-only">当前讲页码</span>
                <input
                  inputMode="numeric"
                  value={pageInput}
                  disabled={navigationBusy}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={() => void submitPageInput()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitPageInput();
                    if (event.key === "Escape") setPageInput(String(position.localIndex));
                  }}
                />
              </label>
              <strong>/ {position.localTotal}</strong>
            </div>
            <button disabled={navigationBusy || session.globalIndex >= session.slideTotal} onClick={() => void goToGlobalIndex(session.globalIndex + 1)}>
              下一页 <ChevronRight size={18} />
            </button>
          </nav>
        </section>

        <aside className="study-assistant">
          <div className="study-avatar-panel">
          <AvatarSelector onBeforeChange={() => { interruptCurrentTurn(); setAvatarState("idle"); }}/>
          {avatarRenderer === "live2d" ? <Suspense fallback={<p>正在加载数字人…</p>}><Live2DPlayer state={avatarState} subtitle={subtitle} readMouth={speechMeter.current.read}
            fallback={<LanzhouAvatarPlayer cuePack={cuePack} state={avatarState} subtitle={subtitle}/>}/></Suspense> : <LanzhouAvatarPlayer
            cuePack={cuePack}
            state={avatarState}
            subtitle={subtitle}
            onOneShotEnded={() => setAvatarState("idle")}
          />}
          </div>
          <div className="study-speech-status">
            {speechNotice.includes("播放") ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {speechNotice}
          </div>
          <section className="study-conversation" aria-label="最近对话">
            <div className="study-conversation__title"><strong>最近对话</strong><span>保留最近6轮上下文</span></div>
            <div className="study-conversation__scroll">
              {conversations.slice(-12).map((item) => (
                <article className={`study-message study-message--${item.role}`} key={item.id}>
                  <span>{item.role === "assistant" ? "小麦老师" : "我"}</span>
                  <p>{item.text || (item.pending ? "正在回答……" : "")}</p>
                </article>
              ))}
              <div ref={conversationEndRef} />
            </div>
          </section>
          {error && <p className="study-inline-error"><CircleAlert size={15} /> {error}</p>}
          <StudyComposer
            disabled={navigationBusy}
            onSendText={(text) => runAssistantTurn(text, "text")}
            onSendVoice={handleVoice}
            onUserGesture={primeAudio}
            onRecordingChange={(recording, outcome) => {
              if (recording) {
                interruptCurrentTurn();
                setAvatarState("listening");
                setSubtitle("我在听，请松开发送；上滑可以取消。 ");
              } else if (!turnBusy && outcome === "cancelled") {
                setAvatarState("idle");
                setSubtitle("本次录音已取消，可以重新按住说话或改用文字输入。");
              } else if (!turnBusy) {
                setAvatarState("thinking");
                setSubtitle("正在识别你的问题……");
              }
            }}
          />
          <p className="study-privacy">麦克风只在按住时启用，原始录音不保存。</p>
        </aside>
      </div>
    </main>
  );
}
