import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { inspectGalleryImage } from "../../../lib/gallery/image-inspection.ts";
import { GALLERY_BROWSER_FIXTURES, IMAGE_FIXTURES, SERVER_OBJECT_FIXTURES } from "./image-fixtures.ts";
import { ALPHA_REFERENCE_MANIFEST } from "./alpha-reference-manifest.ts";
import { COLOR_REFERENCE_MANIFEST } from "./color-reference-manifest.ts";

test("T032 versions the exact fixture inventories", () => {
  assert.deepEqual(IMAGE_FIXTURES.map(({ id }) => id), Array.from({ length: 20 }, (_, index) => `F${String(index + 1).padStart(2, "0")}`));
  assert.deepEqual(SERVER_OBJECT_FIXTURES.map(({ id }) => id), Array.from({ length: 8 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`));
  for (const path of [GALLERY_BROWSER_FIXTURES.orientation, ALPHA_REFERENCE_MANIFEST.unchanged.path, ALPHA_REFERENCE_MANIFEST.resized.path, ...COLOR_REFERENCE_MANIFEST.map(({ path }) => path)]) assert.equal(existsSync(path), true);
  assert.equal(ALPHA_REFERENCE_MANIFEST.unchanged.coordinates.length, 25);
  assert.equal(ALPHA_REFERENCE_MANIFEST.resized.coordinates.length, 25);
  assert.equal(COLOR_REFERENCE_MANIFEST.flatMap(({ samples }) => samples).length, 150);
});

test("the browser corpus carries orientation, alpha and expected dimensions", () => {
  const orientationBytes = readFileSync(GALLERY_BROWSER_FIXTURES.orientation);
  const orientation = inspectGalleryImage(orientationBytes, "image/jpeg", "orientation-6.jpg");
  assert.deepEqual({ width: orientation.width, height: orientation.height }, { width: 80, height: 40 });
  assert.equal(orientationBytes.subarray(6, 12).toString("ascii"), "Exif\0\0");
  assert.equal(orientationBytes.readUInt16LE(30), 6);
  for (const fixture of [ALPHA_REFERENCE_MANIFEST.unchanged, ALPHA_REFERENCE_MANIFEST.resized]) {
    const metadata = inspectGalleryImage(readFileSync(fixture.path), "image/png", fixture.path);
    assert.deepEqual({ width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha }, { width: fixture.width, height: fixture.height, hasAlpha: true });
  }
});
