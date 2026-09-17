import { PORT_NAVIGATION_VERSION } from "./port-navigation.js";
import { applyPortCommand, createPortSession, portCargoDone, portEntryReady, portTransportDistance } from "./port-operations-engine.js";
import { cleanPortPlan, defaultPortPlan, type PortCommand, type PortPlan, type PortResult, type PortSession } from "./port-operations-model.js";
import { portStudentView } from "./port-operations-view.js";

export const PORT_COURSE_SCHEMA = "port-course/1.2";
export type PortCourseUnit = "arrival" | "cargo" | "yard" | "planning" | "departure";
export type PortCourseSelection = PortCourseUnit | "full";
export const PORT_COURSE_UNITS = [
  { id: "arrival", title: "船舶入港", short: "入港", course: "船舶与口岸流程", duration: "约 3–5 分钟", tab: "ships", briefing: "核对航前资料，取得适用回执，再选择直靠或候泊。以实际靠妥为完成依据。", prepared: "单船教学情境；船舶尚未到港，泊位和锚位可用。" },
  { id: "cargo", title: "装卸与运输", short: "装卸", course: "码头作业与运输协同", duration: "约 5–8 分钟", tab: "cargo", briefing: "为进出口货批分配堆场、核验资料，组织岸桥与运输班组，完成本船装卸。", prepared: "S01 已办妥入港手续并靠妥；无需重复前一课。" },
  { id: "yard", title: "堆场与交付", short: "堆场", course: "堆场管理与集疏运", duration: "约 4–6 分钟", tab: "cargo", briefing: "接续岸侧进口箱，安排堆场和交付岗位，处理待核查箱并完成进口提离。", prepared: "船舶已靠妥并开工，岸侧已有待运箱；出口业务不属于本段目标。" },
  { id: "planning", title: "设备与规划", short: "规划", course: "能力配置与港区规划", duration: "约 4–6 分钟", tab: "plan", briefing: "选择设备、岗位和六地块布局，保留核查空间。开始试运行后，用实际箱流检验方案。", prepared: "可修改开局方案；试运行的手续和常规作业由系统接续，保留自选配置和货批目标。" },
  { id: "departure", title: "离港与复核", short: "离港", course: "船舶周转与作业复核", duration: "约 2–3 分钟", tab: "ships", briefing: "核对本港装卸结果，办理出口岸准备并安排离港，观察泊位与航道实际释放。", prepared: "S01 的进口卸箱和出口装船已完成；逐箱交接记录保留，出口岸准备待办理。" },
  { id: "full", title: "48 小时综合挑战", short: "综合", course: "综合应用与长程实战", duration: "实战约 48 分钟", tab: "ships", briefing: "连续到港、排队、作业、异常和六班交接，综合检验独立调度能力。", prepared: "沿用完整实训规则及原场次记录。" }
] as const;
export function portCourseDefinition(id: PortCourseSelection) { return PORT_COURSE_UNITS.find(u => u.id === id)!; }
export function isPortCourseUnit(value: unknown): value is PortCourseUnit { return PORT_COURSE_UNITS.some(u => u.id !== "full" && u.id === value); }
export function recommendPortCourse(chapter: string): PortCourseSelection {
  if (/堆场|集疏运/.test(chapter)) return "yard";
  if (/规划|选型|能力配置/.test(chapter)) return "planning";
  if (/离港|复核/.test(chapter)) return "departure";
  if (/装卸|设备|运输协同/.test(chapter)) return "cargo";
  if (/综合|韧性|绩效/.test(chapter)) return "full";
  return "arrival";
}
export type PortCourseCommand = PortCommand | { kind: "course-plan"; plan: PortPlan };
export interface PortCourseRun {
  fixture?: { schema: string; generator: string; config: PortSession["config"]; initialPlan: PortPlan; schedule: PortSession["schedules"]; startSecond: number };
  inputLog?: PortCourseCommand[];
  traceCoverage?: "complete" | "legacy";
  schema: typeof PORT_COURSE_SCHEMA | "port-course/1.0" | "port-course/1.1";
  unit: PortCourseUnit;
  simulation: PortSession;
  commands: PortCourseCommand[];
  baselineAttempts: number;
  baselineCost?: number;
  baselineDistance?: number;
  baselineRehandles?: number;
  startSecond: number;
  configured: boolean;
  complete: boolean;
  reached: string[];
}
export interface PortCourseStep { title: string; explanation: string; focus: string; tab: string; command: PortCourseCommand }
const copy = <T>(value: T): T => structuredClone(value);
const response = (outcome: PortResult["outcome"], message: string): PortResult => ({ outcome, message, rule: "course", deduction: 0 });
const act = (s: PortSession, c: PortCommand) => applyPortCommand(s, c, false);
const ordinaryTopics = ["documents", "arrival", "work", "yard", "exception", "departure"];

/** A separate, versioned single-call lesson fixture. The 48-hour generator and old replays are unchanged. */
export function createPortCourse(unit: PortCourseUnit, schema: PortCourseRun["schema"] = PORT_COURSE_SCHEMA): PortCourseRun {
  if (!isPortCourseUnit(unit)) throw new Error("未知课程分段。");
  const s = createPortSession("practice", undefined, undefined, schema === "port-course/1.0" ? "port-operations/3.0" : "port-operations/3.1");
  if (schema !== "port-course/1.2") delete s.scoringVersion;
  s.schedules = s.schedules.slice(0, 1);
  s.calls = { S01: s.calls.S01! };
  s.batches = Object.fromEntries(Object.entries(s.batches).filter(([, b]) => b.callId === "S01"));
  s.boxes = Object.fromEntries(Object.entries(s.boxes).filter(([, b]) => b.batchId.startsWith("S01-")));
  s.events = s.events.filter(e => e.object === "S01" || e.object.startsWith("S01-"));
  s.notices = s.notices.filter(e => e.object === "S01" || e.object.startsWith("S01-"));
  s.taught = [...ordinaryTopics];
  if (unit === "yard") {
    s.boxes[s.batches["S01-I1"]!.boxIds[0]!]!.issueExpected = true;
    s.plan.equipment.dispatch = { ...s.plan.equipment.dispatch, drivers: 0, yardOperators: 0, gateClerks: 0 };
  }
  if (!["arrival", "planning"].includes(unit)) {
    act(s, { kind: "start" });
    for (const document of ["entry", "health", "border"] as const)
      act(s, { kind: "document", callId: "S01", document, value: s.calls.S01!.docs[document].reference });
    act(s, { kind: "advance", seconds: s.schedules[0]!.ata });
    act(s, { kind: "move", callId: "S01", target: "berth", slot: 0 });
    act(s, { kind: "advance", seconds: s.calls.S01!.move!.end - s.second + 900 });
    if (unit === "yard") {
      act(s, { kind: "work", callId: "S01", running: true });
      act(s, { kind: "advance", seconds: 1800 });
    }
    if (unit === "departure") {
      for (const b of Object.values(s.batches)) {
        act(s, { kind: "batch-document", batchId: b.id, value: b.reference });
        act(s, { kind: "assign-yard", batchId: b.id, yardId: b.flow === "import" ? (b.id.endsWith("1") ? "Y1" : "Y2") : (b.id.endsWith("1") ? "Y3" : "Y4") });
      }
      act(s, { kind: "work", callId: "S01", running: true });
      for (let i = 0; i < 720 && !portCargoDone(s, "S01"); i++) act(s, { kind: "advance", seconds: 60 });
      if (!portCargoDone(s, "S01")) throw new Error("离港课程前置作业未能完成。");
    }
  }
  s.status = "ready";
  s.pauseReason = "";
  s.commands = [];
  const run: PortCourseRun = { schema, unit, simulation: s, commands: [], inputLog: [], traceCoverage: "complete", baselineAttempts: s.attempts.length, startSecond: s.second, configured: false, complete: false, reached: [] };
  run.fixture = { schema, generator: s.generator, config: copy(s.config), initialPlan: copy(s.initialPlan), schedule: copy(s.schedules), startSecond: s.second };
  run.baselineCost = s.cost; run.baselineDistance = s.distance; run.baselineRehandles = s.rehandles;
  run.reached = portCourseGoals(run).filter(g => g.done).map(g => g.id);
  return run;
}
export function portCourseGoals(r: PortCourseRun) {
  const s = r.simulation, ship = s.calls.S01!, batches = Object.values(s.batches);
  const imports = Object.values(s.boxes).filter(b => s.batches[b.batchId]!.flow === "import");
  const exports = Object.values(s.boxes).filter(b => s.batches[b.batchId]!.flow === "export");
  const goal = (id: string, label: string, done: boolean, tab: string, focus = "S01") => ({ id, label, done, tab, focus });
  switch (r.unit) {
    case "arrival": return [goal("clearance", "三项适用入港手续取得回执", portEntryReady(ship), "ships"), goal("admitted", "执行进港并取得目的位置预留", ship.milestones.admit !== undefined, "ships"), goal("secured", "抵达泊位并完成系泊", ship.milestones.secure !== undefined, "ships")];
    case "cargo": return [goal("yards", "为四个货批分配堆场", batches.every(b => !!b.targetYard), "cargo", "S01-I1"), goal("cargo-docs", "四个货批资料核验通过", batches.every(b => b.document.status === "approved"), "cargo", "S01-E1"), goal("unloaded", "完成 116 箱进口卸船", imports.every(b => b.unloadedAt !== null), "resources"), goal("loaded", "完成 78 箱出口装船", exports.every(b => b.loadedAt !== null), "ships")];
    case "yard": return [goal("import-plan", "两个进口批次具备堆场和提离条件", batches.filter(b => b.flow === "import").every(b => !!b.targetYard && b.customs), "cargo", "S01-I1"), goal("exception", "异常箱经过核查解除限制", imports.some(b => b.issue === "resolved"), "cargo", imports.find(b => b.issue !== "none")?.id ?? "S01-I1"), goal("delivery", "完成 116 箱进口提离并保留交接记录", imports.every(b => b.deliveredAt !== null), "resources")];
    case "planning": return [goal("plan", "应用满足预算与核查空间的自选方案", r.configured, "plan", "Y1"), goal("import-trial", "试运行完成至少 12 箱进口提离", imports.filter(b => b.deliveredAt !== null).length >= 12, "resources"), goal("export-trial", "试运行完成至少 12 箱出口装船", exports.filter(b => b.loadedAt !== null).length >= 12, "resources")];
    case "departure": return r.schema === "port-course/1.2"
      ? [goal("exit-doc", "离港资料预核对通过（不替代最终离港条件）", ship.docs.departure.status === "approved", "ships"), goal("berth-released", "船体驶离泊位，泊位实际释放", ["channel", "departed"].includes(ship.stage) && s.berths.every(v => v !== ship.id), "ships"), goal("depart", "实际出港并释放航道", ship.stage === "departed" && s.channel !== ship.id, "ships")]
      : [goal("exit-doc", "出口岸准备取得回执", ship.docs.departure.status === "approved", "ships"), goal("depart", "完成离港并留下离港记录", ship.stage === "departed", "ships"), goal("released", "泊位与航道实际释放", ship.stage === "departed" && s.berths.every(v => !v) && !s.channel, "ships")];
  }
}
function settleCourse(r: PortCourseRun, pauseAtMilestone: boolean) {
  const goals = portCourseGoals(r), newly = goals.filter(g => g.done && !r.reached.includes(g.id));
  r.reached.push(...newly.map(g => g.id));
  r.complete = goals.every(g => g.done);
  if (r.complete || pauseAtMilestone && newly.length && r.simulation.status === "running") {
    r.simulation.status = "paused";
    r.simulation.pauseReason = r.complete ? "本段目标已完成，可复核记录、重练或进入下一段。" : `已验证：${newly.map(g => g.label).join("；")}。可查看结果后继续。`;
  }
}
export type PortTrialObserver = (session: PortSession) => void;
export function applyPortCourseCommand(r: PortCourseRun, command: PortCourseCommand, demo = false, observeTrial?: PortTrialObserver): PortResult {
  (r.inputLog ??= []).push(copy(command));
  return applyPortCourseCommandInternal(r, command, demo, observeTrial);
}
function applyPortCourseCommandInternal(r: PortCourseRun, command: PortCourseCommand, demo = false, observeTrial?: PortTrialObserver): PortResult {
  if (r.complete) return response("stale", "本段已完成，重练会建立独立记录。");
  if (command.kind === "start" && r.unit === "planning" && !r.configured) {
    r.commands.push(copy(command));
    return response("waiting", "请先在规划面板应用开局方案，确认预算与核查空间，再开始试运行。");
  }
  let result: PortResult;
  if (command.kind === "course-plan") {
    if (r.unit !== "planning" || r.simulation.status !== "ready") return response("stale", "仅规划分段开局前可修改建设方案。");
    const plan = cleanPortPlan(command.plan);
    r.simulation.plan = copy(plan); r.simulation.initialPlan = copy(plan); r.configured = true;
    result = response("applied", "自选方案已应用，开始试运行可检验进出口箱流。");
  } else if (command.kind === "advance") {
    if (!Number.isInteger(command.seconds) || command.seconds < 0 || command.seconds > 172800) throw new Error("无效推进量。");
    let left = command.seconds;
    while (left > 0 && r.simulation.status === "running" && !r.complete) {
      if (r.unit === "planning") serviceCourseTrial(r, observeTrial);
      const delta = Math.min(30, left);
      act(r.simulation, { kind: "advance", seconds: delta });
      left -= delta;
      settleCourse(r, !demo);
    }
    result = { ...response("applied", "课程时钟已推进。"), rule: "clock" };
  } else {
    result = act(r.simulation, command);
    settleCourse(r, !demo);
  }
  r.commands.push(copy(command));
  return result;
}

/** Demonstration decisions are explicit commands; this policy is never run in student cargo/arrival exercises. */
export function nextPortCourseStep(r: PortCourseRun): PortCourseStep | null {
  if (r.complete) return null;
  const s = r.simulation, c = s.calls.S01!;
  const step = (title: string, explanation: string, command: PortCourseCommand, tab = "ships", focus = "S01") => ({ title, explanation, command, tab, focus });
  if (r.unit === "planning" && !r.configured) return step("应用参考方案", "保留进口、出口、备用和待核查区；这是一种可行配置，其他有效方案同样可以完成试运行。", { kind: "course-plan", plan: defaultPortPlan() }, "plan", "Y1");
  if (s.status === "ready") return step("开始本段演示", portCourseDefinition(r.unit).prepared, { kind: "start" });
  if (s.status === "paused") return step("继续现场作业", "已完成的工作保留，时钟和等待中的任务继续推进。", { kind: "resume" });
  for (const document of ["entry", "health", "border"] as const) {
    if (["draft", "correction"].includes(c.docs[document].status)) return step(({entry:"核对进口岸申请",health:"核对检疫申报",border:"核对边检资料"})[document], `对照航前资料中的${document === "entry" ? "航次号" : "在船人数"}提交，机构反馈由业务时钟返回。`, { kind: "document", callId: c.id, document, value: c.docs[document].reference });
  }
  if (["outer", "anchored"].includes(c.stage) && portEntryReady(c) && !s.channel) {
    const berth = s.berths.findIndex(id => !id);
    if (berth >= 0) return step("安排进入可用泊位", "核对手续、通航和目的位置。进入航道前预留泊位，预约本身不占用泊位。", { kind: "move", callId: c.id, target: "berth", slot: berth });
  }
  if (r.unit === "arrival") return step("观察到港与靠泊", "船舶按真实业务时钟航行；抵达泊位后仍需完成系泊，才能开始装卸。", { kind: "advance", seconds: 600 });
  if (r.unit !== "departure") {
    const d = s.plan.equipment.dispatch;
    if (r.unit === "yard" && (!d.drivers || !d.yardOperators || !d.gateClerks)) return step("接续运输、场桥与闸口班组", "为已有设备配足岗位，使岸侧待运箱能够进入堆场并交付。", { kind: "dispatch", dispatch: defaultPortPlan().equipment.dispatch }, "resources");
    for (const b of Object.values(s.batches).filter(b => r.unit !== "yard" || b.flow === "import")) {
      if (!b.targetYard) {
        const yards = s.plan.yards.filter(y => y.use === b.flow || y.use === "mixed");
        const overflow = (y: typeof yards[number]) => Math.max(0, Object.values(s.batches).filter(x => x.targetYard === y.id).reduce((n, x) => n + x.boxIds.length, 0) + b.boxIds.length - y.capacity);
        const distance = (y: typeof yards[number]) => portTransportDistance(s, b.flow === "import" ? "quay:S01" : "external", `handoff:${y.id}`);
        yards.sort((a, b) => overflow(a) - overflow(b) || distance(a) - distance(b) || a.id.localeCompare(b.id));
        if (yards[0]) return step(`安排${b.name}堆场`, "按货物流向、容量和运输距离选择堆场；逐箱移动由作业设备执行。", { kind: "assign-yard", batchId: b.id, yardId: yards[0].id }, "cargo", b.id);
      }
      if (["draft", "correction"].includes(b.document.status)) return step(`核验${b.name}资料`, "对照提单与箱数关联值核验；回执不能替代箱子的实际运输和交接。", { kind: "batch-document", batchId: b.id, value: b.reference }, "cargo", b.id);
    }
    const box = Object.values(s.boxes).find(b => b.issue === "open");
    if (box) return step("安排异常箱核查", "将异常箱委托至待核查区，保留运输、核查和解除限制的交接记录。", { kind: "inspect", boxId: box.id, yardId: s.plan.yards.find(y => y.use === "inspection")!.id }, "cargo", box.id);
    if (c.stage === "berthed" && !c.working) return step("下达船岸作业指令", "系泊和入港手续已完成，岸桥与运输班组按实际资源接续作业。", { kind: "work", callId: c.id, running: true });
  }
  if (r.unit === "departure") {
    if (["draft", "correction"].includes(c.docs.departure.status)) return step("核对出口岸准备", "本港装卸已实际完成，核对航次资料并等待出口岸准备回执。", { kind: "document", callId: c.id, document: "departure", value: c.docs.departure.reference });
    if (c.stage === "berthed" && c.docs.departure.status === "approved") return step("安排离泊出港", "离泊指令不会立即释放资源；实际离开泊位后释放泊位，通过航道后释放通行资源。", { kind: "depart", callId: c.id });
  }
  return step("观察作业与交接", "让设备完成实际工作。箱位、装卸量和交接账本随作业推进，等待本身不算流程错误。", { kind: "advance", seconds: 600 }, r.unit === "departure" ? "ships" : "cargo");
}
function serviceCourseTrial(r: PortCourseRun, observeTrial?: PortTrialObserver) {
  for (let i = 0; i < 24; i++) {
    const step = nextPortCourseStep(r);
    if (!step || ["advance", "course-plan", "start", "resume"].includes(step.command.kind)) break;
    const before = r.simulation.attempts.length;
    const result = act(r.simulation, step.command as PortCommand);
    if (r.simulation.attempts.length > before) observeTrial?.(r.simulation);
    if (result.outcome !== "applied") break;
  }
}
export function portCourseView(r: PortCourseRun) {
  const view = portStudentView(r.simulation);
  view.status = r.complete ? "completed" : view.status;
  view.attempts = r.simulation.attempts.slice(r.baselineAttempts).slice(-40);
  if (r.unit === "arrival" || r.unit === "departure") view.notices = view.notices.filter(n => n.object === "S01");
  if (r.unit === "yard") { view.batches = view.batches.filter(b => b.flow === "import"); view.boxes = view.boxes.filter(b => view.batches.some(batch => batch.id === b.batchId)); }
  const goals = portCourseGoals(r);
  return { view, lesson: { unit: r.unit, complete: r.complete, goals, performance: portCoursePerformance(r), elapsed: r.simulation.second - r.startSecond, prepared: portCourseDefinition(r.unit).prepared } };
}
/** Completion and management quality remain separate, inspectable evidence. */
export function portCoursePerformance(r: PortCourseRun) {
  const s = r.simulation, attempts = s.attempts.slice(r.baselineAttempts);
  const documents = r.unit === "arrival" ? [s.calls.S01!.docs.entry, s.calls.S01!.docs.health, s.calls.S01!.docs.border]
    : r.unit === "departure" ? [s.calls.S01!.docs.departure] : Object.values(s.batches).filter(b => r.unit !== "yard" || b.flow === "import").map(b => b.document);
  const submitted = documents.flatMap(d => d.submittedAt === undefined ? [] : [d.submittedAt]);
  const submissions = attempts.filter(a => a.outcome === "applied" && (a.order.kind === "document" || a.order.kind === "batch-document"));
  return { elapsed: s.second - r.startSecond, cost: s.cost - (r.baselineCost ?? 0), distance: s.distance - (r.baselineDistance ?? 0), rehandles: s.rehandles - (r.baselineRehandles ?? 0),
    incorrect: attempts.filter(a => a.outcome === "incorrect").length,
    corrections: submissions.length - new Set(submissions.map(a => a.order.kind === "document" ? `${a.object}:${a.order.document}` : a.object)).size,
    submissionSpan: submitted.length > 1 ? Math.max(...submitted) - Math.min(...submitted) : 0 };
}
export type PortCourseView = ReturnType<typeof portCourseView>["lesson"];
export function serializePortCourse(r: PortCourseRun, demo = false) { return JSON.stringify({ schema: r.schema, ...(r.schema !== "port-course/1.0" ? { navigationVersion: PORT_NAVIGATION_VERSION } : {}), unit: r.unit, demo, fixture: r.fixture, commands: r.commands, inputLog: r.inputLog ?? [], traceCoverage: r.traceCoverage ?? "complete" }); }
export function restorePortCourse(raw: string) {
  const data = JSON.parse(raw);
  if (![PORT_COURSE_SCHEMA, "port-course/1.0", "port-course/1.1"].includes(data.schema) || !isPortCourseUnit(data.unit) || !Array.isArray(data.commands) || data.commands.length > 50000) throw new Error("课程分段记录无效。");
  if(data.schema !== "port-course/1.0" && data.navigationVersion !== PORT_NAVIGATION_VERSION) throw new Error("航行规则版本无效。");
  const r = createPortCourse(data.unit, data.schema);
  const inputs = data.inputLog ?? data.commands;
  if (!Array.isArray(inputs) || inputs.length > 50000) throw new Error("操作记录过多。");
  for (const command of inputs) applyPortCourseCommand(r, command, data.demo === true);
  r.traceCoverage = data.inputLog && data.traceCoverage !== "legacy" ? "complete" : "legacy";
  if (!r.complete && r.simulation.status === "running") applyPortCourseCommand(r, { kind: "pause" });
  return r;
}
