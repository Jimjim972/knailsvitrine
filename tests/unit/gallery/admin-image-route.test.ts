import assert from "node:assert/strict";
import test from "node:test";
import { galleryPhotoIdSchema } from "../../../lib/validations/gallery.ts";
import { imageResponseHeaders, safeImageMimeType } from "../../../lib/gallery/image-delivery.ts";

test("shares the strict UUID schema with the private image route", () => {
  assert.equal(galleryPhotoIdSchema.safeParse("00000000-0000-4000-8000-000000000001").success, true);
  assert.equal(galleryPhotoIdSchema.safeParse("../photos/secret.webp").success, false);
});

test("private thumbnails are inline, nosniff and never cacheable", () => {
  const headers = imageResponseHeaders("image/webp");
  assert.equal(headers.get("Content-Type"), "image/webp");
  assert.equal(headers.get("Content-Disposition"), "inline");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Cache-Control"), "private, no-store");
});

test("only raster gallery MIME values may be reflected", () => {
  assert.equal(safeImageMimeType("image/jpeg"), "image/jpeg");
  assert.equal(safeImageMimeType("image/svg+xml"), null);
  assert.equal(safeImageMimeType("text/html"), null);
});
