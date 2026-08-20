export type SecretScanSurface =
  | "repository"
  | "history"
  | "build"
  | "responses"
  | "artifacts"
  | "report";

export type SecretScanResult =
  | { status: "pass"; findingCount: 0; surfaces: [] }
  | { status: "fail"; findingCount: number; surfaces: SecretScanSurface[] };

export function scanSecretSurfaces(options?: {
  workspace?: string;
  includeHistory?: boolean;
  candidateSha?: string;
}): SecretScanResult;
