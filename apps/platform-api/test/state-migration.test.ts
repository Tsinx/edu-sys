import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PORT_MANAGEMENT_DECK_VERSION } from "@edu/course-content";
import {
  createInitialClassroomRuntime,
  createSeedState,
  type ClassroomRuntimeState
} from "../src/seed.js";
import { JsonStateStore } from "../src/store.js";

function legacyRuntime(slideIndex: number): ClassroomRuntimeState {
  const {
    slideKey: _slideKey,
    deckVersion: _deckVersion,
    ...runtime
  } = createInitialClassroomRuntime();
  void _slideKey;
  void _deckVersion;
  return {
    ...runtime,
    slideIndex
  } as ClassroomRuntimeState;
}

test("old numeric slide state returns to the matching new lesson cover", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-deck-migration-"));
  const dataFile = join(tempDirectory, "state.json");
  const state = createSeedState();
  const baseSession = state.classSessions[0]!;
  state.classSessions = [
    { ...baseSession, id: "legacy-lesson-1" },
    { ...baseSession, id: "legacy-lesson-2" },
    { ...baseSession, id: "legacy-lesson-3" },
    { ...baseSession, id: "v3-key-survives" },
    { ...baseSession, id: "v3-missing-key" },
    { ...baseSession, id: "v4-key-survives" },
    { ...baseSession, id: "v4-missing-key" },
    { ...baseSession, id: "stable-key-wins" }
  ];
  state.classroomRuntimes = {
    "legacy-lesson-1": legacyRuntime(20),
    "legacy-lesson-2": legacyRuntime(50),
    "legacy-lesson-3": legacyRuntime(80),
    "v3-key-survives": {
      ...createInitialClassroomRuntime(),
      slideIndex: 58,
      slideKey: "l2-disruption-brief",
      deckVersion: "release-port-management-voyage-v3"
    },
    "v3-missing-key": {
      ...createInitialClassroomRuntime(),
      slideIndex: 58,
      slideKey: "removed-v3-slide",
      deckVersion: "release-port-management-voyage-v3"
    },
    "v4-key-survives": {
      ...createInitialClassroomRuntime(),
      slideIndex: 91,
      slideKey: "l3-piraeus-call",
      deckVersion: "release-port-management-voyage-v4"
    },
    "v4-missing-key": {
      ...createInitialClassroomRuntime(),
      slideIndex: 91,
      slideKey: "removed-v4-slide",
      deckVersion: "release-port-management-voyage-v4"
    },
    "stable-key-wins": {
      ...createInitialClassroomRuntime(),
      slideIndex: 1,
      slideKey: "l3-cover",
      deckVersion: PORT_MANAGEMENT_DECK_VERSION
    }
  };
  await writeFile(dataFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  try {
    const store = new JsonStateStore(dataFile);
    await store.initialize();

    assert.deepEqual(
      [
        store.getClassroomSnapshot("legacy-lesson-1")?.slide.index,
        store.getClassroomSnapshot("legacy-lesson-2")?.slide.index,
        store.getClassroomSnapshot("legacy-lesson-3")?.slide.index
      ],
      [1, 37, 73]
    );
    assert.equal(
      store.getClassroomSnapshot("v3-key-survives")?.slide.index,
      58
    );
    assert.equal(
      store.getClassroomSnapshot("v3-missing-key")?.slide.index,
      37
    );
    assert.equal(
      store.getClassroomSnapshot("v4-key-survives")?.slide.index,
      91
    );
    assert.equal(
      store.getClassroomSnapshot("v4-missing-key")?.slide.index,
      73
    );
    assert.equal(
      store.getClassroomSnapshot("stable-key-wins")?.slide.index,
      73
    );
    assert.equal(
      store.getClassroomSnapshot("stable-key-wins")?.slide.slideId,
      "l3-cover"
    );

    const persisted = JSON.parse(await readFile(dataFile, "utf8")) as {
      classroomRuntimes: Record<
        string,
        { slideIndex: number; slideKey: string; deckVersion: string }
      >;
    };
    assert.deepEqual(
      [
        persisted.classroomRuntimes["legacy-lesson-1"]?.slideKey,
        persisted.classroomRuntimes["legacy-lesson-2"]?.slideKey,
        persisted.classroomRuntimes["legacy-lesson-3"]?.slideKey
      ],
      ["l1-cold-open", "l2-cover", "l3-cover"]
    );
    assert.equal(
      persisted.classroomRuntimes["legacy-lesson-2"]?.deckVersion,
      PORT_MANAGEMENT_DECK_VERSION
    );
    assert.equal(
      persisted.classroomRuntimes["v3-key-survives"]?.slideKey,
      "l2-disruption-brief"
    );
    assert.equal(
      persisted.classroomRuntimes["v3-missing-key"]?.slideKey,
      "l2-cover"
    );
    assert.equal(
      persisted.classroomRuntimes["v4-key-survives"]?.slideKey,
      "l3-piraeus-call"
    );
    assert.equal(
      persisted.classroomRuntimes["v4-missing-key"]?.slideKey,
      "l3-cover"
    );
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
