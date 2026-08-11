import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminCredentials } from "../../../lib/validations/admin-auth.ts";

test("normalizes surrounding spaces and email case", () => {
  const result = parseAdminCredentials({ email: "  ADMIN@Example.COM ", password: "secret" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, "admin@example.com");
});

for (const input of ["", "not-an-email", `${"a".repeat(245)}@example.com`]) {
  test(`rejects invalid email before Auth: ${input.length} chars`, () => {
    const result = parseAdminCredentials({ email: input, password: "secret" });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.fieldErrors.email?.length);
  });
}

test("requires a password without imposing a creation policy", () => {
  assert.equal(parseAdminCredentials({ email: "admin@example.com", password: "" }).success, false);
  assert.equal(parseAdminCredentials({ email: "admin@example.com", password: "x" }).success, true);
});
