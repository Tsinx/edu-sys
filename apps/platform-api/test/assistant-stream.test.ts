import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type {
  AssistantJsonStreamProvider,
  AssistantJsonStreamRequest
} from "../src/assistant/provider.js";
import { buildApp } from "../src/app.js";
import { ClassroomAssistantOrchestrator } from "../src/assistant/orchestrator.js";
import { classroomSnapshotSchema } from "@edu/contracts";

class QueuedAssistantProvider implements AssistantJsonStreamProvider {
  readonly name = "queued-test-provider";
  readonly requests: AssistantJsonStreamRequest[] = [];

  constructor(private readonly responses: string[]) {}

  async *streamJson(
    request: AssistantJsonStreamRequest
  ): AsyncGenerator<string> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (!response) throw new Error("测试响应队列为空");
    for (let index = 0; index < response.length; index += 3) {
      yield response.slice(index, index + 3);
    }
  }
}

function parseSseEvents(raw: string): Array<Record<string, unknown>> {
  return raw
    .split(/\r?\n\r?\n/u)
    .flatMap((block) =>
      block
        .split(/\r?\n/u)
        .filter((line) => line.startsWith("data: "))
        .map((line) =>
          JSON.parse(line.slice("data: ".length)) as Record<
            string,
            unknown
          >
        )
    );
}

test("assistant SSE suppresses legacy control acknowledgements and validates actions before execution", async () => {
  const tempDirectory = await mkdtemp(
    join(tmpdir(), "edu-assistant-stream-")
  );
  const provider = new QueuedAssistantProvider([
    JSON.stringify({
      actions: [{ type: "slides.next" }],
      schema: "edu.classroom.assistant.response",
      version: "1.0",
      dialogue: "我们翻到下一页，继续看港口功能。"
    }),
    '{"dialogue":"这段可以显示，但不能执行动作。","actions":[{"type":"slides.next"}],"schema":"wrong","version":"1.0"}'
  ]);
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    assistantProvider: provider
  });

  try {
    const classResponse = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = classResponse.json().id as string;

    const firstResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/assistant/turns`,
      payload: {
        text: "下一页",
        source: "text"
      }
    });
    assert.equal(firstResponse.statusCode, 200);
    assert.match(
      firstResponse.headers["content-type"] ?? "",
      /text\/event-stream/
    );

    const firstEvents = parseSseEvents(firstResponse.body);
    assert.equal(firstEvents[0]?.type, "turn.started");
    const dialogue = firstEvents
      .filter((event) => event.type === "dialogue.delta")
      .map((event) => event.delta)
      .join("");
    assert.equal(dialogue, "");
    assert.equal(firstEvents.at(-1)?.dialogue, "");
    assert.equal(
      firstEvents.some((event) => event.type === "control.result"),
      true
    );
    assert.equal(
      firstEvents.at(-1)?.type,
      "turn.completed"
    );
    assert.doesNotMatch(dialogue, /slides|schema|version/);

    const snapshotAfterValid = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`
    });
    assert.equal(snapshotAfterValid.json().slide.index, 2);

    const invalidResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/assistant/turns`,
      payload: {
        text: "再下一页",
        source: "voice_asr"
      }
    });
    const invalidEvents = parseSseEvents(invalidResponse.body);
    assert.equal(
      invalidEvents.some((event) => event.type === "dialogue.delta"),
      false
    );
    assert.equal(invalidEvents.at(-1)?.type, "turn.failed");
    assert.equal(
      invalidEvents.some((event) => event.type === "control.result"),
      false
    );

    const snapshotAfterInvalid = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/snapshot`
    });
    assert.equal(snapshotAfterInvalid.json().slide.index, 2);
    assert.equal(provider.requests.length, 2);
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /当前 Slides：第 1\/47 页（内部全局第 1\/153 页）/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /用户只说“第X页”时，默认指当前第1讲的第X页/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /第1讲“英国如何把贸易变成影响力？”：学生可见第1—47页，内部全局第1—47页/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /<voyage_context id="oocl-spain-ll3-2023">/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /<lesson_context number="1" title="英国如何把贸易变成影响力？">/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /<slide_context index="1" local_index="1" local_total="47" key="l1-course-cover" title="港口管理概论">/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /真实资料、教学情境或概念模型/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /教学情境必须说“在本教学情境中”/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /"type":"lesson\.go_to"/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /"type":"globe\.play_cue"/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /l1-opening-trade-influence/
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /正式封面.*不得直接播放地球仪/u
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /当前页为 l1-1700-wager/u
    );
    assert.match(
      provider.requests[0]?.messages[0]?.content ?? "",
      /不得生成经纬度、持续时间、字幕或任意相机轨迹/
    );
    assert.doesNotMatch(
      provider.requests[0]?.messages[0]?.content ?? "",
      /左侧深色区覆盖/
    );
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("control-only turns stay silent while questions and explicitly requested explanations remain spoken", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-assistant-silent-"));
  const cases = [
    { text: "下一页", replyKind: "control", dialogue: "", actions: [{ type: "slides.next" }], index: 2, spoken: "" },
    { text: "上一页", replyKind: "control", dialogue: "好的，已经为您翻页。", actions: [{ type: "slides.previous" }], index: 1, spoken: "" },
    { text: "翻到下一页并讲解", replyKind: "answer", dialogue: "港口连接水运与陆运。", actions: [{ type: "slides.next" }], index: 2, spoken: "港口连接水运与陆运。" },
    { text: "为什么需要港口？", replyKind: "answer", dialogue: "港口承担货物换装与集散。", actions: [], index: 2, spoken: "港口承担货物换装与集散。" }
  ];
  const provider = new QueuedAssistantProvider(cases.map(item => JSON.stringify({
    replyKind: item.replyKind, dialogue: item.dialogue, actions: item.actions,
    schema: "edu.classroom.assistant.response", version: "1.0"
  })));
  const app = await buildApp({ dataFile: join(tempDirectory, "state.json"), assistantProvider: provider });
  try {
    const created = await app.inject({ method: "POST", url: "/api/courses/course-port-management-intro/class-sessions" });
    const id = created.json().id;
    for (const [index, item] of cases.entries()) {
      const response = await app.inject({ method: "POST", url: `/api/class-sessions/${id}/assistant/turns`,
        payload: { text: item.text, source: index % 2 ? "voice_asr" : "text" } });
      const events = parseSseEvents(response.body);
      assert.equal(events.at(-1)?.type, "turn.completed", response.body);
      assert.equal(events.at(-1)?.dialogue, item.spoken);
      assert.equal(events.filter(event => event.type === "dialogue.delta").map(event => event.delta).join(""), item.spoken);
      assert.equal(events.some(event => event.type === "control.result"), item.actions.length > 0);
      const current = await app.inject({ url: `/api/class-sessions/${id}/snapshot` });
      assert.equal(current.json().slide.index, item.index);
      assert.equal(current.json().avatar.status, "ready");
    }
    assert.match(provider.requests[0]!.messages[0]!.content, /禁止生成.*确认语/);
    assert.match(provider.requests[0]!.messages[0]!.content, /翻页并讲解/);

    const snapshot = classroomSnapshotSchema.parse((await app.inject({ url: `/api/class-sessions/${id}/snapshot` })).json());
    let providerFinished = false;
    const streaming = new ClassroomAssistantOrchestrator({ name: "early-answer-test", async *streamJson() {
      yield '{"replyKind":"answer","dialogue":"先解释港口的作用';
      providerFinished = true;
      yield '。","actions":[],"schema":"edu.classroom.assistant.response","version":"1.0"}';
    }}).startTurn(snapshot, { text: "解释港口的作用", source: "text" });
    const first = await streaming.deltas.next();
    assert.equal(providerFinished, false, "ordinary answers must keep streaming before the provider finishes");
    assert.equal(first.value?.delta, "先解释港口的作用");
    for await (const _ of streaming.deltas) { /* consume the remaining response */ }
    assert.equal((await streaming.result).dialogue, "先解释港口的作用。");
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
