import assert from "node:assert/strict";
import test from "node:test";
import {
    PORT_HORIZON, createPortSession, advancePortSession, portStudentView,
    capturePortLearning, collectPortRiskEvidence, comparePortLearning,
    portLearningCsv, portObservationAdvance, portSampleQuantile, reviewPortRiskEvidence
} from "../src/index.js";

function observed() {
    const session = createPortSession("practice");
    session.taught.push("all");
    advancePortSession(session, 60);
    session.status = "paused";
    return session;
}

test("observation endpoints cannot overshoot despite delayed wall-clock ticks", () => {
    assert.equal(portObservationAdvance(20_000, 9_000, 21_600), 1600);
    assert.equal(portObservationAdvance(21_600, 20, 21_600), 0);
    assert.equal(portObservationAdvance(21_700, 20, 21_600), 0);
    assert.equal(portObservationAdvance(21_600, 20, null), 20);
    assert.equal(portObservationAdvance(PORT_HORIZON - 1, 100, PORT_HORIZON), 1);
});

test("snapshots exclude not-yet-arrived vessels and do not turn open observations into zero duration", () => {
    const session = observed();
    session.second = 7200;
    const first = session.calls.S01!;
    first.announced = true; first.arrivedAt = 3600; first.stage = "outer";
    const view = portStudentView(session);
    assert.ok(view.vessels.some(v => v.actualArrival === null));
    const snapshot = capturePortLearning(view, "run-a");
    assert.deepEqual(snapshot.vessels.map(v => v.id), ["S01"]);
    assert.equal(snapshot.openVessels, 1);
    assert.equal(snapshot.completedVessels, 0);
    assert.equal(snapshot.vessels[0]!.turnaroundMinutes, null);
    assert.equal(snapshot.vessels[0]!.elapsedMinutes, 60);
    assert.equal(snapshot.medianMinutes, null);
    assert.equal(snapshot.costPerCompletion, null);
    assert.ok(!/issueExpected|announceAt|"ata"/.test(JSON.stringify(snapshot)));
    view.plan.equipment.cranes++;
    assert.notEqual(snapshot.plan.equipment.cranes, view.plan.equipment.cranes);
});

test("even-size median and nearest-rank tail use only completed calls, preserving unfinished calls", () => {
    const session = observed();
    session.second = 24 * 3600;
    const calls = Object.values(session.calls).slice(0, 3);
    calls.forEach((call, i) => {
        call.announced = true; call.arrivedAt = 3600;
        call.stage = i < 2 ? "departed" : "outer";
        if (i < 2) call.milestones.depart = 3600 + [120, 240][i]! * 60;
    });
    const snapshot = capturePortLearning(portStudentView(session), "run-a");
    assert.equal(snapshot.medianMinutes, 180);
    assert.equal(snapshot.p90Minutes, 240);
    assert.equal(snapshot.openVessels, 1);
    assert.equal(snapshot.vessels[2]!.turnaroundMinutes, null);
    assert.equal(portSampleQuantile([], .9), null);
    assert.throws(() => portSampleQuantile([1, NaN], .9));
});

test("overdue incomplete cargo remains in the due denominator separately for import and export", () => {
    const session = observed();
    session.second = 24 * 3600;
    session.calls.S01!.announced = true; session.calls.S01!.arrivedAt = 3600;
    const imports = Object.values(session.batches).filter(b => b.callId === "S01" && b.flow === "import");
    session.boxes[imports[0]!.boxIds[0]!]!.deliveredAt = 7200;
    const snapshot = capturePortLearning(portStudentView(session), "run-a");
    assert.equal(snapshot.cargo.import.completed, 1);
    assert.ok(snapshot.cargo.import.due > 1);
    assert.equal(snapshot.cargo.import.overdueOpen, snapshot.cargo.import.due - 1);
    assert.equal(snapshot.cargo.import.onTimeDue, 1);
    assert.equal(snapshot.cargo.export.completed, 0);
    assert.equal(snapshot.cargo.export.overdueOpen, snapshot.cargo.export.due);
});

test("matching seeds alone cannot make different endpoints, cohorts or the same run a controlled pair", () => {
    const session = observed(); session.second = 7200;
    session.calls.S01!.announced = true; session.calls.S01!.arrivedAt = 3600;
    const a = capturePortLearning(portStudentView(session), "run-a");
    const b = structuredClone(a); b.runId = "run-b";
    assert.equal(comparePortLearning(a, b).comparable, true);
    assert.equal(comparePortLearning(a, a).comparable, false);
    b.second++;
    assert.match(comparePortLearning(a, b).blockers.join(), /观察终点/);
    b.second = a.second; b.vessels[0]!.arrival++;
    assert.match(comparePortLearning(a, b).blockers.join(), /队列/);
    b.vessels = structuredClone(a.vessels); b.config.variability = "high";
    assert.match(comparePortLearning(a, b).blockers.join(), /扰动/);
});

test("risk evidence follows actual faults and discovered boxes, with no mutation or invented authorization", () => {
    const session = observed(); session.second = 7200; session.failedCrane = 0;
    session.calls.S01!.announced = true;
    const box = Object.values(session.boxes)[0]!; box.issue = "open";
    const view = portStudentView(session), original = JSON.stringify(view);
    const evidence = collectPortRiskEvidence(view);
    const fault = evidence.find(e => e.kind === "fault")!;
    assert.match(fault.summary, /岸桥1故障/);
    assert.ok(evidence.some(e => e.kind === "box" && e.object === box.id));
    assert.equal(JSON.stringify(view), original);
    assert.match(reviewPortRiskEvidence(fault, "a", "b", view), /场次或时点/);
    view.failedCrane = null;
    assert.match(reviewPortRiskEvidence(fault, "a", "a", view), /不能仅凭此认定/);
    assert.ok(!/issueExpected/.test(JSON.stringify(evidence)));
});

test("CSV preserves open observations and capture requires a stable, started run", () => {
    const session = observed(); session.second = 7200;
    session.calls.S01!.announced = true; session.calls.S01!.arrivedAt = 3600;
    const view = portStudentView(session);
    const csv = portLearningCsv(capturePortLearning(view, "run-a"));
    assert.match(csv, /未完成/);
    assert.match(csv, /"3600","","60","","未完成"/);
    view.status = "running";
    assert.throws(() => capturePortLearning(view, "run-a"), /暂停/);
    view.status = "paused";
    assert.throws(() => capturePortLearning(view, ""), /暂停/);
});
