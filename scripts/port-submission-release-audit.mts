import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createPortCourse, serializePortCourse, makePortSubmission } from "../packages/port-simulation-core/src/index.js";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const release = resolve(process.argv[2] ?? "output/port-submission-campus-20260917"), temp = await mkdtemp(join(tmpdir(), "edu-port-release-")), data = join(temp, "data"); await mkdir(data);
const env = { ...process.env, NODE_ENV: "production", EDU_ENV_FILE: join(temp, "unused.env"), EDU_DATA_FILE: join(data, "state.json"), EDU_API_HOST: "127.0.0.1", EDU_API_PORT: "5197", EDU_DEPLOYMENT_PROFILE: "campus", EDU_PUBLIC_ORIGIN: "https://release.test", EDU_STATIC_ROOT: join(release, "web"), EDU_ALLOW_DEVELOPMENT_IDENTITY: "false", EDU_PORT_SIMULATION_DB: join(data, "port-simulation.sqlite") };
const command = (file: string, args: string[], input?: string) => new Promise<string>((resolveCommand, reject) => {
  const child = spawn(file, args, { cwd: release, env, windowsHide: true, shell: file.endsWith(".cmd"), stdio: ["pipe", "pipe", "pipe"] }); let output = "";
  child.stdout.on("data", chunk => output += chunk); child.stderr.on("data", chunk => output += chunk); child.on("error", reject); child.on("close", code => code === 0 ? resolveCommand(output) : reject(new Error(output))); child.stdin.end(input);
});
console.log("Installing standalone runtime dependencies");
await command(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"]);
const password = randomUUID();
for (const role of ["teacher", "student"]) await command(process.execPath, ["admin.mjs", "create"], JSON.stringify({ username: role, displayName: `发布包${role}`, role, password }));
let server: ChildProcess | undefined, logs = "";
const base = "http://127.0.0.1:5197";
async function start() {
  server = spawn(process.execPath, ["server.mjs"], { cwd: release, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); logs = "";
  server.stdout!.on("data", c => logs += c); server.stderr!.on("data", c => logs += c);
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/api/health")).ok) return; } catch {} if (i > 1200 || server.exitCode !== null) throw new Error(`Standalone server failed: ${logs.slice(-2500)}`); await new Promise(r => setTimeout(r, 100)); }
}
async function stop() { if (server) { const child = server; server = undefined; const done = new Promise(r => child.once("close", r)); child.kill(); await done; } }
const login = async (username: string) => { const r = await fetch(base + "/api/identity/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }); assert.equal(r.status, 200); return r.headers.get("set-cookie")!.split(";")[0]!; };
try {
  await start(); const student = await login("student"), teacher = await login("teacher");
  const pkg = await makePortSubmission(serializePortCourse(createPortCourse("arrival")));
  const post = await fetch(base + "/api/port-operations/submissions", { method: "POST", headers: { cookie: student, "Content-Type": "application/json" }, body: JSON.stringify({ requestId: randomUUID(), courseId: "course-port-management-intro", expectedRevision: 0, package: pkg }) });
  assert.equal(post.status, 202); const id = ((await post.json()) as { id: string }).id;
  let outcome: any;
  for (let i = 0; i < 300; i++) { outcome = await fetch(`${base}/api/port-operations/submissions/${id}`, { headers: { cookie: student } }).then(r => r.json()); if (["verified", "rejected"].includes(outcome.status)) break; await new Promise(r => setTimeout(r, 100)); }
  assert.equal(outcome.status, "verified", JSON.stringify(outcome));
  const replay = await fetch(`${base}/api/port-operations/submissions/${id}/replay`, { headers: { cookie: teacher } }).then(r => r.json()) as any;
  assert.equal(replay.result.stateHash, pkg.expected.stateHash); console.log("PASS standalone worker verification and teacher replay");
  await stop(); const backup = join(temp, "backup"); await command(process.execPath, ["admin.mjs", "backup", backup]);
  const file = (await readdir(backup)).find(n => n.endsWith(".port-results.sqlite")); assert.ok(file);
  const db = new DatabaseSync(join(backup, file), { readOnly: true }); assert.equal(db.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok"); assert.equal(db.prepare("SELECT COUNT(*) AS n FROM port_latest").get()!.n, 1); db.close();
  env.EDU_DATA_FILE = join(backup, "state.json"); env.EDU_PORT_SIMULATION_DB = join(backup, "port-simulation.sqlite");
  await start(); const restoredTeacher = await login("teacher"); const restored = await fetch(`${base}/api/port-operations/submissions/${id}/replay`, { headers: { cookie: restoredTeacher } }).then(r => r.json()) as any;
  assert.equal(restored.result.stateHash, pkg.expected.stateHash); console.log("PASS backup restore retains latest score and immutable replay");
  await writeFile(resolve("output/port-submission-qa/release-report.json"), JSON.stringify({ checkedAt: new Date().toISOString(), release, isolatedRuntime: true, workerVerification: true, teacherReplay: true, backupIntegrity: true, backupRestore: true, testData: temp }, null, 2));
} finally { await stop(); }
