// Start with: pnpm --filter @edu/platform-api exec tsx scripts/defense-qa-server.ts
// Uses fixture accounts and a deterministic model; no live provider calls.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const modulePath = process.env.PLAYWRIGHT_MODULE || '.runtime/browser-qa/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const base = process.env.DEFENSE_QA_ORIGIN || 'http://127.0.0.1:4312';
const out = resolve('output/defense-qa'); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const checks = [], errors = [];
const teacher = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const student = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
async function login(context, username) { const r = await context.request.post(`${base}/api/identity/login`, { data: { username, password: 'defense-fixture-password' } }); assert.equal(r.status(), 200); }
async function check(name, fn) { await fn(); checks.push(name); console.log(name); }
const t = await teacher.newPage(), s = await student.newPage();
for (const page of [t, s]) page.on('pageerror', e => errors.push(e.message));
try {
  await login(teacher, 'defense-teacher'); await login(student, 'defense-student');
  await check('teacher creates and publishes task from the course defense entry', async () => {
    await t.goto(`${base}/defenses?course=course-economic-mathematics`);
    await t.getByRole('button', { name: '新建答辩作业' }).click();
    await t.getByLabel('作业名称', { exact: true }).fill('容量方案分析与答辩 · 浏览器验收');
    await t.getByLabel('作业要求', { exact: true }).fill('比较每小时120件和150件的容量方案，在峰值需求为130件时选择方案。说明假设、计算步骤和结果检验，并讨论峰值变化。');
    await t.getByLabel('教师参考答案与评分要点（仅教师可见）').fill('TEACHER_PRIVATE_REFERENCE 方案B有20件余量，需说明峰值假设。');
    await t.getByRole('button', { name: '保存草稿', exact: true }).click();
    await t.getByRole('button', { name: '发布给本课程学生' }).click();
    await t.getByRole('button', { name: '停止收取新解答' }).waitFor();
    await t.screenshot({ path: `${out}/teacher-assignment.png`, fullPage: true });
  });
  const assignmentUrl = t.url();
  await check('student submits answer without teacher reference exposure', async () => {
    await s.goto(assignmentUrl);
    await s.getByLabel('解答正文', { exact: true }).fill('峰值需求为每小时130件。方案A能力为每小时120件，不满足需求。方案B能力为每小时150件，余量为每小时20件。我选择方案B，并假设峰值不会持续增长。');
    await s.getByLabel('工具与AI使用说明（可选）').fill('用AI辅助整理了措辞，容量比较由自己检验。');
    assert.ok(!(await s.locator('main').innerText()).includes('TEACHER_PRIVATE_REFERENCE'));
    await s.getByRole('button', { name: '提交并锁定解答，进入答辩' }).click();
    await s.getByRole('button', { name: '开始答辩', exact: true }).click();
    await s.getByLabel('你的回答', { exact: true }).waitFor();
  });
  const sessionUrl = s.url();
  await check('student draft survives reload and each answer advances exactly once', async () => {
    await s.getByLabel('你的回答', { exact: true }).fill('先统一时间单位，再比较130与150，差值为20件每小时。');
    await s.reload(); await s.getByLabel('你的回答', { exact: true }).waitFor();
    assert.equal(await s.getByLabel('你的回答', { exact: true }).inputValue(), '先统一时间单位，再比较130与150，差值为20件每小时。');
    for (let i = 0; i < 4; i++) {
      await s.getByLabel('你的回答', { exact: true }).fill(`第${i + 1}题：我比较峰值130件和能力150件，余量为20件；若需求超过150件，则需要重新核算方案和安全余量。`);
      await s.getByRole('button', { name: '提交本题回答', exact: true }).click();
      await s.getByRole('button', { name: i === 3 ? '完成答辩' : '获取下一题', exact: true }).click();
    }
    await s.getByRole('heading', { name: '答辩已完成', exact: true }).waitFor();
    assert.equal(await s.locator('.defense-question').count(), 4);
    assert.ok((await s.locator('main').innerText()).includes('规则追问'));
    await s.screenshot({ path: `${out}/student-completed-desktop.png`, fullPage: true });
  });
  await check('teacher adds a specific follow-up after completion and student resumes', async () => {
    await t.goto(sessionUrl);
    await t.getByText('追加一次教师追问（可用于现场答辩）', { exact: true }).click();
    await t.getByLabel('教师问题', { exact: true }).fill('如果峰值从130增加到160件，方案B还满足约束吗？请计算缺口。');
    await t.getByRole('button', { name: '发送追问', exact: true }).click();
    await t.getByText('等待学生回答', { exact: true }).waitFor();
    await s.getByRole('button', { name: '刷新进度', exact: true }).click();
    await s.getByLabel('你的回答', { exact: true }).fill('方案B每小时只能处理150件，不满足160件的峰值，每小时有10件的缺口。');
    await s.getByRole('button', { name: '提交本题回答', exact: true }).click();
    await s.getByRole('button', { name: '完成答辩', exact: true }).click();
    await s.getByRole('heading', { name: '答辩已完成', exact: true }).waitFor();
  });
  await check('teacher saves private evaluation then explicitly releases it', async () => {
    await t.getByRole('button', { name: '刷新进度', exact: true }).click();
    await t.getByLabel('思路解释等级').waitFor();
    for (const label of ['思路解释', '概念理解', '检验纠错', '迁移应用']) await t.getByLabel(`${label}等级`).selectOption('3');
    for (const item of await t.getByLabel('评价依据', { exact: true }).all()) await item.fill('能根据本人解答解释计算依据，并计算条件变化后的缺口。');
    await t.getByLabel('综合反馈', { exact: true }).fill('PRIVATE_FEEDBACK 已展示容量比较与条件迁移能力，继续练习模型假设检验。');
    await t.getByRole('button', { name: '保存教师评价（暂不公布）', exact: true }).click();
    await t.getByText(/已保存教师评价：75/).waitFor();
    await s.getByRole('button', { name: '刷新进度', exact: true }).click();
    assert.ok(!(await s.locator('main').innerText()).includes('PRIVATE_FEEDBACK'));
    await t.getByLabel('公布本次评价给学生').check();
    await t.getByRole('button', { name: '保存并公布教师评价', exact: true }).click();
    await t.getByText(/已保存教师评价：75.*已公布/).waitFor();
    await s.getByRole('button', { name: '刷新进度', exact: true }).click();
    await s.getByRole('heading', { name: '教师评价：75 / 100', exact: true }).waitFor();
    assert.ok((await s.locator('main').innerText()).includes('PRIVATE_FEEDBACK'));
  });
  await check('desktop and mobile pages remain within viewport and preserve roles', async () => {
    for (const width of [1440, 390]) {
      for (const [role, page] of [['teacher', t], ['student', s]]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role} overflow at ${width}`);
        assert.equal(await page.locator('main').getByText('TEACHER_PRIVATE_REFERENCE', { exact: false }).count() > 0, false);
        await page.screenshot({ path: `${out}/${role}-session-${width}.png`, fullPage: true });
      }
    }
    assert.equal(await s.locator('.defense-evaluation').count(), 0);
    assert.equal(await s.locator('.defense-teacher').count(), 0);
    await s.goto(`${base}/defenses`); await s.getByRole('heading', { name: '作业答辩', exact: true }).waitFor();
    await s.screenshot({ path: `${out}/student-hub-mobile.png`, fullPage: true });
    assert.ok(await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
  assert.equal(errors.length, 0, errors.join('\n'));
} catch (error) {
  await t.screenshot({ path: `${out}/failure-teacher.png`, fullPage: true }).catch(() => {});
  await s.screenshot({ path: `${out}/failure-student.png`, fullPage: true }).catch(() => {});
  console.log('Student URL:', s.url(), '\n', await s.locator('body').innerText().catch(() => ''));
  throw error;
} finally { await writeFile(`${out}/summary.json`, JSON.stringify({ base, checks, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify({ checks: checks.length, errors }));
