import { applyPortCourseCommand, createPortCourse, type PortCourseCommand, type PortCourseRun, type PortCourseUnit } from "./port-course.js";
import { portActiveResources, portCargoDone, portEntryReady, portYardUsage } from "./port-operations-engine.js";
import type { PortResult } from "./port-operations-model.js";

export const PORT_TUTORIAL_VERSION = "port-tutorial/1.1";
export type PortExperience = "practice" | "tutorial" | "demonstration";
export type PortTutorialGesture = "click" | "context" | "input" | "drag" | "observe";
export interface PortTutorialStep {
  id: string; title: string; instruction: string; why: string; targets: string[];
  focus: string; tab: string; gesture: PortTutorialGesture;
  phase: "action" | "waiting" | "running" | "blocked"; sceneGesture?: { source: string; destinations: string[] }; done: boolean; repeated?: boolean;
}
export interface PortTutorialRun { version: typeof PORT_TUTORIAL_VERSION; course: PortCourseRun; observed: string[]; stops: string[]; }
export function createPortTutorial(unit: PortCourseUnit): PortTutorialRun {
  return { version: PORT_TUTORIAL_VERSION, course: createPortCourse(unit), observed: [], stops: [] };
}

/** Tutorial gestures never supply commands. Every business predicate reads the actual kernel. */
export function portTutorialSteps(t: PortTutorialRun): PortTutorialStep[] {
  const r = t.course, s = r.simulation, c = s.calls.S01!, unit = r.unit;
  const batches = Object.values(s.batches).filter(b => unit !== "yard" || b.flow === "import");
  const seen = (key: string) => t.observed.includes(key);
  const steps: PortTutorialStep[] = [];
  const add = (id: string, title: string, instruction: string, why: string, done: boolean, targets: string[], tab = "ships", gesture: PortTutorialGesture = "click", focus = "S01", phase: PortTutorialStep["phase"] = "action", repeated = false) => steps.push({ id, title, instruction, why, done, targets, tab, gesture, focus, phase, repeated });
  if (unit === "arrival") add("dossier", "从船期打开船舶档案", "查看 S01 的首报与当前 ETA，再点“操作”；也可右键船舶打开档案。", "ETA 是到达预报，预约泊位还不代表船舶已经进港。", seen("ship-open"), ["forecast:S01", "ship-open"], "ships", "context");
  if (unit === "planning") {
    add("plan", "检查布局与设备，应用自选方案", "比较设备型号、数量和投入；可拖动地块交换位置。保留待核查区，检查后点“应用开局方案”。", "布局决定运输距离，设备与岗位共同决定真实作业能力；默认方案也可保留。", r.configured, ["plan-layout", "plan-equipment", "plan-apply"], "plan", "input", "Y1");
    add("plan-resources", "查看设备与岗位如何配合", "点“调度”查看岸桥与各岗位。需要调整时修改人数后点“应用调度”。", "已有合理配置可以保留，无需为完成教程强行更换方案。", seen("resources-open"), ["tab:resources"], "plan");
  }
  if (unit === "departure") add("cargo-check", "先核对已完成的箱记录", "打开“货批”，点一个箱号查看交接账本。", "本段装卸已经完成，离港准备仍需核对实际作业记录。", seen("box-record"), ["tab:cargo", "box-list"], "cargo", "observe");
  add("start", "启动教学现场", "点击“开始本段”。接下来需要操作时会停下，等待业务结果时可继续运行。", "这里是独立教学现场，不会推进你的自主练习。", s.status !== "ready", ["clock"], unit === "planning" ? "resources" : unit === "yard" || unit === "cargo" ? "cargo" : "ships");
  const shipDocs = unit === "arrival" ? ["entry", "health", "border"] as const : unit === "departure" ? ["departure"] as const : [];
  for (const document of shipDocs) {
    const d = c.docs[document], waiting = d.status === "submitted";
    const label = { entry: "进口岸申请", health: "检疫申报", border: "边检资料", departure: "出口岸准备" }[document];
    add(`doc:${document}`, waiting ? `${label}已受理，等待回执` : `核对${label}`, waiting ? "点击“继续运行”，观察该手续的回执状态。" : "对照上方航前资料中的航次号或在船人数，填写申报核对值，再点“核对并提交”；被退回时补正重报。", "提交只是受理，只有收到有效回执才满足流程条件。", d.status === "approved", waiting ? [`document:${document}`, "clock"] : ["ship-reference", `document:${document}`], "ships", waiting ? "observe" : "input", "S01", waiting ? "waiting" : "action", document === "border");
  }
  if (unit === "arrival") {
    add("arrival", "等待船舶实际到港", "继续运行，查看预报中的现场状态；实际到港后才能发出进港指令。", "计划靠泊只做预约，实际进港才取得目的位置预留。", c.stage !== "approach", ["clock", "forecast:S01"], "ships", "observe", "S01", "waiting");
    const transit = ["channel", "mooring"].includes(c.stage);
    const free = s.berths.map((id, i) => !id && (!s.schedules[0]!.large || i === 1) ? `destination:berth:${i}` : "").filter(Boolean);
    const anchors = c.stage === "outer" ? s.anchors.map((id,i)=>!id ? `destination:anchor:${i}` : "").filter(Boolean) : [];
    const allowed = portEntryReady(c) && !s.channel && (free.length > 0 || anchors.length > 0);
    add("berth", c.stage === "anchored" ? "从候泊锚位移往泊位" : "把船舶安排到可用泊位", transit ? "船舶正在通行或系泊，继续运行查看实际靠妥。" : allowed ? "按住舞台上的 S01 船舶，拖到发光的兼容空泊位或候泊锚位后松开；也可在工作台选择目标并申请进港。" : "检查手续、航道和泊位。可以调整目的位置，或继续运行等待释放；候泊后仍需安排移泊。", "拖到候泊锚位会先等泊；实际抵达并靠妥才完成入港教学。", c.stage === "berthed", transit ? ["clock", "navigation-status", "ship-status"] : ["ship-drag", ...free, ...anchors, "ship-move"], "ships", transit ? "observe" : "drag", "S01", transit ? "waiting" : allowed ? "action" : "blocked");
  }
  if (unit === "cargo" || unit === "yard") {
    if (unit === "yard") add("dispatch", "接续运输、堆场与闸口岗位", "拖动岗位卡可转配 1 人；也可填写各岗位人数后点“应用调度”。为运输、堆场和闸口分别安排人员。", "岸侧积压需要设备与班组接续，人员暂缺属于资源约束。", portActiveResources(s).truck > 0 && portActiveResources(s).yard > 0 && portActiveResources(s).gate > 0, ["resources", "dispatch-apply"], "resources", "input");
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i]!, waiting = b.document.status === "submitted";
      const yards = s.plan.yards.filter(y => (y.use === b.flow || y.use === "mixed") && portYardUsage(s, y.id).available > 0);
      add(`yard:${b.id}`, `为${b.id}安排${b.flow === "import" ? "进口" : "出口"}堆场`, yards.length ? "按住货批卡，拖到发光的合适堆场；或先选择货批，再点目标堆场。" : "当前缺少可用堆场。打开规划调整用途或释放容量，再回来分配。", "按批次安排一次，实际运输和交接自动逐箱记录；不同的有效堆场都可以。", !!b.targetYard, [`batch:${b.id}`, ...yards.map(y => `yard-target:${y.id}`), "batch-destination"], "cargo", "drag", b.id, yards.length ? "action" : "blocked", i > 0);
      add(`batch-doc:${b.id}`, waiting ? `${b.id}已提交，等待核验` : `核对${b.id}的关联资料`, waiting ? "继续运行，等待货物资料核验通过。" : "对照“提单原始关联”填写核对值，再提交货物资料核验。", "堆场安排不能替代货物资料；箱记录会保留实际关联。", b.document.status === "approved", waiting ? [`batch-document:${b.id}`, "clock"] : ["batch-reference", `batch-document:${b.id}`], "cargo", waiting ? "observe" : "input", b.id, waiting ? "waiting" : "action", i > 0);
    }
    if (unit === "cargo") {
      add("resources", "查看岸桥和运输班组", "点“调度”查看岗位与设备能力。可拖动岸桥到泊位，或修改数字后应用调度。", "已有合理配置无需重复修改；作业能力由真实资源决定。", seen("resources-open"), ["tab:resources"], "cargo");
      add("work", "启动船岸装卸", "点“组织装卸”，让岸桥按实际资源接续作业。", "手续已办妥、船舶已靠妥，才能组织装卸。", c.working || portCargoDone(s, "S01"), ["ship-work"], "ships");
    }
    const issue = Object.values(s.boxes).find(b => b.issue !== "none");
    if (unit === "yard" && issue) {
      add("issue-open", "定位待核查箱", "点击标注“待核查”的箱号，打开它的交接账本。", "异常限制应落在实际关联对象上，其他箱可以继续作业。", seen(`box:${issue.id}`) || issue.issue === "resolved", [`box:${issue.id}`], "cargo", "click", issue.id);
      add("inspect", issue.issue === "reported" ? "核查已委托，等待结果" : "选择待核查区并发起委托", issue.issue === "reported" ? "继续运行，等待送检与核查完成。" : "选择待核查区，点击“送检并委托核查”。", "送检、复核与解除限制均保留真实交接记录。", issue.issue === "resolved", issue.issue === "reported" ? ["clock", "box-record"] : ["inspection", "inspect-submit"], "cargo", issue.issue === "reported" ? "observe" : "input", issue.id, issue.issue === "reported" ? "waiting" : "action");
    }
  }
  if (["cargo", "yard", "planning"].includes(unit)) {
    const a = portActiveResources(s), blocked = !a.truck || !a.yard || !a.gate || (unit !== "yard" && !a.quay);
    add("flow", blocked ? "补足资源，继续现场作业" : "观察真实箱流完成", blocked ? "点“调度”，检查岸桥、车辆、场桥、闸口及岗位；调整后继续运行。" : "点击“继续运行”，观察装卸、运输与交付。可调速，已完成工作会保留。", unit === "planning" ? "试运行至少完成 12 箱进口提离与 12 箱出口装船，才能验证方案。" : "配置正确还不等于作业完成，需要设备实际处理货物。", r.complete, blocked ? ["resources", "dispatch-apply", "clock"] : ["clock", "cargo-result"], blocked ? "resources" : "cargo", "observe", "S01", blocked ? "blocked" : "waiting");
    add("ledger", "打开一个箱号，复核交接账本", "点一个箱号，查看它的位置、操作时间与交接路径。", "这些记录来自刚才的实际作业，不需要逐箱手工登记。", seen("box-record-after-flow"), ["box-list"], "cargo", "observe");
  }
  if (unit === "departure") {
    const leaving = ["unmooring", "channel"].includes(c.stage);
    add("depart", leaving ? "观察离泊与航道释放" : "下达离港指令", leaving ? "继续运行，观察船舶离港；泊位与航道会在实际离开后释放。" : "确认出口岸回执后，点击“离泊出港”。航道占用时可继续等待。", "下令不会瞬间释放所有资源，资源释放由实际位置决定。", c.stage === "departed" && !s.channel && s.berths.every(id => !id), leaving ? ["clock", "navigation-status", "ship-status"] : ["ship-depart"], "ships", leaving ? "observe" : "click", "S01", leaving || !!s.channel ? "waiting" : "action");
  }
  add("review", "查看本段实际操作结果", "点击“复盘”，核对完成状态和处置记录。", "操作教学完成后返回原练习，独立完成本段任务。", r.complete && seen("review-after-complete"), ["tab:review"], "review", "observe");
  return steps.map(step => {
    const clock = step.targets.includes("clock"), running=s.status==="running";
    const targets=step.targets.flatMap(target=>target!=="clock"?[target]:s.status==="ready"?["clock:start"]:s.status==="paused"?["clock:resume"]:[]);
    const next: PortTutorialStep = {...step,targets,phase:step.phase==="waiting"&&running?"running":step.phase};
    if(clock&&running&&step.phase!=="action") next.instruction = "正在运行，请观察" + (step.id==="berth"||step.id==="depart"?"船舶的航速、转弯和实际位置；到达教学节点后会自动停下。":step.id==="flow"?"真实箱流与作业结果；任务完成后会自动停下。":"现场状态与业务回执；收到结果后会自动停下。");
    if(step.id==="berth" && step.gesture==="drag" && ["outer","anchored"].includes(c.stage) && portEntryReady(c) && !s.channel) next.sceneGesture={source:c.id,destinations:targets.filter(k=>k.startsWith("destination:")).map(k=>k.slice(12))};
    return next;
  });
}
export function portTutorialView(t: PortTutorialRun) {
  const steps = portTutorialSteps(t), current = steps.find(s => !s.done) ?? null;
  return { version: t.version, unit: t.course.unit, steps, current, complete: !current, completed: steps.filter(s => s.done).length, total: steps.length };
}
export type PortTutorialView = ReturnType<typeof portTutorialView>;
const ok = (message: string): PortResult => ({ outcome: "applied", rule: "tutorial", message, deduction: 0 });
export function observePortTutorial(t: PortTutorialRun, target: string) {
  const s = t.course.simulation;
  const allowed = ["ship-open", "resources-open", "review-open"];
  if (allowed.includes(target) && !t.observed.includes(target)) t.observed.push(target);
  if (target === "review-open" && t.course.complete && !t.observed.includes("review-after-complete")) t.observed.push("review-after-complete");
  if (target.startsWith("box:")) {
    const b = s.boxes[target.slice(4)];
    if (b && b.history.length) {
      for (const key of [target, "box-record", ...(t.course.complete ? ["box-record-after-flow"] : [])]) if (!t.observed.includes(key)) t.observed.push(key);
    }
  }
  stopAtNewStep(t);
  return ok("已查看现场资料。");
}
function stopAtNewStep(t: PortTutorialRun) {
  const current = portTutorialView(t).current;
  // One stop per step, not per render, resume, repeated click or status refresh.
  const key = current?.id === "berth" && t.course.simulation.calls.S01!.stage === "anchored" ? "berth:anchored" : current?.id ?? "complete";
  if (!t.stops.includes(key)) {
    t.stops.push(key);
    if (t.course.simulation.status === "running") {
      t.course.simulation.status = "paused";
      t.course.simulation.pauseReason = current ? `操作教学：${current.title}` : "本段操作教学已完成。";
    }
  }
}
export function applyPortTutorialCommand(t: PortTutorialRun, command: PortCourseCommand): PortResult {
  if (command.kind !== "advance") {
    const result = applyPortCourseCommand(t.course, command, true);
    if (result.outcome === "applied") stopAtNewStep(t);
    return result;
  }
  if (!Number.isInteger(command.seconds) || command.seconds < 0 || command.seconds > 172800) throw new Error("无效推进量。");
  const s = t.course.simulation, target = s.second + command.seconds;
  while (s.status === "running" && s.second < target && !t.course.complete) {
    // Stop at the actual next discrete event, including feedback within a large clock tick.
    const next = Math.min(target, ...s.events.filter(e => e.at > s.second).map(e => e.at), ...s.jobs.filter(j => j.end !== null && j.end! > s.second).map(j => j.end!));
    applyPortCourseCommand(t.course, { kind: "advance", seconds: Math.max(1, Math.min(next - s.second, 30)) }, true);
    stopAtNewStep(t);
  }
  return ok("教学现场已推进，完成状态由实际作业验证。");
}
