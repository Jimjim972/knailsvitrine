export function inspectRecoveryReadiness(input: {
  workspace: string;
  candidateSha: string;
  encryptedExportPath: string;
  originalsDirectory: string;
  restoreEvidencePath: string;
  rollbackEvidencePath: string;
}): {
  status: "passed";
  candidateSha: string;
  encryptedExportDigest: string;
  originalCount: number;
  restoreTarget: "local" | "throwaway";
  rollbackDeployId: string;
};
