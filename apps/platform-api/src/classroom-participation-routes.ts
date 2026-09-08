import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ServerResponse } from "node:http";
import { classroomAnswerInputSchema, classroomJoinInputSchema, classroomParticipationActionSchema, classroomParticipationCreateSchema, type ClassroomActor } from "@edu/contracts";
import { ClassroomParticipation, participationError } from "./classroom-participation.js";
import { classroomExerciseSaveSchema, classroomExercisePublishSchema, classroomGroupsInputSchema } from "@edu/contracts";

export function registerParticipationRoutes(app: FastifyInstance, service: ClassroomParticipation,
  courseFor: (id: string) => string | undefined, resolveActor: (request: FastifyRequest) => Promise<ClassroomActor | null>, courseExists: (id: string) => boolean) {
  const streams = new Set<ServerResponse>();
  app.addHook("preClose", async () => { for (const response of streams) response.end(); });
  const actorFor = async (request: FastifyRequest, sessionId: string, role?: "teacher" | "student") => {
    const actor = await resolveActor(request);
    if (!actor) throw participationError(401, "请重新登录后加入课堂");
    if (role ? !actor.roles.includes(role) : !actor.roles.some(r => r === "teacher" || r === "student"))
      throw participationError(403, "当前身份不能执行此操作");
    if (role === "student" && actor.roles.includes("teacher")) throw participationError(403, "教师预览不能作为学生提交");
    if (!courseFor(sessionId)) throw participationError(404, "未找到这次课堂");
    return actor;
  };
  type Params = { id: string; activityId: string; exerciseId: string };
  const base = "/api/class-sessions/:id/participation";
  const authorizeCourse = async (request: FastifyRequest, courseId: string) => {
    const actor = await resolveActor(request);
    if (!actor) throw participationError(401, "请先登录教师身份");
    if (!actor.roles.includes("teacher")) throw participationError(403, "仅教师可以管理习题");
    if (!courseExists(courseId)) throw participationError(404, "未找到课程");
  };
  app.get<{ Params: { courseId: string } }>("/api/courses/:courseId/exercises", async request => {
    await authorizeCourse(request, request.params.courseId);
    return service.library.list(request.params.courseId, "");
  });
  app.post<{ Params: { courseId: string } }>("/api/courses/:courseId/exercises", async request => {
    await authorizeCourse(request, request.params.courseId);
    const input = classroomExerciseSaveSchema.parse(request.body);
    service.library.save(request.params.courseId, input.id, input.expectedVersion, input.exercise);
    return service.library.list(request.params.courseId, "");
  });
  app.get<{ Params: Params }>(`${base}/library`, async request => {
    await actorFor(request, request.params.id, "teacher");
    return service.library.list(courseFor(request.params.id)!, request.params.id);
  });
  app.post<{ Params: Params }>(`${base}/library`, async request => {
    await actorFor(request, request.params.id, "teacher");
    const input = classroomExerciseSaveSchema.parse(request.body);
    service.library.save(courseFor(request.params.id)!, input.id, input.expectedVersion, input.exercise);
    return service.library.list(courseFor(request.params.id)!, request.params.id);
  });
  app.post<{ Params: Params }>(`${base}/library/:exerciseId/publish`, async request => {
    const actor = await actorFor(request, request.params.id, "teacher");
    const input = classroomExercisePublishSchema.parse(request.body);
    const courseId = courseFor(request.params.id)!;
    const exercise = service.library.get(courseId, request.params.exerciseId);
    if (exercise.archived) throw participationError(409, "已归档的题目需先恢复，再发布");
    if (exercise.version !== input.expectedVersion) throw participationError(409, "题目已更新，请刷新题库并确认内容后发布");
    const id = service.start(request.params.id, { ...exercise.content, requestId: input.requestId });
    service.library.recordPublication(courseId, exercise.id, exercise.version, id);
    return service.view(request.params.id, actor);
  });
  app.post<{ Params: Params }>(`${base}/groups`, async request => {
    const actor = await actorFor(request, request.params.id, "teacher");
    service.configureGroups(request.params.id, classroomGroupsInputSchema.parse(request.body));
    return service.view(request.params.id, actor);
  });
  app.get<{ Params: Params }>(base, async request => {
    const actor = await actorFor(request, request.params.id);
    service.touch(request.params.id, actor.actorId);
    return service.view(request.params.id, actor);
  });
  app.post<{ Params: Params }>(`${base}/join`, async request => {
    const actor = await actorFor(request, request.params.id, "student");
    service.join(request.params.id, actor, classroomJoinInputSchema.parse(request.body).displayName);
    return service.view(request.params.id, actor);
  });
  app.post<{ Params: Params }>(`${base}/activities`, async request => {
    const actor = await actorFor(request, request.params.id, "teacher");
    service.start(request.params.id, classroomParticipationCreateSchema.parse(request.body));
    return service.view(request.params.id, actor);
  });
  app.post<{ Params: Params }>(`${base}/activities/:activityId/answer`, async request => {
    const actor = await actorFor(request, request.params.id, "student");
    service.answer(request.params.id, request.params.activityId, actor, classroomAnswerInputSchema.parse(request.body).optionIds);
    return service.view(request.params.id, actor);
  });
  app.post<{ Params: Params }>(`${base}/activities/:activityId/action`, async request => {
    const actor = await actorFor(request, request.params.id, "teacher");
    service.action(request.params.id, request.params.activityId, classroomParticipationActionSchema.parse(request.body).action);
    return service.view(request.params.id, actor);
  });
  app.get<{ Params: Params }>(`${base}/stream`, async (request, reply) => {
    const actor = await actorFor(request, request.params.id);
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    streams.add(response);
    const send = () => {
      if (response.destroyed || response.writableEnded) return;
      if (response.writableLength > 256 * 1024) { response.end(); return; }
      response.write(`event: participation\ndata: ${JSON.stringify(service.view(request.params.id, actor))}\n\n`);
    };
    const unsubscribe = service.subscribe(request.params.id, send);
    const timer = setInterval(() => {
      void resolveActor(request).then(current => {
        if (response.destroyed || response.writableEnded) return;
        if (!current || current.actorId !== actor.actorId || current.roles.join() !== actor.roles.join()) response.end();
        else { service.touch(request.params.id, actor.actorId); response.write(": keepalive\n\n"); }
      }).catch(() => response.end());
    }, 15_000);
    timer.unref();
    response.on("close", () => { clearInterval(timer); unsubscribe(); streams.delete(response); });
    service.touch(request.params.id, actor.actorId);
    send();
  });
}
