import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { assertArtifactIsRedacted, sha256File } from "./lib/production-readiness.mjs";

const ENCRYPTED_EXTENSIONS = new Set([".age", ".enc", ".gpg"]);

function assertOutsideWorkspace(workspace, path, code) {
  const root = realpathSync(workspace);
  const target = realpathSync(path);
  const relation = relative(root, target);
  if (!relation || (!relation.startsWith(`..${sep}`) && relation !== "..")) throw new Error(code);
  if (lstatSync(path).isSymbolicLink()) throw new Error(`${code}_symlink`);
  return target;
}

function readJsonEvidence(path, schema) {
  const raw = readFileSync(path, "utf8");
  assertArtifactIsRedacted(raw);
  const value = JSON.parse(raw);
  for (const [key, predicate] of Object.entries(schema)) {
    if (!predicate(value[key])) throw new Error(`invalid_recovery_evidence:${key}`);
  }
  return value;
}

export function inspectRecoveryReadiness({
  workspace,
  candidateSha,
  encryptedExportPath,
  originalsDirectory,
  restoreEvidencePath,
  rollbackEvidencePath,
}) {
  if (!/^[0-9a-f]{40}$/.test(candidateSha)) throw new Error("invalid_candidate_sha");
  const exportPath = assertOutsideWorkspace(workspace, encryptedExportPath, "export_must_be_outside_repository");
  const originalsPath = assertOutsideWorkspace(workspace, originalsDirectory, "originals_must_be_outside_repository");
  if (!statSync(exportPath).isFile() || statSync(exportPath).size === 0 ||
      !ENCRYPTED_EXTENSIONS.has(extname(exportPath).toLowerCase())) {
    throw new Error("encrypted_export_invalid");
  }
  if ((statSync(exportPath).mode & 0o077) !== 0) throw new Error("encrypted_export_permissions_too_open");
  if (!statSync(originalsPath).isDirectory()) throw new Error("originals_directory_invalid");
  const originals = readdirSync(originalsPath, { withFileTypes: true }).filter((entry) => entry.isFile());
  if (originals.length === 0) throw new Error("gallery_originals_missing");

  const timestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  const restore = readJsonEvidence(restoreEvidencePath, {
    status: (value) => value === "passed",
    candidateSha: (value) => value === candidateSha,
    target: (value) => value === "local" || value === "throwaway",
    restoredAt: timestamp,
    databaseDigest: (value) => /^sha256:[0-9a-f]{64}$/.test(value),
    storageInventoryDigest: (value) => /^sha256:[0-9a-f]{64}$/.test(value),
  });
  const rollback = readJsonEvidence(rollbackEvidencePath, {
    status: (value) => value === "passed",
    candidateSha: (value) => value === candidateSha,
    schemaCompatible: (value) => value === true,
    previousDeployId: (value) => typeof value === "string" && value.trim().length > 0,
    checkedAt: timestamp,
  });
  return {
    status: "passed",
    candidateSha,
    encryptedExportDigest: sha256File(exportPath),
    originalCount: originals.length,
    restoreTarget: restore.target,
    rollbackDeployId: rollback.previousDeployId,
  };
}

function main() {
  const required = [
    "KN_RECOVERY_CANDIDATE_SHA",
    "KN_RECOVERY_ENCRYPTED_EXPORT_PATH",
    "KN_RECOVERY_ORIGINALS_DIRECTORY",
    "KN_RECOVERY_RESTORE_EVIDENCE_PATH",
    "KN_RECOVERY_ROLLBACK_EVIDENCE_PATH",
  ];
  for (const name of required) if (!process.env[name]?.trim()) throw new Error(`missing_recovery_environment:${name}`);
  const result = inspectRecoveryReadiness({
    workspace: process.cwd(),
    candidateSha: process.env.KN_RECOVERY_CANDIDATE_SHA,
    encryptedExportPath: resolve(process.env.KN_RECOVERY_ENCRYPTED_EXPORT_PATH),
    originalsDirectory: resolve(process.env.KN_RECOVERY_ORIGINALS_DIRECTORY),
    restoreEvidencePath: resolve(process.env.KN_RECOVERY_RESTORE_EVIDENCE_PATH),
    rollbackEvidencePath: resolve(process.env.KN_RECOVERY_ROLLBACK_EVIDENCE_PATH),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "blocked", code: error instanceof Error ? error.message : "unknown_error" })}\n`);
    process.exitCode = 1;
  }
}
