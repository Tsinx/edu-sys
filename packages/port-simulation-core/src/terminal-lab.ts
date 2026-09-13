/** Original teaching model. Rates, costs and dimensions are scenario assumptions, not port data. */
export type TerminalMode = "flow" | "dispatch" | "equipment" | "planning";
export type TerminalScenario = "regular" | "peak" | "wind" | "outage";
export type FacilityKind = "yard" | "reefer" | "warehouse" | "gate" | "charger" | "workshop";
export interface TerminalFacility { id: string; kind: FacilityKind; col: number; row: number; rotation: 0 | 1 }
export interface TerminalDispatch {
  berthCranes: [number, number]; craneOperators: number; drivers: number;
  yardOperators: number; gateClerks: number; technicians: number;
  priority: "balanced" | "a" | "b";
}
export interface TerminalSetup {
  scenario: TerminalScenario;
  crane: "standard" | "wide"; vehicle: "tractor" | "electric" | "agv";
  yardMachine: "rtg" | "rmg"; gateSystem: "manual" | "smart";
  cranes: number; vehicles: number; yardMachines: number; gates: number;
  dispatch: TerminalDispatch; facilities: TerminalFacility[];
}
export const TERMINAL_MODES = [
  { id: "flow", label: "熟悉流程", eyebrow: "LIVE OPERATIONS", title: "接管港口，让每一道指令真正运行", brief: "放行船舶、确认系泊、启动岸桥与运输班组。时钟连续运行，直接操作现场，观察箱流、等待与交付的实时变化。" },
  { id: "dispatch", label: "设备与人员调度", eyebrow: "DISPATCH", title: "同一批资源，排出更顺畅的班次", brief: "为两艘船分配岸桥，为各环节安排人员。观察队列变化，处理大风、故障和集中到港。" },
  { id: "equipment", label: "设备选型", eyebrow: "EQUIPMENT", title: "能力、投入和能耗，一起比较", brief: "在 1,200 教学预算点内配置设备。检查船宽适配、人员需求和充电设施，用同工况试验比较方案。" },
  { id: "planning", label: "港区规划", eyebrow: "MASTERPLAN", title: "把作业流程，放进空间布局", brief: "在可建设地块上布置堆场、闸口和配套设施。调整位置，缩短运输路径，检验完整生产链。" }
] as const;
/** Existing classroom challenge IDs remain valid; V2 resolves them to the new lab assignments. */
export const TERMINAL_COURSE_PRESETS = [
  { id: "joint-watch", title: "正常流程实训", difficulty: "入门", scenario: "regular", mode: "flow", publicBriefing: "指挥船舶进港与系泊，启动装卸、运输、堆场和闸口作业，用实时交付检验六个环节；在同一港区尝试布局规划。", eventBriefing: "常态双船 · 300 箱 · 12 台集卡 · 23 人 · 建设 736 教学点" },
  { id: "scarce-deep-reach", title: "集中到港下的设备选型", difficulty: "进阶", scenario: "peak", mode: "equipment", publicBriefing: "在预算内选配岸桥、车辆、场桥和闸口，兼顾船宽、供能与人员，并用两组实验比较方案。", eventBriefing: "集中到港 · 420 箱 · 1,200 教学预算点" },
  { id: "compound-disruption", title: "设备故障下的班次调度", difficulty: "挑战", scenario: "outage", mode: "dispatch", publicBriefing: "安排两船岸桥与五类人员，在岸桥故障后调整调度、维修和箱流，尽快恢复完整作业链。", eventBriefing: "第 45 分钟岸桥故障 · 维修需要岗位与设施配合" }
] as const;
export function getTerminalCoursePreset(id?: string) { return TERMINAL_COURSE_PRESETS.find(preset => preset.id === id) ?? TERMINAL_COURSE_PRESETS[0]; }
export const TERMINAL_SCENARIOS: Record<TerminalScenario, { label: string; detail: string; cargo: [number, number]; deadline: number }> = {
  regular: { label: "常态双船", detail: "教学船 A / B 等待进港，300 箱待卸。", cargo: [120, 180], deadline: 480 },
  peak: { label: "集中到港", detail: "两船同时抵港，420 箱待卸；航道顺序通行。", cargo: [180, 240], deadline: 480 },
  wind: { label: "大风限速", detail: "第 60–150 分钟，岸桥效率降至 55%。", cargo: [120, 180], deadline: 480 },
  outage: { label: "设备故障", detail: "第 45 分钟一台岸桥故障；维修岗和维修站共同决定修复时长。", cargo: [120, 180], deadline: 480 }
};
export const TERMINAL_EQUIPMENT = {
  crane: {
    standard: { label: "标准岸桥", rate: 26, cost: 65, energy: 38, reach: 20, detail: "26 箱/时 · 跨 20 列 · 1 人/台" },
    wide: { label: "大伸距岸桥", rate: 32, cost: 95, energy: 48, reach: 26, detail: "32 箱/时 · 跨 26 列 · 1 人/台" }
  },
  vehicle: {
    tractor: { label: "柴油集卡", rate: 8, cost: 8, energy: 16, detail: "8 箱/时 · 1 人/台 · 无需充电" },
    electric: { label: "电动集卡", rate: 9, cost: 12, energy: 9, detail: "9 箱/时 · 1 人/台 · 需充电站" },
    agv: { label: "自动导引车", rate: 11, cost: 18, energy: 6, detail: "11 箱/时 · 1 人监管 4 台 · 需充电站" }
  },
  yardMachine: {
    rtg: { label: "轮胎式场桥", rate: 24, cost: 28, energy: 25, detail: "24 箱/时 · 1 人/台" },
    rmg: { label: "轨道式场桥", rate: 34, cost: 42, energy: 17, detail: "34 箱/时 · 1 人/台 · 含轨道投入" }
  },
  gateSystem: {
    manual: { label: "人工核验闸口", rate: 22, cost: 10, energy: 3, detail: "22 箱/时 · 1 人/道" },
    smart: { label: "智能识别闸口", rate: 36, cost: 24, energy: 5, detail: "36 箱/时 · 1 人监管 2 道" }
  }
} as const;
export const TERMINAL_FACILITIES: Record<FacilityKind, { label: string; cost: number; color: string; detail: string }> = {
  yard: { label: "集装箱堆场", cost: 24, color: "#559794", detail: "增加 100 箱缓存和 1 台场桥作业位" },
  reefer: { label: "冷藏箱堆场", cost: 32, color: "#8abcc9", detail: "增加 80 箱缓存和 1 台场桥作业位" },
  warehouse: { label: "拆装箱仓库", cost: 26, color: "#8494a6", detail: "增加 40 箱缓冲；不替代场桥作业位" },
  gate: { label: "陆侧闸口", cost: 18, color: "#eab265", detail: "开放 2 条车道；须位于陆侧第 3 排" },
  charger: { label: "充电站", cost: 16, color: "#85bb83", detail: "支撑 8 台电动车或 AGV" },
  workshop: { label: "维修站", cost: 16, color: "#b6a0cb", detail: "配合维修岗，支持故障修复" }
};
export const TERMINAL_FLOW = [
  { id: "channel", label: "进港引航", entity: "vessel-a", detail: "两船共用单向航道。下达放行指令后，船舶才离开锚地；航道释放后可放行另一艘船。", task: "放行一艘船，观察它沿航道抵达泊位。" },
  { id: "berth", label: "靠泊准备", entity: "berth-b", detail: "船舶抵达指定泊位后，确认系泊才能启用岸桥。船 A 为 18 列宽，船 B 为 24 列宽。", task: "船舶抵达后确认系泊，建立安全的装卸作业面。" },
  { id: "quay", label: "岸桥装卸", entity: "crane-a", detail: "启动泊位岸桥班组，把箱子从船舶转移至岸侧。人员不足、伸距不匹配或岸侧缓存已满都会阻止卸箱。", task: "启动已系泊船舶的岸桥，观察第一批箱子进入岸侧。" },
  { id: "transport", label: "水平运输", entity: "transport", detail: "派出运输班组，沿港内道路接箱。车辆、司机或监管员、供能设施和行驶距离共同约束运输能力。", task: "派出车辆接箱，再尝试暂停运输，观察岸侧排队的变化。" },
  { id: "yard", label: "堆场作业", entity: "yard-1", detail: "启用场桥接箱入场。扩大堆场增加缓存，增加场桥与操作员提高处理能力。", task: "启用堆场班组，把交接区的箱子转入堆场。" },
  { id: "gate", label: "闸口交付", entity: "gate-1", detail: "开放闸口核验与交付。只有通过闸口的箱子才计入交付量；关闭闸口会让堆场逐步积压。", task: "开放闸口，让第一只箱子走完整条作业链。" }
] as const;
export interface TerminalMetrics {
  rates: [number, number, number, number]; craneRates: [number, number]; bottleneck: number;
  budget: number; personnel: number; storage: number; distance: number; warnings: string[];
  activeVehicles: number; activeCranes: number; activeYard: number; activeGates: number;
}
export interface TerminalSample { minute: number; delivered: number; quay: number; transit: number; yard: number }
export type TerminalOperation = "crane-a" | "crane-b" | "transport" | "yard" | "gate";
export interface TerminalOperations {
  admittedAt: [number | null, number | null]; secured: [boolean, boolean];
  "crane-a": boolean; "crane-b": boolean; transport: boolean; yard: boolean; gate: boolean;
}
export type TerminalCommand =
  | { kind: "advance"; minutes: number }
  | { kind: "tick"; seconds: number }
  | { kind: "harbor"; vessel: 0 | 1; action: "admit" | "secure" }
  | { kind: "operate"; target: TerminalOperation; running: boolean }
  | { kind: "stop" }
  | { kind: "dispatch"; value: TerminalDispatch }
  | { kind: "answer"; step: number; option: number };
export interface TerminalState {
  engine: "realtime" | "legacy"; operations: TerminalOperations;
  equipmentWork: { cranes: number[]; vehicles: number[] };
  setup: TerminalSetup; initialSetup: TerminalSetup; minute: number;
  unloaded: [number, number]; queues: [number, number, number]; delivered: number;
  energy: number; cost: number; waitingBoxMinutes: number; repairWork: number; answers: number[];
  samples: TerminalSample[]; commands: TerminalCommand[];
  events: Array<{ minute: number; text: string }>;
}
const clone = <T>(value: T): T => structuredClone(value);
const count = (s: TerminalSetup, kind: FacilityKind) => s.facilities.filter(f => f.kind === kind).length;
export const terminalLotPosition = (col: number, row: number) => ({ x: -90 + col * 36, z: row * 36 });
export function createTerminalSetup(scenario: TerminalScenario = "regular"): TerminalSetup {
  return {
    scenario, crane: "wide", vehicle: "tractor", yardMachine: "rtg", gateSystem: "manual",
    cranes: 4, vehicles: 8, yardMachines: 3, gates: 2,
    dispatch: { berthCranes: [2, 2], craneOperators: 4, drivers: 8, yardOperators: 3, gateClerks: 2, technicians: 2, priority: "balanced" },
    facilities: [
      { id: "yard-1", kind: "yard", col: 1, row: 0, rotation: 0 },
      { id: "yard-2", kind: "yard", col: 3, row: 0, rotation: 0 },
      { id: "yard-3", kind: "reefer", col: 4, row: 1, rotation: 0 },
      { id: "warehouse-1", kind: "warehouse", col: 5, row: 1, rotation: 0 },
      { id: "gate-1", kind: "gate", col: 2, row: 2, rotation: 0 },
      { id: "charger-1", kind: "charger", col: 0, row: 1, rotation: 0 },
      { id: "workshop-1", kind: "workshop", col: 0, row: 2, rotation: 0 }
    ]
  };
}
export function terminalBudget(s: TerminalSetup) {
  return TERMINAL_EQUIPMENT.crane[s.crane].cost * s.cranes + TERMINAL_EQUIPMENT.vehicle[s.vehicle].cost * s.vehicles
    + TERMINAL_EQUIPMENT.yardMachine[s.yardMachine].cost * s.yardMachines + TERMINAL_EQUIPMENT.gateSystem[s.gateSystem].cost * s.gates
    + s.facilities.reduce((sum, f) => sum + TERMINAL_FACILITIES[f.kind].cost, 0);
}
/** Strict boundary validation for UI edits, persisted plans and imported JSON. */
export function validateTerminalSetup(value: unknown): string[] {
  if (!value || typeof value !== "object") return ["方案格式不正确"];
  const s = value as TerminalSetup;
  const errors: string[] = [];
  if (!Object.hasOwn(TERMINAL_SCENARIOS, s.scenario)) errors.push("未知工况");
  for (const category of ["crane", "vehicle", "yardMachine", "gateSystem"] as const)
    if (!Object.hasOwn(TERMINAL_EQUIPMENT[category], s[category])) errors.push("未知设备型号");
  for (const [key, max] of [["cranes", 6], ["vehicles", 16], ["yardMachines", 6], ["gates", 6]] as const)
    if (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > max) errors.push("设备数量超出范围");
  if (!Array.isArray(s.facilities) || s.facilities.length > 18) return [...errors, "地块数量无效"];
  const occupied = new Set<string>(); const ids = new Set<string>();
  for (const f of s.facilities) {
    if (!f || !Object.hasOwn(TERMINAL_FACILITIES, f.kind) || typeof f.id !== "string" || !/^[a-z][a-z0-9-]{0,49}$/.test(f.id)
      || !Number.isInteger(f.col) || f.col < 0 || f.col > 5 || !Number.isInteger(f.row) || f.row < 0 || f.row > 2
      || (f.rotation !== 0 && f.rotation !== 1)) { errors.push("地块位置或设施类型无效"); continue; }
    if (occupied.has(`${f.col},${f.row}`)) errors.push("同一地块不能重叠建设");
    if (ids.has(f.id)) errors.push("设施编号重复");
    if (f.kind === "gate" && f.row !== 2) errors.push("闸口须连接陆侧道路，请布置在第 3 排");
    occupied.add(`${f.col},${f.row}`); ids.add(f.id);
  }
  const d = s.dispatch;
  if (!d || !Array.isArray(d.berthCranes) || d.berthCranes.length !== 2) return [...errors, "岗位配置无效"];
  for (const n of [...d.berthCranes, d.craneOperators, d.drivers, d.yardOperators, d.gateClerks, d.technicians])
    if (!Number.isInteger(n) || n < 0 || n > 26) errors.push("岗位人数和分配台数须为有效整数");
  if (d.berthCranes[0] + d.berthCranes[1] > s.cranes) errors.push("分配岸桥超过已购数量");
  if (!["balanced", "a", "b"].includes(d.priority)) errors.push("调度优先级无效");
  if (d.craneOperators + d.drivers + d.yardOperators + d.gateClerks + d.technicians > 26) errors.push("本班只有 26 人，不能重复分配");
  if (!errors.length && terminalBudget(s) > 1200) errors.push("方案超过 1,200 教学预算点");
  return [...new Set(errors)];
}
export function terminalMetrics(s: TerminalSetup, minute = 0, repairWork = 0): TerminalMetrics {
  const d = s.dispatch; const qc = TERMINAL_EQUIPMENT.crane[s.crane];
  const v = TERMINAL_EQUIPMENT.vehicle[s.vehicle]; const ym = TERMINAL_EQUIPMENT.yardMachine[s.yardMachine];
  const gs = TERMINAL_EQUIPMENT.gateSystem[s.gateSystem];
  const yards = s.facilities.filter(f => f.kind === "yard" || f.kind === "reefer");
  const gates = s.facilities.filter(f => f.kind === "gate");
  // Rectilinear travel uses the central/perimeter connectors; no driving across building lots.
  const distance = yards.length ? yards.reduce((sum, f) => {
    const p = terminalLotPosition(f.col, f.row);
    const approach = Math.min(...[-112, 0, 112].map(x => Math.abs(p.x - x) + Math.min(Math.abs(x + 62), Math.abs(x - 62))));
    const landLeg = gates.length ? Math.min(...gates.map(g => Math.abs(p.x - terminalLotPosition(g.col, g.row).x) + Math.abs(p.z - 72))) : 160;
    return sum + 2 * (approach + p.z + 28) + landLeg;
  }, 0) / yards.length : 360;
  const warnings: string[] = [];
  const repair = d.technicians > 0 && count(s, "workshop") > 0 ? Math.max(45, minute) + Math.ceil((90 - repairWork) / d.technicians) : Infinity;
  const failed = s.scenario === "outage" && minute >= 45 && repairWork < 90 ? 1 : 0;
  const wind = s.scenario === "wind" && minute >= 60 && minute < 150 ? 0.55 : 1;
  const assigned = d.berthCranes[0] + d.berthCranes[1];
  const activeCranes = Math.max(0, Math.min(s.cranes - failed, d.craneOperators, assigned));
  const staffedFraction = assigned ? activeCranes / assigned : 0;
  const craneRates: [number, number] = [d.berthCranes[0] * staffedFraction * qc.rate * wind,
    qc.reach >= 24 ? d.berthCranes[1] * staffedFraction * qc.rate * wind : 0];
  const powerLimit = s.vehicle === "tractor" ? 16 : count(s, "charger") * 8;
  const activeVehicles = Math.min(s.vehicles, d.drivers * (s.vehicle === "agv" ? 4 : 1), powerLimit);
  const activeYard = Math.min(s.yardMachines, d.yardOperators, yards.length);
  const activeGates = Math.min(s.gates, d.gateClerks * (s.gateSystem === "smart" ? 2 : 1), gates.length * 2);
  const rates: [number, number, number, number] = [craneRates[0] + craneRates[1], activeVehicles * v.rate * 220 / Math.max(150, distance), activeYard * ym.rate, activeGates * gs.rate];
  if (qc.reach < 24) warnings.push("船 B 宽 24 列，当前岸桥伸距不足，B 船无法卸箱。");
  if (activeVehicles < s.vehicles) warnings.push("部分车辆待命：检查司机 / 监管员人数和充电站容量。");
  if (activeCranes < assigned) warnings.push("岸桥未全部投入：检查操作员人数或故障状态。");
  if (!yards.length) warnings.push("没有堆场作业位，箱流无法进入堆场。");
  if (!gates.length) warnings.push("缺少陆侧闸口，无法完成交付。");
  if (failed) warnings.push(Number.isFinite(repair) ? `岸桥故障，预计第 ${Math.ceil(repair)} 分钟修复。` : "岸桥故障，维修岗与维修站均到位后才能恢复。");
  if (wind < 1) warnings.push("大风作业窗口：岸桥按 55% 效率运行。");
  const personnel = d.craneOperators + d.drivers + d.yardOperators + d.gateClerks + d.technicians;
  const storage = count(s, "yard") * 100 + count(s, "reefer") * 80 + count(s, "warehouse") * 40;
  return { rates, craneRates, bottleneck: rates.indexOf(Math.min(...rates)), budget: terminalBudget(s), personnel, storage, distance, warnings, activeVehicles, activeCranes, activeYard, activeGates };
}
export function createTerminalState(setup = createTerminalSetup(), engine: TerminalState["engine"] = "realtime"): TerminalState {
  const errors = validateTerminalSetup(setup); if (errors.length) throw new Error(errors.join("；"));
  return { engine, equipmentWork: { cranes: Array.from({ length: setup.cranes }, () => 0), vehicles: Array.from({ length: setup.vehicles }, () => 0) }, operations: { admittedAt: engine === "legacy" ? [0, 12 * 60] : [null, null], secured: [engine === "legacy", engine === "legacy"], "crane-a": engine === "legacy", "crane-b": engine === "legacy", transport: engine === "legacy", yard: engine === "legacy", gate: engine === "legacy" },
    setup: clone(setup), initialSetup: clone(setup), minute: 0, unloaded: [0, 0], queues: [0, 0, 0], delivered: 0,
    energy: 0, cost: 0, waitingBoxMinutes: 0, repairWork: 0, answers: [], samples: [{ minute: 0, delivered: 0, quay: 0, transit: 0, yard: 0 }], commands: [],
    events: [{ minute: 0, text: "试验就绪，教学船 A / B 等待进港。" }] };
}
export function terminalTotalCargo(s: TerminalSetup) { return TERMINAL_SCENARIOS[s.scenario].cargo.reduce((a, b) => a + b, 0); }
export function terminalComplete(s: TerminalState) { return s.delivered >= terminalTotalCargo(s.setup) - 1e-7; }
export function terminalVesselStage(state: TerminalState, index: 0 | 1) {
  if (state.operations.admittedAt[index] === null) return "锚地待命";
  if (terminalVesselProgress(state, index) < 1) return "引航进港中";
  if (!state.operations.secured[index]) return "抵达泊位 · 待系泊";
  if (state.unloaded[index] >= TERMINAL_SCENARIOS[state.setup.scenario].cargo[index] - 1e-7) return "卸船完成";
  if (!state.operations[index === 0 ? "crane-a" : "crane-b"]) return "系泊完成 · 待开工";
  return terminalLiveRates(state)[index] > 0 ? "岸桥装卸中" : "作业等待中";
}
/** Kept for exact replay of existing 2.0 coursework; new trials use the realtime engine. */
function applyLegacyCommand(current: TerminalState, command: TerminalCommand): TerminalState {
  if (current.commands.length >= 4096) throw new Error("本次记录已满，请导出复盘并开始新试验。");
  const next = clone(current);
  if (command.kind === "dispatch") {
    const candidate = { ...next.setup, dispatch: command.value };
    const errors = validateTerminalSetup(candidate); if (errors.length) throw new Error(errors.join("；"));
    next.setup.dispatch = clone(command.value);
    next.events.push({ minute: next.minute, text: `调整班次：岸桥 ${command.value.berthCranes.join(" / ")} 台，运输岗 ${command.value.drivers} 人。` });
  } else if (command.kind === "answer") {
    if (!Number.isInteger(command.step) || command.step < 0 || command.step >= 6 || !Number.isInteger(command.option) || command.option < 0 || command.option > 2) throw new Error("流程判断无效");
    if ([1, 0, 2, 1, 0, 2][command.step] === command.option && !next.answers.includes(command.step)) next.answers.push(command.step);
  } else if (command.kind === "advance") {
    if (!Number.isInteger(command.minutes) || command.minutes < 1 || command.minutes > 480) throw new Error("推进时间须为 1–480 分钟");
    const cargo = TERMINAL_SCENARIOS[next.setup.scenario].cargo;
    for (let n = 0; n < command.minutes && next.minute < 480 && !terminalComplete(next); n++) {
      const m = terminalMetrics(next.setup, next.minute, next.repairWork);
      // Process downstream first. A box crosses at most one stage boundary per minute.
      const out = Math.min(next.queues[2], m.rates[3] / 60);
      next.queues[2] -= out; next.delivered += out;
      const stacked = Math.min(next.queues[1], m.rates[2] / 60, Math.max(0, m.storage - next.queues[2]));
      next.queues[1] -= stacked; next.queues[2] += stacked;
      const hauled = Math.min(next.queues[0], m.rates[1] / 60, Math.max(0, 40 - next.queues[1]));
      next.queues[0] -= hauled; next.queues[1] += hauled;
      const available = Math.max(0, 60 - next.queues[0]);
      const requested = ([0, 1] as const).map(i => next.minute >= (i === 0 ? 12 : 26) ? Math.min(cargo[i] - next.unloaded[i], m.craneRates[i] / 60) : 0) as [number, number];
      const order: [0 | 1, 0 | 1] = next.setup.dispatch.priority === "b" ? [1, 0] : [0, 1];
      let space = available; let unloaded = 0;
      for (const i of order) {
        const share = next.setup.dispatch.priority === "balanced" ? available * (requested[i] / (requested[0] + requested[1] || 1)) : space;
        const amount = Math.max(0, Math.min(requested[i], share, space));
        next.unloaded[i] += amount; next.queues[0] += amount; space -= amount; unloaded += amount;
      }
      // Teaching energy is equivalent kWh, including a small idle share for staffed equipment.
      const qc = TERMINAL_EQUIPMENT.crane[next.setup.crane]; const v = TERMINAL_EQUIPMENT.vehicle[next.setup.vehicle];
      const ym = TERMINAL_EQUIPMENT.yardMachine[next.setup.yardMachine]; const gs = TERMINAL_EQUIPMENT.gateSystem[next.setup.gateSystem];
      const e = unloaded * qc.energy / qc.rate + hauled * v.energy / v.rate + stacked * ym.energy / ym.rate + out * gs.energy / gs.rate
        + (m.activeCranes * qc.energy + m.activeVehicles * v.energy + m.activeYard * ym.energy + m.activeGates * gs.energy) * 0.08 / 60;
      next.energy += e; next.cost += m.personnel * 0.035 + e * 0.015;
      next.waitingBoxMinutes += next.queues.reduce((a, b) => a + b, 0);
      if (next.setup.scenario === "outage" && next.minute >= 45 && next.repairWork < 90 && count(next.setup, "workshop") > 0) {
        next.repairWork = Math.min(90, next.repairWork + next.setup.dispatch.technicians);
        if (next.repairWork === 90) next.events.push({ minute: next.minute + 1, text: "维修作业完成，岸桥恢复可用。" });
      }
      next.minute++;
      if (next.minute === 12 || next.minute === 26) next.events.push({ minute: next.minute, text: `教学船 ${next.minute === 12 ? "A" : "B"} 靠泊完成，等待岸桥接续。` });
      if (next.minute === 45 && next.setup.scenario === "outage") next.events.push({ minute: 45, text: "一台岸桥发生故障，启动维修响应。" });
      if ((next.minute === 60 || next.minute === 150) && next.setup.scenario === "wind") next.events.push({ minute: next.minute, text: next.minute === 60 ? "大风限速生效。" : "风况恢复，解除限速。" });
      if (next.minute % 10 === 0 || terminalComplete(next) || next.minute === 480) next.samples.push({ minute: next.minute, delivered: next.delivered, quay: next.queues[0], transit: next.queues[1], yard: next.queues[2] });
    }
    if (!terminalComplete(current) && terminalComplete(next)) next.events.push({ minute: next.minute, text: "全部集装箱通过闸口，本次生产任务完成。" });
  } else throw new Error("不支持的仿真指令");
  next.commands.push(clone(command));
  return next;
}
export const TERMINAL_TRANSIT_SECONDS = [12 * 60, 14 * 60] as const;
const operationNames: Record<TerminalOperation, string> = { "crane-a": "A 泊位岸桥", "crane-b": "B 泊位岸桥", transport: "水平运输班组", yard: "堆场班组", gate: "闸口交付" };
export function terminalVesselProgress(state: TerminalState, vessel: 0 | 1, second = Math.round(state.minute * 60)) {
  const start = state.operations.admittedAt[vessel];
  return start === null ? 0 : Math.max(0, Math.min(1, (second - start) / TERMINAL_TRANSIT_SECONDS[vessel]));
}
export function terminalChannelVessel(state: TerminalState): 0 | 1 | undefined {
  return ([0, 1] as const).find(i => state.operations.admittedAt[i] !== null && terminalVesselProgress(state, i) < 1);
}
/** Empty string means the order is valid. The UI and replay use the same interlocks. */
export function terminalCommandIssue(state: TerminalState, command: TerminalCommand): string {
  if (state.engine === "legacy") return "这是旧版复盘。点击“新试验”，使用当前方案进入实时操作。";
  if (terminalComplete(state) || state.minute >= 480) return "本班作业已结束，请开始新试验。";
  if (command.kind === "harbor") {
    if (command.vessel !== 0 && command.vessel !== 1) return "船舶编号无效";
    const i = command.vessel;
    if (command.action === "admit") {
      if (state.operations.admittedAt[i] !== null) return "进港指令已下达";
      const occupied = terminalChannelVessel(state);
      if (occupied !== undefined) return `航道由船 ${occupied === 0 ? "A" : "B"} 占用，待其抵达泊位后放行。`;
    } else if (command.action === "secure") {
      if (state.operations.admittedAt[i] === null || terminalVesselProgress(state, i) < 1) return "船舶尚未抵达泊位";
      if (state.operations.secured[i]) return "系泊已确认";
    } else return "不支持的港口指令";
  } else if (command.kind === "operate") {
    if (!Object.hasOwn(operationNames, command.target) || typeof command.running !== "boolean") return "作业指令无效";
    if (!command.running) return "";
    const m = terminalMetrics(state.setup, state.minute, state.repairWork);
    if (command.target === "crane-a" || command.target === "crane-b") {
      const i = command.target === "crane-a" ? 0 : 1;
      if (!state.operations.secured[i]) return "先完成进港与系泊，再启动岸桥";
      if (state.unloaded[i] >= TERMINAL_SCENARIOS[state.setup.scenario].cargo[i] - 1e-7) return "该船已经卸毕";
      if (!m.craneRates[i]) return "岸桥无法开工，请检查分配台数、操作员与船宽适配。";
    } else {
      const rate = m.rates[command.target === "transport" ? 1 : command.target === "yard" ? 2 : 3];
      if (!rate) return command.target === "transport" ? "没有可出勤车辆，请配置人员、车辆与供能设施。" : command.target === "yard" ? "没有可用堆场班组，请配置场桥、人员与堆场。" : "没有可用闸口，请配置闸口车道与核验人员。";
    }
  } else if (command.kind !== "stop") return "不支持的现场指令";
  return "";
}
/** Instantaneous possible rates, limited by orders, resources and buffers; the integrator conserves cargo. */
export function terminalLiveRates(state: TerminalState): [number, number, number, number, number] {
  const m = terminalMetrics(state.setup, state.minute, state.repairWork); const o = state.operations;
  const cargo = TERMINAL_SCENARIOS[state.setup.scenario].cargo;
  return [
    o["crane-a"] && o.secured[0] && terminalVesselProgress(state, 0) === 1 && state.unloaded[0] < cargo[0] - 1e-7 && state.queues[0] < 60 - 1e-7 ? m.craneRates[0] : 0,
    o["crane-b"] && o.secured[1] && terminalVesselProgress(state, 1) === 1 && state.unloaded[1] < cargo[1] - 1e-7 && state.queues[0] < 60 - 1e-7 ? m.craneRates[1] : 0,
    o.transport && state.queues[0] > 1e-7 && state.queues[1] < 40 - 1e-7 ? m.rates[1] : 0,
    o.yard && state.queues[1] > 1e-7 && state.queues[2] < m.storage - 1e-7 ? m.rates[2] : 0,
    o.gate && state.queues[2] > 1e-7 ? m.rates[3] : 0
  ];
}
export function terminalFlowProgress(state: TerminalState) {
  const arrived = ([0, 1] as const).filter(i => state.operations.admittedAt[i] !== null && terminalVesselProgress(state, i) === 1).length;
  const secured = state.operations.secured.filter(Boolean).length;
  const unloaded = state.unloaded[0] + state.unloaded[1];
  const amounts = [arrived, secured, unloaded, unloaded - state.queues[0], state.queues[2] + state.delivered, state.delivered];
  return amounts.map((amount, i) => ({ amount, done: amount >= 1 - 1e-7, unit: i < 2 ? "艘" : "箱" }));
}
function stepRealtime(state: TerminalState, seconds: number, afterSecond?: (state: TerminalState) => boolean) {
  const cargo = TERMINAL_SCENARIOS[state.setup.scenario].cargo;
  for (let n = 0; n < seconds && state.minute < 480 && !terminalComplete(state); n++) {
    const second = Math.round(state.minute * 60); const o = state.operations;
    const m = terminalMetrics(state.setup, state.minute, state.repairWork);
    // Fixed one-second steps, downstream first. No cargo is created by rendering or UI timers.
    const out = o.gate ? Math.min(state.queues[2], m.rates[3] / 3600) : 0;
    state.queues[2] -= out; state.delivered += out;
    const stacked = o.yard ? Math.min(state.queues[1], m.rates[2] / 3600, Math.max(0, m.storage - state.queues[2])) : 0;
    state.queues[1] -= stacked; state.queues[2] += stacked;
    const hauled = o.transport ? Math.min(state.queues[0], m.rates[1] / 3600, Math.max(0, 40 - state.queues[1])) : 0;
    state.queues[0] -= hauled; state.queues[1] += hauled;
    for (let i = 0; i < m.activeVehicles; i++) state.equipmentWork.vehicles[i]! += hauled / m.activeVehicles;
    const available = Math.max(0, 60 - state.queues[0]);
    const requested = ([0, 1] as const).map(i => o.secured[i] && o[i === 0 ? "crane-a" : "crane-b"]
      ? Math.max(0, Math.min(cargo[i] - state.unloaded[i], m.craneRates[i] / 3600)) : 0);
    const order = state.setup.dispatch.priority === "b" ? [1, 0] as const : [0, 1] as const;
    let space = available; let unloaded = 0;
    for (const i of order) {
      const share = state.setup.dispatch.priority === "balanced" ? available * requested[i]! / (requested[0]! + requested[1]! || 1) : space;
      const amount = Math.min(requested[i]!, share, space);
      state.unloaded[i] += amount; state.queues[0] += amount; space -= amount; unloaded += amount;
      const start = i === 0 ? 0 : state.setup.dispatch.berthCranes[0]; const assigned = state.setup.dispatch.berthCranes[i];
      for (let crane = start; crane < start + assigned; crane++) state.equipmentWork.cranes[crane]! += amount / assigned;
      if (amount > 0 && state.unloaded[i] >= cargo[i] - 1e-7) state.events.push({ minute: (second + 1) / 60, text: `船 ${i ? "B" : "A"} 卸船完成，岸桥转入待命。` });
    }
    const qc = TERMINAL_EQUIPMENT.crane[state.setup.crane]; const v = TERMINAL_EQUIPMENT.vehicle[state.setup.vehicle];
    const ym = TERMINAL_EQUIPMENT.yardMachine[state.setup.yardMachine]; const gs = TERMINAL_EQUIPMENT.gateSystem[state.setup.gateSystem];
    const idle = (m.activeCranes * qc.energy + m.activeVehicles * v.energy + m.activeYard * ym.energy + m.activeGates * gs.energy) * 0.08 / 3600;
    const e = unloaded * qc.energy / qc.rate + hauled * v.energy / v.rate + stacked * ym.energy / ym.rate + out * gs.energy / gs.rate + idle;
    state.energy += e; state.cost += m.personnel * 0.035 / 60 + e * 0.015;
    state.waitingBoxMinutes += state.queues.reduce((a, b) => a + b, 0) / 60;
    if (state.setup.scenario === "outage" && second >= 2700 && state.repairWork < 90 && count(state.setup, "workshop") > 0) {
      state.repairWork = Math.min(90, state.repairWork + state.setup.dispatch.technicians / 60);
      if (state.repairWork >= 90 - 1e-7) { state.repairWork = 90; state.events.push({ minute: (second + 1) / 60, text: "维修作业完成，岸桥恢复可用。" }); }
    }
    state.minute = (second + 1) / 60;
    for (const i of [0, 1] as const) if (o.admittedAt[i] !== null && second + 1 === o.admittedAt[i]! + TERMINAL_TRANSIT_SECONDS[i])
      state.events.push({ minute: state.minute, text: `船 ${i ? "B" : "A"} 抵达泊位，航道释放，等待确认系泊。` });
    if (second + 1 === 2700 && state.setup.scenario === "outage") state.events.push({ minute: 45, text: "一台岸桥故障，维修岗开始响应。" });
    if ((second + 1 === 3600 || second + 1 === 9000) && state.setup.scenario === "wind") state.events.push({ minute: state.minute, text: second + 1 === 3600 ? "大风限速生效。" : "风况恢复，解除限速。" });
    if ((second + 1) % 600 === 0 || terminalComplete(state) || second + 1 === 28800) state.samples.push({ minute: state.minute, delivered: state.delivered, quay: state.queues[0], transit: state.queues[1], yard: state.queues[2] });
    if (afterSecond?.(state)) break;
  }
}
export function applyTerminalCommand(current: TerminalState, command: TerminalCommand, afterSecond?: (state: TerminalState) => boolean): TerminalState {
  if (current.engine === "legacy") return applyLegacyCommand(current, command);
  const previous = current.commands.at(-1);
  const mergeTick = command.kind === "tick" && previous?.kind === "tick" && previous.seconds + command.seconds <= 28800;
  if (!mergeTick && current.commands.length >= 4096) throw new Error("本次记录已满，请导出复盘并开始新试验。");
  if (command.kind === "tick" || command.kind === "advance") {
    const seconds = command.kind === "tick" ? command.seconds : command.minutes * 60;
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 28800) throw new Error("推进时间须为 1–28,800 秒");
    if (terminalComplete(current) || current.minute >= 480) return current;
    const next = clone(current); stepRealtime(next, seconds, afterSecond);
    const recorded = afterSecond ? { kind: "tick" as const, seconds: Math.round((next.minute - current.minute) * 60) } : command;
    if (mergeTick && recorded.kind === "tick") (next.commands[next.commands.length - 1] as { kind: "tick"; seconds: number }).seconds += recorded.seconds;
    else next.commands.push(clone(recorded));
    if (!terminalComplete(current) && terminalComplete(next)) next.events.push({ minute: next.minute, text: "全部集装箱通过闸口，本班任务完成。" });
    return next;
  }
  if (command.kind === "dispatch") {
    if (terminalComplete(current) || current.minute >= 480) throw new Error("本班作业已结束，请开始新试验。");
    const errors = validateTerminalSetup({ ...current.setup, dispatch: command.value });
    if (errors.length) throw new Error(errors.join("；"));
  } else {
    const issue = terminalCommandIssue(current, command); if (issue) throw new Error(issue);
  }
  const next = clone(current); let text = "";
  if (command.kind === "harbor") {
    if (command.action === "admit") next.operations.admittedAt[command.vessel] = Math.round(next.minute * 60);
    else next.operations.secured[command.vessel] = true;
    text = `船 ${command.vessel ? "B" : "A"}：${command.action === "admit" ? "获准进港，引航开始。" : "系泊确认完成，可启动岸桥。"}`;
  } else if (command.kind === "operate") {
    next.operations[command.target] = command.running;
    text = `${operationNames[command.target]}：${command.running ? "收到开工指令。" : "已暂停作业。"}`;
  } else if (command.kind === "stop") {
    for (const target of Object.keys(operationNames) as TerminalOperation[]) next.operations[target] = false;
    text = "全港装卸、运输与交付已停工；进港引航继续，时钟继续运行。";
  } else if (command.kind === "dispatch") {
    next.setup.dispatch = clone(command.value);
    text = `调度生效：岸桥 ${command.value.berthCranes.join(" / ")} 台，运输岗 ${command.value.drivers} 人。`;
  }
  next.events.push({ minute: next.minute, text }); next.commands.push(clone(command)); return next;
}
export function serializeTerminal(state: TerminalState) {
  return JSON.stringify({ schema: state.engine === "legacy" ? "terminal-lab/2.0" : "terminal-lab/2.1", setup: state.initialSetup, commands: state.commands });
}
export function restoreTerminal(raw: string): TerminalState {
  if (raw.length > 2_000_000) throw new Error("复盘文件过大");
  const value = JSON.parse(raw);
  if (!["terminal-lab/2.0", "terminal-lab/2.1"].includes(value?.schema) || value.setup === undefined || !Array.isArray(value.commands) || value.commands.length > 4096) throw new Error("不是有效的 3D 港口实验文件");
  let state = createTerminalState(value.setup, value.schema === "terminal-lab/2.0" ? "legacy" : "realtime"); let totalMinutes = 0;
  for (const command of value.commands) {
    if (!command || typeof command !== "object") throw new Error("复盘指令无效");
    if (command.kind === "advance") { totalMinutes += command.minutes; if (!Number.isFinite(totalMinutes) || totalMinutes > 960) throw new Error("复盘时间超出范围"); }
    if (command.kind === "tick") { totalMinutes += command.seconds / 60; if (!Number.isFinite(totalMinutes) || totalMinutes > 960) throw new Error("复盘时间超出范围"); }
    state = applyTerminalCommand(state, command);
  }
  return state;
}
