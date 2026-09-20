import { useEffect, useState } from "react";
import { portCourseDefinition, type PortCourseSelection } from "@edu/port-simulation-core";
import { resultRequest, type SubmissionContext, type TasksResponse } from "./submission-api";

/** Publishing is independent of the teacher's demonstration clock and navigation. */
export function PortTaskPanel({ context, unit }: { context: SubmissionContext; unit: PortCourseSelection }) {
  const [data, setData] = useState<TasksResponse>();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => void resultRequest<TasksResponse>(`courses/${context.courseId}/tasks`).then(value => {
      if (active) { setData(value); setError(""); }
    }).catch(reason => { if (active) setError(reason.message); });
    refresh(); const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [context.courseId]);
  const published = data?.tasks.some(task => task.unit === unit);
  async function publish() {
    setBusy(true); setError("");
    try { setData(await resultRequest<TasksResponse>(`courses/${context.courseId}/tasks`, { unit })); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="port-task-bar" aria-label="流程任务">
    <div><strong>{portCourseDefinition(unit).title}</strong><span role="status">{!data ? "正在读取任务…" : published ? "任务已公布 · 可在本页提交实验成绩" : "任务尚未公布 · 可自由练习"}</span>
      <small>切换模式另开场次，原记录保留。</small>
      {data?.teacher && <small>每个流程都可单独公布；已公布的流程持续接受成绩上传。</small>}
      {error && <p role="alert">{error}</p>}</div>
    {data?.teacher && <button disabled={busy} onClick={() => void publish()}>{busy ? "正在公布…" : published ? "重新公布本流程任务" : "公布本流程任务"}</button>}
  </section>;
}
