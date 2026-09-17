import { useCallback, useEffect, useRef, useState } from "react";
import { defaultPortConfig, defaultPortPlan, portStorageKey, type PortCourseUnit, type PortCourseView, type PortCourseStep, type PortBox, type PortCommand, type PortConfig, type PortMode, type PortPlan, type PortResult, type PortView } from "@edu/port-simulation-core";
import type { LabStorage } from "./useTerminalTraining";
import type { PortTutorialView } from "@edu/port-simulation-core";
import type { PortSubmissionPackage } from "@edu/port-simulation-core";
export interface PortHistoryEntry {
    id: string;
    created: string;
    mode: PortMode;
    seed: number;
    status: string;
    second: number;
    raw: string;
    score: number | null;
    rules?: PortView["schema"];
}
interface History {
    active: string;
    final: string | null;
    entries: PortHistoryEntry[];
}
type Message = {
    sealed?: boolean;
    package?: PortSubmissionPackage;
    id: number;
    type: string;
    view?: PortView;
    lesson?: PortCourseView;
    tutorial?: PortTutorialView;
    demonstration?: PortCourseStep | null;
    saved?: string;
    result?: PortResult;
    message?: string;
    raw?: string;
    box?: PortBox;
    reference?: {
        cost: number;
        completed: number;
        unitCost: number;
    };
};
function entryRules(e: { raw: string; rules?: PortView["schema"] }): PortView["schema"] {
    if(e.rules) return e.rules;
    try { const schema=JSON.parse(e.raw).schema; return ["port-operations/3.0","port-course/1.0"].includes(schema)?"port-operations/3.0":"port-operations/3.1"; } catch { return "port-operations/3.1"; }
}
export function usePortOperations(storage: LabStorage | null | undefined, scope: string, initialMode: PortMode, locked: boolean, initialConfig = defaultPortConfig(), course?: { unit: PortCourseUnit; demo: boolean; tutorial?: boolean }, enabled = true) {
    const [sealed, setSealed] = useState(false), [sealing, setSealing] = useState(false);
    const sealedRef = useRef(false), sealingRef = useRef(false);
    const sealRequest = useRef<number | null>(null);
    const [tutorial, setTutorial] = useState<PortTutorialView | null>(null);
    const [lesson, setLesson] = useState<PortCourseView | null>(null), [demonstration, setDemonstration] = useState<PortCourseStep | null>(null), [demoPlaying, setDemoPlayingState] = useState(false);
    const demoPlayingRef = useRef(false), demoActionWall = useRef(0);
    const [view, setView] = useState<PortView | null>(null), [history, setHistory] = useState<History>({ active: "", final: null, entries: [] }), [error, setError] = useState(""), [notice, setNotice] = useState(""), [speed, setSpeedState] = useState(60), [box, setBox] = useState<PortBox | null>(null), [busy, setBusy] = useState(false);
    const worker = useRef<Worker | null>(null), benchmark = useRef<Worker | null>(null), latest = useRef(view), book = useRef(history), sequence = useRef(0), generation = useRef(0), pending = useRef(new Map<number, (m: Message) => void>()), clockPending = useRef(false), lastWall = useRef(Date.now()), speedRef = useRef(speed), modeRef = useRef(initialMode), active = useRef(""), original = useRef<string | null>(null), benchmarkConfig = useRef("");
    latest.current = view;
    speedRef.current = speed;
    const persist = useCallback(() => { if (original.current)
        return; try {
        for (const rules of ["port-operations/3.0", "port-operations/3.1"] as const) {
            const entries = book.current.entries.filter(e => entryRules(e) === rules);
            if (entries.length) storage?.setItem(portStorageKey(scope, modeRef.current, rules), JSON.stringify({ entries, active: entries.some(e=>e.id===book.current.active) ? book.current.active : "", final: entries.some(e=>e.id===book.current.final) ? book.current.final : null }));
        }
        storage?.setItem(`edu-port-operations:active-rules:${scope}:${modeRef.current}`, latest.current?.schema ?? "port-operations/3.1");
        if (!locked)
            storage?.setItem(`edu-port-operations:selection:${scope}`, modeRef.current);
        const flush = storage?.flush?.();
        flush?.catch(e => setError(`本地记录尚未写入：${String(e)}`));
    }
    catch (e) {
        setError(`本地保存失败，请在结束后导出备份：${String(e)}`);
    } }, [storage, scope, locked]);
    const post = useCallback((payload: Record<string, unknown>) => new Promise<Message>((resolve) => { const id = ++sequence.current; pending.current.set(id, resolve); worker.current?.postMessage({ ...payload, id }); }), []);
    const readBook = useCallback((mode: PortMode) => {
        original.current = null;
        const merged: History = { active: "", final: null, entries: [] };
        const preferred = storage?.getItem(`edu-port-operations:active-rules:${scope}:${mode}`);
        for (const rules of ["port-operations/3.0", "port-operations/3.1"] as const) {
            const raw = storage?.getItem(portStorageKey(scope, mode, rules));
            if (!raw) continue;
            try {
                const h = JSON.parse(raw) as History;
                if (!Array.isArray(h.entries) || h.entries.some(e=>typeof e.raw!=="string" || typeof e.id!=="string")) throw new Error("记录结构无效");
                merged.entries.push(...h.entries.map(e=>({...e,rules:entryRules(e)})));
                if (h.active && (!merged.active || !preferred || preferred===rules)) merged.active=h.active;
                if (h.final) merged.final=h.final;
            } catch {
                original.current=raw;
                throw new Error("本机记录无法读取，原文已保留。开始新挑战时会先保留损坏记录的副本。");
            }
        }
        return merged;
    }, [storage, scope]);
    const tick = useCallback(() => {
        if (sealedRef.current || sealingRef.current) return;
        const v = latest.current;
        if (course?.demo) {
            if (!v || !demoPlayingRef.current || clockPending.current || v.status === "completed") return;
            const now = Date.now(), seconds = Math.min(172800, Math.floor(Math.max(0, now - lastWall.current) * speedRef.current / 1000));
            const act = now - demoActionWall.current >= 3500 || v.status === "ready";
            if (act) demoActionWall.current = now;
            lastWall.current = now;
            clockPending.current = true;
            void post({ type: "demo-tick", seconds, act }).finally(() => { clockPending.current = false; });
            return;
        }
        if (!v || v.status !== "running" || clockPending.current)
            return;
        const scale = v.mode === "battle" ? 60 : speedRef.current, now = Date.now();
        const seconds = Math.min(172800, Math.floor(Math.max(0, now - lastWall.current) * scale / 1000));
        if (!seconds)
            return;
        lastWall.current += seconds * 1000 / scale;
        clockPending.current = true;
        void post({ type: "command", command: { kind: "advance", seconds } }).finally(() => { clockPending.current = false; });
    }, [post, course?.demo]);
    const launch = useCallback(async (mode: PortMode, config: PortConfig, plan: PortPlan, raw?: string, id?: string, schema: PortView["schema"] = "port-operations/3.1") => {
        sealedRef.current = false; sealingRef.current = false; setSealed(false); setSealing(false);
        setBusy(true);
        setError("");
        setBox(null);
        setLesson(null);
        setTutorial(null);
        setDemonstration(null);
        demoPlayingRef.current = false;
        setDemoPlayingState(false);
        latest.current = null;
        clockPending.current = false;
        setView(null);
        generation.current = sequence.current + 1;
        lastWall.current = Date.now();
        modeRef.current = mode;
        benchmarkConfig.current = "";
        active.current = id ?? crypto.randomUUID();
        book.current.active = active.current;
        if (!id && !course?.tutorial)
            book.current.entries.push({ id: active.current, created: new Date().toISOString(), mode, seed: config.seed, status: "ready", second: 0, raw: "", score: null, rules: schema });
        const m = await post({ type: "init", mode, config, plan, raw, course, schema });
        if (m.type === "error")
            setError(m.message ?? "载入失败");
        setBusy(false);
    }, [post, course?.unit, course?.demo]);
    useEffect(() => {
        if (!enabled) { setView(null); setTutorial(null); return; }
        const w = new Worker(new URL("./port-operations.worker.ts", import.meta.url), { type: "module" });
        worker.current = w;
        w.onmessage = (event: MessageEvent<Message>) => {
            const m = event.data;
            if (m.id < generation.current) {
                pending.current.get(m.id)?.(m);
                pending.current.delete(m.id);
                return;
            }
            if (m.type === "state" && m.view && (m.saved || course?.tutorial)) {
                sealedRef.current = m.sealed ?? false; setSealed(m.sealed ?? false);
                const v = m.view;
                const previous = latest.current;
                if (previous?.status !== v.status || v.status !== "running")
                    lastWall.current = Date.now();
                latest.current = v;
                setView(v);
                setLesson(m.lesson ?? null);
                setTutorial(m.tutorial ?? null);
                setDemonstration(m.demonstration ?? null);
                if (m.lesson?.complete) { demoPlayingRef.current = false; setDemoPlayingState(false); }
                const e = book.current.entries.find(e => e.id === active.current);
                if (e) {
                    Object.assign(e, { rules: v.schema, raw: m.saved, mode: v.mode, seed: v.config.seed, status: v.status === "running" && v.mode === "battle" ? "interrupted" : v.status, second: v.second, score: v.score.referenceReady && v.status === "completed" ? v.score.total : null });
                    persist();
                    setHistory({ ...book.current, entries: [...book.current.entries] });
                }
                if (m.result && m.result.rule !== "clock") {
                    if (["incorrect", "invalid"].includes(m.result.outcome))
                        setError(`${m.result.message}${m.result.deduction ? `（扣 ${m.result.deduction} 分）` : ""}`);
                    else {
                        setError("");
                        setNotice(m.result.message);
                    }
                }
                const configKey = JSON.stringify([v.schema, v.config]);
                if (!course && benchmarkConfig.current !== configKey) {
                    benchmarkConfig.current = configKey;
                    benchmark.current?.terminate();
                    const b = new Worker(new URL("./port-operations.worker.ts", import.meta.url), { type: "module" });
                    benchmark.current = b;
                    b.onmessage = (event: MessageEvent<Message>) => { if (event.data.type === "benchmark" && benchmarkConfig.current === configKey) {
                        void post({ type: "reference", schema: v.schema, config: v.config, reference: event.data.reference });
                        b.terminate();
                    }
                    else if (event.data.type === "error")
                        setError(`参考成本计算失败：${event.data.message}`); };
                    b.onerror = event => { if(benchmarkConfig.current === configKey) setError(`参考成本工作线程失败：${event.message}`); };
                    b.postMessage({ id: 1, type: "benchmark", schema: v.schema, config: v.config });
                }
            }
            if (m.type === "inspect" && m.box)
                setBox(m.box);
            if (m.type === "error")
                setError(m.message ?? "业务内核返回错误");
            if (!(m.id === sealRequest.current && m.type === "state")) {
                pending.current.get(m.id)?.(m);
                pending.current.delete(m.id);
            }
        };
        w.onerror = e => { setError(`仿真工作线程失败：${e.message}`); setBusy(false); clockPending.current = false; };
        try {
            const preferred = course ? "practice" : locked ? initialMode : storage?.getItem(`edu-port-operations:selection:${scope}`);
            const mode = preferred === "battle" || preferred === "practice" ? preferred : initialMode;
            modeRef.current = mode;
            book.current = readBook(mode);
            setHistory(book.current);
            const entry = book.current.entries.find(e => e.id === book.current.active);
            void launch(mode, initialConfig, defaultPortPlan(), entry?.raw || undefined, entry?.id);
        }
        catch (e) {
            setError((e as Error).message);
        }
        const timer = window.setInterval(tick, 500);
        const visibility = () => { if (document.hidden && latest.current?.mode === "practice" && latest.current.status === "running") {
            demoPlayingRef.current = false;
            setDemoPlayingState(false);
            tick();
            void post({ type: "command", command: { kind: "pause" } });
        }
        else
            tick(); };
        document.addEventListener("visibilitychange", visibility);
        return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibility); persist(); w.terminate(); benchmark.current?.terminate(); worker.current = null; latest.current = null; clockPending.current = false; benchmarkConfig.current = ""; for (const [id, resolve] of pending.current) resolve({ id, type: "closed" }); pending.current.clear(); };
    }, [scope, storage, initialMode, course?.unit, course?.demo, course?.tutorial, enabled]); // Identity and learning activities use isolated runtimes.
    const send = useCallback((command: PortCommand) => { tick(); return post({ type: "command", command }); }, [post, tick]);
    const seal = async (): Promise<PortSubmissionPackage> => {
        if (sealingRef.current) throw new Error("正在封存，请稍候。");
        tick(); sealingRef.current = true; setSealing(true);
        try {
            sealRequest.current = sequence.current + 1;
            const message = await post({ type: "seal" });
            await storage?.flush?.();
            if (!message.package) throw new Error(message.message ?? "实验封存失败。");
            return message.package;
        } finally { sealRequest.current = null; sealingRef.current = false; setSealing(false); }
    };
    const configure = async (mode: PortMode, config: PortConfig, plan: PortPlan) => {
        if (locked && mode !== initialMode) {
            setError("场次类型由教师指定。");
            return;
        }
        if (mode !== modeRef.current) {
            persist();
            modeRef.current = mode;
            try {
                book.current = readBook(mode);
            }
            catch (e) {
                setError((e as Error).message);
                return;
            }
            book.current.active = "";
            await launch(mode, config, plan);
            return;
        }
        benchmarkConfig.current = "";
        await post({ type: "configure", mode, config, plan });
    };
    const retry = async (newSeed = false, entry?: PortHistoryEntry) => {
        if (latest.current?.status === "running" || latest.current?.status === "paused")
            await send({ kind: "interrupt" });
        if (original.current) {
            try {
                storage?.setItem(`${portStorageKey(scope, modeRef.current)}:unreadable:${Date.now()}`, original.current);
                original.current = null;
                book.current = { active: "", final: null, entries: [] };
            }
            catch {
                setError("原记录备份失败，请先释放本机存储空间。");
                return;
            }
        }
        let schema: PortView["schema"] = latest.current?.schema ?? "port-operations/3.1";
        let config = latest.current?.config ?? initialConfig, plan = latest.current?.plan ?? defaultPortPlan();
        try {
            const raw = entry?.raw ?? book.current.entries.find(e => e.id === active.current)?.raw;
            if (raw) schema = entryRules({ raw });
            if (raw && !course) {
                const data = JSON.parse(raw);
                config = data.config;
                plan = data.initialPlan;
            }
        }
        catch {
            setError("原方案无法读取。");
            return;
        }
        if (newSeed)
            config = { ...config, seed: crypto.getRandomValues(new Uint32Array(1))[0]! };
        await launch(modeRef.current, config, plan, undefined, undefined, newSeed ? "port-operations/3.1" : schema);
    };
    const load = async (raw: string) => {
        try {
            if (course?.tutorial) throw new Error("操作教学不接受自主练习存档。");
            const envelope = JSON.parse(raw);
            if (envelope.package?.schema === "port-experiment-submission/1") raw = envelope.package.record;
            else if (envelope.schema === "port-experiment-submission/1") raw = envelope.record;
            const data = JSON.parse(raw);
            if (course) {
                if (!["port-course/1.0", "port-course/1.1", "port-course/1.2"].includes(data.schema) || data.unit !== course.unit || data.demo === true) throw new Error("请导入当前分段的自主练习记录；演示记录与综合场次不能作为本段练习。");
                if (["running", "paused"].includes(latest.current?.status ?? "")) await send({ kind: "pause" });
                await launch("practice", initialConfig, defaultPortPlan(), raw);
                return;
            }
            if (!["port-operations/3.0", "port-operations/3.1"].includes(data.schema))
                throw new Error("这是旧版存档，请打开“8 小时基础实训”导入，旧成绩按原规则重放。");
            if (locked && data.mode !== initialMode)
                throw new Error("导入场次与教师指定模式不一致。");
            if (latest.current?.status === "running" || latest.current?.status === "paused")
                await send({ kind: "interrupt" });
            if (data.mode !== modeRef.current) {
                modeRef.current = data.mode;
                book.current = readBook(data.mode);
            }
            await launch(data.mode, data.config, data.initialPlan, raw);
        }
        catch (e) {
            setError((e as Error).message);
        }
    };
    const selectFinal = async (id: string) => { const e = book.current.entries.find(e => e.id === id); if (!e || e.mode !== "battle" || e.status !== "completed" || e.score === null) {
        setError("只能选择已完成且已计算成绩的实战场次。");
        return;
    } if (["running", "paused"].includes(latest.current?.status ?? "")) {
        setError("当前场次仍在进行，结束后可选择最终结果。");
        return;
    } if (active.current !== id)
        await openHistory(e); book.current.final = id; persist(); setHistory({ ...book.current }); setNotice("已打开当前结果，可导出报告或提交教师。"); };
    const openHistory = async (e: PortHistoryEntry) => { if (latest.current?.status === "running" || latest.current?.status === "paused")
        await send({ kind: "interrupt" }); await launch(e.mode, defaultPortConfig(), defaultPortPlan(), e.raw, e.id); };
    const exportReport = async () => { const m = await post({ type: "export" }); if (m.raw) {
        const url = URL.createObjectURL(new Blob([m.raw], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `port-${course?.unit ?? "48h"}-${latest.current?.config.seed}-${active.current.slice(0, 8)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } };
    const setDemoPlaying = (playing: boolean) => { demoPlayingRef.current = playing; setDemoPlayingState(playing); lastWall.current = Date.now(); demoActionWall.current = 0; if (!playing && latest.current?.status === "running") void post({ type: "command", command: { kind: "pause" } }); };
    return { view, sealed, sealing, seal, runId: history.active, lesson, tutorial, observe: (target: string) => course?.tutorial ? post({ type: "tutorial-observe", target }) : Promise.resolve(null), demonstration, demoPlaying, setDemoPlaying, demoStep: () => { if (demoPlayingRef.current) setDemoPlaying(false); return post({ type: "demo-step" }); }, history, error, notice, speed, box, busy, send, configure, retry, load, selectFinal, openHistory, exportReport, inspect: (boxId: string) => post({ type: "inspect", boxId }), setSpeed: (n: number) => { if (latest.current?.mode === "practice") {
            tick();
            speedRef.current = n;
            setSpeedState(n);
            lastWall.current = Date.now();
        } }, setError, setNotice };
}
