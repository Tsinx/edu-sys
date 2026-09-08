import { randomInt, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { ClassroomActor, ClassroomParticipationCreate, ClassroomParticipationView } from "@edu/contracts";
import { ClassroomExerciseLibrary } from "./classroom-exercise-library.js";

type Definition = { question: string; mode: "single" | "multiple"; options: Array<{ id: string; text: string }>; correctOptionIds: string[]; explanation: string; calledId?: string; calledName?: string };
type ActivityRow = { id: string; session_id: string; kind: "question" | "roll_call"; status: "open" | "closed" | "revealed"; definition: string; created_at: string };
type MemberRow = { actor_id: string; display_name: string };
type AnswerRow = { actor_id: string; option_ids: string; submitted_at: string };
export function participationError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode, code: "CLASSROOM_PARTICIPATION_ERROR" });
}

/** Small transactional writes; student answers never rewrite the course JSON. */
export class ClassroomParticipation {
  readonly library: ClassroomExerciseLibrary;
  private readonly db: DatabaseSync;
  private readonly lastSeen = new Map<string, Map<string, number>>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly expiryTimer: ReturnType<typeof setInterval>;

  constructor(file: string, private readonly isLive: (id: string) => boolean, private readonly ttl = 45_000) {
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS participation_rooms(session_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, active_id TEXT);
      CREATE TABLE IF NOT EXISTS participation_members(session_id TEXT NOT NULL, actor_id TEXT NOT NULL, display_name TEXT NOT NULL, PRIMARY KEY(session_id,actor_id));
      CREATE TABLE IF NOT EXISTS participation_activities(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, request_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, definition TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(session_id,request_id));
      CREATE INDEX IF NOT EXISTS participation_activities_session ON participation_activities(session_id,created_at);
      CREATE TABLE IF NOT EXISTS participation_answers(activity_id TEXT NOT NULL, actor_id TEXT NOT NULL, option_ids TEXT NOT NULL, submitted_at TEXT NOT NULL, PRIMARY KEY(activity_id,actor_id));
      CREATE TABLE IF NOT EXISTS participation_groups(session_id TEXT NOT NULL, actor_id TEXT NOT NULL, group_name TEXT NOT NULL, PRIMARY KEY(session_id,actor_id));`);
    this.library = new ClassroomExerciseLibrary(this.db);
    this.expiryTimer = setInterval(() => {
      for (const [sessionId, members] of this.lastSeen) {
        let changed = false;
        for (const [id, time] of members) if (Date.now() - time >= this.ttl) { members.delete(id); changed = true; }
        if (!members.size) this.lastSeen.delete(sessionId);
        if (changed) this.changed(sessionId);
      }
    }, Math.min(5_000, ttl));
    this.expiryTimer.unref();
  }

  close() {
    clearInterval(this.expiryTimer);
    for (const timer of this.pending.values()) clearTimeout(timer);
    this.pending.clear(); this.listeners.clear(); this.db.close();
  }
  private transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const value = operation(); this.db.exec("COMMIT"); return value; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  private room(sessionId: string) {
    return this.db.prepare("SELECT revision, active_id FROM participation_rooms WHERE session_id=?").get(sessionId) as { revision: number; active_id: string | null } | undefined;
  }
  private ensureRoom(id: string) { this.db.prepare("INSERT OR IGNORE INTO participation_rooms(session_id) VALUES(?)").run(id); }
  private changed(sessionId: string) {
    this.ensureRoom(sessionId);
    this.db.prepare("UPDATE participation_rooms SET revision=revision+1 WHERE session_id=?").run(sessionId);
    this.notify(sessionId);
  }
  private notify(sessionId: string) {
    if (this.pending.has(sessionId)) return;
    const timer = setTimeout(() => {
      this.pending.delete(sessionId);
      for (const callback of this.listeners.get(sessionId) ?? []) callback();
    }, 120);
    timer.unref(); this.pending.set(sessionId, timer);
  }
  subscribe(sessionId: string, callback: () => void) {
    const group = this.listeners.get(sessionId) ?? new Set<() => void>();
    group.add(callback); this.listeners.set(sessionId, group);
    return () => { group.delete(callback); if (!group.size) this.listeners.delete(sessionId); };
  }
  private member(sessionId: string, actorId: string) {
    return this.db.prepare("SELECT actor_id,display_name FROM participation_members WHERE session_id=? AND actor_id=?").get(sessionId, actorId) as MemberRow | undefined;
  }
  private online(sessionId: string, actorId: string) { return Date.now() - (this.lastSeen.get(sessionId)?.get(actorId) ?? 0) < this.ttl; }
  touch(sessionId: string, actorId: string) {
    if (!this.member(sessionId, actorId) || !this.isLive(sessionId)) return;
    const wasOnline = this.online(sessionId, actorId);
    const group = this.lastSeen.get(sessionId) ?? new Map<string, number>();
    group.set(actorId, Date.now()); this.lastSeen.set(sessionId, group);
    if (!wasOnline) this.changed(sessionId);
  }
  join(sessionId: string, actor: ClassroomActor, displayName: string) {
    this.requireLive(sessionId);
    const name = actor.identitySource === "development" ? displayName : actor.displayName;
    this.transaction(() => {
      this.ensureRoom(sessionId);
      this.db.prepare("INSERT INTO participation_members VALUES(?,?,?) ON CONFLICT(session_id,actor_id) DO UPDATE SET display_name=excluded.display_name").run(sessionId, actor.actorId, name);
      this.changed(sessionId);
    });
    this.touch(sessionId, actor.actorId);
  }
  private requireLive(id: string) { if (!this.isLive(id)) throw participationError(409, "课堂已结束，不能继续发起或提交活动"); }
  configureGroups(sessionId: string, input: { action: "auto"; size: number } | { action: "assign"; actorId: string; group: string }) {
    this.requireLive(sessionId);
    if (this.room(sessionId)?.active_id) throw participationError(409, "请先收起当前活动，再调整分组，以保留本次统计口径");
    this.transaction(() => {
      const put = this.db.prepare("INSERT INTO participation_groups VALUES(?,?,?) ON CONFLICT(session_id,actor_id) DO UPDATE SET group_name=excluded.group_name");
      if (input.action === "assign") {
        if (!this.member(sessionId, input.actorId)) throw participationError(404, "未找到已加入的学生");
        put.run(sessionId, input.actorId, input.group);
      } else {
        const members = (this.db.prepare("SELECT actor_id FROM participation_members WHERE session_id=?").all(sessionId) as Array<{ actor_id: string }>).filter(m => this.online(sessionId, m.actor_id));
        if (!members.length) throw participationError(409, "请等待学生加入后再分组");
        for (let i = members.length - 1; i > 0; i--) { const j = randomInt(i + 1); [members[i], members[j]] = [members[j]!, members[i]!]; }
        this.db.prepare("DELETE FROM participation_groups WHERE session_id=?").run(sessionId);
        const groups = Math.ceil(members.length / input.size);
        members.forEach((member, index) => put.run(sessionId, member.actor_id, `第${String(index % groups + 1).padStart(2, "0")}组`));
      }
      this.changed(sessionId);
    });
  }
  private activity(sessionId: string, activityId: string) {
    const row = this.db.prepare("SELECT * FROM participation_activities WHERE session_id=? AND id=?").get(sessionId, activityId) as ActivityRow | undefined;
    if (!row) throw participationError(404, "未找到本课堂的活动");
    return row;
  }
  start(sessionId: string, input: ClassroomParticipationCreate) {
    this.requireLive(sessionId);
    return this.transaction(() => {
      this.ensureRoom(sessionId);
      const prior = this.db.prepare("SELECT id FROM participation_activities WHERE session_id=? AND request_id=?").get(sessionId, input.requestId) as { id: string } | undefined;
      if (prior) return prior.id;
      const current = this.room(sessionId)?.active_id;
      if (current && this.activity(sessionId, current).status === "open") throw participationError(409, "请先结束当前活动，再发起下一项");
      let definition: Definition;
      if (input.kind === "question") definition = { question: input.question, mode: input.mode, options: input.options, correctOptionIds: input.correctOptionIds, explanation: input.explanation };
      else {
        const history = this.db.prepare("SELECT definition FROM participation_activities WHERE session_id=? AND kind='roll_call'").all(sessionId) as Array<{ definition: string }>;
        const called = new Set(history.map(r => (JSON.parse(r.definition) as Definition).calledId));
        const members = this.db.prepare("SELECT actor_id,display_name FROM participation_members WHERE session_id=?").all(sessionId) as MemberRow[];
        const eligible = members.filter(m => this.online(sessionId, m.actor_id) && (!input.avoidRepeats || !called.has(m.actor_id)) && (!input.participantId || input.participantId === m.actor_id));
        if (!eligible.length) throw participationError(409, "没有符合条件的在线学生；可等待加入或取消避开已点名学生");
        const chosen = eligible[randomInt(eligible.length)]!;
        definition = { question: "请回应老师的点名", mode: "single", options: [], correctOptionIds: [], explanation: "", calledId: chosen.actor_id, calledName: chosen.display_name };
      }
      const id = randomUUID();
      this.db.prepare("INSERT INTO participation_activities VALUES(?,?,?,?,'open',?,?)").run(id, sessionId, input.requestId, input.kind, JSON.stringify(definition), new Date().toISOString());
      this.db.prepare("UPDATE participation_rooms SET active_id=? WHERE session_id=?").run(id, sessionId);
      this.changed(sessionId); return id;
    });
  }
  answer(sessionId: string, activityId: string, actor: ClassroomActor, optionIds: string[]) {
    this.requireLive(sessionId);
    if (!this.member(sessionId, actor.actorId)) throw participationError(403, "请先填写姓名加入课堂活动");
    this.transaction(() => {
      const row = this.activity(sessionId, activityId);
      const definition = JSON.parse(row.definition) as Definition;
      const serialized = JSON.stringify([...optionIds].sort());
      const prior = this.db.prepare("SELECT option_ids FROM participation_answers WHERE activity_id=? AND actor_id=?").get(activityId, actor.actorId) as { option_ids: string } | undefined;
      if (prior) {
        if (prior.option_ids === serialized) return;
        throw participationError(409, "本题已提交，请等待老师公布结果");
      }
      if (this.room(sessionId)?.active_id !== activityId || row.status !== "open") throw participationError(409, "这项活动已结束，未接收本次提交");
      if (row.kind === "roll_call") {
        if (definition.calledId !== actor.actorId || optionIds.length) throw participationError(403, "只有被点名的学生可以确认回应");
      } else if (!optionIds.length || new Set(optionIds).size !== optionIds.length ||
        optionIds.some(id => !definition.options.some(o => o.id === id)) || (definition.mode === "single" && optionIds.length !== 1)) {
        throw participationError(400, "请选择符合题型的有效选项");
      }
      this.db.prepare("INSERT INTO participation_answers VALUES(?,?,?,?)").run(activityId, actor.actorId, serialized, new Date().toISOString());
      this.changed(sessionId);
    });
    this.touch(sessionId, actor.actorId);
  }
  action(sessionId: string, activityId: string, action: "close" | "reveal" | "dismiss") {
    this.requireLive(sessionId);
    this.transaction(() => {
      const row = this.activity(sessionId, activityId);
      if (this.room(sessionId)?.active_id !== activityId) throw participationError(409, "活动已切换，请刷新后重试");
      if (action === "dismiss") {
        this.db.prepare("UPDATE participation_activities SET status=CASE WHEN status='open' THEN 'closed' ELSE status END WHERE id=?").run(activityId);
        this.db.prepare("UPDATE participation_rooms SET active_id=NULL WHERE session_id=?").run(sessionId);
      } else if (row.status !== "revealed") {
        this.db.prepare("UPDATE participation_activities SET status=? WHERE id=?").run(action === "reveal" ? "revealed" : "closed", activityId);
      }
      this.changed(sessionId);
    });
  }
  end(sessionId: string) {
    this.transaction(() => {
      this.db.prepare("UPDATE participation_activities SET status='closed' WHERE session_id=? AND status='open'").run(sessionId);
      this.changed(sessionId);
    });
  }
  view(sessionId: string, actor: ClassroomActor): ClassroomParticipationView {
    const teacher = actor.roles.includes("teacher");
    const room = this.room(sessionId);
    const member = this.member(sessionId, actor.actorId);
    const row = room?.active_id ? this.activity(sessionId, room.active_id) : null;
    const def = row ? JSON.parse(row.definition) as Definition : null;
    const results = row ? this.db.prepare("SELECT actor_id,option_ids,submitted_at FROM participation_answers WHERE activity_id=?").all(row.id) as AnswerRow[] : [];
    const own = results.find(r => r.actor_id === actor.actorId);
    const visibleResults = teacher || row?.status === "revealed";
    const counts = Object.fromEntries((def?.options ?? []).map(o => [o.id, 0]));
    if (visibleResults) for (const answer of results) for (const id of JSON.parse(answer.option_ids) as string[]) counts[id] = (counts[id] ?? 0) + 1;
    const historical = teacher ? this.db.prepare("SELECT a.*, (SELECT COUNT(*) FROM participation_answers x WHERE x.activity_id=a.id) response_count FROM participation_activities a WHERE session_id=? ORDER BY created_at DESC LIMIT 100").all(sessionId) as Array<ActivityRow & { response_count: number }> : [];
    const calledCounts = teacher ? this.db.prepare("SELECT definition FROM participation_activities WHERE session_id=? AND kind='roll_call'").all(sessionId) as Array<{ definition: string }> : [];
    const groupRows = this.db.prepare("SELECT actor_id,group_name FROM participation_groups WHERE session_id=?").all(sessionId) as Array<{ actor_id: string; group_name: string }>;
    const groupOf = (id: string) => groupRows.find(g => g.actor_id === id)?.group_name ?? "";
    const roster = teacher ? (this.db.prepare("SELECT actor_id,display_name FROM participation_members WHERE session_id=? ORDER BY display_name,actor_id").all(sessionId) as MemberRow[]).map(m => ({
      actorId: m.actor_id, displayName: m.display_name, online: this.online(sessionId, m.actor_id), group: groupOf(m.actor_id),
      calledCount: calledCounts.filter(r => (JSON.parse(r.definition) as Definition).calledId === m.actor_id).length,
      answered: results.some(r => r.actor_id === m.actor_id)
    })) : null;
    return {
      revision: room?.revision ?? 0, isLive: this.isLive(sessionId), isTeacher: teacher, joined: Boolean(member), displayName: member?.display_name ?? actor.displayName, group: groupOf(actor.actorId),
      active: row && def ? {
        id: row.id, kind: row.kind, status: row.status, question: def.question, mode: def.mode, options: def.options,
        calledStudent: def.calledId ? { displayName: def.calledName!, isYou: def.calledId === actor.actorId } : null,
        ownAnswer: own ? { optionIds: JSON.parse(own.option_ids) as string[], submittedAt: own.submitted_at } : null,
        responseCount: visibleResults || row.kind === "roll_call" ? results.length : null,
        counts: visibleResults && row.kind === "question" ? counts : null,
        correctOptionIds: visibleResults ? def.correctOptionIds : null,
        explanation: visibleResults ? def.explanation : null
      } : null,
      roster,
      groupResults: roster ? [...new Set(roster.map(m => m.group))].sort().map(group => ({ group: group || "未分组", members: roster.filter(m => m.group === group).length, responded: roster.filter(m => m.group === group && m.answered).length })) : null,
      history: teacher ? historical.map(h => { const d = JSON.parse(h.definition) as Definition; return { id: h.id, kind: h.kind, title: h.kind === "roll_call" ? `点名：${d.calledName}` : d.question, status: h.status, responseCount: h.response_count, createdAt: h.created_at }; }) : null
    };
  }
}
