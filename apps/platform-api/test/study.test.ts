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
import type {
  StudyAsrRequest,
  StudySpeechProvider,
  StudyTtsChunk
} from "../src/study/speech.js";

class StudyAssistantProvider implements AssistantJsonStreamProvider {
  readonly name = "study-test-assistant";
  readonly requests: AssistantJsonStreamRequest[] = [];

  constructor(private readonly response: string) {}

  async *streamJson(request: AssistantJsonStreamRequest) {
    this.requests.push(request);
    for (let index = 0; index < this.response.length; index += 4) {
      yield this.response.slice(index, index + 4);
    }
  }
}

class StudySpeechTestProvider implements StudySpeechProvider {
  readonly name = "study-test-speech";
  readonly asrConfigured = true;
  readonly ttsConfigured = true;
  readonly transcriptions: StudyAsrRequest[] = [];
  readonly synthesized: string[] = [];

  async transcribe(request: StudyAsrRequest) {
    this.transcriptions.push(request);
    return "请带我到第二讲第十二页";
  }

  async *synthesize(text: string): AsyncGenerator<StudyTtsChunk> {
    this.synthesized.push(text);
    yield {
      audioBase64: "AAE=",
      sampleRate: 24_000,
      channels: 1,
      format: "pcm_s16le"
    };
  }
}

function parseSseEvents(raw: string): Array<Record<string, unknown>> {
  return raw
    .split(/\r?\n\r?\n/u)
    .flatMap((block) => block
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>));
}

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  if (typeof value !== "string") throw new Error("身份接口没有返回Cookie");
  return value.split(";", 1)[0]!;
}

test("self-study session persists progress and exposes a zero-GPU Lanzhou presentation", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-study-session-"));
  const dataFile = join(tempDirectory, "state.json");
  let app = await buildApp({ dataFile });

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/study-sessions",
      payload: { courseId: "course-port-management-intro" }
    });
    assert.equal(created.statusCode, 201);
    const first = created.json();
    assert.equal(first.mode, "student");
    assert.equal(first.globalIndex, 1);
    assert.equal(first.slideKey, "l1-course-cover");
    assert.equal(first.slideTotal, 119);
    assert.equal(first.presentation.mode, "selfstudy_prerecorded");
    assert.equal(first.presentation.requiresGpu, false);
    assert.equal(first.presentation.characterId, "lanzhou");
    assert.equal(first.presentation.manifestUrl, "/avatar/lanzhou/v1/manifest.json");

    const target = await app.inject({
      method: "PATCH",
      url: `/api/study-sessions/${first.id}/progress`,
      payload: {
        deckVersion: first.deckVersion,
        slideKey: "l2-cover",
        globalIndex: 48
      }
    });
    assert.equal(target.statusCode, 200);
    assert.equal(target.json().globalIndex, 48);
    assert.equal(target.json().slideKey, "l2-cover");

    await app.close();
    app = await buildApp({ dataFile });
    const resumed = await app.inject({
      method: "POST",
      url: "/api/study-sessions",
      payload: { courseId: "course-port-management-intro" }
    });
    assert.equal(resumed.statusCode, 201);
    assert.equal(resumed.json().id, first.id);
    assert.equal(resumed.json().globalIndex, 48);

    const teacherIdentity = await app.inject({
      method: "POST",
      url: "/api/identity/development/session",
      payload: { role: "teacher", displayName: "教师预览账号" }
    });
    const teacherPreview = await app.inject({
      method: "POST",
      url: "/api/study-sessions",
      headers: { cookie: cookieFrom(teacherIdentity) },
      payload: { courseId: "course-port-management-intro" }
    });
    assert.equal(teacherPreview.statusCode, 201);
    assert.equal(teacherPreview.json().mode, "teacher_preview");
    assert.equal(teacherPreview.json().actorDisplayName, "教师预览账号");
    assert.notEqual(teacherPreview.json().id, first.id);

    const unrelatedCourse = await app.inject({
      method: "POST",
      url: "/api/courses",
      payload: {
        title: "其他课程",
        code: "OTHER-01",
        category: "本科课程",
        discipline: "管理学",
        totalHours: 16
      }
    });
    const unavailableDeck = await app.inject({
      method: "POST",
      url: "/api/study-sessions",
      payload: { courseId: unrelatedCourse.json().id }
    });
    assert.equal(unavailableDeck.statusCode, 409);
    assert.equal(unavailableDeck.json().error, "STUDY_DECK_NOT_READY");
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("self-study ASR context, early TTS and validated navigation stream independently of LAM", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-study-turn-"));
  const assistant = new StudyAssistantProvider(JSON.stringify({
    dialogue: "第二讲会沿真实港序解释走廊、咽喉、节点与腹地。现在带你到第十二页。",
    actions: [{ type: "study.slides.go_to", lesson: 2, slide: 12 }],
    schema: "edu.study.assistant.response",
    version: "1.0"
  }));
  const speech = new StudySpeechTestProvider();
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    assistantProvider: assistant,
    studySpeechProvider: speech,
    openAvatarBaseUrl: "http://127.0.0.1:1"
  });

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/study-sessions",
      payload: { courseId: "course-port-management-intro" }
    });
    const sessionId = created.json().id as string;

    const asr = await app.inject({
      method: "POST",
      url: `/api/study-sessions/${sessionId}/asr`,
      payload: {
        audioBase64: "AAECAw==",
        mimeType: "audio/webm",
        durationMs: 1_200
      }
    });
    assert.equal(asr.statusCode, 200);
    assert.equal(asr.json().text, "请带我到第二讲第十二页");
    assert.equal(asr.json().provider, "study-test-speech");
    assert.match(speech.transcriptions[0]?.context ?? "", /比较优势/);
    assert.match(speech.transcriptions[0]?.context ?? "", /港口管理概论/);

    const response = await app.inject({
      method: "POST",
      url: `/api/study-sessions/${sessionId}/assistant/turns`,
      payload: { text: asr.json().text, source: "voice_asr" }
    });
    assert.equal(response.statusCode, 200);
    const events = parseSseEvents(response.body);
    assert.equal(events[0]?.type, "turn.started");
    assert.equal(events.some((event) => event.type === "dialogue.delta"), true);
    assert.equal(events.some((event) => event.type === "speech.chunk"), true);
    const speechIndex = events.findIndex((event) => event.type === "speech.chunk");
    const navigationIndex = events.findIndex((event) => event.type === "navigation.command");
    assert.ok(speechIndex > 0 && navigationIndex > speechIndex);
    assert.equal(events.at(-1)?.type, "turn.completed");
    assert.equal(events.at(-1)?.speechStatus, "streamed");
    const navigation = events.find((event) => event.type === "navigation.command")?.result as {
      session: { globalIndex: number; slideKey: string };
    };
    assert.equal(navigation.session.globalIndex, 59);
    assert.ok(navigation.session.slideKey.startsWith("l2-"));
    assert.ok(speech.synthesized.length >= 1);
    assert.match(assistant.requests[0]?.messages[0]?.content ?? "", /当前页面：第1\/47页/);
    assert.match(assistant.requests[0]?.messages[0]?.content ?? "", /edu\.study\.assistant\.response/);
    assert.doesNotMatch(assistant.requests[0]?.messages[0]?.content ?? "", /teachingCue|assistantCue/);
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
