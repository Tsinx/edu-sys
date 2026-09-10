import { randomUUID } from "node:crypto";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { CampusIdentityProvider } from "./campus/accounts.js";
import { registerCampusAccess } from "./campus/access.js";
import { EdgeRecordRepository, registerEdgeRecords } from "./campus/edge-records.js";
import { AiAdmission, registerAiAdmission, aiSignal, type AiLimits } from "./campus/ai-admission.js";
import { ClassroomParticipation } from "./classroom-participation.js";
import { registerParticipationRoutes } from "./classroom-participation-routes.js";
import cors from "@fastify/cors";
import {
  assistantTurnInputSchema,
  avatarControlRequestSchema,
  avatarPresentationInputSchema,
  createStudySessionInputSchema,
  classroomEventInputSchema,
  developmentIdentitySessionInputSchema,
  classroomPresenceHeartbeatInputSchema,
  portSimulationCollaborationCreateInputSchema,
  portSimulationCollaborationResponseInputSchema,
  portSimulationCommandEnvelopeSchema,
  portSimulationCommandEnvelopeV2Schema,
  portSimulationControlInputSchema,
  portSimulationRoleClaimInputSchema,
  portSimulationRoleLeaseRenewInputSchema,
  portSimulationRoleReleaseInputSchema,
  portSimulationRoleSchema,
  portSimulationSetupInputSchema,
  portSimulationSupportRoleSchema,
  portSimulationSupportSeatClaimInputSchema,
  portSimulationSupportLeaseRenewInputSchema,
  portSimulationSupportSeatReleaseInputSchema,
  portSimulationTeamConfigurationInputSchema,
  portSimulationTeamJoinInputSchema,
  portSimulationTeacherCommandInputSchema,
  portSimulationTeacherCommandInputV2Schema,
  teacherAvatarCommandInputSchema,
  studyAsrInputSchema,
  updateStudyProgressInputSchema,
  createCourseInputSchema,
  StreamingJsonDialogueError,
  type AssistantTurnEvent,
  type AvatarControlCapability,
  type ClassroomActor,
  type ClassroomActorRole,
  type ClassroomIdentityProvider,
  type StudyAssistantTurnEvent
} from "@edu/contracts";
import {
  getPortManagementAssistantContext,
  getPortManagementReadyLessons,
  PORT_MANAGEMENT_GLOBE_CUES
} from "@edu/course-content";
import {
  getCourseDeckByCourseId,
  isCourseDeckReady
} from "@edu/course-content/deck-registry";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  JsonStateStore,
  LANZHOU_CHARACTER_VERSION,
  LANZHOU_MANIFEST_URL,
  PORT_MANAGEMENT_STUDY_COURSE_ID
} from "./store.js";
import { getLamRuntimeStatus } from "./avatar-runtime.js";
import { ClassroomAssistantOrchestrator } from "./assistant/orchestrator.js";
import { registerAssistantPromptRoutes } from "./assistant/prompt-routes.js";
import {
  AssistantProviderError,
  OpenAiCompatibleAssistantProvider,
  type AssistantJsonStreamProvider
} from "./assistant/provider.js";
import { StudyAssistantOrchestrator } from "./study/orchestrator.js";
import {
  DashScopeStudySpeechProvider,
  StudyAsrNoSpeechError,
  StudySpeechProviderError,
  type StudySpeechProvider
} from "./study/speech.js";
import {
  CLASSROOM_IDENTITY_COOKIE,
  DevelopmentIdentityProvider,
  actorHasRole,
  expiredIdentityCookie,
  identityCookie,
  parseCookieHeader
} from "./identity.js";

export interface BuildAppOptions {
  dataFile: string;
  logger?: boolean;
  openAvatarBaseUrl?: string;
  openAvatarPublicUrl?: string;
  presenceTtlMs?: number;
  portSimulationTickMs?: number;
  portSimulationDatabaseFile?: string;
  assistantProvider?: AssistantJsonStreamProvider;
  studySpeechProvider?: StudySpeechProvider;
  identityProvider?: ClassroomIdentityProvider;
  allowDevelopmentIdentity?: boolean;
  allowLegacyDevelopmentIdentity?: boolean;
  secureIdentityCookie?: boolean;
  campusMode?: boolean;
  stateDatabaseFile?: string;
  publicOrigin?: string;
  staticRoot?: string;
  aiLimits?: Partial<AiLimits>;
}

function extractCompleteSpeechSegments(value: string): {
  segments: string[];
  remainder: string;
} {
  const segments: string[] = [];
  const matcher = /[^。！？!?；;\n]+[。！？!?；;\n]+/gu;
  let consumed = 0;
  for (const match of value.matchAll(matcher)) {
    const segment = match[0].trim();
    if (segment) segments.push(segment);
    consumed = (match.index ?? consumed) + match[0].length;
  }
  return { segments, remainder: value.slice(consumed) };
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const campusMode = options.campusMode ?? process.env.NODE_ENV === "production";
  const app = Fastify({ logger: options.logger ? { redact: ["req.headers.cookie", "req.headers.authorization", "req.body"] } : false, bodyLimit: 8 * 1024 * 1024 });
  const store = new JsonStateStore(
    options.dataFile,
    options.presenceTtlMs,
    options.portSimulationDatabaseFile,
    options.stateDatabaseFile ?? (campusMode ? `${options.dataFile}.platform.sqlite` : undefined)
  );
  await store.initialize();
  const allowDevelopmentIdentity =
    options.allowDevelopmentIdentity ?? !campusMode;
  const allowLegacyDevelopmentIdentity =
    options.allowLegacyDevelopmentIdentity ?? (!campusMode && allowDevelopmentIdentity);
  const identityProvider =
    options.identityProvider ??
    (campusMode ? new CampusIdentityProvider(`${options.dataFile}.accounts.sqlite`) : new DevelopmentIdentityProvider({
      allowRoleSelection: allowDevelopmentIdentity
    }));
  if (
    (campusMode || process.env.NODE_ENV === "production") &&
    identityProvider.source === "development" &&
    allowDevelopmentIdentity
  ) {
    throw new Error("生产模式不得启用可自选角色的开发身份入口");
  }
  const secureIdentityCookie =
    options.secureIdentityCookie ?? process.env.NODE_ENV === "production";

  const resolveActor = async (request: {
    headers: { cookie?: string; authorization?: string };
  }) => {
    const cookies = parseCookieHeader(request.headers.cookie);
    return identityProvider.resolveActor({
      sessionToken: cookies[CLASSROOM_IDENTITY_COOKIE] ?? null,
      authorization: request.headers.authorization ?? null
    });
  };
  registerCampusAccess(app, resolveActor, { enforce: !allowLegacyDevelopmentIdentity, publicOrigin: options.publicOrigin, campusMode });
  const edgeRecords = new EdgeRecordRepository(`${options.dataFile}.edge.sqlite`);
  registerEdgeRecords(app, edgeRecords, resolveActor);
  const aiAdmission = campusMode ? new AiAdmission(`${options.dataFile}.ai.sqlite`, {
    concurrency: 6, queue: 30, dailyRequests: 100, timeoutMs: 120_000, ...options.aiLimits
  }) : undefined;
  if (aiAdmission) registerAiAdmission(app, aiAdmission, resolveActor);
  const requireActor = async (
    request: { headers: { cookie?: string; authorization?: string } },
    requiredRole: ClassroomActorRole,
    legacyParticipantId?: string
  ): Promise<ClassroomActor> => {
    const actor = await resolveActor(request);
    if (actor) {
      if (!actorHasRole(actor, requiredRole)) {
        throw Object.assign(new Error("当前身份无权执行该课堂操作"), {
          statusCode: 403,
          code: "ACTOR_ROLE_FORBIDDEN"
        });
      }
      return actor;
    }
    if (allowLegacyDevelopmentIdentity) {
      return {
        actorId:
          legacyParticipantId ??
          `development:${requiredRole}:legacy-${requiredRole}`,
        displayName: requiredRole === "teacher" ? "李行之" : "课堂成员",
        roles: [requiredRole],
        identitySource: "development"
      };
    }
    throw Object.assign(new Error("身份会话不存在或已过期，请重新进入课堂"), {
      statusCode: 401,
      code: "IDENTITY_SESSION_REQUIRED"
    });
  };
  const resolveStudyActor = async (request: {
    headers: { cookie?: string; authorization?: string };
  }): Promise<ClassroomActor> => {
    const actor = await resolveActor(request);
    if (actor) {
      if (
        !actorHasRole(actor, "student") &&
        !actorHasRole(actor, "teacher")
      ) {
        throw Object.assign(new Error("当前身份无权进入课下学习"), {
          statusCode: 403,
          code: "STUDY_ROLE_FORBIDDEN"
        });
      }
      return actor;
    }
    return requireActor(request, "student");
  };
  const requireTeamViewer = async (
    request: { headers: { cookie?: string; authorization?: string } },
    sessionId: string,
    teamId: string
  ) => {
    const resolved = await resolveActor(request);
    if (resolved) {
      if (
        actorHasRole(resolved, "teacher") ||
        (actorHasRole(resolved, "student") &&
          store.isPortSimulationTeamMember(sessionId, teamId, resolved.actorId))
      ) {
        return resolved;
      }
      throw Object.assign(new Error("学生只能查看自己小组的实名与运行详情"), {
        statusCode: 403,
        code: "TEAM_VISIBILITY_FORBIDDEN"
      });
    }
    return requireActor(request, "student");
  };
  const portSimulationTickMs = campusMode ? 0 : (options.portSimulationTickMs ?? 1_000);
  const participation = new ClassroomParticipation(`${options.dataFile}.participation.sqlite`, id => store.getSession(id)?.status === "live", options.presenceTtlMs);
  const portSimulationTimer =
    portSimulationTickMs > 0
      ? setInterval(() => {
          void store.tickPortSimulations().catch((error) => app.log.error(error));
        }, portSimulationTickMs)
      : undefined;
  portSimulationTimer?.unref();
  app.addHook("onClose", async () => {
    if (portSimulationTimer) clearInterval(portSimulationTimer);
    store.close();
    participation.close();
    edgeRecords.close();
    aiAdmission?.close();
    if (identityProvider instanceof CampusIdentityProvider) identityProvider.close();
  });
  const assistantProvider =
    options.assistantProvider ?? new OpenAiCompatibleAssistantProvider();
  const assistantOrchestrator = new ClassroomAssistantOrchestrator(
    assistantProvider, () => store.getAssistantPromptSettings()
  );
  const studyAssistantOrchestrator = new StudyAssistantOrchestrator(
    assistantProvider, () => store.getAssistantPromptSettings()
  );
  const studySpeechProvider =
    options.studySpeechProvider ?? new DashScopeStudySpeechProvider();
  const activeAssistantTurns = new Map<string, AbortController>();
  const activeStudyAssistantTurns = new Map<string, AbortController>();

  await app.register(cors, { origin: campusMode ? (options.publicOrigin ?? false) : true, credentials: true });
  app.addHook("preClose", async()=>{
    for(const controller of activeAssistantTurns.values())controller.abort("server-closing");
    for(const controller of activeStudyAssistantTurns.values())controller.abort("server-closing");
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "请求参数不正确",
        issues: error.issues
      });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode < 500
    ) {
      const clientError = error as { statusCode: number; code?: string; message?: string };
      return reply.status(clientError.statusCode).send({
        error: clientError.code ?? "BAD_REQUEST",
        message: clientError.message ?? "请求参数不正确"
      });
    }
    app.log.error(error);
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: "服务暂时不可用，请稍后重试"
    });
  });

  registerParticipationRoutes(app, participation, id => store.getSession(id)?.courseId, resolveActor, id => Boolean(store.getCourse(id)));
  registerAssistantPromptRoutes(app, store, request => requireActor(request, "teacher"));

  app.get("/api/health", async () => ({
    status: "ok",
    service: "edu-platform-api",
    persistence: "json-development-adapter+sqlite-wal-event-store",
    identityProvider: identityProvider.source,
    developmentIdentityEnabled: allowDevelopmentIdentity
  }));

  app.get("/api/runtime/config", async () => ({
    profile: campusMode ? "campus" : "development",
    identity: identityProvider.source,
    avatar: campusMode ? "browser" : "lam",
    simulation: "local_solo",
    synchronization: "checkpoints-v1",
    speech: { asr: studySpeechProvider.asrConfigured, tts: studySpeechProvider.ttsConfigured }
  }));
  app.post("/api/identity/login", async (request,reply) => {
    if (!(identityProvider instanceof CampusIdentityProvider)) return reply.code(404).send({ message: "当前使用开发身份入口。" });
    const input = z.object({ username: z.string().min(2).max(80), password: z.string().min(1).max(256) }).strict().parse(request.body);
    const session = await identityProvider.login(input.username,input.password,request.ip);
    reply.header("Set-Cookie",identityCookie(session.token,{ secure:secureIdentityCookie,maxAgeSeconds:Math.floor((session.expiresAt-Date.now())/1000) }));
    return { actor:session.actor,expiresAt:new Date(session.expiresAt).toISOString() };
  });

  app.post("/api/identity/development/session", async (request, reply) => {
    if (
      !allowDevelopmentIdentity ||
      !(identityProvider instanceof DevelopmentIdentityProvider)
    ) {
      return reply.status(403).send({
        error: "DEVELOPMENT_IDENTITY_DISABLED",
        message: "当前部署未启用开发身份入口"
      });
    }
    const input = developmentIdentitySessionInputSchema.parse(request.body);
    const session = identityProvider.createSession(input);
    reply.header(
      "Set-Cookie",
      identityCookie(session.token, {
        secure: secureIdentityCookie,
        maxAgeSeconds: Math.max(
          1,
          Math.floor((session.expiresAt - Date.now()) / 1_000)
        )
      })
    );
    return reply.status(201).send({
      actor: session.actor,
      expiresAt: new Date(session.expiresAt).toISOString()
    });
  });

  app.get("/api/identity/session", async (request, reply) => {
    const actor = await resolveActor(request);
    if (!actor) {
      return reply.status(401).send({
        error: "IDENTITY_SESSION_REQUIRED",
        message: "身份会话不存在或已过期"
      });
    }
    return { actor, expiresAt: identityProvider instanceof CampusIdentityProvider
      ? identityProvider.expiresAt(parseCookieHeader(request.headers.cookie)[CLASSROOM_IDENTITY_COOKIE] ?? null) : null };
  });

  app.post("/api/identity/logout", async (request, reply) => {
    const token =
      parseCookieHeader(request.headers.cookie)[CLASSROOM_IDENTITY_COOKIE] ??
      null;
    if (identityProvider instanceof DevelopmentIdentityProvider || identityProvider instanceof CampusIdentityProvider) {
      identityProvider.revokeSession(token);
    }
    reply.header(
      "Set-Cookie",
      expiredIdentityCookie({ secure: secureIdentityCookie })
    );
    return reply.status(204).send();
  });

  app.get("/api/me", async request => {
    const actor=await resolveActor(request);
    return actor && campusMode ? {...store.getTeacher(),id:actor.actorId,name:actor.displayName} : store.getTeacher();
  });
  app.get("/api/dashboard", async request => {
    const dashboard=store.getDashboard(); const actor=await resolveActor(request);
    return actor && campusMode ? {...dashboard,teacher:{...dashboard.teacher,id:actor.actorId,name:actor.displayName}} : dashboard;
  });
  app.get("/api/courses", async () => store.listCourses());
  app.get("/api/class-sessions", async () => store.listSessions());

  app.get("/api/avatar/runtime/status", async () =>
    campusMode ? { service:"openavatarchat", renderer:"lam", avatar:"barbara", status:"offline",version:null,uiUrl:null,assetUrl:null,websocketUrl:null,checkedAt:new Date().toISOString(),message:"数字人由当前浏览器播放；校园服务器不启动 GPU 服务。" } : getLamRuntimeStatus(
      options.openAvatarBaseUrl ??
        process.env.OPENAVATARCHAT_URL ??
        "http://127.0.0.1:8282",
      options.openAvatarPublicUrl ??
        process.env.OPENAVATARCHAT_PUBLIC_URL ??
        options.openAvatarBaseUrl ??
        process.env.OPENAVATARCHAT_URL ??
        "http://127.0.0.1:8282"
    )
  );

  app.post("/api/teacher/asr", async (request, reply) => {
    const input=studyAsrInputSchema.parse(request.body);
    if (!studySpeechProvider.asrConfigured) return reply.code(503).send({ message: "尚未配置课堂语音识别，请使用文字输入。" });
    try {
      const text=await studySpeechProvider.transcribe({ ...input,context:"教学课堂语音。可能出现的口令：助教你好、你好助教、谢谢助教、助教请回答、助教取消。助教名称：小麦老师；兼容别名：澜舟，也可能出现澜舟你好、谢谢澜舟、澜舟取消。仅转写实际听到的内容，不补写口令。",signal:aiSignal(request) });
      return {text};
    } catch (error) {
      // Continuous capture can contain a click, breath or background noise. Keep listening.
      if (error instanceof StudyAsrNoSpeechError) return { text: "", status: "no_speech" };
      throw error;
    }
  });
  app.post("/api/teacher/tts", async (request,reply) => {
    const {text}=z.object({text:z.string().min(1).max(3000)}).parse(request.body);
    if(!studySpeechProvider.ttsConfigured) return reply.code(503).send({message:"尚未配置课堂语音，文字回答可正常使用。"});
    reply.hijack();
    reply.raw.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-store","X-Accel-Buffering":"no"});
    const controller=new AbortController(); reply.raw.once("close",()=>controller.abort());
    try {
      for await(const chunk of studySpeechProvider.synthesize(text,aiSignal(request,controller.signal))) {
        if(reply.raw.destroyed || reply.raw.writableEnded) break;
        if(reply.raw.writableLength>512*1024) {controller.abort(); break;}
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch { if(!reply.raw.destroyed) reply.raw.write(`data: ${JSON.stringify({error:"语音暂时不可用，请阅读字幕。"})}\n\n`); }
    finally {reply.raw.end();}
  });

  app.get<{ Params: { id: string } }>("/api/courses/:id", async (request, reply) => {
    const course = store.getCourse(request.params.id);
    if (!course) {
      return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
    }
    return course;
  });

  app.post("/api/study-sessions", async (request, reply) => {
    const actor = await resolveStudyActor(request);
    const input = createStudySessionInputSchema.parse(request.body);
    if (!store.getCourse(input.courseId)) {
      return reply.status(404).send({
        error: "COURSE_NOT_FOUND",
        message: "未找到这门课程"
      });
    }
    if (input.courseId !== PORT_MANAGEMENT_STUDY_COURSE_ID) {
      return reply.status(409).send({
        error: "STUDY_DECK_NOT_READY",
        message: "这门课程尚未发布课下学习课件"
      });
    }
    const session = await store.createOrResumeStudySession(
      input.courseId,
      actor
    );
    if (!session) throw new Error("课下学习会话创建失败");
    return reply.status(201).send(session);
  });

  app.get<{ Params: { id: string } }>(
    "/api/study-sessions/:id",
    async (request, reply) => {
      const actor = await resolveStudyActor(request);
      const session = store.getStudySession(request.params.id, actor);
      if (!session) {
        return reply.status(404).send({
          error: "STUDY_SESSION_NOT_FOUND",
          message: "未找到这次课下学习记录"
        });
      }
      return reply.send(session);
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/api/study-sessions/:id/progress",
    async (request, reply) => {
      const actor = await resolveStudyActor(request);
      const input = updateStudyProgressInputSchema.parse(request.body);
      const session = await store.updateStudyProgress(
        request.params.id,
        actor,
        input
      );
      if (!session) {
        return reply.status(400).send({
          error: "STUDY_PROGRESS_INVALID",
          message: "学习页不存在或页码已经失效"
        });
      }
      return reply.send(session);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/study-sessions/:id/asr",
    async (request, reply) => {
      const actor = await resolveStudyActor(request);
      const session = store.getStudySession(request.params.id, actor);
      if (!session) {
        return reply.status(404).send({
          error: "STUDY_SESSION_NOT_FOUND",
          message: "未找到这次课下学习记录"
        });
      }
      const input = studyAsrInputSchema.parse(request.body);
      const assistantContext = getPortManagementAssistantContext(
        session.globalIndex
      );
      try {
        const text = await studySpeechProvider.transcribe({
          audioBase64: input.audioBase64,
          mimeType: input.mimeType,
          signal: aiSignal(request),
          context: [
            "请准确识别学生关于港口管理课程的提问。",
            `课程：${session.courseTitle}`,
            `本讲：${assistantContext.lessonTitle}`,
            `本页：${assistantContext.slideTitle}`,
            "常见术语：比较优势、机会成本、港口、腹地、集疏运、班轮、航线、咽喉点、TEU、OOCL Spain、果园港、马六甲、苏伊士。"
          ].join("\n")
        });
        return reply.send({
          text,
          provider: studySpeechProvider.name,
          durationMs: input.durationMs
        });
      } catch (error) {
        if (error instanceof StudySpeechProviderError) {
          return reply.status(503).send({
            error: "STUDY_ASR_UNAVAILABLE",
            message: error.message
          });
        }
        throw error;
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/study-sessions/:id/assistant/turns",
    async (request, reply) => {
      const actor = await resolveStudyActor(request);
      const session = store.getStudySession(request.params.id, actor);
      if (!session) {
        return reply.status(404).send({
          error: "STUDY_SESSION_NOT_FOUND",
          message: "未找到这次课下学习记录"
        });
      }
      const input = assistantTurnInputSchema.parse(request.body);
      const turnId = `study-turn-${randomUUID()}`;
      const startedAt = new Date().toISOString();

      activeStudyAssistantTurns.get(request.params.id)?.abort(
        "replaced-by-new-turn"
      );
      const controller = new AbortController();
      activeStudyAssistantTurns.set(request.params.id, controller);

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      reply.raw.flushHeaders();

      const writeEvent = (event: StudyAssistantTurnEvent) => {
        if (reply.raw.destroyed || reply.raw.writableEnded) return;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };
      const abortOnDisconnect = () => {
        if (!reply.raw.writableEnded) {
          controller.abort("client-disconnected");
        }
      };
      reply.raw.once("close", abortOnDisconnect);
      writeEvent({ type: "turn.started", turnId, startedAt });

      const stream = studyAssistantOrchestrator.startTurn(
        session,
        input,
        aiSignal(request, controller.signal)
      );
      void stream.result.catch(() => undefined);
      let speechBuffer = "";
      let speechSequence = 0;
      let speechEnabled = studySpeechProvider.ttsConfigured;
      let speechStatus: "streamed" | "unavailable" | "disabled" =
        speechEnabled ? "unavailable" : "disabled";

      const synthesizeSegment = async (text: string) => {
        if (!speechEnabled || !text.trim()) return;
        try {
          for await (const chunk of studySpeechProvider.synthesize(
            text,
            aiSignal(request, controller.signal)
          )) {
            speechStatus = "streamed";
            writeEvent({
              type: "speech.chunk",
              turnId,
              sequence: speechSequence,
              audioBase64: chunk.audioBase64,
              sampleRate: chunk.sampleRate,
              channels: chunk.channels,
              format: chunk.format
            });
            speechSequence += 1;
          }
        } catch (error) {
          if (controller.signal.aborted) throw error;
          speechEnabled = false;
          speechStatus = "unavailable";
          app.log.warn(
            { error, studySessionId: session.id },
            "study TTS degraded to subtitles"
          );
        }
      };

      try {
        for await (const chunk of stream.deltas) {
          if (controller.signal.aborted) break;
          writeEvent({
            type: "dialogue.delta",
            turnId,
            delta: chunk.delta,
            accumulated: chunk.accumulated
          });
          speechBuffer += chunk.delta;
          const extracted = extractCompleteSpeechSegments(speechBuffer);
          speechBuffer = extracted.remainder;
          for (const segment of extracted.segments) {
            await synthesizeSegment(segment);
          }
        }

        if (controller.signal.aborted) {
          throw new DOMException("课下学习助手回答已中断", "AbortError");
        }

        const envelope = await stream.result;
        await synthesizeSegment(speechBuffer);

        let navigation = null;
        for (const action of envelope.actions) {
          const result = await store.applyStudyAssistantAction(
            session.id,
            actor,
            action
          );
          if (!result) {
            throw new Error("学习导航执行时会话不存在");
          }
          navigation = result;
          writeEvent({
            type: "navigation.command",
            turnId,
            result
          });
        }

        writeEvent({
          type: "turn.completed",
          turnId,
          dialogue: envelope.dialogue,
          completedAt: new Date().toISOString(),
          speechStatus,
          navigation
        });
      } catch (error) {
        const aborted =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError");
        const code = aborted
          ? "TURN_ABORTED"
          : error instanceof AssistantProviderError
            ? error.code
            : error instanceof StreamingJsonDialogueError
              ? "PROVIDER_RESPONSE_INVALID"
              : "INTERNAL_ERROR";
        writeEvent({
          type: "turn.failed",
          turnId,
          code,
          message: aborted
            ? "课下学习助手回答已中断"
            : error instanceof Error
              ? error.message
              : "课下学习助手处理失败",
          recoverable: true
        });
      } finally {
        reply.raw.off("close", abortOnDisconnect);
        if (
          activeStudyAssistantTurns.get(request.params.id) === controller
        ) {
          activeStudyAssistantTurns.delete(request.params.id);
        }
        if (!reply.raw.writableEnded) reply.raw.end();
      }
    }
  );

  app.get<{ Params: { id: string } }>("/api/class-sessions/:id", async (request, reply) => {
    const session = store.getSession(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: "SESSION_NOT_FOUND", message: "未找到这次课堂" });
    }
    return session;
  });

  app.get<{ Params: { id: string } }>(
    "/api/class-sessions/:id/snapshot",
    async (request, reply) => {
      const snapshot = store.getClassroomSnapshot(request.params.id);
      if (!snapshot) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂或对应课程"
        });
      }
      const actor=await resolveActor(request);
      return actor?.roles.includes("student") && !actor.roles.includes("teacher")
        ? {...snapshot,avatar:{...snapshot.avatar,currentTask:null,lastMessage:null}} : snapshot;
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/class-sessions/:id/snapshot/stream",
    async (request, reply) => {
      const snapshot = store.getClassroomSnapshot(request.params.id);
      if (!snapshot) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂或对应课程"
        });
      }

      const actor=await resolveActor(request);
      const studentView=actor?.roles.includes("student") && !actor.roles.includes("teacher");
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      const writeSnapshot = (nextSnapshot: typeof snapshot) => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(
            `event: snapshot\ndata: ${JSON.stringify(studentView?{...nextSnapshot,avatar:{...nextSnapshot.avatar,currentTask:null,lastMessage:null}}:nextSnapshot)}\n\n`
          );
        }
      };
      writeSnapshot(snapshot);
      const unsubscribe = store.subscribeClassroomSnapshot(
        request.params.id,
        writeSnapshot
      );
      const keepAlive = setInterval(() => {
        if (!reply.raw.writableEnded) reply.raw.write(": keep-alive\n\n");
      }, 15_000);
      const close = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
      reply.raw.once("close", close);
      reply.raw.once("error", close);
      return reply;
    }
  );

  app.post("/api/courses", async (request, reply) => {
    const input = createCourseInputSchema.parse(request.body);
    const course = await store.createCourse(input);
    return reply.status(201).send(course);
  });

  app.post<{ Params: { id: string } }>(
    "/api/courses/:id/class-sessions",
    async (request, reply) => {
      const course = store.getCourse(request.params.id);
      if (!course) {
        return reply.status(404).send({
          error: "COURSE_NOT_FOUND",
          message: "未找到这门课程"
        });
      }
      if (!isCourseDeckReady(course.id)) {
        return reply.status(409).send({
          error: "COURSE_DECK_NOT_READY",
          message: "这门课程尚未发布课堂课件"
        });
      }
      const session = await store.startClass(request.params.id);
      if (!session) {
        return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
      }
      return reply.status(201).send(session);
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/api/class-sessions/:id/simulation/configuration",
    async (request, reply) => {
      await requireActor(request, "teacher");
      const input = portSimulationTeamConfigurationInputSchema.parse(request.body);
      const result = await store.configurePortSimulationTeams(
        request.params.id,
        input
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/presence/heartbeat",
    async (request, reply) => {
      const input = classroomPresenceHeartbeatInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const presence = store.heartbeatClassroomPresence(
        request.params.id,
        actor.actorId
      );
      if (!presence) {
        return reply.status(404).send({
          error: "LIVE_SESSION_NOT_FOUND",
          message: "未找到正在进行的课堂"
        });
      }
      participation.touch(request.params.id, actor.actorId);
      return presence;
    }
  );

  app.delete<{ Params: { id: string; participantId: string } }>(
    "/api/class-sessions/:id/presence/:participantId",
    async (request, reply) => {
      const actor = await requireActor(
        request,
        "student",
        request.params.participantId
      );
      store.leaveClassroomPresence(
        request.params.id,
        actor.actorId
      );
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/presence/leave",
    async (request, reply) => {
      const input = classroomPresenceHeartbeatInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      store.leaveClassroomPresence(
        request.params.id,
        actor.actorId
      );
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/events",
    async (request, reply) => {
      await requireActor(request, "teacher");
      const input = classroomEventInputSchema.parse(request.body);
      const snapshot = await store.applyClassroomEvent(request.params.id, input);
      if (!snapshot) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      return reply.status(201).send(snapshot);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/simulation/setup",
    async (request, reply) => {
      await requireActor(request, "teacher");
      const input = portSimulationSetupInputSchema.parse(request.body);
      const result = await store.setupPortSimulation(request.params.id, input);
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.status(201).send(result.value);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/simulation/control",
    async (request, reply) => {
      await requireActor(request, "teacher");
      const input = portSimulationControlInputSchema.parse(request.body);
      const result = await store.controlPortSimulation(request.params.id, input);
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/class-sessions/:id/simulation/preflight",
    async (request, reply) => {
      await requireActor(request, "teacher");
      const simulationChecks = store.getPortSimulationPreflightChecks(
        request.params.id
      );
      if (!simulationChecks) {
        return reply.status(404).send({
          error: "SIMULATION_NOT_FOUND",
          message: "请先建立本次课堂的港口仿真小组"
        });
      }
      const checks = [
        {
          id: "identity_provider",
          status:
            identityProvider.source === "development"
              ? "warning" as const
              : "pass" as const,
          label: "身份适配器",
          message:
            identityProvider.source === "development"
              ? "当前使用开发身份适配器；生产部署必须禁用自选角色入口。"
              : "教学信息系统身份适配器可用。"
        },
        {
          id: "event_sse",
          status: "pass" as const,
          label: "SSE 事件流",
          message: "同源事件流已启用，支持 Last-Event-ID 和序号补取。"
        },
        {
          id: "server_clock",
          status: "pass" as const,
          label: "服务器时间",
          message: `服务器时间 ${new Date().toISOString()}`
        },
        {
          id: "persistence",
          status: "pass" as const,
          label: "持久化",
          message: "权威事件、幂等回执和检查点使用 SQLite WAL。"
        },
        ...simulationChecks
      ];
      return {
        sessionId: request.params.id,
        checkedAt: new Date().toISOString(),
        identitySource: identityProvider.source,
        rosterVersion: null,
        serverTime: new Date().toISOString(),
        persistence: "sqlite_wal" as const,
        sseAvailable: true,
        ready: checks.every((check) => check.status !== "blocked"),
        checks
      };
    }
  );

  app.post<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/join",
    async (request, reply) => {
      const input = portSimulationTeamJoinInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.joinPortSimulationTeam(
        request.params.id,
        request.params.teamId,
        actor.actorId,
        actor.displayName
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.status(201).send(result.value);
    }
  );

  app.get<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/snapshot",
    async (request, reply) => {
      await requireTeamViewer(
        request,
        request.params.id,
        request.params.teamId
      );
      const snapshot = store.getPortSimulationTeamSnapshot(
        request.params.id,
        request.params.teamId
      );
      if (!snapshot) {
        return reply.status(404).send({
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        });
      }
      return snapshot;
    }
  );

  app.get<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/snapshot/stream",
    async (request, reply) => {
      await requireTeamViewer(
        request,
        request.params.id,
        request.params.teamId
      );
      const snapshot = store.getPortSimulationTeamSnapshot(
        request.params.id,
        request.params.teamId
      );
      if (!snapshot) {
        return reply.status(404).send({
          error: "SIMULATION_TEAM_NOT_FOUND",
          message: "没有找到该仿真小组"
        });
      }
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      const writeSnapshot = (nextSnapshot: typeof snapshot) => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(
            `id: ${nextSnapshot.revision}-${nextSnapshot.collaborationRevision}\nevent: simulation-snapshot\ndata: ${JSON.stringify(nextSnapshot)}\n\n`
          );
        }
      };
      writeSnapshot(snapshot);
      const unsubscribe = store.subscribePortSimulationTeamSnapshot(
        request.params.id,
        request.params.teamId,
        writeSnapshot
      );
      const keepAlive = setInterval(() => {
        if (!reply.raw.writableEnded) reply.raw.write(": keep-alive\n\n");
      }, 15_000);
      const close = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
      reply.raw.once("close", close);
      reply.raw.once("error", close);
      return reply;
    }
  );

  app.get<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/checkpoint",
    async (request, reply) => {
      await requireTeamViewer(request, request.params.id, request.params.teamId);
      const checkpoint = store.getPortSimulationCheckpoint(
        request.params.id,
        request.params.teamId
      );
      if (!checkpoint) {
        return reply.status(409).send({
          error: "EVENT_STREAM_NOT_AVAILABLE",
          message: "该旧版运行继续使用兼容快照模式"
        });
      }
      return checkpoint;
    }
  );

  app.get<{
    Params: { id: string; teamId: string };
    Querystring: { afterSequence?: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/events",
    async (request, reply) => {
      await requireTeamViewer(request, request.params.id, request.params.teamId);
      const afterSequence = Math.max(
        0,
        Number.parseInt(request.query.afterSequence ?? "0", 10) || 0
      );
      const batch = store.getPortSimulationEventsAfter(
        request.params.id,
        request.params.teamId,
        afterSequence
      );
      if (!batch) {
        return reply.status(409).send({
          error: "EVENT_STREAM_NOT_AVAILABLE",
          message: "该旧版运行继续使用兼容快照模式"
        });
      }
      return batch;
    }
  );

  app.get<{
    Params: { id: string; teamId: string };
    Querystring: { afterSequence?: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/events/stream",
    async (request, reply) => {
      await requireTeamViewer(request, request.params.id, request.params.teamId);
      const lastEventIdHeader = request.headers["last-event-id"];
      const lastEventId = Array.isArray(lastEventIdHeader)
        ? lastEventIdHeader[0]
        : lastEventIdHeader;
      const afterSequence = Math.max(
        0,
        Number.parseInt(
          lastEventId ?? request.query.afterSequence ?? "0",
          10
        ) || 0
      );
      const batch = store.getPortSimulationEventsAfter(
        request.params.id,
        request.params.teamId,
        afterSequence
      );
      if (!batch) {
        return reply.status(409).send({
          error: "EVENT_STREAM_NOT_AVAILABLE",
          message: "该旧版运行继续使用兼容快照模式"
        });
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      const writeMessage = (message: Parameters<
        typeof store.subscribePortSimulationEvents
      >[2] extends (message: infer T) => void ? T : never) => {
        if (reply.raw.writableEnded) return;
        const id = message.type === "event" ? `id: ${message.event.sequence}\n` : "";
        reply.raw.write(
          `${id}event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`
        );
      };
      if (batch.resyncRequired) {
        writeMessage({
          type: "resync_required",
          runId: batch.runId,
          latestSequence: batch.latestSequence,
          message: "所需事件已压缩，请重新读取检查点。"
        });
      } else {
        for (const event of batch.events) {
          writeMessage({ type: "event", event });
        }
      }
      const presence = store.getPortSimulationPresence(
        request.params.id,
        request.params.teamId
      );
      if (presence) writeMessage({ type: "presence", presence });
      const unsubscribe = store.subscribePortSimulationEvents(
        request.params.id,
        request.params.teamId,
        writeMessage
      );
      const keepAlive = setInterval(() => {
        if (!reply.raw.writableEnded) reply.raw.write(": keep-alive\n\n");
      }, 15_000);
      const close = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
      reply.raw.once("close", close);
      reply.raw.once("error", close);
      return reply;
    }
  );

  app.post<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/resync",
    async (request, reply) => {
      await requireActor(request, "teacher");
      if (!store.forcePortSimulationResync(request.params.id, request.params.teamId)) {
        return reply.status(404).send({
          error: "EVENT_STREAM_TEAM_NOT_FOUND",
          message: "没有找到可重同步的事件流小组"
        });
      }
      return reply.status(202).send({ status: "resync_requested" });
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/roles/:role/claim",
    async (request, reply) => {
      const role = portSimulationRoleSchema.parse(request.params.role);
      const input = portSimulationRoleClaimInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.claimPortSimulationRole(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        actor.displayName
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.status(201).send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/roles/:role/renew",
    async (request, reply) => {
      const role = portSimulationRoleSchema.parse(request.params.role);
      const input = portSimulationRoleLeaseRenewInputSchema.parse(request.body);
      const actor = await requireActor(request, "student");
      const result = store.renewPortSimulationRoleLease(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        input.roleSeatToken
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/roles/:role/release",
    async (request, reply) => {
      const role = portSimulationRoleSchema.parse(request.params.role);
      const input = portSimulationRoleReleaseInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.releasePortSimulationRole(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        input.roleSeatToken
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/roles/:role/teacher-release",
    async (request, reply) => {
      const role = portSimulationRoleSchema.parse(request.params.role);
      await requireActor(request, "teacher");
      const result = await store.releasePortSimulationRole(
        request.params.id,
        request.params.teamId,
        role,
        "teacher",
        "teacher",
        true
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/support-roles/:role/claim",
    async (request, reply) => {
      const role = portSimulationSupportRoleSchema.parse(request.params.role);
      const input = portSimulationSupportSeatClaimInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.claimPortSimulationSupportSeat(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        actor.displayName
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.status(201).send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/support-roles/:role/renew",
    async (request, reply) => {
      const role = portSimulationSupportRoleSchema.parse(request.params.role);
      const input = portSimulationSupportLeaseRenewInputSchema.parse(request.body);
      const actor = await requireActor(request, "student");
      const result = store.renewPortSimulationSupportLease(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        input.supportSeatToken
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/support-roles/:role/release",
    async (request, reply) => {
      const role = portSimulationSupportRoleSchema.parse(request.params.role);
      const input = portSimulationSupportSeatReleaseInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.releasePortSimulationSupportSeat(
        request.params.id,
        request.params.teamId,
        role,
        actor.actorId,
        input.supportSeatToken
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; role: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/support-roles/:role/teacher-release",
    async (request, reply) => {
      const role = portSimulationSupportRoleSchema.parse(request.params.role);
      await requireActor(request, "teacher");
      const result = await store.releasePortSimulationSupportSeat(
        request.params.id,
        request.params.teamId,
        role,
        "teacher",
        "teacher",
        true
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/collaboration-items",
    async (request, reply) => {
      const input = portSimulationCollaborationCreateInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.createPortSimulationCollaborationItem(
        request.params.id,
        request.params.teamId,
        { ...input, participantId: actor.actorId }
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.status(201).send(result.value);
    }
  );

  app.post<{
    Params: { id: string; teamId: string; itemId: string };
  }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/collaboration-items/:itemId/respond",
    async (request, reply) => {
      const input = portSimulationCollaborationResponseInputSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.respondToPortSimulationCollaborationItem(
        request.params.id,
        request.params.teamId,
        request.params.itemId,
        { ...input, participantId: actor.actorId }
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/commands",
    async (request, reply) => {
      if (
        typeof request.body === "object" &&
        request.body !== null &&
        "runId" in request.body
      ) {
        const input = portSimulationCommandEnvelopeV2Schema.parse(request.body);
        const actor = await requireActor(request, "student");
        const result = await store.applyPortSimulationCommandV2(
          request.params.id,
          request.params.teamId,
          input,
          actor
        );
        if (!result.ok) {
          return reply.status(result.status).send({
            error: result.error,
            message: result.message
          });
        }
        return reply.send(result.value);
      }
      const input = portSimulationCommandEnvelopeSchema.parse(request.body);
      const actor = await requireActor(
        request,
        "student",
        input.participantId
      );
      const result = await store.applyPortSimulationCommand(
        request.params.id,
        request.params.teamId,
        { ...input, participantId: actor.actorId }
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{ Params: { id: string; teamId: string } }>(
    "/api/class-sessions/:id/simulation/teams/:teamId/teacher-commands",
    async (request, reply) => {
      const actor = await requireActor(request, "teacher");
      if (
        typeof request.body === "object" &&
        request.body !== null &&
        "runId" in request.body
      ) {
        const input = portSimulationTeacherCommandInputV2Schema.parse(request.body);
        const result = await store.applyPortSimulationTeacherCommandV2(
          request.params.id,
          request.params.teamId,
          input,
          actor
        );
        if (!result.ok) {
          return reply.status(result.status).send({
            error: result.error,
            message: result.message
          });
        }
        return reply.send(result.value);
      }
      const input = portSimulationTeacherCommandInputSchema.parse(request.body);
      const result = await store.applyPortSimulationTeacherCommand(
        request.params.id,
        request.params.teamId,
        input
      );
      if (!result.ok) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message
        });
      }
      return reply.send(result.value);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/avatar/commands",
    async (request, reply) => {
      const input = teacherAvatarCommandInputSchema.parse(request.body);
      const command = await store.submitAvatarCommand(request.params.id, input);
      if (!command) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      return reply.status(202).send(command);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/assistant/turns",
    async (request, reply) => {
      const snapshot = store.getClassroomSnapshot(request.params.id);
      if (!snapshot) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      if (snapshot.session.status !== "live") {
        return reply.status(409).send({
          error: "SESSION_NOT_LIVE",
          message: "课堂助手只能在正在进行的课堂中回答"
        });
      }
      const input = assistantTurnInputSchema.parse(request.body);
      const turnId = `assistant-turn-${randomUUID()}`;
      const startedAt = new Date().toISOString();
      const startedAtMs = Date.now();

      activeAssistantTurns.get(request.params.id)?.abort(
        "replaced-by-new-turn"
      );
      const controller = new AbortController();
      activeAssistantTurns.set(request.params.id, controller);

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      reply.raw.flushHeaders();

      const writeEvent = (event: AssistantTurnEvent) => {
        if (reply.raw.destroyed || reply.raw.writableEnded) return;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };
      const abortOnDisconnect = () => {
        if (!reply.raw.writableEnded) {
          controller.abort("client-disconnected");
        }
      };
      reply.raw.once("close", abortOnDisconnect);

      writeEvent({
        type: "turn.started",
        turnId,
        startedAt
      });
      await store.updateAvatarRuntime(request.params.id, {
        status: "thinking",
        currentTask: input.text,
        lastMessage:
          input.source === "voice_asr"
            ? `ASR 识别：${input.text}`
            : `教师输入：${input.text}`
      });

      const stream = assistantOrchestrator.startTurn(
        snapshot,
        input,
        aiSignal(request, controller.signal)
      );
      // Attach a rejection handler immediately; the generator and result
      // promise fail together when the provider or JSON parser rejects.
      void stream.result.catch(() => undefined);
      let firstDialogueDelta = true;

      try {
        for await (const chunk of stream.deltas) {
          if (controller.signal.aborted) break;
          if (firstDialogueDelta) {
            firstDialogueDelta = false;
            await store.updateAvatarRuntime(request.params.id, {
              status: "speaking",
              gpuStatus: campusMode ? "idle" : "ready",
              latencyMs: Date.now() - startedAtMs,
              lastMessage: "课堂助手已开始流式回答。"
            });
          }
          writeEvent({
            type: "dialogue.delta",
            turnId,
            delta: chunk.delta,
            accumulated: chunk.accumulated
          });
        }

        if (controller.signal.aborted) {
          throw new DOMException("课堂助手回答已中断", "AbortError");
        }

        const envelope = await stream.result;
        let control = null;
        if (envelope.actions.length > 0) {
          control = await store.executeAvatarControl(request.params.id, {
            protocol: "edu.classroom.control",
            version: "1.0",
            requestId: turnId,
            reason: (envelope.dialogue || input.text).slice(0, 200),
            actions: envelope.actions
          });
          if (!control) {
            throw new Error("课堂控制执行时会话不存在");
          }
          writeEvent({
            type: "control.result",
            turnId,
            result: control
          });
        }

        await store.updateAvatarRuntime(request.params.id, {
          status: "ready",
          gpuStatus: campusMode ? "idle" : "ready",
          currentTask: null,
          lastMessage: envelope.dialogue || control?.results.map(item => item.message).join("；") || "课堂操作已完成。"
        });
        writeEvent({
          type: "turn.completed",
          turnId,
          dialogue: envelope.dialogue,
          completedAt: new Date().toISOString(),
          control
        });
      } catch (error) {
        const aborted =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError");
        const code = aborted
          ? "TURN_ABORTED"
          : error instanceof AssistantProviderError
            ? error.code
            : error instanceof StreamingJsonDialogueError
              ? "PROVIDER_RESPONSE_INVALID"
              : "INTERNAL_ERROR";
        const message = aborted
          ? "课堂助手回答已中断"
          : error instanceof Error
            ? error.message
            : "课堂助手处理失败";
        await store.updateAvatarRuntime(request.params.id, {
          status: aborted ? "ready" : "error",
          currentTask: null,
          lastMessage: message
        });
        writeEvent({
          type: "turn.failed",
          turnId,
          code,
          message,
          recoverable: true
        });
      } finally {
        reply.raw.off("close", abortOnDisconnect);
        if (
          activeAssistantTurns.get(request.params.id) === controller
        ) {
          activeAssistantTurns.delete(request.params.id);
        }
        if (!reply.raw.writableEnded) reply.raw.end();
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/class-sessions/:id/avatar/control/capabilities",
    async (request, reply) => {
      const snapshot = store.getClassroomSnapshot(request.params.id);
      if (!snapshot) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      const deck = getCourseDeckByCourseId(snapshot.courseId);
      if (!deck) {
        return reply.status(409).send({
          error: "COURSE_DECK_NOT_READY",
          message: "这门课程尚未发布课堂课件"
        });
      }
      const isPortManagement =
        snapshot.courseId === "course-port-management-intro";
      const readyLessonMap = isPortManagement
        ? getPortManagementReadyLessons()
            .map(
              (lesson) =>
                `${lesson.number}:${lesson.title ?? "待建设"}@${lesson.slideStart ?? "-"}`
            )
            .join("；")
        : deck.lessons
            .filter((lesson) => lesson.status === "ready")
            .map(
              (lesson) =>
                `${lesson.number}:${lesson.title}@${lesson.slideStart}`
            )
            .join("；");
      const allowedActions: AvatarControlCapability[] = [
        {
          type: "slides.next",
          description: "切换到 Slides 并前往下一页",
          parameters: {}
        },
        {
          type: "slides.previous",
          description: "切换到 Slides 并返回上一页",
          parameters: {}
        },
        {
          type: "slides.go_to",
          description: "切换到 Slides 并跳转到指定页",
          parameters: {
            slide: `1 到 ${snapshot.slide.total} 的整数`
          }
        },
        {
          type: "lesson.go_to",
          description: "切换到 Slides 并跳转到指定已建设课次的封面",
          parameters: {
            lesson: `1 到 ${deck.lessons.length} 的整数`,
            readyLessons: readyLessonMap
          }
        }
      ];
      if (deck.allowedActivities.length > 1) {
        allowedActions.push({
          type: "activity.switch",
          description: "切换课堂主舞台活动",
          parameters: {
            activity: deck.allowedActivities.join(" | ")
          }
        });
      }
      if (isPortManagement) {
        const globeCueMap = PORT_MANAGEMENT_GLOBE_CUES.map(
          (cue) =>
            `${cue.id}:${cue.title}@${cue.startSlideKey}->${cue.returnSlideKey}`
        ).join("；");
        allowedActions.push(
          {
            type: "globe.play_cue",
            description: "从注册的起始问题页播放电影化地球仪证据追踪",
            parameters: { cueId: globeCueMap }
          },
          {
            type: "globe.pause",
            description: "暂停当前地球仪开场",
            parameters: {}
          },
          {
            type: "globe.resume",
            description: "继续当前地球仪开场",
            parameters: {}
          },
          {
            type: "globe.restart",
            description: "从第一幕重新播放当前地球仪开场",
            parameters: {}
          }
        );
      }
      return {
        protocol: "edu.classroom.control",
        version: "1.0",
        sessionId: snapshot.session.id,
        executeUrl: `/api/class-sessions/${snapshot.session.id}/avatar/control`,
        maxActionsPerRequest: 8,
        allowedActions,
        currentState: {
          sessionStatus: snapshot.session.status,
          activeActivity: snapshot.activeActivity,
          slideIndex: snapshot.slide.index,
          slideTotal: snapshot.slide.total
        }
      };
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/avatar/control",
    async (request, reply) => {
      const session = store.getSession(request.params.id);
      if (!session) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      if (session.status !== "live") {
        return reply.status(409).send({
          error: "SESSION_NOT_LIVE",
          message: "数字人只能操控正在进行的课堂"
        });
      }
      const input = avatarControlRequestSchema.parse(request.body);
      const result = await store.executeAvatarControl(
        request.params.id,
        input
      );
      if (!result) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      return reply.send(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/end",
    async (request, reply) => {
      await requireActor(request, "teacher");
      activeAssistantTurns.get(request.params.id)?.abort("classroom-ended");
      const session = await store.endClass(request.params.id);
      if (!session) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      participation.end(request.params.id);
      return reply.send(session);
    }
  );

  app.post("/api/avatar/presentations", async (request, reply) => {
    const input = avatarPresentationInputSchema.parse(request.body);
    if (!store.getCourse(input.courseId)) {
      return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
    }
    if (
      input.courseId === "course-economic-mathematics" &&
      input.scene === "selfstudy"
    ) {
      return reply.status(409).send({
        error: "COURSE_STUDY_NOT_AVAILABLE",
        message: "经济数学课下学习暂未开放"
      });
    }
    const isClassroom = input.scene === "classroom";
    return reply.status(201).send({
      id: `avatar-presentation-${randomUUID()}`,
      mode: isClassroom ? "classroom_realtime" : "selfstudy_prerecorded",
      requiresGpu: isClassroom && !campusMode,
      status: isClassroom && !campusMode ? "planned" : "ready",
      message: campusMode ? "数字人动作和口型在当前浏览器运行，语音与语言模型请求由校园服务器代理。" : isClassroom
        ? "已创建实时数字人课堂计划；进入课堂后可接入 OpenAvatarChat GPU 服务。"
        : "小麦老师课下助手已就绪；B版角色、十一段预录动作、字幕与文本问答不占用实时渲染 GPU。",
      characterId: isClassroom && !campusMode ? null : "lanzhou",
      characterVersion: isClassroom && !campusMode ? null : LANZHOU_CHARACTER_VERSION,
      manifestUrl: isClassroom && !campusMode ? null : LANZHOU_MANIFEST_URL
    });
  });

  if (options.staticRoot) {
    await app.register(fastifyStatic, {
      root: options.staticRoot, dotfiles:"deny", index:"index.html",
      setHeaders(response,path) {
        response.setHeader("X-Content-Type-Options","nosniff");
        response.setHeader("Cache-Control", /[.-][a-zA-Z0-9_-]{8,}\.(js|css|webp|mp4|png)$/.test(path) ? "public, max-age=31536000, immutable" : "no-cache");
      }
    });
    app.setNotFoundHandler((request,reply)=> {
      const path=request.url.split("?")[0]!;
      if(request.method!=="GET" || path.startsWith("/api/") || /\.[a-z0-9]+$/i.test(path)) return reply.code(404).send({error:"NOT_FOUND"});
      return reply.sendFile("index.html");
    });
  }
  return app;
}
