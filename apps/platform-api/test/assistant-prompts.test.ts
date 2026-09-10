import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AssistantPromptWorkspace, AssistantPromptSettings } from "@edu/contracts";
import { COURSE_DECKS } from "@edu/course-content/deck-registry";
import { ECONOMIC_MATHEMATICS_SLIDES } from "@edu/course-content/economic-mathematics";
import { buildPromptWorkspace, promptStorageKey } from "../src/assistant/prompts.js";
import { buildSlidePromptContext } from "../src/assistant/slide-prompts.js";
import { buildApp } from "../src/app.js";
import type { AssistantJsonStreamProvider, AssistantJsonStreamRequest } from "../src/assistant/provider.js";

const port = "course-port-management-intro";
const math = "course-economic-mathematics";
class CaptureProvider implements AssistantJsonStreamProvider {
  name = "capture-prompts";
  requests: AssistantJsonStreamRequest[] = [];
  async *streamJson(request: AssistantJsonStreamRequest) {
    this.requests.push(request);
    const study = request.messages[0]!.content.includes("edu.study.assistant.response");
    yield JSON.stringify({ ...(study ? {} : { replyKind: "answer" }), dialogue: "验证回答", actions: [], schema: study ? "edu.study.assistant.response" : "edu.classroom.assistant.response", version: "1.0" });
  }
}

test("every registered slide and experiment resolves five nonempty, correctly scoped prompt modules", () => {
  let checked = 0;
  for (const deck of COURSE_DECKS) {
    for (let index = 1; index <= deck.slideTotal; index++) {
      const workspace = buildPromptWorkspace(deck.courseId, deck.title, undefined, index);
      assert.deepEqual(workspace.modules.map(m => m.scope), ["agent", "course", "lesson", "page", "tools"]);
      assert.equal(workspace.compiled.match(/<prompt_module scope=/g)?.length, 5);
      for (const module of workspace.modules) assert.ok(module.text.trim() && module.runtimeContext.trim(), `${deck.courseId}/${index}/${module.scope}`);
      const slide = deck.getSlide(index);
      assert.equal(workspace.modules[2]!.key, `${deck.courseId}:${slide.lessonNumber}`);
      assert.equal(workspace.modules[3]!.key, `${deck.courseId}:${slide.slideKey}`);
      assert.ok(workspace.compiled.includes(`key="${slide.slideKey}"`));
      const page = workspace.modules[3]!;
      for (const heading of ["本页定位", "问题从何而来", "本页材料与概念联系", "后续如何使用", "综合回答方式", "本页专属约束"]) {
        assert.ok(page.defaultText.includes(`【${heading}】`), `${slide.slideKey}/${heading}`);
      }
      assert.ok(page.defaultText.length >= 500 && page.defaultText.length < 7000, `${slide.slideKey}: ${page.defaultText.length}`);
      assert.ok(workspace.compiled.includes("【问题从何而来】"), `${slide.slideKey}: contextual material reaches provider even when withheld`);
      assert.match(workspace.compiled, /小麦老师/);
      assert.doesNotMatch(workspace.compiled, /你是.*(?:澜舟|经数助教|港航教学助手)/);
      checked++;
    }
    for (const activity of deck.allowedActivities.filter(a => a !== "slides")) {
      const workspace = buildPromptWorkspace(deck.courseId, deck.title, undefined, 1, activity);
      assert.equal(workspace.modules[3]!.key, `${deck.courseId}:experiment:${activity}`);
      assert.ok(workspace.modules[3]!.text.length > 30);
      assert.match(workspace.compiled, new RegExp(`当前活动：${activity}`));
    }
  }
  assert.equal(checked, 1613);
});

test("page context explains actual antecedents without importing later solutions or stale laboratory results", () => {
  const portDeck = COURSE_DECKS.find(d => d.courseId === port)!;
  const target = portDeck.getSlideByKey("l2-lbl-vgm")!;
  const workspace = buildPromptWorkspace(port, portDeck.title, undefined, target.index);
  const page = workspace.modules[3]!;
  assert.match(page.text, /封志与箱号记录/);
  assert.match(page.text, /货物移动，信息也在流动/);
  assert.match(page.text, /质量信息和截止窗口共同形成交接条件/);
  assert.match(page.text, /截止时间与交付窗口/);
  assert.doesNotMatch(workspace.compiled, /仅使用本页与已列来源解释/);
  const custom = buildPromptWorkspace(port, portDeck.title, {
    revision: 1, overrides: { [promptStorageKey("page", page.key)]: "教师自定义：用一分钟综合解释" }
  }, target.index);
  assert.equal(custom.modules[3]!.text, "教师自定义：用一分钟综合解释");
  assert.match(custom.compiled, /封志与箱号记录/);

  const mathDeck = COURSE_DECKS.find(d => d.courseId === math)!;
  const targetMath = ECONOMIC_MATHEMATICS_SLIDES.find(s => s.kind === "exercise")!;
  const actualSummary = mathDeck.getSlide(targetMath.index);
  const neighboring = { ...mathDeck, getSlide(index: number) {
    const slide = mathDeck.getSlide(index);
    return index === targetMath.index ? slide : { ...slide, title: "NEIGHBOR_TITLE_SECRET", summary: "NEIGHBOR_ANSWER_SECRET" };
  } };
  // Forward navigation may expose only the role of the next mathematics page,
  // even if its title itself contains the answer.
  const support = buildSlidePromptContext(neighboring, actualSummary, undefined, targetMath, true).support;
  const future = support.split("【后续如何使用】")[1]!.split("【综合回答方式】")[0]!;
  assert.doesNotMatch(future, /NEIGHBOR_TITLE_SECRET|NEIGHBOR_ANSWER_SECRET/);
  assert.doesNotMatch(support, new RegExp(targetMath.assistantCue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const firstOfSecond = buildPromptWorkspace(math, mathDeck.title, undefined, mathDeck.lessons[1]!.slideStart).modules[3]!.text;
  assert.match(firstOfSecond, /上一讲主题/);
  assert.doesNotMatch(firstOfSecond, /第1讲第\d+页/);
});

test("custom answers remain absent from unrevealed exercise and laboratory prompts", () => {
  for (const slide of ECONOMIC_MATHEMATICS_SLIDES.filter(s => s.kind === "exercise" || s.interactionId)) {
    const settings: AssistantPromptSettings = { revision: 1, overrides: { [promptStorageKey("page", `${math}:${slide.slideKey}`)]: "SECRET_CUSTOM_ANSWER" } };
    const workspace = buildPromptWorkspace(math, "经济数学", settings, slide.index);
    if (workspace.compiled.includes("当前页答案尚未揭示")) assert.doesNotMatch(workspace.compiled, /SECRET_CUSTOM_ANSWER/);
    assert.equal(workspace.modules[3]!.text, "SECRET_CUSTOM_ANSWER", "teacher can still review and edit the stored page prompt");
  }
});

test("teacher editing persists, scopes overrides, detects conflicts and injects the exact preview into text and voice calls", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-prompts-"));
  const dataFile = join(directory, "state.json");
  const provider = new CaptureProvider();
  let app = await buildApp({ dataFile, assistantProvider: provider, portSimulationTickMs: 0 });
  const endpoint = `/api/courses/${port}/assistant-prompts`;
  try {
    let workspace = (await app.inject(endpoint)).json<AssistantPromptWorkspace>();
    for (const module of workspace.modules) {
      const saved = await app.inject({ method: "PATCH", url: endpoint, payload: { scope: module.scope, key: module.key, text: `CUSTOM_${module.scope}`, expectedRevision: workspace.revision } });
      assert.equal(saved.statusCode, 200, saved.body);
      workspace = saved.json();
    }
    const invalid = await app.inject({ method: "PATCH", url: endpoint, payload: { scope: "page", key: `${math}:foreign`, text: "wrong course", expectedRevision: workspace.revision } });
    assert.equal(invalid.statusCode, 400);
    const stale = await app.inject({ method: "PATCH", url: endpoint, payload: { scope: "agent", key: "global", text: "stale", expectedRevision: 0 } });
    assert.equal(stale.statusCode, 409);
    const otherCourse = (await app.inject(`/api/courses/${math}/assistant-prompts`)).json<AssistantPromptWorkspace>();
    assert.equal(otherCourse.modules[0]!.text, "CUSTOM_agent");
    assert.equal(otherCourse.modules[1]!.overridden, false);
    const session = (await app.inject({ method: "POST", url: `/api/courses/${port}/class-sessions` })).json();
    const previewUrl = `/api/class-sessions/${session.id}/assistant-prompts`;
    const turnUrl = `/api/class-sessions/${session.id}/assistant/turns`;
    for (const source of ["text", "voice_asr"]) {
      const preview = (await app.inject(previewUrl)).json<AssistantPromptWorkspace>();
      const response = await app.inject({ method: "POST", url: turnUrl, payload: { text: "请解释当前页", source } });
      assert.match(response.body, /turn.completed/);
      assert.equal(provider.requests.at(-1)!.messages[0]!.content, preview.compiled);
      for (const module of workspace.modules) assert.ok(preview.compiled.includes(`CUSTOM_${module.scope}`));
    }
    assert.equal(provider.requests.at(-1)!.messages.length, 4, "same-page conversation retained");
    await app.inject({ method: "POST", url: `/api/class-sessions/${session.id}/events`, payload: { type: "set_slide", index: 48 } });
    await app.inject({ method: "POST", url: turnUrl, payload: { text: "当前页", source: "text" } });
    const changed = provider.requests.at(-1)!;
    assert.equal(changed.messages.length, 2, "previous page answers excluded");
    assert.doesNotMatch(changed.messages[0]!.content, /CUSTOM_page|CUSTOM_lesson/);
    assert.match(changed.messages[0]!.content, /CUSTOM_course|CUSTOM_agent/);
    const student = await app.inject({ method: "POST", url: "/api/identity/development/session", payload: { role: "student" } });
    const cookie = String(student.headers["set-cookie"]).split(";")[0]!;
    for (const url of [endpoint, previewUrl]) assert.equal((await app.inject({ url, headers: { cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: "PATCH", url: endpoint, headers: { cookie }, payload: { scope: "agent", key: "global", text: "bad", expectedRevision: 5 } })).statusCode, 403);
    const snapshot = await app.inject({ url: `/api/class-sessions/${session.id}/snapshot`, headers: { cookie } });
    assert.doesNotMatch(snapshot.body, /CUSTOM_|prompt_module|overrides/);
    const study = (await app.inject({ method: "POST", url: "/api/study-sessions", payload: { courseId: port } })).json();
    assert.ok(study.id, JSON.stringify(study));
    const studyResult = await app.inject({ method: "POST", url: `/api/study-sessions/${study.id}/assistant/turns`, payload: { text: "解释", source: "text" } });
    assert.equal(studyResult.statusCode, 200, studyResult.body);
    assert.match(provider.requests.at(-1)!.messages[0]!.content, /CUSTOM_agent/);
    assert.match(provider.requests.at(-1)!.messages[0]!.content, /edu.study.assistant.response/);
    await app.close();
    app = await buildApp({ dataFile, assistantProvider: provider, portSimulationTickMs: 0 });
    const restored = (await app.inject(endpoint)).json<AssistantPromptWorkspace>();
    assert.equal(restored.revision, 5);
    assert.ok(restored.modules.every(m => m.overridden));
    const reset = await app.inject({ method: "PATCH", url: endpoint, payload: { scope: "agent", key: "global", text: null, expectedRevision: 5 } });
    assert.equal(reset.statusCode, 200);
    assert.equal(reset.json<AssistantPromptWorkspace>().modules[0]!.overridden, false);
    assert.match(reset.json<AssistantPromptWorkspace>().modules[0]!.text, /小麦老师/);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
