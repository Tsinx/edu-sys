import type { ClassroomActor, ClassroomSnapshot } from "@edu/contracts";
import { getPortManagementLessonSlidePosition } from "@edu/course-content";
import {
  CircleAlert,
  LoaderCircle,
  Radio,
  ShipWheel,
  UsersRound
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import { SlideStage } from "./TeachingSlides";
import "./classroom.css";

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

export function StudentClassroom() {
  const { sessionId = "" } = useParams();
  const [actor, setActor] = useState<ClassroomActor>();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [presenceConnected, setPresenceConnected] = useState(false);
  const [snapshotStreamConnected, setSnapshotStreamConnected] =
    useState(false);
  const [error, setError] = useState("");
  const localSimulationActive =
    snapshot?.activeActivity === "simulation" && Boolean(snapshot.simulation);

  useEffect(() => {
    let active = true;
    const establishIdentity = async () => {
      try {
        let session;
        try {
          session = await api.getIdentitySession();
        } catch {
          session = await api.createDevelopmentIdentitySession("student");
        }
        if (!session.actor.roles.includes("student")) {
          session = await api.createDevelopmentIdentitySession("student");
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
          setSnapshot(nextSnapshot);
          setError("");
        }
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void refreshSnapshot();
    const timer = window.setInterval(() => void refreshSnapshot(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [actor, localSimulationActive, sessionId]);

  useEffect(() => {
    if (localSimulationActive) {
      setSnapshotStreamConnected(false);
      return undefined;
    }
    return api.subscribeClassroomSnapshot(
        sessionId,
        setSnapshot,
        setSnapshotStreamConnected
      );
  }, [localSimulationActive, sessionId]);

  useEffect(() => {
    if (!actor || localSimulationActive) {
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

  const isLive = snapshot.session.status === "live";
  const isGlobe = snapshot.activeActivity === "globe";
  const isSimulation = snapshot.activeActivity === "simulation";
  const slidePosition = getPortManagementLessonSlidePosition(
    snapshot.slide.index
  )!;

  return (
    <main className="student-classroom">
      <header className="student-classroom__header">
        <span className="student-classroom__brand">
          <ShipWheel size={22} />
        </span>
        <div>
          <strong>{snapshot.courseTitle}</strong>
          <span>{snapshot.chapterTitle}</span>
        </div>
        <span
          className={
            isSimulation || (isLive && presenceConnected)
              ? "student-presence-status"
              : "student-presence-status student-presence-status--offline"
          }
        >
          <Radio size={15} />
          {isSimulation
            ? "本地运行"
            : isLive
            ? presenceConnected
              ? "已加入课堂"
              : "正在连接"
            : "课堂已结束"}
        </span>
      </header>

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
          <SlideStage frame={snapshot.slide} />
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
            ? "进度保存在本机，不建立实时连接"
            : snapshotStreamConnected
            ? "课堂状态实时同步"
            : "连接中，5秒轮询降级"}
        </span>
      </footer>
    </main>
  );
}
