import assert from "node:assert/strict";
import test from "node:test";
import { executeGalleryAction } from "../../../lib/gallery/action-core.ts";
import { invalidObjectTransition, operationMatches, type FileOperationSnapshot } from "../../../lib/gallery/file-operation-core.ts";
import { validatePublishedWebp } from "../../../lib/gallery/published-image-validation.ts";
import { galleryFormValues, preparedImageMetadataSchema, validateGalleryFormValues } from "../../../lib/validations/gallery.ts";
import { losslessWebp } from "./image-fixtures.ts";

const baseValues = { altText: "A", title: "", label: "", externalUrl: "", variant: "small", displayOrder: "0", active: "true" } as const;

test("create defaults display order to zero and active intent to true", () => {
  const form = new FormData(); form.set("altText", "Pose nude"); form.set("variant", "small");
  const values = galleryFormValues(form);
  assert.equal(values.displayOrder, "0"); assert.equal(values.active, "true");
});

test("SC-018 validates exactly eight normalized title and label boundaries", () => {
  const matrix = [
    { field: "title", value: "   ", accepted: true, normalized: null }, { field: "title", value: "T", accepted: true, normalized: "T" },
    { field: "title", value: ` ${"T".repeat(120)} `, accepted: true, normalized: "T".repeat(120) }, { field: "title", value: "T".repeat(121), accepted: false },
    { field: "label", value: "   ", accepted: true, normalized: null }, { field: "label", value: "L", accepted: true, normalized: "L" },
    { field: "label", value: ` ${"L".repeat(40)} `, accepted: true, normalized: "L".repeat(40) }, { field: "label", value: "L".repeat(41), accepted: false },
  ] as const;
  assert.equal(matrix.length, 8);
  for (const item of matrix) {
    const result = validateGalleryFormValues({ ...baseValues, [item.field]: item.value }); assert.equal(result.success, item.accepted);
    if (result.success && "normalized" in item) assert.equal(result.data[item.field], item.normalized);
  }
});

test("reservation metadata is exactly WebP, bounded and integer", () => {
  assert.equal(preparedImageMetadataSchema.safeParse({ mimeType: "image/webp", width: 1600, height: 800, sizeBytes: 1_048_576 }).success, true);
  assert.equal(preparedImageMetadataSchema.safeParse({ mimeType: "image/png", width: 1600, height: 800, sizeBytes: 1 }).success, false);
  assert.equal(preparedImageMetadataSchema.safeParse({ mimeType: "image/webp", width: 1601, height: 800, sizeBytes: 1 }).success, false);
});

test("server finalization validates the exact downloaded bytes", () => {
  const bytes = losslessWebp(1200, 800); const expectation = { mimeType: "image/webp" as const, width: 1200, height: 800, sizeBytes: bytes.length };
  assert.deepEqual(validatePublishedWebp(bytes, expectation), { mimeType: "image/webp", width: 1200, height: 800, hasAlpha: true, sizeBytes: bytes.length });
  assert.throws(() => validatePublishedWebp(bytes.slice(0, -1), { ...expectation, sizeBytes: bytes.length - 1 }));
});

test("validation, double submission conflict and invalid-byte compensation never report a false success", async () => {
  let mutations = 0; let invalidations = 0;
  const rejected = await executeGalleryAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: false, fieldErrors: { title: ["Trop long"] } }), mutate: async () => { mutations += 1; return { photoId: crypto.randomUUID() }; }, invalidate: () => { invalidations += 1; }, successMessage: "ok" });
  assert.equal(rejected.status, "validation"); assert.equal(mutations, 0); assert.equal(invalidations, 0);
  const conflict = await executeGalleryAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: true, data: baseValues }), mutate: async () => ({ error: new Error("duplicate"), status: 409 }), invalidate: () => { invalidations += 1; }, successMessage: "ok", logger: () => undefined });
  assert.equal(conflict.status, "conflict"); assert.equal(invalidations, 0);
  const operationId = crypto.randomUUID(); const pending: FileOperationSnapshot = { photoId: crypto.randomUUID(), fileState: "pending", operationKind: "create", operationId, operationStartedAt: new Date().toISOString(), pendingStoragePath: `photos/${crypto.randomUUID()}.webp`, cleanupStoragePath: null, repairCode: null };
  const repair = invalidObjectTransition(pending, operationId); assert.equal(repair.repairCode, "invalid_object_bytes"); assert.equal(operationMatches(repair, operationId, "create"), true);
});
