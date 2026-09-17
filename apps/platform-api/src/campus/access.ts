import type { ClassroomActor } from "@edu/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ServerResponse } from "node:http";
import { campusError } from "./database.js";

export function studentRouteAllowed(method: string, path: string) {
  if (method === "POST" && path === "/api/port-operations/submissions") return true;
  if (["GET", "HEAD"].includes(method) && /^\/api\/port-operations\/(submissions\/[^/]+(?:\/replay)?|courses\/[^/]+\/results)$/.test(path)) return true; // ownership and course checked by service
  if (/^\/api\/(identity\/|edge\/records$|study-sessions(?:\/|$))/.test(path)) return true;
  if (/^\/api\/class-sessions\/[^/]+\/participation(?:\/|$)/.test(path)) return true; // fine-grained service checks
  if (method === "GET" || method === "HEAD") return /^\/api\/(courses(?:\/[^/]+)?|class-sessions(?:\/[^/]+(?:\/snapshot(?:\/stream)?|\/presence(?:\/stream)?)?)?)$/.test(path);
  return method === "POST" && /^\/api\/class-sessions\/[^/]+\/presence\/(heartbeat|leave)$/.test(path);
}

export function registerCampusAccess(app: FastifyInstance, resolve: (request: FastifyRequest) => Promise<ClassroomActor | null>, options: {
  enforce: boolean; publicOrigin?: string; campusMode: boolean; studentAiEnabled?: boolean;
  allowedCourseIds?: (actor: ClassroomActor) => string[] | null;
  classCourseId?: (id: string) => string | undefined;
  studyCourseId?: (id: string, actor: ClassroomActor) => string | undefined;
}) {
  const streams=new Set<ServerResponse>();
  app.addHook("preClose",async()=>{for(const response of streams)response.end();});
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0]!;
    if (!path.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    if (!options.enforce) return;
    const origin = request.headers.origin;
    const expected = options.publicOrigin ?? `${request.protocol}://${request.headers.host}`;
    if (origin && origin !== expected) throw campusError(403,"ORIGIN_FORBIDDEN","请求来源与教学站点不一致。");
    if (["/api/health", "/api/runtime/config", "/api/identity/login", "/api/identity/session", "/api/identity/development/session"].includes(path)) return;
    const actor = await resolve(request);
    if (!actor) throw campusError(401,"IDENTITY_SESSION_REQUIRED","请先登录教学平台。");
    if (!actor.roles.includes("teacher") && options.studentAiEnabled === false && /\/(assistant\/turns|asr|tts)\/?$/.test(path)) {
      throw campusError(403,"STUDENT_AI_DISABLED","学生 AI 暂未开放，课件阅读与仿真实验可正常使用。");
    }
    if (options.campusMode && /^\/api\/class-sessions\/[^/]+\/simulation\/teams(?:\/|$)/.test(path)) {
      throw campusError(410,"LOCAL_SIMULATION_REQUIRED","校园部署使用端侧个人仿真，请从模拟实验入口进入。");
    }
    if (!actor.roles.includes("teacher") && !studentRouteAllowed(request.method,path)) {
      throw campusError(403,"ACTOR_ROLE_FORBIDDEN","该操作仅对教师开放。");
    }
  });
  app.addHook("preHandler", async request => {
    if (!options.enforce || !request.url.startsWith("/api/")) return;
    const actor = await resolve(request);
    if (!actor || actor.roles.includes("teacher")) return;
    const allowed = options.allowedCourseIds?.(actor);
    if (!allowed) return;
    const path = request.routeOptions.url ?? request.url.split("?")[0]!;
    const params = request.params as Record<string, string>;
    let courseId: string | undefined;
    if (path.startsWith("/api/courses/")) courseId = params.courseId ?? params.id;
    if (path.startsWith("/api/class-sessions/")) courseId = options.classCourseId?.(params.sessionId ?? params.id ?? "");
    if (path.startsWith("/api/study-sessions/")) courseId = options.studyCourseId?.(params.sessionId ?? params.id ?? "", actor);
    if (path === "/api/study-sessions" && request.method === "POST") {
      courseId = (request.body as {courseId?: string} | null)?.courseId;
    }
    if (courseId && !allowed.includes(courseId)) throw campusError(403,"COURSE_ACCESS_FORBIDDEN","该账号尚未加入此课程。");
  });
  app.addHook("preHandler",async(request,reply)=>{
    if(!options.enforce || !request.url.split("?")[0]!.endsWith("/stream"))return;
    const initial=await resolve(request);if(!initial)return;
    streams.add(reply.raw);
    const timer=setInterval(()=>{
      void resolve(request).then(current=>{
        if(!current || current.actorId!==initial.actorId || reply.raw.writableLength>256*1024)reply.raw.end();
      }).catch(()=>reply.raw.end());
    },15_000);timer.unref();
    reply.raw.once("close",()=>{clearInterval(timer);streams.delete(reply.raw);});
  });
}
