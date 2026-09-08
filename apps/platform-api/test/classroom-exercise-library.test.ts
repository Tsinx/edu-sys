import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { classroomExerciseInputSchema, type ClassroomActor, type ClassroomExercise } from "@edu/contracts";
import { ClassroomParticipation } from "../src/classroom-participation.js";
import { lessonOneExercises } from "../src/lesson-one-exercises.js";
import { buildApp } from "../src/app.js";

const student = (id: string): ClassroomActor => ({ actorId: id, displayName: id, roles: ["student"], identitySource: "development" });
const teacher: ClassroomActor = { ...student("teacher"), roles: ["teacher"] };
test("first lecture library is editable, archived durably, course-isolated and safe against stale writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-exercise-library-")); const file = join(dir, "library.sqlite");
  let service = new ClassroomParticipation(file, () => true);
  try {
    const course = "course-port-management-intro";
    const items = service.library.list(course, "room");
    assert.equal(items.length, 12); assert.equal(new Set(items.map(i => i.id)).size, 12);
    assert.equal(items.filter(i => !i.optional).length, 10);
    assert.ok(items.some(i => i.minute >= 83)); assert.equal(items.at(-1)?.slide, 47);
    for (const { id: _id, ...item } of lessonOneExercises) classroomExerciseInputSchema.parse(item);
    assert.equal(service.library.list("course-economic-mathematics", "room").length, 0);
    const { id, version, publishedCount: _count, ...body } = items[0]!;
    service.library.save(course, id, version, { ...body, title: "教师试讲后的改题", archived: true });
    assert.throws(() => service.library.save(course, id, version, body), /其他页面/);
    assert.throws(() => service.library.get("course-economic-mathematics", id), /未找到/);
    service.close(); service = new ClassroomParticipation(file, () => true);
    const retained = service.library.list(course, "new-room").find(i => i.id === id)!;
    assert.equal(retained.title, "教师试讲后的改题"); assert.equal(retained.archived, true); assert.equal(retained.version, 2);
    assert.equal(service.library.list(course, "new-room").length, 12);
    // Independently verify the teaching-model arithmetic, not a copy of stored option counts.
    let maxGrain = -Infinity;
    for (let j = 0; j <= 100; j++) for (let h = 0; h <= 100; h++) if (j + .2 * h >= 70) maxGrain = Math.max(maxGrain, 2 * (100 - j) + (100 - h));
    assert.equal(maxGrain, 160);
  } finally { service.close(); await rm(dir, { recursive: true, force: true }); }
});

test("classroom grouping is balanced, private and cannot change an active question's denominator", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-exercise-groups-"));
  const service = new ClassroomParticipation(join(dir, "db.sqlite"), () => true);
  try {
    for (let i = 0; i < 100; i++) service.join("room", student(`s${i}`), `学生${i}`);
    service.configureGroups("room", { action: "auto", size: 4 });
    const view = service.view("room", teacher);
    assert.equal(view.groupResults?.length, 25); assert.ok(view.groupResults?.every(g => g.members === 4));
    assert.ok(service.view("room", student("s1")).group);
    assert.equal(service.view("room", student("s1")).groupResults, null);
    assert.equal(service.view("room", student("s1")).roster, null);
    service.join("room", student("late"), "晚到学生");
    assert.equal(service.view("room", student("late")).group, "");
    service.configureGroups("room", { action: "assign", actorId: "late", group: "第01组" });
    assert.equal(service.view("room", student("late")).group, "第01组");
    const id = service.start("room", { ...lessonOneExercises[0]!.content, requestId: randomUUID() });
    service.answer("room", id, student("s1"), ["A"]);
    assert.equal(service.view("room", teacher).groupResults?.reduce((sum, g) => sum + g.responded, 0), 1);
    assert.throws(() => service.configureGroups("room", { action: "auto", size: 5 }), /先收起/);
    service.action("room", id, "close");
    assert.throws(() => service.configureGroups("room", { action: "assign", actorId: "late", group: "新组" }), /先收起/);
    service.action("room", id, "dismiss");
    service.configureGroups("room", { action: "assign", actorId: "late", group: "新组" });
    assert.equal(service.view("room", student("late")).group, "新组");
  } finally { service.close(); await rm(dir, { recursive: true, force: true }); }
});

test("teacher can prepare before class, publish a snapshot, and edit later without changing an open question", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-exercise-api-"));
  const app = await buildApp({ dataFile: join(dir, "state.json"), portSimulationTickMs: 0, openAvatarBaseUrl: "http://127.0.0.1:1" });
  try {
    const login = async (role: "teacher" | "student") => {
      const result = await app.inject({ method: "POST", url: "/api/identity/development/session", payload: { role } });
      return { cookie: String(result.headers["set-cookie"]).split(";")[0]! };
    };
    const teacherHeaders = await login("teacher"); const studentHeaders = await login("student");
    const courseUrl = "/api/courses/course-port-management-intro/exercises";
    assert.equal((await app.inject({ url: courseUrl })).statusCode, 401);
    assert.equal((await app.inject({ url: courseUrl, headers: studentHeaders })).statusCode, 403);
    const exercises = (await app.inject({ url: courseUrl, headers: teacherHeaders })).json<ClassroomExercise[]>();
    assert.equal(exercises.length, 12);
    const room = (await app.inject({ method: "POST", url: "/api/courses/course-port-management-intro/class-sessions", headers: teacherHeaders })).json();
    const base = `/api/class-sessions/${room.id}/participation`;
    assert.equal((await app.inject({ url: `${base}/library`, headers: studentHeaders })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: `${base}/groups`, headers: studentHeaders, payload: { action: "auto", size: 4 } })).statusCode, 403);
    const exercise = exercises[2]!; const requestId = randomUUID();
    const publish = (version = 1) => app.inject({ method: "POST", url: `${base}/library/${exercise.id}/publish`, headers: teacherHeaders, payload: { requestId, expectedVersion: version } });
    const first = await publish(); assert.equal(first.statusCode, 200);
    assert.equal((await publish()).json().active.id, first.json().active.id);
    const { id, version, publishedCount: _count, ...draft } = exercise;
    const updated = { ...draft, content: { ...draft.content, question: "教师已修改，下一次发布时使用" } };
    const save = await app.inject({ method: "POST", url: courseUrl, headers: teacherHeaders, payload: { id, expectedVersion: version, exercise: updated } });
    assert.equal(save.statusCode, 200);
    assert.equal((await app.inject({ url: base, headers: studentHeaders })).json().active.question, exercise.content.question);
    const studentView = (await app.inject({ url: base, headers: studentHeaders })).json();
    assert.equal(studentView.active.correctOptionIds, null);
    assert.ok(!JSON.stringify(studentView).includes(exercise.teachingCue));
    assert.ok(!JSON.stringify(studentView).includes(exercise.assistantCue));
    assert.equal((await publish()).statusCode, 409);
    const listed = (await app.inject({ url: `${base}/library`, headers: teacherHeaders })).json<ClassroomExercise[]>();
    assert.equal(listed.find(i => i.id === id)?.publishedCount, 1);
    await app.inject({ method: "POST", url: `${base}/activities/${first.json().active.id}/action`, headers: teacherHeaders, payload: { action: "dismiss" } });
    const archived = await app.inject({ method: "POST", url: courseUrl, headers: teacherHeaders, payload: { id, expectedVersion: 2, exercise: { ...updated, archived: true } } });
    assert.equal(archived.statusCode, 200); assert.equal((await publish(3)).statusCode, 409);
    assert.equal((await app.inject({ method: "POST", url: courseUrl, headers: studentHeaders, payload: { id, expectedVersion: 3, exercise: draft } })).statusCode, 403);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
