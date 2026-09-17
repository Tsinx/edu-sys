import { PortPerformanceSummary } from "./PortPerformanceSummary";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PORT_COURSE_UNITS, portTime, type PortEvidenceNode, type PortView } from "@edu/port-simulation-core";
import { api } from "../../api";
import { resultRequest, submissionStatus, downloadRecord, type ReplayResponse, type ResultsResponse, type SubmissionSummary } from "./submission-api";
import type { PortSceneHandle } from "./PortOperationsScene";
const Scene = lazy(() => import("./PortOperationsScene").then(m => ({ default: m.PortOperationsScene })));
const sources = { student: "学生操作", system_preset: "系统预置", system_trial: "系统试运行" };
const date = (s: string) => new Date(s).toLocaleString("zh-CN");
export function PortResultsLink({ courseId }: { courseId: string }) {
  const [teacher, setTeacher] = useState(false);
  useEffect(() => { let live = true; void api.getIdentitySession().then(s => { if (live) setTeacher(s.actor.roles.includes("teacher")); }).catch(() => {}); return () => { live = false; }; }, []);
  return teacher && courseId === "course-port-management-intro" ? <Link className="button button--secondary" to={`/courses/${courseId}/experiment-results`}>实验成绩 · 浏览与复现</Link> : null;
}

export function PortResultsPage() {
  const { courseId = "course-port-management-intro" } = useParams();
  const [data, setData] = useState<ResultsResponse>(), [error, setError] = useState(""), [teacher, setTeacher] = useState(false);
  const [search, setSearch] = useState(""), [unit, setUnit] = useState("all"), [status, setStatus] = useState("all"), [selected, setSelected] = useState<SubmissionSummary>();
  const refresh = async () => { const value = await resultRequest<ResultsResponse>(`courses/${courseId}/results`); if (!value.teacher) throw new Error("实验成绩浏览仅对教师开放。"); setData(value); setError(""); };
  useEffect(() => { let live = true; void api.getIdentitySession().then(identity => {
    if (!live) return; if (!identity.actor.roles.includes("teacher")) throw new Error("请使用教师账号查看实验成绩。"); setTeacher(true); return refresh();
  }).catch(reason => { if (live) setError(reason.message); }); return () => { live = false; }; }, [courseId]);
  const units = PORT_COURSE_UNITS.filter(u => unit === "all" || u.id === unit);
  const rows = data?.rows.filter(row => `${row.displayName} ${row.identifier}`.includes(search)).filter(row => status === "all" || units.some(u => {
    const pending = row.pending.find(s => s.unit === u.id), result = row.results.find(s => s.unit === u.id);
    return status === "missing" ? !result && !pending : status === "verified" ? !!result : status === "pending" ? !!pending && pending.status !== "rejected" : pending?.status === "rejected";
  })) ?? [];
  function exportCsv() {
    const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
    const lines = [["姓名", "账号", ...units.flatMap(u => [`${u.title}${u.id === "full" ? "综合成绩" : "完成度"}`, `${u.title}仿真分钟`, `${u.title}本段成本`])], ...rows.map(row => [row.displayName, row.identifier, ...units.flatMap(u => { const s = row.results.find(s => s.unit === u.id); return s?.result ? [s.result.score.toFixed(2), (s.result.elapsed / 60).toFixed(1), s.result.performance?.cost.toFixed(1) ?? ""] : ["未提交", "", ""]; })])];
    const url = URL.createObjectURL(new Blob(["\ufeff" + lines.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "港口实验成绩.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="port-results-page"><Link to={`/courses/${courseId}`}>← 返回课程</Link><header><span>PORT LAB · RESULTS</span><h1>实验成绩</h1><p>分段显示目标完成度，综合挑战显示综合成绩；耗时与成本另列用于比较。六类实验分别提交。每格显示最近一份通过复算的结果；新提交核验失败不会覆盖原成绩。</p></header>
    {error && <p role="alert">{error}</p>}
    {teacher && <><div className="port-result-filters"><label>学生<input value={search} onChange={e => setSearch(e.target.value)} placeholder="姓名或账号"/></label><label>实验<select value={unit} onChange={e => setUnit(e.target.value)}><option value="all">全部实验</option>{PORT_COURSE_UNITS.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label><label>提交状态<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">全部状态</option><option value="verified">已有成绩</option><option value="missing">未提交</option><option value="pending">核验中</option><option value="rejected">核验失败</option></select></label><button onClick={() => void refresh().catch(reason => setError(reason.message))}>刷新</button><button disabled={!data} onClick={exportCsv}>导出当前成绩表</button></div>
      <div className="port-result-table-wrap"><table className="port-result-table"><caption>{rows.length} 位学生 · 未提交不计为零分</caption><thead><tr><th>学生</th>{units.map(u => <th key={u.id}>{u.short}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.actorId}><th>{row.displayName}<small>{row.identifier}</small></th>{units.map(u => {
        const current = row.results.find(s => s.unit === u.id), pending = row.pending.find(s => s.unit === u.id);
        return <td key={u.id}>{current?.result ? <button onClick={() => setSelected(current)} aria-label={`查看${row.displayName}的${u.title}成绩`}><strong>{current.result.score.toFixed(2)}</strong><small>{u.id === "full" ? "综合成绩" : "目标完成度"} · {(current.result.elapsed / 60).toFixed(1)} 分钟</small><small>{date(current.updatedAt)}</small></button> : <span>未提交</span>}{pending && <small className="port-result-pending" title={pending.error ?? ""}>{submissionStatus[pending.status]}{pending.error && `：${pending.error}`}</small>}</td>;
      })}</tr>)}</tbody></table></div>{!rows.length && <p>当前筛选下没有学生记录。</p>}
      {selected && <PortResultDetail key={selected.id} selected={selected} onClose={() => setSelected(undefined)}/>}</>}
  </section>;
}
function PortResultDetail({ selected, onClose }: { selected: SubmissionSummary; onClose: () => void }) {
  const [data, setData] = useState<ReplayResponse>(), [error, setError] = useState(""), [showReplay, setShowReplay] = useState(false);
  useEffect(() => { let live = true; void resultRequest<ReplayResponse>(`submissions/${selected.id}/replay`).then(value => { if (live) setData(value); }).catch(reason => { if (live) setError(reason.message); }); return () => { live = false; }; }, [selected.id]);
  const result = selected.result!;
  return <section className="port-result-detail" aria-label="实验结果详情"><header><div><h2>{selected.displayName} · {PORT_COURSE_UNITS.find(u => u.id === selected.unit)?.title}</h2><p>{date(selected.createdAt)} · {result.mode === "battle" ? "实战" : "分段练习"} · 服务端复算通过</p></div><button onClick={onClose}>关闭详情</button></header>
    <p>{selected.unit === "full" ? "综合成绩" : "目标完成度（不等同于效率或管理能力总分）"}</p><strong className="port-final-score">{result.score.toFixed(2)}<small> / 100</small></strong><p>本次运行 {Math.round(result.elapsed / 60)} 分钟（仿真时间） · {result.commands} 条输入记录</p>
    {result.performance && <PortPerformanceSummary value={result.performance}/>}
    {result.goals.length > 0 && <ul>{result.goals.map(g => <li key={g.id}>{g.done ? "✓ 已达成" : "○ 未达成"} · {g.label}</li>)}</ul>}
    {result.breakdown && <div className="port-result-breakdown">{[["货物履约", result.breakdown.cargo], ["船舶流程", result.breakdown.process], ["经营效率", result.breakdown.efficiency], ["交班完整", result.breakdown.handover], ["扣分", result.breakdown.deductions]].map(([name, score]) => <p key={name}>{name}<strong>{Number(score).toFixed(2)}</strong></p>)}</div>}
    {result.breakdown && <p>评分版本 {result.breakdown.scoringVersion ?? 1} · 按时离港 {result.breakdown.onTimeDepartures ?? "—"}/{result.breakdown.dueShips ?? "—"} 艘 · 流程完成 {result.breakdown.processCompletion?.toFixed(2) ?? result.breakdown.process.toFixed(2)} 分 · 及时性 {result.breakdown.processTimeliness?.toFixed(2) ?? "0.00"} 分</p>}
    {result.traceCoverage === "legacy" && <p>旧版记录：可按原指令复现，但旧版本未保存的拒绝操作无法补回。</p>}
    {error && <p role="alert">{error}</p>}
    <div className="port-actions"><button disabled={!data} onClick={() => setShowReplay(v => !v)}>{showReplay ? "收起复现播放" : "复现播放"}</button><button disabled={!data} onClick={() => data && downloadRecord(`港口实验-${selected.unit}-${selected.id}.json`, data)}>下载复现包与证据</button></div>
    {data && <><PortNodeList nodes={data.nodes}/>{showReplay && <PortReplayPlayer data={data}/>}</>}
  </section>;
}
function PortNodeList({ nodes, select }: { nodes: PortEvidenceNode[]; select?: (n: PortEvidenceNode) => void }) {
  const [filter, setFilter] = useState(""), [page, setPage] = useState(0);
  const filtered = nodes.filter(n => `${n.object} ${n.result.message} ${n.result.rule} ${sources[n.source]}`.includes(filter));
  return <details className="port-node-list"><summary>完整节点操作与状态（{nodes.length} 条）</summary><label>筛选对象或操作<input value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}/></label>
    {filtered.slice(page * 40, page * 40 + 40).map(n => <article key={n.index}><div><b>{portTime(n.at)} · {sources[n.source]} · {n.object}</b>{select && <button onClick={() => select(n)}>定位节点</button>}</div><p>{n.result.message} · {n.result.outcome} · {n.result.rule}{n.result.deduction ? ` · 扣 ${n.result.deduction} 分` : ""}</p><details><summary>指令及前后状态</summary><pre>{JSON.stringify({ command: n.command, before: n.before, after: n.after }, null, 2)}</pre></details></article>)}
    <div className="port-actions"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页记录</button><span>{page + 1} / {Math.max(1, Math.ceil(filtered.length / 40))}</span><button disabled={(page + 1) * 40 >= filtered.length} onClick={() => setPage(p => p + 1)}>下一页记录</button></div></details>;
}
function PortReplayPlayer({ data }: { data: ReplayResponse }) {
  const [view, setView] = useState<PortView>(), [position, setPosition] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1), [skip, setSkip] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [verified, setVerified] = useState(false), [selected, setSelected] = useState("S01");
  const worker = useRef<Worker>(null), seq = useRef(0), scene = useRef<PortSceneHandle>(null);
  const count = data.nodes.length - 1;
  const seek = (p: number) => {
    const node = data.nodes[p]; if (!node) return;
    const trialIndex = node.source === "system_trial" ? data.nodes.filter(n => n.source === "system_trial" && n.commandIndex === node.commandIndex).findIndex(n => n.index === node.index) : undefined;
    setBusy(true); setVerified(false); setSelected(node.object);
    worker.current?.postMessage({ id: ++seq.current, type: "seek", position: node.commandIndex, nodeIndex: p, trialIndex });
  };
  useEffect(() => {
    const w = new Worker(new URL("./port-replay.worker.ts", import.meta.url), { type: "module" }); worker.current = w;
    w.onmessage = event => { if (event.data.id !== seq.current) return; setBusy(false); if (event.data.error) { setError(event.data.error); setPlaying(false); return; } setView(event.data.view); setPosition(event.data.position); setVerified(event.data.verified === true); setError(""); };
    w.onerror = event => { setError(event.message); setBusy(false); setPlaying(false); };
    setBusy(true); w.postMessage({ id: ++seq.current, type: "load", package: data.package, referenceUnitCost: data.result.breakdown?.referenceUnitCost });
    return () => { w.terminate(); worker.current = null; };
  }, [data]);
  function next() { return (skip ? data.nodes.find(n => n.index > position && (n.command as { kind?: string } | null)?.kind !== "advance")?.index : position + 1) ?? count; }
  useEffect(() => { if (!playing || busy) return; if (position >= count) { setPlaying(false); return; } const timer = setTimeout(() => seek(Math.min(count, next())), 1000 / speed); return () => clearTimeout(timer); }, [playing, busy, position, speed, skip]);
  useEffect(() => { const timer = requestAnimationFrame(() => scene.current?.focus(selected)); return () => cancelAnimationFrame(timer); }, [view, selected]);
  const node = data.nodes[position];
  return <section className="port-replay-player" aria-label="实验复现播放器"><h3>实验复现 · 只读</h3><p>按原指令顺序播放，可跳过等待。现场状态独立于学生存档与当前课堂。</p>
    {error && <p role="alert">{error}</p>}<div className="port-actions"><button disabled={busy || position >= count} onClick={() => setPlaying(p => !p)}>{playing ? "暂停回放" : "播放"}</button><button disabled={busy || position <= 0} onClick={() => { setPlaying(false); seek(position - 1); }}>上一节点</button><button disabled={busy || position >= count} onClick={() => { setPlaying(false); seek(Math.min(count, next())); }}>下一节点</button><button disabled={busy} onClick={() => { setPlaying(false); seek(count); }}>最终状态</button><label>播放速度<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option><option value={8}>8×</option></select></label><label><input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)}/>跳过等待</label></div>
    <label>操作节点 {position} / {count}<input aria-label="回放节点" type="range" min={0} max={count} value={position} disabled={busy} onChange={e => { setPlaying(false); seek(Number(e.target.value)); }}/></label>
    <label>仿真时间定位（定位到此前已完成的操作）<input aria-label="回放仿真秒" type="number" min={data.nodes[0]?.at ?? 0} max={data.result.second} defaultValue={data.nodes[0]?.at ?? 0} onKeyDown={e => { if (e.key === "Enter") { const t = Number(e.currentTarget.value); const n = data.nodes.filter(n => n.afterAt <= t).at(-1); setPlaying(false); seek(n?.index ?? 0); } }}/><small>输入仿真秒数并回车</small></label>
    <p role="status">{busy ? "正在重建现场…" : verified ? "最终状态与服务器成绩一致" : view ? `${portTime(view.second)} · ${node?.result.message ?? "初始现场"}` : "正在载入…"}</p>
    {view && <div className="port-replay-scene"><Suspense fallback={<p>载入港区…</p>}><Scene ref={scene} view={view} selected={selected} speed={0} quality="balanced" onSelect={setSelected} onContext={setSelected} onDrop={() => {}}/></Suspense></div>}
    {view && <details><summary>当前关键现场状态</summary><pre>{JSON.stringify({ second: view.second, berths: view.berths, channel: view.channel, vessels: view.vessels.map(s => ({ id: s.id, stage: s.call.stage })), resources: view.resources }, null, 2)}</pre></details>}
    <PortNodeList nodes={data.nodes} select={n => { setPlaying(false); seek(n.index); }}/>
  </section>;
}
