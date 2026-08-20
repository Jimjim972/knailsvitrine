import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("scripts/check-preview-security.mjs", "utf8");

test("la matrice mutable exige la garde preview et une autorisation explicite", () => {
  assert.match(source, /checkDeployTarget/);
  assert.match(source, /operation:\s*"mutable"/);
  assert.match(source, /mutationAuthorized:\s*environment\.MUTATION_AUTHORIZED === "true"/);
  assert.match(source, /context:\s*"deploy_preview"/);
});

test("les assertions utilisent des sessions réelles et réservent la clé secrète aux fixtures", () => {
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signInAnonymously/);
  assert.match(source, /is_current_admin/);
  assert.match(source, /fixtureClient\.auth\.admin\.createUser/);
  assert.doesNotMatch(source, /service_role/i);
});

test("les fixtures UUID sont nettoyées et la preuve ne contient aucune valeur sensible", () => {
  assert.match(source, /randomUUID/);
  assert.match(source, /deleteUser/);
  assert.match(source, /storage\.from\(BUCKET\)\.remove/);
  assert.match(source, /security-preview\.md/);
  assert.match(source, /hosted-auth\.md/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|apiKey|secretKey)/i);
});
