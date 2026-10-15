import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import {
    applyPortCommand, createPortSession, defaultPortConfig, servicePortReference, serializePortSession
} from "../packages/port-simulation-core/src/index.ts";

const { chromium } = createRequire("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js")("playwright");
const base = process.env.PORT_OPS_TEST_URL ?? "http://127.0.0.1:5173";
const out = new URL("../output/port-learning-qa/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const errors: string[] = [], checks: string[] = [];
const consoleErrors: string[] = [];
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pass = (s: string) => { checks.push(s); console.log(`PASS ${s}`); };
function sample(hours: number, outage = false) {
    const s = createPortSession("practice", { ...defaultPortConfig(), disruption: outage ? "outage" : "none" });
    applyPortCommand(s, { kind: "start" });
    let iterations = 0;
    while (s.second < hours * 3600 && iterations++ < 5000) {
        servicePortReference(s, 2);
        if (s.status === "paused") applyPortCommand(s, { kind: "resume" });
        applyPortCommand(s, { kind: "advance", seconds: Math.min(120, hours * 3600 - s.second) });
    }
    assert.equal(s.second, hours * 3600);
    if (s.status === "running") applyPortCommand(s, { kind: "pause" });
    return serializePortSession(s);
}
const normal = sample(6), fault = sample(18, true);
console.log("Prepared replayable baseline and fault runs through actual business commands.");
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("console", (m: any) => { if (m.type() === "error") consoleErrors.push(m.text()); });
await page.addInitScript(() => {
    const target = window as any;
    target.__portWall = 0;
    target.__portMessages = 0;
    target.__portDraws = 0;
    for (const method of ["drawElements", "drawArrays"] as const) {
        const draw = WebGL2RenderingContext.prototype[method];
        (WebGL2RenderingContext.prototype as any)[method] = function (...args: any[]) {
            target.__portDraws++;
            return (draw as any).apply(this, args);
        };
    }
    const originalNow = Date.now();
    Date.now = () => originalNow + target.__portWall;
    const Original = window.Worker;
    window.Worker = class extends Original {
        constructor(...args: ConstructorParameters<typeof Worker>) {
            super(...args);
            this.addEventListener("message", e => { if (e.data.view) { target.__portView = e.data.view; target.__portMessages++; } });
        }
    };
});
const view = () => page.evaluate(() => (window as any).__portView);
const tab = async (name: string) => page.getByRole("navigation", { name: "业务工作台" }).getByRole("button", { name, exact: true }).click();
async function importRun(raw: string) {
    const before = await page.evaluate(() => (window as any).__portMessages);
    await page.locator('input[type="file"]').setInputFiles({ name: "port-test.json", mimeType: "application/json", buffer: Buffer.from(raw) });
    await page.waitForFunction(before => (window as any).__portMessages > before && (window as any).__portView?.status === "paused", before);
    await page.getByRole("button", { name: "保存为基准", exact: true }).waitFor();
}
try {
    await page.goto(`${base}/port-simulation-preview.html?course=full`);
    await page.waitForFunction(() => (window as any).__portView?.status === "ready");
    await page.locator('[data-renderer="ready"]').waitFor({ timeout: 90000 });
    await tab("实验分析");
    await page.getByLabel("观察终点小时").fill("0.1");
    await page.getByRole("button", { name: "设置观察终点", exact: true }).click();
    await page.getByRole("button", { name: "开始值班", exact: true }).click();
    await page.waitForFunction(() => ["running", "paused"].includes((window as any).__portView?.status));
    for (let i = 0; i < 20 && (await view()).second < 360; i++) {
        if ((await view()).status === "paused") {
            const before = await page.evaluate(() => (window as any).__portMessages);
            await page.getByRole("button", { name: "继续运行", exact: true }).first().click();
            await page.waitForFunction(before => (window as any).__portMessages > before, before);
        }
        await page.evaluate(() => { (window as any).__portWall += 20000; });
        await page.waitForFunction(() => (window as any).__portView?.status === "paused" && (window as any).__portMessages > 0);
    }
    await page.waitForFunction(() => (window as any).__portView?.second === 360 && (window as any).__portView?.status === "paused");
    pass("actual worker advancement stops exactly at the observation endpoint");
    await page.getByRole("button", { name: "取消观察终点", exact: true }).click();
    await page.getByLabel("改善假设", { exact: true }).fill("闸口接续受限；增加岸桥可能只扩大堆场积压。");
    await importRun(normal);
    await page.getByRole("button", { name: "保存为基准", exact: true }).click();
    await page.getByRole("button", { name: "保存为试验", exact: true }).click();
    await page.getByText("两份记录来自同一场次，只能观察过程变化。", { exact: true }).waitFor();
    pass("the UI rejects same-run snapshots as an independent paired experiment");
    await page.waitForTimeout(100);
    await importRun(normal);
    await page.getByRole("button", { name: "保存为试验", exact: true }).click();
    await page.getByText("观察条件匹配", { exact: true }).waitFor();
    pass("two replayed runs with the same cohort and endpoint pass the condition checks");
    const jsonDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出实验与复盘JSON", exact: true }).click();
    const jsonPath = new URL("learning.json", out);
    await (await jsonDownload).saveAs(jsonPath.pathname.replace(/^\/(\w:)/, "$1"));
    const data = JSON.parse(await fs.readFile(jsonPath, "utf8"));
    assert.equal(data.baseline.second, 21600); assert.equal(data.trial.second, 21600);
    assert.notEqual(data.baseline.runId, data.trial.runId);
    assert.ok(!/"(actorId|studentId|token|authorization|issueExpected|ata)"/.test(JSON.stringify(data)));
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出逐船CSV", exact: true }).click();
    const csvPath = new URL("vessels.csv", out);
    await (await csvDownload).saveAs(csvPath.pathname.replace(/^\/(\w:)/, "$1"));
    assert.match(await fs.readFile(csvPath, "utf8"), /完整周转分钟/);
    pass("JSON and CSV exports retain observation provenance and exclude identity or latent state");
    await tab("调度"); await tab("实验分析");
    assert.match(await page.getByLabel("改善假设", { exact: true }).inputValue(), /闸口接续/);
    await page.reload();
    await page.waitForFunction(() => (window as any).__portView?.status === "paused");
    await tab("实验分析");
    assert.match(await page.getByLabel("改善假设", { exact: true }).inputValue(), /闸口接续/);
    await page.getByText("观察条件匹配", { exact: true }).waitFor();
    pass("drafts and paired records survive workbench switching and page refresh");
    await importRun(fault);
    assert.equal((await view()).failedCrane, 0);
    const options = page.getByLabel("当前异常证据");
    const faultOption = await options.locator("option").filter({ hasText: "岸桥1故障" }).getAttribute("value");
    await options.selectOption(faultOption!);
    await page.getByRole("button", { name: "固定本次证据", exact: true }).click();
    await page.getByLabel("屏障与依赖", { exact: true }).fill("设备状态和维修安排分别核对；调度岗位不得把维修委托当成维修完成。");
    await tab("调度");
    await page.getByRole("button", { name: "委托维修", exact: true }).click();
    await page.waitForFunction(() => (window as any).__portView?.repairPending);
    await tab("实验分析");
    await page.getByText("原设备仍标记故障；维修处理中。", { exact: true }).waitFor();
    pass("risk review follows an actual equipment fault and the actual repair command");
    await page.getByText("速度与辅助工具", { exact: true }).click();
    await page.getByRole("button", { name: "舞台全屏", exact: true }).click();
    await page.locator('.port-ops[data-stage-fullscreen="true"]').waitFor();
    assert.match(await page.getByLabel("改善假设", { exact: true }).inputValue(), /闸口接续/);
    assert.match(await page.getByLabel("屏障与依赖", { exact: true }).inputValue(), /维修委托/);
    assert.equal((await view()).second, 18 * 3600);
    await page.getByRole("button", { name: "退出舞台全屏", exact: true }).click();
    await page.locator('.port-ops[data-stage-fullscreen="false"]').waitFor();
    pass("fullscreen keeps the same run, paused time and experiment drafts");
    const beforeDraw = await page.evaluate(() => (window as any).__portDraws);
    await page.locator(".port-scene-wrap").scrollIntoViewIfNeeded();
    await page.waitForFunction(before => (window as any).__portDraws > before, beforeDraw);
    await page.waitForTimeout(500);
    await page.locator(".port-scene-wrap").screenshot({ path: new URL("scene.png", out).pathname.replace(/^\/(\w:)/, "$1") });
    await page.screenshot({ path: new URL("desktop.png", out).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
    for (const width of [1600, 390]) {
        await page.setViewportSize({ width, height: width === 1600 ? 1100 : 844 });
        await page.getByLabel("经营影响与交接", { exact: true }).fill("复核积压与未完任务，保留维修中的交接责任。");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    }
    await page.screenshot({ path: new URL("narrow.png", out).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
    pass("desktop and narrow workbenches accept input without document overflow");
    assert.deepEqual(errors, []);
    await fs.writeFile(new URL("browser.json", out), JSON.stringify({ base, checks, errors, consoleErrors }, null, 2));
} catch (e) {
    await page.screenshot({ path: new URL("failure.png", out).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true }).catch(() => {});
    await fs.writeFile(new URL("failure.json", out), JSON.stringify({ checks, errors, consoleErrors, error: String(e), lastView: await view().catch(() => null) }, null, 2));
    throw e;
} finally { await browser.close(); }
