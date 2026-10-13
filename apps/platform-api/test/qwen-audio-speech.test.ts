import assert from "node:assert/strict";
import test from "node:test";
import {WebSocketServer} from "ws";
import {DashScopeStudySpeechProvider, StudyAsrNoSpeechError, type StudySpeechOptions} from "../src/study/speech.js";
import type {AvatarVoiceProfile} from "@edu/contracts";

async function taskSession(settings?: StudySpeechOptions, profile: AvatarVoiceProfile = "hiyori",
  mode: "normal" | "empty" | "failed" | "mismatch" | "closed" = "normal") {
  const server = new WebSocketServer({port: 0});
  await new Promise<void>(resolve => server.once("listening", resolve));
  const requests: Array<{header: {action: string; task_id: string; streaming: string}; payload: any}> = [];
  server.on("connection", socket => {
    socket.on("message", raw => {
      const request = JSON.parse(raw.toString()); requests.push(request);
      const header = {task_id: mode === "mismatch" ? "wrong-task" : request.header.task_id};
      if (request.header.action === "run-task") socket.send(JSON.stringify({header: {...header, event: "task-started"}, payload: {}}));
      if (request.header.action === "finish-task") {
        if (mode === "failed") {
          socket.send(JSON.stringify({header: {...header, event: "task-failed", error_code: "InvalidParameter", error_message: "Bad voice test-secret"}}));
          socket.close(1007, "Bad voice");
          return;
        }
        if (mode === "normal" || mode === "closed") {socket.send(Buffer.from([1])); socket.send(Buffer.from([0, 2, 0]));}
        socket.send(JSON.stringify({header: {...header, event: "task-finished"}, payload: {}}), () => {if (mode === "closed") socket.close();});
      }
    });
  });
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-secret", ttsPresetModel: "qwen-audio-3.1-tts-flash",
    ttsModel: "qwen-audio-3.1-tts-flash", ttsVoiceId: "",
    ttsTaskWebSocketUrl: `ws://127.0.0.1:${address.port}`});
  const chunks = []; let failure: unknown;
  try {
    for await (const chunk of provider.synthesize("现在讨论极限。", AbortSignal.timeout(2000), profile, settings)) {
      chunks.push(chunk);
      if (mode === "closed") await new Promise(resolve => setTimeout(resolve, 20));
    }
  } catch (error) {failure = error;}
  finally {for (const client of server.clients) client.terminate(); await new Promise<void>(resolve => server.close(() => resolve()));}
  return {requests, chunks, failure};
}

test("Qwen-Audio 3.1 uses task events, matching voice and complete 24kHz PCM", async () => {
  const result = await taskSession();
  assert.equal(result.failure, undefined);
  assert.deepEqual(result.requests.map(value => value.header.action), ["run-task", "continue-task", "finish-task"]);
  assert.equal(new Set(result.requests.map(value => value.header.task_id)).size, 1);
  assert.ok(result.requests.every(value => value.header.streaming === "duplex"));
  assert.match(result.requests[0]!.header.task_id, /^[0-9a-f-]{36}$/);
  const payload = result.requests[0]!.payload;
  assert.equal(payload.model, "qwen-audio-3.1-tts-flash");
  assert.equal(payload.parameters.voice, "longanhuan_v3.1");
  assert.equal(payload.parameters.format, "pcm");
  assert.equal(payload.parameters.sample_rate, 24000);
  assert.equal(payload.parameters.rate, 0.96);
  assert.deepEqual(payload.parameters.language_hints, ["zh"]);
  assert.equal(result.requests[1]!.payload.input.text, "现在讨论极限。");
  assert.deepEqual(Buffer.concat(result.chunks.map(value => Buffer.from(value.audioBase64, "base64"))), Buffer.from([1, 0, 2, 0]));
  assert.ok(result.chunks.every(value => value.sampleRate === 24000 && value.format === "pcm_s16le"));
});

test("Chinese and English choose voices belonging to the new model and target language", async () => {
  const defaultVoice = await taskSession(undefined, "default");
  assert.equal(defaultVoice.failure, undefined);
  assert.equal(defaultVoice.requests[0]!.payload.model, "qwen-audio-3.1-tts-flash");
  assert.equal(defaultVoice.requests[0]!.payload.parameters.voice, "longanhuan_v3.1");
  assert.equal((await taskSession(undefined, "natori")).requests[0]!.payload.parameters.voice, "longanlang_v3.1");
  const english = await taskSession({language: "English"}, "hiyori");
  assert.equal(english.requests[0]!.payload.parameters.voice, "Emily_v3.1");
  assert.deepEqual(english.requests[0]!.payload.parameters.language_hints, ["en"]);
  assert.equal((await taskSession({language: "English"}, "default")).requests[0]!.payload.parameters.voice, "Eric_v3.1");
});

test("the current Xiaomai default is available without a legacy custom voice ID", () => {
  const provider = new DashScopeStudySpeechProvider({apiKey: "test", ttsModel: "qwen-audio-3.1-tts-flash", ttsVoiceId: ""});
  assert.equal(provider.ttsConfigured, true);
  assert.equal(provider.canSynthesize(undefined, "default"), true);
});

test("a finished upstream can close while buffered audio and lip cues are still draining", async () => {
  const result = await taskSession(undefined, "default", "closed");
  assert.equal(result.failure, undefined);
  assert.deepEqual(Buffer.concat(result.chunks.map(value => Buffer.from(value.audioBase64, "base64"))), Buffer.from([1, 0, 2, 0]));
});

test("empty audio, vendor errors and mismatched tasks are failures, not successful speech", async () => {
  for (const [mode, message] of [["empty", /完整的PCM/], ["failed", /Bad voice/], ["mismatch", /不匹配/]] as const) {
    const result = await taskSession(undefined, "hiyori", mode);
    assert.ok(result.failure instanceof Error);
    assert.match(result.failure.message, message);
    assert.ok(!result.failure.message.includes("test-secret"));
    assert.equal(result.chunks.length, 0);
  }
});

test("cancelling a new synthesis task promptly closes its socket and rejects the stream", async () => {
  const server = new WebSocketServer({port: 0});
  await new Promise<void>(resolve => server.once("listening", resolve));
  let ready!: () => void; const started = new Promise<void>(resolve => {ready = resolve;});
  server.on("connection", socket => socket.on("message", raw => {
    const event = JSON.parse(raw.toString());
    if (event.header.action === "run-task") socket.send(JSON.stringify({header: {task_id: event.header.task_id, event: "task-started"}}));
    if (event.header.action === "continue-task") ready();
  }));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const provider = new DashScopeStudySpeechProvider({apiKey: "test", ttsPresetModel: "qwen-audio-3.1-tts-flash",
    ttsTaskWebSocketUrl: `ws://127.0.0.1:${address.port}`});
  const controller = new AbortController();
  const completion = (async () => {for await (const _chunk of provider.synthesize("你好", controller.signal, "hiyori")) assert.fail("No audio expected");})();
  try {await started; controller.abort(); await assert.rejects(completion, error => error instanceof Error && error.name === "AbortError");}
  finally {for (const client of server.clients) client.terminate(); await new Promise<void>(resolve => server.close(() => resolve()));}
});

test("3.1 ASR uses native input/output and retains the course context", async () => {
  let url = "", input: any;
  const provider = new DashScopeStudySpeechProvider({apiKey: "test", asrModel: "qwen-audio-3.1-asr-flash",
    asrNativeApiUrl: "https://speech.test/api/v1/services/aigc/multimodal-generation/generation",
    fetchImplementation: (async (target, init) => {
      url = String(target); input = JSON.parse(String(init?.body));
      assert.equal(new Headers(init?.headers).get("X-DashScope-SSE"), "disable");
      return Response.json({output: {output: {sentence: {text: "展开下一步。"}}}});
    }) as typeof fetch});
  assert.equal(await provider.transcribe({audioBase64: "AA==", mimeType: "audio/webm", context: "本页讨论极限。"}), "展开下一步。");
  assert.match(url, /multimodal-generation\/generation$/);
  assert.equal(input.model, "qwen-audio-3.1-asr-flash");
  assert.equal(input.input.messages[0].role, "user");
  assert.equal(input.input.messages[0].content[0].type, "input_text");
  assert.equal(input.input.messages[0].content[0].text, "本页讨论极限。");
  assert.equal(input.input.messages[1].content[0].input_audio.data, "data:audio/webm;base64,AA==");
  assert.equal(input.messages, undefined);
  assert.deepEqual(input.parameters, {format: "webm"});
});

test("native ASR distinguishes silence from an unavailable or malformed provider", async () => {
  const make = (value: unknown) => new DashScopeStudySpeechProvider({apiKey: "test", asrModel: "qwen-audio-3.1-asr-flash",
    fetchImplementation: (async () => Response.json(value)) as typeof fetch});
  const request = {audioBase64: "AA==", mimeType: "audio/wav", context: "课程"};
  await assert.rejects(make({output: {text: " "}}).transcribe(request), StudyAsrNoSpeechError);
  await assert.rejects(make({choices: [{message: {content: "wrong format"}}]}).transcribe(request), /格式无效/);
});
