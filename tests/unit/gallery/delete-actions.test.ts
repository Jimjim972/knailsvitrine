import assert from "node:assert/strict";
import test from "node:test";
import { beginDeleteTransition, deleteFinalizationDecision, deleteRowFailureDecision, operationMatches, type FileOperationSnapshot } from "../../../lib/gallery/file-operation-core.ts";

const ready: FileOperationSnapshot = { photoId: crypto.randomUUID(), fileState: "ready", operationKind: null, operationId: null, operationStartedAt: null, pendingStoragePath: null, cleanupStoragePath: null, repairCode: null };

test("delete masks first and persists only the exact current cleanup path", () => {
  const operationId = crypto.randomUUID(); const path = `photos/${crypto.randomUUID()}.webp`; const pending = beginDeleteTransition(ready, operationId, path);
  assert.equal(pending.fileState, "pending"); assert.equal(pending.operationKind, "delete"); assert.equal(pending.cleanupStoragePath, path); assert.equal(pending.pendingStoragePath, null);
  assert.equal(operationMatches(pending, operationId, "delete"), true); assert.equal(operationMatches(pending, crypto.randomUUID(), "delete"), false);
});

test("delete refuses to replace another pending operation", () => {
  assert.throws(() => beginDeleteTransition({ ...ready, fileState: "pending", operationKind: "replace" }, crypto.randomUUID(), `photos/${crypto.randomUUID()}.webp`));
});

test("delete recovery accepts the exact operation after the object is already absent and rejects stale identifiers", () => {
  const operationId = crypto.randomUUID(); const path = `photos/${crypto.randomUUID()}.webp`; const pending = beginDeleteTransition(ready, operationId, path);
  assert.equal(operationMatches(pending, operationId, "delete"), true);
  assert.equal(operationMatches(pending, crypto.randomUUID(), "delete"), false);
  assert.equal(pending.cleanupStoragePath, path);
  assert.equal(deleteFinalizationDecision(pending, operationId, "present"), "remove_object");
  assert.equal(deleteFinalizationDecision(pending, operationId, "absent"), "delete_row");
  assert.equal(deleteFinalizationDecision(pending, operationId, "absent", true), "complete");
  assert.equal(deleteFinalizationDecision(pending, operationId, "unknown"), "object_delete_unconfirmed");
  assert.equal(deleteRowFailureDecision(pending, operationId), "row_delete_unconfirmed");
  assert.throws(() => deleteFinalizationDecision(pending, crypto.randomUUID(), "absent"));
  assert.throws(() => deleteRowFailureDecision(pending, crypto.randomUUID()));
});
