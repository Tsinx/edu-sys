import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildApp } from "../apps/platform-api/src/app.js";
import { CampusIdentityProvider } from "../apps/platform-api/src/campus/accounts.js";
import { createPortCourse, nextPortCourseStep, applyPortCourseCommand, serializePortCourse, createPortSession, applyPortCommand, serializePortSession, portTime, type PortCourseUnit } from "../packages/port-simulation-core/src/index.js";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(process.env.EDU_PLAYWRIGHT_PATH ?? "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js");
const { chromium } = require("playwright");
const dir = await mkdtemp(join(tmpdir(), "edu-port-browser-")), output = resolve("output/port-submission-qa"); await mkdir(output, { recursive: true });
const identity = new CampusIdentityProvider(join(dir, "accounts.sqlite")), password = randomUUID();
await identity.createAccount("student-qa", "实验验收学生", "student", password); await identity.createAccount("teacher-qa", "实验验收教师", "teacher", password); await identity.createAccount("empty-qa", "未提交学生", "student", password);
const app = await buildApp({ dataFile: join(dir, "state.json"), identityProvider: identity, campusMode: true, secureIdentityCookie: false, publicOrigin: "http://127.0.0.1:5187", staticRoot: resolve("apps/teacher-web/dist") });
await app.listen({ host: "127.0.0.1", port: 5187 });
const base = "http://127.0.0.1:5187", errors: string[] = [], checks: string[] = [];
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const student = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), teacher = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const p = await student.newPage(), t = await teacher.newPage();
for (const page of [p, t]) { page.setDefaultTimeout(30000); page.on("pageerror", (error: Error) => errors.push(error.message)); }
const pass = (s: string) => { checks.push(s); console.log(`PASS ${s}`); };
async function inspect(page: any, name: string) {
  await page.bringToFront();
  const found = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, broken: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src), leaks: document.querySelectorAll("[data-teaching-cue],[data-assistant-cue]").length }));
  assert.ok(found.scroll <= found.width + 1, `${name}: ${JSON.stringify(found)}`); assert.deepEqual(found.broken, []); assert.equal(found.leaks, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true, animations: "disabled", timeout: 60000 }); pass(name);
}
async function login(page: any, role: string) {
  await page.goto(base); await page.getByLabel("账号", { exact: true }).fill(`${role}-qa`); await page.getByLabel("密码", { exact: true }).fill(password); await page.getByRole("button", { name: "登录", exact: true }).click(); await page.getByRole("button", { name: /离线与同步/ }).waitFor();
}
async function openUnit(type: string) {
  await p.goto(`${base}/simulations?course=${type}`);
  const skip = p.getByRole("button", { name: "跳过，直接练习" });
  await p.locator(`.port-ops[data-course="${type}"]`).waitFor({ timeout: 60000 });
  if (await skip.count()) await skip.click();
  await p.getByRole("button", { name: "复盘", exact: true }).click();
  await p.getByRole("region", { name: "实验成绩提交" }).waitFor();
}
async function finalSeen() { await p.getByRole("region", { name: "实验成绩提交" }).getByRole("status").filter({ hasText: "提交成功" }).waitFor({ timeout: 180000 }); }
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base)).ok) break; } catch {} if (i > 100) throw new Error("Vite did not start"); await new Promise(r => setTimeout(r, 200)); }
  await login(p, "student"); await login(t, "teacher");
  await openUnit("arrival");
  // Deliberately fail the POST once; the actual UI must seal and persist before uploading.
  await p.route("**/api/port-operations/submissions", (route: any) => route.abort());
  await p.getByRole("button", { name: "结束并提交", exact: true }).click();
  await p.getByRole("region", { name: "实验成绩提交" }).getByRole("status").filter({ hasText: "待上传" }).waitFor();
  await p.unroute("**/api/port-operations/submissions"); await p.reload();
  await p.getByRole("button", { name: "跳过，直接练习" }).click(); await p.getByRole("button", { name: "复盘", exact: true }).click();
  await student.clearCookies(); await login(p, "student"); await openUnit("arrival");
  await p.getByRole("button", { name: "重试提交", exact: true }).click(); await finalSeen(); pass("sealed package survives failed upload and refresh");
  pass("sealed package survives session expiry and student re-login");
  for (const type of ["arrival", "cargo", "yard", "planning", "departure", "full"]) {
    console.log(`CHECK ${type}`);
    let raw: string;
    if (type === "full") { const s = createPortSession("battle"); applyPortCommand(s, { kind: "start" }); applyPortCommand(s, { kind: "advance", seconds: 172800 }); raw = serializePortSession(s); }
    else { const r = createPortCourse(type as PortCourseUnit); for (let i = 0; i < 1000 && !r.complete; i++) { const step = nextPortCourseStep(r); assert.ok(step); applyPortCourseCommand(r, step.command); } assert.ok(r.complete); raw = serializePortCourse(r); }
    await openUnit(type);
    await p.locator('.port-ops input[type="file"]').setInputFiles({ name: `experiment-${type}.json`, mimeType: "application/json", buffer: Buffer.from(raw) });
    await p.waitForFunction((type: string) => { const el = document.querySelector('.port-ops'); return el?.getAttribute('data-status') === 'completed' && el?.getAttribute('data-course') === type; }, type, { timeout: 60000 });
    await p.getByRole("button", { name: "复盘", exact: true }).click();
    if (type === "cargo") await p.route("**/api/port-operations/submissions", (route: any) => route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({message:"另一台设备已更新成绩，请刷新最近提交后重试。"})}));
    await p.getByRole("button", { name: type === "full" ? "提交教师" : "结束并提交", exact: true }).click({timeout:180000});
    if (type === "cargo") {
      await p.getByRole("region", {name:"实验成绩提交"}).getByRole("status").filter({hasText:"核验失败"}).waitFor();
      await p.unroute("**/api/port-operations/submissions"); await p.getByRole("button", {name:"重试提交",exact:true}).click();
      pass("first-attempt revision conflict keeps sealed evidence and supports one explicit retry");
    }
    await finalSeen();
    await inspect(p, `student-${type}-desktop`);
    await t.goto(`${base}/courses/course-port-management-intro/experiment-results`);
    await t.locator('.port-result-table tbody button').last().waitFor();
    const title = ({ arrival: "船舶入港", cargo: "装卸与运输", yard: "堆场与交付", planning: "设备与规划", departure: "离港与复核", full: "48 小时综合挑战" } as Record<string, string>)[type];
    await t.getByRole("button", { name: `查看实验验收学生的${title}成绩`, exact: true }).click();
    await t.getByRole("button", { name: "复现播放", exact: true }).click();
    const player = t.getByRole("region", { name: "实验复现播放器" });
    await player.getByRole("button", { name: "最终状态", exact: true }).click();
    await player.getByRole("status").filter({ hasText: "最终状态与服务器成绩一致" }).waitFor({ timeout: 180000 });
    pass(`${type}: UI upload -> server verification -> teacher result -> final replay parity`);
    if (type === "planning") {
      const listing = await (await teacher.request.get(`${base}/api/port-operations/courses/course-port-management-intro/results`)).json();
      const id = listing.rows.find((r:any)=>r.displayName==="实验验收学生").results.find((r:any)=>r.unit==="planning").id;
      const evidence = await (await teacher.request.get(`${base}/api/port-operations/submissions/${id}/replay`)).json();
      const trial = evidence.nodes.find((n:any)=>n.source==="system_trial"); assert.ok(trial);
      await player.locator("details.port-node-list>summary").click(); await player.getByLabel("筛选对象或操作").fill("系统试运行");
      await player.getByRole("button",{name:"定位节点",exact:true}).first().click();
      await player.getByRole("status").filter({hasText:`${portTime(trial.at)} · ${trial.result.message}`}).waitFor();
      await player.getByRole("button",{name:"最终状态",exact:true}).click(); await player.getByRole("status").filter({hasText:"最终状态与服务器成绩一致"}).waitFor();
      pass("planning system-operation node restores its exact scene then returns to verified final state");
    }
    if (type === "arrival") {
      await player.getByRole("button", { name: "上一节点" }).click(); await player.getByRole("status").filter({ hasText: "正在重建" }).waitFor({ state: "hidden" });
      await player.getByLabel("回放仿真秒").fill("0"); await player.getByLabel("回放仿真秒").press("Enter");
      await inspect(t, "teacher-replay-desktop");
      await t.setViewportSize({ width: 390, height: 844 }); await inspect(t, "teacher-replay-narrow"); await t.setViewportSize({ width: 1600, height: 1000 });
    }
  }
  await p.setViewportSize({ width: 390, height: 844 }); await inspect(p, "student-submission-narrow");
  const own = await (await student.request.get(`${base}/api/port-operations/courses/course-port-management-intro/results`)).json();
  assert.equal(own.rows[0].results.length, 6); assert.equal(own.rows[0].results.find((r: any) => r.unit === "arrival").revision, 2);
  const otherRows = await (await teacher.request.get(`${base}/api/port-operations/courses/course-port-management-intro/results`)).json(); assert.equal(otherRows.rows.find((r: any) => r.displayName === "未提交学生").results.length, 0);
  pass("six independent latest records; resubmission replaces only arrival; missing is not zero");
  assert.deepEqual(errors, []);
  await writeFile(join(output, "browser-report.json"), JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors, fixtureDirectory: dir, scope: "Local campus-account UI; imported deterministic completed records; no school network deployment." }, null, 2));
} catch (error) {
  await p.screenshot({ path: join(output, "failure-student.png"), fullPage: true }).catch(() => {}); await t.screenshot({ path: join(output, "failure-teacher.png"), fullPage: true }).catch(() => {});
  await writeFile(join(output, "failure.json"), JSON.stringify({ checks, errors, message: (error as Error).stack, student: await p.locator("body").innerText().catch(() => "") }, null, 2)); throw error;
} finally { await browser.close(); await app.close(); }
