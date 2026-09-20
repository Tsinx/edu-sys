import type {
  ActivityPlan,
  ActivityPlanInput,
  ActivityPlanItem,
  ActivityExecution,
  ClassroomActor,
  ActivityHistoryDetail,
  ActivityHistoryRow,
} from "@edu/contracts";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
import {
  ClassroomParticipation,
  participationError as fail,
} from "./classroom-participation.js";
export class ActivityPlans {
  private readonly db;
  constructor(private readonly participation: ClassroomParticipation) {
    this.db = participation.db;
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS course_activity_plans(course_id TEXT NOT NULL,lesson INTEGER NOT NULL,version INTEGER NOT NULL,items TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL,PRIMARY KEY(course_id,lesson));
      CREATE TABLE IF NOT EXISTS classroom_activity_plans(session_id TEXT NOT NULL,lesson INTEGER NOT NULL,plan_version INTEGER NOT NULL,items TEXT NOT NULL,PRIMARY KEY(session_id,lesson));`);
  }
  private validateLesson(course: string, lesson: number) {
    if (
      !getCourseDeckByCourseId(course)?.lessons.some((l) => l.number === lesson)
    )
      throw fail(400, "该课程没有此讲次");
  }
  get(course: string, lesson: number): ActivityPlan {
    this.validateLesson(course, lesson);
    const row = this.db
      .prepare(
        "SELECT * FROM course_activity_plans WHERE course_id=? AND lesson=?",
      )
      .get(course, lesson);
    const items = row
      ? (JSON.parse(String(row.items)) as ActivityPlanItem[])
      : [];
    return {
      courseId: course,
      lesson,
      version: Number(row?.version ?? 0),
      updatedAt: row ? String(row.updated_at) : null,
      items: items.map((i) => {
        try {
          const current = this.participation.library.get(course, i.exerciseId);
          return {
            ...i,
            availableVersion: current.version,
            archived: current.archived,
          };
        } catch {
          return { ...i, availableVersion: null, archived: true };
        }
      }),
    };
  }
  counts(course: string) {
    return this.db
      .prepare(
        "SELECT lesson,json_array_length(items) AS count FROM course_activity_plans WHERE course_id=?",
      )
      .all(course);
  }
  save(
    course: string,
    lesson: number,
    actorId: string,
    input: ActivityPlanInput,
  ): ActivityPlan {
    this.validateLesson(course, lesson);
    return this.participation.atomic(() => {
      const prior = this.get(course, lesson);
      if (prior.version !== input.expectedVersion)
        throw fail(409, "活动单已被其他页面修改，草稿已保留，请重新加载后处理");
      if (new Set(input.items.map((i) => i.id)).size !== input.items.length)
        throw fail(400, "活动编号重复");
      const deck = getCourseDeckByCourseId(course)!;
      const items = input.items.map((item) => {
        if (
          deck.getSlide(item.slide).index !== item.slide ||
          deck.getLessonPosition(item.slide)?.lessonNumber !== lesson
        )
          throw fail(400, "关联课件页必须属于本讲");
        const saved = prior.items.find(
          (i) =>
            i.id === item.id &&
            i.exerciseId === item.exerciseId &&
            i.exerciseVersion === item.exerciseVersion,
        );
        if (saved) return { ...item, snapshot: saved.snapshot };
        const exercise = this.participation.library.get(
          course,
          item.exerciseId,
        );
        if (exercise.archived || exercise.version !== item.exerciseVersion)
          throw fail(409, "题目已更新或归档，请重新选择后保存");
        const { id: _id, version: _version, ...snapshot } = exercise;
        return { ...item, snapshot };
      });
      this.db
        .prepare(
          "INSERT INTO course_activity_plans VALUES(?,?,?,?,?,?) ON CONFLICT(course_id,lesson) DO UPDATE SET version=excluded.version,items=excluded.items,updated_at=excluded.updated_at,updated_by=excluded.updated_by",
        )
        .run(
          course,
          lesson,
          prior.version + 1,
          JSON.stringify(items),
          new Date().toISOString(),
          actorId,
        );
      return this.get(course, lesson);
    });
  }
  execution(session: string, lesson: number): ActivityExecution | null {
    const row = this.db
      .prepare(
        "SELECT * FROM classroom_activity_plans WHERE session_id=? AND lesson=?",
      )
      .get(session, lesson);
    if (!row) return null;
    const items = JSON.parse(String(row.items)) as ActivityExecution["items"];
    return {
      lesson,
      planVersion: Number(row.plan_version),
      items: items.map((i) => ({
        ...i,
        status: i.activityId
          ? ((this.db
              .prepare(
                "SELECT status FROM participation_activities WHERE id=? AND session_id=?",
              )
              .get(i.activityId, session)?.status as
              | "open"
              | "closed"
              | "revealed") ?? "closed")
          : i.status,
      })),
    };
  }
  attach(
    session: string,
    course: string,
    lesson: number,
    expectedVersion: number,
  ) {
    return this.participation.atomic(() => {
      const existing = this.execution(session, lesson);
      if (existing) return existing;
      const plan = this.get(course, lesson);
      if (plan.version !== expectedVersion)
        throw fail(409, "活动单已更新，请刷新确认后使用");
      if (!plan.items.length) throw fail(409, "请先在课前编排并保存活动单");
      this.db
        .prepare("INSERT INTO classroom_activity_plans VALUES(?,?,?,?)")
        .run(
          session,
          lesson,
          plan.version,
          JSON.stringify(plan.items.map((i) => ({ ...i, status: "pending" }))),
        );
      return this.execution(session, lesson)!;
    });
  }
  change(
    session: string,
    course: string,
    lesson: number,
    itemId: string,
    action: "publish" | "skip" | "restore",
    requestId: string,
  ) {
    return this.participation.atomic(() => {
      const execution = this.execution(session, lesson);
      if (!execution) throw fail(409, "请先载入本讲活动单");
      const item = execution.items.find((i) => i.id === itemId);
      if (!item) throw fail(404, "活动项目不存在");
      if (action === "publish") {
        if (item.activityId) return execution;
        if (item.status === "skipped") throw fail(409, "请先恢复已跳过的活动");
        const id = this.participation.start(session, {
          ...item.snapshot.content,
          requestId,
        });
        const reused = this.db
          .prepare(
            "SELECT items FROM classroom_activity_plans WHERE session_id=?",
          )
          .all(session)
          .some((row) =>
            (JSON.parse(String(row.items)) as ActivityExecution["items"]).some(
              (i) => i.id !== itemId && i.activityId === id,
            ),
          );
        if (reused) throw fail(409, "发布编号已用于另一活动");
        item.activityId = id;
        item.status = "open";
        this.participation.library.recordPublication(
          course,
          item.exerciseId,
          item.exerciseVersion,
          id,
        );
      } else {
        if (item.activityId) throw fail(409, "已发布的活动不能跳过或重置");
        item.status = action === "skip" ? "skipped" : "pending";
      }
      this.db
        .prepare(
          "UPDATE classroom_activity_plans SET items=? WHERE session_id=? AND lesson=?",
        )
        .run(JSON.stringify(execution.items), session, lesson);
      return this.execution(session, lesson)!;
    });
  }
  hasLesson(session: string, lesson: number, actor: ClassroomActor) {
    const execution = this.execution(session, lesson);
    return (
      execution?.items.some(
        (item) =>
          item.activityId &&
          (actor.roles.includes("teacher") ||
            this.db
              .prepare(
                "SELECT 1 FROM participation_answers WHERE activity_id=? AND actor_id=?",
              )
              .get(item.activityId, actor.actorId)),
      ) ?? false
    );
  }
  sessionCount(session: string, actor: ClassroomActor) {
    return Number(
      this.db
        .prepare(
          `SELECT COUNT(*) AS n FROM participation_activities a WHERE a.session_id=? ${actor.roles.includes("teacher") ? "" : "AND EXISTS(SELECT 1 FROM participation_answers x WHERE x.activity_id=a.id AND x.actor_id=?)"}`,
        )
        .get(
          ...(actor.roles.includes("teacher")
            ? [session]
            : [session, actor.actorId]),
        )?.n ?? 0,
    );
  }
  history(session: string, actor: ClassroomActor, page: number) {
    const teacher = actor.roles.includes("teacher");
    const rows = this.db
      .prepare(
        `SELECT a.*, (SELECT COUNT(*) FROM participation_answers x WHERE x.activity_id=a.id) AS response_count, EXISTS(SELECT 1 FROM participation_answers x WHERE x.activity_id=a.id AND x.actor_id=?) AS own FROM participation_activities a WHERE session_id=? ${teacher ? "" : "AND EXISTS(SELECT 1 FROM participation_answers x WHERE x.activity_id=a.id AND x.actor_id=?)"} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?`,
      )
      .all(
        ...(teacher
          ? [actor.actorId, session, (page - 1) * 20]
          : [actor.actorId, session, actor.actorId, (page - 1) * 20]),
      );
    return {
      rows: rows.map((r) => this.summary(r, teacher)),
      total: this.sessionCount(session, actor),
      page,
    };
  }
  private summary(
    row: Record<string, unknown>,
    teacher: boolean,
  ): ActivityHistoryRow {
    const d = JSON.parse(String(row.definition));
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      kind: row.kind as "question" | "roll_call",
      title: d.calledId ? "课堂点名" : d.question,
      status: String(row.status),
      createdAt: String(row.created_at),
      revealedAt: row.revealed_at ? String(row.revealed_at) : null,
      responseCount: teacher ? Number(row.response_count ?? 0) : null,
      ownSubmitted: !!row.own,
    };
  }
  detail(
    session: string,
    id: string,
    actor: ClassroomActor,
  ): ActivityHistoryDetail {
    const row = this.db
      .prepare(
        "SELECT * FROM participation_activities WHERE session_id=? AND id=?",
      )
      .get(session, id);
    if (!row) throw fail(404, "未找到活动");
    const teacher = actor.roles.includes("teacher");
    const answers = this.db
      .prepare("SELECT * FROM participation_answers WHERE activity_id=?")
      .all(id);
    const own = answers.find((a) => a.actor_id === actor.actorId);
    if (!teacher && !own) throw fail(404, "未找到您的作答记录");
    const def = JSON.parse(String(row.definition));
    const visible = teacher || !!row.revealed_at;
    const counts: Record<string, number> = Object.fromEntries(
      def.options.map((o: { id: string }) => [o.id, 0]),
    );
    for (const a of answers)
      for (const option of JSON.parse(String(a.option_ids)))
        counts[option] = (counts[option] ?? 0) + 1;
    const members = this.db
      .prepare(
        "SELECT * FROM participation_activity_members WHERE activity_id=?",
      )
      .all(id);
    const graded = row.kind === "question" && def.correctOptionIds.length > 0;
    const details = answers.map((a) => {
      const member = members.find((m) => m.actor_id === a.actor_id);
      const options = JSON.parse(String(a.option_ids)) as string[];
      return {
        actorId: String(a.actor_id),
        displayName: String(
          member?.display_name ??
            this.db
              .prepare(
                "SELECT display_name FROM participation_members WHERE session_id=? AND actor_id=?",
              )
              .get(session, String(a.actor_id))?.display_name ??
            "历史学生",
        ),
        group: String(member?.group_name ?? "未记录"),
        optionIds: options,
        submittedAt: String(a.submitted_at),
        correct: graded
          ? JSON.stringify([...options].sort()) ===
            JSON.stringify([...def.correctOptionIds].sort())
          : null,
      };
    });
    return {
      ...this.summary(
        { ...row, own: !!own, response_count: answers.length },
        teacher,
      ),
      question: def.question,
      mode: def.mode,
      options: def.options,
      correctOptionIds: visible ? def.correctOptionIds : null,
      explanation: visible ? def.explanation : null,
      ownAnswer: own
        ? {
            optionIds: JSON.parse(String(own.option_ids)),
            submittedAt: String(own.submitted_at),
          }
        : null,
      counts: teacher ? counts : null,
      correctRate:
        teacher && graded && answers.length
          ? details.filter((a) => a.correct).length / answers.length
          : null,
      members: teacher && members.length ? members.length : null,
      answers: teacher ? details : null,
      groups: teacher
        ? [...new Set(members.map((m) => String(m.group_name)))].map(
            (group) => ({
              group: group || "未分组",
              members: members.filter((m) => m.group_name === group).length,
              responded: details.filter((a) => a.group === group).length,
            }),
          )
        : null,
    };
  }
}
