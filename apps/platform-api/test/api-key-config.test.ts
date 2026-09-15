import assert from "node:assert/strict";
import test from "node:test";
import { assistantApiKey, dashScopeApiKey } from "../src/runtime-env.js";
import { OpenAiCompatibleAssistantProvider } from "../src/assistant/provider.js";
import { DashScopeStudySpeechProvider } from "../src/study/speech.js";

test("empty assistant overrides and uppercase placeholders do not mask a usable DashScope key", async () => {
  const names = ["EDU_ASSISTANT_API_KEY", "DASHSCOPE_API_KEY", "dashscope_api_key"] as const;
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    process.env.EDU_ASSISTANT_API_KEY = "  ";
    process.env.DASHSCOPE_API_KEY = "  ";
    process.env.dashscope_api_key = " synthetic-lowercase-key ";
    assert.equal(assistantApiKey(), "synthetic-lowercase-key");
    assert.equal(dashScopeApiKey(), "synthetic-lowercase-key");
    let calls = 0;
    const fetchImplementation: typeof fetch = async (_url, init) => {
      calls++;
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-lowercase-key");
      return new Response('data: {"choices":[{"delta":{"content":"{\\"dialogue\\":\\"你好\\"}"}}]}\n\ndata: [DONE]\n\n', {headers: {"Content-Type": "text/event-stream"}});
    };
    const provider = new OpenAiCompatibleAssistantProvider({fetchImplementation});
    let output = "";
    for await (const chunk of provider.streamJson({messages: [{role: "user", content: "你好"}]})) output += chunk;
    assert.equal(JSON.parse(output).dialogue, "你好");
    assert.equal(calls, 1);
    assert.equal(new DashScopeStudySpeechProvider().asrConfigured, true);
    const speech = new DashScopeStudySpeechProvider({fetchImplementation: async (_url, init) => {
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-lowercase-key");
      return Response.json({choices: [{message: {content: "测试语音"}}]});
    }});
    assert.equal(await speech.transcribe({audioBase64: "AAAA", mimeType: "audio/wav", context: "test"}), "测试语音");
    // Explicit empty test options must never accidentally use real environment credentials.
    assert.equal(new DashScopeStudySpeechProvider({apiKey: ""}).asrConfigured, false);
    const disabled = new OpenAiCompatibleAssistantProvider({apiKey: "", fetchImplementation});
    await assert.rejects(async () => { for await (const _chunk of disabled.streamJson({messages: []})) { /* consume */ } }, /尚未配置/);
    assert.equal(calls, 1);
    process.env.DASHSCOPE_API_KEY = " synthetic-uppercase-key ";
    assert.equal(assistantApiKey(), "synthetic-uppercase-key");
    process.env.EDU_ASSISTANT_API_KEY = " synthetic-assistant-key ";
    assert.equal(assistantApiKey(), "synthetic-assistant-key");
    assert.equal(dashScopeApiKey(), "synthetic-uppercase-key");
    for (const name of names) process.env[name] = " ";
    assert.equal(new DashScopeStudySpeechProvider().asrConfigured, false);
    assert.equal(assistantApiKey(), undefined);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
