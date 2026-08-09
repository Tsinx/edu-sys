import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH,
  type Activity,
  type AvatarControlActionResult,
  type AvatarControlRequest,
  type AvatarControlResponse,
  type ClassroomAvatarRuntime,
  type ClassroomEventInput,
  type ClassroomPresence,
  type ClassroomActor,
  type ClassroomSnapshot,
  type ClassSession,
  type Course,
  type CreateCourseInput,
  type Dashboard,
  type PortSimulationClassroomSummary,
  type PortSimulationChallengeId,
  type PortSimulationCollaborationItem,
  type PortSimulationCollaborationCreateInput,
  type PortSimulationCollaborationResponse,
  type PortSimulationCollaborationResponseInput,
  type PortSimulationCollaborationResult,
  type PortSimulationCommandEnvelope,
  type PortSimulationCommandEnvelopeV2,
  type PortSimulationCommand,
  type PortSimulationCommandResultV2,
  type PortSimulationCommandResponse,
  type PortSimulationControlInput,
  type PortSimulationMemberCapacity,
  type PortSimulationRole,
  type PortSimulationRoleClaimResponse,
  type PortSimulationSetupInput,
  type PortSimulationSupportRole,
  type PortSimulationSupportSeatClaimResponse,
  type PortSimulationTeamConfigurationInput,
  type PortSimulationTeamSnapshot,
  type PortSimulationTeacherCommandInput,
  type PortSimulationTeacherCommandInputV2,
  type PortSimulationCanonicalEvent,
  type PortSimulationCheckpoint,
  type PortSimulationEventBatch,
  type PortSimulationPresenceDelta,
  type PortSimulationStreamMessage,
  type PortSimulationTimeSync,
  type TeacherAvatarCommandInput,
  type TeacherAvatarCommandResponse,
  type Teacher
} from "@edu/contracts";
import {
  getPortManagementLesson,
  getPortManagementGlobeCue,
  getPortManagementSlide,
  getPortManagementSlideByKey,
  type PortManagementLessonNumber,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_SLIDE_TOTAL
} from "@edu/course-content";
import {
  DEFAULT_PORT_SIMULATION_CHALLENGE_ID,
  PORT_SIMULATION_ROLE_LABELS,
  PORT_SIMULATION_SUPPORT_ROLE_LABELS,
  advancePortSimulation,
  applyPortSimulationCommand,
  calculatePortSimulationScore,
  completePortSimulation,
  createInitialPortSimulationState,
  getPortSimulationChallenge,
  getPortSimulationScenarioForChallenge,
  pausePortSimulation,
  resumePortSimulation,
  replayPortSimulationCanonicalEvent,
  setPortSimulationSpeed,
  startPortSimulation,
  canonicalPortSimulationStateJson
} from "@edu/port-simulation-core";
import {
  createInitialClassroomRuntime,
  createSeedState,
  type ClassroomRuntimeState,
  type PortSimulationClassroomRuntimeState,
  type PortSimulationRoleSeatRuntime,
  type PortSimulationSupportSeatRuntime,
  type PortSimulationTeamRuntimeState,
  type PlatformState
} from "./seed.js";
import { PortSimulationEventRepository } from "./port-simulation-event-repository.js";

export type PortSimulationStoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; message: string };

export interface PortSimulationTeamCapacityPlan {
  capacities: PortSimulationMemberCapacity[];
  classroomObserverCount: number;
}

interface IssuedPortSimulationStateHash {
  runId: string;
  sequence: number;
  businessRevision: number;
  stateHash: string;
  issuedAt: number;
}

const PORT_SIMULATION_STATE_HASH_GRACE_MS = 20_000;

/**
 * Produce the most even legal 4-6 person grouping. Seven students is the
 * single impossible total, so one student becomes a classroom observer.
 */
export function planPortSimulationTeamCapacities(
  expectedStudentCount: number
): PortSimulationTeamCapacityPlan {
  const activeStudentCount = expectedStudentCount === 7 ? 6 : expectedStudentCount;
  const minimumTeams = Math.ceil(activeStudentCount / 6);
  const maximumTeams = Math.min(15, Math.floor(activeStudentCount / 4));
  const roundedTeams = Math.round(activeStudentCount / 5);
  const teamCount = Math.max(
    minimumTeams,
    Math.min(maximumTeams, roundedTeams)
  );
  const baseCapacity = Math.floor(activeStudentCount / teamCount);
  const remainder = activeStudentCount % teamCount;
  const capacities = Array.from({ length: teamCount }, (_, index) =>
    (baseCapacity + (index < remainder ? 1 : 0)) as PortSimulationMemberCapacity
  );
  return {
    capacities,
    classroomObserverCount: expectedStudentCount === 7 ? 1 : 0
  };
}

function portSimulationCommandMatchesRole(
  command: PortSimulationCommand,
  role: PortSimulationRole
) {
  const prefixes: Record<PortSimulationRole, readonly string[]> = {
    marine_control: ["marine."],
    berth_operations: ["berth.", "quay."],
    horizontal_transport: ["transport."],
    yard_gate: ["yard.", "gate."]
  };
  return prefixes[role].some((prefix) => command.type.startsWith(prefix));
}

export class JsonStateStore {
  private state: PlatformState | undefined;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly classroomPresence = new Map<
    string,
    Map<string, number>
  >();
  private readonly classroomSnapshotListeners = new Map<
    string,
    Set<(snapshot: ClassroomSnapshot) => void>
  >();
  private readonly portSimulationTeamListeners = new Map<
    string,
    Set<(snapshot: PortSimulationTeamSnapshot) => void>
  >();
  private readonly portSimulationEventListeners = new Map<
    string,
    Set<(message: PortSimulationStreamMessage) => void>
  >();
  private readonly lastTimeSyncAt = new Map<string, number>();
  private readonly issuedPortSimulationStateHashes = new Map<
    string,
    IssuedPortSimulationStateHash[]
  >();
  private readonly pendingEventWrites = new Map<string, Promise<void>>();
  private readonly pendingCanonicalEvents = new Map<
    string,
    PortSimulationCanonicalEvent
  >();
  private readonly eventRepository: PortSimulationEventRepository;

  constructor(
    private readonly dataFile: string,
    private readonly presenceTtlMs = 45_000,
    eventDatabaseFile = `${dataFile}.simulation.sqlite`
  ) {
    this.eventRepository = new PortSimulationEventRepository(eventDatabaseFile);
  }

  async initialize(): Promise<void> {
    await mkdir(dirname(this.dataFile), { recursive: true });
    try {
      const raw = await readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw) as PlatformState;
      let runtimeStateChanged = false;
      const classroomRuntimes: Record<string, ClassroomRuntimeState> = {};
      for (const [sessionId, runtime] of Object.entries(
        parsed.classroomRuntimes ?? {}
      )) {
        const {
          participantsOnline: _legacyParticipantsOnline,
          ...sanitizedRuntime
        } = runtime as Partial<ClassroomRuntimeState> & {
          participantsOnline?: unknown;
        };
        if (_legacyParticipantsOnline !== undefined) {
          runtimeStateChanged = true;
        }
        const avatarControlHistory = Array.isArray(
          sanitizedRuntime.avatarControlHistory
        )
          ? sanitizedRuntime.avatarControlHistory
          : [];
        if (!Array.isArray(sanitizedRuntime.avatarControlHistory)) {
          runtimeStateChanged = true;
        }
        const rawSlideIndex =
          typeof sanitizedRuntime.slideIndex === "number"
            ? sanitizedRuntime.slideIndex
            : 1;
        let slideSpec =
          typeof sanitizedRuntime.slideKey === "string"
            ? getPortManagementSlideByKey(sanitizedRuntime.slideKey)
            : undefined;

        if (sanitizedRuntime.deckVersion !== PORT_MANAGEMENT_DECK_VERSION) {
          if (!slideSpec) {
            const previousLesson =
              sanitizedRuntime.deckVersion ===
              "release-port-management-voyage-v6"
                ? rawSlideIndex <= 46
                  ? 1
                  : rawSlideIndex <= 82
                    ? 2
                    : 3
                : sanitizedRuntime.deckVersion ===
                "release-port-management-voyage-v3" ||
              sanitizedRuntime.deckVersion ===
                "release-port-management-voyage-v4" ||
              sanitizedRuntime.deckVersion ===
                "release-port-management-voyage-v5"
                ? rawSlideIndex <= 36
                  ? 1
                  : rawSlideIndex <= 72
                    ? 2
                    : 3
                : rawSlideIndex <= 27
                  ? 1
                  : rawSlideIndex <= 56
                    ? 2
                    : 3;
            const lessonStart =
              getPortManagementLesson(
                previousLesson as PortManagementLessonNumber
              ).slideStart ?? 1;
            slideSpec = getPortManagementSlide(lessonStart);
          }
          runtimeStateChanged = true;
        } else if (!slideSpec) {
          slideSpec = getPortManagementSlide(
            Math.min(PORT_MANAGEMENT_SLIDE_TOTAL, Math.max(1, rawSlideIndex))
          );
          runtimeStateChanged = true;
        } else if (slideSpec.index !== rawSlideIndex) {
          runtimeStateChanged = true;
        }

        const fallbackRuntime = createInitialClassroomRuntime();
        const simulation = sanitizedRuntime.simulation
          ? structuredClone(sanitizedRuntime.simulation)
          : null;
        if (simulation) {
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .challengeId === undefined
          ) {
            simulation.challengeId = DEFAULT_PORT_SIMULATION_CHALLENGE_ID;
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .challengeVersion === undefined
          ) {
            simulation.challengeVersion = getPortSimulationChallenge(
              simulation.challengeId
            ).version;
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .assignmentSource === undefined
          ) {
            simulation.assignmentSource = "self_select";
            runtimeStateChanged = true;
          } else if (
            (simulation as { assignmentSource?: string }).assignmentSource ===
            "roster"
          ) {
            simulation.assignmentSource = "external_fixed";
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .assignmentAdjusted === undefined
          ) {
            simulation.assignmentAdjusted = false;
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .deliveryMode === undefined
          ) {
            simulation.deliveryMode = "network_teams_legacy";
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .expectedStudentCount === undefined
          ) {
            simulation.expectedStudentCount = simulation.teams.length * 4;
            runtimeStateChanged = true;
          }
          if (
            (simulation as Partial<PortSimulationClassroomRuntimeState>)
              .classroomObserverCount === undefined
          ) {
            simulation.classroomObserverCount = 0;
            runtimeStateChanged = true;
          }
          for (const team of simulation.teams) {
            const partialTeam = team as Partial<PortSimulationTeamRuntimeState>;
            if (!partialTeam.challengeId) {
              team.challengeId = simulation.challengeId;
              runtimeStateChanged = true;
            }
            if (!partialTeam.challengeVersion) {
              team.challengeVersion = simulation.challengeVersion;
              runtimeStateChanged = true;
            }
            if (typeof partialTeam.attemptNumber !== "number") {
              team.attemptNumber = 1;
              runtimeStateChanged = true;
            }
            if (!Array.isArray(partialTeam.scoreHistory)) {
              team.scoreHistory = [];
              runtimeStateChanged = true;
            }
            if (!partialTeam.runId) {
              team.runId = `legacy-${randomUUID()}`;
              runtimeStateChanged = true;
            }
            if (!partialTeam.syncMode) {
              team.syncMode = "snapshot_legacy";
              runtimeStateChanged = true;
            }
            if (typeof partialTeam.latestSequence !== "number") {
              team.latestSequence = 0;
              runtimeStateChanged = true;
            }
            if (typeof partialTeam.presenceRevision !== "number") {
              team.presenceRevision = 1;
              runtimeStateChanged = true;
            }
            if (partialTeam.lastCheckpointAt === undefined) {
              team.lastCheckpointAt = null;
              runtimeStateChanged = true;
            }
            if (typeof partialTeam.eventsSinceCheckpoint !== "number") {
              team.eventsSinceCheckpoint = 0;
              runtimeStateChanged = true;
            }
            if (!Array.isArray(team.memberParticipantIds)) {
              team.memberParticipantIds = team.roleSeats
                .map((seat) => seat.participantId)
                .filter((participantId): participantId is string =>
                  Boolean(participantId)
                );
              runtimeStateChanged = true;
            }
            if (!partialTeam.memberDisplayNames) {
              team.memberDisplayNames = Object.fromEntries(
                team.memberParticipantIds.map((participantId) => [
                  participantId,
                  "课堂成员"
                ])
              );
              runtimeStateChanged = true;
            }
            if (
              (team as Partial<PortSimulationTeamRuntimeState>)
                .memberCapacity === undefined
            ) {
              team.memberCapacity = Math.min(
                6,
                Math.max(4, team.memberParticipantIds.length)
              ) as PortSimulationMemberCapacity;
              runtimeStateChanged = true;
            }
            if (!Array.isArray(team.supportSeats)) {
              team.supportSeats = [];
              runtimeStateChanged = true;
            }
            for (const seat of team.roleSeats) {
              if (
                (seat as Partial<PortSimulationRoleSeatRuntime>)
                  .participantDisplayName === undefined
              ) {
                seat.participantDisplayName = seat.participantId
                  ? team.memberDisplayNames[seat.participantId] ?? "课堂成员"
                  : null;
                runtimeStateChanged = true;
              }
            }
            for (const seat of team.supportSeats) {
              if (
                (seat as Partial<PortSimulationSupportSeatRuntime>)
                  .participantDisplayName === undefined
              ) {
                seat.participantDisplayName = seat.participantId
                  ? team.memberDisplayNames[seat.participantId] ?? "课堂成员"
                  : null;
                runtimeStateChanged = true;
              }
            }
            if (typeof team.collaborationRevision !== "number") {
              team.collaborationRevision = 1;
              runtimeStateChanged = true;
            }
            if (!Array.isArray(team.collaborationItems)) {
              team.collaborationItems = [];
              runtimeStateChanged = true;
            }
            if (!Array.isArray(team.collaborationReceipts)) {
              team.collaborationReceipts = [];
              runtimeStateChanged = true;
            }
            const scenario = getPortSimulationScenarioForChallenge(
              team.challengeId,
              team.engine.scenarioVersion
            );
            for (const vessel of team.engine.vessels) {
              if (
                (vessel as { requiredOutreachClass?: unknown })
                  .requiredOutreachClass === undefined
              ) {
                vessel.requiredOutreachClass =
                  scenario.vessels.find((item) => item.id === vessel.id)
                    ?.requiredOutreachClass ?? "standard";
                runtimeStateChanged = true;
              }
              if (
                (vessel as { cargoStartedAtSimMinute?: number | null })
                  .cargoStartedAtSimMinute === undefined
              ) {
                vessel.cargoStartedAtSimMinute = null;
                runtimeStateChanged = true;
              }
              if (
                (vessel as { cargoCompletedAtSimMinute?: number | null })
                  .cargoCompletedAtSimMinute === undefined
              ) {
                vessel.cargoCompletedAtSimMinute = null;
                runtimeStateChanged = true;
              }
            }
            for (const resource of team.engine.resources) {
              if (
                (resource as { quayCrane?: unknown }).quayCrane === undefined
              ) {
                resource.quayCrane = null;
                runtimeStateChanged = true;
              }
            }
            for (const metric of team.engine.metrics.resourceMinutes) {
              if ((metric as { traveling?: unknown }).traveling === undefined) {
                metric.traveling = 0;
                runtimeStateChanged = true;
              }
            }
            if (
              (team.engine.metrics as { craneMoves?: unknown }).craneMoves ===
              undefined
            ) {
              team.engine.metrics.craneMoves = {
                completed: 0,
                rejected: 0,
                totalDistance: 0,
                totalTravelMinutes: 0,
                matchingBlocks: 0
              };
              runtimeStateChanged = true;
            }
            for (const task of team.engine.tasks) {
              if (
                (task as { releasedAtSimMinute?: number | null })
                  .releasedAtSimMinute === undefined
              ) {
                task.releasedAtSimMinute = null;
                runtimeStateChanged = true;
              }
            }
            if (team.engine.status === "running") {
              team.engine = pausePortSimulation(
                team.engine,
                "服务已重新启动，仿真安全暂停，等待教师恢复。"
              );
              runtimeStateChanged = true;
            }
            if (team.syncMode === "event_stream_v1") {
              this.eventRepository.registerRun({
                runId: team.runId,
                sessionId,
                teamId: team.id,
                scenarioId: team.engine.scenarioId,
                scenarioVersion: team.engine.scenarioVersion,
                syncMode: "event_stream_v1",
                createdAt: team.lastCheckpointAt ?? new Date().toISOString()
              });
              const checkpoint = this.eventRepository.getLatestCheckpoint(
                team.runId
              );
              if (checkpoint && checkpoint.sequence >= team.latestSequence) {
                team.engine = structuredClone(checkpoint.state.engine);
                team.latestSequence = checkpoint.sequence;
                team.collaborationRevision =
                  checkpoint.state.collaborationRevision;
                team.collaborationItems = structuredClone(
                  checkpoint.state.collaborationItems
                );
                team.lastCheckpointAt = checkpoint.serverTime;
                team.eventsSinceCheckpoint = 0;
                runtimeStateChanged = true;
              }
              if (checkpoint) {
                const batch = this.eventRepository.getEventsAfter(
                  team.runId,
                  checkpoint.sequence
                );
                if (batch.resyncRequired) {
                  throw new Error(
                    `PORT_SIMULATION_REPLAY_COMPACTED:${team.runId}:${checkpoint.sequence}`
                  );
                }
                let replayState = {
                  engine: structuredClone(checkpoint.state.engine),
                  collaborationRevision:
                    checkpoint.state.collaborationRevision,
                  collaborationItems: structuredClone(
                    checkpoint.state.collaborationItems
                  ),
                  lastAppliedSequence: checkpoint.sequence
                };
                for (const event of batch.events) {
                  replayState = replayPortSimulationCanonicalEvent(
                    replayState,
                    getPortSimulationScenarioForChallenge(
                      team.challengeId,
                      team.engine.scenarioVersion
                    ),
                    event
                  );
                  const replayHash = createHash("sha256")
                    .update(
                      canonicalPortSimulationStateJson(replayState.engine)
                    )
                    .digest("hex");
                  if (replayHash !== event.stateHash) {
                    throw new Error(
                      `PORT_SIMULATION_REPLAY_HASH_MISMATCH:${team.runId}:${event.sequence}`
                    );
                  }
                }
                team.engine = replayState.engine;
                team.collaborationRevision =
                  replayState.collaborationRevision;
                team.collaborationItems = replayState.collaborationItems;
                team.latestSequence = replayState.lastAppliedSequence;
              }
              if (team.engine.status === "running") {
                team.engine = pausePortSimulation(
                  team.engine,
                  "服务已重新启动，事件流仿真安全暂停，等待教师恢复。"
                );
                runtimeStateChanged = true;
              }
              for (const seat of team.roleSeats) {
                seat.participantId = null;
                seat.participantDisplayName = null;
                seat.roleSeatToken = null;
                seat.claimedAt = null;
                seat.lastSeenAt = null;
              }
              for (const seat of team.supportSeats) {
                seat.participantId = null;
                seat.participantDisplayName = null;
                seat.supportSeatToken = null;
                seat.claimedAt = null;
                seat.lastSeenAt = null;
              }
              team.presenceRevision += 1;
            }
          }
        }
        classroomRuntimes[sessionId] = {
          ...fallbackRuntime,
          ...sanitizedRuntime,
          slideIndex: slideSpec.index,
          slideKey: slideSpec.slideKey,
          deckVersion: PORT_MANAGEMENT_DECK_VERSION,
          avatar: sanitizedRuntime.avatar ?? fallbackRuntime.avatar,
          runtimeVersion:
            sanitizedRuntime.runtimeVersion ?? fallbackRuntime.runtimeVersion,
          activeActivity:
            sanitizedRuntime.activeActivity ?? fallbackRuntime.activeActivity,
          globePlayback:
            sanitizedRuntime.globePlayback ??
            fallbackRuntime.globePlayback,
          simulation,
          avatarControlHistory
        };
      }
      this.state = {
        ...parsed,
        classroomRuntimes
      };
      for (const [sessionId, runtime] of Object.entries(classroomRuntimes)) {
        for (const team of runtime.simulation?.teams ?? []) {
          if (team.syncMode === "event_stream_v1") {
            this.savePortSimulationCheckpoint(sessionId, team);
          }
        }
      }
      if (runtimeStateChanged) {
        await this.persist();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      this.state = createSeedState();
      await this.persist();
    }
  }

  private get current(): PlatformState {
    if (!this.state) {
      throw new Error("State store has not been initialized");
    }
    return this.state;
  }

  private async persist(): Promise<void> {
    const temporaryFile = `${this.dataFile}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(this.current, null, 2)}\n`, "utf8");
    await rename(temporaryFile, this.dataFile);
  }

  close() {
    this.eventRepository.close();
  }

  private portSimulationStateHash(team: PortSimulationTeamRuntimeState) {
    return createHash("sha256")
      .update(canonicalPortSimulationStateJson(team.engine))
      .digest("hex");
  }

  private rememberIssuedPortSimulationStateHash(
    sessionId: string,
    teamId: string,
    value: Omit<IssuedPortSimulationStateHash, "issuedAt">,
    now = Date.now()
  ) {
    const key = this.portSimulationTeamKey(sessionId, teamId);
    const recent = (this.issuedPortSimulationStateHashes.get(key) ?? [])
      .filter(
        (item) =>
          item.runId === value.runId &&
          now - item.issuedAt <= PORT_SIMULATION_STATE_HASH_GRACE_MS
      )
      .filter(
        (item) =>
          item.sequence !== value.sequence ||
          item.businessRevision !== value.businessRevision ||
          item.stateHash !== value.stateHash
      );
    recent.push({ ...value, issuedAt: now });
    this.issuedPortSimulationStateHashes.set(key, recent.slice(-8));
  }

  private acceptsIssuedPortSimulationStateHash(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    input: Pick<
      PortSimulationCommandEnvelopeV2,
      "lastAppliedSequence" | "expectedRevision" | "baseStateHash"
    >,
    now = Date.now()
  ) {
    const key = this.portSimulationTeamKey(sessionId, team.id);
    const recent = (this.issuedPortSimulationStateHashes.get(key) ?? []).filter(
      (item) =>
        item.runId === team.runId &&
        now - item.issuedAt <= PORT_SIMULATION_STATE_HASH_GRACE_MS
    );
    this.issuedPortSimulationStateHashes.set(key, recent);
    return recent.some(
      (item) =>
        item.sequence === input.lastAppliedSequence &&
        item.businessRevision === input.expectedRevision &&
        item.stateHash === input.baseStateHash
    );
  }

  private async mutate<T>(
    operation: (state: PlatformState) => T,
    shouldPersist: boolean | ((result: T) => boolean) = true
  ): Promise<T> {
    let result!: T;
    const queued = this.mutationQueue.then(async () => {
      result = operation(this.current);
      const persistResult =
        typeof shouldPersist === "function"
          ? shouldPersist(result)
          : shouldPersist;
      if (persistResult) await this.persist();
    });
    this.mutationQueue = queued.catch(() => undefined);
    await queued;
    return result;
  }

  getTeacher(): Teacher {
    const teacher = this.current.teachers[0];
    if (!teacher) {
      throw new Error("Seed teacher is missing");
    }
    return teacher;
  }

  listCourses(): Course[] {
    return [...this.current.courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getCourse(id: string): Course | undefined {
    return this.current.courses.find((course) => course.id === id);
  }

  listSessions(): ClassSession[] {
    return [...this.current.classSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  getSession(id: string): ClassSession | undefined {
    return this.current.classSessions.find((session) => session.id === id);
  }

  private activeParticipantCount(sessionId: string, now = Date.now()): number {
    const sessionPresence = this.classroomPresence.get(sessionId);
    if (!sessionPresence) {
      return 0;
    }
    for (const [participantId, lastSeenAt] of sessionPresence) {
      if (now - lastSeenAt >= this.presenceTtlMs) {
        sessionPresence.delete(participantId);
      }
    }
    if (sessionPresence.size === 0) {
      this.classroomPresence.delete(sessionId);
      return 0;
    }
    return sessionPresence.size;
  }

  private portSimulationTeamKey(sessionId: string, teamId: string) {
    return `${sessionId}:${teamId}`;
  }

  private portSimulationScenarioForTeam(team: PortSimulationTeamRuntimeState) {
    return getPortSimulationScenarioForChallenge(
      team.challengeId,
      team.engine.scenarioVersion
    );
  }

  private previousPortSimulationBestScore(
    team: PortSimulationTeamRuntimeState
  ): number | null {
    const eligibleScores = team.scoreHistory
      .filter(
        (entry) =>
          entry.rankEligible && entry.attemptNumber < team.attemptNumber
      )
      .map((entry) => entry.totalScore);
    return eligibleScores.length ? Math.max(...eligibleScores) : null;
  }

  private recordPortSimulationAttempt(
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    if (
      team.scoreHistory.some(
        (entry) => entry.attemptNumber === team.attemptNumber
      )
    ) {
      return;
    }
    const scorecard = calculatePortSimulationScore({
      state: team.engine,
      collaborationItems: team.collaborationItems
    });
    team.scoreHistory.push({
      attemptNumber: team.attemptNumber,
      totalScore: scorecard.totalScore,
      rankEligible: scorecard.rankEligible,
      completedAt: new Date(now).toISOString()
    });
  }

  private simulationSeatConnected(
    seat: Pick<PortSimulationRoleSeatRuntime, "participantId" | "lastSeenAt">,
    now = Date.now()
  ) {
    if (!seat.participantId || !seat.lastSeenAt) return false;
    return now - new Date(seat.lastSeenAt).getTime() < this.presenceTtlMs;
  }

  private buildPortSimulationRoleSeats(
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    return team.roleSeats.map((seat) => {
      const basis = seat.lastSeenAt ?? seat.claimedAt;
      return {
        role: seat.role,
        participantId: seat.participantId,
        participantDisplayName: seat.participantDisplayName,
        claimedAt: seat.claimedAt,
        leaseExpiresAt:
          seat.participantId && basis
            ? new Date(new Date(basis).getTime() + this.presenceTtlMs).toISOString()
            : null,
        connected: this.simulationSeatConnected(seat, now)
      };
    });
  }

  private buildPortSimulationSupportSeats(
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    return team.supportSeats.map((seat) => {
      const basis = seat.lastSeenAt ?? seat.claimedAt;
      return {
        role: seat.role,
        participantId: seat.participantId,
        participantDisplayName: seat.participantDisplayName,
        claimedAt: seat.claimedAt,
        leaseExpiresAt:
          seat.participantId && basis
            ? new Date(new Date(basis).getTime() + this.presenceTtlMs).toISOString()
            : null,
        connected: this.simulationSeatConnected(seat, now)
      };
    });
  }

  private buildPortSimulationPresenceDelta(
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ): PortSimulationPresenceDelta {
    return {
      runId: team.runId,
      teamId: team.id,
      presenceRevision: team.presenceRevision,
      memberCount: team.memberParticipantIds.length,
      roleSeats: this.buildPortSimulationRoleSeats(team, now),
      supportSeats: this.buildPortSimulationSupportSeats(team, now),
      serverTime: new Date(now).toISOString()
    };
  }

  private buildPortSimulationCheckpoint(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ): PortSimulationCheckpoint {
    const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
    return {
      schemaVersion: "1.0",
      syncMode: "event_stream_v1",
      runId: team.runId,
      sessionId,
      teamId: team.id,
      challengeId: team.challengeId,
      challengeVersion: team.challengeVersion,
      attemptNumber: team.attemptNumber,
      previousBestScore: this.previousPortSimulationBestScore(team),
      scenarioId: team.engine.scenarioId,
      scenarioVersion: team.engine.scenarioVersion,
      sequence: team.latestSequence,
      businessRevision: team.engine.revision,
      collaborationRevision: team.collaborationRevision,
      serverTime: new Date(now).toISOString(),
      state: {
        teamName: team.name,
        memberCount: team.memberParticipantIds.length,
        memberCapacity: team.memberCapacity,
        classroomObserverCount: simulation?.classroomObserverCount ?? 0,
        roleSeats: this.buildPortSimulationRoleSeats(team, now),
        supportSeats: this.buildPortSimulationSupportSeats(team, now),
        presenceRevision: team.presenceRevision,
        engine: structuredClone(team.engine),
        collaborationRevision: team.collaborationRevision,
        collaborationItems: structuredClone(team.collaborationItems)
      },
      stateHash: this.portSimulationStateHash(team)
    };
  }

  private savePortSimulationCheckpoint(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    if (team.syncMode !== "event_stream_v1") return;
    this.eventRepository.registerRun({
      runId: team.runId,
      sessionId,
      teamId: team.id,
      scenarioId: team.engine.scenarioId,
      scenarioVersion: team.engine.scenarioVersion,
      syncMode: "event_stream_v1",
      createdAt: team.lastCheckpointAt ?? new Date(now).toISOString()
    });
    this.eventRepository.saveCheckpoint(
      this.buildPortSimulationCheckpoint(sessionId, team, now)
    );
    team.lastCheckpointAt = new Date(now).toISOString();
    team.eventsSinceCheckpoint = 0;
    this.eventRepository.compactEvents(team.runId);
  }

  private maybeSavePortSimulationCheckpoint(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    const elapsed = team.lastCheckpointAt
      ? now - new Date(team.lastCheckpointAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (team.eventsSinceCheckpoint >= 50 || elapsed >= 30_000) {
      this.savePortSimulationCheckpoint(sessionId, team, now);
    }
  }

  private buildPortSimulationTeamSnapshot(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ): PortSimulationTeamSnapshot {
    const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
    return {
      schemaVersion: "1.1",
      syncMode: team.syncMode,
      runId: team.runId,
      latestSequence: team.latestSequence,
      presenceRevision: team.presenceRevision,
      stateHash: this.portSimulationStateHash(team),
      sessionId,
      teamId: team.id,
      teamName: team.name,
      challengeId: team.challengeId,
      challengeVersion: team.challengeVersion,
      attemptNumber: team.attemptNumber,
      previousBestScore: this.previousPortSimulationBestScore(team),
      scenarioId: team.engine.scenarioId,
      scenarioVersion: team.engine.scenarioVersion,
      revision: team.engine.revision,
      collaborationRevision: team.collaborationRevision,
      memberCount: team.memberParticipantIds.length,
      memberCapacity: team.memberCapacity,
      classroomObserverCount: simulation?.classroomObserverCount ?? 0,
      status: team.engine.status,
      clock: { ...team.engine.clock },
      roleSeats: team.roleSeats.map((seat) => {
        const basis = seat.lastSeenAt ?? seat.claimedAt;
        return {
          role: seat.role,
          participantId: seat.participantId,
          participantDisplayName: seat.participantDisplayName,
          claimedAt: seat.claimedAt,
          leaseExpiresAt:
            seat.participantId && basis
              ? new Date(
                  new Date(basis).getTime() + this.presenceTtlMs
                ).toISOString()
              : null,
          connected: this.simulationSeatConnected(seat, now)
        };
      }),
      supportSeats: team.supportSeats.map((seat) => {
        const basis = seat.lastSeenAt ?? seat.claimedAt;
        return {
          role: seat.role,
          participantId: seat.participantId,
          participantDisplayName: seat.participantDisplayName,
          claimedAt: seat.claimedAt,
          leaseExpiresAt:
            seat.participantId && basis
              ? new Date(
                  new Date(basis).getTime() + this.presenceTtlMs
                ).toISOString()
              : null,
          connected: this.simulationSeatConnected(seat, now)
        };
      }),
      collaborationItems: structuredClone(team.collaborationItems),
      vessels: structuredClone(team.engine.vessels),
      resources: structuredClone(team.engine.resources),
      tasks: structuredClone(team.engine.tasks),
      queues: structuredClone(team.engine.queues),
      incidents: structuredClone(team.engine.incidents),
      metrics: structuredClone(team.engine.metrics),
      recentEvents: structuredClone(team.engine.recentEvents)
    };
  }

  private buildPortSimulationSummary(
    simulation: PortSimulationClassroomRuntimeState | null,
    now = Date.now()
  ): PortSimulationClassroomSummary | null {
    if (!simulation) return null;
    const teamSummaries = simulation.teams.map((team) => {
      const delaySources = [
        {
          label: "锚地等待",
          minutes: team.engine.vessels.reduce(
            (sum, vessel) => sum + vessel.waitMinutes.anchorage,
            0
          )
        },
        {
          label: "航道等待",
          minutes: team.engine.vessels.reduce(
            (sum, vessel) => sum + vessel.waitMinutes.channel,
            0
          )
        },
        {
          label: "泊位等待",
          minutes: team.engine.vessels.reduce(
            (sum, vessel) => sum + vessel.waitMinutes.berth,
            0
          )
        },
        {
          label: "装卸阻塞",
          minutes: team.engine.vessels.reduce(
            (sum, vessel) => sum + vessel.waitMinutes.cargo,
            0
          )
        }
      ];
      const mainDelay = delaySources.reduce((largest, item) =>
        item.minutes > largest.minutes ? item : largest
      );
      const scorecard = calculatePortSimulationScore({
        state: team.engine,
        collaborationItems: team.collaborationItems
      });
      const previousBestScore = this.previousPortSimulationBestScore(team);
      return {
        teamId: team.id,
        teamName: team.name,
        status: team.engine.status,
        revision: team.engine.revision,
        collaborationRevision: team.collaborationRevision,
        syncMode: team.syncMode,
        runId: team.runId,
        latestSequence: team.latestSequence,
        presenceRevision: team.presenceRevision,
        simMinute: team.engine.clock.simMinute,
        memberCount: team.memberParticipantIds.length,
        memberCapacity: team.memberCapacity,
        occupiedRoles: team.roleSeats.filter(
          (seat) =>
            seat.participantId && this.simulationSeatConnected(seat, now)
        ).length,
        occupiedSupportSeats: team.supportSeats.filter(
          (seat) =>
            seat.participantId && this.simulationSeatConnected(seat, now)
        ).length,
        coreRolesReady: team.roleSeats.every((seat) =>
          this.simulationSeatConnected(seat, now)
        ),
        completedVessels: team.engine.vessels.filter(
          (vessel) => vessel.stage === "departed"
        ).length,
        rejectedCommands: team.engine.metrics.rejectedCommands,
        gateQueuePeak: team.engine.metrics.gateQueuePeak,
        incompleteTasks: team.engine.metrics.incompleteTasks,
        teacherTakeovers: team.engine.metrics.teacherTakeovers,
        totalWaitMinutes: delaySources.reduce(
          (sum, item) => sum + item.minutes,
          0
        ),
        mainDelaySource:
          mainDelay.minutes > 0 ? mainDelay.label : "尚未形成等待",
        attemptNumber: team.attemptNumber,
        previousBestScore,
        scoreImprovement:
          previousBestScore === null
            ? null
            : scorecard.totalScore - previousBestScore,
        overallRank: null as number | null,
        staffingRank: null as number | null,
        improvementRank: null as number | null,
        scorecard
      };
    });
    const scoreOrder = (left: typeof teamSummaries[number], right: typeof teamSummaries[number]) =>
      right.scorecard.totalScore - left.scorecard.totalScore ||
      right.scorecard.tieBreakers.safetyPoints -
        left.scorecard.tieBreakers.safetyPoints ||
      right.scorecard.tieBreakers.completedTasks -
        left.scorecard.tieBreakers.completedTasks ||
      left.scorecard.tieBreakers.totalWaitMinutes -
        right.scorecard.tieBreakers.totalWaitMinutes ||
      left.teamId.localeCompare(right.teamId);
    teamSummaries
      .filter((team) => team.scorecard.rankEligible)
      .sort(scoreOrder)
      .forEach((team, index) => {
        team.overallRank = index + 1;
      });
    for (const capacity of [4, 5, 6] as const) {
      teamSummaries
        .filter(
          (team) =>
            team.memberCapacity === capacity && team.scorecard.rankEligible
        )
        .sort(scoreOrder)
        .forEach((team, index) => {
          team.staffingRank = index + 1;
        });
    }
    teamSummaries
      .filter(
        (team) =>
          team.scorecard.rankEligible && team.scoreImprovement !== null
      )
      .sort(
        (left, right) =>
          (right.scoreImprovement ?? 0) - (left.scoreImprovement ?? 0) ||
          scoreOrder(left, right)
      )
      .forEach((team, index) => {
        team.improvementRank = index + 1;
      });
    return {
      scenarioId: simulation.scenarioId,
      scenarioVersion: simulation.scenarioVersion,
      challengeId: simulation.challengeId,
      challengeVersion: simulation.challengeVersion,
      deliveryMode: simulation.deliveryMode,
      assignmentSource: simulation.assignmentSource,
      assignmentAdjusted: simulation.assignmentAdjusted,
      expectedStudentCount: simulation.expectedStudentCount,
      classroomObserverCount: simulation.classroomObserverCount,
      timeScale: simulation.teams[0]?.engine.clock.timeScale ?? 1,
      teams: teamSummaries
    };
  }

  private buildClassroomSnapshot(
    state: PlatformState,
    session: ClassSession,
    runtime: ClassroomRuntimeState
  ): ClassroomSnapshot | undefined {
    const course = state.courses.find((candidate) => candidate.id === session.courseId);
    if (!course) {
      return undefined;
    }
    const slideSpec =
      getPortManagementSlideByKey(runtime.slideKey) ??
      getPortManagementSlide(runtime.slideIndex);
    const slideSummary = [
      slideSpec.lead,
      ...(slideSpec.bullets ?? []),
      ...(slideSpec.steps ?? [])
    ]
      .filter(Boolean)
      .join("；");

    return {
      session,
      courseId: course.id,
      courseTitle: course.title,
      chapterTitle: slideSpec.lessonTitle,
      activeActivity: runtime.activeActivity,
      slide: {
        deckId: `deck-${course.id}-foundations`,
        versionId: PORT_MANAGEMENT_DECK_VERSION,
        slideId: slideSpec.slideKey,
        index: slideSpec.index,
        total: PORT_MANAGEMENT_SLIDE_TOTAL,
        logicalWidth: SLIDE_LOGICAL_WIDTH,
        logicalHeight: SLIDE_LOGICAL_HEIGHT,
        aspectRatio: SLIDE_ASPECT_RATIO,
        title: slideSpec.title,
        lessonNumber: slideSpec.lesson,
        lessonTitle: slideSpec.lessonTitle,
        section: slideSpec.section,
        summary: slideSummary || slideSpec.title
      },
      participantsOnline: this.activeParticipantCount(session.id),
      runtimeVersion: runtime.runtimeVersion,
      globePlayback: { ...runtime.globePlayback },
      simulation: this.buildPortSimulationSummary(runtime.simulation),
      avatar: { ...runtime.avatar }
    };
  }

  subscribeClassroomSnapshot(
    sessionId: string,
    listener: (snapshot: ClassroomSnapshot) => void
  ): () => void {
    const listeners =
      this.classroomSnapshotListeners.get(sessionId) ??
      new Set<(snapshot: ClassroomSnapshot) => void>();
    listeners.add(listener);
    this.classroomSnapshotListeners.set(sessionId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.classroomSnapshotListeners.delete(sessionId);
      }
    };
  }

  private publishClassroomSnapshot(
    sessionId: string,
    snapshot: ClassroomSnapshot | undefined
  ) {
    if (!snapshot) return;
    for (const listener of this.classroomSnapshotListeners.get(sessionId) ?? []) {
      listener(snapshot);
    }
  }

  subscribePortSimulationTeamSnapshot(
    sessionId: string,
    teamId: string,
    listener: (snapshot: PortSimulationTeamSnapshot) => void
  ): () => void {
    const key = this.portSimulationTeamKey(sessionId, teamId);
    const listeners =
      this.portSimulationTeamListeners.get(key) ??
      new Set<(snapshot: PortSimulationTeamSnapshot) => void>();
    listeners.add(listener);
    this.portSimulationTeamListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.portSimulationTeamListeners.delete(key);
    };
  }

  private publishPortSimulationTeamSnapshot(
    sessionId: string,
    snapshot: PortSimulationTeamSnapshot | undefined
  ) {
    if (!snapshot) return;
    const key = this.portSimulationTeamKey(sessionId, snapshot.teamId);
    for (const listener of this.portSimulationTeamListeners.get(key) ?? []) {
      listener(snapshot);
    }
  }

  subscribePortSimulationEvents(
    sessionId: string,
    teamId: string,
    listener: (message: PortSimulationStreamMessage) => void
  ) {
    const key = this.portSimulationTeamKey(sessionId, teamId);
    const listeners =
      this.portSimulationEventListeners.get(key) ??
      new Set<(message: PortSimulationStreamMessage) => void>();
    listeners.add(listener);
    this.portSimulationEventListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.portSimulationEventListeners.delete(key);
    };
  }

  private publishPortSimulationStreamMessage(
    sessionId: string,
    teamId: string,
    message: PortSimulationStreamMessage
  ) {
    const key = this.portSimulationTeamKey(sessionId, teamId);
    for (const listener of this.portSimulationEventListeners.get(key) ?? []) {
      listener(message);
    }
  }

  private publishPortSimulationPresence(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    if (team.syncMode === "event_stream_v1") {
      this.publishPortSimulationStreamMessage(sessionId, team.id, {
        type: "presence",
        presence: this.buildPortSimulationPresenceDelta(team, now)
      });
    } else {
      this.publishPortSimulationTeamSnapshot(
        sessionId,
        this.buildPortSimulationTeamSnapshot(sessionId, team, now)
      );
    }
  }

  private appendPortSimulationCanonicalEvent(
    sessionId: string,
    team: PortSimulationTeamRuntimeState,
    kind: PortSimulationCanonicalEvent["kind"],
    payload: PortSimulationCanonicalEvent["payload"],
    now = Date.now(),
    receipt?: PortSimulationCommandResultV2
  ) {
    if (team.syncMode !== "event_stream_v1") return undefined;
    const event: PortSimulationCanonicalEvent = {
      schemaVersion: "1.0",
      runId: team.runId,
      sessionId,
      teamId: team.id,
      sequence: team.latestSequence + 1,
      businessRevision: team.engine.revision,
      collaborationRevision: team.collaborationRevision,
      simMinute: team.engine.clock.simMinute,
      kind,
      payload,
      stateHash: this.portSimulationStateHash(team),
      createdAt: new Date(now).toISOString()
    };
    team.latestSequence = event.sequence;
    team.eventsSinceCheckpoint += 1;
    this.rememberIssuedPortSimulationStateHash(
      sessionId,
      team.id,
      {
        runId: event.runId,
        sequence: event.sequence,
        businessRevision: event.businessRevision,
        stateHash: event.stateHash
      },
      now
    );
    if (receipt) {
      const key = `${team.runId}:${receipt.requestId}`;
      this.pendingCanonicalEvents.set(key, event);
      this.pendingEventWrites.set(
        key,
        this.eventRepository.enqueueEventWithReceipt(event, receipt)
      );
    } else {
      this.eventRepository.appendEvent(event);
      this.publishPortSimulationStreamMessage(sessionId, team.id, {
        type: "event",
        event
      });
      this.maybeSavePortSimulationCheckpoint(sessionId, team, now);
    }
    return event;
  }

  getPortSimulationCheckpoint(
    sessionId: string,
    teamId: string
  ): PortSimulationCheckpoint | undefined {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    if (!team || team.syncMode !== "event_stream_v1") return undefined;
    const checkpoint =
      this.eventRepository.getLatestCheckpoint(team.runId) ??
      this.buildPortSimulationCheckpoint(sessionId, team);
    this.rememberIssuedPortSimulationStateHash(sessionId, team.id, {
      runId: checkpoint.runId,
      sequence: checkpoint.sequence,
      businessRevision: checkpoint.businessRevision,
      stateHash: checkpoint.stateHash
    });
    return checkpoint;
  }

  getPortSimulationEventsAfter(
    sessionId: string,
    teamId: string,
    afterSequence: number
  ): PortSimulationEventBatch | undefined {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    if (!team || team.syncMode !== "event_stream_v1") return undefined;
    const batch = this.eventRepository.getEventsAfter(team.runId, afterSequence);
    const now = Date.now();
    for (const event of batch.events) {
      this.rememberIssuedPortSimulationStateHash(
        sessionId,
        team.id,
        {
          runId: event.runId,
          sequence: event.sequence,
          businessRevision: event.businessRevision,
          stateHash: event.stateHash
        },
        now
      );
    }
    return batch;
  }

  getPortSimulationPresence(
    sessionId: string,
    teamId: string
  ): PortSimulationPresenceDelta | undefined {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    return team ? this.buildPortSimulationPresenceDelta(team) : undefined;
  }

  forcePortSimulationResync(sessionId: string, teamId: string) {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    if (!team || team.syncMode !== "event_stream_v1") return false;
    this.savePortSimulationCheckpoint(sessionId, team);
    this.publishPortSimulationStreamMessage(sessionId, teamId, {
      type: "resync_required",
      runId: team.runId,
      latestSequence: team.latestSequence,
      message: "教师要求重新读取权威检查点。"
    });
    return true;
  }

  getClassroomSnapshot(id: string): ClassroomSnapshot | undefined {
    const session = this.getSession(id);
    if (!session) {
      return undefined;
    }
    const runtime = this.current.classroomRuntimes[id] ?? createInitialClassroomRuntime();
    return this.buildClassroomSnapshot(this.current, session, runtime);
  }

  heartbeatClassroomPresence(
    sessionId: string,
    participantId: string
  ): ClassroomPresence | undefined {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "live") {
      return undefined;
    }
    const now = Date.now();
    const sessionPresence =
      this.classroomPresence.get(sessionId) ?? new Map<string, number>();
    sessionPresence.set(participantId, now);
    this.classroomPresence.set(sessionId, sessionPresence);
    const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
    if (simulation) {
      const timestamp = new Date(now).toISOString();
      for (const team of simulation.teams) {
        let becameConnected = false;
        let touchedSeat = false;
        for (const seat of team.roleSeats) {
          if (seat.participantId === participantId) {
            becameConnected ||= !this.simulationSeatConnected(seat, now);
            touchedSeat = true;
            seat.lastSeenAt = timestamp;
          }
        }
        for (const seat of team.supportSeats) {
          if (seat.participantId === participantId) {
            becameConnected ||= !this.simulationSeatConnected(seat, now);
            touchedSeat = true;
            seat.lastSeenAt = timestamp;
          }
        }
        if (touchedSeat && becameConnected) {
          team.presenceRevision += 1;
          this.publishPortSimulationPresence(sessionId, team, now);
        }
      }
    }
    return {
      participantsOnline: this.activeParticipantCount(sessionId, now),
      lastSeenAt: new Date(now).toISOString(),
      expiresInMs: this.presenceTtlMs
    };
  }

  leaveClassroomPresence(sessionId: string, participantId: string): boolean {
    const sessionPresence = this.classroomPresence.get(sessionId);
    if (!sessionPresence) {
      return false;
    }
    const removed = sessionPresence.delete(participantId);
    if (sessionPresence.size === 0) {
      this.classroomPresence.delete(sessionId);
    }
    return removed;
  }

  private supportRolesForCapacity(
    memberCapacity: PortSimulationMemberCapacity
  ): PortSimulationSupportRole[] {
    return memberCapacity === 4
      ? []
      : memberCapacity === 5
        ? ["operations_coordinator"]
        : ["operations_coordinator", "safety_reviewer"];
  }

  private createPortSimulationTeam(
    index: number,
    name: string,
    memberCapacity: PortSimulationMemberCapacity,
    challengeId: PortSimulationChallengeId
  ): PortSimulationTeamRuntimeState {
    const supportRoles = this.supportRolesForCapacity(memberCapacity);
    const challenge = getPortSimulationChallenge(challengeId);
    const scenario = getPortSimulationScenarioForChallenge(
      challenge.id,
      challenge.scenarioVersion
    );
    return {
      id: `team-${index + 1}`,
      name,
      runId: `port-run-${randomUUID()}`,
      challengeId: challenge.id,
      challengeVersion: challenge.version,
      attemptNumber: 1,
      scoreHistory: [],
      syncMode: "event_stream_v1",
      latestSequence: 0,
      presenceRevision: 1,
      lastCheckpointAt: null,
      eventsSinceCheckpoint: 0,
      engine: createInitialPortSimulationState(scenario),
      memberCapacity,
      memberParticipantIds: [],
      memberDisplayNames: {},
      roleSeats: scenario.roles.map((role) => ({
        role,
        participantId: null,
        participantDisplayName: null,
        roleSeatToken: null,
        claimedAt: null,
        lastSeenAt: null
      })),
      supportSeats: supportRoles.map((role) => ({
        role,
        participantId: null,
        participantDisplayName: null,
        supportSeatToken: null,
        claimedAt: null,
        lastSeenAt: null
      })),
      collaborationRevision: 1,
      collaborationItems: [],
      collaborationReceipts: [],
      commandReceipts: [],
      startedWithMissingRoles: false
    };
  }

  private advancePortSimulationTeamToWallClock(
    team: PortSimulationTeamRuntimeState,
    now = Date.now()
  ) {
    const scenario = this.portSimulationScenarioForTeam(team);
    const anchor = team.engine.clock.wallClockAnchor;
    if (team.engine.status !== "running" || !anchor) return false;
    const elapsedSeconds = Math.max(
      0,
      (now - new Date(anchor).getTime()) / 1000
    );
    if (elapsedSeconds <= 0) return false;
    const targetSimMinute =
      team.engine.clock.simMinute +
      (elapsedSeconds *
        scenario.baseTimeScale *
        team.engine.clock.timeScale) /
        60;
    team.engine = advancePortSimulation(
      team.engine,
      scenario,
      targetSimMinute
    );
    this.expirePortSimulationCollaborationItems(team);
    if (team.engine.status === "running") {
      team.engine.clock.wallClockAnchor = new Date(now).toISOString();
    }
    return true;
  }

  private expirePortSimulationCollaborationItems(
    team: PortSimulationTeamRuntimeState
  ) {
    let changed = false;
    for (const item of team.collaborationItems) {
      if (
        item.status === "open" &&
        item.expiresAtSimMinute !== null &&
        item.expiresAtSimMinute <= team.engine.clock.simMinute
      ) {
        item.status = "expired";
        changed = true;
      }
    }
    if (changed) team.collaborationRevision += 1;
    return changed;
  }

  async setupPortSimulation(
    sessionId: string,
    input: PortSimulationSetupInput
  ): Promise<PortSimulationStoreResult<ClassroomSnapshot>> {
    const result = await this.mutate((state) => {
      const session = state.classSessions.find((item) => item.id === sessionId);
      if (!session) {
        return {
          ok: false as const,
          status: 404,
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        };
      }
      if (session.status !== "live") {
        return {
          ok: false as const,
          status: 409,
          error: "SESSION_NOT_LIVE",
          message: "只能为正在进行的课堂建立仿真"
        };
      }
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      const deliveryMode = input.deliveryMode ?? "network_teams_legacy";
      let expectedStudentCount: number;
      let classroomObserverCount = 0;
      let capacities: PortSimulationMemberCapacity[];
      if (deliveryMode === "local_solo") {
        expectedStudentCount = input.expectedStudentCount ?? 30;
        capacities = [];
      } else if (input.teamCapacities?.length) {
        capacities = [...input.teamCapacities];
        expectedStudentCount =
          input.expectedStudentCount ??
          capacities.reduce((sum, capacity) => sum + capacity, 0);
        classroomObserverCount = expectedStudentCount === 7 ? 1 : 0;
        const expectedActive = expectedStudentCount - classroomObserverCount;
        if (
          capacities.reduce((sum, capacity) => sum + capacity, 0) !==
          expectedActive
        ) {
          return {
            ok: false as const,
            status: 400,
            error: "INVALID_TEAM_CAPACITY_TOTAL",
            message: "小组容量总和必须等于预计参与仿真的学生人数"
          };
        }
      } else if (input.expectedStudentCount !== undefined) {
        expectedStudentCount = input.expectedStudentCount;
        const plan = planPortSimulationTeamCapacities(expectedStudentCount);
        capacities = plan.capacities;
        classroomObserverCount = plan.classroomObserverCount;
      } else if (input.teamCount !== undefined) {
        capacities = Array.from(
          { length: input.teamCount },
          () => 4 as PortSimulationMemberCapacity
        );
        expectedStudentCount = input.teamCount * 4;
      } else {
        expectedStudentCount = 30;
        capacities = planPortSimulationTeamCapacities(30).capacities;
      }
      const challenge = getPortSimulationChallenge(
        input.challengeId ?? DEFAULT_PORT_SIMULATION_CHALLENGE_ID
      );
      const teams = deliveryMode === "local_solo"
        ? []
        : capacities.map((capacity, index) =>
            this.createPortSimulationTeam(
              index,
              input.teamNames?.[index] ?? `第 ${index + 1} 组`,
              capacity,
              challenge.id
            )
          );
      runtime.simulation = {
        scenarioId: challenge.scenarioId,
        scenarioVersion: challenge.scenarioVersion,
        challengeId: challenge.id,
        challengeVersion: challenge.version,
        deliveryMode,
        assignmentSource: "self_select",
        assignmentAdjusted: false,
        expectedStudentCount,
        classroomObserverCount,
        teams
      };
      runtime.activeActivity = "simulation";
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;
      const snapshot = this.buildClassroomSnapshot(state, session, runtime);
      return snapshot
        ? { ok: true as const, value: snapshot }
        : {
            ok: false as const,
            status: 404,
            error: "COURSE_NOT_FOUND",
            message: "课堂缺少对应课程"
          };
    });
    if (result.ok) {
      this.publishClassroomSnapshot(sessionId, result.value);
      const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
      for (const team of simulation?.teams ?? []) {
        if (team.syncMode === "event_stream_v1") {
          this.savePortSimulationCheckpoint(sessionId, team);
          this.publishPortSimulationPresence(sessionId, team);
        } else {
          this.publishPortSimulationTeamSnapshot(
            sessionId,
            this.buildPortSimulationTeamSnapshot(sessionId, team)
          );
        }
      }
    }
    return result;
  }

  async configurePortSimulationTeams(
    sessionId: string,
    input: PortSimulationTeamConfigurationInput
  ): Promise<PortSimulationStoreResult<ClassroomSnapshot>> {
    const result = await this.mutate((state) => {
      const session = state.classSessions.find((item) => item.id === sessionId);
      const runtime = state.classroomRuntimes[sessionId];
      const simulation = runtime?.simulation;
      if (!session || !runtime || !simulation) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_NOT_FOUND",
          message: "课堂尚未建立港口仿真"
        };
      }
      if (
        simulation.teams.some(
          (team) => !["lobby", "ready"].includes(team.engine.status)
        )
      ) {
        return {
          ok: false as const,
          status: 409,
          error: "TEAM_CONFIGURATION_LOCKED",
          message: "仿真开始后不能再调整组名、容量或组员归属"
        };
      }
      for (let index = input.teamCapacities.length; index < simulation.teams.length; index += 1) {
        const removed = simulation.teams[index];
        if (
          removed &&
          (removed.memberParticipantIds.length > 0 ||
            [...removed.roleSeats, ...removed.supportSeats].some(
              (seat) => seat.participantId
            ))
        ) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_NOT_EMPTY",
            message: `${removed.name}仍有成员或已认领席位，请先释放后再减少小组`
          };
        }
      }
      const nextTeams: PortSimulationTeamRuntimeState[] = [];
      for (let index = 0; index < input.teamCapacities.length; index += 1) {
        const capacity = input.teamCapacities[index]!;
        const existing = simulation.teams[index];
        if (!existing) {
          nextTeams.push(
            this.createPortSimulationTeam(
              index,
              input.teamNames[index]!,
              capacity,
              simulation.challengeId
            )
          );
          continue;
        }
        if (existing.memberParticipantIds.length > capacity) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_CAPACITY_OCCUPIED",
            message: `${existing.name}已有 ${existing.memberParticipantIds.length} 人，请先移出成员再将容量降至 ${capacity} 人`
          };
        }
        const desiredSupportRoles = this.supportRolesForCapacity(capacity);
        const seatsToRemove = existing.supportSeats.filter(
          (seat) => !desiredSupportRoles.includes(seat.role)
        );
        const occupiedRemovedSeat = seatsToRemove.find(
          (seat) => seat.participantId
        );
        if (occupiedRemovedSeat) {
          return {
            ok: false as const,
            status: 409,
            error: "SUPPORT_SEAT_OCCUPIED",
            message: `请先释放${PORT_SIMULATION_SUPPORT_ROLE_LABELS[occupiedRemovedSeat.role]}席位再降低容量`
          };
        }
        const supportConfigurationChanged =
          existing.memberCapacity !== capacity ||
          existing.supportSeats.length !== desiredSupportRoles.length;
        existing.name = input.teamNames[index]!;
        existing.memberCapacity = capacity;
        existing.supportSeats = desiredSupportRoles.map(
          (role) =>
            existing.supportSeats.find((seat) => seat.role === role) ?? {
              role,
              participantId: null,
              participantDisplayName: null,
              supportSeatToken: null,
              claimedAt: null,
              lastSeenAt: null
            }
        );
        if (supportConfigurationChanged) existing.collaborationRevision += 1;
        nextTeams.push(existing);
      }
      simulation.teams = nextTeams;
      simulation.expectedStudentCount = input.expectedStudentCount;
      simulation.classroomObserverCount = input.expectedStudentCount === 7 ? 1 : 0;
      runtime.runtimeVersion += 1;
      const snapshot = this.buildClassroomSnapshot(state, session, runtime);
      return snapshot
        ? { ok: true as const, value: snapshot }
        : {
            ok: false as const,
            status: 404,
            error: "COURSE_NOT_FOUND",
            message: "课堂缺少对应课程"
          };
    });
    if (result.ok) {
      this.publishClassroomSnapshot(sessionId, result.value);
      const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
      for (const team of simulation?.teams ?? []) {
        if (team.syncMode === "event_stream_v1") {
          this.savePortSimulationCheckpoint(sessionId, team);
          this.publishPortSimulationPresence(sessionId, team);
        } else {
          this.publishPortSimulationTeamSnapshot(
            sessionId,
            this.buildPortSimulationTeamSnapshot(sessionId, team)
          );
        }
      }
    }
    return result;
  }

  getPortSimulationTeamSnapshot(
    sessionId: string,
    teamId: string
  ): PortSimulationTeamSnapshot | undefined {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (item) => item.id === teamId
    );
    return team
      ? this.buildPortSimulationTeamSnapshot(sessionId, team)
      : undefined;
  }

  getPortSimulationPreflightChecks(sessionId: string) {
    const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
    if (!simulation) return undefined;
    const groupCapacityValid =
      simulation.teams.length >= 1 &&
      simulation.teams.length <= 15 &&
      simulation.teams.every(
        (team) => team.memberCapacity >= 4 && team.memberCapacity <= 6
      );
    const missingCoreSeats = simulation.teams.reduce(
      (sum, team) =>
        sum +
        team.roleSeats.filter((seat) => !this.simulationSeatConnected(seat))
          .length,
      0
    );
    const assignmentNeedsAdjustment =
      simulation.assignmentSource === "external_fixed" &&
      !simulation.assignmentAdjusted &&
      simulation.teams.some(
        (team) =>
          team.memberParticipantIds.length < 4 ||
          team.memberParticipantIds.length > 6
      );
    return [
      {
        id: "team_capacity",
        status: groupCapacityValid ? "pass" as const : "blocked" as const,
        label: "15 组容量",
        message: groupCapacityValid
          ? `${simulation.teams.length} 个小组均符合 4–6 人容量规则。`
          : "小组数量或容量不符合 1–15 组、每组 4–6 人要求。"
      },
      {
        id: "fixed_assignment",
        status: assignmentNeedsAdjustment ? "blocked" as const : "pass" as const,
        label: "名单与固定分组",
        message: assignmentNeedsAdjustment
          ? "外部固定分组存在异常，需教师调组或设置观察员。"
          : simulation.assignmentSource === "external_fixed"
            ? "外部固定分组已冻结，并保留本轮调整记录。"
            : "当前为开发环境自主选组；教学信息系统名单接口已预留。"
      },
      {
        id: "core_roles",
        status: missingCoreSeats === 0 ? "pass" as const : "warning" as const,
        label: "四主操到岗",
        message:
          missingCoreSeats === 0
            ? "所有小组四个业务主操均在线。"
            : `仍有 ${missingCoreSeats} 个业务主操席未在线；教师可确认缺岗开局并记录。`
      }
    ];
  }

  isPortSimulationTeamMember(
    sessionId: string,
    teamId: string,
    actorId: string
  ) {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    return team?.memberParticipantIds.includes(actorId) ?? false;
  }

  async joinPortSimulationTeam(
    sessionId: string,
    teamId: string,
    participantId: string,
    participantDisplayName = "课堂成员"
  ): Promise<PortSimulationStoreResult<PortSimulationTeamSnapshot>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const simulation = runtime?.simulation;
      const team = simulation?.teams.find((item) => item.id === teamId);
      if (!runtime || !simulation || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      const currentTeam = simulation.teams.find((candidate) =>
        candidate.memberParticipantIds.includes(participantId)
      );
      if (currentTeam?.id === team.id) {
        return {
          ok: true as const,
          value: this.buildPortSimulationTeamSnapshot(sessionId, team)
        };
      }
      if (!["lobby", "ready"].includes(team.engine.status)) {
        return {
          ok: false as const,
          status: 409,
          error: "TEAM_SELECTION_LOCKED",
          message: "仿真已经开始，小组选择已锁定"
        };
      }
      if (team.memberParticipantIds.length >= team.memberCapacity) {
        return {
          ok: false as const,
          status: 409,
          error: "TEAM_FULL",
          message: `${team.name}已达到 ${team.memberCapacity} 人容量，请选择其他小组`
        };
      }
      const occupiedSeat = simulation.teams
        .flatMap((candidate) => [
          ...candidate.roleSeats,
          ...candidate.supportSeats
        ])
        .find((seat) => seat.participantId === participantId);
      if (occupiedSeat) {
        return {
          ok: false as const,
          status: 409,
          error: "PARTICIPANT_ALREADY_ASSIGNED",
          message: "请先释放已经认领的岗位再更换小组"
        };
      }
      if (
        currentTeam &&
        !["lobby", "ready"].includes(currentTeam.engine.status)
      ) {
        return {
          ok: false as const,
          status: 409,
          error: "TEAM_SELECTION_LOCKED",
          message: "仿真已经开始，小组选择已锁定"
        };
      }
      for (const candidate of simulation.teams) {
        candidate.memberParticipantIds = candidate.memberParticipantIds.filter(
          (id) => id !== participantId
        );
        delete candidate.memberDisplayNames[participantId];
      }
      team.memberParticipantIds.push(participantId);
      team.memberDisplayNames[participantId] = participantDisplayName;
      team.presenceRevision += 1;
      runtime.runtimeVersion += 1;
      return {
        ok: true as const,
        value: this.buildPortSimulationTeamSnapshot(sessionId, team)
      };
    });
    if (result.ok) {
      const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
        (candidate) => candidate.id === teamId
      );
      if (team) this.publishPortSimulationPresence(sessionId, team);
      this.publishClassroomSnapshot(
        sessionId,
        this.getClassroomSnapshot(sessionId)
      );
    }
    return result;
  }

  async claimPortSimulationRole(
    sessionId: string,
    teamId: string,
    role: PortSimulationRole,
    participantId: string,
    participantDisplayName = "课堂成员"
  ): Promise<PortSimulationStoreResult<PortSimulationRoleClaimResponse>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const simulation = runtime?.simulation;
      const team = simulation?.teams.find((item) => item.id === teamId);
      if (!runtime || !simulation || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      if (["completed", "aborted"].includes(team.engine.status)) {
        return {
          ok: false as const,
          status: 409,
          error: "SIMULATION_FINISHED",
          message: "本组仿真已经结束"
        };
      }
      const memberTeam = simulation.teams.find((candidate) =>
        candidate.memberParticipantIds.includes(participantId)
      );
      if (memberTeam && memberTeam.id !== team.id) {
        return {
          ok: false as const,
          status: 409,
          error: "PARTICIPANT_ALREADY_ASSIGNED",
          message: "你已经进入了其他小组"
        };
      }
      if (!memberTeam) {
        if (!["lobby", "ready"].includes(team.engine.status)) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_SELECTION_LOCKED",
            message: "仿真已经开始，不能再加入该小组"
          };
        }
        if (team.memberParticipantIds.length >= team.memberCapacity) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_FULL",
            message: `${team.name}已达到 ${team.memberCapacity} 人容量`
          };
        }
        team.memberParticipantIds.push(participantId);
      }
      team.memberDisplayNames[participantId] = participantDisplayName;
      const now = Date.now();
      const timestamp = new Date(now).toISOString();
      for (const candidateTeam of simulation.teams) {
        for (const candidateSeat of candidateTeam.roleSeats) {
          if (
            candidateSeat.participantId &&
            !this.simulationSeatConnected(candidateSeat, now)
          ) {
            candidateSeat.participantId = null;
            candidateSeat.participantDisplayName = null;
            candidateSeat.roleSeatToken = null;
            candidateSeat.claimedAt = null;
            candidateSeat.lastSeenAt = null;
          }
          if (
            candidateSeat.participantId === participantId &&
            (candidateTeam.id !== teamId || candidateSeat.role !== role)
          ) {
            return {
              ok: false as const,
              status: 409,
              error: "PARTICIPANT_ALREADY_ASSIGNED",
              message: "你已经认领了其他小组或岗位"
            };
          }
        }
        for (const candidateSeat of candidateTeam.supportSeats) {
          if (
            candidateSeat.participantId &&
            !this.simulationSeatConnected(candidateSeat, now)
          ) {
            candidateSeat.participantId = null;
            candidateSeat.participantDisplayName = null;
            candidateSeat.supportSeatToken = null;
            candidateSeat.claimedAt = null;
            candidateSeat.lastSeenAt = null;
          }
          if (candidateSeat.participantId === participantId) {
            return {
              ok: false as const,
              status: 409,
              error: "PARTICIPANT_ALREADY_ASSIGNED",
              message: "你已经认领了协作席，不能同时担任业务主操"
            };
          }
        }
      }
      const seat = team.roleSeats.find((item) => item.role === role);
      if (!seat) {
        return {
          ok: false as const,
          status: 404,
          error: "ROLE_NOT_FOUND",
          message: "没有找到该岗位"
        };
      }
      if (
        seat.participantId &&
        seat.participantId !== participantId &&
        this.simulationSeatConnected(seat, now)
      ) {
        return {
          ok: false as const,
          status: 409,
          error: "ROLE_OCCUPIED",
          message: "该岗位已由其他同学认领"
        };
      }
      seat.participantId = participantId;
      seat.participantDisplayName = participantDisplayName;
      seat.roleSeatToken = seat.roleSeatToken ?? `role-${randomUUID()}`;
      seat.claimedAt = seat.claimedAt ?? timestamp;
      seat.lastSeenAt = timestamp;
      team.presenceRevision += 1;
      if (
        team.engine.status === "lobby" &&
        team.roleSeats.every((item) => item.participantId)
      ) {
        team.engine.status = "ready";
        team.engine.revision += 1;
      }
      runtime.runtimeVersion += 1;
      const snapshot = this.buildPortSimulationTeamSnapshot(
        sessionId,
        team,
        now
      );
      return {
        ok: true as const,
        value: {
          teamId,
          role,
          participantId,
          roleSeatToken: seat.roleSeatToken,
          snapshot
        }
      };
    });
    if (result.ok) {
      const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
        (candidate) => candidate.id === teamId
      );
      if (team) this.publishPortSimulationPresence(sessionId, team);
      this.publishClassroomSnapshot(
        sessionId,
        this.getClassroomSnapshot(sessionId)
      );
    }
    return result;
  }

  async releasePortSimulationRole(
    sessionId: string,
    teamId: string,
    role: PortSimulationRole,
    participantId: string,
    roleSeatToken: string,
    teacherOverride = false
  ): Promise<PortSimulationStoreResult<PortSimulationTeamSnapshot>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((item) => item.id === teamId);
      const seat = team?.roleSeats.find((item) => item.role === role);
      if (!runtime || !team || !seat) {
        return {
          ok: false as const,
          status: 404,
          error: "ROLE_NOT_FOUND",
          message: "没有找到该小组岗位"
        };
      }
      if (
        !teacherOverride &&
        (seat.participantId !== participantId ||
          seat.roleSeatToken !== roleSeatToken)
      ) {
        return {
          ok: false as const,
          status: 403,
          error: "ROLE_TOKEN_INVALID",
          message: "岗位凭证无效"
        };
      }
      seat.participantId = null;
      seat.participantDisplayName = null;
      seat.roleSeatToken = null;
      seat.claimedAt = null;
      seat.lastSeenAt = null;
      team.presenceRevision += 1;
      if (team.engine.status === "ready") {
        team.engine.status = "lobby";
        team.engine.revision += 1;
      }
      runtime.runtimeVersion += 1;
      return {
        ok: true as const,
        value: this.buildPortSimulationTeamSnapshot(sessionId, team)
      };
    });
    if (result.ok) {
      const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
        (candidate) => candidate.id === teamId
      );
      if (team) this.publishPortSimulationPresence(sessionId, team);
      this.publishClassroomSnapshot(
        sessionId,
        this.getClassroomSnapshot(sessionId)
      );
    }
    return result;
  }

  renewPortSimulationRoleLease(
    sessionId: string,
    teamId: string,
    role: PortSimulationRole,
    actorId: string,
    roleSeatToken: string
  ): PortSimulationStoreResult<{
    expiresAt: string;
    presenceRevision: number;
  }> {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    const seat = team?.roleSeats.find((candidate) => candidate.role === role);
    if (
      !team ||
      !seat ||
      seat.participantId !== actorId ||
      seat.roleSeatToken !== roleSeatToken
    ) {
      return {
        ok: false,
        status: 403,
        error: "ROLE_TOKEN_INVALID",
        message: "岗位凭证无效或已经释放"
      };
    }
    const now = Date.now();
    const wasConnected = this.simulationSeatConnected(seat, now);
    seat.lastSeenAt = new Date(now).toISOString();
    if (!wasConnected) {
      team.presenceRevision += 1;
      this.publishPortSimulationPresence(sessionId, team, now);
    }
    return {
      ok: true,
      value: {
        expiresAt: new Date(now + this.presenceTtlMs).toISOString(),
        presenceRevision: team.presenceRevision
      }
    };
  }

  async claimPortSimulationSupportSeat(
    sessionId: string,
    teamId: string,
    role: PortSimulationSupportRole,
    participantId: string,
    participantDisplayName = "课堂成员"
  ): Promise<PortSimulationStoreResult<PortSimulationSupportSeatClaimResponse>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const simulation = runtime?.simulation;
      const team = simulation?.teams.find((item) => item.id === teamId);
      const seat = team?.supportSeats.find((item) => item.role === role);
      if (!runtime || !simulation || !team || !seat) {
        return {
          ok: false as const,
          status: 404,
          error: "SUPPORT_SEAT_NOT_FOUND",
          message: "当前小组容量未配置这个协作席"
        };
      }
      if (["completed", "aborted"].includes(team.engine.status)) {
        return {
          ok: false as const,
          status: 409,
          error: "SIMULATION_FINISHED",
          message: "本组仿真已经结束"
        };
      }
      const memberTeam = simulation.teams.find((candidate) =>
        candidate.memberParticipantIds.includes(participantId)
      );
      if (memberTeam && memberTeam.id !== team.id) {
        return {
          ok: false as const,
          status: 409,
          error: "PARTICIPANT_ALREADY_ASSIGNED",
          message: "你已经进入了其他小组"
        };
      }
      if (!memberTeam) {
        if (!["lobby", "ready"].includes(team.engine.status)) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_SELECTION_LOCKED",
            message: "仿真已经开始，不能再加入该小组"
          };
        }
        if (team.memberParticipantIds.length >= team.memberCapacity) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAM_FULL",
            message: `${team.name}已达到 ${team.memberCapacity} 人容量`
          };
        }
        team.memberParticipantIds.push(participantId);
      }
      team.memberDisplayNames[participantId] = participantDisplayName;
      const now = Date.now();
      const timestamp = new Date(now).toISOString();
      for (const candidateTeam of simulation.teams) {
        for (const candidateSeat of candidateTeam.roleSeats) {
          if (
            candidateSeat.participantId &&
            !this.simulationSeatConnected(candidateSeat, now)
          ) {
            candidateSeat.participantId = null;
            candidateSeat.participantDisplayName = null;
            candidateSeat.roleSeatToken = null;
            candidateSeat.claimedAt = null;
            candidateSeat.lastSeenAt = null;
          }
          if (candidateSeat.participantId === participantId) {
            return {
              ok: false as const,
              status: 409,
              error: "PARTICIPANT_ALREADY_ASSIGNED",
              message: "你已经认领了业务主操，不能同时认领协作席"
            };
          }
        }
        for (const candidateSeat of candidateTeam.supportSeats) {
          if (
            candidateSeat.participantId &&
            !this.simulationSeatConnected(candidateSeat, now)
          ) {
            candidateSeat.participantId = null;
            candidateSeat.participantDisplayName = null;
            candidateSeat.supportSeatToken = null;
            candidateSeat.claimedAt = null;
            candidateSeat.lastSeenAt = null;
          }
          if (
            candidateSeat.participantId === participantId &&
            (candidateTeam.id !== teamId || candidateSeat.role !== role)
          ) {
            return {
              ok: false as const,
              status: 409,
              error: "PARTICIPANT_ALREADY_ASSIGNED",
              message: "你已经认领了其他协作席"
            };
          }
        }
      }
      if (
        seat.participantId &&
        seat.participantId !== participantId &&
        this.simulationSeatConnected(seat, now)
      ) {
        return {
          ok: false as const,
          status: 409,
          error: "SUPPORT_SEAT_OCCUPIED",
          message: "该协作席已由其他同学认领"
        };
      }
      const wasSameParticipant = seat.participantId === participantId;
      seat.participantId = participantId;
      seat.participantDisplayName = participantDisplayName;
      seat.supportSeatToken = seat.supportSeatToken ?? `support-${randomUUID()}`;
      seat.claimedAt = seat.claimedAt ?? timestamp;
      seat.lastSeenAt = timestamp;
      team.presenceRevision += 1;
      if (!wasSameParticipant) team.collaborationRevision += 1;
      runtime.runtimeVersion += 1;
      return {
        ok: true as const,
        value: {
          teamId,
          role,
          participantId,
          supportSeatToken: seat.supportSeatToken,
          snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team, now)
        }
      };
    });
    if (result.ok) {
      const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
        (candidate) => candidate.id === teamId
      );
      if (team) this.publishPortSimulationPresence(sessionId, team);
      this.publishClassroomSnapshot(sessionId, this.getClassroomSnapshot(sessionId));
    }
    return result;
  }

  async releasePortSimulationSupportSeat(
    sessionId: string,
    teamId: string,
    role: PortSimulationSupportRole,
    participantId: string,
    supportSeatToken: string,
    teacherOverride = false
  ): Promise<PortSimulationStoreResult<PortSimulationTeamSnapshot>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((item) => item.id === teamId);
      const seat = team?.supportSeats.find((item) => item.role === role);
      if (!runtime || !team || !seat) {
        return {
          ok: false as const,
          status: 404,
          error: "SUPPORT_SEAT_NOT_FOUND",
          message: "没有找到该小组协作席"
        };
      }
      if (
        !teacherOverride &&
        (seat.participantId !== participantId ||
          seat.supportSeatToken !== supportSeatToken)
      ) {
        return {
          ok: false as const,
          status: 403,
          error: "SUPPORT_SEAT_TOKEN_INVALID",
          message: "协作席凭证无效"
        };
      }
      seat.participantId = null;
      seat.participantDisplayName = null;
      seat.supportSeatToken = null;
      seat.claimedAt = null;
      seat.lastSeenAt = null;
      team.presenceRevision += 1;
      team.collaborationRevision += 1;
      runtime.runtimeVersion += 1;
      return {
        ok: true as const,
        value: this.buildPortSimulationTeamSnapshot(sessionId, team)
      };
    });
    if (result.ok) {
      const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
        (candidate) => candidate.id === teamId
      );
      if (team) this.publishPortSimulationPresence(sessionId, team);
      this.publishClassroomSnapshot(sessionId, this.getClassroomSnapshot(sessionId));
    }
    return result;
  }

  renewPortSimulationSupportLease(
    sessionId: string,
    teamId: string,
    role: PortSimulationSupportRole,
    actorId: string,
    supportSeatToken: string
  ): PortSimulationStoreResult<{
    expiresAt: string;
    presenceRevision: number;
  }> {
    const team = this.current.classroomRuntimes[sessionId]?.simulation?.teams.find(
      (candidate) => candidate.id === teamId
    );
    const seat = team?.supportSeats.find((candidate) => candidate.role === role);
    if (
      !team ||
      !seat ||
      seat.participantId !== actorId ||
      seat.supportSeatToken !== supportSeatToken
    ) {
      return {
        ok: false,
        status: 403,
        error: "SUPPORT_SEAT_TOKEN_INVALID",
        message: "协作席凭证无效或已经释放"
      };
    }
    const now = Date.now();
    const wasConnected = this.simulationSeatConnected(seat, now);
    seat.lastSeenAt = new Date(now).toISOString();
    if (!wasConnected) {
      team.presenceRevision += 1;
      this.publishPortSimulationPresence(sessionId, team, now);
    }
    return {
      ok: true,
      value: {
        expiresAt: new Date(now + this.presenceTtlMs).toISOString(),
        presenceRevision: team.presenceRevision
      }
    };
  }

  async createPortSimulationCollaborationItem(
    sessionId: string,
    teamId: string,
    input: PortSimulationCollaborationCreateInput
  ): Promise<PortSimulationStoreResult<PortSimulationCollaborationResponse>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((item) => item.id === teamId);
      if (!runtime || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      const participantId = input.participantId;
      if (!participantId) {
        return {
          ok: false as const,
          status: 401,
          error: "IDENTITY_REQUIRED",
          message: "需要已认证身份才能提交协作信息"
        };
      }
      this.advancePortSimulationTeamToWallClock(team);
      const prior = team.collaborationReceipts.find(
        (receipt) => receipt.requestId === input.requestId
      );
      if (prior) {
        return {
          ok: true as const,
          value: {
            result: {
              ...prior.result,
              status: "duplicate" as const,
              collaborationRevision: team.collaborationRevision,
              message: `重复协作请求未再次提交：${prior.result.message}`
            },
            snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
          }
        };
      }
      const supportSeat = team.supportSeats.find(
        (seat) =>
          seat.participantId === participantId &&
          seat.supportSeatToken === input.supportSeatToken
      );
      if (!supportSeat || !this.simulationSeatConnected(supportSeat)) {
        return {
          ok: false as const,
          status: 403,
          error: "SUPPORT_SEAT_TOKEN_INVALID",
          message: "协作席凭证已失效，请重新认领"
        };
      }
      if (input.expectedCollaborationRevision !== team.collaborationRevision) {
        return {
          ok: true as const,
          value: {
            result: {
              requestId: input.requestId,
              status: "conflict" as const,
              collaborationRevision: team.collaborationRevision,
              reasonCode: "STALE_COLLABORATION_REVISION",
              message: "协作信息已经更新，请查看最新建议后重试。"
            },
            snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
          }
        };
      }
      if (
        (supportSeat.role === "operations_coordinator" &&
          input.item.kind !== "command_proposal") ||
        (supportSeat.role === "safety_reviewer" &&
          input.item.kind === "command_proposal")
      ) {
        return {
          ok: false as const,
          status: 403,
          error: "SUPPORT_ROLE_FORBIDDEN",
          message:
            supportSeat.role === "operations_coordinator"
              ? "计划协调员只能提交命令方案"
              : "安全与复盘员只能提交风险提醒或复盘标记"
        };
      }
      if (
        input.item.kind === "command_proposal" &&
        !portSimulationCommandMatchesRole(
          input.item.commandDraft,
          input.item.targetRole
        )
      ) {
        return {
          ok: false as const,
          status: 400,
          error: "PROPOSAL_ROLE_MISMATCH",
          message: "命令草案与目标岗位不匹配"
        };
      }
      const nowMinute = team.engine.clock.simMinute;
      const item: PortSimulationCollaborationItem = {
        id: `collaboration-${randomUUID()}`,
        ...input.item,
        supportRole: supportSeat.role,
        status: "open",
        createdByParticipantId: participantId,
        createdAtSimMinute: nowMinute,
        expiresAtSimMinute:
          input.item.kind === "command_proposal"
            ? nowMinute + 60
            : input.item.kind === "risk_alert"
              ? nowMinute + 30
              : null,
        respondedByParticipantId: null,
        respondedAtSimMinute: null
      };
      team.collaborationItems.push(item);
      team.collaborationItems = team.collaborationItems.slice(-120);
      team.collaborationRevision += 1;
      const collaborationResult: PortSimulationCollaborationResult = {
        requestId: input.requestId,
        status: "applied",
        collaborationRevision: team.collaborationRevision,
        message:
          item.kind === "command_proposal"
            ? "命令方案已送达目标主操，采用后仍需主操确认发送。"
            : item.kind === "risk_alert"
              ? "风险提醒已显示在共享态势中。"
              : "复盘标记已永久记录。"
      };
      team.collaborationReceipts.push({
        requestId: input.requestId,
        result: collaborationResult
      });
      team.collaborationReceipts = team.collaborationReceipts.slice(-200);
      supportSeat.lastSeenAt = new Date().toISOString();
      runtime.runtimeVersion += 1;
      this.appendPortSimulationCanonicalEvent(
        sessionId,
        team,
        "collaboration",
        {
          type: "collaboration_state",
          collaborationRevision: team.collaborationRevision,
          collaborationItems: structuredClone(team.collaborationItems)
        }
      );
      return {
        ok: true as const,
        value: {
          result: collaborationResult,
          snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
        }
      };
    });
    if (result.ok) {
      if (result.value.snapshot.syncMode === "snapshot_legacy") {
        this.publishPortSimulationTeamSnapshot(sessionId, result.value.snapshot);
      }
      this.publishClassroomSnapshot(sessionId, this.getClassroomSnapshot(sessionId));
    }
    return result;
  }

  async respondToPortSimulationCollaborationItem(
    sessionId: string,
    teamId: string,
    itemId: string,
    input: PortSimulationCollaborationResponseInput
  ): Promise<PortSimulationStoreResult<PortSimulationCollaborationResponse>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((item) => item.id === teamId);
      if (!runtime || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      const participantId = input.participantId;
      if (!participantId) {
        return {
          ok: false as const,
          status: 401,
          error: "IDENTITY_REQUIRED",
          message: "需要已认证身份才能响应协作信息"
        };
      }
      this.advancePortSimulationTeamToWallClock(team);
      const prior = team.collaborationReceipts.find(
        (receipt) => receipt.requestId === input.requestId
      );
      if (prior) {
        return {
          ok: true as const,
          value: {
            result: {
              ...prior.result,
              status: "duplicate" as const,
              collaborationRevision: team.collaborationRevision,
              message: `重复响应未再次执行：${prior.result.message}`
            },
            snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
          }
        };
      }
      const seat = team.roleSeats.find(
        (candidate) =>
          candidate.participantId === participantId &&
          candidate.roleSeatToken === input.roleSeatToken
      );
      if (!seat || !this.simulationSeatConnected(seat)) {
        return {
          ok: false as const,
          status: 403,
          error: "ROLE_TOKEN_INVALID",
          message: "主操岗位凭证已失效"
        };
      }
      if (input.expectedCollaborationRevision !== team.collaborationRevision) {
        return {
          ok: true as const,
          value: {
            result: {
              requestId: input.requestId,
              status: "conflict" as const,
              collaborationRevision: team.collaborationRevision,
              reasonCode: "STALE_COLLABORATION_REVISION",
              message: "协作信息已经更新，请重新查看。"
            },
            snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
          }
        };
      }
      const item = team.collaborationItems.find(
        (candidate) => candidate.id === itemId
      );
      if (!item) {
        return {
          ok: false as const,
          status: 404,
          error: "COLLABORATION_ITEM_NOT_FOUND",
          message: "没有找到该协作项"
        };
      }
      if (item.targetRole !== seat.role) {
        return {
          ok: false as const,
          status: 403,
          error: "COLLABORATION_TARGET_MISMATCH",
          message: "该协作项不是发送给当前岗位的"
        };
      }
      if (item.status !== "open") {
        return {
          ok: false as const,
          status: 409,
          error: "COLLABORATION_ITEM_CLOSED",
          message: item.status === "expired" ? "该协作项已过期" : "该协作项已经处理"
        };
      }
      item.status = input.action === "accept" ? "accepted" : "dismissed";
      item.respondedByParticipantId = participantId;
      item.respondedAtSimMinute = team.engine.clock.simMinute;
      team.collaborationRevision += 1;
      const collaborationResult: PortSimulationCollaborationResult = {
        requestId: input.requestId,
        status: "applied",
        collaborationRevision: team.collaborationRevision,
        message:
          input.action === "accept"
            ? "方案已采用并可预填；请检查当前态势后由主操确认发送。"
            : "协作项已忽略。"
      };
      team.collaborationReceipts.push({
        requestId: input.requestId,
        result: collaborationResult
      });
      team.collaborationReceipts = team.collaborationReceipts.slice(-200);
      seat.lastSeenAt = new Date().toISOString();
      runtime.runtimeVersion += 1;
      this.appendPortSimulationCanonicalEvent(
        sessionId,
        team,
        "collaboration",
        {
          type: "collaboration_state",
          collaborationRevision: team.collaborationRevision,
          collaborationItems: structuredClone(team.collaborationItems)
        }
      );
      return {
        ok: true as const,
        value: {
          result: collaborationResult,
          snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
        }
      };
    });
    if (result.ok) {
      if (result.value.snapshot.syncMode === "snapshot_legacy") {
        this.publishPortSimulationTeamSnapshot(sessionId, result.value.snapshot);
      }
      this.publishClassroomSnapshot(sessionId, this.getClassroomSnapshot(sessionId));
    }
    return result;
  }

  async controlPortSimulation(
    sessionId: string,
    input: PortSimulationControlInput
  ): Promise<PortSimulationStoreResult<ClassroomSnapshot>> {
    const result = await this.mutate((state) => {
      const session = state.classSessions.find((item) => item.id === sessionId);
      const runtime = state.classroomRuntimes[sessionId];
      const simulation = runtime?.simulation;
      if (!session || !runtime || !simulation) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_NOT_FOUND",
          message: "课堂尚未建立港口仿真"
        };
      }
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      if (input.type === "start") {
        const incomplete = simulation.teams.filter((team) =>
          team.roleSeats.some((seat) => !this.simulationSeatConnected(seat, now))
        );
        if (incomplete.length > 0 && !input.allowIncompleteTeams) {
          return {
            ok: false as const,
            status: 409,
            error: "TEAMS_NOT_READY",
            message: `${incomplete.map((team) => team.name).join("、")}岗位尚未全部就绪`
          };
        }
        for (const team of simulation.teams) {
          const missingRoles = team.roleSeats
            .filter((seat) => !this.simulationSeatConnected(seat, now))
            .map((seat) => seat.role);
          team.startedWithMissingRoles = missingRoles.length > 0;
          team.engine = startPortSimulation(team.engine, nowIso);
          if (missingRoles.length > 0) {
            team.engine.eventSequence += 1;
            team.engine.recentEvents.push({
              id: `event-${team.engine.eventSequence}`,
              simMinute: team.engine.clock.simMinute,
              type: "simulation.started_with_missing_roles",
              message: `教师确认带缺岗开局：${missingRoles
                .map((role) => PORT_SIMULATION_ROLE_LABELS[role])
                .join("、")}尚未认领。`,
              role: null,
              actor: "teacher",
              outcome: "information"
            });
            team.engine.recentEvents = team.engine.recentEvents.slice(-120);
          }
          const missingSupportRoles = team.supportSeats
            .filter((seat) => !this.simulationSeatConnected(seat, now))
            .map((seat) => seat.role);
          if (missingSupportRoles.length > 0) {
            team.engine.eventSequence += 1;
            team.engine.recentEvents.push({
              id: `event-${team.engine.eventSequence}`,
              simMinute: team.engine.clock.simMinute,
              type: "simulation.started_with_missing_support_roles",
              message: `协作席未到岗：${missingSupportRoles
                .map((role) => PORT_SIMULATION_SUPPORT_ROLE_LABELS[role])
                .join("、")}；不阻止四个业务主操开局。`,
              role: null,
              actor: "engine",
              outcome: "information"
            });
            team.engine.recentEvents = team.engine.recentEvents.slice(-120);
          }
        }
      } else if (input.type === "pause") {
        for (const team of simulation.teams) {
          this.advancePortSimulationTeamToWallClock(team, now);
          team.engine = pausePortSimulation(
            team.engine,
            "教师已暂停全部小组的仿真时钟。"
          );
        }
      } else if (input.type === "resume") {
        for (const team of simulation.teams) {
          team.engine = resumePortSimulation(team.engine, nowIso);
        }
      } else if (input.type === "set_speed") {
        for (const team of simulation.teams) {
          this.advancePortSimulationTeamToWallClock(team, now);
          team.engine = setPortSimulationSpeed(
            team.engine,
            input.timeScale,
            nowIso
          );
        }
      } else if (input.type === "complete") {
        for (const team of simulation.teams) {
          this.advancePortSimulationTeamToWallClock(team, now);
          team.engine = completePortSimulation(team.engine);
          this.recordPortSimulationAttempt(team, now);
        }
      } else {
        for (const team of simulation.teams) {
          const seats = team.roleSeats;
          if (team.engine.status === "completed") {
            this.recordPortSimulationAttempt(team, now);
          }
          team.attemptNumber += 1;
          team.engine = createInitialPortSimulationState(
            this.portSimulationScenarioForTeam(team)
          );
          if (seats.every((seat) => seat.participantId)) {
            team.engine.status = "ready";
            team.engine.revision += 1;
          }
          team.commandReceipts = [];
          team.collaborationItems = [];
          team.collaborationReceipts = [];
          team.collaborationRevision += 1;
          team.startedWithMissingRoles = false;
        }
      }
      for (const team of simulation.teams) {
        this.appendPortSimulationCanonicalEvent(
          sessionId,
          team,
          "teacher_control",
          {
            type: "teacher_control",
            control: input,
            serverTime: nowIso,
            missingRoles:
              input.type === "start"
                ? team.roleSeats
                    .filter((seat) => !this.simulationSeatConnected(seat, now))
                    .map((seat) => seat.role)
                : [],
            missingSupportRoles:
              input.type === "start"
                ? team.supportSeats
                    .filter((seat) => !this.simulationSeatConnected(seat, now))
                    .map((seat) => seat.role)
                : [],
            resetReady:
              input.type === "reset" &&
              team.roleSeats.every((seat) => Boolean(seat.participantId))
          },
          now
        );
      }
      runtime.runtimeVersion += 1;
      const snapshot = this.buildClassroomSnapshot(state, session, runtime);
      return snapshot
        ? { ok: true as const, value: snapshot }
        : {
            ok: false as const,
            status: 404,
            error: "COURSE_NOT_FOUND",
            message: "课堂缺少对应课程"
          };
    });
    if (result.ok) {
      this.publishClassroomSnapshot(sessionId, result.value);
      const simulation = this.current.classroomRuntimes[sessionId]?.simulation;
      for (const team of simulation?.teams ?? []) {
        if (team.syncMode === "snapshot_legacy") {
          this.publishPortSimulationTeamSnapshot(
            sessionId,
            this.buildPortSimulationTeamSnapshot(sessionId, team)
          );
        } else if (input.type === "reset") {
          this.savePortSimulationCheckpoint(sessionId, team);
          this.publishPortSimulationStreamMessage(sessionId, team.id, {
            type: "resync_required",
            runId: team.runId,
            latestSequence: team.latestSequence,
            message: "新一轮挑战已经建立，请读取包含进步基线的新检查点。"
          });
        }
      }
    }
    return result;
  }

  private async applyPortSimulationCommandForActor(
    sessionId: string,
    teamId: string,
    input:
      | PortSimulationCommandEnvelope
      | PortSimulationTeacherCommandInput,
    actor: "student" | "teacher"
  ): Promise<PortSimulationStoreResult<PortSimulationCommandResponse>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((item) => item.id === teamId);
      if (!runtime || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      this.advancePortSimulationTeamToWallClock(team);
      const prior = team.commandReceipts.find(
        (receipt) => receipt.requestId === input.requestId
      );
      if (prior) {
        const snapshot = this.buildPortSimulationTeamSnapshot(sessionId, team);
        return {
          ok: true as const,
          value: {
            result: {
              ...prior.result,
              status: "duplicate" as const,
              revision: team.engine.revision,
              message: `重复指令未再次执行：${prior.result.message}`
            },
            snapshot
          }
        };
      }
      let role: PortSimulationRole;
      if (actor === "student") {
        const envelope = input as PortSimulationCommandEnvelope;
        const seat = team.roleSeats.find(
          (item) =>
            item.participantId === envelope.participantId &&
            item.roleSeatToken === envelope.roleSeatToken
        );
        if (!seat || !this.simulationSeatConnected(seat)) {
          return {
            ok: false as const,
            status: 403,
            error: "ROLE_TOKEN_INVALID",
            message: "岗位凭证已失效，请重新认领岗位"
          };
        }
        seat.lastSeenAt = new Date().toISOString();
        role = seat.role;
      } else {
        role = (input as PortSimulationTeacherCommandInput).role;
      }
      if (input.expectedRevision !== team.engine.revision) {
        return {
          ok: true as const,
          value: {
            result: {
              requestId: input.requestId,
              status: "conflict" as const,
              revision: team.engine.revision,
              reasonCode: "STALE_REVISION",
              message: "港口状态已经更新，请根据最新状态重新下令。"
            },
            snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
          }
        };
      }
      const outcome = applyPortSimulationCommand(
        team.engine,
        this.portSimulationScenarioForTeam(team),
        role,
        input.command,
        { requestId: input.requestId, actor }
      );
      team.engine = outcome.state;
      team.commandReceipts.push({
        requestId: input.requestId,
        result: outcome.result
      });
      team.commandReceipts = team.commandReceipts.slice(-200);
      runtime.runtimeVersion += 1;
      return {
        ok: true as const,
        value: {
          result: outcome.result,
          snapshot: this.buildPortSimulationTeamSnapshot(sessionId, team)
        }
      };
    });
    if (result.ok) {
      this.publishPortSimulationTeamSnapshot(sessionId, result.value.snapshot);
      this.publishClassroomSnapshot(
        sessionId,
        this.getClassroomSnapshot(sessionId)
      );
    }
    return result;
  }

  applyPortSimulationCommand(
    sessionId: string,
    teamId: string,
    input: PortSimulationCommandEnvelope
  ) {
    return this.applyPortSimulationCommandForActor(
      sessionId,
      teamId,
      input,
      "student"
    );
  }

  applyPortSimulationTeacherCommand(
    sessionId: string,
    teamId: string,
    input: PortSimulationTeacherCommandInput
  ) {
    return this.applyPortSimulationCommandForActor(
      sessionId,
      teamId,
      input,
      "teacher"
    );
  }

  private async applyPortSimulationCommandV2ForActor(
    sessionId: string,
    teamId: string,
    input: PortSimulationCommandEnvelopeV2 | PortSimulationTeacherCommandInputV2,
    actor: ClassroomActor,
    actorKind: "student" | "teacher"
  ): Promise<PortSimulationStoreResult<PortSimulationCommandResultV2>> {
    const result = await this.mutate((state) => {
      const runtime = state.classroomRuntimes[sessionId];
      const team = runtime?.simulation?.teams.find((candidate) => candidate.id === teamId);
      if (!runtime || !team) {
        return {
          ok: false as const,
          status: 404,
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        };
      }
      if (team.syncMode !== "event_stream_v1") {
        return {
          ok: false as const,
          status: 409,
          error: "LEGACY_SNAPSHOT_RUN",
          message: "旧版运行继续使用快照指令接口，不能切换事件流协议。"
        };
      }
      if (input.runId !== team.runId) {
        return {
          ok: true as const,
          value: {
            requestId: input.requestId,
            status: "resync_required" as const,
            revision: team.engine.revision,
            latestSequence: team.latestSequence,
            reasonCode: "RUN_ID_MISMATCH",
            message: "本地运行标识已过期，请重新读取检查点。"
          }
        };
      }
      const prior = this.eventRepository.getReceipt(team.runId, input.requestId);
      if (prior) {
        return {
          ok: true as const,
          value: {
            ...prior,
            status: "duplicate" as const,
            revision: team.engine.revision,
            latestSequence: team.latestSequence,
            message: `重复指令未再次执行：${prior.message}`
          }
        };
      }

      let role: PortSimulationRole;
      if (actorKind === "student") {
        const envelope = input as PortSimulationCommandEnvelopeV2;
        const seat = team.roleSeats.find(
          (candidate) =>
            candidate.participantId === actor.actorId &&
            candidate.roleSeatToken === envelope.roleSeatToken
        );
        if (!seat || !this.simulationSeatConnected(seat)) {
          return {
            ok: false as const,
            status: 403,
            error: "ROLE_TOKEN_INVALID",
            message: "岗位凭证已失效，请重新认领岗位"
          };
        }
        seat.lastSeenAt = new Date().toISOString();
        role = seat.role;
      } else {
        role = (input as PortSimulationTeacherCommandInputV2).role;
      }

      const stateHash = this.portSimulationStateHash(team);
      if (
        input.lastAppliedSequence !== team.latestSequence ||
        (input.baseStateHash !== stateHash &&
          !this.acceptsIssuedPortSimulationStateHash(
            sessionId,
            team,
            input
          ))
      ) {
        const value: PortSimulationCommandResultV2 = {
          requestId: input.requestId,
          status: "resync_required",
          revision: team.engine.revision,
          latestSequence: team.latestSequence,
          reasonCode:
            input.lastAppliedSequence !== team.latestSequence
              ? "EVENT_SEQUENCE_MISMATCH"
              : "STATE_HASH_MISMATCH",
          message: "本地状态与权威状态不一致，请重新同步后再下令。"
        };
        this.eventRepository.saveReceipt(
          team.runId,
          input.requestId,
          value,
          null,
          new Date().toISOString()
        );
        return { ok: true as const, value };
      }
      if (input.expectedRevision !== team.engine.revision) {
        const value: PortSimulationCommandResultV2 = {
          requestId: input.requestId,
          status: "conflict",
          revision: team.engine.revision,
          latestSequence: team.latestSequence,
          reasonCode: "STALE_REVISION",
          message: "港口状态已经更新，请根据最新状态重新下令。"
        };
        this.eventRepository.saveReceipt(
          team.runId,
          input.requestId,
          value,
          null,
          new Date().toISOString()
        );
        return { ok: true as const, value };
      }

      this.advancePortSimulationTeamToWallClock(team);

      const outcome = applyPortSimulationCommand(
        team.engine,
        this.portSimulationScenarioForTeam(team),
        role,
        input.command,
        { requestId: input.requestId, actor: actorKind }
      );
      team.engine = outcome.state;
      const acceptedSequence = team.latestSequence + 1;
      const value: PortSimulationCommandResultV2 = {
        requestId: input.requestId,
        status: outcome.result.status === "applied" ? "applied" : "rejected",
        revision: team.engine.revision,
        latestSequence: acceptedSequence,
        acceptedSequence,
        reasonCode: outcome.result.reasonCode,
        message: outcome.result.message
      };
      const event = this.appendPortSimulationCanonicalEvent(
        sessionId,
        team,
        "business",
        {
          type: "command",
          requestId: input.requestId,
          role,
          actor: actorKind,
          command: input.command
        },
        Date.now(),
        value
      );
      if (!event) throw new Error("event stream command did not create an event");
      runtime.runtimeVersion += 1;
      return { ok: true as const, value };
    }, false);
    if (result.ok) {
      const pendingKey = `${input.runId}:${input.requestId}`;
      const pendingWrite = this.pendingEventWrites.get(pendingKey);
      if (pendingWrite) {
        try {
          await pendingWrite;
          const event = this.pendingCanonicalEvents.get(pendingKey);
          const team = this.current.classroomRuntimes[
            sessionId
          ]?.simulation?.teams.find((candidate) => candidate.id === teamId);
          if (event && team) {
            this.publishPortSimulationStreamMessage(sessionId, teamId, {
              type: "event",
              event
            });
            this.maybeSavePortSimulationCheckpoint(sessionId, team);
          }
        } finally {
          this.pendingEventWrites.delete(pendingKey);
          this.pendingCanonicalEvents.delete(pendingKey);
        }
      }
      this.publishClassroomSnapshot(sessionId, this.getClassroomSnapshot(sessionId));
    }
    return result;
  }

  applyPortSimulationCommandV2(
    sessionId: string,
    teamId: string,
    input: PortSimulationCommandEnvelopeV2,
    actor: ClassroomActor
  ) {
    return this.applyPortSimulationCommandV2ForActor(
      sessionId,
      teamId,
      input,
      actor,
      "student"
    );
  }

  applyPortSimulationTeacherCommandV2(
    sessionId: string,
    teamId: string,
    input: PortSimulationTeacherCommandInputV2,
    actor: ClassroomActor
  ) {
    return this.applyPortSimulationCommandV2ForActor(
      sessionId,
      teamId,
      input,
      actor,
      "teacher"
    );
  }

  async tickPortSimulations(now = Date.now()) {
    const hasRunningTeam = Object.values(this.current.classroomRuntimes).some(
      (runtime) =>
        runtime.simulation?.teams.some(
          (team) => team.engine.status === "running"
        )
    );
    if (!hasRunningTeam) return;
    const publications = await this.mutate((state) => {
      const teams: Array<{
        sessionId: string;
        snapshot: PortSimulationTeamSnapshot;
      }> = [];
      const streamMessages: Array<{
        sessionId: string;
        teamId: string;
        timeSync: PortSimulationTimeSync;
        presence: PortSimulationPresenceDelta;
      }> = [];
      const classrooms: Array<{
        sessionId: string;
        snapshot: ClassroomSnapshot;
      }> = [];
      let persistLegacy = false;
      for (const [sessionId, runtime] of Object.entries(
        state.classroomRuntimes
      )) {
        let changed = false;
        for (const team of runtime.simulation?.teams ?? []) {
          if (!this.advancePortSimulationTeamToWallClock(team, now)) continue;
          changed = true;
          if (team.syncMode === "snapshot_legacy") {
            persistLegacy = true;
            teams.push({
              sessionId,
              snapshot: this.buildPortSimulationTeamSnapshot(
                sessionId,
                team,
                now
              )
            });
          } else {
            this.maybeSavePortSimulationCheckpoint(sessionId, team, now);
            const key = this.portSimulationTeamKey(sessionId, team.id);
            const lastSync = this.lastTimeSyncAt.get(key) ?? 0;
            if (now - lastSync >= 5_000) {
              this.lastTimeSyncAt.set(key, now);
              const stateHash = this.portSimulationStateHash(team);
              this.rememberIssuedPortSimulationStateHash(
                sessionId,
                team.id,
                {
                  runId: team.runId,
                  sequence: team.latestSequence,
                  businessRevision: team.engine.revision,
                  stateHash
                },
                now
              );
              streamMessages.push({
                sessionId,
                teamId: team.id,
                timeSync: {
                  runId: team.runId,
                  teamId: team.id,
                  sequence: team.latestSequence,
                  businessRevision: team.engine.revision,
                  collaborationRevision: team.collaborationRevision,
                  simMinute: team.engine.clock.simMinute,
                  status: team.engine.status,
                  timeScale: team.engine.clock.timeScale,
                  serverTime: new Date(now).toISOString(),
                  stateHash
                },
                presence: this.buildPortSimulationPresenceDelta(team, now)
              });
            }
          }
        }
        if (changed) {
          const session = state.classSessions.find(
            (item) => item.id === sessionId
          );
          if (session) {
            const snapshot = this.buildClassroomSnapshot(
              state,
              session,
              runtime
            );
            if (snapshot) classrooms.push({ sessionId, snapshot });
          }
        }
      }
      return { teams, streamMessages, classrooms, persistLegacy };
    }, (result) => result.persistLegacy);
    for (const item of publications.teams) {
      this.publishPortSimulationTeamSnapshot(item.sessionId, item.snapshot);
    }
    for (const item of publications.streamMessages) {
      this.publishPortSimulationStreamMessage(item.sessionId, item.teamId, {
        type: "time_sync",
        timeSync: item.timeSync
      });
      this.publishPortSimulationStreamMessage(item.sessionId, item.teamId, {
        type: "presence",
        presence: item.presence
      });
    }
    for (const item of publications.classrooms) {
      this.publishClassroomSnapshot(item.sessionId, item.snapshot);
    }
  }

  getDashboard(): Dashboard {
    const featuredCourse =
      this.current.courses.find((course) => course.featured) ?? this.current.courses[0];
    if (!featuredCourse) {
      throw new Error("At least one course is required");
    }

    const activeCourses = this.current.courses.filter((course) => course.status === "active").length;
    const upcomingClasses = this.current.classSessions.filter(
      (session) => session.status === "scheduled"
    );

    return {
      teacher: this.getTeacher(),
      featuredCourse,
      metrics: {
        activeCourses,
        upcomingClasses: upcomingClasses.length,
        pendingEvaluations: 0,
        simulationResources: 0
      },
      upcomingClasses: upcomingClasses.slice(0, 3),
      recentActivities: [...this.current.activities]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 6)
    };
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    const teacher = this.getTeacher();
    return this.mutate((state) => {
      const now = new Date().toISOString();
      const course: Course = {
        id: `course-${randomUUID()}`,
        slug: `course-${Date.now()}`,
        code: input.code,
        title: input.title,
        category: input.category,
        discipline: input.discipline,
        totalHours: input.totalHours,
        progress: 0,
        status: "draft",
        featured: false,
        teacherId: teacher.id,
        currentLesson: {
          chapter: 1,
          title: "课程导论",
          summary: "待完善本节教学目标、课堂活动与教学资源。"
        },
        createdAt: now
      };
      state.courses.push(course);
      state.activities.push({
        id: `activity-${randomUUID()}`,
        type: "course_created",
        title: "新课程已建立",
        detail: `创建《${course.title}》`,
        occurredAt: now
      });
      return course;
    });
  }

  async startClass(courseId: string): Promise<ClassSession | undefined> {
    const course = this.getCourse(courseId);
    if (!course) {
      return undefined;
    }
    return this.mutate((state) => {
      const now = new Date().toISOString();
      const session: ClassSession = {
        id: `session-${randomUUID()}`,
        courseId: course.id,
        courseTitle: course.title,
        lessonTitle: course.currentLesson.title,
        room: "在线课堂",
        startsAt: now,
        status: "live",
        assistantMode: "classroom_realtime"
      };
      state.classSessions.push(session);
      state.classroomRuntimes[session.id] = createInitialClassroomRuntime();
      const activity: Activity = {
        id: `activity-${randomUUID()}`,
        type: "class_started",
        title: "课堂已启动",
        detail: `${course.title} · ${course.currentLesson.title}`,
        occurredAt: now
      };
      state.activities.push(activity);
      return session;
    });
  }

  async applyClassroomEvent(
    sessionId: string,
    input: ClassroomEventInput
  ): Promise<ClassroomSnapshot | undefined> {
    const snapshot = await this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      const completeActiveGlobe = () => {
        if (runtime.globePlayback.cueId) {
          runtime.globePlayback.status = "completed";
          runtime.globePlayback.stepStartedAt = null;
        }
      };

      if (input.type === "next_slide") {
        completeActiveGlobe();
        runtime.slideIndex = Math.min(
          PORT_MANAGEMENT_SLIDE_TOTAL,
          runtime.slideIndex + 1
        );
        runtime.activeActivity = "slides";
      } else if (input.type === "previous_slide") {
        completeActiveGlobe();
        runtime.slideIndex = Math.max(1, runtime.slideIndex - 1);
        runtime.activeActivity = "slides";
      } else if (input.type === "set_slide") {
        completeActiveGlobe();
        runtime.slideIndex = Math.min(
          PORT_MANAGEMENT_SLIDE_TOTAL,
          input.index
        );
        runtime.activeActivity = "slides";
      } else if (input.type === "set_activity") {
        if (input.activity !== "globe") completeActiveGlobe();
        runtime.activeActivity = input.activity;
      } else if (input.type === "globe_play_cue") {
        const cue = getPortManagementGlobeCue(input.cueId);
        const launchSlide = getPortManagementSlide(runtime.slideIndex);
        if (cue && launchSlide.slideKey === cue.startSlideKey) {
          const now = new Date().toISOString();
          runtime.activeActivity = "globe";
          runtime.globePlayback = {
            cueId: cue.id,
            runId: `globe-run-${randomUUID()}`,
            stepIndex: 0,
            status: "playing",
            stepStartedAt: now,
            stepElapsedMs: 0
          };
        }
      } else if (input.type === "globe_pause") {
        const playback = runtime.globePlayback;
        if (playback.status === "playing" && playback.stepStartedAt) {
          playback.stepElapsedMs = Math.max(
            0,
            playback.stepElapsedMs +
              (Date.now() - new Date(playback.stepStartedAt).getTime())
          );
          playback.status = "paused";
          playback.stepStartedAt = null;
        }
      } else if (input.type === "globe_resume") {
        const playback = runtime.globePlayback;
        if (playback.status === "paused" && playback.cueId) {
          playback.status = "playing";
          playback.stepStartedAt = new Date().toISOString();
          runtime.activeActivity = "globe";
        }
      } else if (input.type === "globe_restart") {
        const cue = runtime.globePlayback.cueId
          ? getPortManagementGlobeCue(runtime.globePlayback.cueId)
          : undefined;
        if (cue) {
          runtime.activeActivity = "globe";
          runtime.globePlayback = {
            cueId: cue.id,
            runId: `globe-run-${randomUUID()}`,
            stepIndex: 0,
            status: "playing",
            stepStartedAt: new Date().toISOString(),
            stepElapsedMs: 0
          };
        }
      } else if (input.type === "globe_advance") {
        const playback = runtime.globePlayback;
        const cue = playback.cueId
          ? getPortManagementGlobeCue(playback.cueId)
          : undefined;
        if (
          cue &&
          playback.status === "playing" &&
          playback.runId === input.runId &&
          playback.stepIndex === input.fromStepIndex
        ) {
          const nextStepIndex = playback.stepIndex + 1;
          if (nextStepIndex < cue.steps.length) {
            playback.stepIndex = nextStepIndex;
            playback.stepStartedAt = new Date().toISOString();
            playback.stepElapsedMs = 0;
          } else {
            const returnSlide = getPortManagementSlideByKey(
              cue.returnSlideKey
            );
            playback.status = "completed";
            playback.stepStartedAt = null;
            playback.stepElapsedMs = 0;
            runtime.activeActivity = "slides";
            if (returnSlide) {
              runtime.slideIndex = returnSlide.index;
              runtime.slideKey = returnSlide.slideKey;
            }
          }
        }
      } else if (input.type === "set_lam_connection") {
        runtime.avatar.status = input.connected ? "ready" : "degraded";
        runtime.avatar.gpuStatus = input.connected
          ? "ready"
          : "unavailable";
        runtime.avatar.latencyMs = null;
        runtime.avatar.lastMessage = input.connected
          ? "OpenAvatarChat LAM 已由教师端确认连接。"
          : "OpenAvatarChat LAM 当前未连接，课堂使用字幕降级。";
      } else {
        runtime.avatar.mode = input.mode;
        runtime.avatar.status =
          input.mode === "classroom_realtime" ? "warming" : "ready";
        runtime.avatar.gpuStatus =
          input.mode === "classroom_realtime" ? "planned" : "idle";
        runtime.avatar.latencyMs = null;
        runtime.avatar.lastMessage =
          input.mode === "classroom_realtime"
            ? "已请求课堂实时数字人，等待 OpenAvatarChat LAM 建立会话。"
            : "已切换为轻量卡通助手，不占用实时 GPU。";
      }

      const currentSlide = getPortManagementSlide(runtime.slideIndex);
      runtime.slideIndex = currentSlide.index;
      runtime.slideKey = currentSlide.slideKey;
      runtime.deckVersion = PORT_MANAGEMENT_DECK_VERSION;
      runtime.runtimeVersion += 1;
      if (
        input.type !== "set_avatar_mode" &&
        input.type !== "set_lam_connection"
      ) {
        runtime.avatar.currentTask =
          runtime.activeActivity === "slides"
            ? `已连接第 ${runtime.slideIndex} 页`
            : `已连接${runtime.activeActivity}活动`;
      }
      state.classroomRuntimes[sessionId] = runtime;
      return this.buildClassroomSnapshot(state, session, runtime);
    });
    this.publishClassroomSnapshot(sessionId, snapshot);
    return snapshot;
  }

  async executeAvatarControl(
    sessionId: string,
    input: AvatarControlRequest
  ): Promise<AvatarControlResponse | undefined> {
    const response = await this.mutate((state) => {
      const session = state.classSessions.find(
        (candidate) => candidate.id === sessionId
      );
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ??
        createInitialClassroomRuntime();
      const previousReceipt = runtime.avatarControlHistory.find(
        (receipt) => receipt.requestId === input.requestId
      );
      if (previousReceipt) {
        const snapshot = this.buildClassroomSnapshot(
          state,
          session,
          runtime
        );
        if (!snapshot) return undefined;
        return {
          protocol: input.protocol,
          version: input.version,
          requestId: input.requestId,
          status: previousReceipt.status,
          duplicate: true,
          executedAt: previousReceipt.executedAt,
          results: previousReceipt.results,
          snapshot
        };
      }

      const results: AvatarControlActionResult[] = [];
      let changed = false;
      const completeActiveGlobe = () => {
        if (runtime.globePlayback.cueId) {
          runtime.globePlayback.status = "completed";
          runtime.globePlayback.stepStartedAt = null;
        }
      };

      input.actions.forEach((action, index) => {
        if (action.type === "slides.next") {
          completeActiveGlobe();
          const nextSlide = Math.min(
            PORT_MANAGEMENT_SLIDE_TOTAL,
            runtime.slideIndex + 1
          );
          const actionChanged =
            nextSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = nextSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已切换到 Slides 第 ${nextSlide} 页`
              : "已经是 Slides 最后一页"
          });
          return;
        }

        if (action.type === "slides.previous") {
          completeActiveGlobe();
          const previousSlide = Math.max(1, runtime.slideIndex - 1);
          const actionChanged =
            previousSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = previousSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已切换到 Slides 第 ${previousSlide} 页`
              : "已经是 Slides 第一页"
          });
          return;
        }

        if (action.type === "slides.go_to") {
          completeActiveGlobe();
          const targetSlide = Math.min(
            PORT_MANAGEMENT_SLIDE_TOTAL,
            action.slide
          );
          const actionChanged =
            targetSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = targetSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已跳转到 Slides 第 ${targetSlide} 页`
              : `已经位于 Slides 第 ${targetSlide} 页`
          });
          return;
        }

        if (action.type === "lesson.go_to") {
          const lesson = getPortManagementLesson(
            action.lesson as PortManagementLessonNumber
          );
          if (
            lesson.status !== "ready" ||
            lesson.slideStart === null ||
            lesson.title === null
          ) {
            results.push({
              index,
              type: action.type,
              status: "noop",
              message: `${lesson.label}内容待建设，未执行课堂跳转`
            });
            return;
          }

          const actionChanged =
            runtime.slideIndex !== lesson.slideStart ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = lesson.slideStart;
          completeActiveGlobe();
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已跳转到${lesson.label}“${lesson.title}”封面（Slides 第 ${lesson.slideStart} 页）`
              : `已经位于${lesson.label}“${lesson.title}”封面`
          });
          return;
        }

        if (action.type === "globe.play_cue") {
          const cue = getPortManagementGlobeCue(action.cueId);
          if (!cue) {
            results.push({
              index,
              type: action.type,
              status: "noop",
              message: `未注册地球仪开场 ${action.cueId}，未执行`
            });
            return;
          }
          const launchSlide = getPortManagementSlide(runtime.slideIndex);
          if (launchSlide.slideKey !== cue.startSlideKey) {
            results.push({
              index,
              type: action.type,
              status: "noop",
              message: `请先进入“${cue.startSlideKey}”问题页，再启动地球仪证据追踪`
            });
            return;
          }
          const alreadyPlaying =
            runtime.activeActivity === "globe" &&
            runtime.globePlayback.cueId === cue.id &&
            runtime.globePlayback.status === "playing";
          if (!alreadyPlaying) {
            runtime.activeActivity = "globe";
            runtime.globePlayback = {
              cueId: cue.id,
              runId: `globe-run-${randomUUID()}`,
              stepIndex: 0,
              status: "playing",
              stepStartedAt: new Date().toISOString(),
              stepElapsedMs: 0
            };
          }
          changed ||= !alreadyPlaying;
          results.push({
            index,
            type: action.type,
            status: alreadyPlaying ? "noop" : "applied",
            message: alreadyPlaying
              ? `地球仪开场“${cue.title}”已经在播放`
              : `已启动地球仪开场“${cue.title}”`
          });
          return;
        }

        if (action.type === "globe.pause") {
          const playback = runtime.globePlayback;
          const actionChanged =
            runtime.activeActivity === "globe" &&
            playback.status === "playing" &&
            playback.stepStartedAt !== null;
          if (actionChanged && playback.stepStartedAt) {
            playback.stepElapsedMs = Math.max(
              0,
              playback.stepElapsedMs +
                (Date.now() - new Date(playback.stepStartedAt).getTime())
            );
            playback.status = "paused";
            playback.stepStartedAt = null;
          }
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? "已暂停地球仪开场"
              : "当前没有正在播放的地球仪开场"
          });
          return;
        }

        if (action.type === "globe.resume") {
          const playback = runtime.globePlayback;
          const actionChanged =
            playback.cueId !== null &&
            playback.status === "paused";
          if (actionChanged) {
            playback.status = "playing";
            playback.stepStartedAt = new Date().toISOString();
            runtime.activeActivity = "globe";
          }
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? "已继续地球仪开场"
              : "当前没有已暂停的地球仪开场"
          });
          return;
        }

        if (action.type === "globe.restart") {
          const cue = runtime.globePlayback.cueId
            ? getPortManagementGlobeCue(runtime.globePlayback.cueId)
            : undefined;
          if (!cue) {
            results.push({
              index,
              type: action.type,
              status: "noop",
              message: "当前没有可重新播放的地球仪开场"
            });
            return;
          }
          runtime.activeActivity = "globe";
          runtime.globePlayback = {
            cueId: cue.id,
            runId: `globe-run-${randomUUID()}`,
            stepIndex: 0,
            status: "playing",
            stepStartedAt: new Date().toISOString(),
            stepElapsedMs: 0
          };
          changed = true;
          results.push({
            index,
            type: action.type,
            status: "applied",
            message: `已从头播放地球仪开场“${cue.title}”`
          });
          return;
        }

        if (action.activity !== "globe") completeActiveGlobe();
        const actionChanged =
          runtime.activeActivity !== action.activity;
        runtime.activeActivity = action.activity;
        changed ||= actionChanged;
        results.push({
          index,
          type: action.type,
          status: actionChanged ? "applied" : "noop",
          message: actionChanged
            ? `已切换课堂活动为 ${action.activity}`
            : `课堂活动已经是 ${action.activity}`
        });
      });

      const currentSlide = getPortManagementSlide(runtime.slideIndex);
      runtime.slideIndex = currentSlide.index;
      runtime.slideKey = currentSlide.slideKey;
      runtime.deckVersion = PORT_MANAGEMENT_DECK_VERSION;
      const executedAt = new Date().toISOString();
      const status: AvatarControlResponse["status"] = changed
        ? "applied"
        : "noop";
      if (changed) {
        runtime.runtimeVersion += 1;
        runtime.avatar.currentTask =
          input.reason ??
          results
            .filter((result) => result.status === "applied")
            .map((result) => result.message)
            .join("；");
        runtime.avatar.lastMessage = `数字人课堂控制已执行：${runtime.avatar.currentTask}`;
      }
      runtime.avatarControlHistory.push({
        requestId: input.requestId,
        executedAt,
        status,
        results
      });
      runtime.avatarControlHistory =
        runtime.avatarControlHistory.slice(-100);
      state.classroomRuntimes[sessionId] = runtime;

      const snapshot = this.buildClassroomSnapshot(
        state,
        session,
        runtime
      );
      if (!snapshot) return undefined;
      return {
        protocol: input.protocol,
        version: input.version,
        requestId: input.requestId,
        status,
        duplicate: false,
        executedAt,
        results,
        snapshot
      };
    });
    this.publishClassroomSnapshot(sessionId, response?.snapshot);
    return response;
  }

  async submitAvatarCommand(
    sessionId: string,
    input: TeacherAvatarCommandInput
  ): Promise<TeacherAvatarCommandResponse | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      const acceptedAt = new Date().toISOString();
      const commandSummary =
        input.inputMode === "text"
          ? input.text
          : `语音指令 ${(input.durationMs / 1000).toFixed(1)} 秒`;

      runtime.avatar = {
        ...runtime.avatar,
        status: "thinking",
        gpuStatus: runtime.avatar.gpuStatus === "idle" ? "planned" : runtime.avatar.gpuStatus,
        currentTask: commandSummary,
        lastMessage:
          input.inputMode === "text"
            ? `教师文字已进入平台 JSON 流编排：${input.text}`
            : "语音已收到，等待 OpenAvatarChat ASR 生成可审计终稿。"
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;

      return {
        id: `avatar-command-${randomUUID()}`,
        inputMode: input.inputMode,
        state: "queued",
        acceptedAt,
        message:
          input.inputMode === "text"
            ? `教师指令“${input.text}”已进入平台课堂助手队列。`
            : "语音已进入 OpenAvatarChat ASR；识别终稿将回到平台课堂助手。",
        avatar: { ...runtime.avatar }
      };
    });
  }

  async updateAvatarRuntime(
    sessionId: string,
    patch: Partial<ClassroomAvatarRuntime>
  ): Promise<ClassroomSnapshot | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find(
        (candidate) => candidate.id === sessionId
      );
      if (!session) return undefined;

      const runtime =
        state.classroomRuntimes[sessionId] ??
        createInitialClassroomRuntime();
      runtime.avatar = {
        ...runtime.avatar,
        ...patch
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;
      return this.buildClassroomSnapshot(state, session, runtime);
    });
  }

  async endClass(sessionId: string): Promise<ClassSession | undefined> {
    const session = await this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      session.status = "completed";
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      runtime.avatar = {
        ...runtime.avatar,
        status: "off",
        gpuStatus: "idle",
        latencyMs: null,
        currentTask: null,
        lastMessage: "课堂已结束，实时数字人资源已进入释放流程。"
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;
      return session;
    });
    if (session) {
      this.classroomPresence.delete(sessionId);
    }
    return session;
  }
}
