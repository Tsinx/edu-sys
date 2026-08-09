import type {
  PortSimulationCommand,
  PortSimulationResourceKind,
  PortSimulationResourceState,
  PortSimulationResourceStatus,
  PortSimulationRole,
  PortSimulationRunStatus,
  PortSimulationScoreDimension,
  PortSimulationTeamSnapshot,
  PortSimulationVesselStage
} from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  PORT_SIMULATION_ROLE_LABELS,
  calculatePortSimulationScore,
  getPortSimulationChallenge,
  projectPortSimulationEntities
} from "@edu/port-simulation-core";
import {
  AlertTriangle,
  Anchor,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  Container,
  Radio,
  Route,
  Ship,
  Truck,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InteractivePortScene,
  type InteractivePortSceneHandle
} from "./InteractivePortScene";
import type {
  PortSceneEntityHighlight,
  PortSceneEntityProjection
} from "./port-scene-types";
import { YANGSHAN_CONTAINER_SCENE } from "./yangshan-container-scene";

const VESSEL_STAGE_LABELS: Record<PortSimulationVesselStage, string> = {
  scheduled: "计划到港",
  anchorage: "锚地等待",
  inbound: "进港航行",
  berthed: "已靠妥",
  working: "装卸作业",
  ready_departure: "待离港",
  outbound: "离港航行",
  departed: "已离港"
};

export const PORT_SIMULATION_RUN_STATUS_LABELS: Record<
  PortSimulationRunStatus,
  string
> = {
  lobby: "等待组队",
  ready: "岗位就绪",
  running: "运行中",
  paused: "已暂停",
  completed: "已结束",
  aborted: "已中止"
};

const RESOURCE_STATUS_LABELS: Record<PortSimulationResourceStatus, string> = {
  available: "可用",
  assigned: "已分配",
  busy: "执行中",
  charging: "充电中",
  fault: "故障",
  closed: "关闭",
  moving: "移位中"
};

const RESOURCE_DEBRIEF_GROUPS: readonly {
  label: string;
  kinds: readonly PortSimulationResourceKind[];
}[] = [
  { label: "岸桥", kinds: ["quay_crane"] },
  { label: "AGV", kinds: ["agv"] },
  { label: "堆场", kinds: ["yard_block"] },
  { label: "闸口", kinds: ["gate_lane"] }
];

export interface PortSimulationWorkspaceProps {
  snapshot: PortSimulationTeamSnapshot;
  role?: PortSimulationRole;
  executionMode?: "team_authoritative" | "local_solo";
  commandBusy?: boolean;
  connectionLabel?: string;
  commandDraft?: PortSimulationCommand | null;
  onCommandDraftConsumed?: () => void;
  onCommand?: (command: PortSimulationCommand) => void | Promise<void>;
}

function vesselSceneEntityId(vesselId: string) {
  return vesselId === "vessel-b" ? "vessel-approach" : "vessel-alongside";
}

function formatSimTime(simMinute: number) {
  const rounded = Math.max(0, Math.floor(simMinute));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toggleValue(values: readonly string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function formatDuration(value: number) {
  return `${Math.round(value)} 分钟`;
}

function craneTrackPositionAt(
  resource: PortSimulationResourceState,
  simMinute: number
) {
  const crane = resource.quayCrane;
  if (!crane) return null;
  if (
    crane.movementStartPosition === null ||
    crane.targetTrackPosition === null ||
    crane.movementStartedAtSimMinute === null ||
    crane.movementEndsAtSimMinute === null
  ) {
    return crane.trackPosition;
  }
  const progress = Math.max(
    0,
    Math.min(
      1,
      (simMinute - crane.movementStartedAtSimMinute) /
        Math.max(
          0.000_001,
          crane.movementEndsAtSimMinute - crane.movementStartedAtSimMinute
        )
    )
  );
  return (
    crane.movementStartPosition +
    (crane.targetTrackPosition - crane.movementStartPosition) * progress
  );
}

function RoleCommandPanel({
  snapshot,
  role,
  busy,
  onCommand,
  selectedEntityId,
  onResourceSelection,
  onLocate,
  commandDraft,
  onCommandDraftConsumed
}: {
  snapshot: PortSimulationTeamSnapshot;
  role: PortSimulationRole;
  busy: boolean;
  onCommand: (command: PortSimulationCommand) => void | Promise<void>;
  selectedEntityId: string | null;
  onResourceSelection: (
    resourceId: string,
    plannedResourceIds: readonly string[],
    relatedEntityIds: readonly string[]
  ) => void;
  onLocate: (entityId: string) => void;
  commandDraft?: PortSimulationCommand | null;
  onCommandDraftConsumed?: () => void;
}) {
  const activeVessels = snapshot.vessels.filter(
    (vessel) => vessel.stage !== "departed"
  );
  const [vesselId, setVesselId] = useState(
    activeVessels[0]?.id ?? snapshot.vessels[0]?.id ?? "vessel-a"
  );
  const [berthId, setBerthId] = useState("berth-03");
  const [craneIds, setCraneIds] = useState<string[]>([]);
  const [targetSlotId, setTargetSlotId] = useState("berth-03-slot-1");
  const [agvIds, setAgvIds] = useState<string[]>([]);
  const [priority, setPriority] = useState(2);
  const lastPrefilledDraftRef = useRef<PortSimulationCommand | null>(null);
  const unassignedTasks = snapshot.tasks.filter(
    (task) => task.status === "waiting_assignment"
  );
  const releasableTasks = snapshot.tasks.filter(
    (task) =>
      task.status === "completed" && task.releasedAtSimMinute === null
  );
  const [taskId, setTaskId] = useState(unassignedTasks[0]?.id ?? "");
  const [blockId, setBlockId] = useState("yard-block-01");
  const selectedVessel =
    snapshot.vessels.find((vessel) => vessel.id === vesselId) ??
    snapshot.vessels[0];
  const resources = snapshot.resources;
  const cranes = resources.filter((resource) => resource.kind === "quay_crane");
  const agvs = resources.filter((resource) => resource.kind === "agv");
  const berths = resources.filter((resource) => resource.kind === "berth");
  const blocks = resources.filter((resource) => resource.kind === "yard_block");
  const lanes = resources.filter((resource) => resource.kind === "gate_lane");
  const run = (command: PortSimulationCommand) => {
    if (!busy) void onCommand(command);
  };
  const quayTrack =
    snapshot.scenarioVersion === PORT_MANUAL_DUAL_VESSEL_SCENARIO.version
      ? PORT_MANUAL_DUAL_VESSEL_SCENARIO.quayTrack
      : undefined;
  const serviceSlots = quayTrack?.serviceSlots.filter(
    (slot) => slot.berthId === berthId
  ) ?? [];

  useEffect(() => {
    const firstSlot = serviceSlots[0];
    if (
      firstSlot &&
      !serviceSlots.some((slot) => slot.id === targetSlotId)
    ) {
      setTargetSlotId(firstSlot.id);
    }
  }, [serviceSlots, targetSlotId]);

  useEffect(() => {
    if (!selectedEntityId) return;
    const card = document.querySelector<HTMLElement>(
      `[data-resource-card="${CSS.escape(selectedEntityId)}"]`
    );
    card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedEntityId]);

  const choosePlannedResource = (
    currentIds: readonly string[],
    resourceId: string,
    relatedEntityIds: readonly string[],
    update: (next: string[]) => void
  ) => {
    const next = toggleValue(currentIds, resourceId);
    update(next);
    onResourceSelection(resourceId, next, relatedEntityIds);
  };

  useEffect(() => {
    if (!commandDraft) {
      lastPrefilledDraftRef.current = null;
      return;
    }
    if (lastPrefilledDraftRef.current === commandDraft) return;
    lastPrefilledDraftRef.current = commandDraft;
    if ("vesselId" in commandDraft) setVesselId(commandDraft.vesselId);
    if (commandDraft.type === "berth.assign") setBerthId(commandDraft.berthId);
    if (commandDraft.type === "quay.assign_cranes") {
      setCraneIds([...commandDraft.craneIds]);
      const primaryCraneId = commandDraft.craneIds.at(-1);
      if (primaryCraneId) {
        onResourceSelection(
          primaryCraneId,
          commandDraft.craneIds,
          [berthId, vesselSceneEntityId(commandDraft.vesselId)]
        );
      }
    }
    if (commandDraft.type === "quay.move_crane") {
      setCraneIds([commandDraft.craneId]);
      setTargetSlotId(commandDraft.targetSlotId);
      onResourceSelection(commandDraft.craneId, [commandDraft.craneId], [
        commandDraft.targetSlotId
      ]);
    }
    if (commandDraft.type === "transport.assign_agvs") {
      setAgvIds([...commandDraft.agvIds]);
      const primaryAgvId = commandDraft.agvIds.at(-1);
      if (primaryAgvId) {
        onResourceSelection(
          primaryAgvId,
          commandDraft.agvIds,
          [vesselSceneEntityId(commandDraft.vesselId)]
        );
      }
    }
    if (commandDraft.type === "transport.set_priority") {
      setPriority(commandDraft.priority);
    }
    if (commandDraft.type === "yard.assign_block") {
      setTaskId(commandDraft.taskId);
      setBlockId(commandDraft.blockId);
    }
  }, [berthId, commandDraft, onResourceSelection]);

  return (
    <section className="port-runtime__role-panel" aria-label="岗位调度面板">
      <header>
        <div>
          <span>当前岗位</span>
          <strong>{PORT_SIMULATION_ROLE_LABELS[role]}</strong>
        </div>
        <i data-role={role} aria-hidden="true" />
      </header>

      {commandDraft ? (
        <div className="port-runtime__proposal-prefill" role="status">
          <strong>计划协调员方案已预填</strong>
          <span>{commandDraft.type}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              run(commandDraft);
              onCommandDraftConsumed?.();
            }}
          >
            主操确认并发送
          </button>
        </div>
      ) : null}

      {role !== "yard_gate" ? (
        <label>
          作业船舶
          <select
            value={vesselId}
            onChange={(event) => setVesselId(event.target.value)}
          >
            {activeVessels.map((vessel) => (
              <option key={vessel.id} value={vessel.id}>
                {vessel.label} · {VESSEL_STAGE_LABELS[vessel.stage]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {role === "marine_control" && selectedVessel ? (
        <div className="port-runtime__command-stack">
          <p>确认泊位后，为船舶占用唯一引航组和两艘拖轮，再决定是否放行航道。</p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run({
                type: "marine.assign_services",
                vesselId: selectedVessel.id,
                pilotId: "pilot-1",
                tugIds: ["tug-1", "tug-2"]
              })
            }
          >
            <Anchor aria-hidden="true" /> 配置引航与拖轮
          </button>
          <div className="port-runtime__split-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run({
                  type: "marine.authorize_transit",
                  vesselId: selectedVessel.id,
                  direction: "inbound"
                })
              }
            >
              批准进港
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run({
                  type: "marine.authorize_transit",
                  vesselId: selectedVessel.id,
                  direction: "outbound"
                })
              }
            >
              批准离港
            </button>
          </div>
        </div>
      ) : null}

      {role === "berth_operations" && selectedVessel ? (
        <div className="port-runtime__command-stack">
          <label>
            泊位
            <select
              value={berthId}
              onChange={(event) => {
                const nextBerthId = event.target.value;
                setBerthId(nextBerthId);
                onResourceSelection(nextBerthId, craneIds, [
                  nextBerthId,
                  vesselSceneEntityId(selectedVessel.id),
                  ...(quayTrack?.serviceSlots
                    .filter((slot) => slot.berthId === nextBerthId)
                    .map((slot) => slot.id) ?? [])
                ]);
              }}
            >
              {berths.map((berth) => (
                <option key={berth.id} value={berth.id}>
                  {berth.label} · {RESOURCE_STATUS_LABELS[berth.status]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run({ type: "berth.assign", vesselId: selectedVessel.id, berthId })
            }
          >
            <Ship aria-hidden="true" /> 分配所选泊位
          </button>
          <fieldset>
            <legend>岸桥选择（1–4 台）</legend>
            <div className="port-runtime__resource-options">
              {cranes.map((crane) => {
                const quayCrane = crane.quayCrane;
                const currentTrackPosition = craneTrackPositionAt(
                  crane,
                  snapshot.clock.simMinute
                );
                const serviceBerth = quayCrane?.targetSlotId
                  ? quayTrack?.serviceSlots.find(
                      (slot) => slot.id === quayCrane.targetSlotId
                    )?.berthId
                  : crane.assignedTo
                    ? snapshot.vessels.find(
                        (vessel) => vessel.id === crane.assignedTo
                      )?.berthId
                    : null;
                return (
                  <div
                    key={crane.id}
                    className="port-runtime__resource-card"
                    data-resource-card={crane.id}
                    data-map-selected={selectedEntityId === crane.id}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={craneIds.includes(crane.id)}
                        disabled={
                          busy ||
                          (!craneIds.includes(crane.id) && craneIds.length >= 4)
                        }
                        onChange={() =>
                          choosePlannedResource(
                            craneIds,
                            crane.id,
                            [
                              berthId,
                              vesselSceneEntityId(selectedVessel.id),
                              ...serviceSlots.map((slot) => slot.id)
                            ],
                            setCraneIds
                          )
                        }
                      />
                      <span>
                        <strong>{crane.label.replace("岸桥 ", "")}</strong>
                        <small>{RESOURCE_STATUS_LABELS[crane.status]}</small>
                      </span>
                    </label>
                    <button type="button" onClick={() => onLocate(crane.id)}>
                      定位
                    </button>
                    {quayCrane ? (
                      <dl>
                        <div><dt>轨位</dt><dd>{currentTrackPosition?.toFixed(0) ?? "—"}</dd></div>
                        <div><dt>伸距</dt><dd>{quayCrane.outreachClass === "deep_reach" ? "大伸距" : "标准"}</dd></div>
                        <div><dt>目标</dt><dd>{quayCrane.targetTrackPosition?.toFixed(0) ?? "—"}</dd></div>
                        <div><dt>到位</dt><dd>{quayCrane.movementEndsAtSimMinute === null ? "—" : formatSimTime(quayCrane.movementEndsAtSimMinute)}</dd></div>
                        <div><dt>服务</dt><dd>{serviceBerth ?? "未分配"}</dd></div>
                      </dl>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
          {quayTrack ? (
            <div className="port-runtime__crane-move">
              <label>
                目标轨位
                <select
                  value={targetSlotId}
                  onChange={(event) => setTargetSlotId(event.target.value)}
                >
                  {serviceSlots.map((slot) => {
                    const occupyingCrane = cranes.find(
                      (crane) =>
                        crane.quayCrane?.trackPosition === slot.position &&
                        crane.status !== "moving"
                    );
                    const selectedCrane = cranes.find(
                      (crane) => crane.id === craneIds.at(-1)
                    );
                    const compatible = selectedCrane
                      ? selectedVessel.requiredOutreachClass === "standard" ||
                        selectedCrane.quayCrane?.outreachClass === "deep_reach"
                      : true;
                    const condition = occupyingCrane && occupyingCrane.id !== selectedCrane?.id
                      ? `被 ${occupyingCrane.label.replace("岸桥 ", "")} 占用`
                      : !compatible
                        ? "伸距不兼容"
                        : selectedCrane?.quayCrane?.trackPosition === slot.position
                          ? "可用"
                          : "需移位";
                    return (
                      <option key={slot.id} value={slot.id}>
                        轨位 {slot.position} · {condition}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                disabled={busy || !craneIds.at(-1) || !targetSlotId}
                onClick={() => {
                  const craneId = craneIds.at(-1);
                  if (craneId) {
                    run({ type: "quay.move_crane", craneId, targetSlotId });
                  }
                }}
              >
                规划并下达岸桥移位
              </button>
              <p>岸桥须先到达泊位服务轨位；轨道顺序、15 单位间距和伸距由系统硬约束。</p>
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy || craneIds.length === 0}
            onClick={() =>
              run({
                type: "quay.assign_cranes",
                vesselId: selectedVessel.id,
                craneIds
              })
            }
          >
            分配岸桥
          </button>
          <div className="port-runtime__split-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run({ type: "quay.start_cargo", vesselId: selectedVessel.id })
              }
            >
              开始装卸
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run({ type: "berth.release", vesselId: selectedVessel.id })
              }
            >
              泊位放行
            </button>
          </div>
        </div>
      ) : null}

      {role === "horizontal_transport" && selectedVessel ? (
        <div className="port-runtime__command-stack">
          <fieldset>
            <legend>AGV 选择</legend>
            <div className="port-runtime__resource-options">
              {agvs.map((agv) => (
                <div
                  key={agv.id}
                  className="port-runtime__resource-card"
                  data-resource-card={agv.id}
                  data-map-selected={selectedEntityId === agv.id}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={agvIds.includes(agv.id)}
                      disabled={busy}
                      onChange={() =>
                        choosePlannedResource(
                          agvIds,
                          agv.id,
                          [vesselSceneEntityId(selectedVessel.id)],
                          setAgvIds
                        )
                      }
                    />
                    <span><strong>{agv.label}</strong><small>{RESOURCE_STATUS_LABELS[agv.status]}</small></span>
                  </label>
                  <button type="button" onClick={() => onLocate(agv.id)}>定位</button>
                </div>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            disabled={busy || agvIds.length === 0}
            onClick={() =>
              run({
                type: "transport.assign_agvs",
                vesselId: selectedVessel.id,
                agvIds
              })
            }
          >
            <Route aria-hidden="true" /> 分配 AGV
          </button>
          <label>
            运输优先级
            <select
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
            >
              <option value={1}>1 · 优先</option>
              <option value={2}>2 · 常规</option>
              <option value={3}>3 · 延后</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run({
                type: "transport.set_priority",
                vesselId: selectedVessel.id,
                priority
              })
            }
          >
            更新优先级
          </button>
          <div className="port-runtime__charge-list">
            {agvs.map((agv) => (
              <button
                type="button"
                key={agv.id}
                disabled={busy || agv.status !== "available"}
                onClick={() =>
                  run({ type: "transport.send_charge", agvId: agv.id })
                }
              >
                <BatteryCharging aria-hidden="true" /> {agv.label} 充电
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {role === "yard_gate" ? (
        <div className="port-runtime__command-stack">
          <label>
            待分配教学批次
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">选择批次</option>
              {unassignedTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            目标堆场块
            <select value={blockId} onChange={(event) => setBlockId(event.target.value)}>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label} · 距离带 {String(block.metadata.distanceBand)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !taskId}
            onClick={() =>
              run({ type: "yard.assign_block", taskId, blockId })
            }
          >
            <Container aria-hidden="true" /> 分配堆场块
          </button>
          {releasableTasks.length > 0 ? (
            <div className="port-runtime__release-list">
              <span>已完成、待陆侧放行</span>
              {releasableTasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  disabled={busy}
                  onClick={() =>
                    run({ type: "yard.release_batch", taskId: task.id })
                  }
                >
                  放行 {task.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="port-runtime__lane-controls">
            {lanes.map((lane) => (
              <div key={lane.id}>
                <span>{lane.label}</span>
                <strong>{lane.status === "closed" ? "关闭" : "开启"}</strong>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run({
                      type: "gate.set_lane",
                      laneId: lane.id,
                      open: lane.status === "closed"
                    })
                  }
                >
                  <Truck aria-hidden="true" />
                  {lane.status === "closed" ? "开启" : "关闭"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PortSimulationWorkspace({
  snapshot,
  role,
  executionMode = "team_authoritative",
  commandBusy = false,
  connectionLabel = "状态已同步",
  commandDraft,
  onCommandDraftConsumed,
  onCommand
}: PortSimulationWorkspaceProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [plannedEntityIds, setPlannedEntityIds] = useState<string[]>([]);
  const [relatedEntityIds, setRelatedEntityIds] = useState<string[]>([]);
  const [activeScoreDimension, setActiveScoreDimension] =
    useState<PortSimulationScoreDimension | null>(null);
  const sceneRef = useRef<InteractivePortSceneHandle>(null);
  const projections = useMemo(
    () =>
      projectPortSimulationEntities(snapshot) satisfies readonly PortSceneEntityProjection[],
    [snapshot]
  );
  const gateQueue = snapshot.queues.find((queue) => queue.id === "gate-queue");
  const activeIncidents = snapshot.incidents.filter(
    (incident) => incident.status === "active"
  );
  const sceneEntityIds = useMemo(
    () => new Set(YANGSHAN_CONTAINER_SCENE.entities.map((entity) => entity.id)),
    []
  );
  const normalizeEntityId = (entityId: string) =>
    sceneEntityIds.has(entityId) ? entityId : vesselSceneEntityId(entityId);
  const entityHighlights = useMemo(() => {
    const highlights: PortSceneEntityHighlight[] = plannedEntityIds.map(
      (entityId) => ({ entityId: normalizeEntityId(entityId), kind: "planned" })
    );
    for (const entityId of relatedEntityIds) {
      if (!plannedEntityIds.includes(entityId)) {
        highlights.push({ entityId: normalizeEntityId(entityId), kind: "related" });
      }
    }
    for (const item of snapshot.collaborationItems) {
      if (item.kind !== "risk_alert" || item.status !== "open") continue;
      for (const entityId of item.entityIds) {
        highlights.push({ entityId: normalizeEntityId(entityId), kind: "attention" });
      }
    }
    return highlights;
  }, [plannedEntityIds, relatedEntityIds, snapshot.collaborationItems]);
  const selectedResource = snapshot.resources.find(
    (resource) => resource.id === selectedEntityId
  );
  const selectedSceneEntity = YANGSHAN_CONTAINER_SCENE.entities.find(
    (entity) => entity.id === selectedEntityId
  );
  const selectedBerthSlots =
    selectedResource?.kind === "berth"
      ? PORT_MANUAL_DUAL_VESSEL_SCENARIO.quayTrack?.serviceSlots.filter(
          (slot) => slot.berthId === selectedResource.id
        ) ?? []
      : [];
  const selectedCraneServiceBerth = selectedResource?.quayCrane?.targetSlotId
    ? PORT_MANUAL_DUAL_VESSEL_SCENARIO.quayTrack?.serviceSlots.find(
        (slot) => slot.id === selectedResource.quayCrane?.targetSlotId
      )?.berthId
    : selectedResource?.assignedTo
      ? snapshot.vessels.find(
          (vessel) => vessel.id === selectedResource.assignedTo
        )?.berthId
      : null;
  const challenge = getPortSimulationChallenge(snapshot.challengeId);
  const roleBriefing = challenge.roleBriefings.find(
    (briefing) => briefing.role === role
  );
  const scorecard = calculatePortSimulationScore({
    state: snapshot,
    collaborationItems: snapshot.collaborationItems
  });
  const activeScoreItem = scorecard.breakdown.find(
    (item) => item.dimension === activeScoreDimension
  );
  const displayedEvents = (activeScoreItem?.evidenceEventIds.length
    ? snapshot.recentEvents.filter((event) =>
        activeScoreItem.evidenceEventIds.includes(event.id)
      )
    : snapshot.recentEvents.slice(-6)
  ).reverse();
  const completed = snapshot.status === "completed";
  const latestEvent = snapshot.recentEvents.at(-1);
  const decisionStates = [
    {
      label: "待我决策",
      active: snapshot.status === "running" && Boolean(role && onCommand)
    },
    {
      label: "等待其他岗位",
      active: snapshot.vessels.some((vessel) =>
        ["anchorage", "berthed", "ready_departure"].includes(vessel.stage)
      )
    },
    {
      label: "执行中",
      active: snapshot.vessels.some((vessel) =>
        ["inbound", "working", "outbound"].includes(vessel.stage)
      )
    },
    {
      label: "安全阻止",
      active: latestEvent?.outcome === "rejected"
    },
    {
      label: "资源阻塞",
      active:
        activeIncidents.length > 0 ||
        snapshot.queues.some((queue) => Boolean(queue.blockedReason)) ||
        snapshot.resources.some((resource) => resource.status === "fault")
    }
  ];
  const resourceDebrief = RESOURCE_DEBRIEF_GROUPS.map((group) => {
    const resourceIds = new Set(
      snapshot.resources
        .filter((resource) => group.kinds.includes(resource.kind))
        .map((resource) => resource.id)
    );
    return snapshot.metrics.resourceMinutes
      .filter((metric) => resourceIds.has(metric.resourceId))
      .reduce(
        (total, metric) => ({
          label: group.label,
          busy: total.busy + metric.busy,
          idle: total.idle + metric.idle,
          blocked: total.blocked + metric.blocked,
          traveling: total.traveling + metric.traveling
        }),
        { label: group.label, busy: 0, idle: 0, blocked: 0, traveling: 0 }
      );
  });
  const commandProposals = snapshot.collaborationItems.filter(
    (item) => item.kind === "command_proposal"
  );
  const acceptedProposals = commandProposals.filter(
    (item) => item.status === "accepted"
  );
  const riskAlerts = snapshot.collaborationItems.filter(
    (item) => item.kind === "risk_alert"
  );
  const handledRiskAlerts = riskAlerts.filter(
    (item) => item.status === "accepted" || item.status === "dismissed"
  );
  const respondedCollaborationItems = snapshot.collaborationItems.filter(
    (item) => item.respondedAtSimMinute !== null
  );
  const averageCollaborationResponse = respondedCollaborationItems.length
    ? respondedCollaborationItems.reduce(
        (sum, item) =>
          sum +
          ((item.respondedAtSimMinute ?? item.createdAtSimMinute) -
            item.createdAtSimMinute),
        0
      ) / respondedCollaborationItems.length
    : null;

  return (
    <div
      className="port-runtime"
      data-simulation-status={snapshot.status}
      data-simulation-revision={snapshot.revision}
    >
      <header className="port-runtime__statusbar">
        <div>
          <span>{snapshot.teamName}</span>
          <strong>{challenge.title} · 第{snapshot.attemptNumber}轮</strong>
        </div>
        <dl>
          <div>
            <dt><Clock3 aria-hidden="true" /> 教学时刻</dt>
            <dd>{formatSimTime(snapshot.clock.simMinute)}</dd>
          </div>
          <div>
            <dt><Radio aria-hidden="true" /> 运行状态</dt>
            <dd>{executionMode === "local_solo" && snapshot.status === "lobby" ? "等待开始" : PORT_SIMULATION_RUN_STATUS_LABELS[snapshot.status]} · {snapshot.clock.timeScale}×</dd>
          </div>
          <div>
            <dt><UsersRound aria-hidden="true" /> {executionMode === "local_solo" ? "岗位体验" : "岗位在线"}</dt>
            <dd>
              {executionMode === "local_solo" ? (
                <>四岗均可切换 · 当前 {role ? PORT_SIMULATION_ROLE_LABELS[role] : "观察"}</>
              ) : (
                <>主操 {snapshot.roleSeats.filter((seat) => seat.connected).length}/4 · 协作 {snapshot.supportSeats.filter((seat) => seat.connected).length}/{snapshot.supportSeats.length}</>
              )}
            </dd>
          </div>
        </dl>
        <span className="port-runtime__connection">
          {connectionLabel} · {scorecard.totalScore}/1000分
        </span>
      </header>

      <section className="port-runtime__decision-states" aria-label="调度状态分类">
        {decisionStates.map((state) => (
          <span key={state.label} data-active={state.active}>
            <i aria-hidden="true" /> {executionMode === "local_solo" && state.label === "等待其他岗位" ? "等待切换岗位" : state.label}
          </span>
        ))}
      </section>

      <section className="port-runtime__scoreboard" aria-label={executionMode === "local_solo" ? "个人可解释计分" : "实时可解释计分"}>
        <header>
          <Trophy aria-hidden="true" />
          <div><span>{executionMode === "local_solo" ? "个人诊断成绩" : "实时暂定成绩"}</span><strong>{scorecard.totalScore}<small>/1000</small></strong></div>
          <p>{executionMode === "local_solo" ? (completed ? "本轮个人成绩已封存，可用于复盘和自我比较。" : "成绩只保存在本机，随每次管理决策实时变化。") : scorecard.eligibilityMessage}</p>
        </header>
        <div>
          {scorecard.breakdown.map((item) => (
            <button
              type="button"
              key={item.dimension}
              aria-pressed={activeScoreDimension === item.dimension}
              onClick={() =>
                setActiveScoreDimension((current) =>
                  current === item.dimension ? null : item.dimension
                )
              }
            >
              <span>{item.label}</span>
              <strong>{item.points}/{item.maxPoints}</strong>
              <progress value={item.points} max={item.maxPoints} />
              <small>{item.summary}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="port-runtime__main">
        <section className="port-runtime__map" aria-label="港口共享态势">
          <div className="port-runtime__vessel-strip">
            {snapshot.vessels.map((vessel) => (
              <article key={vessel.id} data-stage={vessel.stage}>
                <Ship aria-hidden="true" />
                <div>
                  <strong>{vessel.label}</strong>
                  <span>{VESSEL_STAGE_LABELS[vessel.stage]}</span>
                </div>
                <em>{vessel.completedBatches}/{vessel.totalBatches} 批</em>
              </article>
            ))}
          </div>
          <InteractivePortScene
            ref={sceneRef}
            scene={YANGSHAN_CONTAINER_SCENE}
            entityProjections={projections}
            entityHighlights={entityHighlights}
            selectedEntityId={selectedEntityId}
            animationPaused
            ariaLabel="双船纯手动港口仿真共享态势图"
            onEntitySelect={(entity) => setSelectedEntityId(entity?.id ?? null)}
          />
          {selectedSceneEntity ? (
            <aside className="port-runtime__selection-summary" aria-label="地图选中对象详情">
              <header>
                <span>地图主选</span>
                <strong>{selectedSceneEntity.label}</strong>
                <button type="button" onClick={() => setSelectedEntityId(null)}>清除</button>
              </header>
              {selectedResource?.quayCrane ? (
                <dl>
                  <div><dt>当前轨位</dt><dd>{craneTrackPositionAt(selectedResource, snapshot.clock.simMinute)?.toFixed(0) ?? "—"}</dd></div>
                  <div><dt>目标轨位</dt><dd>{selectedResource.quayCrane.targetTrackPosition?.toFixed(0) ?? "—"}</dd></div>
                  <div><dt>预计到位</dt><dd>{selectedResource.quayCrane.movementEndsAtSimMinute === null ? "—" : formatSimTime(selectedResource.quayCrane.movementEndsAtSimMinute)}</dd></div>
                  <div><dt>服务泊位</dt><dd>{selectedCraneServiceBerth ?? "未分配"}</dd></div>
                  <div><dt>伸距等级</dt><dd>{selectedResource.quayCrane.outreachClass === "deep_reach" ? "大伸距" : "标准伸距"}</dd></div>
                  <div><dt>设备状态</dt><dd>{RESOURCE_STATUS_LABELS[selectedResource.status]}</dd></div>
                </dl>
              ) : selectedBerthSlots.length ? (
                <div className="port-runtime__slot-summary">
                  {selectedBerthSlots.map((slot) => {
                    const crane = snapshot.resources.find(
                      (resource) =>
                        resource.kind === "quay_crane" &&
                        (resource.quayCrane?.targetTrackPosition === slot.position ||
                          (resource.status !== "moving" &&
                            resource.quayCrane?.trackPosition === slot.position))
                    );
                    return (
                      <span key={slot.id} data-slot-state={crane ? "occupied" : "available"}>
                        {slot.position} · {crane ? crane.label.replace("岸桥 ", "") : "可用"}
                      </span>
                    );
                  })}
                </div>
              ) : selectedResource ? (
                <p>{selectedResource.label} · {RESOURCE_STATUS_LABELS[selectedResource.status]}</p>
              ) : (
                <p>{selectedSceneEntity.details[0]?.value ?? "港区教学对象"}</p>
              )}
            </aside>
          ) : null}
        </section>

        <aside className="port-runtime__side">
          <section className="port-runtime__mission-card" aria-label="当前挑战任务">
            <span>{challenge.difficulty}挑战 · {challenge.shortTitle}</span>
            <h2>{roleBriefing?.headline ?? challenge.missions[0]?.title}</h2>
            <p>{roleBriefing?.coordinationPrompt ?? challenge.publicBriefing}</p>
            <ul>
              {(roleBriefing?.knownInformation ?? challenge.observationPrompts).map(
                (item) => <li key={item}>{item}</li>
              )}
            </ul>
          </section>
          {role && onCommand ? (
            <RoleCommandPanel
              snapshot={snapshot}
              role={role}
              busy={commandBusy}
              onCommand={onCommand}
              selectedEntityId={selectedEntityId}
              onResourceSelection={(resourceId, plannedIds, relatedIds) => {
                const sceneEntityId = normalizeEntityId(resourceId);
                setSelectedEntityId(sceneEntityId);
                setPlannedEntityIds([...plannedIds]);
                setRelatedEntityIds([...relatedIds]);
                sceneRef.current?.ensureEntityVisible(sceneEntityId, {
                  paddingRatio: 0.12
                });
              }}
              onLocate={(entityId) => {
                const sceneEntityId = normalizeEntityId(entityId);
                setSelectedEntityId(sceneEntityId);
                sceneRef.current?.ensureEntityVisible(sceneEntityId, {
                  paddingRatio: 0.12
                });
              }}
              commandDraft={commandDraft}
              onCommandDraftConsumed={onCommandDraftConsumed}
            />
          ) : (
            <section className="port-runtime__observer-panel">
              <span>观察模式</span>
              <h2>选择岗位后才能下令</h2>
              <p>全组共享港口态势；调度指令仍受岗位权限和安全条件约束。</p>
            </section>
          )}

          <section className="port-runtime__pressure" aria-label="当前运行压力">
            <header>
              <span>运行压力</span>
              {activeIncidents.length ? (
                <strong><AlertTriangle aria-hidden="true" /> 有事件</strong>
              ) : (
                <strong><CheckCircle2 aria-hidden="true" /> 常态</strong>
              )}
            </header>
            <dl>
              <div><dt>锚地等待</dt><dd>{snapshot.queues[0]?.length ?? 0} 艘</dd></div>
              <div><dt>闸口队列</dt><dd>{gateQueue?.length ?? 0} 辆</dd></div>
              <div><dt>安全拦截</dt><dd>{snapshot.metrics.rejectedCommands} 次</dd></div>
              <div><dt>未完成批次</dt><dd>{snapshot.metrics.incompleteTasks}</dd></div>
            </dl>
            {activeIncidents.map((incident) => (
              <p key={incident.id}>{incident.label} · 处理中</p>
            ))}
          </section>
        </aside>
      </div>

      <section className="port-runtime__events" aria-label="最近事件">
        <header>
          <span>{activeScoreItem ? `${activeScoreItem.label}证据` : completed ? "诊断复盘" : "最近事件"}</span>
          <strong>{activeScoreItem ? activeScoreItem.summary : `暂定 ${scorecard.totalScore} 分 · 点击计分项查看证据`}</strong>
        </header>
        <ol>
          {displayedEvents.length ? displayedEvents.map((event) => (
            <li key={event.id} data-outcome={event.outcome}>
              <time>{formatSimTime(event.simMinute)}</time>
              <span>{event.message}</span>
              <em>{event.role ? PORT_SIMULATION_ROLE_LABELS[event.role] : "系统"}</em>
            </li>
          )) : (
            <li>
              <time>00:00</time>
              <span>{executionMode === "local_solo" ? "等待学生开始本地仿真。" : "等待教师开始仿真。"}</span>
              <em>系统</em>
            </li>
          )}
        </ol>
      </section>

      {completed ? (
        <section className="port-runtime__debrief" aria-label="诊断复盘详情">
          <header>
            <div>
              <span>DIAGNOSTIC REVIEW</span>
              <h2>把延误还原到等待、资源与响应</h2>
            </div>
            <p>
              安全拦截 {snapshot.metrics.rejectedCommands} 次 · {executionMode === "local_solo" ? "本地独立运行" : `教师接管 ${snapshot.metrics.teacherTakeovers} 次`} · 未完成批次 {snapshot.metrics.incompleteTasks}
            </p>
          </header>

          <div className="port-runtime__debrief-grid">
            <article>
              <h3>两船时间构成</h3>
              {snapshot.vessels.map((vessel) => {
                const cargoDuration = vessel.cargoStartedAtSimMinute === null
                  ? 0
                  : (vessel.cargoCompletedAtSimMinute ?? snapshot.clock.simMinute) -
                    vessel.cargoStartedAtSimMinute;
                const portStay = vessel.arrivedAtSimMinute === null
                  ? 0
                  : (vessel.departedAtSimMinute ?? snapshot.clock.simMinute) -
                    vessel.arrivedAtSimMinute;
                return (
                  <dl key={vessel.id}>
                    <div><dt>{vessel.label}</dt><dd>{VESSEL_STAGE_LABELS[vessel.stage]}</dd></div>
                    <div><dt>锚地等待</dt><dd>{formatDuration(vessel.waitMinutes.anchorage)}</dd></div>
                    <div><dt>航道等待</dt><dd>{formatDuration(vessel.waitMinutes.channel)}</dd></div>
                    <div><dt>泊位等待</dt><dd>{formatDuration(vessel.waitMinutes.berth)}</dd></div>
                    <div><dt>装卸用时</dt><dd>{formatDuration(cargoDuration)}</dd></div>
                    <div><dt>装卸阻塞</dt><dd>{formatDuration(vessel.waitMinutes.cargo)}</dd></div>
                    <div><dt>在港时间</dt><dd>{formatDuration(portStay)}</dd></div>
                  </dl>
                );
              })}
            </article>

            <article>
              <h3>资源时间</h3>
              {resourceDebrief.map((resource) => (
                <dl key={resource.label}>
                  <div><dt>{resource.label}</dt><dd>忙碌 {formatDuration(resource.busy)}</dd></div>
                  <div><dt>空闲</dt><dd>{formatDuration(resource.idle)}</dd></div>
                  <div><dt>阻塞</dt><dd>{formatDuration(resource.blocked)}</dd></div>
                  <div><dt>移位/行驶</dt><dd>{formatDuration(resource.traveling)}</dd></div>
                </dl>
              ))}
              <p>闸口队列峰值：{snapshot.metrics.gateQueuePeak} 辆</p>
            </article>

            <article>
              <h3>岗位响应与事件恢复</h3>
              <dl>
                {snapshot.metrics.roleResponseMinutes.map((metric) => (
                  <div key={metric.role}>
                    <dt>{PORT_SIMULATION_ROLE_LABELS[metric.role]}</dt>
                    <dd>
                      {metric.decisions > 0
                        ? `平均 ${formatDuration(metric.totalMinutes / metric.decisions)} · ${metric.decisions} 次决策`
                        : "本轮没有下令"}
                    </dd>
                  </div>
                ))}
                {snapshot.metrics.incidentRecoveryMinutes.map((metric) => {
                  const incident = snapshot.incidents.find(
                    (item) => item.id === metric.incidentId
                  );
                  return (
                    <div key={metric.incidentId}>
                      <dt>{incident?.label ?? "固定事件"}</dt>
                      <dd>
                        {metric.minutes === null
                          ? "本轮结束时尚未恢复"
                          : `恢复用时 ${formatDuration(metric.minutes)}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </article>

            <article>
              <h3>弹性协作与岸桥调度</h3>
              <dl>
                <div><dt>实际组员</dt><dd>{snapshot.memberCount}/{snapshot.memberCapacity} 人</dd></div>
                <div><dt>协作席到岗</dt><dd>{snapshot.supportSeats.filter((seat) => seat.participantId).length}/{snapshot.supportSeats.length}</dd></div>
                <div><dt>方案采用</dt><dd>{acceptedProposals.length}/{commandProposals.length}</dd></div>
                <div><dt>安全提醒处理</dt><dd>{handledRiskAlerts.length}/{riskAlerts.length}</dd></div>
                <div><dt>协作响应</dt><dd>{averageCollaborationResponse === null ? "无响应记录" : `平均 ${formatDuration(averageCollaborationResponse)}`}</dd></div>
                <div><dt>岸桥移位</dt><dd>{snapshot.metrics.craneMoves.completed} 次 · {Math.round(snapshot.metrics.craneMoves.totalDistance)} 轨位单位</dd></div>
                <div><dt>移位用时</dt><dd>{formatDuration(snapshot.metrics.craneMoves.totalTravelMinutes)}</dd></div>
                <div><dt>移位拦截</dt><dd>{snapshot.metrics.craneMoves.rejected} 次</dd></div>
                <div><dt>轨位/伸距阻塞</dt><dd>{snapshot.metrics.craneMoves.matchingBlocks} 次</dd></div>
              </dl>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
