import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildReadinessReport,
  summarizeCoverageBySource,
  validateRequirementInventory,
} from "../../../lib/production-readiness/report.ts";
import { createRequirementManifest, REQUIREMENT_MANIFEST_COUNTS } from "../../../lib/production-readiness/requirements.ts";
import type { ReleaseCandidate, VerificationEvidence } from "../../../lib/production-readiness/types.ts";

const SHA = "a".repeat(40);
const STARTED_AT = "2026-08-20T12:00:00.000Z";

function candidate(): ReleaseCandidate {
  return {
    candidateId: "candidate-a",
    gitSha: SHA,
    branch: "codex/006-production-readiness",
    treeState: "clean",
    context: "deploy_preview",
    deployId: "deploy-1",
    deployPermalink: "https://deploy-1.example.net",
    startedAt: STARTED_AT,
  };
}

function fullEvidence(status: VerificationEvidence["status"] = "passed"): VerificationEvidence[] {
  return createRequirementManifest(SHA).map((requirement) => ({
    evidenceId: `E-${requirement.requirementId}`,
    requirementIds: [requirement.requirementId],
    category: "operations",
    mandatory: true,
    phase: "preproduction",
    status,
    gitSha: SHA,
    environment: "deploy-preview-isolated",
    executedAt: "2026-08-20T13:00:00.000Z",
    executor: "automated",
    toolVersions: { node: "22.0.0" },
    expected: "Le contrôle réussit.",
    observed: status === "passed" ? "Contrôle réussi." : "Contrôle non exécuté.",
    artifactRefs: [`commands/${requirement.requirementId}.json`],
    ...(status === "passed" ? {} : { actionRequired: "Exécuter le contrôle." }),
  }));
}

test("le manifeste couvre exactement FR, SC, critères doc/spec et gates 001 à 005", () => {
  const manifest = createRequirementManifest(SHA);
  const expected = REQUIREMENT_MANIFEST_COUNTS.functionalRequirements +
    REQUIREMENT_MANIFEST_COUNTS.successCriteria +
    REQUIREMENT_MANIFEST_COUNTS.acceptanceCriteria +
    REQUIREMENT_MANIFEST_COUNTS.featureGates;
  assert.equal(manifest.length, expected);
  assert.equal(new Set(manifest.map((item) => item.requirementId)).size, expected);
});

test("une couverture intégrale réussie et signée autorise la promotion sans déclarer le lancement", () => {
  const report = buildReadinessReport({
    candidate: candidate(),
    evidence: fullEvidence(),
    promotionApproval: { approvedBy: "release-owner", approvedAt: "2026-08-20T14:00:00.000Z" },
  });
  assert.equal(report.promotionDecision, "approved_for_promotion");
  assert.equal(report.launchDecision, "not_ready");
  assert.deepEqual(report.decisionReasons, ["production_smoke_missing", "archive_verification_missing"]);
  assert.equal(Object.values(summarizeCoverageBySource(report)).every((item) => item.expected === item.passed), true);
});

for (const status of ["failed", "blocked", "not_run"] as const) {
  test(`un gate ${status} conserve une décision fail-closed`, () => {
    const evidence = fullEvidence();
    evidence[0] = {
      ...evidence[0],
      status,
      observed: `Statut ${status}.`,
      actionRequired: "Corriger ou exécuter le contrôle.",
    };
    const report = buildReadinessReport({ candidate: candidate(), evidence });
    assert.equal(report.promotionDecision, "not_approved");
    assert.equal(report.launchDecision, "not_ready");
    assert.match(report.decisionReasons.join(","), /preproduction_gate_not_passed/);
  });
}

test("une exigence omise ou une source dupliquée est refusée", () => {
  const manifest = createRequirementManifest(SHA);
  assert.throws(() => validateRequirementInventory(manifest.slice(1), SHA), /missing_requirement/);
  const duplicateSource = manifest.map((item) => ({ ...item }));
  duplicateSource[1].sourceDocument = duplicateSource[0].sourceDocument;
  duplicateSource[1].sourceAnchor = duplicateSource[0].sourceAnchor;
  duplicateSource[1].kind = duplicateSource[0].kind;
  assert.throws(() => validateRequirementInventory(duplicateSource, SHA), /duplicate_requirement_source/);
});

test("les preuves absentes, dupliquées, périmées, sans artefact ou d'un autre SHA sont refusées", () => {
  const evidence = fullEvidence();
  assert.throws(() => buildReadinessReport({ candidate: candidate(), evidence: evidence.slice(1) }), /requirement_evidence_missing/);
  assert.throws(() => buildReadinessReport({ candidate: candidate(), evidence: [...evidence, evidence[0]] }), /duplicate_evidence_id/);
  assert.throws(() => buildReadinessReport({
    candidate: candidate(),
    evidence: evidence.map((item, index) => index === 0 ? { ...item, executedAt: "2026-08-20T11:00:00.000Z" } : item),
  }), /stale_evidence/);
  assert.throws(() => buildReadinessReport({
    candidate: candidate(),
    evidence: evidence.map((item, index) => index === 0 ? { ...item, artifactRefs: [] } : item),
  }), /mandatory_evidence_artifact_missing/);
  assert.throws(() => buildReadinessReport({
    candidate: candidate(),
    evidence: evidence.map((item, index) => index === 0 ? { ...item, gitSha: "b".repeat(40) } : item),
  }), /evidence_sha_mismatch/);
});

test("une preuve manuelle non signée et un risque majeur bloquent la décision", () => {
  const evidence = fullEvidence();
  evidence[0] = { ...evidence[0], executor: "manual" };
  assert.throws(() => buildReadinessReport({ candidate: candidate(), evidence }), /manual_evidence_requires_approval/);

  const report = buildReadinessReport({
    candidate: candidate(),
    evidence: fullEvidence(),
    riskAcceptances: [{
      riskId: "RISK-1",
      description: "Risque majeur ouvert.",
      severity: "major",
      scope: "production",
      expiresAt: "2026-09-20T00:00:00.000Z",
      mitigation: "Ne pas promouvoir.",
      owner: "release-owner",
      approvedAt: "2026-08-20T14:00:00.000Z",
    }],
  });
  assert.equal(report.promotionDecision, "not_approved");
  assert.match(report.decisionReasons.join(","), /blocking_risk_present/);
});
