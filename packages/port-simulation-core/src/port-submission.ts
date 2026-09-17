import { applyPortCommand, createPortSession } from "./port-operations-engine.js";
import { applyPortCourseCommand, createPortCourse, isPortCourseUnit, portCourseGoals, portCoursePerformance, type PortCourseCommand, type PortCourseRun, type PortCourseSelection } from "./port-course.js";
import { portReport, portScore, portReferenceCost } from "./port-operations-review.js";
import { PORT_HORIZON, PORT_ARRIVAL_GENERATOR, cleanPortConfig, cleanPortPlan, type PortSession, type PortResult } from "./port-operations-model.js";
import { PORT_NAVIGATION_VERSION } from "./port-navigation.js";
import { portStudentView } from "./port-operations-view.js";

export const PORT_SUBMISSION_SCHEMA = "port-experiment-submission/1";
export const PORT_VERIFIER_VERSION = "port-verifier/1";
export interface PortSubmissionPackage {
  schema: typeof PORT_SUBMISSION_SCHEMA;
  unit: PortCourseSelection;
  ended: "student" | "completed";
  record: string;
  expected: { stateHash: string; score: number };
}
export interface PortEvidenceNode {
  index: number;
  commandIndex: number;
  at: number;
  afterAt: number;
  source: "student" | "system_preset" | "system_trial";
  object: string;
  command: unknown;
  result: PortResult;
  before: unknown;
  after: unknown;
}
export interface PortSubmissionResult {
  performance?: ReturnType<typeof portCoursePerformance>;
  score: number;
  unit: PortCourseSelection;
  mode: "practice" | "battle";
  second: number;
  elapsed: number;
  complete: boolean;
  traceCoverage: "complete" | "legacy";
  stateHash: string;
  verifier: string;
  goals: Array<{ id: string; label: string; done: boolean }>;
  breakdown: ReturnType<typeof portScore> | null;
  commands: number;
}

const known = new Set(["start", "pause", "resume", "interrupt", "advance", "document", "batch-document", "plan-berth", "move", "work", "depart", "assign-yard", "yard-use", "inspect", "dispatch", "repair", "handover", "course-plan"]);
function validateCommand(c: PortCourseCommand) {
  if (!c || typeof c !== "object" || !known.has(c.kind)) throw new Error("未知或缺失的操作指令。");
  if (JSON.stringify(c).length > 100000) throw new Error("单条操作记录过大。");
  if (c.kind === "advance" && (!Number.isInteger(c.seconds) || c.seconds < 0 || c.seconds > PORT_HORIZON)) throw new Error("操作时钟无效。");
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("操作参数不是有限数值。");
    if (["callId", "batchId", "boxId", "yardId", "value"].includes(key) && (typeof value !== "string" || value.length > 500)) throw new Error("操作对象或文本参数无效。");
  }
}
function summary(s: PortSession, object = "") {
  return { second: s.second, status: s.status, cost: s.cost, berths: [...s.berths], anchors: [...s.anchors], channel: structuredClone(s.channel),
    call: s.calls[object] ? structuredClone(s.calls[object]) : undefined,
    batch: s.batches[object] ? structuredClone(s.batches[object]) : undefined,
    box: s.boxes[object] ? structuredClone(s.boxes[object]) : undefined,
    dispatch: structuredClone(s.plan.equipment.dispatch), jobs: s.jobs.length };
}
function objectOf(c: PortCourseCommand) { return "callId" in c ? c.callId : "batchId" in c ? c.batchId : "boxId" in c ? c.boxId : "yardId" in c ? c.yardId : c.kind; }
export async function portStateHash(s: PortSession) {
  // UI history, input capture and restoration pause labels are not business state.
  const { inputLog, traceCoverage, commands, pauseReason, ...state } = s;
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
}

/** Deterministic, read-only replay. Never restores into a live student's storage. */
export class PortSubmissionReplay {
  readonly data;
  readonly inputs: PortCourseCommand[];
  readonly unit: PortCourseSelection;
  readonly coverage: "complete" | "legacy";
  session!: PortSession;
  course?: PortCourseRun;
  position = 0;
  nodes: PortEvidenceNode[] = [];
  constructor(raw: string) {
    if (new TextEncoder().encode(raw).length > 20_000_000) throw new Error("复盘文件超过20 MB。");
    this.data = JSON.parse(raw);
    const d = this.data;
    const segment = ["port-course/1.0", "port-course/1.1", "port-course/1.2"].includes(d.schema);
    if (!segment && !["port-operations/3.0", "port-operations/3.1"].includes(d.schema)) throw new Error("不支持的实验版本。");
    if (segment && (!isPortCourseUnit(d.unit) || d.demo === true)) throw new Error("演示或未知分段不能提交。");
    if (["port-course/1.1", "port-course/1.2", "port-operations/3.1"].includes(d.schema) && d.navigationVersion !== PORT_NAVIGATION_VERSION) throw new Error("航行规则版本不一致。");
    if (!segment && d.generator !== PORT_ARRIVAL_GENERATOR) throw new Error("船期生成器版本不一致。");
    this.unit = segment ? d.unit : "full";
    if (d.traceCoverage === "complete" && !Array.isArray(d.inputLog)) throw new Error("缺失完整操作记录。");
    this.inputs = d.inputLog ?? d.commands;
    if (!Array.isArray(this.inputs) || this.inputs.length > 50000 || !Array.isArray(d.commands) || d.commands.length > 50000) throw new Error("操作记录无效或超过50,000条。");
    this.inputs.forEach(validateCommand);
    this.coverage = d.inputLog && d.traceCoverage !== "legacy" ? "complete" : "legacy";
    this.reset();
  }
  reset() {
    const d = this.data;
    this.course = this.unit === "full" ? undefined : createPortCourse(this.unit, d.schema);
    if (this.course && d.fixture && JSON.stringify(d.fixture) !== JSON.stringify(this.course.fixture)) throw new Error("分段预置、初始参数或方案与版本不一致。");
    if (!this.course && (JSON.stringify(cleanPortConfig(d.config)) !== JSON.stringify(d.config) || JSON.stringify(cleanPortPlan(d.initialPlan)) !== JSON.stringify(d.initialPlan))) throw new Error("初始参数或方案不合法。");
    this.session = this.course?.simulation ?? createPortSession(d.mode, d.config, d.initialPlan, d.schema);
    if (!this.course) {
      if (d.scoringVersion !== undefined && ![1, 2].includes(d.scoringVersion)) throw new Error("评分版本无效。");
      if (d.scoringVersion === undefined) delete this.session.scoringVersion; else this.session.scoringVersion = d.scoringVersion;
    }
    if (!this.course && JSON.stringify(d.schedule) !== JSON.stringify(this.session.schedules)) throw new Error("船期与初始参数不一致。");
    this.position = 0;
    this.nodes = [{ index: 0, commandIndex: 0, at: this.session.second, afterAt: this.session.second, source: "system_preset", object: "initial", command: null,
      result: { outcome: "applied", rule: "initial", message: "版本化初始现场；预置步骤不计作学生操作。", deduction: 0 }, before: null, after: summary(this.session) }];
  }
  step(collect = true, observeTrial?: (session: PortSession) => void) {
    if (this.position >= this.inputs.length) return;
    const c = this.inputs[this.position]!, object = objectOf(c), s = this.session;
    const before = collect ? summary(s, object) : null, at = s.second, old = s.attempts.length;
    const result = this.course ? applyPortCourseCommand(this.course, c, false, observeTrial) : c.kind === "course-plan" ? (() => { throw new Error("综合实训不能执行分段方案指令。"); })() : applyPortCommand(s, c);
    this.position++;
    if (collect) {
      if (this.course && c.kind === "advance") for (const a of s.attempts.slice(old)) this.nodes.push({ index: this.nodes.length, commandIndex: this.position, at: a.at, afterAt: a.at, source: "system_trial", object: a.object, command: a.order, result: a, before: JSON.parse(a.before), after: a.after ? JSON.parse(a.after) : null });
      this.nodes.push({ index: this.nodes.length, commandIndex: this.position, at, afterAt: s.second, source: "student", object, command: c, result, before, after: summary(s, object) });
    }
  }
  seek(position: number, collect = false) {
    const target = Math.min(this.inputs.length, Math.max(0, Math.floor(position)));
    if (target < this.position) this.reset();
    while (this.position < target) this.step(collect);
    return this.view();
  }
  view() { return portStudentView(this.session); }
  /** Render the exact state after an automatic trial operation without altering the live simulator. */
  trialView(commandIndex: number, trialIndex: number) {
    if (commandIndex < 1 || commandIndex > this.inputs.length || this.unit !== "planning") throw new Error("试运行节点无效。");
    this.reset();
    this.seek(commandIndex - 1);
    let view: ReturnType<typeof portStudentView> | undefined, index = 0;
    this.step(false, session => { if (index++ === trialIndex) view = structuredClone(portStudentView(session)); });
    if (!view) throw new Error("试运行节点不存在。");
    return view;
  }
  async result(requireEligible = true, verifiedReference?: { unitCost: number }): Promise<PortSubmissionResult> {
    const s = this.session, goals = this.course ? portCourseGoals(this.course).map(({ id, label, done }) => ({ id, label, done })) : [];
    if (requireEligible && !this.course && (s.mode !== "battle" || s.status !== "completed" || s.second !== PORT_HORIZON)) throw new Error("仅完成48小时的实战可以提交综合成绩。");
    const breakdown = this.course ? null : portScore(s, verifiedReference ?? portReferenceCost(s.config, s.schema));
    return { unit: this.unit, mode: s.mode, ...(this.course ? { performance: portCoursePerformance(this.course) } : {}), score: breakdown?.total ?? Math.round(goals.filter(g => g.done).length / goals.length * 10000) / 100,
      second: s.second, elapsed: s.second - (this.course?.startSecond ?? 0), complete: this.course?.complete ?? s.status === "completed",
      traceCoverage: this.coverage, stateHash: await portStateHash(s), verifier: PORT_VERIFIER_VERSION, goals, breakdown, commands: this.inputs.length };
  }
  report() { return portReport(this.session, !this.course); }
  assertRecord() {
    const actual = this.course?.commands ?? this.session.commands;
    if (JSON.stringify(actual) !== JSON.stringify(this.data.commands)) throw new Error("指令序列与完整操作证据不一致。");
    if (!this.course && this.data.status !== this.session.status) throw new Error("记录的结束状态与重放不一致。");
  }
}
export async function makePortSubmission(raw: string, actualState?: PortSession): Promise<PortSubmissionPackage> {
  const replay = new PortSubmissionReplay(raw);
  replay.seek(replay.inputs.length);
  replay.assertRecord();
  const result = await replay.result();
  if (actualState && await portStateHash(actualState) !== result.stateHash) throw new Error("记录重放与当前现场不一致，请保留导出文件。");
  return { schema: PORT_SUBMISSION_SCHEMA, unit: replay.unit, ended: result.complete ? "completed" : "student", record: raw, expected: { stateHash: result.stateHash, score: result.score } };
}
export async function verifyPortSubmission(pkg: PortSubmissionPackage) {
  if (pkg.schema !== PORT_SUBMISSION_SCHEMA || !["student", "completed"].includes(pkg.ended)) throw new Error("提交包版本或结束方式无效。");
  const replay = new PortSubmissionReplay(pkg.record);
  if (replay.unit !== pkg.unit) throw new Error("提交类型与实验记录不一致。");
  replay.seek(replay.inputs.length, true);
  replay.assertRecord();
  const result = await replay.result();
  if (pkg.ended !== (result.complete ? "completed" : "student")) throw new Error("结束方式与目标完成状态不一致。");
  if (result.stateHash !== pkg.expected?.stateHash || result.score !== pkg.expected?.score) throw new Error("提交结果与服务端重放不一致。");
  return { result, nodes: replay.nodes, report: replay.report() };
}
