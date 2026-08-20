export function redactSensitiveText(value: unknown): string;
export function assertArtifactIsRedacted(value: unknown): true;
export function productionReadinessDirectory(workspace: string, sha: string): string;
export function writeAtomicArtifact(options: {
  workspace?: string;
  sha: string;
  relativePath: string;
  content: string | Record<string, unknown>;
}): string;
export function runRedactedCommand(options: {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  workspace?: string;
  sha: string;
  artifactPath?: string;
}): {
  command: string[];
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};
export function sha256File(path: string): string;
export function validateProviderArchive(
  reference: {
    provider: "github_release";
    releaseId: string;
    releaseTag: string;
    candidateSha: string;
    reportAssetName: "report.json";
    summaryAssetName: "summary.md";
    expectedImmutable: true;
  },
  providerMetadata: {
    releaseId: string;
    releaseTag: string;
    candidateSha: string;
    immutable: boolean;
    assetDigests: Record<string, string>;
  },
): {
  releaseId: string;
  candidateSha: string;
  immutable: true;
  assetDigests: Record<string, string>;
};
