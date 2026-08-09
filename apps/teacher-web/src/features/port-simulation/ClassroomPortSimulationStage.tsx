import type {
  ClassroomSnapshot,
  PortSimulationChallengeId,
  PortSimulationCommand,
  PortSimulationMemberCapacity,
  PortSimulationPreflightReport,
  PortSimulationRole,
  PortSimulationSupportRole
} from "@edu/contracts";
import {
  PORT_SIMULATION_CHALLENGES,
  PORT_SIMULATION_ROLE_LABELS,
  PORT_SIMULATION_SUPPORT_ROLE_LABELS,
  getPortSimulationChallenge
} from "@edu/port-simulation-core";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Medal,
  LoaderCircle,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  Target,
  Trophy,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import {
  PORT_SIMULATION_RUN_STATUS_LABELS,
  PortSimulationWorkspace
} from "./PortSimulationWorkspace";
import { usePortSimulationTeamSync } from "./usePortSimulationTeamSync";

export interface ClassroomPortSimulationStageProps {
  sessionId: string;
  classroomSnapshot: ClassroomSnapshot;
  onClassroomSnapshot: (snapshot: ClassroomSnapshot) => void;
}

function planTeamCapacities(expectedStudentCount: number) {
  const active = expectedStudentCount === 7 ? 6 : expectedStudentCount;
  const minimum = Math.ceil(active / 6);
  const maximum = Math.min(15, Math.floor(active / 4));
  const count = Math.max(minimum, Math.min(maximum, Math.round(active / 5)));
  const base = Math.floor(active / count);
  const remainder = active % count;
  return Array.from(
    { length: count },
    (_, index) => (base + (index < remainder ? 1 : 0)) as PortSimulationMemberCapacity
  );
}

export function ClassroomPortSimulationStage({
  sessionId,
  classroomSnapshot,
  onClassroomSnapshot
}: ClassroomPortSimulationStageProps) {
  const [expectedStudentCount, setExpectedStudentCount] = useState(30);
  const [selectedChallengeId, setSelectedChallengeId] =
    useState<PortSimulationChallengeId>("joint-watch");
  const [leaderboardMode, setLeaderboardMode] = useState<
    "overall" | "staffing" | "improvement"
  >("overall");
  const [teamNames, setTeamNames] = useState(() =>
    Array.from({ length: 15 }, (_, index) => `第 ${index + 1} 组`)
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [takeoverRole, setTakeoverRole] =
    useState<PortSimulationRole>("marine_control");
  const [allowIncompleteTeams, setAllowIncompleteTeams] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [configurationNames, setConfigurationNames] = useState<string[]>([]);
  const [configurationCapacities, setConfigurationCapacities] = useState<
    PortSimulationMemberCapacity[]
  >([]);
  const [preflight, setPreflight] = useState<PortSimulationPreflightReport>();
  const simulation = classroomSnapshot.simulation;
  const {
    snapshot: teamSnapshot,
    connectionState,
    consistent,
    commandEnabled,
    lastSyncLatencyMs,
    reconnectCount,
    forceResync,
    acceptServerSnapshot
  } = usePortSimulationTeamSync(sessionId, selectedTeamId);
  const plannedCapacities = useMemo(
    () => planTeamCapacities(expectedStudentCount),
    [expectedStudentCount]
  );
  const teamCount = plannedCapacities.length;

  useEffect(() => {
    let active = true;
    const establishTeacherIdentity = async () => {
      try {
        let session;
        try {
          session = await api.getIdentitySession();
        } catch {
          session = await api.createDevelopmentIdentitySession("teacher");
        }
        if (!session.actor.roles.includes("teacher")) {
          session = await api.createDevelopmentIdentitySession("teacher");
        }
        if (active) setIdentityReady(true);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void establishTeacherIdentity();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const firstTeam = simulation?.teams[0]?.teamId;
    if (!selectedTeamId && firstTeam) setSelectedTeamId(firstTeam);
    if (
      selectedTeamId &&
      simulation &&
      !simulation.teams.some((team) => team.teamId === selectedTeamId)
    ) {
      setSelectedTeamId(firstTeam);
    }
  }, [selectedTeamId, simulation]);

  useEffect(() => {
    if (!simulation) return;
    setConfigurationNames(simulation.teams.map((team) => team.teamName));
    setConfigurationCapacities(
      simulation.teams.map((team) => team.memberCapacity)
    );
  }, [simulation?.scenarioVersion, simulation?.teams.length]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!simulation || !identityReady) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const report = await api.getPortSimulationPreflight(sessionId);
        if (active) setPreflight(report);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [identityReady, sessionId, simulation]);

  const allReady = useMemo(
    () => simulation?.teams.every((team) => team.occupiedRoles === 4) ?? false,
    [simulation]
  );
  const selectedConnectionLabel =
    connectionState === "synced"
      ? consistent
        ? "在线 · 哈希一致"
        : "在线 · 哈希校验中"
      : connectionState === "catching_up"
        ? "正在补齐事件"
        : connectionState === "resyncing"
          ? "正在重新同步"
          : connectionState === "legacy"
            ? "旧运行快照兼容"
            : connectionState === "offline"
              ? "离线"
              : "重连中";

  async function setup() {
    if (busy || !identityReady) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.setupPortSimulation(sessionId, {
        expectedStudentCount,
        teamNames: teamNames.slice(0, teamCount),
        challengeId: selectedChallengeId
      });
      onClassroomSnapshot(snapshot);
      setSelectedTeamId(snapshot.simulation?.teams[0]?.teamId);
      setNotice("小组港口已建立，学生可以选组并认领岗位。" );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveTeamConfiguration() {
    if (!simulation || busy) return;
    setBusy(true);
    setError("");
    try {
      const configuredStudents = configurationCapacities.reduce(
        (sum, capacity) => sum + capacity,
        0
      );
      const snapshot = await api.configurePortSimulationTeams(sessionId, {
        expectedStudentCount:
          configuredStudents + simulation.classroomObserverCount,
        teamNames: configurationNames,
        teamCapacities: configurationCapacities
      });
      onClassroomSnapshot(snapshot);
      setNotice("开局前的小组名称与容量已更新。");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function control(
    input: Parameters<typeof api.controlPortSimulation>[1]
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.controlPortSimulation(sessionId, input);
      onClassroomSnapshot(snapshot);
      setNotice(
        input.type === "start"
          ? "所有小组已同步开局。"
          : input.type === "pause"
            ? "所有小组的权威时钟已暂停。"
            : input.type === "resume"
              ? "所有小组已继续运行。"
              : input.type === "complete"
                ? "本轮已结束，可以开展组间复盘。"
                : input.type === "reset"
                  ? "全部小组已重置到相同初始条件。"
                  : `仿真速度已切换为 ${input.timeScale}×。`
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function teacherCommand(command: PortSimulationCommand) {
    if (!selectedTeamId || !teamSnapshot || busy) return;
    if (!commandEnabled) {
      setError("所选小组尚未达到状态一致，教师接管命令已暂时禁用。" );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const requestId = `teacher-command-${crypto.randomUUID()}`;
      if (teamSnapshot.syncMode === "event_stream_v1") {
        const result = await api.sendPortSimulationTeacherCommandV2(
          sessionId,
          selectedTeamId,
          {
            requestId,
            runId: teamSnapshot.runId,
            expectedRevision: teamSnapshot.revision,
            lastAppliedSequence: teamSnapshot.latestSequence,
            baseStateHash: teamSnapshot.stateHash,
            role: takeoverRole,
            command
          }
        );
        if (result.status === "resync_required") forceResync();
        setNotice(`教师接管已记录：${result.message}`);
      } else {
        const response = await api.sendPortSimulationTeacherCommand(
          sessionId,
          selectedTeamId,
          {
            requestId,
            expectedRevision: teamSnapshot.revision,
            role: takeoverRole,
            command
          }
        );
        acceptServerSnapshot(response.snapshot);
        setNotice(`教师接管已记录：${response.result.message}`);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseRole(role: PortSimulationRole) {
    if (!selectedTeamId || busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.teacherReleasePortSimulationRole(
        sessionId,
        selectedTeamId,
        role
      );
      acceptServerSnapshot(snapshot);
      setNotice(`${PORT_SIMULATION_ROLE_LABELS[role]}岗位已由教师释放。`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseSupportRole(role: PortSimulationSupportRole) {
    if (!selectedTeamId || busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.teacherReleasePortSimulationSupportSeat(
        sessionId,
        selectedTeamId,
        role
      );
      acceptServerSnapshot(snapshot);
      setNotice(`${PORT_SIMULATION_SUPPORT_ROLE_LABELS[role]}协作席已由教师释放。`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!simulation) {
    return (
      <section className="port-teacher-setup" aria-label="建立港口仿真小组">
        <header>
          <span>PORT SIMULATION · V0.05</span>
          <h2>建立情境挑战赛</h2>
          <p>所有小组使用相同案例和事件脚本；排行榜按安全、任务、周转、资源、恢复与协作进行可解释计分。</p>
        </header>
        <fieldset className="port-teacher-setup__challenges">
          <legend>选择本轮挑战</legend>
          {PORT_SIMULATION_CHALLENGES.map((challenge) => (
            <label
              key={challenge.id}
              data-selected={selectedChallengeId === challenge.id}
            >
              <input
                type="radio"
                name="port-challenge"
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
        <label>
          预计学生人数
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
        </label>
        <p className="port-teacher-setup__plan" role="status">
          自动生成 {teamCount} 组：{plannedCapacities.join("、")} 人
          {expectedStudentCount === 7
            ? "；7 人无法全部拆为 4–6 人组，采用 6 人运行组 + 1 名课堂观察员"
            : "；余数优先分配到前面小组"}
        </p>
        <div className="port-teacher-setup__names">
          {teamNames.slice(0, teamCount).map((name, index) => (
            <label key={index}>
              小组 {index + 1} · {plannedCapacities[index]} 人
              <input
                value={name}
                maxLength={24}
                onChange={(event) =>
                  setTeamNames((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    )
                  )
                }
              />
            </label>
          ))}
        </div>
        <button type="button" disabled={busy || !identityReady} onClick={() => void setup()}>
          {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <UsersRound aria-hidden="true" />}
          建立小组并开放岗位认领
        </button>
      </section>
    );
  }

  const activeChallenge = getPortSimulationChallenge(simulation.challengeId);
  const selectedTeamSummary = simulation.teams.find(
    (team) => team.teamId === selectedTeamId
  );
  const leaderboardTeams = [...simulation.teams]
    .filter((team) =>
      leaderboardMode === "improvement" ? team.improvementRank !== null : true
    )
    .sort((left, right) => {
      if (leaderboardMode === "staffing") {
        return (
          left.memberCapacity - right.memberCapacity ||
          (left.staffingRank ?? Number.MAX_SAFE_INTEGER) -
            (right.staffingRank ?? Number.MAX_SAFE_INTEGER)
        );
      }
      const leftRank =
        leaderboardMode === "improvement"
          ? left.improvementRank
          : left.overallRank;
      const rightRank =
        leaderboardMode === "improvement"
          ? right.improvementRank
          : right.overallRank;
      return (
        (leftRank ?? Number.MAX_SAFE_INTEGER) -
          (rightRank ?? Number.MAX_SAFE_INTEGER) ||
        left.teamId.localeCompare(right.teamId)
      );
    });

  return (
    <section className="port-teacher-simulation">
      {(error || notice) && (
        <div
          className={
            error
              ? "port-simulation-notice port-simulation-notice--error"
              : "port-simulation-notice"
          }
          role="status"
        >
          {error ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || notice}</span>
          <button type="button" aria-label="关闭提示" onClick={() => { setError(""); setNotice(""); }}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="port-challenge-briefing" aria-label="本轮挑战任务">
        <header>
          <div>
            <span>V0.05 · {activeChallenge.difficulty}挑战</span>
            <h2>{activeChallenge.title}</h2>
          </div>
          <strong>{activeChallenge.durationLabel}</strong>
        </header>
        <p>{activeChallenge.publicBriefing}</p>
        <div className="port-challenge-briefing__grid">
          <article>
            <Target aria-hidden="true" />
            <div>
              <strong>本轮任务</strong>
              {activeChallenge.missions.map((mission) => (
                <p key={mission.id}>
                  <b>{mission.title}</b> · {mission.description}
                </p>
              ))}
            </div>
          </article>
          <article>
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>一致事件条件</strong>
              <p>{activeChallenge.eventBriefing}</p>
            </div>
          </article>
        </div>
      </section>

      {preflight ? (
        <section className="port-simulation-preflight" aria-label="课堂启动前检查">
          <header>
            <div>
              <span>课堂启动前检查</span>
              <strong>{preflight.ready ? "基础运行条件可用" : "存在必须处理的问题"}</strong>
            </div>
            <small>
              {preflight.identitySource === "development" ? "开发身份" : "教学信息系统身份"} · SQLite WAL · SSE
            </small>
          </header>
          <div>
            {preflight.checks.map((check) => (
              <article key={check.id} data-status={check.status}>
                <strong>{check.label}</strong>
                <span>{check.message}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {simulation.teams.every((team) => ["lobby", "ready"].includes(team.status)) ? (
        <section className="port-team-configuration" aria-label="开局前小组配置">
          <header>
            <div>
              <span>开局前可调整</span>
              <strong>组名与 4–6 人容量</strong>
            </div>
            <button type="button" disabled={busy} onClick={() => void saveTeamConfiguration()}>
              保存小组配置
            </button>
          </header>
          <div>
            {simulation.teams.map((team, index) => (
              <article key={team.teamId}>
                <input
                  aria-label={`${team.teamName}名称`}
                  maxLength={24}
                  value={configurationNames[index] ?? team.teamName}
                  onChange={(event) =>
                    setConfigurationNames((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index ? event.target.value : value
                      )
                    )
                  }
                />
                <select
                  aria-label={`${team.teamName}容量`}
                  value={configurationCapacities[index] ?? team.memberCapacity}
                  onChange={(event) =>
                    setConfigurationCapacities((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index
                          ? (Number(event.target.value) as PortSimulationMemberCapacity)
                          : value
                      )
                    )
                  }
                >
                  <option value={4}>4 人</option>
                  <option value={5}>5 人</option>
                  <option value={6}>6 人</option>
                </select>
                <span>已加入 {team.memberCount} 人</span>
              </article>
            ))}
          </div>
          {simulation.classroomObserverCount ? (
            <p>另有 {simulation.classroomObserverCount} 名课堂观察员，不占运行组容量。</p>
          ) : null}
        </section>
      ) : null}

      <header className="port-teacher-controls">
        <div>
          <span>全局课堂控制</span>
          <strong>{allReady ? "全部小组已就绪" : "仍有岗位等待认领"}</strong>
        </div>
        <label>
          <input
            type="checkbox"
            checked={allowIncompleteTeams}
            onChange={(event) => setAllowIncompleteTeams(event.target.checked)}
          />
          允许缺岗开局并记录
        </label>
        <div>
          <button
            type="button"
            disabled={busy || (!allReady && !allowIncompleteTeams)}
            onClick={() => void control({ type: "start", allowIncompleteTeams })}
          >
            <Play aria-hidden="true" /> 同步开始
          </button>
          <button type="button" disabled={busy} onClick={() => void control({ type: "pause" })}>
            <Pause aria-hidden="true" /> 暂停
          </button>
          <button type="button" disabled={busy} onClick={() => void control({ type: "resume" })}>
            <Play aria-hidden="true" /> 继续
          </button>
          {[0.5, 1, 2].map((speed) => (
            <button
              type="button"
              key={speed}
              disabled={busy || simulation.timeScale === speed}
              onClick={() =>
                void control({
                  type: "set_speed",
                  timeScale: speed as 0.5 | 1 | 2
                })
              }
            >
              <Gauge aria-hidden="true" /> {speed}×
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => void control({ type: "complete" })}>
            <Square aria-hidden="true" /> 结束
          </button>
          <button type="button" disabled={busy} onClick={() => void control({ type: "reset" })}>
            <RotateCcw aria-hidden="true" /> 重置
          </button>
        </div>
      </header>

      <section className="port-leaderboard" aria-label="港口挑战排行榜">
        <header>
          <div>
            <Trophy aria-hidden="true" />
            <div>
              <span>CHALLENGE LEADERBOARD</span>
              <h2>港口挑战实时榜</h2>
            </div>
          </div>
          <p>每项得分都可以回到权威状态与事件记录；教师接管局只保留练习成绩。</p>
        </header>
        <nav aria-label="排行榜类别">
          <button
            type="button"
            aria-pressed={leaderboardMode === "overall"}
            onClick={() => setLeaderboardMode("overall")}
          >
            课堂总榜
          </button>
          <button
            type="button"
            aria-pressed={leaderboardMode === "staffing"}
            onClick={() => setLeaderboardMode("staffing")}
          >
            同编制榜
          </button>
          <button
            type="button"
            aria-pressed={leaderboardMode === "improvement"}
            onClick={() => setLeaderboardMode("improvement")}
          >
            进步榜
          </button>
        </nav>
        <div className="port-leaderboard__table" role="table" aria-label="小组实时成绩">
          <div role="row" className="port-leaderboard__head">
            <span role="columnheader">名次</span>
            <span role="columnheader">小组</span>
            <span role="columnheader">成绩</span>
            <span role="columnheader">任务</span>
            <span role="columnheader">安全</span>
            <span role="columnheader">主要等待</span>
          </div>
          {leaderboardTeams.length ? (
            leaderboardTeams.map((team) => {
              const rank =
                leaderboardMode === "overall"
                  ? team.overallRank
                  : leaderboardMode === "staffing"
                    ? team.staffingRank
                    : team.improvementRank;
              return (
                <button
                  type="button"
                  role="row"
                  key={team.teamId}
                  data-selected={selectedTeamId === team.teamId}
                  data-ranking-status={team.scorecard.rankingStatus}
                  onClick={() => setSelectedTeamId(team.teamId)}
                >
                  <span role="cell" className="port-leaderboard__rank">
                    {rank === null ? (
                      "—"
                    ) : rank <= 3 ? (
                      <span className="port-simulation-leaderboard-medal" aria-label={`第${rank}名`}>
                        <Medal aria-hidden="true" />
                        <strong>{rank}</strong>
                      </span>
                    ) : (
                      rank
                    )}
                    {leaderboardMode === "staffing" ? <small>{team.memberCapacity}人组</small> : null}
                  </span>
                  <span role="cell">
                    <strong>{team.teamName}</strong>
                    <small>第{team.attemptNumber}轮 · {team.scorecard.rankingStatus === "practice" ? "练习成绩" : team.scorecard.rankingStatus === "final" ? "最终成绩" : team.overallRank === null && (team.status === "lobby" || team.status === "ready") ? "等待开局" : "暂定成绩"}</small>
                  </span>
                  <span role="cell" className="port-leaderboard__score">
                    <strong>{team.scorecard.totalScore}</strong><small>/1000</small>
                    {leaderboardMode === "improvement" && team.scoreImprovement !== null ? (
                      <em data-positive={team.scoreImprovement >= 0}>
                        {team.scoreImprovement >= 0 ? "+" : ""}{team.scoreImprovement}
                      </em>
                    ) : null}
                  </span>
                  <span role="cell">{16 - team.incompleteTasks}/16批</span>
                  <span role="cell">拦截{team.rejectedCommands}次</span>
                  <span role="cell">{team.mainDelaySource}<small>{Math.round(team.totalWaitMinutes)}分钟</small></span>
                </button>
              );
            })
          ) : (
            <p className="port-leaderboard__empty">
              完成第一轮并重置后，第二轮成绩将进入进步榜。
            </p>
          )}
        </div>
        {selectedTeamSummary ? (
          <div className="port-leaderboard__breakdown" aria-label={`${selectedTeamSummary.teamName}计分明细`}>
            {selectedTeamSummary.scorecard.breakdown.map((item) => (
              <article key={item.dimension}>
                <header><strong>{item.label}</strong><span>{item.points}/{item.maxPoints}</span></header>
                <progress value={item.points} max={item.maxPoints} />
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="port-team-overview" aria-label="小组运行总览">
        {simulation.teams.map((team) => (
          <button
            type="button"
            key={team.teamId}
            aria-pressed={selectedTeamId === team.teamId}
            onClick={() => setSelectedTeamId(team.teamId)}
          >
            <span>{team.teamName}</span>
            <strong>暂定 {team.scorecard.totalScore} 分 · 总榜 {team.overallRank ?? "—"}</strong>
            <strong>
              {team.memberCount}/{team.memberCapacity} 人 · 主操 {team.occupiedRoles}/4 · 协作 {team.occupiedSupportSeats}/{Math.max(0, team.memberCapacity - 4)}
            </strong>
            <small>时刻 {Math.floor(team.simMinute / 60).toString().padStart(2, "0")}:{Math.floor(team.simMinute % 60).toString().padStart(2, "0")}</small>
            <small>
              {team.syncMode === "event_stream_v1" ? "事件流" : "兼容快照"} · 已确认序号 {team.latestSequence} · 在线版本 {team.presenceRevision}
            </small>
            <em>安全拦截 {team.rejectedCommands} · 队列峰值 {team.gateQueuePeak} · 教师接管 {team.teacherTakeovers}</em>
            <em>
              主要等待 {team.mainDelaySource} · 总等待 {Math.round(team.totalWaitMinutes)} 分钟 · 未完成 {team.incompleteTasks} 批
            </em>
          </button>
        ))}
      </div>

      {teamSnapshot ? (
        <>
          <div className="port-teacher-takeover">
            <span>
              <Radio aria-hidden="true" /> {selectedConnectionLabel}
              {lastSyncLatencyMs === null ? "" : ` · 延迟 ${lastSyncLatencyMs} ms`}
              {` · 重连 ${reconnectCount} 次`}
            </span>
            <label>
              临时接管岗位
              <select
                value={takeoverRole}
                onChange={(event) =>
                  setTakeoverRole(event.target.value as PortSimulationRole)
                }
              >
                {teamSnapshot.roleSeats.map((seat) => (
                  <option key={seat.role} value={seat.role}>
                    {PORT_SIMULATION_ROLE_LABELS[seat.role]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              {teamSnapshot.syncMode === "event_stream_v1" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void api
                      .forcePortSimulationResync(sessionId, teamSnapshot.teamId)
                      .then(() => forceResync())
                      .catch((reason) => setError((reason as Error).message));
                  }}
                >
                  强制重新同步
                </button>
              ) : null}
              {teamSnapshot.roleSeats.map((seat) => (
                <button
                  type="button"
                  key={seat.role}
                  disabled={busy || !seat.participantId}
                  onClick={() => void releaseRole(seat.role)}
                >
                  释放{PORT_SIMULATION_ROLE_LABELS[seat.role]}
                </button>
              ))}
              {teamSnapshot.supportSeats.map((seat) => (
                <button
                  type="button"
                  key={seat.role}
                  disabled={busy || !seat.participantId}
                  onClick={() => void releaseSupportRole(seat.role)}
                >
                  释放{PORT_SIMULATION_SUPPORT_ROLE_LABELS[seat.role]}
                </button>
              ))}
            </div>
          </div>
          <PortSimulationWorkspace
            snapshot={teamSnapshot}
            role={takeoverRole}
            commandBusy={busy || !commandEnabled || teamSnapshot.status !== "running"}
            connectionLabel={`教师观察与人工接管 · ${selectedConnectionLabel}`}
            onCommand={teacherCommand}
          />
        </>
      ) : (
        <div className="port-teacher-loading">
          <LoaderCircle className="spin" aria-hidden="true" /> 正在装载所选小组
        </div>
      )}
    </section>
  );
}
