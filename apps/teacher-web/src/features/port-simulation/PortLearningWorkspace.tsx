import { useEffect, useMemo, useState } from "react";
import {
    PORT_LEARNING_VERSION, capturePortLearning, collectPortRiskEvidence, comparePortLearning,
    portLearningCsv, portTime, reviewPortRiskEvidence,
    type PortLearningSnapshot, type PortRiskEvidence, type PortView
} from "@edu/port-simulation-core";
import type { LabStorage } from "./useTerminalTraining";

interface RiskDraft {
    runId: string;
    evidence: PortRiskEvidence;
    hypothesis: string;
    barriers: string;
    actions: string;
    recovery: string;
    impact: string;
}
interface Notebook {
    version: 1;
    baseline: PortLearningSnapshot | null;
    trial: PortLearningSnapshot | null;
    hypothesis: string;
    intervention: string;
    conclusion: string;
    risk: RiskDraft | null;
}
const empty = (): Notebook => ({ version: 1, baseline: null, trial: null, hypothesis: "", intervention: "", conclusion: "", risk: null });
const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
function validSnapshot(s: any): boolean {
    if (s === null) return true;
    return s?.version === PORT_LEARNING_VERSION && typeof s.runId === "string" && typeof s.capturedAt === "string"
        && ["port-operations/3.0", "port-operations/3.1", "port-operations/3.2"].includes(s.schema) && ["practice", "battle"].includes(s.mode)
        && finite(s.second) && s.config && s.plan?.equipment && Array.isArray(s.plan.yards)
        && Array.isArray(s.vessels) && s.vessels.every((v: any) => typeof v?.id === "string" && finite(v.arrival) && finite(v.elapsedMinutes)
            && (v.departure === null || finite(v.departure)) && (v.turnaroundMinutes === null || finite(v.turnaroundMinutes)))
        && ["completedVessels", "openVessels", "cost", "rehandles", "unresolvedBoxes"].every(k => finite(s[k]))
        && ["medianMinutes", "p90Minutes", "costPerCompletion"].every(k => s[k] === null || finite(s[k]))
        && ["import", "export"].every(k => s.cargo?.[k] && ["total", "completed", "due", "onTimeDue", "overdueOpen"].every(f => finite(s.cargo[k][f])))
        && ["berth", "anchor", "channel", "documents", "dispatch"].every(k => finite(s.waitMinutes?.[k]));
}
function readNotebook(storage: LabStorage | null | undefined, key: string): { book: Notebook; unreadable: string | null } {
    let raw: string | null = null;
    try {
        raw = storage?.getItem(key) ?? null;
        if (!raw) return { book: empty(), unreadable: null };
        const data = JSON.parse(raw);
        if (data.version !== 1 || !validSnapshot(data.baseline) || !validSnapshot(data.trial)
            || !["hypothesis", "intervention", "conclusion"].every(k => typeof data[k] === "string")
            || data.risk !== null && (!data.risk?.evidence || typeof data.risk.runId !== "string"
                || !["fault", "box", "document", "operation"].includes(data.risk.evidence.kind)
                || typeof data.risk.evidence.summary !== "string" || typeof data.risk.evidence.object !== "string"
                || !finite(data.risk.evidence.at) || !["hypothesis", "barriers", "actions", "recovery", "impact"].every(k => typeof data.risk[k] === "string")))
            throw new Error("实验记录结构无效");
        return { book: data as Notebook, unreadable: null };
    } catch { return { book: empty(), unreadable: raw ?? "无法读取本地存储" }; }
}
function download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a"); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const number = (n: number | null, digits = 1) => n === null ? "—" : n.toLocaleString("zh-CN", { maximumFractionDigits: digits });

export function PortLearningWorkspace({ view, runId, storage, scope, observationEnd, onObservationEnd }: {
    view: PortView;
    runId: string;
    storage?: LabStorage | null;
    scope: string;
    observationEnd: number | null;
    onObservationEnd: (value: number | null) => void;
}) {
    const key = `edu-port-operations:learning:${scope}`;
    const [loaded] = useState(() => readNotebook(storage, key));
    const [book, setBook] = useState(loaded.book);
    const [saveError, setSaveError] = useState("");
    const [notice, setNotice] = useState("");
    const [hours, setHours] = useState(String((observationEnd ?? 6 * 3600) / 3600));
    const [selectedEvidence, setSelectedEvidence] = useState("");
    useEffect(() => {
        if (loaded.unreadable !== null || !storage) return;
        try {
            storage.setItem(key, JSON.stringify(book));
            void storage.flush?.().catch(e => setSaveError(`实验记录尚未写入：${String(e)}`));
            setSaveError("");
        } catch (e) { setSaveError(`实验记录尚未保存，请导出备份：${String(e)}`); }
    }, [book, storage, key, loaded.unreadable]);
    const current = useMemo(() => view.second > 0 && runId && ["paused", "completed", "interrupted"].includes(view.status)
        ? capturePortLearning(view, runId) : null, [view, runId]);
    const evidence = useMemo(() => collectPortRiskEvidence(view), [view]);
    const comparison = book.baseline && book.trial ? comparePortLearning(book.baseline, book.trial) : null;
    const chosen = evidence.find(e => e.id === selectedEvidence) ?? evidence[0];
    const put = (field: "baseline" | "trial") => {
        if (!current) return;
        setBook(previous => ({ ...previous, [field]: current }));
        setNotice(`已保存${field === "baseline" ? "基准" : "试验"}：${portTime(current.second)}，已到港${current.vessels.length}艘。`);
    };
    const rows: [string, (s: PortLearningSnapshot) => string][] = [
        ["观察终点", s => portTime(s.second)],
        ["已离港 / 尚未离港（艘）", s => `${s.completedVessels} / ${s.openVessels}`],
        ["完成挂靠中位数（分钟）", s => number(s.medianMinutes)],
        ["完成挂靠P90（分钟）", s => number(s.p90Minutes)],
        ["进口提离 / 出口装船（箱）", s => `${s.cargo.import.completed} / ${s.cargo.export.completed}`],
        ["进口到期按时 / 到期总量（箱）", s => `${s.cargo.import.onTimeDue} / ${s.cargo.import.due}`],
        ["出口到期按时 / 到期总量（箱）", s => `${s.cargo.export.onTimeDue} / ${s.cargo.export.due}`],
        ["到期未完（箱）", s => String(s.cargo.import.overdueOpen + s.cargo.export.overdueOpen)],
        ["累计教学成本", s => number(s.cost)],
        ["每完成箱教学成本", s => number(s.costPerCompletion)],
        ["翻箱 / 未解决异常箱", s => `${s.rehandles} / ${s.unresolvedBoxes}`]
    ];
    const latest = current ?? book.trial ?? book.baseline;
    const riskField = (field: keyof Omit<RiskDraft, "evidence" | "runId">, value: string) => setBook(previous => previous.risk
        ? { ...previous, risk: { ...previous.risk, [field]: value } } : previous);
    return <section className="port-learning" aria-label="港口绩效与风险实验">
        <div className="port-panel-heading"><span className="port-eyebrow">OPERATIONS EVIDENCE LAB</span><h2>实验分析</h2></div>
        <p>用实际运行记录检验改善假设，追踪异常处置。第11讲记录基准与试验，第12讲固定事件证据并复核恢复。</p>
        {loaded.unreadable !== null && <div className="port-learning-alert" role="alert"><p>原实验记录无法读取，原文已保留；本次编辑暂存于当前页面，请导出备份。</p><button onClick={() => download(loaded.unreadable!, "port-learning-original.txt", "text/plain")}>导出原记录</button></div>}
        {saveError && <p role="alert" className="port-learning-alert">{saveError}</p>}
        <details open className="port-details"><summary>第11讲 · 绩效对照实验</summary>
            <p>先写改善假设，按同一船期运行基准与试验。改变多项配置时逐项说明，保留两次完整运行报告。</p>
            <div className="port-learning-endpoint">
                <label>观察终点（开局后小时）<input type="number" aria-label="观察终点小时" min="0.1" max="48" step="0.1" value={hours} onChange={e => setHours(e.target.value)} /></label>
                <button disabled={view.mode !== "practice" || !hours || !Number.isFinite(Number(hours))} onClick={() => onObservationEnd(Math.round(Number(hours) * 3600))}>设置观察终点</button>
                {observationEnd !== null && <button disabled={view.mode !== "practice"} onClick={() => onObservationEnd(null)}>取消观察终点</button>}
            </div>
            <p className="port-learning-caption">{view.mode === "battle" ? "实战使用原计时规则；固定终点仅用于教学模式。" : observationEnd === null ? "未设置固定终点。请在运行前设置；首次流程提示仍会正常暂停。" : `到${portTime(observationEnd)}自动暂停；继续下一段前请取消或改设终点。`}</p>
            <label>改善假设<textarea aria-label="改善假设" maxLength={3000} rows={3} value={book.hypothesis} onChange={e => setBook(b => ({ ...b, hypothesis: e.target.value }))} placeholder="哪一段受限？哪项记录会推翻这个判断？" /></label>
            <label>改动与操作安排<textarea aria-label="改动与操作安排" maxLength={3000} rows={3} value={book.intervention} onChange={e => setBook(b => ({ ...b, intervention: e.target.value }))} placeholder="记录资源、岗位、堆场和办理次序的变化；说明保持相同的条件。" /></label>
            <div className="port-learning-actions"><button disabled={!current} onClick={() => put("baseline")}>保存为基准</button><button disabled={!current} onClick={() => put("trial")}>保存为试验</button></div>
            {!current && <p className="port-learning-caption">开始运行并暂停后可保存记录。相同观察终点用于比较两个不同场次。</p>}
            {notice && <p role="status">{notice}</p>}
            {(current || book.baseline || book.trial) && <div className="port-learning-table"><table><caption>实际运行记录 · 到港至驶离口岸</caption><thead><tr><th>指标</th><th>当前暂停</th><th>基准</th><th>试验</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th>{label}</th>{[current, book.baseline, book.trial].map((s, i) => <td key={i}>{s ? value(s) : "—"}</td>)}</tr>)}</tbody></table></div>}
            <p className="port-learning-caption">周转分布只统计已驶离口岸的挂靠，同时保留未完成量。P90采用最近秩法；零到期任务、零完成箱时，相应比率无定义。成本使用教学成本单位。</p>
            {comparison && <div className={comparison.comparable ? "port-learning-check" : "port-learning-alert"} role="status"><strong>{comparison.comparable ? "观察条件匹配" : "当前记录不能直接配对"}</strong>{comparison.blockers.map(reason => <p key={reason}>{reason}</p>)}<p>设备与岗位：{comparison.equipmentChanged ? "有变化" : "未变化"}；堆场：{comparison.yardsChanged ? "有变化" : "未变化"}。</p><p>{comparison.caution}</p></div>}
            {latest && <>
                <h3>等待原因与未完挂靠</h3>
                <p className="port-learning-caption">以下读取{current ? "当前暂停" : book.trial ? "试验" : "基准"}记录。原因等待为累计船分钟，未覆盖航行和全部作业时间。</p>
                <div className="port-learning-waits">{([["berth", "泊位"], ["anchor", "候泊"], ["channel", "航道"], ["documents", "手续"], ["dispatch", "调度"]] as const).map(([key, label]) => <div key={key}><span>{label}</span><meter aria-label={`${label}累计等待分钟`} min={0} max={Math.max(1, ...Object.values(latest.waitMinutes))} value={latest.waitMinutes[key]} /><span>{number(latest.waitMinutes[key])}</span></div>)}</div>
                <details className="port-details"><summary>逐船查看到港队列（{latest.vessels.length}艘）</summary><div className="port-learning-table"><table><thead><tr><th>船舶</th><th>箱量</th><th>完整周转分钟</th><th>未完成已历分钟</th></tr></thead><tbody>{latest.vessels.map(v => <tr key={v.id}><td>{v.id} · {v.large ? "大型" : "普通"}</td><td>{v.boxes}</td><td>{number(v.turnaroundMinutes)}</td><td>{v.departure === null ? number(v.elapsedMinutes) : "已离港"}</td></tr>)}</tbody></table></div></details>
            </>}
            <label>结果解释与复核条件<textarea aria-label="结果解释与复核条件" maxLength={3000} rows={4} value={book.conclusion} onChange={e => setBook(b => ({ ...b, conclusion: e.target.value }))} placeholder="哪项结果改善、付出什么代价、未完量是否变化？还有什么竞争解释？" /></label>
        </details>
        <details open className="port-details"><summary>第12讲 · 事件与屏障复盘</summary>
            <p>从当前已经发现的异常中选择事件，固定当时证据。随后通过船舶、货批或调度表单实际处理，再回来核对。</p>
            {evidence.length ? <><label>已公开异常与受阻记录<select aria-label="当前异常证据" value={chosen?.id ?? ""} onChange={e => setSelectedEvidence(e.target.value)}>{evidence.map(e => <option key={e.id} value={e.id}>{portTime(e.at)} · {e.summary}</option>)}</select></label><button disabled={!chosen || view.second <= 0 || !runId} onClick={() => chosen && setBook(b => ({ ...b, risk: { runId, evidence: structuredClone(chosen), hypothesis: "", barriers: "", actions: "", recovery: "", impact: "" } }))}>固定本次证据</button></> : <p>当前没有已公开的故障、异常箱或受阻操作。完成实际作业后再查看；未发现异常不表示整个系统没有风险。</p>}
            {book.risk && <div className="port-learning-risk"><h3>已固定 · {portTime(book.risk.evidence.at)}</h3><p>{book.risk.evidence.summary}</p><p>{book.risk.evidence.impact}</p><div className="port-learning-check" role="status">{reviewPortRiskEvidence(book.risk.evidence, book.risk.runId, runId, view)}</div>
                {([["hypothesis", "事件机制与竞争解释", "什么已经发生？可能怎样影响后续作业？保留另一种解释。"], ["barriers", "屏障与依赖", "哪些屏障预防失控，哪些减轻后果？它们是否依赖同一信息或岗位？"], ["actions", "处置顺序与责任接口", "实际做了什么，由哪个业务接口办理？哪项业务仍可继续？"], ["recovery", "恢复证据与复核标准", "什么结果会证明这一项条件恢复？哪项证据仍然不足？"], ["impact", "经营影响与交接", "等待、积压、费用和未完事项怎样变化？下一班需要接手什么？"]] as const).map(([field, label, placeholder]) => <label key={field}>{label}<textarea aria-label={label} rows={3} maxLength={3000} value={book.risk![field]} placeholder={placeholder} onChange={e => riskField(field, e.target.value)} /></label>)}
            </div>}
        </details>
        <div className="port-learning-actions"><button onClick={() => download(JSON.stringify({ ...book, exportVersion: PORT_LEARNING_VERSION, exportedAt: new Date().toISOString() }, null, 2), "port-learning-evidence.json", "application/json")}>导出实验与复盘JSON</button><button disabled={!latest} onClick={() => latest && download(portLearningCsv(latest), "port-learning-vessels.csv", "text/csv;charset=utf-8")}>导出逐船CSV</button></div>
        <p className="port-learning-caption">{storage ? "实验草稿按本地课程空间保存" : "当前浏览器未提供持久存储，请导出记录后再离开页面"}；分析记录不改变业务放行条件与原有成绩。请同时保留“复盘”中的完整运行报告。</p>
    </section>;
}

