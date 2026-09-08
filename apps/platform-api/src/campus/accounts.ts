import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { ClassroomActor, ClassroomIdentityCredential, ClassroomIdentityProvider } from "@edu/contracts";
import { openDatabase, transaction, campusError } from "./database.js";

const derive = promisify(scrypt);
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const normalize = (value: string) => value.trim().toLowerCase();

export class CampusIdentityProvider implements ClassroomIdentityProvider {
  readonly source = "campus_local" as const;
  readonly db;
  private readonly dummySalt = randomBytes(16).toString("hex");
  constructor(path: string, private readonly sessionTtlMs = 8 * 60 * 60 * 1000) {
    this.db = openDatabase(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campus_accounts (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher','student')), password_hash TEXT NOT NULL,
        salt TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS campus_sessions (
        token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES campus_accounts(id), expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS campus_sessions_expiry ON campus_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS campus_login_limits (bucket TEXT PRIMARY KEY, started_at INTEGER NOT NULL, attempts INTEGER NOT NULL);
    `);
    this.db.prepare("DELETE FROM campus_sessions WHERE expires_at <= ?").run(Date.now());
  }

  async createAccount(username: string, displayName: string, role: "teacher" | "student", password: string) {
    if (!/^[a-zA-Z0-9_.@-]{2,80}$/.test(username) || displayName.trim().length < 1 || displayName.length > 40 || password.length < 12 || password.length > 256) {
      throw campusError(400, "ACCOUNT_INVALID", "账号需为2–80位字母数字或_.@-，姓名1–40字，密码至少12位。");
    }
    const salt = randomBytes(16).toString("hex");
    const hash = (await derive(password, salt, 64)) as Buffer;
    const id = `campus-${randomUUID()}`;
    this.db.prepare("INSERT INTO campus_accounts (id,username,display_name,role,password_hash,salt) VALUES (?,?,?,?,?,?)")
      .run(id, normalize(username), displayName.trim(), role, hash.toString("hex"), salt);
    return { id, username: normalize(username), displayName, role };
  }

  async resetPassword(username: string, password: string) {
    if (password.length < 12 || password.length > 256) throw campusError(400, "PASSWORD_INVALID", "密码应为12–256位。");
    const salt = randomBytes(16).toString("hex");
    const hash = (await derive(password, salt, 64)) as Buffer;
    transaction(this.db, () => {
      const result = this.db.prepare("UPDATE campus_accounts SET password_hash=?,salt=? WHERE username=?")
        .run(hash.toString("hex"), salt, normalize(username));
      if (!result.changes) throw campusError(404, "ACCOUNT_NOT_FOUND", "账号不存在。");
      this.db.prepare("DELETE FROM campus_sessions WHERE account_id=(SELECT id FROM campus_accounts WHERE username=?)").run(normalize(username));
    });
  }

  listAccounts() {
    return this.db.prepare("SELECT username,display_name AS displayName,role,enabled FROM campus_accounts ORDER BY role,username").all();
  }

  private consumeLoginAttempt(username: string, ip: string) {
    const now = Date.now();
    transaction(this.db, () => {
      this.db.prepare("DELETE FROM campus_login_limits WHERE started_at < ?").run(now - 15 * 60_000);
      for (const [bucket, limit] of [[`user:${normalize(username)}`, 10], [`ip:${ip}`, 150]] as const) {
        const row = this.db.prepare("SELECT attempts FROM campus_login_limits WHERE bucket=?").get(bucket);
        if (Number(row?.attempts ?? 0) >= limit) throw campusError(429, "LOGIN_RATE_LIMIT", "登录尝试过多，请15分钟后重试。");
        this.db.prepare("INSERT INTO campus_login_limits VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1").run(bucket, now);
      }
    });
  }

  async login(username: string, password: string, ip: string) {
    this.consumeLoginAttempt(username, ip);
    const row = this.db.prepare("SELECT * FROM campus_accounts WHERE username=? AND enabled=1").get(normalize(username));
    const derived = (await derive(password, String(row?.salt ?? this.dummySalt), 64)) as Buffer;
    const expected = row ? Buffer.from(String(row.password_hash), "hex") : Buffer.alloc(64);
    if (!row || !timingSafeEqual(derived, expected)) throw campusError(401, "LOGIN_FAILED", "账号或密码不正确。");
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + this.sessionTtlMs;
    transaction(this.db, () => {
      this.db.prepare("DELETE FROM campus_sessions WHERE expires_at<=?").run(Date.now());
      this.db.prepare("INSERT INTO campus_sessions VALUES (?,?,?)").run(tokenHash(token), String(row.id), expiresAt);
      this.db.prepare("DELETE FROM campus_login_limits WHERE bucket=?").run(`user:${normalize(username)}`);
    });
    return { token, actor: this.actor(row), expiresAt };
  }

  private actor(row: Record<string, unknown>): ClassroomActor {
    return { actorId: String(row.id), displayName: String(row.display_name), roles: [row.role as "teacher" | "student"], identitySource: this.source };
  }

  async resolveActor(credential: ClassroomIdentityCredential) {
    if (!credential.sessionToken) return null;
    const row = this.db.prepare(`SELECT a.* FROM campus_sessions s JOIN campus_accounts a ON a.id=s.account_id
      WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1`).get(tokenHash(credential.sessionToken), Date.now());
    return row ? this.actor(row) : null;
  }
  expiresAt(token: string | null) {
    if (!token) return null;
    const row = this.db.prepare("SELECT expires_at FROM campus_sessions WHERE token_hash=? AND expires_at>?").get(tokenHash(token), Date.now());
    return row ? new Date(Number(row.expires_at)).toISOString() : null;
  }
  revokeSession(token: string | null) {
    if (token) this.db.prepare("DELETE FROM campus_sessions WHERE token_hash=?").run(tokenHash(token));
  }
  close() { this.db.close(); }
}
