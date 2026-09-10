import type {
  ClassroomActivity,
  ClassroomEventInput,
  ClassroomSnapshot,
  LamRuntimeStatus,
  SlideInteractionValues
} from "@edu/contracts";
import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";
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
} from "../../campus/BrowserAvatarSurface";
import { runtimeConfig } from "../../campus/runtime";
import { useAvatarRenderer } from "../avatar/avatar-preference";
import { AvatarSelector } from "../avatar/AvatarSelector";
import { ActivityStage, SlideStage } from "./TeachingSlides";
import { VoiceCommandComposer } from "./VoiceCommandComposer";
import { ClassroomFullscreenControls } from "./ClassroomFullscreenControls";
import { ClassroomPlaybackSlot } from "./ClassroomPlaybackSlot";
import { TeacherParticipation } from "./ClassroomParticipation";
import { useClassroomFullscreen } from "./useClassroomFullscreen";
import "./classroom.css";
import "./classroom-fullscreen.css";

const ClassroomGlobeStage = lazy(() =>
  import("./ClassroomGlobeStage").then((module) => ({
    default: module.ClassroomGlobeStage
  }))
);

const ClassroomPortSimulationStage = lazy(() =>
  import("../port-simulation/ClassroomLocalPortSimulationStage").then((module) => ({
    default: module.ClassroomLocalPortSimulationStage
  }))
);

const OPENING_GLOBE_CUE_ID = "l1-opening-trade-influence";
const OPENING_GLOBE_CUE = getPortManagementGlobeCue(OPENING_GLOBE_CUE_ID);
const ECONOMIC_MATHEMATICS_COURSE_ID = "course-economic-mathematics";

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
  const avatarRenderer = useAvatarRenderer();
  const audioBackend = avatarRenderer === "lam" && runtimeConfig.profile !== "campus" ? "lam" : "browser";
  const { sessionId = "" } = useParams();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [courseDeck, setCourseDeck] = useState<CourseDeckDescriptor | null>(null);
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
  const [fullscreenAvatarCollapsed, setFullscreenAvatarCollapsed] = useState(false);
  const [playbackSlot, setPlaybackSlot] = useState<HTMLDivElement | null>(null);
  const [fullscreenPlaybackSlot, setFullscreenPlaybackSlot] = useState<HTMLDivElement | null>(null);
  const [participationOpen, setParticipationOpen] = useState(false);
  const closeParticipation = useCallback(() => setParticipationOpen(false), []);
  const [pointerActive, setPointerActive] = useState(false);
  const [annotationActive, setAnnotationActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const skipNextSlideInputBlurRef = useRef(false);
  const lamAvatarRef = useRef<LamAvatarController>(null);
  const assistantAbortRef = useRef<AbortController | undefined>(
    undefined
  );
  const lastAsrResultRef = useRef<
    { text: string; at: number } | undefined
  >(undefined);
  const lastReportedLamConnectedRef = useRef<string | undefined>(
    undefined
  );
  const snapshotRef = useRef<ClassroomSnapshot | undefined>(undefined);
  const interactionSyncRef = useRef<{
    timer?: number;
    inFlight?: Promise<void>;
    inFlightPatch: SlideInteractionValues;
    resetInFlight?: Promise<void>;
    slideId?: string;
    pending: SlideInteractionValues;
  }>({ inFlightPatch: {}, pending: {} });

  const mergeSnapshot = useCallback((nextSnapshot: ClassroomSnapshot) => {
    if (nextSnapshot.session.id !== sessionIdRef.current) {
      return snapshotRef.current;
    }
    const current = snapshotRef.current;
    if (
      current?.session.id === nextSnapshot.session.id &&
      nextSnapshot.runtimeVersion < current.runtimeVersion
    ) {
      return current;
    }

    const queue = interactionSyncRef.current;
    const optimisticPatch = {
      ...queue.inFlightPatch,
      ...queue.pending
    };
    const mergedSnapshot =
      current?.session.id === nextSnapshot.session.id &&
      nextSnapshot.slideInteraction &&
      queue.slideId === nextSnapshot.slide.slideId &&
      nextSnapshot.slideInteraction.slideId === nextSnapshot.slide.slideId &&
      Object.keys(optimisticPatch).length > 0
        ? {
            ...nextSnapshot,
            slideInteraction: {
              ...nextSnapshot.slideInteraction,
              values: {
                ...nextSnapshot.slideInteraction.values,
                ...optimisticPatch
              }
            }
          }
        : nextSnapshot;

    snapshotRef.current = mergedSnapshot;
    setSnapshot((existing) =>
      existing?.session.id === mergedSnapshot.session.id &&
      mergedSnapshot.runtimeVersion < existing.runtimeVersion
        ? existing
        : mergedSnapshot
    );
    return mergedSnapshot;
  }, []);

  useEffect(() => {
    snapshotRef.current = undefined;
    setSnapshot(undefined);
    setCourseDeck(null);
  }, [sessionId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let active = true;
    if (snapshot?.courseId !== ECONOMIC_MATHEMATICS_COURSE_ID) {
      setCourseDeck(null);
      return () => {
        active = false;
      };
    }
    void import("@edu/course-content/deck-registry")
      .then((module) => {
        if (active) {
          setCourseDeck(module.getCourseDeckByCourseId(snapshot.courseId) ?? null);
        }
      })
      .catch((reason: Error) => {
        if (active) setError(`经济数学课件注册表装载失败：${reason.message}`);
      });
    return () => {
      active = false;
    };
  }, [snapshot?.courseId]);

  useEffect(() => {
    const queue = interactionSyncRef.current;
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    queue.timer = undefined;
    queue.inFlightPatch = {};
    queue.pending = {};
    queue.slideId = snapshot?.slide.slideId;
  }, [sessionId, snapshot?.slide.slideId]);

  useEffect(
    () => () => {
      const queue = interactionSyncRef.current;
      if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    },
    []
  );

  const refreshLamRuntime = useCallback(async () => {
    if (audioBackend !== "lam") return;
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
  }, [audioBackend]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api
      .getClassroomSnapshot(sessionId)
      .then((result) => {
        if (active) {
          mergeSnapshot(result);
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
  }, [mergeSnapshot, sessionId]);

  useEffect(
    () =>
      api.subscribeClassroomSnapshot(
        sessionId,
        (nextSnapshot) => {
          mergeSnapshot(nextSnapshot);
        }
      ),
    [mergeSnapshot, sessionId]
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
    if (lastReportedLamConnectedRef.current === `${audioBackend}:${connected}`) return;
    lastReportedLamConnectedRef.current = `${audioBackend}:${connected}`;
    void api
      .sendClassroomEvent(sessionId, {
        type: "set_lam_connection",
        connected,
        renderer: audioBackend
      })
      .then(mergeSnapshot)
      .catch(() => {
        lastReportedLamConnectedRef.current = undefined;
      });
  }, [audioBackend, lamConnection, mergeSnapshot, sessionId, snapshot?.session.status]);

  useEffect(() => {
    if (snapshot?.session.status !== "live") return;
    let active = true;
    const refresh = async () => {
      try {
        const nextSnapshot = await api.getClassroomSnapshot(sessionId);
        if (active) mergeSnapshot(nextSnapshot);
      } catch {
        // A transient presence refresh must not interrupt the teacher's class.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mergeSnapshot, sessionId, snapshot?.session.status]);

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
    if (snapshot.courseId === ECONOMIC_MATHEMATICS_COURSE_ID) {
      const position = courseDeck?.getLessonPosition(snapshot.slide.index);
      if (position) setSlidePageDraft(String(position.localIndex));
      return;
    }
    const position = getPortManagementLessonSlidePosition(snapshot.slide.index);
    if (position) setSlidePageDraft(String(position.localIndex));
  }, [courseDeck, snapshot?.courseId, snapshot?.slide.index]);

  const elapsed = useMemo(
    () => (snapshot ? formatElapsed(snapshot.session.startsAt, now) : "00:00:00"),
    [now, snapshot]
  );

  async function sendEvent(input: ClassroomEventInput): Promise<boolean> {
    if (!snapshotRef.current || busy) return false;
    setBusy(true);
    setError("");
    try {
      if (
        input.type === "previous_slide" ||
        input.type === "next_slide" ||
        input.type === "set_slide"
      ) {
        const resetInFlight = interactionSyncRef.current.resetInFlight;
        if (resetInFlight) await resetInFlight;
        await flushSlideInteractionQueue();
      }
      const current = snapshotRef.current;
      if (!current) return false;
      const nextSnapshot = await api.sendClassroomEvent(current.session.id, input);
      mergeSnapshot(nextSnapshot);
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function flushSlideInteractionQueue() {
    const queue = interactionSyncRef.current;
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    queue.timer = undefined;
    if (queue.resetInFlight) {
      await queue.resetInFlight;
      return;
    }
    if (queue.inFlight) {
      await queue.inFlight;
      return flushSlideInteractionQueue();
    }
    const current = snapshotRef.current;
    if (
      !queue.slideId ||
      Object.keys(queue.pending).length === 0 ||
      !current?.slideInteraction ||
      current.slide.slideId !== queue.slideId ||
      current.slideInteraction.slideId !== queue.slideId
    ) {
      return;
    }

    const slideId = queue.slideId;
    const interaction = current.slideInteraction;
    const patch = queue.pending;
    queue.pending = {};
    queue.inFlightPatch = patch;
    const request = (async () => {
      try {
        const nextSnapshot = await api.sendClassroomEvent(current.session.id, {
          type: "set_slide_interaction",
          slideId,
          expectedRevision: interaction.revision,
          patch
        });
        if (
          snapshotRef.current?.session.id === current.session.id &&
          snapshotRef.current.slide.slideId === slideId
        ) {
          mergeSnapshot(nextSnapshot);
        }
      } catch (reason) {
        setError((reason as Error).message);
        queue.inFlightPatch = {};
        try {
          const latest = await api.getClassroomSnapshot(current.session.id);
          if (
            snapshotRef.current?.session.id === current.session.id &&
            snapshotRef.current.slide.slideId === slideId
          ) {
            mergeSnapshot(latest);
          }
        } catch {
          // The existing five-second snapshot poll remains the final recovery path.
        }
      }
    })();
    queue.inFlight = request;
    try {
      await request;
    } finally {
      if (queue.inFlight === request) queue.inFlight = undefined;
      queue.inFlightPatch = {};
    }
    if (
      queue.slideId === snapshotRef.current?.slide.slideId &&
      Object.keys(queue.pending).length > 0
    ) {
      queue.timer = window.setTimeout(
        () => void flushSlideInteractionQueue(),
        100
      );
    }
  }

  function previewSlideInteraction(patch: SlideInteractionValues) {
    const current = snapshotRef.current;
    const interaction = current?.slideInteraction;
    if (!current || !interaction || interaction.slideId !== current.slide.slideId) {
      return;
    }
    const queue = interactionSyncRef.current;
    if (queue.resetInFlight) return;
    if (queue.slideId !== interaction.slideId) {
      queue.pending = {};
      queue.slideId = interaction.slideId;
    }
    queue.pending = { ...queue.pending, ...patch };
    const optimisticSnapshot: ClassroomSnapshot = {
      ...current,
      slideInteraction: {
        ...interaction,
        values: { ...interaction.values, ...patch }
      }
    };
    snapshotRef.current = optimisticSnapshot;
    setSnapshot(optimisticSnapshot);
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    queue.timer = window.setTimeout(
      () => void flushSlideInteractionQueue(),
      100
    );
  }

  async function resetSlideInteraction() {
    const queue = interactionSyncRef.current;
    if (queue.resetInFlight) return queue.resetInFlight;
    if (queue.timer !== undefined) window.clearTimeout(queue.timer);
    queue.timer = undefined;
    queue.pending = {};
    const resetRequest = (async () => {
      if (queue.inFlight) await queue.inFlight;
      if (queue.timer !== undefined) window.clearTimeout(queue.timer);
      queue.timer = undefined;
      queue.pending = {};
      const current = snapshotRef.current;
      const interaction = current?.slideInteraction;
      if (
        !current ||
        !interaction ||
        interaction.slideId !== current.slide.slideId
      ) {
        return;
      }
      try {
        const nextSnapshot = await api.sendClassroomEvent(current.session.id, {
          type: "reset_slide_interaction",
          slideId: interaction.slideId,
          expectedRevision: interaction.revision
        });
        if (
          snapshotRef.current?.session.id === current.session.id &&
          snapshotRef.current.slide.slideId === interaction.slideId
        ) {
          mergeSnapshot(nextSnapshot);
        }
      } catch (reason) {
        setError((reason as Error).message);
        const latest = await api.getClassroomSnapshot(current.session.id);
        mergeSnapshot(latest);
      }
    })();
    queue.resetInFlight = resetRequest;
    try {
      await resetRequest;
    } finally {
      if (queue.resetInFlight === resetRequest) queue.resetInFlight = undefined;
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
      let dialogueStarted = false;

      try {
        await api.streamAssistantTurn(
          sessionId,
          { text, source, commandId },
          (event) => {
            if (event.type === "dialogue.delta") {
              dialogueStarted = true;
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
              mergeSnapshot(event.result.snapshot);
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
                dialogueStarted && !lamAvatarRef.current?.finishDialogue(event.turnId)
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
    [mergeSnapshot, sessionId]
  );

  async function sendTeacherCommand(text: string, source: "text" | "voice_asr") {
    const current = snapshotRef.current;
    if (!current || current.session.status !== "live") return;
    const response = await api.sendAvatarCommand(
      current.session.id,
      { inputMode: "text", text }
    );
    const latest = snapshotRef.current;
    if (latest?.session.id === current.session.id) {
      const optimisticSnapshot = {
        ...latest,
        avatar: response.avatar
      };
      snapshotRef.current = optimisticSnapshot;
      setSnapshot(optimisticSnapshot);
    }

    if (snapshotRef.current?.session.id !== current.session.id || snapshotRef.current.session.status !== "live") return;
    setNotice(source === "voice_asr" ? `ASR 已识别：“${text}”` : "教师文字已进入平台课堂助手。");
    await runAssistantTurn(text, source, response.id);
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
      setNotice(`ASR 已识别：“${normalized}”`);
      void runAssistantTurn(
        normalized,
        "voice_asr"
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
      setParticipationOpen(true);
      setNotice("可在课堂活动面板中选中并复制学生加入链接。");
    }
  }

  const { containerRef: fullscreenRef, isFullscreen, toggleFullscreen, exitFullscreen } =
    useClassroomFullscreen({
      canTurnPages: snapshot?.activeActivity === "slides" &&
        snapshot.session.status === "live" && !busy && !settingsOpen && !endDialogOpen && !participationOpen,
      pageIndex: snapshot?.slide.index ?? 1,
      pageTotal: snapshot?.slide.total ?? 1,
      onPageTurn: (direction) => sendEvent({ type: direction }),
      onError: setError
    });
  const avatarConcealed = isFullscreen ? fullscreenAvatarCollapsed : avatarCollapsed;
  const setAvatarConcealed = isFullscreen ? setFullscreenAvatarCollapsed : setAvatarCollapsed;

  async function returnToWorkspace() {
    try {
      await exitFullscreen();
      await flushSlideInteractionQueue();
      navigate("/");
    } catch {
      setError("暂时无法返回工作台，请重试。");
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

  const isEconomicMathematics =
    snapshot.courseId === ECONOMIC_MATHEMATICS_COURSE_ID;
  if (isEconomicMathematics && !courseDeck) {
    return (
      <main className="classroom-subsystem classroom-subsystem--centered">
        {error ? <CircleAlert size={34} /> : <LoaderCircle className="spin" size={32} />}
        <p>{error || "正在按需装载经济数学课程注册表"}</p>
      </main>
    );
  }

  const isLive = snapshot.session.status === "live";
  const isSlides = snapshot.activeActivity === "slides";
  const isGlobe =
    !isEconomicMathematics && snapshot.activeActivity === "globe";
  const isSimulation =
    !isEconomicMathematics && snapshot.activeActivity === "simulation";
  const isOpeningLaunchSlide =
    !isEconomicMathematics &&
    isSlides &&
    snapshot.slide.slideId === OPENING_GLOBE_CUE?.startSlideKey;
  const lamConnected = isLamConnected(lamConnection);
  const openingReturnSlide =
    !isEconomicMathematics && OPENING_GLOBE_CUE
      ? getPortManagementSlideByKey(OPENING_GLOBE_CUE.returnSlideKey)
      : undefined;
  const slidePosition = isEconomicMathematics
    ? courseDeck!.getLessonPosition(snapshot.slide.index)!
    : getPortManagementLessonSlidePosition(snapshot.slide.index)!;
  const lessonOptions = isEconomicMathematics
    ? courseDeck!.lessons.map((lesson) => ({
        number: lesson.number,
        label: `第${lesson.number}讲`,
        title: lesson.title,
        slideStart: lesson.slideStart,
        status: lesson.status
      }))
    : PORT_MANAGEMENT_LESSONS.map((lesson) => ({
        number: lesson.number,
        label: lesson.label,
        title: lesson.title,
        slideStart: lesson.slideStart,
        status: lesson.status
      }));
  const isPortLbl = !isEconomicMathematics && /^l[23]-lbl-/.test(snapshot.slide.slideId);
  const visibleActivityTabs = isEconomicMathematics || isPortLbl
    ? activityTabs.filter((tab) => tab.id === "slides")
    : activityTabs;

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
    const globalIndex = isEconomicMathematics
      ? courseDeck!.getGlobalIndex(slidePosition.lessonNumber, localIndex)
      : getPortManagementGlobalSlideIndex(
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
            {isEconomicMathematics ? <Sparkles size={23} /> : <ShipWheel size={23} />}
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

      <ClassroomPlaybackSlot.Provider value={isFullscreen ? fullscreenPlaybackSlot : playbackSlot}>
      <div
        ref={fullscreenRef}
        tabIndex={-1}
        className={[
          "classroom-workspace",
          avatarConcealed
            ? "classroom-workspace--avatar-collapsed"
            : "",
          isFullscreen ? "classroom-workspace--fullscreen" : "",
          isGlobe ? "classroom-workspace--globe" : "",
          isSimulation ? "classroom-workspace--simulation" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="teaching-runtime" aria-label="课堂教学主舞台">
          <nav className="classroom-activity-tabs" aria-label="课堂活动">
            {visibleActivityTabs.map((tab) => {
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
                    tab.id === "interaction" ? setParticipationOpen(true) : void sendEvent({ type: "set_activity", activity: tab.id })
                  }
                >
                  <Icon size={18} /> {tab.label}
                </button>
              );
            })}
            {isEconomicMathematics && <button type="button" className="classroom-activity-tab" onClick={() => setParticipationOpen(true)}><UsersRound size={18} />课堂活动</button>}
            <span className="runtime-version">课堂状态 v{snapshot.runtimeVersion}</span>
          </nav>

          <div
            className={`teaching-stage-frame ${!isEconomicMathematics && pointerActive ? "teaching-stage-frame--pointer" : ""} ${
              !isEconomicMathematics && annotationActive ? "teaching-stage-frame--annotation" : ""
            }`}
            onBlurCapture={(event) => {
              if (event.target instanceof HTMLInputElement && event.target.type === "range") {
                void flushSlideInteractionQueue();
              }
            }}
            onKeyUpCapture={(event) => {
              if (event.target instanceof HTMLInputElement && event.target.type === "range") {
                void flushSlideInteractionQueue();
              }
            }}
            onPointerCancelCapture={(event) => {
              if (event.target instanceof HTMLInputElement && event.target.type === "range") {
                void flushSlideInteractionQueue();
              }
            }}
            onPointerUpCapture={(event) => {
              if (event.target instanceof HTMLInputElement && event.target.type === "range") {
                void flushSlideInteractionQueue();
              }
            }}
          >
            {isSimulation ? (
              <Suspense
                fallback={
                  <div className="classroom-globe-loading">
                    <LoaderCircle className="spin" size={34} />
                    <span>正在装载港口纯手动仿真</span>
                  </div>
                }
              >
                <ClassroomPortSimulationStage
                  sessionId={sessionId}
                  classroomSnapshot={snapshot}
                  onClassroomSnapshot={mergeSnapshot}
                />
              </Suspense>
            ) : isSlides ? (
              <SlideStage
                frame={snapshot.slide}
                interaction={snapshot.slideInteraction}
                onInteractionPatch={previewSlideInteraction}
                onInteractionReset={() => void resetSlideInteraction()}
                readOnly={false}
              />
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
            {!isEconomicMathematics && pointerActive && (
              <div className="teacher-pointer-indicator" aria-hidden="true">
                <MousePointer2 size={22} />
              </div>
            )}
            {!isEconomicMathematics && annotationActive && (
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
                    disabled={
                      busy ||
                      snapshot.globePlayback.status !== "playing"
                    }
                    onClick={() =>
                      void sendEvent({ type: "globe_pause" })
                    }
                  >
                    <Pause size={17} /> 暂停
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      snapshot.globePlayback.status !== "paused"
                    }
                    onClick={() =>
                      void sendEvent({ type: "globe_resume" })
                    }
                  >
                    <Play size={17} /> 继续
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void sendEvent({ type: "globe_restart" })
                    }
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
                  <button
                    type="button"
                    aria-label="全屏"
                    onClick={() => void toggleFullscreen()}
                  >
                    <Maximize2 size={17} /> 全屏
                  </button>
                </div>
              </div>
            ) : isSimulation ? (
              <div className="simulation-classroom-footer">
                <span><FlaskConical size={17} /> 登录后本地单机</span>
                <span>每名学生独立体验四岗位 · 运行时无长连接</span>
                <button type="button" aria-label="全屏" onClick={() => void toggleFullscreen()}>
                  <Maximize2 size={17} /> 全屏
                </button>
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

            {isSlides && <div className="classroom-playback-slot" ref={setPlaybackSlot} />}
            <label className="lesson-select-control">
              <span className="sr-only">选择课次</span>
              <select
                aria-label="选择课次"
                disabled={busy}
                value={snapshot.slide.lessonNumber}
                onChange={(event) => {
                  const selectedLesson = lessonOptions.find(
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
                {lessonOptions.map((lesson) => (
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
              {!isEconomicMathematics && (
                <>
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
                      setParticipationOpen(true)
                    }
                  >
                    <UsersRound size={17} /> <span>学生互动</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="stage-tool-button"
                aria-label="全屏"
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
            avatarConcealed ? "classroom-avatar-dock--collapsed" : "",
            isGlobe ? "classroom-avatar-dock--cinematic" : "",
            isSimulation ? "classroom-avatar-dock--simulation" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {avatarConcealed ? (
            <div className="collapsed-avatar-controls">
              <button
                type="button"
                aria-label="展开小麦老师"
                onClick={() => setAvatarConcealed(false)}
              >
                <ChevronLeft size={19} />
              </button>
              <span className="collapsed-avatar-mark"><Sparkles size={22} /></span>
              <i className={lamConnected ? "avatar-state-dot" : "avatar-state-dot avatar-state-dot--error"} />
              <button
                type="button"
                aria-label="展开语音输入"
                onClick={() => setAvatarConcealed(false)}
              >
                <Mic size={19} />
              </button>
            </div>
          ) : (
            <header className="avatar-dock-header">
              <div>
                <strong>小麦老师</strong>
                <span>
                  <i className={lamConnected ? "" : "avatar-state-dot--error"} />
                  <AvatarSelector compact allowLam={runtimeConfig.profile !== "campus"} onBeforeChange={interruptAssistant}/>
                </span>
                <Link target="_blank" rel="noopener noreferrer" to={`/courses/${snapshot.courseId}/assistant-prompts?index=${snapshot.slide.index}&activity=${snapshot.activeActivity}&session=${sessionId}`}>提示词设置</Link>
              </div>
              <button
                type="button"
                aria-label={isFullscreen ? "收起数字人浮窗" : "收起数字人"}
                onClick={() => setAvatarConcealed(true)}
              >
                收起 <ChevronRight size={16} />
              </button>
            </header>
          )}

          <LamAvatarSurface
            ref={lamAvatarRef}
            runtime={lamRuntime}
            concealed={avatarConcealed}
            onConnectionStateChange={setLamConnection}
            onHumanTranscript={handleHumanTranscript}
            onRetry={() => void refreshLamRuntime()}
          />

          <>
              {!avatarConcealed && <section
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
              </section>}

              <VoiceCommandComposer
                key={sessionId}
                concealed={avatarConcealed}
                compact={isFullscreen || isGlobe}
                onExpand={() => setAvatarConcealed(false)}
                disabled={!isLive}
                continuousAsrConfigured={runtimeConfig.speech.asr}
                assistantBusy={assistantPhase !== "idle" || lamConnection === "speaking" || lamConnection === "thinking" || (isGlobe && snapshot.globePlayback.status === "playing")}
                onCommand={sendTeacherCommand}
              />

              {!avatarConcealed && <footer className="avatar-runtime-footer">
                <span>
                  <MonitorPlay size={15} />
                  {audioBackend === "browser" ? "数字人在本机播放 · 语音与问答由平台提供" : lamConnected
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
              </footer>}
          </>
        </aside>
        <TeacherParticipation key={sessionId} sessionId={sessionId} open={participationOpen} onClose={closeParticipation} />
        {isFullscreen && (
          <>
            <ClassroomFullscreenControls
              playbackControlsRef={setFullscreenPlaybackSlot}
              activity={snapshot.activeActivity}
              allowedActivities={visibleActivityTabs.map((tab) => tab.id)}
              busy={busy}
              isLive={isLive}
              pageIndex={snapshot.slide.index}
              pageTotal={snapshot.slide.total}
              localIndex={slidePosition.localIndex}
              localTotal={slidePosition.localTotal}
              lessonNumber={slidePosition.lessonNumber}
              avatarCollapsed={avatarConcealed}
              onPageTurn={(direction) => void sendEvent({ type: direction })}
              onActivityChange={(activity) => void sendEvent({ type: "set_activity", activity })}
              onToggleAvatar={() => setFullscreenAvatarCollapsed((collapsed) => !collapsed)}
              onExit={() => void toggleFullscreen()}
              onWorkspace={() => void returnToWorkspace()}
              onParticipation={() => setParticipationOpen(true)}
            />
            {(error || notice) && <div className="fullscreen-classroom-notice" role="status">{error || notice}</div>}
          </>
        )}
      </div>

      </ClassroomPlaybackSlot.Provider>
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
