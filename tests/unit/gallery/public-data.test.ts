import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { PUBLIC_GALLERY_COLUMNS } from "../../../lib/gallery/query-contract.ts";
import { mapPublicGalleryPhoto, partitionPublicGalleryPhotos } from "../../../lib/gallery/mappers.ts";

test("the public projection and DTO never expose a Storage path", () => {
  assert.equal(PUBLIC_GALLERY_COLUMNS.includes("storage_path"), false);
  const dto = mapPublicGalleryPhoto({ id: crypto.randomUUID(), alt_text: "Pose", titre: null, libelle: null, lien_externe: null, variante_affichage: "small", width: 10, height: 20, ordre_affichage: 0, created_at: "2026-08-12T00:00:00Z" });
  assert.match(dto.imageUrl, /^\/api\/gallery-images\/[0-9a-f-]+$/); assert.equal("storagePath" in dto, false);
});

test("the public gallery has one dynamic page and no static business arrays", () => {
  const directory = "app/(public)/galerie";
  assert.deepEqual(readdirSync(directory).filter((name) => /^page.*\.tsx$/.test(name)), ["page.tsx"]);
  const source = readFileSync(`${directory}/page.tsx`, "utf8");
  assert.doesNotMatch(source, /const\s+(gallery|socialImages)\s*=\s*\[/);
  assert.match(source, /getPublicGalleryPhotos/);
});

test("SC-017 partitions all four public section combinations", () => {
  const make = (variant: "small" | "social", suffix: string) => mapPublicGalleryPhoto({ id: `00000000-0000-4000-8000-0000000000${suffix}`, alt_text: suffix, titre: null, libelle: null, lien_externe: null, variante_affichage: variant, width: 10, height: 20, ordre_affichage: 0, created_at: "2026-08-12T00:00:00Z" });
  const main = make("small", "01"); const social = make("social", "02");
  assert.deepEqual(partitionPublicGalleryPhotos([main, social]), { main: [main], social: [social], empty: false });
  assert.deepEqual(partitionPublicGalleryPhotos([main]), { main: [main], social: [], empty: false });
  assert.deepEqual(partitionPublicGalleryPhotos([social]), { main: [], social: [social], empty: false });
  assert.deepEqual(partitionPublicGalleryPhotos([]), { main: [], social: [], empty: true });
});
