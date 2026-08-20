import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { inspectRecoveryReadiness } from "../../../scripts/check-recovery-readiness.mjs";

const SHA = "9".repeat(40);
const DIGEST = `sha256:${"a".repeat(64)}`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "knails-recovery-"));
  const workspace = join(root, "workspace");
  const recovery = join(root, "recovery");
  const originals = join(recovery, "originals");
  mkdirSync(workspace);
  mkdirSync(originals, { recursive: true });
  const encryptedExportPath = join(recovery, "database.sql.age");
  writeFileSync(encryptedExportPath, "encrypted-payload");
  chmodSync(encryptedExportPath, 0o600);
  writeFileSync(join(originals, "photo-original.bin"), "fixture");
  const restoreEvidencePath = join(recovery, "restore.json");
  writeFileSync(restoreEvidencePath, JSON.stringify({
    status: "passed",
    candidateSha: SHA,
    target: "local",
    restoredAt: "2026-08-20T12:00:00.000Z",
    databaseDigest: DIGEST,
    storageInventoryDigest: DIGEST,
  }));
  const rollbackEvidencePath = join(recovery, "rollback.json");
  writeFileSync(rollbackEvidencePath, JSON.stringify({
    status: "passed",
    candidateSha: SHA,
    schemaCompatible: true,
    previousDeployId: "deploy-stable-1",
    checkedAt: "2026-08-20T12:00:00.000Z",
  }));
  return {
    root,
    input: { workspace, candidateSha: SHA, encryptedExportPath, originalsDirectory: originals, restoreEvidencePath, rollbackEvidencePath },
  };
}

test("le contrôle confirme export chiffré, originaux, restauration et rollback", (context) => {
  const value = fixture();
  context.after(() => rmSync(value.root, { recursive: true, force: true }));
  const result = inspectRecoveryReadiness(value.input);
  assert.equal(result.status, "passed");
  assert.equal(result.originalCount, 1);
  assert.match(result.encryptedExportDigest, /^sha256:[0-9a-f]{64}$/);
});

test("un export dans le dépôt, non chiffré ou trop permissif est refusé", (context) => {
  const value = fixture();
  context.after(() => rmSync(value.root, { recursive: true, force: true }));
  const inRepository = join(value.input.workspace, "database.sql.age");
  writeFileSync(inRepository, "encrypted");
  chmodSync(inRepository, 0o600);
  assert.throws(() => inspectRecoveryReadiness({ ...value.input, encryptedExportPath: inRepository }), /outside_repository/);
  const unencrypted = join(value.root, "recovery", "database.sql");
  writeFileSync(unencrypted, "plain");
  chmodSync(unencrypted, 0o600);
  assert.throws(() => inspectRecoveryReadiness({ ...value.input, encryptedExportPath: unencrypted }), /encrypted_export_invalid/);
  chmodSync(value.input.encryptedExportPath, 0o644);
  assert.throws(() => inspectRecoveryReadiness(value.input), /permissions_too_open/);
});

test("une restauration ou compatibilité non réussie est refusée", (context) => {
  const value = fixture();
  context.after(() => rmSync(value.root, { recursive: true, force: true }));
  writeFileSync(value.input.restoreEvidencePath, JSON.stringify({ status: "failed" }));
  assert.throws(() => inspectRecoveryReadiness(value.input), /invalid_recovery_evidence/);
});
