import type {
  ClassroomActivity,
  ClassroomEventInput,
  ClassroomSnapshot,
  LamRuntimeStatus,
  TeacherAvatarCommandInput
} from "@edu/contracts";
import {
  getPortManagementGlobeCue,
  getPortManagementGlobalSlideIndex,
  getPortManagementLessonSlidePosition,
  getPortManagementSlideByKey,
  PORT_MANAGEMENT_LESSONS,
  type PortManagementGlobeCueStep
} from "@edu/course-content";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FlaskConical,
  Globe2,
  Highlighter,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Mic,
  MonitorPlay,
  MousePointer2,
  Presentation,
  Play,
  Pause,
  Radio,
  RotateCcw,
  Settings,
  ShipWheel,
  Sparkles,
  Square,
  SkipForward,
  UsersRound,
  UserPlus,
  Video,
  X
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import {
  LamAvatarSurface,
  type LamAvatarController,
  type LamConnectionState
} from "./LamAvatarSurface";
import { ActivityStage, SlideStage } from "./TeachingSlides";
import { VoiceCommandComposer } from "./VoiceCommandComposer";
import "./classroom.css";

const ClassroomGlobeStage = lazy(() =>
  import("./ClassroomGlobeStage").then((module) => ({
    default: module.ClassroomGlobeStage
  }))
);

const OPENING_GLOBE_CUE_ID = "l1-opening-trade-influence";
const OPENING_GLOBE_CUE = getPortManagementGlobeCue(OPENING_GLOBE_CUE_ID);

const activityTabs: Array<{
  id: ClassroomActivity;
  label: string;
  icon: typeof Presentation;
}> = [
  { id: "slides", label: "Slides", icon: Presentation },
  { id: "globe", label: "地球仪", icon: Globe2 },
  { id: "simulation", label: "模拟实验", icon: FlaskConical },
  { id: "whiteboard", label: "白板", icon: Highlighter },
  { id: "video", label: "视频", icon: Video },
  { id: "interaction", label: "互动", icon: MessageSquareText }
];

function formatElapsed(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000)
  );
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function activityLabel(activity: ClassroomActivity) {
  return activityTabs.find((tab) => tab.id === activity)?.label ?? activity;
}

const lamConnectionLabels: Record<LamConnectionState, string> = {
  offline: "服务离线",
  warming: "服务预热中",
  loading: "装载 Barbara",
  connecting: "建立会话",
  ready: "待命中",
  listening: "收音中",
  thinking: "思考中",
  speaking: "讲解中",
  error: "会话异常"
};

function isLamConnected(state: LamConnectionState) {
  return ["ready", "listening", "thinking", "speaking"].includes(state);
}

export function ClassroomSubsystem() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [slidePageDraft, setSlidePageDraft] = useState("");
  const [lamRuntime, setLamRuntime] = useState<LamRuntimeStatus>();
  const [lamConnection, setLamConnection] =
    useState<LamConnectionState>("loading");
  const [lamTranscript, setLamTranscript] = useState("");
  const [assistantPhase, setAssistantPhase] = useState<
    "idle" | "thinking" | "streaming"
  >("idle");
  const [avatarCollapsed, setAvatarCollapsed] = useState(() =>
    window.matchMedia("(max-width: 980px)").matches
  );
  const [pointerActive, setPointerActive] = useState(false);
  const [annotationActive, setAnnotationActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const stageFrameRef = useRef<HTMLDivElement>(null);
  const skipNextSlideInputBlurRef = useRef(false);
  const lamAvatarRef = useRef<LamAvatarController>(null);
  const assistantAbortRef = useRef<AbortController | undefined>(
    undefined
  );
  const pendingVoiceCommandIdRef = useRef<string | undefined>(
    undefined
  );
  const lastAsrResultRef = useRef<
    { text: string; at: number } | undefined
  >(undefined);
  const lastReportedLamConnectedRef = useRef<boolean | undefined>(
    undefined
  );

  const refreshLamRuntime = useCallback(async () => {
    try {
      const runtime = await api.getLamRuntimeStatus();
      setLamRuntime(runtime);
    } catch (reason) {
      setLamRuntime({
        service: "openavatarchat",
        renderer: "lam",
        avatar: "barbara",
        status: "offline",
        version: null,
        uiUrl: null,
        assetUrl: null,
        websocketUrl: null,
        checkedAt: new Date().toISOString(),
        message: (reason as Error).message
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api
      .getClassroomSnapshot(sessionId)
      .then((result) => {
        if (active) {
          setSnapshot(result);
          setError("");
        }
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(
    () =>
      api.subscribeClassroomSnapshot(
        sessionId,
        (nextSnapshot) => {
          setSnapshot((current) =>
            !current ||
            nextSnapshot.runtimeVersion >= current.runtimeVersion
              ? nextSnapshot
              : current
          );
        }
      ),
    [sessionId]
  );

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await refreshLamRuntime();
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshLamRuntime]);

  useEffect(() => {
    if (
      snapshot?.session.status !== "live" ||
      ["loading", "warming", "connecting"].includes(lamConnection)
    ) {
      return;
    }
    const connected = isLamConnected(lamConnection);
    if (lastReportedLamConnectedRef.current === connected) return;
    lastReportedLamConnectedRef.current = connected;
    void api
      .sendClassroomEvent(sessionId, {
        type: "set_lam_connection",
        connected
      })
      .then(setSnapshot)
      .catch(() => {
        lastReportedLamConnectedRef.current = undefined;
      });
  }, [lamConnection, sessionId, snapshot?.session.status]);

  useEffect(() => {
    if (snapshot?.session.status !== "live") return;
    let active = true;
    const refresh = async () => {
      try {
        const nextSnapshot = await api.getClassroomSnapshot(sessionId);
        if (active) setSnapshot(nextSnapshot);
      } catch {
        // A transient presence refresh must not interrupt the teacher's class.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sessionId, snapshot?.session.status]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      assistantAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 980px)");
    const collapseForCompactViewport = (event: MediaQueryListEvent) => {
      if (event.matches) setAvatarCollapsed(true);
    };
    compactViewport.addEventListener("change", collapseForCompactViewport);
    return () =>
      compactViewport.removeEventListener("change", collapseForCompactViewport);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!snapshot) return;
    const position = getPortManagementLessonSlidePosition(
      snapshot.slide.index
    );
    if (position) {
      setSlidePageDraft(String(position.localIndex));
    }
  }, [snapshot?.slide.index]);

  const elapsed = useMemo(
    () => (snapshot ? formatElapsed(snapshot.session.startsAt, now) : "00:00:00"),
    [now, snapshot]
  );

  async function sendEvent(input: ClassroomEventInput): Promise<boolean> {
    if (!snapshot || busy) return false;
    setBusy(true);
    setError("");
    try {
      const nextSnapshot = await api.sendClassroomEvent(snapshot.session.id, input);
      setSnapshot(nextSnapshot);
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const narrateGlobeStep = useCallback(
    (step: PortManagementGlobeCueStep, narrationId: string) => {
      setLamTranscript(step.narration);
      const controller = lamAvatarRef.current;
      if (
        !controller?.isConnected() ||
        !controller.pushDialogueDelta(
          narrationId,
          step.narration
        ) ||
        !controller.finishDialogue(narrationId)
      ) {
        setNotice("LAM 未连接；证据追踪继续播放并显示完整字幕。");
      }
    },
    []
  );

  const runAssistantTurn = useCallback(
    async (
      text: string,
      source: "text" | "voice_asr",
      commandId?: string
    ) => {
      assistantAbortRef.current?.abort();
      if (assistantAbortRef.current) {
        lamAvatarRef.current?.interrupt();
      }

      const controller = new AbortController();
      assistantAbortRef.current = controller;
      setLamTranscript("");
      setAssistantPhase("thinking");
      setError("");

      let failedMessage = "";
      let lamDeliveryAvailable = true;
      let controlApplied = false;

      try {
        await api.streamAssistantTurn(
          sessionId,
          { text, source, commandId },
          (event) => {
            if (event.type === "dialogue.delta") {
              setAssistantPhase("streaming");
              setLamTranscript(event.accumulated);
              if (
                !lamAvatarRef.current?.pushDialogueDelta(
                  event.turnId,
                  event.delta
                )
              ) {
                lamDeliveryAvailable = false;
              }
              return;
            }

            if (event.type === "control.result") {
              controlApplied = true;
              setSnapshot(event.result.snapshot);
              const summary = event.result.results
                .map((item) => item.message)
                .join("；");
              setNotice(
                event.result.duplicate
                  ? `课堂动作已去重：${summary}`
                  : `课堂动作已执行：${summary}`
              );
              return;
            }

            if (event.type === "turn.completed") {
              setLamTranscript(event.dialogue);
              if (
                !lamAvatarRef.current?.finishDialogue(event.turnId)
              ) {
                lamDeliveryAvailable = false;
              }
              setAssistantPhase("idle");
              if (!controlApplied) {
                setNotice(
                  lamDeliveryAvailable
                    ? "课堂助手回答已进入 TTS/LAM 播放队列。"
                    : "课堂助手回答已生成；LAM 未连接，当前仅显示字幕。"
                );
              }
              return;
            }

            if (event.type === "turn.failed") {
              lamAvatarRef.current?.interrupt();
              setAssistantPhase("idle");
              if (event.code !== "TURN_ABORTED") {
                failedMessage = event.message;
              }
            }
          },
          controller.signal
        );

        if (failedMessage) {
          throw new Error(failedMessage);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        setAssistantPhase("idle");
        setError((reason as Error).message);
        throw reason;
      } finally {
        if (assistantAbortRef.current === controller) {
          assistantAbortRef.current = undefined;
        }
      }
    },
    [sessionId]
  );

  async function sendTeacherCommand(input: TeacherAvatarCommandInput) {
    if (!snapshot) return;
    const response = await api.sendAvatarCommand(
      snapshot.session.id,
      input
    );
    setSnapshot((current) =>
      current
        ? {
            ...current,
            avatar: response.avatar,
            runtimeVersion: current.runtimeVersion + 1
          }
        : current
    );

    if (input.inputMode === "text") {
      setNotice("教师文字已进入平台课堂助手。");
      await runAssistantTurn(input.text, "text", response.id);
      return;
    }

    pendingVoiceCommandIdRef.current = response.id;
    setLamTranscript("");
    const delivered =
      (await lamAvatarRef.current?.sendVoice(input)) ?? false;
    if (!delivered) {
      pendingVoiceCommandIdRef.current = undefined;
      throw new Error("LAM 尚未连接，语音无法送入 ASR");
    }
    setNotice("语音已送入 OpenAvatarChat ASR，等待识别结果。");
  }

  const handleHumanTranscript = useCallback(
    (text: string) => {
      const normalized = text.trim();
      if (!normalized) return;
      const now = Date.now();
      if (
        lastAsrResultRef.current?.text === normalized &&
        now - lastAsrResultRef.current.at < 2_000
      ) {
        return;
      }
      lastAsrResultRef.current = { text: normalized, at: now };
      const commandId = pendingVoiceCommandIdRef.current;
      pendingVoiceCommandIdRef.current = undefined;
      setNotice(`ASR 已识别：“${normalized}”`);
      void runAssistantTurn(
        normalized,
        "voice_asr",
        commandId
      ).catch((reason: Error) => {
        setError(reason.message);
      });
    },
    [runAssistantTurn]
  );

  function interruptAssistant() {
    assistantAbortRef.current?.abort();
    assistantAbortRef.current = undefined;
    lamAvatarRef.current?.interrupt();
    setAssistantPhase("idle");
    setNotice("已中断本轮课堂助手回答。");
  }

  async function copyInviteLink() {
    try {
      const inviteUrl = new URL(
        `/join/${snapshot?.session.id ?? sessionId}`,
        window.location.origin
      ).toString();
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("学生课堂链接已复制；学生打开后才会计入在线人数。");
    } catch {
      setError("浏览器未允许复制，请从地址栏手动复制课堂链接。");
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageFrameRef.current?.requestFullscreen();
      }
    } catch {
      setError("当前浏览器未允许全屏显示。");
    }
  }

  async function endClass() {
    if (!snapshot) return;
    setBusy(true);
    setError("");
    try {
      await api.endClass(snapshot.session.id);
      navigate(`/courses/${snapshot.courseId}`);
    } catch (reason) {
      setError((reason as Error).message);
      setEndDialogOpen(false);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="classroom-subsystem classroom-subsystem--centered">
        <LoaderCircle className="spin" size={32} />
        <p>正在装载课堂运行时</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="classroom-subsystem classroom-subsystem--centered">
        <CircleAlert size={34} />
        <h1>无法进入课堂</h1>
        <p>{error || "没有找到课堂快照"}</p>
        <Link className="classroom-secondary-button" to="/classrooms">
          <ArrowLeft size={17} /> 返回课堂列表
        </Link>
      </main>
    );
  }

  const isLive = snapshot.session.status === "live";
  const isSlides = snapshot.activeActivity === "slides";
  const isGlobe = snapshot.activeActivity === "globe";
  const isOpeningLaunchSlide =
    isSlides && snapshot.slide.slideId === OPENING_GLOBE_CUE?.startSlideKey;
  const lamConnected = isLamConnected(lamConnection);
  const openingReturnSlide =
    OPENING_GLOBE_CUE
      ? getPortManagementSlideByKey(OPENING_GLOBE_CUE.returnSlideKey)
      : undefined;
  const slidePosition = getPortManagementLessonSlidePosition(
    snapshot.slide.index
  )!;

  async function commitSlidePageInput() {
    if (!snapshot) return;
    const restoreCurrentValue = () =>
      setSlidePageDraft(String(slidePosition.localIndex));
    const rawValue = slidePageDraft.trim();

    if (!isSlides || busy) {
      restoreCurrentValue();
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      restoreCurrentValue();
      setError(
        `请输入本讲 1—${slidePosition.localTotal} 之间的整数页码。`
      );
      return;
    }

    const localIndex = Number(rawValue);
    const globalIndex = getPortManagementGlobalSlideIndex(
      slidePosition.lessonNumber,
      localIndex
    );
    if (globalIndex === null) {
      restoreCurrentValue();
      setError(
        `请输入本讲 1—${slidePosition.localTotal} 之间的整数页码。`
      );
      return;
    }

    if (globalIndex === snapshot.slide.index) {
      restoreCurrentValue();
      return;
    }

    const succeeded = await sendEvent({
      type: "set_slide",
      index: globalIndex
    });
    if (!succeeded) restoreCurrentValue();
  }

  return (
    <main className="classroom-subsystem">
      <header className="classroom-commandbar">
        <div className="classroom-commandbar__course">
          <Link className="classroom-brand-mark" to="/" aria-label="返回教学中枢">
            <ShipWheel size={23} />
          </Link>
          <div>
            <strong>{snapshot.courseTitle}</strong>
            <span>{snapshot.chapterTitle}</span>
          </div>
        </div>

        <div className="classroom-commandbar__status">
          <span className={isLive ? "class-live-status" : "class-live-status class-live-status--idle"}>
            <i /> {isLive ? "课堂进行中" : "课堂已结束"}
          </span>
          <span><Radio size={17} /> {elapsed}</span>
          <span title="按学生端最近 45 秒的有效心跳统计">
            <UsersRound size={18} />
            {snapshot.participantsOnline > 0
              ? `${snapshot.participantsOnline} 人在线`
              : "暂无学生在线"}
          </span>
        </div>

        <div className="classroom-commandbar__actions">
          <button
            type="button"
            aria-label="邀请学生"
            onClick={() => void copyInviteLink()}
          >
            <UserPlus size={18} /> <span>邀请</span>
          </button>
          <button
            type="button"
            aria-label="课堂设置"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={18} /> <span>设置</span>
          </button>
          <button
            className="end-class-button"
            type="button"
            aria-label="结束课堂"
            disabled={!isLive || busy}
            onClick={() => setEndDialogOpen(true)}
          >
            <Square size={16} /> <span>结束课堂</span>
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div className={error ? "classroom-toast classroom-toast--error" : "classroom-toast"}>
          {error ? <CircleAlert size={17} /> : <Sparkles size={17} />}
          <span>{error || notice}</span>
          <button
            type="button"
            aria-label="关闭提示"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div
        className={[
          "classroom-workspace",
          avatarCollapsed
            ? "classroom-workspace--avatar-collapsed"
            : "",
          isGlobe ? "classroom-workspace--globe" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="teaching-runtime" aria-label="课堂教学主舞台">
          <nav className="classroom-activity-tabs" aria-label="课堂活动">
            {activityTabs.map((tab) => {
              const Icon = tab.icon;
              const active = snapshot.activeActivity === tab.id;
              return (
                <button
                  type="button"
                  className={active ? "classroom-activity-tab classroom-activity-tab--active" : "classroom-activity-tab"}
                  aria-pressed={active}
                  disabled={busy}
                  key={tab.id}
                  onClick={() =>
                    void sendEvent({ type: "set_activity", activity: tab.id })
                  }
                >
                  <Icon size={18} /> {tab.label}
                </button>
              );
            })}
            <span className="runtime-version">课堂状态 v{snapshot.runtimeVersion}</span>
          </nav>

          <div
            ref={stageFrameRef}
            className={`teaching-stage-frame ${pointerActive ? "teaching-stage-frame--pointer" : ""} ${
              annotationActive ? "teaching-stage-frame--annotation" : ""
            }`}
          >
            {isSlides ? (
              <SlideStage frame={snapshot.slide} />
            ) : isGlobe ? (
              <Suspense
                fallback={
                  <div className="classroom-globe-loading">
                    <LoaderCircle className="spin" size={34} />
                    <span>正在按需装载电影化地球仪</span>
                  </div>
                }
              >
                <ClassroomGlobeStage
                  snapshot={snapshot}
                  role="teacher"
                  lamConnected={lamConnected}
                  narrationBusy={
                    lamConnection === "speaking" ||
                    lamConnection === "thinking"
                  }
                  onNarrateStep={narrateGlobeStep}
                  onAdvance={(runId, stepIndex) => {
                    void sendEvent({
                      type: "globe_advance",
                      runId,
                      fromStepIndex: stepIndex
                    });
                  }}
                />
              </Suspense>
            ) : (
              <ActivityStage
                activity={
                  snapshot.activeActivity as Exclude<
                    ClassroomActivity,
                    "slides" | "globe"
                  >
                }
                frame={snapshot.slide}
              />
            )}
            {pointerActive && (
              <div className="teacher-pointer-indicator" aria-hidden="true">
                <MousePointer2 size={22} />
              </div>
            )}
            {annotationActive && (
              <div className="annotation-mode-indicator">
                <Highlighter size={15} /> 批注模式
              </div>
            )}
          </div>

          <footer className="teaching-controlbar">
            {isGlobe ? (
              <div className="globe-movie-controls" aria-label="证据追踪控制">
                <span>
                  <Globe2 size={18} />
                  第一讲 · 证据追踪任务
                </span>
                <div>
                  <button
                    type="button"
                    disabled={busy || snapshot.globePlayback.status !== "playing"}
                    onClick={() => void sendEvent({ type: "globe_pause" })}
                  >
                    <Pause size={17} /> 暂停
                  </button>
                  <button
                    type="button"
                    disabled={busy || snapshot.globePlayback.status !== "paused"}
                    onClick={() => void sendEvent({ type: "globe_resume" })}
                  >
                    <Play size={17} /> 继续
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendEvent({ type: "globe_restart" })}
                  >
                    <RotateCcw size={17} /> 重新播放
                  </button>
                  <button
                    type="button"
                    disabled={busy || !openingReturnSlide}
                    onClick={() => {
                      if (!openingReturnSlide) return;
                      lamAvatarRef.current?.interrupt();
                      void sendEvent({
                        type: "set_slide",
                        index: openingReturnSlide.index
                      });
                    }}
                  >
                    <SkipForward size={17} /> 跳过
                  </button>
                  <button type="button" onClick={() => void toggleFullscreen()}>
                    <Maximize2 size={17} /> 全屏
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="slide-navigation-controls">
              <button
                type="button"
                disabled={!isSlides || busy || snapshot.slide.index <= 1}
                onClick={() => void sendEvent({ type: "previous_slide" })}
              >
                <ChevronLeft size={18} /> <span>上一页</span>
              </button>
              <label className="slide-page-input-control">
                <span>当前页</span>
                <input
                  aria-label={`当前讲页码，1到${slidePosition.localTotal}`}
                  disabled={!isSlides || busy}
                  inputMode="numeric"
                  max={slidePosition.localTotal}
                  min={1}
                  step={1}
                  type="number"
                  value={slidePageDraft}
                  onBlur={() => {
                    if (skipNextSlideInputBlurRef.current) {
                      skipNextSlideInputBlurRef.current = false;
                      return;
                    }
                    void commitSlidePageInput();
                  }}
                  onChange={(event) => {
                    setSlidePageDraft(event.target.value);
                    setError("");
                  }}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitSlidePageInput();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      skipNextSlideInputBlurRef.current = true;
                      setSlidePageDraft(String(slidePosition.localIndex));
                      setError("");
                      event.currentTarget.blur();
                    }
                  }}
                />
                <span aria-hidden="true">/ {slidePosition.localTotal}</span>
              </label>
              <button
                type="button"
                disabled={!isSlides || busy || snapshot.slide.index >= snapshot.slide.total}
                onClick={() => void sendEvent({ type: "next_slide" })}
              >
                <span>下一页</span> <ChevronRight size={18} />
              </button>
              {isOpeningLaunchSlide && (
                <button
                  className="start-opening-button"
                  type="button"
                  disabled={busy || !isLive || !OPENING_GLOBE_CUE}
                  onClick={() =>
                    void sendEvent({
                      type: "globe_play_cue",
                      cueId: OPENING_GLOBE_CUE_ID
                    })
                  }
                >
                  <Play size={17} /> 沿丝绸航线寻找证据
                </button>
              )}
            </div>

            <label className="lesson-select-control">
              <span className="sr-only">选择课次</span>
              <select
                aria-label="选择课次"
                disabled={busy}
                value={snapshot.slide.lessonNumber}
                onChange={(event) => {
                  const selectedLesson = PORT_MANAGEMENT_LESSONS.find(
                    (lesson) => lesson.number === Number(event.target.value)
                  );
                  if (
                    !selectedLesson ||
                    selectedLesson.status !== "ready" ||
                    selectedLesson.slideStart === null ||
                    selectedLesson.number === snapshot.slide.lessonNumber
                  ) {
                    return;
                  }
                  void sendEvent({
                    type: "set_slide",
                    index: selectedLesson.slideStart
                  });
                }}
              >
                {PORT_MANAGEMENT_LESSONS.map((lesson) => (
                  <option
                    disabled={lesson.status === "planned"}
                    key={lesson.number}
                    value={lesson.number}
                  >
                    {lesson.status === "ready"
                      ? `${lesson.label} · ${lesson.title}`
                      : `${lesson.label} · 待建设`}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>

            <div className="stage-tool-controls">
              <button
                type="button"
                className={pointerActive ? "stage-tool-button stage-tool-button--active" : "stage-tool-button"}
                aria-pressed={pointerActive}
                onClick={() => setPointerActive((active) => !active)}
              >
                <MousePointer2 size={17} /> <span>指针</span>
              </button>
              <button
                type="button"
                className={annotationActive ? "stage-tool-button stage-tool-button--active" : "stage-tool-button"}
                aria-pressed={annotationActive}
                onClick={() => setAnnotationActive((active) => !active)}
              >
                <Highlighter size={17} /> <span>批注</span>
              </button>
              <button
                type="button"
                className="stage-tool-button"
                onClick={() =>
                  void sendEvent({ type: "set_activity", activity: "interaction" })
                }
              >
                <UsersRound size={17} /> <span>学生互动</span>
              </button>
              <button
                type="button"
                className="stage-tool-button"
                onClick={() => void toggleFullscreen()}
              >
                <Maximize2 size={17} /> <span>全屏</span>
              </button>
            </div>
              </>
            )}
          </footer>
        </section>

        <aside
          className={[
            "classroom-avatar-dock",
            avatarCollapsed ? "classroom-avatar-dock--collapsed" : "",
            isGlobe ? "classroom-avatar-dock--cinematic" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {avatarCollapsed ? (
            <div className="collapsed-avatar-controls">
              <button
                type="button"
                aria-label="展开港航教学助手"
                onClick={() => setAvatarCollapsed(false)}
              >
                <ChevronLeft size={19} />
              </button>
              <span className="collapsed-avatar-mark"><Sparkles size={22} /></span>
              <i className={lamConnected ? "avatar-state-dot" : "avatar-state-dot avatar-state-dot--error"} />
              <button
                type="button"
                aria-label="展开语音输入"
                onClick={() => setAvatarCollapsed(false)}
              >
                <Mic size={19} />
              </button>
            </div>
          ) : (
            <header className="avatar-dock-header">
              <div>
                <strong>港航教学助手</strong>
                <span>
                  <i className={lamConnected ? "" : "avatar-state-dot--error"} />
                  LAM 实时数字人
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAvatarCollapsed(true)}
              >
                收起 <ChevronRight size={16} />
              </button>
            </header>
          )}

          <LamAvatarSurface
            ref={lamAvatarRef}
            runtime={lamRuntime}
            concealed={avatarCollapsed}
            onConnectionStateChange={setLamConnection}
            onHumanTranscript={handleHumanTranscript}
            onRetry={() => void refreshLamRuntime()}
          />

          {!avatarCollapsed && (
            <>
              <section
                className="avatar-subtitle-panel"
                aria-label="数字人回答字幕"
                aria-live="polite"
              >
                <header className="avatar-subtitle-header">
                  <span>
                    <MessageSquareText size={15} />
                    数字人回答
                  </span>
                  <strong>
                    <i className={lamConnected ? "" : "avatar-state-dot--error"} />
                    {assistantPhase === "thinking"
                      ? "模型组织回答"
                      : assistantPhase === "streaming"
                        ? "对白流式生成中"
                        : lamConnectionLabels[lamConnection]}
                  </strong>
                </header>
                <div
                  className={
                    lamTranscript
                      ? "avatar-subtitle-body avatar-subtitle-body--active"
                      : "avatar-subtitle-body avatar-subtitle-body--empty"
                  }
                >
                  <p>
                    {lamTranscript ||
                      (assistantPhase === "thinking"
                        ? "数字人正在组织回答…"
                        : assistantPhase === "streaming"
                          ? "正在实时提取 dialogue 并送往 TTS…"
                          : lamConnection === "speaking"
                          ? "正在接收数字人回答…"
                          : lamConnected
                            ? "等待数字人回答"
                            : "可使用文字助手；LAM 连接后将同步语音和数字人。")}
                  </p>
                </div>
              </section>

              <VoiceCommandComposer
                disabled={!isLive}
                voiceDisabled={!isLive || !lamConnected}
                onSendText={(text) =>
                  sendTeacherCommand({ inputMode: "text", text })
                }
                onSendVoice={(input) => sendTeacherCommand(input)}
              />

              <footer className="avatar-runtime-footer">
                <span>
                  <MonitorPlay size={15} />
                  {lamConnected
                    ? `OpenAvatarChat 已连接${lamRuntime?.version ? ` · ${lamRuntime.version}` : ""}`
                    : lamRuntime?.message ?? "OpenAvatarChat 未连接"}
                </span>
                <button
                  type="button"
                  disabled={
                    assistantPhase === "idle" &&
                    lamConnection !== "thinking" &&
                    lamConnection !== "speaking"
                  }
                  onClick={interruptAssistant}
                >
                  <Square size={13} />
                  中断讲解
                </button>
              </footer>
            </>
          )}
        </aside>
      </div>

      {settingsOpen && (
        <div className="classroom-dialog-backdrop">
          <section className="classroom-dialog" role="dialog" aria-modal="true" aria-labelledby="classroom-settings-title">
            <button
              className="classroom-dialog__close"
              type="button"
              aria-label="关闭课堂设置"
              onClick={() => setSettingsOpen(false)}
            >
              <X size={18} />
            </button>
            <span className="classroom-dialog__icon"><Settings size={23} /></span>
            <h2 id="classroom-settings-title">课堂显示设置</h2>
            <p>Slides 使用固定逻辑画布，设备尺寸只改变统一缩放比例。</p>
            <dl className="display-contract-list">
              <div><dt>逻辑分辨率</dt><dd>1600 × 1000</dd></div>
              <div><dt>固定宽高比</dt><dd>16:10</dd></div>
              <div><dt>适配策略</dt><dd>等比 contain + 黑边</dd></div>
              <div><dt>当前活动</dt><dd>{activityLabel(snapshot.activeActivity)}</dd></div>
            </dl>
            <button
              className="classroom-primary-button"
              type="button"
              onClick={() => setSettingsOpen(false)}
            >
              确认
            </button>
          </section>
        </div>
      )}

      {endDialogOpen && (
        <div className="classroom-dialog-backdrop">
          <section className="classroom-dialog" role="dialog" aria-modal="true" aria-labelledby="end-class-title">
            <button
              className="classroom-dialog__close"
              type="button"
              aria-label="关闭结束课堂确认"
              onClick={() => setEndDialogOpen(false)}
            >
              <X size={18} />
            </button>
            <span className="classroom-dialog__icon classroom-dialog__icon--danger"><Square size={22} /></span>
            <h2 id="end-class-title">结束本次课堂？</h2>
            <p>系统会保存当前活动、页码和课堂事件，并释放实时数字人资源。</p>
            <div className="classroom-dialog__actions">
              <button
                className="classroom-secondary-button"
                type="button"
                onClick={() => setEndDialogOpen(false)}
              >
                继续上课
              </button>
              <button
                className="classroom-danger-button"
                type="button"
                disabled={busy}
                onClick={() => void endClass()}
              >
                {busy ? <LoaderCircle className="spin" size={17} /> : <Square size={15} />}
                确认结束
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
