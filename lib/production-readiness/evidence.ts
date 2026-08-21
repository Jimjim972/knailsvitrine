import { z } from "zod";
import {
  DEPLOYMENT_CONTEXTS,
  EVIDENCE_CATEGORIES,
  EVIDENCE_STATUSES,
  type ArchiveVerification,
  type ReadinessReport,
} from "./types.ts";

const shaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const utcTimestampSchema = z.iso.datetime({ offset: true });
const nonEmptySchema = z.string().trim().min(1);
const identifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

function isExactOrigin(value: string, allowLoopbackHttp = false): boolean {
  try {
    const url = new URL(value);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const protocolAllowed = url.protocol === "https:" ||
      (allowLoopbackHttp && url.protocol === "http:" && loopback.has(url.hostname));
    return protocolAllowed && !url.username && !url.password && url.pathname === "/" &&
      !url.search && !url.hash && url.origin === value;
  } catch {
    return false;
  }
}

function isExactHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username && !url.password && url.pathname === "/" &&
      !url.search && !url.hash && url.origin === value;
  } catch {
    return false;
  }
}

export const releaseCandidateSchema = z.object({
  candidateId: identifierSchema,
  gitSha: shaSchema,
  branch: nonEmptySchema,
  treeState: z.enum(["clean", "dirty"]),
  context: z.enum(DEPLOYMENT_CONTEXTS),
  deployId: nonEmptySchema.optional(),
  deployPermalink: z.string().url().refine((value) => isExactOrigin(value)).optional(),
  canonicalOrigin: z.string().url().refine((value) => isExactOrigin(value)).optional(),
  startedAt: utcTimestampSchema,
  completedAt: utcTimestampSchema.optional(),
}).superRefine((candidate, context) => {
  if (candidate.context !== "local" && (!candidate.deployId || !candidate.deployPermalink)) {
    context.addIssue({ code: "custom", message: "hosted_candidate_requires_deploy_identity" });
  }
  if (candidate.context === "production" && !candidate.canonicalOrigin) {
    context.addIssue({ code: "custom", message: "production_requires_canonical_origin" });
  }
});

export const environmentConfigurationSchema = z.object({
  context: z.enum(DEPLOYMENT_CONTEXTS),
  variableName: z.enum([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SERVICE_SUCCESS_FLASH_SECRET",
  ]),
  classification: z.enum(["public", "server_secret"]),
  present: z.boolean(),
  valid: z.boolean(),
  sourceFingerprint: nonEmptySchema.optional(),
  scopeObserved: nonEmptySchema.optional(),
  diagnosticCode: identifierSchema.optional(),
});

export const deploymentTargetSchema = z.object({
  context: z.enum(DEPLOYMENT_CONTEXTS),
  siteOrigin: z.string().refine((value) => isExactOrigin(value, true)),
  canonicalMatch: z.boolean(),
  supabaseProjectRef: nonEmptySchema.optional(),
  isProductionData: z.boolean(),
  mutationAuthorized: z.boolean(),
  formName: z.enum(["contact", "contact-preview"]),
});

export const originRedirectCaseSchema = z.strictObject({
  sourceOrigin: z.string().url().refine(isExactHttpOrigin),
  destinationOrigin: z.literal("https://knailsbeauty.fr"),
  pathPreserved: z.literal(true),
  queryPreserved: z.literal(true),
  permanent: z.literal(true),
  certificateValid: z.literal(true).optional(),
  loopDetected: z.literal(false),
}).superRefine((redirect, context) => {
  if (redirect.sourceOrigin.startsWith("https://") && redirect.certificateValid !== true) {
    context.addIssue({
      code: "custom",
      path: ["certificateValid"],
      message: "https_source_requires_valid_certificate",
    });
  }
});

export const requirementRecordSchema = z.object({
  requirementId: identifierSchema,
  kind: z.enum([
    "functional_requirement",
    "success_criterion",
    "acceptance_criterion",
    "feature_gate",
  ]),
  sourceDocument: nonEmptySchema,
  sourceRevision: shaSchema,
  sourceAnchor: nonEmptySchema,
  mandatory: z.boolean(),
  evidenceIds: z.array(identifierSchema).min(1),
});

export const verificationEvidenceSchema = z.object({
  evidenceId: identifierSchema,
  requirementIds: z.array(identifierSchema).min(1),
  category: z.enum(EVIDENCE_CATEGORIES),
  mandatory: z.boolean(),
  phase: z.enum(["preproduction", "production"]),
  status: z.enum(EVIDENCE_STATUSES),
  gitSha: shaSchema,
  environment: nonEmptySchema,
  executedAt: utcTimestampSchema,
  executor: z.enum(["automated", "manual"]),
  toolVersions: z.record(z.string(), nonEmptySchema),
  expected: nonEmptySchema,
  observed: nonEmptySchema,
  artifactRefs: z.array(nonEmptySchema),
  actionRequired: nonEmptySchema.optional(),
  approvedBy: nonEmptySchema.optional(),
}).superRefine((evidence, context) => {
  if (evidence.status !== "passed" && !evidence.actionRequired) {
    context.addIssue({ code: "custom", message: "non_passed_evidence_requires_action" });
  }
  if (evidence.executor === "manual" && !evidence.approvedBy) {
    context.addIssue({ code: "custom", message: "manual_evidence_requires_approval" });
  }
});

export const accessibilityEvidenceSchema = verificationEvidenceSchema.and(z.object({
  category: z.literal("a11y"),
  route: nonEmptySchema,
  state: nonEmptySchema,
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  zoom: z.enum(["100%", "200%", "reflow-400%"]).optional(),
  reducedMotion: z.boolean().optional(),
  browserDeviceOs: nonEmptySchema,
  assistiveTechnology: nonEmptySchema.optional(),
  wcagCriteria: z.array(nonEmptySchema),
  axeReportRef: nonEmptySchema.optional(),
}));

export const visualEvidenceSchema = verificationEvidenceSchema.and(z.object({
  category: z.literal("a11y"),
  route: z.enum(["/services", "/galerie", "/contact"]),
  state: nonEmptySchema,
  viewportWidth: z.union([z.literal(320), z.literal(768), z.literal(1024)]),
  designReference: z.literal("doc/design.md"),
  compositionMatch: z.boolean(),
  tokenMatch: z.boolean(),
  essentialContentMatch: z.boolean(),
  interactionStateMatch: z.boolean(),
  screenshotRef: nonEmptySchema,
  reviewer: nonEmptySchema,
}));

export const riskAcceptanceSchema = z.object({
  riskId: identifierSchema,
  description: nonEmptySchema,
  severity: z.enum(["low", "moderate", "major", "critical"]),
  scope: nonEmptySchema,
  expiresAt: utcTimestampSchema,
  mitigation: nonEmptySchema,
  owner: nonEmptySchema,
  approvedAt: utcTimestampSchema,
});

export const archiveReferenceSchema = z.object({
  provider: z.literal("github_release"),
  releaseId: nonEmptySchema,
  releaseTag: identifierSchema,
  candidateSha: shaSchema,
  reportAssetName: z.literal("report.json"),
  summaryAssetName: z.literal("summary.md"),
  expectedImmutable: z.literal(true),
});

const digestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
export const archiveVerificationSchema = z.object({
  releaseId: nonEmptySchema,
  candidateSha: shaSchema,
  publishedAt: utcTimestampSchema,
  assetDigests: z.record(z.string(), digestSchema),
  immutable: z.boolean(),
  verifiedAt: utcTimestampSchema,
});

export const readinessReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  candidate: releaseCandidateSchema,
  evidence: z.array(verificationEvidenceSchema),
  coverage: z.object({
    requirements: z.array(requirementRecordSchema),
    expected: z.number().int().nonnegative(),
    covered: z.number().int().nonnegative(),
    missing: z.array(identifierSchema),
  }),
  riskAcceptances: z.array(riskAcceptanceSchema),
  promotionDecision: z.enum(["approved_for_promotion", "not_approved"]),
  launchDecision: z.enum(["ready", "not_ready"]),
  decisionReasons: z.array(identifierSchema),
  promotionApprovedBy: nonEmptySchema.optional(),
  promotionApprovedAt: utcTimestampSchema.optional(),
  launchApprovedBy: nonEmptySchema.optional(),
  launchApprovedAt: utcTimestampSchema.optional(),
  archive: archiveReferenceSchema.optional(),
});

function assertUnique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}

export function validateReadinessReport(input: unknown): ReadinessReport {
  const report = readinessReportSchema.parse(input) as ReadinessReport;
  const sha = report.candidate.gitSha;
  if (report.evidence.some((item) => item.gitSha !== sha)) throw new Error("evidence_sha_mismatch");
  if (report.coverage.requirements.some((item) => item.sourceRevision !== sha)) {
    throw new Error("requirement_sha_mismatch");
  }
  assertUnique(report.evidence.map((item) => item.evidenceId), "duplicate_evidence_id");
  assertUnique(report.coverage.requirements.map((item) => item.requirementId), "duplicate_requirement_id");
  if (report.coverage.expected !== report.coverage.requirements.length ||
      report.coverage.covered !== report.coverage.expected || report.coverage.missing.length > 0) {
    throw new Error("incomplete_coverage");
  }
  const evidenceIds = new Set(report.evidence.map((item) => item.evidenceId));
  for (const requirement of report.coverage.requirements) {
    if (requirement.evidenceIds.some((id) => !evidenceIds.has(id))) {
      throw new Error("unknown_evidence_reference");
    }
  }
  if (report.archive && report.archive.candidateSha !== sha) throw new Error("archive_sha_mismatch");
  if (report.promotionDecision === "approved_for_promotion" &&
      (!report.promotionApprovedBy || !report.promotionApprovedAt)) {
    throw new Error("promotion_approval_missing");
  }
  if (report.launchDecision === "ready" && (!report.launchApprovedBy || !report.launchApprovedAt)) {
    throw new Error("launch_approval_missing");
  }
  return report;
}

export function calculatePromotionDecision(report: ReadinessReport) {
  const reasons: string[] = [];
  if (report.candidate.treeState !== "clean") reasons.push("candidate_tree_dirty");
  if (report.coverage.covered !== report.coverage.expected || report.coverage.missing.length > 0) {
    reasons.push("mandatory_coverage_incomplete");
  }
  if (report.evidence.some((item) => item.phase === "preproduction" && item.mandatory && item.status !== "passed")) {
    reasons.push("preproduction_gate_not_passed");
  }
  if (report.evidence.some((item) => item.gitSha !== report.candidate.gitSha)) {
    reasons.push("evidence_sha_mismatch");
  }
  if (report.riskAcceptances.some((risk) => risk.severity === "major" || risk.severity === "critical")) {
    reasons.push("blocking_risk_present");
  }
  return {
    decision: reasons.length === 0 ? "approved_for_promotion" as const : "not_approved" as const,
    reasons,
  };
}

export function calculateLaunchDecision(
  report: ReadinessReport,
  archiveVerification?: ArchiveVerification,
) {
  const reasons: string[] = [];
  if (report.promotionDecision !== "approved_for_promotion") reasons.push("promotion_not_approved");
  if (report.evidence.some((item) => item.phase === "production" && item.mandatory && item.status !== "passed")) {
    reasons.push("production_gate_not_passed");
  }
  if (report.promotionDecision === "approved_for_promotion" &&
      !report.evidence.some((item) => item.phase === "production" && item.mandatory)) {
    reasons.push("production_smoke_missing");
  }
  if (report.promotionDecision === "approved_for_promotion") {
    if (!report.archive || !archiveVerification) {
      reasons.push("archive_verification_missing");
    } else {
      const parsed = archiveVerificationSchema.safeParse(archiveVerification);
      const expectedAssets = [report.archive.reportAssetName, report.archive.summaryAssetName];
      if (!parsed.success || !archiveVerification.immutable ||
          archiveVerification.releaseId !== report.archive.releaseId ||
          archiveVerification.candidateSha !== report.archive.candidateSha ||
          expectedAssets.some((name) => !archiveVerification.assetDigests[name])) {
        reasons.push("archive_verification_invalid");
      }
    }
  }
  return {
    decision: reasons.length === 0 ? "ready" as const : "not_ready" as const,
    reasons,
  };
}
