import { z } from "zod";

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
  avatar: classroomAvatarRuntimeSchema
});
export type ClassroomSnapshot = z.infer<typeof classroomSnapshotSchema>;

export const classroomPresenceHeartbeatInputSchema = z.object({
  participantId: z.string().trim().min(1).max(128)
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
