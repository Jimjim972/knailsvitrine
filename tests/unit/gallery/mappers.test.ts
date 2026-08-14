import assert from "node:assert/strict";
import test from "node:test";
import { mapAdminGalleryPhoto, mapPublicGalleryPhoto, sortGalleryPhotos } from "../../../lib/gallery/mappers.ts";
import type { AdminGalleryRow } from "../../../lib/gallery/query-contract.ts";

function row(overrides: Partial<AdminGalleryRow> = {}): AdminGalleryRow {
  return {
    id: "00000000-0000-4000-8000-000000000001", storage_path: "photos/10000000-0000-4000-8000-000000000001.webp",
    alt_text: "Manucure rose", titre: null, libelle: null, lien_externe: null, variante_affichage: "featured",
    width: 1200, height: 800, mime_type: "image/webp", size_bytes: 1000, ordre_affichage: 0, actif: true,
    file_state: "ready", operation_kind: null, operation_id: null, pending_storage_path: null,
    pending_width: null, pending_height: null, pending_size_bytes: null, cleanup_storage_path: null,
    operation_started_at: null, repair_code: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("maps public image URLs from IDs without leaking Storage paths", () => {
  const photo = mapPublicGalleryPhoto(row());
  assert.equal(photo.imageUrl, "/api/gallery-images/00000000-0000-4000-8000-000000000001");
  assert.equal("storagePath" in photo, false);
});

test("derives active, hidden, pending and repair statuses independently from visibility intent", () => {
  assert.equal(mapAdminGalleryPhoto(row()).status, "active");
  assert.equal(mapAdminGalleryPhoto(row({ actif: false })).status, "hidden");
  assert.equal(mapAdminGalleryPhoto(row({ file_state: "pending", operation_kind: "delete", operation_id: crypto.randomUUID(), operation_started_at: new Date().toISOString(), cleanup_storage_path: "photos/10000000-0000-4000-8000-000000000001.webp" })).status, "pending");
  assert.equal(mapAdminGalleryPhoto(row({ file_state: "repair_required", operation_kind: "replace", operation_id: crypto.randomUUID(), operation_started_at: new Date().toISOString(), repair_code: "object_missing" })).status, "repair_required");
});

test("sorts by variant rank, display order, creation date and ID", () => {
  const photos = [
    mapAdminGalleryPhoto(row({ id: "00000000-0000-4000-8000-000000000004", variante_affichage: "social" })),
    mapAdminGalleryPhoto(row({ id: "00000000-0000-4000-8000-000000000003", ordre_affichage: 1 })),
    mapAdminGalleryPhoto(row({ id: "00000000-0000-4000-8000-000000000002", created_at: "2026-01-02T00:00:00Z" })),
    mapAdminGalleryPhoto(row()),
  ];
  assert.deepEqual(sortGalleryPhotos(photos).map(({ id }) => id), [
    "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000004",
  ]);
});
