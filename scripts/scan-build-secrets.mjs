import { emit, secretScanResult } from "./run-foundation-checks.mjs";

const result = secretScanResult();
emit([result]);
process.exitCode = result.status === "pass" ? 0 : 1;
