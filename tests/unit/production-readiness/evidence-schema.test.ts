import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateLaunchDecision,
  calculatePromotionDecision,
  archiveReferenceSchema,
  originRedirectCaseSchema,
  releaseCandidateSchema,
  requirementRecordSchema,
  validateReadinessReport,
  verificationEvidenceSchema,
  visualEvidenceSchema,
} from "../../../lib/production-readiness/evidence.ts";
import type {
  ArchiveVerification,
  OriginRedirectCase,
  ReadinessReport,
  VerificationEvidence,
} from "../../../lib/production-readiness/types.ts";

const SHA = "a".repeat(40);

function evidence(
  evidenceId: string,
  requirementIds: string[],
  status: VerificationEvidence["status"] = "passed",
): VerificationEvidence {
  return {
    evidenceId,
    requirementIds,
    category: "operations",
    mandatory: true,
    phase: "preproduction",
    status,
    gitSha: SHA,
    environment: "local",
    executedAt: "2026-08-20T12:00:00.000Z",
    executor: "automated",
    toolVersions: { node: "22.0.0" },
    expected: "Le contrôle réussit.",
    observed: status === "passed" ? "Contrôle réussi." : "Contrôle non satisfait.",
    artifactRefs: ["commands/example.json"],
    ...(status === "passed" ? {} : { actionRequired: "Corriger puis réexécuter." }),
  };
}

function report(status: VerificationEvidence["status"] = "passed"): ReadinessReport {
  const item = evidence("EV-001", ["FR-001"], status);
  return {
    schemaVersion: "1.0.0",
    candidate: {
      candidateId: "candidate-a",
      gitSha: SHA,
      branch: "dev",
      treeState: "clean",
      context: "local",
      startedAt: "2026-08-20T12:00:00.000Z",
      completedAt: "2026-08-20T12:05:00.000Z",
    },
    evidence: [item],
    coverage: {
      requirements: [
        {
          requirementId: "FR-001",
          kind: "functional_requirement",
          sourceDocument: "specs/006-production-readiness/spec.md",
          sourceRevision: SHA,
          sourceAnchor: "FR-001",
          mandatory: true,
          evidenceIds: [item.evidenceId],
        },
      ],
      expected: 1,
      covered: 1,
      missing: [],
    },
    riskAcceptances: [],
    promotionDecision: "not_approved",
    launchDecision: "not_ready",
    decisionReasons: ["promotion_not_evaluated"],
  };
}

test("VerificationEvidence accepte exactement les quatre statuts fermés", () => {
  for (const status of ["passed", "failed", "blocked", "not_run"] as const) {
    assert.equal(verificationEvidenceSchema.parse(evidence(`EV-${status}`, ["FR-001"], status)).status, status);
  }
  assert.throws(() => verificationEvidenceSchema.parse({ ...evidence("EV-invalid", ["FR-001"]), status: "skipped" }));
});

test("ReleaseCandidate, RequirementRecord, VisualEvidence et ArchiveReference sont fermés", () => {
  assert.equal(releaseCandidateSchema.parse(report().candidate).gitSha, SHA);
  assert.equal(
    requirementRecordSchema.parse(report().coverage.requirements[0]).requirementId,
    "FR-001",
  );
  const visual = visualEvidenceSchema.parse({
    ...evidence("EV-visual", ["FR-021"]),
    category: "a11y",
    executor: "manual",
    approvedBy: "visual-reviewer",
    route: "/services",
    state: "contenu",
    viewportWidth: 320,
    designReference: "doc/design.md",
    compositionMatch: true,
    tokenMatch: true,
    essentialContentMatch: true,
    interactionStateMatch: true,
    screenshotRef: "manual/visual/services-320.png",
    reviewer: "visual-reviewer",
  });
  assert.equal(visual.designReference, "doc/design.md");
  assert.throws(() => visualEvidenceSchema.parse({ ...visual, viewportWidth: 375 }));

  const archive = archiveReferenceSchema.parse({
    provider: "github_release",
    releaseId: "42",
    releaseTag: "production-readiness-aaaaaaaaaaaa",
    candidateSha: SHA,
    reportAssetName: "report.json",
    summaryAssetName: "summary.md",
    expectedImmutable: true,
  });
  assert.equal(archive.expectedImmutable, true);
  assert.throws(() => archiveReferenceSchema.parse({ ...archive, reportAssetName: "report-final.json" }));
});

test("OriginRedirectCase impose la convergence permanente vers le domaine canonique", () => {
  const redirect: OriginRedirectCase = {
    sourceOrigin: "https://www.knailsbeauty.com",
    destinationOrigin: "https://knailsbeauty.fr",
    pathPreserved: true,
    queryPreserved: true,
    permanent: true,
    certificateValid: true,
    loopDetected: false,
  };

  assert.deepEqual(originRedirectCaseSchema.parse(redirect), redirect);
  assert.throws(() => originRedirectCaseSchema.parse({
    ...redirect,
    destinationOrigin: "https://www.knailsbeauty.fr",
  }));
  assert.throws(() => originRedirectCaseSchema.parse({ ...redirect, pathPreserved: false }));
  assert.throws(() => originRedirectCaseSchema.parse({ ...redirect, queryPreserved: false }));
  assert.throws(() => originRedirectCaseSchema.parse({ ...redirect, permanent: false }));
  assert.throws(() => originRedirectCaseSchema.parse({ ...redirect, loopDetected: true }));
});

test("OriginRedirectCase exige un certificat valide pour une source HTTPS", () => {
  const httpsRedirect = {
    sourceOrigin: "https://knailsbeauty.com",
    destinationOrigin: "https://knailsbeauty.fr",
    pathPreserved: true,
    queryPreserved: true,
    permanent: true,
    loopDetected: false,
  };

  assert.throws(() => originRedirectCaseSchema.parse(httpsRedirect));
  assert.throws(() => originRedirectCaseSchema.parse({
    ...httpsRedirect,
    certificateValid: false,
  }));
  assert.equal(originRedirectCaseSchema.parse({
    ...httpsRedirect,
    sourceOrigin: "http://knailsbeauty.com",
  }).certificateValid, undefined);
});

test("les schémas refusent une preuve manuelle non signée et une archive incohérente", () => {
  assert.throws(() => verificationEvidenceSchema.parse({
    ...evidence("EV-manual", ["FR-001"]),
    executor: "manual",
  }));

  const invalid = report();
  invalid.archive = {
    provider: "github_release",
    releaseId: "42",
    releaseTag: "production-readiness-a",
    candidateSha: "b".repeat(40),
    reportAssetName: "report.json",
    summaryAssetName: "summary.md",
    expectedImmutable: true,
  };
  assert.throws(() => validateReadinessReport(invalid));
});

test("la validation refuse les SHA divergents, trous de couverture et doublons", () => {
  const wrongSha = report();
  wrongSha.evidence[0] = { ...wrongSha.evidence[0], gitSha: "b".repeat(40) };
  assert.throws(() => validateReadinessReport(wrongSha));

  const missing = report();
  missing.coverage.missing = ["FR-001"];
  missing.coverage.covered = 0;
  assert.throws(() => validateReadinessReport(missing));

  const duplicate = report();
  duplicate.evidence.push({ ...duplicate.evidence[0] });
  assert.throws(() => validateReadinessReport(duplicate));
});

test("la promotion et le lancement sont deux décisions distinctes et fail-closed", () => {
  const valid = report();
  assert.deepEqual(calculatePromotionDecision(valid), {
    decision: "approved_for_promotion",
    reasons: [],
  });
  assert.deepEqual(calculateLaunchDecision(valid), {
    decision: "not_ready",
    reasons: ["promotion_not_approved"],
  });

  valid.promotionDecision = "approved_for_promotion";
  valid.promotionApprovedBy = "release-owner";
  valid.promotionApprovedAt = "2026-08-20T12:06:00.000Z";
  valid.evidence.push({
    ...evidence("EV-smoke", ["FR-001"]),
    phase: "production",
    environment: "production",
  });
  valid.archive = {
    provider: "github_release",
    releaseId: "42",
    releaseTag: "production-readiness-aaaaaaaaaaaa",
    candidateSha: SHA,
    reportAssetName: "report.json",
    summaryAssetName: "summary.md",
    expectedImmutable: true,
  };
  const verification: ArchiveVerification = {
    releaseId: "42",
    candidateSha: SHA,
    publishedAt: "2026-08-20T12:07:00.000Z",
    assetDigests: {
      "report.json": `sha256:${"1".repeat(64)}`,
      "summary.md": `sha256:${"2".repeat(64)}`,
    },
    immutable: true,
    verifiedAt: "2026-08-20T12:08:00.000Z",
  };
  assert.deepEqual(calculateLaunchDecision(valid, verification), {
    decision: "ready",
    reasons: [],
  });

  for (const status of ["failed", "blocked", "not_run"] as const) {
    const invalid = report(status);
    assert.equal(calculatePromotionDecision(invalid).decision, "not_approved");
  }
});
