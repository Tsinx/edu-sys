import type {
  PortSimulationCanonicalEvent,
  PortSimulationCollaborationItem,
  PortSimulationEvent
} from "@edu/contracts";
import {
  advancePortSimulation,
  applyPortSimulationCommand,
  completePortSimulation,
  createInitialPortSimulationState,
  pausePortSimulation,
  resumePortSimulation,
  setPortSimulationSpeed,
  startPortSimulation,
  type PortSimulationEngineState
} from "./engine.js";
import {
  PORT_SIMULATION_ROLE_LABELS,
  PORT_SIMULATION_SUPPORT_ROLE_LABELS,
  type PortSimulationScenarioDefinition
} from "./scenario.js";

export interface PortSimulationReplayState {
  engine: PortSimulationEngineState;
  collaborationRevision: number;
  collaborationItems: PortSimulationCollaborationItem[];
  lastAppliedSequence: number;
}

function appendReplayEvent(
  state: PortSimulationEngineState,
  event: Omit<PortSimulationEvent, "id" | "simMinute">
) {
  state.eventSequence += 1;
  state.recentEvents.push({
    id: `event-${state.eventSequence}`,
    simMinute: state.clock.simMinute,
    ...event
  });
  state.recentEvents = state.recentEvents.slice(-120);
}

function applyTeacherControl(
  source: PortSimulationEngineState,
  scenario: PortSimulationScenarioDefinition,
  payload: Extract<
    PortSimulationCanonicalEvent["payload"],
    { type: "teacher_control" }
  >
) {
  const control = payload.control;
  if (control.type === "start") {
    const next = startPortSimulation(source, payload.serverTime);
    if (payload.missingRoles.length > 0) {
      appendReplayEvent(next, {
        type: "simulation.started_with_missing_roles",
        message: `教师确认带缺岗开局：${payload.missingRoles
          .map((role) => PORT_SIMULATION_ROLE_LABELS[role])
          .join("、")}尚未认领。`,
        role: null,
        actor: "teacher",
        outcome: "information"
      });
    }
    if (payload.missingSupportRoles.length > 0) {
      appendReplayEvent(next, {
        type: "simulation.started_with_missing_support_roles",
        message: `协作席未到岗：${payload.missingSupportRoles
          .map((role) => PORT_SIMULATION_SUPPORT_ROLE_LABELS[role])
          .join("、")}；不阻止四个业务主操开局。`,
        role: null,
        actor: "engine",
        outcome: "information"
      });
    }
    return next;
  }
  if (control.type === "pause") {
    return pausePortSimulation(
      source,
      "教师已暂停全部小组的仿真时钟。"
    );
  }
  if (control.type === "resume") {
    return resumePortSimulation(source, payload.serverTime);
  }
  if (control.type === "set_speed") {
    return setPortSimulationSpeed(
      source,
      control.timeScale,
      payload.serverTime
    );
  }
  if (control.type === "complete") return completePortSimulation(source);

  const next = createInitialPortSimulationState(scenario);
  if (payload.resetReady) {
    next.status = "ready";
    next.revision += 1;
  }
  return next;
}

export function replayPortSimulationCanonicalEvent(
  source: PortSimulationReplayState,
  scenario: PortSimulationScenarioDefinition,
  event: PortSimulationCanonicalEvent
): PortSimulationReplayState {
  if (event.sequence <= source.lastAppliedSequence) return source;
  if (event.sequence !== source.lastAppliedSequence + 1) {
    throw new Error(
      `EVENT_SEQUENCE_GAP:${source.lastAppliedSequence}:${event.sequence}`
    );
  }
  let engine = advancePortSimulation(
    source.engine,
    scenario,
    event.simMinute
  );
  let collaborationRevision = source.collaborationRevision;
  let collaborationItems = source.collaborationItems;

  if (event.payload.type === "command") {
    engine = applyPortSimulationCommand(
      engine,
      scenario,
      event.payload.role,
      event.payload.command,
      {
        requestId: event.payload.requestId,
        actor: event.payload.actor
      }
    ).state;
  } else if (event.payload.type === "teacher_control") {
    engine = applyTeacherControl(engine, scenario, event.payload);
    collaborationRevision = event.collaborationRevision;
    if (event.payload.control.type === "reset") collaborationItems = [];
  } else {
    collaborationRevision = event.payload.collaborationRevision;
    collaborationItems = structuredClone(event.payload.collaborationItems);
  }

  return {
    engine,
    collaborationRevision,
    collaborationItems,
    lastAppliedSequence: event.sequence
  };
}
