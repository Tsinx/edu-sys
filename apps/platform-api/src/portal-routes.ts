import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ClassroomActor, PortalPreferences } from "@edu/contracts";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
import { z } from "zod";
import type { JsonStateStore } from "./store.js";
import type { PortSubmissionRepository } from "./port-submissions.js";
const defaults: PortalPreferences = {
  compactSidebar: false,
  classReminders: true,
  submissionsReadAt: "1970-01-01T00:00:00.000Z",
};
const fail = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
export function registerPortal(
  app: FastifyInstance,
  store: JsonStateStore,
  submissions: PortSubmissionRepository,
  resolve: (r: FastifyRequest) => Promise<ClassroomActor | null>,
  allowed: (a: ClassroomActor) => string[] | null,
) {
  const actor = async (r: FastifyRequest) => {
    const a = await resolve(r);
    if (!a) throw fail(401, "请先登录");
    return a;
  };
  const course = async (r: FastifyRequest) => {
    const a = await actor(r),
      id = (r.params as { courseId: string }).courseId;
    const c = store.getCourse(id);
    if (!c) throw fail(404, "课程不存在");
    const ids = allowed(a);
    if (ids && !ids.includes(id)) throw fail(403, "该账号尚未加入此课程");
    return { a, c };
  };
  app.get("/api/workspace", async (r) => {
    const a = await actor(r),
      ids = allowed(a),
      teacher = a.roles.includes("teacher");
    const courses = store
        .listCourses()
        .filter((c) => !ids || ids.includes(c.id)),
      own = courses.filter((c) => c.teacherId === a.actorId);
    const preferences = {
      ...defaults,
      ...store.portalState().preferences[a.actorId],
    };
    const sessions = store
      .listSessions()
      .filter(
        (s) =>
          (!ids || ids.includes(s.courseId)) &&
          (!teacher || s.teacherId === a.actorId),
      );
    const recent = submissions.db
      .prepare(
        "SELECT COUNT(*) AS n FROM port_submissions WHERE updated_at>? AND status='verified' AND course_id IN (SELECT value FROM json_each(?))",
      )
      .get(preferences.submissionsReadAt, JSON.stringify(own.map((c) => c.id)));
    return {
      actor: a,
      courses,
      ownCourseIds: own.map((c) => c.id),
      sessions,
      preferences,
      newSubmissions: teacher ? Number(recent?.n ?? 0) : 0,
    };
  });
  app.get("/api/preferences", async (r) => ({
    ...defaults,
    ...store.portalState().preferences[(await actor(r)).actorId],
  }));
  app.patch("/api/preferences", async (r) => {
    const a = await actor(r);
    const input = z
      .object({
        compactSidebar: z.boolean().optional(),
        classReminders: z.boolean().optional(),
        markSubmissionsRead: z.boolean().optional(),
      })
      .strict()
      .parse(r.body);
    return store.updatePortal((p) => {
      const next = { ...defaults, ...p.preferences[a.actorId] };
      if (input.compactSidebar !== undefined)
        next.compactSidebar = input.compactSidebar;
      if (input.classReminders !== undefined)
        next.classReminders = input.classReminders;
      if (input.markSubmissionsRead)
        next.submissionsReadAt = new Date().toISOString();
      return (p.preferences[a.actorId] = next);
    });
  });
  app.get("/api/activity", async (r) => {
    const a = await actor(r);
    if (!a.roles.includes("teacher")) throw fail(403, "仅教师可查看");
    const q = z
      .object({ page: z.coerce.number().int().min(1).default(1) })
      .parse(r.query);
    const rows = store.listActivities();
    return {
      rows: rows.slice((q.page - 1) * 20, q.page * 20),
      total: rows.length,
      page: q.page,
    };
  });
  app.get("/api/courses/:courseId/preparation/:lesson", async (r) => {
    const { a, c } = await course(r);
    if (!a.roles.includes("teacher")) throw fail(403, "仅教师可查看备课笔记");
    return (
      store.portalState().preparations[
        JSON.stringify([
          a.actorId,
          c.id,
          (r.params as { lesson: string }).lesson,
        ])
      ] ?? { text: "", revision: 0 }
    );
  });
  app.put("/api/courses/:courseId/preparation/:lesson", async (r) => {
    const { a, c } = await course(r);
    if (!a.roles.includes("teacher")) throw fail(403, "仅教师可保存备课笔记");
    const lesson = (r.params as { lesson: string }).lesson;
    if (
      !getCourseDeckByCourseId(c.id)?.lessons.some(
        (l) => String(l.number) === lesson,
      )
    )
      throw fail(400, "讲次不存在");
    const v = z
      .object({
        text: z.string().max(20000),
        revision: z.number().int().nonnegative(),
      })
      .strict()
      .parse(r.body);
    return store.updatePortal((p) => {
      const key = JSON.stringify([a.actorId, c.id, lesson]),
        prior = p.preparations[key];
      if ((prior?.revision ?? 0) !== v.revision)
        throw fail(
          409,
          "另一页面已更新笔记，请先重新加载，保留当前草稿后再保存",
        );
      return (p.preparations[key] = {
        text: v.text,
        revision: v.revision + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: a.actorId,
      });
    });
  });
  app.get("/api/courses/:courseId/reading", async (r) => {
    const { a, c } = await course(r);
    return (
      store.portalState().readings[JSON.stringify([a.actorId, c.id])] ?? null
    );
  });
  app.put("/api/courses/:courseId/reading", async (r) => {
    const { a, c } = await course(r),
      deck = getCourseDeckByCourseId(c.id);
    const v = z
      .object({
        slideKey: z.string(),
        deckVersion: z.string(),
        revision: z.number().int().nonnegative(),
      })
      .strict()
      .parse(r.body);
    if (
      !deck ||
      deck.versionId !== v.deckVersion ||
      !deck.getSlideByKey(v.slideKey)
    )
      throw fail(409, "课件版本已更新，请重新加载");
    return store.updatePortal((p) => {
      const key = JSON.stringify([a.actorId, c.id]);
      if ((p.readings[key]?.revision ?? 0) !== v.revision)
        throw fail(409, "其他页面已更新阅读位置，请重新加载后继续");
      return (p.readings[key] = {
        ...v,
        revision: v.revision + 1,
        updatedAt: new Date().toISOString(),
      });
    });
  });
}
