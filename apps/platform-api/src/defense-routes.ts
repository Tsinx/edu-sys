import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ClassroomActor, Course } from "@edu/contracts";
import { defenseAnswerSchema, defenseAssignmentInputSchema, defenseReviewSchema, defenseSubmissionSchema } from "@edu/contracts";
import { DefenseRepository, generateDefenseTurn, publicAssignment, publicSession } from "./defense.js";
import { campusError } from "./campus/database.js";
import type { AssistantJsonStreamProvider } from "./assistant/provider.js";
import type { AiAdmission } from "./campus/ai-admission.js";

export function registerDefense(app: FastifyInstance, options: {
  dataFile: string;
  resolve: (r: FastifyRequest) => Promise<ClassroomActor | null>;
  allowed: (a: ClassroomActor) => string[] | null;
  course: (id: string) => Course | undefined;
  provider: AssistantJsonStreamProvider;
  admission?: AiAdmission;
}) {
  const repository = new DefenseRepository(`${options.dataFile}.defense.sqlite`);
  const active = new Map<string, { controller: AbortController; promise: Promise<unknown> }>();
  const stop = async () => { for (const job of active.values()) job.controller.abort(); await Promise.allSettled([...active.values()].map(job => job.promise)); };
  app.addHook("preClose", stop);
  app.addHook("onClose", () => repository.close());
  const actor = async (r: FastifyRequest) => {
    const value = await options.resolve(r);
    if (!value) throw campusError(401, "IDENTITY_SESSION_REQUIRED", "请先登录后进入答辩。");
    return value;
  };
  const courseAccess = (a: ClassroomActor, id: string) => {
    const c = options.course(id), allowed = options.allowed(a);
    if (!c || allowed && !allowed.includes(id) || a.roles.includes("teacher") && c.teacherId !== a.actorId) throw campusError(403, "COURSE_ACCESS_FORBIDDEN", "仅任课教师或本课程学生可访问答辩。");
    return c;
  };
  const teacherOnly = (a: ClassroomActor) => { if (!a.roles.includes("teacher")) throw campusError(403, "TEACHER_REQUIRED", "此操作仅对任课教师开放。"); };
  const studentOnly = (a: ClassroomActor) => { if (!a.roles.includes("student") || a.roles.includes("teacher")) throw campusError(403, "STUDENT_REQUIRED", "请使用学生账号提交与回答。"); };
  const assignment = async (r: FastifyRequest) => {
    const a = await actor(r), task = repository.assignment((r.params as { assignmentId: string }).assignmentId);
    if (!task) throw campusError(404, "ASSIGNMENT_NOT_FOUND", "答辩作业不存在。");
    courseAccess(a, task.courseId);
    if (!a.roles.includes("teacher") && task.status === "draft") throw campusError(404, "ASSIGNMENT_NOT_FOUND", "答辩作业尚未发布。");
    return { a, task };
  };
  const session = async (r: FastifyRequest) => {
    const a = await actor(r), value = repository.session((r.params as { sessionId: string }).sessionId);
    if (!value || !a.roles.includes("teacher") && a.actorId !== value.actorId) throw campusError(404, "DEFENSE_NOT_FOUND", "答辩记录不存在或无权查看。");
    courseAccess(a, value.assignment.courseId);
    return { a, value };
  };
  app.get("/api/courses/:courseId/defense-assignments", async r => {
    const a = await actor(r), id = (r.params as { courseId: string }).courseId;
    courseAccess(a, id);
    const teacher = a.roles.includes("teacher");
    return { teacher, assignments: repository.assignments(id).filter(t => teacher || t.status !== "draft").map(t => ({
      ...publicAssignment(t, teacher), sessions: repository.sessions(t.id, teacher ? undefined : a.actorId).map(s => ({ id: s.id, displayName: s.displayName, status: s.status, createdAt: s.createdAt, total: teacher || s.review?.released ? s.review?.total ?? null : null }))
    })) };
  });
  app.post("/api/courses/:courseId/defense-assignments", async (r, reply) => {
    const a = await actor(r), id = (r.params as { courseId: string }).courseId;
    teacherOnly(a); courseAccess(a, id);
    return reply.code(201).send(repository.create(id, a, defenseAssignmentInputSchema.parse(r.body)));
  });
  app.get("/api/defense-assignments/:assignmentId", async r => {
    const { a, task } = await assignment(r), teacher = a.roles.includes("teacher");
    return { teacher, assignment: publicAssignment(task, teacher), sessions: repository.sessions(task.id, teacher ? undefined : a.actorId).map(v => publicSession(v, teacher)) };
  });
  app.put("/api/defense-assignments/:assignmentId", async r => {
    const { a, task } = await assignment(r); teacherOnly(a);
    const { revision, ...input } = defenseAssignmentInputSchema.safeExtend({ revision: z.number().int().min(0) }).parse(r.body);
    return repository.change(task.id, revision, "edit", input);
  });
  app.post("/api/defense-assignments/:assignmentId/action", async r => {
    const { a, task } = await assignment(r); teacherOnly(a);
    const input = z.object({ revision: z.number().int().min(0), action: z.enum(["publish", "close"]) }).strict().parse(r.body);
    return repository.change(task.id, input.revision, input.action);
  });
  app.post("/api/defense-assignments/:assignmentId/submissions", async (r, reply) => {
    const { a, task } = await assignment(r); studentOnly(a);
    return reply.code(201).send(publicSession(repository.submit(task.id, a, defenseSubmissionSchema.parse(r.body)), false));
  });
  app.get("/api/defense-sessions/:sessionId", async r => { const { a, value } = await session(r); return publicSession(value, a.roles.includes("teacher")); });
  app.put("/api/defense-sessions/:sessionId/answer", async r => {
    const { a, value } = await session(r); studentOnly(a);
    return publicSession(repository.answer(value.id, defenseAnswerSchema.parse(r.body)), false);
  });
  app.post("/api/defense-sessions/:sessionId/next", async r => {
    const { a, value } = await session(r); studentOnly(a);
    if (["completed", "reviewed"].includes(value.status) || value.questions.at(-1) && !value.questions.at(-1)!.answer) return publicSession(value, false);
    if (active.has(value.id)) throw campusError(409, "DEFENSE_GENERATING", "正在准备追问，请稍后刷新继续。");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
    timer.unref();
    const aborted = () => controller.abort(); r.raw.once("aborted", aborted);
    const job = (async () => {
      let release: ((status: string) => void) | undefined;
      try {
        release = await options.admission?.enter(a, "defense", controller.signal);
        const result = await generateDefenseTurn(options.provider, value, controller.signal);
        // Recheck session identity and course membership after the model call.
        const latestActor = await actor(r);
        if (latestActor.actorId !== a.actorId) throw campusError(401, "IDENTITY_SESSION_REQUIRED", "登录身份已变化，请重新进入。");
        courseAccess(latestActor, value.assignment.courseId);
        return publicSession(repository.advance(value.id, value.revision, result), false);
      } finally { release?.(controller.signal.aborted ? "interrupted" : "completed"); }
    })();
    active.set(value.id, { controller, promise: job });
    try { return await job; }
    finally { clearTimeout(timer); r.raw.off("aborted", aborted); active.delete(value.id); }
  });
  app.post("/api/defense-sessions/:sessionId/questions", async r => {
    const { a, value } = await session(r); teacherOnly(a);
    const input = z.object({ revision: z.number().int().min(0), prompt: z.string().trim().min(5).max(1200), dimensionId: z.string() }).strict().parse(r.body);
    return publicSession(repository.manualQuestion(value.id, input.revision, input.prompt, input.dimensionId), true);
  });
  app.put("/api/defense-sessions/:sessionId/review", async r => {
    const { a, value } = await session(r); teacherOnly(a);
    return publicSession(repository.review(value.id, a.actorId, defenseReviewSchema.parse(r.body)), true);
  });
}
