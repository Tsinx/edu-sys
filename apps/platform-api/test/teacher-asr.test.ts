import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import type { StudyAsrRequest, StudySpeechProvider } from "../src/study/speech.js";
import { DashScopeStudySpeechProvider, StudyAsrNoSpeechError, StudySpeechProviderError } from "../src/study/speech.js";

test("teacher ASR retains access control and only transcribes, with wake-word context", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-teacher-asr-"));
  const identity = new CampusIdentityProvider(join(dir, "accounts.sqlite"));
  await identity.createAccount("teacher", "测试教师", "teacher", "teacher-test-password");
  await identity.createAccount("student", "测试学生", "student", "student-test-password");
  const requests: StudyAsrRequest[] = [];
  let configured = true;
  const speech: StudySpeechProvider = {
    name: "test-asr", get asrConfigured() { return configured; }, ttsConfigured: false,
    async transcribe(request) { requests.push(request); return "助教你好，下一页，谢谢助教"; },
    async *synthesize() {}
  };
  const app = await buildApp({ dataFile: join(dir, "state.json"), campusMode: true, identityProvider: identity, secureIdentityCookie: false, studySpeechProvider: speech });
  const payload = { audioBase64: "AAAA", mimeType: "audio/wav", durationMs: 1200 };
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/teacher/asr", payload })).statusCode, 401);
    for (const role of ["student", "teacher"]) {
      const login = await app.inject({ method: "POST", url: "/api/identity/login", payload: { username: role, password: `${role}-test-password` } });
      const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
      const response = await app.inject({ method: "POST", url: "/api/teacher/asr", headers: { cookie }, payload });
      assert.equal(response.statusCode, role === "student" ? 403 : 200);
      if (role === "teacher") assert.deepEqual(response.json(), { text: "助教你好，下一页，谢谢助教" });
    }
    assert.equal(requests.length, 1);
    assert.match(requests[0]!.context, /助教你好.*谢谢助教/u);
    assert.match(requests[0]!.context, /不补写口令/u);
    configured = false;
    const login = await app.inject({ method: "POST", url: "/api/identity/login", payload: { username: "teacher", password: "teacher-test-password" } });
    const response = await app.inject({ method: "POST", url: "/api/teacher/asr", headers: { cookie: String(login.headers["set-cookie"]).split(";")[0]! }, payload });
    assert.equal(response.statusCode, 503);
    assert.equal(requests.length, 1);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});

test("empty ASR results keep teacher listening while malformed responses and outages remain failures", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-empty-asr-"));
  let mode: "empty" | "words" | "malformed" | "offline" = "empty";
  const speech = new DashScopeStudySpeechProvider({ apiKey: "test-only", fetchImplementation: async () => {
    if (mode === "offline") return new Response("unavailable", { status: 503 });
    return Response.json(mode === "malformed" ? { choices: [] } : { choices: [{ message: { content: mode === "empty" ? " \n " : "谢谢助教" } }] });
  } });
  const app = await buildApp({ dataFile: join(dir, "state.json"), studySpeechProvider: speech });
  const payload = { audioBase64: "AAAA", mimeType: "audio/wav", durationMs: 1200 };
  try {
    await assert.rejects(speech.transcribe({ ...payload, context: "test" }), StudyAsrNoSpeechError);
    for (let i = 0; i < 3; i++) {
      const response = await app.inject({ method: "POST", url: "/api/teacher/asr", payload });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), { text: "", status: "no_speech" });
    }
    mode = "words";
    assert.deepEqual((await app.inject({ method: "POST", url: "/api/teacher/asr", payload })).json(), { text: "谢谢助教" });
    for (const failure of ["malformed", "offline"] as const) {
      mode = failure;
      await assert.rejects(speech.transcribe({ ...payload, context: "test" }), error => error instanceof StudySpeechProviderError && !(error instanceof StudyAsrNoSpeechError));
      assert.equal((await app.inject({ method: "POST", url: "/api/teacher/asr", payload })).statusCode, 500);
    }
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
