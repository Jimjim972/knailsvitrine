import assert from "node:assert/strict";
import test from "node:test";
import { executeGalleryAction } from "../../../lib/gallery/action-core.ts";
import { galleryVisibilitySchema, validateGalleryFormValues } from "../../../lib/validations/gallery.ts";

test("metadata updates validate explicit visibility and all editable fields", () => {
  assert.equal(validateGalleryFormValues({ altText: "Pose rose", title: "Titre", label: "Nouveau", externalUrl: "https://example.com/galerie", variant: "featured", displayOrder: "4", active: "false" }).success, true);
  assert.equal(galleryVisibilitySchema.safeParse({ photoId: crypto.randomUUID(), active: "false" }).success, true);
  assert.equal(galleryVisibilitySchema.safeParse({ photoId: crypto.randomUUID(), active: "toggle" }).success, false);
});

test("concurrent updates are conflicts and cache invalidation happens only after confirmed success", async () => {
  let invalidations = 0;
  const conflict = await executeGalleryAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: true, data: true }), mutate: async () => ({ error: { code: "23505" } }), invalidate: () => { invalidations += 1; }, successMessage: "ok", logger: () => undefined });
  assert.equal(conflict.status, "conflict"); assert.equal(invalidations, 0);
  const success = await executeGalleryAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: true, data: true }), mutate: async () => ({ photoId: crypto.randomUUID() }), invalidate: () => { invalidations += 1; }, successMessage: "ok" });
  assert.equal(success.status, "success"); assert.equal(invalidations, 1);
});
