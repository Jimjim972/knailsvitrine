import assert from "node:assert/strict";
import test from "node:test";
import { invalidObjectTransition, replacementCleanupTransition, reserveReplacementTransition, type FileOperationSnapshot } from "../../../lib/gallery/file-operation-core.ts";

const ready: FileOperationSnapshot = { photoId: crypto.randomUUID(), fileState: "ready", operationKind: null, operationId: null, operationStartedAt: null, pendingStoragePath: null, cleanupStoragePath: null, repairCode: null };

test("replacement reserves a distinct operation and keeps the old path for cleanup only after the swap", () => {
  const operationId = crypto.randomUUID(); const pendingPath = `photos/${crypto.randomUUID()}.webp`;
  const pending = reserveReplacementTransition(ready, operationId, pendingPath, new Date("2026-08-12T12:00:00Z"));
  assert.equal(pending.fileState, "pending"); assert.equal(pending.operationKind, "replace"); assert.equal(pending.pendingStoragePath, pendingPath); assert.equal(pending.cleanupStoragePath, null);
  const swapped = replacementCleanupTransition(pending, operationId, `photos/${crypto.randomUUID()}.jpg`);
  assert.match(swapped.cleanupStoragePath ?? "", /\.jpg$/);
});

test("replacement refuses stale operation identifiers and unrelated states", () => {
  assert.throws(() => reserveReplacementTransition({ ...ready, fileState: "pending", operationKind: "delete" }, crypto.randomUUID(), `photos/${crypto.randomUUID()}.webp`));
  const operationId = crypto.randomUUID(); const pending = reserveReplacementTransition(ready, operationId, `photos/${crypto.randomUUID()}.webp`);
  assert.throws(() => replacementCleanupTransition(pending, crypto.randomUUID(), `photos/${crypto.randomUUID()}.webp`));
});

test("invalid replacement bytes are rejected before swap and repeated cleanup remains targeted", () => {
  const operationId = crypto.randomUUID(); const oldPath = `photos/${crypto.randomUUID()}.webp`; const newPath = `photos/${crypto.randomUUID()}.webp`;
  const pending = reserveReplacementTransition({ ...ready, storagePath: oldPath } as FileOperationSnapshot & { storagePath: string }, operationId, newPath);
  const invalid = invalidObjectTransition(pending, operationId); assert.equal(invalid.fileState, "repair_required"); assert.equal(invalid.pendingStoragePath, newPath); assert.equal(invalid.cleanupStoragePath, null);
  assert.throws(() => replacementCleanupTransition(invalid, crypto.randomUUID(), oldPath));
  const cleanup = replacementCleanupTransition({ ...pending, fileState: "pending" }, operationId, oldPath); assert.equal(cleanup.cleanupStoragePath, oldPath); assert.equal(cleanup.pendingStoragePath, newPath);
});
