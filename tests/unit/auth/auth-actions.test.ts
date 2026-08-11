import assert from "node:assert/strict";
import test from "node:test";
import {
  runLoginAttempt,
  runLogoutAttempt,
  type AuthActionDependencies,
} from "../../../lib/auth/auth-actions-core.ts";

function validForm() {
  const form = new FormData();
  form.set("email", "admin@example.com");
  form.set("password", "secret");
  form.set("returnTo", "/admin");
  return form;
}

test("one accepted login submission verifies credentials exactly once", async () => {
  let calls = 0;
  const dependencies: AuthActionDependencies = {
    signInWithPassword: async () => {
      calls += 1;
      return { error: null };
    },
    isCurrentAdmin: async () => ({ data: true, error: null }),
    signOutLocal: async () => ({ error: null }),
  };
  const result = await runLoginAttempt(validForm(), dependencies);
  assert.equal(calls, 1);
  assert.deepEqual(result, { kind: "redirect", path: "/admin" });
});

test("failed post-auth cleanup remains unavailable and leaks no password", async () => {
  const dependencies: AuthActionDependencies = {
    signInWithPassword: async () => ({ error: null }),
    isCurrentAdmin: async () => ({ data: null, error: { status: 503 } }),
    signOutLocal: async () => ({ error: { status: 503 } }),
  };
  const result = await runLoginAttempt(validForm(), dependencies);
  assert.equal(result.kind, "state");
  assert.equal(result.state.status, "unavailable");
  assert.equal("password" in result.state, false);
});

test("logout redirects only after confirmed local success", async () => {
  assert.deepEqual(await runLogoutAttempt(async () => ({ error: null })), {
    kind: "redirect",
    path: "/admin/connexion",
  });
  const failure = await runLogoutAttempt(async () => ({ error: { status: 503 } }));
  assert.equal(failure.kind, "state");
  assert.equal(failure.state.status, "unavailable");
});
