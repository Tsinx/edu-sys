import { z } from "zod";

export const defenseCriterionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  label: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(500),
  weight: z.number().int().min(1).max(100),
}).strict();
export const defaultDefenseCriteria = [
  { id: "reasoning", label: "思路解释", description: "解释解答中的关键步骤、依据与选择。", weight: 30 },
  { id: "concepts", label: "概念理解", description: "说明概念、假设及其适用条件。", weight: 25 },
  { id: "verification", label: "检验纠错", description: "检验结果、识别错误并提出修正。", weight: 20 },
  { id: "transfer", label: "迁移应用", description: "条件变化时调整方法并解释结果。", weight: 25 },
] as const;
export const defenseAssignmentInputSchema = z.object({
  requestId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  prompt: z.string().trim().min(10).max(8000),
  referenceAnswer: z.string().trim().max(8000).default(""),
  criteria: z.array(defenseCriterionSchema).min(2).max(6)
    .refine(v => new Set(v.map(c => c.id)).size === v.length && v.reduce((s, c) => s + c.weight, 0) === 100, "能力维度编号须唯一，权重合计须为100。"),
  questionCount: z.number().int().min(3).max(8).default(4),
  dueAt: z.iso.datetime().nullable().default(null),
}).strict().refine(v => v.questionCount >= v.criteria.length, "答辩题数不能少于能力维度数，以保证各维度都有考察机会。");
export type DefenseAssignmentInput = z.infer<typeof defenseAssignmentInputSchema>;
export type DefenseCriterion = z.infer<typeof defenseCriterionSchema>;
export interface DefenseAssignment extends Omit<DefenseAssignmentInput, "requestId" | "referenceAnswer"> {
  id: string;
  courseId: string;
  teacherId: string;
  status: "draft" | "published" | "closed";
  revision: number;
  createdAt: string;
  referenceAnswer?: string;
}
export interface DefenseQuestion {
  id: string;
  prompt: string;
  anchor: string;
  dimensionId: string;
  kind: "explain" | "probe" | "verify" | "transfer";
  source: "ai" | "rules" | "teacher";
  createdAt: string;
  answer?: { text: string; submittedAt: string };
  evaluation?: { level: number | null; evidence: string; rationale: string };
}
export interface DefenseReview {
  scores: Array<{ dimensionId: string; level: number; comment: string }>;
  feedback: string;
  total: number;
  released: boolean;
  teacherId: string;
  reviewedAt: string;
}
export interface DefenseSession {
  id: string;
  assignmentId: string;
  actorId: string;
  displayName: string;
  work: string;
  aiDisclosure: string;
  assignment: DefenseAssignment;
  status: "submitted" | "in_progress" | "completed" | "reviewed";
  revision: number;
  questions: DefenseQuestion[];
  createdAt: string;
  completedAt: string | null;
  review: DefenseReview | null;
}
export const defenseSubmissionSchema = z.object({
  requestId: z.string().uuid(), work: z.string().trim().min(20).max(20000),
  aiDisclosure: z.string().trim().max(2000).default(""),
}).strict();
export const defenseAnswerSchema = z.object({
  requestId: z.string().uuid(), revision: z.number().int().min(0),
  questionId: z.string().uuid(), text: z.string().trim().min(1).max(6000),
}).strict();
export const defenseReviewSchema = z.object({
  revision: z.number().int().min(0),
  scores: z.array(z.object({ dimensionId: z.string(), level: z.number().int().min(0).max(4), comment: z.string().trim().min(1).max(1000) }).strict()).min(2).max(6),
  feedback: z.string().trim().min(1).max(3000), released: z.boolean(),
}).strict();
export const defenseLevelLabels = ["尚未展示", "需要引导", "基本掌握", "独立掌握", "深入迁移"];
