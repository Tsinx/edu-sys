/** Original teaching scenario. Durations, dimensions and costs are not production port data. */
import { createNormalTrainingSetup, type TerminalTrainingMode } from "./terminal-training.js";
import { terminalBudget, validateTerminalSetup, type TerminalSetup } from "./terminal-lab.js";
export const PORT_OPERATIONS_SCHEMA = "port-operations/3.0";
export const PORT_ARRIVAL_GENERATOR = "port-arrivals/1.0";
export const PORT_SHIFT_SECONDS = 8 * 3600;
export const PORT_HORIZON = 48 * 3600;
export const PORT_OPERATIONS_COURSE_PRESETS = [
    { id: "joint-watch", title: "48 小时港口综合值班", difficulty: "基础", scenario: "regular", mode: "flow", publicBriefing: "核对船舶手续，安排连续到港与等泊，组织进出口货批和逐箱交接，完成六班交接。", eventBriefing: "双泊位 · 四候泊锚位 · 六堆场 · 未来 6 小时预报" },
    { id: "scarce-deep-reach", title: "集中到港下的规划与选型", difficulty: "进阶", scenario: "peak", mode: "equipment", publicBriefing: "比较岸桥、车辆、场桥和闸口方案，为大型船预留适配泊位，用实际履约与单位成本检验配置。", eventBriefing: "48 小时 · 高到港波动 · 1,200 教学预算点" },
    { id: "compound-disruption", title: "设备故障下的持续运营", difficulty: "挑战", scenario: "outage", mode: "dispatch", publicBriefing: "在连续到港中调整设备与班组，安排故障维修、异常箱核查与交班结转。", eventBriefing: "第 18 小时岸桥故障 · 维修岗位与在制任务连续衔接" }
] as const;
export function getPortOperationsCoursePreset(id?: string) { return PORT_OPERATIONS_COURSE_PRESETS.find(p => p.id === id) ?? PORT_OPERATIONS_COURSE_PRESETS[0]; }
export type PortMode = TerminalTrainingMode;
export type YardUse = "import" | "export" | "mixed" | "inspection";
export interface PortConfig {
    seed: number;
    meanGapMinutes: number;
    variability: "low" | "normal" | "high";
    largeShare: number;
    disruption: "none" | "wind" | "outage";
}
export interface PortYard {
    id: string;
    name: string;
    use: YardUse;
    col: number;
    row: number;
    capacity: number;
}
export interface PortPlan {
    equipment: TerminalSetup;
    yards: PortYard[];
}
export interface PortSchedule {
    id: string;
    name: string;
    large: boolean;
    eta: number;
    ata: number;
    announceAt: number;
    updates: {
        at: number;
        eta: number;
    }[];
    unload: number;
    load: number;
    referenceService: number;
    crew: number;
    voyage: string;
}
export type PortDocKind = "entry" | "health" | "border" | "departure";
export const PORT_DOC_NAMES: Record<PortDocKind, string> = { entry: "进口岸申请", health: "入境检疫", border: "边检申报", departure: "出口岸准备" };
export type DocStatus = "draft" | "submitted" | "correction" | "approved";
export interface PortDocument {
    status: DocStatus;
    value: string;
    reference: string;
    submittedAt?: number;
    returnedAt?: number;
    reason: string;
}
export type PortVesselStage = "approach" | "outer" | "channel" | "anchored" | "mooring" | "berthed" | "unmooring" | "departed";
export interface PortMove {
    from: string;
    to: string;
    start: number;
    end: number;
}
export interface PortCall {
    id: string;
    announced: boolean;
    eta: number;
    stage: PortVesselStage;
    arrivedAt: number | null;
    berthArrivedAt: number | null;
    berth: number | null;
    anchor: number | null;
    plannedBerth: number | null;
    plannedAt: number | null;
    move: PortMove | null;
    working: boolean;
    docs: Record<PortDocKind, PortDocument>;
    milestones: Partial<Record<"admit" | "secure" | "work" | "depart", number>>;
    wait: Record<"berth" | "anchor" | "channel" | "documents" | "dispatch", number>;
}
export interface PortBatch {
    id: string;
    callId: string;
    name: string;
    flow: "import" | "export";
    bill: string;
    reference: string;
    document: PortDocument;
    customs: boolean;
    carrier: boolean;
    vgm: boolean;
    targetYard: string | null;
    boxIds: string[];
    availableAt: number;
}
export interface BoxRecord {
    at: number;
    action: string;
    from: string;
    to: string;
    resource: string;
}
export interface PortBox {
    id: string;
    batchId: string;
    location: string;
    queuedAt: number;
    available: boolean;
    unloadedAt: number | null;
    loadedAt: number | null;
    deliveredAt: number | null;
    issueExpected: boolean;
    issue: "none" | "open" | "reported" | "resolved";
    inspectionYard: string | null;
    reviewReady: boolean;
    history: BoxRecord[];
}
export type JobKind = "quay" | "truck" | "yard" | "gate";
export interface PortJob {
    id: number;
    boxId: string;
    kind: JobKind;
    resource: number;
    from: string;
    to: string;
    remaining: number;
    rate: number;
    updatedAt: number;
    start: number;
    end: number | null;
    purpose: "flow" | "relocate";
}
export interface PortEvent {
    id: string;
    at: number;
    kind: "announce" | "eta" | "arrive" | "exports" | "doc" | "batch-doc" | "move" | "moored" | "unmoored" | "inspection" | "shift" | "wind" | "fault" | "repair";
    object: string;
    value?: string | number;
}
export interface PortNotice {
    id: string;
    at: number;
    kind: string;
    object: string;
    text: string;
}
export type PortOrder = {
    kind: "document";
    callId: string;
    document: PortDocKind;
    value: string;
} | {
    kind: "batch-document";
    batchId: string;
    value: string;
} | {
    kind: "plan-berth";
    callId: string;
    berth: number;
    at: number;
} | {
    kind: "move";
    callId: string;
    target: "berth" | "anchor";
    slot: number;
} | {
    kind: "work";
    callId: string;
    running: boolean;
} | {
    kind: "depart";
    callId: string;
} | {
    kind: "assign-yard";
    batchId: string;
    yardId: string;
} | {
    kind: "yard-use";
    yardId: string;
    use: YardUse;
} | {
    kind: "inspect";
    boxId: string;
    yardId: string;
} | {
    kind: "dispatch";
    dispatch: TerminalSetup["dispatch"];
} | {
    kind: "repair";
} | {
    kind: "handover";
    entries: {
        object: string;
        team: string;
        next: string;
    }[];
};
export type PortCommand = PortOrder | {
    kind: "start" | "pause" | "resume" | "interrupt";
} | {
    kind: "advance";
    seconds: number;
};
export interface PortResult {
    outcome: "applied" | "waiting" | "incorrect" | "stale" | "invalid";
    rule: string;
    message: string;
    deduction: number;
}
export interface PortAttempt extends PortResult {
    at: number;
    object: string;
    order: PortOrder;
    before: string;
}
export interface PortHandover {
    object: string;
    team: string;
    next: string;
    fingerprint: string;
}
export interface PortSession {
    schema: typeof PORT_OPERATIONS_SCHEMA;
    generator: typeof PORT_ARRIVAL_GENERATOR;
    config: PortConfig;
    mode: PortMode;
    status: "ready" | "running" | "paused" | "completed" | "interrupted";
    second: number;
    plan: PortPlan;
    initialPlan: PortPlan;
    schedules: PortSchedule[];
    calls: Record<string, PortCall>;
    batches: Record<string, PortBatch>;
    boxes: Record<string, PortBox>;
    berths: (string | null)[];
    anchors: (string | null)[];
    channel: string | null;
    jobs: PortJob[];
    events: PortEvent[];
    notices: PortNotice[];
    attempts: PortAttempt[];
    commands: PortCommand[];
    taught: string[];
    pauseReason: string;
    cost: number;
    energy: number;
    effort: {
        personSeconds: number;
        energySeconds: number;
        capitalSeconds: number;
    };
    distance: number;
    rehandles: number;
    wind: number;
    failedCrane: number | null;
    repairPending: boolean;
    jobSequence: number;
    handover: PortHandover[];
}
export function portRng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function portTriangle(u: number, lo: number, mode: number, hi: number) { const f = (mode - lo) / (hi - lo); return u < f ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode)); }
export function defaultPortConfig(): PortConfig { return { seed: 20260932, meanGapMinutes: 300, variability: "normal", largeShare: .25, disruption: "none" }; }
export function cleanPortConfig(value: PortConfig): PortConfig {
    if (!value || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff || !Number.isFinite(value.meanGapMinutes) || value.meanGapMinutes <= 240 || value.meanGapMinutes > 1440 || !["low", "normal", "high"].includes(value.variability) || !Number.isFinite(value.largeShare) || value.largeShare < 0 || value.largeShare > 1 || !["none", "wind", "outage"].includes(value.disruption))
        throw new Error("到港配置无效：平均间隔必须大于基准服务 240 分钟，最大为 1,440 分钟。");
    return { seed: value.seed, meanGapMinutes: value.meanGapMinutes, variability: value.variability, largeShare: value.largeShare, disruption: value.disruption };
}
export function samplePortGap(random: () => number, config: PortConfig) { const shape = { low: 4, normal: 2, high: 1 }[config.variability]; let log = 0; for (let i = 0; i < shape; i++)
    log -= Math.log(Math.max(1e-12, random())); return 15 + log * (config.meanGapMinutes - 15) / shape; }
export function generatePortSchedule(raw: PortConfig): PortSchedule[] {
    const config = cleanPortConfig(raw);
    const gaps = portRng(config.seed), work = portRng(config.seed ^ 0x9e3779b9), delays = portRng(config.seed ^ 0x85ebca6b), types = portRng(config.seed ^ 0xc2b2ae35);
    const schedules: PortSchedule[] = [];
    let minute = 60;
    while (minute <= 54 * 60) {
        const total = Math.round(portTriangle(work(), 72, 168, 264));
        const delta = Math.round(portTriangle(delays(), -45, 0, 90));
        const index = schedules.length + 1;
        const id = `S${String(index).padStart(2, "0")}`;
        const eta = Math.round(minute) * 60;
        schedules.push({ id, name: `教学船 ${id}`, large: types() < config.largeShare, eta, ata: eta + delta * 60, announceAt: Math.max(0, eta - 6 * 3600), updates: [{ at: Math.max(0, eta - 3 * 3600), eta: eta + Math.round(delta / 2) * 60 }, { at: Math.max(0, eta - 3600), eta: eta + delta * 60 }], unload: Math.round(total * .6), load: total - Math.round(total * .6), referenceService: Math.round((30 + total * 1.25) * 60), crew: 18 + index % 7, voyage: `IN-${id}-48` });
        minute += samplePortGap(gaps, config);
    }
    return schedules;
}
export function defaultPortPlan(): PortPlan {
    const equipment = createNormalTrainingSetup();
    equipment.cranes = 4;
    equipment.yardMachines = 4;
    equipment.dispatch = { berthCranes: [2, 2], craneOperators: 4, drivers: 12, yardOperators: 4, gateClerks: 2, technicians: 1, priority: "balanced" };
    const uses: YardUse[] = ["import", "import", "export", "export", "mixed", "inspection"];
    const yards = uses.map((use, i) => ({ id: `Y${i + 1}`, name: `堆场 ${String.fromCharCode(65 + i)}`, use, col: i % 3 + 1, row: Math.floor(i / 3), capacity: 100 }));
    equipment.facilities = [...yards.map(y => ({ id: y.id.toLowerCase(), kind: "yard" as const, col: y.col, row: y.row, rotation: 0 as const })), { id: "gate-1", kind: "gate", col: 3, row: 2, rotation: 0 }, { id: "workshop-1", kind: "workshop", col: 0, row: 2, rotation: 0 }, { id: "charger-1", kind: "charger", col: 1, row: 2, rotation: 0 }, { id: "charger-2", kind: "charger", col: 2, row: 2, rotation: 0 }];
    return { equipment, yards };
}
export function cleanPortPlan(raw: PortPlan): PortPlan {
    if (!raw || !raw.equipment || !Array.isArray(raw.yards) || raw.yards.length !== 6)
        throw new Error("需要六个堆场地块。");
    const e = raw.equipment, d = e.dispatch;
    const equipment: TerminalSetup = { scenario: "regular", crane: e.crane, vehicle: e.vehicle, yardMachine: e.yardMachine, gateSystem: e.gateSystem, cranes: e.cranes, vehicles: e.vehicles, yardMachines: e.yardMachines, gates: e.gates, dispatch: { berthCranes: [...d.berthCranes], craneOperators: d.craneOperators, drivers: d.drivers, yardOperators: d.yardOperators, gateClerks: d.gateClerks, technicians: d.technicians, priority: d.priority }, facilities: e.facilities.map(f => ({ id: f.id, kind: f.kind, col: f.col, row: f.row, rotation: f.rotation })) };
    const yards = raw.yards.map(y => ({ id: y.id, name: `堆场 ${String.fromCharCode(64 + Number(y.id.slice(1)))}`, use: y.use, col: y.col, row: y.row, capacity: 100 }));
    if (new Set(yards.map(y => y.id)).size !== 6 || yards.some(y => !/^Y[1-6]$/.test(y.id) || !["import", "export", "mixed", "inspection"].includes(y.use) || !Number.isInteger(y.col) || y.col < 1 || y.col > 3 || ![0, 1].includes(y.row)) || new Set(yards.map(y => `${y.col}:${y.row}`)).size !== 6 || !yards.some(y => y.use === "inspection"))
        throw new Error("六块堆场不得重叠，且必须保留待核查区。");
    equipment.facilities = [...yards.map(y => ({ id: y.id.toLowerCase(), kind: "yard" as const, col: y.col, row: y.row, rotation: 0 as const })), ...equipment.facilities.filter(f => f.kind !== "yard")];
    const errors = validateTerminalSetup(equipment);
    if (errors.length)
        throw new Error(errors.join("；"));
    if (terminalBudget(equipment) > 1200)
        throw new Error("建设投入超过 1,200 教学点。");
    return { equipment, yards };
}
export function portTime(second: number) { const minutes = Math.floor(second / 60) + 8 * 60; return `第 ${Math.floor(minutes / 1440) + 1} 天 ${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
export function portLocationName(location: string) { const [kind, id] = location.split(":"); return ({ ship: `船上 ${id}`, quay: `进口岸侧 ${id}`, loading: `出口岸侧 ${id}`, yard: `堆场 ${id}`, handoff: `堆场交接 ${id}`, pickup: `堆场提箱 ${id}`, gate: "闸口交接区", external: "陆侧待集港", delivered: "已交付" } as Record<string, string>)[kind!] ?? location; }
