import assert from "node:assert/strict";
import test from "node:test";
import { WebSocketServer } from "ws";
import { DashScopeStudySpeechProvider, type StudySpeechOptions } from "../src/study/speech.js";

async function speechSession(options?: StudySpeechOptions) {
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
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-only", ttsVoiceId: "ChineseVoice", ttsModel: "configured-chinese-model", ttsWebSocketUrl: `ws://127.0.0.1:${address.port}`});
  try {
    const chunks = [];
    for await (const chunk of provider.synthesize("A function maps an input to one output.", undefined, "default", options)) chunks.push(chunk);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]!.sampleRate, 24000);
    return {session, model};
  } finally {
    for (const client of server.clients) client.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test("English speech explicitly selects English and a supported English preset", async () => {
  const provider = new DashScopeStudySpeechProvider({apiKey: "test-only", ttsVoiceId: ""});
  assert.equal(provider.ttsConfigured, false);
  assert.equal(provider.canSynthesize({language: "English"}), true);
  const result = await speechSession({language: "English"});
  assert.equal(result.session?.language_type, "English");
  assert.equal(result.session?.voice, "Ethan");
  assert.equal(result.model, "qwen3-tts-flash-realtime-2025-11-27");
});

test("existing Chinese speech preserves configured voice and model", async () => {
  const result = await speechSession();
  assert.equal(result.session?.language_type, "Chinese");
  assert.equal(result.session?.voice, "ChineseVoice");
  assert.equal(result.model, "configured-chinese-model");
});
