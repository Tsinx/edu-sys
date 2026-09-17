import type { PortCourseSelection, PortSubmissionPackage, PortSubmissionResult, PortEvidenceNode } from "@edu/port-simulation-core";
export const PORT_RESULT_COURSE = "course-port-management-intro";
export interface SubmissionContext { actorId: string; courseId: string; classSessionId?: string }
export interface SubmissionSummary { id: string; actorId: string; displayName: string; unit: PortCourseSelection; status: "queued" | "verifying" | "verified" | "rejected"; revision: number; createdAt: string; updatedAt: string; error: string | null; result: PortSubmissionResult | null }
export interface SubmissionInput { requestId: string; courseId: string; classSessionId?: string; expectedRevision: number; package: PortSubmissionPackage }
export interface ResultRow { actorId: string; identifier: string; displayName: string; results: SubmissionSummary[]; pending: SubmissionSummary[] }
export interface ResultsResponse { teacher: boolean; rows: ResultRow[] }
export interface ReplayResponse { package: PortSubmissionPackage; result: PortSubmissionResult; nodes: PortEvidenceNode[]; report: unknown }
export const submissionStatus = { queued: "等待核验", verifying: "核验中", verified: "提交成功", rejected: "核验失败" };
export async function resultRequest<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api/port-operations/${path}`, { method: data ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(30000), headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.message ?? "实验成绩服务暂不可用。"), { status: response.status });
  return value as T;
}
export function downloadRecord(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
