import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Anchor, ArrowDownToLine, Boxes, Check, ChevronRight, Clock3, Download, Flag, Focus, Layers3, Map, Pause, Play, RotateCcw, Ship, Upload, Users, X, BookOpen, CirclePlay, Maximize, Minimize, PanelRight, ListChecks, StepForward } from "lucide-react";
import { PORT_DOC_NAMES, PORT_HORIZON, TERMINAL_EQUIPMENT, defaultPortConfig, portLocationName, portTime, terminalBudget, type PortCommand, type PortConfig, type PortDocument, type PortMode, type PortPlan, type PortView, type TerminalDispatch, type TerminalMode, type TerminalScenario, type YardUse } from "@edu/port-simulation-core";
import { usePortOperations } from "./usePortOperations";
import { PORT_COURSE_UNITS, portCourseDefinition, type PortCourseUnit, type PortCourseSelection } from "@edu/port-simulation-core";
import type { LabStorage } from "./useTerminalTraining";
import { PORT_DRAG_MIME, type PortDrag, type PortSceneHandle } from "./PortOperationsScene";
const Scene = lazy(() => import("./PortOperationsScene").then(m => ({ default: m.PortOperationsScene })));
const stageNames: Record<string, string> = { approach: "航行中", outer: "港外候泊", channel: "航道通行", anchored: "港内候泊", mooring: "系泊中", berthed: "已靠妥", unmooring: "离泊中", departed: "已离港" };
const statusNames: Record<string, string> = { ready: "规划中", running: "运行中", paused: "已暂停", completed: "已结束", interrupted: "已中断" };
const useNames: Record<YardUse, string> = { import: "进口区", export: "出口区", mixed: "混合备用", inspection: "待核查区" };
const docNames: Record<PortDocument["status"], string> = { draft: "待核对", submitted: "等待回执", correction: "待补正", approved: "已办妥" };
const fmt = (n: number, d = 0) => n.toLocaleString("zh-CN", { maximumFractionDigits: d });
const hours = (s: number) => `${Math.floor(s / 3600)} 小时 ${Math.round(s % 3600 / 60)} 分`;
const dragProps = (source: PortDrag) => ({ draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(PORT_DRAG_MIME, JSON.stringify(source)); e.dataTransfer.effectAllowed = "move"; } });
const dropProps = (target: string, drop: (s: PortDrag, t: string) => void) => ({ onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(PORT_DRAG_MIME)) {
        e.preventDefault();
        e.currentTarget.classList.add("is-drop-target");
    } }, onDragLeave: (e: React.DragEvent) => e.currentTarget.classList.remove("is-drop-target"), onDrop: (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.remove("is-drop-target"); try {
        drop(JSON.parse(e.dataTransfer.getData(PORT_DRAG_MIME)), target);
    }
    catch { /* Non-business payload. */ } } });
function DocForm({ id, title, document, disabled, submit }: {
    id: string;
    title: string;
    document: PortDocument;
    disabled: boolean;
    submit: (value: string) => void;
}) {
    const [value, setValue] = useState(document.value);
    useEffect(() => setValue(document.value), [id, document.value]);
    return <form className="port-doc" onSubmit={e => { e.preventDefault(); submit(value); }}><div className="port-row"><strong>{title}</strong><span className={`port-tag ${document.status === "approved" ? "good" : ""}`}>{docNames[document.status]}</span></div><p>{document.reason}</p><label htmlFor={id}>申报核对值<input id={id} value={value} maxLength={100} disabled={disabled || ["submitted", "approved"].includes(document.status)} onChange={e => setValue(e.target.value)}/></label><div className="port-row"><small>{document.returnedAt !== undefined ? `反馈 ${portTime(document.returnedAt)}` : document.submittedAt !== undefined ? `受理 ${portTime(document.submittedAt)}` : "预填材料，请与航前资料核对"}</small><button disabled={disabled || ["submitted", "approved"].includes(document.status)} type="submit">{document.status === "correction" ? "补正并重报" : "核对并提交"}</button></div></form>;
}
export interface PortOperationsProps {
    storage?: LabStorage | null;
    storageScope: string;
    sourceLabel?: string;
    initialTrainingMode?: PortMode;
    trainingModeLocked?: boolean;
    initialMode?: TerminalMode;
    initialScenario?: TerminalScenario;
    scenarioLocked?: boolean;
    onLegacy?: () => void;
    courseUnit?: PortCourseUnit;
    courseSelection?: PortCourseSelection;
    demonstration?: boolean;
    learningStageLocked?: boolean;
    courseProgress?: string[];
    courseSaveError?: string;
    onSelectCourse?: (id: PortCourseSelection, demo?: boolean) => void;
    onCourseComplete?: (id: PortCourseUnit) => void;
}
export function PortOperationsStudio({ storage, storageScope, sourceLabel = "独立实验", initialTrainingMode = "practice", trainingModeLocked = false, initialMode = "flow", initialScenario = "regular", onLegacy, courseUnit, courseSelection = "full", demonstration = false, learningStageLocked = false, courseProgress = [], courseSaveError, onSelectCourse, onCourseComplete }: PortOperationsProps) {
    const [initialConfig] = useState(() => ({ ...defaultPortConfig(), disruption: initialScenario === "wind" ? "wind" as const : initialScenario === "outage" ? "outage" as const : "none" as const, variability: initialScenario === "peak" ? "high" as const : "normal" as const }));
    const definition = courseUnit ? portCourseDefinition(courseUnit) : null;
    const r = usePortOperations(demonstration ? null : storage, courseUnit ? `${storageScope}:course:1:${courseUnit}` : storageScope, courseUnit ? "practice" : initialTrainingMode, courseUnit ? true : trainingModeLocked, initialConfig, courseUnit ? { unit: courseUnit, demo: demonstration } : undefined), v = r.view;
    const [tab, setTab] = useState<string>(definition?.tab ?? (initialMode === "planning" || initialMode === "equipment" ? "plan" : initialMode === "dispatch" ? "resources" : "ships")), [selected, setSelected] = useState("S01"), [batchId, setBatchId] = useState("S01-I1"), [destination, setDestination] = useState("berth:0"), [plannedMinute, setPlannedMinute] = useState(60), [showRules, setShowRules] = useState(!courseUnit), [inspectYard, setInspectYard] = useState("Y6");
    const [stageFullscreen, setStageFullscreen] = useState(false), [stagePanel, setStagePanel] = useState<"operations" | "plans" | "goals" | null>("operations");
    const scene = useRef<PortSceneHandle>(null), file = useRef<HTMLInputElement>(null), root = useRef<HTMLElement>(null);
    const currentShip = v?.vessels.find(s => s.id === selected) ?? v?.vessels.find(s => s.id === v.batches.find(b => b.id === batchId)?.callId) ?? v?.vessels[0];
    const batch = v?.batches.find(b => b.id === batchId) ?? v?.batches[0];
    const locked = demonstration || !v || !["running", "paused"].includes(v.status);
    const availableTabs = courseUnit === "arrival" ? ["ships", "review"] : courseUnit === "departure" ? ["ships", "cargo", "review"] : courseUnit === "yard" || courseUnit === "planning" ? ["cargo", "resources", "plan", "review"] : ["ships", "cargo", "resources", "plan", "review"];
    const navigationLocked = !demonstration && v?.mode === "battle" && ["running", "paused"].includes(v.status);
    const send = (command: PortCommand) => { if (demonstration) return; if (command.kind === "dispatch" && v?.status === "ready" && (!courseUnit || courseUnit === "planning")) {
        void r.configure(v.mode, v.config, { ...v.plan, equipment: { ...v.plan.equipment, dispatch: command.dispatch } });
        return;
    } void r.send(command); };
    const chooseCourse = async (id: PortCourseSelection, demo = false) => {
        if (navigationLocked || r.busy) return;
        if (demonstration) r.setDemoPlaying(false);
        else if (v?.status === "running") await r.send({ kind: "pause" });
        onSelectCourse?.(id, demo);
    };
    const toggleFullscreen = async () => {
        if (stageFullscreen) {
            if (document.fullscreenElement === root.current) await document.exitFullscreen().catch(() => {});
            setStageFullscreen(false);
        } else {
            setStageFullscreen(true);
            try { await root.current?.requestFullscreen?.(); } catch { /* Embedded classrooms retain a window-filling stage. */ }
        }
    };
    useEffect(() => {
        if (!stageFullscreen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {}); setStageFullscreen(false); } };
        const changed = () => { if (document.fullscreenElement !== root.current) setStageFullscreen(false); };
        document.addEventListener("keydown", escape); document.addEventListener("fullscreenchange", changed);
        return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); document.removeEventListener("fullscreenchange", changed); };
    }, [stageFullscreen]);
    useEffect(() => { if (r.lesson?.complete && !demonstration && courseUnit) onCourseComplete?.(courseUnit); }, [r.lesson?.complete, courseUnit, demonstration]);
    useEffect(() => {
        if (!demonstration || !r.demonstration) return;
        const step = r.demonstration;
        setSelected(step.focus); setTab(availableTabs.includes(step.tab) ? step.tab : definition?.tab ?? "ships");
        if (step.focus.includes("-I") || step.focus.includes("-E")) setBatchId(step.focus);
        if (step.focus.startsWith("C-")) void r.inspect(step.focus);
        scene.current?.focus(step.focus);
    }, [r.demonstration?.title, r.demonstration?.focus]);
    const select = (id: string, context = false) => { setSelected(id); if (context) setStagePanel("operations"); if (id.startsWith("S") && !id.includes("-"))
        setTab("ships");
    else if (v?.batches.some(b => b.id === id)) {
        setBatchId(id);
        setTab("cargo");
    }
    else if (id.startsWith("C-")) {
        void r.inspect(id);
        const box = v?.boxes.find(b => b.id === id);
        if (box)
            setBatchId(box.batchId);
        setTab("cargo");
    }
    else if (/^Y[1-6]$/.test(id))
        setTab("plan");
    else if (context)
        setTab("resources"); };
    const focus = (id: string) => { select(id); scene.current?.focus(id); };
    const drop = (source: PortDrag, target: string) => {
        if (!v)
            return;
        if (source.kind === "ship") {
            if (target.startsWith("timeline:")) {
                const [, berth, at] = target.split(":");
                send({ kind: "plan-berth", callId: source.id, berth: Number(berth), at: Number(at) });
                return;
            }
            const ship = v.vessels.find(v => v.id === source.id);
            let to = target;
            if (v.vessels.some(v => v.id === target)) {
                const c = v.vessels.find(v => v.id === target)!.call;
                to = c.berth !== null ? `berth:${c.berth}` : c.anchor !== null ? `anchor:${c.anchor}` : target;
            }
            if (!ship || !(/^(berth:[01]|anchor:[0-3])$/.test(to))) {
                r.setError("将船舶拖至泊位或候泊锚位，也可在船舶操作中选择目的位置。");
                return;
            }
            select(ship.id);
            if (ship.call.stage === "approach" && to.startsWith("berth:")) {
                send({ kind: "plan-berth", callId: ship.id, berth: Number(to.slice(6)), at: Math.max(v.second, ship.currentEta) });
            }
            else
                send({ kind: "move", callId: ship.id, target: to.startsWith("berth:") ? "berth" : "anchor", slot: Number(to.split(":")[1]) });
        }
        else if (source.kind === "batch" && /^Y[1-6]$/.test(target)) {
            send({ kind: "assign-yard", batchId: source.id, yardId: target });
            setBatchId(source.id);
        }
        else if (source.kind === "crane" && target.startsWith("berth:")) {
            const d = structuredClone(v.plan.equipment.dispatch), from = Number(source.id) < d.berthCranes[0] ? 0 : 1, to = Number(target.slice(6)) as 0 | 1;
            if (from !== to && d.berthCranes[from] > 0) {
                d.berthCranes[from]--;
                d.berthCranes[to]++;
                send({ kind: "dispatch", dispatch: d });
            }
        }
        else if (source.kind === "crew" && target.startsWith("crew:")) {
            const from = source.id as "drivers", to = target.slice(5) as "drivers", d = structuredClone(v.plan.equipment.dispatch);
            if (typeof d[from] === "number" && typeof d[to] === "number" && d[from] > 0 && from !== to) {
                d[from]--;
                d[to]++;
                send({ kind: "dispatch", dispatch: d });
            }
        }
        else
            r.setError("该目标不适配此对象。可使用右侧的目标选择完成等效操作。");
    };
    if (!v)
        return <section className="port-ops port-loading"><Ship size={36}/><h2>{definition?.title ?? "48 小时港口综合实训"}</h2><p>{r.error || "正在载入本机场次与业务内核…"}</p>{r.error && <button onClick={() => void r.retry()}>保留原记录并开始新挑战</button>}</section>;
    return <section className="port-ops" ref={root} data-status={v.status} data-mode={v.mode} data-second={v.second} data-course={courseUnit ?? "full"} data-demo={demonstration} data-stage-fullscreen={stageFullscreen} data-stage-panel={stagePanel ?? "none"}>
  {onSelectCourse && <nav className="port-course-nav" aria-label="课程分段"><div className="port-course-label"><BookOpen size={18}/><strong>按课程进度练习</strong><small>{learningStageLocked ? "本课分段由教师指定" : "每段独立开始 · 随时重练"}</small></div><div className="port-course-steps">{PORT_COURSE_UNITS.map((unit, i) => <button key={unit.id} aria-current={(courseUnit ?? "full") === unit.id ? "step" : undefined} disabled={r.busy || navigationLocked || learningStageLocked && unit.id !== courseSelection} title={unit.briefing} onClick={() => void chooseCourse(unit.id, demonstration && unit.id !== "full")}><span>{courseProgress.includes(unit.id) ? <Check size={14}/> : String(i + 1).padStart(2, "0")}</span><strong>{unit.short}</strong><small>{unit.id === "full" ? "48 小时" : unit.title}</small></button>)}</div></nav>}
  {demonstration && <section className="port-demo-banner" aria-label="课程标准演示"><div><span className="port-demo-badge"><CirclePlay size={18}/>课程标准演示</span><strong>{r.demonstration?.title ?? `观看${definition?.title}的完整操作`}</strong><p>{r.demonstration?.explanation ?? "自动执行真实业务指令并展示现场结果。可播放、暂停或单步观看；演示不写入自主练习进度。"}</p></div><div className="port-demo-controls"><button className="primary" disabled={r.busy || r.lesson?.complete} onClick={() => r.setDemoPlaying(!r.demoPlaying)}>{r.demoPlaying ? <Pause size={16}/> : <Play size={16}/>} {r.demoPlaying ? "暂停演示" : "播放演示"}</button><button disabled={r.busy || r.lesson?.complete} onClick={() => void r.demoStep()}><StepForward size={16}/>下一步演示</button><button onClick={() => void r.retry()}>重播本段</button><button onClick={() => void chooseCourse(courseSelection)}>返回自主练习</button></div></section>}
  {courseSaveError && <p role="status">{courseSaveError}</p>}
  <header className="port-header"><div className="port-brand"><span className="port-brand-icon"><Anchor size={25}/></span><div><span className="port-eyebrow">PORT OPERATIONS · {sourceLabel}</span><h1>{definition?.title ?? "48 小时港口综合实训"}</h1></div></div><div className="port-clock"><span className={`port-live ${v.status === "running" ? "on" : ""}`}/><strong>{portTime(v.second)}</strong><span>{statusNames[v.status]} · {r.lesson ? `本段 ${hours(r.lesson.elapsed)}` : `第 ${Math.min(6, Math.floor(v.second / 28800) + 1)} 班`}</span></div><div className="port-controls"><span className="port-mode">{demonstration ? "观察模式" : v.mode === "practice" ? "教学模式" : "实战模式"}</span>{!demonstration && (v.status === "ready" ? <button className="primary" onClick={() => { setShowRules(false); send({ kind: "start" }); }}><Play size={15}/>{courseUnit ? "开始本段" : "开始值班"}</button> : v.mode === "practice" && ["running", "paused"].includes(v.status) ? <button className="primary" onClick={() => send({ kind: v.status === "running" ? "pause" : "resume" })}>{v.status === "running" ? <Pause size={15}/> : <Play size={15}/>} {v.status === "running" ? "暂停" : "继续运行"}</button> : <span className="port-speed">{v.mode === "battle" ? "60× 固定" : "本段已结束"}</span>)}{v.mode === "practice" && <select aria-label="运行速度" value={r.speed} onChange={e => r.setSpeed(Number(e.target.value))}><option value={30}>30×</option><option value={60}>60×</option><option value={120}>120×</option><option value={300}>300×</option><option value={600}>600×</option></select>}{onSelectCourse && !demonstration && <button className="port-demo-entry" disabled={navigationLocked || r.busy} title={navigationLocked ? "实战结束后可观看演示" : "观看内置课程示范，不影响当前练习记录"} onClick={() => void chooseCourse(courseSelection, true)}><CirclePlay size={17}/>标准演示</button>}<button className="port-fullscreen-entry" aria-label={stageFullscreen ? "退出舞台全屏" : "舞台全屏"} onClick={() => void toggleFullscreen()}>{stageFullscreen ? <Minimize size={17}/> : <Maximize size={17}/>} {stageFullscreen ? "退出全屏" : "舞台全屏"}</button><button aria-label="查看规则" onClick={() => setShowRules(!showRules)}>规则</button></div></header>
  <div className="port-progress" aria-label={courseUnit ? "本段目标进度" : "48 小时进度"}><span style={{ width: `${r.lesson ? r.lesson.goals.filter(g => g.done).length / r.lesson.goals.length * 100 : v.second / PORT_HORIZON * 100}%` }}/></div>
  {showRules && !courseUnit && <div className="port-rules"><div className="port-row"><strong>开局规则与评分依据</strong><button aria-label="关闭规则" onClick={() => setShowRules(false)}><X size={16}/></button></div><p>以船舶和货批安排作业，箱位与交接自动记录。教学模式首次遇到新流程暂停解释，同类流程继续运行；实战模式连续 48 小时、固定 60×，开局后不能暂停。刷新或退出的实战记为中断。</p><div className="port-score-rules"><span>50 分 · 到期货物按时履约</span><span>20 分 · 到期船舶流程完成</span><span>20 分 · 完成比例 × 基准/实际单位成本（最高 1）</span><span>10 分 · 库存与未完事项交班</span></div><p>船舶及出口承诺：实际到达＋参考服务时长＋4 小时；进口提离再加 2 小时。明确违反前置条件：每个对象同一种错误实战扣 5 分一次；教学只解释。资源等待、重复指令与表单补正不扣分。已公布承诺不会随计划修改顺延。</p><small>教学参数：工作量三角分布 72／168／264 箱次；参考服务率 48 箱次/时，靠离泊准备合计 30 分。平均到港间隔须大于平均服务 240 分钟。参考方案为固定可行调度对照，不保证最优。所有数据均为教学情境。</small></div>}
  {r.lesson && definition && <section className="port-course-guide" aria-label="本段课程目标"><div className="port-row"><div><span className="port-eyebrow">{definition.course} · {definition.duration}</span><h2>{r.lesson.complete ? "本段已完成" : "本段目标"} · {r.lesson.goals.filter(g => g.done).length}/{r.lesson.goals.length}</h2></div>{r.lesson.complete && onSelectCourse && !learningStageLocked && <button className="primary" onClick={() => { const next = PORT_COURSE_UNITS[PORT_COURSE_UNITS.findIndex(u => u.id === courseUnit) + 1]; if (next) void chooseCourse(next.id, demonstration && next.id !== "full"); }}>进入下一段 <ChevronRight size={15}/></button>}</div><p>{definition.briefing}</p><small>起始现场：{r.lesson.prepared}</small><div className="port-course-goals">{r.lesson.goals.map(goal => <button key={goal.id} data-done={goal.done} onClick={() => { setTab(goal.tab); setSelected(goal.focus); if (goal.focus.includes("-I") || goal.focus.includes("-E")) setBatchId(goal.focus); if (goal.focus.startsWith("C-")) void r.inspect(goal.focus); scene.current?.focus(goal.focus); setStagePanel("operations"); }}><span>{goal.done ? <Check size={14}/> : <Focus size={14}/>}</span>{goal.label}</button>)}</div>{showRules && <p>只记录本段实际完成目标和处置过程，错误解释不扣分。原有 100 分综合评价保留在 48 小时挑战中。课程标准演示为内置教学示范，采用相同业务规则。</p>}</section>}
  {(r.error || r.notice || v.status === "paused") && <div className={`port-feedback ${r.error ? "error" : ""}`} role="status"><span>{r.error || (v.status === "paused" ? v.pauseReason : r.notice)}</span>{!demonstration && v.status === "paused" && <button onClick={() => send({ kind: "resume" })}>继续运行，等待条件释放 <ChevronRight size={14}/></button>}</div>}
  <div className="port-kpis"><div><small>本班已公布</small><strong>{v.vessels.filter(s => s.call.stage !== "departed").length}<em> 艘待执行</em></strong></div><div><small>进口提离 / 出口装船</small><strong>{fmt(v.boxes.filter(b => b.deliveredAt !== null).length)} <em>/</em> {fmt(v.boxes.filter(b => b.loadedAt !== null).length)}</strong></div><div><small>在场 / 入场预留</small><strong>{v.yards.reduce((n, y) => n + y.occupied, 0)} <em>/ {v.yards.reduce((n, y) => n + y.reserved, 0)} 箱</em></strong></div><div><small>累计运营成本</small><strong>{fmt(v.cost, 1)} <em>教学点</em></strong></div><div><small>{r.lesson ? "本段目标" : v.status === "completed" ? "本地成绩" : "阶段成绩"}</small><strong>{r.lesson ? r.lesson.goals.filter(g => g.done).length : fmt(v.score.total, 2)} <em>/ {r.lesson ? `${r.lesson.goals.length} 已验证` : `100${!v.score.referenceReady ? " · 成本对照计算中" : ""}`}</em></strong></div></div>
  <div className="port-mobile-nav"><button onClick={() => root.current?.querySelector(".port-scene-wrap")?.scrollIntoView({ behavior: "smooth" })}>现场视图</button><button onClick={() => root.current?.querySelector(".port-workbench")?.scrollIntoView({ behavior: "smooth" })}>业务工作台 <ChevronRight size={14}/></button>{v.mode === "practice" && v.status === "paused" && <button onClick={() => send({ kind: "resume" })}>继续运行</button>}</div><div className="port-layout"><main className="port-field"><div className="port-scene-wrap"><Suspense fallback={<div className="port-scene-state">载入 3D 画面…</div>}><Scene ref={scene} view={v} selected={selected} speed={r.speed} followSelected={demonstration} floatingPanel={stageFullscreen && stagePanel === "operations"} onSelect={id => select(id)} onContext={id => select(id, true)} onDrop={drop}/></Suspense><div className="port-scene-tools"><span><span className="port-dot import"/>进口箱 <span className="port-dot export"/>出口箱 <span className="port-dot issue"/>异常箱</span><div><button onClick={() => scene.current?.camera("overview")}>全景</button><button onClick={() => scene.current?.camera("sea")}>水域</button><button onClick={() => scene.current?.camera("yard")}>堆场</button><button aria-label="定位选中对象" onClick={() => scene.current?.focus(selected)}><Focus size={16}/></button></div></div><div className="port-scene-caption">拖拽分配 · 右键办理 · 滚轮缩放<span>{v.channel ? `${v.channel} 使用航道` : "航道畅通"}</span></div></div>
   <div className="port-field-overlays"><div className="port-destinations"><div className="port-berths">{v.berths.map((id, i) => <div key={i} className={`port-destination ${id ? "occupied" : ""}`} {...dropProps(`berth:${i}`, drop)} data-destination={`berth:${i}`}><div className="port-row"><strong><Anchor size={15}/> 泊位 {i ? "B" : "A"}</strong><span>{id ? "已占用 / 预留" : "可申请"}</span></div><button onClick={() => id ? focus(id) : scene.current?.focus(`berth:${i}`)}>{id ?? "拖入船舶或岸桥"}</button><small>{i ? "普通 / 大型船" : "普通船"} · {v.plan.equipment.dispatch.berthCranes[i]} 台岸桥</small><div className="port-reservation">{v.vessels.filter(s => s.call.plannedBerth === i && ["approach", "outer", "anchored"].includes(s.call.stage)).map(s => <span key={s.id}>{s.id} 预约 {portTime(s.call.plannedAt!)}</span>)}</div></div>)}</div><div className="port-anchors">{v.anchors.map((id, i) => <button key={i} {...dropProps(`anchor:${i}`, drop)} data-destination={`anchor:${i}`} onClick={() => scene.current?.focus(id ?? `anchor:${i}`)}><Anchor size={13}/><span>候泊 {i + 1}</span><strong>{id ?? "空闲"}</strong></button>)}</div></div>
   <div className="port-yard-strip">{v.yards.map(y => <button key={y.id} data-yard-target={y.id} {...dropProps(y.id, drop)} onClick={() => focus(y.id)}><strong>{y.name}</strong><small>{useNames[y.use]} · {y.occupied + y.reserved}/100</small></button>)}</div><BerthTimeline view={v} drop={drop}/><section className="port-forecast"><div className="port-section-title"><h2><Clock3 size={17}/>滚动到港预报</h2><span>未来 6 小时 · 已公布任务保留</span></div><div className="port-table-scroll"><table><thead><tr><th>船舶</th><th>首报 ETA</th><th>当前 ETA</th><th>卸 / 装箱</th><th>参考服务</th><th>现场状态</th><th>操作</th></tr></thead><tbody>{v.vessels.filter(s => s.call.stage !== "departed").map(s => <tr key={s.id} data-ship={s.id} {...dragProps({ kind: "ship", id: s.id })} className={selected === s.id ? "selected" : ""} onContextMenu={e => { e.preventDefault(); select(s.id, true); }}><td><button onClick={() => focus(s.id)}><Ship size={14}/>{s.id}<small>{s.large ? "大型" : "普通"}</small></button></td><td>{portTime(s.firstEta)}</td><td>{portTime(s.currentEta)}{s.currentEta !== s.firstEta && <span className="port-revision">已修订</span>}</td><td>{s.unload} / {s.load}</td><td>{hours(s.referenceService)}</td><td><span className="port-tag">{stageNames[s.call.stage]}</span></td><td><button onClick={() => select(s.id, true)}>操作</button></td></tr>)}</tbody></table></div></section>
   <section className="port-messages"><div className="port-section-title"><h2>现场消息</h2><span>点击对象定位 · 不自动改变调度</span></div><div className="port-message-list">{v.notices.slice(-10).reverse().map(n => <button key={n.id} onClick={() => focus(n.object)}><time>{portTime(n.at)}</time><span>{n.text}</span><ChevronRight size={13}/></button>)}</div></section>
  </div></main><aside className="port-workbench"><nav className="port-tabs" aria-label="业务工作台">{[["ships", "船舶", Ship], ["cargo", "货批", Boxes], ["resources", "调度", Users], ["plan", "规划", Map], ["review", "复盘", Flag]].filter(([id]) => availableTabs.includes(String(id))).map(([id, label, Icon]) => { const I = Icon as typeof Ship; return <button key={String(id)} aria-selected={tab === id} onClick={() => setTab(String(id))}><I size={16}/>{String(label)}</button>; })}</nav>
   <div className="port-panel">
    {tab === "ships" && currentShip && <><div className="port-panel-heading"><span className="port-eyebrow">VESSEL DOSSIER</span><h2>{currentShip.name}<button aria-label="定位船舶" onClick={() => scene.current?.focus(currentShip.id)}><Focus size={16}/></button></h2></div><select aria-label="当前船舶" value={currentShip.id} onChange={e => setSelected(e.target.value)}>{v.vessels.map(s => <option key={s.id} value={s.id}>{s.id} · {stageNames[s.call.stage]}</option>)}</select><p className="port-advice">{currentShip.waitReason}</p><dl className="port-facts"><div><dt>航次</dt><dd>{currentShip.voyage}</dd></div><div><dt>航前船员名册</dt><dd>{currentShip.crew} 人</dd></div><div><dt>实际到港</dt><dd>{currentShip.actualArrival === null ? "尚未到达" : portTime(currentShip.actualArrival)}</dd></div><div><dt>抵达泊位</dt><dd>{currentShip.call.berthArrivedAt === null ? "尚未抵达" : portTime(currentShip.call.berthArrivedAt)}</dd></div><div><dt>实际靠妥</dt><dd>{currentShip.call.milestones.secure === undefined ? "尚未靠妥" : portTime(currentShip.call.milestones.secure)}</dd></div><div><dt>周转承诺{currentShip.actualArrival === null ? "（预测）" : ""}</dt><dd>{portTime(currentShip.deadline)}</dd></div></dl>
     <div className="port-operation"><h3>{courseUnit === "departure" ? "离港安排" : courseUnit === "cargo" ? "船岸作业" : "泊位计划与通行"}</h3>{(!courseUnit || courseUnit === "arrival") && <><label>目的位置<select aria-label="目的位置" value={destination} onChange={e => setDestination(e.target.value)}><option value="berth:0">泊位 A · 普通船</option><option value="berth:1">泊位 B · 普通 / 大型船</option>{v.anchors.map((_, i) => <option key={i} value={`anchor:${i}`}>候泊锚位 {i + 1}</option>)}</select></label><div className="port-inline"><label>计划时刻（开局后分钟）<input type="number" min={Math.ceil(v.second / 60)} max={3240} value={plannedMinute} onChange={e => setPlannedMinute(Number(e.target.value))}/></label><button disabled={demonstration || (locked && v.status !== "ready") || !destination.startsWith("berth:")} onClick={() => send({ kind: "plan-berth", callId: currentShip.id, berth: Number(destination.split(":")[1]), at: plannedMinute * 60 })}>预约</button></div></>}<div className="port-actions">{(!courseUnit || courseUnit === "arrival") && <button disabled={locked} className="primary" onClick={() => send({ kind: "move", callId: currentShip.id, target: destination.startsWith("berth:") ? "berth" : "anchor", slot: Number(destination.split(":")[1]) })}>申请进港 / 移泊</button>}{(!courseUnit || courseUnit === "cargo") && <button disabled={locked} onClick={() => send({ kind: "work", callId: currentShip.id, running: !currentShip.call.working })}>{currentShip.call.working ? "停止接续装卸" : "组织装卸"}</button>}{(!courseUnit || courseUnit === "departure") && <button disabled={locked} onClick={() => send({ kind: "depart", callId: currentShip.id })}>离泊出港</button>}</div><small>{courseUnit === "departure" ? "确认装卸结果与出口岸准备，船舶实际驶离后释放资源。" : "预约不占用实际泊位。申请执行时检查手续、航道和目的位置。"}</small></div>
     <details open className="port-details"><summary>适用船舶手续与回执</summary><p>航次申请核对航次号，检疫及边检核对航前船员名册人数。基础资料已预填；核对后发起委托，机构按情境规则返回结果。</p>{(["entry", "health", "border", "departure"] as const).filter(kind => !courseUnit || (courseUnit === "departure" ? kind === "departure" : kind !== "departure")).map(kind => <DocForm key={`${currentShip.id}-${kind}`} id={`doc-${currentShip.id}-${kind}`} title={PORT_DOC_NAMES[kind]} document={currentShip.call.docs[kind]} disabled={locked} submit={value => send({ kind: "document", callId: currentShip.id, document: kind, value })}/>)}</details></>}
    {tab === "cargo" && batch && <><div className="port-panel-heading"><span className="port-eyebrow">CARGO OPERATIONS</span><h2>货批与逐箱交接</h2></div><div className="port-batch-list">{v.batches.filter(b => b.summary.loaded + b.summary.delivered < b.summary.total).map(b => <button key={b.id} data-batch={b.id} className={batch.id === b.id ? "selected" : ""} {...dragProps({ kind: "batch", id: b.id })} onClick={() => setBatchId(b.id)} onContextMenu={e => { e.preventDefault(); setBatchId(b.id); }}><span>{b.id}</span><small>{b.flow === "import" ? "卸" : "装"} {b.summary.total} 箱</small></button>)}</div><h3>{batch.name}</h3><p className="port-advice">承诺{v.vessels.find(s => s.id === batch.callId)?.actualArrival === null ? "（预测）" : ""}：{portTime(batch.deadline)}。{batch.summary.issues ? `${batch.summary.issues} 箱需要核查；其余箱正常接续。` : "批次分配一次，实际交接逐箱记账。"}</p><div className="port-inline"><label>目标堆场<select aria-label="货批目标堆场" value={batch.targetYard ?? ""} disabled={demonstration || locked && (v.status !== "ready" || !!courseUnit && courseUnit !== "planning")} onChange={e => send({ kind: "assign-yard", batchId: batch.id, yardId: e.target.value })}><option value="" disabled>选择目标</option>{v.yards.map(y => <option key={y.id} value={y.id}>{y.name} · {useNames[y.use]} · 余 {y.available}</option>)}</select></label><button onClick={() => batch.targetYard && scene.current?.focus(batch.targetYard)}><Focus size={16}/></button></div><p>已卸 {batch.summary.unloaded} · 已装 {batch.summary.loaded} · 已提离 {batch.summary.delivered}</p><dl className="port-facts"><div><dt>提单原始关联</dt><dd>{batch.reference}</dd></div><div><dt>承运交付许可</dt><dd>{batch.carrier ? "航前记录已接收" : "待核对"}</dd></div>{batch.flow === "export" && <div><dt>VGM 记录</dt><dd>{batch.vgm ? "已接收" : "待核验"}</dd></div>}</dl><DocForm id={`doc-${batch.id}`} title="货物资料核验" document={batch.document} disabled={locked} submit={value => send({ kind: "batch-document", batchId: batch.id, value })}/>
     <details open className="port-details"><summary>箱记录 · {batch.summary.total} 箱</summary><div className="port-box-list">{v.boxes.filter(b => b.batchId === batch.id).map(b => <button key={b.id} onClick={() => { void r.inspect(b.id); setSelected(b.id); scene.current?.focus(b.id); }} className={b.issue === "open" || b.issue === "reported" ? "has-issue" : ""}><span>{b.id}</span><small>{portLocationName(b.location)} · {b.recordCount} 次记录</small>{["open", "reported"].includes(b.issue) && <span>待核查</span>}</button>)}</div></details>
     {r.box && r.box.batchId === batch.id && <section className="port-box-detail"><h3>{r.box.id} · 交接账本</h3><p>{portLocationName(r.box.location)}</p>{["open", "reported"].includes(r.box.issue) && <div><p>封志与交接资料不一致。将该箱送入待核查区，委托复核。</p><select aria-label="核查目标" value={inspectYard} onChange={e => setInspectYard(e.target.value)}>{v.yards.filter(y => y.use === "inspection").map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select><button disabled={locked || r.box.issue === "reported"} onClick={() => { send({ kind: "inspect", boxId: r.box!.id, yardId: inspectYard }); void r.inspect(r.box!.id); }}>送检并委托核查</button></div>}<ol>{r.box.history.map((h, i) => <li key={i}><time>{portTime(h.at)}</time><strong>{h.action}</strong><span>{portLocationName(h.from)} → {portLocationName(h.to)}</span><small>{h.resource}</small></li>)}</ol><button onClick={() => void r.inspect(r.box!.id)}>刷新此箱记录</button></section>}</>}
    {tab === "resources" && <Resources view={v} disabled={demonstration || locked && (v.status !== "ready" || !!courseUnit && courseUnit !== "planning")} send={send} drop={drop}/>}
    {tab === "plan" && <PlanEditor view={v} readOnly={demonstration} courseUnit={courseUnit} modeLocked={!!courseUnit || trainingModeLocked} onApply={demonstration ? async () => {} : r.configure} send={send} drop={drop}/>}
    {tab === "review" && !courseUnit && <><div className="port-panel-heading"><span className="port-eyebrow">REVIEW & HANDOVER</span><h2>复盘与交班</h2></div><div className="port-score-grid">{[["货物履约", v.score.cargo, 50], ["船舶流程", v.score.process, 20], ["经营效率", v.score.efficiency, 20], ["交班完整", v.score.handover, 10]].map(([label, n, max]) => <div key={String(label)}><small>{label}</small><strong>{fmt(Number(n), 2)} <em>/ {max}</em></strong></div>)}</div><p>扣分 {v.score.deductions} · 到期 {v.score.dueBoxes} 箱 · 按时 {v.score.onTime} 箱 · 逾期未按时 {v.score.overdue} 箱</p><p>{v.status === "interrupted" ? "本场已中断，只用于诊断，不能选为最终成绩。" : v.status === "completed" ? "48 小时已结束。未到期任务可结转，逾期结果不会被交班消除。" : "当前为进度诊断，到期任务将逐步纳入评价。"}</p><p>单位成本 {fmt(v.score.unitCost, 3)} / 基准 {v.score.referenceUnitCost === null ? "计算中" : fmt(v.score.referenceUnitCost, 3)} 教学点。翻箱 {v.rehandles} 次，运输 {fmt(v.distance)} 距离单位。</p><details className="port-details"><summary>等待时间与原始运营指标</summary>{v.statistics && <p>设定平均间隔 {fmt(v.statistics.configuredMeanGap, 1)} 分钟 / 基准平均服务 {fmt(v.statistics.referenceMeanService, 1)} 分钟；本局首报平均间隔 {fmt(v.statistics.sampleMeanGap, 1)} 分钟 / 参考平均服务 {fmt(v.statistics.sampleMeanService, 1)} 分钟。单局样本允许波动。</p>}{v.vessels.map(s => <p key={s.id}>{s.id} · 泊位 {fmt(s.call.wait.berth / 60)} 分 · 锚地 {fmt(s.call.wait.anchor / 60)} 分 · 航道 {fmt(s.call.wait.channel / 60)} 分 · 资料 {fmt(s.call.wait.documents / 60)} 分 · 调度 {fmt(s.call.wait.dispatch / 60)} 分</p>)}</details>
     {v.handover.length > 0 && <Handover view={v} send={send}/>}
     <details className="port-details"><summary>处置依据 · 最近 {v.attempts.length} 条</summary>{v.attempts.slice().reverse().map((a, i) => <div className="port-attempt" key={i}><strong>{portTime(a.at)} · {a.object}</strong><p>{a.message} {a.deduction ? `扣 ${a.deduction} 分` : ""}</p><small>判定 {a.outcome} / {a.rule}</small><pre>{JSON.stringify(a.order, null, 2)}</pre><details><summary>下令前状态</summary><pre>{JSON.stringify(JSON.parse(a.before), null, 2)}</pre></details></div>)}<small>完整记录包含在结束后的导出文件中，导入会重新执行指令并计算成绩。</small></details>
     <div className="port-actions"><button disabled={!(["completed", "interrupted"].includes(v.status)) || !v.score.referenceReady} onClick={() => void r.exportReport()}><Download size={15}/>导出当前报告</button><button disabled title="当前仅保存本地，未连接成绩服务">提交教师 · 尚未联网</button></div><div className="port-history"><h3>本机场次历史</h3>{r.history.entries.slice().reverse().map(e => <div key={e.id}><div className="port-row"><strong>{e.mode === "battle" ? "实战" : "教学"} · {e.seed}</strong><span>{statusNames[e.status]}</span></div><small>{e.created.slice(0, 16).replace("T", " ")} · {hours(e.second)} · {e.score === null ? "诊断记录" : `${e.score} 分`}</small><div className="port-actions"><button disabled={r.busy} onClick={() => void r.openHistory(e)}>打开</button><button onClick={() => void r.retry(false, e)}>同船期重练</button>{e.mode === "battle" && e.status === "completed" && <button disabled={e.score === null} onClick={() => void r.selectFinal(e.id)}>{r.history.final === e.id ? <><Check size={14}/>最终结果</> : "选为最终结果"}</button>}</div></div>)}</div></>}
   {tab === "review" && r.lesson && <><div className="port-panel-heading"><span className="port-eyebrow">LESSON REVIEW</span><h2>本段作业复核</h2></div><p>{r.lesson.complete ? "本段目标已由实际作业状态验证。" : "尚未完成的目标可在现场继续练习。"}{demonstration ? " 当前为课程标准演示，不计入自主练习记录。" : " 这里保留本段的指令、判定和逐箱结果。"}</p>{r.lesson.goals.map(g => <p key={g.id}>{g.done ? "✓" : "○"} {g.label}</p>)}<p>本段运行 {hours(r.lesson.elapsed)} · 实际交接 {v.boxes.reduce((n, b) => n + b.recordCount, 0)} 条</p><details className="port-details" open><summary>本段处置记录</summary>{v.attempts.slice().reverse().map((a, i) => <div className="port-attempt" key={i}><strong>{portTime(a.at)} · {a.object}</strong><p>{a.message}</p><small>{a.outcome} · {a.rule}</small></div>)}</details>{!demonstration && <><button onClick={() => void r.exportReport()}><Download size={15}/>导出本段记录</button><h3>本段练习历史</h3>{r.history.entries.slice().reverse().map(e => <div key={e.id} className="port-course-history"><span>{e.created.slice(0, 16).replace("T", " ")} · {statusNames[e.status]}</span><button onClick={() => void r.openHistory(e)}>打开记录</button></div>)}</>}</>}
   </div><footer className="port-panel-footer"><button disabled={r.busy} onClick={() => void r.retry()}><RotateCcw size={14}/>{courseUnit ? demonstration ? "重播本段" : "重练本段" : "同船期重练"}</button>{!courseUnit && <button disabled={r.busy} onClick={() => void r.retry(true)}>新船期挑战</button>}<button disabled={demonstration} onClick={() => file.current?.click()}><Upload size={14}/>导入</button><input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f)
        void f.text().then(r.load); e.target.value = ""; }}/></footer>
  </aside></div>
  {stageFullscreen && <nav className="port-stage-dock" aria-label="全屏舞台工具"><button aria-pressed={stagePanel === "operations"} onClick={() => setStagePanel(stagePanel === "operations" ? null : "operations")}><PanelRight size={16}/>操作面板</button><button aria-pressed={stagePanel === "plans"} onClick={() => setStagePanel(stagePanel === "plans" ? null : "plans")}><Map size={16}/>船期与计划</button>{courseUnit && <button aria-pressed={stagePanel === "goals"} onClick={() => setStagePanel(stagePanel === "goals" ? null : "goals")}><ListChecks size={16}/>课程目标</button>}<span>{v.channel ? `${v.channel} 通行中` : "航道可用"}</span></nav>}
  <footer className="port-footer"><span>{demonstration ? "课程内置示范 · 观察模式 · 不写入自主练习记录" : "教学情境 · 按批次安排，逐箱留痕 · 本地自动保存"}{r.busy ? " · 正在重放…" : ""}</span><button onClick={onLegacy}>8 小时基础实训 / 旧版存档</button></footer>
 </section>;
}
function Resources({ view: v, disabled, send, drop }: {
    view: PortView;
    disabled: boolean;
    send: (c: PortCommand) => void;
    drop: (s: PortDrag, t: string) => void;
}) {
    const [d, setD] = useState(v.plan.equipment.dispatch);
    useEffect(() => setD(v.plan.equipment.dispatch), [JSON.stringify(v.plan.equipment.dispatch)]);
    const roles = [["craneOperators", "岸桥操作"], ["drivers", "运输班组"], ["yardOperators", "堆场班组"], ["gateClerks", "闸口核验"], ["technicians", "维修班组"]] as const;
    return <><div className="port-panel-heading"><span className="port-eyebrow">RESOURCE DISPATCH</span><h2>设备与岗位调度</h2></div><p className="port-advice">拖动岸桥到泊位；拖动岗位卡到另一岗位转配 1 人。数字输入具有相同作用，调整后保留在制任务进度。</p><div className="port-cranes">{Array.from({ length: v.plan.equipment.cranes }, (_, i) => <button key={i} {...dragProps({ kind: "crane", id: String(i) })}>岸桥 {i + 1}<small>{i < d.berthCranes[0] ? "泊位 A" : i < d.berthCranes[0] + d.berthCranes[1] ? "泊位 B" : "待分配"}{v.failedCrane === i ? " · 故障" : ""}</small></button>)}</div><form onSubmit={e => { e.preventDefault(); send({ kind: "dispatch", dispatch: d }); }}><div className="port-inline">{([0, 1] as const).map(i => <label key={i}>泊位 {i ? "B" : "A"} 岸桥<input aria-label={`泊位 ${i ? "B" : "A"} 岸桥数`} type="number" min={0} max={v.plan.equipment.cranes} value={d.berthCranes[i]} onChange={e => { const a = [...d.berthCranes] as [
        number,
        number
    ]; a[i] = Number(e.target.value); setD({ ...d, berthCranes: a }); }}/></label>)}</div><div className="port-crew">{roles.map(([key, label]) => <label key={key} {...dragProps({ kind: "crew", id: key })} {...dropProps(`crew:${key}`, drop)}>{label}<input aria-label={`${label}人数`} type="number" min={0} max={26} value={d[key]} onChange={e => setD({ ...d, [key]: Number(e.target.value) })}/><small>当前 {v.plan.equipment.dispatch[key]} 人</small></label>)}</div><p>岗位合计 {roles.reduce((n, [key]) => n + d[key], 0)} / 26 人。每 8 小时系统轮换班组，任务连续结转。</p><button className="primary" type="submit" disabled={disabled}>应用调度</button></form><h3>当前可用作业能力</h3><p>岸桥 {v.resources.quay} · 车辆 {v.resources.truck} · 场桥 {v.resources.yard} · 闸口 {v.resources.gate}</p><p>在制任务 {v.jobs.length} 个 · 暂停等待资源 {v.jobs.filter(j => j.rate === 0).length} 个</p>{v.failedCrane !== null && <div className="port-advice"><p>岸桥 {v.failedCrane + 1} 故障，需要维修人员。</p><button disabled={disabled || v.repairPending} onClick={() => send({ kind: "repair" })}>{v.repairPending ? "正在维修" : "委托维修"}</button></div>}<p>资源不足不会扣分。补足岗位后，在制任务按剩余工作量继续；也可继续运行，等待其他任务释放资源。</p></>;
}
function PlanEditor({ view: v, modeLocked, onApply, send, drop, courseUnit, readOnly = false }: {
    readOnly?: boolean;
    courseUnit?: PortCourseUnit;
    view: PortView;
    modeLocked: boolean;
    onApply: (mode: PortMode, config: PortConfig, plan: PortPlan) => Promise<void>;
    send: (c: PortCommand) => void;
    drop: (s: PortDrag, t: string) => void;
}) {
    const [p, setP] = useState(v.plan), [c, setC] = useState(v.config), [mode, setMode] = useState(v.mode);
    useEffect(() => { setP(v.plan); setC(v.config); setMode(v.mode); }, [JSON.stringify(v.plan), JSON.stringify(v.config), v.mode]);
    const ready = !readOnly && v.status === "ready" && (!courseUnit || courseUnit === "planning");
    const swap = (a: string, b: string) => { if (!ready)
        return; const next = structuredClone(p), from = next.yards.find(y => y.id === a)!, to = next.yards.find(y => y.id === b)!; [from.col, to.col] = [to.col, from.col]; [from.row, to.row] = [to.row, from.row]; setP(next); };
    return <><div className="port-panel-heading"><span className="port-eyebrow">TERMINAL MASTERPLAN</span><h2>有限规划，持续检验</h2></div><p className="port-advice">六个地块各容纳 100 箱。开局前拖动地块卡交换位置；作业中拖入货批安排堆场。改变已有库存的目标会产生真实移箱任务。</p><div className="port-yard-grid">{p.yards.slice().sort((a, b) => a.row - b.row || a.col - b.col).map(y => { const live = v.yards.find(x => x.id === y.id)!; return <div key={y.id} className={`port-yard ${y.use}`} data-yard={y.id} {...(ready ? dragProps({ kind: "yard", id: y.id }) : {})} {...dropProps(y.id, (s, t) => s.kind === "yard" ? swap(s.id, t) : drop(s, t))}><div className="port-row"><strong>{y.name}</strong><span>{y.col} 列 {y.row + 1} 排</span></div><select disabled={readOnly} aria-label={`${y.name}用途`} value={y.use} onChange={e => { const use = e.target.value as YardUse; if (ready)
        setP({ ...p, yards: p.yards.map(x => x.id === y.id ? { ...x, use } : x) });
    else
        send({ kind: "yard-use", yardId: y.id, use }); }}>{Object.entries(useNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><div className="port-capacity"><span style={{ width: `${Math.min(100, live.occupied + live.reserved)}%` }}/></div><small>在场 {live.occupied} / 预留 {live.reserved}</small>{ready && <label>交换位置<select aria-label={`${y.name}交换位置`} value="" onChange={e => swap(y.id, e.target.value)}><option value="">选择地块</option>{p.yards.filter(x => x.id !== y.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}</div>; })}</div>
  <fieldset disabled={!ready}><legend>开局配置</legend><fieldset disabled={!!courseUnit} className="port-scenario-fields"><div className="port-inline"><label>场次类型<select aria-label="场次类型" disabled={modeLocked} value={mode} onChange={e => setMode(e.target.value as PortMode)}><option value="practice">教学模式</option><option value="battle">实战模式</option></select></label><label>种子<input type="number" min={0} max={4294967295} value={c.seed} onChange={e => setC({ ...c, seed: Number(e.target.value) })}/></label></div><div className="port-inline"><label>平均到港间隔（分钟）<input type="number" min={241} max={1440} value={c.meanGapMinutes} onChange={e => setC({ ...c, meanGapMinutes: Number(e.target.value) })}/></label><label>到港波动<select value={c.variability} onChange={e => setC({ ...c, variability: e.target.value as PortConfig["variability"] })}><option value="low">低</option><option value="normal">中</option><option value="high">高</option></select></label></div><div className="port-inline"><label>大型船比例<input type="number" min={0} max={1} step={.05} value={c.largeShare} onChange={e => setC({ ...c, largeShare: Number(e.target.value) })}/></label><label>作业扰动<select value={c.disruption} onChange={e => setC({ ...c, disruption: e.target.value as PortConfig["disruption"] })}><option value="none">常态</option><option value="wind">大风窗口</option><option value="outage">岸桥故障</option></select></label></div>
   </fieldset><h3>设备选型 · 投入 {fmt(terminalBudget(p.equipment))} / 1,200</h3>{([["crane", "cranes"], ["vehicle", "vehicles"], ["yardMachine", "yardMachines"], ["gateSystem", "gates"]] as const).map(([model, count]) => <div className="port-inline" key={model}><label>设备型号<select aria-label={`${model}型号`} value={p.equipment[model]} onChange={e => setP({ ...p, equipment: { ...p.equipment, [model]: e.target.value } })}>{Object.entries(TERMINAL_EQUIPMENT[model]).map(([key, m]) => <option key={key} value={key}>{m.label} · {m.cost} 点</option>)}</select></label><label>数量<input aria-label={`${count}数量`} type="number" min={0} max={count === "vehicles" ? 16 : 6} value={p.equipment[count]} onChange={e => { const n = Number(e.target.value), equipment = { ...p.equipment, [count]: n }; if (count === "cranes") {
        const a = Math.min(n, p.equipment.dispatch.berthCranes[0]);
        equipment.dispatch = { ...p.equipment.dispatch, berthCranes: [a, Math.min(Math.max(0, n - a), p.equipment.dispatch.berthCranes[1])] };
    } setP({ ...p, equipment }); }}/></label></div>)}<p>先确定设备和布局，开局后在“调度”中分配岗位与岸桥。大型船需要大伸距岸桥。</p><button className="primary" onClick={() => void onApply(mode, c, p)}>应用开局方案</button></fieldset><small>固定道路与岸线；堆场位置决定运输距离。必须保留待核查空间。投入和运行费为教学点，不对应真实价格。</small></>;
}
function Handover({ view: v, send }: {
    view: PortView;
    send: (c: PortCommand) => void;
}) {
    const [entries, setEntries] = useState<Record<string, {
        team: string;
        next: string;
    }>>({});
    const teams = ["下一班调度", "船舶协调", "货物协调", "维修班组", "单证核查班组"], actions = ["核对库存", "跟踪到港", "接续进港", "接续作业与离港", "跟踪单证", "安排堆场", "接续货物交接", "接续维修", "接续异常核查"];
    return <section className="port-handover"><h3>交班核对 · {v.score.verifiedHandover} / {v.handover.length}</h3><p>按现场状态填写责任岗位和下一步安排。已办妥手续和已完成箱位不重复作业。</p>{v.handover.map(h => <div key={h.object}><strong>{h.label}{h.verified && <Check size={14}/>}</strong><div className="port-inline"><select aria-label={`${h.object}责任岗位`} value={entries[h.object]?.team ?? ""} onChange={e => setEntries({ ...entries, [h.object]: { next: entries[h.object]?.next ?? "", team: e.target.value } })}><option value="">责任岗位</option>{teams.map(t => <option key={t}>{t}</option>)}</select><select aria-label={`${h.object}下一步`} value={entries[h.object]?.next ?? ""} onChange={e => setEntries({ ...entries, [h.object]: { team: entries[h.object]?.team ?? "", next: e.target.value } })}><option value="">下一步安排</option>{actions.map(t => <option key={t}>{t}</option>)}</select></div></div>)}<button disabled={v.status !== "completed"} onClick={() => send({ kind: "handover", entries: v.handover.map(h => ({ object: h.object, team: entries[h.object]?.team ?? "", next: entries[h.object]?.next ?? "" })) })}>确认交班</button></section>;
}
function BerthTimeline({ view: v, drop }: {
    view: PortView;
    drop: (s: PortDrag, t: string) => void;
}) {
    const start = Math.floor(v.second / 3600) * 3600, duration = 21600;
    return <div className="port-berth-timeline"><div className="port-row"><strong>泊位预约时段</strong><small>拖入船舶安排时间 · 预测条不占用泊位</small></div><div className="port-time-axis">{Array.from({ length: 7 }, (_, i) => <span key={i}>{portTime(start + i * 3600).split(" ").at(-1)}</span>)}</div>{([0, 1] as const).map(i => <div className="port-timeline-row" key={i}><strong>{i ? "B" : "A"}</strong><div className="port-time-track" data-timeline={i} onDragOver={e => { if (e.dataTransfer.types.includes(PORT_DRAG_MIME))
        e.preventDefault(); }} onDrop={e => { e.preventDefault(); try {
        const source = JSON.parse(e.dataTransfer.getData(PORT_DRAG_MIME)), rect = e.currentTarget.getBoundingClientRect(), at = Math.max(v.second, Math.round((start + (e.clientX - rect.left) / rect.width * duration) / 900) * 900);
        drop(source, `timeline:${i}:${at}`);
    }
    catch { } }}>{v.vessels.filter(s => s.call.plannedBerth === i && s.call.plannedAt !== null && s.call.stage !== "departed").map(s => { const from = Math.max(0, (s.call.plannedAt! - start) / duration), to = Math.min(1, (s.call.plannedAt! + s.referenceService - start) / duration); return to > from && from < 1 ? <span key={s.id} title={`${s.id} 计划 ${portTime(s.call.plannedAt!)}`} style={{ left: `${from * 100}%`, width: `${(to - from) * 100}%` }}>{s.id}</span> : null; })}</div></div>)}</div>;
}
