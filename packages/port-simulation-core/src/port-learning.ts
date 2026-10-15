import type { PortConfig, PortPlan } from "./port-operations-model.js";
import type { PortView } from "./port-operations-view.js";

export const PORT_LEARNING_VERSION = "port-learning/1.0";
type Flow = "import" | "export";
export interface PortLearningVessel {
    id: string;
    large: boolean;
    arrival: number;
    departure: number | null;
    work: number | null;
    boxes: number;
    elapsedMinutes: number;
    turnaroundMinutes: number | null;
    waitMinutes: Record<"berth" | "anchor" | "channel" | "documents" | "dispatch", number>;
}
export interface PortLearningCargo {
    total: number;
    completed: number;
    due: number;
    onTimeDue: number;
    overdueOpen: number;
    onTimeRate: number | null;
}
export interface PortLearningSnapshot {
    version: typeof PORT_LEARNING_VERSION;
    runId: string;
    capturedAt: string;
    schema: PortView["schema"];
    referenceVersion: number;
    mode: PortView["mode"];
    second: number;
    config: PortConfig;
    plan: PortPlan;
    vessels: PortLearningVessel[];
    cargo: Record<Flow, PortLearningCargo>;
    completedVessels: number;
    openVessels: number;
    medianMinutes: number | null;
    p90Minutes: number | null;
    cost: number;
    costPerCompletion: number | null;
    rehandles: number;
    unresolvedBoxes: number;
    waitMinutes: PortLearningVessel["waitMinutes"];
}

/** Nearest-rank empirical quantile, not a population or future-service guarantee. */
export function portSampleQuantile(values: readonly number[], p: number): number | null {
    if (!Number.isFinite(p) || p <= 0 || p > 1 || values.some(v => !Number.isFinite(v) || v < 0))
        throw new Error("样本与分位数范围无效。");
    return values.length ? [...values].sort((a, b) => a - b)[Math.ceil(p * values.length) - 1]! : null;
}

/** Cap wall-clock advancement at an experimental observation endpoint. */
export function portObservationAdvance(second: number, elapsed: number, endpoint: number | null) {
    const available = Math.max(0, Math.floor(elapsed));
    return endpoint === null ? available : Math.min(available, Math.max(0, endpoint - second));
}

/** Consume only the public student projection; never inspect latent events or future schedules. */
export function capturePortLearning(view: PortView, runId: string, capturedAt = new Date().toISOString()): PortLearningSnapshot {
    if (!runId || view.second <= 0 || !["paused", "completed", "interrupted"].includes(view.status))
        throw new Error("请在运行开始后暂停，再保存同一观察时点的记录。");
    const arrived = view.vessels.filter(v => v.actualArrival !== null && v.actualArrival <= view.second);
    const ids = new Set(arrived.map(v => v.id));
    const vessels: PortLearningVessel[] = arrived.map(v => {
        const arrival = v.actualArrival!;
        const departure = v.call.stage === "departed" ? v.call.milestones.depart ?? null : null;
        return {
            id: v.id, large: v.large, arrival, departure, work: v.call.milestones.work ?? null,
            boxes: v.unload + v.load, elapsedMinutes: ((departure ?? view.second) - arrival) / 60,
            turnaroundMinutes: departure === null ? null : (departure - arrival) / 60,
            waitMinutes: Object.fromEntries(Object.entries(v.call.wait).map(([k, n]) => [k, n / 60])) as PortLearningVessel["waitMinutes"]
        };
    });
    const boxes = new Map(view.boxes.map(box => [box.id, box]));
    const cargo = Object.fromEntries((["import", "export"] as const).map(flow => {
        const batches = view.batches.filter(b => ids.has(b.callId) && b.flow === flow);
        const records = batches.flatMap(b => b.boxIds.map(id => ({ box: boxes.get(id), deadline: b.deadline })));
        const total = records.length;
        let completed = 0, due = 0, onTimeDue = 0, overdueOpen = 0;
        for (const { box, deadline } of records) {
            const at = flow === "import" ? box?.deliveredAt : box?.loadedAt;
            const done = at !== null && at !== undefined && at <= view.second;
            if (done) completed++;
            if (deadline <= view.second) {
                due++;
                if (done && at! <= deadline) onTimeDue++;
                if (!done) overdueOpen++;
            }
        }
        return [flow, { total, completed, due, onTimeDue, overdueOpen, onTimeRate: due ? onTimeDue / due : null }];
    })) as Record<Flow, PortLearningCargo>;
    const completed = vessels.flatMap(v => v.turnaroundMinutes === null ? [] : [v.turnaroundMinutes]).sort((a, b) => a - b);
    const middle = Math.floor(completed.length / 2);
    const medianMinutes = !completed.length ? null : completed.length % 2 ? completed[middle]! : (completed[middle - 1]! + completed[middle]!) / 2;
    const completionCount = cargo.import.completed + cargo.export.completed;
    const waitMinutes = { berth: 0, anchor: 0, channel: 0, documents: 0, dispatch: 0 };
    for (const v of vessels) for (const key of Object.keys(waitMinutes) as (keyof typeof waitMinutes)[]) waitMinutes[key] += v.waitMinutes[key];
    return {
        version: PORT_LEARNING_VERSION, runId, capturedAt, schema: view.schema, referenceVersion: view.referenceVersion,
        mode: view.mode, second: view.second, config: structuredClone(view.config), plan: structuredClone(view.plan), vessels, cargo,
        completedVessels: completed.length, openVessels: vessels.length - completed.length,
        medianMinutes, p90Minutes: portSampleQuantile(completed, .9),
        cost: view.cost, costPerCompletion: completionCount ? view.cost / completionCount : null,
        rehandles: view.rehandles, unresolvedBoxes: view.boxes.filter(b => ["open", "reported"].includes(b.issue)).length,
        waitMinutes
    };
}

export function comparePortLearning(a: PortLearningSnapshot, b: PortLearningSnapshot) {
    const blockers: string[] = [];
    if (a.runId === b.runId) blockers.push("两份记录来自同一场次，只能观察过程变化。");
    if (a.second !== b.second) blockers.push("观察终点不同。");
    if (a.schema !== b.schema || a.referenceVersion !== b.referenceVersion) blockers.push("业务或基准版本不同。");
    if (a.mode !== b.mode) blockers.push("教学与实战模式不同。");
    const config = (s: PortLearningSnapshot) => [s.config.seed, s.config.meanGapMinutes, s.config.variability, s.config.largeShare, s.config.disruption];
    if (JSON.stringify(config(a)) !== JSON.stringify(config(b))) blockers.push("船期种子或到港、扰动条件不同。");
    const cohort = (s: PortLearningSnapshot) => s.vessels.map(v => [v.id, v.arrival, v.large, v.boxes]).sort((x, y) => String(x[0]).localeCompare(String(y[0])));
    if (JSON.stringify(cohort(a)) !== JSON.stringify(cohort(b))) blockers.push("实际到港队列或工作量不同。");
    return {
        comparable: blockers.length === 0, blockers,
        equipmentChanged: JSON.stringify(a.plan.equipment) !== JSON.stringify(b.plan.equipment),
        yardsChanged: JSON.stringify(a.plan.yards) !== JSON.stringify(b.plan.yards),
        caution: "条件匹配仍需核对全过程操作；不同指令、处置次序和多项改动会影响差异，不能自动归因为单一措施。"
    };
}

export interface PortRiskEvidence {
    id: string;
    kind: "fault" | "box" | "document" | "operation";
    object: string;
    field?: string;
    at: number;
    summary: string;
    impact: string;
}

export function collectPortRiskEvidence(view: PortView): PortRiskEvidence[] {
    const result: PortRiskEvidence[] = [];
    if (view.failedCrane !== null) result.push({
        id: `fault:${view.failedCrane}`, kind: "fault", object: String(view.failedCrane), at: view.second,
        summary: `岸桥${view.failedCrane + 1}故障；${view.repairPending ? "维修已委托，尚未完成" : "尚未委托维修"}`,
        impact: "查阅该岸桥、对应泊位和在制任务；分开评价维修进度与其他作业连续性。"
    });
    for (const b of view.boxes.filter(b => ["open", "reported"].includes(b.issue)).slice(0, 12)) result.push({
        id: `box:${b.id}`, kind: "box", object: b.id, at: view.second,
        summary: `${b.id} · ${b.batchId} · ${b.location}；${b.issue === "reported" ? "已委托核查，结果尚未完成" : "已发现异常，尚未委托核查"}`,
        impact: "查阅箱级记录、货批与待核查区。该箱异常不能直接解释为全部货物异常，也不能自行宣布整票放行。"
    });
    for (const v of view.vessels) for (const [field, doc] of Object.entries(v.call.docs)) if (doc.status === "correction") result.push({
        id: `document:${v.id}:${field}`, kind: "document", object: v.id, field, at: view.second,
        summary: `${v.id}资料待补正：${doc.reason}`, impact: "核对原始资料、补正与回执状态，并追踪它对进港或离港条件的影响。"
    });
    for (const a of [...view.attempts].reverse().filter(a => ["incorrect", "waiting", "invalid"].includes(a.outcome)).slice(0, 8)) result.push({
        id: `operation:${a.at}:${a.object}:${a.rule}`, kind: "operation", object: a.object, at: a.at,
        summary: a.message, impact: "这条记录只证明当时的判定；查找当时前置条件和后续实际动作，区分流程拒绝与资源等待。"
    });
    return result;
}

export function reviewPortRiskEvidence(evidence: PortRiskEvidence, originalRunId: string, currentRunId: string, view: PortView) {
    if (originalRunId !== currentRunId || view.second < evidence.at) return "当前场次或时点已改变；回到原运行文件核对后续证据。";
    if (evidence.kind === "fault") return view.failedCrane === Number(evidence.object)
        ? `原设备仍标记故障；${view.repairPending ? "维修处理中" : "维修尚未委托"}。`
        : "原设备故障标记已解除；继续核对在制任务、积压和资源安排，不能仅凭此认定全流程恢复。";
    if (evidence.kind === "box") {
        const box = view.boxes.find(b => b.id === evidence.object);
        return !box ? "当前公开记录中没有该箱，不能推断异常已解决。" : box.issue === "resolved"
            ? "该箱核查状态已解决；继续核对货批条件、位置与后续交接。"
            : `该箱核查尚未结束；当前位置${box.location}。`;
    }
    if (evidence.kind === "document") {
        const ship = view.vessels.find(v => v.id === evidence.object);
        const doc = ship?.call.docs[evidence.field as keyof typeof ship.call.docs];
        return doc?.status === "approved" ? "该项回执已办妥；其余业务条件仍按当前实际状态检查。" : "该项资料尚未取得办妥回执。";
    }
    return "对照后续操作、当前对象状态和原始运行报告，说明哪些条件实际改变；原判定不会自动证明已经恢复。";
}

export function portLearningCsv(snapshot: PortLearningSnapshot) {
    const quote = (v: string | number | null) => {
        const raw = String(v ?? "");
        return `"${(typeof v === "string" && /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw).replaceAll('"', '""')}"`;
    };
    const rows: (string | number | null)[][] = [
        ["场次", "观察终点秒", "船舶", "船型", "作业箱量", "到港秒", "驶离口岸秒", "当前已历分钟", "完整周转分钟", "样本状态"],
        ...snapshot.vessels.map(v => [snapshot.runId, snapshot.second, v.id, v.large ? "大型" : "普通", v.boxes, v.arrival, v.departure, v.elapsedMinutes, v.turnaroundMinutes, v.departure === null ? "未完成" : "已完成"])
    ];
    return "\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\r\n");
}
