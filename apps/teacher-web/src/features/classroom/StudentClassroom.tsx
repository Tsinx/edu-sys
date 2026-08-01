import type { ClassroomSnapshot } from "@edu/contracts";
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

function getParticipantId(sessionId: string) {
  const storageKey = `edu-classroom-participant:${sessionId}`;
  const saved = window.sessionStorage.getItem(storageKey);
  if (saved) return saved;
  const participantId = `student-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, participantId);
  return participantId;
}

export function StudentClassroom() {
  const { sessionId = "" } = useParams();
  const [participantId] = useState(() => getParticipantId(sessionId));
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [presenceConnected, setPresenceConnected] = useState(false);
  const [snapshotStreamConnected, setSnapshotStreamConnected] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [sessionId]);

  useEffect(
    () =>
      api.subscribeClassroomSnapshot(
        sessionId,
        setSnapshot,
        setSnapshotStreamConnected
      ),
    [sessionId]
  );

  useEffect(() => {
    let active = true;
    let registered = false;
    let heartbeatTimer: number | undefined;

    const heartbeat = async () => {
      try {
        await api.heartbeatClassroomPresence(sessionId, participantId);
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
        [JSON.stringify({ participantId })],
        { type: "application/json" }
      );
      const queued = navigator.sendBeacon(
        `/api/class-sessions/${sessionId}/presence/leave`,
        payload
      );
      if (!queued) {
        void api.leaveClassroomPresence(sessionId, participantId).catch(
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
  }, [participantId, sessionId]);

  if (error && !snapshot) {
    return (
      <main className="student-classroom student-classroom--centered">
        <CircleAlert size={34} />
        <h1>无法加入课堂</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="student-classroom student-classroom--centered">
        <LoaderCircle className="spin" size={31} />
        <p>正在加入课堂</p>
      </main>
    );
  }

  const isLive = snapshot.session.status === "live";
  const isGlobe = snapshot.activeActivity === "globe";
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
            isLive && presenceConnected
              ? "student-presence-status"
              : "student-presence-status student-presence-status--offline"
          }
        >
          <Radio size={15} />
          {isLive
            ? presenceConnected
              ? "已加入课堂"
              : "正在连接"
            : "课堂已结束"}
        </span>
      </header>

      <section className="student-classroom__stage" aria-label="学生课堂画面">
        {isGlobe ? (
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
          学生端只读画面 ·{" "}
          {snapshotStreamConnected
            ? "课堂状态实时同步"
            : "连接中，5秒轮询降级"}
        </span>
      </footer>
    </main>
  );
}
