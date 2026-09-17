import { PORT_NAVIGATION_VERSION } from "./port-navigation.js";
import { applyPortCommand, advancePortSession, createPortSession, portCargoDone, portEntryReady, portHandoverItems, portYardUsage, visiblePortCalls } from "./port-operations-engine.js";
import { PORT_HORIZON, PORT_OPERATIONS_SCHEMA, PORT_ARRIVAL_GENERATOR, cleanPortConfig, cleanPortPlan, defaultPortPlan, type PortConfig, type PortSession, type PortCommand } from "./port-operations-model.js";
/** Reference policy used for cost comparison and tests; never an automatic student control. */
export function servicePortReference(s: PortSession) {
    const calls = Object.values(s.calls).filter(c => c.announced);
    for (const c of calls)
        for (const kind of ["entry", "health", "border", "departure"] as const)
            if (["draft", "correction"].includes(c.docs[kind].status))
                applyPortCommand(s, { kind: "document", callId: c.id, document: kind, value: c.docs[kind].reference });
    const batches = Object.values(s.batches).filter(b => s.calls[b.callId]!.announced);
    for (const b of batches) {
        if (["draft", "correction"].includes(b.document.status))
            applyPortCommand(s, { kind: "batch-document", batchId: b.id, value: b.reference });
        if (!b.targetYard) {
            const ys = s.plan.yards.filter(y => y.use === b.flow || y.use === "mixed");
            const demand = (id: string) => Object.values(s.batches).filter(x => x.targetYard === id).reduce((n, x) => n + x.boxIds.filter(id => { const box = s.boxes[id]!; return x.flow === "import" ? box.deliveredAt === null : box.loadedAt === null; }).length, 0);
            const call = s.calls[b.callId]!, ship = s.schedules.find(v => v.id === b.callId)!;
            const berth = call.berth ?? call.plannedBerth ?? (ship.large ? 1 : 0);
            const from = b.flow === "import" ? [berth ? 62 : -62, -27] : [18, 102];
            const distance = (y: typeof ys[number]) => Math.abs(from[0]! - (-90 + y.col * 36)) + Math.abs(from[1]! - (y.row * 36 + 12));
            const overflow = (y: typeof ys[number]) => Math.max(0, demand(y.id) + b.boxIds.length - y.capacity);
            ys.sort((a, b) => overflow(a) - overflow(b) || distance(a) - distance(b) || a.id.localeCompare(b.id));
            if (ys[0])
                applyPortCommand(s, { kind: "assign-yard", batchId: b.id, yardId: ys[0].id });
        }
    }
    for (const box of Object.values(s.boxes))
        if (box.issue === "open") {
            const y = s.plan.yards.find(y => y.use === "inspection");
            if (y)
                applyPortCommand(s, { kind: "inspect", boxId: box.id, yardId: y.id });
        }
    if (s.failedCrane !== null && !s.repairPending && s.plan.equipment.dispatch.technicians > 0)
        applyPortCommand(s, { kind: "repair" });
    for (const c of calls) {
        if (c.stage === "berthed" && portCargoDone(s, c.id) && c.docs.departure.status === "approved" && !s.channel)
            applyPortCommand(s, { kind: "depart", callId: c.id });
        if (c.stage === "berthed" && !c.working && portEntryReady(c))
            applyPortCommand(s, { kind: "work", callId: c.id, running: true });
    }
    for (const c of calls.filter(c => ["outer", "anchored"].includes(c.stage) && portEntryReady(c)).sort((a, b) => (a.arrivedAt ?? 0) - (b.arrivedAt ?? 0) || a.id.localeCompare(b.id))) {
        if (s.channel)
            break;
        const large = s.schedules.find(v => v.id === c.id)!.large;
        const slots = large ? [1] : [0, 1];
        const berth = slots.find(i => !s.berths[i]);
        if (berth !== undefined)
            applyPortCommand(s, { kind: "move", callId: c.id, target: "berth", slot: berth });
        else if (c.stage === "outer") {
            const anchor = s.anchors.findIndex(v => !v);
            if (anchor >= 0)
                applyPortCommand(s, { kind: "move", callId: c.id, target: "anchor", slot: anchor });
        }
    }
}
export function runPortReference(config: PortConfig, stepSeconds = 120, schema: PortSession["schema"] = PORT_OPERATIONS_SCHEMA) {
    const s = createPortSession("battle", config, defaultPortPlan(), schema);
    applyPortCommand(s, { kind: "start" });
    while (s.second < PORT_HORIZON) {
        servicePortReference(s);
        advancePortSession(s, Math.min(stepSeconds, PORT_HORIZON - s.second));
    }
    applyPortCommand(s, { kind: "handover", entries: portHandoverItems(s).map(({ object, team, next }) => ({ object, team, next })) });
    return s;
}
const referenceCache = new Map<string, {
    cost: number;
    completed: number;
    unitCost: number;
}>();
export function rememberPortReference(config: PortConfig, value: {
    cost: number;
    completed: number;
    unitCost: number;
}, schema: PortSession["schema"] = PORT_OPERATIONS_SCHEMA) { if (!Number.isFinite(value.cost) || !Number.isFinite(value.unitCost) || value.completed <= 0)
    throw new Error("参考成本无效。"); referenceCache.set(JSON.stringify([schema, cleanPortConfig(config)]), value); }
export function portReferenceCost(config: PortConfig, schema: PortSession["schema"] = PORT_OPERATIONS_SCHEMA) { const key = JSON.stringify([schema, cleanPortConfig(config)]); let r = referenceCache.get(key); if (!r) {
    const s = runPortReference(config, 120, schema);
    const completed = Object.values(s.boxes).filter(b => b.loadedAt !== null || b.deliveredAt !== null).length;
    r = { cost: s.cost, completed, unitCost: completed ? s.cost / completed : Infinity };
    if (referenceCache.size > 20)
        referenceCache.delete(referenceCache.keys().next().value!);
    referenceCache.set(key, r);
} return r; }
export function portDeadline(s: PortSession, callId: string, flow: "import" | "export" | "ship") { const c = s.calls[callId]!, v = s.schedules.find(v => v.id === callId)!; return (c.arrivedAt ?? c.eta) + v.referenceService + (flow === "import" ? 6 : 4) * 3600; }
export function portScore(s: PortSession, reference?: {
    unitCost: number;
}) {
    const visible = Object.values(s.batches).filter(b => s.calls[b.callId]!.announced);
    const assessed = s.status === "completed" ? PORT_HORIZON : s.second;
    let dueBoxes = 0, onTime = 0, completed = 0, completedDue = 0, overdue = 0;
    for (const b of visible) {
        const deadline = portDeadline(s, b.callId, b.flow);
        for (const id of b.boxIds) {
            const box = s.boxes[id]!, at = b.flow === "import" ? box.deliveredAt : box.loadedAt;
            if (at !== null)
                completed++;
            if (s.calls[b.callId]!.arrivedAt !== null && deadline <= assessed) {
                dueBoxes++;
                if (at !== null)
                    completedDue++;
                if (at !== null && at <= deadline)
                    onTime++;
                else
                    overdue++;
            }
        }
    }
    const dueCalls = Object.values(s.calls).filter(c => c.arrivedAt !== null && portDeadline(s, c.id, "ship") <= assessed);
    const nodeCount = dueCalls.reduce((n, c) => n + ["admit", "secure", "work", "depart"].filter(k => c.milestones[k as "admit"] !== undefined).length, 0);
    const nodesTotal = dueCalls.length * 4;
    const completion = dueBoxes ? onTime / dueBoxes : 0;
    const cargo = 50 * completion;
    const onTimeDepartures = dueCalls.filter(c => c.milestones.depart !== undefined && c.milestones.depart <= portDeadline(s, c.id, "ship")).length;
    const scoringVersion = s.scoringVersion ?? 1;
    const processCompletion = nodesTotal ? (scoringVersion === 2 ? 15 : 20) * nodeCount / nodesTotal : 0;
    const processTimeliness = scoringVersion === 2 && dueCalls.length ? 5 * onTimeDepartures / dueCalls.length : 0;
    const process = processCompletion + processTimeliness;
    const unitCost = completed ? s.cost / completed : 0;
    const efficiency = dueBoxes && completed && reference && Number.isFinite(reference.unitCost) ? 20 * (completedDue / dueBoxes) * Math.min(1, reference.unitCost / Math.max(.000001, unitCost)) : 0;
    const handoverItems = portHandoverItems(s);
    const verified = handoverItems.filter(i => s.handover.some(h => h.object === i.object && h.fingerprint === i.fingerprint && h.team === i.team && h.next === i.next)).length;
    const handover = s.status === "completed" ? 10 * verified / handoverItems.length : 0;
    const deductions = s.attempts.reduce((n, a) => n + a.deduction, 0);
    const total = Math.round(Math.max(0, cargo + process + efficiency + handover - deductions) * 100) / 100;
    return { total, cargo, process, processCompletion, processTimeliness, onTimeDepartures, dueShips: dueCalls.length, scoringVersion, efficiency, handover, deductions, dueBoxes, onTime, overdue, completed, nodeCount, nodesTotal, unitCost, referenceUnitCost: reference?.unitCost ?? null, referenceReady: !!reference, verifiedHandover: verified, requiredHandover: handoverItems.length, eligible: s.status === "completed" && s.mode === "battle" };
}
export function portReport(s: PortSession, includeReference = true) {
    const reference = includeReference ? portReferenceCost(s.config, s.schema) : undefined;
    const schedules = s.schedules.filter(v => v.eta <= PORT_HORIZON);
    return { score: portScore(s, reference), status: s.status, mode: s.mode, second: s.second, config: s.config, generator: s.generator, statistics: { configuredMeanGap: s.config.meanGapMinutes, referenceMeanService: 240, sampleMeanGap: schedules.length > 1 ? (schedules.at(-1)!.eta - schedules[0]!.eta) / (schedules.length - 1) / 60 : 0, sampleMeanService: schedules.reduce((n, v) => n + v.referenceService, 0) / schedules.length / 60 }, operations: { cost: s.cost, energy: s.energy, distance: s.distance, rehandles: s.rehandles, wait: Object.values(s.calls).reduce((a, c) => { for (const key of Object.keys(a) as (keyof typeof a)[])
                a[key] += c.wait[key]; return a; }, { berth: 0, anchor: 0, channel: 0, documents: 0, dispatch: 0 }), yard: s.plan.yards.map(y => ({ id: y.id, ...portYardUsage(s, y.id) })) }, calls: visiblePortCalls(s), attempts: s.attempts, timeline: s.notices, containerLedger: Object.values(s.boxes).filter(b => s.calls[s.batches[b.batchId]!.callId]!.announced).map(b => ({ id: b.id, batchId: b.batchId, location: b.location, issue: b.issue, history: b.history })), handover: portHandoverItems(s).map(({ fingerprint, ...item }) => item) };
}
export function serializePortSession(s: PortSession, options: {
    review?: boolean;
    suspend?: boolean;
} = {}) {
    const status = options.suspend && ["running", "paused"].includes(s.status) ? s.mode === "battle" ? "interrupted" : "paused" : s.status;
    return JSON.stringify({ schema: s.schema, scoringVersion: s.scoringVersion ?? 1, ...(s.schema === "port-operations/3.1" ? { navigationVersion: PORT_NAVIGATION_VERSION } : {}), generator: PORT_ARRIVAL_GENERATOR, config: cleanPortConfig(s.config), mode: s.mode, initialPlan: cleanPortPlan(s.initialPlan), schedule: s.schedules, commands: s.commands, inputLog: s.inputLog ?? [], traceCoverage: s.traceCoverage ?? "complete", status, ...(options.review ? { review: portReport(s) } : {}) });
}
export function restorePortSession(raw: string, suspend = false): PortSession {
    if (raw.length > 20000000)
        throw new Error("复盘文件过大。");
    const data = JSON.parse(raw);
    if (![PORT_OPERATIONS_SCHEMA, "port-operations/3.0"].includes(data?.schema) || data.generator !== PORT_ARRIVAL_GENERATOR || !["practice", "battle"].includes(data.mode) || !Array.isArray(data.commands) || data.commands.length > 50000)
        throw new Error("港口综合实训复盘版本或指令记录无效。");
    if (data.schema === "port-operations/3.1" && data.navigationVersion !== PORT_NAVIGATION_VERSION) throw new Error("航行规则版本无效。");
    const s = createPortSession(data.mode, cleanPortConfig(data.config), cleanPortPlan(data.initialPlan), data.schema);
    if (data.scoringVersion !== undefined && ![1, 2].includes(data.scoringVersion)) throw new Error("评分版本无效。");
    if (data.scoringVersion === undefined) delete s.scoringVersion; else s.scoringVersion = data.scoringVersion;
    if (JSON.stringify(data.schedule) !== JSON.stringify(s.schedules))
        throw new Error("船期与生成参数不一致，无法确认复盘。");
    let elapsed = 0;
    const inputs = data.inputLog ?? data.commands;
    if (!Array.isArray(inputs) || inputs.length > 50000) throw new Error("操作记录过多。");
    for (const command of inputs as PortCommand[]) {
        if (command.kind === "advance") {
            elapsed += command.seconds;
            if (!Number.isInteger(command.seconds) || command.seconds < 0 || command.seconds > PORT_HORIZON || (!data.inputLog && elapsed > PORT_HORIZON))
                throw new Error("复盘推进时间无效。");
        }
        applyPortCommand(s, command);
    }
    if (["running", "paused"].includes(s.status) && (suspend || data.status === "interrupted" || data.status === "paused")) {
        if (s.mode === "battle")
            applyPortCommand(s, { kind: "interrupt" });
        else if (s.status === "running")
            applyPortCommand(s, { kind: "pause" });
    }
    s.traceCoverage = data.inputLog && data.traceCoverage !== "legacy" ? "complete" : "legacy";
    return s;
}
export function portStorageKey(scope: string, mode: PortSession["mode"], schema: PortSession["schema"] = PORT_OPERATIONS_SCHEMA) { return `edu-port-operations:${scope}:${mode}:${schema}:${PORT_ARRIVAL_GENERATOR}`; }
