import type { ClassroomActor, ClassroomSnapshot } from "@edu/contracts";
import { getPortManagementLessonSlidePosition } from "@edu/course-content";
import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";
import {
  BookOpen,
  CircleAlert,
  LoaderCircle,
  Radio,
  ShipWheel,
  UsersRound
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../../api";
import { SlideStage } from "./TeachingSlides";
import "./classroom.css";
import { StudentParticipation } from "./ClassroomParticipation";

const ClassroomGlobeStage = lazy(() =>
  import("./ClassroomGlobeStage").then((module) => ({
    default: module.ClassroomGlobeStage
  }))
);

const StudentPortSimulation = lazy(() =>
  import("../port-simulation/StudentLocalPortSimulation").then((module) => ({
    default: module.StudentLocalPortSimulation
  }))
);

const ECONOMIC_MATHEMATICS_COURSE_ID = "course-economic-mathematics";
let pendingIdentity: ReturnType<typeof api.getIdentitySession> | undefined;
function studentIdentity() {
  // Share bootstrap across StrictMode mounts; never replace identity on a network error.
  pendingIdentity ??= api.getIdentitySession().catch(reason => {
    if (reason instanceof ApiError && reason.status === 401) return api.createDevelopmentIdentitySession("student");
    throw reason;
  }).finally(() => { pendingIdentity = undefined; });
  return pendingIdentity;
}

export function StudentClassroom() {
  const { sessionId = "" } = useParams();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const [actor, setActor] = useState<ClassroomActor>();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [courseDeck, setCourseDeck] = useState<CourseDeckDescriptor | null>(null);
  const [presenceConnected, setPresenceConnected] = useState(false);
  const [snapshotStreamConnected, setSnapshotStreamConnected] =
    useState(false);
  const [error, setError] = useState("");
  const mergeSnapshot = useCallback((nextSnapshot: ClassroomSnapshot) => {
    if (nextSnapshot.session.id !== sessionIdRef.current) return;
    setSnapshot((current) =>
      !current ||
      current.session.id !== nextSnapshot.session.id ||
      nextSnapshot.runtimeVersion >= current.runtimeVersion
        ? nextSnapshot
        : current
    );
  }, []);
  const localSimulationActive =
    snapshot?.activeActivity === "simulation" && Boolean(snapshot.simulation);

  useEffect(() => {
    setSnapshot(undefined);
    setCourseDeck(null);
    setSnapshotStreamConnected(false);
  }, [sessionId]);

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
    let active = true;
    const establishIdentity = async () => {
      try {
        const session = await studentIdentity();
        if (
          !session.actor.roles.includes("student") &&
          !session.actor.roles.includes("teacher")
        ) {
          throw new Error("当前身份没有课堂访问权限");
        }
        if (active) setActor(session.actor);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void establishIdentity();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!actor) return undefined;
    if (localSimulationActive) return undefined;
    let active = true;
    const refreshSnapshot = async () => {
      try {
        const nextSnapshot = await api.getClassroomSnapshot(sessionId);
        if (active) {
          mergeSnapshot(nextSnapshot);
          setError("");
        }
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void refreshSnapshot();
    const timer = snapshotStreamConnected ? undefined : window.setInterval(() => void refreshSnapshot(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [actor, localSimulationActive, mergeSnapshot, sessionId, snapshotStreamConnected]);

  useEffect(() => {
    if (!actor || localSimulationActive) {
      setSnapshotStreamConnected(false);
      return undefined;
    }
    return api.subscribeClassroomSnapshot(
        sessionId,
        mergeSnapshot,
        setSnapshotStreamConnected
      );
  }, [actor, localSimulationActive, mergeSnapshot, sessionId]);

  useEffect(() => {
    if (
      !actor ||
      !actor.roles.includes("student") ||
      localSimulationActive
    ) {
      setPresenceConnected(false);
      return undefined;
    }
    let active = true;
    let registered = false;
    let heartbeatTimer: number | undefined;

    const heartbeat = async () => {
      try {
        await api.heartbeatClassroomPresence(sessionId);
        registered = true;
        if (active) setPresenceConnected(true);
      } catch {
        if (active) setPresenceConnected(false);
      }
    };
    const leave = () => {
      if (!registered) return;
      registered = false;
      setPresenceConnected(false);
      const payload = new Blob(
        [JSON.stringify({})],
        { type: "application/json" }
      );
      const queued = navigator.sendBeacon(
        `/api/class-sessions/${sessionId}/presence/leave`,
        payload
      );
      if (!queued) {
        void api.leaveClassroomPresence(sessionId).catch(
          () => undefined
        );
      }
    };

    const startTimer = window.setTimeout(() => {
      void heartbeat();
      heartbeatTimer = window.setInterval(() => void heartbeat(), 15_000);
    }, 0);
    window.addEventListener("pagehide", leave);

    return () => {
      active = false;
      window.clearTimeout(startTimer);
      if (heartbeatTimer !== undefined) {
        window.clearInterval(heartbeatTimer);
      }
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [actor, localSimulationActive, sessionId]);

  if (error && !snapshot) {
    return (
      <main className="student-classroom student-classroom--centered">
        <CircleAlert size={34} />
        <h1>无法加入课堂</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!snapshot || !actor) {
    return (
      <main className="student-classroom student-classroom--centered">
        <LoaderCircle className="spin" size={31} />
        <p>正在加入课堂</p>
      </main>
    );
  }

  const isEconomicMathematics =
    snapshot.courseId === ECONOMIC_MATHEMATICS_COURSE_ID;
  if (isEconomicMathematics && !courseDeck) {
    return (
      <main className="student-classroom student-classroom--centered">
        {error ? <CircleAlert size={34} /> : <LoaderCircle className="spin" size={31} />}
        <p>{error || "正在按需装载经济数学同步课件"}</p>
      </main>
    );
  }

  const isLive = snapshot.session.status === "live";
  const isGlobe =
    !isEconomicMathematics && snapshot.activeActivity === "globe";
  const isSimulation =
    !isEconomicMathematics && snapshot.activeActivity === "simulation";
  const slidePosition = isEconomicMathematics
    ? courseDeck!.getLessonPosition(snapshot.slide.index)!
    : getPortManagementLessonSlidePosition(snapshot.slide.index)!;
  const isTeacherPreview = actor.roles.includes("teacher");

  return (
    <main className="student-classroom">
      <header className="student-classroom__header">
        <span className="student-classroom__brand">
          {isEconomicMathematics ? <BookOpen size={22} /> : <ShipWheel size={22} />}
        </span>
        <div>
          <strong>{snapshot.courseTitle}</strong>
          <span>{snapshot.chapterTitle}</span>
        </div>
        <span
          className={
            isSimulation || isTeacherPreview || (isLive && presenceConnected)
              ? "student-presence-status"
              : "student-presence-status student-presence-status--offline"
          }
        >
          <Radio size={15} />
          {isSimulation
            ? "本地运行"
            : isTeacherPreview
            ? "教师预览"
            : isLive
            ? presenceConnected
              ? "已加入课堂"
              : "正在连接"
            : "课堂已结束"}
        </span>
      </header>

      <StudentParticipation key={`${sessionId}:${actor.actorId}`} sessionId={sessionId} actor={actor} />

      <section className="student-classroom__stage" aria-label="学生课堂画面">
        {isSimulation ? (
          <Suspense
            fallback={
              <div className="classroom-globe-loading">
                <LoaderCircle className="spin" size={31} />
                <span>正在装载港口纯手动仿真</span>
              </div>
            }
          >
            <StudentPortSimulation
              participantId={actor.actorId}
              participantDisplayName={actor.displayName}
              classroomSnapshot={snapshot}
            />
          </Suspense>
        ) : isGlobe ? (
          <Suspense
            fallback={
              <div className="classroom-globe-loading">
                <LoaderCircle className="spin" size={31} />
                <span>正在按需装载电影化地球仪</span>
              </div>
            }
          >
            <ClassroomGlobeStage
              snapshot={snapshot}
              role="student"
              lamConnected={snapshot.avatar.gpuStatus === "ready"}
            />
          </Suspense>
        ) : (
          <SlideStage
            frame={snapshot.slide}
            interaction={snapshot.slideInteraction}
            readOnly
          />
        )}
      </section>

      <footer className="student-classroom__footer">
        <span>
          <UsersRound size={16} />
          当前页 {String(slidePosition.localIndex).padStart(2, "0")} /{" "}
          {slidePosition.localTotal}
        </span>
        <span>
          {isSimulation ? "个人四岗位操作端" : "学生端只读画面"} ·{" "}
          {isSimulation
            ? "仿真进度保存在本机"
            : snapshotStreamConnected
            ? "课堂状态实时同步"
            : "连接中，5秒轮询降级"}
        </span>
      </footer>
    </main>
  );
}
