import {
  portSimulationAuthoritativeEngineStateSchema,
  portSimulationRoleSchema,
  type PortSimulationChallengeId,
  type PortSimulationRole,
  type PortSimulationScorecard,
  type PortSimulationTeamSnapshot
} from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  type PortSimulationEngineState
} from "@edu/port-simulation-core";

export const LOCAL_PORT_SIMULATION_APP_VERSION = "1.0.0";
export const LOCAL_PORT_SIMULATION_SCHEMA_VERSION = "1.0";

export interface LocalPortSimulationRunSave {
  schemaVersion: "1.0";
  appVersion: "1.0.0";
  runId: string;
  challengeId: PortSimulationChallengeId;
  challengeVersion: string;
  attemptNumber: number;
  selectedRole: PortSimulationRole;
  savedAt: string;
  state: PortSimulationEngineState;
}

export interface LocalPortSimulationAttemptSummary {
  id: string;
  challengeId: PortSimulationChallengeId;
  challengeVersion: string;
  attemptNumber: number;
  completedAt: string;
  totalScore: number;
  completedTasks: number;
  totalTasks: number;
  completedVessels: number;
  safetyInterlocks: number;
  simMinute: number;
}

export function localPortSimulationRunStorageKey(
  storageScope: string,
  challengeId: PortSimulationChallengeId
) {
  return `edu-port-simulation-local:v1:${storageScope}:${challengeId}:run`;
}

export function localPortSimulationHistoryStorageKey(storageScope: string) {
  return `edu-port-simulation-local:v1:${storageScope}:history`;
}

export function loadLocalPortSimulationRun(
  storage: Storage,
  storageScope: string,
  challengeId: PortSimulationChallengeId,
  challengeVersion: string,
  scenarioId: string,
  scenarioVersion: string
): LocalPortSimulationRunSave | null {
  try {
    const raw = storage.getItem(
      localPortSimulationRunStorageKey(storageScope, challengeId)
    );
    if (!raw) return null;
    const candidate = JSON.parse(raw) as Partial<LocalPortSimulationRunSave>;
    if (
      candidate.schemaVersion !== LOCAL_PORT_SIMULATION_SCHEMA_VERSION ||
      candidate.appVersion !== LOCAL_PORT_SIMULATION_APP_VERSION ||
      candidate.challengeId !== challengeId ||
      candidate.challengeVersion !== challengeVersion ||
      !candidate.runId ||
      typeof candidate.attemptNumber !== "number" ||
      !Number.isInteger(candidate.attemptNumber) ||
      candidate.attemptNumber < 1
    ) {
      return null;
    }
    const parsedRole = portSimulationRoleSchema.safeParse(candidate.selectedRole);
    const parsedState = portSimulationAuthoritativeEngineStateSchema.safeParse(
      candidate.state
    );
    if (
      !parsedRole.success ||
      !parsedState.success ||
      parsedState.data.scenarioId !== scenarioId ||
      parsedState.data.scenarioVersion !== scenarioVersion
    ) {
      return null;
    }
    return {
      schemaVersion: "1.0",
      appVersion: "1.0.0",
      runId: candidate.runId,
      challengeId,
      challengeVersion,
      attemptNumber: candidate.attemptNumber,
      selectedRole: parsedRole.data,
      savedAt: candidate.savedAt ?? new Date(0).toISOString(),
      state: parsedState.data
    };
  } catch {
    return null;
  }
}

export function saveLocalPortSimulationRun(
  storage: Storage,
  storageScope: string,
  save: LocalPortSimulationRunSave
) {
  storage.setItem(
    localPortSimulationRunStorageKey(storageScope, save.challengeId),
    JSON.stringify(save)
  );
}

export function loadLocalPortSimulationHistory(
  storage: Storage,
  storageScope: string
): LocalPortSimulationAttemptSummary[] {
  try {
    const raw = storage.getItem(
      localPortSimulationHistoryStorageKey(storageScope)
    );
    if (!raw) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is LocalPortSimulationAttemptSummary =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.challengeId === "string" &&
        typeof item.challengeVersion === "string" &&
        Number.isInteger(item.attemptNumber) &&
        typeof item.completedAt === "string" &&
        Number.isInteger(item.totalScore) &&
        Number.isInteger(item.completedTasks) &&
        Number.isInteger(item.totalTasks) &&
        Number.isInteger(item.completedVessels) &&
        Number.isInteger(item.safetyInterlocks) &&
        typeof item.simMinute === "number"
    );
  } catch {
    return [];
  }
}

export function saveLocalPortSimulationHistory(
  storage: Storage,
  storageScope: string,
  history: readonly LocalPortSimulationAttemptSummary[]
) {
  storage.setItem(
    localPortSimulationHistoryStorageKey(storageScope),
    JSON.stringify(history.slice(-30))
  );
}

export function createLocalPortSimulationAttemptSummary(
  save: Pick<
    LocalPortSimulationRunSave,
    "runId" | "challengeId" | "challengeVersion" | "attemptNumber"
  >,
  state: PortSimulationEngineState,
  scorecard: PortSimulationScorecard,
  completedAt: string
): LocalPortSimulationAttemptSummary {
  return {
    id: save.runId,
    challengeId: save.challengeId,
    challengeVersion: save.challengeVersion,
    attemptNumber: save.attemptNumber,
    completedAt,
    totalScore: scorecard.totalScore,
    completedTasks: state.tasks.filter((task) => task.status === "completed")
      .length,
    totalTasks: state.tasks.length,
    completedVessels: state.vessels.filter(
      (vessel) => vessel.stage === "departed"
    ).length,
    safetyInterlocks: state.metrics.rejectedCommands,
    simMinute: state.clock.simMinute
  };
}

export function createLocalPortSimulationSnapshot(input: {
  state: PortSimulationEngineState;
  actorId: string;
  actorDisplayName: string;
  storageScope: string;
  runId: string;
  challengeId: PortSimulationChallengeId;
  challengeVersion: string;
  attemptNumber: number;
  previousBestScore: number | null;
}): PortSimulationTeamSnapshot {
  const {
    state,
    actorId,
    actorDisplayName,
    storageScope,
    runId,
    challengeId,
    challengeVersion,
    attemptNumber,
    previousBestScore
  } = input;
  return {
    schemaVersion: "1.1",
    syncMode: "snapshot_legacy",
    runId,
    challengeId,
    challengeVersion,
    attemptNumber,
    previousBestScore,
    latestSequence: state.eventSequence,
    presenceRevision: 1,
    stateHash: `local-${state.revision}-${state.eventSequence}`,
    sessionId: storageScope,
    teamId: "local-solo",
    teamName: "个人全流程运行",
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    revision: state.revision,
    collaborationRevision: 1,
    memberCount: 1,
    memberCapacity: 4,
    classroomObserverCount: 0,
    status: state.status,
    clock: state.clock,
    roleSeats: PORT_MANUAL_DUAL_VESSEL_SCENARIO.roles.map((role) => ({
      role,
      participantId: actorId,
      participantDisplayName: actorDisplayName,
      claimedAt: null,
      leaseExpiresAt: null,
      connected: true
    })),
    supportSeats: [],
    collaborationItems: [],
    vessels: state.vessels,
    resources: state.resources,
    tasks: state.tasks,
    queues: state.queues,
    incidents: state.incidents,
    metrics: state.metrics,
    recentEvents: state.recentEvents
  };
}
