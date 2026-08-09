import type {
  ClassroomSnapshot,
  PortSimulationCollaborationItem,
  PortSimulationCommand,
  PortSimulationRole,
  PortSimulationSupportRole
} from "@edu/contracts";
import {
  PORT_SIMULATION_ROLE_LABELS,
  PORT_SIMULATION_SUPPORT_ROLE_LABELS,
  getPortSimulationChallenge
} from "@edu/port-simulation-core";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Radio,
  Target,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import {
  PORT_SIMULATION_RUN_STATUS_LABELS,
  PortSimulationWorkspace
} from "./PortSimulationWorkspace";
import { usePortSimulationTeamSync } from "./usePortSimulationTeamSync";

interface SavedRoleClaim {
  teamId: string;
  role: PortSimulationRole;
  roleSeatToken: string;
}

interface SavedSupportClaim {
  teamId: string;
  role: PortSimulationSupportRole;
  supportSeatToken: string;
}

export interface StudentPortSimulationProps {
  sessionId: string;
  participantId: string;
  classroomSnapshot: ClassroomSnapshot;
}

function claimStorageKey(sessionId: string) {
  return `edu-port-simulation-role:${sessionId}`;
}

function supportClaimStorageKey(sessionId: string) {
  return `edu-port-simulation-support-role:${sessionId}`;
}

function teamStorageKey(sessionId: string) {
  return `edu-port-simulation-team:${sessionId}`;
}

function readSavedClaim(sessionId: string): SavedRoleClaim | null {
  try {
    const raw = window.sessionStorage.getItem(claimStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedRoleClaim;
  } catch {
    return null;
  }
}

function readSavedSupportClaim(sessionId: string): SavedSupportClaim | null {
  try {
    const raw = window.sessionStorage.getItem(supportClaimStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedSupportClaim;
  } catch {
    return null;
  }
}

function readSavedTeam(sessionId: string): string | null {
  try {
    return window.sessionStorage.getItem(teamStorageKey(sessionId));
  } catch {
    return null;
  }
}

export function StudentPortSimulation({
  sessionId,
  participantId,
  classroomSnapshot
}: StudentPortSimulationProps) {
  const [savedClaim, setSavedClaim] = useState<SavedRoleClaim | null>(() =>
    readSavedClaim(sessionId)
  );
  const [savedSupportClaim, setSavedSupportClaim] =
    useState<SavedSupportClaim | null>(() => readSavedSupportClaim(sessionId));
  const [teamId, setTeamId] = useState<string | null>(
    () =>
      readSavedClaim(sessionId)?.teamId ??
      readSavedSupportClaim(sessionId)?.teamId ??
      readSavedTeam(sessionId)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [proposalTargetRole, setProposalTargetRole] =
    useState<PortSimulationRole>("berth_operations");
  const [commandDraft, setCommandDraft] =
    useState<PortSimulationCommand | null>(null);
  const simulation = classroomSnapshot.simulation;
  const challenge = simulation
    ? getPortSimulationChallenge(simulation.challengeId)
    : null;
  const {
    snapshot: teamSnapshot,
    connectionState,
    consistent,
    commandEnabled,
    forceResync,
    acceptServerSnapshot
  } = usePortSimulationTeamSync(sessionId, teamId ?? undefined);
  const connectionLabel =
    connectionState === "synced"
      ? consistent
        ? "在线 · 状态一致"
        : "在线 · 正在校验"
      : connectionState === "catching_up"
        ? "正在补齐权威事件"
        : connectionState === "resyncing"
          ? "正在重新同步检查点"
          : connectionState === "reconnecting"
            ? "连接中断 · 正在重连"
            : connectionState === "offline"
              ? "离线 · 仅可查看最后确认状态"
              : connectionState === "legacy"
                ? "旧运行 · 快照兼容模式"
                : "正在建立权威连接";

  useEffect(() => {
    if (
      !teamId ||
      !savedClaim ||
      savedClaim.teamId !== teamId ||
      ["completed", "aborted"].includes(teamSnapshot?.status ?? "")
    ) {
      return undefined;
    }
    let active = true;
    const renewRoleLease = async () => {
      try {
        await api.renewPortSimulationRoleLease(
          sessionId,
          teamId,
          savedClaim.role,
          savedClaim.roleSeatToken
        );
        if (!active) return;
      } catch (reason) {
        if (!active) return;
        const message = (reason as Error).message;
        if (/其他小组|其他同学|已经结束/u.test(message)) {
          window.sessionStorage.removeItem(claimStorageKey(sessionId));
          setSavedClaim(null);
        }
      }
    };
    void renewRoleLease();
    const timer = window.setInterval(() => void renewRoleLease(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    savedClaim?.role,
    savedClaim?.roleSeatToken,
    savedClaim?.teamId,
    sessionId,
    teamId,
    teamSnapshot?.status
  ]);

  useEffect(() => {
    if (
      !teamId ||
      !savedSupportClaim ||
      savedSupportClaim.teamId !== teamId ||
      ["completed", "aborted"].includes(teamSnapshot?.status ?? "")
    ) {
      return undefined;
    }
    let active = true;
    const renewSupportLease = async () => {
      try {
        await api.renewPortSimulationSupportLease(
          sessionId,
          teamId,
          savedSupportClaim.role,
          savedSupportClaim.supportSeatToken
        );
        if (!active) return;
      } catch (reason) {
        if (!active) return;
        const message = (reason as Error).message;
        if (/其他小组|其他同学|已经结束|当前小组容量/u.test(message)) {
          window.sessionStorage.removeItem(supportClaimStorageKey(sessionId));
          setSavedSupportClaim(null);
        }
      }
    };
    void renewSupportLease();
    const timer = window.setInterval(() => void renewSupportLease(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    savedSupportClaim?.role,
    savedSupportClaim?.supportSeatToken,
    savedSupportClaim?.teamId,
    sessionId,
    teamId,
    teamSnapshot?.status
  ]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeRole = useMemo(() => {
    if (!savedClaim || savedClaim.teamId !== teamId) return undefined;
    const seat = teamSnapshot?.roleSeats.find(
      (item) =>
        item.role === savedClaim.role &&
        item.participantId === participantId
    );
    return seat ? savedClaim.role : undefined;
  }, [participantId, savedClaim, teamId, teamSnapshot?.roleSeats]);

  const activeSupportRole = useMemo(() => {
    if (!savedSupportClaim || savedSupportClaim.teamId !== teamId) {
      return undefined;
    }
    const seat = teamSnapshot?.supportSeats.find(
      (item) =>
        item.role === savedSupportClaim.role &&
        item.participantId === participantId
    );
    return seat ? savedSupportClaim.role : undefined;
  }, [participantId, savedSupportClaim, teamId, teamSnapshot?.supportSeats]);

  async function joinTeam(nextTeamId: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.joinPortSimulationTeam(
        sessionId,
        nextTeamId
      );
      window.sessionStorage.setItem(teamStorageKey(sessionId), nextTeamId);
      setTeamId(nextTeamId);
      acceptServerSnapshot(snapshot);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimRole(role: PortSimulationRole) {
    if (!teamId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.claimPortSimulationRole(
        sessionId,
        teamId,
        role
      );
      const claim = {
        teamId,
        role,
        roleSeatToken: response.roleSeatToken
      } satisfies SavedRoleClaim;
      window.sessionStorage.setItem(
        claimStorageKey(sessionId),
        JSON.stringify(claim)
      );
      window.sessionStorage.setItem(teamStorageKey(sessionId), teamId);
      setSavedClaim(claim);
      acceptServerSnapshot(response.snapshot);
      setNotice(`已认领${PORT_SIMULATION_ROLE_LABELS[role]}岗位。`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseRole() {
    if (!teamId || !savedClaim || busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.releasePortSimulationRole(
        sessionId,
        teamId,
        savedClaim.role,
        savedClaim.roleSeatToken
      );
      window.sessionStorage.removeItem(claimStorageKey(sessionId));
      setSavedClaim(null);
      acceptServerSnapshot(snapshot);
      setNotice("岗位已经释放，可由其他同学认领。");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimSupportRole(role: PortSimulationSupportRole) {
    if (!teamId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.claimPortSimulationSupportSeat(
        sessionId,
        teamId,
        role
      );
      const claim = {
        teamId,
        role,
        supportSeatToken: response.supportSeatToken
      } satisfies SavedSupportClaim;
      window.sessionStorage.setItem(
        supportClaimStorageKey(sessionId),
        JSON.stringify(claim)
      );
      window.sessionStorage.setItem(teamStorageKey(sessionId), teamId);
      setSavedSupportClaim(claim);
      acceptServerSnapshot(response.snapshot);
      setNotice(`已认领${PORT_SIMULATION_SUPPORT_ROLE_LABELS[role]}协作席。`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseSupportRole() {
    if (!teamId || !savedSupportClaim || busy) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.releasePortSimulationSupportSeat(
        sessionId,
        teamId,
        savedSupportClaim.role,
        savedSupportClaim.supportSeatToken
      );
      window.sessionStorage.removeItem(supportClaimStorageKey(sessionId));
      setSavedSupportClaim(null);
      acceptServerSnapshot(snapshot);
      setNotice("协作席已经释放，可由其他同学认领。");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function draftForRole(role: PortSimulationRole): PortSimulationCommand {
    const vessel = teamSnapshot?.vessels.find(
      (item) => item.stage !== "departed"
    ) ?? teamSnapshot?.vessels[0];
    if (role === "marine_control") {
      return {
        type: "marine.assign_services",
        vesselId: vessel?.id ?? "vessel-a",
        pilotId: "pilot-1",
        tugIds: ["tug-1", "tug-2"]
      };
    }
    if (role === "berth_operations") {
      return {
        type: "quay.move_crane",
        craneId: "quay-crane-1",
        targetSlotId: "berth-03-slot-1"
      };
    }
    if (role === "horizontal_transport") {
      return {
        type: "transport.set_priority",
        vesselId: vessel?.id ?? "vessel-a",
        priority: 1
      };
    }
    return { type: "gate.set_lane", laneId: "gate-lane-1", open: true };
  }

  async function submitSupportItem(kind: "proposal" | "risk" | "review") {
    if (!teamId || !teamSnapshot || !savedSupportClaim || busy) return;
    setBusy(true);
    setError("");
    try {
      const requestBase = {
        requestId: `student-collaboration-${crypto.randomUUID()}`,
        participantId,
        supportSeatToken: savedSupportClaim.supportSeatToken,
        expectedCollaborationRevision: teamSnapshot.collaborationRevision
      };
      const item = kind === "proposal"
        ? {
            kind: "command_proposal" as const,
            targetRole: proposalTargetRole,
            entityIds: proposalTargetRole === "berth_operations"
              ? ["quay-crane-1", "berth-03"]
              : ["vessel-a"],
            reasonCode: "sequence_dependency" as const,
            commandDraft: draftForRole(proposalTargetRole)
          }
        : kind === "risk"
          ? {
              kind: "risk_alert" as const,
              targetRole: proposalTargetRole,
              entityIds: proposalTargetRole === "berth_operations"
                ? ["quay-crane-1"]
                : proposalTargetRole === "horizontal_transport"
                  ? ["agv-3"]
                  : ["vessel-a"],
              reasonCode: "safety_interlock" as const
            }
          : {
              kind: "review_marker" as const,
              targetRole: null,
              entityIds: [],
              reasonCode: "safety_interlock" as const
            };
      const response = await api.createPortSimulationCollaborationItem(
        sessionId,
        teamId,
        { ...requestBase, item }
      );
      acceptServerSnapshot(response.snapshot);
      setNotice(response.result.message);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function respondToCollaborationItem(
    item: PortSimulationCollaborationItem,
    action: "accept" | "dismiss"
  ) {
    if (!teamId || !teamSnapshot || !savedClaim || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.respondToPortSimulationCollaborationItem(
        sessionId,
        teamId,
        item.id,
        {
          requestId: `student-collaboration-response-${crypto.randomUUID()}`,
          participantId,
          roleSeatToken: savedClaim.roleSeatToken,
          expectedCollaborationRevision: teamSnapshot.collaborationRevision,
          action
        }
      );
      acceptServerSnapshot(response.snapshot);
      if (action === "accept" && item.commandDraft) {
        setCommandDraft(item.commandDraft);
      }
      setNotice(response.result.message);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCommand(command: PortSimulationCommand) {
    if (!teamId || !savedClaim || !teamSnapshot || busy) return;
    if (!commandEnabled) {
      setError("当前未与权威服务保持一致，正式命令已禁用；仍可查看最后确认状态。" );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const requestId = `student-command-${crypto.randomUUID()}`;
      if (teamSnapshot.syncMode === "event_stream_v1") {
        const result = await api.sendPortSimulationCommandV2(
          sessionId,
          teamId,
          {
            requestId,
            runId: teamSnapshot.runId,
            roleSeatToken: savedClaim.roleSeatToken,
            expectedRevision: teamSnapshot.revision,
            lastAppliedSequence: teamSnapshot.latestSequence,
            baseStateHash: teamSnapshot.stateHash,
            command
          }
        );
        if (result.status === "resync_required") forceResync();
        setNotice(result.message);
      } else {
        const response = await api.sendPortSimulationCommand(
          sessionId,
          teamId,
          {
            requestId,
            roleSeatToken: savedClaim.roleSeatToken,
            expectedRevision: teamSnapshot.revision,
            command
          }
        );
        acceptServerSnapshot(response.snapshot);
        setNotice(response.result.message);
      }
    } catch (reason) {
      const message = (reason as Error).message;
      setError(message);
      if (/岗位凭证/u.test(message)) {
        window.sessionStorage.removeItem(claimStorageKey(sessionId));
        setSavedClaim(null);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!simulation) {
    return (
      <section className="port-student-simulation port-student-simulation--empty">
        <LoaderCircle className="spin" aria-hidden="true" />
        <h1>等待教师开启港口仿真</h1>
        <p>教师建立小组后，你可以进入自己的固定小组并认领岗位。</p>
      </section>
    );
  }

  if (!teamId) {
    return (
      <section className="port-student-simulation port-student-simulation--lobby">
        <header>
          <span>情境挑战与可解释排行榜 · V0.05</span>
          <h1>进入你的固定小组</h1>
          <p>{challenge?.title ?? "港口挑战赛"} · 每组 4–6 人，正式成绩按团队整体结果计算。</p>
        </header>
        {error && (
          <div
            className="port-simulation-notice port-simulation-notice--error"
            role="alert"
          >
            <CircleAlert aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="port-team-picker" role="group" aria-label="课堂仿真小组">
          {simulation.teams.map((team) => (
            <button
              type="button"
              key={team.teamId}
              disabled={busy}
              onClick={() => void joinTeam(team.teamId)}
            >
              <UsersRound aria-hidden="true" />
              <strong>{team.teamName}</strong>
              <span>
                {team.memberCount}/{team.memberCapacity} 人 · 主操 {team.occupiedRoles}/4 · 协作 {team.occupiedSupportSeats}/{Math.max(0, team.memberCapacity - 4)}
              </span>
              <em>{PORT_SIMULATION_RUN_STATUS_LABELS[team.status]}</em>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!teamSnapshot) {
    return (
      <section className="port-student-simulation port-student-simulation--empty">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>{error || "正在连接小组港口状态"}</p>
      </section>
    );
  }

  return (
    <section className="port-student-simulation">
      {(error || notice) && (
        <div
          className={
            error
              ? "port-simulation-notice port-simulation-notice--error"
              : "port-simulation-notice"
          }
          role="status"
        >
          {error ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || notice}</span>
        </div>
      )}

      {challenge && simulation ? (
        <section className="port-student-challenge" aria-label="本轮挑战与实时榜">
          <div className="port-student-challenge__brief">
            <header>
              <Target aria-hidden="true" />
              <div>
                <span>V0.05 · {challenge.difficulty}</span>
                <h1>{challenge.title}</h1>
              </div>
            </header>
            <p>{challenge.publicBriefing}</p>
            <div>
              {challenge.missions.map((mission) => (
                <article key={mission.id}>
                  <strong>{mission.title}</strong>
                  <span>{mission.description}</span>
                </article>
              ))}
            </div>
          </div>
          <div className="port-student-challenge__ranking">
            <header><Trophy aria-hidden="true" /><strong>课堂实时榜</strong><span>{simulation.teams.every((team) => team.status === "lobby" || team.status === "ready") ? "开局后显示" : "暂定成绩"}</span></header>
            <ol>
              {(() => {
                const rankedTeams = [...simulation.teams]
                .filter((team) => team.overallRank !== null)
                .sort((left, right) => (left.overallRank ?? 99) - (right.overallRank ?? 99))
                .slice(0, 5);
                return rankedTeams.length ? rankedTeams.map((team) => (
                  <li key={team.teamId} data-own-team={team.teamId === teamId}>
                    <b>{team.overallRank}</b>
                    <span>{team.teamName}</span>
                    <strong>{team.scorecard.totalScore}</strong>
                  </li>
                )) : <li className="port-student-challenge__ranking-empty">各组开局后显示实时名次</li>;
              })()}
            </ol>
            {simulation.teams.find((team) => team.teamId === teamId) ? (
              <p>
                本组第{simulation.teams.find((team) => team.teamId === teamId)?.overallRank ?? "—"}名 ·
                第{simulation.teams.find((team) => team.teamId === teamId)?.attemptNumber ?? 1}轮
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {!activeRole && !activeSupportRole ? (
        <>
          <div className="port-role-lobby">
            <header>
              <button
                type="button"
                disabled={!["lobby", "ready"].includes(teamSnapshot.status)}
                onClick={() => {
                  window.sessionStorage.removeItem(teamStorageKey(sessionId));
                  setTeamId(null);
                }}
              >
                <ArrowLeft aria-hidden="true" /> 返回选组
              </button>
              <div>
                <span>{teamSnapshot.teamName}</span>
                <h1>认领唯一主操或协作席</h1>
              </div>
              <em><Radio aria-hidden="true" /> {connectionLabel}</em>
            </header>
            <div>
              {teamSnapshot.roleSeats.map((seat) => {
                const occupied = Boolean(seat.participantId && seat.connected);
                return (
                  <article key={seat.role} data-occupied={occupied}>
                    <span>{PORT_SIMULATION_ROLE_LABELS[seat.role]}</span>
                    <p>
                      {seat.role === "marine_control"
                        ? "管理锚地、引航拖轮和主航道放行"
                        : seat.role === "berth_operations"
                          ? "分配泊位、岸桥并决定装卸开工"
                          : seat.role === "horizontal_transport"
                            ? "配置AGV、运输优先级与充电"
                            : "分配堆场批次并管理闸口通道"}
                    </p>
                    <button
                      type="button"
                      disabled={busy || occupied}
                      onClick={() => void claimRole(seat.role)}
                    >
                      {occupied ? "已由组员认领" : "认领岗位"}
                    </button>
                  </article>
                );
              })}
              {teamSnapshot.supportSeats.map((seat) => {
                const occupied = Boolean(seat.participantId && seat.connected);
                return (
                  <article key={seat.role} data-occupied={occupied} data-support-role={seat.role}>
                    <span>{PORT_SIMULATION_SUPPORT_ROLE_LABELS[seat.role]}</span>
                    <p>
                      {seat.role === "operations_coordinator"
                        ? "提交固定分类的命令方案；目标主操采用后仍须确认发送"
                        : "提交风险提醒和永久复盘标记；提醒不替代引擎安全判定"}
                    </p>
                    <button
                      type="button"
                      disabled={busy || occupied}
                      onClick={() => void claimSupportRole(seat.role)}
                    >
                      {occupied ? "已由组员认领" : "认领协作席"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
          <PortSimulationWorkspace
            snapshot={teamSnapshot}
            connectionLabel={`观察者共享态势 · ${connectionLabel}`}
          />
        </>
      ) : activeRole ? (
        <>
          <div className="port-student-simulation__rolebar">
            <span>我的岗位：<strong>{PORT_SIMULATION_ROLE_LABELS[activeRole]}</strong></span>
            <button type="button" disabled={busy} onClick={() => void releaseRole()}>
              释放岗位
            </button>
          </div>
          {teamSnapshot.collaborationItems.some(
            (item) => item.status === "open" && item.targetRole === activeRole
          ) ? (
            <section className="port-collaboration-inbox" aria-label="待处理协作建议">
              <header><strong>协作席发来的待处理事项</strong><span>采用不会自动执行命令</span></header>
              {teamSnapshot.collaborationItems
                .filter(
                  (item) => item.status === "open" && item.targetRole === activeRole
                )
                .map((item) => (
                  <article key={item.id} data-kind={item.kind}>
                    <div>
                      <strong>
                        {item.kind === "command_proposal" ? "命令方案" : "风险提醒"}
                      </strong>
                      <span>{item.reasonCode} · {item.entityIds.join("、") || "全局"}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respondToCollaborationItem(item, "accept")}
                    >
                      {item.kind === "command_proposal" ? "采用并预填" : "确认收到"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respondToCollaborationItem(item, "dismiss")}
                    >
                      忽略
                    </button>
                  </article>
                ))}
            </section>
          ) : null}
          <PortSimulationWorkspace
            snapshot={teamSnapshot}
            role={activeRole}
            commandBusy={busy || !commandEnabled || teamSnapshot.status !== "running"}
            connectionLabel={`小组状态 · ${connectionLabel}`}
            commandDraft={commandDraft}
            onCommandDraftConsumed={() => setCommandDraft(null)}
            onCommand={sendCommand}
          />
        </>
      ) : activeSupportRole ? (
        <>
          <div className="port-student-simulation__rolebar" data-support-role={activeSupportRole}>
            <span>我的协作席：<strong>{PORT_SIMULATION_SUPPORT_ROLE_LABELS[activeSupportRole]}</strong></span>
            <button type="button" disabled={busy} onClick={() => void releaseSupportRole()}>
              释放协作席
            </button>
          </div>
          <section className="port-collaboration-console" aria-label="协作席工作台">
            <label>
              目标业务主操
              <select
                value={proposalTargetRole}
                onChange={(event) =>
                  setProposalTargetRole(event.target.value as PortSimulationRole)
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
              {activeSupportRole === "operations_coordinator" ? (
                <button type="button" disabled={busy} onClick={() => void submitSupportItem("proposal")}>
                  提交预设命令方案
                </button>
              ) : (
                <>
                  <button type="button" disabled={busy} onClick={() => void submitSupportItem("risk")}>
                    发送安全联锁提醒
                  </button>
                  <button type="button" disabled={busy} onClick={() => void submitSupportItem("review")}>
                    添加永久复盘标记
                  </button>
                </>
              )}
            </div>
            <p>
              {activeSupportRole === "operations_coordinator"
                ? "方案 60 个仿真分钟后过期；目标主操采用后仍须亲自确认发送。"
                : "风险提醒 30 个仿真分钟后转为历史；提醒不阻断合法命令。"}
            </p>
          </section>
          <PortSimulationWorkspace
            snapshot={teamSnapshot}
            connectionLabel={`协作共享态势 · ${connectionLabel}`}
          />
        </>
      ) : null}
    </section>
  );
}
