import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateDeploymentTarget,
  parseExactOrigin,
} from "../../../lib/production-readiness/target-guard.ts";

const baseTarget = {
  context: "deploy_preview" as const,
  siteOrigin: "https://deploy-preview-42--knails.example.net",
  canonicalMatch: false,
  supabaseProjectRef: "previewprojectref123",
  isProductionData: false,
  mutationAuthorized: true,
  formName: "contact-preview" as const,
};

test("parseExactOrigin accepte HTTPS distant et HTTP loopback sans chemin", () => {
  assert.equal(parseExactOrigin("https://example.com"), "https://example.com");
  assert.equal(parseExactOrigin("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  for (const origin of [
    "http://example.com",
    "https://example.com/path",
    "https://user:pass@example.com",
    "https://example.com?x=1",
    "https://example.com#fragment",
    "http://localhost.evil.test:3000",
  ]) assert.throws(() => parseExactOrigin(origin));
});

test("la garde autorise une preview isolée et explicitement autorisée", () => {
  assert.deepEqual(evaluateDeploymentTarget(baseTarget, {
    operation: "mutable",
    productionSupabaseProjectRef: "productionproject123",
  }), { allowed: true, diagnosticCode: "target_allowed" });
});

test("la garde refuse production, cible ambiguë, mauvais formulaire et projet partagé", () => {
  const cases = [
    { ...baseTarget, context: "production" as const, canonicalMatch: true, formName: "contact" as const },
    { ...baseTarget, mutationAuthorized: false },
    { ...baseTarget, isProductionData: true },
    { ...baseTarget, formName: "contact" as const },
    { ...baseTarget, supabaseProjectRef: undefined },
  ];
  for (const target of cases) {
    assert.equal(evaluateDeploymentTarget(target, {
      operation: "mutable",
      productionSupabaseProjectRef: target.supabaseProjectRef ?? "productionproject123",
    }).allowed, false);
  }
});

test("la production read-only exige HTTPS, canonical et formulaire contact", () => {
  assert.deepEqual(evaluateDeploymentTarget({
    ...baseTarget,
    context: "production",
    siteOrigin: "https://www.knails.example",
    canonicalMatch: true,
    supabaseProjectRef: "productionproject123",
    isProductionData: true,
    mutationAuthorized: false,
    formName: "contact",
  }, { operation: "read_only", productionSupabaseProjectRef: "productionproject123" }), {
    allowed: true,
    diagnosticCode: "target_allowed",
  });
});
