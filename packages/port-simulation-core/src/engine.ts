import type {
  PortSimulationAuthoritativeEngineState,
  PortSimulationClock,
  PortSimulationCommand,
  PortSimulationCommandResult,
  PortSimulationEvent,
  PortSimulationIncidentState,
  PortSimulationMetrics,
  PortSimulationQueue,
  PortSimulationResourceState,
  PortSimulationRole,
  PortSimulationRunStatus,
  PortSimulationTask,
  PortSimulationVesselState
} from "@edu/contracts";
import type { PortSimulationScenarioDefinition } from "./scenario.js";

const TRANSIT_DURATION_MINUTES = 45;
const CHARGE_DURATION_MINUTES = 60;
const ROLE_COMMAND_PREFIX: Record<PortSimulationRole, readonly string[]> = {
  marine_control: ["marine."],
  berth_operations: ["berth.", "quay."],
  horizontal_transport: ["transport."],
  yard_gate: ["yard.", "gate."]
};

export type PortSimulationEngineState =
  PortSimulationAuthoritativeEngineState;

export interface ApplyPortSimulationCommandOptions {
  requestId: string;
  actor?: "student" | "teacher";
}

export interface ApplyPortSimulationCommandOutcome {
  state: PortSimulationEngineState;
  result: PortSimulationCommandResult;
}

function cloneState(state: PortSimulationEngineState) {
  return structuredClone(state);
}

function initialMetrics(
  scenario: PortSimulationScenarioDefinition
): PortSimulationMetrics {
  return {
    rejectedCommands: 0,
    teacherTakeovers: 0,
    gateQueuePeak: 0,
    incompleteTasks: scenario.cargoBatches.length,
    incidentRecoveryMinutes: scenario.incidents.map((incident) => ({
      incidentId: incident.id,
      minutes: null
    })),
    roleResponseMinutes: scenario.roles.map((role) => ({
      role,
      totalMinutes: 0,
      decisions: 0
    })),
    resourceMinutes: scenario.resources.map((resource) => ({
      resourceId: resource.id,
      busy: 0,
      idle: 0,
      blocked: 0,
      traveling: 0
    })),
    craneMoves: {
      completed: 0,
      rejected: 0,
      totalDistance: 0,
      totalTravelMinutes: 0,
      matchingBlocks: 0
    }
  };
}

function addEvent(
  state: PortSimulationEngineState,
  input: Omit<PortSimulationEvent, "id" | "simMinute">
) {
  state.eventSequence += 1;
  state.recentEvents.push({
    id: `event-${state.eventSequence}`,
    simMinute: state.clock.simMinute,
    ...input
  });
  state.recentEvents = state.recentEvents.slice(-120);
}

function resourceStatusAtStart(kind: PortSimulationResourceState["kind"]) {
  return kind === "gate_lane" ? "closed" : "available";
}

function createTasks(
  scenario: PortSimulationScenarioDefinition
): PortSimulationTask[] {
  return scenario.cargoBatches.map(
    (batch): PortSimulationTask => ({
      id: batch.id,
      vesselId: batch.vesselId,
      direction: batch.direction,
      label: batch.label,
      status: "waiting_assignment",
      yardBlockId: null,
      workUnits: batch.workUnits,
      completedAtSimMinute: null,
      releasedAtSimMinute: null
    })
  );
}

export function createInitialPortSimulationState(
  scenario: PortSimulationScenarioDefinition
): PortSimulationEngineState {
  const tasks = createTasks(scenario);
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    revision: 1,
    status: "lobby",
    clock: {
      simMinute: 0,
      durationSimMinutes: scenario.durationSimMinutes,
      timeScale: 1,
      wallClockAnchor: null,
      pausedReason: null
    },
    vessels: scenario.vessels.map((vessel) => ({
      id: vessel.id,
      label: vessel.label,
      stage: vessel.etaSimMinute === 0 ? "anchorage" : "scheduled",
      etaSimMinute: vessel.etaSimMinute,
      requiredOutreachClass: vessel.requiredOutreachClass,
      berthId: null,
      pilotId: null,
      tugIds: [],
      craneIds: [],
      agvIds: [],
      cargoStarted: false,
      cargoCompleted: false,
      cargoStartedAtSimMinute: null,
      cargoCompletedAtSimMinute: null,
      completedBatches: 0,
      totalBatches: tasks.filter((task) => task.vesselId === vessel.id).length,
      workCompletedUnits: 0,
      workTotalUnits: tasks
        .filter((task) => task.vesselId === vessel.id)
        .reduce((total, task) => total + task.workUnits, 0),
      stageEndsAtSimMinute: null,
      arrivedAtSimMinute: vessel.etaSimMinute === 0 ? 0 : null,
      departedAtSimMinute: null,
      waitMinutes: { anchorage: 0, channel: 0, berth: 0, cargo: 0 }
    })),
    resources: scenario.resources.map((resource) => {
      const initialTrackPosition = Number(
        resource.metadata?.initialTrackPosition ?? 0
      );
      return {
        id: resource.id,
        label: resource.label,
        kind: resource.kind,
        status: resourceStatusAtStart(resource.kind),
        assignedTo: null,
        availableAtSimMinute: null,
        quayCrane:
          resource.kind === "quay_crane" && scenario.quayTrack
            ? {
                trackPosition: initialTrackPosition,
                movementStartPosition: null,
                targetTrackPosition: null,
                targetSlotId: null,
                movementStartedAtSimMinute: null,
                movementEndsAtSimMinute: null,
                outreachClass:
                  resource.metadata?.outreachClass === "deep_reach"
                    ? "deep_reach"
                    : "standard"
              }
            : null,
        metadata: { ...(resource.metadata ?? {}) }
      };
    }),
    tasks,
    queues: [
      {
        id: "anchorage-queue",
        label: "锚地等待船舶",
        length: scenario.vessels.filter((vessel) => vessel.etaSimMinute === 0)
          .length,
        peakLength: scenario.vessels.filter((vessel) => vessel.etaSimMinute === 0)
          .length,
        blockedReason: "等待港调、泊位和船舶服务资源"
      },
      {
        id: "gate-queue",
        label: "闸口外集卡队列",
        length: 0,
        peakLength: 0,
        blockedReason: null
      }
    ],
    incidents: scenario.incidents.map((incident) => ({
      id: incident.id,
      label: incident.label,
      scheduledAtSimMinute: incident.scheduledAtSimMinute,
      status: "scheduled",
      startedAtSimMinute: null,
      resolvedAtSimMinute: null
    })),
    metrics: initialMetrics(scenario),
    recentEvents: [],
    eventSequence: 0,
    gateServiceProgress: 0,
    transportPriority: Object.fromEntries(
      scenario.vessels.map((vessel) => [vessel.id, 2])
    ),
    roleLastDecisionAt: {
      marine_control: 0,
      berth_operations: 0,
      horizontal_transport: 0,
      yard_gate: 0
    }
  };
}

export function startPortSimulation(
  state: PortSimulationEngineState,
  wallClockNow: string,
  actor: "student" | "teacher" = "teacher"
) {
  const next = cloneState(state);
  if (next.status !== "lobby" && next.status !== "ready") return next;
  next.status = "running";
  next.clock.wallClockAnchor = wallClockNow;
  next.clock.pausedReason = null;
  next.revision += 1;
  addEvent(next, {
    type: "simulation.started",
    message: "纯手动仿真开始，所有调度决策等待操作者下令。",
    role: null,
    actor,
    outcome: "information"
  });
  return next;
}

export function pausePortSimulation(
  state: PortSimulationEngineState,
  reason: string,
  actor: "student" | "teacher" = "teacher"
) {
  const next = cloneState(state);
  if (next.status !== "running") return next;
  next.status = "paused";
  next.clock.wallClockAnchor = null;
  next.clock.pausedReason = reason;
  next.revision += 1;
  addEvent(next, {
    type: "simulation.paused",
    message: reason,
    role: null,
    actor,
    outcome: "information"
  });
  return next;
}

export function resumePortSimulation(
  state: PortSimulationEngineState,
  wallClockNow: string,
  actor: "student" | "teacher" = "teacher"
) {
  const next = cloneState(state);
  if (next.status !== "paused") return next;
  next.status = "running";
  next.clock.wallClockAnchor = wallClockNow;
  next.clock.pausedReason = null;
  next.revision += 1;
  addEvent(next, {
    type: "simulation.resumed",
    message: "仿真时钟已恢复。",
    role: null,
    actor,
    outcome: "information"
  });
  return next;
}

export function setPortSimulationSpeed(
  state: PortSimulationEngineState,
  timeScale: 0.5 | 1 | 2,
  wallClockNow: string,
  actor: "student" | "teacher" = "teacher"
) {
  const next = cloneState(state);
  next.clock.timeScale = timeScale;
  if (next.status === "running") next.clock.wallClockAnchor = wallClockNow;
  next.revision += 1;
  addEvent(next, {
    type: "simulation.speed_changed",
    message: `仿真速度调整为 ${timeScale}×。`,
    role: null,
    actor,
    outcome: "information"
  });
  return next;
}

export function completePortSimulation(
  state: PortSimulationEngineState,
  actor: "student" | "teacher" = "teacher"
) {
  const next = cloneState(state);
  if (next.status === "completed" || next.status === "aborted") return next;
  next.status = "completed";
  next.clock.wallClockAnchor = null;
  next.clock.pausedReason = null;
  next.metrics.incompleteTasks = next.tasks.filter(
    (task) => task.status !== "completed"
  ).length;
  next.revision += 1;
  addEvent(next, {
    type: "simulation.completed",
    message: "本轮仿真已结束，可以进入诊断复盘。",
    role: null,
    actor,
    outcome: "information"
  });
  return next;
}

function findResource(state: PortSimulationEngineState, id: string) {
  return state.resources.find((resource) => resource.id === id);
}

function cranePositionAt(
  resource: PortSimulationResourceState,
  simMinute: number
) {
  const crane = resource.quayCrane;
  if (
    !crane ||
    crane.movementStartPosition === null ||
    crane.targetTrackPosition === null ||
    crane.movementStartedAtSimMinute === null ||
    crane.movementEndsAtSimMinute === null
  ) {
    return crane?.trackPosition ?? 0;
  }
  const duration =
    crane.movementEndsAtSimMinute - crane.movementStartedAtSimMinute;
  if (duration <= 0) return crane.targetTrackPosition;
  const progress = Math.max(
    0,
    Math.min(
      1,
      (simMinute - crane.movementStartedAtSimMinute) / duration
    )
  );
  return (
    crane.movementStartPosition +
    (crane.targetTrackPosition - crane.movementStartPosition) * progress
  );
}

function clearCraneMovement(
  resource: PortSimulationResourceState,
  finalPosition: number
) {
  if (!resource.quayCrane) return;
  resource.quayCrane.trackPosition = finalPosition;
  resource.quayCrane.movementStartPosition = null;
  resource.quayCrane.targetTrackPosition = null;
  resource.quayCrane.targetSlotId = null;
  resource.quayCrane.movementStartedAtSimMinute = null;
  resource.quayCrane.movementEndsAtSimMinute = null;
  resource.availableAtSimMinute = null;
}

function outreachIsCompatible(
  craneClass: "standard" | "deep_reach",
  requiredClass: "standard" | "deep_reach"
) {
  return requiredClass === "standard" || craneClass === "deep_reach";
}

function releaseResources(
  state: PortSimulationEngineState,
  ids: readonly string[],
  ownerId: string
) {
  for (const id of ids) {
    const resource = findResource(state, id);
    if (!resource || resource.assignedTo !== ownerId) continue;
    resource.assignedTo = null;
    if (
      resource.status !== "fault" &&
      resource.status !== "charging" &&
      resource.status !== "moving"
    ) {
      resource.status = resource.kind === "gate_lane" ? "closed" : "available";
    }
  }
}

function updateResourceMetrics(
  state: PortSimulationEngineState,
  delta: number
) {
  for (const resource of state.resources) {
    const metric = state.metrics.resourceMinutes.find(
      (item) => item.resourceId === resource.id
    );
    if (!metric) continue;
    if (resource.status === "moving") {
      metric.traveling += delta;
    } else if (["fault", "charging", "closed"].includes(resource.status)) {
      metric.blocked += delta;
    } else if (resource.status === "busy") {
      metric.busy += delta;
    } else {
      metric.idle += delta;
    }
  }
}

function updateWaitMetrics(state: PortSimulationEngineState, delta: number) {
  for (const vessel of state.vessels) {
    if (vessel.stage === "anchorage") {
      vessel.waitMinutes.anchorage += delta;
      if (!vessel.berthId) vessel.waitMinutes.berth += delta;
      else vessel.waitMinutes.channel += delta;
    } else if (vessel.stage === "berthed" && !vessel.cargoStarted) {
      vessel.waitMinutes.cargo += delta;
    } else if (vessel.stage === "working") {
      const activeCranes = vessel.craneIds.filter((id) => {
        const resource = findResource(state, id);
        return resource?.status === "busy";
      }).length;
      const activeAgvs = vessel.agvIds.filter((id) => {
        const resource = findResource(state, id);
        return resource?.status === "busy";
      }).length;
      if (activeAgvs === 0 || activeCranes === 0) {
        vessel.waitMinutes.cargo += delta;
      }
    } else if (vessel.stage === "ready_departure") {
      vessel.waitMinutes.channel += delta;
    }
  }
}

function updateCargoWork(state: PortSimulationEngineState, delta: number) {
  for (const vessel of state.vessels.filter((item) => item.stage === "working")) {
    const activeCraneCount = vessel.craneIds.filter((id) => {
      const resource = findResource(state, id);
      return resource?.status === "busy";
    }).length;
    const activeAgvCount = vessel.agvIds.filter((id) => {
      const resource = findResource(state, id);
      return resource?.status === "busy";
    }).length;
    const priority = state.transportPriority[vessel.id] ?? 2;
    const priorityFactor = priority === 1 ? 1.08 : priority === 3 ? 0.94 : 1;
    const productivity =
      Math.min(activeCraneCount, activeAgvCount * 2) * 0.7 * priorityFactor;
    if (productivity <= 0) continue;
    vessel.workCompletedUnits = Math.min(
      vessel.workTotalUnits,
      vessel.workCompletedUnits + productivity * delta
    );

    const vesselTasks = state.tasks.filter((task) => task.vesselId === vessel.id);
    let threshold = 0;
    let completedBatches = 0;
    for (const task of vesselTasks) {
      threshold += task.workUnits;
      if (vessel.workCompletedUnits + 0.000_001 >= threshold) {
        if (task.status !== "completed") {
          task.status = "completed";
          task.completedAtSimMinute = state.clock.simMinute + delta;
          addEvent(state, {
            type: "cargo.batch_completed",
            message: `${task.label}完成。`,
            role: null,
            actor: "engine",
            outcome: "information"
          });
        }
        completedBatches += 1;
      } else if (task.status === "ready") {
        task.status = "processing";
        break;
      }
    }
    vessel.completedBatches = completedBatches;
    if (completedBatches === vessel.totalBatches) {
      vessel.cargoCompleted = true;
      vessel.cargoCompletedAtSimMinute = state.clock.simMinute;
      vessel.stage = "ready_departure";
      for (const id of [...vessel.craneIds, ...vessel.agvIds]) {
        const resource = findResource(state, id);
        if (resource && resource.status === "busy") resource.status = "assigned";
      }
      addEvent(state, {
        type: "cargo.vessel_completed",
        message: `${vessel.label}全部教学批次完成，等待泊位放行和离港调度。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
  }
}

function updateGateQueue(state: PortSimulationEngineState, delta: number) {
  const queue = state.queues.find((item) => item.id === "gate-queue");
  if (!queue || queue.length === 0) return;
  const openLanes = state.resources.filter(
    (resource) =>
      resource.kind === "gate_lane" &&
      ["available", "busy"].includes(resource.status)
  );
  queue.blockedReason = openLanes.length === 0 ? "闸口通道尚未开启" : null;
  if (openLanes.length === 0) return;
  for (const lane of openLanes) lane.status = "busy";
  state.gateServiceProgress += (delta * openLanes.length) / 12;
  const processed = Math.min(queue.length, Math.floor(state.gateServiceProgress));
  if (processed > 0) {
    queue.length -= processed;
    state.gateServiceProgress -= processed;
  }
  if (queue.length === 0) {
    for (const lane of openLanes) lane.status = "available";
    const incident = state.incidents.find(
      (item) => item.id === "truck-arrival-wave" && item.status === "active"
    );
    if (incident) {
      incident.status = "resolved";
      incident.resolvedAtSimMinute = state.clock.simMinute + delta;
      const metric = state.metrics.incidentRecoveryMinutes.find(
        (item) => item.incidentId === incident.id
      );
      if (metric && incident.startedAtSimMinute !== null) {
        metric.minutes = incident.resolvedAtSimMinute - incident.startedAtSimMinute;
      }
      addEvent(state, {
        type: "incident.resolved",
        message: "外集卡到达波次已经疏解。",
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
  }
}

function processArrivals(state: PortSimulationEngineState) {
  for (const vessel of state.vessels) {
    if (
      vessel.stage === "scheduled" &&
      vessel.etaSimMinute <= state.clock.simMinute
    ) {
      vessel.stage = "anchorage";
      vessel.arrivedAtSimMinute = vessel.etaSimMinute;
      addEvent(state, {
        type: "vessel.arrived",
        message: `${vessel.label}到达锚地，等待人工调度。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
  }
}

function processTransitCompletions(state: PortSimulationEngineState) {
  for (const vessel of state.vessels) {
    if (
      (vessel.stage !== "inbound" && vessel.stage !== "outbound") ||
      vessel.stageEndsAtSimMinute === null ||
      vessel.stageEndsAtSimMinute > state.clock.simMinute
    ) {
      continue;
    }
    const wasInbound = vessel.stage === "inbound";
    vessel.stage = wasInbound ? "berthed" : "departed";
    vessel.stageEndsAtSimMinute = null;
    if (!wasInbound) vessel.departedAtSimMinute = state.clock.simMinute;
    releaseResources(
      state,
      [vessel.pilotId ?? "", ...vessel.tugIds, "channel-1"],
      vessel.id
    );
    vessel.pilotId = null;
    vessel.tugIds = [];
    if (!wasInbound && vessel.berthId) {
      releaseResources(state, [vessel.berthId], vessel.id);
      vessel.berthId = null;
    }
    addEvent(state, {
      type: wasInbound ? "vessel.berthed" : "vessel.departed",
      message: wasInbound
        ? `${vessel.label}已靠妥，等待船边作业岗位配置资源。`
        : `${vessel.label}已安全离港。`,
      role: null,
      actor: "engine",
      outcome: "information"
    });
  }
}

function processChargingCompletions(state: PortSimulationEngineState) {
  for (const resource of state.resources) {
    if (
      resource.status === "charging" &&
      resource.availableAtSimMinute !== null &&
      resource.availableAtSimMinute <= state.clock.simMinute
    ) {
      resource.status = "available";
      resource.availableAtSimMinute = null;
      addEvent(state, {
        type: "resource.charge_completed",
        message: `${resource.label}完成充电并恢复可用。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
  }
}

function processCraneMovementCompletions(state: PortSimulationEngineState) {
  for (const resource of state.resources) {
    const crane = resource.quayCrane;
    if (
      resource.status !== "moving" ||
      !crane ||
      crane.targetTrackPosition === null ||
      crane.movementEndsAtSimMinute === null ||
      crane.movementEndsAtSimMinute > state.clock.simMinute
    ) {
      continue;
    }
    const targetPosition = crane.targetTrackPosition;
    clearCraneMovement(resource, targetPosition);
    const owner = state.vessels.find(
      (vessel) => vessel.id === resource.assignedTo
    );
    resource.status = owner?.stage === "working"
      ? "busy"
      : resource.assignedTo
        ? "assigned"
        : "available";
    state.metrics.craneMoves.completed += 1;
    addEvent(state, {
      type: "quay.crane_move_completed",
      message: `${resource.label}已抵达轨位 ${targetPosition}。`,
      role: null,
      actor: "engine",
      outcome: "information"
    });
  }
}

function processIncidents(
  state: PortSimulationEngineState,
  scenario: PortSimulationScenarioDefinition
) {
  for (const definition of scenario.incidents) {
    const incident = state.incidents.find((item) => item.id === definition.id);
    if (!incident) continue;
    if (
      incident.status === "scheduled" &&
      definition.scheduledAtSimMinute <= state.clock.simMinute
    ) {
      incident.status = "active";
      incident.startedAtSimMinute = definition.scheduledAtSimMinute;
      if (definition.resourceId) {
        const resource = findResource(state, definition.resourceId);
        if (resource) {
          if (resource.status === "moving" && resource.quayCrane) {
            clearCraneMovement(
              resource,
              cranePositionAt(resource, definition.scheduledAtSimMinute)
            );
          }
          resource.status = "fault";
          resource.availableAtSimMinute =
            definition.scheduledAtSimMinute +
            (definition.durationSimMinutes ?? 0);
        }
      }
      if (definition.queueAmount) {
        const queue = state.queues.find((item) => item.id === "gate-queue");
        if (queue) {
          queue.length += definition.queueAmount;
          queue.peakLength = Math.max(queue.peakLength, queue.length);
          state.metrics.gateQueuePeak = Math.max(
            state.metrics.gateQueuePeak,
            queue.peakLength
          );
        }
      }
      addEvent(state, {
        type: "incident.started",
        message: `${definition.label}发生，请相关岗位重新安排资源。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
    if (
      incident.status === "active" &&
      definition.resourceId &&
      definition.durationSimMinutes !== undefined &&
      definition.scheduledAtSimMinute + definition.durationSimMinutes <=
        state.clock.simMinute
    ) {
      const resource = findResource(state, definition.resourceId);
      if (resource?.status === "fault") {
        const owner = state.vessels.find(
          (vessel) => vessel.id === resource.assignedTo
        );
        resource.status = owner?.stage === "working"
          ? "busy"
          : resource.assignedTo
            ? "assigned"
            : "available";
        resource.availableAtSimMinute = null;
      }
      incident.status = "resolved";
      incident.resolvedAtSimMinute =
        definition.scheduledAtSimMinute + definition.durationSimMinutes;
      const metric = state.metrics.incidentRecoveryMinutes.find(
        (item) => item.incidentId === incident.id
      );
      if (metric) metric.minutes = definition.durationSimMinutes;
      addEvent(state, {
        type: "incident.resolved",
        message: `${definition.label}已解除。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
  }
}

function refreshQueuesAndMetrics(state: PortSimulationEngineState) {
  const anchorage = state.queues.find((queue) => queue.id === "anchorage-queue");
  if (anchorage) {
    anchorage.length = state.vessels.filter(
      (vessel) => vessel.stage === "anchorage"
    ).length;
    anchorage.peakLength = Math.max(anchorage.peakLength, anchorage.length);
    anchorage.blockedReason = anchorage.length
      ? "等待泊位、引航拖轮或航道放行"
      : null;
  }
  state.metrics.incompleteTasks = state.tasks.filter(
    (task) => task.status !== "completed"
  ).length;
}

export function advancePortSimulation(
  state: PortSimulationEngineState,
  scenario: PortSimulationScenarioDefinition,
  targetSimMinute: number
) {
  const next = cloneState(state);
  if (next.status !== "running") return next;
  const target = Math.min(
    next.clock.durationSimMinutes,
    Math.max(next.clock.simMinute, targetSimMinute)
  );
  while (next.clock.simMinute < target) {
    const delta = Math.min(1, target - next.clock.simMinute);
    updateResourceMetrics(next, delta);
    updateWaitMetrics(next, delta);
    updateCargoWork(next, delta);
    updateGateQueue(next, delta);
    next.clock.simMinute += delta;
    processArrivals(next);
    processTransitCompletions(next);
    processChargingCompletions(next);
    processCraneMovementCompletions(next);
    processIncidents(next, scenario);
    refreshQueuesAndMetrics(next);
  }
  if (
    next.clock.simMinute >= next.clock.durationSimMinutes ||
    next.vessels.every((vessel) => vessel.stage === "departed")
  ) {
    next.status = "completed";
    next.clock.wallClockAnchor = null;
    next.clock.pausedReason = null;
    next.revision += 1;
    addEvent(next, {
      type: "simulation.completed",
      message: next.vessels.every((vessel) => vessel.stage === "departed")
        ? "两艘教学船均已安全离港，本组进入复盘。"
        : "教学时段结束，未完成任务保留在复盘中。",
      role: null,
      actor: "engine",
      outcome: "information"
    });
  }
  return next;
}

function commandRoleIsValid(role: PortSimulationRole, type: string) {
  return ROLE_COMMAND_PREFIX[role].some((prefix) => type.startsWith(prefix));
}

function reject(
  state: PortSimulationEngineState,
  role: PortSimulationRole,
  requestId: string,
  reasonCode: string,
  message: string,
  actor: "student" | "teacher"
): ApplyPortSimulationCommandOutcome {
  state.metrics.rejectedCommands += 1;
  state.revision += 1;
  addEvent(state, {
    type: "command.rejected",
    message,
    role,
    actor,
    outcome: "rejected"
  });
  return {
    state,
    result: {
      requestId,
      status: "rejected",
      revision: state.revision,
      reasonCode,
      message
    }
  };
}

function rejectCraneCommand(
  state: PortSimulationEngineState,
  role: PortSimulationRole,
  requestId: string,
  reasonCode: string,
  message: string,
  actor: "student" | "teacher",
  matchingBlock = false
) {
  state.metrics.craneMoves.rejected += 1;
  if (matchingBlock) state.metrics.craneMoves.matchingBlocks += 1;
  return reject(state, role, requestId, reasonCode, message, actor);
}

function applied(
  state: PortSimulationEngineState,
  role: PortSimulationRole,
  requestId: string,
  message: string,
  actor: "student" | "teacher"
): ApplyPortSimulationCommandOutcome {
  const roleMetric = state.metrics.roleResponseMinutes.find(
    (item) => item.role === role
  );
  if (roleMetric) {
    roleMetric.totalMinutes += Math.min(
      120,
      Math.max(0, state.clock.simMinute - state.roleLastDecisionAt[role])
    );
    roleMetric.decisions += 1;
  }
  state.roleLastDecisionAt[role] = state.clock.simMinute;
  if (actor === "teacher") state.metrics.teacherTakeovers += 1;
  state.revision += 1;
  addEvent(state, {
    type: "command.applied",
    message,
    role,
    actor,
    outcome: "applied"
  });
  return {
    state,
    result: {
      requestId,
      status: "applied",
      revision: state.revision,
      message
    }
  };
}

function assignExclusiveResources(
  state: PortSimulationEngineState,
  vesselId: string,
  previousIds: readonly string[],
  nextIds: readonly string[],
  allowedKinds: readonly PortSimulationResourceState["kind"][]
) {
  const uniqueIds = [...new Set(nextIds)];
  if (uniqueIds.length !== nextIds.length) {
    return { ok: false as const, message: "同一资源不能在一次指令中重复选择。" };
  }
  for (const id of uniqueIds) {
    const resource = findResource(state, id);
    if (!resource || !allowedKinds.includes(resource.kind)) {
      return { ok: false as const, message: `资源 ${id} 不存在或类型不匹配。` };
    }
    if (
      resource.assignedTo !== null &&
      resource.assignedTo !== vesselId
    ) {
      return { ok: false as const, message: `${resource.label}已被其他船舶占用。` };
    }
    if (
      resource.status === "fault" ||
      resource.status === "charging" ||
      resource.status === "moving" ||
      resource.status === "closed"
    ) {
      return { ok: false as const, message: `${resource.label}当前不可用。` };
    }
  }
  releaseResources(
    state,
    previousIds.filter((id) => !uniqueIds.includes(id)),
    vesselId
  );
  for (const id of uniqueIds) {
    const resource = findResource(state, id)!;
    resource.assignedTo = vesselId;
    resource.status = "assigned";
  }
  return { ok: true as const, ids: uniqueIds };
}

export function applyPortSimulationCommand(
  sourceState: PortSimulationEngineState,
  scenario: PortSimulationScenarioDefinition,
  role: PortSimulationRole,
  command: PortSimulationCommand,
  options: ApplyPortSimulationCommandOptions
): ApplyPortSimulationCommandOutcome {
  const state = cloneState(sourceState);
  const actor = options.actor ?? "student";
  if (state.status !== "running") {
    return reject(
      state,
      role,
      options.requestId,
      "SIMULATION_NOT_RUNNING",
      "仿真当前未运行，不能提交调度指令。",
      actor
    );
  }
  if (!commandRoleIsValid(role, command.type)) {
    return reject(
      state,
      role,
      options.requestId,
      "ROLE_NOT_ALLOWED",
      "该指令不属于当前岗位权限。",
      actor
    );
  }

  const vesselId = "vesselId" in command ? command.vesselId : undefined;
  const vessel = vesselId
    ? state.vessels.find((item) => item.id === vesselId)
    : undefined;
  if (vesselId && !vessel) {
    return reject(
      state,
      role,
      options.requestId,
      "VESSEL_NOT_FOUND",
      "没有找到该船舶。",
      actor
    );
  }

  if (command.type === "berth.assign" && vessel) {
    if (vessel.stage !== "anchorage") {
      return reject(state, role, options.requestId, "VESSEL_NOT_AT_ANCHORAGE", "只有锚地等待船舶可以分配泊位。", actor);
    }
    const definition = scenario.vessels.find((item) => item.id === vessel.id)!;
    if (!definition.compatibleBerthIds.includes(command.berthId)) {
      return reject(state, role, options.requestId, "BERTH_INCOMPATIBLE", "该泊位与本教学船型不兼容，请选择允许泊位。", actor);
    }
    const berth = findResource(state, command.berthId);
    if (!berth || berth.kind !== "berth") {
      return reject(state, role, options.requestId, "BERTH_NOT_FOUND", "没有找到该泊位。", actor);
    }
    if (berth.assignedTo && berth.assignedTo !== vessel.id) {
      return reject(state, role, options.requestId, "BERTH_OCCUPIED", `${berth.label}已被其他船舶占用。`, actor);
    }
    if (vessel.berthId && vessel.berthId !== berth.id) {
      releaseResources(state, [vessel.berthId], vessel.id);
    }
    berth.assignedTo = vessel.id;
    berth.status = "assigned";
    vessel.berthId = berth.id;
    return applied(state, role, options.requestId, `${vessel.label}已分配至${berth.label}。`, actor);
  }

  if (command.type === "marine.assign_services" && vessel) {
    if (vessel.stage !== "anchorage" && vessel.stage !== "ready_departure") {
      return reject(state, role, options.requestId, "VESSEL_NOT_READY_FOR_SERVICES", "船舶当前不处于进出港服务准备阶段。", actor);
    }
    if (!vessel.berthId) {
      return reject(state, role, options.requestId, "BERTH_REQUIRED", "必须先由泊位岗位分配泊位。", actor);
    }
    const assignment = assignExclusiveResources(
      state,
      vessel.id,
      [vessel.pilotId ?? "", ...vessel.tugIds],
      [command.pilotId, ...command.tugIds],
      ["pilot", "tug"]
    );
    if (!assignment.ok) {
      return reject(state, role, options.requestId, "MARINE_RESOURCE_UNAVAILABLE", assignment.message, actor);
    }
    const pilot = findResource(state, command.pilotId);
    if (pilot?.kind !== "pilot" || command.tugIds.some((id) => findResource(state, id)?.kind !== "tug")) {
      return reject(state, role, options.requestId, "MARINE_RESOURCE_MISMATCH", "必须配置一组引航和两艘拖轮。", actor);
    }
    vessel.pilotId = command.pilotId;
    vessel.tugIds = [...command.tugIds];
    return applied(state, role, options.requestId, `${vessel.label}已配置引航和两艘拖轮。`, actor);
  }

  if (command.type === "marine.authorize_transit" && vessel) {
    const expectedStage = command.direction === "inbound" ? "anchorage" : "ready_departure";
    if (vessel.stage !== expectedStage) {
      return reject(state, role, options.requestId, "VESSEL_STAGE_MISMATCH", command.direction === "inbound" ? "船舶不在锚地等待进港。" : "船舶尚未完成装卸和泊位放行。", actor);
    }
    if (!vessel.berthId || !vessel.pilotId || vessel.tugIds.length !== 2) {
      return reject(state, role, options.requestId, "TRANSIT_PREREQUISITES_MISSING", "进出港前必须具备泊位、引航和两艘拖轮。", actor);
    }
    if (command.direction === "outbound" && (vessel.craneIds.length > 0 || vessel.agvIds.length > 0)) {
      return reject(state, role, options.requestId, "BERTH_NOT_RELEASED", "岸桥或AGV仍与船舶绑定，请先由泊位岗位放行。", actor);
    }
    const channel = findResource(state, "channel-1")!;
    if (channel.assignedTo && channel.assignedTo !== vessel.id) {
      return reject(state, role, options.requestId, "CHANNEL_OCCUPIED", "主航道正在被另一艘船舶使用。", actor);
    }
    channel.assignedTo = vessel.id;
    channel.status = "busy";
    for (const id of [vessel.pilotId, ...vessel.tugIds]) {
      const resource = findResource(state, id);
      if (resource) resource.status = "busy";
    }
    if (vessel.berthId) {
      const berth = findResource(state, vessel.berthId);
      if (berth) berth.status = "busy";
    }
    vessel.stage = command.direction === "inbound" ? "inbound" : "outbound";
    vessel.stageEndsAtSimMinute = state.clock.simMinute + TRANSIT_DURATION_MINUTES;
    return applied(state, role, options.requestId, `${vessel.label}获准${command.direction === "inbound" ? "进港" : "离港"}，航道进入占用状态。`, actor);
  }

  if (command.type === "quay.move_crane") {
    const track = scenario.quayTrack;
    if (!track) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_TRACK_NOT_SUPPORTED",
        "当前场景版本不支持岸桥轨位移动。",
        actor
      );
    }
    const crane = findResource(state, command.craneId);
    const targetSlot = track.serviceSlots.find(
      (slot) => slot.id === command.targetSlotId
    );
    if (!crane || crane.kind !== "quay_crane" || !crane.quayCrane) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_NOT_FOUND",
        "没有找到可移动的岸桥。",
        actor
      );
    }
    if (!targetSlot) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_SLOT_NOT_FOUND",
        "没有找到目标岸桥轨位。",
        actor
      );
    }
    if (["moving", "fault", "charging", "closed"].includes(crane.status)) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_NOT_MOVABLE",
        `${crane.label}当前${crane.status === "moving" ? "正在移动" : "不可用"}。`,
        actor
      );
    }
    const owner = state.vessels.find(
      (candidate) => candidate.id === crane.assignedTo
    );
    if (owner && owner.berthId !== targetSlot.berthId) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_RELEASE_REQUIRED",
        `${crane.label}仍服务${owner.label}，跨泊位移动前必须先从原船配置中释放。`,
        actor
      );
    }
    const startPosition = cranePositionAt(crane, state.clock.simMinute);
    const distance = Math.abs(targetSlot.position - startPosition);
    if (distance < 0.000_001) {
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_ALREADY_AT_SLOT",
        `${crane.label}已经位于轨位 ${targetSlot.position}。`,
        actor
      );
    }
    const travelMinutes = Math.max(
      2,
      Math.ceil(distance * track.minutesPerUnit)
    );
    const movementEndsAt = state.clock.simMinute + travelMinutes;
    const orderedCranes = state.resources
      .filter(
        (resource) => resource.kind === "quay_crane" && resource.quayCrane
      )
      .sort(
        (left, right) =>
          Number(left.metadata.initialTrackPosition ?? 0) -
          Number(right.metadata.initialTrackPosition ?? 0)
      );
    const candidatePositionAt = (simMinute: number) => {
      const progress = Math.max(
        0,
        Math.min(
          1,
          (simMinute - state.clock.simMinute) / travelMinutes
        )
      );
      return startPosition + (targetSlot.position - startPosition) * progress;
    };
    const validationEnd = Math.max(
      movementEndsAt,
      ...orderedCranes.map(
        (resource) =>
          resource.quayCrane?.movementEndsAtSimMinute ?? state.clock.simMinute
      )
    );
    let blockingCrane: PortSimulationResourceState | undefined;
    for (
      let sampleMinute = state.clock.simMinute;
      sampleMinute <= validationEnd + 0.000_001;
      sampleMinute += 0.25
    ) {
      const positions = orderedCranes.map((resource) => ({
        resource,
        position:
          resource.id === crane.id
            ? candidatePositionAt(sampleMinute)
            : cranePositionAt(resource, sampleMinute)
      }));
      const unsafePair = positions.find((current, index) => {
        const nextCrane = positions[index + 1];
        if (!nextCrane) return false;
        if (
          nextCrane.position - current.position <
          track.minimumSeparation - 0.000_001
        ) {
          blockingCrane =
            current.resource.id === crane.id
              ? nextCrane.resource
              : current.resource;
          return true;
        }
        return false;
      });
      if (unsafePair) break;
    }
    if (blockingCrane) {
      const legalSlots = track.serviceSlots
        .filter((slot) => {
          if (owner && slot.berthId !== owner.berthId) return false;
          return orderedCranes.every((resource) => {
            if (resource.id === crane.id) return true;
            const reservedPosition =
              resource.quayCrane?.targetTrackPosition ??
              cranePositionAt(resource, state.clock.simMinute);
            return (
              Math.abs(slot.position - reservedPosition) >=
              track.minimumSeparation
            );
          });
        })
        .slice(0, 4)
        .map((slot) => String(slot.position))
        .join("、");
      return rejectCraneCommand(
        state,
        role,
        options.requestId,
        "CRANE_SAFE_DISTANCE",
        `${blockingCrane.label}阻挡该移动；当前可考虑轨位：${legalSlots || "无"}。`,
        actor
      );
    }
    crane.quayCrane.trackPosition = startPosition;
    crane.quayCrane.movementStartPosition = startPosition;
    crane.quayCrane.targetTrackPosition = targetSlot.position;
    crane.quayCrane.targetSlotId = targetSlot.id;
    crane.quayCrane.movementStartedAtSimMinute = state.clock.simMinute;
    crane.quayCrane.movementEndsAtSimMinute = movementEndsAt;
    crane.status = "moving";
    crane.availableAtSimMinute = movementEndsAt;
    state.metrics.craneMoves.totalDistance += distance;
    state.metrics.craneMoves.totalTravelMinutes += travelMinutes;
    return applied(
      state,
      role,
      options.requestId,
      `${crane.label}开始移向轨位 ${targetSlot.position}，预计 ${travelMinutes} 个仿真分钟后到位。`,
      actor
    );
  }

  if (command.type === "quay.assign_cranes" && vessel) {
    if (!["berthed", "working", "ready_departure"].includes(vessel.stage)) {
      return reject(state, role, options.requestId, "VESSEL_NOT_BERTHED", "船舶靠妥后才能配置岸桥。", actor);
    }
    if (scenario.quayTrack) {
      if (!vessel.berthId) {
        return rejectCraneCommand(
          state,
          role,
          options.requestId,
          "BERTH_REQUIRED",
          "配置岸桥前必须先确定船舶泊位。",
          actor,
          true
        );
      }
      for (const craneId of command.craneIds) {
        const crane = findResource(state, craneId);
        if (!crane || crane.kind !== "quay_crane" || !crane.quayCrane) {
          return rejectCraneCommand(
            state,
            role,
            options.requestId,
            "CRANE_NOT_FOUND",
            `没有找到岸桥 ${craneId}。`,
            actor,
            true
          );
        }
        if (crane.status === "moving") {
          return rejectCraneCommand(
            state,
            role,
            options.requestId,
            "CRANE_MOVE_IN_PROGRESS",
            `${crane.label}尚未抵达目标轨位。`,
            actor,
            true
          );
        }
        const position = cranePositionAt(crane, state.clock.simMinute);
        const matchedSlot = scenario.quayTrack.serviceSlots.find(
          (slot) =>
            slot.berthId === vessel.berthId &&
            Math.abs(slot.position - position) < 0.000_001
        );
        if (!matchedSlot) {
          const berthSlots = scenario.quayTrack.serviceSlots
            .filter((slot) => slot.berthId === vessel.berthId)
            .map((slot) => slot.id)
            .join("、");
          return rejectCraneCommand(
            state,
            role,
            options.requestId,
            "CRANE_NOT_AT_BERTH",
            `${crane.label}未位于${vessel.berthId}服务轨位，请先移至${berthSlots}之一。`,
            actor,
            true
          );
        }
        if (
          !outreachIsCompatible(
            crane.quayCrane.outreachClass,
            vessel.requiredOutreachClass
          )
        ) {
          return rejectCraneCommand(
            state,
            role,
            options.requestId,
            "CRANE_OUTREACH_INCOMPATIBLE",
            `${crane.label}为标准伸距，不能服务需要大伸距岸桥的${vessel.label}。`,
            actor,
            true
          );
        }
      }
    }
    const assignment = assignExclusiveResources(state, vessel.id, vessel.craneIds, command.craneIds, ["quay_crane"]);
    if (!assignment.ok) return reject(state, role, options.requestId, "CRANE_UNAVAILABLE", assignment.message, actor);
    vessel.craneIds = assignment.ids;
    if (vessel.stage === "working") {
      for (const id of vessel.craneIds) findResource(state, id)!.status = "busy";
    }
    return applied(state, role, options.requestId, `${vessel.label}配置 ${vessel.craneIds.length} 台岸桥。`, actor);
  }

  if (command.type === "transport.assign_agvs" && vessel) {
    if (!["berthed", "working", "ready_departure"].includes(vessel.stage)) {
      return reject(state, role, options.requestId, "VESSEL_NOT_BERTHED", "船舶靠妥后才能配置AGV。", actor);
    }
    const assignment = assignExclusiveResources(state, vessel.id, vessel.agvIds, command.agvIds, ["agv"]);
    if (!assignment.ok) return reject(state, role, options.requestId, "AGV_UNAVAILABLE", assignment.message, actor);
    vessel.agvIds = assignment.ids;
    if (vessel.stage === "working") {
      for (const id of vessel.agvIds) findResource(state, id)!.status = "busy";
    }
    return applied(state, role, options.requestId, `${vessel.label}配置 ${vessel.agvIds.length} 台AGV。`, actor);
  }

  if (command.type === "yard.assign_block") {
    const task = state.tasks.find((item) => item.id === command.taskId);
    const block = findResource(state, command.blockId);
    if (!task || !block || block.kind !== "yard_block") {
      return reject(state, role, options.requestId, "TASK_OR_BLOCK_NOT_FOUND", "没有找到该批次或堆场块。", actor);
    }
    if (task.status !== "waiting_assignment") {
      return reject(state, role, options.requestId, "TASK_ALREADY_ASSIGNED", "该批次已经完成堆场分配。", actor);
    }
    const capacity = Number(block.metadata.capacity ?? 2);
    const occupied = state.tasks.filter(
      (item) =>
        item.yardBlockId === block.id && item.releasedAtSimMinute === null
    ).length;
    if (occupied >= capacity) {
      return reject(state, role, options.requestId, "YARD_BLOCK_FULL", `${block.label}容量已满。`, actor);
    }
    task.yardBlockId = block.id;
    task.status = "ready";
    block.metadata.occupied = occupied + 1;
    block.status = occupied + 1 >= capacity ? "busy" : "assigned";
    const distanceBand = Number(block.metadata.distanceBand ?? 1);
    task.workUnits += distanceBand * 8;
    const taskVessel = state.vessels.find((item) => item.id === task.vesselId)!;
    taskVessel.workTotalUnits = state.tasks
      .filter((item) => item.vesselId === task.vesselId)
      .reduce((total, item) => total + item.workUnits, 0);
    return applied(state, role, options.requestId, `${task.label}已分配至${block.label}。`, actor);
  }

  if (command.type === "quay.start_cargo" && vessel) {
    if (vessel.stage !== "berthed") {
      return reject(state, role, options.requestId, "VESSEL_NOT_READY_FOR_CARGO", "船舶必须先靠妥且尚未开工。", actor);
    }
    if (vessel.craneIds.length === 0 || vessel.agvIds.length === 0) {
      return reject(state, role, options.requestId, "EQUIPMENT_REQUIRED", "开工前至少配置一台岸桥和一台AGV。", actor);
    }
    const unassigned = state.tasks.filter((task) => task.vesselId === vessel.id && !task.yardBlockId);
    if (unassigned.length > 0) {
      return reject(state, role, options.requestId, "YARD_PLAN_REQUIRED", `仍有 ${unassigned.length} 个批次未分配堆场块。`, actor);
    }
    vessel.cargoStarted = true;
    vessel.cargoStartedAtSimMinute ??= state.clock.simMinute;
    vessel.stage = "working";
    for (const id of [...vessel.craneIds, ...vessel.agvIds]) findResource(state, id)!.status = "busy";
    const firstReady = state.tasks.find((task) => task.vesselId === vessel.id && task.status === "ready");
    if (firstReady) firstReady.status = "processing";
    return applied(state, role, options.requestId, `${vessel.label}开始船边装卸作业。`, actor);
  }

  if (command.type === "berth.release" && vessel) {
    if (vessel.stage !== "ready_departure" || !vessel.cargoCompleted) {
      return reject(state, role, options.requestId, "CARGO_NOT_COMPLETED", "全部装卸批次完成后才能办理泊位放行。", actor);
    }
    releaseResources(state, [...vessel.craneIds, ...vessel.agvIds], vessel.id);
    vessel.craneIds = [];
    vessel.agvIds = [];
    return applied(state, role, options.requestId, `${vessel.label}已完成泊位放行，等待离港服务。`, actor);
  }

  if (command.type === "transport.set_priority" && vessel) {
    state.transportPriority[vessel.id] = command.priority;
    return applied(state, role, options.requestId, `${vessel.label}水平运输优先级设为 ${command.priority}。`, actor);
  }

  if (command.type === "transport.send_charge") {
    const agv = findResource(state, command.agvId);
    if (!agv || agv.kind !== "agv") {
      return reject(state, role, options.requestId, "AGV_NOT_FOUND", "没有找到该AGV。", actor);
    }
    if (agv.assignedTo || agv.status !== "available") {
      return reject(state, role, options.requestId, "AGV_NOT_AVAILABLE_FOR_CHARGE", "只有空闲且未分配的AGV可以送往充电。", actor);
    }
    agv.status = "charging";
    agv.availableAtSimMinute = state.clock.simMinute + CHARGE_DURATION_MINUTES;
    return applied(state, role, options.requestId, `${agv.label}进入充电，预计 ${CHARGE_DURATION_MINUTES} 个仿真分钟后恢复。`, actor);
  }

  if (command.type === "gate.set_lane") {
    const lane = findResource(state, command.laneId);
    if (!lane || lane.kind !== "gate_lane") {
      return reject(state, role, options.requestId, "GATE_LANE_NOT_FOUND", "没有找到该闸口通道。", actor);
    }
    lane.status = command.open ? "available" : "closed";
    return applied(state, role, options.requestId, `${lane.label}已${command.open ? "开启" : "关闭"}。`, actor);
  }

  if (command.type === "yard.release_batch") {
    const task = state.tasks.find((item) => item.id === command.taskId);
    if (!task || task.status !== "completed") {
      return reject(state, role, options.requestId, "BATCH_NOT_READY", "批次完成装卸后才能办理陆侧放行。", actor);
    }
    if (task.releasedAtSimMinute !== null) {
      return reject(state, role, options.requestId, "BATCH_ALREADY_RELEASED", "该批次已经完成陆侧放行。", actor);
    }
    task.releasedAtSimMinute = state.clock.simMinute;
    const block = task.yardBlockId
      ? findResource(state, task.yardBlockId)
      : undefined;
    if (block?.kind === "yard_block") {
      const capacity = Number(block.metadata.capacity ?? 2);
      const occupied = state.tasks.filter(
        (item) =>
          item.yardBlockId === block.id && item.releasedAtSimMinute === null
      ).length;
      block.metadata.occupied = occupied;
      block.status =
        occupied === 0
          ? "available"
          : occupied >= capacity
            ? "busy"
            : "assigned";
    }
    return applied(state, role, options.requestId, `${task.label}已办理陆侧放行。`, actor);
  }

  return reject(state, role, options.requestId, "COMMAND_NOT_IMPLEMENTED", "该指令暂未实现。", actor);
}
