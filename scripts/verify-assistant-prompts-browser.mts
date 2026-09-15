import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "../apps/platform-api/src/app.js";
import type { AssistantJsonStreamRequest } from "../apps/platform-api/src/assistant/provider.js";

const require = createRequire("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js");
const { chromium } = require("playwright");
const directory = await mkdtemp(join(tmpdir(), "edu-prompt-browser-"));
const output = fileURLToPath(new URL("../output/assistant-prompts-qa", import.meta.url));
await mkdir(output, { recursive: true });
const requests: AssistantJsonStreamRequest[] = [];
const app = await buildApp({ dataFile: join(directory, "state.json"), portSimulationTickMs: 0,
  assistantProvider: { name: "browser-capture", async *streamJson(request) {
    requests.push(request);
    yield JSON.stringify({ replyKind: "answer", dialogue: "我是小麦老师，正在依据当前页面回答。", actions: [], schema: "edu.classroom.assistant.response", version: "1.0" });
  } }
});
const apiOrigin = await app.listen({ host: "127.0.0.1", port: 0 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const base = process.env.EDU_PROMPT_QA_BASE ?? "http://127.0.0.1:5173";
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
await page.route("**/api/**", async (route: any) => {
  const original = new URL(route.request().url());
  const response = await route.fetch({ url: `${apiOrigin}${original.pathname}${original.search}` });
  await route.fulfill({ response });
});
const checks: string[] = [];
async function layout(name: string) {
  const problems = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    outside: [...document.querySelectorAll(".assistant-prompt-editor button,.assistant-prompt-editor textarea,.assistant-prompt-editor select")].filter(element => {
      const r = element.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
    }).map(element => element.textContent)
  }));
  assert.equal(problems.overflow, false, name);
  assert.deepEqual(problems.outside, [], name);
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
  checks.push(name);
}
try {
  await page.goto(`${base}/courses/course-port-management-intro/assistant-prompts`);
  await page.getByLabel("教师提示词", { exact: true }).waitFor();
  await page.getByRole("button", { name: "1 · 总AI Agent", exact: true }).waitFor();
  for (const [scope, label] of [["agent", "1 · 总AI Agent"], ["course", "2 · 课程"], ["lesson", "3 · 章／讲"], ["page", "4 · Slide／实验"], ["tools", "5 · 工具"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const textarea = page.getByLabel("教师提示词", { exact: true });
    await textarea.fill(`浏览器验证_${scope}：保持教师控制节奏。`);
    assert.equal(await page.getByLabel("选择Slide").isDisabled(), true);
    await page.getByRole("button", { name: "保存修改", exact: true }).click();
    await page.getByText("已保存到服务器，下次调用小麦老师时生效。正在播报的回答保持原样。", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "保存修改", exact: true }).isDisabled(), true);
  }
  await layout("editor-desktop");
  const workspace = (await app.inject("/api/courses/course-port-management-intro/assistant-prompts")).json();
  assert.equal(workspace.revision, 5);
  assert.ok(workspace.modules.every((m: any) => m.overridden));
  const session = (await app.inject({ method: "POST", url: "/api/courses/course-port-management-intro/class-sessions" })).json();
  for (const source of ["text", "voice_asr"]) {
    await app.inject({ method: "POST", url: `/api/class-sessions/${session.id}/assistant/turns`, payload: { text: "解释这一页", source } });
    const preview = (await app.inject(`/api/class-sessions/${session.id}/assistant-prompts`)).json();
    assert.equal(requests.at(-1)!.messages[0]!.content, preview.compiled);
    for (const scope of ["agent", "course", "lesson", "page", "tools"]) assert.ok(preview.compiled.includes(`浏览器验证_${scope}`));
  }
  checks.push("browser-saved-five-modules-reach-text-and-voice-provider");
  await page.reload();
  await page.getByLabel("教师提示词", { exact: true }).waitFor();
  await page.waitForFunction(() => (document.querySelector('textarea[aria-label="教师提示词"]') as HTMLTextAreaElement)?.value.includes("浏览器验证_agent"));
  await page.getByRole("button", { name: "恢复默认", exact: true }).click();
  await page.getByText("已恢复默认提示词，下次调用生效。", { exact: true }).waitFor();
  assert.match(await page.getByLabel("教师提示词", { exact: true }).inputValue(), /你叫小麦老师/);
  await page.setViewportSize({ width: 390, height: 844 });
  await layout("editor-narrow");
  await page.getByLabel("选择讲次").selectOption("2");
  await page.getByRole("button", { name: "4 · Slide／实验", exact: true }).click();
  assert.doesNotMatch(await page.getByLabel("教师提示词", { exact: true }).inputValue(), /浏览器验证_page/);
  await page.getByLabel("选择Slide").selectOption("58");
  await page.waitForFunction(() => (document.querySelector('textarea[aria-label="教师提示词"]') as HTMLTextAreaElement)?.value.includes("VGM：装船前的总质量"));
  const richPrompt = await page.getByLabel("教师提示词", { exact: true }).inputValue();
  assert.match(richPrompt, /【问题从何而来】/);
  assert.match(richPrompt, /封志与箱号记录/);
  assert.match(richPrompt, /截止时间与交付窗口/);
  await layout("slide-context-narrow");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await layout("slide-context-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("选择页面或实验").selectOption("simulation");
  await page.waitForFunction(() => (document.querySelector('textarea[aria-label="教师提示词"]') as HTMLTextAreaElement)?.value.includes("船舶到港"));
  await layout("simulation-narrow");
  await page.goto(`${base}/courses/course-economic-mathematics/assistant-prompts`);
  await page.getByText("已配置 1460 / 1460 页", { exact: false }).waitFor();
  await page.getByLabel("选择讲次").selectOption("32");
  await page.getByRole("button", { name: "3 · 章／讲", exact: true }).click();
  assert.match(await page.getByLabel("教师提示词", { exact: true }).inputValue(), /本讲核心问题/);
  await layout("mathematics-narrow");
  await page.getByRole("button", { name: "4 · Slide／实验", exact: true }).click();
  assert.match(await page.getByLabel("教师提示词", { exact: true }).inputValue(), /【本页材料与概念联系】/);
  await layout("mathematics-slide-context-narrow");
  assert.deepEqual(errors, []);
  await writeFile(join(output, "checks.json"), JSON.stringify({ checks, providerCalls: requests.length, errors }, null, 2));
  console.log(JSON.stringify({ checks, providerCalls: requests.length, errors }));
} finally {
  await browser.close(); await app.close();
  await rm(directory, { recursive: true, force: true });
}
