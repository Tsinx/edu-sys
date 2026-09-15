import { z } from "zod";

export const assistantPromptScopeSchema = z.enum(["agent", "course", "lesson", "page", "tools"]);
export type AssistantPromptScope = z.infer<typeof assistantPromptScopeSchema>;
export const assistantPromptUpdateSchema = z.object({
  scope: assistantPromptScopeSchema,
  key: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(12000).nullable(),
  expectedRevision: z.number().int().nonnegative()
}).strict();
export type AssistantPromptUpdate = z.infer<typeof assistantPromptUpdateSchema>;
export interface AssistantPromptSettings {
  revision: number;
  overrides: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
}
export interface AssistantPromptModule {
  scope: AssistantPromptScope;
  key: string;
  title: string;
  defaultText: string;
  text: string;
  overridden: boolean;
  runtimeContext: string;
}
export interface AssistantPromptWorkspace {
  courseId: string;
  revision: number;
  modules: AssistantPromptModule[];
  compiled: string;
  pages: Array<{ key: string; index: number; lesson: number; title: string }>;
  experiments: Array<{ key: string; title: string }>;
  coverage: { slides: number; lessons: number; experiments: number; coveredSlides: number };
}
