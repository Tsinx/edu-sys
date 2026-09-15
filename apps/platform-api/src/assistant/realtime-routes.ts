import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { realtimeClientEventSchema, type ClassroomActor, type RealtimeServerEvent } from "@edu/contracts";
import type { JsonStateStore } from "../store.js";
import type { AiAdmission } from "../campus/ai-admission.js";
import { RealtimeConversation } from "./realtime-conversation.js";
import { QwenRealtimeTransport, realtimeAvailable, type RealtimeConfig, type RealtimeTransport } from "./realtime-provider.js";

export interface RealtimeRouteOptions {
  store: JsonStateStore; config: RealtimeConfig; campusMode: boolean; publicOrigin?: string;
  requireTeacher: (request: IncomingMessage) => Promise<ClassroomActor>;
  activeTurns: Map<string, AbortController>; admission?: AiAdmission;
  transportFactory?: () => RealtimeTransport;
}
export function realtimeOriginAllowed(request: IncomingMessage, publicOrigin?: string, campusMode = false) {
  const origin = request.headers.origin;
  if (!origin || origin === "null") return false;
  if (publicOrigin) return origin === publicOrigin;
  if (campusMode) return false;
  try {
    const url = new URL(origin);
    return url.origin === origin && url.host === request.headers.host &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && ["https:", "http:"].includes(url.protocol);
  } catch { return false; }
}

export function registerRealtimeRoutes(app: FastifyInstance, options: RealtimeRouteOptions) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024, perMessageDeflate: false });
  const cleanup = new Set<() => void>();
  const reject = (socket: Duplex, code: number) => { socket.end(`HTTP/1.1 ${code} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
  const upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const match = /^\/api\/class-sessions\/([^/?]+)\/assistant\/realtime$/.exec(request.url ?? "");
    if (!match) { reject(socket, 404); return; }
    if (!realtimeOriginAllowed(request, options.publicOrigin, options.campusMode)) { reject(socket, 403); return; }
    if (!realtimeAvailable(options.config)) { reject(socket, 503); return; }
    void (async () => {
      const actor = await options.requireTeacher(request);
      if (socket.destroyed) return;
      const sessionId = decodeURIComponent(match[1]!);
      if (options.store.getSession(sessionId)?.status !== "live") { reject(socket, 409); return; }
      wss.handleUpgrade(request, socket, head, ws => connection(ws, request, sessionId, actor));
    })().catch(error => { if (!socket.destroyed) reject(socket, Number(error.statusCode) || 401); });
  };
  function connection(ws: WebSocket, request: IncomingMessage, sessionId: string, actor: ClassroomActor) {
    const lifetime = new AbortController();
    let conversation: RealtimeConversation | undefined;
    let connecting: Promise<void> | undefined;
    type ActiveTurn = { id: string; controller: AbortController; release?: (status: string) => void; timer: ReturnType<typeof setTimeout>; submitted: boolean };
    let current: ActiveTurn | undefined;
    const seen = new Set<string>();
    let lastActivity = Date.now();
    let pendingBytes = 0;
    let queue = Promise.resolve();
    let alive = true;
    const emit = (event: RealtimeServerEvent) => {
      if (lifetime.signal.aborted || ws.readyState !== WebSocket.OPEN) return;
      if (ws.bufferedAmount > 2 * 1024 * 1024) { close(); return; }
      ws.send(JSON.stringify(event));
    };
    const dropCloud = () => { conversation?.close(); conversation = undefined; };
    const finish = (status: string, cancel = false) => {
      const turn = current;
      if (!turn) return;
      current = undefined;
      clearTimeout(turn.timer);
      if (options.activeTurns.get(sessionId) === turn.controller) options.activeTurns.delete(sessionId);
      if (cancel) { turn.controller.abort(); dropCloud(); }
      turn.release?.(status); lastActivity = Date.now();
    };
    const fail = (reason: unknown, turnId = current?.id) => {
      emit({ type: "error", turnId, code: "REALTIME_FAILED", message: reason instanceof Error ? reason.message : "实时语音失败，请重试或使用文字输入。" });
      finish("failed", true); dropCloud();
    };
    const connect = () => {
      if (connecting) return connecting;
      if (conversation) return Promise.resolve();
      connecting = (async () => {
        const cloud = options.transportFactory?.() ?? new QwenRealtimeTransport(options.config);
        const next = new RealtimeConversation(cloud, options.store, sessionId, emit);
        conversation = next;
        try { await cloud.open(AbortSignal.any([lifetime.signal, AbortSignal.timeout(20_000)])); }
        catch (error) { next.close(); if (conversation === next) conversation = undefined; throw error; }
        if (lifetime.signal.aborted || conversation !== next) { next.close(); throw new Error("连接已取消。"); }
      })().finally(() => { connecting = undefined; });
      return connecting;
    };
    const close = () => {
      if (lifetime.signal.aborted) return;
      finish("interrupted", true); lifetime.abort(); dropCloud(); clearInterval(heartbeat); cleanup.delete(close); ws.terminate();
    };
    cleanup.add(close);
    ws.on("close", close); ws.on("error", close); ws.on("pong", () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { close(); return; } alive = false; ws.ping();
      void options.requireTeacher(request).then(next => { if (next.actorId !== actor.actorId) close(); }).catch(close);
      if (options.store.getSession(sessionId)?.status !== "live") { close(); return; }
      if (!current && !connecting && Date.now() - lastActivity > 120_000 && conversation) { dropCloud(); emit({ type: "session.idle" }); }
    }, 15_000); heartbeat.unref();
    ws.on("message", (raw, binary) => {
      const size = Array.isArray(raw) ? raw.reduce((n, b) => n + b.byteLength, 0) : raw.byteLength;
      if (binary) { fail(new Error("音频输入格式无效。")); close(); return; }
      let event;
      try { event = realtimeClientEventSchema.parse(JSON.parse(raw.toString())); }
      catch { fail(new Error("实时语音事件格式无效。")); close(); return; }
      // Cancel can interrupt a pending upstream session.update or admission.
      if (event.type === "turn.cancel" && current?.id === event.turnId) {
        emit({ type: "turn.cancelled", turnId: event.turnId }); finish("cancelled", true); return;
      }
      if ((pendingBytes += size) > 256 * 1024) { fail(new Error("音频输入积压，本轮已停止。")); close(); return; }
      queue = queue.then(async () => {
        if (lifetime.signal.aborted) return;
        lastActivity = Date.now();
        if (event.type === "turn.begin") {
          if (current) throw new Error("上一轮尚未结束。");
          if (seen.has(event.turnId)) throw new Error("重复轮次已拒绝，请重新录音。");
          if (seen.size >= 500) { close(); return; }
          seen.add(event.turnId);
          const teacher = await options.requireTeacher(request);
          if (teacher.actorId !== actor.actorId) throw new Error("教师身份已变化，请重新进入课堂。");
          if (options.store.getSession(sessionId)?.status !== "live") throw new Error("课堂已结束。");
          options.activeTurns.get(sessionId)?.abort("replaced-by-realtime");
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort("turn-timeout"), options.admission?.limits.timeoutMs ?? 120_000); timer.unref();
          const turn = current = { id: event.turnId, controller, timer, submitted: false } as ActiveTurn;
          options.activeTurns.set(sessionId, controller);
          controller.signal.addEventListener("abort", () => {
            if (current === turn) { emit({ type: "turn.cancelled", turnId: turn.id }); finish("interrupted", true); }
          }, { once: true });
          turn.release = await options.admission?.enter(teacher, "realtime", controller.signal);
          if (controller.signal.aborted) { turn.release?.("interrupted"); return; }
          await connect();
          await conversation!.begin(turn.id, controller.signal);
          controller.signal.throwIfAborted();
          emit({ type: "turn.started", turnId: turn.id });
        } else if (event.type === "turn.cancel") {
          if (current?.id === event.turnId) { emit({ type: "turn.cancelled", turnId: event.turnId }); finish("cancelled", true); }
        } else {
          const turn = current;
          if (!turn || event.turnId !== turn.id || turn.submitted) throw new Error("轮次已结束，不能继续上传或重复提交。");
          if (event.type === "audio.append") conversation!.append(turn.id, event.audioBase64);
          else {
            turn.submitted = true;
            // Do not await generation in the input queue: cancel must remain responsive.
            void conversation!.commit(turn.id).then(() => { if (current === turn) finish("completed"); }).catch(error => {
              if (current === turn) fail(error, turn.id);
            });
          }
        }
      }).catch(error => {
        if (current?.id === event.turnId) fail(error, event.turnId);
        else emit({ type: "error", turnId: event.turnId, code: "TURN_REJECTED", message: error instanceof Error ? error.message : "轮次已失效。" });
      }).finally(() => { pendingBytes -= size; });
    });
    void connect().then(() => emit({ type: "session.ready" })).catch(error => { fail(error); ws.close(1011, "Realtime unavailable"); });
  }
  app.server.on("upgrade", upgrade);
  app.addHook("preClose", async () => { app.server.off("upgrade", upgrade); for (const close of cleanup) close(); wss.close(); });
}
