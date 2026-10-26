import { createHash, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ClassroomActor } from '@edu/contracts';
import { ENTERPRISE_RULES, ENTERPRISE_NOTE_TOPICS, ENTERPRISE_SUBMISSION_SCHEMA, cleanEnterpriseConfig, type EnterpriseTask, type EnterpriseAttemptSummary, type EnterprisePackage, type verifyEnterprisePackage } from '@edu/port-simulation-core';
import { openDatabase, campusError, transaction } from './campus/database.js';

const COURSE = 'course-port-management-intro';
type Verified = ReturnType<typeof verifyEnterprisePackage>;
type AttemptRow = { id: string; task_id: string; actor_id: string; display_name: string; start_request: string; config: string; status: EnterpriseAttemptSummary['status']; created_at: string; submitted_at: string | null; submit_request: string | null; digest: string | null; package: string | null; verified: string | null; result: string | null; error: string | null };
type TaskRow = { id: string; payload: string; closed: number };
export function enterpriseVerificationWorker(pkg: EnterprisePackage) {
  const source = import.meta.url.endsWith('.ts');
  const target = new URL(source ? './enterprise-submission-worker.ts' : './enterprise-submission-worker.mjs', import.meta.url);
  const bootstrap = source ? 'const {register}=await import(' + JSON.stringify(import.meta.resolve('tsx/esm/api')) + '); register(); await import(' + JSON.stringify(target.href) + ');' : '';
  const entry = source ? new URL('data:text/javascript,' + encodeURIComponent(bootstrap)) : target;
  const worker = new Worker(entry, { workerData: pkg, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 768 } });
  const promise = new Promise<Verified>((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => { reject(Error('长期经营核验超时，请保留本机封存包。')); void worker.terminate(); }, 240000);
    worker.once('message', (m: { ok: boolean; value: Verified; error?: string }) => { finished = true; clearTimeout(timeout); if (m.ok) resolve(m.value); else reject(Error(m.error ?? '重放核验失败。')); void worker.terminate(); });
    worker.once('error', e => { clearTimeout(timeout); reject(e); });
    worker.once('exit', () => { clearTimeout(timeout); if (!finished) reject(Error('核验工作线程已退出。')); });
  });
  return { promise, cancel: () => worker.terminate() };
}
export class EnterpriseRepository {
  readonly db;
  private closed = false;
  private working?: Promise<void>;
  private current?: ReturnType<typeof enterpriseVerificationWorker>;
  constructor(path: string) {
    this.db = openDatabase(path);
    this.db.exec("CREATE TABLE IF NOT EXISTS enterprise_tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL,closed INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS enterprise_attempts(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,actor_id TEXT NOT NULL,display_name TEXT NOT NULL,start_request TEXT NOT NULL,config TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,submitted_at TEXT,submit_request TEXT,digest TEXT,package TEXT,verified TEXT,result TEXT,error TEXT,UNIQUE(actor_id,start_request),UNIQUE(actor_id,submit_request)); CREATE INDEX IF NOT EXISTS enterprise_queue ON enterprise_attempts(status,created_at); UPDATE enterprise_attempts SET status='queued' WHERE status='verifying';");
    if (!this.db.prepare('PRAGMA table_info(enterprise_attempts)').all().some(column => column.name === 'verified_at')) this.db.exec('ALTER TABLE enterprise_attempts ADD COLUMN verified_at TEXT');
    this.db.exec("UPDATE enterprise_attempts SET verified_at=COALESCE(submitted_at,created_at) WHERE status='verified' AND verified_at IS NULL");
    this.pump();
  }
  tasks() { return (this.db.prepare('SELECT * FROM enterprise_tasks ORDER BY rowid DESC').all() as TaskRow[]).map(r => ({ ...JSON.parse(r.payload) as EnterpriseTask, closed: !!r.closed })); }
  task(id: string) { const r = this.db.prepare('SELECT * FROM enterprise_tasks WHERE id=?').get(id) as TaskRow | undefined; return r ? { ...JSON.parse(r.payload) as EnterpriseTask, closed: !!r.closed } : undefined; }
  publish(input: { title: string; config: unknown; deadline?: string | null; maxAttempts: number; completeRequired: boolean }) {
    const config = cleanEnterpriseConfig(input.config); config.mode = 'exam';
    const task: EnterpriseTask = { id: randomUUID(), title: input.title, courseId: COURSE, config, rules: { ...ENTERPRISE_RULES }, createdAt: new Date().toISOString(), deadline: input.deadline ?? null, maxAttempts: input.maxAttempts, completeRequired: input.completeRequired, closed: false };
    if (task.deadline && Date.parse(task.deadline) <= Date.now()) throw campusError(400, 'DEADLINE_PASSED', '截止时间应在当前时间之后。');
    this.db.prepare('INSERT INTO enterprise_tasks(id,payload) VALUES(?,?)').run(task.id, JSON.stringify(task)); return task;
  }
  get(id: string) { return this.db.prepare('SELECT * FROM enterprise_attempts WHERE id=?').get(id) as AttemptRow | undefined; }
  summary(row: AttemptRow): EnterpriseAttemptSummary { return { id: row.id, taskId: row.task_id, actorId: row.actor_id, displayName: row.display_name, config: JSON.parse(row.config), status: row.status, createdAt: row.created_at, submittedAt: row.submitted_at, error: row.error, result: row.result ? JSON.parse(row.result) : null }; }
  start(actor: ClassroomActor, taskId: string, requestId: string) {
    return transaction(this.db, () => {
      const prior = this.db.prepare('SELECT * FROM enterprise_attempts WHERE actor_id=? AND start_request=?').get(actor.actorId, requestId) as AttemptRow | undefined;
      if (prior) { if (prior.task_id !== taskId) throw campusError(409, 'REQUEST_CONFLICT', '该开始编号已经用于其他任务。'); return this.summary(prior); }
      const task = this.task(taskId); if (!task) throw campusError(404, 'TASK_NOT_FOUND', '任务不存在。');
      if (task.closed || task.deadline && Date.parse(task.deadline) < Date.now()) throw campusError(409, 'TASK_CLOSED', '任务已关闭或超过截止时间。');
      const count = Number(this.db.prepare('SELECT COUNT(*) AS n FROM enterprise_attempts WHERE actor_id=? AND task_id=?').get(actor.actorId, taskId)?.n ?? 0);
      if (count >= task.maxAttempts) throw campusError(409, 'ATTEMPT_LIMIT', '已达到该任务允许的正式场次数。已有场次可继续恢复。');
      const id = randomUUID(), now = new Date().toISOString();
      this.db.prepare("INSERT INTO enterprise_attempts(id,task_id,actor_id,display_name,start_request,config,status,created_at) VALUES(?,?,?,?,?,?,'started',?)").run(id, taskId, actor.actorId, actor.displayName, requestId, JSON.stringify(task.config), now);
      return this.summary(this.get(id)!);
    });
  }
  submit(actor: ClassroomActor, id: string, requestId: string, pkg: EnterprisePackage) {
    const raw = JSON.stringify(pkg), digest = createHash('sha256').update(raw).digest('hex');
    const result = transaction(this.db, () => {
      const row = this.get(id);
      if (!row || row.actor_id !== actor.actorId) throw campusError(404, 'ATTEMPT_NOT_FOUND', '个人场次不存在或无权提交。');
      if (row.submit_request) {
        if (row.submit_request !== requestId || row.digest !== digest) throw campusError(409, 'SEALED_ATTEMPT', '该正式场次已经提交，不能用不同内容覆盖。');
        return this.summary(row);
      }
      const task = this.task(row.task_id)!;
      if (task.closed || task.deadline && Date.parse(task.deadline) < Date.now()) throw campusError(409, 'TASK_CLOSED', '任务已关闭或超过截止时间；本机记录仍可导出。');
      if (JSON.stringify(cleanEnterpriseConfig(pkg.record.config)) !== row.config || JSON.stringify(pkg.record.rules) !== JSON.stringify(task.rules)) throw campusError(400, 'TASK_VERSION_MISMATCH', '提交的初始条件或规则与正式场次不一致。');
      const sameRequest = this.db.prepare('SELECT id FROM enterprise_attempts WHERE actor_id=? AND submit_request=?').get(actor.actorId, requestId);
      if (sameRequest) throw campusError(409, 'REQUEST_CONFLICT', '提交编号已用于其他场次。');
      const queue = Number(this.db.prepare("SELECT COUNT(*) AS n FROM enterprise_attempts WHERE actor_id=? AND status IN ('queued','verifying')").get(actor.actorId)?.n ?? 0);
      if (queue >= 3) throw campusError(429, 'QUEUE_FULL', '已有经营记录等待核验，请稍后再提交。');
      this.db.prepare("UPDATE enterprise_attempts SET status='queued',submitted_at=?,submit_request=?,digest=?,package=? WHERE id=?").run(new Date().toISOString(), requestId, digest, raw, id);
      return this.summary(this.get(id)!);
    });
    this.pump(); return result;
  }
  attempts(actorId?: string, taskId?: string) {
    return (this.db.prepare('SELECT * FROM enterprise_attempts ORDER BY COALESCE(submitted_at,created_at) DESC,rowid DESC').all() as AttemptRow[]).filter(r => (!actorId || r.actor_id === actorId) && (!taskId || r.task_id === taskId));
  }
  unreadCount(since: string) { return Number(this.db.prepare("SELECT COUNT(*) AS n FROM enterprise_attempts WHERE status='verified' AND verified_at>?").get(since)?.n ?? 0); }
  overview(actor: ClassroomActor) {
    const teacher = actor.roles.includes('teacher'), tasks = this.tasks(), rows = this.attempts(teacher ? undefined : actor.actorId);
    const open = tasks.filter(t => !t.closed && (!t.deadline || Date.parse(t.deadline) >= Date.now()));
    return {
      teacher, courseId: COURSE,
      totals: { openTasks: open.length, started: rows.filter(r => r.status === 'started').length, submitted: rows.filter(r => r.submitted_at).length, pending: rows.filter(r => ['queued','verifying'].includes(r.status)).length, verified: rows.filter(r => r.status === 'verified').length },
      tasks: tasks.slice(0, 6),
      recent: rows.filter(r => r.submitted_at).slice(0, 5).map(row => ({ ...this.summary(row), taskTitle: tasks.find(t => t.id === row.task_id)?.title ?? '长期经营任务' })),
    };
  }
  private pump() { if (!this.working && !this.closed) this.working = this.run().finally(() => { this.working = undefined; if (!this.closed && this.db.prepare("SELECT 1 FROM enterprise_attempts WHERE status='queued'").get()) this.pump(); }); }
  private async run() {
    await Promise.resolve();
    while (!this.closed) {
      const row = this.db.prepare("SELECT * FROM enterprise_attempts WHERE status='queued' ORDER BY rowid LIMIT 1").get() as AttemptRow | undefined;
      if (!row) return;
      this.db.prepare("UPDATE enterprise_attempts SET status='verifying' WHERE id=?").run(row.id);
      try {
        this.current = enterpriseVerificationWorker(JSON.parse(row.package!));
        const verified = await this.current.promise; if (this.closed) return;
        const task = this.task(row.task_id)!;
        if (task.completeRequired && !verified.complete) throw Error('正式任务要求完成全部经营期，提前封存记录只可作为练习。');
        if (!ENTERPRISE_NOTE_TOPICS.every(topic => verified.view.notes.some(n => n.topic === topic && n.text.trim().length >= 20))) throw Error('正式任务需要经营决策、设备投资、生产调度、异常与边界四类各不少于20字的个人决策说明。');
        this.db.prepare("UPDATE enterprise_attempts SET status='verified',verified=?,result=?,verified_at=?,error=NULL WHERE id=?").run(JSON.stringify(verified), JSON.stringify(verified.result), new Date().toISOString(), row.id);
      } catch (error) {
        if (this.closed) return;
        this.db.prepare("UPDATE enterprise_attempts SET status='rejected',error=? WHERE id=?").run(error instanceof Error ? error.message : String(error), row.id);
      } finally { this.current = undefined; }
    }
  }
  async close() { this.closed = true; await this.current?.cancel(); await this.working; this.db.close(); }
}
export function registerEnterprise(app: FastifyInstance, repo: EnterpriseRepository, options: {
  resolve: (request: FastifyRequest) => Promise<ClassroomActor | null>;
  allowed: (actor: ClassroomActor) => string[] | null;
  roster: () => Array<{ actorId: string; displayName: string; identifier: string }>;
}) {
  const identity = async (request: FastifyRequest) => { const actor = await options.resolve(request); if (!actor) throw campusError(401, 'IDENTITY_REQUIRED', '请先登录教学平台。'); const allowed = options.allowed(actor); if (allowed && !allowed.includes(COURSE)) throw campusError(403, 'COURSE_FORBIDDEN', '无权访问本课程经营任务。'); return actor; };
  const teacher = async (request: FastifyRequest) => { const actor = await identity(request); if (!actor.roles.includes('teacher')) throw campusError(403, 'TEACHER_REQUIRED', '只有教师可以发布和管理正式任务。'); return actor; };
  const student = async (request: FastifyRequest) => { const actor = await identity(request); if (!actor.roles.includes('student') || actor.roles.includes('teacher')) throw campusError(403, 'STUDENT_REQUIRED', '正式场次仅供学生独立完成。'); return actor; };
  const owned = async (request: FastifyRequest) => { const actor = await identity(request), id = (request.params as { id: string }).id, row = repo.get(id); if (!row || row.actor_id !== actor.actorId && !actor.roles.includes('teacher')) throw campusError(404, 'ATTEMPT_NOT_FOUND', '场次不存在或无权查看。'); return { actor, row }; };
  app.get('/api/port-enterprise/overview', async request => repo.overview(await identity(request)));
  app.get('/api/port-enterprise/tasks', async request => { const actor = await identity(request); return { teacher: actor.roles.includes('teacher'), tasks: repo.tasks(), attempts: repo.attempts(actor.roles.includes('teacher') ? undefined : actor.actorId).map(r => repo.summary(r)) }; });
  app.post('/api/port-enterprise/tasks', async request => {
    await teacher(request);
    const input = z.object({ title: z.string().trim().min(2).max(100), config: z.unknown(), deadline: z.string().datetime().nullable().optional(), maxAttempts: z.number().int().min(1).max(5), completeRequired: z.boolean() }).strict().parse(request.body);
    return repo.publish(input);
  });
  app.patch('/api/port-enterprise/tasks/:id', async request => { await teacher(request); const { closed } = z.object({ closed: z.boolean() }).strict().parse(request.body), id = (request.params as { id: string }).id; if (!repo.task(id)) throw campusError(404, 'TASK_NOT_FOUND', '任务不存在。'); repo.db.prepare('UPDATE enterprise_tasks SET closed=? WHERE id=?').run(closed ? 1 : 0, id); return repo.task(id); });
  app.post('/api/port-enterprise/tasks/:id/attempts', async request => { const actor = await student(request); const { requestId } = z.object({ requestId: z.string().uuid() }).strict().parse(request.body); return repo.start(actor, (request.params as { id: string }).id, requestId); });
  app.get('/api/port-enterprise/attempts/:id', async request => repo.summary((await owned(request)).row));
  app.post('/api/port-enterprise/attempts/:id/submit', { bodyLimit: 10_000_000 }, async (request, reply) => {
    const actor = await student(request);
    const input = z.object({ requestId: z.string().uuid(), package: z.object({ schema: z.literal(ENTERPRISE_SUBMISSION_SCHEMA), record: z.object({ schema: z.string(), rules: z.record(z.string(), z.string()), config: z.unknown(), commands: z.array(z.unknown()).max(75000) }).strict(), expected: z.object({ hash: z.string().regex(/^[a-f0-9]{64}$/), score: z.number().finite().min(0).max(100) }).strict() }).strict() }).strict().parse(request.body);
    const result = repo.submit(actor, (request.params as { id: string }).id, input.requestId, input.package as EnterprisePackage);
    return reply.code(result.status === 'verified' ? 200 : 202).send(result);
  });
  app.get('/api/port-enterprise/attempts/:id/replay', async request => { const { row } = await owned(request); if (row.status !== 'verified') throw campusError(409, 'NOT_VERIFIED', '记录尚未通过核验。'); return { package: JSON.parse(row.package!) as EnterprisePackage, ...JSON.parse(row.verified!) as Verified }; });
  app.get('/api/port-enterprise/tasks/:id/results', async request => {
    const actor = await identity(request), id = (request.params as { id: string }).id;
    if (!repo.task(id)) throw campusError(404, 'TASK_NOT_FOUND', '任务不存在。');
    const rows = repo.attempts(actor.roles.includes('teacher') ? undefined : actor.actorId, id);
    const roster = actor.roles.includes('teacher') ? options.roster() : [{ actorId: actor.actorId, displayName: actor.displayName, identifier: '' }];
    for (const row of rows) if (!roster.some(r => r.actorId === row.actor_id)) roster.push({ actorId: row.actor_id, displayName: row.display_name, identifier: '' });
    return { task: repo.task(id), rows: roster.map(r => { const attempts = rows.filter(a => a.actor_id === r.actorId); return { ...r, attempts: attempts.map(a => repo.summary(a)), selected: attempts.find(a => a.status === 'verified') ? repo.summary(attempts.find(a => a.status === 'verified')!) : null }; }) };
  });
}
