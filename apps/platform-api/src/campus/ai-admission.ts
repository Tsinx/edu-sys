import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ClassroomActor } from "@edu/contracts";
import { openDatabase, campusError } from "./database.js";

export interface AiLimits { concurrency: number; queue: number; dailyRequests: number; timeoutMs: number }
export class AiAdmission {
  readonly db;
  private active = 0;
  private readonly actors = new Set<string>();
  private readonly waiting: Array<{ teacher: boolean; start: () => void }> = [];
  constructor(path: string, readonly limits: AiLimits) {
    this.db = openDatabase(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS ai_requests (
      id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL,
      started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS ai_requests_actor_day ON ai_requests(actor_id,day);`);
    this.db.exec("UPDATE ai_requests SET status='interrupted' WHERE completed_at IS NULL");
  }
  async enter(actor: ClassroomActor, kind: string, signal: AbortSignal) {
    const teacher = actor.roles.includes("teacher");
    const day = new Date().toISOString().slice(0,10);
    const usage = this.db.prepare("SELECT COUNT(*) AS n FROM ai_requests WHERE actor_id=? AND day=?").get(actor.actorId,day)!;
    if (Number(usage.n) >= this.limits.dailyRequests) throw campusError(429,"AI_DAILY_LIMIT","今日 AI 请求额度已用完。");
    if (this.actors.has(actor.actorId)) throw campusError(429,"AI_ACTOR_BUSY","上一条 AI 请求仍在处理，请完成或取消后再试。");
    const capacity = teacher ? this.limits.concurrency : Math.max(1,this.limits.concurrency-1);
    if (this.active >= capacity && this.waiting.length >= this.limits.queue) throw campusError(429,"AI_QUEUE_FULL","AI 队列已满，请稍后再试。");
    this.actors.add(actor.actorId);
    try {
      await new Promise<void>((resolve,reject) => {
        const entry = { teacher, start: () => { signal.removeEventListener("abort",abort); this.active++; resolve(); } };
        const abort = () => {
          const i=this.waiting.indexOf(entry); if(i>=0) this.waiting.splice(i,1);
          reject(campusError(503,"AI_QUEUE_TIMEOUT","AI 等待已取消或超时。"));
        };
        if(signal.aborted) { abort(); return; }
        if(this.active < capacity) entry.start();
        else { this.waiting.push(entry); signal.addEventListener("abort",abort,{once:true}); }
      });
    } catch(error) { this.actors.delete(actor.actorId); throw error; }
    let row;
    try { row=this.db.prepare("INSERT INTO ai_requests(actor_id,day,kind,started_at,status) VALUES (?,?,?,?,?)")
      .run(actor.actorId,day,kind,new Date().toISOString(),"running"); }
    catch(error){this.actors.delete(actor.actorId);this.active--;this.drain();throw error;}
    let released=false;
    return (status: string) => {
      if(released) return; released=true;
      try {this.db.prepare("UPDATE ai_requests SET completed_at=?,status=? WHERE id=?").run(new Date().toISOString(),status,row.lastInsertRowid);}
      finally {this.actors.delete(actor.actorId); this.active--;this.drain();}
    };
  }
  private drain() {
      for (;;) {
        const teacherIndex=this.waiting.findIndex(item=>item.teacher);
        const index=teacherIndex >= 0 ? teacherIndex : 0;
        const next=this.waiting[index];
        if(!next || this.active >= (next.teacher ? this.limits.concurrency : Math.max(1,this.limits.concurrency-1))) break;
        this.waiting.splice(index,1); next.start();
      }
  }
  status() { return { active:this.active, queued:this.waiting.length, limits:this.limits }; }
  close() { this.db.close(); }
}

const signals=new WeakMap<FastifyRequest,AbortSignal>();
export function aiSignal(request: FastifyRequest, signal?: AbortSignal) {
  return AbortSignal.any([signals.get(request) ?? AbortSignal.timeout(120_000), ...(signal ? [signal] : [])]);
}
export function registerAiAdmission(app: FastifyInstance, admission: AiAdmission, resolve: (request: FastifyRequest)=>Promise<ClassroomActor|null>) {
  app.addHook("preHandler", async (request,reply) => {
    if(request.method!=="POST" || !/\/(assistant\/turns|asr|tts)$/.test(request.url.split("?")[0]!)) return;
    const actor=await resolve(request);
    if(!actor) throw campusError(401,"IDENTITY_SESSION_REQUIRED","请先登录后使用 AI。");
    const controller=new AbortController();
    const timer=setTimeout(()=>{controller.abort(); if(reply.sent && !reply.raw.writableEnded) reply.raw.end();},admission.limits.timeoutMs);
    timer.unref(); signals.set(request,controller.signal);
    const stop=()=>controller.abort();
    request.raw.once("aborted",stop);
    let finish: ((status:string)=>void)|undefined;
    const cleanup=()=>{clearTimeout(timer); controller.abort(); try{finish?.(reply.raw.writableFinished && reply.statusCode<400 ? "completed" : "interrupted");}catch(error){request.log.error(error,"AI usage receipt could not be persisted");}};
    reply.raw.once("close",cleanup);
    reply.raw.once("finish",cleanup);
    try {
      finish=await admission.enter(actor,request.url.split("/").at(-1)!,controller.signal);
      if(controller.signal.aborted || reply.raw.destroyed || reply.raw.writableEnded){cleanup();throw campusError(503,"AI_REQUEST_CANCELLED","请求已取消。");}
    }
    catch(error) { clearTimeout(timer); throw error; }
  });
  app.get("/api/admin/ai",async()=>admission.status());
}
