import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ActivityPlanInput,
  ClassroomActor,
  ClassroomExerciseInput,
} from "@edu/contracts";
import { ClassroomParticipation } from "../src/classroom-participation.js";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
import { ActivityPlans } from "../src/activity-plans.js";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";

const course = "management-principles";
const slide = getCourseDeckByCourseId(course)!.getGlobalIndex(0)!;
const actor = (id: string, teacher = false): ClassroomActor => ({
  actorId: id,
  displayName: id,
  roles: [teacher ? "teacher" : "student"],
  identitySource: "development",
});
const exercise = (): ClassroomExerciseInput => ({
  title: "测试活动",
  lesson: 0,
  pack: "测试",
  category: "测试",
  order: 1,
  minute: 5,
  slide,
  durationSeconds: 60,
  optional: false,
  collaboration: "discussion",
  teachingCue: "TEACHER_PRIVATE",
  assistantCue: "ASSISTANT_PRIVATE",
  archived: false,
  content: {
    kind: "question",
    requestId: randomUUID(),
    question: "测试多选",
    mode: "multiple",
    options: [
      { id: "A", text: "甲" },
      { id: "B", text: "乙" },
      { id: "C", text: "丙" },
    ],
    correctOptionIds: ["A", "B"],
    explanation: "SECRET_EXPLANATION",
  },
});
const item = (
  exerciseId: string,
  version = 1,
): ActivityPlanInput["items"][number] => ({
  id: randomUUID(),
  exerciseId,
  exerciseVersion: version,
  minute: 5,
  durationSeconds: 60,
  slide,
  optional: false,
});

test("plans keep explicit exercise snapshots, detect conflicts and isolate classroom execution across restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-plans-"));
  const file = join(dir, "activities.sqlite");
  let participation = new ClassroomParticipation(file, () => true);
  let plans = new ActivityPlans(participation);
  try {
    const original = exercise(),
      entry = item("exercise");
    participation.library.save(course, "exercise", 0, original);
    const saved = plans.save(course, 0, "teacher", {
      expectedVersion: 0,
      items: [entry],
    });
    assert.equal(saved.version, 1);
    assert.throws(
      () => plans.save(course, 0, "teacher", { expectedVersion: 0, items: [] }),
      /其他页面/,
    );
    assert.throws(
      () =>
        plans.save(course, 0, "teacher", {
          expectedVersion: 1,
          items: [entry, entry],
        }),
      /重复/,
    );
    assert.throws(
      () =>
        plans.save(course, 0, "teacher", {
          expectedVersion: 1,
          items: [{ ...entry, slide: 2000 }],
        }),
      /本讲/,
    );
    assert.equal(
      plans.attach("class-a", course, 0, 1).items[0]!.status,
      "pending",
    );
    participation.library.save(course, "exercise", 1, {
      ...original,
      content: { ...original.content, question: "新题目" },
    });
    assert.equal(plans.get(course, 0).items[0]!.availableVersion, 2);
    const retained = plans.save(course, 0, "teacher", {
      expectedVersion: 1,
      items: [{ ...entry, minute: 10 }],
    });
    assert.equal(retained.items[0]!.snapshot.content.question, "测试多选");
    const updated = plans.save(course, 0, "teacher", {
      expectedVersion: 2,
      items: [{ ...entry, exerciseVersion: 2 }],
    });
    assert.equal(updated.items[0]!.snapshot.content.question, "新题目");
    assert.equal(plans.attach("class-a", course, 0, 3).planVersion, 1);
    assert.equal(
      plans.attach("class-b", course, 0, 3).items[0]!.snapshot.content.question,
      "新题目",
    );
    assert.equal(
      plans.change("class-a", course, 0, entry.id, "skip", randomUUID())
        .items[0]!.status,
      "skipped",
    );
    assert.throws(
      () =>
        plans.change("class-a", course, 0, entry.id, "publish", randomUUID()),
      /先恢复/,
    );
    plans.change("class-a", course, 0, entry.id, "restore", randomUUID());
    const key = randomUUID();
    const launched = plans.change(
      "class-a",
      course,
      0,
      entry.id,
      "publish",
      key,
    );
    assert.equal(
      plans.change("class-a", course, 0, entry.id, "publish", key).items[0]!
        .activityId,
      launched.items[0]!.activityId,
    );
    assert.equal(plans.history("class-a", actor("t", true), 1).total, 1);
    assert.equal(plans.hasLesson("class-a", 0, actor("t", true)), true);
    assert.equal(plans.hasLesson("class-a", 0, actor("s")), false);
    assert.equal(plans.hasLesson("class-b", 0, actor("t", true)), false);
    assert.equal(plans.execution("class-b", 0)!.items[0]!.status, "pending");
    assert.throws(
      () =>
        participation.start("class-a", {
          ...original.content,
          requestId: key,
          question: "不同内容",
        }),
      /发布编号/,
    );
    assert.throws(
      () => plans.change("class-a", course, 0, entry.id, "skip", randomUUID()),
      /已发布/,
    );
    participation.close();
    participation = new ClassroomParticipation(file, () => true);
    plans = new ActivityPlans(participation);
    assert.equal(
      plans.execution("class-a", 0)!.items[0]!.activityId,
      launched.items[0]!.activityId,
    );
    assert.equal(plans.get(course, 0).version, 3);
  } finally {
    participation.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("history retains reveal state, frozen groups and exact-match grading while exposing only own student submission", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-history-"));
  const participation = new ClassroomParticipation(
    join(dir, "activities.sqlite"),
    () => true,
  );
  const plans = new ActivityPlans(participation);
  try {
    for (const id of ["a", "b", "c"]) participation.join("room", actor(id), id);
    participation.configureGroups("room", {
      action: "assign",
      actorId: "a",
      group: "第一组",
    });
    const question = exercise().content,
      id = participation.start("room", question);
    participation.answer("room", id, actor("a"), ["B", "A"]);
    participation.answer("room", id, actor("b"), ["A"]);
    participation.action("room", id, "close");
    const own = plans.detail("room", id, actor("a"));
    assert.deepEqual(own.ownAnswer!.optionIds, ["A", "B"]);
    for (const key of [
      "correctOptionIds",
      "explanation",
      "counts",
      "correctRate",
      "answers",
      "groups",
      "members",
      "responseCount",
    ] as const)
      assert.equal(own[key], null, key);
    assert.throws(() => plans.detail("room", id, actor("c")), /您的作答/);
    assert.equal(plans.history("room", actor("c"), 1).total, 0);
    const teacher = plans.detail("room", id, actor("t", true));
    assert.equal(teacher.correctRate, 0.5);
    assert.equal(teacher.members, 3);
    assert.equal(
      teacher.answers!.find((a) => a.actorId === "a")!.group,
      "第一组",
    );
    participation.action("room", id, "reveal");
    participation.action("room", id, "dismiss");
    participation.configureGroups("room", {
      action: "assign",
      actorId: "a",
      group: "新组",
    });
    assert.equal(
      plans.detail("room", id, actor("t", true)).answers![0]!.group,
      "第一组",
    );
    participation.end("room");
    assert.deepEqual(plans.detail("room", id, actor("a")).correctOptionIds, [
      "A",
      "B",
    ]);
    assert.equal(plans.detail("room", id, actor("a")).answers, null);
    for (let i = 0; i < 21; i++) {
      const next = participation.start("room", {
        ...question,
        requestId: randomUUID(),
        correctOptionIds: [],
      });
      assert.equal(
        plans.detail("room", next, actor("t", true)).correctRate,
        null,
      );
      participation.action("room", next, "close");
    }
    assert.equal(plans.history("room", actor("t", true), 1).rows.length, 20);
    assert.equal(plans.history("room", actor("t", true), 2).rows.length, 2);
    assert.equal(plans.history("room", actor("a"), 1).total, 1);
  } finally {
    participation.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("failed plan publication rolls back activity, publication link and execution together", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-plan-atomic-"));
  const p = new ClassroomParticipation(
      join(dir, "activities.sqlite"),
      () => true,
    ),
    plans = new ActivityPlans(p);
  try {
    const entry = item("e");
    p.library.save(course, "e", 0, exercise());
    plans.save(course, 0, "t", { expectedVersion: 0, items: [entry] });
    plans.attach("r", course, 0, 1);
    p.db.exec(
      "CREATE TRIGGER fail_publication BEFORE INSERT ON classroom_exercise_publications BEGIN SELECT RAISE(ABORT,'test-failure'); END;",
    );
    assert.throws(
      () => plans.change("r", course, 0, entry.id, "publish", randomUUID()),
      /test-failure/,
    );
    assert.equal(plans.execution("r", 0)!.items[0]!.status, "pending");
    assert.equal(plans.sessionCount("r", actor("t", true)), 0);
    assert.equal(p.view("r", actor("t", true)).active, null);
    p.db.exec("DROP TRIGGER fail_publication");
    assert.equal(
      plans.change("r", course, 0, entry.id, "publish", randomUUID()).items[0]!
        .status,
      "open",
    );
  } finally {
    p.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("legacy activity migration adds disclosure timestamps without revealing closed activities", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-activity-migration-")),
    file = join(dir, "activities.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(
    "CREATE TABLE participation_activities(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, request_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, definition TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(session_id,request_id));",
  );
  for (const status of ["closed", "revealed"])
    legacy
      .prepare("INSERT INTO participation_activities VALUES(?,?,?,?,?,?,?)")
      .run(
        status,
        "room",
        status,
        "question",
        status,
        JSON.stringify(exercise().content),
        "2025-01-01T00:00:00.000Z",
      );
  legacy.close();
  const p = new ClassroomParticipation(file, () => true);
  try {
    assert.equal(
      p.db
        .prepare("SELECT revealed_at FROM participation_activities WHERE id=?")
        .get("closed")!.revealed_at,
      null,
    );
    assert.equal(
      p.db
        .prepare("SELECT revealed_at FROM participation_activities WHERE id=?")
        .get("revealed")!.revealed_at,
      "2025-01-01T00:00:00.000Z",
    );
    assert.equal(
      new ActivityPlans(p).sessionCount("room", actor("t", true)),
      2,
    );
  } finally {
    p.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("campus routes protect teacher plans and student history, and reject ended classroom mutations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-plan-api-")),
    dataFile = join(dir, "state.json");
  const identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
  for (const role of ["teacher", "student"] as const)
    await identity.createAccount(role, role, role, "activity-test-password");
  const app = await buildApp({
    dataFile,
    campusMode: true,
    identityProvider: identity,
    secureIdentityCookie: false,
  });
  const login = async (username: string) =>
    String(
      (
        await app.inject({
          method: "POST",
          url: "/api/identity/login",
          payload: { username, password: "activity-test-password" },
        })
      ).headers["set-cookie"],
    ).split(";")[0]!;
  try {
    const t = { cookie: await login("teacher") },
      s = { cookie: await login("student") };
    const plan = `/api/courses/${course}/activity-plans/0`;
    assert.equal((await app.inject({ url: plan, headers: s })).statusCode, 403);
    const roomResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${course}/class-sessions`,
      headers: t,
    });
    assert.equal(roomResponse.statusCode, 201);
    const room = roomResponse.json(),
      base = `/api/class-sessions/${room.id}/participation`;
    assert.equal(
      (await app.inject({ url: `${base}/plans/0`, headers: s })).statusCode,
      403,
    );
    assert.equal(
      (await app.inject({ url: `${base}/history`, headers: s })).statusCode,
      200,
    );
    const joined = await app.inject({
      method: "POST",
      url: `${base}/join`,
      headers: s,
      payload: { displayName: "伪造姓名" },
    });
    assert.equal(joined.json().displayName, "student");
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${room.id}/end`,
      headers: t,
    });
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `${base}/plans/0/attach`,
          headers: t,
          payload: { expectedVersion: 1 },
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await app.inject({
          url: `/api/courses/${course}/activity-history`,
          headers: s,
        })
      ).json().total,
      0,
    );
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
