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
    { ...baseSession, id: "v5-key-survives" },
    { ...baseSession, id: "v5-missing-key" },
    { ...baseSession, id: "v6-key-survives" },
    { ...baseSession, id: "v6-missing-key" },
    { ...baseSession, id: "stable-key-wins" },
    { ...baseSession, id: "v7-missing-key" }
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
    "v5-key-survives": {
      ...createInitialClassroomRuntime(),
      slideIndex: 10,
      slideKey: "l1-port-books",
      deckVersion: "release-port-management-voyage-v5"
    },
    "v5-missing-key": {
      ...createInitialClassroomRuntime(),
      slideIndex: 50,
      slideKey: "removed-v5-slide",
      deckVersion: "release-port-management-voyage-v5"
    },
    "v6-key-survives": {
      ...createInitialClassroomRuntime(),
      slideIndex: 68,
      slideKey: "l2-disruption-brief",
      deckVersion: "release-port-management-voyage-v6"
    },
    "v6-missing-key": {
      ...createInitialClassroomRuntime(),
      slideIndex: 50,
      slideKey: "removed-v6-slide",
      deckVersion: "release-port-management-voyage-v6"
    },
    "v7-missing-key": {
      ...createInitialClassroomRuntime(),
      slideIndex: 84,
      slideKey: "removed-v7-slide",
      deckVersion: "release-port-management-voyage-v7"
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
      [1, 48, 100]
    );
    assert.equal(
      store.getClassroomSnapshot("v3-key-survives")?.slide.index,
      132
    );
    assert.equal(
      store.getClassroomSnapshot("v3-missing-key")?.slide.index,
      48
    );
    assert.equal(
      store.getClassroomSnapshot("v4-key-survives")?.slide.index,
      139
    );
    assert.equal(
      store.getClassroomSnapshot("v4-missing-key")?.slide.index,
      100
    );
    assert.equal(
      store.getClassroomSnapshot("v5-key-survives")?.slide.index,
      34
    );
    assert.equal(
      store.getClassroomSnapshot("v5-missing-key")?.slide.index,
      48
    );
    assert.equal(
      store.getClassroomSnapshot("v6-key-survives")?.slide.index,
      132
    );
    assert.equal(
      store.getClassroomSnapshot("v6-missing-key")?.slide.index,
      48
    );
    assert.equal(
      store.getClassroomSnapshot("stable-key-wins")?.slide.index,
      100
    );
    assert.equal(
      store.getClassroomSnapshot("stable-key-wins")?.slide.slideId,
      "l3-lbl-cover"
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
      ["l1-course-cover", "l2-lbl-cover", "l3-lbl-cover"]
    );
    assert.equal(
      persisted.classroomRuntimes["legacy-lesson-2"]?.deckVersion,
      PORT_MANAGEMENT_DECK_VERSION
    );
    assert.equal(
      persisted.classroomRuntimes["v3-key-survives"]?.slideKey,
      "l3-lbl-redsea-case"
    );
    assert.equal(
      persisted.classroomRuntimes["v3-missing-key"]?.slideKey,
      "l2-lbl-cover"
    );
    assert.equal(
      persisted.classroomRuntimes["v4-key-survives"]?.slideKey,
      "l3-lbl-gibraltar"
    );
    assert.equal(
      persisted.classroomRuntimes["v4-missing-key"]?.slideKey,
      "l3-lbl-cover"
    );
    assert.equal(
      persisted.classroomRuntimes["v5-key-survives"]?.slideKey,
      "l1-port-books"
    );
    assert.equal(
      persisted.classroomRuntimes["v5-missing-key"]?.slideKey,
      "l2-lbl-cover"
    );
    assert.equal(
      persisted.classroomRuntimes["v6-key-survives"]?.slideKey,
      "l3-lbl-redsea-case"
    );
    assert.equal(
      persisted.classroomRuntimes["v6-missing-key"]?.slideKey,
      "l2-lbl-cover"
    );
    assert.equal(store.getClassroomSnapshot("v7-missing-key")?.slide.index, 100);
    store.close();
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("unregistered historical classroom keeps its original deck identity", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-unknown-deck-"));
  const dataFile = join(tempDirectory, "state.json");
  const state = createSeedState();
  const unknownCourseId = "course-legacy-unregistered";
  const sessionId = "session-legacy-unregistered";
  const originalDeckIdentity = {
    deckId: "deck-legacy-unregistered",
    deckVersion: "release-legacy-unregistered-v7",
    slideKey: "legacy-topic-custom-slide",
    slideIndex: 37
  };

  assert.throws(
    () => createInitialClassroomRuntime(unknownCourseId),
    new RegExp(`COURSE_DECK_NOT_READY:${unknownCourseId}`)
  );

  state.courses.push({
    ...state.courses[0]!,
    id: unknownCourseId,
    slug: "legacy-unregistered",
    code: "LEGACY-UNREGISTERED",
    title: "历史未注册课程",
    featured: false
  });
  state.classSessions.push({
    ...state.classSessions[0]!,
    id: sessionId,
    courseId: unknownCourseId,
    courseTitle: "历史未注册课程"
  });
  state.classroomRuntimes[sessionId] = {
    ...createInitialClassroomRuntime(),
    ...originalDeckIdentity,
    participantsOnline: 12
  } as ClassroomRuntimeState & { participantsOnline: number };
  await writeFile(dataFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  let store: JsonStateStore | undefined;
  try {
    store = new JsonStateStore(dataFile);
    await store.initialize();

    assert.equal(store.getClassroomSnapshot(sessionId), undefined);

    const persisted = JSON.parse(await readFile(dataFile, "utf8")) as {
      classroomRuntimes: Record<
        string,
        ClassroomRuntimeState & { participantsOnline?: number }
      >;
    };
    const persistedRuntime = persisted.classroomRuntimes[sessionId];
    assert.ok(persistedRuntime);
    assert.deepEqual(
      {
        deckId: persistedRuntime.deckId,
        deckVersion: persistedRuntime.deckVersion,
        slideKey: persistedRuntime.slideKey,
        slideIndex: persistedRuntime.slideIndex
      },
      originalDeckIdentity
    );
    assert.equal(persistedRuntime.participantsOnline, undefined);
    assert.equal(persistedRuntime.simulation, null);
  } finally {
    store?.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
