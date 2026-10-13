import assert from "node:assert/strict";
import test from "node:test";
import { WebSocketServer } from "ws";
import { DashScopeStudySpeechProvider, type StudySpeechOptions } from "../src/study/speech.js";
import type { AvatarVoiceProfile } from "@edu/contracts";

async function speechSession(options?: StudySpeechOptions, voiceProfile: AvatarVoiceProfile = "default", ttsPresetModel = "qwen3-tts-flash-realtime") {
  const server = new WebSocketServer({port: 0});
  await new Promise<void>(resolve => server.once("listening", resolve));
  let session: Record<string, unknown> | undefined, model = "";
  server.on("connection", (socket, request) => {
    model = new URL(request.url!, "http://127.0.0.1").searchParams.get("model") ?? "";
    socket.send(JSON.stringify({type: "session.created"}));
    socket.on("message", raw => {
      const event = JSON.parse(raw.toString());
      if (event.type === "session.update") {
        session = event.session;
        socket.send(JSON.stringify({type: "session.updated"}));
      }
      if (event.type === "input_text_buffer.commit") {
        socket.send(JSON.stringify({type: "response.audio.delta", delta: "AQABAA=="}));
        socket.send(JSON.stringify({type: "response.done"}));
      }
    });
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-only", ttsVoiceId: "ChineseVoice", ttsModel: "configured-chinese-model", ttsPresetModel, ttsWebSocketUrl: `ws://127.0.0.1:${address.port}`});
  try {
    const chunks = [];
    for await (const chunk of provider.synthesize("A function maps an input to one output.", undefined, voiceProfile, options)) chunks.push(chunk);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]!.sampleRate, 24000);
    return {session, model};
  } finally {
    for (const client of server.clients) client.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test("English speech explicitly selects English and a supported English preset", async () => {
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-only", ttsModel: "configured-chinese-model", ttsVoiceId: ""});
  assert.equal(provider.ttsConfigured, false);
  assert.equal(provider.canSynthesize({language: "English"}), true);
  const result = await speechSession({language: "English"});
  assert.equal(result.session?.language_type, "English");
  assert.equal(result.session?.voice, "Ethan");
  assert.equal(result.model, "qwen3-tts-flash-realtime");
});

test("existing Chinese speech preserves configured voice and model", async () => {
  const result = await speechSession();
  assert.equal(result.session?.language_type, "Chinese");
  assert.equal(result.session?.voice, "ChineseVoice");
  assert.equal(result.model, "configured-chinese-model");
});

test("Live2D presets need no custom voice and legacy realtime remains selectable", async () => {
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-only", ttsModel: "configured-chinese-model", ttsVoiceId: ""});
  assert.equal(provider.canSynthesize(undefined, "hiyori"), true);
  assert.equal(provider.canSynthesize(undefined, "natori"), true);
  assert.equal(provider.canSynthesize(undefined, "default"), false);
  for (const [profile, voice] of [["hiyori", "Serena"], ["natori", "Ethan"]] as const) {
    const result = await speechSession(undefined, profile);
    assert.equal(result.model, "qwen3-tts-flash-realtime");
    assert.equal(result.session?.voice, voice);
    assert.equal(result.session?.language_type, "Chinese");
  }
});

test("preset model configuration and a request override are respected", async () => {
  assert.equal((await speechSession(undefined, "hiyori", "configured-preset")).model, "configured-preset");
  assert.equal((await speechSession({model: "request-model"}, "hiyori", "configured-preset")).model, "request-model");
});

test("an upstream close retains its diagnosis without disclosing the API key", async () => {
  const server = new WebSocketServer({port: 0});
  await new Promise<void>(resolve => server.once("listening", resolve));
  server.on("connection", socket => {
    socket.send(JSON.stringify({type: "session.created"}));
    socket.once("message", () => socket.close(1007, "Model not exist. test-secret"));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-secret", ttsPresetModel: "qwen3-tts-flash-realtime", ttsWebSocketUrl: `ws://127.0.0.1:${address.port}`});
  try {
    await assert.rejects(async () => {
      for await (const chunk of provider.synthesize("你好", undefined, "hiyori")) assert.fail(`Unexpected audio ${chunk.format}`);
    }, error => error instanceof Error && /1007.*Model not exist/u.test(error.message) && !error.message.includes("test-secret"));
  } finally {
    for (const client of server.clients) client.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
