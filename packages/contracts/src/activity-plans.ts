import { z } from "zod";
import type { ClassroomExerciseInput, ClassSession } from "./index.js";
export const activityPlanSaveSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            exerciseId: z.string().min(1).max(100),
            exerciseVersion: z.number().int().positive(),
            minute: z.number().min(0).max(240),
            durationSeconds: z.number().int().min(10).max(1800),
            slide: z.number().int().min(1).max(2000),
            optional: z.boolean(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type ActivityPlanInput = z.infer<typeof activityPlanSaveSchema>;
export type ActivityPlanItem = ActivityPlanInput["items"][number] & {
  snapshot: ClassroomExerciseInput;
  availableVersion: number | null;
  archived: boolean;
};
export interface ActivityPlan {
  courseId: string;
  lesson: number;
  version: number;
  updatedAt: string | null;
  items: ActivityPlanItem[];
}
export interface ActivityExecution {
  lesson: number;
  planVersion: number;
  items: Array<
    ActivityPlanItem & {
      activityId?: string;
      status: "pending" | "open" | "closed" | "revealed" | "skipped";
    }
  >;
}
export interface ActivityHistoryRow {
  id: string;
  sessionId: string;
  kind: "question" | "roll_call";
  title: string;
  status: string;
  createdAt: string;
  revealedAt: string | null;
  responseCount: number | null;
  ownSubmitted: boolean;
}
export interface ActivityHistoryDetail extends ActivityHistoryRow {
  question: string;
  mode: "single" | "multiple";
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[] | null;
  explanation: string | null;
  ownAnswer: { optionIds: string[]; submittedAt: string } | null;
  counts: Record<string, number> | null;
  correctRate: number | null;
  members: number | null;
  answers: Array<{
    actorId: string;
    displayName: string;
    group: string;
    optionIds: string[];
    submittedAt: string;
    correct: boolean | null;
  }> | null;
  groups: Array<{ group: string; members: number; responded: number }> | null;
}
export interface ActivityHistoryPage {
  rows: ActivityHistoryRow[];
  total: number;
  page: number;
}
export interface ActivitySessionPage {
  rows: Array<ClassSession & { activityCount: number }>;
  total: number;
  page: number;
}
