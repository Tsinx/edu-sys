import { useState } from "react";
import { ArrowRight, Check, Compass, Flag, Play } from "lucide-react";
import { trainingOrderLabel, trainingScore, type TerminalTraining, type TrainingOrder } from "@edu/port-simulation-core";
import type { TrainingArchive } from "./useTerminalTraining";
const time = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const statusLabels = { pending: "待处置", waiting: "等待条件", executing: "执行中", resolved: "已完成" };
export function TerminalTrainingPanel({ session, onOrder, onFocus, onResources, onContinue }: {
  session: TerminalTraining; onOrder: (order: TrainingOrder, eventId?: string) => void;
  onFocus: (step: number, entity: string) => void; onResources: () => void; onContinue: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const unfinished = session.events.filter(e => e.status !== "resolved");
  const event = session.events.find(e => e.id === expanded) ?? unfinished[0] ?? session.events.at(-1);
  const score = trainingScore(session); const last = session.attempts.at(-1);
  const inactive = ["ready", "interrupted", "completed"].includes(session.status);
  const s = session.simulation;
  const blockedNext: Record<string, TrainingOrder> = {
    "a-quay": { kind: "operate", target: "transport", running: true }, "b-quay": { kind: "operate", target: "transport", running: true },
    transport: { kind: "operate", target: "yard", running: true }, yard: { kind: "operate", target: "gate", running: true }
  };
  const chooseNext = () => { setExpanded(unfinished.find(e => e.id !== event?.id)?.id ?? unfinished[0]?.id ?? null); };
  return <section className="terminal-training-panel" aria-label="流程事件中心">
    <div className="terminal-training-heading"><span><Flag size={15} />流程待办 <b>{unfinished.length}</b></span><strong aria-label="流程得分">{score.total}<small> / 100</small></strong></div>
    <p className="terminal-score-detail">完成 {score.nodes} / 9 节点 · 全量交付 {score.deliveryBonus ? "+10" : "待完成"} · 扣分 {score.deductions}</p>
    <div className="terminal-event-queue" aria-label="事件队列">{session.events.map(e => <button type="button" key={e.id} aria-pressed={event?.id === e.id} onClick={() => setExpanded(e.id)} title={e.title} data-event-id={e.id} data-status={e.status}><i className={`event-dot ${e.status}`}>{e.status === "resolved" && <Check size={10} />}</i>{e.title.split(" · ")[0]}<small>{statusLabels[e.status]}</small></button>)}</div>
    {event && <article className="terminal-event-card" aria-label={event.title} data-event={event.id}>
      <div className="terminal-event-meta"><span className={`event-status ${event.status}`}>{statusLabels[event.status]}</span><time>发生于 {time(event.occurredAt)}</time></div>
      <h3>{event.title}</h3>
      <button type="button" className="terminal-event-focus" onClick={() => onFocus(event.step, event.entity)}><Compass size={14} />定位并高亮现场<ArrowRight size={13} /></button>
      <div className="terminal-event-state"><span>现场状态</span><p>{event.reason}</p><small>岸侧 {s.queues[0].toFixed(1)} 箱 · 交接区 {s.queues[1].toFixed(1)} 箱 · 堆场 {s.queues[2].toFixed(1)} 箱</small></div>
      {event.status !== "resolved" && <>
        {event.status === "pending" && <button className="terminal-primary terminal-wide" type="button" disabled={inactive} onClick={() => { setExpanded(event.id); onOrder(event.order, event.id); }}>执行 · {trainingOrderLabel(event.order)}</button>}
        {event.status === "waiting" && blockedNext[event.id] && <button className="terminal-wide" type="button" disabled={inactive} onClick={() => onOrder(blockedNext[event.id]!)}>接续作业 · {trainingOrderLabel(blockedNext[event.id]!)}</button>}
        <button className="terminal-text-button" type="button" onClick={onResources}>调整设备与人员<ArrowRight size={13} /></button>
        {event.order.kind === "harbor" && <details className="terminal-other-orders"><summary>船舶作业指令</summary><p>根据现场阶段下令；指令会立即检查流程前置条件。</p><div>{(["admit", "secure", "crane"] as const).map(action => {
          const vessel = event.order.kind === "harbor" ? event.order.vessel : 0;
          const order: TrainingOrder = action === "crane" ? { kind: "operate", target: vessel ? "crane-b" : "crane-a", running: true } : { kind: "harbor", vessel, action };
          return <button type="button" key={action} disabled={inactive} onClick={() => onOrder(order, event.id)}>{trainingOrderLabel(order)}</button>;
        })}</div></details>}
      </>}
      {last && (last.eventId === event.id || last.order.kind === "harbor" && event.id.startsWith(last.order.vessel ? "b-" : "a-")) && <div className={`terminal-order-result ${last.outcome}`} role="status"><strong>{({ applied: "指令已执行", waiting: "等待条件释放", incorrect: session.mode === "practice" ? "流程提示 · 不扣分" : last.deduction ? `流程错误 · −${last.deduction} 分` : "同类错误已记录 · 不重复扣分", stale: "无需重复执行", invalid: "请调整输入 · 不扣分" })[last.outcome]}</strong><p>{last.message}</p></div>}
      <div className="terminal-event-footer">{session.mode === "practice" && session.status === "paused" && <button type="button" onClick={onContinue}><Play size={14} />继续运行 / 等待释放</button>}<button type="button" onClick={chooseNext}>查看下一待办<ArrowRight size={13} /></button></div>
    </article>}
    {session.status === "paused" && session.pauseReason && <p className="terminal-training-hint">已暂停：{session.pauseReason}。可手动继续；同一待办不重复暂停。</p>}
    {session.notifications.length > 0 && <div className="terminal-training-notifications" role="status">{session.notifications.map(e => <p key={e.id}><Check size={13} /><span>{e.text}</span></p>)}</div>}
  </section>;
}
export function TerminalTrainingReview({ session, archives, onOpenArchive, onRestart }: {
  session: TerminalTraining | null; archives: TrainingArchive[]; onOpenArchive: (record: TrainingArchive) => void; onRestart: () => void;
}) {
  const score = session && trainingScore(session);
  return <section className="terminal-training-review" aria-label="流程评分与复盘">
    <div className="terminal-subtitle"><h3>{session ? "流程评分与处置证据" : "旧版实验复盘"}</h3><button type="button" onClick={onRestart}>从原方案重新练习</button></div>
    {session && score ? <>
      <div className="terminal-score-summary"><strong>{score.total}<small> / 100</small></strong><p>{session.mode === "practice" ? "练习场" : "实战场"} · {({ ready: "尚未开始", running: "运行中", paused: "已暂停", completed: "班次结束", interrupted: "已中断" })[session.status]}<br />节点 {score.nodes} / 9 × 10 分 + 全量交付 {score.deliveryBonus} 分 − 扣分 {score.deductions} 分</p></div>
      <p className="terminal-help">普通等待只影响吞吐、排队和成本；本脚本没有超时扣分。开工节点以实际箱流验证，未完成节点不计分。</p>
      <div className="terminal-review-milestones">{session.events.map(e => <span key={e.id} data-done={e.status === "resolved"}>{e.title}<b>{e.status === "resolved" ? "+10" : "未完成"}</b></span>)}</div>
      <details><summary>事件时间线（{session.timeline.length} 条状态变化）</summary><ol className="terminal-training-timeline">{session.timeline.map((entry, i) => <li key={i}><time>{time(entry.second)}</time><div><strong>{session.events.find(e => e.id === entry.eventId)?.title} · {statusLabels[entry.status]}</strong><p>{entry.reason}</p></div></li>)}</ol></details>
      <details><summary>全部学生指令与判定（{session.attempts.length} 条）</summary><ol className="terminal-training-timeline">{session.attempts.map((a, i) => <li key={i}><time>{time(a.second)}</time><div><strong>{trainingOrderLabel(a.order)} · {({ applied: "已执行", waiting: "等待", incorrect: "流程错误", stale: "过期 / 重复", invalid: "输入无效" })[a.outcome]}{a.deduction > 0 ? ` · −${a.deduction} 分` : " · 不扣分"}</strong><p>{a.message}</p><details><summary>处置前的原始状态与规则依据</summary><pre>{JSON.stringify({ rule: a.rule, eventId: a.eventId, before: a.before }, null, 2)}</pre></details></div></li>)}</ol></details>
    </> : <p>按原有 2.0 / 2.1 指令与箱流重放，未补算新流程成绩。可以导出原始记录或从原方案开始新场次。</p>}
    {archives.length > 0 && <details><summary>本机历史场次（{archives.length} 次）</summary><div className="terminal-archive-list">{archives.map((a, i) => <button type="button" key={a.key} onClick={() => onOpenArchive(a)}>场次 {i + 1} · {a.mode === "battle" ? "实战" : a.mode === "practice" ? "练习" : "旧版"} · {a.status === "interrupted" ? "已中断" : a.status === "completed" ? "班次结束" : "已暂停"} · {a.minute.toFixed(1)} 分钟{a.score !== undefined ? ` · ${a.score} 分` : ""}</button>)}</div></details>}
  </section>;
}
