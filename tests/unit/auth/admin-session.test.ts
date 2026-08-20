import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequireAdminAction,
  getAdminAuthorizationWith,
  type AdminAuthorizationDependencies,
} from "../../../lib/auth/admin-session-core.ts";

function dependencies(overrides: Partial<AdminAuthorizationDependencies> = {}) {
  return {
    getClaims: async () => ({ subject: "admin-subject", error: null }),
    isCurrentAdmin: async () => ({ data: true, error: null }),
    ...overrides,
  } satisfies AdminAuthorizationDependencies;
}

async function exerciseProtectedWork(authDependencies: AdminAuthorizationDependencies) {
  let protectedWorkCalls = 0;
  const requireAdminAction = createRequireAdminAction(
    () => getAdminAuthorizationWith(authDependencies),
  );
  const authorization = await requireAdminAction();
  if (authorization.authorized) protectedWorkCalls += 1;
  return { authorization, protectedWorkCalls };
}

test("requireAdminAction refuses a missing or invalid identity before protected work", async () => {
  for (const claims of [
    { subject: null, error: null },
    { subject: "", error: null },
    { subject: "admin-subject", error: new Error("identity unavailable") },
  ]) {
    let rpcCalls = 0;
    const result = await exerciseProtectedWork(
      dependencies({
        getClaims: async () => claims,
        isCurrentAdmin: async () => {
          rpcCalls += 1;
          return { data: true, error: null };
        },
      }),
    );

    assert.deepEqual(result.authorization, {
      authorized: false,
      state: claims.error ? "unavailable" : "session_expired",
    });
    assert.equal(result.protectedWorkCalls, 0);
    assert.equal(rpcCalls, 0);
  }
});

test("requireAdminAction accepts only strict RPC true and never a truthy lookalike", async () => {
  for (const data of [false, null, "true", 1, { value: true }]) {
    const result = await exerciseProtectedWork(
      dependencies({ isCurrentAdmin: async () => ({ data, error: null }) }),
    );
    assert.deepEqual(result.authorization, { authorized: false, state: "session_expired" });
    assert.equal(result.protectedWorkCalls, 0);
  }
});

test("requireAdminAction fails closed when the authorization service is unavailable", async () => {
  const result = await exerciseProtectedWork(
    dependencies({
      isCurrentAdmin: async () => ({ data: null, error: new Error("transport unavailable") }),
    }),
  );
  assert.deepEqual(result.authorization, { authorized: false, state: "unavailable" });
  assert.equal(result.protectedWorkCalls, 0);
});

test("requireAdminAction returns the authenticated subject only after strict authorization", async () => {
  const result = await exerciseProtectedWork(dependencies());
  assert.deepEqual(result.authorization, { authorized: true, userId: "admin-subject" });
  assert.equal(result.protectedWorkCalls, 1);
});

test("spoofed metadata, stale admin claims and revoked sessions all fail at current authority", async () => {
  for (const scenario of ["user_metadata_spoof", "database_downgrade", "session_revoked"]) {
    const result = await exerciseProtectedWork(
      dependencies({
        getClaims: async () => ({ subject: `subject-${scenario}`, error: null }),
        isCurrentAdmin: async () => ({ data: false, error: null }),
      }),
    );

    assert.deepEqual(result.authorization, { authorized: false, state: "session_expired" }, scenario);
    assert.equal(result.protectedWorkCalls, 0, scenario);
  }
});

test("every protected request revalidates current authority after a downgrade", async () => {
  let rpcCalls = 0;
  const requireAdminAction = createRequireAdminAction(
    () => getAdminAuthorizationWith(dependencies({
      isCurrentAdmin: async () => {
        rpcCalls += 1;
        return { data: rpcCalls === 1, error: null };
      },
    })),
  );

  assert.deepEqual(await requireAdminAction(), { authorized: true, userId: "admin-subject" });
  assert.deepEqual(await requireAdminAction(), { authorized: false, state: "session_expired" });
  assert.equal(rpcCalls, 2);
});
