import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildApp } from "../apps/platform-api/src/app.js";
import { CampusIdentityProvider } from "../apps/platform-api/src/campus/accounts.js";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(process.env.EDU_PLAYWRIGHT_PATH ?? "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js");
const { chromium } = require("playwright");
const dir = await mkdtemp(join(tmpdir(), "edu-port-browser-")), output = resolve("output/port-task-mode-qa" + (process.env.EDU_PORT_QA_LAYOUT_ONLY === "1" ? "-layout" : "")); await mkdir(output, { recursive: true });
const identity = new CampusIdentityProvider(join(dir, "accounts.sqlite")), password = randomUUID();
await identity.createAccount("student-qa", "实验验收学生", "student", password); await identity.createAccount("teacher-qa", "实验验收教师", "teacher", password); await identity.createAccount("empty-qa", "未提交学生", "student", password);
const app = await buildApp({ dataFile: join(dir, "state.json"), identityProvider: identity, campusMode: true, secureIdentityCookie: false, publicOrigin: "http://127.0.0.1:5188", staticRoot: resolve("apps/teacher-web/dist") });
await app.listen({ host: "127.0.0.1", port: 5188 });
const base = "http://127.0.0.1:5188", errors: string[] = [], checks: string[] = [];
const browser = await chromium.launch({ headless: true, args: process.env.EDU_PORT_QA_NO_WEBGL === "1" ? ["--disable-webgl"] : ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
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
  await p.bringToFront();
  await p.goto(`${base}/simulations?course=${type}`);
  const skip = p.getByRole("button", { name: "跳过，直接练习" });
  await p.locator(`.port-ops[data-course="${type}"]`).waitFor({ timeout: 60000 });
  if (await skip.count()) await skip.click();
  await p.getByRole("button", { name: "复盘", exact: true }).click();
  await p.getByRole("region", { name: "实验成绩提交" }).waitFor();
}
async function finalSeen() { await p.getByRole("region", { name: "实验成绩提交" }).getByRole("status").filter({ hasText: "提交成功" }).waitFor({ timeout: 180000 }); }
try {
  await login(p, "student"); await login(t, "teacher");
  await t.goto(`${base}/simulations?course=full`);
  await t.locator('.port-ops[data-course="full"]').waitFor();
  const skip = t.getByRole("button", { name: "跳过，直接练习" });
  if (await skip.count()) await skip.click();
  await t.getByRole("button", { name: "公布本流程任务", exact: true }).click();
  await t.getByRole("region", { name: "流程任务" }).getByRole("status").filter({ hasText: "任务已公布" }).waitFor();
  await inspect(t, "teacher-published-full");
  await t.getByRole("button", { name: "标准演示", exact: true }).click();
  await t.locator('.port-ops[data-course="arrival"][data-demo="true"]').waitFor();
  await t.getByRole("region", { name: "流程任务" }).getByText("船舶入港", { exact: true }).waitFor();
  await t.getByRole("button", { name: "公布本流程任务", exact: true }).click();
  await t.getByRole("region", { name: "流程任务" }).getByRole("status").filter({ hasText: "任务已公布" }).waitFor();
  pass("teacher can publish the displayed segment from the standard demonstration");

  await t.goto(`${base}/courses/course-port-management-intro/experiment-results`);
  await openUnit("full");
  if (process.env.EDU_PORT_QA_LAYOUT_ONLY === "1") {
    const panel = p.getByRole("region", { name: "实验成绩提交" });
    assert.ok(await panel.evaluate((el: Element) => Boolean(el.compareDocumentPosition(document.querySelector('.port-panel-heading')!) & Node.DOCUMENT_POSITION_FOLLOWING)));
    await panel.screenshot({ path: join(output, "submission-card-desktop.png") });
    await p.setViewportSize({ width: 390, height: 844 });
    await panel.screenshot({ path: join(output, "submission-card-narrow.png") });
    const width = await p.evaluate(() => [innerWidth, document.documentElement.scrollWidth]); assert.ok(width[1] <= width[0] + 1);
    pass("submission control precedes the full review and fits narrow screens");
  } else {

  await p.getByRole("button", { name: "开始值班", exact: true }).click();
  await p.getByLabel("实验模式", { exact: true }).selectOption("battle");
  await p.locator('.port-ops[data-mode="battle"][data-status="ready"]').waitFor();
  pass("switching a running practice starts an independent battle");
  for (const mode of ["battle", "practice"]) {
    if (mode === "practice") await p.getByLabel("实验模式", { exact: true }).selectOption(mode);
    await p.getByRole("button", { name: "开始值班", exact: true }).click();
    await p.getByRole("button", { name: "复盘", exact: true }).click();
    await p.getByRole("button", { name: "提交教师", exact: true }).click({ timeout: 180000 });
    await finalSeen();
    const own = await (await student.request.get(`${base}/api/port-operations/courses/course-port-management-intro/results`)).json();
    const saved = own.rows[0].results.find((r: any) => r.unit === "full");
    assert.equal(saved.result.mode, mode); assert.equal(saved.result.complete, false);
    assert.equal(saved.revision, mode === "battle" ? 1 : 2);
    pass(`${mode}: start -> early upload -> independently verified incomplete result`);
  }
  await p.setViewportSize({ width: 390, height: 844 }); await inspect(p, "partial-upload-narrow");
  await t.goto(`${base}/courses/course-port-management-intro/experiment-results`);
  await t.getByRole("button", { name: "查看实验验收学生的48 小时综合挑战成绩", exact: true }).click();
  await t.getByRole("region", { name: "实验结果详情" }).getByText(/教学模式.*提前结束/).waitFor();
  await inspect(t, "teacher-partial-result");
  const download = t.waitForEvent("download"); await t.getByRole("button", { name: "导出当前成绩表" }).click();
  const csv = await download; const csvPath = join(output, "results.csv"); await csv.saveAs(csvPath);
  const content = await readFile(csvPath, "utf8"); assert.ok(content.includes("教学模式") && content.includes("未完成") && content.includes("完成状态"));
  pass("teacher detail and exported CSV identify the mode and incomplete status");
  }
  assert.deepEqual(errors, []);
  await writeFile(join(output, "browser-report.json"), JSON.stringify({ checks, errors, webgl: process.env.EDU_PORT_QA_NO_WEBGL !== "1", fixtureDirectory: dir }, null, 2));
} catch (error) {
  await p.screenshot({ path: join(output, "failure-student.png"), fullPage: true }).catch(() => {});
  await writeFile(join(output, "failure.json"), JSON.stringify({ checks, errors, message: (error as Error).stack, student: await p.locator("body").innerText().catch(() => "") }, null, 2)); throw error;
} finally { await browser.close(); await app.close(); }
