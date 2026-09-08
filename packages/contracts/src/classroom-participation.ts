import { z } from "zod";

const optionSchema = z.object({ id: z.string().regex(/^[A-F]$/), text: z.string().trim().min(1).max(200) }).strict();
export const classroomQuestionInputSchema = z.object({
  kind: z.literal("question"),
  requestId: z.string().uuid(),
  question: z.string().trim().min(1).max(300),
  mode: z.enum(["single", "multiple"]),
  options: z.array(optionSchema).min(2).max(6),
  correctOptionIds: z.array(z.string()).max(6).default([]),
  explanation: z.string().trim().max(1200).default("")
}).strict().superRefine((value, ctx) => {
  const ids = new Set(value.options.map(o => o.id));
  if (ids.size !== value.options.length || new Set(value.correctOptionIds).size !== value.correctOptionIds.length ||
    value.correctOptionIds.some(id => !ids.has(id)) || (value.mode === "single" && value.correctOptionIds.length > 1)) {
    ctx.addIssue({ code: "custom", message: "选项编号或正确答案不符合题型" });
  }
});
export const classroomRollCallInputSchema = z.object({
  kind: z.literal("roll_call"), requestId: z.string().uuid(),
  participantId: z.string().max(160).optional(),
  avoidRepeats: z.boolean().default(true)
}).strict();
export const classroomParticipationCreateSchema = z.union([classroomQuestionInputSchema, classroomRollCallInputSchema]);
export type ClassroomParticipationCreate = z.infer<typeof classroomParticipationCreateSchema>;
export const classroomAnswerInputSchema = z.object({ optionIds: z.array(z.string().regex(/^[A-F]$/)).max(6) }).strict();
export const classroomJoinInputSchema = z.object({ displayName: z.string().trim().min(1).max(40) }).strict();
export const classroomParticipationActionSchema = z.object({ action: z.enum(["close", "reveal", "dismiss"]) }).strict();

export const classroomExerciseInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  lesson: z.number().int().min(1).max(100),
  pack: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(40),
  order: z.number().int().min(0).max(999),
  minute: z.number().min(0).max(240),
  slide: z.number().int().min(1).max(2000),
  durationSeconds: z.number().int().min(10).max(1800),
  optional: z.boolean(),
  collaboration: z.enum(["individual", "discussion"]),
  teachingCue: z.string().trim().max(3000),
  assistantCue: z.string().trim().max(1500),
  archived: z.boolean().default(false),
  content: classroomQuestionInputSchema
}).strict();
export type ClassroomExerciseInput = z.infer<typeof classroomExerciseInputSchema>;
export type ClassroomExercise = ClassroomExerciseInput & { id: string; version: number; publishedCount: number };
export const classroomExerciseSaveSchema = z.object({ id: z.string().min(1).max(100), expectedVersion: z.number().int().min(0), exercise: classroomExerciseInputSchema }).strict();
export const classroomExercisePublishSchema = z.object({ requestId: z.string().uuid(), expectedVersion: z.number().int().min(1) }).strict();
export const classroomGroupsInputSchema = z.union([
  z.object({ action: z.literal("auto"), size: z.number().int().min(2).max(10) }).strict(),
  z.object({ action: z.literal("assign"), actorId: z.string().min(1).max(160), group: z.string().trim().max(30) }).strict()
]);

export interface ClassroomParticipationView {
  revision: number;
  isLive: boolean;
  isTeacher: boolean;
  joined: boolean;
  displayName: string;
  group: string;
  active: {
    id: string;
    kind: "question" | "roll_call";
    status: "open" | "closed" | "revealed";
    question: string;
    mode: "single" | "multiple";
    options: Array<{ id: string; text: string }>;
    calledStudent: { displayName: string; isYou: boolean } | null;
    ownAnswer: { optionIds: string[]; submittedAt: string } | null;
    responseCount: number | null;
    counts: Record<string, number> | null;
    correctOptionIds: string[] | null;
    explanation: string | null;
  } | null;
  roster: Array<{ actorId: string; displayName: string; online: boolean; calledCount: number; answered: boolean; group: string }> | null;
  groupResults: Array<{ group: string; members: number; responded: number }> | null;
  history: Array<{ id: string; kind: "question" | "roll_call"; title: string; status: string; responseCount: number; createdAt: string }> | null;
}
