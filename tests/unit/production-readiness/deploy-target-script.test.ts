import assert from "node:assert/strict";
import test from "node:test";
import { checkDeployTarget } from "../../../scripts/check-deploy-target.mjs";

const SHA = "a".repeat(40);
const preview = {
  candidateSha: SHA,
  context: "deploy_preview" as const,
  siteOrigin: "https://deploy-preview-42--knails.netlify.app",
  commitRef: SHA,
  supabaseProjectRef: "previewprojectref",
  productionSupabaseProjectRef: "productionprojectref",
  isProductionData: false,
  mutationAuthorized: true,
  formName: "contact-preview" as const,
  canonicalMatch: false,
  operation: "mutable" as const,
};

test("le contrôle CLI accepte une preview HTTPS isolée liée au SHA", () => {
  assert.deepEqual(checkDeployTarget(preview), {
    allowed: true,
    diagnosticCode: "target_allowed",
    context: "deploy_preview",
    candidateSha: SHA,
  });
});

test("le contrôle échoue fermé sur SHA, contexte, origine, projet ou autorisation ambiguës", () => {
  const cases = [
    { ...preview, candidateSha: "short" },
    { ...preview, commitRef: "b".repeat(40) },
    { ...preview, context: "unknown" },
    { ...preview, siteOrigin: "http://deploy-preview-42--knails.netlify.app" },
    { ...preview, supabaseProjectRef: "productionprojectref" },
    { ...preview, mutationAuthorized: false },
    { ...preview, isProductionData: true },
    { ...preview, formName: "contact" },
  ];
  for (const input of cases) {
    const result = checkDeployTarget(input as typeof preview);
    assert.equal(result.allowed, false);
    assert.notEqual(result.diagnosticCode, "target_allowed");
    assert.doesNotMatch(JSON.stringify(result), /previewprojectref|productionprojectref/);
  }
});

test("aucune opération mutable n'est autorisée en production", () => {
  const result = checkDeployTarget({
    ...preview,
    context: "production",
    siteOrigin: "https://knails.example",
    supabaseProjectRef: "productionprojectref",
    isProductionData: true,
    mutationAuthorized: true,
    formName: "contact",
    canonicalMatch: true,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.diagnosticCode, "production_mutation_forbidden");
});
