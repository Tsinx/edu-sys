import type {
  ClassroomSnapshot,
  PortSimulationChallengeId
} from "@edu/contracts";
import {
  PORT_SIMULATION_CHALLENGES,
  getPortSimulationChallenge
} from "@edu/port-simulation-core";
import {
  CheckCircle2,
  CircleAlert,
  HardDrive,
  LoaderCircle,
  LogIn,
  MonitorSmartphone,
  Send,
  ServerOff,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api";

export interface ClassroomLocalPortSimulationStageProps {
  sessionId: string;
  classroomSnapshot: ClassroomSnapshot;
  onClassroomSnapshot: (snapshot: ClassroomSnapshot) => void;
}

export function ClassroomLocalPortSimulationStage({
  sessionId,
  classroomSnapshot,
  onClassroomSnapshot
}: ClassroomLocalPortSimulationStageProps) {
  const [selectedChallengeId, setSelectedChallengeId] =
    useState<PortSimulationChallengeId>(
      classroomSnapshot.simulation?.challengeId ?? "joint-watch"
    );
  const [expectedStudentCount, setExpectedStudentCount] = useState(30);
  const [identityReady, setIdentityReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const simulation = classroomSnapshot.simulation;
  const activeChallenge = simulation
    ? getPortSimulationChallenge(simulation.challengeId)
    : null;

  useEffect(() => {
    if (simulation?.challengeId) setSelectedChallengeId(simulation.challengeId);
  }, [simulation?.challengeId]);

  useEffect(() => {
    let active = true;
    const establishIdentity = async () => {
      try {
        let identity;
        try {
          identity = await api.getIdentitySession();
        } catch {
          identity = await api.createDevelopmentIdentitySession("teacher");
        }
        if (!identity.actor.roles.includes("teacher")) {
          identity = await api.createDevelopmentIdentitySession("teacher");
        }
        if (active) setIdentityReady(true);
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
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const publishChallenge = async () => {
    if (busy || !identityReady) return;
    setBusy(true);
    setError("");
    const isUpdatingPublishedChallenge = simulation?.deliveryMode === "local_solo";
    try {
      const snapshot = await api.setupPortSimulation(sessionId, {
        deliveryMode: "local_solo",
        challengeId: selectedChallengeId,
        expectedStudentCount
      });
      onClassroomSnapshot(snapshot);
      setNotice(
        isUpdatingPublishedChallenge
          ? "本地挑战已更新。已经打开仿真页的学生刷新页面后会载入新挑战。"
          : "本地挑战已发布。学生登录并载入页面后即可独立运行。"
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="port-local-teacher" aria-label="港口仿真本地单机课堂配置">
      <header>
        <span>PORT SIMULATION · V1.0</span>
        <h2>发布登录后本地运行的个人挑战</h2>
        <p>
          服务器只处理登录和首次挑战配置。学生开始后，各自在浏览器中运行完整四岗位流程。
        </p>
      </header>

      {(error || notice) ? (
        <div className={error ? "port-simulation-notice port-simulation-notice--error" : "port-simulation-notice"} role={error ? "alert" : "status"}>
          {error ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || notice}</span>
        </div>
      ) : null}

      <section className="port-local-teacher__architecture" aria-label="本地运行边界">
        <article><LogIn aria-hidden="true" /><strong>登录一次</strong><span>确认教学系统身份并读取挑战</span></article>
        <article><MonitorSmartphone aria-hidden="true" /><strong>每人一套引擎</strong><span>四岗位由同一学生依次切换</span></article>
        <article><HardDrive aria-hidden="true" /><strong>本机自动存档</strong><span>进度和个人历史不持续上传</span></article>
        <article><ServerOff aria-hidden="true" /><strong>运行零长连接</strong><span>不建立SSE、小组席位或服务端时钟</span></article>
      </section>

      <fieldset className="port-teacher-setup__challenges">
        <legend>选择要发布的挑战</legend>
        {PORT_SIMULATION_CHALLENGES.map((challenge) => (
          <label key={challenge.id} data-selected={selectedChallengeId === challenge.id}>
            <input
              type="radio"
              name="local-port-challenge"
              value={challenge.id}
              checked={selectedChallengeId === challenge.id}
              onChange={() => setSelectedChallengeId(challenge.id)}
            />
            <span>{challenge.difficulty}</span>
            <strong>{challenge.title}</strong>
            <p>{challenge.publicBriefing}</p>
            <small>{challenge.eventBriefing}</small>
          </label>
        ))}
      </fieldset>

      <section className="port-local-teacher__publish">
        <label>
          预计登录人数
          <input
            type="number"
            min={4}
            max={72}
            value={expectedStudentCount}
            onChange={(event) =>
              setExpectedStudentCount(
                Math.min(72, Math.max(4, Number(event.target.value)))
              )
            }
          />
          <small>只用于课堂准备提示，不用于建组或分配服务器资源。</small>
        </label>
        <button type="button" disabled={busy || !identityReady} onClick={() => void publishChallenge()}>
          {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          {simulation?.deliveryMode === "local_solo" ? "更新本地挑战" : "发布本地挑战"}
        </button>
      </section>

      {activeChallenge ? (
        <section className="port-local-teacher__published" data-legacy={simulation?.deliveryMode !== "local_solo"}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <span>{simulation?.deliveryMode === "local_solo" ? "当前已发布" : "检测到旧版多人配置"}</span>
            <h3>{activeChallenge.title}</h3>
            <p>
              {simulation?.deliveryMode === "local_solo"
                ? "学生首次载入后可以断开实时连接，教师端不再显示运行状态、命令或排行榜。"
                : "点击“发布本地挑战”即可转换；旧小组运行数据会留在持久化历史中，但不再作为默认入口。"}
            </p>
          </div>
          <a href={`/join/${sessionId}`} target="_blank" rel="noreferrer">打开学生入口</a>
        </section>
      ) : null}

      <footer>
        本地成绩可导出为不含姓名的复盘文件，但 V1.0 不自动回传成绩，也不提供联网排行榜。
      </footer>
    </section>
  );
}
