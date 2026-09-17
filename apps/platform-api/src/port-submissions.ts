import { createHash, randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ClassroomActor } from "@edu/contracts";
import { PORT_SUBMISSION_SCHEMA, type PortSubmissionPackage, type PortSubmissionResult, type verifyPortSubmission } from "@edu/port-simulation-core";
import { campusError, openDatabase, transaction } from "./campus/database.js";

const unit = z.enum(["arrival", "cargo", "yard", "planning", "departure", "full"]);
const inputSchema = z.object({ requestId: z.string().uuid(), courseId: z.literal("course-port-management-intro"), classSessionId: z.string().max(200).optional(), expectedRevision: z.number().int().min(0),
  package: z.object({ schema: z.literal(PORT_SUBMISSION_SCHEMA), unit, ended: z.enum(["student", "completed"]), record: z.string().max(20_000_000), expected: z.object({ stateHash: z.string().regex(/^[0-9a-f]{64}$/), score: z.number().finite().min(0).max(100) }).strict() }).strict() }).strict();
type SubmissionInput = z.infer<typeof inputSchema>;
type Verified = Awaited<ReturnType<typeof verifyPortSubmission>>;
type Row = { id: string; actor_id: string; display_name: string; course_id: string; class_session_id: string | null; unit: string; status: string; expected_revision: number; revision: number; created_at: string; updated_at: string; error: string | null; package: string; verified: string | null; result: string | null; digest: string };
const summaryColumns = "id,actor_id,display_name,course_id,class_session_id,unit,status,expected_revision,revision,created_at,updated_at,error,result";
export function submissionWorker(pkg: PortSubmissionPackage, timeout = 180000): { promise: Promise<Verified>; cancel: () => Promise<number> } {
  const source = import.meta.url.endsWith(".ts");
  const target = new URL(source ? "./port-submission-worker.ts" : "./port-submission-worker.mjs", import.meta.url);
  const entry = source ? new URL(`data:text/javascript,${encodeURIComponent(`const {register}=await import(${JSON.stringify(import.meta.resolve("tsx/esm/api"))}); register(); await import(${JSON.stringify(target.href)});`)}`) : target;
  const worker = new Worker(entry, { workerData: pkg, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 512 } });
  const promise = new Promise<Verified>((resolve, reject) => {
    let received = false;
    const timer = setTimeout(() => { reject(new Error("复算超过180秒，请保留记录并重试。")); void worker.terminate(); }, timeout);
    worker.once("message", message => { received = true; clearTimeout(timer); if (message.ok) resolve(message.value); else reject(new Error(message.error)); void worker.terminate(); });
    worker.once("error", error => { clearTimeout(timer); reject(error); });
    worker.once("exit", () => { clearTimeout(timer); if (!received) reject(new Error("复算工作线程退出。")); });
  });
  return { promise, cancel: () => worker.terminate() };
}

export class PortSubmissionRepository {
  readonly db;
  private closed = false;
  private current?: ReturnType<typeof submissionWorker>;
  private working?: Promise<void>;
  constructor(path: string) {
    this.db = openDatabase(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS port_submissions(
      id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,display_name TEXT NOT NULL,course_id TEXT NOT NULL,unit TEXT NOT NULL,
      request_id TEXT NOT NULL,digest TEXT NOT NULL,expected_revision INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,package TEXT NOT NULL,verified TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
      UNIQUE(actor_id,request_id));
      CREATE TABLE IF NOT EXISTS port_latest(actor_id TEXT NOT NULL,course_id TEXT NOT NULL,unit TEXT NOT NULL,submission_id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(actor_id,course_id,unit));
      CREATE INDEX IF NOT EXISTS port_submission_queue ON port_submissions(status,created_at);
      UPDATE port_submissions SET status='queued' WHERE status='verifying';`);
    if (!this.db.prepare("PRAGMA table_info(port_submissions)").all().some(row => row.name === "result")) this.db.exec("ALTER TABLE port_submissions ADD COLUMN result TEXT");
    if (!this.db.prepare("PRAGMA table_info(port_submissions)").all().some(row => row.name === "class_session_id")) this.db.exec("ALTER TABLE port_submissions ADD COLUMN class_session_id TEXT");
    this.db.exec("UPDATE port_submissions SET result=json_extract(verified,'$.result') WHERE verified IS NOT NULL AND result IS NULL");
    this.pump();
  }
  get(id: string, evidence = true) { return this.db.prepare(`SELECT ${evidence ? "*" : summaryColumns} FROM port_submissions WHERE id=?`).get(id) as Row | undefined; }
  latestRevision(actor: string, course: string, type: string) { return Number(this.db.prepare("SELECT revision FROM port_latest WHERE actor_id=? AND course_id=? AND unit=?").get(actor, course, type)?.revision ?? 0); }
  submit(actor: ClassroomActor, input: SubmissionInput) {
    const digest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const row = transaction(this.db, () => {
      const prior = this.db.prepare("SELECT * FROM port_submissions WHERE actor_id=? AND request_id=?").get(actor.actorId, input.requestId) as Row | undefined;
      if (prior) { if (prior.digest !== digest) throw campusError(409, "SUBMISSION_ID_REUSED", "提交编号已用于其他内容。"); return prior; }
      if (this.latestRevision(actor.actorId, input.courseId, input.package.unit) !== input.expectedRevision) throw campusError(409, "RESULT_CONFLICT", "另一台设备已更新成绩，请刷新最近提交后重试。");
      if (Number(this.db.prepare("SELECT COUNT(*) AS n FROM port_submissions WHERE actor_id=? AND status IN ('queued','verifying')").get(actor.actorId)?.n) >= 6) throw campusError(429, "SUBMISSION_QUEUE_FULL", "已有实验等待核验，请稍后再提交。");
      const id = randomUUID(), now = new Date().toISOString();
      this.db.prepare("INSERT INTO port_submissions(id,actor_id,display_name,course_id,class_session_id,unit,request_id,digest,expected_revision,status,package,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, actor.actorId, actor.displayName, input.courseId, input.classSessionId ?? null, input.package.unit, input.requestId, digest, input.expectedRevision, "queued", JSON.stringify(input.package), now, now);
      return this.get(id)!;
    });
    this.pump();
    return this.summary(row);
  }
  summary(row: Row) {
    const result = row.result ? JSON.parse(row.result) as PortSubmissionResult : null;
    return { id: row.id, actorId: row.actor_id, displayName: row.display_name, courseId: row.course_id, classSessionId: row.class_session_id, unit: row.unit, status: row.status, revision: row.revision,
      createdAt: row.created_at, updatedAt: row.updated_at, error: row.error, result };
  }
  results(course: string, actor?: string) {
    const values = actor ? [course, actor] : [course];
    const columns = summaryColumns.split(",").map(c => `s.${c}`).join(",");
    const rows = this.db.prepare(`SELECT ${columns} FROM port_latest l JOIN port_submissions s ON s.id=l.submission_id WHERE l.course_id=? ${actor ? "AND l.actor_id=?" : ""}`).all(...values) as Row[];
    const pending = this.db.prepare(`SELECT ${columns} FROM port_submissions s WHERE s.course_id=? ${actor ? "AND s.actor_id=?" : ""} AND s.status<>'verified' AND s.rowid=(SELECT MAX(t.rowid) FROM port_submissions t WHERE t.actor_id=s.actor_id AND t.course_id=s.course_id AND t.unit=s.unit)`).all(...values) as Row[];
    return { results: rows.map(r => this.summary(r)), pending: pending.map(r => this.summary(r)) };
  }
  private pump() {
    if (this.closed || this.working) return;
    this.working = this.run().finally(() => { this.working = undefined; if (!this.closed && this.db.prepare("SELECT 1 FROM port_submissions WHERE status='queued' LIMIT 1").get()) this.pump(); });
  }
  private async run() {
    // Yield once so enqueue and startup use the same durable queue path.
    await Promise.resolve();
    while (!this.closed) {
      const row = this.db.prepare("SELECT * FROM port_submissions WHERE status='queued' ORDER BY rowid LIMIT 1").get() as Row | undefined;
      if (!row) return;
      this.db.prepare("UPDATE port_submissions SET status='verifying' WHERE id=?").run(row.id);
      try {
        this.current = submissionWorker(JSON.parse(row.package));
        const verified = await this.current.promise;
        if (this.closed) return;
        transaction(this.db, () => {
          if (this.latestRevision(row.actor_id, row.course_id, row.unit) !== row.expected_revision) throw new Error("另一份提交已更新该实验成绩，本次未覆盖，请刷新后重新提交。");
          const revision = row.expected_revision + 1;
          this.db.prepare("UPDATE port_submissions SET status='verified',revision=?,verified=?,result=?,updated_at=? WHERE id=?").run(revision, JSON.stringify(verified), JSON.stringify(verified.result), new Date().toISOString(), row.id);
          this.db.prepare("INSERT INTO port_latest VALUES(?,?,?,?,?) ON CONFLICT(actor_id,course_id,unit) DO UPDATE SET submission_id=excluded.submission_id,revision=excluded.revision")
            .run(row.actor_id, row.course_id, row.unit, row.id, revision);
        });
      } catch (error) {
        if (!this.closed) this.db.prepare("UPDATE port_submissions SET status='rejected',error=?,updated_at=? WHERE id=?").run((error as Error).message, new Date().toISOString(), row.id);
      } finally { this.current = undefined; }
    }
  }
  async close() { this.closed = true; await this.current?.cancel(); await this.working; this.db.close(); }
}

export function registerPortSubmissions(app: FastifyInstance, repository: PortSubmissionRepository, options: {
  resolve: (request: FastifyRequest) => Promise<ClassroomActor | null>;
  allowed: (actor: ClassroomActor) => string[] | null;
  classCourse: (id: string) => string | undefined;
  roster: (course: string) => Array<{ actorId: string; displayName: string; identifier: string }>;
}) {
  const identity = async (request: FastifyRequest, course = "course-port-management-intro") => {
    const actor = await options.resolve(request);
    if (!actor) throw campusError(401, "IDENTITY_SESSION_REQUIRED", "请登录后提交或查看实验。");
    const allowed = options.allowed(actor);
    if (course !== "course-port-management-intro" || allowed && !allowed.includes(course)) throw campusError(403, "COURSE_ACCESS_FORBIDDEN", "无权访问该课程实验。");
    return actor;
  };
  const read = async (request: FastifyRequest, evidence = false) => {
    const actor = await identity(request), row = repository.get((request.params as { id: string }).id, evidence);
    if (!row || row.actor_id !== actor.actorId && !actor.roles.includes("teacher")) throw campusError(404, "SUBMISSION_NOT_FOUND", "提交不存在或无权查看。");
    await identity(request, row.course_id);
    return row;
  };
  app.post("/api/port-operations/submissions", { bodyLimit: 20_000_000 }, async (request, reply) => {
    const actor = await identity(request), parsed = inputSchema.safeParse(request.body);
    if (!parsed.success) throw campusError(400, "INVALID_SUBMISSION", "提交格式、课程、实验类型或版本无效。");
    const input = parsed.data;
    if (!actor.roles.includes("student") || actor.roles.includes("teacher")) throw campusError(403, "STUDENT_REQUIRED", "教师演示不能作为学生成绩提交。");
    if (input.classSessionId && options.classCourse(input.classSessionId) !== input.courseId) throw campusError(400, "CLASS_COURSE_MISMATCH", "课堂与课程不一致。");
    const result = repository.submit(actor, input);
    return reply.code(result.status === "verified" ? 200 : 202).send(result);
  });
  app.get("/api/port-operations/submissions/:id", async request => repository.summary(await read(request)));
  app.get("/api/port-operations/submissions/:id/replay", async request => {
    const row = await read(request, true);
    if (row.status !== "verified") throw campusError(409, "SUBMISSION_NOT_VERIFIED", "尚未通过复算。");
    return { package: JSON.parse(row.package), ...JSON.parse(row.verified!) as Verified };
  });
  app.get("/api/port-operations/courses/:courseId/results", async request => {
    const course = (request.params as { courseId: string }).courseId, actor = await identity(request, course);
    const teacher = actor.roles.includes("teacher"), data = repository.results(course, teacher ? undefined : actor.actorId);
    const roster = new Map((teacher ? options.roster(course) : [{ actorId: actor.actorId, displayName: actor.displayName, identifier: "" }]).map(r => [r.actorId, r]));
    for (const r of [...data.results, ...data.pending]) if (!roster.has(r.actorId)) roster.set(r.actorId, { actorId: r.actorId, displayName: r.displayName, identifier: "" });
    return { courseId: course, teacher, rows: [...roster.values()].map(r => ({ ...r, results: data.results.filter(s => s.actorId === r.actorId), pending: data.pending.filter(s => s.actorId === r.actorId) })) };
  });
}
