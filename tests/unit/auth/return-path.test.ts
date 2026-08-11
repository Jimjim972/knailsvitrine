import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAdminReturnPath } from "../../../lib/auth/return-path.ts";

test("keeps safe admin paths and query strings", () => {
  assert.equal(sanitizeAdminReturnPath("/admin"), "/admin");
  assert.equal(sanitizeAdminReturnPath("/admin/prestations?filtre=actif"), "/admin/prestations?filtre=actif");
});

for (const value of [
  undefined,
  "",
  "https://evil.example/admin",
  "//evil.example/admin",
  "/admin\\evil",
  "/admin#secret",
  "/admin/%2e%2e/contact",
  "/admin%2Fprestations",
  "/admin/\u0000",
  "/admin/connexion",
  "/admin/connexion/",
  "/admin/connexion/etape",
  "/admin/connexion?returnTo=/admin",
]) {
  test(`falls back for unsafe return path ${JSON.stringify(value)}`, () => {
    assert.equal(sanitizeAdminReturnPath(value), "/admin");
  });
}
