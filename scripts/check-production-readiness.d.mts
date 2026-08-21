import type {
  ArchiveReference,
  ArchiveVerification,
  ReadinessReport,
  ReleaseCandidate,
  VerificationEvidence,
} from "../lib/production-readiness/types.ts";

export type ReadinessCommandDefinition = {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requirementIds: string[];
};

export type ReadinessCommandResult = {
  command: string[];
  exitCode: number;
  signal: string | null;
  stdout: string;
  stderr: string;
};

export const PROFILE_COMMANDS: Readonly<Record<"local" | "preview", ReadonlyArray<ReadinessCommandDefinition>>>;

export function assertCommandPlan(
  profile: string,
  commands: ReadonlyArray<ReadinessCommandDefinition>,
): void;
export function assertFrozenSha(before: string, after: string): void;
export function cleanGeneratedBuildState(
  workspace: string,
  remove?: (path: string, options: { recursive: true; force: true }) => void,
): void;
export function validateCommandResult(result: unknown): ReadinessCommandResult;
export function createOrchestratedEvidence(input: {
  candidate: ReleaseCandidate;
  commandDefinitions: ReadonlyArray<ReadinessCommandDefinition>;
  commandResults: Map<string, ReadinessCommandResult>;
  externalEvidence?: VerificationEvidence[];
}): VerificationEvidence[];
export function runReadinessOrchestrator(input: {
  profile: "local" | "preview";
  candidate: ReleaseCandidate;
  commands?: ReadonlyArray<ReadinessCommandDefinition>;
  runner: (definition: ReadinessCommandDefinition) => ReadinessCommandResult;
  externalEvidence?: VerificationEvidence[];
  shaAfter?: string | (() => string);
  promotionApproval?: { approvedBy: string; approvedAt: string };
  launchApproval?: { approvedBy: string; approvedAt: string };
  archive?: ArchiveReference;
  archiveVerification?: ArchiveVerification;
}): {
  report: ReadinessReport;
  commandResults: Map<string, ReadinessCommandResult>;
  coverageBySource: Record<string, { expected: number; passed: number }>;
};
