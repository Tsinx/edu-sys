import { applyPortCommand, createPortSession, configurePortSession, portStudentView, portReferenceCost, rememberPortReference, restorePortSession, serializePortSession, portReport, createPortCourse, applyPortCourseCommand, portCourseView, serializePortCourse, restorePortCourse, nextPortCourseStep, type PortCourseRun, type PortCourseUnit, type PortCourseStep, type PortCommand, type PortConfig, type PortMode, type PortPlan, type PortSession } from "@edu/port-simulation-core";
let session: PortSession;
let course: PortCourseRun | undefined;
let demonstration: PortCourseStep | null = null;
let demo = false;
let initialized = false;
let reference: ReturnType<typeof portReferenceCost> | undefined;
type Request = {
    id: number;
    type: "init" | "configure" | "command" | "export" | "inspect" | "benchmark" | "reference" | "demo-step" | "demo-tick";
    course?: { unit: PortCourseUnit; demo: boolean };
    seconds?: number;
    act?: boolean;
    mode: PortMode;
    config: PortConfig;
    plan: PortPlan;
    raw?: string;
    command: PortCommand;
    boxId: string;
    reference: NonNullable<typeof reference>;
};
function snapshot(id: number, result?: unknown) {
    if (course) {
        const { view, lesson } = portCourseView(course);
        postMessage({ id, type: "state", view, lesson, demonstration, saved: serializePortCourse(course, demo), result });
    } else postMessage({ id, type: "state", view: portStudentView(session, reference), saved: serializePortSession(session, { suspend: true }), result });
}
self.onmessage = (event: MessageEvent<Request>) => {
    const m = event.data;
    try {
        if (m.type === "benchmark") {
            postMessage({ id: m.id, type: "benchmark", config: m.config, reference: portReferenceCost(m.config) });
            return;
        }
        if (m.type === "init") {
            initialized = false;
            course = undefined;
            demo = m.course?.demo ?? false;
            demonstration = null;
            if (m.course) {
                course = m.raw ? restorePortCourse(m.raw) : createPortCourse(m.course.unit);
                if (course.unit !== m.course.unit) throw new Error("存档与当前课程分段不一致。");
                session = course.simulation;
            } else session = m.raw ? restorePortSession(m.raw, true) : createPortSession(m.mode, m.config, m.plan);
            initialized = true;
            reference = undefined;
            snapshot(m.id);
            return;
        }
        if (!initialized)
            throw new Error("请先载入有效场次。");
        if (m.type === "configure") {
            if (course) {
                const result = applyPortCourseCommand(course, { kind: "course-plan", plan: m.plan }, demo);
                snapshot(m.id, result);
                return;
            }
            session = configurePortSession(session, m.config, m.plan, m.mode);
            reference = undefined;
            snapshot(m.id);
            return;
        }
        if (m.type === "reference") {
            if (JSON.stringify(m.config) !== JSON.stringify(session.config)) {
                postMessage({ id: m.id, type: "ignored" });
                return;
            }
            reference = m.reference;
            rememberPortReference(session.config, reference);
            snapshot(m.id);
            return;
        }
        if (m.type === "command") {
            if (demo && m.command.kind !== "pause") throw new Error("演示由课程脚本执行；返回自主练习后可下达指令。");
            const result = course ? applyPortCourseCommand(course, m.command) : applyPortCommand(session, m.command);
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
            return;
        }
        if (m.type === "export") {
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
