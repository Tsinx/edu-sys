import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { assistantPromptUpdateSchema, type ClassroomActor } from "@edu/contracts";
import type { JsonStateStore } from "../store.js";
import { buildPromptWorkspace, compileClassroomPrompt } from "./prompts.js";

const selectionSchema = z.object({
  index: z.coerce.number().int().positive().default(1),
  activity: z.enum(["slides", "globe", "simulation", "whiteboard", "video", "interaction"]).default("slides")
});

export function registerAssistantPromptRoutes(app: FastifyInstance, store: JsonStateStore, requireTeacher: (request: FastifyRequest) => Promise<ClassroomActor>) {
  app.get<{ Params: { id: string } }>("/api/courses/:id/assistant-prompts", async (request, reply) => {
    await requireTeacher(request);
    const course = store.getCourse(request.params.id);
    if (!course) return reply.code(404).send({ message: "课程不存在" });
    const selection = selectionSchema.parse(request.query);
    return buildPromptWorkspace(course.id, course.title, store.getAssistantPromptSettings(), selection.index, selection.activity);
  });
  app.patch<{ Params: { id: string } }>("/api/courses/:id/assistant-prompts", async (request, reply) => {
    const actor = await requireTeacher(request);
    const course = store.getCourse(request.params.id);
    if (!course) return reply.code(404).send({ message: "课程不存在" });
    const selection = selectionSchema.parse(request.query);
    const input = assistantPromptUpdateSchema.parse(request.body);
    const workspace = buildPromptWorkspace(course.id, course.title, store.getAssistantPromptSettings(), selection.index, selection.activity);
    if (!workspace.modules.some(m => m.scope === input.scope && m.key === input.key)) {
      return reply.code(400).send({ message: "提示词目标与当前课程、讲次或页面不匹配" });
    }
    const settings = await store.updateAssistantPrompt(input, actor.actorId);
    return buildPromptWorkspace(course.id, course.title, settings, selection.index, selection.activity);
  });
  app.get<{ Params: { id: string } }>("/api/class-sessions/:id/assistant-prompts", async (request, reply) => {
    await requireTeacher(request);
    const snapshot = store.getClassroomSnapshot(request.params.id);
    if (!snapshot) return reply.code(404).send({ message: "课堂不存在" });
    return compileClassroomPrompt(snapshot, store.getAssistantPromptSettings());
  });
}
