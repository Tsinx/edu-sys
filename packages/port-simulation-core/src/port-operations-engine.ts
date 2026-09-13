import { TERMINAL_EQUIPMENT, terminalBudget, validateTerminalSetup } from "./terminal-lab.js";
import { PORT_HORIZON, PORT_SHIFT_SECONDS, PORT_OPERATIONS_SCHEMA, PORT_ARRIVAL_GENERATOR, PORT_DOC_NAMES, cleanPortConfig, cleanPortPlan, defaultPortConfig, defaultPortPlan, generatePortSchedule, portRng, portLocationName, type PortBatch, type PortBox, type PortCall, type PortCommand, type PortConfig, type PortDocument, type PortEvent, type PortJob, type PortMode, type PortOrder, type PortPlan, type PortResult, type PortSession } from "./port-operations-model.js";
const copy = <T>(v: T): T => structuredClone(v);
const doc = (reference: string, value = reference): PortDocument => ({ reference, value, status: "draft", reason: "航前基础资料已接收，等待核对与提交。" });
const priority: Record<PortEvent["kind"], number> = { announce: 0, eta: 1, arrive: 2, exports: 3, doc: 4, "batch-doc": 5, move: 6, moored: 7, unmoored: 8, inspection: 9, shift: 10, wind: 11, fault: 12, repair: 13 };
function event(s: PortSession, e: PortEvent) { s.events.push(e); s.events.sort((a, b) => a.at - b.at || priority[a.kind] - priority[b.kind] || a.id.localeCompare(b.id)); }
function notice(s: PortSession, kind: string, object: string, text: string, suffix = "") { const id = `${kind}:${object}:${suffix || s.second}`; if (!s.notices.some(n => n.id === id))
    s.notices.push({ id, at: s.second, kind, object, text }); }
export function createPortSession(mode: PortMode = "practice", config = defaultPortConfig(), plan = defaultPortPlan()): PortSession {
    if (!["practice", "battle"].includes(mode))
        throw new Error("未知训练模式。");
    const clean = cleanPortConfig(config);
    const initialPlan = cleanPortPlan(plan);
    const s: PortSession = { schema: PORT_OPERATIONS_SCHEMA, generator: PORT_ARRIVAL_GENERATOR, config: clean, mode, status: "ready", second: 0, plan: copy(initialPlan), initialPlan, schedules: generatePortSchedule(clean), calls: {}, batches: {}, boxes: {}, berths: [null, null], anchors: [null, null, null, null], channel: null, jobs: [], events: [], notices: [], attempts: [], commands: [], taught: [], pauseReason: "", cost: 0, energy: 0, effort: { personSeconds: 0, energySeconds: 0, capitalSeconds: 0 }, distance: 0, rehandles: 0, wind: 1, failedCrane: null, repairPending: false, jobSequence: 0, handover: [] };
    const paperwork = portRng(config.seed ^ 0x27d4eb2f);
    let boxSequence = 0;
    for (const v of s.schedules) {
        s.calls[v.id] = { id: v.id, announced: false, eta: v.eta, stage: "approach", arrivedAt: null, berthArrivedAt: null, berth: null, anchor: null, plannedBerth: null, plannedAt: null, move: null, working: false, docs: { entry: doc(v.voyage), health: doc(String(v.crew)), border: doc(String(v.crew), paperwork() < .2 ? String(v.crew - 1) : String(v.crew)), departure: doc(v.voyage) }, milestones: {}, wait: { berth: 0, anchor: 0, channel: 0, documents: 0, dispatch: 0 } };
        event(s, { id: `announce:${v.id}`, at: v.announceAt, kind: "announce", object: v.id });
        v.updates.forEach((u, i) => event(s, { id: `eta:${v.id}:${i}`, at: u.at, kind: "eta", object: v.id, value: u.eta }));
        event(s, { id: `arrive:${v.id}`, at: v.ata, kind: "arrive", object: v.id });
        for (let i = 0; i < 4; i++) {
            const flow = i < 2 ? "import" : "export";
            const total = flow === "import" ? v.unload : v.load;
            const count = i % 2 === 0 ? Math.ceil(total / 2) : Math.floor(total / 2);
            const id = `${v.id}-${flow === "import" ? "I" : "E"}${i % 2 + 1}`;
            const bill = `BL-${id}`;
            const reference = `${bill}/${count}`;
            const b: PortBatch = { id, callId: v.id, name: `${flow === "import" ? "进口" : "出口"}批次 ${id}`, flow, bill, reference, document: doc(reference, paperwork() < .13 ? `${bill}/${count + 1}` : reference), customs: false, carrier: true, vgm: flow === "export", targetYard: null, boxIds: [], availableAt: flow === "export" ? Math.max(0, v.eta - 7200) : v.ata };
            s.batches[id] = b;
            if (flow === "export")
                event(s, { id: `exports:${id}`, at: b.availableAt, kind: "exports", object: id });
            for (let j = 0; j < count; j++) {
                const boxId = `C-${String(++boxSequence).padStart(5, "0")}`;
                b.boxIds.push(boxId);
                s.boxes[boxId] = { id: boxId, batchId: id, location: flow === "import" ? `ship:${v.id}` : "external", available: flow === "import", queuedAt: b.availableAt, unloadedAt: null, loadedAt: null, deliveredAt: null, issueExpected: flow === "import" && i === 0 && j === 0 && Number(v.id.slice(1)) % 3 === 0, issue: "none", inspectionYard: null, reviewReady: false, history: [] };
            }
        }
    }
    for (let at = PORT_SHIFT_SECONDS; at < PORT_HORIZON; at += PORT_SHIFT_SECONDS)
        event(s, { id: `shift:${at}`, at, kind: "shift", object: "handover" });
    if (config.disruption === "wind") {
        event(s, { id: "wind:start", at: 12 * 3600, kind: "wind", object: "weather", value: .55 });
        event(s, { id: "wind:end", at: 13.5 * 3600, kind: "wind", object: "weather", value: 1 });
    }
    if (config.disruption === "outage")
        event(s, { id: "fault:0", at: 18 * 3600, kind: "fault", object: "equipment", value: 0 });
    settle(s);
    return s;
}
export function configurePortSession(s: PortSession, config: PortConfig, plan: PortPlan, mode: PortMode = s.mode) { if (s.status !== "ready")
    throw new Error("开始场次后不能修改船期参数、建设和模式。"); return createPortSession(mode, config, plan); }
export function visiblePortCalls(s: PortSession) { return s.schedules.filter(v => s.calls[v.id]!.announced).map(v => { const c = s.calls[v.id]!; return { id: v.id, name: v.name, large: v.large, firstEta: v.eta, currentEta: c.eta, actualArrival: c.arrivedAt, referenceService: v.referenceService, unload: v.unload, load: v.load, crew: v.crew, voyage: v.voyage, call: c }; }); }
export function portEntryReady(c: PortCall) { return ["entry", "health", "border"].every(k => c.docs[k as "entry"].status === "approved"); }
export function portCargoDone(s: PortSession, callId: string) { return Object.values(s.batches).filter(b => b.callId === callId).every(b => b.boxIds.every(id => b.flow === "import" ? s.boxes[id]!.unloadedAt !== null : s.boxes[id]!.loadedAt !== null)); }
export function portYardUsage(s: PortSession, id: string) {
    return yardUsageMap(s).get(id) ?? { occupied: 0, reserved: 0, available: 0 };
}
function yardUsageMap(s: PortSession) { const map = new Map(s.plan.yards.map(y => [y.id, { occupied: 0, reserved: 0, available: y.capacity }])); for (const b of Object.values(s.boxes)) {
    const [kind, id] = b.location.split(":");
    if (["yard", "handoff", "pickup"].includes(kind!)) {
        const v = map.get(id!);
        if (v) {
            v.occupied++;
            v.available--;
        }
    }
} for (const j of s.jobs)
    if (j.to.startsWith("handoff:")) {
        const id = j.to.slice(8);
        if (![`yard:${id}`, `handoff:${id}`, `pickup:${id}`].includes(j.from)) {
            const v = map.get(id);
            if (v) {
                v.reserved++;
                v.available--;
            }
        }
    } return map; }
export function portPoint(s: PortSession, location: string): [
    number,
    number
] {
    const [kind, id] = location.split(":");
    if (["yard", "handoff", "pickup"].includes(kind!)) {
        const y = s.plan.yards.find(y => y.id === id);
        return y ? [-90 + y.col * 36, y.row * 36 + 12] : [0, 40];
    }
    if (["ship", "quay", "loading"].includes(kind!)) {
        const c = s.calls[id!];
        return [c?.berth === 1 ? 62 : -62, kind === "ship" ? -79 : -27];
    }
    return [18, 102];
}
export function portTransportDistance(s: PortSession, from: string, to: string) { const a = portPoint(s, from), b = portPoint(s, to); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + 30; }
function resources(s: PortSession) {
    const e = s.plan.equipment, d = e.dispatch;
    const assigned = d.berthCranes[0] + d.berthCranes[1];
    return { quay: Math.min(e.cranes, d.craneOperators, assigned), truck: Math.min(e.vehicles, d.drivers * (e.vehicle === "agv" ? 4 : 1), e.vehicle === "tractor" ? 16 : e.facilities.filter(f => f.kind === "charger").length * 8), yard: Math.min(e.yardMachines, d.yardOperators), gate: Math.min(e.gates, d.gateClerks * (e.gateSystem === "smart" ? 2 : 1)) };
}
export function portActiveResources(s: PortSession) { return resources(s); }
function quayBerth(s: PortSession, resource: number) { return resource < s.plan.equipment.dispatch.berthCranes[0] ? 0 : 1; }
function jobDuration(s: PortSession, j: Pick<PortJob, "kind" | "from" | "to">) {
    const e = s.plan.equipment;
    if (j.kind === "quay")
        return 3600 / (TERMINAL_EQUIPMENT.crane[e.crane].rate * .75 * s.wind);
    if (j.kind === "truck")
        return (60 + portTransportDistance(s, j.from, j.to) * 1.5) * 8 / TERMINAL_EQUIPMENT.vehicle[e.vehicle].rate;
    if (j.kind === "yard")
        return 3600 / TERMINAL_EQUIPMENT.yardMachine[e.yardMachine].rate;
    return 3600 / TERMINAL_EQUIPMENT.gateSystem[e.gateSystem].rate;
}
function rateJobs(s: PortSession) {
    const available = resources(s);
    const occupied = new Set<number>();
    for (const j of s.jobs) {
        j.remaining = Math.max(0, j.remaining - (s.second - j.updatedAt) * j.rate);
        j.updatedAt = s.second;
        if (j.kind === "quay") {
            const berth = s.calls[s.batches[s.boxes[j.boxId]!.batchId]!.callId]!.berth;
            const usable = (r: number) => r >= 0 && r < available.quay && r !== s.failedCrane && !occupied.has(r) && quayBerth(s, r) === berth;
            if (!usable(j.resource))
                j.resource = Array.from({ length: available.quay }, (_, i) => i).find(usable) ?? -1;
            if (j.resource >= 0)
                occupied.add(j.resource);
        }
        const active = j.resource >= 0 && j.resource < available[j.kind] && !(j.kind === "quay" && j.resource === s.failedCrane);
        j.rate = active ? 1 / jobDuration(s, j) : 0;
        j.end = j.remaining < 1e-8 ? s.second : j.rate ? s.second + Math.max(1, Math.ceil(j.remaining / j.rate - 1e-8)) : null;
    }
}
function importReady(b: PortBatch) { return b.customs && b.carrier; }
function exportReady(b: PortBatch) { return b.customs && b.carrier && b.vgm; }
function targetYard(s: PortSession, box: PortBox, b: PortBatch) { return box.issue !== "none" && box.issue !== "resolved" ? box.inspectionYard : b.targetYard; }
interface Candidate {
    box: PortBox;
    kind: PortJob["kind"];
    to: string;
    purpose: PortJob["purpose"];
    berth?: number;
}
function bufferId(s: PortSession, location: string) { const [kind, id] = location.split(":"); return `${kind}:berth-${s.calls[id!]?.berth ?? id}`; }
function bufferUsage(s: PortSession) { const counts = new Map<string, number>(); for (const box of Object.values(s.boxes))
    if (box.location.startsWith("quay:") || box.location.startsWith("loading:")) {
        const id = bufferId(s, box.location);
        counts.set(id, (counts.get(id) ?? 0) + 1);
    } for (const j of s.jobs)
    if (j.to.startsWith("quay:") || j.to.startsWith("loading:")) {
        const id = bufferId(s, j.to);
        counts.set(id, (counts.get(id) ?? 0) + 1);
    } return counts; }
function candidates(s: PortSession): Candidate[] {
    const busy = new Set(s.jobs.map(j => j.boxId));
    const out: Candidate[] = [];
    const usage = yardUsageMap(s);
    const space = (id: string) => (usage.get(id)?.available ?? 0) > 0;
    const quayCounts = bufferUsage(s);
    const count = (id: string, kind: string) => quayCounts.get(bufferId(s, `${kind}:${id}`)) ?? 0;
    for (const box of Object.values(s.boxes)) {
        if (busy.has(box.id) || !box.available || box.deliveredAt !== null || box.loadedAt !== null)
            continue;
        const b = s.batches[box.batchId]!, c = s.calls[b.callId]!;
        if (!c.announced)
            continue;
        const loc = box.location, yard = targetYard(s, box, b), ready = box.issue === "none" || box.issue === "resolved";
        if (b.flow === "import" && loc === `ship:${c.id}` && box.unloadedAt === null && c.stage === "berthed" && c.working && portEntryReady(c) && count(c.id, "quay") < 60)
            out.push({ box, kind: "quay", to: `quay:${c.id}`, purpose: "flow", berth: c.berth! });
        else if (loc.startsWith("quay:") && yard && space(yard))
            out.push({ box, kind: "truck", to: `handoff:${yard}`, purpose: "flow" });
        else if (loc === "external" && b.flow === "export" && yard && s.second >= b.availableAt && space(yard))
            out.push({ box, kind: "gate", to: "gate:in", purpose: "flow" });
        else if (loc === "gate:in" && yard && space(yard))
            out.push({ box, kind: "truck", to: `handoff:${yard}`, purpose: "flow" });
        else if (loc.startsWith("handoff:"))
            out.push({ box, kind: "yard", to: loc.replace("handoff:", "yard:"), purpose: "flow" });
        else if (loc.startsWith("yard:")) {
            if (yard && loc !== `yard:${yard}` && space(yard))
                out.push({ box, kind: "yard", to: loc.replace("yard:", "pickup:"), purpose: "relocate" });
            else if (ready && (b.flow === "import" && importReady(b) || b.flow === "export" && exportReady(b) && c.stage === "berthed" && c.working && count(c.id, "loading") < 60))
                out.push({ box, kind: "yard", to: loc.replace("yard:", "pickup:"), purpose: "flow" });
        }
        else if (loc.startsWith("pickup:")) {
            const oldYard = loc.slice(7);
            if (yard && yard !== oldYard && space(yard))
                out.push({ box, kind: "truck", to: `handoff:${yard}`, purpose: "relocate" });
            else if (ready && b.flow === "import" && importReady(b))
                out.push({ box, kind: "truck", to: "gate:out", purpose: "flow" });
            else if (ready && b.flow === "export" && exportReady(b) && c.stage === "berthed" && c.working && count(c.id, "loading") < 60)
                out.push({ box, kind: "truck", to: `loading:${c.id}`, purpose: "flow" });
        }
        else if (loc === "gate:out" && ready && importReady(b))
            out.push({ box, kind: "gate", to: "delivered", purpose: "flow" });
        else if (loc === `loading:${c.id}` && b.flow === "export" && exportReady(b) && c.stage === "berthed" && c.working && portEntryReady(c))
            out.push({ box, kind: "quay", to: `ship:${c.id}`, purpose: "flow", berth: c.berth! });
    }
    return out.sort((a, b) => a.box.queuedAt - b.box.queuedAt || a.box.id.localeCompare(b.box.id));
}
function scheduleJobs(s: PortSession) {
    const available = resources(s);
    const used = new Set(s.jobs.map(j => j.boxId));
    const options = candidates(s);
    const usage = yardUsageMap(s);
    const queues = bufferUsage(s);
    for (const kind of ["quay", "truck", "yard", "gate"] as const)
        for (let r = 0; r < available[kind]; r++) {
            if (s.jobs.some(j => j.kind === kind && j.resource === r) || kind === "quay" && r === s.failedCrane)
                continue;
            const next = options.find(n => n.kind === kind && !used.has(n.box.id) && (kind !== "quay" || n.berth === quayBerth(s, r) && (!s.schedules.find(v => v.id === s.batches[n.box.batchId]!.callId)!.large || TERMINAL_EQUIPMENT.crane[s.plan.equipment.crane].reach >= 24)) && (!n.to.startsWith("handoff:") || (usage.get(n.to.slice(8))?.available ?? 0) > 0) && (!(n.to.startsWith("quay:") || n.to.startsWith("loading:")) || (queues.get(bufferId(s, n.to)) ?? 0) < 60));
            if (!next)
                continue;
            used.add(next.box.id);
            if (next.to.startsWith("handoff:"))
                usage.get(next.to.slice(8))!.available--;
            if (next.to.startsWith("quay:") || next.to.startsWith("loading:")) {
                const id = bufferId(s, next.to);
                queues.set(id, (queues.get(id) ?? 0) + 1);
            }
            const j: PortJob = { id: ++s.jobSequence, boxId: next.box.id, kind, resource: r, from: next.box.location, to: next.to, remaining: 1, rate: 0, updatedAt: s.second, start: s.second, end: null, purpose: next.purpose };
            j.rate = 1 / jobDuration(s, j);
            j.end = s.second + Math.ceil(1 / j.rate);
            s.jobs.push(j);
        }
}
function finishJob(s: PortSession, j: PortJob) {
    const box = s.boxes[j.boxId]!, b = s.batches[box.batchId]!, c = s.calls[b.callId]!;
    box.location = j.to;
    box.queuedAt = s.second;
    box.history.push({ at: s.second, action: j.purpose === "relocate" ? "移箱交接" : ({ quay: "船岸交接", truck: "运输交接", yard: "堆场交接", gate: "闸口交接" })[j.kind], from: j.from, to: j.to, resource: `${j.kind}-${j.resource + 1}` });
    if (j.kind === "truck")
        s.distance += portTransportDistance(s, j.from, j.to);
    if (j.kind === "yard" && j.purpose === "relocate")
        s.rehandles++;
    if (b.flow === "import" && j.kind === "quay") {
        box.unloadedAt = s.second;
        if (!c.milestones.work)
            c.milestones.work = s.second;
        if (box.issueExpected) {
            box.issue = "open";
            notice(s, "exception", box.id, `${box.id} 封志与交接资料不一致，请核查该箱。`);
        }
    }
    if (b.flow === "export" && j.kind === "quay") {
        box.loadedAt = s.second;
        if (!c.milestones.work)
            c.milestones.work = s.second;
    }
    if (j.to === "delivered")
        box.deliveredAt = s.second;
    resolveInspection(s, box);
    if (portCargoDone(s, c.id) && !s.notices.some(n => n.id === `cargo-done:${c.id}`)) {
        s.notices.push({ id: `cargo-done:${c.id}`, at: s.second, kind: "departure", object: c.id, text: `${c.id} 本港装卸完成，可检查出口岸准备与离泊安排。` });
    }
}
function resolveInspection(s: PortSession, box: PortBox) { if (box.issue === "reported" && box.reviewReady && box.location === `yard:${box.inspectionYard}`) {
    box.issue = "resolved";
    box.history.push({ at: s.second, action: "核查结果已返回，异常解除", from: box.location, to: box.location, resource: "单证核查班组" });
    notice(s, "inspection-complete", box.id, `${box.id} 核查完成，可按原批次接续作业。`);
} }
function handle(s: PortSession, e: PortEvent) {
    const c = s.calls[e.object];
    if (e.kind === "announce" && c) {
        c.announced = true;
        notice(s, "forecast", c.id, `${c.id} 到港预报已公布，未来六小时有新任务。`);
    }
    else if (e.kind === "eta" && c) {
        c.eta = Number(e.value);
        if (c.announced)
            notice(s, "eta", c.id, `${c.id} 的预计到达时间已更新。`, e.id);
    }
    else if (e.kind === "arrive" && c) {
        c.stage = "outer";
        c.arrivedAt = s.second;
        notice(s, "arrival", c.id, `${c.id} 已到达港外候泊区。`);
    }
    else if (e.kind === "exports") {
        const b = s.batches[e.object]!;
        for (const id of b.boxIds)
            s.boxes[id]!.available = true;
        notice(s, "cargo-arrival", b.id, `${b.name} 已到陆侧，等待集港安排。`);
    }
    else if (e.kind === "doc" && c) {
        const d = c.docs[e.value as keyof typeof c.docs];
        d.returnedAt = s.second;
        d.status = d.value === d.reference ? "approved" : "correction";
        d.reason = d.status === "approved" ? "适用材料已核对，办理结果已返回。" : "申报与航前资料不一致，请核对后补正。";
        notice(s, "document-result", c.id, `${PORT_DOC_NAMES[e.value as keyof typeof PORT_DOC_NAMES]}：${d.reason}`, e.id);
    }
    else if (e.kind === "batch-doc") {
        const b = s.batches[e.object]!;
        b.document.returnedAt = s.second;
        b.document.status = b.document.value === b.reference ? "approved" : "correction";
        b.document.reason = b.document.status === "approved" ? "监管与交付条件已核对。" : "提单与箱数关联不一致，等待补正。";
        b.customs = b.document.status === "approved";
        notice(s, "batch-result", b.id, `${b.name}：${b.document.reason}`, e.id);
    }
    else if (e.kind === "move" && c && c.move) {
        const move = c.move;
        s.channel = null;
        c.move = null;
        if (move.to.startsWith("anchor:")) {
            c.stage = "anchored";
            notice(s, "anchored", c.id, `${c.id} 已进入港内候泊锚位，航道释放。`);
        }
        else if (move.to.startsWith("berth:")) {
            c.stage = "mooring";
            c.berthArrivedAt = s.second;
            event(s, { id: `moored:${c.id}`, at: s.second + 900, kind: "moored", object: c.id });
        }
        else {
            c.stage = "departed";
            c.milestones.depart = s.second;
            notice(s, "departed", c.id, `${c.id} 已驶离口岸。`);
        }
    }
    else if (e.kind === "moored" && c) {
        c.stage = "berthed";
        c.milestones.secure = s.second;
        notice(s, "berth-ready", c.id, `${c.id} 系泊完成，船岸作业面已建立。`);
    }
    else if (e.kind === "unmoored" && c) {
        if (c.berth !== null)
            s.berths[c.berth] = null;
        c.stage = "channel";
        c.move = { from: `berth:${c.berth}`, to: "sea", start: s.second, end: s.second + 1200 };
        event(s, { id: `exit:${c.id}`, at: s.second + 1200, kind: "move", object: c.id });
        notice(s, "berth-released", c.id, `${c.id} 已离开泊位，泊位释放；出港航道仍在使用。`);
    }
    else if (e.kind === "inspection") {
        const box = s.boxes[e.object]!;
        box.reviewReady = true;
        resolveInspection(s, box);
    }
    else if (e.kind === "shift")
        notice(s, "shift", "handover", `第 ${Math.floor(s.second / PORT_SHIFT_SECONDS) + 1} 班接班，库存、手续和作业任务继续。`, e.id);
    else if (e.kind === "wind") {
        s.wind = Number(e.value);
        notice(s, "weather", "equipment", s.wind < 1 ? "大风作业窗口：岸桥效率降至 55%。" : "风况恢复，岸桥限速解除。");
        rateJobs(s);
    }
    else if (e.kind === "fault") {
        s.failedCrane = Number(e.value);
        notice(s, "fault", "equipment", "一台岸桥故障，等待维修班组。");
        rateJobs(s);
    }
    else if (e.kind === "repair") {
        s.failedCrane = null;
        s.repairPending = false;
        notice(s, "repair", "equipment", "岸桥修复完成。");
        rateJobs(s);
    }
}
function teach(s: PortSession) {
    if (s.mode !== "practice" || s.status !== "running")
        return;
    const calls = Object.values(s.calls).filter(c => c.announced);
    const tests: [
        string,
        boolean,
        string
    ][] = [
        ["documents", calls.some(c => c.docs.entry.status === "draft"), "查看船舶档案中的航前资料，再办理适用手续。"],
        ["arrival", calls.some(c => c.stage === "outer" && portEntryReady(c)), "船舶已具备进港条件。检查泊位或候泊锚位，再安排进港。"],
        ["work", calls.some(c => c.stage === "berthed" && !c.working && portEntryReady(c)), "系泊完成。可配置岸桥班组并组织装卸。"],
        ["yard", Object.values(s.batches).some(b => s.calls[b.callId]!.announced && b.targetYard === null), "为货批选择合适堆场。系统会逐箱记录实际作业。"],
        ["exception", Object.values(s.boxes).some(b => b.issue === "open"), "现场发现箱级异常，请查看交接记录并安排核查。"],
        ["departure", calls.some(c => c.stage === "berthed" && portCargoDone(s, c.id)), "本港装卸完成，可准备离泊。进口箱的后续提离继续进行。"]
    ];
    for (const [id, ready, message] of tests)
        if (ready && !s.taught.includes(id)) {
            s.taught.push(id);
            s.status = "paused";
            s.pauseReason = message;
            break;
        }
}
function settle(s: PortSession) {
    while (s.events.length && s.events[0]!.at <= s.second) {
        const e = s.events.shift()!;
        handle(s, e);
    }
    const done = s.jobs.filter(j => j.end !== null && j.end <= s.second);
    s.jobs = s.jobs.filter(j => !done.includes(j));
    for (const j of done.sort((a, b) => a.id - b.id))
        finishJob(s, j);
    if (s.second >= PORT_HORIZON) {
        s.status = "completed";
        s.pauseReason = "48 小时实战结束，请核对交班记录。";
        return;
    }
    scheduleJobs(s);
    teach(s);
}
function accrue(s: PortSession, delta: number) {
    const e = s.plan.equipment, d = e.dispatch;
    const personnel = d.craneOperators + d.drivers + d.yardOperators + d.gateClerks + d.technicians;
    const power = s.jobs.reduce((sum, j) => sum + (j.rate > 0 ? ({ quay: TERMINAL_EQUIPMENT.crane[e.crane].energy, truck: TERMINAL_EQUIPMENT.vehicle[e.vehicle].energy, yard: TERMINAL_EQUIPMENT.yardMachine[e.yardMachine].energy, gate: TERMINAL_EQUIPMENT.gateSystem[e.gateSystem].energy })[j.kind] : 0), 0);
    // Integer exposure integrals make replay independent of browser tick partitioning.
    s.effort.personSeconds += personnel * delta;
    s.effort.energySeconds += power * delta;
    s.effort.capitalSeconds += terminalBudget(e) * delta;
    s.energy = s.effort.energySeconds / 3600;
    s.cost = s.effort.personSeconds * 2.1 / 3600 + s.energy * .015 + s.effort.capitalSeconds / 172800;
    for (const c of Object.values(s.calls)) {
        if (!["outer", "anchored", "berthed"].includes(c.stage))
            continue;
        let key: keyof PortCall["wait"] = "dispatch";
        if (!portEntryReady(c))
            key = "documents";
        else if (c.stage !== "berthed") {
            const v = s.schedules.find(v => v.id === c.id)!;
            if ((v.large ? [1] : [0, 1]).every(i => s.berths[i] !== null))
                key = c.stage === "anchored" ? "anchor" : "berth";
            else if (s.channel)
                key = "channel";
        }
        else if (c.working && s.jobs.some(j => j.kind === "quay" && s.batches[s.boxes[j.boxId]!.batchId]!.callId === c.id))
            continue;
        c.wait[key] += delta;
    }
}
function log(s: PortSession, command: PortCommand) { const last = s.commands.at(-1); if (command.kind === "advance" && last?.kind === "advance")
    last.seconds += command.seconds;
else
    s.commands.push(copy(command)); }
export function advancePortSession(s: PortSession, seconds: number, record = true) {
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > PORT_HORIZON)
        throw new Error("推进量须为 0–172,800 整数秒。");
    if (s.status !== "running" || !seconds)
        return s;
    const start = s.second, target = Math.min(PORT_HORIZON, s.second + seconds);
    settle(s);
    while (s.second < target && s.status === "running") {
        const next = Math.min(target, s.events[0]?.at ?? Infinity, ...s.jobs.map(j => j.end ?? Infinity));
        if (next <= s.second)
            throw new Error("事件时钟未前进。");
        accrue(s, next - s.second);
        s.second = next;
        settle(s);
    }
    if (record)
        log(s, { kind: "advance", seconds: s.second - start });
    return s;
}
const result = (outcome: PortResult["outcome"], rule: string, message: string): PortResult => ({ outcome, rule, message, deduction: 0 });
function objectOf(o: PortOrder) { return "callId" in o ? o.callId : "batchId" in o ? o.batchId : "boxId" in o ? o.boxId : o.kind; }
const allowed: Record<PortOrder["kind"], string[]> = { document: ["kind", "callId", "document", "value"], "batch-document": ["kind", "batchId", "value"], "plan-berth": ["kind", "callId", "berth", "at"], move: ["kind", "callId", "target", "slot"], work: ["kind", "callId", "running"], depart: ["kind", "callId"], "assign-yard": ["kind", "batchId", "yardId"], "yard-use": ["kind", "yardId", "use"], inspect: ["kind", "boxId", "yardId"], dispatch: ["kind", "dispatch"], repair: ["kind"], handover: ["kind", "entries"] };
function cleanOrder(raw: PortOrder): PortOrder {
    if (!raw || !allowed[raw.kind])
        throw new Error("未知业务指令。");
    const v = Object.fromEntries(allowed[raw.kind].map(k => [k, (raw as unknown as Record<string, unknown>)[k]])) as unknown as PortOrder;
    if (v.kind === "dispatch") {
        const d = v.dispatch;
        v.dispatch = { berthCranes: [d.berthCranes[0], d.berthCranes[1]], craneOperators: d.craneOperators, drivers: d.drivers, yardOperators: d.yardOperators, gateClerks: d.gateClerks, technicians: d.technicians, priority: d.priority };
    }
    if (v.kind === "handover") {
        if (!Array.isArray(v.entries) || v.entries.length > 500)
            throw new Error("交班记录无效。");
        v.entries = v.entries.map(e => ({ object: String(e.object).slice(0, 80), team: String(e.team).slice(0, 40), next: String(e.next).slice(0, 100) }));
    }
    return v;
}
export function portHandoverItems(s: PortSession) {
    const items: {
        object: string;
        label: string;
        fingerprint: string;
        next: string;
        team: string;
    }[] = [{ object: "inventory", label: "核对库存与完成数量", fingerprint: JSON.stringify(Object.values(s.boxes).filter(b => s.calls[s.batches[b.batchId]!.callId]!.announced && b.available).map(b => [b.id, b.location, b.loadedAt, b.deliveredAt])), next: "核对库存", team: "下一班调度" }];
    for (const c of Object.values(s.calls).filter(c => c.announced && c.stage !== "departed"))
        items.push({ object: c.id, label: `${c.id} 船舶与手续`, fingerprint: JSON.stringify([c.stage, c.docs, c.plannedBerth]), next: c.stage === "approach" ? "跟踪到港" : c.stage === "outer" || c.stage === "anchored" ? "接续进港" : "接续作业与离港", team: "船舶协调" });
    for (const b of Object.values(s.batches).filter(b => s.calls[b.callId]!.announced && b.boxIds.some(id => b.flow === "import" ? s.boxes[id]!.deliveredAt === null : s.boxes[id]!.loadedAt === null)))
        items.push({ object: b.id, label: b.name, fingerprint: JSON.stringify([b.targetYard, b.document.status, b.boxIds.map(id => [s.boxes[id]!.location, s.boxes[id]!.issue])]), next: b.document.status !== "approved" ? "跟踪单证" : b.targetYard === null ? "安排堆场" : "接续货物交接", team: "货物协调" });
    for (const box of Object.values(s.boxes).filter(b => ["open", "reported"].includes(b.issue)))
        items.push({ object: box.id, label: `${box.id} 封志核查`, fingerprint: JSON.stringify([box.issue, box.location, box.inspectionYard, box.reviewReady]), next: "接续异常核查", team: "单证核查班组" });
    if (s.failedCrane !== null)
        items.push({ object: "equipment", label: "故障岸桥", fingerprint: String(s.failedCrane), next: "接续维修", team: "维修班组" });
    return items;
}
function execute(s: PortSession, o: PortOrder): PortResult {
    const c = "callId" in o ? s.calls[o.callId] : undefined, b = "batchId" in o ? s.batches[o.batchId] : undefined;
    if ("callId" in o && (!c || !c.announced) || "batchId" in o && (!b || !s.calls[b.callId]!.announced))
        return result("stale", "object", "对象尚未公布或已失效。");
    if (o.kind === "document") {
        if (!["entry", "health", "border", "departure"].includes(o.document) || typeof o.value !== "string" || !o.value.trim() || o.value.length > 80)
            return result("invalid", "form", "请填写有效的资料核对值。");
        const d = c!.docs[o.document];
        if (["approved", "submitted"].includes(d.status))
            return result("stale", "document-repeat", "该手续已提交或已办妥。");
        d.value = o.value.trim();
        d.status = "submitted";
        d.submittedAt = s.second;
        d.reason = "已受理，等待机构反馈。";
        event(s, { id: `doc:${c!.id}:${o.document}:${s.second}`, at: s.second + 600, kind: "doc", object: c!.id, value: o.document });
        return result("applied", "document-submitted", d.reason);
    }
    if (o.kind === "batch-document") {
        if (typeof o.value !== "string" || !o.value.trim() || o.value.length > 100)
            return result("invalid", "form", "请填写提单／箱数关联值。");
        if (["approved", "submitted"].includes(b!.document.status))
            return result("stale", "document-repeat", "该批次已提交或已具备条件。");
        b!.document.value = o.value.trim();
        b!.document.status = "submitted";
        b!.document.submittedAt = s.second;
        event(s, { id: `batch-doc:${b!.id}:${s.second}`, at: s.second + 900, kind: "batch-doc", object: b!.id });
        return result("applied", "batch-submitted", "批次资料已提交核验；实际箱位继续独立记录。");
    }
    if (o.kind === "plan-berth") {
        if (![0, 1].includes(o.berth) || !Number.isInteger(o.at) || o.at < s.second || o.at > PORT_HORIZON + 21600)
            return result("invalid", "plan-time", "请选择有效泊位和未来时段。");
        if (s.schedules.find(v => v.id === c!.id)!.large && o.berth === 0)
            return result("waiting", "compatibility", "大型船需使用 B 泊位，可调整计划。");
        if (!["approach", "outer", "anchored"].includes(c!.stage))
            return result("stale", "plan-stage", "船舶已在执行靠泊或已离港。");
        c!.plannedBerth = o.berth;
        c!.plannedAt = o.at;
        return result("applied", "planned", "预约已记录；实际执行时再检查资源并预留位置。");
    }
    if (o.kind === "move") {
        if (!["berth", "anchor"].includes(o.target) || !Number.isInteger(o.slot) || o.slot < 0 || o.slot >= (o.target === "berth" ? 2 : 4))
            return result("invalid", "destination", "请选择有效目的位置。");
        if (c!.stage === "approach")
            return result("incorrect", "arrival-required", "船舶尚未实际到达，不能执行进港指令。");
        if (!["outer", "anchored"].includes(c!.stage))
            return result("stale", "move-stage", "该船已有移动任务或已靠泊。");
        if (!portEntryReady(c!))
            return result("incorrect", "entry-clearance", "适用进口岸手续尚未办妥，请查看资料与回执。");
        if (o.target === "anchor" && c!.stage === "anchored")
            return result("stale", "anchor-repeat", "该船已在港内候泊，可安排移泊。");
        if (o.target === "berth" && s.schedules.find(v => v.id === c!.id)!.large && o.slot === 0)
            return result("waiting", "compatibility", "A 泊位不适配该船，检查 B 泊位或安排候泊。");
        if (s.channel)
            return result("waiting", "channel-busy", `航道由 ${s.channel} 使用，请继续运行等待释放。`);
        const positions = o.target === "berth" ? s.berths : s.anchors;
        if (positions[o.slot])
            return result("waiting", "destination-busy", "目的位置已占用或预留，可选择其他位置或继续等待。");
        const from = c!.stage === "anchored" ? `anchor:${c!.anchor}` : "outer";
        positions[o.slot] = c!.id;
        s.channel = c!.id;
        if (c!.anchor !== null) {
            s.anchors[c!.anchor] = null;
            c!.anchor = null;
        }
        if (o.target === "berth")
            c!.berth = o.slot;
        else
            c!.anchor = o.slot;
        c!.stage = "channel";
        c!.move = { from, to: `${o.target}:${o.slot}`, start: s.second, end: s.second + 1200 };
        if (c!.milestones.admit === undefined)
            c!.milestones.admit = s.second;
        event(s, { id: `move:${c!.id}:${s.second}`, at: s.second + 1200, kind: "move", object: c!.id });
        return result("applied", "move-start", "目的位置已预留，船舶开始执行通行任务。");
    }
    if (o.kind === "work") {
        if (typeof o.running !== "boolean")
            return result("invalid", "form", "作业开关无效。");
        if (["unmooring", "departed"].includes(c!.stage) || c!.move?.to === "sea")
            return result("stale", "work-expired", "该船已结束本港作业，原开工操作已过期。");
        if (c!.stage !== "berthed")
            return result("incorrect", "mooring-required", "尚未完成靠泊与系泊，不能启动船岸作业。");
        if (!portEntryReady(c!))
            return result("incorrect", "work-clearance", "进口岸手续未办妥，不能开始普通装卸。");
        if (c!.working === o.running)
            return result("stale", "work-repeat", "当前作业状态没有变化。");
        c!.working = o.running;
        return result("applied", "work-changed", o.running ? "已下达作业指令，设备、货物与手续条件决定实际开工。" : "该船停止接续新作业，已在执行的交接继续完成。");
    }
    if (o.kind === "depart") {
        if (c!.stage === "departed" || c!.stage === "unmooring" || c!.move?.to === "sea")
            return result("stale", "departure-repeat", "离港任务已执行。");
        if (c!.stage !== "berthed")
            return result("incorrect", "departure-berth", "尚未靠妥，不能执行本港离泊任务。");
        if (!portCargoDone(s, c!.id))
            return result("incorrect", "cargo-required", "本港装卸尚未完成，请核对剩余货物任务。");
        if (c!.docs.departure.status !== "approved")
            return result("incorrect", "exit-clearance", "出口岸准备尚未办妥，请查看回执。");
        if (s.channel)
            return result("waiting", "channel-busy", "出港通道正在使用，继续运行或调整其他船舶安排。");
        c!.stage = "unmooring";
        c!.working = false;
        s.channel = c!.id;
        event(s, { id: `unmoored:${c!.id}`, at: s.second + 900, kind: "unmoored", object: c!.id });
        return result("applied", "depart-start", "离泊任务已开始；实际离开后释放泊位。");
    }
    if (o.kind === "assign-yard") {
        if (b!.boxIds.every(id => b!.flow === "import" ? s.boxes[id]!.deliveredAt !== null : s.boxes[id]!.loadedAt !== null))
            return result("stale", "cargo-complete", "该批次已全部完成，堆场安排已过期。");
        const y = s.plan.yards.find(y => y.id === o.yardId);
        if (!y)
            return result("invalid", "yard", "请选择有效堆场。");
        if (![b!.flow, "mixed"].includes(y.use))
            return result("waiting", "yard-use", "该区域用途不适配正常货批，请选择对应用途或混合区。");
        if (b!.targetYard === y.id)
            return result("stale", "yard-repeat", "该批次已安排在此区域。");
        b!.targetYard = y.id;
        return result("applied", "yard-assigned", "堆场安排已更新；已有库存将通过实际移箱任务调整。");
    }
    if (o.kind === "inspect") {
        const box = s.boxes[o.boxId], y = s.plan.yards.find(y => y.id === o.yardId);
        if (!box || !y || y.use !== "inspection")
            return result("invalid", "inspection-yard", "请选择异常箱和待核查区。");
        if (box.issue !== "open")
            return result("stale", "inspection-repeat", "该箱没有新的待报告异常。");
        box.inspectionYard = y.id;
        box.issue = "reported";
        event(s, { id: `inspection:${box.id}`, at: s.second + 1200, kind: "inspection", object: box.id });
        return result("applied", "inspection-request", "核查任务已发出；箱子入待核查区且结果返回后解除异常。");
    }
    if (o.kind === "yard-use") {
        const y = s.plan.yards.find(y => y.id === o.yardId);
        if (!y || !["import", "export", "mixed", "inspection"].includes(o.use))
            return result("invalid", "yard-use", "堆场用途无效。");
        if (y.use === o.use)
            return result("stale", "yard-use-repeat", "用途没有变化。");
        if (y.use === "inspection" && s.plan.yards.filter(y => y.use === "inspection").length === 1)
            return result("waiting", "inspection-space", "必须保留至少一个待核查区。先将其他空闲地块设为待核查区。");
        const usage = portYardUsage(s, y.id);
        if (usage.occupied || usage.reserved || Object.values(s.batches).some(b => b.targetYard === y.id && b.boxIds.some(id => b.flow === "import" ? s.boxes[id]!.deliveredAt === null : s.boxes[id]!.loadedAt === null)))
            return result("waiting", "yard-in-use", "该地块仍有库存、预留或未完货批。先重分配货批，等待实际移箱完成再更改用途。");
        y.use = o.use;
        return result("applied", "yard-use-changed", "空闲堆场用途已调整。");
    }
    if (o.kind === "dispatch") {
        const errors = validateTerminalSetup({ ...s.plan.equipment, dispatch: o.dispatch });
        if (errors.length)
            return result("invalid", "dispatch-form", errors.join("；"));
        rateJobs(s);
        s.plan.equipment.dispatch = copy(o.dispatch);
        rateJobs(s);
        return result("applied", "dispatch-changed", "岗位与设备分配已更新，在制任务保留已有工作量。");
    }
    if (o.kind === "repair") {
        if (s.failedCrane === null || s.repairPending)
            return result("stale", "repair-repeat", "暂无新的维修任务。");
        const technicians = s.plan.equipment.dispatch.technicians;
        if (!technicians || !s.plan.equipment.facilities.some(f => f.kind === "workshop"))
            return result("waiting", "repair-resource", "需要维修人员与维修站，可进入调度调整。");
        s.repairPending = true;
        event(s, { id: `repair:${s.second}`, at: s.second + Math.ceil(5400 / technicians), kind: "repair", object: "equipment" });
        return result("applied", "repair-start", "维修班组已接单。");
    }
    if (o.kind === "handover") {
        if (s.status !== "completed")
            return result("waiting", "handover-time", "在 48 小时结束后核对最终交班记录；当前可查看未完事项。");
        const required = portHandoverItems(s);
        if (o.entries.length !== required.length || new Set(o.entries.map(e => e.object)).size !== required.length)
            return result("invalid", "handover-coverage", "请核对全部交班事项。");
        for (const item of required) {
            const e = o.entries.find(e => e.object === item.object);
            if (!e || e.team !== item.team || e.next !== item.next)
                return result("invalid", "handover-content", `${item.label} 的责任岗位或下一步安排不匹配。`);
        }
        s.handover = required.map(i => ({ object: i.object, team: i.team, next: i.next, fingerprint: i.fingerprint }));
        return result("applied", "handover-complete", "交班已核对。未到期任务结转；逾期结果保持原记录。");
    }
    return result("invalid", "unknown", "指令未识别。");
}
export function applyPortCommand(s: PortSession, raw: PortCommand, record = true): PortResult {
    if (!raw || typeof raw !== "object")
        return result("invalid", "command", "指令无效。");
    if (raw.kind === "advance") {
        advancePortSession(s, raw.seconds, record);
        return result("applied", "clock", "时钟已推进。");
    }
    if (["start", "pause", "resume", "interrupt"].includes(raw.kind)) {
        const kind = raw.kind;
        if (kind === "start" && s.status === "ready") {
            s.status = "running";
            if (record)
                log(s, { kind: "start" });
            settle(s);
            return result("applied", "start", "场次已开始。");
        }
        if (kind === "pause" && s.mode === "practice" && s.status === "running") {
            s.status = "paused";
            s.pauseReason = "手动暂停";
            if (record)
                log(s, { kind: "pause" });
            return result("applied", "pause", "已暂停。");
        }
        if (kind === "resume" && s.mode === "practice" && s.status === "paused") {
            s.status = "running";
            s.pauseReason = "";
            if (record)
                log(s, { kind: "resume" });
            settle(s);
            return result("applied", "resume", "继续运行。");
        }
        if (kind === "interrupt" && !(["completed", "interrupted", "ready"].includes(s.status))) {
            s.status = "interrupted";
            if (record)
                log(s, { kind: "interrupt" });
            return result("applied", "interrupted", "场次已作为中断记录保存。");
        }
        return result("stale", "clock-rule", "当前场次不允许此时钟操作。");
    }
    let o: PortOrder;
    try {
        o = cleanOrder(raw as PortOrder);
    }
    catch (e) {
        return result("invalid", "form", (e as Error).message);
    }
    if (s.status === "ready" && !["plan-berth", "assign-yard"].includes(o.kind) || s.status === "interrupted" || s.status === "completed" && o.kind !== "handover")
        return result("stale", "session-state", "当前场次不能接收作业指令。");
    const object = objectOf(o);
    const batch = s.batches[object];
    const before = JSON.stringify({ second: s.second, stage: s.calls[object]?.stage, berths: s.berths, anchors: s.anchors, channel: s.channel, location: s.boxes[object]?.location, documents: s.calls[object]?.docs, dispatch: s.plan.equipment.dispatch, resources: resources(s), batch: batch ? { document: batch.document, targetYard: batch.targetYard, customs: batch.customs, carrier: batch.carrier, vgm: batch.vgm } : undefined, activeTasks: s.jobs.length });
    let r: PortResult;
    try {
        r = execute(s, o);
    }
    catch (e) {
        r = result("invalid", "form", `输入无效：${(e as Error).message}`);
    }
    if (r.outcome === "incorrect" && s.mode === "battle" && !s.attempts.some(a => a.object === object && a.rule === r.rule && a.deduction))
        r.deduction = 5;
    s.attempts.push({ ...r, at: s.second, object, order: copy(o), before });
    if (record)
        log(s, o);
    if (!["completed", "interrupted"].includes(s.status))
        settle(s);
    return r;
}
export function portBatchSummary(s: PortSession, b: PortBatch) { const boxes = b.boxIds.map(id => s.boxes[id]!); return { total: boxes.length, unloaded: boxes.filter(b => b.unloadedAt !== null).length, loaded: boxes.filter(b => b.loadedAt !== null).length, delivered: boxes.filter(b => b.deliveredAt !== null).length, issues: boxes.filter(b => ["open", "reported"].includes(b.issue)).length, locations: [...new Set(boxes.map(b => portLocationName(b.location)))] }; }
export function portWaitReason(s: PortSession, c: PortCall) {
    if (c.stage === "approach")
        return "尚未到达；可准备手续、泊位计划与堆场。";
    if (!portEntryReady(c))
        return "等待适用进口岸手续；查看资料与回执，补正后继续运行。";
    if (c.stage === "outer" || c.stage === "anchored") {
        const v = s.schedules.find(v => v.id === c.id)!;
        if ((v.large ? [1] : [0, 1]).every(i => s.berths[i]))
            return s.anchors.some(a => !a) && c.stage === "outer" ? "无空闲适配泊位；可安排港内候泊或继续等待。" : "适配泊位占用；继续运行等待释放。";
        if (s.channel)
            return "航道使用中；继续运行等待通行。";
        return "可申请靠泊，或保留当前等待安排。";
    }
    if (c.stage === "berthed") {
        if (s.schedules.find(v => v.id === c.id)!.large && TERMINAL_EQUIPMENT.crane[s.plan.equipment.crane].reach < 24)
            return "现有岸桥伸距不适配大型船。保持等待，或在下一场次更换设备选型。";
        if (portCargoDone(s, c.id))
            return c.docs.departure.status === "approved" ? "本港作业完成，可安排离泊。" : "本港作业完成，等待出口岸准备。";
        const r = resources(s);
        if (!r.quay || !r.truck || !r.yard || !r.gate)
            return "资源不足：进入调度检查岸桥、车辆、场桥和闸口岗位。";
        if (!c.working)
            return "船岸作业面已建立，等待开工指令。";
        const batches = Object.values(s.batches).filter(b => b.callId === c.id);
        if (batches.some(b => !b.targetYard))
            return "部分货批尚未安排堆场；进入货批面板分配。";
        if (batches.some(b => b.flow === "export" && !exportReady(b)))
            return "出口箱装船条件待核对；进口卸箱可继续。";
        return "作业按设备、库存和后续交接能力推进；可检查堆场占用及货批记录。";
    }
    return c.stage === "departed" ? "船舶已离港，进口货物的后续交付仍独立推进。" : "移动或系泊任务执行中，继续运行等待完成。";
}
