import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import { JsonStateStore } from "../src/store.js";
import { RealtimeConversation } from "../src/assistant/realtime-conversation.js";
import { compileRealtimePrompt, buildPromptWorkspace } from "../src/assistant/prompts.js";
import { buildApp } from "../src/app.js";
import type { QwenEvent, RealtimeTransport } from "../src/assistant/realtime-provider.js";
import type { RealtimeServerEvent, RealtimeControl } from "@edu/contracts";
import { ECONOMIC_MATHEMATICS_SLIDES } from "@edu/course-content/economic-mathematics";
import { realtimeConfig, realtimeAvailable } from "../src/assistant/realtime-provider.js";

class FakeCloud implements RealtimeTransport {
  requests: QwenEvent[] = []; modalities: string[][] = []; listeners = new Set<(e: QwenEvent) => void>();
  closed = false; counter = 0; beforeResponse?: () => Promise<void>; beforeDone?: () => Promise<void>;
  control?: RealtimeControl;
  calls?: QwenEvent[];
  silent = false; acknowledge = true; repeatTool = false;
  async open() {}
  send(event: QwenEvent) { this.requests.push(event); }
  subscribe(cb: (e: QwenEvent) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  emit(e: QwenEvent) { this.listeners.forEach(cb => cb(e)); }
  async request(event: QwenEvent, ack: string, signal: AbortSignal) {
    signal.throwIfAborted(); this.requests.push(event);
    if (event.type === "input_audio_buffer.commit") {
      const id = `input-${++this.counter}`;
      this.emit({ type: "conversation.item.created", item: { id, role: "user", content: [{ type: "input_audio" }] } });
      this.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: id, transcript: "请解释当前页。" });
    }
    if (event.type === "conversation.item.create") this.emit({ type: "conversation.item.created", item: { ...event.item, id: `history-${++this.counter}` } });
    return { type: ack, item_id: event.item_id };
  }
  async respond(modalities: string[], receive: (e: QwenEvent) => void, signal: AbortSignal) {
    signal.throwIfAborted(); this.modalities.push(modalities);
    await this.beforeResponse?.();
    const toolsEnabled = this.requests.filter(e => e.type === "session.update").at(-1)!.session.tools.length > 0;
    const calls = (toolsEnabled || this.repeatTool) ? this.calls ?? (this.control ? [
      { type: "function_call", name: "control_classroom", call_id: "call-1", arguments: JSON.stringify(this.control) }
    ] : []) : [];
    if (!this.silent && (!calls.length || this.acknowledge)) {
      receive({ type: "response.audio_transcript.delta", delta: calls.length ? "好的，我来翻页。" : "依据当前页回答。" });
      receive({ type: "response.audio.delta", delta: "AQABAA==" });
    }
    for (const call of calls) receive({ type: "response.function_call_arguments.delta", delta: call.arguments });
    await this.beforeDone?.();
    return { type: "response.done", response: { status: "completed", output: calls } };
  }
  close() { this.closed = true; }
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "edu-realtime-"));
  const store = new JsonStateStore(join(dir, "state.json")); await store.initialize();
  const session = (await store.startClass("course-port-management-intro"))!;
  const cloud = new FakeCloud(), events: RealtimeServerEvent[] = [];
  const conversation = new RealtimeConversation(cloud, store, session.id, e => events.push(e));
  return { store, session, cloud, events, conversation, async close() { conversation.close(); store.close(); await rm(dir, { recursive: true, force: true }); } };
}
const audio = Buffer.alloc(3200).toString("base64");
async function run(f: Awaited<ReturnType<typeof fixture>>, id = "test-turn-1") {
  await f.conversation.begin(id, new AbortController().signal); f.conversation.append(id, audio); await f.conversation.commit(id);
}

test("ordinary questions stream before response.done in one audio response without a routing call", async () => {
  const f = await fixture(); try {
    f.cloud.beforeDone = async () => {
      assert.ok(f.events.some(e => e.type === "audio.delta"));
      assert.ok(f.events.some(e => e.type === "dialogue.delta"));
      assert.equal(f.events.some(e => e.type === "turn.completed"), false);
    };
    await run(f);
    assert.deepEqual(f.cloud.modalities, [["text", "audio"]]);
    assert.equal(f.cloud.requests.some(e => e.item?.type === "function_call_output"), false);
    const done = f.events.find(e => e.type === "turn.completed")!;
    assert.equal(done.timing.responseCount, 1);
    assert.equal(done.timing.toolDecisionMs, undefined);
    assert.ok(Number.isFinite(done.timing.firstTextMs) && Number.isFinite(done.timing.firstAudioMs));
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 1);
  } finally { await f.close(); }
});

test("control allows immediate acknowledgment, uses the executor once, and never speaks tool JSON", async () => {
  const f = await fixture(); try {
    f.cloud.control = { actions: [{ type: "slides.next" }] };
    await run(f);
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 2);
    assert.ok(f.events.findIndex(e => e.type === "audio.delta") < f.events.findIndex(e => e.type === "control.result"));
    const text = f.events.filter(e => e.type === "dialogue.delta").map(e => e.delta).join("");
    assert.equal(text, "好的，我来翻页。依据当前页回答。");
    assert.deepEqual(f.cloud.modalities, [["text", "audio"], ["text", "audio"]]);
    assert.equal(f.events.filter(e => e.type === "control.result").length, 1);
    const done = f.events.find(e => e.type === "turn.completed")!;
    assert.equal(done.timing.responseCount, 2);
    assert.ok(Number.isFinite(done.timing.toolDecisionMs));
    await assert.rejects(() => f.conversation.commit("test-turn-1"));
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 2);
  } finally { await f.close(); }
});
test("a tool-only response continues with the new page and disables further tools", async () => {
  const f = await fixture(); try {
    f.cloud.control = { actions: [{ type: "slides.next" }] }; f.cloud.acknowledge = false; await run(f);
    const update = f.cloud.requests.filter(e => e.type === "session.update").at(-1)!;
    assert.deepEqual(update.session.tools, []);
    assert.match(update.session.instructions, /<slide_context index="2"/);
    assert.ok(f.events.findIndex(e => e.type === "control.result") < f.events.findIndex(e => e.type === "audio.delta"));
    assert.equal(f.events.filter(e => e.type === "audio.delta").length, 1);
    assert.equal(f.cloud.requests.find(e => e.session?.tools?.length)?.session.tools[0].function.name, "control_classroom");
    assert.match(f.cloud.requests.find(e => e.item?.type === "function_call_output")!.item.output, /slides.next/);
  } finally { await f.close(); }
});
test("an external page change prevents stale control and all output", async () => {
  const f = await fixture(); try {
    f.cloud.control = { actions: [{ type: "slides.next" }] };
    f.cloud.beforeResponse = async () => { await f.store.applyClassroomEvent(f.session.id, { type: "set_slide", index: 4 }); };
    await assert.rejects(() => run(f), /已变化/);
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 4);
    assert.ok(!f.events.some(e => e.type === "audio.delta" || e.type === "control.result"));
  } finally { await f.close(); }
});
test("empty model output, invalid audio, and cancellation never trigger speech", async () => {
  const f = await fixture(); try {
    f.cloud.silent = true; await assert.rejects(() => run(f), /没有返回语音/);
    const controller = new AbortController(); await f.conversation.begin("test-turn-2", controller.signal);
    assert.throws(() => f.conversation.append("test-turn-2", "AQ=="), /PCM/);
    controller.abort(); assert.throws(() => f.conversation.append("test-turn-2", audio));
    assert.equal(f.events.some(e => e.type === "audio.delta"), false);
  } finally { await f.close(); }
});

test("invalid, unknown, or duplicate tool calls cannot execute actions even after acknowledgment", async () => {
  const call = { type: "function_call", name: "control_classroom", call_id: "call-1", arguments: JSON.stringify({ actions: [{ type: "slides.next" }] }) };
  for (const calls of [[{...call, arguments: "{"}], [{...call, arguments: JSON.stringify({actions: []})}],
    [{...call, arguments: JSON.stringify({actions: [{type:"slides.next"},{type:"slides.go_to",slide:99999}]})}],
    [{...call, name: "unknown"}], [{...call, call_id: ""}], [call, call]]) {
    const f = await fixture(); try {
      f.cloud.calls = calls;
      await assert.rejects(() => run(f));
      assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 1);
      assert.equal(f.events.filter(e => e.type === "control.result").length, 0);
      assert.equal(f.cloud.modalities.length, 1);
      assert.equal(f.events.filter(e => e.type === "dialogue.delta").map(e => e.delta).join(""), "好的，我来翻页。");
    } finally { await f.close(); }
  }
});

test("page change or cancellation after first audio still prevents pending actions", async () => {
  for (const cancel of [false, true]) {
    const f = await fixture(); const controller = new AbortController();
    try {
      f.cloud.control = {actions:[{type:"slides.next"}]};
      f.cloud.beforeDone = async () => {
        assert.ok(f.events.some(e => e.type === "audio.delta"));
        if (cancel) controller.abort();
        else await f.store.applyClassroomEvent(f.session.id, {type:"set_slide",index:4});
      };
      await f.conversation.begin("test-turn-1", controller.signal); f.conversation.append("test-turn-1", audio);
      await assert.rejects(() => f.conversation.commit("test-turn-1"));
      assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, cancel ? 1 : 4);
      assert.equal(f.events.some(e => e.type === "control.result" || e.type === "turn.completed"), false);
    } finally { await f.close(); }
  }
});

test("a tool emitted despite disabled tools cannot execute a second time", async () => {
  const f = await fixture(); try {
    f.cloud.control = {actions:[{type:"slides.next"}]}; f.cloud.repeatTool = true;
    await assert.rejects(() => run(f), /重复请求/);
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 2);
    assert.equal(f.events.filter(e => e.type === "control.result").length, 1);
  } finally { await f.close(); }
});
test("history keeps six logical turns and resets on page changes", async () => {
  const f = await fixture(); try {
    for (let i = 0; i < 8; i++) await run(f, `test-turn-${i}`);
    f.cloud.requests = []; await f.conversation.begin("test-turn-new", new AbortController().signal);
    const history = () => JSON.parse(f.cloud.requests.find(e => e.type === "session.update")!.session.instructions.match(/<conversation_history>(.*?)<\/conversation_history>/s)![1]);
    assert.equal(history().length, 6);
    assert.ok(history().every((entry: {user:string;assistant:string}) => entry.user && entry.assistant));
    assert.equal(f.cloud.requests.filter(e => e.type === "conversation.item.create" && e.item.type === "message").length, 0);
    await f.store.applyClassroomEvent(f.session.id, { type: "set_slide", index: 4 });
    f.cloud.requests = []; await f.conversation.begin("test-turn-changed", new AbortController().signal);
    assert.equal(f.cloud.requests.filter(e => e.type === "conversation.item.create").length, 0);
    assert.equal(history().length, 0);
  } finally { await f.close(); }
});
test("realtime preserves the five modules and withheld answers while excluding legacy JSON instructions", async () => {
  const f = await fixture(); try {
    const snapshot = f.store.getClassroomSnapshot(f.session.id)!;
    const prompt = compileRealtimePrompt(snapshot);
    assert.equal(prompt.match(/<prompt_module scope=/g)?.length, 5);
    assert.doesNotMatch(prompt, /顶层键必须|你必须只返回一个 JSON|edu.classroom.assistant.response|纯操作保持静默|静默跳转/);
    assert.match(prompt, /操作可以简短语音确认/);
    assert.match(buildPromptWorkspace(snapshot.courseId, snapshot.courseTitle).compiled, /纯操作保持静默/);
    assert.match(prompt, /小麦老师|<lesson_context/);
    const hidden = buildPromptWorkspace("course-economic-mathematics", "经济数学", undefined, 1, "slides", undefined, undefined, undefined, "realtime");
    assert.match(hidden.compiled, /assistant_boundary/);
    const exercise = ECONOMIC_MATHEMATICS_SLIDES.find(s => s.kind === "exercise")!;
    const math = (await f.store.startClass("course-economic-mathematics"))!;
    await f.store.applyClassroomEvent(math.id, { type: "set_slide", index: exercise.index });
    await f.store.updateAssistantPrompt({ scope: "page", key: `course-economic-mathematics:${exercise.slideKey}`, text: "SECRET_UNREVEALED_ANSWER", expectedRevision: 0 }, "test-teacher");
    const protectedPrompt = compileRealtimePrompt(f.store.getClassroomSnapshot(math.id)!, f.store.getAssistantPromptSettings());
    assert.match(protectedPrompt, /当前页答案尚未揭示/);
    assert.doesNotMatch(protectedPrompt, /SECRET_UNREVEALED_ANSWER/);
  } finally { await f.close(); }
});

test("prompt edits invalidate a pending voice turn before actions or speech", async () => {
  const f = await fixture(); try {
    f.cloud.control = { actions: [{ type: "slides.next" }] };
    f.cloud.beforeResponse = async () => { await f.store.updateAssistantPrompt({scope:"agent",key:"global",text:"新的课堂指令",expectedRevision:0},"teacher"); };
    await assert.rejects(() => run(f), /已变化/);
    assert.equal(f.store.getClassroomSnapshot(f.session.id)!.slide.index, 1);
  } finally { await f.close(); }
});
test("legacy voice turns are rejected without invoking the text model or executing actions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-realtime-only-"));
  let calls = 0;
  const app = await buildApp({dataFile:join(dir,"state.json"),assistantProvider:{name:"unused", async *streamJson() { calls++; }} });
  try {
    const session = (await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions"})).json();
    const response = await app.inject({method:"POST",url:`/api/class-sessions/${session.id}/assistant/turns`,payload:{text:"下一页",source:"voice_asr"}});
    assert.equal(response.statusCode, 410);
    assert.equal(response.json().error, "CLASSROOM_REALTIME_REQUIRED");
    assert.equal(calls, 0);
    const snapshot = (await app.inject(`/api/class-sessions/${session.id}/snapshot`)).json();
    assert.equal(snapshot.slide.index, 1);
  } finally { await app.close(); await rm(dir,{recursive:true,force:true}); }
});

test("realtime config is opt-in, needs an endpoint, and supports a dedicated key", () => {
  assert.equal(realtimeAvailable(realtimeConfig({ DASHSCOPE_API_KEY: "synthetic" })), false);
  assert.equal(realtimeAvailable(realtimeConfig({ EDU_REALTIME_ENABLED:"true", DASHSCOPE_API_KEY: "synthetic" })), false);
  const config = realtimeConfig({ EDU_REALTIME_ENABLED:"true", EDU_REALTIME_URL:"wss://example.test/realtime", DASHSCOPE_API_KEY:"fallback",EDU_REALTIME_API_KEY:"dedicated" });
  assert.equal(realtimeAvailable(config), true);assert.equal(config.apiKey,"dedicated");
  assert.throws(() => realtimeConfig({EDU_REALTIME_URL:"http://example.test"}), /wss/);
});

test("campus realtime holds and releases per-turn admission; cancel is responsive during generation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-realtime-admission-"));
  let releaseResponse!: () => void;
  const cloud = new FakeCloud();cloud.beforeResponse = () => new Promise(resolve => { releaseResponse = resolve; });
  const app = await buildApp({dataFile:join(dir,"state.json"),campusMode:true,publicOrigin:"https://class.test",allowDevelopmentIdentity:false,
    identityProvider:{source:"teaching_information_system",async resolveActor({authorization}) { return authorization === "Bearer test-teacher" ? {actorId:"teacher",displayName:"教师",roles:["teacher"],identitySource:"teaching_information_system"} : null; }},
    realtimeConfig:{enabled:true,url:"wss://example.test",apiKey:"test",model:"test",voice:"test"},realtimeTransportFactory:()=>cloud,
    aiLimits:{dailyRequests:1,concurrency:1,queue:1,timeoutMs:5000}});
  let ws:WebSocket|undefined;
  try {
    await app.listen({host:"127.0.0.1",port:0});const port=(app.server.address() as {port:number}).port;
    const headers={authorization:"Bearer test-teacher"};
    const session=(await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions",headers})).json();
    ws=new WebSocket(`ws://127.0.0.1:${port}/api/class-sessions/${session.id}/assistant/realtime`,{origin:"https://class.test",headers});
    const events:RealtimeServerEvent[]=[];ws.on("message",raw=>events.push(JSON.parse(raw.toString())));
    const until=async(check:()=>boolean)=>{for(let i=0;i<300&&!check();i++)await new Promise(r=>setTimeout(r,10));assert.ok(check(),JSON.stringify(events));};
    await until(()=>events.some(e=>e.type==="session.ready"));
    ws.send(JSON.stringify({type:"turn.begin",turnId:"quota-turn-1"}));await until(()=>events.some(e=>e.type==="turn.started"));
    assert.equal((await app.inject({url:"/api/admin/ai",headers})).json().active,1);
    ws.send(JSON.stringify({type:"audio.append",turnId:"quota-turn-1",audioBase64:audio}));
    ws.send(JSON.stringify({type:"turn.commit",turnId:"quota-turn-1"}));await until(()=>Boolean(releaseResponse));
    ws.send(JSON.stringify({type:"turn.cancel",turnId:"quota-turn-1"}));await until(()=>events.some(e=>e.type==="turn.cancelled"));
    assert.equal((await app.inject({url:"/api/admin/ai",headers})).json().active,0);
    releaseResponse();
    ws.send(JSON.stringify({type:"turn.begin",turnId:"quota-turn-2"}));await until(()=>events.some(e=>e.type==="error"&&e.turnId==="quota-turn-2"));
    assert.ok(events.some(e=>e.type==="error"&&e.message.includes("额度")));
    assert.equal(events.filter(e=>e.type==="audio.delta").length,0);
  } finally { releaseResponse?.();ws?.terminate();await app.close();await rm(dir,{recursive:true,force:true}); }
});

test("real WebSocket upgrade enforces origin and teacher role, accepts one turn, and closes on shutdown", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-realtime-ws-"));
  const app = await buildApp({ dataFile: join(dir, "state.json"), portSimulationTickMs: 0, allowLegacyDevelopmentIdentity: false,
    realtimeConfig: { enabled: true, url: "wss://example.test/realtime", model: "test", voice: "test", apiKey: "test-only" }, realtimeTransportFactory: () => new FakeCloud() });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as { port: number }).port;
  const origin = `http://127.0.0.1:${port}`;
  const login = async (role: string) => (await app.inject({ method: "POST", url: "/api/identity/development/session", payload: { role, participantId: `test-${role}`, displayName: "测试" } })).headers["set-cookie"] as string;
  let ws: WebSocket | undefined;
  try {
    const teacher = await login("teacher"), student = await login("student");
    const session = (await app.inject({ method: "POST", url: "/api/courses/course-port-management-intro/class-sessions", headers: { cookie: teacher } })).json();
    const url = `ws://127.0.0.1:${port}/api/class-sessions/${session.id}/assistant/realtime`;
    const rejected = (cookie: string | undefined, source: string) => new Promise<number>((resolve, reject) => {
      const client = new WebSocket(url, { origin: source, headers: cookie ? { cookie } : {}, handshakeTimeout: 3000 });
      client.on("unexpected-response", (_, response) => { resolve(response.statusCode!); client.terminate(); }); client.on("error", () => {}); client.on("open", () => { client.close(); reject(new Error("unexpected upgrade")); });
    });
    assert.equal(await rejected(teacher, "https://evil.example"), 403);
    assert.equal(await rejected(student, origin), 403);
    assert.equal(await rejected(undefined, origin), 401);
    ws = new WebSocket(url, { origin, headers: { cookie: teacher } });
    const events: RealtimeServerEvent[] = [];
    ws.on("message", raw => events.push(JSON.parse(raw.toString())));
    const waitFor = async (type: string) => { for (let i = 0; i < 200; i++) { if (events.some(e => e.type === type)) return; await new Promise(r => setTimeout(r, 10)); } throw new Error(`missing ${type}: ${JSON.stringify(events)}`); };
    await waitFor("session.ready");
    ws.send(JSON.stringify({ type: "turn.begin", turnId: "websocket-turn-1" })); await waitFor("turn.started");
    ws.send(JSON.stringify({ type: "audio.append", turnId: "websocket-turn-1", audioBase64: audio }));
    ws.send(JSON.stringify({ type: "turn.commit", turnId: "websocket-turn-1" })); await waitFor("turn.completed");
    ws.send(JSON.stringify({ type: "turn.begin", turnId: "websocket-turn-1" })); await waitFor("error");
    assert.equal(events.filter(e => e.type === "audio.delta").length, 1);
    await app.close();
  } finally { ws?.terminate(); await app.close(); await rm(dir, { recursive: true, force: true }); }
});
