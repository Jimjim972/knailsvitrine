import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCommandPlan,
  assertFrozenSha,
  PROFILE_COMMANDS,
  runReadinessOrchestrator,
  validateCommandResult,
} from "../../../scripts/check-production-readiness.mjs";
import { validateProviderArchive } from "../../../scripts/lib/production-readiness.mjs";
import type { ReleaseCandidate, VerificationEvidence } from "../../../lib/production-readiness/types.ts";

const SHA = "c".repeat(40);
const candidate: ReleaseCandidate = {
  candidateId: "local-candidate",
  gitSha: SHA,
  branch: "codex/006-production-readiness",
  treeState: "clean",
  context: "local",
  startedAt: "2026-08-20T12:00:00.000Z",
};

const passedResult = { command: ["npm", "run", "check"], exitCode: 0, signal: null, stdout: "ok", stderr: "" };

test("le plan fermé refuse une source omise, dupliquée ou inattendue", () => {
  const plan = PROFILE_COMMANDS.local;
  assert.throws(() => assertCommandPlan("local", plan.slice(1)), /missing_command_source/);
  assert.throws(() => assertCommandPlan("local", [...plan, plan[0]]), /duplicate_command_source/);
  assert.throws(() => assertCommandPlan("local", [...plan, { ...plan[0], id: "other" }]), /duplicate_command_source|unexpected_command_source/);
  assert.throws(() => assertCommandPlan("invalid", []), /unknown_readiness_profile/);
});

test("chaque commande est appelée exactement une fois et un échec reste visible", () => {
  const calls = new Map<string, number>();
  const result = runReadinessOrchestrator({
    profile: "local",
    candidate,
    runner(definition) {
      calls.set(definition.id, (calls.get(definition.id) ?? 0) + 1);
      return definition.id === "seo" ? { ...passedResult, exitCode: 1, stderr: "validator unavailable" } : passedResult;
    },
  });
  assert.equal([...calls.values()].every((count) => count === 1), true);
  assert.equal(result.report.promotionDecision, "not_approved");
  assert.equal(result.report.evidence.find((item) => item.evidenceId === "COMMAND-SEO")?.status, "failed");
});

test("un échec qualité, typecheck, build ou unitaire reste un gate obligatoire du rapport", () => {
  for (const failingId of ["quality", "typecheck", "build", "unit", "unit-contact"]) {
    const result = runReadinessOrchestrator({
      profile: "local",
      candidate,
      runner: (definition) => definition.id === failingId ? { ...passedResult, exitCode: 1 } : passedResult,
    });
    assert.equal(result.report.evidence.find((item) => item.evidenceId === `COMMAND-${failingId.toUpperCase()}`)?.status, "failed");
    assert.equal(result.report.promotionDecision, "not_approved");
  }
});

test("un changement de SHA et une sortie de commande invalide sont refusés", () => {
  assert.throws(() => assertFrozenSha(SHA, "d".repeat(40)), /candidate_sha_changed/);
  assert.throws(() => validateCommandResult({ exitCode: "0" }), /invalid_command_output/);
  assert.throws(() => runReadinessOrchestrator({
    profile: "local",
    candidate,
    runner: () => passedResult,
    shaAfter: () => "d".repeat(40),
  }), /candidate_sha_changed/);
});

test("les artefacts sensibles sont refusés sans révéler leur valeur", () => {
  assert.throws(() => validateCommandResult({
    ...passedResult,
    stdout: "authorization: bearer secret-value",
  }), /sensitive_artifact_detected/);
});

test("une preuve distante ou manuelle antérieure au gel, sans signature ou sans artefact est refusée", () => {
  const base: VerificationEvidence = {
    evidenceId: "MANUAL-A11Y",
    requirementIds: ["FR-029"],
    category: "a11y",
    mandatory: true,
    phase: "preproduction",
    status: "passed",
    gitSha: SHA,
    environment: "deploy-preview-isolated",
    executedAt: "2026-08-20T13:00:00.000Z",
    executor: "manual",
    toolVersions: { firefox: "modern" },
    expected: "Contrôle réel.",
    observed: "Contrôle réussi.",
    artifactRefs: ["manual/accessibility.md"],
    approvedBy: "tester",
  };
  const run = (evidence: VerificationEvidence) => runReadinessOrchestrator({
    profile: "local",
    candidate,
    externalEvidence: [evidence],
    runner: () => passedResult,
  });
  assert.throws(() => run({ ...base, executedAt: "2026-08-20T11:00:00.000Z" }), /stale_evidence/);
  assert.throws(() => run({ ...base, approvedBy: undefined }), /manual_evidence_requires_approval/);
  assert.throws(() => run({ ...base, artifactRefs: [] }), /mandatory_evidence_artifact_missing/);
});

test("l'absence de preuves finales maintient promotion et lancement fermés", () => {
  const result = runReadinessOrchestrator({ profile: "local", candidate, runner: () => passedResult });
  assert.equal(result.report.promotionDecision, "not_approved");
  assert.equal(result.report.launchDecision, "not_ready");
  assert.equal(result.report.evidence.some((item) => item.status === "not_run"), true);
  assert.match(result.report.decisionReasons.join(","), /preproduction_gate_not_passed/);
});

test("une publication d'archive échouée ou un digest fournisseur divergent est refusé", () => {
  const reference = {
    provider: "github_release" as const,
    releaseId: "release-42",
    releaseTag: "production-readiness-cccccccccccc",
    candidateSha: SHA,
    reportAssetName: "report.json" as const,
    summaryAssetName: "summary.md" as const,
    expectedImmutable: true as const,
  };
  const metadata = {
    releaseId: reference.releaseId,
    releaseTag: reference.releaseTag,
    candidateSha: SHA,
    immutable: true,
    assetDigests: {
      "report.json": `sha256:${"1".repeat(64)}`,
      "summary.md": `sha256:${"2".repeat(64)}`,
    },
  };
  assert.throws(() => validateProviderArchive(reference, { ...metadata, immutable: false }), /archive_identity_mismatch/);
  assert.throws(() => validateProviderArchive(reference, metadata, {
    "report.json": `sha256:${"3".repeat(64)}`,
    "summary.md": metadata.assetDigests["summary.md"],
  }), /archive_digest_mismatch/);
});
