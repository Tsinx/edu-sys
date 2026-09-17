import { applyPortCommand, createPortSession, configurePortSession, portStudentView, portReferenceCost, rememberPortReference, restorePortSession, serializePortSession, portReport, createPortCourse, applyPortCourseCommand, portCourseView, serializePortCourse, restorePortCourse, nextPortCourseStep, type PortCourseRun, type PortCourseUnit, type PortCourseStep, type PortCommand, type PortConfig, type PortMode, type PortPlan, type PortSession } from "@edu/port-simulation-core";
import { createPortTutorial, applyPortTutorialCommand, observePortTutorial, portTutorialView, type PortTutorialRun } from "@edu/port-simulation-core";
import { makePortSubmission } from "@edu/port-simulation-core";
let session: PortSession;
let tutorial: PortTutorialRun | undefined;
let course: PortCourseRun | undefined;
let demonstration: PortCourseStep | null = null;
let demo = false;
let initialized = false;
let sealed = false;
const save = (raw: string) => JSON.stringify({ ...JSON.parse(raw), sealed });
let reference: ReturnType<typeof portReferenceCost> | undefined;
type Request = {
    id: number;
    type: "init" | "configure" | "command" | "export" | "seal" | "inspect" | "benchmark" | "reference" | "demo-step" | "demo-tick" | "tutorial-observe";
    course?: { unit: PortCourseUnit; demo: boolean; tutorial?: boolean };
    target?: string;
    seconds?: number;
    act?: boolean;
    mode: PortMode;
    config: PortConfig;
    plan: PortPlan;
    raw?: string;
    schema?: PortSession["schema"];
    command: PortCommand;
    boxId: string;
    reference: NonNullable<typeof reference>;
};
function snapshot(id: number, result?: unknown) {
    if (course) {
        const { view, lesson } = portCourseView(course);
        postMessage({ id, type: "state", view, lesson, sealed, demonstration, tutorial: tutorial ? portTutorialView(tutorial) : undefined, saved: tutorial ? undefined : save(serializePortCourse(course, demo)), result });
    } else postMessage({ id, type: "state", sealed, view: portStudentView(session, reference), saved: save(serializePortSession(session, { suspend: true })), result });
}
self.onmessage = async (event: MessageEvent<Request>) => {
    const m = event.data;
    try {
        if (m.type === "benchmark") {
            postMessage({ id: m.id, type: "benchmark", config: m.config, reference: portReferenceCost(m.config, m.schema) });
            return;
        }
        if (m.type === "init") {
            initialized = false;
            sealed = m.raw ? JSON.parse(m.raw).sealed === true : false;
            course = undefined;
            tutorial = undefined;
            demo = m.course?.demo ?? false;
            demonstration = null;
            if (m.course) {
                if (m.course.tutorial && m.raw) throw new Error("操作教学不接受练习存档。");
                tutorial = m.course.tutorial ? createPortTutorial(m.course.unit) : undefined;
                course = tutorial?.course ?? (m.raw ? restorePortCourse(m.raw) : createPortCourse(m.course.unit, m.schema === "port-operations/3.0" ? "port-course/1.0" : "port-course/1.2"));
                if (course.unit !== m.course.unit) throw new Error("存档与当前课程分段不一致。");
                session = course.simulation;
            } else session = m.raw ? restorePortSession(m.raw, true) : createPortSession(m.mode, m.config, m.plan, m.schema);
            initialized = true;
            reference = undefined;
            snapshot(m.id);
            return;
        }
        if (!initialized)
            throw new Error("请先载入有效场次。");
        if (m.type === "seal") {
            if (tutorial || demo) throw new Error("演示和操作教学不能提交。");
            if (!course && (session.mode !== "battle" || session.status !== "completed")) throw new Error("请完成48小时实战后提交。");
            if (!course && !reference) throw new Error("同情境评分基准正在计算，请稍后提交。");
            if (course && session.status === "running") applyPortCourseCommand(course, { kind: "pause" });
            sealed = true;
            snapshot(m.id);
            try {
                const raw = save(course ? serializePortCourse(course) : serializePortSession(session));
                const pkg = await makePortSubmission(raw, session);
                postMessage({ id: m.id, type: "sealed", package: pkg });
            } catch (error) { postMessage({ id: m.id, type: "seal-error", message: (error as Error).message }); }
            return;
        }
        if (sealed && ["command", "configure", "demo-step", "demo-tick"].includes(m.type)) throw new Error("本次实验已封存，请重练开始新记录。");
        if (m.type === "tutorial-observe") {
            if (!tutorial) throw new Error("当前不是操作教学。");
            const result = observePortTutorial(tutorial, m.target ?? "");
            snapshot(m.id, result);
            return;
        }
        if (m.type === "configure") {
            if (course) {
                const result = tutorial ? applyPortTutorialCommand(tutorial, { kind: "course-plan", plan: m.plan }) : applyPortCourseCommand(course, { kind: "course-plan", plan: m.plan }, demo);
                snapshot(m.id, result);
                return;
            }
            session = configurePortSession(session, m.config, m.plan, m.mode);
            reference = undefined;
            snapshot(m.id);
            return;
        }
        if (m.type === "reference") {
            if (m.schema !== session.schema || JSON.stringify(m.config) !== JSON.stringify(session.config)) {
                postMessage({ id: m.id, type: "ignored" });
                return;
            }
            reference = m.reference;
            rememberPortReference(session.config, reference, session.schema);
            snapshot(m.id);
            return;
        }
        if (m.type === "command") {
            if (demo && m.command.kind !== "pause") throw new Error("演示由课程脚本执行；返回自主练习后可下达指令。");
            const result = tutorial ? applyPortTutorialCommand(tutorial, m.command) : course ? applyPortCourseCommand(course, m.command) : applyPortCommand(session, m.command);
            snapshot(m.id, result);
            return;
        }
        if (m.type === "demo-step" || m.type === "demo-tick") {
            if (!course || !demo) throw new Error("当前不是课程演示。");
            let result;
            if (m.type === "demo-step" || m.act) {
                const step = nextPortCourseStep(course);
                if (step) {
                    demonstration = step;
                    if (m.type === "demo-step" || step.command.kind !== "advance") result = applyPortCourseCommand(course, step.command, true);
                }
            }
            if (m.type === "demo-tick" && m.seconds) applyPortCourseCommand(course, { kind: "advance", seconds: m.seconds }, true);
            snapshot(m.id, result);
            return;
        }
        if (m.type === "inspect") {
            const b = session.boxes[m.boxId];
            if (!b || !session.calls[session.batches[b.batchId]!.callId]!.announced)
                throw new Error("对象尚未公布。");
            postMessage({ id: m.id, type: "inspect", box: { ...b, issueExpected: undefined } });
            if (tutorial) { observePortTutorial(tutorial, `box:${m.boxId}`); snapshot(m.id); }
            return;
        }
        if (m.type === "export") {
            if (tutorial) throw new Error("操作教学不导出自主练习记录或成绩。");
            if (course) {
                postMessage({ id: m.id, type: "export", raw: serializePortCourse(course, demo) });
                return;
            }
            if (!["completed", "interrupted"].includes(session.status))
                throw new Error("请在场次结束后导出，避免提前披露后续船期。");
            if (!reference)
                throw new Error("同情境参考成本正在计算，请稍后导出。");
            postMessage({ id: m.id, type: "export", raw: serializePortSession(session, { review: true }), report: portReport(session) });
        }
    }
    catch (error) {
        postMessage({ id: m.id, type: "error", message: (error as Error).message });
    }
};
