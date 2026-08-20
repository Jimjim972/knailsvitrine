export const DEPLOYMENT_CONTEXTS = [
  "local",
  "deploy_preview",
  "branch_deploy",
  "production",
] as const;
export type DeploymentContext = (typeof DEPLOYMENT_CONTEXTS)[number];

export const EVIDENCE_STATUSES = ["passed", "failed", "blocked", "not_run"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const EVIDENCE_CATEGORIES = [
  "deploy",
  "env",
  "seo",
  "a11y",
  "auth",
  "db",
  "storage",
  "contact",
  "performance",
  "recovery",
  "operations",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export type ReleaseCandidate = {
  candidateId: string;
  gitSha: string;
  branch: string;
  treeState: "clean" | "dirty";
  context: DeploymentContext;
  deployId?: string;
  deployPermalink?: string;
  canonicalOrigin?: string;
  startedAt: string;
  completedAt?: string;
};

export type RuntimeVariableName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SERVICE_SUCCESS_FLASH_SECRET";

export type EnvironmentConfiguration = {
  context: DeploymentContext;
  variableName: RuntimeVariableName;
  classification: "public" | "server_secret";
  present: boolean;
  valid: boolean;
  sourceFingerprint?: string;
  scopeObserved?: string;
  diagnosticCode?: string;
};

export type DeploymentTarget = {
  context: DeploymentContext;
  siteOrigin: string;
  canonicalMatch: boolean;
  supabaseProjectRef?: string;
  isProductionData: boolean;
  mutationAuthorized: boolean;
  formName: "contact" | "contact-preview";
};

export type OriginRedirectCase = {
  sourceOrigin: string;
  destinationOrigin: "https://knailsbeauty.fr";
  pathPreserved: true;
  queryPreserved: true;
  permanent: true;
  certificateValid?: true;
  loopDetected: false;
};

export type RequirementKind =
  | "functional_requirement"
  | "success_criterion"
  | "acceptance_criterion"
  | "feature_gate";

export type RequirementRecord = {
  requirementId: string;
  kind: RequirementKind;
  sourceDocument: string;
  sourceRevision: string;
  sourceAnchor: string;
  mandatory: boolean;
  evidenceIds: string[];
};

export type VerificationEvidence = {
  evidenceId: string;
  requirementIds: string[];
  category: EvidenceCategory;
  mandatory: boolean;
  phase: "preproduction" | "production";
  status: EvidenceStatus;
  gitSha: string;
  environment: string;
  executedAt: string;
  executor: "automated" | "manual";
  toolVersions: Record<string, string>;
  expected: string;
  observed: string;
  artifactRefs: string[];
  actionRequired?: string;
  approvedBy?: string;
};

export type AccessibilityEvidence = VerificationEvidence & {
  category: "a11y";
  route: string;
  state: string;
  viewport?: { width: number; height: number };
  zoom?: "100%" | "200%" | "reflow-400%";
  reducedMotion?: boolean;
  browserDeviceOs: string;
  assistiveTechnology?: string;
  wcagCriteria: string[];
  axeReportRef?: string;
};

export type VisualEvidence = VerificationEvidence & {
  category: "a11y";
  route: "/services" | "/galerie" | "/contact";
  state: string;
  viewportWidth: 320 | 768 | 1024;
  designReference: "doc/design.md";
  compositionMatch: boolean;
  tokenMatch: boolean;
  essentialContentMatch: boolean;
  interactionStateMatch: boolean;
  screenshotRef: string;
  reviewer: string;
};

export type RiskAcceptance = {
  riskId: string;
  description: string;
  severity: "low" | "moderate" | "major" | "critical";
  scope: string;
  expiresAt: string;
  mitigation: string;
  owner: string;
  approvedAt: string;
};

export type ArchiveReference = {
  provider: "github_release";
  releaseId: string;
  releaseTag: string;
  candidateSha: string;
  reportAssetName: "report.json";
  summaryAssetName: "summary.md";
  expectedImmutable: true;
};

export type ArchiveVerification = {
  releaseId: string;
  candidateSha: string;
  publishedAt: string;
  assetDigests: Record<string, string>;
  immutable: boolean;
  verifiedAt: string;
};

export type RequirementCoverage = {
  requirements: RequirementRecord[];
  expected: number;
  covered: number;
  missing: string[];
};

export type ReadinessReport = {
  schemaVersion: "1.0.0";
  candidate: ReleaseCandidate;
  evidence: VerificationEvidence[];
  coverage: RequirementCoverage;
  riskAcceptances: RiskAcceptance[];
  promotionDecision: "approved_for_promotion" | "not_approved";
  launchDecision: "ready" | "not_ready";
  decisionReasons: string[];
  promotionApprovedBy?: string;
  promotionApprovedAt?: string;
  launchApprovedBy?: string;
  launchApprovedAt?: string;
  archive?: ArchiveReference;
};
