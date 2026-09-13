import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { PORT_HORIZON, applyPortCommand as act, advancePortSession as advance, createPortSession, defaultPortConfig, defaultPortPlan, generatePortSchedule, samplePortGap, portRng, portTriangle, portStudentView, portCargoDone, portScore, portDeadline, portYardUsage, portHandoverItems, servicePortReference, runPortReference, serializePortSession, restorePortSession, type PortSession } from "../src/index.js";
const docs = (s: PortSession) => { for (const c of Object.values(s.calls).filter(c => c.announced))
    for (const kind of ["entry", "health", "border", "departure"] as const)
        act(s, { kind: "document", callId: c.id, document: kind, value: c.docs[kind].reference }); };
const start = () => { const s = createPortSession("battle"); act(s, { kind: "start" }); return s; };
const digest = (s: PortSession) => createHash("sha256").update(JSON.stringify({ ...s, commands: undefined })).digest("hex");
test("arrival streams reproduce the selected sample and maintain configured large-sample means", () => {
    const config = defaultPortConfig(), v = generatePortSchedule(config);
    assert.deepEqual(v.slice(0, 3).map(v => [v.id, v.eta / 60, v.unload, v.load, v.referenceService / 60, v.large]), [["S01", 60, 116, 78, 272.5, false], ["S02", 154, 140, 93, 321.25, false], ["S03", 201, 94, 62, 225, true]]);
    assert.deepEqual(generatePortSchedule(config), v);
    assert.ok(v.some(v => v.eta > PORT_HORIZON));
    for (const variability of ["low", "normal", "high"] as const) {
        const c = { ...config, variability }, rng = portRng(479), work = portRng(912);
        let gaps = 0, service = 0;
        for (let i = 0; i < 100000; i++) {
            const gap = samplePortGap(rng, c);
            assert.ok(gap >= 15);
            gaps += gap;
            service += 30 + 1.25 * portTriangle(work(), 72, 168, 264);
        }
        assert.ok(Math.abs(gaps / 100000 - 300) < 2);
        assert.ok(Math.abs(service / 100000 - 240) < 1);
        assert.ok(gaps > service);
    }
    assert.throws(() => generatePortSchedule({ ...config, meanGapMinutes: 240 }), /大于/);
    const variants = generatePortSchedule({ ...config, variability: "high" });
    assert.deepEqual(variants.slice(0, 3).map(v => [v.unload, v.load, v.large, v.ata - v.eta]), v.slice(0, 3).map(v => [v.unload, v.load, v.large, v.ata - v.eta]));
    let overtook = false;
    for (let seed = 1; seed < 300 && !overtook; seed++) {
        const xs = generatePortSchedule({ ...config, seed, variability: "high" });
        overtook = xs.some((v, i) => i > 0 && v.ata < xs[i - 1]!.ata);
    }
    assert.ok(overtook, "actual arrival order can differ from original ETA order");
});
test("student projection contains only announced calls and no future actual arrivals or latent anomalies", () => {
    const s = start(), view = portStudentView(s);
    assert.deepEqual(view.vessels.map(v => v.id), ["S01", "S02", "S03"]);
    assert.equal(view.vessels[0]!.actualArrival, null);
    assert.equal(JSON.stringify(view).includes('"ata"'), false);
    assert.equal(JSON.stringify(view).includes("issueExpected"), false);
    assert.equal(JSON.stringify(view).includes("S04"), false);
    const first = view.vessels[0]!.firstEta;
    advance(s, 4260);
    assert.equal(portStudentView(s).vessels[0]!.actualArrival, 4260);
    assert.equal(portStudentView(s).vessels[0]!.firstEta, first);
    const delayed = s.schedules.find(v => v.ata > v.eta)!;
    advance(s, Math.max(0, delayed.eta + 1 - s.second));
    assert.ok(portStudentView(s).vessels.some(v => v.id === delayed.id));
});
test("practice pauses at the first new topic and exact arrival boundary, while battle rejects pause", () => {
    const s = createPortSession();
    act(s, { kind: "start" });
    assert.equal(s.status, "paused");
    assert.equal(s.second, 0);
    assert.deepEqual(s.taught, ["documents"]);
    docs(s);
    act(s, { kind: "resume" });
    assert.equal(s.status, "paused");
    assert.deepEqual(s.taught, ["documents", "yard"]);
    act(s, { kind: "resume" });
    advance(s, PORT_HORIZON);
    assert.equal(s.second, 4260);
    assert.equal(s.status, "paused");
    act(s, { kind: "resume" });
    advance(s, 60);
    assert.equal(s.second, 4320);
    assert.equal(s.status, "running");
    assert.equal(s.taught.filter(t => t === "arrival").length, 1);
    assert.equal(act(s, { kind: "move", callId: "S01", target: "berth", slot: 0 }).outcome, "applied");
    advance(s, 20000);
    assert.equal(s.second, 6420);
    assert.equal(s.status, "paused");
    assert.equal(s.taught.at(-1), "work");
    assert.equal(digest(restorePortSession(serializePortSession(s))), digest(s));
    const b = start();
    assert.equal(act(b, { kind: "pause" }).outcome, "stale");
    advance(b, 7200);
    assert.equal(b.status, "running");
    assert.equal(b.second, 7200);
});
test("incorrect orders are deduplicated per object and rule; invalid forms and waits do not penalize", () => {
    for (const mode of ["practice", "battle"] as const) {
        const s = createPortSession(mode);
        act(s, { kind: "start" });
        for (let n = 0; n < 3; n++)
            act(s, { kind: "work", callId: "S01", running: true });
        assert.equal(portScore(s).deductions, mode === "battle" ? 5 : 0);
        assert.equal(act(s, { kind: "document", callId: "S01", document: "border", value: "" }).outcome, "invalid");
        assert.equal(act(s, { kind: "move", callId: "not-published", target: "anchor", slot: 0 }).outcome, "stale");
        assert.equal(portScore(s).deductions, mode === "battle" ? 5 : 0);
    }
    const s = start();
    docs(s);
    advance(s, 36 * 3600);
    docs(s);
    advance(s, 600);
    const xs = Object.values(s.calls).filter(c => c.arrivedAt !== null);
    assert.ok(xs.length >= 7);
    assert.equal(act(s, { kind: "move", callId: xs[0]!.id, target: "berth", slot: 0 }).outcome, "applied");
    assert.equal(s.berths[0], xs[0]!.id);
    assert.equal(act(s, { kind: "move", callId: xs[1]!.id, target: "berth", slot: 1 }).rule, "channel-busy");
    advance(s, 2100);
    assert.equal(act(s, { kind: "move", callId: xs[1]!.id, target: "berth", slot: 1 }).outcome, "applied");
    advance(s, 2100);
    assert.equal(act(s, { kind: "move", callId: "S03", target: "berth", slot: 0 }).rule, "compatibility");
    for (let i = 0; i < 4; i++) {
        assert.equal(act(s, { kind: "move", callId: xs[i + 2]!.id, target: "anchor", slot: i }).outcome, "applied");
        assert.equal(s.anchors[i], xs[i + 2]!.id);
        advance(s, 1200);
        assert.equal(s.channel, null);
    }
    assert.equal(act(s, { kind: "move", callId: xs[6]!.id, target: "anchor", slot: 0 }).rule, "destination-busy");
    assert.equal(s.calls[xs[6]!.id]!.stage, "outer");
    assert.equal(new Set([...s.berths, ...s.anchors]).size, 6);
    assert.equal(portScore(s).deductions, 0);
});
test("material corrections do not alter manifests; customs applies to its whole associated bill", () => {
    const s = start();
    act(s, { kind: "batch-document", batchId: "S01-E1", value: "wrong/1" });
    advance(s, 900);
    assert.equal(s.batches["S01-E1"]!.document.status, "correction");
    assert.equal(s.batches["S01-E1"]!.customs, false);
    assert.equal(s.batches["S01-E1"]!.boxIds.length, 39);
    act(s, { kind: "batch-document", batchId: "S01-E1", value: s.batches["S01-E1"]!.reference });
    advance(s, 900);
    assert.equal(s.batches["S01-E1"]!.customs, true);
    assert.equal(s.batches["S01-E2"]!.customs, false);
    assert.equal(portScore(s).deductions, 0);
    assert.equal(act(s, { kind: "yard-use", yardId: "Y6", use: "mixed" }).outcome, "waiting");
    assert.equal(act(s, { kind: "assign-yard", batchId: "S01-I1", yardId: "Y3" }).outcome, "waiting");
});
test("resource pauses retain partial work and reallocating cranes never teleports a box", () => {
    const s = start();
    docs(s);
    advance(s, 4260);
    act(s, { kind: "move", callId: "S01", target: "berth", slot: 0 });
    advance(s, 2100);
    act(s, { kind: "work", callId: "S01", running: true });
    advance(s, 60);
    const job = s.jobs.find(j => j.kind === "quay")!, id = job.boxId;
    const before = structuredClone(s.boxes[id]);
    const d = structuredClone(s.plan.equipment.dispatch);
    d.berthCranes = [0, 4];
    act(s, { kind: "dispatch", dispatch: d });
    const remaining = s.jobs.find(j => j.boxId === id)!.remaining;
    assert.ok(remaining < 1 && remaining > 0);
    assert.equal(s.jobs.find(j => j.boxId === id)!.rate, 0);
    advance(s, 300);
    assert.deepEqual(s.boxes[id], before);
    assert.equal(s.jobs.find(j => j.boxId === id)!.remaining, remaining);
    d.berthCranes = [2, 2];
    act(s, { kind: "dispatch", dispatch: d });
    advance(s, 100);
    assert.equal(s.boxes[id]!.location, "quay:S01");
    assert.equal(s.boxes[id]!.history.length, 1);
});
test("reassigning stocked batches creates real relocation and cannot exceed yard reservations", () => {
    const s = start();
    docs(s);
    for (const id of ["S01-I1", "S01-I2"])
        act(s, { kind: "assign-yard", batchId: id, yardId: id.endsWith("1") ? "Y1" : "Y2" });
    advance(s, 4260);
    act(s, { kind: "move", callId: "S01", target: "berth", slot: 0 });
    advance(s, 2100);
    act(s, { kind: "work", callId: "S01", running: true });
    advance(s, 6000);
    const stocked = s.batches["S01-I1"]!.boxIds.map(id => s.boxes[id]!).find(b => b.location === "yard:Y1")!;
    assert.ok(stocked);
    const historyLength = stocked.history.length;
    const d = structuredClone(s.plan.equipment.dispatch);
    d.drivers = 0;
    act(s, { kind: "dispatch", dispatch: d });
    act(s, { kind: "assign-yard", batchId: "S01-I1", yardId: "Y5" });
    advance(s, 600);
    assert.ok(["yard:Y1", "pickup:Y1"].includes(stocked.location));
    assert.equal(act(s, { kind: "yard-use", yardId: "Y1", use: "export" }).outcome, "waiting");
    d.drivers = 12;
    act(s, { kind: "dispatch", dispatch: d });
    advance(s, 3600);
    assert.equal(stocked.location, "yard:Y5");
    assert.ok(stocked.history.length >= historyLength + 3);
    assert.ok(stocked.history.some(h => h.action === "移箱交接"));
    assert.ok(s.rehandles > 0);
    for (const y of s.plan.yards)
        assert.ok(portYardUsage(s, y.id).available >= 0);
    assert.equal(portScore(s).deductions, 0);
    assert.equal(portCargoDone(s, "S01"), false, "unready export bills keep the ship in service");
});
test("48-hour reference run conserves every box, carries live jobs and replays the same evidence", { timeout: 180000 }, () => {
    const s = runPortReference(defaultPortConfig());
    assert.equal(s.second, PORT_HORIZON);
    assert.equal(s.status, "completed");
    assert.ok(s.calls.S03!.wait.anchor > 0);
    assert.ok(s.calls.S01!.milestones.depart);
    assert.ok(s.calls.S12!.stage !== "departed");
    assert.ok(s.jobs.length > 0);
    assert.equal(portScore(s).deductions, 0);
    const ids = Object.keys(s.boxes);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, s.schedules.reduce((n, v) => n + v.unload + v.load, 0));
    for (const b of Object.values(s.boxes)) {
        for (let i = 1; i < b.history.length; i++) {
            assert.equal(b.history[i]!.from, b.history[i - 1]!.to);
            assert.ok(b.history[i]!.at >= b.history[i - 1]!.at);
        }
        if (b.deliveredAt !== null)
            assert.ok(b.history.length >= 6);
        if (b.loadedAt !== null)
            assert.ok(b.history.length >= 6);
    }
    for (const y of s.plan.yards) {
        const usage = portYardUsage(s, y.id);
        assert.ok(usage.available >= 0);
        assert.ok(usage.occupied + usage.reserved <= 100);
    }
    const issues = Object.values(s.boxes).filter(b => b.issueExpected && b.unloadedAt !== null);
    assert.ok(issues.length);
    assert.ok(issues.every(b => b.issue === "resolved"));
    assert.ok(issues.every(b => b.history.some(h => h.to === "yard:Y6")));
    const score = portScore(s, { unitCost: s.cost / 1884 });
    assert.equal(score.process, 20);
    assert.equal(score.handover, 10);
    assert.ok(score.cargo < 50 && score.cargo > 35, "reference policy need not be optimal; genuine tardiness stays visible");
    const raw = serializePortSession(s);
    const restored = restorePortSession(raw);
    assert.equal(digest(restored), digest(s));
    assert.deepEqual(portScore(restored, { unitCost: 2 }), portScore(s, { unitCost: 2 }));
    const tampered = JSON.parse(raw);
    tampered.review = { score: { total: 100 } };
    assert.equal(digest(restorePortSession(JSON.stringify(tampered))), digest(s));
    tampered.schedule[0].ata++;
    assert.throws(() => restorePortSession(JSON.stringify(tampered)), /船期/);
    const originalDue = portDeadline(s, "S01", "import");
    assert.equal(act(s, { kind: "plan-berth", callId: "S01", berth: 0, at: PORT_HORIZON }).outcome, "stale");
    assert.equal(portDeadline(s, "S01", "import"), originalDue);
    assert.ok(portHandoverItems(s).some(h => h.object === "S13"));
});
test("no work cannot earn efficiency or a full score, and active battle saves restore as interruption", () => {
    const s = start();
    advance(s, PORT_HORIZON);
    const before = portScore(s, { unitCost: 1 });
    assert.equal(before.cargo, 0);
    assert.equal(before.efficiency, 0);
    assert.equal(before.total, 0);
    act(s, { kind: "handover", entries: portHandoverItems(s).map(({ object, team, next }) => ({ object, team, next })) });
    assert.equal(portScore(s, { unitCost: 1 }).total, 10);
    const active = start();
    advance(active, 7200);
    const restored = restorePortSession(serializePortSession(active, { suspend: true }));
    assert.equal(restored.status, "interrupted");
    assert.equal(restored.second, 7200);
    assert.equal(portScore(restored).eligible, false);
    assert.equal(act(restored, { kind: "resume" }).outcome, "stale");
    assert.equal(act(restored, { kind: "start" }).outcome, "stale");
});
