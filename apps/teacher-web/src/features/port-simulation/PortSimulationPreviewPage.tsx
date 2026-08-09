import type {
  PortSimulationCommand,
  PortSimulationChallengeId,
  PortSimulationCollaborationItem,
  PortSimulationRole,
  PortSimulationSupportRole,
  PortSimulationTeamSnapshot
} from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  PORT_SIMULATION_CHALLENGES,
  PORT_SIMULATION_ROLE_LABELS,
  PORT_SIMULATION_SUPPORT_ROLE_LABELS,
  advancePortSimulation,
  applyPortSimulationCommand,
  createInitialPortSimulationState,
  getPortSimulationChallenge,
  getPortSimulationScenarioForChallenge,
  pausePortSimulation,
  resumePortSimulation,
  setPortSimulationSpeed,
  startPortSimulation,
  type PortSimulationEngineState
} from "@edu/port-simulation-core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  MousePointer2,
  Pause,
  Play,
  ShipWheel,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  InteractivePortScene,
  type InteractivePortSceneHandle,
  type PortSceneEntity
} from "./InteractivePortScene";
import { YANGSHAN_CONTAINER_SCENE } from "./yangshan-container-scene";
import { PortSimulationWorkspace } from "./PortSimulationWorkspace";
import { LocalPortSimulationStage } from "./LocalPortSimulationStage";

const LEGEND_ITEMS = [
  { label: "港池与岸线", tone: "water" },
  { label: "泊位与堆场", tone: "yard" },
  { label: "自动化设备", tone: "equipment" },
  { label: "陆侧通道", tone: "road" }
] as const;

const FEATURE_ITEMS = [
  {
    icon: MousePointer2,
    number: "01",
    title: "自由观察",
    detail: "拖动、缩放并选择港区设施"
  },
  {
    icon: Maximize2,
    number: "02",
    title: "数据驱动",
    detail: "同一画布可承载不同港口场景"
  },
  {
    icon: ShipWheel,
    number: "03",
    title: "生产联系",
    detail: "沿船舶、岸桥、AGV与堆场观察流程"
  }
] as const;

export function PortSimulationPreviewPage() {
  const sceneRef = useRef<InteractivePortSceneHandle>(null);
  const [selectedEntityId, setSelectedEntityId] =
    useState<string | null>("berth-03");
  const [animationPaused, setAnimationPaused] = useState(false);
  const [previewMode, setPreviewMode] = useState<"browse" | "local" | "manual">("local");
  const [manualChallengeId, setManualChallengeId] =
    useState<PortSimulationChallengeId>("joint-watch");
  const manualChallenge = getPortSimulationChallenge(manualChallengeId);
  const manualScenario = useMemo(
    () => getPortSimulationScenarioForChallenge(manualChallengeId),
    [manualChallengeId]
  );
  const [manualRole, setManualRole] =
    useState<PortSimulationRole>("marine_control");
  const [manualSupportRole, setManualSupportRole] =
    useState<PortSimulationSupportRole | null>(null);
  const [manualCapacity, setManualCapacity] = useState<4 | 5 | 6>(4);
  const [manualCollaborationItems, setManualCollaborationItems] = useState<
    PortSimulationCollaborationItem[]
  >([]);
  const [manualCollaborationRevision, setManualCollaborationRevision] =
    useState(1);
  const [manualCommandDraft, setManualCommandDraft] =
    useState<PortSimulationCommand | null>(null);
  const [manualState, setManualState] = useState(() =>
    createInitialPortSimulationState(
      getPortSimulationScenarioForChallenge("joint-watch")
    )
  );
  const [manualNotice, setManualNotice] = useState("等待开始单机排演。");
  const selectedEntity = useMemo(
    () =>
      YANGSHAN_CONTAINER_SCENE.entities.find(
        (entity) => entity.id === selectedEntityId
      ) ?? null,
    [selectedEntityId]
  );

  const handleEntitySelect = (entity: PortSceneEntity | null) => {
    setSelectedEntityId(entity?.id ?? null);
  };

  useEffect(() => {
    if (previewMode !== "manual" || manualState.status !== "running") {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setManualState((current) => {
        if (current.status !== "running" || !current.clock.wallClockAnchor) {
          return current;
        }
        const now = Date.now();
        const elapsedSeconds = Math.max(
          0,
          (now - new Date(current.clock.wallClockAnchor).getTime()) / 1000
        );
        const target =
          current.clock.simMinute + elapsedSeconds * current.clock.timeScale;
        const next = advancePortSimulation(
          current,
          manualScenario,
          target
        );
        if (next.status === "running") {
          next.clock.wallClockAnchor = new Date(now).toISOString();
        }
        return next;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [manualScenario, manualState.status, previewMode]);

  const localSnapshot = useMemo(
    () =>
      createLocalTeamSnapshot(
        manualState,
        manualRole,
        manualCapacity,
        manualSupportRole,
        manualCollaborationItems,
        manualCollaborationRevision,
        manualChallengeId,
        manualChallenge.version
      ),
    [
      manualCapacity,
      manualCollaborationItems,
      manualCollaborationRevision,
      manualChallenge.version,
      manualChallengeId,
      manualRole,
      manualState,
      manualSupportRole
    ]
  );

  const sendLocalCommand = (command: PortSimulationCommand) => {
    setManualState((current) => {
      const outcome = applyPortSimulationCommand(
        current,
        manualScenario,
        manualRole,
        command,
        {
          requestId: `local-${current.revision}-${Date.now()}`,
          actor: "student"
        }
      );
      setManualNotice(outcome.result.message);
      return outcome.state;
    });
  };

  useEffect(() => {
    const hasExpiredItem = manualCollaborationItems.some(
      (item) =>
        item.status === "open" &&
        item.expiresAtSimMinute !== null &&
        item.expiresAtSimMinute <= manualState.clock.simMinute
    );
    if (!hasExpiredItem) return;
    setManualCollaborationItems((current) =>
      current.map((item) =>
        item.status === "open" &&
        item.expiresAtSimMinute !== null &&
        item.expiresAtSimMinute <= manualState.clock.simMinute
          ? { ...item, status: "expired" as const }
          : item
      )
    );
    setManualCollaborationRevision((revision) => revision + 1);
  }, [manualCollaborationItems, manualState.clock.simMinute]);

  const submitLocalCollaborationItem = (
    supportRole: PortSimulationSupportRole
  ) => {
    const nowMinute = manualState.clock.simMinute;
    const commandProposal = supportRole === "operations_coordinator";
    const item: PortSimulationCollaborationItem = {
      id: `local-collaboration-${crypto.randomUUID()}`,
      kind: commandProposal ? "command_proposal" : "risk_alert",
      supportRole,
      targetRole: "berth_operations",
      entityIds: commandProposal
        ? ["quay-crane-1", "berth-03"]
        : ["quay-crane-5"],
      reasonCode: commandProposal ? "sequence_dependency" : "crane_matching",
      ...(commandProposal
        ? {
            commandDraft: {
              type: "quay.move_crane" as const,
              craneId: "quay-crane-1",
              targetSlotId: "berth-03-slot-1"
            }
          }
        : {}),
      status: "open",
      createdByParticipantId: "local-student",
      createdAtSimMinute: nowMinute,
      expiresAtSimMinute: nowMinute + (commandProposal ? 60 : 30),
      respondedByParticipantId: null,
      respondedAtSimMinute: null
    };
    setManualCollaborationItems((current) => [...current, item]);
    setManualCollaborationRevision((revision) => revision + 1);
    setManualNotice(
      commandProposal
        ? "方案已发给泊位与岸桥主操；请切换岗位采用并确认。"
        : "风险提醒已标记岸桥 QC-05，30 个仿真分钟后转为历史。"
    );
  };

  const respondLocalCollaborationItem = (
    item: PortSimulationCollaborationItem,
    accepted: boolean
  ) => {
    setManualCollaborationItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              status: accepted ? "accepted" : "dismissed",
              respondedByParticipantId: "local-student",
              respondedAtSimMinute: manualState.clock.simMinute
            }
          : candidate
      )
    );
    setManualCollaborationRevision((revision) => revision + 1);
    if (accepted && item.commandDraft) setManualCommandDraft(item.commandDraft);
    setManualNotice(
      accepted
        ? "方案已采用并预填，但尚未改变港口业务状态。"
        : "协作项已忽略。"
    );
  };

  return (
    <main className="port-preview">
      <header className="port-preview__topbar">
        <a href="/" aria-label="返回教学中枢">
          <span className="port-preview__brand-mark" aria-hidden="true">
            <ShipWheel />
          </span>
          EDU SYS
          <span>COMPONENT LAB</span>
        </a>
        <div>
          <i aria-hidden="true" />
          独立组件预览
        </div>
      </header>

      <section className="port-preview__intro">
        <div>
          <p>PORT SIMULATION · V1.0 LOCAL SOLO</p>
          <h1>登录一次，在本机接管港口全流程</h1>
          <span>
            从海域、陆域、锚地、航道和腹地接口进入码头，沿船舶、泊位、设备、堆场与闸口观察连续交接。
          </span>
        </div>
        <dl aria-label="公开参考规模">
          <div>
            <dt>公开泊位</dt>
            <dd>7</dd>
          </div>
          <div>
            <dt>公开岸线</dt>
            <dd>2350 m</dd>
          </div>
          <div>
            <dt>场景版本</dt>
            <dd>0.0.3</dd>
          </div>
        </dl>
      </section>

      <nav className="port-preview__mode-tabs" aria-label="预览模式">
        <button
          type="button"
          aria-pressed={previewMode === "local"}
          onClick={() => setPreviewMode("local")}
        >
          V1.0 本地单机
        </button>
        <button
          type="button"
          aria-pressed={previewMode === "browse"}
          onClick={() => setPreviewMode("browse")}
        >
          浏览演示
        </button>
        <button
          type="button"
          aria-pressed={previewMode === "manual"}
          onClick={() => setPreviewMode("manual")}
        >
          V0.05 协同兼容
        </button>
      </nav>

      {previewMode === "local" ? (
        <LocalPortSimulationStage
          actorId="component-preview"
          actorDisplayName="组件验收学生"
          storageScope="component-preview"
          initialChallengeId="joint-watch"
          sourceLabel="组件预览身份"
        />
      ) : previewMode === "manual" ? (
        <section className="port-preview__manual" aria-label="单机纯手动排演">
          <header>
            <label>
              挑战案例
              <select
                value={manualChallengeId}
                disabled={manualState.status === "running"}
                onChange={(event) => {
                  const challengeId = event.target.value as PortSimulationChallengeId;
                  const scenario = getPortSimulationScenarioForChallenge(challengeId);
                  setManualChallengeId(challengeId);
                  setManualState(createInitialPortSimulationState(scenario));
                  setManualCollaborationItems([]);
                  setManualCollaborationRevision((revision) => revision + 1);
                  setManualNotice(`已切换到“${getPortSimulationChallenge(challengeId).title}”。`);
                }}
              >
                {PORT_SIMULATION_CHALLENGES.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.difficulty} · {challenge.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              小组席位
              <select
                value={manualCapacity}
                onChange={(event) => {
                  const capacity = Number(event.target.value) as 4 | 5 | 6;
                  setManualCapacity(capacity);
                  if (
                    capacity === 4 ||
                    (capacity === 5 && manualSupportRole === "safety_reviewer")
                  ) {
                    setManualSupportRole(null);
                  }
                }}
              >
                <option value={4}>4 人 · 四个主操</option>
                <option value={5}>5 人 · 加计划协调员</option>
                <option value={6}>6 人 · 再加安全与复盘员</option>
              </select>
            </label>
            <label>
              当前席位
              <select
                value={manualSupportRole ?? manualRole}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === "operations_coordinator" ||
                    value === "safety_reviewer"
                  ) {
                    setManualSupportRole(value);
                  } else {
                    setManualSupportRole(null);
                    setManualRole(value as PortSimulationRole);
                  }
                }}
              >
                {PORT_MANUAL_DUAL_VESSEL_SCENARIO.roles.map((role) => (
                  <option key={role} value={role}>
                    {PORT_SIMULATION_ROLE_LABELS[role]}
                  </option>
                ))}
                {manualCapacity >= 5 ? (
                  <option value="operations_coordinator">计划协调员</option>
                ) : null}
                {manualCapacity >= 6 ? (
                  <option value="safety_reviewer">安全与复盘员</option>
                ) : null}
              </select>
            </label>
            <div>
              {manualState.status === "lobby" || manualState.status === "ready" ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualState((current) =>
                      startPortSimulation(current, new Date().toISOString())
                    );
                    setManualNotice("纯手动时钟已开始；系统不会代替任何岗位分配资源。");
                  }}
                >
                  <Play aria-hidden="true" /> 开始排演
                </button>
              ) : manualState.status === "running" ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualState((current) =>
                      pausePortSimulation(current, "单机排演已暂停。")
                    );
                    setManualNotice("权威仿真时钟已暂停。");
                  }}
                >
                  <Pause aria-hidden="true" /> 暂停时钟
                </button>
              ) : manualState.status === "paused" ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualState((current) =>
                      resumePortSimulation(current, new Date().toISOString())
                    );
                    setManualNotice("权威仿真时钟已继续。");
                  }}
                >
                  <Play aria-hidden="true" /> 继续时钟
                </button>
              ) : null}
              {[0.5, 1, 2].map((speed) => (
                <button
                  type="button"
                  key={speed}
                  disabled={manualState.clock.timeScale === speed}
                  onClick={() => {
                    setManualState((current) =>
                      setPortSimulationSpeed(
                        current,
                        speed as 0.5 | 1 | 2,
                        new Date().toISOString()
                      )
                    );
                    setManualNotice(`排演速度已切换为 ${speed}×。`);
                  }}
                >
                  {speed}×
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setManualState(
                    createInitialPortSimulationState(manualScenario)
                  );
                  setManualNotice("排演已恢复相同初始条件。");
                }}
              >
                重新开始
              </button>
            </div>
            <p role="status">{manualNotice}</p>
          </header>
          {manualSupportRole ? (
            <section className="port-collaboration-console" aria-label="单机协作席工作台">
              <strong>{PORT_SIMULATION_SUPPORT_ROLE_LABELS[manualSupportRole]}</strong>
              <p>协作操作只推进协作版本，不改变业务 revision。</p>
              <button
                type="button"
                onClick={() => submitLocalCollaborationItem(manualSupportRole)}
              >
                {manualSupportRole === "operations_coordinator"
                  ? "向泊位与岸桥主操提交移位方案"
                  : "发送岸桥伸距匹配风险提醒"}
              </button>
            </section>
          ) : manualCollaborationItems.some(
              (item) =>
                item.status === "open" && item.targetRole === manualRole
            ) ? (
            <section className="port-collaboration-inbox" aria-label="单机待处理协作项">
              <header><strong>待处理协作项</strong><span>采用后仅预填</span></header>
              {manualCollaborationItems
                .filter(
                  (item) => item.status === "open" && item.targetRole === manualRole
                )
                .map((item) => (
                  <article key={item.id} data-kind={item.kind}>
                    <div><strong>{item.kind === "command_proposal" ? "岸桥移位方案" : "伸距风险提醒"}</strong><span>{item.reasonCode}</span></div>
                    <button type="button" onClick={() => respondLocalCollaborationItem(item, true)}>
                      {item.commandDraft ? "采用并预填" : "确认收到"}
                    </button>
                    <button type="button" onClick={() => respondLocalCollaborationItem(item, false)}>忽略</button>
                  </article>
                ))}
            </section>
          ) : null}
          <PortSimulationWorkspace
            snapshot={localSnapshot}
            role={manualSupportRole ? undefined : manualRole}
            commandBusy={manualState.status !== "running"}
            connectionLabel="单机排演 · 不写入课堂记录"
            commandDraft={manualCommandDraft}
            onCommandDraftConsumed={() => setManualCommandDraft(null)}
            onCommand={sendLocalCommand}
          />
        </section>
      ) : (
      <section className="port-preview__workspace" aria-label="港口场景工作区">
        <div className="port-preview__stage">
          <div className="port-preview__toolbar" aria-label="场景视图控制">
            <button
              type="button"
              onClick={() => sceneRef.current?.zoomIn()}
              aria-label="放大场景"
            >
              <ZoomIn aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.zoomOut()}
              aria-label="缩小场景"
            >
              <ZoomOut aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.fitScene()}
              aria-label="适应全景"
            >
              <Maximize2 aria-hidden="true" />
            </button>
            <span aria-hidden="true" />
            <button
              type="button"
              className="port-preview__animation-button"
              aria-pressed={animationPaused}
              onClick={() => setAnimationPaused((paused) => !paused)}
            >
              {animationPaused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {animationPaused ? "继续动画" : "暂停动画"}
            </button>
          </div>

          <InteractivePortScene
            ref={sceneRef}
            scene={YANGSHAN_CONTAINER_SCENE}
            selectedEntityId={selectedEntityId}
            animationPaused={animationPaused}
            ariaLabel="港口总体与自动化集装箱码头交互式功能图"
            onEntitySelect={handleEntitySelect}
          />

          <div className="port-preview__legend" aria-label="图例">
            {LEGEND_ITEMS.map((item) => (
              <span key={item.label}>
                <i data-tone={item.tone} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <aside className="port-preview__detail" aria-live="polite">
          <div className="port-preview__detail-heading">
            <span>当前设施</span>
            <strong>{selectedEntity ? "SELECTED" : "OVERVIEW"}</strong>
          </div>
          {selectedEntity ? (
            <>
              <h2>{selectedEntity.label}</h2>
              <p>{selectedEntity.details[1]?.value ?? "港区生产设施"}</p>
              <dl>
                {selectedEntity.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => sceneRef.current?.focusEntity(selectedEntity.id)}
              >
                <Maximize2 aria-hidden="true" />
                聚焦设施
              </button>
            </>
          ) : (
            <div className="port-preview__empty-detail">
              <MousePointer2 aria-hidden="true" />
              <h2>选择一个设施</h2>
              <p>点击泊位、设备、堆场或闸口，查看它在生产流程中的位置。</p>
            </div>
          )}
        </aside>
      </section>

      )}

      <section className="port-preview__features" aria-label="组件能力">
        {FEATURE_ITEMS.map(({ icon: Icon, number, title, detail }) => (
          <article key={number}>
            <span>{number}</span>
            <Icon aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className="port-preview__source">
        <span>公开参考</span>
        <a
          href="https://shangdong.portshanghai.com.cn/gsjjOurCompany/738.jhtml"
          target="_blank"
          rel="noreferrer"
        >
          上港集团尚东分公司 · 洋山四期自动化码头
        </a>
        <p>本页图形均为原创教学示意，不使用卫星图、工程图或港口鸟瞰照片。</p>
      </footer>
    </main>
  );
}

function createLocalTeamSnapshot(
  state: PortSimulationEngineState,
  activeRole: PortSimulationRole,
  memberCapacity: 4 | 5 | 6,
  activeSupportRole: PortSimulationSupportRole | null,
  collaborationItems: readonly PortSimulationCollaborationItem[],
  collaborationRevision: number,
  challengeId: PortSimulationChallengeId,
  challengeVersion: string
): PortSimulationTeamSnapshot {
  const supportRoles = memberCapacity === 4
    ? []
    : memberCapacity === 5
      ? (["operations_coordinator"] as const)
      : (["operations_coordinator", "safety_reviewer"] as const);
  return {
    schemaVersion: "1.1",
    syncMode: "event_stream_v1",
    runId: "local-preview-run",
    challengeId,
    challengeVersion,
    attemptNumber: 1,
    previousBestScore: null,
    latestSequence: 0,
    presenceRevision: 1,
    stateHash: "local-preview",
    sessionId: "local-preview",
    teamId: "local-team",
    teamName: "单机排演",
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    revision: state.revision,
    collaborationRevision,
    memberCount: memberCapacity,
    memberCapacity,
    classroomObserverCount: 0,
    status: state.status,
    clock: state.clock,
    roleSeats: PORT_MANUAL_DUAL_VESSEL_SCENARIO.roles.map((role) => ({
      role,
      participantId: role === activeRole ? "local-student" : null,
      participantDisplayName: role === activeRole ? "单机排演学生" : null,
      claimedAt: null,
      leaseExpiresAt: null,
      connected: role === activeRole
    })),
    supportSeats: supportRoles.map((role) => ({
      role,
      participantId: role === activeSupportRole ? "local-student" : null,
      participantDisplayName:
        role === activeSupportRole ? "单机排演学生" : null,
      claimedAt: null,
      leaseExpiresAt: null,
      connected: role === activeSupportRole
    })),
    collaborationItems: [...collaborationItems],
    vessels: state.vessels,
    resources: state.resources,
    tasks: state.tasks,
    queues: state.queues,
    incidents: state.incidents,
    metrics: state.metrics,
    recentEvents: state.recentEvents
  };
}
