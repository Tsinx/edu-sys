import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import {
  assistantTurnInputSchema,
  avatarControlRequestSchema,
  avatarPresentationInputSchema,
  classroomEventInputSchema,
  classroomPresenceHeartbeatInputSchema,
  teacherAvatarCommandInputSchema,
  createCourseInputSchema,
  StreamingJsonDialogueError,
  type AssistantTurnEvent
} from "@edu/contracts";
import {
  getPortManagementReadyLessons,
  PORT_MANAGEMENT_GLOBE_CUES
} from "@edu/course-content";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { JsonStateStore } from "./store.js";
import { getLamRuntimeStatus } from "./avatar-runtime.js";
import { ClassroomAssistantOrchestrator } from "./assistant/orchestrator.js";
import {
  AssistantProviderError,
  OpenAiCompatibleAssistantProvider,
  type AssistantJsonStreamProvider
} from "./assistant/provider.js";

export interface BuildAppOptions {
  dataFile: string;
  logger?: boolean;
  openAvatarBaseUrl?: string;
  openAvatarPublicUrl?: string;
  presenceTtlMs?: number;
  assistantProvider?: AssistantJsonStreamProvider;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const store = new JsonStateStore(
    options.dataFile,
    options.presenceTtlMs
  );
  await store.initialize();
  const assistantOrchestrator = new ClassroomAssistantOrchestrator(
    options.assistantProvider ?? new OpenAiCompatibleAssistantProvider()
  );
  const activeAssistantTurns = new Map<string, AbortController>();

  await app.register(cors, { origin: true });

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

  app.get("/api/health", async () => ({
    status: "ok",
    service: "edu-platform-api",
    persistence: "json-development-adapter"
  }));

  app.get("/api/me", async () => store.getTeacher());
  app.get("/api/dashboard", async () => store.getDashboard());
  app.get("/api/courses", async () => store.listCourses());
  app.get("/api/class-sessions", async () => store.listSessions());

  app.get("/api/avatar/runtime/status", async () =>
    getLamRuntimeStatus(
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

  app.get<{ Params: { id: string } }>("/api/courses/:id", async (request, reply) => {
    const course = store.getCourse(request.params.id);
    if (!course) {
      return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
    }
    return course;
  });

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
      return snapshot;
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
            `event: snapshot\ndata: ${JSON.stringify(nextSnapshot)}\n\n`
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
      const session = await store.startClass(request.params.id);
      if (!session) {
        return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
      }
      return reply.status(201).send(session);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/presence/heartbeat",
    async (request, reply) => {
      const input = classroomPresenceHeartbeatInputSchema.parse(request.body);
      const presence = store.heartbeatClassroomPresence(
        request.params.id,
        input.participantId
      );
      if (!presence) {
        return reply.status(404).send({
          error: "LIVE_SESSION_NOT_FOUND",
          message: "未找到正在进行的课堂"
        });
      }
      return presence;
    }
  );

  app.delete<{ Params: { id: string; participantId: string } }>(
    "/api/class-sessions/:id/presence/:participantId",
    async (request, reply) => {
      store.leaveClassroomPresence(
        request.params.id,
        request.params.participantId
      );
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/presence/leave",
    async (request, reply) => {
      const input = classroomPresenceHeartbeatInputSchema.parse(request.body);
      store.leaveClassroomPresence(
        request.params.id,
        input.participantId
      );
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/class-sessions/:id/events",
    async (request, reply) => {
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
        controller.signal
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
              gpuStatus: "ready",
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
            reason: envelope.dialogue.slice(0, 200),
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
          gpuStatus: "ready",
          currentTask: null,
          lastMessage: envelope.dialogue
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
      const readyLessonMap = getPortManagementReadyLessons()
        .map(
          (lesson) =>
            `${lesson.number}:${lesson.title ?? "待建设"}@${lesson.slideStart ?? "-"}`
        )
        .join("；");
      const globeCueMap = PORT_MANAGEMENT_GLOBE_CUES.map(
        (cue) =>
          `${cue.id}:${cue.title}@${cue.startSlideKey}->${cue.returnSlideKey}`
      ).join("；");
      return {
        protocol: "edu.classroom.control",
        version: "1.0",
        sessionId: snapshot.session.id,
        executeUrl: `/api/class-sessions/${snapshot.session.id}/avatar/control`,
        maxActionsPerRequest: 8,
        allowedActions: [
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
              lesson: "1 到 16 的整数",
              readyLessons: readyLessonMap
            }
          },
          {
            type: "activity.switch",
            description: "切换课堂主舞台活动",
            parameters: {
              activity:
                "slides | globe | simulation | whiteboard | video | interaction"
            }
          },
          {
            type: "globe.play_cue",
            description: "从注册的起始问题页播放电影化地球仪证据追踪",
            parameters: {
              cueId: globeCueMap
            }
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
        ],
        currentState: {
          sessionStatus: snapshot.session.status,
          activeActivity: snapshot.activeActivity,
          slideIndex: snapshot.slide.index,
          slideTotal: snapshot.slide.total,
          globePlayback: snapshot.globePlayback
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
      const session = await store.endClass(request.params.id);
      if (!session) {
        return reply.status(404).send({
          error: "SESSION_NOT_FOUND",
          message: "未找到这次课堂"
        });
      }
      return reply.send(session);
    }
  );

  app.post("/api/avatar/presentations", async (request, reply) => {
    const input = avatarPresentationInputSchema.parse(request.body);
    if (!store.getCourse(input.courseId)) {
      return reply.status(404).send({ error: "COURSE_NOT_FOUND", message: "未找到这门课程" });
    }
    const isClassroom = input.scene === "classroom";
    return reply.status(201).send({
      id: `avatar-presentation-${randomUUID()}`,
      mode: isClassroom ? "classroom_realtime" : "selfstudy_prerecorded",
      requiresGpu: isClassroom,
      status: isClassroom ? "planned" : "ready",
      message: isClassroom
        ? "已创建实时数字人课堂计划；进入课堂后可接入 OpenAvatarChat GPU 服务。"
        : "课下轻量助手已就绪，将使用预录动作与表情，不占用实时 GPU。"
    });
  });

  return app;
}
