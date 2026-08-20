import {
  calculateLaunchDecision,
  calculatePromotionDecision,
  validateReadinessReport,
  verificationEvidenceSchema,
} from "./evidence.ts";
import { createRequirementManifest } from "./requirements.ts";
import type {
  ArchiveReference,
  ArchiveVerification,
  ReadinessReport,
  ReleaseCandidate,
  RequirementRecord,
  RiskAcceptance,
  VerificationEvidence,
} from "./types.ts";

type Approval = {
  approvedBy: string;
  approvedAt: string;
};

export type BuildReadinessReportInput = {
  candidate: ReleaseCandidate;
  evidence: VerificationEvidence[];
  requirements?: RequirementRecord[];
  riskAcceptances?: RiskAcceptance[];
  promotionApproval?: Approval;
  launchApproval?: Approval;
  archive?: ArchiveReference;
  archiveVerification?: ArchiveVerification;
};

function assertUnique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}

function sourceKey(requirement: RequirementRecord): string {
  return [requirement.kind, requirement.sourceDocument, requirement.sourceAnchor].join(":");
}

export function validateRequirementInventory(
  requirements: RequirementRecord[],
  candidateSha: string,
): RequirementRecord[] {
  const canonical = createRequirementManifest(candidateSha);
  assertUnique(requirements.map((item) => item.requirementId), "duplicate_requirement_id");
  assertUnique(requirements.map(sourceKey), "duplicate_requirement_source");

  const received = new Map(requirements.map((item) => [item.requirementId, item]));
  for (const expected of canonical) {
    const actual = received.get(expected.requirementId);
    if (!actual) throw new Error(`missing_requirement:${expected.requirementId}`);
    if (
      actual.kind !== expected.kind ||
      actual.sourceDocument !== expected.sourceDocument ||
      actual.sourceAnchor !== expected.sourceAnchor ||
      actual.sourceRevision !== candidateSha ||
      actual.mandatory !== expected.mandatory
    ) {
      throw new Error(`requirement_source_mismatch:${expected.requirementId}`);
    }
  }
  if (received.size !== canonical.length) throw new Error("unexpected_requirement");
  return requirements;
}

function validateEvidenceSet(
  evidence: VerificationEvidence[],
  requirements: RequirementRecord[],
  candidate: ReleaseCandidate,
): Map<string, string[]> {
  assertUnique(evidence.map((item) => item.evidenceId), "duplicate_evidence_id");
  const requirementIds = new Set(requirements.map((item) => item.requirementId));
  const evidenceByRequirement = new Map<string, string[]>();

  for (const rawEvidence of evidence) {
    const item = verificationEvidenceSchema.parse(rawEvidence) as VerificationEvidence;
    if (item.gitSha !== candidate.gitSha) throw new Error("evidence_sha_mismatch");
    if (Date.parse(item.executedAt) < Date.parse(candidate.startedAt)) {
      throw new Error(`stale_evidence:${item.evidenceId}`);
    }
    if (item.mandatory && item.artifactRefs.length === 0) {
      throw new Error(`mandatory_evidence_artifact_missing:${item.evidenceId}`);
    }
    for (const requirementId of item.requirementIds) {
      if (!requirementIds.has(requirementId)) {
        throw new Error(`unknown_requirement_reference:${requirementId}`);
      }
      const current = evidenceByRequirement.get(requirementId) ?? [];
      current.push(item.evidenceId);
      evidenceByRequirement.set(requirementId, current);
    }
  }
  return evidenceByRequirement;
}

export function buildReadinessReport(input: BuildReadinessReportInput): ReadinessReport {
  const requirements = validateRequirementInventory(
    input.requirements ?? createRequirementManifest(input.candidate.gitSha),
    input.candidate.gitSha,
  );
  const evidenceByRequirement = validateEvidenceSet(input.evidence, requirements, input.candidate);
  const missing = requirements
    .filter((item) => item.mandatory && !evidenceByRequirement.has(item.requirementId))
    .map((item) => item.requirementId);
  if (missing.length > 0) throw new Error(`requirement_evidence_missing:${missing[0]}`);

  const coveredRequirements = requirements.map((item) => ({
    ...item,
    evidenceIds: evidenceByRequirement.get(item.requirementId) ?? [],
  }));
  const report: ReadinessReport = {
    schemaVersion: "1.0.0",
    candidate: input.candidate,
    evidence: input.evidence,
    coverage: {
      requirements: coveredRequirements,
      expected: coveredRequirements.length,
      covered: coveredRequirements.length,
      missing: [],
    },
    riskAcceptances: input.riskAcceptances ?? [],
    promotionDecision: "not_approved",
    launchDecision: "not_ready",
    decisionReasons: [],
    archive: input.archive,
  };

  const promotion = calculatePromotionDecision(report);
  const promotionReasons = [...promotion.reasons];
  if (promotion.decision === "approved_for_promotion" && !input.promotionApproval) {
    promotionReasons.push("promotion_approval_missing");
  }
  if (promotionReasons.length === 0 && input.promotionApproval) {
    report.promotionDecision = "approved_for_promotion";
    report.promotionApprovedBy = input.promotionApproval.approvedBy;
    report.promotionApprovedAt = input.promotionApproval.approvedAt;
  }

  const launch = calculateLaunchDecision(report, input.archiveVerification);
  const launchReasons = [...launch.reasons];
  if (launch.decision === "ready" && !input.launchApproval) {
    launchReasons.push("launch_approval_missing");
  }
  if (launchReasons.length === 0 && input.launchApproval) {
    report.launchDecision = "ready";
    report.launchApprovedBy = input.launchApproval.approvedBy;
    report.launchApprovedAt = input.launchApproval.approvedAt;
  }

  report.decisionReasons = [...new Set([...promotionReasons, ...launchReasons])];
  return validateReadinessReport(report);
}

export function summarizeCoverageBySource(report: ReadinessReport) {
  return report.coverage.requirements.reduce<Record<string, { expected: number; passed: number }>>(
    (summary, requirement) => {
      const key = `${requirement.kind}:${requirement.sourceDocument}`;
      const current = summary[key] ?? { expected: 0, passed: 0 };
      current.expected += 1;
      const linked = requirement.evidenceIds
        .map((id) => report.evidence.find((item) => item.evidenceId === id))
        .filter((item): item is VerificationEvidence => Boolean(item));
      if (linked.some((item) => item.mandatory && item.status === "passed")) current.passed += 1;
      summary[key] = current;
      return summary;
    },
    {},
  );
}
