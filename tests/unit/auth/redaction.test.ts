import assert from "node:assert/strict";
import test from "node:test";
import { createAuthDiagnostic } from "../../../lib/auth/auth-diagnostics.ts";

test("diagnostics expose only allowlisted shareable fields", () => {
  const diagnostic = createAuthDiagnostic("authentication_refused", "sign_in", "safe-id");
  assert.deepEqual(Object.keys(diagnostic).sort(), ["category", "correlationId", "stage"]);
  const output = JSON.stringify(diagnostic);
  for (const forbidden of ["email", "password", "token", "cookie", "session", "providerCode", "stack"]) {
    assert.equal(output.toLowerCase().includes(forbidden.toLowerCase()), false);
  }
});
