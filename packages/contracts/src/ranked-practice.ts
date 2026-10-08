import { z } from "zod";

export const practiceOptionIdSchema = z.enum(["A", "B", "C", "D"]);
export const practiceSourceSchema = z.object({
  book: z.literal("Jacques, Mathematics for Economics and Business, 9th edition (2018)"),
  section: z.string(), selection: z.string(), subpart: z.string(),
  printedPage: z.number().int().positive(), pdfPage: z.number().int().positive(),
  wordingAdaptation: z.string(), optionAdaptation: z.string(),
}).strict();
export const practiceGraphSchema = z.object({
  coefficients: z.array(z.number()).min(1).max(6),
  xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number(),
  xLabel: z.string(), yLabel: z.string(), caption: z.string(),
}).strict();
export const practiceQuestionSchema = z.object({
  id: z.string(), version: z.string(), rank: z.number().int().min(1).max(4),
  optional: z.boolean(), stem: z.string().min(1),
  options: z.array(z.object({ id: practiceOptionIdSchema, text: z.string().min(1) }).strict()).length(4),
  source: practiceSourceSchema, graph: practiceGraphSchema.optional(),
}).strict().superRefine((q, ctx) => {
  if (q.options.map(o => o.id).join("") !== "ABCD") ctx.addIssue({ code: "custom", message: "Options must be A–D in order." });
  if (new Set(q.options.map(o => o.text)).size !== 4) ctx.addIssue({ code: "custom", message: "Four distinct options are required." });
  if (q.optional !== (q.rank === 4)) ctx.addIssue({ code: "custom", message: "Only Challenge is optional." });
});
export const practicePackSchema = z.object({
  schemaVersion: z.literal(1), id: z.string(), version: z.string(), courseId: z.string(),
  lesson: z.number().int().min(1).max(16), title: z.string(), locale: z.literal("en"),
  durationMinutes: z.literal(20), questions: z.array(practiceQuestionSchema).length(10),
}).strict().superRefine((p, ctx) => {
  if (p.questions.map(q => q.rank).join("") !== "1112223334") ctx.addIssue({ code: "custom", message: "Rank distribution must be 3/3/3/1." });
  if (new Set(p.questions.map(q => q.id)).size !== 10) ctx.addIssue({ code: "custom", message: "Question IDs must be unique." });
});
export type PracticeOptionId = z.infer<typeof practiceOptionIdSchema>;
export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;
export type PracticePack = z.infer<typeof practicePackSchema>;
export type PracticeSource = z.infer<typeof practiceSourceSchema>;
export type PracticeGraph = z.infer<typeof practiceGraphSchema>;
export interface PracticeResult {
  questionId: string; selectedOptionId: PracticeOptionId | null;
  status: "correct" | "incorrect" | "not-attempted";
  correctOptionId: PracticeOptionId; solution: string;
  optionExplanations: Record<PracticeOptionId, string>;
}
export interface PracticeResponse {
  schemaVersion: 1; questionId: string; selectedOptionId: PracticeOptionId;
  revision: number; savedAt: string;
}
export interface PracticeSubmission {
  submittedAt: string | null;
  mode: "manual" | "automatic" | null;
  /** Revisions remain allowed after manual submission until the run closes. */
  hasUnsubmittedChanges: boolean;
  finalizedAt: string | null;
  finalizationReason: "deadline" | "teacher" | "class-ended" | null;
}
export interface PracticeRunView {
  schemaVersion: 1; id: string; sessionId: string; pack: PracticePack;
  status: "open" | "closed" | "revealed"; openedAt: string; closedAt: string | null;
  revealedAt: string | null; responses: PracticeResponse[];
  answered: number; correct: number | null; results: PracticeResult[] | null;
  /** Optional for persisted pre-timer runs and independently used viewers. */
  serverNow?: string; durationSeconds?: number | null; deadlineAt?: string | null;
  closeReason?: "deadline" | "teacher" | "class-ended" | null;
  submission?: PracticeSubmission;
  summary?: { students: { actorId: string; displayName: string; answered: number; correct: number | null; submission?: PracticeSubmission }[];
    questions: { questionId: string; attempted: number; correct: number | null; choices: Record<PracticeOptionId, number> }[] };
}
export const practiceOpenSchema = z.object({ requestId: z.uuid(), lesson: z.number().int().min(1).max(16), durationSeconds: z.number().int().min(10).max(7200).default(1200) }).strict();
export const practiceAnswerSchema = z.object({ selectedOptionId: practiceOptionIdSchema, expectedRevision: z.number().int().nonnegative() }).strict();
