import { useEffect, useRef, useState } from "react";
import type { PortCourseSelection, PortSubmissionPackage } from "@edu/port-simulation-core";
import type { LabStorage } from "./useTerminalTraining";
import { api } from "../../api";
import { resultRequest, submissionStatus, type SubmissionInput, type SubmissionSummary, type ResultsResponse, type SubmissionContext } from "./submission-api";
interface Pending { input: SubmissionInput; runId: string; response?: SubmissionSummary }
export function PortSubmissionPanel({ context, storage, unit, runId, eligible, busy: sealing, sealed, seal }: {
  context: SubmissionContext; storage?: LabStorage | null; unit: PortCourseSelection; runId: string; eligible: boolean; busy: boolean; sealed: boolean; seal: () => Promise<PortSubmissionPackage>;
}) {
  const key = `edu-port-operations:submission:${context.courseId}:${unit}`;
  const [pending, setPending] = useState<Pending | null>(() => { try { return JSON.parse(storage?.getItem(key) ?? "null"); } catch { return null; } });
  const [latest, setLatest] = useState<SubmissionSummary>(), [student, setStudent] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const active = useRef(true), sending = useRef(false);
  const refresh = async () => {
    const data = await resultRequest<ResultsResponse>(`courses/${context.courseId}/results`);
    const value = data.rows.find(row => row.actorId === context.actorId)?.results.find(r => r.unit === unit);
    if (active.current) setLatest(value);
    return value;
  };
  useEffect(() => {
    active.current = true;
    void api.getIdentitySession().then(identity => {
      if (active.current) setStudent(identity.actor.actorId === context.actorId && identity.actor.roles.includes("student") && !identity.actor.roles.includes("teacher"));
    }).catch(() => { if (active.current) { setStudent(true); setError("请联网并重新登录后提交，练习记录仍保存在本机。"); } });
    void refresh().catch(reason => { if (active.current) setError(reason.message); });
    return () => { active.current = false; };
  }, [context.actorId, key]);
  const persist = async (value: Pending) => { storage?.setItem(key, JSON.stringify(value)); await storage?.flush?.(); if (active.current) setPending(value); };
  useEffect(() => {
    if (!pending?.response || !["queued", "verifying"].includes(pending.response.status)) return;
    let stopped = false;
    const timer = setTimeout(() => {
      void resultRequest<SubmissionSummary>(`submissions/${pending.response!.id}`).then(async response => {
        if (stopped) return;
        await persist({ ...pending, response });
        if (response.status === "verified") { await refresh(); setError(""); }
      }).catch(reason => { if (!stopped) setError(`核验状态暂未更新：${reason.message}，可重新读取。`); });
    }, 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [pending]);
  async function submit() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    let attempted: Pending | null = pending;
    try {
      let next = pending;
      if (!next || next.runId !== runId) {
        const pkg = await seal();
        next = { runId, input: { requestId: crypto.randomUUID(), courseId: context.courseId, ...(context.classSessionId ? { classSessionId: context.classSessionId } : {}), expectedRevision: latest?.revision ?? 0, package: pkg } };
        await persist(next); // durable before network; retry sends the identical request
      } else if (next.response?.status === "rejected") {
        const current = await refresh();
        next = { ...next, response: undefined, input: { ...next.input, requestId: crypto.randomUUID(), expectedRevision: current?.revision ?? 0 } };
        await persist(next);
      }
      attempted = next;
      const identity = await api.getIdentitySession();
      if (identity.actor.actorId !== context.actorId || !identity.actor.roles.includes("student") || identity.actor.roles.includes("teacher")) throw new Error("当前账号已改变，请使用原学生账号重新登录后提交。");
      const response = await resultRequest<SubmissionSummary>("submissions", next.input);
      await persist({ ...next, response });
      if (response.status === "verified") await refresh();
    } catch (reason) {
      if ((reason as { status?: number }).status === 409 && attempted) {
        // A conflict is not a lost acknowledgement: a subsequent explicit retry can rebase.
        const response = { id: "", status: "rejected", error: (reason as Error).message } as SubmissionSummary;
        await persist({ ...attempted, response });
      }
      setError((reason as Error).message);
    } finally { sending.current = false; if (active.current) setBusy(false); }
  }
  if (!student) return null;
  const sameRun = pending?.runId === runId, state = sameRun ? pending?.response?.status : undefined;
  const inFlight = state === "queued" || state === "verifying";
  return <section className="port-submission-card" aria-label="实验成绩提交">
    <h3>提交本次实验</h3>
    <p>{unit === "full" ? "完成48小时实战后，可提交成绩与完整操作记录。" : "可主动结束后提交；按实际目标占比记录完成度；耗时、成本与错误另列，完成度100不代表效率最优。"} 每个实验保留最近一份有效提交。</p>
    {latest?.result && <p className="port-result-success">最近有效提交：<strong>{latest.result.score.toFixed(2)} 分</strong> · {new Date(latest.updatedAt).toLocaleString("zh-CN")}</p>}
    <p role="status">{sameRun ? state ? submissionStatus[state] : "待上传 · 封存记录已保存在本机" : sealed ? "本次已封存，可重试提交或开始新练习" : "当前练习尚未提交"}{sameRun && pending?.response?.error ? `：${pending.response.error}` : ""}</p>
    {error && <p role="alert">{error}</p>}
    <div className="port-actions"><button disabled={busy || sealing || !eligible || inFlight || state === "verified"} onClick={() => void submit()}>{busy || sealing ? "正在封存与上传…" : state === "verified" ? "本次已提交" : sameRun ? "重试提交" : unit === "full" ? "提交教师" : "结束并提交"}</button>
      <button disabled={busy} onClick={() => { void refresh().then(async () => { if (pending?.response?.id && inFlight) await persist({ ...pending, response: await resultRequest<SubmissionSummary>(`submissions/${pending.response.id}`) }); setError(""); }).catch(reason => setError(reason.message)); }}>读取最新状态</button></div>
  </section>;
}
