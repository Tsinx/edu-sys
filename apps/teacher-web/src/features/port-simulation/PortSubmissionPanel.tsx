import { useEffect, useRef, useState } from "react";
import type { PortCourseSelection, PortSubmissionPackage } from "@edu/port-simulation-core";
import type { LabStorage } from "./useTerminalTraining";
import { api } from "../../api";
import { resultRequest, submissionStatus, type SubmissionInput, type SubmissionSummary, type ResultsResponse, type SubmissionContext, type TasksResponse } from "./submission-api";
interface Pending { input: SubmissionInput; runId: string; response?: SubmissionSummary }
export function PortSubmissionPanel({ context, storage, unit, runId, eligible, busy: sealing, sealed, seal }: {
  context: SubmissionContext; storage?: LabStorage | null; unit: PortCourseSelection; runId: string; eligible: boolean; busy: boolean; sealed: boolean; seal: () => Promise<PortSubmissionPackage>;
}) {
  const key = `edu-port-operations:submission:${context.courseId}:${unit}`;
  const [pending, setPending] = useState<Pending | null>(() => { try { return JSON.parse(storage?.getItem(key) ?? "null"); } catch { return null; } });
  const [latest, setLatest] = useState<SubmissionSummary>(), [student, setStudent] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const active = useRef(true), sending = useRef(false);
  const [published, setPublished] = useState(false);
  const refreshTask = async () => {
    const data = await resultRequest<TasksResponse>(`courses/${context.courseId}/tasks`);
    const allowed = data.tasks.some(task => task.unit === unit);
    if (active.current) setPublished(allowed);
    return allowed;
  };
  useEffect(() => {
    let stopped = false;
    const check = () => { if (!stopped) void refreshTask().catch(() => { if (!stopped) setPublished(false); }); };
    check(); const timer = window.setInterval(check, 10000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [context.courseId, unit]);
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
      if (!await refreshTask()) throw new Error("教师尚未公布本流程任务，请稍后上传。");
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
    <details><summary>提交说明与最高成绩</summary><p>{unit === "full" ? "教学与实战模式均可上传当前成绩。提前结束按当前实际进度计分，并标记为未完成。" : "本段成绩为目标完成比例得分减去实际判定扣分，最低为零。教学模式解释错误不扣分；实战模式计入违规扣分。耗时与成本另列。"} 同一任务可以反复练习并提交，最终保留最高分及该次操作轨迹；低分或同分不覆盖已有结果，历史提交可在“我的提交”查看。</p>
    {!published && <p>等待教师公布本流程任务，当前练习保存在本机。</p>}
    {latest?.result && <p className="port-result-success">当前最高成绩：<strong>{latest.result.score.toFixed(2)} 分</strong> · {new Date(latest.updatedAt).toLocaleString("zh-CN")}</p>}
    </details><p role="status">{sameRun ? state ? submissionStatus[state] : "待上传 · 封存记录已保存在本机" : sealed ? "本次已封存，可重试提交或开始新练习" : "当前这次练习尚未提交"}{sameRun && pending?.response?.error ? `：${pending.response.error}` : ""}</p>
    {sameRun && state === "verified" && pending?.response?.result && <p>本次 {pending.response.result.score.toFixed(2)} 分{latest?.id === pending.response.id ? "，已作为最高成绩保留。" : latest?.result ? `；仍保留最高成绩 ${latest.result.score.toFixed(2)} 分及其操作轨迹。` : "，正在读取最高成绩。"}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="port-actions"><button disabled={busy || sealing || !published || !eligible || inFlight || state === "verified"} onClick={() => void submit()}>{busy || sealing ? "正在封存与上传…" : state === "verified" ? "本次已提交" : sameRun ? "重试提交" : unit === "full" ? "提交教师" : "结束并提交"}</button>
      <a href="/submissions">我的提交</a><button disabled={busy} onClick={() => { void refresh().then(async () => { if (pending?.response?.id && inFlight) await persist({ ...pending, response: await resultRequest<SubmissionSummary>(`submissions/${pending.response.id}`) }); setError(""); }).catch(reason => setError(reason.message)); }}>读取最新状态</button></div>
  </section>;
}
