import { createHash } from "node:crypto";
import { z } from "zod";
import type { ClassroomActor } from "@edu/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { openDatabase, transaction, campusError } from "./database.js";

export const edgeRecordInput = z.object({
  requestId: z.string().uuid(), key: z.string().min(1).max(400),
  deviceId: z.string().uuid(), expectedRevision: z.number().int().min(0),
  value: z.string().max(2_000_000), releaseId: z.string().max(100)
}).strict();
export type EdgeRecordInput = z.infer<typeof edgeRecordInput>;

export class EdgeRecordRepository {
  readonly db;
  constructor(path: string) {
    this.db = openDatabase(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS edge_records (
        actor_id TEXT NOT NULL, key TEXT NOT NULL, device_id TEXT NOT NULL,
        revision INTEGER NOT NULL, value TEXT NOT NULL, release_id TEXT NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(actor_id,key)
      );
      CREATE TABLE IF NOT EXISTS edge_receipts (
        actor_id TEXT NOT NULL, request_id TEXT NOT NULL, digest TEXT NOT NULL, receipt TEXT NOT NULL,
        PRIMARY KEY(actor_id,request_id)
      );
    `);
  }
  list(actorId: string) {
    return this.db.prepare(`SELECT key,device_id AS deviceId,revision,value,release_id AS releaseId,updated_at AS updatedAt
      FROM edge_records WHERE actor_id=? ORDER BY updated_at DESC`).all(actorId);
  }
  put(actorId: string, input: EdgeRecordInput) {
    return transaction(this.db, () => {
      const digest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const previous = this.db.prepare("SELECT digest,receipt FROM edge_receipts WHERE actor_id=? AND request_id=?").get(actorId, input.requestId);
      if (previous) {
        if (previous.digest !== digest) throw campusError(409, "REQUEST_ID_REUSED", "提交编号已用于其他内容。");
        return JSON.parse(String(previous.receipt)) as { key: string; revision: number; updatedAt: string };
      }
      const existing = this.db.prepare("SELECT revision FROM edge_records WHERE actor_id=? AND key=?").get(actorId, input.key);
      if (Number(existing?.revision ?? 0) !== input.expectedRevision) throw campusError(409, "RECORD_CONFLICT", "另一台设备已有更新，已保留本机存档，请选择恢复版本。");
      const total = this.db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(length(value)),0) AS bytes FROM edge_records WHERE actor_id=? AND key<>?").get(actorId,input.key)!;
      if (Number(total.count) >= 120 || Number(total.bytes) + input.value.length > 30_000_000) throw campusError(413, "RECORD_QUOTA", "服务器个人存档配额已满，请导出并整理存档。");
      const receipt = { key: input.key, revision: input.expectedRevision + 1, updatedAt: new Date().toISOString() };
      this.db.prepare(`INSERT INTO edge_records VALUES (?,?,?,?,?,?,?) ON CONFLICT(actor_id,key) DO UPDATE SET
        device_id=excluded.device_id,revision=excluded.revision,value=excluded.value,release_id=excluded.release_id,updated_at=excluded.updated_at`)
        .run(actorId,input.key,input.deviceId,receipt.revision,input.value,input.releaseId,receipt.updatedAt);
      this.db.prepare("INSERT INTO edge_receipts VALUES (?,?,?,?)").run(actorId,input.requestId,digest,JSON.stringify(receipt));
      return receipt;
    });
  }
  close() { this.db.close(); }
}

export function registerEdgeRecords(app: FastifyInstance, repository: EdgeRecordRepository,
  resolve: (request: FastifyRequest) => Promise<ClassroomActor | null>) {
  const actor = async (request: FastifyRequest) => {
    const result = await resolve(request);
    if (!result) throw campusError(401,"IDENTITY_SESSION_REQUIRED","请登录后同步。");
    return result;
  };
  app.get("/api/edge/records", async request => {const current=await actor(request);return {actorId:current.actorId,records:repository.list(current.actorId)};});
  app.post("/api/edge/records", { bodyLimit: 2_200_000 }, async request => {
    const current = await actor(request);
    return repository.put(current.actorId, edgeRecordInput.parse(request.body));
  });
}
