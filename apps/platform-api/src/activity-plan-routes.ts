import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { activityPlanSaveSchema, type ClassroomActor } from "@edu/contracts";
import type { JsonStateStore } from "./store.js";
import { ActivityPlans } from "./activity-plans.js";
import {
  ClassroomParticipation,
  participationError as fail,
} from "./classroom-participation.js";
export function registerActivityPlans(
  app: FastifyInstance,
  store: JsonStateStore,
  participation: ClassroomParticipation,
  resolve: (r: FastifyRequest) => Promise<ClassroomActor | null>,
) {
  const plans = new ActivityPlans(participation);
  const actor = async (r: FastifyRequest, teacher = false) => {
    const a = await resolve(r);
    if (!a) throw fail(401, "请先登录");
    if (teacher && !a.roles.includes("teacher"))
      throw fail(403, "仅教师可以管理活动单");
    return a;
  };
  const course = (r: FastifyRequest) => {
    const id = (r.params as { courseId: string }).courseId;
    if (!store.getCourse(id)) throw fail(404, "课程不存在");
    return id;
  };
  const session = (r: FastifyRequest, live = false) => {
    const s = store.getSession((r.params as { id: string }).id);
    if (!s) throw fail(404, "课堂不存在或已清理");
    if (live && s.status !== "live")
      throw fail(409, "课堂已结束，不能继续发布或修改活动");
    return s;
  };
  const lesson = (r: FastifyRequest) =>
    z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .parse((r.params as { lesson: string }).lesson);
  const page = (r: FastifyRequest) =>
    z
      .object({ page: z.coerce.number().int().positive().default(1) })
      .parse(r.query).page;
  app.get("/api/courses/:courseId/activity-plans", async (r) => {
    await actor(r, true);
    return plans.counts(course(r));
  });
  app.get("/api/courses/:courseId/activity-plans/:lesson", async (r) => {
    await actor(r, true);
    return plans.get(course(r), lesson(r));
  });
  app.put("/api/courses/:courseId/activity-plans/:lesson", async (r) => {
    const a = await actor(r, true);
    return plans.save(
      course(r),
      lesson(r),
      a.actorId,
      activityPlanSaveSchema.parse(r.body),
    );
  });
  app.get("/api/courses/:courseId/activity-history", async (r) => {
    const a = await actor(r);
    const id = course(r);
    const q = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        lesson: z.coerce.number().int().nonnegative().optional(),
      })
      .parse(r.query);
    const rows = store
      .listSessions()
      .filter(
        (s) =>
          s.courseId === id &&
          (q.lesson === undefined ||
            s.lessonNumber === q.lesson ||
            plans.hasLesson(s.id, q.lesson, a)),
      )
      .map((s) => ({ ...s, activityCount: plans.sessionCount(s.id, a) }))
      .filter((s) => s.activityCount > 0);
    return {
      rows: rows.slice((q.page - 1) * 20, q.page * 20),
      total: rows.length,
      page: q.page,
    };
  });
  const base = "/api/class-sessions/:id/participation";
  app.get(`${base}/plans/:lesson`, async (r) => {
    await actor(r, true);
    const s = session(r);
    return {
      execution: plans.execution(s.id, lesson(r)),
      plan: plans.get(s.courseId, lesson(r)),
    };
  });
  app.post(`${base}/plans/:lesson/attach`, async (r) => {
    await actor(r, true);
    const s = session(r, true);
    const v = z
      .object({ expectedVersion: z.number().int().positive() })
      .strict()
      .parse(r.body);
    return plans.attach(s.id, s.courseId, lesson(r), v.expectedVersion);
  });
  app.post(`${base}/plans/:lesson/items/:itemId`, async (r) => {
    await actor(r, true);
    const s = session(r, true);
    const v = z
      .object({
        action: z.enum(["publish", "skip", "restore"]),
        requestId: z.string().uuid(),
      })
      .strict()
      .parse(r.body);
    return plans.change(
      s.id,
      s.courseId,
      lesson(r),
      (r.params as { itemId: string }).itemId,
      v.action,
      v.requestId,
    );
  });
  app.get(`${base}/history`, async (r) => {
    const a = await actor(r);
    return plans.history(session(r).id, a, page(r));
  });
  app.get(`${base}/history/:activityId`, async (r) => {
    const a = await actor(r);
    return plans.detail(
      session(r).id,
      (r.params as { activityId: string }).activityId,
      a,
    );
  });
}
