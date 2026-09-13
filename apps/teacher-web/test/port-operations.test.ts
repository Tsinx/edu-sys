import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TerminalStudio } from "../src/features/port-simulation/TerminalStudio.js";
import { IndexedSimulationStorage, synchronize } from "../src/campus/sync.js";
import { getRecords, changeRecord } from "../src/campus/storage.js";
import { portStorageKey } from "@edu/port-simulation-core";
Object.defineProperty(globalThis, "window", { value: new EventTarget(), configurable: true });
test("the course entry mounts the new asynchronous 48-hour kernel without rendering a legacy score", () => {
    const html = renderToStaticMarkup(createElement(TerminalStudio, { storageScope: "course:actor", initialTrainingMode: "battle", trainingModeLocked: true }));
    assert.match(html, /48 小时港口综合实训/);
    assert.doesNotMatch(html, /300 箱|9 个节点|100\/100/);
});
test("comprehensive training records remain local even when the campus sync queue runs", async () => {
    const actor = "local-only-port-48", key = portStorageKey("course:actor", "battle"), storage = await IndexedSimulationStorage.create(actor, "course:actor");
    storage.setItem(key, "local-48-hour-attempt");
    const curriculumKey = "edu-port-operations:curriculum:course:actor";
    storage.setItem(curriculumKey, JSON.stringify({ selected: "cargo", completed: ["arrival"] }));
    await storage.flush();
    const records = await getRecords(actor);
    assert.equal(records.find(r => r.key === key)?.dirty, false);
    assert.equal(records.find(r => r.key === curriculumKey)?.dirty, false);
    // Old dirty flags cannot accidentally upload a record after an interrupted upgrade.
    await changeRecord(actor, key, r => ({ ...r!, dirty: true }));
    const original = globalThis.fetch;
    const paths: string[] = [];
    globalThis.fetch = async (input) => { paths.push(String(input)); return Response.json({ actor: { actorId: actor }, expiresAt: "2099-01-01" }); };
    try {
        await synchronize(actor);
        assert.deepEqual(paths, ["/api/identity/session"]);
        assert.equal(storage.getItem(key), "local-48-hour-attempt");
        assert.equal((await getRecords("other-student")).length, 0);
    }
    finally {
        globalThis.fetch = original;
    }
});
test("a fresh lesson entry starts from arrival, and an explicit teacher segment overrides local progress", () => {
    const fresh = renderToStaticMarkup(createElement(TerminalStudio, { storageScope: "fresh-course:actor" }));
    assert.match(fresh, /船舶入港/);
    const classroom = renderToStaticMarkup(createElement(TerminalStudio, { storageScope: "class:actor", initialLearningStage: "cargo", learningStageLocked: true, storage: { getItem: () => JSON.stringify({ selected: "full", completed: ["arrival"] }), setItem: () => {} } }));
    assert.match(classroom, /装卸与运输/);
    assert.doesNotMatch(classroom, /<h2>48 小时港口综合实训/);
});
