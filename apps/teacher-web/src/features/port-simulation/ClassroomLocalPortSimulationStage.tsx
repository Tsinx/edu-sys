import type {
  ClassroomSnapshot,
  PortSimulationChallengeId
} from "@edu/contracts";
import {
  PORT_OPERATIONS_COURSE_PRESETS as PORT_SIMULATION_CHALLENGES,
  getPortOperationsCoursePreset as getPortSimulationChallenge
} from "@edu/port-simulation-core";
import { PORT_COURSE_UNITS, portCourseDefinition, recommendPortCourse, type PortCourseSelection } from "@edu/port-simulation-core";
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
  const [learningStage, setLearningStage] = useState<PortCourseSelection>(classroomSnapshot.simulation?.learningStage ?? recommendPortCourse(classroomSnapshot.chapterTitle));
  const [trainingMode, setTrainingMode] = useState<"practice" | "battle">(classroomSnapshot.simulation?.trainingMode ?? "practice");
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
  useEffect(() => { setTrainingMode(simulation?.trainingMode ?? "practice"); }, [simulation?.trainingMode]);
  useEffect(() => { setLearningStage(simulation?.learningStage ?? recommendPortCourse(classroomSnapshot.chapterTitle)); }, [simulation?.learningStage, classroomSnapshot.chapterTitle]);

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
        trainingMode: learningStage === "full" ? trainingMode : "practice",
        learningStage,
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
        <span>PORT OPERATIONS · COURSE LAB</span>
        <h2>按课程进度发布实训</h2>
        <p>
          选择本课作业分段，直接从相应现场开始。课程后期可发布完整 48 小时挑战。
        </p>
      </header>

      {(error || notice) ? (
        <div className={error ? "port-simulation-notice port-simulation-notice--error" : "port-simulation-notice"} role={error ? "alert" : "status"}>
          {error ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || notice}</span>
        </div>
      ) : null}

      <section className="port-local-teacher__architecture" aria-label="四类实验任务">
        <article><LogIn aria-hidden="true" /><strong>熟悉流程</strong><span>现场事件、真实指令与箱流验证</span></article>
        <article><MonitorSmartphone aria-hidden="true" /><strong>调度协同</strong><span>连续到港、等泊与班组调度</span></article>
        <article><HardDrive aria-hidden="true" /><strong>设备选型</strong><span>预算、能力、能耗与实验对照</span></article>
        <article><ServerOff aria-hidden="true" /><strong>港区规划</strong><span>六地块用途、货批分配与实际移箱</span></article>
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
        <label>本课实训分段
          <select aria-label="本课实训分段" value={learningStage} onChange={e => setLearningStage(e.target.value as PortCourseSelection)}>
            {PORT_COURSE_UNITS.map(unit => <option key={unit.id} value={unit.id}>{unit.title} · {unit.course}</option>)}
          </select>
          <small>{portCourseDefinition(learningStage).prepared}</small>
          <a href={`/port-simulation-preview.html?course=${learningStage === "full" ? "arrival" : learningStage}&demo=1`} target="_blank" rel="noreferrer">▶ 打开课程标准演示</a>
        </label>
        <label>场次规则
          <select aria-label="课堂训练场规则" disabled={learningStage !== "full"} value={learningStage === "full" ? trainingMode : "practice"} onChange={event => setTrainingMode(event.target.value as "practice" | "battle")}>
            <option value="practice">教学模式 · 首次新流程暂停，错误解释不扣分</option>
            <option value="battle">实战模式 · 48 小时固定 60×，流程错误去重扣分</option>
          </select>
          <small>{learningStage === "full" ? "综合实训可选择教学或实战规则。" : "分段采用教学规则，记录实际目标与处置过程。"}学生载入后锁定本课分段；记录保存在本机。</small>
        </label>
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
            <p>当前分段：{portCourseDefinition(simulation?.learningStage ?? "full").title}</p>
            <p>{simulation?.trainingMode === "battle" ? "实战模式 · 48 小时固定 60× · 流程错误每种扣 5 分一次" : "教学模式 · 首次新流程暂停 · 错误解释不扣分"}</p>
            <p>
              {simulation?.deliveryMode === "local_solo"
                ? "学生可旋转、缩放并选择三维设施；实验支持本机存档、方案对比和复盘导出。"
                : "点击“发布本地挑战”即可转换；旧小组运行数据会留在持久化历史中，但不再作为默认入口。"}
            </p>
          </div>
          <a href={`/join/${sessionId}`} target="_blank" rel="noreferrer">打开学生入口</a>
        </section>
      ) : null}

      <footer>
        3D 实验结果和操作过程可导出为不含姓名的复盘文件。设备参数、预算与能耗使用教学假设。
      </footer>
    </section>
  );
}
