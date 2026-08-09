import { z } from "zod";

export const classroomActorRoleSchema = z.enum(["teacher", "student"]);
export type ClassroomActorRole = z.infer<typeof classroomActorRoleSchema>;

export const classroomIdentitySourceSchema = z.enum([
  "development",
  "teaching_information_system"
]);
export type ClassroomIdentitySource = z.infer<
  typeof classroomIdentitySourceSchema
>;

export const classroomActorSchema = z.object({
  actorId: z.string(),
  displayName: z.string(),
  roles: z.array(classroomActorRoleSchema).min(1),
  identitySource: classroomIdentitySourceSchema
});
export type ClassroomActor = z.infer<typeof classroomActorSchema>;

export const classroomIdentitySessionSchema = z.object({
  actor: classroomActorSchema,
  expiresAt: z.string().nullable()
});
export type ClassroomIdentitySession = z.infer<
  typeof classroomIdentitySessionSchema
>;

export const developmentIdentitySessionInputSchema = z.object({
  role: classroomActorRoleSchema,
  displayName: z.string().trim().min(1).max(40).optional()
});
export type DevelopmentIdentitySessionInput = z.infer<
  typeof developmentIdentitySessionInputSchema
>;

export const externalClassroomRosterSnapshotSchema = z.object({
  source: z.literal("teaching_information_system"),
  externalCourseRef: z.string(),
  externalSectionRef: z.string(),
  version: z.string(),
  fetchedAt: z.string(),
  members: z.array(
    z.object({
      externalSubjectRef: z.string(),
      displayName: z.string(),
      role: classroomActorRoleSchema,
      fixedGroupRef: z.string().nullable()
    })
  )
});
export type ExternalClassroomRosterSnapshot = z.infer<
  typeof externalClassroomRosterSnapshotSchema
>;

export interface ClassroomIdentityCredential {
  sessionToken: string | null;
  authorization: string | null;
}

export interface ExternalRosterRequest {
  externalCourseRef: string;
  externalSectionRef: string;
}

export interface ClassroomIdentityProvider {
  readonly source: ClassroomIdentitySource;
  resolveActor(
    credential: ClassroomIdentityCredential
  ): Promise<ClassroomActor | null>;
  loadRoster?(
    input: ExternalRosterRequest
  ): Promise<ExternalClassroomRosterSnapshot>;
}

export const courseStatusSchema = z.enum(["draft", "active", "archived"]);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const teacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.literal("teacher"),
  title: z.string(),
  institution: z.string()
});
export type Teacher = z.infer<typeof teacherSchema>;

export const lessonSchema = z.object({
  chapter: z.number().int().positive(),
  title: z.string(),
  summary: z.string()
});
export type Lesson = z.infer<typeof lessonSchema>;

export const courseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  code: z.string(),
  title: z.string(),
  category: z.string(),
  discipline: z.string(),
  totalHours: z.number().int().positive(),
  progress: z.number().min(0).max(100),
  status: courseStatusSchema,
  featured: z.boolean(),
  teacherId: z.string(),
  currentLesson: lessonSchema,
  createdAt: z.string()
});
export type Course = z.infer<typeof courseSchema>;

export const createCourseInputSchema = z.object({
  title: z.string().trim().min(2, "课程名称至少需要 2 个字").max(80),
  code: z.string().trim().min(2, "课程代码不能为空").max(30),
  category: z.string().trim().min(2).max(30),
  discipline: z.string().trim().min(2).max(30),
  totalHours: z.coerce.number().int().min(1).max(300)
});
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const classSessionSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  lessonTitle: z.string(),
  room: z.string(),
  startsAt: z.string(),
  status: z.enum(["scheduled", "live", "completed"]),
  assistantMode: z.enum(["classroom_realtime", "selfstudy_prerecorded"])
});
export type ClassSession = z.infer<typeof classSessionSchema>;

export const activitySchema = z.object({
  id: z.string(),
  type: z.enum(["course_created", "lesson_prepared", "class_started"]),
  title: z.string(),
  detail: z.string(),
  occurredAt: z.string()
});
export type Activity = z.infer<typeof activitySchema>;

export const dashboardSchema = z.object({
  teacher: teacherSchema,
  featuredCourse: courseSchema,
  metrics: z.object({
    activeCourses: z.number().int().nonnegative(),
    upcomingClasses: z.number().int().nonnegative(),
    pendingEvaluations: z.number().int().nonnegative(),
    simulationResources: z.number().int().nonnegative()
  }),
  upcomingClasses: z.array(classSessionSchema),
  recentActivities: z.array(activitySchema)
});
export type Dashboard = z.infer<typeof dashboardSchema>;

export const avatarPresentationInputSchema = z.object({
  scene: z.enum(["classroom", "selfstudy"]),
  courseId: z.string()
});
export type AvatarPresentationInput = z.infer<typeof avatarPresentationInputSchema>;

export const avatarPresentationSchema = z.object({
  id: z.string(),
  mode: z.enum(["classroom_realtime", "selfstudy_prerecorded"]),
  requiresGpu: z.boolean(),
  status: z.enum(["ready", "planned"]),
  message: z.string()
});
export type AvatarPresentation = z.infer<typeof avatarPresentationSchema>;

export const classroomActivitySchema = z.enum([
  "slides",
  "globe",
  "simulation",
  "whiteboard",
  "video",
  "interaction"
]);
export type ClassroomActivity = z.infer<typeof classroomActivitySchema>;

export const SLIDE_LOGICAL_WIDTH = 1600 as const;
export const SLIDE_LOGICAL_HEIGHT = 1000 as const;
export const SLIDE_ASPECT_RATIO = "16:10" as const;

export const slideFrameSchema = z.object({
  deckId: z.string(),
  versionId: z.string(),
  slideId: z.string(),
  index: z.number().int().positive(),
  total: z.number().int().positive(),
  logicalWidth: z.literal(SLIDE_LOGICAL_WIDTH),
  logicalHeight: z.literal(SLIDE_LOGICAL_HEIGHT),
  aspectRatio: z.literal(SLIDE_ASPECT_RATIO),
  title: z.string(),
  lessonNumber: z.number().int().min(1),
  lessonTitle: z.string(),
  section: z.string(),
  summary: z.string()
});
export type SlideFrame = z.infer<typeof slideFrameSchema>;

export const classroomAvatarRuntimeSchema = z.object({
  status: z.enum([
    "off",
    "warming",
    "ready",
    "thinking",
    "speaking",
    "paused",
    "degraded",
    "error"
  ]),
  mode: z.enum(["classroom_realtime", "selfstudy_prerecorded"]),
  gpuStatus: z.enum(["idle", "planned", "ready", "unavailable"]),
  latencyMs: z.number().int().nonnegative().nullable(),
  currentTask: z.string().nullable(),
  lastMessage: z.string().nullable()
});
export type ClassroomAvatarRuntime = z.infer<typeof classroomAvatarRuntimeSchema>;

export const globePlaybackStatusSchema = z.enum([
  "idle",
  "playing",
  "paused",
  "completed"
]);
export type GlobePlaybackStatus = z.infer<
  typeof globePlaybackStatusSchema
>;

export const globePlaybackSchema = z.object({
  cueId: z.string().nullable(),
  runId: z.string().nullable(),
  stepIndex: z.number().int().nonnegative(),
  status: globePlaybackStatusSchema,
  stepStartedAt: z.string().nullable(),
  stepElapsedMs: z.number().int().nonnegative()
});
export type GlobePlayback = z.infer<typeof globePlaybackSchema>;

export const portSimulationRoleSchema = z.enum([
  "marine_control",
  "berth_operations",
  "horizontal_transport",
  "yard_gate"
]);
export type PortSimulationRole = z.infer<typeof portSimulationRoleSchema>;

export const portSimulationSupportRoleSchema = z.enum([
  "operations_coordinator",
  "safety_reviewer"
]);
export type PortSimulationSupportRole = z.infer<
  typeof portSimulationSupportRoleSchema
>;

export const portSimulationChallengeIdSchema = z.enum([
  "joint-watch",
  "scarce-deep-reach",
  "compound-disruption"
]);
export type PortSimulationChallengeId = z.infer<
  typeof portSimulationChallengeIdSchema
>;

export const portSimulationDeliveryModeSchema = z.enum([
  "local_solo",
  "network_teams_legacy"
]);
export type PortSimulationDeliveryMode = z.infer<
  typeof portSimulationDeliveryModeSchema
>;

export const portSimulationMemberCapacitySchema = z.union([
  z.literal(4),
  z.literal(5),
  z.literal(6)
]);
export type PortSimulationMemberCapacity = z.infer<
  typeof portSimulationMemberCapacitySchema
>;

export const portSimulationRunStatusSchema = z.enum([
  "lobby",
  "ready",
  "running",
  "paused",
  "completed",
  "aborted"
]);
export type PortSimulationRunStatus = z.infer<
  typeof portSimulationRunStatusSchema
>;

export const portSimulationSyncModeSchema = z.enum([
  "snapshot_legacy",
  "event_stream_v1"
]);
export type PortSimulationSyncMode = z.infer<
  typeof portSimulationSyncModeSchema
>;

export const portSimulationAssignmentSourceSchema = z.enum([
  "self_select",
  "external_fixed"
]);
export type PortSimulationAssignmentSource = z.infer<
  typeof portSimulationAssignmentSourceSchema
>;

export const portSimulationClockSchema = z.object({
  simMinute: z.number().nonnegative(),
  durationSimMinutes: z.number().positive(),
  timeScale: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  wallClockAnchor: z.string().nullable(),
  pausedReason: z.string().nullable()
});
export type PortSimulationClock = z.infer<typeof portSimulationClockSchema>;

export const portSimulationRoleSeatSchema = z.object({
  role: portSimulationRoleSchema,
  participantId: z.string().nullable(),
  participantDisplayName: z.string().nullable(),
  claimedAt: z.string().nullable(),
  leaseExpiresAt: z.string().nullable(),
  connected: z.boolean()
});
export type PortSimulationRoleSeat = z.infer<
  typeof portSimulationRoleSeatSchema
>;

export const portSimulationSupportSeatSchema = z.object({
  role: portSimulationSupportRoleSchema,
  participantId: z.string().nullable(),
  participantDisplayName: z.string().nullable(),
  claimedAt: z.string().nullable(),
  leaseExpiresAt: z.string().nullable(),
  connected: z.boolean()
});
export type PortSimulationSupportSeat = z.infer<
  typeof portSimulationSupportSeatSchema
>;

export const portSimulationCraneOutreachClassSchema = z.enum([
  "standard",
  "deep_reach"
]);
export type PortSimulationCraneOutreachClass = z.infer<
  typeof portSimulationCraneOutreachClassSchema
>;

export const portSimulationVesselStageSchema = z.enum([
  "scheduled",
  "anchorage",
  "inbound",
  "berthed",
  "working",
  "ready_departure",
  "outbound",
  "departed"
]);
export type PortSimulationVesselStage = z.infer<
  typeof portSimulationVesselStageSchema
>;

export const portSimulationVesselStateSchema = z.object({
  id: z.string(),
  label: z.string(),
  stage: portSimulationVesselStageSchema,
  etaSimMinute: z.number().nonnegative(),
  requiredOutreachClass: portSimulationCraneOutreachClassSchema,
  berthId: z.string().nullable(),
  pilotId: z.string().nullable(),
  tugIds: z.array(z.string()),
  craneIds: z.array(z.string()),
  agvIds: z.array(z.string()),
  cargoStarted: z.boolean(),
  cargoCompleted: z.boolean(),
  cargoStartedAtSimMinute: z.number().nonnegative().nullable(),
  cargoCompletedAtSimMinute: z.number().nonnegative().nullable(),
  completedBatches: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
  workCompletedUnits: z.number().nonnegative(),
  workTotalUnits: z.number().positive(),
  stageEndsAtSimMinute: z.number().nullable(),
  arrivedAtSimMinute: z.number().nullable(),
  departedAtSimMinute: z.number().nullable(),
  waitMinutes: z.object({
    anchorage: z.number().nonnegative(),
    channel: z.number().nonnegative(),
    berth: z.number().nonnegative(),
    cargo: z.number().nonnegative()
  })
});
export type PortSimulationVesselState = z.infer<
  typeof portSimulationVesselStateSchema
>;

export const portSimulationResourceKindSchema = z.enum([
  "pilot",
  "tug",
  "quay_crane",
  "agv",
  "yard_block",
  "gate_lane",
  "channel",
  "berth"
]);
export type PortSimulationResourceKind = z.infer<
  typeof portSimulationResourceKindSchema
>;

export const portSimulationResourceStatusSchema = z.enum([
  "available",
  "assigned",
  "busy",
  "moving",
  "fault",
  "charging",
  "closed"
]);
export type PortSimulationResourceStatus = z.infer<
  typeof portSimulationResourceStatusSchema
>;

export const portSimulationQuayCraneStateSchema = z.object({
  trackPosition: z.number(),
  movementStartPosition: z.number().nullable(),
  targetTrackPosition: z.number().nullable(),
  targetSlotId: z.string().nullable(),
  movementStartedAtSimMinute: z.number().nonnegative().nullable(),
  movementEndsAtSimMinute: z.number().nonnegative().nullable(),
  outreachClass: portSimulationCraneOutreachClassSchema
});
export type PortSimulationQuayCraneState = z.infer<
  typeof portSimulationQuayCraneStateSchema
>;

export const portSimulationResourceStateSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: portSimulationResourceKindSchema,
  status: portSimulationResourceStatusSchema,
  assignedTo: z.string().nullable(),
  availableAtSimMinute: z.number().nullable(),
  quayCrane: portSimulationQuayCraneStateSchema.nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});
export type PortSimulationResourceState = z.infer<
  typeof portSimulationResourceStateSchema
>;

export const portSimulationTaskSchema = z.object({
  id: z.string(),
  vesselId: z.string(),
  direction: z.enum(["discharge", "load"]),
  label: z.string(),
  status: z.enum([
    "waiting_assignment",
    "ready",
    "processing",
    "completed"
  ]),
  yardBlockId: z.string().nullable(),
  workUnits: z.number().positive(),
  completedAtSimMinute: z.number().nullable(),
  releasedAtSimMinute: z.number().nullable()
});
export type PortSimulationTask = z.infer<typeof portSimulationTaskSchema>;

export const portSimulationQueueSchema = z.object({
  id: z.string(),
  label: z.string(),
  length: z.number().int().nonnegative(),
  peakLength: z.number().int().nonnegative(),
  blockedReason: z.string().nullable()
});
export type PortSimulationQueue = z.infer<typeof portSimulationQueueSchema>;

export const portSimulationIncidentStateSchema = z.object({
  id: z.string(),
  label: z.string(),
  scheduledAtSimMinute: z.number().nonnegative(),
  status: z.enum(["scheduled", "active", "resolved"]),
  startedAtSimMinute: z.number().nullable(),
  resolvedAtSimMinute: z.number().nullable()
});
export type PortSimulationIncidentState = z.infer<
  typeof portSimulationIncidentStateSchema
>;

export const portSimulationEventSchema = z.object({
  id: z.string(),
  simMinute: z.number().nonnegative(),
  type: z.string(),
  message: z.string(),
  role: portSimulationRoleSchema.nullable(),
  actor: z.enum(["student", "teacher", "engine"]),
  outcome: z.enum(["applied", "rejected", "information"])
});
export type PortSimulationEvent = z.infer<typeof portSimulationEventSchema>;

export const portSimulationMetricsSchema = z.object({
  rejectedCommands: z.number().int().nonnegative(),
  teacherTakeovers: z.number().int().nonnegative(),
  gateQueuePeak: z.number().int().nonnegative(),
  incompleteTasks: z.number().int().nonnegative(),
  incidentRecoveryMinutes: z.array(
    z.object({
      incidentId: z.string(),
      minutes: z.number().nonnegative().nullable()
    })
  ),
  roleResponseMinutes: z.array(
    z.object({
      role: portSimulationRoleSchema,
      totalMinutes: z.number().nonnegative(),
      decisions: z.number().int().nonnegative()
    })
  ),
  resourceMinutes: z.array(
    z.object({
      resourceId: z.string(),
      busy: z.number().nonnegative(),
      idle: z.number().nonnegative(),
      blocked: z.number().nonnegative(),
      traveling: z.number().nonnegative()
    })
  ),
  craneMoves: z.object({
    completed: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    totalDistance: z.number().nonnegative(),
    totalTravelMinutes: z.number().nonnegative(),
    matchingBlocks: z.number().int().nonnegative()
  })
});
export type PortSimulationMetrics = z.infer<
  typeof portSimulationMetricsSchema
>;

export const portSimulationAuthoritativeEngineStateSchema = z.object({
  scenarioId: z.string(),
  scenarioVersion: z.string(),
  revision: z.number().int().positive(),
  status: portSimulationRunStatusSchema,
  clock: portSimulationClockSchema,
  vessels: z.array(portSimulationVesselStateSchema),
  resources: z.array(portSimulationResourceStateSchema),
  tasks: z.array(portSimulationTaskSchema),
  queues: z.array(portSimulationQueueSchema),
  incidents: z.array(portSimulationIncidentStateSchema),
  metrics: portSimulationMetricsSchema,
  recentEvents: z.array(portSimulationEventSchema),
  eventSequence: z.number().int().nonnegative(),
  gateServiceProgress: z.number().nonnegative(),
  transportPriority: z.record(z.string(), z.number().int()),
  roleLastDecisionAt: z.record(portSimulationRoleSchema, z.number())
});
export type PortSimulationAuthoritativeEngineState = z.infer<
  typeof portSimulationAuthoritativeEngineStateSchema
>;

export const portSimulationTeamSnapshotSchema = z.object({
  schemaVersion: z.literal("1.1"),
  syncMode: portSimulationSyncModeSchema,
  runId: z.string(),
  challengeId: portSimulationChallengeIdSchema.default("compound-disruption"),
  challengeVersion: z.string().default("1.0.0"),
  attemptNumber: z.number().int().positive().default(1),
  previousBestScore: z.number().int().min(0).max(1000).nullable().default(null),
  latestSequence: z.number().int().nonnegative(),
  presenceRevision: z.number().int().positive(),
  stateHash: z.string(),
  sessionId: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  scenarioId: z.string(),
  scenarioVersion: z.string(),
  revision: z.number().int().positive(),
  collaborationRevision: z.number().int().positive(),
  memberCount: z.number().int().nonnegative(),
  memberCapacity: portSimulationMemberCapacitySchema,
  classroomObserverCount: z.number().int().nonnegative(),
  status: portSimulationRunStatusSchema,
  clock: portSimulationClockSchema,
  roleSeats: z.array(portSimulationRoleSeatSchema),
  supportSeats: z.array(portSimulationSupportSeatSchema),
  collaborationItems: z.array(
    z.lazy(() => portSimulationCollaborationItemSchema)
  ),
  vessels: z.array(portSimulationVesselStateSchema),
  resources: z.array(portSimulationResourceStateSchema),
  tasks: z.array(portSimulationTaskSchema),
  queues: z.array(portSimulationQueueSchema),
  incidents: z.array(portSimulationIncidentStateSchema),
  metrics: portSimulationMetricsSchema,
  recentEvents: z.array(portSimulationEventSchema)
});
export type PortSimulationTeamSnapshot = z.infer<
  typeof portSimulationTeamSnapshotSchema
>;
export type PortSimulationTeamSnapshotV11 = PortSimulationTeamSnapshot;

export const portSimulationScoreDimensionSchema = z.enum([
  "safety",
  "completion",
  "vessel_flow",
  "resource_coordination",
  "incident_recovery",
  "teamwork"
]);
export type PortSimulationScoreDimension = z.infer<
  typeof portSimulationScoreDimensionSchema
>;

export const portSimulationScoreBreakdownSchema = z.object({
  dimension: portSimulationScoreDimensionSchema,
  label: z.string(),
  maxPoints: z.number().int().positive(),
  points: z.number().int().nonnegative(),
  summary: z.string(),
  evidenceEventIds: z.array(z.string())
});
export type PortSimulationScoreBreakdown = z.infer<
  typeof portSimulationScoreBreakdownSchema
>;

export const portSimulationScorecardSchema = z.object({
  schemaVersion: z.literal("1.0"),
  totalScore: z.number().int().min(0).max(1000),
  maxScore: z.literal(1000),
  rankingStatus: z.enum(["provisional", "final", "practice"]),
  rankEligible: z.boolean(),
  eligibilityMessage: z.string(),
  updatedAtSimMinute: z.number().nonnegative(),
  breakdown: z.array(portSimulationScoreBreakdownSchema).length(6),
  tieBreakers: z.object({
    safetyPoints: z.number().int().nonnegative(),
    completedTasks: z.number().int().nonnegative(),
    totalWaitMinutes: z.number().nonnegative(),
    simMinute: z.number().nonnegative()
  })
});
export type PortSimulationScorecard = z.infer<
  typeof portSimulationScorecardSchema
>;

export const portSimulationTeamSummarySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  status: portSimulationRunStatusSchema,
  revision: z.number().int().positive(),
  collaborationRevision: z.number().int().positive(),
  syncMode: portSimulationSyncModeSchema,
  runId: z.string(),
  latestSequence: z.number().int().nonnegative(),
  presenceRevision: z.number().int().positive(),
  simMinute: z.number().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  memberCapacity: portSimulationMemberCapacitySchema,
  occupiedRoles: z.number().int().min(0).max(4),
  occupiedSupportSeats: z.number().int().min(0).max(2),
  coreRolesReady: z.boolean(),
  completedVessels: z.number().int().min(0).max(2),
  rejectedCommands: z.number().int().nonnegative(),
  gateQueuePeak: z.number().int().nonnegative(),
  incompleteTasks: z.number().int().nonnegative(),
  teacherTakeovers: z.number().int().nonnegative(),
  totalWaitMinutes: z.number().nonnegative(),
  mainDelaySource: z.string(),
  attemptNumber: z.number().int().positive(),
  previousBestScore: z.number().int().min(0).max(1000).nullable(),
  scoreImprovement: z.number().int().nullable(),
  overallRank: z.number().int().positive().nullable(),
  staffingRank: z.number().int().positive().nullable(),
  improvementRank: z.number().int().positive().nullable(),
  scorecard: portSimulationScorecardSchema
});
export type PortSimulationTeamSummary = z.infer<
  typeof portSimulationTeamSummarySchema
>;

export const portSimulationClassroomSummarySchema = z.object({
  scenarioId: z.string(),
  scenarioVersion: z.string(),
  challengeId: portSimulationChallengeIdSchema.default("compound-disruption"),
  challengeVersion: z.string().default("1.0.0"),
  deliveryMode: portSimulationDeliveryModeSchema.default(
    "network_teams_legacy"
  ),
  assignmentSource: portSimulationAssignmentSourceSchema,
  assignmentAdjusted: z.boolean(),
  expectedStudentCount: z.number().int().min(4).max(72),
  classroomObserverCount: z.number().int().nonnegative(),
  timeScale: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  teams: z.array(portSimulationTeamSummarySchema)
});
export type PortSimulationClassroomSummary = z.infer<
  typeof portSimulationClassroomSummarySchema
>;

export const classroomSnapshotSchema = z.object({
  session: classSessionSchema,
  courseId: z.string(),
  courseTitle: z.string(),
  chapterTitle: z.string(),
  activeActivity: classroomActivitySchema,
  slide: slideFrameSchema,
  participantsOnline: z.number().int().nonnegative(),
  runtimeVersion: z.number().int().positive(),
  globePlayback: globePlaybackSchema,
  simulation: portSimulationClassroomSummarySchema.nullable(),
  avatar: classroomAvatarRuntimeSchema
});
export type ClassroomSnapshot = z.infer<typeof classroomSnapshotSchema>;

export const portSimulationSetupInputSchema = z.object({
  expectedStudentCount: z.number().int().min(4).max(72).optional(),
  teamCount: z.number().int().min(1).max(15).optional(),
  teamNames: z.array(z.string().trim().min(1).max(24)).max(15).optional(),
  teamCapacities: z.array(portSimulationMemberCapacitySchema).max(15).optional(),
  challengeId: portSimulationChallengeIdSchema.optional(),
  deliveryMode: portSimulationDeliveryModeSchema.optional()
});
export type PortSimulationSetupInput = z.infer<
  typeof portSimulationSetupInputSchema
>;

export const portSimulationTeamJoinInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional()
});
export type PortSimulationTeamJoinInput = z.infer<
  typeof portSimulationTeamJoinInputSchema
>;

export const portSimulationTeamConfigurationInputSchema = z
  .object({
    expectedStudentCount: z.number().int().min(4).max(72),
    teamNames: z.array(z.string().trim().min(1).max(24)).min(1).max(15),
    teamCapacities: z.array(portSimulationMemberCapacitySchema).min(1).max(15)
  })
  .superRefine((value, context) => {
    if (value.teamNames.length !== value.teamCapacities.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "小组名称和容量数量必须一致"
      });
    }
    const plannedStudents = value.teamCapacities.reduce(
      (sum, capacity) => sum + capacity,
      0
    );
    const expectedActiveStudents =
      value.expectedStudentCount === 7 ? 6 : value.expectedStudentCount;
    if (plannedStudents !== expectedActiveStudents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "小组容量总和必须等于预计运行人数"
      });
    }
  });
export type PortSimulationTeamConfigurationInput = z.infer<
  typeof portSimulationTeamConfigurationInputSchema
>;

export const portSimulationControlInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    allowIncompleteTeams: z.boolean().default(false)
  }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
  z.object({
    type: z.literal("set_speed"),
    timeScale: z.union([z.literal(0.5), z.literal(1), z.literal(2)])
  }),
  z.object({ type: z.literal("complete") }),
  z.object({ type: z.literal("reset") })
]);
export type PortSimulationControlInput = z.infer<
  typeof portSimulationControlInputSchema
>;

export const portSimulationRoleClaimInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional()
});
export type PortSimulationRoleClaimInput = z.infer<
  typeof portSimulationRoleClaimInputSchema
>;

export const portSimulationRoleReleaseInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional(),
  roleSeatToken: z.string().trim().min(1).max(256)
});
export type PortSimulationRoleReleaseInput = z.infer<
  typeof portSimulationRoleReleaseInputSchema
>;

export const portSimulationSupportSeatClaimInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional()
});
export type PortSimulationSupportSeatClaimInput = z.infer<
  typeof portSimulationSupportSeatClaimInputSchema
>;

export const portSimulationSupportSeatReleaseInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional(),
  supportSeatToken: z.string().trim().min(1).max(256)
});
export type PortSimulationSupportSeatReleaseInput = z.infer<
  typeof portSimulationSupportSeatReleaseInputSchema
>;

export const portSimulationRoleLeaseRenewInputSchema = z.object({
  roleSeatToken: z.string().trim().min(1).max(256)
});
export type PortSimulationRoleLeaseRenewInput = z.infer<
  typeof portSimulationRoleLeaseRenewInputSchema
>;

export const portSimulationSupportLeaseRenewInputSchema = z.object({
  supportSeatToken: z.string().trim().min(1).max(256)
});
export type PortSimulationSupportLeaseRenewInput = z.infer<
  typeof portSimulationSupportLeaseRenewInputSchema
>;

export const portSimulationLeaseRenewResultSchema = z.object({
  expiresAt: z.string(),
  presenceRevision: z.number().int().positive()
});
export type PortSimulationLeaseRenewResult = z.infer<
  typeof portSimulationLeaseRenewResultSchema
>;

export const portSimulationCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("marine.assign_services"),
    vesselId: z.string(),
    pilotId: z.string(),
    tugIds: z.array(z.string()).length(2)
  }),
  z.object({
    type: z.literal("marine.authorize_transit"),
    vesselId: z.string(),
    direction: z.enum(["inbound", "outbound"])
  }),
  z.object({
    type: z.literal("berth.assign"),
    vesselId: z.string(),
    berthId: z.string()
  }),
  z.object({
    type: z.literal("quay.assign_cranes"),
    vesselId: z.string(),
    craneIds: z.array(z.string()).min(1).max(4)
  }),
  z.object({
    type: z.literal("quay.move_crane"),
    craneId: z.string(),
    targetSlotId: z.string()
  }),
  z.object({
    type: z.literal("quay.start_cargo"),
    vesselId: z.string()
  }),
  z.object({
    type: z.literal("berth.release"),
    vesselId: z.string()
  }),
  z.object({
    type: z.literal("transport.assign_agvs"),
    vesselId: z.string(),
    agvIds: z.array(z.string()).min(1).max(4)
  }),
  z.object({
    type: z.literal("transport.set_priority"),
    vesselId: z.string(),
    priority: z.number().int().min(1).max(3)
  }),
  z.object({
    type: z.literal("transport.send_charge"),
    agvId: z.string()
  }),
  z.object({
    type: z.literal("yard.assign_block"),
    taskId: z.string(),
    blockId: z.string()
  }),
  z.object({
    type: z.literal("yard.release_batch"),
    taskId: z.string()
  }),
  z.object({
    type: z.literal("gate.set_lane"),
    laneId: z.string(),
    open: z.boolean()
  })
]);
export type PortSimulationCommand = z.infer<
  typeof portSimulationCommandSchema
>;

export const portSimulationCollaborationReasonSchema = z.enum([
  "resource_distance",
  "resource_conflict",
  "sequence_dependency",
  "incident_recovery",
  "queue_pressure",
  "prerequisite_missing",
  "safety_interlock",
  "crane_matching"
]);
export type PortSimulationCollaborationReason = z.infer<
  typeof portSimulationCollaborationReasonSchema
>;

export const portSimulationCollaborationItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["command_proposal", "risk_alert", "review_marker"]),
  supportRole: portSimulationSupportRoleSchema,
  targetRole: portSimulationRoleSchema.nullable(),
  entityIds: z.array(z.string()).max(12),
  reasonCode: portSimulationCollaborationReasonSchema,
  commandDraft: portSimulationCommandSchema.optional(),
  status: z.enum(["open", "accepted", "dismissed", "expired"]),
  createdByParticipantId: z.string(),
  createdAtSimMinute: z.number().nonnegative(),
  expiresAtSimMinute: z.number().nonnegative().nullable(),
  respondedByParticipantId: z.string().nullable(),
  respondedAtSimMinute: z.number().nonnegative().nullable()
});
export type PortSimulationCollaborationItem = z.infer<
  typeof portSimulationCollaborationItemSchema
>;

export const portSimulationCollaborationCreateInputSchema = z.object({
  requestId: z.string().trim().min(1).max(128),
  participantId: z.string().trim().min(1).max(128).optional(),
  supportSeatToken: z.string().trim().min(1).max(256),
  expectedCollaborationRevision: z.number().int().positive(),
  item: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("command_proposal"),
      targetRole: portSimulationRoleSchema,
      entityIds: z.array(z.string()).max(12).default([]),
      reasonCode: portSimulationCollaborationReasonSchema,
      commandDraft: portSimulationCommandSchema
    }),
    z.object({
      kind: z.literal("risk_alert"),
      targetRole: portSimulationRoleSchema,
      entityIds: z.array(z.string()).min(1).max(12),
      reasonCode: portSimulationCollaborationReasonSchema
    }),
    z.object({
      kind: z.literal("review_marker"),
      targetRole: portSimulationRoleSchema.nullable().default(null),
      entityIds: z.array(z.string()).max(12).default([]),
      reasonCode: portSimulationCollaborationReasonSchema
    })
  ])
});
export type PortSimulationCollaborationCreateInput = z.infer<
  typeof portSimulationCollaborationCreateInputSchema
>;

export const portSimulationCollaborationResponseInputSchema = z.object({
  requestId: z.string().trim().min(1).max(128),
  participantId: z.string().trim().min(1).max(128).optional(),
  roleSeatToken: z.string().trim().min(1).max(256),
  expectedCollaborationRevision: z.number().int().positive(),
  action: z.enum(["accept", "dismiss"])
});
export type PortSimulationCollaborationResponseInput = z.infer<
  typeof portSimulationCollaborationResponseInputSchema
>;

export const portSimulationCommandEnvelopeSchema = z.object({
  requestId: z.string().trim().min(1).max(128),
  participantId: z.string().trim().min(1).max(128).optional(),
  roleSeatToken: z.string().trim().min(1).max(256),
  expectedRevision: z.number().int().positive(),
  command: portSimulationCommandSchema
});
export type PortSimulationCommandEnvelope = z.infer<
  typeof portSimulationCommandEnvelopeSchema
>;

export const portSimulationTeacherCommandInputSchema = z.object({
  requestId: z.string().trim().min(1).max(128),
  expectedRevision: z.number().int().positive(),
  role: portSimulationRoleSchema,
  command: portSimulationCommandSchema
});
export type PortSimulationTeacherCommandInput = z.infer<
  typeof portSimulationTeacherCommandInputSchema
>;

export const portSimulationCommandResultSchema = z.object({
  requestId: z.string(),
  status: z.enum(["applied", "rejected", "duplicate", "conflict"]),
  revision: z.number().int().positive(),
  reasonCode: z.string().optional(),
  message: z.string()
});
export type PortSimulationCommandResult = z.infer<
  typeof portSimulationCommandResultSchema
>;

export const portSimulationCommandResponseSchema = z.object({
  result: portSimulationCommandResultSchema,
  snapshot: portSimulationTeamSnapshotSchema
});
export type PortSimulationCommandResponse = z.infer<
  typeof portSimulationCommandResponseSchema
>;

export const portSimulationRoleClaimResponseSchema = z.object({
  teamId: z.string(),
  role: portSimulationRoleSchema,
  participantId: z.string(),
  roleSeatToken: z.string(),
  snapshot: portSimulationTeamSnapshotSchema
});
export type PortSimulationRoleClaimResponse = z.infer<
  typeof portSimulationRoleClaimResponseSchema
>;

export const portSimulationSupportSeatClaimResponseSchema = z.object({
  teamId: z.string(),
  role: portSimulationSupportRoleSchema,
  participantId: z.string(),
  supportSeatToken: z.string(),
  snapshot: portSimulationTeamSnapshotSchema
});
export type PortSimulationSupportSeatClaimResponse = z.infer<
  typeof portSimulationSupportSeatClaimResponseSchema
>;

export const portSimulationCollaborationResultSchema = z.object({
  requestId: z.string(),
  status: z.enum(["applied", "rejected", "duplicate", "conflict"]),
  collaborationRevision: z.number().int().positive(),
  reasonCode: z.string().optional(),
  message: z.string()
});
export type PortSimulationCollaborationResult = z.infer<
  typeof portSimulationCollaborationResultSchema
>;

export const portSimulationCollaborationResponseSchema = z.object({
  result: portSimulationCollaborationResultSchema,
  snapshot: portSimulationTeamSnapshotSchema
});
export type PortSimulationCollaborationResponse = z.infer<
  typeof portSimulationCollaborationResponseSchema
>;

export const portSimulationTeamAuthoritativeStateSchema = z.object({
  teamName: z.string(),
  memberCount: z.number().int().nonnegative(),
  memberCapacity: portSimulationMemberCapacitySchema,
  classroomObserverCount: z.number().int().nonnegative(),
  roleSeats: z.array(portSimulationRoleSeatSchema),
  supportSeats: z.array(portSimulationSupportSeatSchema),
  presenceRevision: z.number().int().positive(),
  engine: portSimulationAuthoritativeEngineStateSchema,
  collaborationRevision: z.number().int().positive(),
  collaborationItems: z.array(portSimulationCollaborationItemSchema)
});
export type PortSimulationTeamAuthoritativeState = z.infer<
  typeof portSimulationTeamAuthoritativeStateSchema
>;

export const portSimulationEventPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("command"),
    requestId: z.string(),
    role: portSimulationRoleSchema,
    actor: z.enum(["student", "teacher"]),
    command: portSimulationCommandSchema
  }),
  z.object({
    type: z.literal("teacher_control"),
    control: portSimulationControlInputSchema,
    serverTime: z.string(),
    missingRoles: z.array(portSimulationRoleSchema).default([]),
    missingSupportRoles: z.array(portSimulationSupportRoleSchema).default([]),
    resetReady: z.boolean().default(false)
  }),
  z.object({
    type: z.literal("collaboration_state"),
    collaborationRevision: z.number().int().positive(),
    collaborationItems: z.array(portSimulationCollaborationItemSchema)
  })
]);
export type PortSimulationEventPayload = z.infer<
  typeof portSimulationEventPayloadSchema
>;

export const portSimulationCanonicalEventSchema = z.object({
  schemaVersion: z.literal("1.0"),
  runId: z.string(),
  sessionId: z.string(),
  teamId: z.string(),
  sequence: z.number().int().positive(),
  businessRevision: z.number().int().positive(),
  collaborationRevision: z.number().int().positive(),
  simMinute: z.number().nonnegative(),
  kind: z.enum(["business", "collaboration", "teacher_control"]),
  payload: portSimulationEventPayloadSchema,
  stateHash: z.string(),
  createdAt: z.string()
});
export type PortSimulationCanonicalEvent = z.infer<
  typeof portSimulationCanonicalEventSchema
>;

export const portSimulationCheckpointSchema = z.object({
  schemaVersion: z.literal("1.0"),
  syncMode: z.literal("event_stream_v1"),
  runId: z.string(),
  sessionId: z.string(),
  teamId: z.string(),
  challengeId: portSimulationChallengeIdSchema.default("compound-disruption"),
  challengeVersion: z.string().default("1.0.0"),
  attemptNumber: z.number().int().positive().default(1),
  previousBestScore: z.number().int().min(0).max(1000).nullable().default(null),
  scenarioId: z.string(),
  scenarioVersion: z.string(),
  sequence: z.number().int().nonnegative(),
  businessRevision: z.number().int().positive(),
  collaborationRevision: z.number().int().positive(),
  serverTime: z.string(),
  state: portSimulationTeamAuthoritativeStateSchema,
  stateHash: z.string()
});
export type PortSimulationCheckpoint = z.infer<
  typeof portSimulationCheckpointSchema
>;

export const portSimulationCommandEnvelopeV2Schema = z.object({
  requestId: z.string().trim().min(1).max(128),
  runId: z.string().trim().min(1).max(128),
  roleSeatToken: z.string().trim().min(1).max(256),
  expectedRevision: z.number().int().positive(),
  lastAppliedSequence: z.number().int().nonnegative(),
  baseStateHash: z.string().min(1),
  command: portSimulationCommandSchema
});
export type PortSimulationCommandEnvelopeV2 = z.infer<
  typeof portSimulationCommandEnvelopeV2Schema
>;

export const portSimulationTeacherCommandInputV2Schema = z.object({
  requestId: z.string().trim().min(1).max(128),
  runId: z.string().trim().min(1).max(128),
  expectedRevision: z.number().int().positive(),
  lastAppliedSequence: z.number().int().nonnegative(),
  baseStateHash: z.string().min(1),
  role: portSimulationRoleSchema,
  command: portSimulationCommandSchema
});
export type PortSimulationTeacherCommandInputV2 = z.infer<
  typeof portSimulationTeacherCommandInputV2Schema
>;

export const portSimulationCommandResultV2Schema = z.object({
  requestId: z.string(),
  status: z.enum([
    "applied",
    "rejected",
    "duplicate",
    "conflict",
    "resync_required"
  ]),
  revision: z.number().int().positive(),
  latestSequence: z.number().int().nonnegative(),
  acceptedSequence: z.number().int().positive().optional(),
  reasonCode: z.string().optional(),
  message: z.string()
});
export type PortSimulationCommandResultV2 = z.infer<
  typeof portSimulationCommandResultV2Schema
>;

export const portSimulationEventBatchSchema = z.object({
  runId: z.string(),
  afterSequence: z.number().int().nonnegative(),
  latestSequence: z.number().int().nonnegative(),
  resyncRequired: z.boolean(),
  events: z.array(portSimulationCanonicalEventSchema)
});
export type PortSimulationEventBatch = z.infer<
  typeof portSimulationEventBatchSchema
>;

export const portSimulationTimeSyncSchema = z.object({
  runId: z.string(),
  teamId: z.string(),
  sequence: z.number().int().nonnegative(),
  businessRevision: z.number().int().positive(),
  collaborationRevision: z.number().int().positive(),
  simMinute: z.number().nonnegative(),
  status: portSimulationRunStatusSchema,
  timeScale: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  serverTime: z.string(),
  stateHash: z.string()
});
export type PortSimulationTimeSync = z.infer<
  typeof portSimulationTimeSyncSchema
>;

export const portSimulationPresenceDeltaSchema = z.object({
  runId: z.string(),
  teamId: z.string(),
  presenceRevision: z.number().int().positive(),
  memberCount: z.number().int().nonnegative(),
  roleSeats: z.array(portSimulationRoleSeatSchema),
  supportSeats: z.array(portSimulationSupportSeatSchema),
  serverTime: z.string()
});
export type PortSimulationPresenceDelta = z.infer<
  typeof portSimulationPresenceDeltaSchema
>;

export const portSimulationStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("event"), event: portSimulationCanonicalEventSchema }),
  z.object({ type: z.literal("time_sync"), timeSync: portSimulationTimeSyncSchema }),
  z.object({ type: z.literal("presence"), presence: portSimulationPresenceDeltaSchema }),
  z.object({
    type: z.literal("resync_required"),
    runId: z.string(),
    latestSequence: z.number().int().nonnegative(),
    message: z.string()
  })
]);
export type PortSimulationStreamMessage = z.infer<
  typeof portSimulationStreamMessageSchema
>;

export const portSimulationPreflightCheckSchema = z.object({
  id: z.string(),
  status: z.enum(["pass", "warning", "blocked"]),
  label: z.string(),
  message: z.string()
});
export type PortSimulationPreflightCheck = z.infer<
  typeof portSimulationPreflightCheckSchema
>;

export const portSimulationPreflightReportSchema = z.object({
  sessionId: z.string(),
  checkedAt: z.string(),
  identitySource: classroomIdentitySourceSchema,
  rosterVersion: z.string().nullable(),
  serverTime: z.string(),
  persistence: z.literal("sqlite_wal"),
  sseAvailable: z.boolean(),
  ready: z.boolean(),
  checks: z.array(portSimulationPreflightCheckSchema)
});
export type PortSimulationPreflightReport = z.infer<
  typeof portSimulationPreflightReportSchema
>;

export const classroomPresenceHeartbeatInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128).optional()
});
export type ClassroomPresenceHeartbeatInput = z.infer<
  typeof classroomPresenceHeartbeatInputSchema
>;

export const classroomPresenceSchema = z.object({
  participantsOnline: z.number().int().nonnegative(),
  lastSeenAt: z.string(),
  expiresInMs: z.number().int().positive()
});
export type ClassroomPresence = z.infer<typeof classroomPresenceSchema>;

export const lamRuntimeStatusSchema = z.object({
  service: z.literal("openavatarchat"),
  renderer: z.literal("lam"),
  avatar: z.literal("barbara"),
  status: z.enum(["offline", "warming", "ready", "incompatible", "error"]),
  version: z.string().nullable(),
  uiUrl: z.string().nullable(),
  assetUrl: z.string().nullable(),
  websocketUrl: z.string().nullable(),
  checkedAt: z.string(),
  message: z.string()
});
export type LamRuntimeStatus = z.infer<typeof lamRuntimeStatusSchema>;

export const classroomEventInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("next_slide") }),
  z.object({ type: z.literal("previous_slide") }),
  z.object({
    type: z.literal("set_slide"),
    index: z.number().int().positive()
  }),
  z.object({
    type: z.literal("set_activity"),
    activity: classroomActivitySchema
  }),
  z.object({
    type: z.literal("globe_play_cue"),
    cueId: z.string().trim().min(1).max(128)
  }),
  z.object({ type: z.literal("globe_pause") }),
  z.object({ type: z.literal("globe_resume") }),
  z.object({ type: z.literal("globe_restart") }),
  z.object({
    type: z.literal("globe_advance"),
    runId: z.string().trim().min(1).max(128),
    fromStepIndex: z.number().int().nonnegative()
  }),
  z.object({
    type: z.literal("set_lam_connection"),
    connected: z.boolean()
  }),
  z.object({
    type: z.literal("set_avatar_mode"),
    mode: z.enum(["classroom_realtime", "selfstudy_prerecorded"])
  })
]);
export type ClassroomEventInput = z.infer<typeof classroomEventInputSchema>;

export const avatarControlProtocolSchema = z.literal(
  "edu.classroom.control"
);
export const avatarControlVersionSchema = z.literal("1.0");
export const avatarControlActionTypeSchema = z.enum([
  "slides.next",
  "slides.previous",
  "slides.go_to",
  "lesson.go_to",
  "activity.switch",
  "globe.play_cue",
  "globe.pause",
  "globe.resume",
  "globe.restart"
]);
export type AvatarControlActionType = z.infer<
  typeof avatarControlActionTypeSchema
>;

export const avatarControlActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("slides.next") }).strict(),
  z.object({ type: z.literal("slides.previous") }).strict(),
  z
    .object({
      type: z.literal("slides.go_to"),
      slide: z.number().int().min(1).max(500)
    })
    .strict(),
  z
    .object({
      type: z.literal("lesson.go_to"),
      lesson: z.number().int().min(1).max(16)
    })
    .strict(),
  z
    .object({
      type: z.literal("activity.switch"),
      activity: classroomActivitySchema
    })
    .strict(),
  z
    .object({
      type: z.literal("globe.play_cue"),
      cueId: z.string().trim().min(1).max(128)
    })
    .strict(),
  z.object({ type: z.literal("globe.pause") }).strict(),
  z.object({ type: z.literal("globe.resume") }).strict(),
  z.object({ type: z.literal("globe.restart") }).strict()
]);
export type AvatarControlAction = z.infer<typeof avatarControlActionSchema>;

export const assistantResponseSchemaNameSchema = z.literal(
  "edu.classroom.assistant.response"
);
export const assistantResponseVersionSchema = z.literal("1.0");
export const assistantResponseEnvelopeSchema = z
  .object({
    schema: assistantResponseSchemaNameSchema,
    version: assistantResponseVersionSchema,
    dialogue: z.string().min(1).max(4_000),
    actions: z.array(avatarControlActionSchema).max(8)
  })
  .strict();
export type AssistantResponseEnvelope = z.infer<
  typeof assistantResponseEnvelopeSchema
>;

export const assistantTurnInputSchema = z
  .object({
    text: z.string().trim().min(1, "助手输入不能为空").max(2_000),
    source: z.enum(["text", "voice_asr"]),
    commandId: z.string().trim().min(1).max(128).optional()
  })
  .strict();
export type AssistantTurnInput = z.infer<typeof assistantTurnInputSchema>;

export const avatarControlRequestSchema = z
  .object({
    protocol: avatarControlProtocolSchema,
    version: avatarControlVersionSchema,
    requestId: z.string().trim().min(1).max(128),
    reason: z.string().trim().min(1).max(200).optional(),
    actions: z.array(avatarControlActionSchema).min(1).max(8)
  })
  .strict();
export type AvatarControlRequest = z.infer<
  typeof avatarControlRequestSchema
>;

export const avatarControlActionResultSchema = z.object({
  index: z.number().int().nonnegative(),
  type: avatarControlActionTypeSchema,
  status: z.enum(["applied", "noop"]),
  message: z.string()
});
export type AvatarControlActionResult = z.infer<
  typeof avatarControlActionResultSchema
>;

export const avatarControlResponseSchema = z.object({
  protocol: avatarControlProtocolSchema,
  version: avatarControlVersionSchema,
  requestId: z.string(),
  status: z.enum(["applied", "noop"]),
  duplicate: z.boolean(),
  executedAt: z.string(),
  results: z.array(avatarControlActionResultSchema),
  snapshot: classroomSnapshotSchema
});
export type AvatarControlResponse = z.infer<
  typeof avatarControlResponseSchema
>;

export const assistantTurnEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("turn.started"),
    turnId: z.string(),
    startedAt: z.string()
  }),
  z.object({
    type: z.literal("dialogue.delta"),
    turnId: z.string(),
    delta: z.string().min(1),
    accumulated: z.string()
  }),
  z.object({
    type: z.literal("control.result"),
    turnId: z.string(),
    result: avatarControlResponseSchema
  }),
  z.object({
    type: z.literal("turn.completed"),
    turnId: z.string(),
    dialogue: z.string(),
    completedAt: z.string(),
    control: avatarControlResponseSchema.nullable()
  }),
  z.object({
    type: z.literal("turn.failed"),
    turnId: z.string(),
    code: z.enum([
      "PROVIDER_UNAVAILABLE",
      "PROVIDER_RESPONSE_INVALID",
      "TURN_ABORTED",
      "CONTROL_EXECUTION_FAILED",
      "INTERNAL_ERROR"
    ]),
    message: z.string(),
    recoverable: z.boolean()
  })
]);
export type AssistantTurnEvent = z.infer<
  typeof assistantTurnEventSchema
>;

export const avatarControlCapabilitySchema = z.object({
  type: avatarControlActionTypeSchema,
  description: z.string(),
  parameters: z.record(z.string(), z.string())
});
export type AvatarControlCapability = z.infer<
  typeof avatarControlCapabilitySchema
>;

export const avatarControlCapabilitiesSchema = z.object({
  protocol: avatarControlProtocolSchema,
  version: avatarControlVersionSchema,
  sessionId: z.string(),
  executeUrl: z.string(),
  maxActionsPerRequest: z.literal(8),
  allowedActions: z.array(avatarControlCapabilitySchema),
  currentState: z.object({
    sessionStatus: z.enum(["scheduled", "live", "completed"]),
    activeActivity: classroomActivitySchema,
    slideIndex: z.number().int().positive(),
    slideTotal: z.number().int().positive()
  })
});
export type AvatarControlCapabilities = z.infer<
  typeof avatarControlCapabilitiesSchema
>;

export const teacherAvatarCommandInputSchema = z.discriminatedUnion("inputMode", [
  z.object({
    inputMode: z.literal("text"),
    text: z.string().trim().min(1, "请输入指令").max(500)
  }),
  z.object({
    inputMode: z.literal("voice"),
    audioBase64: z.string().min(4).max(4_500_000),
    mimeType: z.string().min(3).max(100),
    durationMs: z.number().int().min(100).max(60_000)
  })
]);
export type TeacherAvatarCommandInput = z.infer<typeof teacherAvatarCommandInputSchema>;

export const teacherAvatarCommandResponseSchema = z.object({
  id: z.string(),
  inputMode: z.enum(["text", "voice"]),
  state: z.enum(["queued", "accepted"]),
  acceptedAt: z.string(),
  message: z.string(),
  avatar: classroomAvatarRuntimeSchema
});
export type TeacherAvatarCommandResponse = z.infer<
  typeof teacherAvatarCommandResponseSchema
>;

export * from "./streaming-json.js";
