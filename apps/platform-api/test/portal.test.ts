import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtemp,
  rm,
  mkdir,
  readdir,
  copyFile,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
const course = "management-principles";
test("workspace ownership, independent reading, private notes, concurrency and restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "edu-portal-")),
    dataFile = join(dir, "state.json");
  const identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
  await identity.createAccount(
    "wei",
    "韦笑",
    "teacher",
    "portal-password-test",
  );
  await identity.createAccount(
    "other",
    "其他教师",
    "teacher",
    "portal-password-test",
  );
  await identity.createAccount(
    "student",
    "学生",
    "student",
    "portal-password-test",
  );
  let app = await buildApp({
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
          payload: { username, password: "portal-password-test" },
        })
      ).headers["set-cookie"],
    ).split(";")[0]!;
  const t = await login("wei"),
    o = await login("other"),
    s = await login("student");
  const call = (
    cookie: string,
    url: string,
    method: "GET" | "PUT" | "POST" | "PATCH" = "GET",
    payload?: Record<string, unknown>,
  ) => app.inject({ url, method, headers: { cookie }, payload });
  try {
    const w = (await call(t, "/api/workspace")).json();
    assert.ok(w.ownCourseIds.includes(course));
    assert.equal(w.actor.displayName, "韦笑");
    const c = await call(o, "/api/courses", "POST", {
      title: "其他教师新课",
      code: "TEST",
      category: "本科课程",
      discipline: "管理学",
      totalHours: 16,
    });
    assert.equal(c.statusCode, 201);
    assert.equal(
      c.json().teacherId,
      (await call(o, "/api/workspace")).json().actor.actorId,
    );
    const note = `/api/courses/${course}/preparation/1`;
    assert.equal((await call(s, note)).statusCode, 403);
    assert.equal(
      (await call(t, note, "PUT", { text: "私人备课笔记", revision: 0 })).json()
        .revision,
      1,
    );
    assert.equal(
      (await call(t, note, "PUT", { text: "旧版本", revision: 0 })).statusCode,
      409,
    );
    assert.equal((await call(o, note)).json().text, "");
    const deck = getCourseDeckByCourseId(course)!;
    const reading = `/api/courses/${course}/reading`;
    const input = {
      slideKey: deck.getSlide(2).slideKey,
      deckVersion: deck.versionId,
      revision: 0,
    };
    const before = (await call(t, "/api/class-sessions")).json().length;
    assert.equal((await call(s, reading, "PUT", input)).statusCode, 200);
    assert.equal((await call(s, reading, "PUT", input)).statusCode, 409);
    assert.equal((await call(t, reading)).json(), null);
    assert.equal((await call(t, "/api/class-sessions")).json().length, before);
    const path = `/api/courses/${course}/class-sessions`,
      requestId = randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        call(t, path, "POST", { requestId, lesson: 1 }),
      ),
    );
    assert.ok(responses.every((r) => r.statusCode === 201));
    const id = responses[0]!.json().id;
    assert.ok(responses.every((r) => r.json().id === id));
    assert.equal((await call(t, path, "POST", { lesson: 2 })).json().id, id);
    assert.equal(
      (await call(t, path, "POST", { requestId, mode: "new" })).statusCode,
      409,
    );
    const next = await call(t, path, "POST", {
      mode: "new",
      requestId: randomUUID(),
      lesson: 2,
      room: "二班",
    });
    assert.notEqual(next.json().id, id);
    assert.equal(next.json().teacherName, "韦笑");
    assert.equal(next.json().lessonNumber, 2);
    assert.equal((await call(s, path, "POST", {})).statusCode, 403);
    assert.equal(
      (
        await call(t, "/api/preferences", "PATCH", { compactSidebar: true })
      ).json().compactSidebar,
      true,
    );
    assert.equal(
      (await call(o, "/api/preferences")).json().compactSidebar,
      false,
    );
    await app.close();
    app = await buildApp({
      dataFile,
      campusMode: true,
      secureIdentityCookie: false,
    });
    assert.equal((await call(t, note)).json().text, "私人备课笔记");
    assert.equal((await call(s, reading)).json().slideKey, input.slideKey);
    assert.equal(
      (await call(t, "/api/class-sessions"))
        .json()
        .filter((s: { id: string }) => s.id === id).length,
      1,
    );
    await app.close();
    const backup = join(dir, "backup");
    await mkdir(backup);
    for (const file of await readdir(dir))
      if (file.endsWith(".sqlite"))
        await copyFile(join(dir, file), join(backup, file));
    const script = new URL(
        "../../../deploy/linux/cleanup-classrooms.py",
        import.meta.url,
      ).pathname,
      plan = join(dir, "cleanup.json");
    const run = (args: string[]) => {
      const p = spawnSync("python3", [script, dir, "--plan", plan, ...args], {
        encoding: "utf8",
      });
      assert.equal(p.status, 0, p.stderr);
      return JSON.parse(p.stdout);
    };
    assert.ok(run([]).planned >= 2);
    const first = run(["--apply", "--backup", backup]);
    assert.deepEqual(run(["--apply", "--backup", backup]), first);
    app = await buildApp({
      dataFile,
      campusMode: true,
      secureIdentityCookie: false,
    });
    assert.equal(
      (await call(t, "/api/class-sessions")).json().length,
      0,
      "cleanup must not resurrect seeded classrooms",
    );
    assert.equal((await call(t, note)).json().text, "私人备课笔记");
    assert.equal((await call(s, reading)).json().slideKey, input.slideKey);
    assert.match(
      (await call(t, `/api/class-sessions/${id}/snapshot`)).json().message,
      /已归档清理/,
    );
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
