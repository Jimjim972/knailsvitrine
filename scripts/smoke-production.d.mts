export function validateProductionSmokeEnvironment(
  environment: Record<string, string | undefined>,
  observedSha: string,
): { canonicalOrigin: string; technicalOrigin: string; candidateSha: string };

export function runProductionSmoke(options?: {
  environment?: Record<string, string | undefined>;
  cwd?: string;
  runner?: typeof import("node:child_process").spawnSync;
}): { exitCode: number; signal: NodeJS.Signals | null };
