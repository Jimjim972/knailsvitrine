import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProductionSmokeEnvironment } from "../../../scripts/smoke-production.mjs";

const SHA = "e".repeat(40);
const validEnvironment = {
  PRODUCTION_BASE_URL: "https://knailsbeauty.fr",
  KN_PRODUCTION_EXPECTED_SHA: SHA,
  KN_PRODUCTION_TECHNICAL_ORIGIN: "https://friendly-cactus-227b77.netlify.app",
  KN_PRODUCTION_CONTACT_SMOKE_AUTHORIZED: "true",
  KN_PRODUCTION_CONTACT_SMOKE_EMAIL: "smoke@example.invalid",
  KN_PRODUCTION_ADMIN_EMAIL: "admin@example.invalid",
  KN_PRODUCTION_ADMIN_PASSWORD: "not-a-real-password",
  KN_PRODUCTION_DEPLOY_ID: "deploy-1",
};

test("la garde accepte uniquement le domaine canonique et le SHA observé", () => {
  const target = validateProductionSmokeEnvironment(validEnvironment, SHA);
  assert.equal(target.canonicalOrigin, "https://knailsbeauty.fr");
  assert.equal(target.candidateSha, SHA);
  assert.throws(() => validateProductionSmokeEnvironment({
    ...validEnvironment,
    PRODUCTION_BASE_URL: "https://www.knailsbeauty.fr",
  }, SHA), /invalid_production_origin/);
  assert.throws(() => validateProductionSmokeEnvironment(validEnvironment, "f".repeat(40)), /production_sha_mismatch/);
});

test("la garde exige l'autorisation Contact, les identifiants et l'hôte Netlify exact", () => {
  assert.throws(() => validateProductionSmokeEnvironment({
    ...validEnvironment,
    KN_PRODUCTION_CONTACT_SMOKE_AUTHORIZED: "false",
  }, SHA), /contact_smoke_not_authorized/);
  assert.throws(() => validateProductionSmokeEnvironment({
    ...validEnvironment,
    KN_PRODUCTION_ADMIN_PASSWORD: "",
  }, SHA), /missing_smoke_environment/);
  assert.throws(() => validateProductionSmokeEnvironment({
    ...validEnvironment,
    KN_PRODUCTION_TECHNICAL_ORIGIN: "https://example.com",
  }, SHA), /invalid_technical_origin/);
});
