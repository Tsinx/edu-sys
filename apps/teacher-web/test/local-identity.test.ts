import assert from "node:assert/strict";
import test from "node:test";
import { api, ApiError } from "../src/api";
import { ensureLocalIdentity, isLocalDevelopment } from "../src/campus/local-identity";
import { runtimeConfig } from "../src/campus/runtime";
import type { ClassroomIdentitySession } from "@edu/contracts";

const session: ClassroomIdentitySession = {
  actor: { actorId: "development:student:existing", displayName: "已有学生", roles: ["student"], identitySource: "development" },
  expiresAt: null,
};

test("local automatic identity requires both a development build and development server", () => {
  assert.equal(isLocalDevelopment(runtimeConfig, true), true);
  assert.equal(isLocalDevelopment(runtimeConfig, false), false);
  assert.equal(isLocalDevelopment({ ...runtimeConfig, profile: "campus" }, true), false);
  assert.equal(isLocalDevelopment({ ...runtimeConfig, identity: "campus" }, true), false);
  assert.equal(isLocalDevelopment(undefined, true), false);
});

test("local entry restores identity, deduplicates startup and only renews expired sessions", async t => {
  let creates = 0;
  const roles: string[] = [];
  t.mock.method(api, "getIdentitySession", async () => session);
  t.mock.method(api, "createDevelopmentIdentitySession", async (role: string) => {
    creates++; roles.push(role); return session;
  });
  assert.equal(await ensureLocalIdentity("/"), session);
  assert.equal(creates, 0, "an existing student must not become a teacher");

  t.mock.method(api, "getIdentitySession", async () => { throw new ApiError("expired", 401); });
  const first = ensureLocalIdentity("/");
  const second = ensureLocalIdentity("/");
  assert.equal(first, second, "StrictMode must not create competing cookies");
  await Promise.all([first, second]);
  assert.deepEqual(roles, ["teacher"]);
  await ensureLocalIdentity("/join/class-1");
  assert.deepEqual(roles, ["teacher", "student"]);

  t.mock.method(api, "getIdentitySession", async () => { throw new ApiError("unavailable", 503); });
  await assert.rejects(ensureLocalIdentity("/"), /unavailable/);
  assert.equal(creates, 2, "server errors must not silently create a new identity");
  t.mock.method(api, "getIdentitySession", async () => { throw new TypeError("network failed"); });
  await assert.rejects(ensureLocalIdentity("/"), /network failed/);
  assert.equal(creates, 2);
  t.mock.method(api, "getIdentitySession", async () => session);
  assert.equal(await ensureLocalIdentity("/"), session, "a failed attempt must be retryable");
});
